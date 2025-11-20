## 1. Core Data Structures
- [ ] 1.1 Define `Graph`, `Node`, `Edge` types in `src/core/types.ts`
- [ ] 1.2 Define `Status` type ('normal' | 'added' | 'modified' | 'removed')
- [ ] 1.3 Write unit tests for type definitions

## 2. TypeScript/JavaScript Parser
- [ ] 2.1 Setup tree-sitter with TypeScript grammar
- [ ] 2.2 Implement `parseFile()` function to extract imports
- [ ] 2.3 Implement `parseProject()` function to scan all .ts/.tsx/.js/.jsx files
- [ ] 2.4 Handle edge cases: dynamic imports, re-exports, type-only imports
- [ ] 2.5 Write parser tests with fixtures

## 3. Dependency Graph Builder
- [ ] 3.1 Implement `buildGraph()` function to construct Graph from parsed files
- [ ] 3.2 Implement node ID generation strategy
- [ ] 3.3 Implement edge deduplication logic
- [ ] 3.4 Handle circular dependencies detection (log warning, don't fail)
- [ ] 3.5 Write graph builder tests

## 4. MCP Interface
- [ ] 4.1 Implement MCP server with `@modelcontextprotocol/sdk`
- [ ] 4.2 Implement `getDependencyGraph` tool
- [ ] 4.3 Define JSON schema for request/response
- [ ] 4.4 Add error handling and validation
- [ ] 4.5 Write MCP integration tests

## 5. Mermaid Visualization
- [ ] 5.1 Implement `generateMermaid()` function
- [ ] 5.2 Support graph LR layout
- [ ] 5.3 Handle node ID escaping (spaces, special chars)
- [ ] 5.4 Write visualization tests

## 6. Performance & Quality
- [ ] 6.1 Add performance benchmark (test with 1000 files project)
- [ ] 6.2 Optimize if > 5 seconds
- [ ] 6.3 Add CLI entry point for testing
- [ ] 6.4 Write end-to-end test with sample project

## 7. Documentation
- [ ] 7.1 Add README with usage examples
- [ ] 7.2 Document data structure design decisions
- [ ] 7.3 Add troubleshooting guide
