#!/usr/bin/env node
/**
 * 验证路径别名解析 - 使用 VideoFlow 项目
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectPath = path.resolve(__dirname, '../VideoFlow/apps/web/src')

console.log('=== VideoFlow 项目路径别名解析验证 ===\n')
console.log(`项目路径: ${projectPath}\n`)

// 1. 解析项目
console.log('1. 解析项目文件...')
const files = await parseProject(projectPath)
console.log(`   找到 ${files.length} 个源文件\n`)

// 2. 检查路径别名导入
console.log('2. 检查 @/* 路径别名使用情况...')
const aliasImports = []
for (const file of files) {
  for (const imp of file.imports) {
    if (imp.importPath.startsWith('@/')) {
      aliasImports.push({
        file: path.relative(projectPath, file.path),
        import: imp.importPath
      })
    }
  }
}

console.log(`   找到 ${aliasImports.length} 个 @/* 导入:`)
const samples = aliasImports.slice(0, 10)
for (const { file, import: imp } of samples) {
  console.log(`   - ${imp} (在 ${file})`)
}
if (aliasImports.length > 10) {
  console.log(`   ... 以及其他 ${aliasImports.length - 10} 个导入`)
}
console.log()

// 3. 构建模块级依赖图 (不支持路径别名)
console.log('3. 构建模块级依赖图 (WITHOUT projectPath - 旧版本)...')
const oldModuleGraph = buildGraph(files, { level: 'module' })
console.log(`   模块数: ${oldModuleGraph.nodes.length}`)
console.log(`   模块间依赖: ${oldModuleGraph.edges.length}\n`)

// 4. 构建模块级依赖图 (支持路径别名)
console.log('4. 构建模块级依赖图 (WITH projectPath - 新版本)...')
const tsconfigPath = path.resolve(projectPath, '..')  // apps/web/
const newModuleGraph = buildGraph(files, { level: 'module' }, tsconfigPath)
console.log(`   模块数: ${newModuleGraph.nodes.length}`)
console.log(`   模块间依赖: ${newModuleGraph.edges.length}\n`)

// 5. 对比差异
const improvement = newModuleGraph.edges.length - oldModuleGraph.edges.length
const improvementPercent = oldModuleGraph.edges.length > 0
  ? ((improvement / oldModuleGraph.edges.length) * 100).toFixed(1)
  : 'N/A'

console.log('5. 修复效果对比:')
console.log(`   旧版本 (无路径别名支持): ${oldModuleGraph.edges.length} 条依赖`)
console.log(`   新版本 (支持路径别名):   ${newModuleGraph.edges.length} 条依赖`)
console.log(`   改进: +${improvement} 条依赖 (+${improvementPercent}%)\n`)

// 6. 显示新增的依赖关系
if (improvement > 0) {
  console.log('6. 新增的模块依赖关系 (通过路径别名发现):')
  const oldEdgeSet = new Set(
    oldModuleGraph.edges.map(e => `${e.from}->${e.to}`)
  )
  const newEdges = newModuleGraph.edges.filter(e =>
    !oldEdgeSet.has(`${e.from}->${e.to}`)
  )

  for (const edge of newEdges.slice(0, 20)) {
    const fromNode = newModuleGraph.nodes.find(n => n.id === edge.from)
    const toNode = newModuleGraph.nodes.find(n => n.id === edge.to)
    if (fromNode && toNode && fromNode.type === 'hierarchy' && toNode.type === 'hierarchy') {
      console.log(`   ✓ ${fromNode.path} -> ${toNode.path}`)
    }
  }
  if (newEdges.length > 20) {
    console.log(`   ... 以及其他 ${newEdges.length - 20} 个新增依赖`)
  }
} else {
  console.log('6. 未发现新增依赖 (可能项目不使用路径别名)')
}

console.log('\n=== 验证完成 ===')
