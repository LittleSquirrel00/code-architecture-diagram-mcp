import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  const content = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  console.log(`文件: ${content.length} 字符, ${content.split('\n').length} 行`)

  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  // 测试完整文件
  console.log('\n测试完整文件:')
  try {
    const tree = parser.parse(content)
    console.log(`✅ 成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`)
  }

  // 测试创建新 parser
  console.log('\n使用新 parser 实例:')
  const parser2 = new Parser()
  parser2.setLanguage(TypeScript.typescript)
  try {
    const tree = parser2.parse(content)
    console.log(`✅ 成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`)
  }
}

test().catch(console.error)
