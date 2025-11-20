# Design: Module and Component Hierarchy Support

## Context

Phase 1 provides file-level dependency analysis, which works well for small projects but becomes unreadable for large codebases. A 1000-file project generates 1000 nodes and 2000+ edges, making Mermaid diagrams unusable.

**Design Goal**: Enable higher-level views (module, component) that reduce graph complexity by 50x-100x while maintaining backward compatibility.

## Design Principles (Linus-Style)

### 1. Data Structure First
> "Bad programmers worry about the code. Good programmers worry about data structures."

**Current State**: `Node` already supports `level` field with discriminated union:
```typescript
export interface HierarchyNode {
  type: 'hierarchy'
  level: 'architecture' | 'module' | 'component' | 'file'
  id: string
  path: string
  parent?: string
  status: Status
}
```

**Decision**: ✅ **NO need to change core types** - the design was already future-proof. We only need to:
1. Start creating nodes with `level='module'` or `level='component'`
2. Populate the `parent` field to link files → modules

### 2. Eliminate Special Cases
> "Good code has no special cases."

**Bad Design (Special Cases)**:
```typescript
if (level === 'file') {
  // file logic
} else if (level === 'module') {
  // module logic
} else if (level === 'component') {
  // component logic
}
```

**Good Design (Data-Driven)**:
```typescript
// Single aggregation function that works for any level
function aggregateNodes(nodes: Node[], level: HierarchyLevel): Node[] {
  return groupBy(nodes, (n) => getParentAtLevel(n, level))
}
```

### 3. Backward Compatibility is Sacred
> "We do not break userspace!"

**Constraint**: All Phase 1 functionality MUST work identically.

**Enforcement**:
- Default parameter: `buildGraph(files, { level: 'file' })` - if no level, use 'file'
- Run ALL Phase 1 tests unmodified - 100% must pass
- No changes to existing function signatures

### 4. Solve Real Problems, Not Imaginary Ones
> "This is solving a real problem: 1000-node Mermaid diagrams are unusable."

**Real Pain Point**:
- User selected PRD line: "1000文件项目,`level='module'`时只返回10-20个节点"
- This is a measured, concrete target: 1000 files → 10-20 nodes

**Rejection of Over-Engineering**:
- ❌ NO custom configuration files (future: Phase 7)
- ❌ NO user-defined module boundaries
- ❌ NO machine learning for hierarchy detection
- ✅ YES simple directory pattern matching

## Architecture

### Component Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Server (getDependencyGraph)                             │
│  - Add optional `level` parameter                           │
│  - Pass through to buildGraph()                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Parser (typescript-parser.ts)                               │
│  - Call hierarchy-detector for each file                    │
│  - Attach hierarchy metadata to ParsedFile                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├──▶ NEW: hierarchy-detector.ts
                      │    - Pattern matching on file paths
                      │    - Return { level, parent }
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Graph Builder (builder.ts)                                  │
│  - Accept optional `level` parameter                        │
│  - Create nodes at specified level                          │
│  - Aggregate edges between parent nodes                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Mermaid Generator (mermaid.ts)                              │
│  - Handle module/component nodes                            │
│  - Format labels appropriately                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Phase 1 (Current)**:
```
Files → Parser → ParsedFile[] → Builder → Graph (file nodes) → Mermaid
```

**Phase 2 (New)**:
```
Files → Parser (+hierarchy detection) → ParsedFile[] (with hierarchy metadata)
     → Builder (with level param) → Graph (module/component nodes + file nodes with parent refs)
     → Mermaid (renders module/component labels)
```

### Key Data Structures

**ParsedFile Extension**:
```typescript
export interface ParsedFile {
  path: string
  imports: Import[]
  exports: Export[]
  hierarchy?: {  // NEW in Phase 2
    level: 'module' | 'component' | 'file'
    parent?: string  // Relative path to parent (e.g., 'src/modules/auth')
  }
}
```

**Graph with Hierarchy**:
```typescript
// Example: Module-level graph for a 1000-file project
{
  nodes: [
    // Module nodes
    { type: 'hierarchy', level: 'module', id: 'module:src/modules/auth', path: 'src/modules/auth' },
    { type: 'hierarchy', level: 'module', id: 'module:src/modules/users', path: 'src/modules/users' },
    // File nodes (still included, with parent refs)
    { type: 'hierarchy', level: 'file', id: 'file:abc123', path: 'src/modules/auth/login.ts', parent: 'module:src/modules/auth' },
    // ... 998 more file nodes
  ],
  edges: [
    // Aggregated module-to-module edges
    { type: 'import', from: 'module:src/modules/auth', to: 'module:src/modules/users', status: 'normal' },
    // ... only 10-20 edges
  ]
}
```

## Implementation Details

### 1. Hierarchy Detection Algorithm

**Pattern Matching Rules** (priority order):
```typescript
const PATTERNS = [
  { pattern: /src\/modules\/([^\/]+)/, level: 'module' },
  { pattern: /src\/features\/([^\/]+)/, level: 'module' },
  { pattern: /src\/components\/([^\/]+)/, level: 'component' },
  { pattern: /src\/ui\/([^\/]+)/, level: 'component' },
]

export function detectHierarchy(filePath: string): { level, parent? } {
  for (const { pattern, level } of PATTERNS) {
    const match = filePath.match(pattern)
    if (match) {
      return { level, parent: constructParentPath(filePath, match) }
    }
  }
  return { level: 'file' }  // Fallback
}
```

**Trade-off**: Simple pattern matching vs. complex heuristics
- ✅ **Chosen**: Pattern matching
- **Rationale**: 90% accuracy achievable with 4 patterns, extensible in Phase 7

### 2. Edge Aggregation Algorithm

**Deduplication Logic**:
```typescript
function aggregateEdges(fileEdges: Edge[], fileToParent: Map<string, string>): Edge[] {
  const aggregated = new Map<string, Edge>()

  for (const edge of fileEdges) {
    const fromParent = fileToParent.get(edge.from)
    const toParent = fileToParent.get(edge.to)

    // Skip intra-module edges
    if (fromParent === toParent) continue

    const key = `${fromParent}→${toParent}`
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        type: 'import',
        from: fromParent,
        to: toParent,
        status: 'normal'
      })
    }
  }

  return Array.from(aggregated.values())
}
```

**Complexity Analysis**:
- Time: O(E) where E = number of file-level edges
- Space: O(M²) where M = number of modules (typically M << F files)
- **Expected**: 1000 files, 2000 edges, 10 modules → ~90 module edges

### 3. Backward Compatibility Strategy

**Default Parameter Pattern**:
```typescript
// Phase 1 signature (unchanged)
export function buildGraph(files: ParsedFile[]): Graph

// Phase 2 signature (backward compatible)
export function buildGraph(files: ParsedFile[], options?: { level?: 'file' | 'component' | 'module' }): Graph {
  const level = options?.level ?? 'file'  // Default to Phase 1 behavior
  // ...
}
```

**Test Strategy**:
1. Run all Phase 1 tests → verify 100% pass
2. Add new tests for Phase 2 functionality
3. Integration test: verify Phase 1 API calls work identically

## Trade-offs and Decisions

### Trade-off 1: Include file nodes in module-level graphs?

**Option A**: Only return module nodes
- Pros: Smaller response, simpler
- Cons: Lose file-level detail, can't "expand" modules later

**Option B**: Return both module nodes AND file nodes (with parent refs)
- Pros: Enables future "expand module" feature, preserves detail
- Cons: Larger response

**Decision**: ✅ **Option B**
- Rationale: Data > convenience. Include all information, let consumers filter.
- This aligns with "solve future problems when they arrive" - we're not building "expand" now, but the data structure supports it.

### Trade-off 2: Aggregate edges or keep file-level edges?

**Option A**: Only aggregated module-to-module edges
- Pros: Readable Mermaid diagrams
- Cons: Lose granularity

**Option B**: Keep both aggregated AND file-level edges
- Pros: Preserves all information
- Cons: Confusing, mixed abstraction levels

**Decision**: ✅ **Option A** (aggregated only)
- Rationale: The PURPOSE of module-level view is readability. File edges defeat this.
- If user wants file edges, they request `level='file'`.

### Trade-off 3: Configuration file for custom patterns?

**Option A**: Add config file (`.hierarchy.json`) for custom patterns
- Pros: Flexible, user control
- Cons: Complexity, configuration hell

**Option B**: Hardcode standard patterns, defer customization to Phase 7
- Pros: Zero config, works out of the box
- Cons: Less flexible

**Decision**: ✅ **Option B**
- Rationale: YAGNI. Standard patterns cover 90% of projects. Solve custom patterns when users actually request it.

## Risk Mitigation

### Risk: Performance Regression
**Mitigation**:
- Profile during development
- Benchmark: 1000-file project before/after
- Accept <10% overhead for aggregation

### Risk: Breaking Changes
**Mitigation**:
- Comprehensive backward compat testing
- Default parameters maintain Phase 1 behavior
- No changes to existing type definitions

### Risk: Incorrect Hierarchy Detection
**Mitigation**:
- Conservative patterns (only match well-known structures)
- Fallback to `level='file'` for unknown patterns
- Log warnings for ambiguous cases

## Testing Strategy

### Unit Tests
- `hierarchy-detector.test.ts`: Test all pattern matching scenarios
- `builder.test.ts`: Test aggregation logic, deduplication
- `mermaid.test.ts`: Test module/component label formatting

### Integration Tests
- End-to-end: Parse large-project → buildGraph(level='module') → verify 10-20 nodes
- Backward compat: Run Phase 1 integration tests unmodified

### Performance Tests
- Benchmark 1000-file project at file/component/module levels
- Verify <5 second target maintained

## Open Questions

**Q1**: What if a project has BOTH `modules/` and `features/` directories?
**A**: Priority order: `modules/` wins. Log debug message.

**Q2**: How to handle monorepo with multiple projects?
**A**: Out of scope for Phase 2. Each project analyzed independently.

**Q3**: Should we support nested modules (e.g., `modules/auth/admin/`)?
**A**: No. Phase 2 only supports one level. Nested = flatten to top-level module.

## Success Metrics

- [ ] 1000-file project → 10-20 module nodes (50x reduction)
- [ ] All Phase 1 tests pass unmodified (100%)
- [ ] Hierarchy detection accuracy ≥90% on test projects
- [ ] Performance: 1000 files in <5 seconds (no regression)
- [ ] Mermaid output: <50 lines for module-level view of 1000-file project
