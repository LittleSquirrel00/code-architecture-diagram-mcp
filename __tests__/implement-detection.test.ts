/**
 * Unit tests for implement edge detection (Phase 3)
 */

import { describe, test, expect } from '@jest/globals'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'
import type { ImplementEdge } from '../src/core/types.js'

describe('Phase 3: Implement Edge Detection', () => {
  const fixturesDir = '__tests__/fixtures/implement-test'

  describe('Parser: extractImplements', () => {
    test('should detect single interface implementation', async () => {
      const files = await parseProject(fixturesDir)
      const authService = files.find(f => f.path.includes('AuthService.ts'))

      expect(authService).toBeDefined()
      expect(authService?.implements).toBeDefined()
      expect(authService?.implements?.length).toBe(1)

      const impl = authService?.implements?.[0]
      expect(impl?.className).toBe('AuthService')
      expect(impl?.interfaces).toEqual(['IAuth'])
      expect(impl?.interfacePaths.get('IAuth')).toBe('./IAuth')
    })

    test('should detect multiple interface implementations', async () => {
      const files = await parseProject(fixturesDir)
      const userService = files.find(f => f.path.includes('UserService.ts'))

      expect(userService).toBeDefined()
      expect(userService?.implements).toBeDefined()
      expect(userService?.implements?.length).toBe(1)

      const impl = userService?.implements?.[0]
      expect(impl?.className).toBe('UserService')
      expect(impl?.interfaces).toContain('IAuth')
      expect(impl?.interfaces).toContain('ILogger')
      expect(impl?.interfaces.length).toBe(2)
      expect(impl?.interfacePaths.get('IAuth')).toBe('./IAuth')
      expect(impl?.interfacePaths.get('ILogger')).toBe('./ILogger')
    })

    test('should detect intra-file implementation', async () => {
      const files = await parseProject(fixturesDir)
      const localService = files.find(f => f.path.includes('LocalService.ts'))

      expect(localService).toBeDefined()
      expect(localService?.implements).toBeDefined()
      expect(localService?.implements?.length).toBe(1)

      const impl = localService?.implements?.[0]
      expect(impl?.className).toBe('LocalService')
      expect(impl?.interfaces).toEqual(['ILocal'])
      // No import path for intra-file interface
      expect(impl?.interfacePaths.get('ILocal')).toBeUndefined()
    })

    test('should not detect interfaces without implementations', async () => {
      const files = await parseProject(fixturesDir)
      const iauth = files.find(f => f.path.includes('IAuth.ts'))
      const ilogger = files.find(f => f.path.includes('ILogger.ts'))

      expect(iauth?.implements).toBeUndefined()
      expect(ilogger?.implements).toBeUndefined()
    })
  })

  describe('Graph Builder: createImplementEdges', () => {
    test('should create implement edge for single interface', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['implement'] })

      const implementEdges = graph.edges.filter(
        e => e.type === 'implement'
      ) as ImplementEdge[]

      // Should have edges for AuthService and UserService (2 interfaces)
      expect(implementEdges.length).toBeGreaterThanOrEqual(1)

      const authEdge = implementEdges.find(e => e.symbolName === 'IAuth')
      expect(authEdge).toBeDefined()
      expect(authEdge?.type).toBe('implement')
      expect(authEdge?.importPath).toBe('./IAuth')
    })

    test('should create multiple implement edges for multiple interfaces', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['implement'] })

      const implementEdges = graph.edges.filter(
        e => e.type === 'implement'
      ) as ImplementEdge[]

      // UserService implements both IAuth and ILogger
      const authEdge = implementEdges.find(e => e.symbolName === 'IAuth')
      const loggerEdge = implementEdges.find(e => e.symbolName === 'ILogger')

      expect(authEdge).toBeDefined()
      expect(loggerEdge).toBeDefined()
    })

    test('should skip intra-file implementations', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['implement'] })

      const implementEdges = graph.edges.filter(
        e => e.type === 'implement'
      ) as ImplementEdge[]

      // Should NOT have edge for ILocal (intra-file)
      const localEdge = implementEdges.find(e => e.symbolName === 'ILocal')
      expect(localEdge).toBeUndefined()
    })

    test('should support mixed edge types', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['import', 'implement'] })

      const importEdges = graph.edges.filter(e => e.type === 'import')
      const implementEdges = graph.edges.filter(e => e.type === 'implement')

      expect(importEdges.length).toBeGreaterThan(0)
      expect(implementEdges.length).toBeGreaterThan(0)
    })

    test('should default to import-only (backward compatibility)', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files) // No edgeTypes specified

      const implementEdges = graph.edges.filter(e => e.type === 'implement')
      expect(implementEdges.length).toBe(0)
    })

    test('should support implement-only filtering', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { edgeTypes: ['implement'] })

      const importEdges = graph.edges.filter(e => e.type === 'import')
      const implementEdges = graph.edges.filter(e => e.type === 'implement')

      expect(importEdges.length).toBe(0)
      expect(implementEdges.length).toBeGreaterThan(0)
    })
  })
})
