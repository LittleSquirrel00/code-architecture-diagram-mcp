/**
 * End-to-end integration test
 *
 * Tests the complete workflow from parsing to graph generation to Mermaid output
 */

import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'
import { generateMermaid } from '../src/visualization/mermaid.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('End-to-End Integration', () => {
  const fixturesDir = path.join(__dirname, 'fixtures', 'sample-project')

  it('should parse, build graph, and generate Mermaid for sample project', async () => {
    // Step 1: Parse project
    const files = await parseProject(fixturesDir)

    expect(files.length).toBeGreaterThan(0)
    expect(files.some((f) => f.path.endsWith('a.ts'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('b.ts'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('c.ts'))).toBe(true)

    // Step 2: Build dependency graph
    const graph = buildGraph(files)

    expect(graph.nodes.length).toBe(3) // a.ts, b.ts, c.ts
    expect(graph.edges.length).toBeGreaterThan(0)

    // Verify nodes
    const nodePaths = graph.nodes.map((n) => {
      if (n.type === 'hierarchy') {
        return path.basename(n.path)
      }
      return ''
    })
    expect(nodePaths).toContain('a.ts')
    expect(nodePaths).toContain('b.ts')
    expect(nodePaths).toContain('c.ts')

    // Verify edges exist (a -> b, a -> c, b -> c)
    expect(graph.edges.length).toBeGreaterThanOrEqual(3)

    // Step 3: Generate Mermaid diagram
    const mermaid = generateMermaid(graph, {
      useRelativePaths: true,
      projectRoot: fixturesDir,
    })

    expect(mermaid).toContain('graph LR')
    expect(mermaid).toContain('a.ts')
    expect(mermaid).toContain('b.ts')
    expect(mermaid).toContain('c.ts')
    expect(mermaid).toContain('-->')

    // Verify readable structure
    const lines = mermaid.split('\n')
    expect(lines[0]).toBe('graph LR')
    expect(lines.length).toBeGreaterThan(3)
  })

  it('should correctly resolve import paths', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files)

    // Find node IDs
    const getNodeId = (filename: string) => {
      const node = graph.nodes.find((n) => {
        if (n.type === 'hierarchy') {
          return n.path.endsWith(filename)
        }
        return false
      })
      return node?.id
    }

    const aId = getNodeId('a.ts')
    const bId = getNodeId('b.ts')
    const cId = getNodeId('c.ts')

    expect(aId).toBeDefined()
    expect(bId).toBeDefined()
    expect(cId).toBeDefined()

    // Verify edges
    const edgeExists = (from: string | undefined, to: string | undefined) => {
      return graph.edges.some(
        (e) => e.type === 'import' && e.from === from && e.to === to
      )
    }

    // a.ts imports b.ts
    expect(edgeExists(aId, bId)).toBe(true)
    // a.ts imports c.ts (via utils/c)
    expect(edgeExists(aId, cId)).toBe(true)
    // b.ts imports c.ts
    expect(edgeExists(bId, cId)).toBe(true)
  })

  it('should generate valid Mermaid syntax that can be copied', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files)
    const mermaid = generateMermaid(graph, {
      useRelativePaths: true,
      projectRoot: fixturesDir,
    })

    // Verify Mermaid syntax structure
    expect(mermaid.startsWith('graph LR')).toBe(true)

    // Check for valid node definitions: nodeId[label]
    const nodePattern = /\s+[\w:\-]+\[.+\]/
    expect(mermaid).toMatch(nodePattern)

    // Check for valid edge definitions: nodeId --> nodeId
    const edgePattern = /\s+[\w:\-]+ --> [\w:\-]+/
    expect(mermaid).toMatch(edgePattern)

    // No invalid characters in node IDs
    const lines = mermaid.split('\n')
    for (const line of lines) {
      if (line.includes('[') || line.includes('-->')) {
        // Node IDs should only contain alphanumeric, hyphen, underscore, colon
        const nodeIdMatches = line.match(/\s+([\w:\-]+)(?:\[|-->)/g)
        if (nodeIdMatches) {
          for (const match of nodeIdMatches) {
            const id = match.trim().replace(/\[|-->/g, '')
            expect(id).toMatch(/^[\w:\-]+$/)
          }
        }
      }
    }
  })

  it('should complete full workflow in reasonable time', async () => {
    const startTime = Date.now()

    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files)
    const mermaid = generateMermaid(graph)

    const endTime = Date.now()
    const duration = endTime - startTime

    // Should complete in less than 1 second for a small project
    expect(duration).toBeLessThan(1000)

    // Verify output exists
    expect(files.length).toBeGreaterThan(0)
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(mermaid.length).toBeGreaterThan(0)
  })
})
