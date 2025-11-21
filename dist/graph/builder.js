/**
 * Dependency graph builder
 *
 * Constructs a Graph from parsed files
 */
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { detectHierarchy } from '../parser/hierarchy-detector.js';
/**
 * Path alias configuration cache
 * Maps alias patterns to base paths (e.g., "@/*" -> "/project/src/*")
 */
let pathAliasCache = null;
/**
 * Load path aliases from tsconfig.json or jsconfig.json
 *
 * @param projectPath - Project root directory
 * @returns Map of alias patterns to base paths
 */
function loadPathAliases(projectPath) {
    if (pathAliasCache) {
        return pathAliasCache;
    }
    const aliases = new Map();
    // Try tsconfig.json first, then jsconfig.json
    const configFiles = ['tsconfig.json', 'jsconfig.json'];
    for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        if (!fs.existsSync(configPath))
            continue;
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            // Simple JSON parse (ignoring comments for now)
            const config = JSON.parse(content.replace(/\/\/.*$/gm, ''));
            const paths = config.compilerOptions?.paths;
            const baseUrl = config.compilerOptions?.baseUrl || '.';
            if (paths) {
                for (const [pattern, targets] of Object.entries(paths)) {
                    // Convert glob pattern to simple prefix match
                    // "@/*" -> "@/"
                    // "~/*" -> "~/"
                    const prefix = pattern.replace(/\/\*$/, '/');
                    // Take first target path
                    const targetPattern = targets[0];
                    if (!targetPattern)
                        continue;
                    // Resolve target relative to baseUrl
                    // "./src/*" -> "/absolute/path/to/src"
                    const targetPath = targetPattern.replace(/\/\*$/, '');
                    const absoluteTarget = path.resolve(projectPath, baseUrl, targetPath);
                    aliases.set(prefix, absoluteTarget);
                }
                console.log(`[PathAlias] Loaded ${aliases.size} path aliases from ${configFile}`);
                for (const [prefix, target] of aliases) {
                    console.log(`  ${prefix} -> ${target}`);
                }
                break;
            }
        }
        catch (error) {
            console.warn(`[PathAlias] Failed to parse ${configFile}:`, error);
        }
    }
    pathAliasCache = aliases;
    return aliases;
}
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
 * @param options - Options for graph construction (level support)
 * @param projectPath - Project root directory (for resolving path aliases)
 * @returns Complete dependency graph
 */
export function buildGraph(files, options, projectPath) {
    const level = options?.level ?? 'file'; // Default to file-level (backward compatible)
    const edgeTypes = options?.edgeTypes ?? ['import']; // Default to import-only (backward compatible)
    const mode = options?.mode ?? 'global'; // Default to global view (Phase 6)
    const focusPath = options?.focusPath;
    const neighborDepth = options?.neighborDepth ?? 1;
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
    // Phase 6: Focused mode - show internal low-level dependencies
    if (mode === 'focused' && focusPath) {
        const internalLevel = options?.internalLevel ?? 'file';
        return buildFocusedGraph(files, filePathMap, level, edgeTypes, focusPath, internalLevel, projectPath);
    }
    let graph;
    if (level === 'file') {
        // File-level graph only
        graph = buildFileGraph(files, filePathMap, edgeTypes, projectPath);
    }
    else if (level === 'interface') {
        // Interface-level graph: show type definitions
        graph = buildInterfaceGraph(files, filePathMap);
    }
    else {
        // Architecture, module, or component-level graph
        graph = buildHierarchyGraph(files, filePathMap, level, projectPath);
    }
    // Apply view filtering for neighbors mode (Phase 6)
    if (mode === 'neighbors' && focusPath) {
        graph = filterGraphByNeighbors(graph, focusPath, neighborDepth);
    }
    return graph;
}
/**
 * Build focused graph showing internal dependencies (Phase 6)
 *
 * When focusing on a high-level entity (module/component), shows
 * internal low-level dependencies (file/interface level).
 *
 * @param files - All parsed files
 * @param filePathMap - Map for import resolution
 * @param level - Focus level (module/component/architecture)
 * @param edgeTypes - Edge types to include
 * @param focusPath - Path to focus on
 * @param internalLevel - Level for internal analysis (file/interface)
 * @returns Graph of internal dependencies
 */
function buildFocusedGraph(files, filePathMap, level, edgeTypes, focusPath, internalLevel, projectPath) {
    // Step 1: Filter files belonging to the focus entity
    const focusFiles = files.filter(file => {
        const hierarchy = detectHierarchy(file.path);
        if (level === 'architecture') {
            return hierarchy.architecture === focusPath;
        }
        else if (level === 'module') {
            return hierarchy.module === focusPath;
        }
        else if (level === 'component') {
            // Match component like 'parser/lexer' or just 'lexer'
            if (hierarchy.module && hierarchy.component) {
                const fullPath = `${hierarchy.module}/${hierarchy.component}`;
                return fullPath === focusPath || hierarchy.component === focusPath;
            }
            return hierarchy.module === focusPath;
        }
        else if (level === 'file') {
            // For file level, match by path
            return file.path.includes(focusPath) || file.path.endsWith(focusPath);
        }
        else if (level === 'interface') {
            // For interface level, check if file contains matching type
            return file.typeDefinitions?.some(td => td.name === focusPath) ?? false;
        }
        return false;
    });
    if (focusFiles.length === 0) {
        console.warn(`[GraphBuilder] No files found matching focus path: ${focusPath}`);
        return { nodes: [], edges: [] };
    }
    console.log(`[GraphBuilder] Focused on ${focusPath}: found ${focusFiles.length} files`);
    // Step 2: Build graph at internal level using only focus files
    if (internalLevel === 'interface') {
        // Build interface graph for focus files
        const graph = buildInterfaceGraph(focusFiles, filePathMap);
        console.log(`[GraphBuilder] Focused interface view: ${graph.nodes.length} types, ${graph.edges.length} relationships`);
        return graph;
    }
    else {
        // Build file graph for focus files
        const graph = buildFileGraph(focusFiles, filePathMap, edgeTypes, projectPath);
        console.log(`[GraphBuilder] Focused file view: ${graph.nodes.length} files, ${graph.edges.length} edges`);
        return graph;
    }
}
/**
 * Filter graph by neighbors mode (Phase 6)
 *
 * Shows focus node(s) plus nodes within neighborDepth.
 *
 * @param graph - Complete graph to filter
 * @param focusPath - Path to focus on
 * @param neighborDepth - Depth for neighbor traversal
 * @returns Filtered graph
 */
function filterGraphByNeighbors(graph, focusPath, neighborDepth) {
    // Find focus node(s) by matching path
    const focusNodes = graph.nodes.filter(node => {
        const nodePath = node.type === 'hierarchy' ? node.path : node.path;
        // Match by exact path, basename, or partial path
        return nodePath === focusPath ||
            nodePath.endsWith(focusPath) ||
            nodePath.includes(focusPath);
    });
    if (focusNodes.length === 0) {
        console.warn(`[GraphBuilder] No nodes found matching focus path: ${focusPath}`);
        return { nodes: [], edges: [] };
    }
    const focusNodeIds = new Set(focusNodes.map(n => n.id));
    const includedNodeIds = new Set(focusNodeIds);
    // Build adjacency lists for both directions
    const outgoing = new Map();
    const incoming = new Map();
    for (const edge of graph.edges) {
        if (!outgoing.has(edge.from))
            outgoing.set(edge.from, new Set());
        if (!incoming.has(edge.to))
            incoming.set(edge.to, new Set());
        outgoing.get(edge.from).add(edge.to);
        incoming.get(edge.to).add(edge.from);
    }
    // BFS to find neighbors up to depth
    let currentLevel = new Set(focusNodeIds);
    for (let depth = 0; depth < neighborDepth; depth++) {
        const nextLevel = new Set();
        for (const nodeId of currentLevel) {
            // Add outgoing neighbors (dependencies)
            const deps = outgoing.get(nodeId) || new Set();
            for (const dep of deps) {
                if (!includedNodeIds.has(dep)) {
                    includedNodeIds.add(dep);
                    nextLevel.add(dep);
                }
            }
            // Add incoming neighbors (dependents)
            const dependents = incoming.get(nodeId) || new Set();
            for (const dependent of dependents) {
                if (!includedNodeIds.has(dependent)) {
                    includedNodeIds.add(dependent);
                    nextLevel.add(dependent);
                }
            }
        }
        currentLevel = nextLevel;
    }
    // Filter nodes and edges
    const filteredNodes = graph.nodes.filter(node => includedNodeIds.has(node.id));
    const filteredEdges = graph.edges.filter(edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to));
    console.log(`[GraphBuilder] Neighbors view (depth=${neighborDepth}): ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);
    return {
        nodes: filteredNodes,
        edges: filteredEdges,
    };
}
/**
 * Build file-level graph (Phase 1 behavior, Phase 3: edge filtering)
 */
function buildFileGraph(files, filePathMap, edgeTypes = ['import'], projectPath) {
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
        const importEdges = createImportEdges(files, filePathMap, fileIdMap, projectPath);
        for (const edge of importEdges) {
            const edgeKey = `import:${edge.from}->${edge.to}`;
            edges.set(edgeKey, edge);
        }
    }
    if (edgeTypes.includes('implement')) {
        const implementEdges = createImplementEdges(files, filePathMap, fileIdMap, projectPath);
        for (const edge of implementEdges) {
            const edgeKey = `implement:${edge.from}->${edge.to}`;
            edges.set(edgeKey, edge);
        }
    }
    if (edgeTypes.includes('render')) {
        const renderEdges = createRenderEdges(files, filePathMap, fileIdMap, projectPath);
        for (const edge of renderEdges) {
            const edgeKey = `render:${edge.from}->${edge.to}:${edge.position}`;
            edges.set(edgeKey, edge);
        }
    }
    return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
    };
}
/**
 * Extract hierarchy key based on level
 *
 * @param hierarchy - Hierarchy info from detectHierarchy
 * @param level - Target aggregation level
 * @returns Key for grouping files, or null if not applicable
 *
 * @example
 * // For module level, group by module name
 * extractHierarchyKey({ module: 'core', component: 'types' }, 'module') -> 'core'
 *
 * // For component level, group by module/component
 * extractHierarchyKey({ module: 'parser', component: 'lexer' }, 'component') -> 'parser/lexer'
 *
 * // For architecture level, group by architecture name (monorepo only)
 * extractHierarchyKey({ architecture: 'server', module: 'core' }, 'architecture') -> 'server'
 */
function extractHierarchyKey(hierarchy, level) {
    if (level === 'architecture') {
        // Only return architecture if explicitly detected (packages/xxx or apps/xxx)
        // Do NOT fall back to module - architecture is for monorepo only
        return hierarchy.architecture || null;
    }
    if (level === 'module') {
        return hierarchy.module || null;
    }
    if (level === 'component') {
        // For component level, need both module and component
        if (hierarchy.module && hierarchy.component) {
            return `${hierarchy.module}/${hierarchy.component}`;
        }
        // Fall back to module if no component (flat structure)
        return hierarchy.module || null;
    }
    return null;
}
/**
 * Build hierarchy graph (architecture, module, or component level)
 * Returns only aggregated nodes with aggregated edges
 */
function buildHierarchyGraph(files, filePathMap, level, projectPath) {
    const parentNodes = new Map();
    const fileToParent = new Map();
    // Step 1: Detect hierarchy for each file and create parent nodes
    for (const file of files) {
        const hierarchy = detectHierarchy(file.path);
        const key = extractHierarchyKey(hierarchy, level);
        if (!key)
            continue;
        const parentId = `${level}:${key}`;
        fileToParent.set(file.path, parentId);
        // Create parent node if not exists
        if (!parentNodes.has(parentId)) {
            const parentNode = {
                type: 'hierarchy',
                level: level,
                id: parentId,
                path: key,
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
            const resolvedPath = resolveImportPath(file.path, imp.importPath, filePathMap, projectPath);
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
    // Return only parent nodes (architecture/modules/components), not file nodes
    // This provides a clean hierarchical view at the requested level
    return {
        nodes: Array.from(parentNodes.values()),
        edges: Array.from(aggregatedEdges.values()),
    };
}
/**
 * Build interface-level graph
 * Shows type definitions (interface/type/class/enum) as nodes
 * with extends/implements relationships as edges
 */
function buildInterfaceGraph(files, _filePathMap) {
    const nodes = new Map();
    const edges = new Map();
    // Map from type name to node ID for resolving references
    const typeNameToId = new Map();
    // Step 1: Create nodes for all type definitions
    for (const file of files) {
        if (!file.typeDefinitions)
            continue;
        for (const typeDef of file.typeDefinitions) {
            const nodeId = `${typeDef.kind}:${typeDef.name}-${generateShortHash(file.path)}`;
            const node = {
                type: 'abstract',
                kind: typeDef.kind,
                id: nodeId,
                path: file.path,
                name: typeDef.name,
                isExported: typeDef.isExported,
                status: 'normal',
            };
            nodes.set(nodeId, node);
            typeNameToId.set(typeDef.name, nodeId);
        }
    }
    // Step 2: Create edges for extends/implements/references relationships
    for (const file of files) {
        if (!file.typeDefinitions)
            continue;
        for (const typeDef of file.typeDefinitions) {
            const fromId = typeNameToId.get(typeDef.name);
            if (!fromId)
                continue;
            // Handle extends relationships
            if (typeDef.extends) {
                for (const extendedType of typeDef.extends) {
                    const toId = typeNameToId.get(extendedType);
                    if (toId) {
                        const edgeKey = `extends:${fromId}->${toId}`;
                        if (!edges.has(edgeKey)) {
                            edges.set(edgeKey, {
                                type: 'implement', // Reuse implement edge type for extends
                                from: fromId,
                                to: toId,
                                status: 'normal',
                                symbolName: extendedType,
                            });
                        }
                    }
                }
            }
            // Handle implements relationships (for classes)
            if (typeDef.implements) {
                for (const implementedType of typeDef.implements) {
                    const toId = typeNameToId.get(implementedType);
                    if (toId) {
                        const edgeKey = `implements:${fromId}->${toId}`;
                        if (!edges.has(edgeKey)) {
                            edges.set(edgeKey, {
                                type: 'implement',
                                from: fromId,
                                to: toId,
                                status: 'normal',
                                symbolName: implementedType,
                            });
                        }
                    }
                }
            }
            // Handle type references (union members, property types, etc.)
            if (typeDef.references) {
                for (const referencedType of typeDef.references) {
                    const toId = typeNameToId.get(referencedType);
                    if (toId && toId !== fromId) { // Skip self-references
                        const edgeKey = `uses:${fromId}->${toId}`;
                        if (!edges.has(edgeKey)) {
                            edges.set(edgeKey, {
                                type: 'use',
                                from: fromId,
                                to: toId,
                                status: 'normal',
                                symbolName: referencedType,
                            });
                        }
                    }
                }
            }
        }
    }
    const nodeCount = nodes.size;
    const edgeCount = edges.size;
    console.log(`[GraphBuilder] Created interface graph with ${nodeCount} type definitions and ${edgeCount} relationships`);
    return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
    };
}
/**
 * Generate short hash for node ID
 */
function generateShortHash(input) {
    return crypto.createHash('sha256').update(input).digest('hex').slice(-8);
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
 * Supports:
 * - Relative imports: './utils', '../models/User'
 * - Absolute imports: '/absolute/path'
 * - Path aliases: '@/components', '~/lib' (via tsconfig.json)
 *
 * @param fromFile - File containing the import
 * @param importPath - Import path
 * @param filePathMap - Map of available file paths for lookup
 * @param projectPath - Project root directory (for resolving path aliases)
 * @returns Resolved absolute path, or null if cannot resolve
 */
export function resolveImportPath(fromFile, importPath, filePathMap, projectPath) {
    let resolved;
    // Check if this is a path alias (e.g., @/*, ~/*)
    if (projectPath && !importPath.startsWith('.') && !importPath.startsWith('/')) {
        const aliases = loadPathAliases(projectPath);
        // Try to match against known aliases
        for (const [prefix, basePath] of aliases) {
            if (importPath.startsWith(prefix)) {
                // Replace alias prefix with base path
                // "@/components/Button" -> "/project/src/components/Button"
                const relativePath = importPath.slice(prefix.length);
                resolved = path.join(basePath, relativePath);
                break;
            }
        }
        // If no alias matched, this is an external package
        if (!resolved) {
            return null;
        }
    }
    else if (importPath.startsWith('.') || importPath.startsWith('/')) {
        // Relative or absolute path
        const fromDir = path.dirname(fromFile);
        resolved = importPath.startsWith('/')
            ? importPath
            : path.resolve(fromDir, importPath);
    }
    else {
        // External package (no alias matched and no . or / prefix)
        return null;
    }
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
 * Create import edges from parsed files (Phase 3: extracted from buildFileGraph)
 *
 * @param files - Parsed files with import information
 * @param filePathMap - Map of file paths for import resolution
 * @param fileIdMap - Map from file path to node ID
 * @param projectPath - Project root directory (for resolving path aliases)
 * @returns Array of ImportEdge objects
 */
function createImportEdges(files, filePathMap, fileIdMap, projectPath) {
    const edges = [];
    const edgeKeys = new Set();
    for (const file of files) {
        const fromId = fileIdMap.get(file.path);
        if (!fromId)
            continue;
        for (const imp of file.imports) {
            const resolvedPath = resolveImportPath(file.path, imp.importPath, filePathMap, projectPath);
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
 * @param projectPath - Project root directory (for resolving path aliases)
 * @returns Array of ImplementEdge objects
 */
function createImplementEdges(files, filePathMap, fileIdMap, projectPath) {
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
                const resolvedPath = resolveImportPath(file.path, importPath, filePathMap, projectPath);
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
 * @param projectPath - Project root directory (for resolving path aliases)
 * @returns Array of RenderEdge objects
 */
function createRenderEdges(files, filePathMap, fileIdMap, projectPath) {
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
            const resolvedPath = resolveImportPath(file.path, importPath, filePathMap, projectPath);
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
/**
 * Build diff between old and new graphs (Phase 5)
 *
 * @param oldGraph - Previous graph state
 * @param newGraph - Current graph state
 * @param changes - File changes information
 * @returns DiffResult with added, removed, and modified graphs
 */
export function buildDiff(oldGraph, newGraph, changes) {
    // Build lookup maps for efficient comparison
    const oldNodeMap = new Map(oldGraph.nodes.map(n => [n.id, n]));
    const newNodeMap = new Map(newGraph.nodes.map(n => [n.id, n]));
    const oldEdgeMap = new Map(oldGraph.edges.map(e => [`${e.type}:${e.from}->${e.to}`, e]));
    const newEdgeMap = new Map(newGraph.edges.map(e => [`${e.type}:${e.from}->${e.to}`, e]));
    // Find added nodes and edges
    const addedNodes = [];
    const addedEdges = [];
    for (const [id, node] of newNodeMap) {
        if (!oldNodeMap.has(id)) {
            addedNodes.push({ ...node, status: 'added' });
        }
    }
    for (const [key, edge] of newEdgeMap) {
        if (!oldEdgeMap.has(key)) {
            addedEdges.push({ ...edge, status: 'added' });
        }
    }
    // Find removed nodes and edges
    const removedNodes = [];
    const removedEdges = [];
    for (const [id, node] of oldNodeMap) {
        if (!newNodeMap.has(id)) {
            removedNodes.push({ ...node, status: 'removed' });
        }
    }
    for (const [key, edge] of oldEdgeMap) {
        if (!newEdgeMap.has(key)) {
            removedEdges.push({ ...edge, status: 'removed' });
        }
    }
    // Find modified nodes (nodes in both but file was modified)
    const modifiedNodes = [];
    const modifiedEdges = [];
    // Build set of modified file paths for quick lookup
    const modifiedPaths = new Set(changes.modified);
    for (const [id, newNode] of newNodeMap) {
        if (oldNodeMap.has(id)) {
            // Check if this node's file was modified
            const nodePath = newNode.type === 'hierarchy' ? newNode.path : newNode.path;
            if (modifiedPaths.has(nodePath)) {
                modifiedNodes.push({ ...newNode, status: 'modified' });
            }
        }
    }
    // Edges involving modified nodes are also modified
    for (const [key, edge] of newEdgeMap) {
        if (oldEdgeMap.has(key)) {
            const fromNode = newNodeMap.get(edge.from);
            const toNode = newNodeMap.get(edge.to);
            const fromPath = fromNode?.type === 'hierarchy' ? fromNode.path : fromNode?.path;
            const toPath = toNode?.type === 'hierarchy' ? toNode.path : toNode?.path;
            if ((fromPath && modifiedPaths.has(fromPath)) || (toPath && modifiedPaths.has(toPath))) {
                modifiedEdges.push({ ...edge, status: 'modified' });
            }
        }
    }
    // Detect circular dependencies in new graph
    const circularInfo = detectCircularDependenciesWithPaths(newGraph.edges);
    const result = {
        added: {
            nodes: addedNodes,
            edges: addedEdges,
        },
        removed: {
            nodes: removedNodes,
            edges: removedEdges,
        },
        modified: {
            nodes: modifiedNodes,
            edges: modifiedEdges,
        },
        summary: {
            addedNodes: addedNodes.length,
            removedNodes: removedNodes.length,
            addedEdges: addedEdges.length,
            removedEdges: removedEdges.length,
            hasCircularDependency: circularInfo.hasCycle,
            circularPaths: circularInfo.cycles.length > 0 ? circularInfo.cycles : undefined,
        },
    };
    console.log(`[GraphBuilder] Diff result: +${addedNodes.length} nodes, -${removedNodes.length} nodes, ~${modifiedNodes.length} modified`);
    return result;
}
/**
 * Detect circular dependencies and return paths (Phase 5)
 *
 * @param edges - All edges in the graph
 * @returns Object with hasCycle flag and cycle paths
 */
function detectCircularDependenciesWithPaths(edges) {
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
    const inStack = new Set();
    const cycles = [];
    function dfs(node, path) {
        visited.add(node);
        inStack.add(node);
        path.push(node);
        const neighbors = adjList.get(node) || new Set();
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                dfs(neighbor, path);
            }
            else if (inStack.has(neighbor)) {
                // Found a cycle
                const cycleStart = path.indexOf(neighbor);
                const cycle = path.slice(cycleStart);
                cycles.push([...cycle, neighbor]);
            }
        }
        inStack.delete(node);
        path.pop();
    }
    for (const node of adjList.keys()) {
        if (!visited.has(node)) {
            dfs(node, []);
        }
    }
    return {
        hasCycle: cycles.length > 0,
        cycles,
    };
}
//# sourceMappingURL=builder.js.map