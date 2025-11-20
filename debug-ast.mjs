#!/usr/bin/env node
/**
 * Debug script to inspect tree-sitter AST for JSX files
 */

import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

const parser = new Parser()
parser.setLanguage(TypeScript.tsx)  // Use TSX grammar for JSX support

const content = await fs.readFile('__tests__/fixtures/render-test/Dashboard.tsx', 'utf-8')

console.log('=== File Content ===')
console.log(content)
console.log()

const tree = parser.parse(content)

console.log('=== AST Root ===')
console.log('Type:', tree.rootNode.type)
console.log('Children count:', tree.rootNode.children.length)
console.log()

console.log('=== Top-level Children ===')
for (const child of tree.rootNode.children) {
  console.log(`- ${child.type} (${child.startPosition.row + 1}:${child.startPosition.column})`)
}
console.log()

// Find function declaration and print its structure
function findFunctionDeclaration(node, depth = 0) {
  const indent = '  '.repeat(depth)

  if (node.type === 'function_declaration' || node.type === 'export_statement') {
    console.log(`${indent}${node.type}:`)
    for (const child of node.children) {
      printDeepStructure(child, depth + 1, 5)
    }
  } else {
    for (const child of node.children) {
      findFunctionDeclaration(child, depth)
    }
  }
}

function printDeepStructure(node, depth, maxDepth) {
  if (depth > maxDepth) return

  const indent = '  '.repeat(depth)
  const fieldInfo = node.fieldName ? ` [${node.fieldName}]` : ''
  console.log(`${indent}${node.type}${fieldInfo}`)

  if (node.type === 'identifier' || node.type === 'string') {
    console.log(`${indent}  → "${node.text}"`)
  }

  for (const child of node.children) {
    printDeepStructure(child, depth + 1, maxDepth)
  }
}

console.log('=== Function Declaration AST ===')
findFunctionDeclaration(tree.rootNode)

// Search for any JSX-related nodes
console.log('\n=== Searching for JSX nodes ===')
let jsxNodeCount = 0

function findJSXNodes(node) {
  if (node.type.includes('jsx') || node.type.includes('element')) {
    jsxNodeCount++
    console.log(`Found: ${node.type} at line ${node.startPosition.row + 1}`)
    console.log(`  Text: ${node.text.substring(0, 50)}...`)
  }

  for (const child of node.children) {
    findJSXNodes(child)
  }
}

findJSXNodes(tree.rootNode)
console.log(`\nTotal JSX-related nodes found: ${jsxNodeCount}`)
