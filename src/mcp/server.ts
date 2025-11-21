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
import { buildGraph } from '../graph/builder.js'
import { generateMermaid } from '../visualization/mermaid.js'
import type { Graph } from '../core/types.js'

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
                enum: ['file', 'component', 'module'],
                description:
                  'Hierarchy level: file (all files), component (aggregate by components), module (aggregate by modules). Default: file',
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
            },
            required: ['projectPath'],
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
        const level = (args.level as 'file' | 'component' | 'module') || 'file'
        const edgeTypes = (args.edgeTypes as ('import' | 'implement' | 'render')[]) || ['import']

        // Validate project path
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid projectPath: must be a non-empty string')
        }

        // Parse project files
        console.error(`[MCP] Parsing project: ${projectPath}`)
        const files = await parseProject(projectPath)
        console.error(`[MCP] Parsed ${files.length} files`)

        // Build dependency graph with level and edgeTypes options (Phase 3)
        const graph = buildGraph(files, { level, edgeTypes })
        console.error(
          `[MCP] Built graph at ${level} level with edge types [${edgeTypes.join(', ')}]: ${graph.nodes.length} nodes, ${graph.edges.length} edges`
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
          if (level === 'module') {
            const moduleNodes = graph.nodes.filter(
              (n) => n.type === 'hierarchy' && n.level === 'module'
            )
            summary.totalModules = moduleNodes.length
          } else if (level === 'component') {
            const componentNodes = graph.nodes.filter(
              (n) => n.type === 'hierarchy' && n.level === 'component'
            )
            summary.totalComponents = componentNodes.length
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
    totalModules?: number // Phase 2: Optional module count
    totalComponents?: number // Phase 2: Optional component count
    totalImportEdges?: number // Phase 3: Optional import edge count
    totalImplementEdges?: number // Phase 3: Optional implement edge count
    totalRenderEdges?: number // Phase 4: Optional render edge count
  }
}
