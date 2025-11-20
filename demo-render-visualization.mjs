#!/usr/bin/env node
/**
 * Demo script: Generate Mermaid diagram with render edges
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import { generateMermaid } from './dist/visualization/mermaid.js'

console.log('=== Phase 4 Demo: Render Edge Visualization ===\n')

const files = await parseProject('__tests__/fixtures/render-test')

// Generate graph with all edge types
const graph = buildGraph(files, { edgeTypes: ['import', 'render'] })

console.log('Graph Statistics:')
console.log(`  Nodes: ${graph.nodes.length}`)
console.log(`  Edges: ${graph.edges.length}`)
console.log(`    Import: ${graph.edges.filter(e => e.type === 'import').length}`)
console.log(`    Render: ${graph.edges.filter(e => e.type === 'render').length}`)
console.log()

// Generate Mermaid diagram
const mermaid = generateMermaid(graph, { useRelativePaths: false })

console.log('Mermaid Diagram:')
console.log('─'.repeat(60))
console.log(mermaid)
console.log('─'.repeat(60))
console.log()

console.log('Legend:')
console.log('  -->   = Import dependency (solid line)')
console.log('  ==>   = Render relationship (thick line)')
console.log()

console.log('Explanation:')
console.log('  - Dashboard imports and renders Header, Sidebar, Footer')
console.log('  - Sidebar imports and renders UserCard')
console.log('  - Import edges show code dependencies')
console.log('  - Render edges show UI component composition')
