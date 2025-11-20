#!/usr/bin/env node
/**
 * Debug script to test JSX parsing
 */

import { parseProject } from './dist/parser/typescript-parser.js'

const files = await parseProject('__tests__/fixtures/render-test')

console.log('\n=== Parsed Files ===\n')

for (const file of files) {
  const name = file.path.split('/').pop()
  console.log(`\n${name}:`)
  console.log(`  imports: ${file.imports.length}`)
  console.log(`  renders: ${file.renders?.length || 0}`)

  if (file.renders && file.renders.length > 0) {
    console.log('  Components rendered:')
    for (const render of file.renders) {
      console.log(`    - ${render.componentName} (position: ${render.position})`)
    }
  }
}
