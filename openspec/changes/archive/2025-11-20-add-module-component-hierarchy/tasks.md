# Tasks

## Phase 1: Hierarchy Inference (3-4 tasks, ~4 hours)

- [x] **Implement directory pattern matching**
  - Create `src/parser/hierarchy-detector.ts`
  - Define patterns for modules (`src/modules/*`, `src/features/*`)
  - Define patterns for components (`src/components/*`, `src/ui/*`)
  - Export `detectHierarchy(filePath: string): { level: 'module' | 'component' | 'file', parent?: string }` function
  - **Validation**: Unit tests with sample paths

- [x] **Add hierarchy metadata to ParsedFile**
  - Extend `ParsedFile` interface in `types.ts` with optional `hierarchy?: { level, parent }` field
  - Update `typescript-parser.ts` to call `detectHierarchy()` during parsing
  - Store detected hierarchy in each ParsedFile
  - **Validation**: Parser tests show hierarchy metadata

- [x] **Create hierarchy inference tests**
  - Test module detection: `src/modules/auth/login.ts` → module='modules/auth'
  - Test component detection: `src/components/Button/index.tsx` → component='components/Button'
  - Test fallback: `src/utils/helper.ts` → file-level only
  - Test edge cases: nested structures, index files
  - **Validation**: ≥90% accuracy on test cases (achieved 100%)

## Phase 2: Graph Aggregation (4-5 tasks, ~5 hours)

- [x] **Implement module node creation**
  - Extend `buildGraph()` in `builder.ts` to accept `level` parameter
  - When `level='module'`, create HierarchyNode with `level='module'` for each detected module
  - Set `parent` references from file nodes to module nodes
  - Generate unique IDs for module nodes (e.g., `module:src/modules/auth`)
  - **Validation**: Graph contains module nodes with correct parent references

- [x] **Implement edge aggregation logic**
  - When `level='module'`, aggregate file-level import edges
  - If file A (in module M1) imports file B (in module M2), create M1 → M2 edge
  - Deduplicate: multiple files importing between same modules = 1 edge
  - Handle intra-module imports: skip edges within same module
  - **Validation**: 1000-file project produces 10-20 module nodes with correct edges

- [x] **Add component-level aggregation**
  - Similar to module aggregation but for `level='component'`
  - Create component nodes for detected components
  - Aggregate file edges to component edges
  - **Validation**: Graph with component nodes and aggregated edges

- [x] **Implement hybrid graph structure**
  - Return both parent nodes (modules/components) AND child nodes (files) in the graph
  - Files have `parent` field referencing their module/component
  - Enables future "expand node" functionality
  - **Validation**: Graph.nodes includes both hierarchy levels with parent links

- [x] **Add aggregation tests**
  - Test module aggregation: 5 files in 2 modules → 2 module nodes, 1 edge
  - Test component aggregation: 10 files in 3 components → 3 component nodes
  - Test deduplication: 10 imports between same modules → 1 edge
  - Test intra-module filtering: files in same module → no edge
  - **Validation**: All test cases pass

## Phase 3: MCP Interface Extension (2-3 tasks, ~3 hours)

- [x] **Extend getDependencyGraph tool schema**
  - Add `level` parameter to MCP tool definition: `level?: 'module' | 'component' | 'file'`
  - Default to `'file'` for backward compatibility
  - Update tool description to document new parameter
  - **Validation**: MCP tool schema includes level parameter

- [x] **Update MCP server handler**
  - Parse `level` parameter from request arguments
  - Pass `level` to `buildGraph(files, { level })`
  - Return aggregated graph based on level
  - Maintain backward compatibility: no `level` param → file-level graph
  - **Validation**: Manual test with MCP client calling with different levels

- [x] **Add format options for different levels**
  - Update summary to report: `"totalModules": 12` or `"totalComponents": 35` based on level
  - Ensure Mermaid output works for all levels
  - **Validation**: Response format matches expectations for each level

## Phase 4: Mermaid Visualization (2 tasks, ~2 hours)

- [x] **Update Mermaid generator for hierarchy nodes**
  - Modify `generateMermaid()` to handle `level='module'` and `level='component'` nodes
  - Format module labels: `[modules/auth]` instead of file paths
  - Format component labels: `[components/Button]`
  - **Validation**: Mermaid output readable for module/component graphs

- [x] **Add Mermaid tests for hierarchy**
  - Test module-level diagram generation
  - Test component-level diagram generation
  - Verify node labels are readable
  - Verify edge count is reduced (aggregated)
  - **Validation**: Mermaid tests pass

## Phase 5: Integration & Validation (3-4 tasks, ~4 hours)

- [x] **Create realistic test fixtures**
  - Create `__tests__/fixtures/large-project/` with realistic structure:
    - `src/modules/auth/` (5 files)
    - `src/modules/users/` (5 files)
    - `src/components/Button/` (2 files)
    - `src/components/Input/` (2 files)
  - Add cross-module imports
  - **Validation**: Fixtures represent real project structure

- [x] **Add end-to-end integration tests**
  - Test: Parse large-project → buildGraph with `level='module'` → verify 2 module nodes
  - Test: Parse large-project → buildGraph with `level='component'` → verify 2 component nodes
  - Test: Parse large-project → buildGraph (default) → verify all file nodes (backward compat)
  - Test: Verify edge aggregation works correctly
  - **Validation**: All integration tests pass (12/12 tests passing)

- [x] **Performance validation**
  - Benchmark: 1000-file project with `level='file'` (baseline)
  - Benchmark: 1000-file project with `level='module'` (overhead <10%)
  - Verify no memory leaks
  - **Validation**: Performance targets met (no significant overhead)

- [x] **Backward compatibility verification**
  - Run all Phase 1 tests → verify 100% pass
  - Test existing MCP calls without `level` param → verify identical behavior
  - **Validation**: No regressions (83/83 tests passing)

## Phase 6: Documentation (2 tasks, ~2 hours)

- [ ] **Update README**
  - Add examples of using `level` parameter
  - Show before/after node counts (1000 files → 15 modules)
  - Add Mermaid diagram examples for module-level view
  - **Validation**: README clear and accurate

- [ ] **Update MCP tool documentation**
  - Document `level` parameter in tool description
  - Add usage examples for AI agents
  - **Validation**: Tool description updated

## Total Estimate: 16-20 tasks, ~20 hours (2-3 days)
