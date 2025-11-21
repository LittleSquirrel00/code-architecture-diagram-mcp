#!/usr/bin/env node
/**
 * MCP Server for Code Dependency Graph
 *
 * Provides AI agents with access to code dependency analysis via MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { parseProject } from '../parser/typescript-parser.js'
import { buildGraph, buildDiff } from '../graph/builder.js'
import { generateMermaid } from '../visualization/mermaid.js'
import type { Graph, FileChanges } from '../core/types.js'

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: 'code-dependency-graph',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'getDependencyGraph',
          description:
            'Analyze code dependencies in a TypeScript/JavaScript project and return a dependency graph with Mermaid visualization. Supports file, component, and module-level views. Phase 3: Interface implementation tracking. Phase 4: React component rendering relationships.',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              format: {
                type: 'string',
                enum: ['json', 'mermaid', 'both'],
                description:
                  'Output format: json (graph data), mermaid (diagram), or both (default: mermaid)',
                default: 'mermaid',
              },
              verbosity: {
                type: 'string',
                enum: ['brief', 'detail'],
                description:
                  'Output verbosity: brief (summary only, ~80% token reduction), detail (full graph + mermaid). Default: detail',
                default: 'detail',
              },
              level: {
                type: 'string',
                enum: ['file', 'component', 'module', 'architecture', 'interface'],
                description:
                  'Hierarchy level: file (all files), component (aggregate by components), module (aggregate by modules), architecture (aggregate by packages/apps), interface (type definitions). Default: file',
                default: 'file',
              },
              edgeTypes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['import', 'implement', 'render'],
                },
                description:
                  'Edge types to include: import (code imports), implement (interface implementations), render (component rendering). Default: [\'import\']',
                default: ['import'],
              },
              mode: {
                type: 'string',
                enum: ['global', 'focused', 'neighbors'],
                description:
                  'View mode: global (complete graph), focused (only internal dependencies), neighbors (focus + direct dependents). Default: \'global\'',
                default: 'global',
              },
              focusPath: {
                type: 'string',
                description:
                  'Path to focus on when mode is \'focused\' or \'neighbors\'. Can be file path, module name, or component name.',
              },
              neighborDepth: {
                type: 'number',
                description:
                  'Depth for neighbor traversal when mode is \'neighbors\'. Default: 1',
                default: 1,
              },
              internalLevel: {
                type: 'string',
                enum: ['file', 'interface'],
                description:
                  'Level for internal analysis when mode is \'focused\'. Shows internal dependencies at this level. Default: \'file\'',
                default: 'file',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'getArchitectureDiff',
          description:
            'Analyze architecture changes between two states of a project. Detects new dependencies, removed dependencies, and circular dependencies. Phase 5: Change detection and diff analysis.',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              changes: {
                type: 'object',
                description: 'File changes to analyze',
                properties: {
                  added: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Paths of newly added files',
                  },
                  modified: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Paths of modified files',
                  },
                  removed: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Paths of removed files',
                  },
                },
                required: ['added', 'modified', 'removed'],
              },
              level: {
                type: 'string',
                enum: ['file', 'component', 'module', 'architecture', 'interface'],
                description: 'Hierarchy level for analysis. Default: file',
                default: 'file',
              },
              edgeTypes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['import', 'implement', 'render'],
                },
                description: 'Edge types to include. Default: [\'import\']',
                default: ['import'],
              },
            },
            required: ['projectPath', 'changes'],
          },
        },
      ],
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'getDependencyGraph') {
      try {
        const args = (request.params.arguments || {}) as Record<string, unknown>
        const projectPath = args.projectPath as string
        const format = (args.format as 'json' | 'mermaid' | 'both') || 'mermaid'
        const verbosity = (args.verbosity as 'brief' | 'detail') || 'detail'
        const level = (args.level as 'file' | 'component' | 'module' | 'architecture' | 'interface') || 'file'
        const edgeTypes = (args.edgeTypes as ('import' | 'implement' | 'render')[]) || ['import']
        const mode = (args.mode as 'global' | 'focused' | 'neighbors') || 'global'
        const focusPath = args.focusPath as string | undefined
        const neighborDepth = (args.neighborDepth as number) || 1
        const internalLevel = (args.internalLevel as 'file' | 'interface') || 'file'

        // Validate project path
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid projectPath: must be a non-empty string')
        }

        // Parse project files
        console.error(`[MCP] Parsing project: ${projectPath}`)
        const files = await parseProject(projectPath)
        console.error(`[MCP] Parsed ${files.length} files`)

        // Build dependency graph with level, edgeTypes, and view options (Phase 3 & 6)
        const graph = buildGraph(files, { level, edgeTypes, mode, focusPath, neighborDepth, internalLevel }, projectPath)
        console.error(
          `[MCP] Built graph at ${level} level with edge types [${edgeTypes.join(', ')}], mode=${mode}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`
        )

        // Generate output based on format and verbosity
        const result: DependencyGraphResult = {}

        // Brief mode: only return summary, skip heavy graph/mermaid data
        if (verbosity === 'brief') {
          // Skip graph and mermaid generation to save tokens
        } else {
          // Detail mode: full output
          if (format === 'json' || format === 'both') {
            result.graph = graph
          }

          if (format === 'mermaid' || format === 'both') {
            result.mermaid = generateMermaid(graph, {
              useRelativePaths: true,
              projectRoot: projectPath,
            })
          }
        }

        // Add summary
        const summary: DependencyGraphResult['summary'] = {
          totalFiles: files.length,
          totalNodes: graph.nodes.length,
          totalEdges: graph.edges.length,
        }

        // Detail mode: add detailed statistics
        if (verbosity === 'detail') {
          // Add edge type counts (Phase 3)
          if (edgeTypes.includes('import')) {
            summary.totalImportEdges = graph.edges.filter((e) => e.type === 'import').length
          }
          if (edgeTypes.includes('implement')) {
            summary.totalImplementEdges = graph.edges.filter((e) => e.type === 'implement').length
          }
          if (edgeTypes.includes('render')) {
            summary.totalRenderEdges = graph.edges.filter((e) => e.type === 'render').length
          }

          // Add level-specific counts
          if (level === 'architecture') {
            const archNodes = graph.nodes.filter(
              (n) => n.type === 'hierarchy' && n.level === 'architecture'
            )
            summary.totalArchitectures = archNodes.length
          } else if (level === 'module') {
            const moduleNodes = graph.nodes.filter(
              (n) => n.type === 'hierarchy' && n.level === 'module'
            )
            summary.totalModules = moduleNodes.length
          } else if (level === 'component') {
            const componentNodes = graph.nodes.filter(
              (n) => n.type === 'hierarchy' && n.level === 'component'
            )
            summary.totalComponents = componentNodes.length
          } else if (level === 'interface') {
            const typeNodes = graph.nodes.filter((n) => n.type === 'abstract')
            summary.totalTypeDefinitions = typeNodes.length
          }
        }

        result.summary = summary

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error(`[MCP] Error:`, error)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Failed to generate dependency graph',
                  message: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }
    }

    if (request.params.name === 'getArchitectureDiff') {
      try {
        const args = (request.params.arguments || {}) as Record<string, unknown>
        const projectPath = args.projectPath as string
        const changes = args.changes as FileChanges
        const level = (args.level as 'file' | 'component' | 'module' | 'architecture' | 'interface') || 'file'
        const edgeTypes = (args.edgeTypes as ('import' | 'implement' | 'render')[]) || ['import']

        // Validate inputs
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid projectPath: must be a non-empty string')
        }

        if (!changes || !Array.isArray(changes.added) || !Array.isArray(changes.modified) || !Array.isArray(changes.removed)) {
          throw new Error('Invalid changes: must have added, modified, and removed arrays')
        }

        console.error(`[MCP] Analyzing architecture diff for: ${projectPath}`)
        console.error(`[MCP] Changes: +${changes.added.length} added, ~${changes.modified.length} modified, -${changes.removed.length} removed`)

        // Parse current project state
        const currentFiles = await parseProject(projectPath)
        const currentGraph = buildGraph(currentFiles, { level, edgeTypes }, projectPath)

        // Build "old" graph by excluding added files
        const oldFiles = currentFiles.filter(f => !changes.added.includes(f.path))
        const oldGraph = buildGraph(oldFiles, { level, edgeTypes }, projectPath)

        // Build diff
        const diff = buildDiff(oldGraph, currentGraph, changes)

        console.error(`[MCP] Diff complete: +${diff.summary.addedNodes} nodes, -${diff.summary.removedNodes} nodes`)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(diff, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[MCP] Error:`, error)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Failed to analyze architecture diff',
                  message: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }
    }

    throw new Error(`Unknown tool: ${request.params.name}`)
  })

  return server
}

/**
 * Start the MCP server
 */
async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)

  console.error('[MCP] Code Dependency Graph MCP server running on stdio')
}

// Run server
main().catch((error) => {
  console.error('[MCP] Fatal error:', error)
  process.exit(1)
})

/**
 * Type definitions
 */

interface DependencyGraphResult {
  graph?: Graph
  mermaid?: string
  summary?: {
    totalFiles: number
    totalNodes: number
    totalEdges: number
    totalArchitectures?: number // Architecture count
    totalModules?: number // Module count
    totalComponents?: number // Component count
    totalTypeDefinitions?: number // Type definition count (interface level)
    totalImportEdges?: number // Import edge count
    totalImplementEdges?: number // Implement edge count
    totalRenderEdges?: number // Render edge count
  }
}
