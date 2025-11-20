/**
 * Tests for Mermaid diagram generator
 */

import { generateMermaid } from '../src/visualization/mermaid.js'
import type { Graph, HierarchyNode, ImportEdge } from '../src/core/types.js'

describe('Mermaid Generator', () => {
  describe('generateMermaid', () => {
    it('should generate basic graph structure', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:a-111',
            path: '/project/src/a.ts',
            status: 'normal',
          } as HierarchyNode,
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:b-222',
            path: '/project/src/b.ts',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [
          {
            type: 'import',
            from: 'file:a-111',
            to: 'file:b-222',
            status: 'normal',
          } as ImportEdge,
        ],
      }

      const result = generateMermaid(graph)

      expect(result).toContain('graph LR')
      expect(result).toContain('file:a-111[a.ts]')
      expect(result).toContain('file:b-222[b.ts]')
      expect(result).toContain('file:a-111 --> file:b-222')
    })

    it('should handle empty graph', () => {
      const graph: Graph = {
        nodes: [],
        edges: [],
      }

      const result = generateMermaid(graph)

      expect(result).toBe('graph LR\n  %% No nodes to display')
    })

    it('should use relative paths when projectRoot provided', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:index-123',
            path: '/Users/foo/project/src/index.ts',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [],
      }

      const result = generateMermaid(graph, {
        useRelativePaths: true,
        projectRoot: '/Users/foo/project',
      })

      expect(result).toContain('file:index-123[src/index.ts]')
    })

    it('should use basename when useRelativePaths is false', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:index-123',
            path: '/Users/foo/project/src/index.ts',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [],
      }

      const result = generateMermaid(graph, {
        useRelativePaths: false,
      })

      expect(result).toContain('file:index-123[index.ts]')
    })

    it('should handle special characters in paths', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:test-with-quotes-456',
            path: '/project/src/test"with"quotes.ts',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [],
      }

      const result = generateMermaid(graph)

      // Special characters should be escaped
      expect(result).toContain('file:test-with-quotes-456[test#quot;with#quot;quotes.ts]')
    })

    it('should handle multiple edges between nodes', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:a-111',
            path: '/project/a.ts',
            status: 'normal',
          } as HierarchyNode,
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:b-222',
            path: '/project/b.ts',
            status: 'normal',
          } as HierarchyNode,
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:c-333',
            path: '/project/c.ts',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [
          {
            type: 'import',
            from: 'file:a-111',
            to: 'file:b-222',
            status: 'normal',
          } as ImportEdge,
          {
            type: 'import',
            from: 'file:a-111',
            to: 'file:c-333',
            status: 'normal',
          } as ImportEdge,
        ],
      }

      const result = generateMermaid(graph)

      expect(result).toContain('file:a-111 --> file:b-222')
      expect(result).toContain('file:a-111 --> file:c-333')
    })

    it('should render all hierarchy nodes in the graph', () => {
      // Phase 2: Mermaid generator renders whatever is in the graph
      // buildGraph is responsible for returning the correct nodes based on level
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:a-111',
            path: '/project/a.ts',
            status: 'normal',
          } as HierarchyNode,
          {
            type: 'hierarchy',
            level: 'module',
            id: 'module:core',
            path: '/project/core',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [],
      }

      const result = generateMermaid(graph)

      // Both nodes should be rendered
      expect(result).toContain('file:a-111')
      expect(result).toContain('module:core')
    })

    it('should only include import edges', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:a-111',
            path: '/project/a.ts',
            status: 'normal',
          } as HierarchyNode,
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:b-222',
            path: '/project/b.ts',
            status: 'normal',
          } as HierarchyNode,
        ],
        edges: [
          {
            type: 'import',
            from: 'file:a-111',
            to: 'file:b-222',
            status: 'normal',
          } as ImportEdge,
          {
            type: 'render', // Should be ignored in Phase 1
            from: 'file:a-111',
            to: 'file:b-222',
            status: 'normal',
          } as any,
        ],
      }

      const result = generateMermaid(graph)

      // Should only have one edge (the import edge)
      const edgeCount = (result.match(/-->/g) || []).length
      expect(edgeCount).toBe(1)
    })
  })
})
