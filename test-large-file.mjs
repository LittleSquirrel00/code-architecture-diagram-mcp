import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  // 生成 10K 行测试文件
  let content = `// Test file with 10000+ lines\n`
  content += `import { Graph } from './types'\n\n`

  // 添加多个函数以达到 10K 行
  for (let i = 0; i < 500; i++) {
    content += `
/**
 * Function ${i} - does something useful
 * @param input - the input value
 * @returns processed result
 */
function process${i}(input: string): string {
  const visited = new Set<string>()
  const stack = new Set<string>()
  const result: string[][] = []

  function dfs(node: string, path: string[]): void {
    visited.add(node)
    stack.add(node)
    path.push(node)
    stack.delete(node)
    path.pop()
  }

  return input.toUpperCase()
}
`
  }

  const lines = content.split('\n').length
  console.log(`生成测试文件: ${content.length} 字符, ${lines} 行`)

  // 测试解析
  try {
    const tree = parser.parse(content)
    console.log(`✅ 解析成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 解析失败: ${err.message}`)
  }

  // 测试实际的 builder.ts
  console.log('\n测试 builder.ts:')
  const builderContent = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  console.log(`builder.ts: ${builderContent.length} 字符, ${builderContent.split('\n').length} 行`)
  try {
    const tree = parser.parse(builderContent)
    console.log(`✅ 解析成功! 节点数: ${tree.rootNode.childCount}`)
  } catch (err) {
    console.log(`❌ 解析失败: ${err.message}`)
  }
}

test().catch(console.error)
