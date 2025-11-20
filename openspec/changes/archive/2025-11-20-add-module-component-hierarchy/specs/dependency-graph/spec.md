# dependency-graph Specification (Phase 2 Extensions)

## MODIFIED Requirements

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
The system SHALL accept hierarchy level parameters through the MCP interface to enable clients to request graphs at different abstraction levels.

#### Scenario: Accept level parameter
- **WHEN** MCP client calls `getDependencyGraph(projectPath, { level: 'module' })`
- **THEN** the system MUST return module-level graph
- **AND** response summary MUST include `totalModules` count

#### Scenario: Backward compatible without level parameter
- **WHEN** MCP client calls `getDependencyGraph(projectPath)` without level parameter
- **THEN** the system MUST return file-level graph (Phase 1 behavior)
- **AND** response format MUST be identical to Phase 1

## ADDED Requirements

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
