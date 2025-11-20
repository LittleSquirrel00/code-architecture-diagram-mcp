// Debug script to inspect tree-sitter AST
import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs'

const code = `
import type { User } from './types'
import('./module-e')
`

const parser = new Parser()
parser.setLanguage(TypeScript.typescript)
const tree = parser.parse(code)

function printTree(node: Parser.SyntaxNode, indent = 0) {
  console.log('  '.repeat(indent) + `${node.type}: "${node.text.substring(0, 40)}"`)
  for (const child of node.children) {
    printTree(child, indent + 1)
  }
}

printTree(tree.rootNode)
