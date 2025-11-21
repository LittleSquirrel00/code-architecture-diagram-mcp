import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  // 测试旧版本
  const old = await fs.readFile('/tmp/builder-old.ts', 'utf-8')
  console.log(`旧版本: ${old.length} 字符, ${old.split('\n').length} 行`)
  try {
    const tree = parser.parse(old)
    console.log(`旧版本: ✅ (${tree.rootNode.childCount} 节点)`)
  } catch (err) {
    console.log(`旧版本: ❌ ${err.message}`)
  }

  // 测试新版本
  const current = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  console.log(`\n新版本: ${current.length} 字符, ${current.split('\n').length} 行`)
  try {
    const tree = parser.parse(current)
    console.log(`新版本: ✅ (${tree.rootNode.childCount} 节点)`)
  } catch (err) {
    console.log(`新版本: ❌ ${err.message}`)
  }
}

test().catch(console.error)
