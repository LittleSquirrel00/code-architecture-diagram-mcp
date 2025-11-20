# Proposal: Add Implement Edge Tracking (Phase 3)

## Summary

Enable the system to track interface implementation relationships in TypeScript/JavaScript code by detecting `implements` clauses and creating `implement` edges in the dependency graph.

## Motivation

### Problem Statement

Currently, the dependency graph only tracks `import` edges, showing which files import from others. This is insufficient for understanding architectural patterns in TypeScript projects where:

1. **Dependency Injection**: Multiple classes implement the same interface (`IAuthService` implemented by `JWTAuthService`, `OAuth2Service`, `MockAuthService`)
2. **Plugin Systems**: Dozens of plugins implement a common interface (`IPlugin`)
3. **Interface Refactoring**: When modifying an interface, developers need to know all implementing classes

**Real-world scenario:**
```typescript
// auth/IAuthService.ts
export interface IAuthService {
  login(user: string): Promise<Token>
}

// auth/implementations/JWTAuthService.ts
import { IAuthService } from '../IAuthService'
export class JWTAuthService implements IAuthService {
  login(user: string): Promise<Token> { ... }
}
```

With only `import` edges, we see: `JWTAuthService` → `IAuthService` (import edge)
We cannot distinguish: Is this just importing a type? Or implementing an interface?

With `implement` edges, we see both:
- `JWTAuthService` → `IAuthService` (import edge)
- `JWTAuthService` → `IAuthService` (implement edge)

This allows queries like: "Show me all classes that implement IAuthService"

### Impact

- **Small projects (<100 files)**: Low impact, few interfaces
- **Medium projects (100-1000 files)**: High value, 10-50 interfaces with multiple implementations
- **Large projects (>1000 files)**: Critical, 50+ interfaces, essential for architecture understanding

## Design Decisions

### Data Model: Extend Edges, Not Nodes

**Decision**: Represent implementations as edges, not as special nodes.

**Rationale (Linus principle: "Good programmers worry about data structures")**:
- Interfaces are not structural elements like files/modules/components
- An interface is a symbol within a file, similar to how an import is a relationship
- Using edges eliminates special cases: no need for `if (node.type === 'interface')`
- Consistent with Phase 2 design: file nodes represent files, edges represent relationships

**Alternative considered**: Create `AbstractNode` for interfaces
- ❌ Rejected: Would require two parallel node systems (hierarchy vs abstract)
- ❌ Rejected: Breaks the simplicity of "nodes = code locations, edges = relationships"

### Edge Type Design

```typescript
interface ImplementEdge {
  type: 'implement'      // Discriminator
  from: string           // Implementing class's file node ID
  to: string             // Interface definition's file node ID
  symbolName: string     // Interface name (e.g., "IAuthService")
  importPath?: string    // Original import path (optional)
  status: Status         // For Phase 5 diff support
}
```

**Key decisions**:
1. `from` points to the file containing the implementing class (not the class itself)
2. `to` points to the file defining the interface (not the interface symbol)
3. `symbolName` stores the interface name for display purposes
4. `importPath` is optional (undefined if interface is in the same file)

### Scope Boundaries

**Phase 3.0 (this proposal) - Minimal Implementation:**
- ✅ Detect `class Foo implements Bar` clauses
- ✅ Create `implement` edges for cross-file implementations
- ✅ Skip intra-file implementations (same as Phase 2 intra-module rule)
- ✅ Support multiple interfaces: `class Foo implements A, B, C` → 3 edges
- ❌ NOT implementing: `extends` for abstract classes (defer to Phase 3.1)
- ❌ NOT implementing: `type` usage tracking (defer to Phase 3.2)
- ❌ NOT implementing: Abstract nodes (types.ts has placeholder, but unused)

**Rationale**:
- Start with the most common case (`implements`)
- Validate the design before expanding to `extends` and type usage
- Minimize complexity: ~150 lines of code vs 500+ for full abstract tracking

### Backward Compatibility

**Default behavior**: Unchanged from Phase 2
```typescript
buildGraph(files)  // Only import edges (Phase 1-2 behavior)
buildGraph(files, { level: 'module' })  // Only import edges at module level
```

**Opt-in behavior**: Explicitly request implement edges
```typescript
buildGraph(files, { edgeTypes: ['import', 'implement'] })
```

**New option**:
```typescript
interface GetDependencyGraphOptions {
  level?: 'file' | 'component' | 'module'  // Phase 2
  edgeTypes?: ('import' | 'implement')[]   // Phase 3, default: ['import']
}
```

## Non-Goals

This proposal does NOT include:
- ❌ Abstract nodes (interface/type/enum nodes) - data structure exists but unused
- ❌ `extends` relationships for abstract/concrete classes
- ❌ Type usage tracking (`function foo(user: User)`)
- ❌ Generic constraints tracking
- ❌ Detection of structural typing (duck typing)

These may be addressed in future proposals (Phase 3.1, 3.2, etc.)

## Success Criteria

1. **Correctness**: Detect all `implements` clauses in TypeScript/JavaScript files
2. **Performance**: <15% overhead compared to Phase 2 (import-only parsing)
3. **Backward Compatibility**: Zero breaking changes, default behavior identical to Phase 2
4. **Test Coverage**: ≥95% for new implement edge detection logic
5. **Usability**: Mermaid diagrams clearly distinguish implement edges (e.g., dashed lines)

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Graph becomes too dense (100+ classes implement same interface) | Medium | High | Default to `edgeTypes: ['import']`, users opt-in to implement edges |
| Performance regression >15% | Low | Medium | Reuse existing AST traversal, only add `implements_clause` query |
| Confusion between import and implement edges | Medium | Medium | Use distinct Mermaid styling (solid vs dashed lines) |
| Incomplete detection (missed edge cases) | Low | Low | Comprehensive test suite with real-world patterns |

## Dependencies

- Requires: Phase 2 (Module/Component Hierarchy) - complete ✅
- Blocks: Phase 4 (Render edges) - can proceed independently
- Relates to: Phase 5 (Diff support) - `status` field prepared for future use

## Implementation Plan

See `tasks.md` for detailed breakdown. High-level phases:

1. **Types & AST** (Days 1-2): Extend ParsedFile, add AST queries for `implements_clause`
2. **Graph Builder** (Day 3): Create implement edges, handle edge cases
3. **Testing** (Day 4): Unit tests, integration tests, performance benchmarks
4. **Visualization** (Day 5): Mermaid rendering with dashed lines
5. **MCP Interface** (Day 6): Add `edgeTypes` parameter
6. **Documentation** (Day 7): Update README, validate OpenSpec

Estimated effort: 7 person-days
