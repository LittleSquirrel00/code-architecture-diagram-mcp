/**
 * Tests for Mermaid visualization with implement edges (Phase 3)
 */

import { describe, test, expect } from '@jest/globals'
import { parseProject } from '../src/parser/typescript-parser.js'
import { buildGraph } from '../src/graph/builder.js'
import { generateMermaid } from '../src/visualization/mermaid.js'

describe('Phase 3: Mermaid Visualization with Implement Edges', () => {
  const fixturesDir = '__tests__/fixtures/implement-test'

  test('should render implement edges as dashed lines', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files, { edgeTypes: ['implement'] })
    const mermaid = generateMermaid(graph)

    // Should contain implement edges with dashed line syntax
    expect(mermaid).toContain('-.->|implements|')
  })

  test('should render import edges as solid lines', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files, { edgeTypes: ['import'] })
    const mermaid = generateMermaid(graph)

    // Should contain import edges with solid line syntax
    expect(mermaid).toContain(' --> ')
    // Should NOT contain implement edges
    expect(mermaid).not.toContain('-.->|implements|')
  })

  test('should render mixed edge types with visual distinction', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files, { edgeTypes: ['import', 'implement'] })
    const mermaid = generateMermaid(graph)

    // Should contain both edge types
    expect(mermaid).toContain(' --> ') // Import: solid line
    expect(mermaid).toContain('-.->|implements|') // Implement: dashed line

    // Verify structure
    expect(mermaid).toMatch(/^graph LR/)
    expect(mermaid).toContain('[') // Node definitions
  })

  test('should include node definitions for all files', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files, { edgeTypes: ['implement'] })
    const mermaid = generateMermaid(graph)

    // Should have node definitions
    expect(mermaid).toContain('[AuthService.ts]')
    expect(mermaid).toContain('[UserService.ts]')
    expect(mermaid).toContain('[IAuth.ts]')
    expect(mermaid).toContain('[ILogger.ts]')
  })

  test('should generate valid Mermaid syntax', async () => {
    const files = await parseProject(fixturesDir)
    const graph = buildGraph(files, { edgeTypes: ['import', 'implement'] })
    const mermaid = generateMermaid(graph)

    // Basic syntax validation
    const lines = mermaid.split('\n')
    expect(lines[0]).toBe('graph LR')
    expect(lines.length).toBeGreaterThan(1)

    // All edge lines should follow valid Mermaid syntax
    const edgeLines = lines.filter(l => l.includes('-->') || l.includes('-.->'))
    for (const line of edgeLines) {
      // Should match pattern: "  nodeId --> nodeId" or "  nodeId -.->|label| nodeId"
      expect(line).toMatch(/^\s+\S+\s+(-->|-\.->\|implements\|)\s+\S+$/)
    }
  })
})
