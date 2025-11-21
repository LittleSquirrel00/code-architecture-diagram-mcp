#!/usr/bin/env node
/**
 * Debug type extraction
 * Check what information is being extracted from type definitions
 */

import { parseFile } from './dist/parser/typescript-parser.js'

const typesFile = './src/core/types.ts'

console.log('=== Debugging Type Extraction ===\n')

const parsed = await parseFile(typesFile)

if (!parsed) {
  console.log('Failed to parse file')
  process.exit(1)
}

console.log(`Parsed file: ${parsed.path}`)
console.log(`Type definitions: ${parsed.typeDefinitions?.length || 0}\n`)

if (parsed.typeDefinitions) {
  for (const td of parsed.typeDefinitions) {
    console.log(`\n${td.kind}: ${td.name}`)
    console.log(`  Exported: ${td.isExported}`)
    if (td.extends) {
      console.log(`  Extends: ${td.extends.join(', ')}`)
    }
    if (td.implements) {
      console.log(`  Implements: ${td.implements.join(', ')}`)
    }
  }
}

console.log('\n=== Expected but Missing ===')
console.log('❌ Property type references (e.g., Graph.nodes: Node[])')
console.log('❌ Union type members (e.g., type Node = A | B)')
console.log('❌ Type alias right-hand side references')

console.log('\n=== Root Cause ===')
console.log('extractTypeDefinitions() only captures:')
console.log('  ✅ extends clause (interface extends)')
console.log('  ✅ implements clause (class implements)')
console.log('  ❌ Property types (interface properties)')
console.log('  ❌ Union members (type aliases)')
console.log('  ❌ Intersection members')
console.log('  ❌ Generic type arguments')
