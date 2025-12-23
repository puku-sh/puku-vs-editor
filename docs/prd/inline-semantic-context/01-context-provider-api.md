# Context Provider API - PRD

## Component Overview
**Purpose**: Define core interfaces and types for the context provider system
**Priority**: P0 (MVP - Foundation)
**Dependencies**: None (base layer)
**File**: `src/chat/src/extension/pukuai/common/contextProviderApi.ts`

---

## Problem

Puku's inline completions currently have hardcoded context gathering logic:
- Semantic search is manually integrated
- Import context is hardcoded in FIM provider
- No extensibility for new context types
- No standard interface for context providers
- Difficult to test and maintain

**We need**:
- Standard API for context providers
- Extensible architecture for adding new providers
- Type-safe context items (CodeSnippet, Diagnostic, etc.)
- Match scoring for provider selection
- Resolution status tracking

---

## Requirements

### FR-1: Context Provider Interface (P0)
Define standard interface that all context providers must implement.

**API:**
```typescript
export interface IContextProvider<T extends ContextItem = ContextItem> {
    /**
     * Unique identifier for this provider
     * Examples: 'puku.semantic', 'puku.imports', 'puku.diagnostics'
     */
    readonly id: string;

    /**
     * Document selector - which files this provider matches
     * Examples:
     *   - [{ language: 'typescript' }]
     *   - [{ language: 'python', pattern: '**/*.py' }]
     *   - [{ scheme: 'file' }] (all local files)
     */
    readonly selector: DocumentSelector;

    /**
     * Resolver that provides context items
     */
    readonly resolver: IContextResolver<T>;
}

export interface IContextResolver<T extends ContextItem = ContextItem> {
    /**
     * Resolve context items for the given request
     *
     * @param request - Request with document context
     * @param token - Cancellation token
     * @returns Array of context items or empty if provider doesn't apply
     */
    resolve(
        request: ContextResolveRequest,
        token: CancellationToken
    ): Promise<T[]>;
}
```

**Behavior**:
- Providers register with unique ID
- Selector determines which files provider applies to
- `resolve()` returns context items asynchronously
- Empty array if provider doesn't apply or fails

### FR-2: Context Item Types (P0)
Define type-safe context item schemas.

**Types:**
```typescript
/**
 * Base context item (all providers return this or subtype)
 */
export interface ContextItem {
    /**
     * Unique identifier for this item
     * Used for deduplication and telemetry
     */
    id: string;

    /**
     * Importance/priority of this item (0-100)
     * Higher = more relevant
     * Used for ranking when token budget is limited
     */
    importance: number;
}

/**
 * Code snippet from workspace (semantic search, similar files)
 */
export interface CodeSnippet extends ContextItem {
    type: 'codeSnippet';

    /**
     * File URI (e.g., file:///path/to/file.ts)
     */
    uri: string;

    /**
     * Code content
     */
    value: string;

    /**
     * Optional: Line range in file
     */
    lineStart?: number;
    lineEnd?: number;

    /**
     * Optional: Symbol name (function, class, etc.)
     */
    symbolName?: string;
}

/**
 * Import source (imported files)
 */
export interface ImportSource extends ContextItem {
    type: 'importSource';

    /**
     * File path being imported
     */
    filepath: string;

    /**
     * File content (may be truncated)
     */
    content: string;

    /**
     * Import statement (e.g., "import { foo } from './bar'")
     */
    importStatement?: string;
}

/**
 * Diagnostic (error, warning, info)
 */
export interface Diagnostic extends ContextItem {
    type: 'diagnostic';

    /**
     * Severity level
     */
    severity: 'error' | 'warning' | 'info';

    /**
     * Diagnostic message
     */
    message: string;

    /**
     * File URI where diagnostic occurs
     */
    uri: string;

    /**
     * Line where diagnostic occurs
     */
    line: number;

    /**
     * Optional: Code that triggered diagnostic
     */
    code?: string;
}

/**
 * Union type of all supported context items
 */
export type SupportedContextItem = CodeSnippet | ImportSource | Diagnostic;
```

### FR-3: Context Resolve Request (P0)
Define request object passed to providers.

**API:**
```typescript
export interface ContextResolveRequest {
    /**
     * Unique ID for this completion request
     * Used for caching and telemetry
     */
    completionId: string;

    /**
     * Document context (prefix, suffix, position)
     */
    documentContext: DocumentContext;

    /**
     * Optional: Additional data for providers
     * Example: { searchQuery: 'authentication', languageId: 'typescript' }
     */
    data?: Record<string, unknown>;
}

export interface DocumentContext {
    /**
     * Document URI
     */
    uri: string;

    /**
     * Language ID (typescript, python, etc.)
     */
    languageId: string;

    /**
     * Cursor position
     */
    position: {
        line: number;
        character: number;
    };

    /**
     * Text before cursor
     */
    prefix: string;

    /**
     * Text after cursor
     */
    suffix: string;

    /**
     * Full document text (optional, for providers that need it)
     */
    content?: string;
}
```

### FR-4: Resolution Status (P0)
Track resolution lifecycle for telemetry.

**Types:**
```typescript
export type ResolutionStatus =
    | 'none'       // Provider didn't match
    | 'success'    // Resolved successfully
    | 'error'      // Error during resolution
    | 'timeout'    // Exceeded timeout
    | 'cancelled'; // Cancelled by user

export interface ResolvedContext<T extends ContextItem = ContextItem> {
    /**
     * Provider ID
     */
    providerId: string;

    /**
     * Match score (0 = no match, 100 = perfect match)
     */
    matchScore: number;

    /**
     * Resolution status
     */
    resolution: ResolutionStatus;

    /**
     * Time taken to resolve (milliseconds)
     */
    resolutionTimeMs: number;

    /**
     * Context items resolved
     */
    data: T[];
}
```

---

## API Design

### Full API Definition

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Context Provider API
 *  Inspired by GitHub Copilot's context provider system
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, DocumentSelector } from 'vscode';

// ============================================================================
// Context Items
// ============================================================================

export interface ContextItem {
    id: string;
    importance: number; // 0-100
}

export interface CodeSnippet extends ContextItem {
    type: 'codeSnippet';
    uri: string;
    value: string;
    lineStart?: number;
    lineEnd?: number;
    symbolName?: string;
}

export interface ImportSource extends ContextItem {
    type: 'importSource';
    filepath: string;
    content: string;
    importStatement?: string;
}

export interface Diagnostic extends ContextItem {
    type: 'diagnostic';
    severity: 'error' | 'warning' | 'info';
    message: string;
    uri: string;
    line: number;
    code?: string;
}

export type SupportedContextItem = CodeSnippet | ImportSource | Diagnostic;

// ============================================================================
// Context Provider
// ============================================================================

export interface IContextProvider<T extends ContextItem = ContextItem> {
    readonly id: string;
    readonly selector: DocumentSelector;
    readonly resolver: IContextResolver<T>;
}

export interface IContextResolver<T extends ContextItem = ContextItem> {
    resolve(
        request: ContextResolveRequest,
        token: CancellationToken
    ): Promise<T[]>;
}

// ============================================================================
// Request & Context
// ============================================================================

export interface ContextResolveRequest {
    completionId: string;
    documentContext: DocumentContext;
    data?: Record<string, unknown>;
}

export interface DocumentContext {
    uri: string;
    languageId: string;
    position: {
        line: number;
        character: number;
    };
    prefix: string;
    suffix: string;
    content?: string;
}

// ============================================================================
// Resolution Status
// ============================================================================

export type ResolutionStatus =
    | 'none'
    | 'success'
    | 'error'
    | 'timeout'
    | 'cancelled';

export interface ResolvedContext<T extends ContextItem = ContextItem> {
    providerId: string;
    matchScore: number;
    resolution: ResolutionStatus;
    resolutionTimeMs: number;
    data: T[];
}

// ============================================================================
// Usage Tracking (for telemetry)
// ============================================================================

export type UsageStatus =
    | 'unused'         // Context not used in prompt
    | 'used'           // Context included in prompt
    | 'partiallyUsed'  // Context truncated due to budget
    | 'filtered';      // Context filtered out by token budget

export interface ContextItemUsageDetails {
    itemId: string;
    tokensUsed: number;
    tokensAvailable: number;
    truncated: boolean;
}
```

---

## Example Usage

### Example 1: Semantic Context Provider

```typescript
import * as vscode from 'vscode';
import { IContextProvider, CodeSnippet, ContextResolveRequest } from './contextProviderApi';
import { IPukuIndexingService } from '../../pukuIndexing/node/pukuIndexingService';

export class SemanticContextProvider implements IContextProvider<CodeSnippet> {
    readonly id = 'puku.semantic';

    readonly selector: vscode.DocumentSelector = [
        { language: 'typescript' },
        { language: 'javascript' },
        { language: 'python' },
        // ... other supported languages
    ];

    constructor(
        private readonly indexingService: IPukuIndexingService
    ) {}

    readonly resolver = {
        resolve: async (request: ContextResolveRequest, token: vscode.CancellationToken): Promise<CodeSnippet[]> => {
            // Extract search query from current line
            const currentLine = request.documentContext.prefix.split('\n').pop() || '';

            if (currentLine.trim().length < 3) {
                return []; // Query too short
            }

            // Search semantic index
            const results = await this.indexingService.search(currentLine, 3);

            // Convert to CodeSnippet
            return results.map((result, i) => ({
                type: 'codeSnippet',
                id: `semantic-${i}`,
                uri: result.uri.toString(),
                value: result.content,
                lineStart: result.lineStart,
                lineEnd: result.lineEnd,
                symbolName: result.symbolName,
                importance: Math.round((1 - i * 0.1) * 100), // Decrease importance for lower-ranked results
            }));
        }
    };
}
```

### Example 2: Import Context Provider

```typescript
export class ImportContextProvider implements IContextProvider<ImportSource> {
    readonly id = 'puku.imports';
    readonly selector = [{ scheme: 'file' }]; // All local files

    readonly resolver = {
        resolve: async (request: ContextResolveRequest, token: vscode.CancellationToken): Promise<ImportSource[]> => {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(request.documentContext.uri));

            // Extract imports from document
            const imports = await this.extractImports(document);

            // Read imported files
            const importSources: ImportSource[] = [];
            for (const imp of imports.slice(0, 3)) { // Max 3 imports
                const content = await this.readImportedFile(imp.filepath);
                if (content) {
                    importSources.push({
                        type: 'importSource',
                        id: `import-${imp.filepath}`,
                        filepath: imp.filepath,
                        content: content.slice(0, 500), // Truncate
                        importStatement: imp.statement,
                        importance: 80, // High importance
                    });
                }
            }

            return importSources;
        }
    };

    private async extractImports(document: vscode.TextDocument): Promise<Array<{filepath: string; statement: string}>> {
        // Implementation using AST parsing
        // ...
    }

    private async readImportedFile(filepath: string): Promise<string | null> {
        // Implementation
        // ...
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Valid code snippet | Semantic search result | `CodeSnippet` with uri, value, importance |
| Valid import source | Import statement | `ImportSource` with filepath, content |
| Invalid provider ID | Empty string | Validation error |
| Importance out of range | importance: 150 | Clamp to 100 |
| Missing required fields | No `uri` in CodeSnippet | Type error |

### Type Safety Tests

```typescript
// Should compile (valid)
const snippet: CodeSnippet = {
    type: 'codeSnippet',
    id: 'test-1',
    uri: 'file:///test.ts',
    value: 'function foo() {}',
    importance: 85,
};

// Should NOT compile (invalid type)
const invalid: CodeSnippet = {
    type: 'diagnostic', // ❌ Type error
    id: 'test-2',
    uri: 'file:///test.ts',
    value: 'function foo() {}',
    importance: 85,
};

// Union type works
const item: SupportedContextItem = snippet; // ✅
```

---

## Integration Example

```typescript
// Register providers
const registry = new ContextProviderRegistry();

const semanticProvider = new SemanticContextProvider(indexingService);
const importProvider = new ImportContextProvider();

registry.register(semanticProvider);
registry.register(importProvider);

// Resolve context for completion
const request: ContextResolveRequest = {
    completionId: 'comp-123',
    documentContext: {
        uri: 'file:///src/app.ts',
        languageId: 'typescript',
        position: { line: 42, character: 10 },
        prefix: 'function login(username: string, password: string) {\n    ',
        suffix: '\n}',
    },
};

const resolvedContexts = await registry.resolveAll(request, cancellationToken);

// Result:
// [
//   {
//     providerId: 'puku.semantic',
//     matchScore: 100,
//     resolution: 'success',
//     resolutionTimeMs: 150,
//     data: [
//       { type: 'codeSnippet', uri: '...', value: '...', importance: 90 },
//       { type: 'codeSnippet', uri: '...', value: '...', importance: 80 },
//     ]
//   },
//   {
//     providerId: 'puku.imports',
//     matchScore: 100,
//     resolution: 'success',
//     resolutionTimeMs: 50,
//     data: [
//       { type: 'importSource', filepath: '...', content: '...', importance: 80 }
//     ]
//   }
// ]
```

---

## Success Criteria

- [ ] API types defined and documented
- [ ] Example providers implemented (semantic, imports)
- [ ] Type safety enforced (no `any` types)
- [ ] API is extensible (easy to add new context types)
- [ ] Unit tests for type validation
- [ ] Integration example works end-to-end
- [ ] Documentation with usage examples

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `contextProviderApi.ts` file
- [ ] Define `ContextItem` and subtypes
- [ ] Define `IContextProvider` interface
- [ ] Define `ContextResolveRequest` and `DocumentContext`
- [ ] Define `ResolutionStatus` and `ResolvedContext`
- [ ] Add JSDoc comments
- [ ] Write unit tests for type validation
- [ ] Create example providers (semantic, imports)

---

## Related Documents

- `00-overview.md` - Project overview
- `02-semantic-context-provider.md` - Semantic provider implementation
- `03-import-context-provider.md` - Import provider implementation
- `04-context-registry.md` - Provider registry

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 2 hours
**Owner**: TBD
