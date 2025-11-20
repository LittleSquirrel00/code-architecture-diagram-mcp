/**
 * Hierarchy detection from directory structure
 *
 * Detects module and component boundaries using standard project patterns.
 * Uses simple pattern matching - no configuration needed.
 */

export type HierarchyLevel = 'module' | 'component' | 'file'

export interface HierarchyInfo {
  level: HierarchyLevel
  parent?: string // Relative path to parent (e.g., 'src/modules/auth')
}

interface Pattern {
  regex: RegExp
  level: 'module' | 'component'
  captureIndex: number // Which capture group contains the parent name
}

/**
 * Patterns for detecting hierarchy, in priority order
 * Priority: modules > features > components > ui
 *
 * Note: Only explicitly recognized directory patterns are treated as hierarchy levels.
 * Directories like utils/, lib/, hooks/, etc. fall back to file-level.
 */
const PATTERNS: Pattern[] = [
  // Module patterns (specific directories with higher priority)
  { regex: /src\/modules\/([^\/]+)/i, level: 'module', captureIndex: 0 },
  { regex: /src\/features\/([^\/]+)/i, level: 'module', captureIndex: 0 },

  // Component patterns
  { regex: /src\/components\/([^\/]+)/i, level: 'component', captureIndex: 0 },
  { regex: /src\/ui\/([^\/]+)/i, level: 'component', captureIndex: 0 },
]

/**
 * Detect hierarchy level and parent from file path
 *
 * @param filePath - Absolute or relative file path
 * @returns Hierarchy information
 *
 * @example
 * detectHierarchy('/proj/src/modules/auth/login.ts')
 * // => { level: 'module', parent: 'src/modules/auth' }
 *
 * detectHierarchy('/proj/src/utils/helpers.ts')
 * // => { level: 'file' }
 */
export function detectHierarchy(filePath: string): HierarchyInfo {
  // Normalize path to use forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/')

  // Try each pattern in priority order
  for (const pattern of PATTERNS) {
    const match = normalizedPath.match(pattern.regex)
    if (match) {
      // Extract the parent path up to and including the matched directory
      const parentPath = extractParentPath(normalizedPath, match)

      return {
        level: pattern.level,
        parent: parentPath,
      }
    }
  }

  // No pattern matched - file-level only
  return { level: 'file' }
}

/**
 * Extract parent path from regex match
 *
 * @example
 * Input: '/proj/src/modules/auth/services/login.ts', match=['src/modules/auth', 'auth']
 * Output: 'src/modules/auth'
 */
function extractParentPath(
  filePath: string,
  match: RegExpMatchArray
): string {
  const fullMatch = match[0] // e.g., 'src/modules/auth'

  // Find the position of the full match in the file path
  const matchIndex = filePath.indexOf(fullMatch)
  if (matchIndex === -1) {
    return fullMatch // Fallback
  }

  // Return the matched portion (parent directory)
  return fullMatch
}

/**
 * Get unique identifier for a hierarchy parent
 *
 * @example
 * getParentId('src/modules/auth', 'module') => 'module:src/modules/auth'
 */
export function getParentId(
  parentPath: string,
  level: 'module' | 'component'
): string {
  return `${level}:${parentPath}`
}

/**
 * Get human-readable label for a hierarchy node
 *
 * @example
 * getParentLabel('src/modules/auth') => 'modules/auth'
 */
export function getParentLabel(parentPath: string): string {
  // Extract the meaningful part after 'src/'
  const parts = parentPath.split('/')
  const srcIndex = parts.indexOf('src')

  if (srcIndex !== -1 && srcIndex < parts.length - 1) {
    return parts.slice(srcIndex + 1).join('/')
  }

  // Fallback: return last 2 parts
  return parts.slice(-2).join('/')
}
