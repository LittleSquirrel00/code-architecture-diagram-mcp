import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  console.log('=== 深度诊断 ===\n')

  const content = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  const lines = content.split('\n')

  // 创建单个 parser
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  // 测试不同大小
  const testSizes = [100, 500, 800, 1000, 1050, 1100, 1110, 1120, 1130, 1140]

  for (const size of testSizes) {
    const testContent = lines.slice(0, size).join('\n')
    try {
      const tree = parser.parse(testContent)
      console.log(`✅ ${size} 行: OK (${tree.rootNode.childCount} 节点)`)
    } catch (err) {
      console.log(`❌ ${size} 行: 失败 - ${err.message}`)

      // 找到失败点，检查具体行
      for (let i = size - 10; i <= size; i++) {
        const test = lines.slice(0, i).join('\n')
        try {
          parser.parse(test)
          console.log(`  ${i}: OK`)
        } catch {
          console.log(`  ${i}: FAIL - "${lines[i-1]?.substring(0, 60)}..."`)
        }
      }
      break
    }
  }
}

test().catch(console.error)
