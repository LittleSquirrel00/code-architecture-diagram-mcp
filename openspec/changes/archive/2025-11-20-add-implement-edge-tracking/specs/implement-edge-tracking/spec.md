# implement-edge-tracking Specification

## ADDED Requirements

### Requirement: The system SHALL detect interface implementation relationships in TypeScript/JavaScript code
The system SHALL parse `implements` clauses in class declarations and extract interface names being implemented.

#### Scenario: Detect single interface implementation
- **GIVEN** a class declaration `class Service implements IAuth`
- **WHEN** parsing the file
- **THEN** the system MUST extract interface name "IAuth"
- **AND** associate it with class "Service"

#### Scenario: Detect multiple interface implementations
- **GIVEN** a class declaration `class Service implements IAuth, ILogger, ICache`
- **WHEN** parsing the file
- **THEN** the system MUST extract all interface names: ["IAuth", "ILogger", "ICache"]

#### Scenario: Extract interface import paths
- **GIVEN** a file with:
  ```typescript
  import { IAuth } from './auth/IAuth'
  class Service implements IAuth { }
  ```
- **WHEN** parsing the file
- **THEN** the system MUST map interface "IAuth" to import path "./auth/IAuth"

#### Scenario: Handle generic interfaces
- **GIVEN** `class Repository implements IStore<User>`
- **WHEN** parsing the file
- **THEN** the system MUST extract interface name "IStore"
- **AND** ignore generic type parameters

#### Scenario: Skip non-implement syntax
- **GIVEN** a class with only `extends` clause: `class Child extends Parent`
- **WHEN** parsing the file
- **THEN** the system MUST NOT extract "Parent" as an interface
- **AND** implements array MUST be empty

### Requirement: The system SHALL create implement edges in the dependency graph
The system SHALL generate ImplementEdge objects for cross-file interface implementations.

#### Scenario: Create implement edge for cross-file implementation
- **GIVEN** File A defines `interface IService`
- **AND** File B contains `class Service implements IService`
- **AND** File B imports IService from File A
- **WHEN** building graph with `edgeTypes: ['implement']`
- **THEN** the system MUST create an ImplementEdge
- **AND** edge.from MUST reference File B's node ID
- **AND** edge.to MUST reference File A's node ID
- **AND** edge.symbolName MUST be "IService"

#### Scenario: Skip intra-file implementations
- **GIVEN** a file containing both:
  ```typescript
  interface IService { }
  class Service implements IService { }
  ```
- **WHEN** building graph with `edgeTypes: ['implement']`
- **THEN** the system MUST NOT create any implement edge
- **AND** the system SHOULD log a debug message "Skipping intra-file implementation"

#### Scenario: Create multiple edges for multiple interfaces
- **GIVEN** `class Service implements IAuth, ILogger`
- **AND** IAuth is imported from File A
- **AND** ILogger is imported from File B
- **WHEN** building graph with `edgeTypes: ['implement']`
- **THEN** the system MUST create 2 ImplementEdge objects
- **AND** one edge MUST point to File A (IAuth)
- **AND** one edge MUST point to File B (ILogger)

#### Scenario: Handle missing interface files
- **GIVEN** `class Service implements IExternal`
- **AND** IExternal is imported from 'node_modules' (external dependency)
- **WHEN** building graph
- **THEN** the system MUST NOT create an implement edge
- **AND** the system SHOULD log a warning "Cannot resolve interface IExternal"

#### Scenario: Preserve backward compatibility with default options
- **WHEN** `buildGraph(files)` is called without edgeTypes option
- **THEN** the system MUST NOT create any implement edges
- **AND** the graph MUST only contain import edges (Phase 1-2 behavior)

### Requirement: The system SHALL support filtering edges by type
The system SHALL accept an `edgeTypes` parameter to control which edge types are included in the graph.

#### Scenario: Accept edgeTypes parameter
- **WHEN** `buildGraph(files, { edgeTypes: ['import', 'implement'] })` is called
- **THEN** the system MUST include both import and implement edges
- **AND** the system MUST NOT include other edge types

#### Scenario: Default to import-only edges
- **WHEN** `buildGraph(files)` is called without edgeTypes
- **THEN** the system MUST default edgeTypes to ['import']
- **AND** the graph MUST NOT contain implement edges

#### Scenario: Support implement-only filtering
- **WHEN** `buildGraph(files, { edgeTypes: ['implement'] })` is called
- **THEN** the graph MUST contain only implement edges
- **AND** the graph MUST NOT contain import edges

#### Scenario: MCP interface accepts edgeTypes parameter
- **WHEN** MCP client calls `getDependencyGraph(projectPath, { edgeTypes: ['import', 'implement'] })`
- **THEN** the system MUST return graph with both edge types
- **AND** response summary MUST include `totalImplementEdges` count

### Requirement: The system SHALL visualize implement edges distinctly in Mermaid diagrams
Mermaid output SHALL use visual distinction to differentiate implement edges from import edges.

#### Scenario: Render implement edges as dashed lines
- **GIVEN** a graph with an ImplementEdge from Node A to Node B
- **WHEN** generating Mermaid diagram
- **THEN** the edge MUST be rendered as `A -.->|implements| B`
- **AND** import edges MUST be rendered as `A --> B` (solid lines)

#### Scenario: Include edge label for clarity
- **GIVEN** an ImplementEdge with symbolName "IAuthService"
- **WHEN** generating Mermaid diagram
- **THEN** the edge MUST include the label "|implements|"
- **AND** the label MUST be positioned on the edge

#### Scenario: Handle mixed edge types
- **GIVEN** a graph with both import and implement edges
- **WHEN** generating Mermaid diagram
- **THEN** all import edges MUST use solid lines `-->`
- **AND** all implement edges MUST use dashed lines `-.->|implements|`

### Requirement: The system SHALL maintain performance targets with implement edge detection
Implement edge detection SHALL add minimal overhead to parsing and graph building.

#### Scenario: Parsing overhead <10%
- **GIVEN** a project with 1000 files
- **WHEN** parsing with implements detection enabled
- **THEN** parsing time MUST be <10% slower than Phase 2
- **AND** total parsing time MUST be <5.5 seconds (Phase 2: <5s)

#### Scenario: Graph building overhead <15%
- **GIVEN** 1000 files with 500 interfaces and 2000 implementations
- **WHEN** building graph with `edgeTypes: ['import', 'implement']`
- **THEN** build time MUST be <15% slower than import-only build
- **AND** total time MUST be <6 seconds (Phase 2: <5s)

#### Scenario: Memory efficiency
- **GIVEN** parsing a large project
- **WHEN** storing implements information
- **THEN** memory overhead per file MUST be <500 bytes
- **AND** total memory increase MUST be <50 MB for 1000-file project
