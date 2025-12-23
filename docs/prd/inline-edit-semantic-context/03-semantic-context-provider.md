# Semantic Context Provider (Inline Edit) - PRD

## Component Overview
**Purpose**: Search workspace for relevant code snippets to include in inline edit prompts
**Priority**: P0 (MVP - Week 1)
**Dependencies**: `PukuIndexingService`
**File**: `src/chat/src/extension/inlineEdits/common/semanticContextProvider.ts`

---

## Problem

When users invoke inline edit with instructions like:
- "Refactor this to use the same pattern as the login function"
- "Add error handling like the API client"
- "Make this async like other database functions"

The LLM needs to find relevant code from the workspace to understand "the pattern", "like the API client", or "like other database functions".

**Without semantic context**: LLM guesses or uses generic patterns

**With semantic context**: LLM sees actual examples from the codebase and matches the style

---

## Requirements

### FR-1: Query Extraction from Instruction (P0)
Extract search keywords from user's natural language instruction.

**API:**
```typescript
export interface ISemanticContextProvider {
    /**
     * Get semantic context for inline edit
     *
     * @param instruction - User's natural language instruction
     * @param selectedCode - Code that user selected (if any)
     * @param document - Current document
     * @param position - Cursor position
     * @param maxChunks - Maximum code snippets to return (default: 3)
     * @returns Formatted context string
     */
    getSemanticContext(
        instruction: string,
        selectedCode: string,
        document: vscode.TextDocument,
        position: vscode.Position,
        maxChunks?: number
    ): Promise<string>;
}
```

**Query Extraction:**
```typescript
function extractSearchQuery(instruction: string, selectedCode: string): string {
    // Strategy 1: Extract explicit references
    // "like the login function" -> "login function"
    const explicitRef = instruction.match(/like (?:the )?([a-zA-Z_][a-zA-Z0-9_\s]+)/i);
    if (explicitRef) {
        return explicitRef[1].trim();
    }

    // Strategy 2: Extract key nouns/verbs
    // "Add error handling" -> "error handling"
    const keywords = instruction
        .toLowerCase()
        .replace(/^(add|refactor|fix|update|change|make)\s+/i, '') // Remove verbs
        .replace(/\b(this|that|it|the|a|an)\b/gi, '') // Remove articles
        .trim();

    if (keywords.length > 3) {
        return keywords;
    }

    // Strategy 3: Use selected code keywords
    // Extract function/class names from selection
    const codeKeywords = extractCodeKeywords(selectedCode);
    if (codeKeywords) {
        return codeKeywords;
    }

    // Fallback: Use full instruction
    return instruction;
}

function extractCodeKeywords(code: string): string {
    // Extract function name: function foo() or const foo =
    const funcMatch = code.match(/(?:function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (funcMatch) {
        return funcMatch[1];
    }

    // Extract class name: class Foo
    const classMatch = code.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
        return classMatch[1];
    }

    return '';
}
```

### FR-2: Semantic Search Execution (P0)
Search workspace using `PukuIndexingService`.

**Implementation:**
```typescript
async function searchWorkspace(
    query: string,
    languageId: string,
    maxChunks: number
): Promise<SearchResult[]> {
    // Check if indexing is ready
    if (this.indexingService.status !== PukuIndexingStatus.Ready) {
        console.log('[SemanticContextProvider] Indexing not ready');
        return [];
    }

    try {
        // Search with higher limit (filter later)
        const results = await this.indexingService.search(
            query,
            maxChunks * 2, // Get extra for filtering
            languageId
        );

        return results;
    } catch (error) {
        console.error('[SemanticContextProvider] Search failed:', error);
        return [];
    }
}
```

### FR-3: Result Filtering and Ranking (P0)
Filter and rank search results by relevance to inline edit.

**Filters:**
1. **Minimum score** - Remove low-relevance results (default: 0.7)
2. **Exclude current selection** - Don't suggest code user is editing
3. **Same language priority** - Prefer same language results
4. **Code pattern matching** - Boost results with similar patterns

**Ranking Criteria:**
```typescript
function rankResults(
    results: SearchResult[],
    instruction: string,
    selectedCode: string,
    currentUri: vscode.Uri,
    currentRange: vscode.Range
): SearchResult[] {
    return results
        // Filter: minimum score
        .filter(r => r.score >= 0.7)
        // Filter: exclude current selection
        .filter(r => {
            if (r.uri.toString() !== currentUri.toString()) {
                return true;
            }
            // Check if overlaps with selection
            const overlaps = r.lineStart <= currentRange.end.line &&
                            r.lineEnd >= currentRange.start.line;
            return !overlaps;
        })
        // Rank: boost by patterns
        .map(r => ({
            ...r,
            score: r.score + calculatePatternBoost(r, instruction, selectedCode),
        }))
        // Sort by score descending
        .sort((a, b) => b.score - a.score);
}

function calculatePatternBoost(
    result: SearchResult,
    instruction: string,
    selectedCode: string
): number {
    let boost = 0;

    // Boost for async/await pattern
    if (instruction.toLowerCase().includes('async') &&
        result.content.includes('async')) {
        boost += 0.1;
    }

    // Boost for error handling pattern
    if (instruction.toLowerCase().includes('error') &&
        result.content.includes('try') && result.content.includes('catch')) {
        boost += 0.1;
    }

    // Boost for similar function signatures
    if (selectedCode.includes('function') && result.content.includes('function')) {
        boost += 0.05;
    }

    return boost;
}
```

### FR-4: Context Formatting (P0)
Format search results as markdown for LLM.

**Format:**
```typescript
function formatAsMarkdown(results: SearchResult[]): string {
    if (results.length === 0) {
        return '';
    }

    let markdown = '## Relevant Code from Workspace\n\n';

    for (const result of results) {
        const relativePath = vscode.workspace.asRelativePath(result.uri);
        const languageId = getLanguageId(result.uri);

        markdown += `**File**: \`${relativePath}\` (lines ${result.lineStart}-${result.lineEnd})`;

        if (result.symbolName) {
            markdown += ` - ${result.chunkType}: \`${result.symbolName}\``;
        }

        markdown += '\n';
        markdown += '```' + languageId + '\n';
        markdown += truncateCode(result.content.trim(), 500);
        markdown += '\n```\n\n';
    }

    return markdown;
}
```

### FR-5: Configuration (P0)
Support configuration for search parameters.

**Settings:**
```json
{
  "puku.inlineEdit.context.semantic.enabled": true,
  "puku.inlineEdit.context.semantic.maxChunks": 3,
  "puku.inlineEdit.context.semantic.minScore": 0.7,
  "puku.inlineEdit.context.semantic.maxCodeLength": 500
}
```

---

## API Design

### Full Implementation

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Semantic Context Provider (Inline Edit)
 *  Searches workspace for relevant code snippets
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuIndexingService, PukuIndexingStatus, SearchResult } from '../../pukuIndexing/node/pukuIndexingService';

export const ISemanticContextProvider = createServiceIdentifier<ISemanticContextProvider>('ISemanticContextProvider');

export interface ISemanticContextProvider {
    readonly _serviceBrand: undefined;

    getSemanticContext(
        instruction: string,
        selectedCode: string,
        document: vscode.TextDocument,
        position: vscode.Position,
        maxChunks?: number
    ): Promise<string>;
}

export class SemanticContextProvider extends Disposable implements ISemanticContextProvider {
    declare readonly _serviceBrand: undefined;

    constructor(
        @IPukuIndexingService private readonly indexingService: IPukuIndexingService,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();
    }

    async getSemanticContext(
        instruction: string,
        selectedCode: string,
        document: vscode.TextDocument,
        position: vscode.Position,
        maxChunks: number = 3
    ): Promise<string> {
        const config = this.configService.getConfig();
        const enabled = config['puku.inlineEdit.context.semantic.enabled'] ?? true;

        if (!enabled) {
            return '';
        }

        // Check indexing status
        if (this.indexingService.status !== PukuIndexingStatus.Ready) {
            console.log('[SemanticContextProvider] Indexing not ready');
            return '';
        }

        // Extract search query
        const query = this.extractSearchQuery(instruction, selectedCode);

        if (!query || query.length < 3) {
            console.log('[SemanticContextProvider] Query too short');
            return '';
        }

        try {
            console.log(`[SemanticContextProvider] Searching for: "${query}"`);

            // Search workspace
            const results = await this.indexingService.search(
                query,
                maxChunks * 2, // Get extra for filtering
                document.languageId
            );

            if (results.length === 0) {
                console.log('[SemanticContextProvider] No results found');
                return '';
            }

            // Filter and rank
            const minScore = config['puku.inlineEdit.context.semantic.minScore'] ?? 0.7;
            const currentRange = document.selection ? document.selection :
                new vscode.Range(position, position);

            const filtered = this.filterAndRank(
                results,
                instruction,
                selectedCode,
                document.uri,
                currentRange,
                minScore
            );

            // Take top N
            const topResults = filtered.slice(0, maxChunks);

            // Format as markdown
            const markdown = this.formatAsMarkdown(topResults);

            console.log(`[SemanticContextProvider] Returning ${topResults.length} snippets`);
            return markdown;

        } catch (error) {
            console.error('[SemanticContextProvider] Error:', error);
            return '';
        }
    }

    /**
     * Extract search query from instruction and selected code
     */
    private extractSearchQuery(instruction: string, selectedCode: string): string {
        // Strategy 1: Extract explicit references
        // "like the login function" -> "login function"
        const explicitRef = instruction.match(/like (?:the )?([a-zA-Z_][a-zA-Z0-9_\s]+)/i);
        if (explicitRef) {
            return explicitRef[1].trim();
        }

        // Strategy 2: Extract key nouns/verbs
        const keywords = instruction
            .toLowerCase()
            .replace(/^(add|refactor|fix|update|change|make|convert)\s+/i, '')
            .replace(/\b(this|that|it|the|a|an|to|into)\b/gi, '')
            .trim();

        if (keywords.length > 3) {
            return keywords;
        }

        // Strategy 3: Extract from selected code
        const codeKeywords = this.extractCodeKeywords(selectedCode);
        if (codeKeywords) {
            return codeKeywords;
        }

        // Fallback: Use instruction
        return instruction;
    }

    /**
     * Extract keywords from code (function/class names)
     */
    private extractCodeKeywords(code: string): string {
        // Extract function name
        const funcMatch = code.match(/(?:function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (funcMatch) {
            return funcMatch[1];
        }

        // Extract class name
        const classMatch = code.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (classMatch) {
            return classMatch[1];
        }

        return '';
    }

    /**
     * Filter and rank results
     */
    private filterAndRank(
        results: SearchResult[],
        instruction: string,
        selectedCode: string,
        currentUri: vscode.Uri,
        currentRange: vscode.Range,
        minScore: number
    ): SearchResult[] {
        return results
            // Filter: minimum score
            .filter(r => r.score >= minScore)
            // Filter: exclude current selection
            .filter(r => {
                if (r.uri.toString() !== currentUri.toString()) {
                    return true;
                }
                // Check if overlaps with selection
                const overlaps = r.lineStart <= currentRange.end.line &&
                                r.lineEnd >= currentRange.start.line;
                return !overlaps;
            })
            // Rank: add pattern boost
            .map(r => ({
                ...r,
                score: r.score + this.calculatePatternBoost(r, instruction, selectedCode),
            }))
            // Sort by score descending
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate pattern boost based on instruction
     */
    private calculatePatternBoost(
        result: SearchResult,
        instruction: string,
        selectedCode: string
    ): number {
        let boost = 0;
        const lowerInstruction = instruction.toLowerCase();
        const content = result.content.toLowerCase();

        // Boost for async/await pattern
        if (lowerInstruction.includes('async') && content.includes('async')) {
            boost += 0.1;
        }

        // Boost for error handling
        if (lowerInstruction.includes('error') && content.includes('try') && content.includes('catch')) {
            boost += 0.1;
        }

        // Boost for promise pattern
        if (lowerInstruction.includes('promise') && content.includes('promise')) {
            boost += 0.05;
        }

        // Boost for similar structures
        if (selectedCode.includes('function') && content.includes('function')) {
            boost += 0.05;
        }
        if (selectedCode.includes('class') && content.includes('class')) {
            boost += 0.05;
        }

        return boost;
    }

    /**
     * Format results as markdown
     */
    private formatAsMarkdown(results: SearchResult[]): string {
        if (results.length === 0) {
            return '';
        }

        const config = this.configService.getConfig();
        const maxCodeLength = config['puku.inlineEdit.context.semantic.maxCodeLength'] ?? 500;

        let markdown = '## Relevant Code from Workspace\n\n';

        for (const result of results) {
            const relativePath = vscode.workspace.asRelativePath(result.uri);
            const languageId = this.getLanguageId(result.uri);

            markdown += `**File**: \`${relativePath}\` (lines ${result.lineStart}-${result.lineEnd})`;

            if (result.symbolName) {
                markdown += ` - ${result.chunkType}: \`${result.symbolName}\``;
            }

            markdown += '\n';
            markdown += '```' + languageId + '\n';
            markdown += this.truncateCode(result.content.trim(), maxCodeLength);
            markdown += '\n```\n\n';
        }

        return markdown;
    }

    /**
     * Truncate code to max length
     */
    private truncateCode(code: string, maxLength: number): string {
        if (code.length <= maxLength) {
            return code;
        }
        return code.substring(0, maxLength) + '\n// ... (truncated)';
    }

    /**
     * Get language ID from URI
     */
    private getLanguageId(uri: vscode.Uri): string {
        const ext = uri.path.split('.').pop() || '';
        const langMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'js': 'javascript',
            'jsx': 'javascriptreact',
            'py': 'python',
            'go': 'go',
            'rs': 'rust',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
        };
        return langMap[ext] || '';
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Explicit reference | "like the login function" | Query: "login function" |
| Key nouns | "Add error handling" | Query: "error handling" |
| Code keywords | `function fetchData()` | Query: "fetchData" |
| Minimum score | Results with score <0.7 | Filtered out |
| Exclude selection | Search in current selection | Result excluded |
| Pattern boost | Instruction: "make async", Result has async | +0.1 boost |
| Truncation | 1000 char code | Truncated to 500 |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Full workflow | Instruction → Search → Format → Markdown |
| Indexing not ready | Returns empty string |
| No results found | Returns empty string |
| Configuration disabled | Returns empty string |

---

## Example Output

### Input

**Instruction**: "Refactor this to use async/await like the login function"

**Selected Code**:
```typescript
function fetchUser(id: string) {
    return fetch(`/api/users/${id}`)
        .then(res => res.json());
}
```

### Semantic Search Query

Extracted query: "login function async await"

### Search Results

Found 2 relevant snippets from workspace

### Output: Formatted Context

```markdown
## Relevant Code from Workspace

**File**: `src/auth/login.ts` (lines 15-28) - function: `loginUser`
```typescript
async function loginUser(credentials: Credentials): Promise<User> {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        if (!response.ok) {
            throw new Error(`Login failed: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}
```

**File**: `src/api/client.ts` (lines 42-52) - function: `apiRequest`
```typescript
async function apiRequest(endpoint: string): Promise<any> {
    const response = await fetch(`/api/${endpoint}`);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
}
```
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Query extraction | <10ms | Pattern matching |
| Semantic search | <150ms | PukuIndexingService |
| Filtering/ranking | <20ms | In-memory operations |
| Formatting | <20ms | String concatenation |
| **Total** | **<200ms** | End-to-end |

---

## Success Criteria

- [ ] Extracts meaningful search queries from instructions
- [ ] Searches workspace using PukuIndexingService
- [ ] Filters results by score and relevance
- [ ] Boosts results with matching patterns
- [ ] Excludes current selection
- [ ] Formats as markdown with code blocks
- [ ] Truncates code to fit budget
- [ ] Configuration support
- [ ] Unit tests (>80% coverage)
- [ ] Performance <200ms

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `ISemanticContextProvider` interface
- [ ] Implement `SemanticContextProvider` class
- [ ] Add `extractSearchQuery()` method
- [ ] Add `extractCodeKeywords()` helper
- [ ] Add `filterAndRank()` method
- [ ] Add `calculatePatternBoost()` method
- [ ] Add `formatAsMarkdown()` method
- [ ] Add `truncateCode()` helper
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests

---

## Related Documents

- `00-overview.md` - Project overview
- `05-context-aggregator.md` - Aggregates semantic with other context
- `06-prompt-integration.md` - Uses formatted context in prompts
- `../inline-semantic-context/02-semantic-context-provider.md` - FIM version (different use case)

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 3 hours
**Dependencies**: PukuIndexingService (already exists)
**Owner**: TBD
