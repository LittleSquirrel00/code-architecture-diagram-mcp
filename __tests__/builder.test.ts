import { describe, test, expect } from '@jest/globals'
import { buildGraph, generateNodeId, resolveImportPath } from '../src/graph/builder.js'
import type { ParsedFile } from '../src/core/types.js'

describe('Graph Builder', () => {
  describe('generateNodeId', () => {
    test('should generate unique IDs for different paths', () => {
      const id1 = generateNodeId('/project/src/index.ts')
      const id2 = generateNodeId('/project/src/utils.ts')

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^file:/)
      expect(id2).toMatch(/^file:/)
    })

    test('should generate consistent IDs for same path', () => {
      const id1 = generateNodeId('/project/src/index.ts')
      const id2 = generateNodeId('/project/src/index.ts')

      expect(id1).toBe(id2)
    })

    test('should include filename in ID', () => {
      const id = generateNodeId('/project/src/auth/login.ts')
      expect(id).toContain('login')
    })
  })

  describe('resolveImportPath', () => {
    test('should resolve relative imports', () => {
      const filePathMap = new Map([
        ['/project/src/utils.ts', '/project/src/utils.ts'],
        ['/project/src/utils', '/project/src/utils.ts'],
      ])
      const result = resolveImportPath(
        '/project/src/index.ts',
        './utils',
        filePathMap
      )
      expect(result).toBe('/project/src/utils.ts')
    })

    test('should resolve parent directory imports', () => {
      const filePathMap = new Map([
        ['/project/src/models/User.ts', '/project/src/models/User.ts'],
        ['/project/src/models/User', '/project/src/models/User.ts'],
      ])
      const result = resolveImportPath(
        '/project/src/auth/login.ts',
        '../models/User',
        filePathMap
      )
      expect(result).toBe('/project/src/models/User.ts')
    })

    test('should skip external packages', () => {
      const filePathMap = new Map()
      const result = resolveImportPath(
        '/project/src/index.ts',
        'react',
        filePathMap
      )
      expect(result).toBeNull()
    })

    test('should handle extension-less imports', () => {
      const filePathMap = new Map([
        ['/project/src/utils.ts', '/project/src/utils.ts'],
        ['/project/src/utils', '/project/src/utils.ts'],
      ])
      const result = resolveImportPath(
        '/project/src/index.ts',
        './utils',
        filePathMap
      )
      expect(result).toBe('/project/src/utils.ts')
    })

    test('should handle .js imports for .ts files', () => {
      const filePathMap = new Map([
        ['/project/src/utils.ts', '/project/src/utils.ts'],
        ['/project/src/utils', '/project/src/utils.ts'],
        ['/project/src/utils.js', '/project/src/utils.ts'],
      ])
      const result = resolveImportPath(
        '/project/src/index.ts',
        './utils.js',
        filePathMap
      )
      expect(result).toBe('/project/src/utils.ts')
    })
  })

  describe('buildGraph', () => {
    test('should create nodes for all files', () => {
      const files: ParsedFile[] = [
        { path: '/project/src/index.ts', imports: [] },
        { path: '/project/src/utils.ts', imports: [] },
      ]

      const graph = buildGraph(files)

      expect(graph.nodes).toHaveLength(2)
      expect(graph.nodes[0].type).toBe('hierarchy')
      if (graph.nodes[0].type === 'hierarchy') {
        expect(graph.nodes[0].level).toBe('file')
      }
    })

    test('should create edges for imports', () => {
      const files: ParsedFile[] = [
        {
          path: '/project/src/index.ts',
          imports: [
            { importPath: './utils.ts', isTypeOnly: false, isDynamic: false },
          ],
        },
        {
          path: '/project/src/utils.ts',
          imports: [],
        },
      ]

      const graph = buildGraph(files)

      expect(graph.edges).toHaveLength(1)
      expect(graph.edges[0].type).toBe('import')
      expect(graph.edges[0].status).toBe('normal')
    })

    test('should deduplicate edges', () => {
      const files: ParsedFile[] = [
        {
          path: '/project/src/index.ts',
          imports: [
            { importPath: './utils.ts', isTypeOnly: false, isDynamic: false },
            { importPath: './utils.ts', isTypeOnly: true, isDynamic: false },
          ],
        },
        {
          path: '/project/src/utils.ts',
          imports: [],
        },
      ]

      const graph = buildGraph(files)

      // Should only have one edge even though there are two imports
      expect(graph.edges).toHaveLength(1)
    })

    test('should handle circular dependencies', () => {
      const files: ParsedFile[] = [
        {
          path: '/project/src/a.ts',
          imports: [
            { importPath: './b.ts', isTypeOnly: false, isDynamic: false },
          ],
        },
        {
          path: '/project/src/b.ts',
          imports: [
            { importPath: './a.ts', isTypeOnly: false, isDynamic: false },
          ],
        },
      ]

      // Should not throw, just log warning
      const graph = buildGraph(files)

      expect(graph.nodes).toHaveLength(2)
      expect(graph.edges).toHaveLength(2)
    })

    test('should skip missing import targets', () => {
      const files: ParsedFile[] = [
        {
          path: '/project/src/index.ts',
          imports: [
            { importPath: './missing', isTypeOnly: false, isDynamic: false },
          ],
        },
      ]

      const graph = buildGraph(files)

      expect(graph.nodes).toHaveLength(1)
      expect(graph.edges).toHaveLength(0)
    })

    test('should skip external packages', () => {
      const files: ParsedFile[] = [
        {
          path: '/project/src/index.ts',
          imports: [
            { importPath: 'react', isTypeOnly: false, isDynamic: false },
            { importPath: '@types/node', isTypeOnly: false, isDynamic: false },
          ],
        },
      ]

      const graph = buildGraph(files)

      expect(graph.nodes).toHaveLength(1)
      expect(graph.edges).toHaveLength(0)
    })
  })
})
