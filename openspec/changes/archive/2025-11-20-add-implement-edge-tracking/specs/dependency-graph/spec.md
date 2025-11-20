# dependency-graph Specification (Phase 3 Extensions)

## MODIFIED Requirements

### Requirement: Core Data Structures
The system SHALL provide type-safe data structures for nodes and edges using discriminated unions, supporting multiple edge types for different relationship kinds.

#### Scenario: Implement edge type definition
- **WHEN** defining edge types
- **THEN** ImplementEdge MUST be included in the Edge union type
- **AND** ImplementEdge MUST have discriminator field `type: 'implement'`
- **AND** ImplementEdge MUST include symbolName field for interface name
- **AND** ImplementEdge MUST include optional importPath field

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
