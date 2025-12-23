# Context Aggregator - PRD

## Component Overview
**Purpose**: Combine all context sources (history, semantic, diagnostics) into a single formatted context
**Priority**: P0 (MVP - Week 1)
**Dependencies**: All context providers
**File**: `src/chat/src/extension/inlineEdits/common/contextAggregator.ts`

---

## Problem

We have multiple context providers each returning markdown:
- `HistoryContextProvider` → Recent edits
- `SemanticContextProvider` → Relevant code snippets
- `DiagnosticsContextProvider` → Errors/warnings

We need to:
1. Call all providers in parallel
2. Combine their results
3. Apply token budget limits
4. Return formatted context for LLM

---

## Requirements

### FR-1: Aggregate Multiple Providers (P0)
Call all providers and combine results.

**API:**
```typescript
export interface IContextAggregator {
    /**
     * Get combined context from all providers
     *
     * @param request - Context request with document, position, instruction
     * @param token - Cancellation token
     * @returns Combined context string
     */
    getContext(
        request: ContextRequest,
        token: vscode.CancellationToken
    ): Promise<string>;
}

export interface ContextRequest {
    document: vscode.TextDocument;
    position: vscode.Position | vscode.Range;
    instruction: string;
    selectedCode: string;
}
```

**Aggregation:**
```typescript
async function getContext(
    request: ContextRequest,
    token: vscode.CancellationToken
): Promise<string> {
    // Call all providers in parallel
    const [historyContext, semanticContext, diagnosticsContext] = await Promise.all([
        this.historyProvider.getHistoryContext(
            request.document.uri,
            request.position instanceof vscode.Range ? request.position.start : request.position,
            3 // max edits
        ),
        this.semanticProvider.getSemanticContext(
            request.instruction,
            request.selectedCode,
            request.document,
            request.position instanceof vscode.Range ? request.position.start : request.position,
            3 // max chunks
        ),
        this.diagnosticsProvider.getDiagnosticsContext(
            request.document,
            request.position,
            5 // max diagnostics
        ),
    ]);

    // Combine contexts
    return this.combineContexts(historyContext, semanticContext, diagnosticsContext);
}
```

### FR-2: Token Budget Management (P0)
Ensure total context doesn't exceed token limits.

**Token Limits:**
- **Total context budget**: 2000 tokens (~8000 characters)
- **Reserve for instruction**: 500 tokens
- **Reserve for selected code**: 1000 tokens (varies)
- **Reserve for completion**: 1000 tokens
- **Available for context**: 2000 - instruction - selected code

**Approximation:**
```typescript
function estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

function applyTokenBudget(
    contexts: string[],
    maxTokens: number
): string[] {
    const truncated: string[] = [];
    let totalTokens = 0;

    for (const context of contexts) {
        const contextTokens = estimateTokens(context);

        if (totalTokens + contextTokens <= maxTokens) {
            // Fits budget: include entirely
            truncated.push(context);
            totalTokens += contextTokens;
        } else {
            // Exceeds budget: truncate proportionally
            const remaining = maxTokens - totalTokens;
            if (remaining > 100) { // Only include if >100 tokens left
                const ratio = remaining / contextTokens;
                const truncatedContext = this.truncateContext(context, ratio);
                truncated.push(truncatedContext);
                totalTokens += estimateTokens(truncatedContext);
            }
            break; // Stop adding more contexts
        }
    }

    return truncated;
}
```

### FR-3: Context Prioritization (P0)
Prioritize context sources by importance.

**Priority Order:**
1. **Diagnostics** (highest) - User likely wants to fix errors
2. **History** (high) - Recent changes show user intent
3. **Semantic** (medium) - Relevant code examples

**Implementation:**
```typescript
function combineContexts(
    historyContext: string,
    semanticContext: string,
    diagnosticsContext: string
): string {
    // Order by priority
    const ordered = [
        { name: 'diagnostics', content: diagnosticsContext, priority: 3 },
        { name: 'history', content: historyContext, priority: 2 },
        { name: 'semantic', content: semanticContext, priority: 1 },
    ];

    // Filter out empty contexts
    const nonEmpty = ordered
        .filter(ctx => ctx.content.trim().length > 0)
        .sort((a, b) => b.priority - a.priority); // Highest priority first

    // Apply token budget
    const config = this.configService.getConfig();
    const maxTokens = config['puku.inlineEdit.context.tokenBudget.maxContextTokens'] ?? 2000;

    const contents = nonEmpty.map(ctx => ctx.content);
    const budgeted = this.applyTokenBudget(contents, maxTokens);

    // Combine with separators
    return budgeted.join('\n---\n\n');
}
```

### FR-4: Context Truncation (P0)
Truncate individual contexts proportionally when over budget.

**Truncation Strategies:**
```typescript
function truncateContext(context: string, ratio: number): string {
    if (ratio >= 1.0) {
        return context; // No truncation needed
    }

    // Split into sections (## headers)
    const sections = context.split(/\n##\s+/);

    if (sections.length === 1) {
        // No sections: truncate text
        const targetLength = Math.floor(context.length * ratio);
        return context.substring(0, targetLength) + '\n\n... (truncated)';
    }

    // Multiple sections: keep header, truncate entries
    const header = sections[0];
    const entries = sections.slice(1);

    // Keep proportional number of entries
    const keepCount = Math.max(1, Math.floor(entries.length * ratio));
    const keptEntries = entries.slice(0, keepCount);

    return header + '\n## ' + keptEntries.join('\n## ') + '\n\n... (truncated)';
}
```

### FR-5: Parallel Execution with Timeout (P0)
Execute providers in parallel with timeout protection.

**Implementation:**
```typescript
async function getContextWithTimeout(
    request: ContextRequest,
    token: vscode.CancellationToken,
    timeoutMs: number = 500
): Promise<string> {
    try {
        // Race between context gathering and timeout
        const contextPromise = this.getContext(request, token);
        const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('Context timeout')), timeoutMs);
        });

        return await Promise.race([contextPromise, timeoutPromise]);
    } catch (error) {
        if (error.message === 'Context timeout') {
            console.warn('[ContextAggregator] Context gathering timed out');
            return ''; // Return empty on timeout
        }
        throw error;
    }
}
```

---

## API Design

### Full Implementation

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Context Aggregator
 *  Combines all context sources for inline edits
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IHistoryContextProvider } from './historyContextProvider';
import { ISemanticContextProvider } from './semanticContextProvider';
import { IDiagnosticsContextProvider } from './diagnosticsContextProvider';

export const IContextAggregator = createServiceIdentifier<IContextAggregator>('IContextAggregator');

export interface IContextAggregator {
    readonly _serviceBrand: undefined;

    getContext(
        request: ContextRequest,
        token: vscode.CancellationToken
    ): Promise<string>;
}

export interface ContextRequest {
    document: vscode.TextDocument;
    position: vscode.Position | vscode.Range;
    instruction: string;
    selectedCode: string;
}

export class ContextAggregator extends Disposable implements IContextAggregator {
    declare readonly _serviceBrand: undefined;

    constructor(
        @IHistoryContextProvider private readonly historyProvider: IHistoryContextProvider,
        @ISemanticContextProvider private readonly semanticProvider: ISemanticContextProvider,
        @IDiagnosticsContextProvider private readonly diagnosticsProvider: IDiagnosticsContextProvider,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();
    }

    async getContext(
        request: ContextRequest,
        token: vscode.CancellationToken
    ): Promise<string> {
        const config = this.configService.getConfig();
        const enabled = config['puku.inlineEdit.context.enabled'] ?? true;

        if (!enabled) {
            return '';
        }

        try {
            // Call all providers in parallel
            const position = request.position instanceof vscode.Range ?
                request.position.start : request.position;

            const [historyContext, semanticContext, diagnosticsContext] = await Promise.all([
                this.historyProvider.getHistoryContext(
                    request.document.uri,
                    position,
                    config['puku.inlineEdit.context.history.maxEdits'] ?? 3
                ),
                this.semanticProvider.getSemanticContext(
                    request.instruction,
                    request.selectedCode,
                    request.document,
                    position,
                    config['puku.inlineEdit.context.semantic.maxChunks'] ?? 3
                ),
                this.diagnosticsProvider.getDiagnosticsContext(
                    request.document,
                    request.position,
                    config['puku.inlineEdit.context.diagnostics.maxDiagnostics'] ?? 5
                ),
            ]);

            // Combine contexts with prioritization and token budget
            return this.combineContexts(historyContext, semanticContext, diagnosticsContext);

        } catch (error) {
            console.error('[ContextAggregator] Error:', error);
            return ''; // Return empty on error
        }
    }

    /**
     * Combine contexts with prioritization and token budget
     */
    private combineContexts(
        historyContext: string,
        semanticContext: string,
        diagnosticsContext: string
    ): string {
        // Order by priority (diagnostics > history > semantic)
        const ordered = [
            { name: 'diagnostics', content: diagnosticsContext, priority: 3 },
            { name: 'history', content: historyContext, priority: 2 },
            { name: 'semantic', content: semanticContext, priority: 1 },
        ];

        // Filter out empty contexts
        const nonEmpty = ordered
            .filter(ctx => ctx.content.trim().length > 0)
            .sort((a, b) => b.priority - a.priority);

        if (nonEmpty.length === 0) {
            return '';
        }

        // Apply token budget
        const config = this.configService.getConfig();
        const maxTokens = config['puku.inlineEdit.context.tokenBudget.maxContextTokens'] ?? 2000;

        const contents = nonEmpty.map(ctx => ctx.content);
        const budgeted = this.applyTokenBudget(contents, maxTokens);

        // Combine with separators
        return budgeted.join('\n---\n\n');
    }

    /**
     * Apply token budget to contexts
     */
    private applyTokenBudget(contexts: string[], maxTokens: number): string[] {
        const truncated: string[] = [];
        let totalTokens = 0;

        for (const context of contexts) {
            const contextTokens = this.estimateTokens(context);

            if (totalTokens + contextTokens <= maxTokens) {
                // Fits budget: include entirely
                truncated.push(context);
                totalTokens += contextTokens;
            } else {
                // Exceeds budget: truncate proportionally
                const remaining = maxTokens - totalTokens;
                if (remaining > 100) { // Only include if >100 tokens left
                    const ratio = remaining / contextTokens;
                    const truncatedContext = this.truncateContext(context, ratio);
                    truncated.push(truncatedContext);
                    totalTokens += this.estimateTokens(truncatedContext);
                }
                break; // Stop adding more contexts
            }
        }

        return truncated;
    }

    /**
     * Estimate tokens (rough approximation: 1 token ≈ 4 characters)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Truncate context proportionally
     */
    private truncateContext(context: string, ratio: number): string {
        if (ratio >= 1.0) {
            return context;
        }

        // Split into sections (## headers)
        const sections = context.split(/\n##\s+/);

        if (sections.length === 1) {
            // No sections: truncate text
            const targetLength = Math.floor(context.length * ratio);
            return context.substring(0, targetLength) + '\n\n... (truncated)';
        }

        // Multiple sections: keep header, truncate entries
        const header = sections[0];
        const entries = sections.slice(1);

        // Keep proportional number of entries
        const keepCount = Math.max(1, Math.floor(entries.length * ratio));
        const keptEntries = entries.slice(0, keepCount);

        return header + '\n## ' + keptEntries.join('\n## ') + '\n\n... (truncated)';
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| All providers return context | 3 contexts | Combined with separators |
| One provider empty | 2 contexts, 1 empty | Only 2 included |
| Over token budget | 3000 tokens total | Truncated to 2000 |
| Priority ordering | Diag+Hist+Sem | Diagnostics first |
| Empty budget | maxTokens=0 | Empty result |
| Proportional truncation | ratio=0.5 | Half of context |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Full workflow | All providers called in parallel |
| Timeout handling | Returns empty after timeout |
| Cancellation | Respects cancellation token |
| Configuration | Uses configured token budget |

---

## Example Output

### Input: 3 Context Sources

**Diagnostics**:
```markdown
## Diagnostics

**ERROR** [typescript] (line 1): Missing return type annotation.
```

**History**:
```markdown
## Recent Changes

**File**: `src/auth/login.ts` (2 minutes ago)
**Change**: Added error handling with try/catch block
```typescript
try { ... } catch (error) { ... }
```
```

**Semantic**:
```markdown
## Relevant Code from Workspace

**File**: `src/api/client.ts` (lines 42-52) - function: `apiRequest`
```typescript
async function apiRequest(endpoint: string): Promise<any> { ... }
```
```

### Output: Combined Context

```markdown
## Diagnostics

**ERROR** [typescript] (line 1): Missing return type annotation.

---

## Recent Changes

**File**: `src/auth/login.ts` (2 minutes ago)
**Change**: Added error handling with try/catch block
```typescript
try { ... } catch (error) { ... }
```

---

## Relevant Code from Workspace

**File**: `src/api/client.ts` (lines 42-52) - function: `apiRequest`
```typescript
async function apiRequest(endpoint: string): Promise<any> { ... }
```
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Provider calls (parallel) | <250ms | Slowest provider dominates |
| Token estimation | <5ms | Simple calculation |
| Truncation | <10ms | String operations |
| Combining | <5ms | String concatenation |
| **Total** | **<270ms** | End-to-end |

---

## Success Criteria

- [ ] Calls all providers in parallel
- [ ] Combines contexts with separators
- [ ] Prioritizes by importance
- [ ] Applies token budget limits
- [ ] Truncates proportionally when over budget
- [ ] Handles empty contexts gracefully
- [ ] Handles errors/timeouts
- [ ] Configuration support
- [ ] Unit tests (>80% coverage)
- [ ] Performance <300ms

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `IContextAggregator` interface
- [ ] Implement `ContextAggregator` class
- [ ] Add `getContext()` method (parallel calls)
- [ ] Add `combineContexts()` method
- [ ] Add `applyTokenBudget()` method
- [ ] Add `estimateTokens()` helper
- [ ] Add `truncateContext()` method
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests

---

## Configuration

```json
{
  "puku.inlineEdit.context.enabled": true,
  "puku.inlineEdit.context.tokenBudget": {
    "maxContextTokens": 2000,
    "reserveForInstruction": 500,
    "reserveForCompletion": 1000
  },
  "puku.inlineEdit.context.providers": {
    "history": { "enabled": true, "maxEdits": 3 },
    "semantic": { "enabled": true, "maxChunks": 3 },
    "diagnostics": { "enabled": true, "maxDiagnostics": 5 }
  }
}
```

---

## Related Documents

- `00-overview.md` - Project overview
- `02-history-context-provider.md` - History context (dependency)
- `03-semantic-context-provider.md` - Semantic context (dependency)
- `04-diagnostics-context-provider.md` - Diagnostics context (dependency)
- `06-prompt-integration.md` - Uses aggregated context in prompts

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 3 hours
**Dependencies**: All context providers (02, 03, 04)
**Owner**: TBD
