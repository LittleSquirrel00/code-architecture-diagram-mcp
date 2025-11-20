/**
 * Integration tests for Phase 2: Module and Component Hierarchy
 *
 * Tests the complete workflow with hierarchy aggregation
 */

import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'
import { generateMermaid } from '../src/visualization/mermaid.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Phase 2: Hierarchy Integration', () => {
  const fixturesDir = path.join(__dirname, 'fixtures', 'hierarchy-project', 'src')

  describe('Module-level aggregation', () => {
    it('should aggregate files into module nodes', async () => {
      // Parse project
      const files = await parseProject(fixturesDir)

      // Should find all 6 files
      expect(files.length).toBe(6)

      // Build module-level graph
      const graph = buildGraph(files, { level: 'module' })

      // Should have 2 module nodes (auth, users) + 6 file nodes
      const moduleNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'module'
      )
      const fileNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'file'
      )

      expect(moduleNodes.length).toBe(2) // auth, users
      expect(fileNodes.length).toBe(6) // All original files

      // Verify module node IDs
      const moduleIds = moduleNodes.map((n) => n.id).sort()
      expect(moduleIds).toContain('module:src/modules/auth')
      expect(moduleIds).toContain('module:src/modules/users')
    })

    it('should create aggregated edges between modules', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'module' })

      // Should have 1 aggregated edge: auth -> users
      const edges = graph.edges.filter((e) => e.type === 'import')

      expect(edges.length).toBeGreaterThanOrEqual(1)

      // Verify the auth -> users edge exists
      const authToUsers = edges.find(
        (e) =>
          e.from === 'module:src/modules/auth' &&
          e.to === 'module:src/modules/users'
      )
      expect(authToUsers).toBeDefined()
    })

    it('should filter out intra-module edges', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'module' })

      // No self-referencing edges
      const selfEdges = graph.edges.filter((e) => e.from === e.to)
      expect(selfEdges.length).toBe(0)
    })

    it('should set parent references on file nodes', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'module' })

      const fileNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'file'
      )

      // Auth files should have parent = module:src/modules/auth
      const authFiles = fileNodes.filter((n) =>
        n.path.includes('modules/auth')
      )
      for (const file of authFiles) {
        expect(file.parent).toBe('module:src/modules/auth')
      }

      // Users files should have parent = module:src/modules/users
      const userFiles = fileNodes.filter((n) =>
        n.path.includes('modules/users')
      )
      for (const file of userFiles) {
        expect(file.parent).toBe('module:src/modules/users')
      }
    })
  })

  describe('Component-level aggregation', () => {
    it('should aggregate files into component nodes', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'component' })

      // Should have 2 component nodes (Button, Input) + 6 file nodes
      const componentNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'component'
      )
      const fileNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'file'
      )

      expect(componentNodes.length).toBe(2) // Button, Input
      expect(fileNodes.length).toBe(6)

      // Verify component node IDs
      const componentIds = componentNodes.map((n) => n.id).sort()
      expect(componentIds).toContain('component:src/components/Button')
      expect(componentIds).toContain('component:src/components/Input')
    })

    it('should create aggregated edges between components', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'component' })

      // Should have 1 aggregated edge: Input -> Button
      const edges = graph.edges.filter((e) => e.type === 'import')

      expect(edges.length).toBeGreaterThanOrEqual(1)

      // Verify the Input -> Button edge exists
      const inputToButton = edges.find(
        (e) =>
          e.from === 'component:src/components/Input' &&
          e.to === 'component:src/components/Button'
      )
      expect(inputToButton).toBeDefined()
    })
  })

  describe('Mermaid generation for hierarchy', () => {
    it('should generate readable Mermaid for module-level graph', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'module' })
      const mermaid = generateMermaid(graph, {
        useRelativePaths: true,
        projectRoot: fixturesDir,
      })

      expect(mermaid).toContain('graph LR')

      // Should contain module labels
      expect(mermaid).toContain('modules/auth')
      expect(mermaid).toContain('modules/users')

      // Should be significantly shorter than file-level
      const lines = mermaid.split('\n')
      expect(lines.length).toBeLessThan(20) // Module graph is concise
    })

    it('should generate readable Mermaid for component-level graph', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'component' })
      const mermaid = generateMermaid(graph, {
        useRelativePaths: true,
        projectRoot: fixturesDir,
      })

      expect(mermaid).toContain('graph LR')

      // Should contain component labels
      expect(mermaid).toContain('components/Button')
      expect(mermaid).toContain('components/Input')
    })
  })

  describe('Backward compatibility', () => {
    it('should maintain Phase 1 behavior when no level specified', async () => {
      const files = await parseProject(fixturesDir)

      // Call without options (Phase 1 style)
      const graph = buildGraph(files)

      // Should return file-level graph only
      const fileNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'file'
      )
      const moduleNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'module'
      )
      const componentNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'component'
      )

      expect(fileNodes.length).toBe(6)
      expect(moduleNodes.length).toBe(0)
      expect(componentNodes.length).toBe(0)
    })

    it('should maintain Phase 1 behavior with explicit level=file', async () => {
      const files = await parseProject(fixturesDir)
      const graph = buildGraph(files, { level: 'file' })

      // Should be identical to no options
      const fileNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'file'
      )
      expect(fileNodes.length).toBe(6)
    })
  })

  describe('Complexity reduction validation', () => {
    it('should achieve significant node reduction at module level', async () => {
      const files = await parseProject(fixturesDir)

      const fileGraph = buildGraph(files, { level: 'file' })
      const moduleGraph = buildGraph(files, { level: 'module' })

      const fileNodeCount = fileGraph.nodes.length
      const moduleNodeCount = moduleGraph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'module'
      ).length

      // Module nodes should be significantly fewer than file nodes
      expect(moduleNodeCount).toBeLessThan(fileNodeCount)
      expect(moduleNodeCount).toBe(2) // 6 files -> 2 modules (3x reduction)
    })

    it('should achieve edge reduction through aggregation', async () => {
      const files = await parseProject(fixturesDir)

      const fileGraph = buildGraph(files, { level: 'file' })
      const moduleGraph = buildGraph(files, { level: 'module' })

      const fileEdgeCount = fileGraph.edges.length
      const moduleEdgeCount = moduleGraph.edges.length

      // Module edges should be fewer due to aggregation and intra-module filtering
      expect(moduleEdgeCount).toBeLessThanOrEqual(fileEdgeCount)
    })
  })
})
