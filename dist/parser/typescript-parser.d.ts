/**
 * TypeScript/JavaScript parser using tree-sitter
 *
 * Extracts import relationships from source files
 */
import Parser from 'tree-sitter';
import type { ParsedFile } from '../core/types.js';
/**
 * Initialize tree-sitter parser with TypeScript grammar
 */
export declare function createParser(): Parser;
/**
 * Parse a single file to extract import information
 *
 * @param filePath - Absolute path to the file
 * @param parser - tree-sitter parser instance
 * @returns Parsed file with imports, or null if parsing fails
 */
export declare function parseFile(filePath: string, parser: Parser): Promise<ParsedFile | null>;
/**
 * Parse all files in a project directory
 *
 * @param projectPath - Root directory of the project
 * @returns Array of parsed files
 */
export declare function parseProject(projectPath: string): Promise<ParsedFile[]>;
//# sourceMappingURL=typescript-parser.d.ts.map