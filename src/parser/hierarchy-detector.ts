/**
 * Hierarchy detection from directory structure
 *
 * Detects architecture, module, and component boundaries based on directory depth.
 * Uses simple depth-based detection - no hardcoded directory names.
 *
 * Hierarchy levels (based on depth from src/):
 * - architecture: packages/{name}/ or apps/{name}/ (monorepo structure)
 * - module: src/{name}/ (depth 0, first-level directory)
 * - component: src/{module}/{name}/ (depth 1, second-level directory)
 * - file: individual source files
 */

import type { HierarchyInfo } from '../core/types.js'

/**
 * Detect hierarchy level and parent from file path
 *
 * Uses directory depth to determine hierarchy level:
 * - Depth 0: module (src/xxx/file.ts)
 * - Depth 1: component (src/xxx/yyy/file.ts)
 * - Depth 2+: file (deeper nesting)
 *
 * Also detects architecture level for monorepo structures:
 * - packages/xxx/src/... or apps/xxx/src/...
 *
 * @param filePath - Absolute or relative file path
 * @returns Hierarchy information
 *
 * @example
 * detectHierarchy('/proj/src/parser/lexer/scanner.ts')
 * // => { level: 'component', parent: 'parser/lexer', module: 'parser', component: 'lexer' }
 *
 * detectHierarchy('/proj/src/core/types.ts')
 * // => { level: 'module', parent: 'core', module: 'core' }
 *
 * detectHierarchy('/proj/packages/server/src/core/types.ts')
 * // => { level: 'module', parent: 'core', architecture: 'server', module: 'core' }
 */
export function detectHierarchy(filePath: string): HierarchyInfo {
  // Normalize path to use forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/')
  const parts = normalizedPath.split('/')

  // Check for monorepo architecture (packages/xxx or apps/xxx)
  let architecture: string | undefined
  let srcIndex = parts.indexOf('src')

  // Detect architecture from packages/ or apps/ directory
  const packagesIndex = parts.indexOf('packages')
  const appsIndex = parts.indexOf('apps')
  const archIndex = packagesIndex !== -1 ? packagesIndex : appsIndex

  if (archIndex !== -1 && archIndex < srcIndex - 1) {
    architecture = parts[archIndex + 1]
  }

  // If no src directory found, return file-level
  if (srcIndex === -1) {
    return { level: 'file' }
  }

  // Calculate depth relative to src/
  // src/xxx/file.ts -> depth 0 (module level)
  // src/xxx/yyy/file.ts -> depth 1 (component level)
  // src/xxx/yyy/zzz/file.ts -> depth 2+ (file level)
  const partsAfterSrc = parts.slice(srcIndex + 1)
  const depth = partsAfterSrc.length - 1 // -1 for the filename

  if (depth < 1) {
    // File directly in src/ (e.g., src/index.ts, src/App.tsx)
    // Treat as a special "__root__" module for module-level aggregation
    return {
      level: 'module',
      parent: '__root__',
      architecture,
      module: '__root__',
    }
  }

  const moduleName = partsAfterSrc[0]

  if (depth === 1) {
    // src/xxx/file.ts -> module level
    return {
      level: 'module',
      parent: moduleName,
      architecture,
      module: moduleName,
    }
  }

  if (depth === 2) {
    // src/xxx/yyy/file.ts -> component level
    const componentName = partsAfterSrc[1]
    return {
      level: 'component',
      parent: `${moduleName}/${componentName}`,
      architecture,
      module: moduleName,
      component: componentName,
    }
  }

  // depth >= 3: deeper nesting, still treat as component
  // src/xxx/yyy/zzz/file.ts -> component: xxx/yyy
  const componentName = partsAfterSrc[1]
  return {
    level: 'component',
    parent: `${moduleName}/${componentName}`,
    architecture,
    module: moduleName,
    component: componentName,
  }
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
