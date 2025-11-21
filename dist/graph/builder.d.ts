/**
 * Dependency graph builder
 *
 * Constructs a Graph from parsed files
 */
import type { Graph, ParsedFile, GetDependencyGraphOptions, FileChanges, DiffResult } from '../core/types.js';
/**
 * Build dependency graph from parsed files
 *
 * @param files - Parsed files with import information
 * @param options - Options for graph construction (level support)
 * @param projectPath - Project root directory (for resolving path aliases)
 * @returns Complete dependency graph
 */
export declare function buildGraph(files: ParsedFile[], options?: GetDependencyGraphOptions, projectPath?: string): Graph;
/**
 * Generate unique node ID from file path
 *
 * Strategy: Use a short hash of the absolute path
 */
export declare function generateNodeId(filePath: string): string;
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
export declare function resolveImportPath(fromFile: string, importPath: string, filePathMap: Map<string, string>, projectPath?: string): string | null;
/**
 * Build diff between old and new graphs (Phase 5)
 *
 * @param oldGraph - Previous graph state
 * @param newGraph - Current graph state
 * @param changes - File changes information
 * @returns DiffResult with added, removed, and modified graphs
 */
export declare function buildDiff(oldGraph: Graph, newGraph: Graph, changes: FileChanges): DiffResult;
//# sourceMappingURL=builder.d.ts.map