#!/usr/bin/env node
/**
 * Debug AST structure for Graph interface
 */

import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

const parser = new Parser()
parser.setLanguage(TypeScript.typescript)

const content = await fs.readFile('./src/core/types.ts', 'utf-8')
const tree = parser.parse(content)

// Find Graph interface node
function findGraphInterface(node) {
  if (node.type === 'interface_declaration') {
    const name = node.childForFieldName('name')
    if (name?.text === 'Graph') {
      return node
    }
  }
  for (const child of node.children) {
    const result = findGraphInterface(child)
    if (result) return result
  }
  return null
}

const graphNode = findGraphInterface(tree.rootNode)

if (!graphNode) {
  console.log('Graph interface not found')
  process.exit(1)
}

console.log('=== Graph Interface AST ===\n')
console.log('Node type:', graphNode.type)
console.log('Text:', graphNode.text)
console.log('\nChildren:')

for (let i = 0; i < graphNode.childCount; i++) {
  const child = graphNode.child(i)
  console.log(`  [${i}] ${child.type}: "${child.text.slice(0, 50)}"`)

  if (child.type === 'object_type') {
    console.log('    Object type children:')
    for (let j = 0; j < child.childCount; j++) {
      const subChild = child.child(j)
      console.log(`      [${j}] ${subChild.type}: "${subChild.text.slice(0, 40)}"`)

      if (subChild.type === 'property_signature') {
        console.log('        Property signature children:')
        for (let k = 0; k < subChild.childCount; k++) {
          const propChild = subChild.child(k)
          console.log(`          [${k}] ${propChild.type}: "${propChild.text}"`)
        }
      }
    }
  }
}
