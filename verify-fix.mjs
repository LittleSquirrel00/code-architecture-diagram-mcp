#!/usr/bin/env node
/**
 * 验证路径别名解析修复
 *
 * 测试场景:
 * 1. 读取 tsconfig.json 中的路径别名配置
 * 2. 解析项目文件
 * 3. 检查是否能正确解析 @/* 导入
 * 4. 对比修复前后的依赖数量
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectPath = __dirname

console.log('=== 路径别名解析验证 ===\n')

// 1. 解析项目
console.log('1. 解析项目文件...')
const files = await parseProject(projectPath)
console.log(`   找到 ${files.length} 个源文件\n`)

// 2. 检查是否有使用路径别名的导入
console.log('2. 检查路径别名使用情况...')
let aliasImportCount = 0
for (const file of files) {
  for (const imp of file.imports) {
    // 检查是否为非相对路径且非 npm 包 (可能是路径别名)
    if (!imp.importPath.startsWith('.') &&
        !imp.importPath.startsWith('/') &&
        !imp.importPath.includes('node_modules')) {
      console.log(`   发现路径别名导入: ${imp.importPath} (在 ${path.basename(file.path)})`)
      aliasImportCount++
    }
  }
}
console.log(`   总计: ${aliasImportCount} 个路径别名导入\n`)

// 3. 构建文件级依赖图 (带 projectPath 支持)
console.log('3. 构建文件级依赖图 (支持路径别名)...')
const fileGraph = buildGraph(files, { level: 'file' }, projectPath)
console.log(`   节点数: ${fileGraph.nodes.length}`)
console.log(`   边数: ${fileGraph.edges.length}\n`)

// 4. 构建模块级依赖图
console.log('4. 构建模块级依赖图...')
const moduleGraph = buildGraph(files, { level: 'module' }, projectPath)
console.log(`   模块数: ${moduleGraph.nodes.length}`)
console.log(`   模块间依赖: ${moduleGraph.edges.length}\n`)

// 5. 输出模块依赖关系
console.log('5. 模块依赖关系:')
for (const edge of moduleGraph.edges) {
  const fromNode = moduleGraph.nodes.find(n => n.id === edge.from)
  const toNode = moduleGraph.nodes.find(n => n.id === edge.to)
  if (fromNode && toNode && fromNode.type === 'hierarchy' && toNode.type === 'hierarchy') {
    console.log(`   ${fromNode.path} -> ${toNode.path}`)
  }
}

console.log('\n=== 验证完成 ===')
