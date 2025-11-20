/**
 * Dependency graph builder
 *
 * Constructs a Graph from parsed files
 */
import * as path from 'path';
import * as crypto from 'crypto';
/**
 * Build dependency graph from parsed files
 *
 * @param files - Parsed files with import information
 * @returns Complete dependency graph
 */
export function buildGraph(files) {
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
    // Create edges for all imports
    for (const file of files) {
        const fromId = generateNodeId(file.path);
        for (const imp of file.imports) {
            const resolvedPath = resolveImportPath(file.path, imp.importPath);
            if (!resolvedPath) {
                console.warn(`[GraphBuilder] Cannot resolve import '${imp.importPath}' from ${file.path}`);
                continue;
            }
            const toId = generateNodeId(resolvedPath);
            // Check if target node exists
            if (!nodes.has(toId)) {
                console.warn(`[GraphBuilder] Import target not found: ${resolvedPath}`);
                // Optionally create a node with status 'removed'
                // For Phase 1, we skip the edge
                continue;
            }
            // Create edge
            const edgeKey = `${fromId}->${toId}`;
            if (!edges.has(edgeKey)) {
                const edge = {
                    type: 'import',
                    from: fromId,
                    to: toId,
                    status: 'normal',
                };
                edges.set(edgeKey, edge);
            }
        }
    }
    // Detect circular dependencies
    detectCircularDependencies(Array.from(edges.values()));
    return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
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
 * @returns Resolved absolute path, or null if cannot resolve
 */
export function resolveImportPath(fromFile, importPath) {
    // Skip external packages (no leading . or /)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null;
    }
    // Resolve relative to the file's directory
    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, importPath);
    // Try common extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.d.ts'];
    for (const ext of extensions) {
        const candidate = resolved + ext;
        // We can't use fs.existsSync here because it's synchronous
        // For now, assume the import is valid if it's in the parsed files
        // The caller will check if the node exists
        return candidate;
    }
    return resolved;
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
//# sourceMappingURL=builder.js.map