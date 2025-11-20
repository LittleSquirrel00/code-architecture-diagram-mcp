# Implementation Tasks

## Task Breakdown

### Phase 1: Type Definitions and Data Model (Day 1)

- [ ] **Define ImplementInfo interface in types.ts**
  - Add `ImplementInfo` with className, interfaces, interfacePaths fields
  - Update `ParsedFile` to include optional `implements?: ImplementInfo[]`
  - **Validation**: TypeScript compilation succeeds

- [ ] **Update GetDependencyGraphOptions**
  - Add `edgeTypes?: ('import' | 'implement')[]` parameter
  - Document default value as `['import']`
  - **Validation**: Types compile, backward compatible

- [ ] **Create EdgeType type alias**
  - Define `type EdgeType = 'import' | 'implement'` (extensible for Phase 4)
  - Export from types.ts
  - **Validation**: Used in GetDependencyGraphOptions

### Phase 2: AST Parsing for Implements (Days 2-3)

- [ ] **Add AST query for implements_clause**
  - Modify `typescript-parser.ts` to detect `class_declaration` nodes
  - Query for `implements_clause` child node
  - Extract `type_identifier` nodes from implements clause
  - **Validation**: Unit test with basic `class Foo implements Bar`

- [ ] **Extract interface names from AST**
  - Handle multiple interfaces: `class Foo implements A, B, C`
  - Handle generic interfaces: `class Foo implements Bar<T>` → extract "Bar"
  - Handle qualified names: `class Foo implements ns.IBar` → extract "IBar"
  - **Validation**: Unit tests for each edge case

- [ ] **Map interface names to import paths**
  - Cross-reference extracted interface names with import statements
  - Build `Map<string, string>` for interface name → import path
  - Handle interfaces with no import (same-file)
  - **Validation**: Unit test with imports from different files

- [ ] **Integrate into parseFile function**
  - Add implements extraction to existing parseFile logic
  - Return ImplementInfo[] in ParsedFile result
  - Ensure no performance regression on files without implements
  - **Validation**: Integration test, performance benchmark

### Phase 3: Graph Building with Implement Edges (Day 3)

- [ ] **Implement createImplementEdges function**
  - Input: ParsedFile[], fileIdMap
  - Output: ImplementEdge[]
  - Logic: For each implements, resolve interface path, create edge
  - **Validation**: Unit tests for cross-file, intra-file, missing interface

- [ ] **Add edge filtering logic to buildGraph**
  - Accept `edgeTypes` in BuildOptions
  - Default to `['import']` for backward compatibility
  - Conditionally call createImportEdges / createImplementEdges
  - **Validation**: Test with different edgeTypes combinations

- [ ] **Handle intra-file implementations**
  - Skip creating edge if interface has no import path
  - Log debug message: "Skipping intra-file implementation"
  - **Validation**: Test fixture with same-file interface

- [ ] **Handle missing interface files**
  - Skip creating edge if interface file not in fileIdMap
  - Log warning: "Cannot resolve interface {name}"
  - **Validation**: Test with external node_modules interface

### Phase 4: Testing (Day 4)

- [ ] **Create unit tests for implement detection**
  - `__tests__/implement-detection.test.ts`
  - Test single/multiple interfaces, generics, qualified names
  - **Validation**: ≥95% code coverage for parser changes

- [ ] **Create unit tests for implement edge creation**
  - `__tests__/implement-edges.test.ts`
  - Test cross-file, intra-file, missing interface scenarios
  - Test multiple implementations of same interface
  - **Validation**: All scenarios from spec covered

- [ ] **Create integration tests**
  - `__tests__/phase3-integration.test.ts`
  - Test dependency injection pattern (3+ classes implement same interface)
  - Test backward compatibility (default excludes implement edges)
  - **Validation**: Real-world patterns work correctly

- [ ] **Create test fixtures**
  - `__tests__/fixtures/di-pattern/`: Dependency injection example
  - `__tests__/fixtures/plugin-system/`: Multiple plugins implementing IPlugin
  - **Validation**: Fixtures parse successfully

- [ ] **Performance benchmarks**
  - Measure parsing overhead on 1000-file project
  - Measure graph building overhead
  - **Validation**: Overhead <15%, documented in test output

### Phase 5: Mermaid Visualization (Day 5)

- [ ] **Update generateMermaid to handle ImplementEdge**
  - Add case for `edge.type === 'implement'`
  - Render as dashed line: `A -.->|implements| B`
  - **Validation**: Unit test for Mermaid output

- [ ] **Create Mermaid tests for mixed edge types**
  - `__tests__/mermaid-implement.test.ts`
  - Test graph with both import and implement edges
  - Verify solid vs dashed line rendering
  - **Validation**: Output matches expected Mermaid syntax

- [ ] **Test visual distinction in generated diagrams**
  - Generate real diagram from test fixture
  - Manually verify rendering in Mermaid viewer
  - **Validation**: Visual inspection confirms clarity

### Phase 6: MCP Interface (Day 6)

- [ ] **Update MCP server tool schema**
  - Add `edgeTypes` to inputSchema
  - Type: array of enum ['import', 'implement']
  - Default: ['import']
  - **Validation**: Schema validates correctly

- [ ] **Implement edgeTypes parameter handling**
  - Parse `edgeTypes` from request arguments
  - Pass to buildGraph function
  - Default to ['import'] if not provided
  - **Validation**: Test MCP call with/without parameter

- [ ] **Update response summary**
  - Add `totalImplementEdges` count when implement edges present
  - Conditionally include based on edgeTypes parameter
  - **Validation**: Response format correct for both cases

- [ ] **Test MCP integration**
  - Manual test with `test-mcp-call.mjs`
  - Test default behavior (import-only)
  - Test with `edgeTypes: ['import', 'implement']`
  - **Validation**: Both scenarios return correct data

### Phase 7: Documentation and Validation (Day 7)

- [ ] **Update README.md**
  - Add Phase 3 to features list
  - Document `edgeTypes` parameter
  - Add example with implement edges
  - Update "How It Works" section
  - **Validation**: README accurately reflects new features

- [ ] **Update project.md**
  - Change current implementation from Phase 2 to Phase 3
  - **Validation**: Matches actual implementation status

- [ ] **Update package.json**
  - Add "interface-tracking" to keywords
  - Increment version to 0.2.0 (minor version bump)
  - **Validation**: package.json valid

- [ ] **Validate OpenSpec proposal**
  - Run `openspec validate add-implement-edge-tracking --strict`
  - Fix any validation errors
  - **Validation**: All checks pass

- [ ] **Run full test suite**
  - `npm test` - all tests pass (including Phase 1-2)
  - **Validation**: 100% backward compatibility, no regressions

- [ ] **Update CHANGELOG** (if exists)
  - Document Phase 3 changes
  - List breaking changes (none expected)
  - **Validation**: Changelog follows Keep a Changelog format

## Task Dependencies

```
Phase 1 (Types) → Phase 2 (Parsing) → Phase 3 (Graph) → Phase 4 (Tests)
                                                        ↓
                        Phase 5 (Mermaid) ← Phase 6 (MCP) ← Phase 7 (Docs)
```

**Parallelizable work**:
- Phase 5 (Mermaid) and Phase 6 (MCP) can be done in parallel after Phase 3
- Test fixtures (Phase 4) can be created during Phase 2

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 1. Types | 3 | 0.5 day |
| 2. Parsing | 4 | 1.5 days |
| 3. Graph Building | 4 | 1 day |
| 4. Testing | 5 | 1 day |
| 5. Mermaid | 3 | 0.5 day |
| 6. MCP Interface | 4 | 0.5 day |
| 7. Documentation | 6 | 1 day |
| **Total** | **29 tasks** | **6 days** |

## Success Criteria

- ✅ All 29 tasks completed
- ✅ OpenSpec validation passes with --strict
- ✅ All tests pass (83 existing + new Phase 3 tests)
- ✅ Performance overhead <15%
- ✅ Zero breaking changes (backward compatible)
- ✅ Documentation updated and accurate
