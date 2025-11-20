# Tasks: Add Render Edge Tracking

## Overview

Implement Phase 4: React component rendering relationship tracking through render edges.

**Estimated Total Effort:** 12-16 hours (1.5-2 days)

## Task Breakdown

### Task 1: Update Type Definitions ✅ (Already Complete)

**Status:** ✅ Complete (RenderEdge already exists in types.ts)

**Description:** Verify and extend type definitions for render edge support

**Work Items:**
- [x] Verify `RenderEdge` interface exists with required fields (type, from, to, status, slotName?, position?, conditional?)
- [ ] Add `RenderInfo` interface to types.ts
  ```typescript
  export interface RenderInfo {
    componentName: string    // Name used in JSX: "Header" or "UI.Button"
    position: number          // Rendering position: 0, 1, 2...
    isNamespaced: boolean     // true for "UI.Button"
  }
  ```
- [ ] Extend `ParsedFile` interface:
  ```typescript
  export interface ParsedFile {
    path: string
    imports: ImportInfo[]
    implements?: ImplementInfo[]
    renders?: RenderInfo[]     // NEW: Phase 4
    hierarchy?: HierarchyInfo
  }
  ```
- [ ] Verify `EdgeType` includes 'render': `type EdgeType = 'import' | 'implement' | 'render'`

**Validation:**
- `npm run build` succeeds
- No TypeScript errors
- All existing tests pass (98 tests)

**Dependencies:** None

**Estimated Time:** 30 minutes

---

### Task 2: Implement JSX Component Extraction in Parser

**Status:** ⏳ Pending

**Description:** Add `extractRenders()` function to typescript-parser.ts to parse JSX elements

**Work Items:**

#### 2.1: Implement `extractRenders()` function

Add new function after `extractImplements()`:

```typescript
/**
 * Extract component rendering relationships from JSX
 *
 * @param rootNode - Root AST node
 * @param imports - Import information for component resolution
 * @returns Array of rendered components with positions
 */
function extractRenders(
  rootNode: Parser.SyntaxNode,
  imports: ImportInfo[]
): RenderInfo[] {
  const renders: RenderInfo[] = []
  let position = 0

  // Build component import map: componentName → importPath
  const componentImportMap = buildComponentImportMap(rootNode)

  function traverse(node: Parser.SyntaxNode | null) {
    if (!node) return

    // Find JSX elements: jsx_element, jsx_self_closing_element
    if (node.type === 'jsx_self_closing_element' || node.type === 'jsx_element') {
      const componentName = extractJSXComponentName(node)

      if (componentName && isComponentName(componentName)) {
        // Check if component is imported (not intra-file)
        const importPath = componentImportMap.get(componentName)

        if (importPath) {
          renders.push({
            componentName,
            position: position++,
            isNamespaced: componentName.includes('.')
          })
        }
      }
    }

    // Recursively traverse children
    for (const child of node.children) {
      traverse(child)
    }
  }

  traverse(rootNode)
  return renders
}

/**
 * Check if name follows component naming convention
 * Components start with uppercase letter, HTML elements lowercase
 */
function isComponentName(name: string): boolean {
  // Extract first part for namespaced components: "UI.Button" → "UI"
  const firstPart = name.split('.')[0]
  return firstPart.length > 0 && firstPart[0] === firstPart[0].toUpperCase()
}

/**
 * Extract component name from JSX element
 */
function extractJSXComponentName(node: Parser.SyntaxNode): string | null {
  // For jsx_self_closing_element: <Foo />
  // For jsx_element: <Foo></Foo>

  let nameNode: Parser.SyntaxNode | null = null

  if (node.type === 'jsx_self_closing_element') {
    nameNode = node.childForFieldName('name')
  } else if (node.type === 'jsx_element') {
    const openingElement = node.childForFieldName('open_tag')
    if (openingElement) {
      nameNode = openingElement.childForFieldName('name')
    }
  }

  if (!nameNode) return null

  // Handle different name types:
  // - identifier: "Header"
  // - member_expression: "UI.Button"
  // - namespace_name: "Dialog.Header"

  if (nameNode.type === 'identifier') {
    return nameNode.text
  } else if (nameNode.type === 'member_expression') {
    return nameNode.text  // Returns full "UI.Button"
  } else if (nameNode.type === 'nested_identifier') {
    return nameNode.text
  }

  return null
}

/**
 * Build map of component names to their import paths
 * Similar to buildInterfaceImportMap() from Phase 3
 */
function buildComponentImportMap(rootNode: Parser.SyntaxNode): Map<string, string> {
  const map = new Map<string, string>()

  function traverse(node: Parser.SyntaxNode | null) {
    if (!node) return

    if (node.type === 'import_statement') {
      const importPath = extractImportPath(node)
      if (!importPath) return

      const importClause = node.children.find(c => c.type === 'import_clause')
      if (!importClause) return

      // Handle named imports: import { Header, Footer } from './components'
      const namedImports = importClause.children.find(c => c.type === 'named_imports')
      if (namedImports) {
        for (const child of namedImports.namedChildren) {
          if (child.type === 'import_specifier') {
            const nameNode = child.childForFieldName('name')
            const aliasNode = child.childForFieldName('alias')

            if (nameNode) {
              const localName = aliasNode ? aliasNode.text : nameNode.text
              map.set(localName, importPath)
            }
          }
        }
      }

      // Handle default imports: import Header from './Header'
      const identifier = importClause.children.find(c => c.type === 'identifier')
      if (identifier) {
        map.set(identifier.text, importPath)
      }

      // Handle namespace imports: import * as UI from './components'
      const namespaceImport = importClause.children.find(c => c.type === 'namespace_import')
      if (namespaceImport) {
        const aliasNode = namespaceImport.childForFieldName('alias') ||
                          namespaceImport.children.find(c => c.type === 'identifier')
        if (aliasNode) {
          map.set(aliasNode.text, importPath)
        }
      }
    }

    for (const child of node.children) {
      traverse(child)
    }
  }

  traverse(rootNode)
  return map
}
```

#### 2.2: Integrate into `parseFile()`

Update `parseFile()` to call `extractRenders()`:

```typescript
export async function parseFile(
  filePath: string,
  parser: Parser
): Promise<ParsedFile | null> {
  try {
    // ... existing code ...

    const imports = extractImports(tree.rootNode)
    const implementations = extractImplements(tree.rootNode)
    const renders = extractRenders(tree.rootNode, imports)  // NEW
    const hierarchy = detectHierarchy(filePath)

    return {
      path: filePath,
      imports,
      implements: implementations.length > 0 ? implementations : undefined,
      renders: renders.length > 0 ? renders : undefined,  // NEW
      hierarchy,
    }
  } catch (error) {
    // ... error handling ...
  }
}
```

**Validation:**
- Create test fixture: `__tests__/fixtures/render-test/`
  - `Dashboard.tsx` - Parent component
  - `Header.tsx` - Child component
  - `Sidebar.tsx` - Child component
- Unit test: `__tests__/render-detection.test.ts`
- Verify component extraction works
- `npm test` passes

**Dependencies:** Task 1

**Estimated Time:** 3-4 hours

---

### Task 3: Implement Render Edge Creation in Graph Builder

**Status:** ⏳ Pending

**Description:** Add `createRenderEdges()` function to builder.ts

**Work Items:**

#### 3.1: Implement `createRenderEdges()` function

Add new function in `builder.ts` after `createImplementEdges()`:

```typescript
/**
 * Create render edges from component rendering relationships
 *
 * @param files - Parsed files
 * @param filePathMap - Import path → absolute path mapping
 * @param fileIdMap - Absolute path → node ID mapping
 * @returns Array of render edges
 */
function createRenderEdges(
  files: ParsedFile[],
  filePathMap: Map<string, string>,
  fileIdMap: Map<string, string>
): RenderEdge[] {
  const edges: RenderEdge[] = []

  for (const file of files) {
    const fromId = fileIdMap.get(file.path)
    if (!fromId) continue

    if (!file.renders || file.renders.length === 0) continue

    for (const render of file.renders) {
      // Resolve component name to file path via imports
      const importInfo = file.imports.find(imp => {
        // Match component name to import
        // For "Header": look for import { Header } or import Header
        // For "UI.Button": look for import * as UI

        if (render.isNamespaced) {
          const namespace = render.componentName.split('.')[0]
          // Match namespace import
          return imp.importPath && isNamespaceMatch(namespace, imp)
        } else {
          return imp.importPath && isComponentMatch(render.componentName, imp)
        }
      })

      if (!importInfo) {
        console.warn(
          `[GraphBuilder] Cannot resolve component '${render.componentName}' in ${file.path}`
        )
        continue
      }

      // Resolve import path to absolute file path
      const resolvedPath = resolveImportPath(file.path, importInfo.importPath, filePathMap)
      if (!resolvedPath) {
        console.warn(
          `[GraphBuilder] Cannot resolve import '${importInfo.importPath}' from ${file.path}`
        )
        continue
      }

      const toId = fileIdMap.get(resolvedPath)
      if (!toId) {
        console.warn(
          `[GraphBuilder] Component file not found: ${resolvedPath} (component ${render.componentName})`
        )
        continue
      }

      // Skip intra-file renders (from === to)
      if (fromId === toId) {
        console.log(
          `[GraphBuilder] Skipping intra-file render: ${render.componentName} in ${file.path}`
        )
        continue
      }

      edges.push({
        type: 'render',
        from: fromId,
        to: toId,
        status: 'normal',
        position: render.position,
      })
    }
  }

  console.log(`[GraphBuilder] Created ${edges.length} render edges`)
  return edges
}

// Helper functions for component name matching
function isComponentMatch(componentName: string, imp: ImportInfo): boolean {
  // TODO: Implement proper import specifier matching
  // For MVP: Check if import path contains component name
  return imp.importPath.toLowerCase().includes(componentName.toLowerCase())
}

function isNamespaceMatch(namespace: string, imp: ImportInfo): boolean {
  // TODO: Implement namespace import matching
  return false // Placeholder for MVP
}
```

#### 3.2: Integrate into `buildFileGraph()`

Update `buildFileGraph()` to create render edges:

```typescript
function buildFileGraph(
  files: ParsedFile[],
  filePathMap: Map<string, string>,
  edgeTypes: EdgeType[] = ['import']
): Graph {
  // ... existing node creation code ...

  // Create edges based on requested types
  if (edgeTypes.includes('import')) {
    const importEdges = createImportEdges(files, filePathMap, fileIdMap)
    for (const edge of importEdges) {
      const edgeKey = `import:${edge.from}->${edge.to}`
      edges.set(edgeKey, edge)
    }
  }

  if (edgeTypes.includes('implement')) {
    const implementEdges = createImplementEdges(files, filePathMap, fileIdMap)
    for (const edge of implementEdges) {
      const edgeKey = `implement:${edge.from}->${edge.to}`
      edges.set(edgeKey, edge)
    }
  }

  // NEW: Render edges
  if (edgeTypes.includes('render')) {
    const renderEdges = createRenderEdges(files, filePathMap, fileIdMap)
    for (const edge of renderEdges) {
      const edgeKey = `render:${edge.from}->${edge.to}:${edge.position}`
      edges.set(edgeKey, edge)
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  }
}
```

**Validation:**
- Unit test: Test `createRenderEdges()` function
- Integration test: End-to-end render edge creation
- Verify edge type filtering works
- `npm test` passes

**Dependencies:** Task 2

**Estimated Time:** 2-3 hours

---

### Task 4: Update Mermaid Visualization

**Status:** ⏳ Pending

**Description:** Add render edge rendering to Mermaid generator

**Work Items:**

Update `generateMermaid()` in `src/visualization/mermaid.ts`:

```typescript
// Generate edge definitions
for (const edge of graph.edges) {
  const fromId = sanitizeNodeId(edge.from)
  const toId = sanitizeNodeId(edge.to)

  if (edge.type === 'import') {
    // Import edge: solid line
    lines.push(`  ${fromId} --> ${toId}`)
  } else if (edge.type === 'implement') {
    // Implement edge: dashed line with label (Phase 3)
    lines.push(`  ${fromId} -.->|implements| ${toId}`)
  } else if (edge.type === 'render') {
    // Render edge: thick line (Phase 4)  ← ALREADY EXISTS!
    lines.push(`  ${fromId} ==> ${toId}`)
  }
}
```

**Validation:**
- Unit test: `__tests__/mermaid-render.test.ts`
- Verify thick lines render correctly
- Test mixed edge types visualization
- Visual inspection of Mermaid output

**Dependencies:** Task 3

**Estimated Time:** 30 minutes

---

### Task 5: Update MCP Server Interface

**Status:** ⏳ Pending

**Description:** Update MCP server to accept and process render edges

**Work Items:**

#### 5.1: Update tool schema

Update `src/mcp/server.ts`:

```typescript
{
  name: 'getDependencyGraph',
  description: 'Analyze code dependencies in a TypeScript/JavaScript project and return a dependency graph with Mermaid visualization. Supports file, component, and module-level views. Phase 4: Supports React component rendering tracking.',
  inputSchema: {
    type: 'object',
    properties: {
      // ... existing properties ...
      edgeTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['import', 'implement', 'render'],  // Added 'render'
        },
        description:
          'Edge types to include: import (code imports), implement (interface implementations), render (component rendering). Default: [\'import\']',
        default: ['import'],
      },
    },
    required: ['projectPath'],
  },
}
```

#### 5.2: Update request handler

```typescript
const edgeTypes = (args.edgeTypes as ('import' | 'implement' | 'render')[]) || ['import']

const graph = buildGraph(files, { level, edgeTypes })

// Add edge type counts (Phase 3 + Phase 4)
if (edgeTypes.includes('import')) {
  result.summary.totalImportEdges = graph.edges.filter((e) => e.type === 'import').length
}
if (edgeTypes.includes('implement')) {
  result.summary.totalImplementEdges = graph.edges.filter((e) => e.type === 'implement').length
}
if (edgeTypes.includes('render')) {
  result.summary.totalRenderEdges = graph.edges.filter((e) => e.type === 'render').length
}
```

#### 5.3: Update summary type definition

```typescript
interface DependencyGraphResult {
  graph?: Graph
  mermaid?: string
  summary?: {
    totalFiles: number
    totalNodes: number
    totalEdges: number
    totalModules?: number
    totalComponents?: number
    totalImportEdges?: number
    totalImplementEdges?: number
    totalRenderEdges?: number  // NEW
  }
}
```

**Validation:**
- Test MCP call with `edgeTypes: ['render']`
- Verify summary includes `totalRenderEdges`
- Test backward compatibility (default behavior unchanged)

**Dependencies:** Task 4

**Estimated Time:** 1 hour

---

### Task 6: Create Comprehensive Test Suite

**Status:** ⏳ Pending

**Description:** Write tests for all Phase 4 functionality

**Work Items:**

#### 6.1: Parser tests - `__tests__/render-detection.test.ts`

```typescript
describe('Phase 4: Render Edge Detection', () => {
  describe('Parser: extractRenders', () => {
    test('should detect JSX self-closing tags')
    test('should detect JSX paired tags')
    test('should detect multiple components')
    test('should ignore HTML elements (lowercase)')
    test('should handle namespaced components')
    test('should handle React fragments')
    test('should skip components without imports')
  })

  describe('Graph Builder: createRenderEdges', () => {
    test('should create render edge for cross-file rendering')
    test('should track rendering position')
    test('should skip intra-file renders')
    test('should handle multiple rendered components')
    test('should support render-only filtering')
    test('should support mixed edge types')
  })
})
```

#### 6.2: Mermaid visualization tests - `__tests__/mermaid-render.test.ts`

```typescript
describe('Phase 4: Mermaid Visualization with Render Edges', () => {
  test('should render edges as thick lines')
  test('should render import edges as solid lines')
  test('should render mixed edge types with visual distinction')
  test('should generate valid Mermaid syntax')
})
```

#### 6.3: Integration tests

```typescript
describe('Phase 4: Integration Tests', () => {
  test('should parse React project and create render graph')
  test('should handle complex component hierarchy')
  test('should maintain backward compatibility')
})
```

#### 6.4: Test fixtures

Create realistic React fixtures:
- `__tests__/fixtures/render-test/Dashboard.tsx`
- `__tests__/fixtures/render-test/Header.tsx`
- `__tests__/fixtures/render-test/Sidebar.tsx`
- `__tests__/fixtures/render-test/Footer.tsx`
- `__tests__/fixtures/render-test/UserCard.tsx`

**Validation:**
- All new tests pass
- All 98 existing tests still pass
- Test coverage >80% for new code

**Dependencies:** Tasks 2, 3, 4, 5

**Estimated Time:** 3-4 hours

---

### Task 7: Update Documentation

**Status:** ⏳ Pending

**Description:** Update README and examples for Phase 4

**Work Items:**

#### 7.1: Update README.md

Add Phase 4 documentation:

```markdown
### Phase 4: Component Rendering Tracking

Track React component rendering relationships:

\`\`\`
Can you show me which components render which other components in /path/to/my-react-app?
Use edgeTypes: ['render'] to show only rendering relationships.
\`\`\`

**Edge Types:**

- **\`import\`** (default): Code import dependencies
  - \`import { foo } from './bar'\`
  - Rendered as solid lines (\`-->\`) in Mermaid diagrams

- **\`implement\`**: Interface implementation relationships
  - \`class Service implements IAuth\`
  - Rendered as dashed lines (\`-.->|implements|\`) in Mermaid diagrams

- **\`render\`**: Component rendering dependencies  ← NEW
  - \`<Dashboard><Header /></Dashboard>\`
  - Rendered as thick lines (\`==>\`) in Mermaid diagrams
  - React/JSX only in Phase 4

**Example: Component Hierarchy**

\`\`\`tsx
// Dashboard.tsx
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Dashboard() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  )
}
\`\`\`

**Output:**
\`\`\`mermaid
graph LR
  Dashboard.tsx ==> Header.tsx
  Dashboard.tsx ==> Sidebar.tsx
\`\`\`
```

#### 7.2: Update test-mcp-call.mjs

Add Phase 4 demo:

```javascript
console.log('\n========== 4. 组件渲染依赖图 (Phase 4) ==========\n')
await callGetDependencyGraph(projectPath, 'mermaid', 'file', ['render'])

console.log('\n========== 5. 完整依赖图 (Import + Implement + Render) ==========\n')
await callGetDependencyGraph(projectPath, 'mermaid', 'file', ['import', 'implement', 'render'])
```

#### 7.3: Update project.md

Update Phase tracker:

```markdown
当前实现: **Phase 4** ← Update from Phase 1

### 增量迭代策略 (7 Phases)
- ✅ **Phase 1 (MVP):** 文件级import依赖图
- ✅ **Phase 2:** 层级支持(Module/Component)
- ✅ **Phase 3:** 抽象层支持(Interface/DataModel)
- ✅ **Phase 4:** UI布局支持(render边) ← NEW
- ⏳ **Phase 5:** 变更对比(Diff)
- ⏳ **Phase 6:** 视图过滤(focused/neighbors模式)
- ⏳ **Phase 7:** Architecture层(可选)
```

**Validation:**
- Documentation is clear and accurate
- Examples work correctly
- Test script demonstrates Phase 4 features

**Dependencies:** Task 6

**Estimated Time:** 1-2 hours

---

### Task 8: Validation & Performance Testing

**Status:** ⏳ Pending

**Description:** Final validation and performance benchmarking

**Work Items:**

#### 8.1: Run full test suite

```bash
npm test
```

Expected: All 98 existing + ~15 new tests pass (113 total)

#### 8.2: Build and run demo

```bash
npm run build
node test-mcp-call.mjs
```

Expected: All demos work, render edges visualized correctly

#### 8.3: Performance benchmarking

Test on real React project (e.g., create-react-app):

```bash
time node test-mcp-call.mjs
```

Expected: <20% overhead vs Phase 3

#### 8.4: Backward compatibility check

Test that default behavior unchanged:

```bash
# Should produce same output as Phase 3
await getDependencyGraph('/path/to/project')  # No edgeTypes
```

#### 8.5: OpenSpec validation

```bash
openspec validate add-render-edge-tracking --strict
```

Expected: All validations pass

**Validation:**
- All tests pass
- Performance targets met
- Backward compatibility confirmed
- OpenSpec validation clean

**Dependencies:** Task 7

**Estimated Time:** 1-2 hours

---

## Summary

**Total Tasks:** 8

**Estimated Total Time:** 12-16 hours

**Critical Path:**
1. Type Definitions (Task 1)
2. Parser Implementation (Task 2)
3. Graph Builder (Task 3)
4. Visualization (Task 4)
5. MCP Integration (Task 5)
6. Testing (Task 6)
7. Documentation (Task 7)
8. Validation (Task 8)

**Parallelizable Work:**
- Tasks 4 & 5 can be done in parallel after Task 3
- Task 7 can overlap with Task 6

**High-Risk Tasks:**
- Task 2 (Parser) - Complex JSX AST traversal
- Task 6 (Testing) - Ensuring comprehensive coverage

**Quick Wins:**
- Task 1 (Types) - Mostly complete
- Task 4 (Mermaid) - One line change

**User-Visible Milestones:**
- After Task 3: Basic render edge creation works
- After Task 5: MCP interface accepts render edges
- After Task 7: Full Phase 4 functionality documented
