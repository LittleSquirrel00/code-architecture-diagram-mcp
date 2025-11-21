/**
 * Core data structures for dependency graph
 *
 * Design principles:
 * - Use discriminated unions to eliminate special cases
 * - Type-safe: TypeScript compiler enforces constraints
 * - Extensible: Easy to add new node/edge types in future phases
 */

/**
 * Status of a node or edge
 * - normal: Unchanged
 * - added: Newly created (Phase 5: diff support)
 * - modified: Changed (Phase 5: diff support)
 * - removed: Deleted (Phase 5: diff support)
 */
export type Status = 'normal' | 'added' | 'modified' | 'removed'

/**
 * Node represents a code element in the dependency graph
 *
 * Phase 1: Only hierarchy nodes with level='file'
 * Phase 2+: Add module, component, architecture levels
 * Phase 3+: Add abstract nodes for interfaces/types
 */
export type Node =
  | HierarchyNode
  | AbstractNode

/**
 * Hierarchy node represents structural elements
 * - architecture: System-level modules (Phase 7)
 * - module: Business modules (Phase 2)
 * - component: Code components (Phase 2)
 * - file: Actual source files (Phase 1)
 */
export interface HierarchyNode {
  type: 'hierarchy'
  level: 'architecture' | 'module' | 'component' | 'file'
  id: string
  path: string
  parent?: string
  status: Status
}

/**
 * Abstract node represents type definitions
 * - interface: Interface definitions (Phase 3)
 * - type: Type aliases (Phase 3)
 * - class: Abstract classes (Phase 3)
 * - enum: Enumerations (Phase 3)
 */
export interface AbstractNode {
  type: 'abstract'
  kind: 'interface' | 'type' | 'class' | 'enum'
  id: string
  path: string
  parent?: string
  status: Status
  name: string
  isExported: boolean
}

/**
 * Edge represents a dependency relationship between nodes
 *
 * Phase 1: Only import edges
 * Phase 3+: Add implement, use edges
 * Phase 4+: Add render edges
 */
export type Edge =
  | ImportEdge
  | RenderEdge
  | ImplementEdge
  | UseEdge

/**
 * Import edge: code import dependency
 * Example: import { foo } from './bar'
 */
export interface ImportEdge {
  type: 'import'
  from: string
  to: string
  status: Status
}

/**
 * Render edge: component rendering dependency (Phase 4)
 * Example: <Parent><Child /></Parent>
 */
export interface RenderEdge {
  type: 'render'
  from: string
  to: string
  status: Status
  slotName?: string
  position?: number
  conditional?: boolean
}

/**
 * Implement edge: interface implementation (Phase 3)
 * Example: class Foo implements IBar
 */
export interface ImplementEdge {
  type: 'implement'
  from: string
  to: string
  status: Status
  symbolName: string
  importPath?: string
}

/**
 * Use edge: type usage (Phase 3)
 * Example: function foo(user: User)
 */
export interface UseEdge {
  type: 'use'
  from: string
  to: string
  status: Status
  symbolName: string
  importPath?: string
}

/**
 * Graph represents the complete dependency graph
 */
export interface Graph {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Hierarchy information for a file
 *
 * Supports five levels:
 * - architecture: System-level modules (monorepo packages/apps)
 * - module: Business modules (src/{name}/)
 * - component: Code components (src/{module}/{name}/)
 * - file: Individual source files
 * - interface: Type definitions (interface/type/class/enum)
 */
export interface HierarchyInfo {
  level: 'architecture' | 'module' | 'component' | 'file'
  parent?: string // Parent path (e.g., 'core', 'parser/lexer')
  architecture?: string // Architecture name for monorepo (e.g., 'server', 'client')
  module?: string // Module name (e.g., 'core', 'parser')
  component?: string // Component name (e.g., 'lexer', 'detector')
}

/**
 * Parsed file information (internal use)
 */
export interface ParsedFile {
  path: string
  imports: ImportInfo[]
  implements?: ImplementInfo[] // Phase 3: Optional interface implementations
  renders?: RenderInfo[]       // Phase 4: Optional component renders
  hierarchy?: HierarchyInfo    // Phase 2: Optional hierarchy metadata
  typeDefinitions?: TypeDefinition[] // Interface level: type definitions
}

/**
 * Import information extracted from a file
 */
export interface ImportInfo {
  importPath: string
  isTypeOnly: boolean
  isDynamic: boolean
}

/**
 * Type definition extracted from a file
 * Represents interface, type, class, or enum declarations
 */
export interface TypeDefinition {
  kind: 'interface' | 'type' | 'class' | 'enum'
  name: string
  isExported: boolean
  extends?: string[]      // For interfaces/classes that extend other types
  implements?: string[]   // For classes that implement interfaces
  references?: string[]   // Type references: union members, property types, etc.
}

/**
 * Implement information extracted from a file (Phase 3)
 * Represents a class implementing one or more interfaces
 */
export interface ImplementInfo {
  className: string                      // Name of the implementing class
  interfaces: string[]                   // Interface names being implemented
  interfacePaths: Map<string, string>    // Interface name → import path mapping
}

/**
 * Render information extracted from a file (Phase 4)
 * Represents a component being rendered in JSX
 */
export interface RenderInfo {
  componentName: string    // Name used in JSX: "Header" or "UI.Button"
  position: number         // Rendering position: 0, 1, 2...
  isNamespaced: boolean    // true for "UI.Button", false for "Header"
}

/**
 * Edge type for filtering
 * Phase 3: import, implement
 * Phase 4+: render
 */
export type EdgeType = 'import' | 'implement' | 'render'

/**
 * View mode for graph filtering (Phase 6)
 * - global: Show complete graph (default)
 * - focused: Show only dependencies within specified module/file
 * - neighbors: Show focus node + direct dependents
 */
export type ViewMode = 'global' | 'focused' | 'neighbors'

/**
 * Options for getDependencyGraph
 */
export interface GetDependencyGraphOptions {
  // Hierarchy level support
  level?: 'file' | 'component' | 'module' | 'architecture' | 'interface' // Default: 'file' (backward compatible)
  // Edge type filtering
  edgeTypes?: EdgeType[] // Default: ['import'] (backward compatible)
  // Phase 6: View filtering
  mode?: ViewMode       // Default: 'global' (show complete graph)
  focusPath?: string    // Required when mode is 'focused' or 'neighbors'
  neighborDepth?: number // Default: 1 (direct neighbors only)
  internalLevel?: 'file' | 'interface' // Level for internal analysis in focused mode. Default: 'file'
}

/**
 * File changes for diff analysis (Phase 5)
 */
export interface FileChanges {
  added: string[]    // Newly added files
  modified: string[] // Modified files
  removed: string[]  // Removed files
}

/**
 * Diff result showing graph changes (Phase 5)
 */
export interface DiffResult {
  added: Graph       // New nodes and edges
  removed: Graph     // Removed nodes and edges
  modified: Graph    // Modified relationships
  summary: {
    addedNodes: number
    removedNodes: number
    addedEdges: number
    removedEdges: number
    hasCircularDependency: boolean
    circularPaths?: string[][]
  }
}
