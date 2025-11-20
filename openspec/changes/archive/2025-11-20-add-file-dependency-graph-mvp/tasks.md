## 1. Core Data Structures
- [x] 1.1 Define `Graph`, `Node`, `Edge` types in `src/core/types.ts`
- [x] 1.2 Define `Status` type ('normal' | 'added' | 'modified' | 'removed')
- [x] 1.3 Write unit tests for type definitions

## 2. TypeScript/JavaScript Parser
- [x] 2.1 Setup tree-sitter with TypeScript grammar
- [x] 2.2 Implement `parseFile()` function to extract imports
- [x] 2.3 Implement `parseProject()` function to scan all .ts/.tsx/.js/.jsx files
- [x] 2.4 Handle edge cases: dynamic imports, re-exports, type-only imports
- [x] 2.5 Write parser tests with fixtures

## 3. Dependency Graph Builder
- [x] 3.1 Implement `buildGraph()` function to construct Graph from parsed files
- [x] 3.2 Implement node ID generation strategy
- [x] 3.3 Implement edge deduplication logic
- [x] 3.4 Handle circular dependencies detection (log warning, don't fail)
- [x] 3.5 Write graph builder tests

## 4. MCP Interface
- [x] 4.1 Implement MCP server with `@modelcontextprotocol/sdk`
- [x] 4.2 Implement `getDependencyGraph` tool
- [x] 4.3 Define JSON schema for request/response
- [x] 4.4 Add error handling and validation
- [x] 4.5 Write MCP integration tests

## 5. Mermaid Visualization
- [x] 5.1 Implement `generateMermaid()` function
- [x] 5.2 Support graph LR layout
- [x] 5.3 Handle node ID escaping (spaces, special chars)
- [x] 5.4 Write visualization tests

## 6. Performance & Quality
- [x] 6.1 Add performance benchmark (test with 1000 files project)
- [x] 6.2 Optimize if > 5 seconds
- [x] 6.3 Add CLI entry point for testing
- [x] 6.4 Write end-to-end test with sample project

## 7. Documentation
- [x] 7.1 Add README with usage examples
- [x] 7.2 Document data structure design decisions
- [x] 7.3 Add troubleshooting guide
