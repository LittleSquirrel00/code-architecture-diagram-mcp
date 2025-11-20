#!/usr/bin/env node
/**
 * Debug script to test render edge creation
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'

const files = await parseProject('__tests__/fixtures/render-test')

console.log('\n=== Building Graph with Render Edges ===\n')

// Test 1: Import edges only (default)
const graphImportOnly = buildGraph(files, { edgeTypes: ['import'] })
console.log('Import edges only:')
console.log(`  Nodes: ${graphImportOnly.nodes.length}`)
console.log(`  Edges: ${graphImportOnly.edges.length}`)
console.log(`  Edge types: ${[...new Set(graphImportOnly.edges.map(e => e.type))].join(', ')}`)

// Test 2: Render edges only
const graphRenderOnly = buildGraph(files, { edgeTypes: ['render'] })
console.log('\nRender edges only:')
console.log(`  Nodes: ${graphRenderOnly.nodes.length}`)
console.log(`  Edges: ${graphRenderOnly.edges.length}`)
console.log(`  Edge types: ${[...new Set(graphRenderOnly.edges.map(e => e.type))].join(', ')}`)

if (graphRenderOnly.edges.length > 0) {
  console.log('\n  Render edges:')
  for (const edge of graphRenderOnly.edges) {
    if (edge.type === 'render') {
      const fromNode = graphRenderOnly.nodes.find(n => n.id === edge.from)
      const toNode = graphRenderOnly.nodes.find(n => n.id === edge.to)
      const fromName = fromNode?.path.split('/').pop()
      const toName = toNode?.path.split('/').pop()
      console.log(`    ${fromName} --render--> ${toName} (position: ${edge.position})`)
    }
  }
}

// Test 3: Both import and render edges
const graphBoth = buildGraph(files, { edgeTypes: ['import', 'render'] })
console.log('\nBoth import and render edges:')
console.log(`  Nodes: ${graphBoth.nodes.length}`)
console.log(`  Edges: ${graphBoth.edges.length}`)
console.log(`  Edge types: ${[...new Set(graphBoth.edges.map(e => e.type))].join(', ')}`)

const importCount = graphBoth.edges.filter(e => e.type === 'import').length
const renderCount = graphBoth.edges.filter(e => e.type === 'render').length
console.log(`  Import: ${importCount}, Render: ${renderCount}`)
