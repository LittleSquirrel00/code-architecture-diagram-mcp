/**
 * Type tests for core data structures
 * These tests verify TypeScript type safety at compile time
 */

import { describe, test, expect } from '@jest/globals'
import {
  type Status,
  type Node,
  type HierarchyNode,
  type AbstractNode,
  type Edge,
  type ImportEdge,
  type Graph,
  type ParsedFile,
  type ImportInfo,
} from '../src/core/types.js'

describe('Core Data Structures', () => {
  describe('Status type', () => {
    test('should accept valid status values', () => {
      const statuses: Status[] = ['normal', 'added', 'modified', 'removed']
      expect(statuses).toHaveLength(4)
    })
  })

  describe('HierarchyNode', () => {
    test('should create valid file node', () => {
      const node: HierarchyNode = {
        type: 'hierarchy',
        level: 'file',
        id: 'file:src/index.ts',
        path: '/project/src/index.ts',
        status: 'normal',
      }
      expect(node.type).toBe('hierarchy')
      expect(node.level).toBe('file')
    })

    test('should support optional parent field', () => {
      const node: HierarchyNode = {
        type: 'hierarchy',
        level: 'file',
        id: 'file:src/index.ts',
        path: '/project/src/index.ts',
        parent: 'component:src',
        status: 'normal',
      }
      expect(node.parent).toBe('component:src')
    })

    test('should support all level values', () => {
      const levels: HierarchyNode['level'][] = [
        'architecture',
        'module',
        'component',
        'file',
      ]
      expect(levels).toHaveLength(4)
    })
  })

  describe('AbstractNode', () => {
    test('should create valid interface node', () => {
      const node: AbstractNode = {
        type: 'abstract',
        kind: 'interface',
        id: 'abstract:IUserRepository',
        path: '/project/src/repositories/IUserRepository.ts',
        status: 'normal',
        name: 'IUserRepository',
        isExported: true,
      }
      expect(node.kind).toBe('interface')
      expect(node.name).toBe('IUserRepository')
    })

    test('should support all kind values', () => {
      const kinds: AbstractNode['kind'][] = ['interface', 'type', 'class', 'enum']
      expect(kinds).toHaveLength(4)
    })
  })

  describe('Node discriminated union', () => {
    test('should distinguish hierarchy node', () => {
      const node: Node = {
        type: 'hierarchy',
        level: 'file',
        id: 'file:test',
        path: '/test',
        status: 'normal',
      }

      if (node.type === 'hierarchy') {
        expect(node.level).toBeDefined()
        // @ts-expect-error - hierarchy node doesn't have 'name'
        expect(node.name).toBeUndefined()
      }
    })

    test('should distinguish abstract node', () => {
      const node: Node = {
        type: 'abstract',
        kind: 'interface',
        id: 'abstract:test',
        path: '/test',
        status: 'normal',
        name: 'Test',
        isExported: true,
      }

      if (node.type === 'abstract') {
        expect(node.name).toBeDefined()
        // @ts-expect-error - abstract node doesn't have 'level'
        expect(node.level).toBeUndefined()
      }
    })
  })

  describe('ImportEdge', () => {
    test('should create valid import edge', () => {
      const edge: ImportEdge = {
        type: 'import',
        from: 'file:src/index.ts',
        to: 'file:src/utils.ts',
        status: 'normal',
      }
      expect(edge.type).toBe('import')
      expect(edge.from).toBe('file:src/index.ts')
      expect(edge.to).toBe('file:src/utils.ts')
    })
  })

  describe('Edge discriminated union', () => {
    test('should distinguish edge types', () => {
      const edge: Edge = {
        type: 'import',
        from: 'a',
        to: 'b',
        status: 'normal',
      }

      if (edge.type === 'import') {
        expect(edge.from).toBeDefined()
        // @ts-expect-error - import edge doesn't have 'symbolName'
        expect(edge.symbolName).toBeUndefined()
      }
    })
  })

  describe('Graph', () => {
    test('should create empty graph', () => {
      const graph: Graph = {
        nodes: [],
        edges: [],
      }
      expect(graph.nodes).toHaveLength(0)
      expect(graph.edges).toHaveLength(0)
    })

    test('should create graph with nodes and edges', () => {
      const graph: Graph = {
        nodes: [
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:a',
            path: '/a',
            status: 'normal',
          },
          {
            type: 'hierarchy',
            level: 'file',
            id: 'file:b',
            path: '/b',
            status: 'normal',
          },
        ],
        edges: [
          {
            type: 'import',
            from: 'file:a',
            to: 'file:b',
            status: 'normal',
          },
        ],
      }
      expect(graph.nodes).toHaveLength(2)
      expect(graph.edges).toHaveLength(1)
    })
  })

  describe('ParsedFile', () => {
    test('should store parsed file information', () => {
      const parsed: ParsedFile = {
        path: '/project/src/index.ts',
        imports: [
          {
            importPath: './utils',
            isTypeOnly: false,
            isDynamic: false,
          },
          {
            importPath: './types',
            isTypeOnly: true,
            isDynamic: false,
          },
        ],
      }
      expect(parsed.imports).toHaveLength(2)
    })
  })

  describe('ImportInfo', () => {
    test('should flag type-only imports', () => {
      const info: ImportInfo = {
        importPath: './types',
        isTypeOnly: true,
        isDynamic: false,
      }
      expect(info.isTypeOnly).toBe(true)
    })

    test('should flag dynamic imports', () => {
      const info: ImportInfo = {
        importPath: './lazy',
        isTypeOnly: false,
        isDynamic: true,
      }
      expect(info.isDynamic).toBe(true)
    })
  })
})
