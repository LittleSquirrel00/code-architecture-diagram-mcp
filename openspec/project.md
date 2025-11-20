# Project Context

## Purpose

**代码架构依赖关系可视化工具 (Code Architecture Dependency Graph MCP Server)**

本项目为AI辅助编码场景提供代码依赖关系分析能力。核心目标:
- 让AI能"看到"代码的架构演变和依赖关系
- 检测架构变化,避免依赖混乱
- 通过MCP接口提供标准化服务

## Tech Stack

- **语言:** TypeScript 5.x (ESM)
- **AST解析:** tree-sitter + tree-sitter-typescript
- **MCP接口:** @modelcontextprotocol/sdk
- **测试:** Jest
- **构建:** tsc
- **运行时:** Node.js >=18.0.0

## Project Conventions

### Code Style
- 使用TypeScript严格模式 (`strict: true`)
- 优先使用判别联合类型(Discriminated Unions)消除特殊情况
- 函数不超过50行,不超过3层缩进
- 避免过度抽象,优先简单直接的实现

### Architecture Patterns
- **数据驱动:** 所有逻辑基于`Graph`数据结构
- **无状态:** MCP接口不保存状态,每次请求独立处理
- **只读操作:** 不修改任何源代码文件
- **错误容忍:** 单个文件解析失败不影响整体

### Testing Strategy
- 每个模块都有对应的unit test
- 使用fixture文件测试parser
- MCP接口有integration test
- 性能测试:验证1000文件<5秒的目标

### Git Workflow
- 遵循OpenSpec规范的增量迭代流程
- 每个Phase对应一个change proposal
- 向后兼容:新Phase只增加功能,不修改已有接口

## Domain Context

### 核心概念
- **依赖图(Dependency Graph):** 由节点和边构成的有向图
- **节点(Node):** 代表代码元素(文件、模块、组件等)
- **边(Edge):** 代表依赖关系(import、render、implement等)
- **层级(Level):** 抽象程度(architecture > module > component > file)

### 增量迭代策略 (7 Phases)
- **Phase 1 (MVP):** 文件级import依赖图
- **Phase 2:** 层级支持(Module/Component)
- **Phase 3:** 抽象层支持(Interface/DataModel)
- **Phase 4:** UI布局支持(render边)
- **Phase 5:** 变更对比(Diff)
- **Phase 6:** 视图过滤(focused/neighbors模式)
- **Phase 7:** Architecture层(可选)

当前实现: **Phase 1**

## Important Constraints

### 性能约束
- 小型项目(<100文件): <1秒
- 中型项目(100-1000文件): <5秒
- 大型项目(>1000文件): <30秒

### 语言支持
- Phase 1: 仅支持TypeScript/JavaScript
- 未来: 架构设计支持扩展其他语言

### 不做的事情 (Anti-Scope)
- ❌ 代码质量分析
- ❌ 性能分析
- ❌ 安全漏洞扫描
- ❌ 代码生成
- ❌ 修改源代码

## External Dependencies

### tree-sitter
- 用于AST解析
- 支持增量解析,性能优秀
- 多语言支持(为未来扩展预留)

### @modelcontextprotocol/sdk
- MCP官方SDK
- 提供标准化的AI工具接口
- JSON-RPC通信协议

### 目录结构约定
- 基于目录结构推断层级(Phase 2+)
- 示例: `src/modules/*/` → Module层
- 示例: `src/components/*/` → Component层
