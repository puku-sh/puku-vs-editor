# Semantic Context Provider - PRD

## Component Overview
**Purpose**: Refactor existing semantic search into a standardized context provider
**Priority**: P0 (MVP - Week 1)
**Dependencies**: `IContextProvider` API, `PukuIndexingService`
**File**: `src/chat/src/extension/pukuai/vscode-node/providers/semanticContextProvider.ts`

---

## Problem

Current semantic context implementation is scattered and manual:
- `PukuSemanticContextProvider` provides basic semantic search for FIM
- `SemanticSearchFlow` manually integrates search into completion provider
- No standardized interface or telemetry
- Hardcoded in `PukuInlineCompletionProvider`
- Difficult to test independently

**Existing Implementation:**
```typescript
// Current (in PukuInlineCompletionProvider.ts)
const searchResults = await this._indexingService.search(currentLine, 2, document.languageId);
semanticFiles = searchResults
    .filter(result => {
        if (result.uri.fsPath !== currentDoc.uri.fsPath) return true;
        const cursorInChunk = currentPos.line >= result.lineStart && currentPos.line <= result.lineEnd;
        return !cursorInChunk;
    })
    .map(result => ({ filepath: result.uri.fsPath, content: result.content }));
```

**Target: Standardized provider:**
```typescript
const semanticProvider = new SemanticContextProvider(indexingService);
const snippets = await semanticProvider.resolver.resolve(request, token);
// Returns CodeSnippet[] with proper typing
```

---

## Requirements

### FR-1: Implement IContextProvider Interface (P0)
Refactor semantic search to use standard provider interface.

**API:**
```typescript
export class SemanticContextProvider implements IContextProvider<CodeSnippet> {
    readonly id = 'puku.semantic';

    readonly selector: DocumentSelector = [
        { language: 'typescript' },
        { language: 'typescriptreact' },
        { language: 'javascript' },
        { language: 'javascriptreact' },
        { language: 'python' },
        { language: 'java' },
        { language: 'go' },
        { language: 'rust' },
        { language: 'c' },
        { language: 'cpp' },
        { language: 'csharp' },
        { language: 'ruby' },
        { language: 'php' },
        // All languages supported by PukuIndexingService
    ];

    constructor(
        @IPukuIndexingService private readonly indexingService: IPukuIndexingService,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {}

    readonly resolver: IContextResolver<CodeSnippet> = {
        resolve: async (request: ContextResolveRequest, token: CancellationToken): Promise<CodeSnippet[]> => {
            // Implementation
        }
    };
}
```

### FR-2: Smart Query Extraction (P0)
Extract meaningful search query from document context.

**Strategies:**
1. **Current line** (default)
   - Use line where cursor is positioned
   - Good for "what comes next" completions

2. **Multi-line context** (enhanced)
   - Extract 2-3 lines before cursor
   - Better for complex logic

3. **AST-based** (future, P2)
   - Extract function/class name
   - Better semantic understanding

**Implementation:**
```typescript
private extractSearchQuery(documentContext: DocumentContext): string {
    const config = this.configService.getConfig();
    const lines = documentContext.prefix.split('\n');

    // Strategy 1: Current line (default)
    if (config.puku.inline.context.semantic.queryStrategy === 'currentLine') {
        return lines[lines.length - 1].trim();
    }

    // Strategy 2: Multi-line context
    if (config.puku.inline.context.semantic.queryStrategy === 'multiLine') {
        const contextLines = lines.slice(-3); // Last 3 lines
        return contextLines.join(' ').trim();
    }

    // Default to current line
    return lines[lines.length - 1].trim();
}
```

### FR-3: Filtering and Ranking (P0)
Filter out irrelevant results and rank by relevance.

**Filters:**
1. **Exclude current file's current chunk** - Don't suggest code user is already writing
2. **Minimum score** - Filter results below threshold (default: 0.7)
3. **Deduplication** - Remove identical snippets
4. **Maximum results** - Limit to top N (default: 3)

**Ranking:**
- Search results already ranked by similarity score
- Additional boost for:
  - Same file (but different chunk): +0.1
  - Recently modified files: +0.05
  - Frequently accessed files: +0.05

**Implementation:**
```typescript
private filterAndRank(
    results: SearchResult[],
    currentUri: string,
    cursorLine: number,
    minScore: number = 0.7
): SearchResult[] {
    return results
        // Filter: minimum score
        .filter(r => r.score >= minScore)
        // Filter: exclude current chunk
        .filter(r => {
            if (r.uri.toString() !== currentUri) {
                return true; // Different file, include
            }
            // Same file: exclude if cursor is inside chunk
            const cursorInChunk = cursorLine >= r.lineStart && cursorLine <= r.lineEnd;
            return !cursorInChunk;
        })
        // Rank: boost same-file chunks
        .map(r => ({
            ...r,
            score: r.uri.toString() === currentUri ? r.score + 0.1 : r.score,
        }))
        // Sort by score descending
        .sort((a, b) => b.score - a.score);
}
```

### FR-4: CodeSnippet Conversion (P0)
Convert `SearchResult` to `CodeSnippet` with proper metadata.

**Implementation:**
```typescript
private toCodeSnippet(result: SearchResult, index: number): CodeSnippet {
    return {
        type: 'codeSnippet',
        id: `semantic-${result.uri.toString()}-${result.lineStart}`,
        uri: result.uri.toString(),
        value: result.content,
        lineStart: result.lineStart,
        lineEnd: result.lineEnd,
        symbolName: result.symbolName,
        importance: this.calculateImportance(result, index),
    };
}

private calculateImportance(result: SearchResult, index: number): number {
    // Base importance from similarity score (0.7-1.0 → 70-100)
    let importance = Math.round(result.score * 100);

    // Decay by rank (first result: 0%, second: -5%, third: -10%)
    importance -= index * 5;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, importance));
}
```

### FR-5: Configuration (P0)
Support configuration for query strategy, max results, and minimum score.

**Settings:**
```json
{
  "puku.inline.context.semantic.enabled": true,
  "puku.inline.context.semantic.maxChunks": 3,
  "puku.inline.context.semantic.minScore": 0.7,
  "puku.inline.context.semantic.queryStrategy": "currentLine", // or "multiLine"
  "puku.inline.context.semantic.excludeCurrentFile": false
}
```

---

## API Design

### Full Implementation

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Semantic Context Provider
 *  Provides semantically similar code snippets from workspace index
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IConfigurationService } from '../../../../platform/configuration/common/configurationService';
import { Disposable } from '../../../../util/vs/base/common/lifecycle';
import { IContextProvider, IContextResolver, CodeSnippet, ContextResolveRequest } from '../../common/contextProviderApi';
import { IPukuIndexingService, PukuIndexingStatus, SearchResult } from '../../../pukuIndexing/node/pukuIndexingService';

export class SemanticContextProvider extends Disposable implements IContextProvider<CodeSnippet> {
    readonly id = 'puku.semantic';

    readonly selector: vscode.DocumentSelector = [
        { language: 'typescript' },
        { language: 'typescriptreact' },
        { language: 'javascript' },
        { language: 'javascriptreact' },
        { language: 'python' },
        { language: 'java' },
        { language: 'go' },
        { language: 'rust' },
        { language: 'c' },
        { language: 'cpp' },
        { language: 'csharp' },
        { language: 'ruby' },
        { language: 'php' },
        { language: 'swift' },
        { language: 'kotlin' },
        { language: 'scala' },
    ];

    constructor(
        @IPukuIndexingService private readonly indexingService: IPukuIndexingService,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();
    }

    readonly resolver: IContextResolver<CodeSnippet> = {
        resolve: async (request: ContextResolveRequest, token: vscode.CancellationToken): Promise<CodeSnippet[]> => {
            // Check if indexing is ready
            if (this.indexingService.status !== PukuIndexingStatus.Ready) {
                console.log('[SemanticContextProvider] Indexing not ready, skipping');
                return [];
            }

            if (token.isCancellationRequested) {
                return [];
            }

            const config = this.configService.getConfig();
            const maxChunks = config['puku.inline.context.semantic.maxChunks'] ?? 3;
            const minScore = config['puku.inline.context.semantic.minScore'] ?? 0.7;

            // Extract search query
            const query = this.extractSearchQuery(request.documentContext);

            if (!query || query.length < 3) {
                console.log('[SemanticContextProvider] Query too short, skipping');
                return [];
            }

            try {
                console.log(`[SemanticContextProvider] Searching for: "${query.substring(0, 100)}"`);

                // Search semantic index
                const results = await this.indexingService.search(
                    query,
                    maxChunks * 2, // Get more candidates for filtering
                    request.documentContext.languageId
                );

                if (results.length === 0) {
                    console.log('[SemanticContextProvider] No results found');
                    return [];
                }

                // Filter and rank results
                const filtered = this.filterAndRank(
                    results,
                    request.documentContext.uri,
                    request.documentContext.position.line,
                    minScore
                );

                // Convert to CodeSnippet
                const snippets = filtered
                    .slice(0, maxChunks)
                    .map((result, i) => this.toCodeSnippet(result, i));

                console.log(`[SemanticContextProvider] Returning ${snippets.length} snippets`);
                return snippets;

            } catch (error) {
                console.error('[SemanticContextProvider] Error during search:', error);
                return []; // Silent failure
            }
        }
    };

    /**
     * Extract search query from document context
     */
    private extractSearchQuery(documentContext: any): string {
        const config = this.configService.getConfig();
        const strategy = config['puku.inline.context.semantic.queryStrategy'] ?? 'currentLine';

        const lines = documentContext.prefix.split('\n');

        if (strategy === 'multiLine') {
            // Last 3 lines
            const contextLines = lines.slice(-3);
            return contextLines.join(' ').trim();
        }

        // Default: current line
        return lines[lines.length - 1].trim();
    }

    /**
     * Filter and rank search results
     */
    private filterAndRank(
        results: SearchResult[],
        currentUri: string,
        cursorLine: number,
        minScore: number
    ): SearchResult[] {
        const config = this.configService.getConfig();
        const excludeCurrentFile = config['puku.inline.context.semantic.excludeCurrentFile'] ?? false;

        return results
            // Filter: minimum score
            .filter(r => r.score >= minScore)
            // Filter: exclude current file (optional)
            .filter(r => {
                if (excludeCurrentFile && r.uri.toString() === currentUri) {
                    return false;
                }
                // Exclude current chunk (where cursor is)
                if (r.uri.toString() === currentUri) {
                    const cursorInChunk = cursorLine >= r.lineStart && cursorLine <= r.lineEnd;
                    return !cursorInChunk;
                }
                return true;
            })
            // Rank: boost same-file chunks (if not excluded)
            .map(r => ({
                ...r,
                score: r.uri.toString() === currentUri ? r.score + 0.1 : r.score,
            }))
            // Sort by score descending
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Convert SearchResult to CodeSnippet
     */
    private toCodeSnippet(result: SearchResult, index: number): CodeSnippet {
        return {
            type: 'codeSnippet',
            id: `semantic-${result.uri.toString()}-${result.lineStart}`,
            uri: result.uri.toString(),
            value: result.content,
            lineStart: result.lineStart,
            lineEnd: result.lineEnd,
            symbolName: result.symbolName,
            importance: this.calculateImportance(result, index),
        };
    }

    /**
     * Calculate importance score (0-100)
     */
    private calculateImportance(result: SearchResult, index: number): number {
        // Base importance from similarity score (0.7-1.0 → 70-100)
        let importance = Math.round(result.score * 100);

        // Decay by rank (first result: 0%, second: -5%, third: -10%)
        importance -= index * 5;

        // Clamp to 0-100
        return Math.max(0, Math.min(100, importance));
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Valid query, ready index | `query: "authentication"` | 3 CodeSnippets |
| Query too short | `query: "ab"` | Empty array |
| Index not ready | `status: Idle` | Empty array |
| All results below threshold | `scores: [0.5, 0.6]` | Empty array |
| Exclude current chunk | Cursor at line 10, chunk 10-20 | Result excludes chunk |
| Same file boost | Same file, different chunk | +0.1 score boost |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Search TypeScript file | Returns relevant TypeScript snippets |
| Search Python file | Returns relevant Python snippets |
| Cancellation during search | Returns empty array |
| Configuration change | Uses new maxChunks value |

---

## Example Output

**Input:**
```typescript
// User typing in auth/login.ts at line 42:
function login(username: string, password: string) {
    // <cursor>
```

**Search Query**: `login username password`

**Semantic Search Results** (from `PukuIndexingService`):
```
1. auth/session.ts:15-35 - SessionManager.createSession (score: 0.85)
2. auth/logout.ts:10-25 - logout (score: 0.82)
3. utils/validation.ts:50-60 - validateCredentials (score: 0.78)
```

**CodeSnippets Returned**:
```typescript
[
    {
        type: 'codeSnippet',
        id: 'semantic-file://auth/session.ts-15',
        uri: 'file://auth/session.ts',
        value: 'export class SessionManager {\n    async createSession(userId: string) {...}',
        lineStart: 15,
        lineEnd: 35,
        symbolName: 'SessionManager',
        importance: 85, // From score 0.85
    },
    {
        type: 'codeSnippet',
        id: 'semantic-file://auth/logout.ts-10',
        uri: 'file://auth/logout.ts',
        value: 'export async function logout(sessionId: string) {...}',
        lineStart: 10,
        lineEnd: 25,
        symbolName: 'logout',
        importance: 77, // 82 - 5 (rank penalty)
    },
    {
        type: 'codeSnippet',
        id: 'semantic-file://utils/validation.ts-50',
        uri: 'file://utils/validation.ts',
        value: 'function validateCredentials(username, password) {...}',
        lineStart: 50,
        lineEnd: 60,
        symbolName: 'validateCredentials',
        importance: 68, // 78 - 10 (rank penalty)
    },
]
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Search latency | <150ms (p90) | `PukuIndexingService` already fast |
| Query extraction | <5ms | Simple string operations |
| Filtering | <10ms | In-memory operations |
| Total resolution | <200ms | End-to-end |

---

## Success Criteria

- [ ] Implements `IContextProvider<CodeSnippet>` interface
- [ ] Query extraction strategies (currentLine, multiLine)
- [ ] Filtering excludes current chunk
- [ ] Ranking boosts same-file results
- [ ] Configuration support (maxChunks, minScore, etc.)
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests pass
- [ ] Performance <200ms (p90)

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `semanticContextProvider.ts` file
- [ ] Implement `IContextProvider` interface
- [ ] Extract query extraction logic
- [ ] Implement filtering and ranking
- [ ] Convert `SearchResult` to `CodeSnippet`
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Remove old `PukuSemanticContextProvider` (after migration)

---

## Migration Strategy

**Step 1**: Create new provider (keep old one working)
```typescript
// New provider
const semanticProvider = new SemanticContextProvider(indexingService, configService);
```

**Step 2**: Register with context registry
```typescript
registry.register(semanticProvider);
```

**Step 3**: Update `PukuInlineCompletionProvider` to use registry
```typescript
// Old (remove):
const semanticFiles = await this._semanticSearchFlow.searchSimilarCode(...);

// New (use registry):
const contextItems = await this._contextRegistry.resolveAll(request, token);
const semanticSnippets = contextItems
    .find(c => c.providerId === 'puku.semantic')
    ?.data as CodeSnippet[];
```

**Step 4**: Remove old `PukuSemanticContextProvider`
- Delete `src/chat/src/extension/pukuIndexing/vscode-node/pukuSemanticContextProvider.ts`
- Remove registration in `pukuIndexing.contribution.ts`

---

## Related Documents

- `00-overview.md` - Project overview
- `01-context-provider-api.md` - API definitions
- `03-import-context-provider.md` - Import provider
- `04-context-registry.md` - Provider registry

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 3 hours
**Owner**: TBD
