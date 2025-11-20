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
export type Status = 'normal' | 'added' | 'modified' | 'removed';
/**
 * Node represents a code element in the dependency graph
 *
 * Phase 1: Only hierarchy nodes with level='file'
 * Phase 2+: Add module, component, architecture levels
 * Phase 3+: Add abstract nodes for interfaces/types
 */
export type Node = HierarchyNode | AbstractNode;
/**
 * Hierarchy node represents structural elements
 * - architecture: System-level modules (Phase 7)
 * - module: Business modules (Phase 2)
 * - component: Code components (Phase 2)
 * - file: Actual source files (Phase 1)
 */
export interface HierarchyNode {
    type: 'hierarchy';
    level: 'architecture' | 'module' | 'component' | 'file';
    id: string;
    path: string;
    parent?: string;
    status: Status;
}
/**
 * Abstract node represents type definitions
 * - interface: Interface definitions (Phase 3)
 * - type: Type aliases (Phase 3)
 * - class: Abstract classes (Phase 3)
 * - enum: Enumerations (Phase 3)
 */
export interface AbstractNode {
    type: 'abstract';
    kind: 'interface' | 'type' | 'class' | 'enum';
    id: string;
    path: string;
    parent?: string;
    status: Status;
    name: string;
    isExported: boolean;
}
/**
 * Edge represents a dependency relationship between nodes
 *
 * Phase 1: Only import edges
 * Phase 3+: Add implement, use edges
 * Phase 4+: Add render edges
 */
export type Edge = ImportEdge | RenderEdge | ImplementEdge | UseEdge;
/**
 * Import edge: code import dependency
 * Example: import { foo } from './bar'
 */
export interface ImportEdge {
    type: 'import';
    from: string;
    to: string;
    status: Status;
}
/**
 * Render edge: component rendering dependency (Phase 4)
 * Example: <Parent><Child /></Parent>
 */
export interface RenderEdge {
    type: 'render';
    from: string;
    to: string;
    status: Status;
    slotName?: string;
    position?: number;
    conditional?: boolean;
}
/**
 * Implement edge: interface implementation (Phase 3)
 * Example: class Foo implements IBar
 */
export interface ImplementEdge {
    type: 'implement';
    from: string;
    to: string;
    status: Status;
    symbolName: string;
    importPath?: string;
}
/**
 * Use edge: type usage (Phase 3)
 * Example: function foo(user: User)
 */
export interface UseEdge {
    type: 'use';
    from: string;
    to: string;
    status: Status;
    symbolName: string;
    importPath?: string;
}
/**
 * Graph represents the complete dependency graph
 */
export interface Graph {
    nodes: Node[];
    edges: Edge[];
}
/**
 * Hierarchy information for a file (Phase 2)
 */
export interface HierarchyInfo {
    level: 'module' | 'component' | 'file';
    parent?: string;
}
/**
 * Parsed file information (internal use)
 */
export interface ParsedFile {
    path: string;
    imports: ImportInfo[];
    implements?: ImplementInfo[];
    renders?: RenderInfo[];
    hierarchy?: HierarchyInfo;
}
/**
 * Import information extracted from a file
 */
export interface ImportInfo {
    importPath: string;
    isTypeOnly: boolean;
    isDynamic: boolean;
}
/**
 * Implement information extracted from a file (Phase 3)
 * Represents a class implementing one or more interfaces
 */
export interface ImplementInfo {
    className: string;
    interfaces: string[];
    interfacePaths: Map<string, string>;
}
/**
 * Render information extracted from a file (Phase 4)
 * Represents a component being rendered in JSX
 */
export interface RenderInfo {
    componentName: string;
    position: number;
    isNamespaced: boolean;
}
/**
 * Edge type for filtering
 * Phase 3: import, implement
 * Phase 4+: render
 */
export type EdgeType = 'import' | 'implement' | 'render';
/**
 * Options for getDependencyGraph
 */
export interface GetDependencyGraphOptions {
    level?: 'file' | 'component' | 'module';
    edgeTypes?: EdgeType[];
}
//# sourceMappingURL=types.d.ts.map