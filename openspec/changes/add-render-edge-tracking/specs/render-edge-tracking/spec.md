# render-edge-tracking Specification

## Purpose

This specification defines render edge tracking capabilities for analyzing React/Vue component rendering relationships in TypeScript/JavaScript projects. The system enables AI agents to understand UI component hierarchies, composition patterns, and layout dependencies beyond code-level imports.

## ADDED Requirements

### Requirement: The system SHALL detect component rendering relationships in JSX/TSX code

The system SHALL parse JSX elements in React components to extract which components are rendered by which parent components.

#### Scenario: Detect JSX self-closing tag

- **GIVEN** a file containing:
  ```tsx
  function Parent() {
    return <Child />
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract component name "Child"
- **AND** associate it with parent component "Parent"

#### Scenario: Detect JSX paired tags

- **GIVEN** a file containing:
  ```tsx
  function Parent() {
    return <Child></Child>
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract component name "Child"
- **AND** treat it identically to self-closing tags

#### Scenario: Detect multiple rendered components

- **GIVEN** a file containing:
  ```tsx
  function Dashboard() {
    return (
      <div>
        <Header />
        <Sidebar />
        <Footer />
      </div>
    )
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract component names: ["Header", "Sidebar", "Footer"]
- **AND** record their rendering positions: [0, 1, 2]

#### Scenario: Ignore HTML elements

- **GIVEN** a file containing:
  ```tsx
  function App() {
    return (
      <div>
        <span>Text</span>
        <Header />
      </div>
    )
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract "Header"
- **AND** the system MUST NOT extract "div" or "span" (lowercase = HTML)

#### Scenario: Handle namespaced components

- **GIVEN** a file containing:
  ```tsx
  function Modal() {
    return (
      <Dialog>
        <Dialog.Header />
        <Dialog.Body />
      </Dialog>
    )
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract "Dialog", "Dialog.Header", "Dialog.Body"
- **AND** treat namespaced components as distinct components

#### Scenario: Handle React fragments

- **GIVEN** a file containing:
  ```tsx
  function Layout() {
    return (
      <>
        <Header />
        <Content />
      </>
    )
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract "Header" and "Content"
- **AND** treat fragments as transparent (no separate node)

#### Scenario: Extract from arrow function components

- **GIVEN** a file containing:
  ```tsx
  const Page = () => (
    <Container>
      <Title />
    </Container>
  )
  ```
- **WHEN** parsing the file
- **THEN** the system MUST extract "Container" and "Title"

#### Scenario: Handle multiple return statements

- **GIVEN** a file with conditional returns:
  ```tsx
  function Component() {
    if (loading) return <Spinner />
    return <Content />
  }
  ```
- **WHEN** parsing the file
- **THEN** the system SHOULD extract both "Spinner" and "Content" (best effort)
- **OR** the system MAY extract only the final return statement (acceptable for MVP)

### Requirement: The system SHALL resolve component names to file paths using import analysis

Component name resolution SHALL leverage existing import parsing to map JSX element names to actual file locations.

#### Scenario: Match component name to import

- **GIVEN** a file containing:
  ```tsx
  import { Header } from './components/Header'

  function App() {
    return <Header />
  }
  ```
- **WHEN** resolving component "Header"
- **THEN** the system MUST match it to import path './components/Header'
- **AND** resolve to file './components/Header.tsx' or './components/Header.ts'

#### Scenario: Handle aliased imports

- **GIVEN** a file containing:
  ```tsx
  import { Header as MyHeader } from './Header'

  function App() {
    return <MyHeader />
  }
  ```
- **WHEN** resolving component "MyHeader"
- **THEN** the system MUST match it to import path './Header'
- **AND** recognize "MyHeader" is an alias for "Header"

#### Scenario: Handle namespace imports

- **GIVEN** a file containing:
  ```tsx
  import * as UI from './components'

  function App() {
    return <UI.Button />
  }
  ```
- **WHEN** resolving component "UI.Button"
- **THEN** the system MUST match namespace "UI" to import path './components'
- **AND** resolve "Button" as a member of that module

#### Scenario: Handle default imports

- **GIVEN** a file containing:
  ```tsx
  import Header from './Header'

  function App() {
    return <Header />
  }
  ```
- **WHEN** resolving component "Header"
- **THEN** the system MUST match it to import path './Header'

#### Scenario: Skip components without imports

- **GIVEN** a file containing:
  ```tsx
  function App() {
    return <UnknownComponent />
  }
  ```
- **AND** no import statement for "UnknownComponent" exists
- **WHEN** resolving component "UnknownComponent"
- **THEN** the system MUST NOT create a render edge
- **AND** the system SHOULD log a warning "Cannot resolve component UnknownComponent"

#### Scenario: Skip intra-file component usage

- **GIVEN** a file containing:
  ```tsx
  function Child() { return <div>Child</div> }

  function Parent() {
    return <Child />
  }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST detect "Child" rendering
- **BUT** the system MUST NOT create a render edge (same file)
- **AND** the system SHOULD log "Skipping intra-file render: Parent → Child"

### Requirement: The system SHALL create render edges in the dependency graph

The system SHALL generate RenderEdge objects for cross-file component rendering relationships.

#### Scenario: Create render edge for cross-file rendering

- **GIVEN** File A defines `export function Parent()`
- **AND** File B defines `export function Child()`
- **AND** File A imports Child from File B: `import { Child } from './B'`
- **AND** File A renders Child: `<Child />`
- **WHEN** building graph with `edgeTypes: ['render']`
- **THEN** the system MUST create a RenderEdge
- **AND** edge.from MUST reference File A's node ID
- **AND** edge.to MUST reference File B's node ID
- **AND** edge.type MUST be 'render'

#### Scenario: Track rendering position

- **GIVEN** a file rendering multiple components:
  ```tsx
  <Container>
    <Header />   // position: 0
    <Content />  // position: 1
    <Footer />   // position: 2
  </Container>
  ```
- **WHEN** creating render edges
- **THEN** Header edge MUST have position: 0
- **AND** Content edge MUST have position: 1
- **AND** Footer edge MUST have position: 2

#### Scenario: Create multiple edges for multiple components

- **GIVEN** a file rendering 5 different components
- **WHEN** building graph with `edgeTypes: ['render']`
- **THEN** the system MUST create 5 RenderEdge objects
- **AND** each edge MUST have unique position values

#### Scenario: Handle component rendering same child multiple times

- **GIVEN** a file containing:
  ```tsx
  function Gallery() {
    return (
      <div>
        <Image />
        <Image />
        <Image />
      </div>
    )
  }
  ```
- **WHEN** creating render edges
- **THEN** the system MUST create 3 RenderEdge objects
- **AND** positions MUST be [0, 1, 2]
- **OR** the system MAY deduplicate to 1 edge with count=3 (future enhancement)

#### Scenario: Skip render edges when not requested

- **WHEN** `buildGraph(files)` is called without edgeTypes
- **THEN** the system MUST NOT create any render edges
- **AND** parsing SHOULD skip JSX extraction (performance optimization)

#### Scenario: Preserve backward compatibility with default options

- **WHEN** `buildGraph(files)` is called without edgeTypes option
- **THEN** the system MUST NOT create any render edges
- **AND** the graph MUST only contain import edges (Phase 1-3 behavior)

### Requirement: The system SHALL support filtering edges by type including render

The system SHALL accept `edgeTypes` parameter to control which edge types are included, with render edges opt-in only.

#### Scenario: Accept edgeTypes with render

- **WHEN** `buildGraph(files, { edgeTypes: ['import', 'render'] })` is called
- **THEN** the system MUST include both import and render edges
- **AND** the system MUST NOT include implement edges

#### Scenario: Support render-only filtering

- **WHEN** `buildGraph(files, { edgeTypes: ['render'] })` is called
- **THEN** the graph MUST contain only render edges
- **AND** the graph MUST NOT contain import or implement edges

#### Scenario: Support all edge types

- **WHEN** `buildGraph(files, { edgeTypes: ['import', 'implement', 'render'] })` is called
- **THEN** the graph MUST contain all three edge types

#### Scenario: MCP interface accepts render in edgeTypes

- **WHEN** MCP client calls `getDependencyGraph(projectPath, { edgeTypes: ['render'] })`
- **THEN** the system MUST return graph with only render edges
- **AND** response summary MUST include `totalRenderEdges` count

#### Scenario: Default excludes render edges

- **WHEN** `buildGraph(files)` or `getDependencyGraph(projectPath)` is called without edgeTypes
- **THEN** the system MUST default edgeTypes to ['import']
- **AND** the graph MUST NOT contain render edges
- **AND** JSX parsing SHOULD be skipped for performance

### Requirement: The system SHALL visualize render edges distinctly in Mermaid diagrams

Mermaid output SHALL use thick lines to visually distinguish render edges from import and implement edges.

#### Scenario: Render edges as thick lines

- **GIVEN** a graph with a RenderEdge from Node A to Node B
- **WHEN** generating Mermaid diagram
- **THEN** the edge MUST be rendered as `A ==> B`
- **AND** import edges MUST remain as `A --> B` (solid lines)
- **AND** implement edges MUST remain as `A -.->|implements| B` (dashed lines)

#### Scenario: Handle mixed edge types in visualization

- **GIVEN** a graph with import, implement, and render edges
- **WHEN** generating Mermaid diagram
- **THEN** all import edges MUST use `-->`
- **AND** all implement edges MUST use `-.->|implements|`
- **AND** all render edges MUST use `==>`

#### Scenario: Preserve node definitions for render-only graphs

- **GIVEN** a graph with only render edges (no imports)
- **WHEN** generating Mermaid diagram
- **THEN** all nodes MUST have definitions `nodeId[label]`
- **AND** all edges MUST use thick lines `==>`

### Requirement: The system SHALL maintain performance targets with render edge detection

Render edge detection SHALL add acceptable overhead to parsing and graph building, not exceeding 20% of Phase 3 performance.

#### Scenario: Parsing overhead <20%

- **GIVEN** a project with 1000 React files
- **WHEN** parsing with render detection enabled (`edgeTypes: ['import', 'render']`)
- **THEN** parsing time MUST be <20% slower than Phase 3
- **AND** total parsing time MUST be <6 seconds (Phase 3: <5s)

#### Scenario: Render-only parsing is faster

- **WHEN** parsing with `edgeTypes: ['render']` only
- **THEN** parsing time SHOULD be faster than `['import', 'render']`
- **AND** total time MUST be <4 seconds for 1000 files

#### Scenario: No overhead when render edges disabled

- **WHEN** `edgeTypes` does not include 'render'
- **THEN** JSX parsing SHOULD be completely skipped
- **AND** performance MUST match Phase 3 exactly

#### Scenario: Graph building overhead <20%

- **GIVEN** 1000 files with 3000 component rendering relationships
- **WHEN** building graph with `edgeTypes: ['import', 'render']`
- **THEN** build time MUST be <20% slower than import-only build
- **AND** total time MUST be <6 seconds

#### Scenario: Memory efficiency

- **GIVEN** parsing a large React project
- **WHEN** storing render information
- **THEN** memory overhead per file MUST be <800 bytes
- **AND** total memory increase MUST be <80 MB for 1000-file project

### Requirement: The system SHALL support only React JSX/TSX files for render edge extraction

The system SHALL limit Phase 4 render edge detection to React JSX/TSX files, explicitly excluding other frontend frameworks for scope management.

#### Scenario: Parse .tsx and .jsx files

- **WHEN** encountering files with .tsx or .jsx extensions
- **THEN** the system MUST parse JSX syntax for render edges

#### Scenario: Skip Vue SFC files

- **WHEN** encountering .vue files
- **THEN** the system MUST NOT attempt render edge extraction
- **AND** the system SHOULD log "Vue template parsing not supported in Phase 4"

#### Scenario: Skip Angular templates

- **WHEN** encountering .html template files with Angular syntax
- **THEN** the system MUST NOT attempt render edge extraction

#### Scenario: Skip Svelte files

- **WHEN** encountering .svelte files
- **THEN** the system MUST NOT attempt render edge extraction

#### Scenario: Document framework limitations

- **WHEN** user requests render edges for non-React projects
- **THEN** README MUST clearly state "Phase 4 supports React only"
- **AND** future roadmap MUST mention Vue/Angular support
