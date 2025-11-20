/**
 * Integration tests for MCP server with render edge support (Phase 4)
 */

import { describe, test, expect } from '@jest/globals'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'
import { generateMermaid } from '../src/visualization/mermaid.js'

describe('Phase 4: MCP Server Integration', () => {
  const fixturesDir = '__tests__/fixtures/render-test'

  describe('End-to-End: Parse -> Build -> Visualize with Render Edges', () => {
    test('should support full workflow with render edges', async () => {
      // Step 1: Parse project (TypeScript parser with TSX support)
      const files = await parseProject(fixturesDir)
      expect(files.length).toBe(5)

      // Verify renders were extracted
      const dashboardFile = files.find(f => f.path.includes('Dashboard.tsx'))
      expect(dashboardFile?.renders?.length).toBe(3)

      // Step 2: Build graph with render edges
      const graph = buildGraph(files, { edgeTypes: ['import', 'render'] })

      expect(graph.nodes.length).toBe(5)
      expect(graph.edges.length).toBeGreaterThan(0)

      const renderEdges = graph.edges.filter(e => e.type === 'render')
      const importEdges = graph.edges.filter(e => e.type === 'import')

      expect(renderEdges.length).toBe(4)
      expect(importEdges.length).toBe(4)

      // Step 3: Generate Mermaid visualization
      const mermaid = generateMermaid(graph)

      expect(mermaid).toContain('graph LR')
      expect(mermaid).toContain('-->') // Import edges
      expect(mermaid).toContain('==>') // Render edges

      // Verify both edge types are visualized
      const importCount = (mermaid.match(/-->/g) || []).length
      const renderCount = (mermaid.match(/==>/g) || []).length

      expect(importCount).toBe(4)
      expect(renderCount).toBe(4)
    })

    test('should generate summary with render edge counts', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['import', 'render'] })

      // Simulate MCP server summary generation
      const summary = {
        totalFiles: files.length,
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
        totalImportEdges: graph.edges.filter(e => e.type === 'import').length,
        totalRenderEdges: graph.edges.filter(e => e.type === 'render').length,
      }

      expect(summary.totalFiles).toBe(5)
      expect(summary.totalNodes).toBe(5)
      expect(summary.totalEdges).toBe(8)
      expect(summary.totalImportEdges).toBe(4)
      expect(summary.totalRenderEdges).toBe(4)
    })

    test('should support render-only graph', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      const renderEdges = graph.edges.filter(e => e.type === 'render')
      const importEdges = graph.edges.filter(e => e.type === 'import')

      expect(renderEdges.length).toBe(4)
      expect(importEdges.length).toBe(0)

      const mermaid = generateMermaid(graph)
      expect(mermaid).toContain('==>')
      expect(mermaid).not.toContain('-->')
    })

    test('should maintain backward compatibility (import-only default)', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files) // No edgeTypes specified

      const importEdges = graph.edges.filter(e => e.type === 'import')
      const renderEdges = graph.edges.filter(e => e.type === 'render')

      // Default should be import-only
      expect(importEdges.length).toBe(4)
      expect(renderEdges.length).toBe(0)
    })
  })

  describe('Phase 4 Requirements Validation', () => {
    test('REQ-4.1: Should extract JSX component rendering from React files', async () => {
      const files = await parseProject(fixturesDir)

      const dashboardFile = files.find(f => f.path.includes('Dashboard.tsx'))
      expect(dashboardFile?.renders).toBeDefined()
      expect(dashboardFile?.renders?.map(r => r.componentName)).toEqual([
        'Header',
        'Sidebar',
        'Footer'
      ])
    })

    test('REQ-4.2: Should resolve component file paths via imports', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      const dashboardNode = graph.nodes.find(n => n.path.includes('Dashboard.tsx'))
      const headerNode = graph.nodes.find(n => n.path.includes('Header.tsx'))

      const renderEdge = graph.edges.find(
        e => e.type === 'render' && e.from === dashboardNode?.id && e.to === headerNode?.id
      )

      expect(renderEdge).toBeDefined()
      expect(renderEdge?.type).toBe('render')
    })

    test('REQ-4.3: Should create RenderEdge objects with correct structure', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      const renderEdge = graph.edges.find(e => e.type === 'render')
      expect(renderEdge).toBeDefined()

      if (renderEdge && renderEdge.type === 'render') {
        expect(renderEdge.from).toBeDefined()
        expect(renderEdge.to).toBeDefined()
        expect(renderEdge.status).toBe('normal')
        expect(typeof renderEdge.position).toBe('number')
      }
    })

    test('REQ-4.4: Should support edge type filtering', async () => {
      const files = await parseProject(fixturesDir)

      const graphAll = buildGraph(files, { edgeTypes: ['import', 'render'] })
      const graphImport = buildGraph(files, { edgeTypes: ['import'] })
      const graphRender = buildGraph(files, { edgeTypes: ['render'] })

      expect(graphAll.edges.length).toBe(8)
      expect(graphImport.edges.length).toBe(4)
      expect(graphRender.edges.length).toBe(4)
    })

    test('REQ-4.5: Should visualize render edges with thick lines', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })
      const mermaid = generateMermaid(graph)

      const renderEdgeCount = (mermaid.match(/==>/g) || []).length
      expect(renderEdgeCount).toBe(4)
    })
  })
})
