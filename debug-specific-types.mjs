#!/usr/bin/env node
/**
 * Debug specific type definition extraction
 */

import { parseFile } from './dist/parser/typescript-parser.js'

const typesFile = './src/core/types.ts'
const parsed = await parseFile(typesFile)

if (!parsed?.typeDefinitions) {
  console.log('No type definitions found')
  process.exit(1)
}

// Find Node, Edge, and Graph types
const targetTypes = ['Node', 'Edge', 'Graph', 'HierarchyNode', 'Status']

console.log('=== Type Reference Extraction Debug ===\n')

for (const typeName of targetTypes) {
  const typeDef = parsed.typeDefinitions.find(td => td.name === typeName)
  if (typeDef) {
    console.log(`${typeDef.kind}: ${typeDef.name}`)
    console.log(`  Extends: ${typeDef.extends?.join(', ') || 'none'}`)
    console.log(`  Implements: ${typeDef.implements?.join(', ') || 'none'}`)
    console.log(`  References: ${typeDef.references?.join(', ') || 'none'}`)
    console.log()
  }
}
