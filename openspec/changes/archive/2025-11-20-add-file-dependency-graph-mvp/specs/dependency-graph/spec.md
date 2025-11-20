## ADDED Requirements

### Requirement: Core Data Structures
The system SHALL define a type-safe Graph data structure to represent code dependencies.

#### Scenario: Graph structure
- **WHEN** a Graph object is created
- **THEN** it MUST contain a `nodes` array of Node objects
- **AND** it MUST contain an `edges` array of Edge objects

#### Scenario: Node type safety
- **WHEN** a Node is created with `type: 'hierarchy'`
- **THEN** it MUST have fields: `id`, `path`, `status`, `level`
- **AND** `level` MUST be one of: 'architecture' | 'module' | 'component' | 'file'
- **AND** it MAY have an optional `parent` field

#### Scenario: Edge type safety
- **WHEN** an Edge is created with `type: 'import'`
- **THEN** it MUST have fields: `from`, `to`, `status`
- **AND** `from` and `to` MUST reference valid node IDs

#### Scenario: Status values
- **WHEN** a Node or Edge has a `status` field
- **THEN** status MUST be one of: 'normal' | 'added' | 'modified' | 'removed'

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
The system SHALL build a hierarchical dependency graph from parsed import relationships.

#### Scenario: Create file nodes
- **WHEN** building a graph from parsed files
- **THEN** each file MUST create a Node with `type: 'hierarchy'` and `level: 'file'`
- **AND** node ID MUST be unique and deterministic

#### Scenario: Create import edges
- **WHEN** file A imports from file B
- **THEN** an Edge with `type: 'import'` MUST connect A → B
- **AND** edge status MUST be 'normal' (Phase 1: no diff support)

#### Scenario: Resolve relative paths
- **WHEN** file A imports './bar' and './bar.ts' exists
- **THEN** the edge MUST reference the resolved absolute path

#### Scenario: Handle missing imports
- **WHEN** file A imports './missing' but the file doesn't exist
- **THEN** the system SHOULD log a warning
- **AND** the system MAY create a node with status 'removed' or skip the edge

#### Scenario: Detect circular dependencies
- **WHEN** building a graph with A → B → A
- **THEN** the system SHOULD log a warning about circular dependency
- **AND** the system MUST still include both edges in the graph

#### Scenario: Deduplicate edges
- **WHEN** file A imports from file B multiple times
- **THEN** only one Edge A → B MUST exist in the graph

### Requirement: MCP Interface
The system SHALL provide a Model Context Protocol (MCP) interface for AI agents.

#### Scenario: getDependencyGraph tool registration
- **WHEN** the MCP server starts
- **THEN** it MUST register a tool named "getDependencyGraph"
- **AND** the tool schema MUST accept a `projectPath` string parameter

#### Scenario: Successful graph generation
- **WHEN** an AI agent calls getDependencyGraph with a valid project path
- **THEN** the system MUST return a JSON object with `nodes` and `edges` arrays
- **AND** the response MUST conform to the Graph schema

#### Scenario: Invalid project path
- **WHEN** an AI agent calls getDependencyGraph with an invalid path
- **THEN** the system MUST return an error with a clear message
- **AND** the error MUST not expose sensitive file system information

#### Scenario: Large project handling
- **WHEN** parsing a project with >1000 files
- **THEN** the system MUST complete within 30 seconds
- **AND** the system SHOULD return results within 5 seconds for typical projects

#### Scenario: Read-only operation
- **WHEN** getDependencyGraph is called
- **THEN** the system MUST NOT modify any files
- **AND** the system MUST NOT create any files except temporary caches

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
