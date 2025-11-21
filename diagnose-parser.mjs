import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

const filePath = './src/graph/builder.ts'

async function test() {
  console.log('=== 诊断 builder.ts 解析失败 ===\n')

  // 1. 检查文件是否可读
  const content = await fs.readFile(filePath, 'utf-8')
  console.log(`文件大小: ${content.length} 字符`)
  console.log(`行数: ${content.split('\n').length}`)
  console.log(`内容类型: ${typeof content}`)
  console.log('')

  // 2. 创建 parser
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)
  console.log('Parser 创建成功')

  // 3. 尝试解析
  try {
    console.log('开始解析...')
    const tree = parser.parse(content)
    console.log(`解析成功! 根节点类型: ${tree.rootNode.type}`)
    console.log(`子节点数量: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.error('解析失败:', err.message)

    // 4. 二分查找问题位置
    const lines = content.split('\n')
    let low = 0, high = lines.length

    while (high - low > 10) {
      const mid = Math.floor((low + high) / 2)
      const testContent = lines.slice(0, mid).join('\n')
      try {
        parser.parse(testContent)
        low = mid  // 前半部分OK，问题在后面
      } catch {
        high = mid  // 前半部分就有问题
      }
    }

    console.log(`\n问题大约在第 ${low} - ${high} 行`)
    console.log('这几行的内容:')
    for (let i = Math.max(0, low - 2); i < Math.min(lines.length, high + 2); i++) {
      console.log(`${i + 1}: ${lines[i]}`)
    }
  }
}

test().catch(console.error)
