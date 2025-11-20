/**
 * Unit tests for Mermaid render edge visualization (Phase 4)
 */

import { describe, test, expect } from '@jest/globals'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'
import { generateMermaid } from '../src/visualization/mermaid.js'

describe('Phase 4: Mermaid Visualization for Render Edges', () => {
  const fixturesDir = '__tests__/fixtures/render-test'

  describe('Mermaid Generator: Render Edge Syntax', () => {
    test('should generate thick lines (==>) for render edges', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })
      const mermaid = generateMermaid(graph)

      // Check that render edges use ==> syntax
      expect(mermaid).toContain('==>')
      // Count occurrences: should have 4 render edges
      const renderEdgeCount = (mermaid.match(/==>/g) || []).length
      expect(renderEdgeCount).toBe(4)
    })

    test('should use different syntax for different edge types', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['import', 'render'] })
      const mermaid = generateMermaid(graph)

      // Import edges: -->
      expect(mermaid).toContain('-->')
      // Render edges: ==>
      expect(mermaid).toContain('==>')

      // Ensure both types are present
      const importCount = (mermaid.match(/-->/g) || []).length
      const renderCount = (mermaid.match(/==>/g) || []).length

      expect(importCount).toBeGreaterThan(0)
      expect(renderCount).toBeGreaterThan(0)
    })

    test('should generate valid Mermaid syntax for render-only graph', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })
      const mermaid = generateMermaid(graph)

      // Should start with graph declaration
      expect(mermaid).toMatch(/^graph LR/)

      // Should contain node definitions
      expect(mermaid).toContain('[')
      expect(mermaid).toContain(']')

      // Should contain render edges
      expect(mermaid).toContain('==>')

      // Should be valid syntax (no obvious errors)
      const lines = mermaid.split('\n')
      expect(lines[0]).toBe('graph LR')
      expect(lines.length).toBeGreaterThan(1)
    })

    test('should visualize Dashboard rendering hierarchy', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['render'] })
      const mermaid = generateMermaid(graph)

      // Dashboard should appear in the diagram
      expect(mermaid).toContain('Dashboard')

      // Components rendered by Dashboard
      expect(mermaid).toContain('Header')
      expect(mermaid).toContain('Sidebar')
      expect(mermaid).toContain('Footer')
    })

    test('should not include render edges when edgeTypes is import only', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['import'] })
      const mermaid = generateMermaid(graph)

      // Should not contain render edge syntax
      expect(mermaid).not.toContain('==>')
    })
  })
})
