#!/usr/bin/env node
/**
 * Phase 4 Comprehensive Demo
 *
 * Demonstrates all Phase 4 features:
 * - JSX component extraction
 * - Render edge creation
 * - Mermaid visualization
 * - MCP server integration
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import { generateMermaid } from './dist/visualization/mermaid.js'

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║   Phase 4: React Component Rendering Relationship Demo    ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log()

const fixturesDir = '__tests__/fixtures/render-test'

// Step 1: Parse React/TSX files
console.log('Step 1: Parsing React Components')
console.log('─'.repeat(60))
const files = await parseProject(fixturesDir)

for (const file of files) {
  const name = file.path.split('/').pop()
  console.log(`\n${name}:`)
  console.log(`  Imports: ${file.imports.length}`)

  if (file.renders && file.renders.length > 0) {
    console.log(`  Renders: ${file.renders.length} component(s)`)
    for (const render of file.renders) {
      console.log(`    - ${render.componentName} at position ${render.position}`)
    }
  } else {
    console.log(`  Renders: (none - leaf component)`)
  }
}

// Step 2: Build Graphs with Different Edge Types
console.log('\n\nStep 2: Building Dependency Graphs')
console.log('─'.repeat(60))

const graphImport = buildGraph(files, { edgeTypes: ['import'] })
const graphRender = buildGraph(files, { edgeTypes: ['render'] })
const graphBoth = buildGraph(files, { edgeTypes: ['import', 'render'] })

console.log('\nImport-only graph (default behavior):')
console.log(`  Nodes: ${graphImport.nodes.length}`)
console.log(`  Edges: ${graphImport.edges.length} (all import)`)

console.log('\nRender-only graph (UI hierarchy):')
console.log(`  Nodes: ${graphRender.nodes.length}`)
console.log(`  Edges: ${graphRender.edges.length} (all render)`)

console.log('\nCombined graph (full picture):')
console.log(`  Nodes: ${graphBoth.nodes.length}`)
console.log(`  Edges: ${graphBoth.edges.length}`)
console.log(`    Import: ${graphBoth.edges.filter(e => e.type === 'import').length}`)
console.log(`    Render: ${graphBoth.edges.filter(e => e.type === 'render').length}`)

// Step 3: Generate Mermaid Diagrams
console.log('\n\nStep 3: Mermaid Diagram Generation')
console.log('─'.repeat(60))

const mermaidRender = generateMermaid(graphRender, { useRelativePaths: false })

console.log('\nRender-only diagram:')
console.log('─'.repeat(60))
console.log(mermaidRender)
console.log('─'.repeat(60))

// Step 4: Demonstrate Edge Type Filtering
console.log('\n\nStep 4: Edge Type Filtering')
console.log('─'.repeat(60))

console.log('\nSupported edge type combinations:')
console.log('  1. ["import"]           - Code dependencies only')
console.log('  2. ["render"]           - UI composition only')
console.log('  3. ["implement"]        - Interface implementations only')
console.log('  4. ["import", "render"] - Code + UI dependencies')
console.log('  5. ["import", "implement", "render"] - Complete view')

console.log('\n\nPhase 4 Rendering Relationships:')
console.log('─'.repeat(60))
console.log('  Dashboard renders:')
console.log('    → Header (position 0)')
console.log('    → Sidebar (position 1)')
console.log('    → Footer (position 2)')
console.log('')
console.log('  Sidebar renders:')
console.log('    → UserCard (position 0)')

// Step 5: Summary
console.log('\n\n╔════════════════════════════════════════════════════════════╗')
console.log('║                     Summary & Benefits                     ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log()
console.log('✅ Features Implemented:')
console.log('  • JSX component extraction from React/TSX files')
console.log('  • Render edge creation in dependency graph')
console.log('  • Visual distinction in Mermaid (thick lines ==>')
console.log('  • Edge type filtering for flexible analysis')
console.log('  • Full backward compatibility')
console.log()
console.log('📊 Use Cases:')
console.log('  • Understand UI component hierarchy')
console.log('  • Identify layout dependencies')
console.log('  • Visualize component composition patterns')
console.log('  • Analyze circular rendering relationships')
console.log('  • Combine code and UI dependencies')
console.log()
console.log('🎯 MCP Integration:')
console.log('  AI agents can now:')
console.log('  • Ask "What components does Dashboard render?"')
console.log('  • Request "Show me the UI component tree"')
console.log('  • Combine "Show both imports and renders"')
console.log()
