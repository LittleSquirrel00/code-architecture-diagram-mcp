# Add Module and Component Hierarchy Support

## Overview

Extend the dependency graph system to support module and component-level analysis, addressing the "too many nodes" problem for large projects. When analyzing 1000+ file projects, users need a higher-level view that aggregates file-level dependencies into module or component boundaries.

## Why

**User Pain Point**: Large projects generate unusable dependency graphs. A 1000-file codebase produces 1000 nodes and 2000+ edges in the current system, making Mermaid diagrams unreadable and analysis impossible.

**Business Impact**: Without hierarchy support, the tool is only useful for small projects (<100 files). This severely limits adoption and value for AI-assisted coding in real-world enterprise codebases.

**Technical Need**: The architecture already supports hierarchy levels in the type system (`level: 'architecture' | 'module' | 'component' | 'file'`), but only file-level is implemented. This change unlocks the designed but unused capability.

**Measured Outcome**: Enable module-level view that reduces 1000 file nodes to 10-20 module nodes (50x reduction), making architectural understanding practical for large codebases.

## Problem Statement

### Current State (Phase 1)
- Only file-level dependency analysis
- Large projects (1000+ files) generate graphs with 1000+ nodes
- Mermaid diagrams become unreadable with too many nodes
- No way to view architectural overview

### Example Pain Point
A 1000-file React project currently generates:
- 1000 file nodes
- 2000+ import edges
- Unusable Mermaid diagram (too complex to render)

### Desired State (Phase 2)
- Module-level view: 10-20 nodes for the same 1000-file project
- Component-level view: 50-100 nodes
- Backward compatible: file-level view still available
- Automatic hierarchy inference from directory structure

## Goals

1. **Solve readability**: Reduce node count by 50x-100x for large projects
2. **Maintain backward compatibility**: All Phase 1 functionality continues to work
3. **Zero configuration**: Infer hierarchy from standard project structures
4. **Performance**: No performance regression (<5 seconds for 1000 files)

## Non-Goals

- Custom hierarchy configuration (future: Phase 7)
- Manual module definition files (future: Phase 7)
- Architecture-level abstraction (future: Phase 7)
- Cross-language support (future: later phases)

## Scope

### In Scope
1. **Hierarchy Inference**: Detect modules and components from directory patterns
2. **Graph Aggregation**: Aggregate file-level edges into module/component edges
3. **MCP Interface Extension**: Add `level` parameter to `getDependencyGraph`
4. **Mermaid Support**: Render module/component nodes

### Out of Scope
- Configuration files for custom hierarchies
- User-defined module boundaries
- React-specific component detection (uses generic directory patterns)
- Filtering by edge type (Phase 3+)

## What Changes

### New Capabilities
- **hierarchy-inference**: Detect module/component boundaries from directory structure (new spec)
- **graph-aggregation**: Aggregate file-level dependencies to module/component level (extends dependency-graph spec)

### Modified Components
- `src/parser/typescript-parser.ts`: Add hierarchy detection during parsing
- `src/graph/builder.ts`: Add `level` parameter and aggregation logic
- `src/mcp/server.ts`: Add `level` parameter to getDependencyGraph tool
- `src/visualization/mermaid.ts`: Support module/component node rendering
- `src/core/types.ts`: Extend ParsedFile with hierarchy metadata

### New Files
- `src/parser/hierarchy-detector.ts`: Pattern matching for module/component detection
- `__tests__/hierarchy-detector.test.ts`: Unit tests for hierarchy detection
- `__tests__/fixtures/large-project/`: Integration test fixtures with realistic structure

## Success Criteria

### Functional
- [ ] `getDependencyGraph(..., { level: 'module' })` returns 10-20 nodes for a 1000-file project
- [ ] Phase 1 calls (no options) continue to work identically
- [ ] Hierarchy inference accuracy ≥90% on standard project structures
- [ ] Module/component nodes have parent references

### Performance
- [ ] No performance regression: 1000 files still <5 seconds
- [ ] Module/component graph generation overhead <10%

### Quality
- [ ] All Phase 1 tests continue passing
- [ ] New tests for hierarchy inference
- [ ] New tests for graph aggregation
- [ ] Integration tests with sample projects

## Implementation Strategy

### 1. Hierarchy Inference (Parser Enhancement)
Detect module/component boundaries using directory patterns:
- `src/modules/*/` → Module
- `src/features/*/` → Module
- `src/components/*/` → Component
- `src/ui/*/` → Component

### 2. Graph Aggregation (Builder Enhancement)
Aggregate file nodes into parent nodes:
- Group files by detected module/component
- Create parent hierarchy nodes
- Deduplicate edges between groups

### 3. MCP Interface Extension
Add optional `level` parameter:
```typescript
getDependencyGraph(projectPath: string, options?: { level?: 'module' | 'component' | 'file' })
```

### 4. Backward Compatibility
- Default `level: 'file'` maintains Phase 1 behavior
- No breaking changes to existing types
- All Phase 1 tests pass unchanged

## Risks and Mitigations

### Risk: Incorrect hierarchy inference
**Mitigation**: Use conservative patterns, log warnings for ambiguous cases

### Risk: Performance degradation
**Mitigation**: Profile during development, maintain <5s target

### Risk: Breaking changes
**Mitigation**: Extensive testing of Phase 1 compatibility

## Related Changes

- Depends on: `dependency-graph` spec (Phase 1)
- Enables: Phase 3 (abstract nodes), Phase 6 (focused views)

## Rollout Plan

1. Implement hierarchy inference with tests
2. Implement graph aggregation with tests
3. Extend MCP interface (backward compatible)
4. Update Mermaid generator
5. Integration tests with real projects
6. Update documentation and examples
