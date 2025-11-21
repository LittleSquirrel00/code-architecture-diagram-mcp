/**
 * Dependency graph builder
 *
 * Constructs a Graph from parsed files
 */
import * as path from 'path';
import * as crypto from 'crypto';
/**
 * Node.js built-in modules (to ignore when resolving imports)
 */
const NODE_BUILTIN_MODULES = [
    'path',
    'fs',
    'fs/promises',
    'crypto',
    'util',
    'stream',
    'events',
    'buffer',
    'url',
    'querystring',
    'http',
    'https',
    'net',
    'dns',
    'os',
    'child_process',
    'cluster',
    'zlib',
    'assert',
    'string_decoder',
    'tty',
    'dgram',
    'v8',
    'vm',
    'process',
    'console',
];
/**
 * Check if an import path should be ignored (external dependencies)
 *
 * @param importPath - Import path to check
 * @returns true if should be ignored (external dependency)
 */
function shouldIgnoreImport(importPath) {
    // Ignore Node.js built-in modules
    if (NODE_BUILTIN_MODULES.includes(importPath)) {
        return true;
    }
    // Ignore Node.js built-in with subpaths (e.g., 'fs/promises')
    if (NODE_BUILTIN_MODULES.some(mod => importPath.startsWith(`${mod}/`))) {
        return true;
    }
    // Ignore npm packages (not starting with . or /)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return true;
    }
    // Ignore TypeScript type literal strings (very short, no slashes)
    // These are accidentally parsed as imports by extractImports
    if (importPath.length <= 10 && !importPath.includes('/') && !importPath.includes('\\')) {
        return true;
    }
    return false;
}
/**
 * Build dependency graph from parsed files
 *
 * @param files - Parsed files with import information
 * @param options - Options for graph construction (Phase 2: level support)
 * @returns Complete dependency graph
 */
export function buildGraph(files, options) {
    const level = options?.level ?? 'file'; // Default to file-level (backward compatible)
    const edgeTypes = options?.edgeTypes ?? ['import']; // Phase 3: Default to import-only (backward compatible)
    // Build a map of file paths for quick lookup
    // Normalize all paths to absolute for consistent resolution
    const filePathMap = new Map();
    for (const file of files) {
        const absolutePath = path.resolve(file.path);
        filePathMap.set(absolutePath, file.path);
        // Also map without extension for .js imports to .ts files
        const withoutExt = absolutePath.replace(/\.(ts|tsx|js|jsx|mts|cts)$/, '');
        filePathMap.set(withoutExt, file.path);
        filePathMap.set(withoutExt + '.js', file.path);
        filePathMap.set(withoutExt + '.jsx', file.path);
    }
    if (level === 'file') {
        // Phase 1 behavior: file-level graph only
        return buildFileGraph(files, filePathMap, edgeTypes);
    }
    else {
        // Phase 2: module or component-level graph
        return buildHierarchyGraph(files, filePathMap, level);
    }
}
/**
 * Build file-level graph (Phase 1 behavior, Phase 3: edge filtering)
 */
function buildFileGraph(files, filePathMap, edgeTypes = ['import']) {
    const nodes = new Map();
    const edges = new Map();
    // Create nodes for all files
    for (const file of files) {
        const nodeId = generateNodeId(file.path);
        const node = {
            type: 'hierarchy',
            level: 'file',
            id: nodeId,
            path: file.path,
            status: 'normal',
        };
        nodes.set(nodeId, node);
    }
    // Build node ID map for edge creation
    const fileIdMap = new Map();
    for (const file of files) {
        fileIdMap.set(file.path, generateNodeId(file.path));
    }
    // Create edges based on requested types
    if (edgeTypes.includes('import')) {
        const importEdges = createImportEdges(files, filePathMap, fileIdMap);
        for (const edge of importEdges) {
            const edgeKey = `import:${edge.from}->${edge.to}`;
            edges.set(edgeKey, edge);
        }
    }
    if (edgeTypes.includes('implement')) {
        const implementEdges = createImplementEdges(files, filePathMap, fileIdMap);
        for (const edge of implementEdges) {
            const edgeKey = `implement:${edge.from}->${edge.to}`;
            edges.set(edgeKey, edge);
        }
    }
    if (edgeTypes.includes('render')) {
        const renderEdges = createRenderEdges(files, filePathMap, fileIdMap);
        for (const edge of renderEdges) {
            const edgeKey = `render:${edge.from}->${edge.to}:${edge.position}`;
            edges.set(edgeKey, edge);
        }
    }
    // Detect circular dependencies (only for import edges)
    const importEdges = Array.from(edges.values()).filter(e => e.type === 'import');
    detectCircularDependencies(importEdges);
    return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
    };
}
/**
 * Extract module/component name from file path
 * Uses simple heuristic: src/{module}/* -> module
 *
 * @example
 * extractModuleName('src/core/types.ts') -> 'core'
 * extractModuleName('src/parser/typescript-parser.ts') -> 'parser'
 */
function extractModuleName(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    // Match pattern: src/{moduleName}/...
    const match = normalized.match(/src\/([^\/]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}
/**
 * Build hierarchy graph (module or component level)
 * Returns only parent nodes (modules/components) with aggregated edges
 */
function buildHierarchyGraph(files, filePathMap, level) {
    const parentNodes = new Map();
    const fileToParent = new Map();
    // Step 1: Auto-detect modules from directory structure
    for (const file of files) {
        const moduleName = extractModuleName(file.path);
        if (!moduleName)
            continue;
        const parentId = `${level}:${moduleName}`;
        fileToParent.set(file.path, parentId);
        // Create parent node if not exists
        if (!parentNodes.has(parentId)) {
            const parentNode = {
                type: 'hierarchy',
                level: level,
                id: parentId,
                path: moduleName,
                status: 'normal',
            };
            parentNodes.set(parentId, parentNode);
        }
    }
    // Step 2: Create file-level edges and aggregate to parent-level
    const aggregatedEdges = new Map();
    for (const file of files) {
        const fromParent = fileToParent.get(file.path);
        for (const imp of file.imports) {
            const resolvedPath = resolveImportPath(file.path, imp.importPath, filePathMap);
            if (!resolvedPath)
                continue;
            const toParent = fileToParent.get(resolvedPath);
            // If both files have parents at the requested level, create aggregated edge
            if (fromParent && toParent) {
                // Skip intra-module/component edges
                if (fromParent === toParent)
                    continue;
                const edgeKey = `${fromParent}->${toParent}`;
                if (!aggregatedEdges.has(edgeKey)) {
                    const edge = {
                        type: 'import',
                        from: fromParent,
                        to: toParent,
                        status: 'normal',
                    };
                    aggregatedEdges.set(edgeKey, edge);
                }
            }
        }
    }
    const nodeCount = parentNodes.size;
    const fileCount = files.length;
    const edgeCount = aggregatedEdges.size;
    console.log(`[GraphBuilder] Aggregated ${fileCount} files into ${nodeCount} ${level} nodes with ${edgeCount} edges`);
    // Return only parent nodes (modules/components), not file nodes
    // This provides a clean hierarchical view at the requested level
    return {
        nodes: Array.from(parentNodes.values()),
        edges: Array.from(aggregatedEdges.values()),
    };
}
/**
 * Generate unique node ID from file path
 *
 * Strategy: Use a short hash of the absolute path
 */
export function generateNodeId(filePath) {
    // Use last 8 characters of SHA-256 hash
    const hash = crypto.createHash('sha256').update(filePath).digest('hex').slice(-8);
    const basename = path.basename(filePath, path.extname(filePath));
    return `file:${basename}-${hash}`;
}
/**
 * Resolve import path to absolute file path
 *
 * @param fromFile - File containing the import
 * @param importPath - Import path (e.g., './utils', '../models/User')
 * @param filePathMap - Map of available file paths for lookup
 * @returns Resolved absolute path, or null if cannot resolve
 */
export function resolveImportPath(fromFile, importPath, filePathMap) {
    // Skip external packages (no leading . or /)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null;
    }
    // Resolve relative to the file's directory
    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importPath);
    // Try to find the file in our file path map
    // First try exact match
    if (filePathMap.has(resolved)) {
        return filePathMap.get(resolved);
    }
    // Try with common extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '/index.ts', '/index.js'];
    for (const ext of extensions) {
        const candidate = resolved + ext;
        if (filePathMap.has(candidate)) {
            return filePathMap.get(candidate);
        }
    }
    return null;
}
/**
 * Detect circular dependencies in the graph
 *
 * @param edges - All edges in the graph
 */
function detectCircularDependencies(edges) {
    // Build adjacency list
    const adjList = new Map();
    for (const edge of edges) {
        if (edge.type === 'import') {
            if (!adjList.has(edge.from)) {
                adjList.set(edge.from, new Set());
            }
            adjList.get(edge.from).add(edge.to);
        }
    }
    // DFS to detect cycles
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    function dfs(node, path) {
        visited.add(node);
        recursionStack.add(node);
        path.push(node);
        const neighbors = adjList.get(node) || new Set();
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                dfs(neighbor, path);
            }
            else if (recursionStack.has(neighbor)) {
                // Found a cycle
                const cycleStart = path.indexOf(neighbor);
                const cycle = path.slice(cycleStart);
                cycles.push([...cycle, neighbor]);
            }
        }
        recursionStack.delete(node);
        path.pop();
    }
    for (const node of adjList.keys()) {
        if (!visited.has(node)) {
            dfs(node, []);
        }
    }
    // Log warnings for cycles
    if (cycles.length > 0) {
        console.warn(`[GraphBuilder] Detected ${cycles.length} circular dependencies:`);
        for (const cycle of cycles.slice(0, 3)) {
            console.warn(`  ${cycle.join(' -> ')}`);
        }
        if (cycles.length > 3) {
            console.warn(`  ... and ${cycles.length - 3} more`);
        }
    }
}
/**
 * Create import edges from parsed files (Phase 3: extracted from buildFileGraph)
 *
 * @param files - Parsed files with import information
 * @param filePathMap - Map of file paths for import resolution
 * @param fileIdMap - Map from file path to node ID
 * @returns Array of ImportEdge objects
 */
function createImportEdges(files, filePathMap, fileIdMap) {
    const edges = [];
    const edgeKeys = new Set();
    for (const file of files) {
        const fromId = fileIdMap.get(file.path);
        if (!fromId)
            continue;
        for (const imp of file.imports) {
            const resolvedPath = resolveImportPath(file.path, imp.importPath, filePathMap);
            if (!resolvedPath) {
                // Skip external dependencies silently (Node.js built-ins, npm packages)
                if (shouldIgnoreImport(imp.importPath)) {
                    continue;
                }
                // Only warn about unresolved internal imports (relative paths)
                console.warn(`[GraphBuilder] Cannot resolve import '${imp.importPath}' from ${file.path}`);
                continue;
            }
            const toId = fileIdMap.get(resolvedPath);
            if (!toId) {
                console.warn(`[GraphBuilder] Import target not found: ${resolvedPath}`);
                continue;
            }
            // Deduplicate edges
            const edgeKey = `${fromId}->${toId}`;
            if (!edgeKeys.has(edgeKey)) {
                edges.push({
                    type: 'import',
                    from: fromId,
                    to: toId,
                    status: 'normal',
                });
                edgeKeys.add(edgeKey);
            }
        }
    }
    return edges;
}
/**
 * Create implement edges from parsed files (Phase 3)
 *
 * Generates ImplementEdge for each cross-file interface implementation.
 * Skips intra-file implementations and missing interface files.
 *
 * @param files - Parsed files with implements information
 * @param filePathMap - Map of file paths for import resolution
 * @param fileIdMap - Map from file path to node ID
 * @returns Array of ImplementEdge objects
 */
function createImplementEdges(files, filePathMap, fileIdMap) {
    const edges = [];
    const edgeKeys = new Set();
    for (const file of files) {
        const fromId = fileIdMap.get(file.path);
        if (!fromId)
            continue;
        // Skip files without implements
        if (!file.implements || file.implements.length === 0)
            continue;
        for (const impl of file.implements) {
            for (const interfaceName of impl.interfaces) {
                const importPath = impl.interfacePaths.get(interfaceName);
                // Skip intra-file implementations (no import path)
                if (!importPath) {
                    console.log(`[GraphBuilder] Skipping intra-file implementation: ${impl.className} implements ${interfaceName} in ${file.path}`);
                    continue;
                }
                // Resolve interface file path
                const resolvedPath = resolveImportPath(file.path, importPath, filePathMap);
                if (!resolvedPath) {
                    console.warn(`[GraphBuilder] Cannot resolve interface '${interfaceName}' from import '${importPath}' in ${file.path}`);
                    continue;
                }
                const toId = fileIdMap.get(resolvedPath);
                if (!toId) {
                    console.warn(`[GraphBuilder] Interface file not found: ${resolvedPath} (interface ${interfaceName})`);
                    continue;
                }
                // Create implement edge
                const edgeKey = `${fromId}->${toId}:${interfaceName}`;
                if (!edgeKeys.has(edgeKey)) {
                    edges.push({
                        type: 'implement',
                        from: fromId,
                        to: toId,
                        status: 'normal',
                        symbolName: interfaceName,
                        importPath: importPath,
                    });
                    edgeKeys.add(edgeKey);
                }
            }
        }
    }
    console.log(`[GraphBuilder] Created ${edges.length} implement edges`);
    return edges;
}
/**
 * Create render edges from parsed files (Phase 4)
 *
 * Generates RenderEdge for each JSX component rendering relationship.
 * Skips unresolved component paths and logs warnings.
 *
 * @param files - Parsed files with render information
 * @param filePathMap - Map of file paths for import resolution
 * @param fileIdMap - Map from file path to node ID
 * @returns Array of RenderEdge objects
 */
function createRenderEdges(files, filePathMap, fileIdMap) {
    const edges = [];
    const edgeKeys = new Set();
    for (const file of files) {
        const fromId = fileIdMap.get(file.path);
        if (!fromId)
            continue;
        // Skip files without renders
        if (!file.renders || file.renders.length === 0)
            continue;
        // Build component name to import path mapping
        const componentImportMap = new Map();
        for (const imp of file.imports) {
            // For each imported symbol, map it to the import path
            // This handles: import { Header } from './Header'
            // And: import Header from './Header'
            // Note: We rely on the component name from RenderInfo matching the import name
            // Simple heuristic: check if import path could match component
            // More sophisticated: parse import statement to get exact symbol names
            // For MVP, we'll use a simple mapping from the import info
            // Extract potential component name from import path
            // './Header' -> 'Header', './components/UserCard' -> 'UserCard'
            const pathParts = imp.importPath.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            const potentialName = lastPart.replace(/\.(ts|tsx|js|jsx)$/, '');
            componentImportMap.set(potentialName, imp.importPath);
        }
        for (const render of file.renders) {
            // Get the base component name (before any namespace)
            const baseName = render.isNamespaced
                ? render.componentName.split('.')[0]
                : render.componentName;
            // Look up import path for this component
            const importPath = componentImportMap.get(baseName) ||
                componentImportMap.get(render.componentName);
            if (!importPath) {
                console.warn(`[GraphBuilder] Cannot find import for rendered component '${render.componentName}' in ${file.path}`);
                continue;
            }
            // Resolve component file path
            const resolvedPath = resolveImportPath(file.path, importPath, filePathMap);
            if (!resolvedPath) {
                console.warn(`[GraphBuilder] Cannot resolve component '${render.componentName}' from import '${importPath}' in ${file.path}`);
                continue;
            }
            const toId = fileIdMap.get(resolvedPath);
            if (!toId) {
                console.warn(`[GraphBuilder] Component file not found: ${resolvedPath} (component ${render.componentName})`);
                continue;
            }
            // Create render edge
            const edgeKey = `${fromId}->${toId}:${render.position}`;
            if (!edgeKeys.has(edgeKey)) {
                edges.push({
                    type: 'render',
                    from: fromId,
                    to: toId,
                    status: 'normal',
                    position: render.position,
                });
                edgeKeys.add(edgeKey);
            }
        }
    }
    console.log(`[GraphBuilder] Created ${edges.length} render edges`);
    return edges;
}
//# sourceMappingURL=builder.js.map