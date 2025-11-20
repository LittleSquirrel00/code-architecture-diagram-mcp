/**
 * Unit tests for render edge creation in graph builder (Phase 4)
 */

import { describe, test, expect } from '@jest/globals'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'

describe('Phase 4: Render Edge Creation in Graph Builder', () => {
  const fixturesDir = '__tests__/fixtures/render-test'

  describe('Graph Builder: createRenderEdges', () => {
    test('should create render edges when edgeTypes includes render', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      const renderEdges = graph.edges.filter(e => e.type === 'render')
      expect(renderEdges.length).toBe(4)

      // Dashboard renders 3 components
      // Sidebar renders 1 component
      const edgesByType = renderEdges.reduce((acc, edge) => {
        acc[edge.type] = (acc[edge.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      expect(edgesByType.render).toBe(4)
    })

    test('should not create render edges when edgeTypes is import only', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['import'] })

      const renderEdges = graph.edges.filter(e => e.type === 'render')
      expect(renderEdges.length).toBe(0)
    })

    test('should create both import and render edges when both are specified', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['import', 'render'] })

      const importEdges = graph.edges.filter(e => e.type === 'import')
      const renderEdges = graph.edges.filter(e => e.type === 'render')

      expect(importEdges.length).toBe(4)
      expect(renderEdges.length).toBe(4)
    })

    test('should track render positions correctly', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      // Find Dashboard node
      const dashboardNode = graph.nodes.find(n => n.path.includes('Dashboard.tsx'))
      expect(dashboardNode).toBeDefined()

      // Find render edges from Dashboard
      const dashboardRenders = graph.edges.filter(
        e => e.type === 'render' && e.from === dashboardNode!.id
      )

      expect(dashboardRenders.length).toBe(3)

      // Check positions are 0, 1, 2
      const positions = dashboardRenders.map(e =>
        e.type === 'render' ? e.position : -1
      ).sort()

      expect(positions).toEqual([0, 1, 2])
    })

    test('should create edges from Dashboard to Header, Sidebar, Footer', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      const dashboardNode = graph.nodes.find(n => n.path.includes('Dashboard.tsx'))
      const headerNode = graph.nodes.find(n => n.path.includes('Header.tsx'))
      const sidebarNode = graph.nodes.find(n => n.path.includes('Sidebar.tsx'))
      const footerNode = graph.nodes.find(n => n.path.includes('Footer.tsx'))

      expect(dashboardNode).toBeDefined()
      expect(headerNode).toBeDefined()
      expect(sidebarNode).toBeDefined()
      expect(footerNode).toBeDefined()

      // Check Dashboard renders all three
      const renderTargets = graph.edges
        .filter(e => e.type === 'render' && e.from === dashboardNode!.id)
        .map(e => e.to)

      expect(renderTargets).toContain(headerNode!.id)
      expect(renderTargets).toContain(sidebarNode!.id)
      expect(renderTargets).toContain(footerNode!.id)
    })

    test('should create edge from Sidebar to UserCard', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })

      const sidebarNode = graph.nodes.find(n => n.path.includes('Sidebar.tsx'))
      const userCardNode = graph.nodes.find(n => n.path.includes('UserCard.tsx'))

      expect(sidebarNode).toBeDefined()
      expect(userCardNode).toBeDefined()

      const sidebarRenders = graph.edges.filter(
        e => e.type === 'render' && e.from === sidebarNode!.id
      )

      expect(sidebarRenders.length).toBe(1)
      expect(sidebarRenders[0].to).toBe(userCardNode!.id)
    })
  })
})
