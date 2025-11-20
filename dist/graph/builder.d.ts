/**
 * Dependency graph builder
 *
 * Constructs a Graph from parsed files
 */
import type { Graph, ParsedFile } from '../core/types.js';
/**
 * Build dependency graph from parsed files
 *
 * @param files - Parsed files with import information
 * @returns Complete dependency graph
 */
export declare function buildGraph(files: ParsedFile[]): Graph;
/**
 * Generate unique node ID from file path
 *
 * Strategy: Use a short hash of the absolute path
 */
export declare function generateNodeId(filePath: string): string;
/**
 * Resolve import path to absolute file path
 *
 * @param fromFile - File containing the import
 * @param importPath - Import path (e.g., './utils', '../models/User')
 * @returns Resolved absolute path, or null if cannot resolve
 */
export declare function resolveImportPath(fromFile: string, importPath: string): string | null;
//# sourceMappingURL=builder.d.ts.map