#!/usr/bin/env node
/**
 * 模拟 MCP getDependencyGraph 工具调用
 *
 * 这个脚本演示如何通过编程方式调用 getDependencyGraph 功能
 */

import { parseProject } from './dist/parser/typescript-parser.js'
import { buildGraph } from './dist/graph/builder.js'
import { generateMermaid } from './dist/visualization/mermaid.js'

async function callGetDependencyGraph(projectPath, format = 'both', level = 'file', edgeTypes = ['import']) {
  console.log('=== 调用 getDependencyGraph 工具 ===\n')
  console.log(`参数:`)
  console.log(`  - projectPath: ${projectPath}`)
  console.log(`  - format: ${format}`)
  console.log(`  - level: ${level}`)
  console.log(`  - edgeTypes: [${edgeTypes.join(', ')}]\n`)

  try {
    // Step 1: Parse project files
    console.log('📝 解析项目文件...')
    const files = await parseProject(projectPath)
    console.log(`✓ 找到 ${files.length} 个文件\n`)

    // Step 2: Build dependency graph with edgeTypes (Phase 3)
    console.log('🔗 构建依赖图...')
    const graph = buildGraph(files, { level, edgeTypes })
    console.log(`✓ 创建图: ${graph.nodes.length} 个节点, ${graph.edges.length} 条边\n`)

    // Step 3: Generate output based on format
    const result = {}

    if (format === 'json' || format === 'both') {
      result.graph = graph
    }

    if (format === 'mermaid' || format === 'both') {
      result.mermaid = generateMermaid(graph, {
        useRelativePaths: true,
        projectRoot: projectPath,
      })
    }

    // Add summary
    result.summary = {
      totalFiles: files.length,
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
    }

    // Add edge type counts (Phase 3)
    if (edgeTypes.includes('import')) {
      result.summary.totalImportEdges = graph.edges.filter((e) => e.type === 'import').length
    }
    if (edgeTypes.includes('implement')) {
      result.summary.totalImplementEdges = graph.edges.filter((e) => e.type === 'implement').length
    }

    // Add level-specific counts
    if (level === 'module') {
      const moduleNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'module'
      )
      result.summary.totalModules = moduleNodes.length
    } else if (level === 'component') {
      const componentNodes = graph.nodes.filter(
        (n) => n.type === 'hierarchy' && n.level === 'component'
      )
      result.summary.totalComponents = componentNodes.length
    }

    // Display results
    console.log('=== 返回结果 ===\n')

    if (result.summary) {
      console.log('📊 摘要:')
      console.log(`  - 总文件数: ${result.summary.totalFiles}`)
      console.log(`  - 总节点数: ${result.summary.totalNodes}`)
      console.log(`  - 总边数: ${result.summary.totalEdges}`)
      if (result.summary.totalImportEdges !== undefined) {
        console.log(`  - Import边数: ${result.summary.totalImportEdges}`)
      }
      if (result.summary.totalImplementEdges !== undefined) {
        console.log(`  - Implement边数: ${result.summary.totalImplementEdges}`)
      }
      if (result.summary.totalModules !== undefined) {
        console.log(`  - 模块数: ${result.summary.totalModules}`)
      }
      if (result.summary.totalComponents !== undefined) {
        console.log(`  - 组件数: ${result.summary.totalComponents}`)
      }
      console.log()
    }

    if (result.mermaid) {
      console.log('🎨 Mermaid 图:\n')
      console.log('```mermaid')
      console.log(result.mermaid)
      console.log('```\n')
    }

    if (result.graph && format === 'json') {
      console.log('📦 图数据 (JSON):')
      console.log(JSON.stringify(result.graph, null, 2))
    }

    console.log('✅ 调用成功!')
    return result

  } catch (error) {
    console.error('❌ 调用失败:', error.message)
    throw error
  }
}

// 调用示例：分析当前项目的 src 目录
const projectPath = process.cwd() + '/src'

console.log('\n========== 1. 文件级别依赖图 (仅Import关系) ==========\n')
await callGetDependencyGraph(projectPath, 'mermaid', 'file', ['import'])

console.log('\n========== 2. 模块级别依赖图 ==========\n')
await callGetDependencyGraph(projectPath, 'mermaid', 'module', ['import'])

console.log('\n========== 3. 模块级别依赖图 (完整JSON) ==========\n')
await callGetDependencyGraph(projectPath, 'json', 'module', ['import'])

