/**
 * TypeScript/JavaScript parser using tree-sitter
 *
 * Extracts import relationships from source files
 */

import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { ParsedFile, ImportInfo } from '../core/types.js'

/**
 * Initialize tree-sitter parser with TypeScript grammar
 */
export function createParser(): Parser {
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)
  return parser
}

/**
 * Parse a single file to extract import information
 *
 * @param filePath - Absolute path to the file
 * @param parser - tree-sitter parser instance
 * @returns Parsed file with imports, or null if parsing fails
 */
export async function parseFile(
  filePath: string,
  parser: Parser
): Promise<ParsedFile | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const tree = parser.parse(content)
    const imports = extractImports(tree.rootNode)

    return {
      path: filePath,
      imports,
    }
  } catch (error) {
    console.warn(`[Parser] Failed to parse ${filePath}:`, error)
    return null
  }
}

/**
 * Extract import information from AST
 */
function extractImports(rootNode: Parser.SyntaxNode): ImportInfo[] {
  const imports: ImportInfo[] = []

  function traverse(node: Parser.SyntaxNode) {
    // import_statement: import { foo } from './bar'
    if (node.type === 'import_statement') {
      const importPath = extractImportPath(node)
      if (importPath) {
        imports.push({
          importPath,
          isTypeOnly: isTypeOnlyImport(node),
          isDynamic: false,
        })
      }
    }

    // export_statement: export { foo } from './bar'
    if (node.type === 'export_statement') {
      const importPath = extractImportPath(node)
      if (importPath) {
        imports.push({
          importPath,
          isTypeOnly: false,
          isDynamic: false,
        })
      }
    }

    // dynamic import: import('./bar')
    if (node.type === 'call_expression') {
      const callee = node.childForFieldName('function')
      if (callee?.type === 'import') {
        const args = node.childForFieldName('arguments')
        if (args) {
          const importPath = extractStringFromArguments(args)
          if (importPath) {
            imports.push({
              importPath,
              isTypeOnly: false,
              isDynamic: true,
            })
          }
        }
      }
    }

    // Traverse children
    for (const child of node.children) {
      traverse(child)
    }
  }

  traverse(rootNode)
  return imports
}

/**
 * Extract import path from import/export statement
 */
function extractImportPath(node: Parser.SyntaxNode): string | null {
  // Look for string literal in the statement
  for (const child of node.children) {
    if (child.type === 'string' || child.type === 'string_fragment') {
      return extractStringLiteral(child)
    }
    // Recurse into nested nodes
    const nested = extractImportPath(child)
    if (nested) return nested
  }
  return null
}

/**
 * Extract string content from string literal node
 */
function extractStringLiteral(node: Parser.SyntaxNode): string | null {
  const text = node.text
  if (!text) return null

  // Remove quotes
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1)
  }
  if (text.startsWith('`') && text.endsWith('`')) {
    return text.slice(1, -1)
  }

  return text
}

/**
 * Extract string from arguments node
 */
function extractStringFromArguments(argsNode: Parser.SyntaxNode): string | null {
  // Look for string literal in arguments
  for (const child of argsNode.children) {
    if (child.type === 'string') {
      return extractStringLiteral(child)
    }
  }
  return null
}

/**
 * Check if import is type-only
 */
function isTypeOnlyImport(node: Parser.SyntaxNode): boolean {
  // import type { Foo } from './bar'
  // The 'type' keyword appears as a direct child of import_statement
  for (const child of node.children) {
    if (child.type === 'type') {
      return true
    }
  }
  return false
}

/**
 * Parse all files in a project directory
 *
 * @param projectPath - Root directory of the project
 * @returns Array of parsed files
 */
export async function parseProject(projectPath: string): Promise<ParsedFile[]> {
  const parser = createParser()
  const files = await findSourceFiles(projectPath)

  console.log(`[Parser] Found ${files.length} source files`)

  const results = await Promise.all(
    files.map((file) => parseFile(file, parser))
  )

  return results.filter((r): r is ParsedFile => r !== null)
}

/**
 * Find all TypeScript/JavaScript source files in a directory
 */
async function findSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function traverse(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        // Skip ignored directories
        if (entry.isDirectory()) {
          if (shouldIgnoreDirectory(entry.name)) {
            continue
          }
          await traverse(fullPath)
        } else if (entry.isFile()) {
          if (isSourceFile(entry.name)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`[Parser] Failed to read directory ${currentDir}:`, error)
    }
  }

  await traverse(dir)
  return files
}

/**
 * Check if a directory should be ignored
 */
function shouldIgnoreDirectory(name: string): boolean {
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
  ]
  return ignoredDirs.includes(name)
}

/**
 * Check if a file is a TypeScript/JavaScript source file
 */
function isSourceFile(filename: string): boolean {
  const ext = path.extname(filename)
  return ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'].includes(ext)
}
