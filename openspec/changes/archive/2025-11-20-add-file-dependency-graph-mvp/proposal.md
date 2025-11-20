# Change: Add File-Level Dependency Graph (Phase 1 MVP)

## Why

AI辅助编码场景中,AI无法直观看到代码的依赖关系,导致:
- 生成代码时难以追踪架构变化
- 依赖关系混乱难以发现
- 代码迁移时依赖链断裂

本提案实现Phase 1 MVP:建立最基础的文件级依赖图解析能力,验证技术方案可行性。

## What Changes

- 新增核心数据结构:`Graph`, `Node`, `Edge`
- 实现TypeScript/JavaScript项目的import关系解析
- 提供MCP接口:`getDependencyGraph`
- 生成Mermaid格式的可视化文本
- 支持文件级依赖图(不包含模块/组件层级)
- 只支持import边(不包含render/implement/use边)
- 只支持global视图模式(不包含focused/neighbors)

**核心原则:**
- 数据结构简洁,使用判别联合类型消除特殊情况
- 最简单实现,避免过度设计
- 只读操作,不修改任何代码
- 为后续Phase预留扩展空间(向后兼容)

## Impact

- **新增规范:** `dependency-graph` capability
- **新增代码:**
  - `src/core/types.ts` - 核心数据结构
  - `src/parser/typescript-parser.ts` - TypeScript解析器
  - `src/graph/builder.ts` - 依赖图构建器
  - `src/mcp/server.ts` - MCP服务器
  - `src/visualization/mermaid.ts` - Mermaid生成器
- **技术栈:**
  - TypeScript 5.x
  - tree-sitter + tree-sitter-typescript (AST解析)
  - @modelcontextprotocol/sdk (MCP接口)
- **性能目标:** 1000文件 < 5秒
