# hierarchy-inference Specification

## Purpose
TBD - created by archiving change add-module-component-hierarchy. Update Purpose after archive.
## Requirements
### Requirement: Directory Pattern Detection
The system SHALL detect module and component hierarchies from standard project directory structures.

#### Scenario: Module detection from modules directory
- **WHEN** a file path is `src/modules/auth/login.ts`
- **THEN** hierarchy inference MUST detect level='module'
- **AND** the module identifier MUST be `modules/auth`
- **AND** the parent path MUST be `src/modules/auth`

#### Scenario: Module detection from features directory
- **WHEN** a file path is `src/features/dashboard/index.ts`
- **THEN** hierarchy inference MUST detect level='module'
- **AND** the module identifier MUST be `features/dashboard`

#### Scenario: Component detection from components directory
- **WHEN** a file path is `src/components/Button/Button.tsx`
- **THEN** hierarchy inference MUST detect level='component'
- **AND** the component identifier MUST be `components/Button`

#### Scenario: Component detection from ui directory
- **WHEN** a file path is `src/ui/Input/index.tsx`
- **THEN** hierarchy inference MUST detect level='component'
- **AND** the component identifier MUST be `ui/Input`

#### Scenario: File-level fallback
- **WHEN** a file path is `src/utils/helpers.ts`
- **THEN** hierarchy inference MUST return level='file'
- **AND** no module or component parent MUST be assigned

#### Scenario: Nested module structure
- **WHEN** a file path is `src/modules/auth/services/login-service.ts`
- **THEN** hierarchy inference MUST detect the nearest module boundary
- **AND** the module identifier MUST be `modules/auth`
- **AND** NOT `modules/auth/services`

#### Scenario: Index file handling
- **WHEN** a file path is `src/modules/users/index.ts`
- **THEN** hierarchy inference MUST assign it to module `modules/users`
- **AND** index.ts MUST be treated as part of the module, not a separate entity

### Requirement: Hierarchy Metadata
The system SHALL attach detected hierarchy information to parsed files.

#### Scenario: Attach hierarchy to ParsedFile
- **WHEN** a file is parsed
- **THEN** the ParsedFile object MUST include an optional `hierarchy` field
- **AND** if hierarchy is detected, it MUST contain `{ level, parent }`
- **AND** `level` MUST be 'module' | 'component' | 'file'

#### Scenario: Parent path format
- **WHEN** hierarchy parent is assigned
- **THEN** parent MUST be a relative path from project root
- **AND** parent MUST use forward slashes (/) as separators
- **AND** parent MUST NOT include trailing slashes

#### Scenario: No hierarchy for external imports
- **WHEN** processing an import from node_modules
- **THEN** hierarchy inference MUST NOT assign module/component level
- **AND** the file MUST remain at level='file'

### Requirement: Pattern Matching Accuracy
The system SHALL achieve high accuracy in hierarchy inference.

#### Scenario: Accuracy target
- **WHEN** tested against standard project structures (React, Next.js, Vue, etc.)
- **THEN** hierarchy inference MUST achieve ≥90% accuracy
- **AND** accuracy MUST be measured as: correct detections / total files

#### Scenario: Ambiguous case handling
- **WHEN** a file path matches multiple patterns (e.g., `src/modules/auth/components/LoginForm.tsx`)
- **THEN** the system MUST choose the nearest parent boundary
- **AND** the system SHOULD log a debug message about the ambiguity

#### Scenario: Unknown project structure
- **WHEN** a project uses non-standard directory names
- **THEN** the system MUST default to level='file' for all files
- **AND** the system SHOULD log an info message "No module/component hierarchy detected"

### Requirement: Performance
The system SHALL perform hierarchy inference efficiently.

#### Scenario: Negligible overhead
- **WHEN** parsing a project with hierarchy inference enabled
- **THEN** the overhead MUST be <5% compared to Phase 1 file-level parsing
- **AND** a 1000-file project MUST still complete in <5 seconds

#### Scenario: No redundant processing
- **WHEN** hierarchy detection runs
- **THEN** it MUST NOT re-read files from disk
- **AND** it MUST operate only on file paths (string matching)

### Requirement: Extensibility
The system SHALL support future customization of hierarchy patterns.

#### Scenario: Pattern configuration (future)
- **WHEN** custom patterns are needed (Phase 7)
- **THEN** the hierarchy detector MUST be extensible via configuration
- **AND** default patterns MUST remain as fallback

#### Scenario: Multiple pattern sets
- **WHEN** detecting hierarchies
- **THEN** the system MUST support checking multiple patterns (modules, features, components, ui)
- **AND** patterns MUST be evaluated in priority order (modules before components)

