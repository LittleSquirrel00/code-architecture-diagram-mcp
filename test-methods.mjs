import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  const content = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  console.log(`文件: ${content.length} 字符`)

  // 方法1: 使用 Buffer
  console.log('\n方法1: 使用 Buffer')
  const parser1 = new Parser()
  parser1.setLanguage(TypeScript.typescript)
  try {
    const buffer = Buffer.from(content, 'utf-8')
    const tree = parser1.parse(buffer)
    console.log(`✅ 成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`)
  }

  // 方法2: 移除最后的空行
  console.log('\n方法2: 移除尾部空白')
  const parser2 = new Parser()
  parser2.setLanguage(TypeScript.typescript)
  try {
    const trimmed = content.trimEnd()
    const tree = parser2.parse(trimmed)
    console.log(`✅ 成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`)
  }

  // 方法3: 添加换行符
  console.log('\n方法3: 确保以换行结尾')
  const parser3 = new Parser()
  parser3.setLanguage(TypeScript.typescript)
  try {
    const withNewline = content.endsWith('\n') ? content : content + '\n'
    const tree = parser3.parse(withNewline)
    console.log(`✅ 成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`)
  }
}

test().catch(console.error)
