#!/usr/bin/env node
/**
 * Manual test script for MCP server
 *
 * This script tests the MCP server by invoking it programmatically
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import { generateMermaid } from './dist/visualization/mermaid.js'

async function testLocalProject() {
  console.log('=== Testing Code Architecture Diagram MCP ===\n')

  // Test with the project itself
  const projectPath = process.cwd()
  console.log(`Analyzing project: ${projectPath}\n`)

  try {
    // Step 1: Parse
    console.log('📝 Parsing TypeScript files...')
    const files = await parseProject(projectPath + '/src')
    console.log(`✓ Found ${files.length} files\n`)

    // Step 2: Build graph
    console.log('🔗 Building dependency graph...')
    const graph = buildGraph(files)
    console.log(`✓ Created graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges\n`)

    // Step 3: Generate Mermaid
    console.log('🎨 Generating Mermaid diagram...')
    const mermaid = generateMermaid(graph, {
      useRelativePaths: true,
      projectRoot: projectPath,
    })
    console.log('✓ Mermaid diagram generated\n')

    // Display results
    console.log('=== Results ===')
    console.log(`Total files analyzed: ${files.length}`)
    console.log(`Total nodes: ${graph.nodes.length}`)
    console.log(`Total edges: ${graph.edges.length}`)
    console.log('\n=== Mermaid Diagram ===')
    console.log(mermaid)

    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testLocalProject()
