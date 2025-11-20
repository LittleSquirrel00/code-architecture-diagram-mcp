/**
 * Mermaid diagram generator
 *
 * Generates Mermaid syntax from dependency graphs
 */

import * as path from 'path'
import type { Graph } from '../core/types.js'
import { getParentLabel } from '../parser/hierarchy-detector.js'

/**
 * Generate Mermaid diagram syntax from a dependency graph
 *
 * @param graph - The dependency graph
 * @param options - Optional generation options
 * @returns Mermaid diagram syntax string
 */
export function generateMermaid(
  graph: Graph,
  options: MermaidOptions = {}
): string {
  const { useRelativePaths = true, projectRoot } = options

  // Start with graph declaration
  const lines: string[] = ['graph LR']

  // Handle empty graph
  if (graph.nodes.length === 0) {
    lines.push('  %% No nodes to display')
    return lines.join('\n')
  }

  // Generate node definitions
  for (const node of graph.nodes) {
    if (node.type === 'hierarchy') {
      let label: string

      if (node.level === 'file') {
        // File node: use file path
        label = formatNodeLabel(node.path, useRelativePaths, projectRoot)
      } else if (node.level === 'module' || node.level === 'component') {
        // Module or component node: use parent label
        label = getParentLabel(node.path)
      } else {
        // Other hierarchy levels (future: architecture)
        label = node.path
      }

      const sanitizedId = sanitizeNodeId(node.id)
      lines.push(`  ${sanitizedId}[${label}]`)
    }
  }

  // Generate edge definitions
  for (const edge of graph.edges) {
    const fromId = sanitizeNodeId(edge.from)
    const toId = sanitizeNodeId(edge.to)

    if (edge.type === 'import') {
      // Import edge: solid line
      lines.push(`  ${fromId} --> ${toId}`)
    } else if (edge.type === 'implement') {
      // Implement edge: dashed line with label (Phase 3)
      lines.push(`  ${fromId} -.->|implements| ${toId}`)
    } else if (edge.type === 'render') {
      // Render edge: thick line (Phase 4)
      lines.push(`  ${fromId} ==> ${toId}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format node label for display
 */
function formatNodeLabel(
  filePath: string,
  useRelativePaths: boolean,
  projectRoot?: string
): string {
  let label = filePath

  // Use relative path if requested and project root is provided
  if (useRelativePaths && projectRoot) {
    const relative = path.relative(projectRoot, filePath)
    if (!relative.startsWith('..')) {
      label = relative
    }
  } else {
    // Use just the filename
    label = path.basename(filePath)
  }

  // Escape special characters for Mermaid
  label = label.replace(/"/g, '#quot;')

  return label
}

/**
 * Sanitize node ID to be valid Mermaid syntax
 *
 * Mermaid node IDs can contain letters, numbers, underscore, hyphen
 * We keep the format from builder.ts: file:name-hash
 */
function sanitizeNodeId(id: string): string {
  // Replace any remaining invalid characters with underscore
  return id.replace(/[^a-zA-Z0-9_\-:]/g, '_')
}

/**
 * Options for Mermaid generation
 */
export interface MermaidOptions {
  /**
   * Use relative paths for labels (default: true)
   */
  useRelativePaths?: boolean

  /**
   * Project root for calculating relative paths
   */
  projectRoot?: string
}
