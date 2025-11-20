/**
 * TypeScript/JavaScript parser using tree-sitter
 *
 * Extracts import relationships from source files
 */
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import * as fs from 'fs/promises';
import * as path from 'path';
import { detectHierarchy } from './hierarchy-detector.js';
/**
 * Initialize tree-sitter parser with TypeScript grammar
 */
export function createParser() {
    const parser = new Parser();
    parser.setLanguage(TypeScript.typescript);
    return parser;
}
/**
 * Parse a single file to extract import information
 *
 * @param filePath - Absolute path to the file
 * @param parser - tree-sitter parser instance
 * @returns Parsed file with imports, or null if parsing fails
 */
export async function parseFile(filePath, parser) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        // Use TSX grammar for .tsx/.jsx files to support JSX syntax
        const isTSXFile = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
        if (isTSXFile) {
            parser.setLanguage(TypeScript.tsx);
        }
        else {
            parser.setLanguage(TypeScript.typescript);
        }
        const tree = parser.parse(content);
        const imports = extractImports(tree.rootNode);
        // Phase 2: Detect hierarchy from file path
        const hierarchy = detectHierarchy(filePath);
        // Phase 3: Extract interface implementations
        const implementations = extractImplements(tree.rootNode);
        // Phase 4: Extract JSX component renders
        const renders = extractRenders(tree.rootNode);
        return {
            path: filePath,
            imports,
            implements: implementations.length > 0 ? implementations : undefined,
            renders: renders.length > 0 ? renders : undefined,
            hierarchy,
        };
    }
    catch (error) {
        console.warn(`[Parser] Failed to parse ${filePath}:`, error);
        return null;
    }
}
/**
 * Extract import information from AST
 */
function extractImports(rootNode) {
    const imports = [];
    function traverse(node) {
        if (!node)
            return;
        // import_statement: import { foo } from './bar'
        if (node.type === 'import_statement') {
            const importPath = extractImportPath(node);
            if (importPath) {
                imports.push({
                    importPath,
                    isTypeOnly: isTypeOnlyImport(node),
                    isDynamic: false,
                });
            }
        }
        // export_statement: export { foo } from './bar'
        if (node.type === 'export_statement') {
            const importPath = extractImportPath(node);
            if (importPath) {
                imports.push({
                    importPath,
                    isTypeOnly: false,
                    isDynamic: false,
                });
            }
        }
        // dynamic import: import('./bar')
        if (node.type === 'call_expression') {
            const callee = node.childForFieldName('function');
            if (callee?.type === 'import') {
                const args = node.childForFieldName('arguments');
                if (args) {
                    const importPath = extractStringFromArguments(args);
                    if (importPath) {
                        imports.push({
                            importPath,
                            isTypeOnly: false,
                            isDynamic: true,
                        });
                    }
                }
            }
        }
        // Traverse children
        for (const child of node.children) {
            if (child) {
                traverse(child);
            }
        }
    }
    traverse(rootNode);
    return imports;
}
/**
 * Extract import path from import/export statement
 */
function extractImportPath(node) {
    // Look for string literal in the statement
    for (const child of node.children) {
        if (child.type === 'string' || child.type === 'string_fragment') {
            return extractStringLiteral(child);
        }
        // Recurse into nested nodes
        const nested = extractImportPath(child);
        if (nested)
            return nested;
    }
    return null;
}
/**
 * Extract string content from string literal node
 */
function extractStringLiteral(node) {
    const text = node.text;
    if (!text)
        return null;
    // Remove quotes
    if ((text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith("'") && text.endsWith("'"))) {
        return text.slice(1, -1);
    }
    if (text.startsWith('`') && text.endsWith('`')) {
        return text.slice(1, -1);
    }
    return text;
}
/**
 * Extract string from arguments node
 */
function extractStringFromArguments(argsNode) {
    // Look for string literal in arguments
    for (const child of argsNode.children) {
        if (child.type === 'string') {
            return extractStringLiteral(child);
        }
    }
    return null;
}
/**
 * Check if import is type-only
 */
function isTypeOnlyImport(node) {
    // import type { Foo } from './bar'
    // The 'type' keyword appears as a direct child of import_statement
    for (const child of node.children) {
        if (child.type === 'type') {
            return true;
        }
    }
    return false;
}
/**
 * Extract interface implementations from AST (Phase 3)
 *
 * Finds class declarations with implements clauses and maps
 * interface names to their import paths.
 */
function extractImplements(rootNode) {
    const implementations = [];
    // Build interface name → import path map from imports
    // Need to parse import specifiers to extract actual names
    const interfaceImportMap = buildInterfaceImportMap(rootNode);
    function traverse(node) {
        if (!node)
            return;
        // class_declaration: class Foo implements Bar, Baz
        if (node.type === 'class_declaration') {
            const className = extractClassName(node);
            const interfaces = extractInterfaceNames(node);
            if (className && interfaces.length > 0) {
                // Build interface name → import path map for this class
                const interfacePaths = new Map();
                for (const iface of interfaces) {
                    const importPath = interfaceImportMap.get(iface);
                    if (importPath) {
                        interfacePaths.set(iface, importPath);
                    }
                }
                implementations.push({
                    className,
                    interfaces,
                    interfacePaths,
                });
            }
        }
        // Traverse children
        for (const child of node.children) {
            if (child) {
                traverse(child);
            }
        }
    }
    traverse(rootNode);
    return implementations;
}
/**
 * Build map of symbol name → import path from import statements
 *
 * Parses import specifiers to extract named imports, default imports, etc.
 */
function buildInterfaceImportMap(rootNode) {
    const map = new Map();
    function traverse(node) {
        if (!node)
            return;
        if (node.type === 'import_statement') {
            const importPath = extractImportPath(node);
            if (!importPath)
                return;
            // Extract imported names from import_clause
            const importClause = node.children.find(c => c.type === 'import_clause');
            if (!importClause)
                return;
            // Handle: import { IAuth, ILogger } from './auth'
            const namedImports = importClause.children.find(c => c.type === 'named_imports');
            if (namedImports) {
                for (const child of namedImports.namedChildren) {
                    if (child.type === 'import_specifier') {
                        // import { IAuth } or import { IAuth as Auth }
                        const nameNode = child.childForFieldName('name');
                        if (nameNode) {
                            map.set(nameNode.text, importPath);
                        }
                    }
                }
            }
            // Handle: import IAuth from './auth' (default import)
            const identifier = importClause.children.find(c => c.type === 'identifier');
            if (identifier) {
                map.set(identifier.text, importPath);
            }
            // Handle: import * as auth from './auth' (namespace import)
            const namespaceImport = importClause.children.find(c => c.type === 'namespace_import');
            if (namespaceImport) {
                const nameNode = namespaceImport.children.find(c => c.type === 'identifier');
                if (nameNode) {
                    map.set(nameNode.text, importPath);
                }
            }
        }
        // Traverse children
        for (const child of node.children) {
            if (child) {
                traverse(child);
            }
        }
    }
    traverse(rootNode);
    return map;
}
/**
 * Extract class name from class_declaration node
 */
function extractClassName(classNode) {
    const nameNode = classNode.childForFieldName('name');
    return nameNode?.text || null;
}
/**
 * Extract interface names from implements_clause
 *
 * Handles:
 * - Single interface: class Foo implements Bar
 * - Multiple interfaces: class Foo implements A, B, C
 * - Generic interfaces: class Foo implements Bar<T> → extract "Bar"
 * - Qualified names: class Foo implements ns.IBar → extract "IBar"
 */
function extractInterfaceNames(classNode) {
    const interfaces = [];
    // implements_clause is nested under class_heritage in tree-sitter-typescript
    const heritage = classNode.children.find(c => c.type === 'class_heritage');
    if (!heritage)
        return interfaces;
    const implementsClause = heritage.children.find(c => c.type === 'implements_clause');
    if (!implementsClause)
        return interfaces;
    // implements_clause contains type_identifier nodes for interface names
    for (const child of implementsClause.namedChildren) {
        if (child.type === 'type_identifier') {
            // Direct interface name: IAuth
            interfaces.push(child.text);
        }
        else if (child.type === 'generic_type') {
            // Generic interface: IStore<User> → extract "IStore"
            const typeIdent = child.childForFieldName('name');
            if (typeIdent && typeIdent.type === 'type_identifier') {
                interfaces.push(typeIdent.text);
            }
        }
        else if (child.type === 'member_expression') {
            // Qualified name: ns.IBar → extract "IBar"
            const property = child.childForFieldName('property');
            if (property && property.type === 'property_identifier') {
                interfaces.push(property.text);
            }
        }
    }
    return interfaces;
}
/**
 * Extract component rendering relationships from JSX (Phase 4)
 *
 * @param rootNode - Root AST node
 * @returns Array of rendered components with positions
 */
function extractRenders(rootNode) {
    const renders = [];
    let position = 0;
    // Build component import map: componentName → importPath
    const componentImportMap = buildComponentImportMap(rootNode);
    function traverse(node) {
        if (!node)
            return;
        // Find JSX elements: jsx_element, jsx_self_closing_element
        if (node.type === 'jsx_self_closing_element' || node.type === 'jsx_element') {
            const componentName = extractJSXComponentName(node);
            if (componentName && isComponentName(componentName)) {
                // Check if component is imported (not intra-file)
                const importPath = componentImportMap.get(componentName);
                if (importPath) {
                    renders.push({
                        componentName,
                        position: position++,
                        isNamespaced: componentName.includes('.')
                    });
                }
            }
        }
        // Recursively traverse children
        for (const child of node.children) {
            traverse(child);
        }
    }
    traverse(rootNode);
    return renders;
}
/**
 * Check if name follows component naming convention
 * Components start with uppercase letter, HTML elements lowercase
 */
function isComponentName(name) {
    // Extract first part for namespaced components: "UI.Button" → "UI"
    const firstPart = name.split('.')[0];
    return firstPart.length > 0 && firstPart[0] === firstPart[0].toUpperCase();
}
/**
 * Extract component name from JSX element
 */
function extractJSXComponentName(node) {
    // For jsx_self_closing_element: <Foo />
    // For jsx_element: <Foo></Foo>
    let nameNode = null;
    if (node.type === 'jsx_self_closing_element') {
        nameNode = node.childForFieldName('name');
    }
    else if (node.type === 'jsx_element') {
        const openingElement = node.childForFieldName('open_tag');
        if (openingElement) {
            nameNode = openingElement.childForFieldName('name');
        }
    }
    if (!nameNode)
        return null;
    // Handle different name types:
    // - identifier: "Header"
    // - member_expression: "UI.Button"
    // - nested_identifier: "Dialog.Header"
    if (nameNode.type === 'identifier') {
        return nameNode.text;
    }
    else if (nameNode.type === 'member_expression') {
        return nameNode.text; // Returns full "UI.Button"
    }
    else if (nameNode.type === 'nested_identifier') {
        return nameNode.text;
    }
    return null;
}
/**
 * Build map of component names to their import paths
 * Similar to buildInterfaceImportMap() from Phase 3
 */
function buildComponentImportMap(rootNode) {
    const map = new Map();
    function traverse(node) {
        if (!node)
            return;
        if (node.type === 'import_statement') {
            const importPath = extractImportPath(node);
            if (!importPath)
                return;
            const importClause = node.children.find(c => c.type === 'import_clause');
            if (!importClause)
                return;
            // Handle named imports: import { Header, Footer } from './components'
            const namedImports = importClause.children.find(c => c.type === 'named_imports');
            if (namedImports) {
                for (const child of namedImports.namedChildren) {
                    if (child.type === 'import_specifier') {
                        const nameNode = child.childForFieldName('name');
                        const aliasNode = child.childForFieldName('alias');
                        if (nameNode) {
                            const localName = aliasNode ? aliasNode.text : nameNode.text;
                            map.set(localName, importPath);
                        }
                    }
                }
            }
            // Handle default imports: import Header from './Header'
            const identifier = importClause.children.find(c => c.type === 'identifier');
            if (identifier) {
                map.set(identifier.text, importPath);
            }
            // Handle namespace imports: import * as UI from './components'
            const namespaceImport = importClause.children.find(c => c.type === 'namespace_import');
            if (namespaceImport) {
                const aliasNode = namespaceImport.childForFieldName('alias') ||
                    namespaceImport.children.find(c => c.type === 'identifier');
                if (aliasNode) {
                    map.set(aliasNode.text, importPath);
                }
            }
        }
        for (const child of node.children) {
            traverse(child);
        }
    }
    traverse(rootNode);
    return map;
}
/**
 * Parse all files in a project directory
 *
 * @param projectPath - Root directory of the project
 * @returns Array of parsed files
 */
export async function parseProject(projectPath) {
    const parser = createParser();
    const files = await findSourceFiles(projectPath);
    console.log(`[Parser] Found ${files.length} source files`);
    const results = await Promise.all(files.map((file) => parseFile(file, parser)));
    return results.filter((r) => r !== null);
}
/**
 * Find all TypeScript/JavaScript source files in a directory
 */
async function findSourceFiles(dir) {
    const files = [];
    async function traverse(currentDir) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                // Skip ignored directories
                if (entry.isDirectory()) {
                    if (shouldIgnoreDirectory(entry.name)) {
                        continue;
                    }
                    await traverse(fullPath);
                }
                else if (entry.isFile()) {
                    if (isSourceFile(entry.name)) {
                        files.push(fullPath);
                    }
                }
            }
        }
        catch (error) {
            console.warn(`[Parser] Failed to read directory ${currentDir}:`, error);
        }
    }
    await traverse(dir);
    return files;
}
/**
 * Check if a directory should be ignored
 */
function shouldIgnoreDirectory(name) {
    const ignoredDirs = [
        'node_modules',
        'dist',
        'build',
        'out',
        '.git',
        '.next',
        '.nuxt',
        'coverage',
        '__pycache__',
        'venv',
    ];
    return ignoredDirs.includes(name);
}
/**
 * Check if a file is a TypeScript/JavaScript source file
 */
function isSourceFile(filename) {
    const ext = path.extname(filename);
    return ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'].includes(ext);
}
//# sourceMappingURL=typescript-parser.js.map