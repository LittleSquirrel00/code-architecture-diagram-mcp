#!/usr/bin/env node
/**
 * Test interface-level dependency graph
 * Verify that type references are captured correctly
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'

const projectPath = process.cwd()

console.log('=== Testing Interface-Level Dependency Graph ===\n')

// Parse project
console.log('1. Parsing project...')
const files = await parseProject(projectPath)
console.log(`   Found ${files.length} files\n`)

// Build interface graph
console.log('2. Building interface graph...')
const graph = buildGraph(files, { level: 'interface' })
console.log(`   Nodes: ${graph.nodes.length}`)
console.log(`   Edges: ${graph.edges.length}\n`)

// Show all type definitions
console.log('3. Type definitions found:')
for (const node of graph.nodes) {
  if (node.type === 'abstract') {
    console.log(`   - ${node.kind}: ${node.name} (exported: ${node.isExported})`)
  }
}

console.log('\n4. Type relationships found:')
if (graph.edges.length === 0) {
  console.log('   ❌ NO EDGES FOUND!')
  console.log('   This means type references are not being captured.')
} else {
  for (const edge of graph.edges) {
    const fromNode = graph.nodes.find(n => n.id === edge.from)
    const toNode = graph.nodes.find(n => n.id === edge.to)
    const fromName = fromNode?.type === 'abstract' ? fromNode.name : edge.from
    const toName = toNode?.type === 'abstract' ? toNode.name : edge.to
    console.log(`   ${fromName} --[${edge.type}]--> ${toName}`)
  }
}

// Check specific expected relationships
console.log('\n5. Checking expected relationships:')
const expectedRels = [
  { from: 'Graph', to: 'Node', reason: 'Graph.nodes: Node[]' },
  { from: 'Graph', to: 'Edge', reason: 'Graph.edges: Edge[]' },
  { from: 'Node', to: 'HierarchyNode', reason: 'type Node = HierarchyNode | AbstractNode' },
  { from: 'Node', to: 'AbstractNode', reason: 'type Node = HierarchyNode | AbstractNode' },
  { from: 'Edge', to: 'ImportEdge', reason: 'type Edge = ImportEdge | ...' },
]

for (const expected of expectedRels) {
  const fromNode = graph.nodes.find(n => n.type === 'abstract' && n.name === expected.from)
  const toNode = graph.nodes.find(n => n.type === 'abstract' && n.name === expected.to)

  if (!fromNode || !toNode) {
    console.log(`   ❓ ${expected.from} -> ${expected.to}: Missing nodes`)
    continue
  }

  const edge = graph.edges.find(e => e.from === fromNode.id && e.to === toNode.id)
  if (edge) {
    console.log(`   ✅ ${expected.from} -> ${expected.to}: Found`)
  } else {
    console.log(`   ❌ ${expected.from} -> ${expected.to}: Missing (${expected.reason})`)
  }
}

console.log('\n=== Test Complete ===')
