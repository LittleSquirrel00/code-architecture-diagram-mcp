import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import * as fs from 'fs/promises'

async function test() {
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  const content = await fs.readFile('./src/graph/builder.ts', 'utf-8')
  const lines = content.split('\n')

  // 二分法找问题区域
  let low = 662  // 旧版本行数
  let high = 1140

  while (high - low > 20) {
    const mid = Math.floor((low + high) / 2)
    const test = lines.slice(0, mid).join('\n')
    try {
      parser.parse(test)
      low = mid
    } catch {
      high = mid
    }
  }

  console.log(`问题区域: ${low} - ${high} 行\n`)

  // 逐行测试
  for (let i = low; i <= high; i++) {
    const test = lines.slice(0, i).join('\n')
    try {
      parser.parse(test)
      // console.log(`${i}: OK`)
    } catch {
      console.log(`❌ 第 ${i} 行导致失败:`)
      console.log(`"${lines[i-1]}"`)
      console.log(`\n前后上下文:`)
      for (let j = i - 3; j <= i + 2 && j < lines.length; j++) {
        const marker = j === i - 1 ? '>>>' : '   '
        console.log(`${marker} ${j + 1}: ${lines[j]}`)
      }
      break
    }
  }
}

test().catch(console.error)
