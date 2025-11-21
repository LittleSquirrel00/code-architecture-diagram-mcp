#!/usr/bin/env node
import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import { generateMermaid } from './dist/visualization/mermaid.js'

const projectPath = process.cwd()

console.log('Parsing project...')
const files = await parseProject(projectPath)
console.log(`Parsed ${files.length} files`)

// Test file-level
console.log('\n--- File Level ---')
const fileGraph = buildGraph(files, { level: 'file' })
console.log(`Nodes: ${fileGraph.nodes.length}, Edges: ${fileGraph.edges.length}`)

// Test module-level
console.log('\n--- Module Level ---')
const moduleGraph = buildGraph(files, { level: 'module' })
console.log(`Nodes: ${moduleGraph.nodes.length}, Edges: ${moduleGraph.edges.length}`)
console.log('Nodes:', moduleGraph.nodes.map(n => n.path))
console.log('\nMermaid:')
console.log(generateMermaid(moduleGraph))
