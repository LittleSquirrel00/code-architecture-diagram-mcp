import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  // 直接用全新的 parser 和进程测试
  const content = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  console.log(`文件: ${content.length} 字符, ${content.split('\n').length} 行`)

  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  // 先测试一个简单文件
  const simple = await fs.readFile('./src/core/types.ts', 'utf-8')
  try {
    const tree = parser.parse(simple)
    console.log(`types.ts: ✅ (${tree.rootNode.childCount} 节点)`)
  } catch (err) {
    console.log(`types.ts: ❌ ${err.message}`)
  }

  // 然后测试 builder.ts
  // 注意: 使用同一个 parser 实例
  try {
    const tree = parser.parse(content)
    console.log(`builder.ts: ✅ (${tree.rootNode.childCount} 节点)`)
  } catch (err) {
    console.log(`builder.ts: ❌ ${err.message}`)
  }
}

test().catch(console.error)
