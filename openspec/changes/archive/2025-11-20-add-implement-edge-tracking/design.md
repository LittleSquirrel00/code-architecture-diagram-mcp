# Design Document: Implement Edge Tracking

## Architecture Overview

### Data Flow

```
TypeScript Source → tree-sitter AST → Extract implements → Create ImplementEdge → Build Graph
```

**Phase 3 adds to existing pipeline**:
```
Phase 1-2: Source → AST → Extract imports → ImportEdge → Graph
Phase 3:   Source → AST → Extract implements → ImplementEdge → Graph  (parallel)
```

### Component Changes

| Component | Modification | Lines of Code |
|-----------|--------------|---------------|
| `types.ts` | Add `ImplementInfo` interface | +15 |
| `typescript-parser.ts` | AST query for `implements_clause` | +60 |
| `builder.ts` | Create implement edges | +40 |
| `mermaid.ts` | Render dashed lines | +15 |
| `server.ts` | Add `edgeTypes` parameter | +10 |
| **Total** | | **~140 lines** |

## AST Structure Analysis

### TypeScript `implements` Syntax

```typescript
class Service implements IAuth, ILogger {
  // ^class_declaration
  //        ^identifier (class name)
  //                ^implements_clause
  //                           ^type_identifier (IAuth)
  //                                  ^type_identifier (ILogger)
}
```

### tree-sitter Query

```javascript
// Query for implements clause
const implementsClause = classNode.childForFieldName('implements_clause')
if (implementsClause) {
  for (const typeNode of implementsClause.namedChildren) {
    if (typeNode.type === 'type_identifier') {
      interfaceNames.push(typeNode.text)
    }
  }
}
```

**Edge cases handled**:
1. Multiple interfaces: `class Foo implements A, B, C`
2. Generic interfaces: `class Foo implements Bar<T>` (extract "Bar")
3. Qualified names: `class Foo implements ns.IBar` (extract "IBar")
4. Same-file implementations: Skip (no edge created)

## Implementation Strategy

### Phase 3.0: Minimal Viable Implementation

**What we DO implement**:
```typescript
// ✅ Basic implements
class Service implements IService { }

// ✅ Multiple interfaces
class Service implements IAuth, ILogger { }

// ✅ Imported interfaces
import { IService } from './IService'
class Service implements IService { }

// ✅ Cross-file detection
// File A: interface IFoo
// File B: class Bar implements IFoo  → create implement edge
```

**What we DON'T implement** (defer to Phase 3.1+):
```typescript
// ❌ Abstract class extends (Phase 3.1)
abstract class Base { }
class Derived extends Base { }

// ❌ Concrete class extends (Phase 3.1)
class Parent { }
class Child extends Parent { }

// ❌ Type usage (Phase 3.2)
function foo(user: User) { }

// ❌ Interface extends interface (Phase 3.3)
interface IExtended extends IBase { }
```

### Data Model Extension

```typescript
// types.ts - New interface for ParsedFile
interface ImplementInfo {
  className: string              // Name of the implementing class
  interfaces: string[]           // Interface names being implemented
  interfacePaths: Map<string, string>  // interface name → import path
}

// Extend ParsedFile
interface ParsedFile {
  path: string
  imports: ImportInfo[]
  implements?: ImplementInfo[]   // Phase 3: NEW
  hierarchy?: HierarchyInfo      // Phase 2
}
```

**Rationale**:
- `className`: Useful for debugging and error messages
- `interfaces`: Array supports `class Foo implements A, B`
- `interfacePaths`: Maps interface name to its import source
  - Example: `IService → '../IService'`
  - Needed to create edges to the correct file

### Edge Creation Logic

```typescript
function createImplementEdges(
  file: ParsedFile,
  fileIdMap: Map<string, string>
): ImplementEdge[] {
  if (!file.implements) return []

  const edges: ImplementEdge[] = []
  const fromId = fileIdMap.get(file.path)!

  for (const impl of file.implements) {
    for (const interfaceName of impl.interfaces) {
      // Resolve interface import path
      const importPath = impl.interfacePaths.get(interfaceName)

      // Skip if interface is in same file (intra-file)
      if (!importPath) continue

      // Resolve absolute path
      const interfacePath = resolveImport(file.path, importPath)
      const toId = fileIdMap.get(interfacePath)

      // Skip if interface file doesn't exist (external dependency)
      if (!toId) continue

      edges.push({
        type: 'implement',
        from: fromId,
        to: toId,
        symbolName: interfaceName,
        importPath: importPath,
        status: 'normal'
      })
    }
  }

  return edges
}
```

**Key decisions**:
1. **Intra-file implementations**: Skip (consistent with Phase 2 intra-module rule)
2. **Missing interface files**: Skip gracefully (external dependencies like `node_modules`)
3. **Deduplication**: Not needed at edge creation (Set used later if needed)

### Filtering Architecture

```typescript
// builder.ts
interface BuildOptions {
  level?: 'file' | 'module' | 'component'  // Phase 2
  edgeTypes?: EdgeType[]                    // Phase 3: NEW
}

type EdgeType = 'import' | 'implement'  // Phase 4 adds 'render'

const DEFAULT_OPTIONS: BuildOptions = {
  level: 'file',
  edgeTypes: ['import']  // Backward compatible default
}

function buildGraph(files: ParsedFile[], options: BuildOptions = {}): Graph {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const edges: Edge[] = []

  // Create requested edge types
  if (opts.edgeTypes.includes('import')) {
    edges.push(...createImportEdges(files))
  }

  if (opts.edgeTypes.includes('implement')) {
    edges.push(...createImplementEdges(files))
  }

  // ... rest of graph building
}
```

**Benefits**:
- Clear separation: import vs implement edge creation
- Opt-in: Users must explicitly request implement edges
- Extensible: Easy to add `'render'` in Phase 4

## Testing Strategy

### Unit Tests

```typescript
// __tests__/implement-detection.test.ts
describe('Implement Edge Detection', () => {
  test('single interface implementation', () => {
    const file = parseFile('class Foo implements IBar')
    expect(file.implements).toEqual([{
      className: 'Foo',
      interfaces: ['IBar'],
      interfacePaths: new Map([['IBar', './IBar']])
    }])
  })

  test('multiple interfaces', () => {
    const file = parseFile('class Foo implements A, B, C')
    expect(file.implements[0].interfaces).toEqual(['A', 'B', 'C'])
  })

  test('generic interface', () => {
    const file = parseFile('class Foo implements Bar<T>')
    expect(file.implements[0].interfaces).toEqual(['Bar'])
  })
})

// __tests__/implement-edges.test.ts
describe('Implement Edge Creation', () => {
  test('cross-file implementation creates edge', () => {
    const files = [
      { path: '/IService.ts', imports: [] },
      { path: '/Service.ts', implements: [{
        className: 'Service',
        interfaces: ['IService'],
        interfacePaths: new Map([['IService', './IService']])
      }]}
    ]

    const graph = buildGraph(files, { edgeTypes: ['implement'] })

    expect(graph.edges).toContainEqual({
      type: 'implement',
      from: 'file:Service',
      to: 'file:IService',
      symbolName: 'IService'
    })
  })

  test('intra-file implementation creates no edge', () => {
    const file = {
      path: '/Service.ts',
      implements: [{
        className: 'Service',
        interfaces: ['IService'],
        interfacePaths: new Map()  // Empty = same file
      }]
    }

    const graph = buildGraph([file], { edgeTypes: ['implement'] })
    expect(graph.edges.length).toBe(0)
  })
})
```

### Integration Tests

```typescript
// __tests__/phase3-integration.test.ts
describe('Phase 3 Integration', () => {
  test('dependency injection pattern', async () => {
    const fixtures = '__tests__/fixtures/di-pattern'
    /*
      di-pattern/
        IAuthService.ts
        implementations/
          JWTAuthService.ts implements IAuthService
          OAuth2Service.ts implements IAuthService
          MockAuthService.ts implements IAuthService
    */

    const files = await parseProject(fixtures)
    const graph = buildGraph(files, {
      edgeTypes: ['import', 'implement']
    })

    // Should have 3 implement edges to IAuthService
    const implementEdges = graph.edges.filter(
      e => e.type === 'implement' &&
           e.symbolName === 'IAuthService'
    )

    expect(implementEdges.length).toBe(3)
  })

  test('backward compatibility: default excludes implement edges', async () => {
    const files = await parseProject(fixtures)
    const graph = buildGraph(files)  // No options

    const implementEdges = graph.edges.filter(e => e.type === 'implement')
    expect(implementEdges.length).toBe(0)  // Should be 0 (backward compatible)
  })
})
```

### Performance Benchmarks

```typescript
test('Phase 3 overhead <15%', async () => {
  const files = await parseProject('fixtures/large-project')  // 1000 files

  // Baseline: Phase 2 (import-only)
  const t1 = Date.now()
  buildGraph(files, { edgeTypes: ['import'] })
  const phase2Time = Date.now() - t1

  // Phase 3: import + implement
  const t2 = Date.now()
  buildGraph(files, { edgeTypes: ['import', 'implement'] })
  const phase3Time = Date.now() - t2

  const overhead = (phase3Time - phase2Time) / phase2Time
  expect(overhead).toBeLessThan(0.15)  // <15%

  console.log(`Phase 2: ${phase2Time}ms, Phase 3: ${phase3Time}ms`)
  console.log(`Overhead: ${(overhead * 100).toFixed(1)}%`)
})
```

## Mermaid Visualization

### Rendering Strategy

**Distinguish edge types visually**:
- Import edges: Solid lines `-->`
- Implement edges: Dashed lines `-.->` with label

```typescript
// mermaid.ts
function renderEdge(edge: Edge): string {
  switch (edge.type) {
    case 'import':
      return `${edge.from} --> ${edge.to}`

    case 'implement':
      return `${edge.from} -.->|implements| ${edge.to}`

    default:
      return `${edge.from} --- ${edge.to}`  // Fallback
  }
}
```

**Example output**:
```mermaid
graph LR
  file:Service[Service.ts]
  file:IService[IService.ts]

  file:Service --> file:IService  %% import edge (solid)
  file:Service -.->|implements| file:IService  %% implement edge (dashed)
```

### User Experience

**Scenario 1: Default behavior (backward compatible)**
```bash
getDependencyGraph("/project")
# Only shows import edges (solid lines)
```

**Scenario 2: Request implement edges**
```bash
getDependencyGraph("/project", { edgeTypes: ["import", "implement"] })
# Shows both: import (solid) + implement (dashed)
```

**Scenario 3: Only implement edges**
```bash
getDependencyGraph("/project", { edgeTypes: ["implement"] })
# Shows only implement relationships (architecture view)
```

## Migration Path

### Phase 3.0 → Phase 3.1 (Future)

Add support for `extends`:
```typescript
// Phase 3.1: Add ExtendEdge
type Edge = ImportEdge | ImplementEdge | ExtendEdge | ...

interface ExtendEdge {
  type: 'extend'
  from: string
  to: string
  symbolName: string
  isAbstract: boolean  // true if extending abstract class
  status: Status
}
```

### Phase 3.1 → Phase 3.2 (Future)

Add support for type usage:
```typescript
// Phase 3.2: Add UseEdge (already defined in types.ts)
// Detect: function foo(user: User)
//         const x: MyType
//         as MyType
```

## Open Questions

1. **Should we track interface declarations as AbstractNodes?**
   - Current answer: NO (deferred)
   - Rationale: Adds complexity, unclear value yet
   - Revisit in Phase 3.3 if users request it

2. **How to handle generic constraints?**
   ```typescript
   class Foo<T extends IBase> implements IBar<T>
   ```
   - Current answer: Extract "IBar", ignore generics
   - Revisit if users need generic tracking

3. **Should we deduplicate multiple implements of same interface?**
   ```typescript
   // File A: class A1 implements IFoo
   // File A: class A2 implements IFoo
   // Should we create 1 or 2 edges from File A to IFoo?
   ```
   - Current answer: Create 2 edges (one per class)
   - Rationale: Accurate representation, deduplication can happen at display layer

## References

- [tree-sitter-typescript](https://github.com/tree-sitter/tree-sitter-typescript)
- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- Phase 2 Design: `openspec/changes/2025-11-20-add-module-component-hierarchy/`
