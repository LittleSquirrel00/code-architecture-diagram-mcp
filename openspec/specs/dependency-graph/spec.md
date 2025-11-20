# dependency-graph Specification

## Purpose

This specification defines the dependency-graph capability for analyzing code dependencies in TypeScript/JavaScript projects. The system provides:

- **File-level dependency analysis**: Extract import relationships from source code
- **Graph representation**: Type-safe data structures for nodes (files) and edges (imports)
- **MCP interface**: Model Context Protocol integration for AI agents
- **Visualization**: Mermaid diagram generation for dependency graphs

This is Phase 1 MVP, supporting basic file-level import tracking. Future phases will add module/component hierarchies, interface dependencies, and render relationships.
## Requirements
### Requirement: Core Data Structures
The system SHALL provide type-safe data structures for nodes and edges using discriminated unions, supporting multiple edge types for different relationship kinds.

#### Scenario: Implement edge type definition
- **WHEN** defining edge types
- **THEN** ImplementEdge MUST be included in the Edge union type
- **AND** ImplementEdge MUST have discriminator field `type: 'implement'`
- **AND** ImplementEdge MUST include symbolName field for interface name
- **AND** ImplementEdge MUST include optional importPath field

### Requirement: TypeScript/JavaScript Import Parsing
The system SHALL parse TypeScript and JavaScript files to extract import relationships.

#### Scenario: Parse import statements
- **WHEN** a file contains `import { foo } from './bar'`
- **THEN** the parser MUST extract a dependency: file → './bar'

#### Scenario: Parse default imports
- **WHEN** a file contains `import foo from './bar'`
- **THEN** the parser MUST extract a dependency: file → './bar'

#### Scenario: Parse namespace imports
- **WHEN** a file contains `import * as foo from './bar'`
- **THEN** the parser MUST extract a dependency: file → './bar'

#### Scenario: Parse re-exports
- **WHEN** a file contains `export { foo } from './bar'`
- **THEN** the parser MUST extract a dependency: file → './bar'

#### Scenario: Handle dynamic imports
- **WHEN** a file contains `import('./bar')`
- **THEN** the parser MAY extract a dependency (best effort)

#### Scenario: Filter type-only imports
- **WHEN** a file contains `import type { Foo } from './bar'`
- **THEN** the parser SHOULD extract the dependency (Phase 1: include all imports)

#### Scenario: Parse project
- **WHEN** parsing a project directory
- **THEN** the parser MUST scan all .ts, .tsx, .js, .jsx files recursively
- **AND** the parser MUST ignore node_modules and build output directories

### Requirement: Dependency Graph Construction
The system SHALL build dependency graphs at multiple hierarchy levels (file, module, component) to support hierarchical analysis and complexity reduction.

#### Scenario: Build module-level graph
- **WHEN** `buildGraph(files, { level: 'module' })` is called
- **THEN** the system MUST create HierarchyNode objects with level='module'
- **AND** each module node MUST represent a distinct module detected in the project
- **AND** module node ID MUST follow format: `module:<relative-path>`

#### Scenario: Build component-level graph
- **WHEN** `buildGraph(files, { level: 'component' })` is called
- **THEN** the system MUST create HierarchyNode objects with level='component'
- **AND** each component node MUST represent a distinct component detected in the project

#### Scenario: Aggregate cross-module edges
- **GIVEN** file A in module M1 imports file B in module M2
- **WHEN** building module-level graph
- **THEN** the system MUST create edge M1 → M2
- **AND** deduplicate: multiple files importing between same modules SHALL result in 1 edge

#### Scenario: Filter intra-module edges
- **GIVEN** file A and file B both in module M1
- **AND** file A imports file B
- **WHEN** building module-level graph
- **THEN** the system MUST NOT create self-edge M1 → M1

#### Scenario: Hybrid graph structure with parent references
- **WHEN** building module-level graph
- **THEN** each file node MUST have `parent` field
- **AND** parent field MUST reference the module node ID
- **AND** both file nodes and module nodes MUST be included in Graph.nodes

#### Scenario: Build file-level graph remains unchanged
- **WHEN** `buildGraph(files)` is called without options
- **THEN** the system MUST create file-level nodes only (Phase 1 behavior)
- **AND** all Phase 1 tests MUST pass unchanged

### Requirement: MCP Interface
The system SHALL accept edge type filtering parameters through the MCP interface to enable clients to request specific relationship types.

#### Scenario: Accept edgeTypes parameter
- **WHEN** MCP client calls `getDependencyGraph(projectPath, { edgeTypes: ['import', 'implement'] })`
- **THEN** the system MUST return graph with both edge types
- **AND** response summary MUST include `totalImplementEdges` count
- **AND** backward compatibility MUST be maintained (default to ['import'])

#### Scenario: Backward compatible without edgeTypes parameter
- **WHEN** MCP client calls `getDependencyGraph(projectPath)` without edgeTypes
- **THEN** the system MUST default to edgeTypes: ['import']
- **AND** response MUST NOT include implement edges
- **AND** response format MUST be identical to Phase 2

### Requirement: Mermaid Visualization
The system SHALL generate Mermaid diagram syntax from dependency graphs.

#### Scenario: Generate basic graph
- **WHEN** generateMermaid is called with a Graph
- **THEN** it MUST return a string starting with "graph LR"
- **AND** each node MUST be represented as `nodeId[label]`
- **AND** each edge MUST be represented as `fromId --> toId`

#### Scenario: Escape special characters
- **WHEN** a node path contains spaces or special characters
- **THEN** the node ID MUST be sanitized to valid Mermaid syntax
- **AND** the label MUST display the original path

#### Scenario: Handle empty graph
- **WHEN** generateMermaid is called with an empty Graph
- **THEN** it MUST return "graph LR" with a comment indicating no nodes

#### Scenario: Readable output
- **WHEN** generating Mermaid for a graph with many nodes
- **THEN** the output SHOULD use short node IDs (e.g., hash or counter)
- **AND** labels SHOULD show relative file paths, not absolute paths

### Requirement: Performance
The system SHALL parse and analyze projects efficiently.

#### Scenario: Small project performance
- **WHEN** parsing a project with <100 files
- **THEN** the system MUST complete in <1 second

#### Scenario: Medium project performance
- **WHEN** parsing a project with 100-1000 files
- **THEN** the system MUST complete in <5 seconds

#### Scenario: Large project performance
- **WHEN** parsing a project with >1000 files
- **THEN** the system MUST complete in <30 seconds

#### Scenario: Memory efficiency
- **WHEN** parsing any project
- **THEN** the system SHOULD NOT exceed 500MB memory usage
- **AND** the system SHOULD garbage collect temporary AST data

### Requirement: Error Handling
The system SHALL handle errors gracefully and provide actionable feedback.

#### Scenario: Invalid syntax in source file
- **WHEN** parsing a file with syntax errors
- **THEN** the system SHOULD log a warning with file path and line number
- **AND** the system MUST continue parsing other files

#### Scenario: File system errors
- **WHEN** a file cannot be read due to permissions
- **THEN** the system SHOULD log a warning
- **AND** the system MUST continue parsing accessible files

#### Scenario: Unsupported file type
- **WHEN** encountering a .vue or .svelte file
- **THEN** the system SHOULD log an info message "Unsupported file type"
- **AND** the system MUST skip the file

#### Scenario: Parser crash recovery
- **WHEN** tree-sitter crashes on a specific file
- **THEN** the system MUST catch the error
- **AND** the system MUST continue parsing remaining files
- **AND** the system MUST report the problematic file in logs

### Requirement: The system SHALL achieve significant complexity reduction through hierarchical aggregation
Hierarchical aggregation SHALL reduce graph complexity by 50-100x for typical projects by grouping file-level dependencies into module or component-level dependencies.

#### Scenario: Module-level complexity reduction
- **GIVEN** a project with 1000+ files organized in 10-20 modules
- **WHEN** building module-level graph
- **THEN** the graph MUST contain 10-20 module nodes (50x-100x reduction)
- **AND** edge count MUST be significantly reduced compared to file-level

### Requirement: The system SHALL maintain performance targets when building hierarchical graphs
Building hierarchical graphs SHALL add minimal performance overhead (less than 10%) compared to file-level graph construction.

#### Scenario: Module-level performance overhead
- **GIVEN** a 1000-file project
- **WHEN** building module-level graph
- **THEN** overhead compared to file-level MUST be <10%
- **AND** total processing time MUST be <5 seconds

