# Proposal: Add Render Edge Tracking (Phase 4)

## Why

Frontend projects have **two distinct types of dependencies** that current tooling conflates:

1. **Code dependencies (imports)**: `import { Header } from './Header'` — which files reference which
2. **Layout dependencies (renders)**: `<Dashboard><Header /></Dashboard>` — which components contain which

**The problem:** Analyzing only import edges gives an incomplete view of component relationships. A component may be imported but never rendered (dead code), or the same component may be rendered in multiple locations (composition patterns). Without render edge tracking, AI agents cannot:

- Answer "What does the Settings page layout look like?"
- Detect "Did UserCard move from Sidebar to MainPanel?"
- Find "Which components are imported but unused?"

**Why now:** Phase 3 completed interface tracking for backend dependency injection patterns. Phase 4 extends this capability to frontend composition patterns, enabling comprehensive architecture analysis for full-stack projects.

**User impact:** Users working on React projects can now ask AI to visualize component hierarchies, detect layout changes, and identify dead UI code — capabilities unavailable in any existing static analysis tool.

## Summary

Add support for tracking React/Vue component rendering relationships (render edges) to enable AI agents to understand UI component hierarchies and layout dependencies.

## Motivation

### Problem Statement

Current dependency analysis only tracks code-level imports, which misses a critical relationship in frontend projects: **component rendering dependencies**. When a component renders another component in its JSX/template, this creates a layout/composition dependency that is distinct from the import relationship.

**Example:**
```tsx
// File: Dashboard.tsx
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Dashboard() {
  return (
    <div>
      <Header />           // Render dependency: Dashboard → Header
      <Sidebar />          // Render dependency: Dashboard → Sidebar
    </div>
  )
}
```

While the parser detects `import` edges (code dependency), it doesn't capture the `render` edges (layout dependency). This limits AI's ability to:

1. **Understand component hierarchy** - Which components are children of which parents?
2. **Detect layout changes** - Did a component move from Header to Sidebar?
3. **Find orphaned components** - Components that are imported but never rendered
4. **Analyze composition patterns** - How are components composed into pages?

### Use Cases

**Use Case 1: Component Hierarchy Visualization**
```
User: "Show me the component tree for the Dashboard page"
AI: Uses render edges to generate:
  Dashboard
  ├── Header
  ├── Sidebar
  │   └── UserCard
  └── Footer
```

**Use Case 2: Layout Change Detection**
```
User: "Did the layout of the Settings page change?"
AI: Compares render edges before/after:
  - UserCard moved from Sidebar to MainPanel
  - ProfileMenu was removed from Header
```

**Use Case 3: Dead Code Detection**
```
User: "Are there any components we're not using?"
AI: Finds components with import edges but no render edges:
  - OldHeader.tsx is imported but never rendered
```

## Goals

### Functional Goals

1. **Parse JSX/TSX component usage** - Extract `<ComponentName />` from JSX return statements
2. **Create RenderEdge objects** - Generate edges with `type: 'render'` between parent and child components
3. **Support edge type filtering** - Allow `edgeTypes: ['render']` or `['import', 'render']`
4. **Visualize distinctly in Mermaid** - Use thick lines `==>` for render edges vs solid `-->` for imports
5. **Maintain backward compatibility** - Default behavior unchanged, render edges opt-in

### Non-Goals (Out of Scope for Phase 4)

- ❌ Vue/Angular template parsing (Phase 4 focuses on React JSX/TSX only)
- ❌ Conditional rendering analysis (`{condition && <Component />}`)
- ❌ Dynamic component rendering (`<components[type] />`)
- ❌ Render props pattern detection
- ❌ Slot/children analysis beyond basic position tracking

## Design Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Render Edge Tracking                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Parser (typescript-parser.ts)                          │
│     └─ extractRenders(rootNode)                            │
│        ├─ Find JSX return statements                       │
│        ├─ Parse JSX elements: <Foo />, <Bar></Bar>         │
│        └─ Output: RenderInfo[]                             │
│                                                             │
│  2. Data Structure (types.ts)                              │
│     └─ RenderInfo { componentName, position }              │
│     └─ RenderEdge { type: 'render', slotName?, position? } │
│                                                             │
│  3. Graph Builder (builder.ts)                             │
│     └─ createRenderEdges(files, filePathMap, fileIdMap)    │
│        ├─ Match component names to files                   │
│        ├─ Create edges: parent file → child file           │
│        └─ Filter by edgeTypes option                       │
│                                                             │
│  4. Mermaid Visualization (mermaid.ts)                     │
│     └─ Render edges as thick lines: A ==> B                │
│                                                             │
│  5. MCP Server (server.ts)                                 │
│     └─ Accept edgeTypes: ['render'] parameter              │
│     └─ Return totalRenderEdges in summary                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**Decision 1: Component Name Resolution Strategy**

**Problem:** How to match JSX element `<Header />` to file `Header.tsx`?

**Solution:** Use import analysis
```typescript
// In Dashboard.tsx:
import { Header } from './components/Header'  // Create import mapping
<Header />  // Match "Header" to import path './components/Header'
```

**Rationale:**
- ✅ Leverages existing import parsing infrastructure
- ✅ Handles aliased imports: `import { Header as H } from './Header'` → `<H />`
- ✅ No need for filesystem guessing
- ❌ Limitation: Won't detect global components (acceptable for Phase 4 MVP)

**Decision 2: JSX Parsing Approach**

**Options Considered:**
1. **Full JSX AST traversal** - Parse entire JSX tree structure
2. **Shallow JSX element extraction** - Only extract direct children in return statement
3. **Regex-based extraction** - Pattern match `<ComponentName`

**Chosen:** Option 2 - Shallow extraction

**Rationale:**
- ✅ Simple implementation using tree-sitter JSX nodes
- ✅ Sufficient for component hierarchy visualization
- ✅ Avoids deep nesting complexity
- ⚠️ Limitation: Misses conditional renders (deferred to later phase)

**Decision 3: Position Tracking**

Track rendering position for meaningful edge metadata:
```typescript
<Dashboard>
  <Header />    // position: 0
  <Sidebar />   // position: 1
  <Footer />    // position: 2
</Dashboard>
```

**Rationale:**
- ✅ Helps detect layout reordering
- ✅ Minimal implementation cost
- ✅ Useful for future diff analysis

## Success Criteria

### Acceptance Criteria

#### AC1: JSX Component Extraction
- ✅ Parser extracts component names from JSX self-closing tags: `<Foo />`
- ✅ Parser extracts component names from JSX paired tags: `<Foo></Foo>`
- ✅ Parser handles namespaced components: `<UI.Button />`
- ✅ Parser ignores HTML elements: `<div>`, `<span>` (lowercase)
- ✅ Parser records rendering position

#### AC2: Render Edge Creation
- ✅ Graph builder creates RenderEdge for cross-file component usage
- ✅ Edge.from references parent component file
- ✅ Edge.to references child component file
- ✅ Intra-file component usage is skipped
- ✅ Component name resolution uses import mapping

#### AC3: Edge Type Filtering
- ✅ `edgeTypes: ['render']` returns only render edges
- ✅ `edgeTypes: ['import', 'render']` returns both types
- ✅ Default behavior (no edgeTypes) excludes render edges (backward compatible)

#### AC4: Mermaid Visualization
- ✅ Render edges use thick line syntax: `A ==> B`
- ✅ Import edges remain solid lines: `A --> B`
- ✅ Implement edges remain dashed lines: `A -.->|implements| B`

#### AC5: MCP Interface
- ✅ MCP accepts `edgeTypes: ['render']` parameter
- ✅ Response includes `totalRenderEdges` count
- ✅ All Phase 1-3 tests pass unchanged

### Performance Targets

- Small project (<100 files): <1.2s (20% overhead over Phase 3)
- Medium project (100-1000 files): <6s (20% overhead over Phase 3)
- Large project (>1000 files): <35s (17% overhead over Phase 3)

### Testing Requirements

- ✅ Unit tests for `extractRenders()` function
- ✅ Unit tests for `createRenderEdges()` function
- ✅ Integration tests with React fixture project
- ✅ Mermaid visualization tests for render edges
- ✅ MCP interface tests with render edge filtering
- ✅ Backward compatibility tests (all 98 existing tests pass)

## Implementation Strategy

### Phase 4 Scope

**MVP Features:**
1. React JSX/TSX component parsing
2. RenderEdge creation with position tracking
3. Edge type filtering: `edgeTypes: ['render']`
4. Mermaid visualization with thick lines
5. MCP parameter extension

**Future Enhancements (Not in Phase 4):**
- Vue/Svelte/Angular template parsing
- Conditional rendering analysis
- Dynamic component detection
- Render props pattern support

### Incremental Delivery

**Step 1: Type Definitions** (30 min)
- Add `RenderInfo` interface to types.ts
- Add position tracking to `ParsedFile.renders?: RenderInfo[]`
- Verify `RenderEdge` already exists

**Step 2: Parser Extension** (2-3 hours)
- Implement `extractRenders(rootNode, imports)` function
- Test with React fixture files
- Handle edge cases: fragments, namespaced components

**Step 3: Graph Builder** (2 hours)
- Implement `createRenderEdges(files, filePathMap, fileIdMap)`
- Add edge type filtering logic
- Test component name resolution

**Step 4: Visualization** (30 min)
- Update Mermaid generator for render edges
- Test visual distinction

**Step 5: MCP Integration** (1 hour)
- Update schema and request handler
- Add `totalRenderEdges` to summary
- Test backward compatibility

**Step 6: Testing & Documentation** (2-3 hours)
- Write comprehensive test suite
- Update README with Phase 4 examples
- Verify all 98 existing tests pass

## Open Questions

### Q1: How to handle component aliases?

**Question:** If a component is imported with an alias, how do we match it?
```tsx
import { Header as MyHeader } from './Header'
<MyHeader />  // Should resolve to Header.tsx
```

**Proposed Answer:** Track import aliases in `ImportInfo`:
```typescript
interface ImportInfo {
  importPath: string
  symbolName?: string  // NEW: Original name
  localName?: string   // NEW: Aliased name
}
```

This requires minor changes to Phase 1 parser.

### Q2: Should we track slots/children explicitly?

**Question:** Should we distinguish between different composition patterns?
```tsx
<Modal>
  <Modal.Header />  // Slot: header
  <Modal.Body />    // Slot: body
</Modal>

<Container>
  {children}        // Implicit slot: children
</Container>
```

**Proposed Answer:** For Phase 4 MVP, treat all as simple parent-child relationships. Add `slotName` field to RenderEdge (already in type definition) but leave it undefined. Future phases can populate it.

### Q3: What about fragments?

**Question:** How to handle React fragments?
```tsx
return (
  <>
    <Header />
    <Content />
  </>
)
```

**Proposed Answer:** Treat fragments as transparent - extract components within fragments as direct children of the parent component.

## Dependencies

### Prerequisites
- ✅ Phase 1 (Import parsing) - Complete
- ✅ Phase 2 (Hierarchy support) - Complete
- ✅ Phase 3 (Implement edges) - Complete

### Required Tools
- ✅ tree-sitter-typescript - Already in use
- ✅ JSX node support in tree-sitter - Built-in

### Breaking Changes
- ❌ None - fully backward compatible

## Risks & Mitigations

### Risk 1: Complex JSX Patterns

**Risk:** Advanced JSX patterns (render props, HOCs) may be difficult to parse

**Likelihood:** Medium

**Impact:** Medium - May miss some component relationships

**Mitigation:**
1. Start with simple component usage (MVP)
2. Document unsupported patterns
3. Add support incrementally in future phases

### Risk 2: Performance Overhead

**Risk:** Parsing JSX trees may slow down large projects

**Likelihood:** Low

**Impact:** Medium

**Mitigation:**
1. Only parse JSX when `edgeTypes` includes 'render'
2. Use shallow traversal (not deep JSX analysis)
3. Set performance budget: <20% overhead

### Risk 3: Component Name Ambiguity

**Risk:** Multiple components with same name in different directories

**Likelihood:** High

**Impact:** Low - Already handled by import path resolution

**Mitigation:**
1. Use full import path resolution (already implemented in Phase 1)
2. Component name → file path mapping uses import analysis
3. No ambiguity if import statement exists

## Alternatives Considered

### Alternative 1: Static Analysis Only (No JSX Parsing)

**Approach:** Infer component usage from import patterns only

**Pros:**
- Simpler implementation
- No JSX parsing needed

**Cons:**
- ❌ Cannot distinguish imported-but-not-rendered components
- ❌ Misses the actual rendering relationship
- ❌ No position information

**Decision:** Rejected - doesn't solve the core problem

### Alternative 2: Runtime Analysis

**Approach:** Instrument React runtime to track component rendering

**Pros:**
- Captures dynamic rendering
- 100% accurate for runtime behavior

**Cons:**
- ❌ Requires code execution
- ❌ Out of scope for static analysis tool
- ❌ Performance impact on user's project

**Decision:** Rejected - conflicts with static analysis design

### Alternative 3: Full AST-based JSX Analysis

**Approach:** Build complete JSX tree structure with all metadata

**Pros:**
- Comprehensive data
- Supports advanced analysis

**Cons:**
- ❌ Over-engineering for Phase 4 needs
- ❌ Increased complexity
- ❌ Performance overhead

**Decision:** Rejected - violates "favor straightforward implementations" principle

## Timeline Estimate

**Total Effort:** 1.5 - 2 days (12-16 hours)

- Proposal & Design: 2 hours ✅ (this document)
- Implementation: 8-10 hours
  - Parser: 3-4 hours
  - Graph builder: 2-3 hours
  - Visualization & MCP: 1-2 hours
  - Testing: 2-3 hours
- Documentation: 1-2 hours
- Buffer: 1-2 hours

**Target Completion:** Within 2 working days

## Backward Compatibility Statement

**Phase 4 maintains 100% backward compatibility:**

1. **Default behavior unchanged**
   - `buildGraph(files)` → Only import edges (Phase 1-2 behavior)
   - No render edges unless explicitly requested

2. **Opt-in activation**
   - Render edges only included when `edgeTypes: ['render']` or `['import', 'render']`

3. **All existing tests pass**
   - 98 existing tests require zero modifications
   - New tests added separately

4. **API signature extension only**
   - `edgeTypes` is optional parameter
   - Default value preserves old behavior

5. **Data structure additions only**
   - `ParsedFile.renders` is optional field
   - `RenderEdge` type already existed (no breaking change)

## References

- Phase 1 Implementation: `openspec/archive/2024-XX-XX-initial-dependency-graph/`
- Phase 2 Implementation: `openspec/archive/2024-XX-XX-hierarchy-inference/`
- Phase 3 Implementation: `openspec/archive/2025-11-20-add-implement-edge-tracking/`
- PRD Section: `prd.md` lines 202-258 (Phase 4 requirements)
- tree-sitter-typescript JSX nodes: https://github.com/tree-sitter/tree-sitter-typescript
