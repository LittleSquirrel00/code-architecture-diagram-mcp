#!/usr/bin/env node
/**
 * 深度调试: 为什么模块级依赖少于预期?
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectPath = path.resolve(__dirname, '../VideoFlow/apps/web/src')
const tsconfigPath = path.resolve(projectPath, '..')

console.log('=== 深度调试: 模块依赖缺失分析 ===\n')

// 1. 解析项目
const files = await parseProject(projectPath)
console.log(`解析了 ${files.length} 个文件\n`)

// 2. 构建模块图
const moduleGraph = buildGraph(files, { level: 'module' }, tsconfigPath)
console.log(`找到 ${moduleGraph.nodes.length} 个模块, ${moduleGraph.edges.length} 条依赖\n`)

// 3. 统计每个模块的导入情况
const moduleImports = new Map()
const moduleFiles = new Map()

for (const file of files) {
  // 检测文件所属模块 (使用与 hierarchy-detector 一致的逻辑)
  const pathParts = file.path.split('/')
  const srcIdx = pathParts.indexOf('src')
  if (srcIdx === -1 || srcIdx >= pathParts.length - 1) continue

  const partsAfterSrc = pathParts.slice(srcIdx + 1)
  const depth = partsAfterSrc.length - 1  // -1 for the filename

  // 与 hierarchy-detector.ts 保持一致: depth < 1 归为 __root__
  const module = depth < 1 ? '__root__' : partsAfterSrc[0]

  if (!moduleFiles.has(module)) {
    moduleFiles.set(module, [])
  }
  moduleFiles.get(module).push(file.path)

  // 统计该文件的 @/ 导入
  for (const imp of file.imports) {
    if (imp.importPath.startsWith('@/')) {
      const targetModule = imp.importPath.split('/')[1]
      if (targetModule && targetModule !== module) {
        const key = `${module} -> ${targetModule}`
        moduleImports.set(key, (moduleImports.get(key) || 0) + 1)
      }
    }
  }
}

console.log('=== 原始导入统计 (基于 @/ 路径) ===')
const sortedImports = Array.from(moduleImports.entries())
  .sort((a, b) => b[1] - a[1])

for (const [dep, count] of sortedImports) {
  console.log(`  ${dep}: ${count} 次`)
}
console.log(`总共 ${sortedImports.length} 对模块依赖关系\n`)

// 4. 对比 buildGraph 的结果
console.log('=== buildGraph 检测到的依赖 ===')
const detectedDeps = new Set()
for (const edge of moduleGraph.edges) {
  const fromNode = moduleGraph.nodes.find(n => n.id === edge.from)
  const toNode = moduleGraph.nodes.find(n => n.id === edge.to)
  if (fromNode && toNode && fromNode.type === 'hierarchy' && toNode.type === 'hierarchy') {
    const dep = `${fromNode.path} -> ${toNode.path}`
    console.log(`  ${dep}`)
    detectedDeps.add(dep)
  }
}

// 5. 找出缺失的依赖
console.log('\n=== ⚠️ 缺失的依赖 (有导入但未检测到边) ===')
let missingCount = 0
for (const [dep, count] of sortedImports) {
  if (!detectedDeps.has(dep)) {
    console.log(`  ${dep}: ${count} 次导入 - ❌ 未检测到`)
    missingCount++
  }
}

if (missingCount === 0) {
  console.log('  ✅ 无缺失依赖')
} else {
  console.log(`\n总计 ${missingCount} 对依赖关系缺失`)
}

// 6. 深入分析一个缺失案例
if (missingCount > 0) {
  const firstMissing = sortedImports.find(([dep]) => !detectedDeps.has(dep))
  if (firstMissing) {
    const [dep, count] = firstMissing
    const [fromMod, toMod] = dep.split(' -> ')

    console.log(`\n=== 🔍 深入分析缺失案例: ${dep} ===`)

    // 找一个具体的导入实例
    for (const file of files) {
      const pathParts = file.path.split('/')
      const srcIdx = pathParts.indexOf('src')
      if (srcIdx === -1) continue
      const module = pathParts[srcIdx + 1]

      if (module === fromMod) {
        for (const imp of file.imports) {
          if (imp.importPath.startsWith(`@/${toMod}`)) {
            console.log(`\n示例文件: ${path.relative(projectPath, file.path)}`)
            console.log(`导入语句: import ... from '${imp.importPath}'`)

            // 检查为什么没有解析成功
            console.log(`\n检查点:`)
            console.log(`  1. 导入路径: ${imp.importPath}`)
            console.log(`  2. 是否被标记为 type-only: ${imp.isTypeOnly}`)
            console.log(`  3. 是否被标记为 dynamic: ${imp.isDynamic}`)

            // 尝试手动解析
            const expectedPath = imp.importPath.replace('@/', projectPath + '/')
            console.log(`  4. 预期解析路径: ${expectedPath}`)

            break
          }
        }
        break
      }
    }
  }
}

console.log('\n=== 调试完成 ===')
