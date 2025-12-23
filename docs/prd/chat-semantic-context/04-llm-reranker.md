# LLM Re-Ranker - PRD

## Component Overview
**Purpose**: Use LLM to re-rank semantic search results for better precision
**Priority**: P1 (Enhancement - Week 2)
**Dependencies**: `PukuIndexingService`, `SemanticContext`
**File**: `src/chat/src/extension/context/node/llmReranker.ts`

---

## Problem

**Semantic search alone has limitations:**
- Returns results based on vector similarity (embeddings)
- Doesn't understand query intent deeply
- Can include irrelevant chunks with similar embeddings
- No understanding of what's actually useful for answering the question

**Example:**
```
User Query: "How does user authentication work?"

Semantic Search Results (top 5):
1. src/auth/login.ts (score: 0.85) ✅ Relevant
2. src/models/user.ts (score: 0.82) ⚠️ Partially relevant (User model)
3. src/auth/session.ts (score: 0.80) ✅ Relevant
4. src/utils/validation.ts (score: 0.78) ❌ Not relevant (general validation)
5. src/middleware/auth.ts (score: 0.76) ✅ Relevant
```

**With LLM Re-Ranking:**
- LLM understands the question intent
- Re-ranks results by actual relevance to answering the question
- Filters out noise (validation.ts)
- Returns only the most useful chunks

**Result after re-ranking:**
```
1. src/auth/login.ts ✅ (LLM: "Core login implementation")
2. src/auth/session.ts ✅ (LLM: "Session management for auth")
3. src/middleware/auth.ts ✅ (LLM: "Auth middleware for requests")
(Removed: user.ts, validation.ts)
```

**Copilot's data**: LLM re-ranking improves precision by **20-30%**

---

## How It Works

### Step 1: Get More Results from Semantic Search
Instead of requesting top 5, request top 10-20 chunks.

```typescript
// Before (no re-ranking)
const results = await indexingService.search(query, 5);

// After (with re-ranking)
const results = await indexingService.search(query, 15); // Get more candidates
```

### Step 2: Build Re-Ranking Prompt
Send chunks + user query to LLM, ask it to rank by relevance.

**Meta-Prompt:**
```typescript
const rerankPrompt = `Given the user's question and code snippets below, rank the snippets by relevance to answering the question.

User Question: "${userQuery}"

Code Snippets:
${chunks.map((chunk, i) => `
[${i}] File: ${chunk.file}
${chunk.content}
`).join('\n---\n')}

Respond with ONLY a JSON array of the most relevant snippet indices, ordered by relevance (most relevant first).
Include only snippets that are directly useful for answering the question.
Maximum 5 snippets.

Example response: [2, 0, 4]
`;
```

### Step 3: LLM Returns Ranking
LLM analyzes each chunk and returns indices of most relevant ones.

**Example LLM Response:**
```json
[2, 5, 8]
```

This means:
- Chunk 2 is most relevant
- Chunk 5 is second most relevant
- Chunk 8 is third most relevant
- Other chunks (0, 1, 3, 4, 6, 7, 9...) are not relevant

### Step 4: Reorder Results
Take original chunks and reorder based on LLM's ranking.

```typescript
const rankedChunks = llmIndices.map(idx => originalChunks[idx]);
// Returns [chunk2, chunk5, chunk8]
```

---

## Requirements

### FR-1: Re-Ranking Service (P1)
Create service to re-rank search results using LLM.

**API:**
```typescript
interface ILLMReranker {
    rerank(
        query: string,
        chunks: SearchResult[],
        maxResults: number,
        token: CancellationToken
    ): Promise<SearchResult[]>;
}
```

**Behavior:**
- Send chunks + query to LLM
- Parse JSON response (array of indices)
- Reorder chunks based on LLM ranking
- Return top N ranked chunks

### FR-2: Fallback to Semantic Ranking (P1)
If LLM re-ranking fails, fall back to original semantic search results.

**Scenarios:**
- LLM request fails (timeout, error)
- LLM response is invalid JSON
- LLM returns empty array
- Network error

**Fallback:** Use original semantic search ranking (by score)

### FR-3: Performance Optimization (P1)
Re-ranking should be fast enough for chat UX.

**Requirements:**
- Use fast LLM endpoint (`copilot-fast` or similar)
- Low temperature (0.1) for consistent results
- Max 200 tokens for response (JSON is compact)
- Timeout after 2 seconds

**Target:** <500ms re-ranking latency (p90)

### FR-4: Configuration (P1)
Allow enabling/disabling re-ranking via settings.

**Settings:**
```json
{
  "puku.chat.semanticContext.reranking.enabled": true,
  "puku.chat.semanticContext.reranking.candidateCount": 15,
  "puku.chat.semanticContext.reranking.timeout": 2000
}
```

---

## API Design

### LLMReranker Class

```typescript
export interface ILLMReranker {
    readonly _serviceBrand: undefined;

    /**
     * Re-rank search results using LLM
     */
    rerank(
        query: string,
        chunks: SearchResult[],
        maxResults: number,
        token: CancellationToken
    ): Promise<SearchResult[]>;
}

export class LLMReranker implements ILLMReranker {
    declare readonly _serviceBrand: undefined;

    constructor(
        @IEndpointProvider private readonly endpointProvider: IEndpointProvider,
        @ILogService private readonly logService: ILogService,
    ) {}

    async rerank(
        query: string,
        chunks: SearchResult[],
        maxResults: number,
        token: CancellationToken
    ): Promise<SearchResult[]> {
        if (chunks.length === 0) {
            return [];
        }

        try {
            // Get fast endpoint for re-ranking
            const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');

            // Build re-ranking prompt
            const prompt = this.buildRerankPrompt(query, chunks, maxResults);

            // Call LLM
            const result = await raceCancellation(
                endpoint.makeChatRequest(
                    'rerankContext',
                    prompt.messages,
                    async (text) => text,
                    token,
                    ChatLocation.Other,
                    undefined,
                    {
                        temperature: 0.1,
                        max_tokens: 200,
                    },
                    false,
                    {
                        messageId: generateUuid(),
                        messageSource: 'chat.rerank'
                    }
                ),
                token,
                2000 // 2 second timeout
            );

            if (result.type !== 'success') {
                this.logService.warn('[LLMReranker] Re-ranking failed, using original order');
                return chunks.slice(0, maxResults);
            }

            // Parse LLM response (JSON array of indices)
            const rankedIndices = this.parseRankingResponse(result.value);

            if (rankedIndices.length === 0) {
                this.logService.warn('[LLMReranker] No valid indices, using original order');
                return chunks.slice(0, maxResults);
            }

            // Reorder chunks based on LLM ranking
            const rankedChunks = rankedIndices
                .filter(idx => idx >= 0 && idx < chunks.length)
                .map(idx => chunks[idx])
                .slice(0, maxResults);

            this.logService.debug(`[LLMReranker] Re-ranked ${chunks.length} → ${rankedChunks.length} chunks`);
            return rankedChunks;

        } catch (error) {
            this.logService.error('[LLMReranker] Re-ranking error:', error);
            // Fallback to original order
            return chunks.slice(0, maxResults);
        }
    }

    private buildRerankPrompt(query: string, chunks: SearchResult[], maxResults: number) {
        const snippetsText = chunks.map((chunk, i) => {
            const filePath = vscode.workspace.asRelativePath(chunk.uri);
            return `[${i}] File: ${filePath} (lines ${chunk.lineStart}-${chunk.lineEnd})
${chunk.content.slice(0, 500)}${chunk.content.length > 500 ? '...' : ''}`;
        }).join('\n\n---\n\n');

        return {
            messages: [{
                role: 'system',
                content: 'You are a code search assistant. Rank code snippets by relevance to the user\'s question.'
            }, {
                role: 'user',
                content: `Given the user's question and code snippets below, rank the snippets by relevance.

User Question: "${query}"

Code Snippets:
${snippetsText}

Respond with ONLY a JSON array of the most relevant snippet indices, ordered by relevance (most relevant first).
Include only snippets directly useful for answering the question.
Maximum ${maxResults} snippets.

Example: [2, 0, 4]`
            }]
        };
    }

    private parseRankingResponse(response: string): number[] {
        try {
            // Extract JSON from response (may have markdown formatting)
            const jsonMatch = response.match(/\[[\d,\s]+\]/);
            if (!jsonMatch) {
                return [];
            }

            const indices = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(indices)) {
                return [];
            }

            return indices.filter(idx => typeof idx === 'number');

        } catch (error) {
            this.logService.error('[LLMReranker] Failed to parse ranking response:', error);
            return [];
        }
    }
}
```

---

## Integration with SemanticContext

### Modified SemanticContext.prepare()

```typescript
export class SemanticContext extends PromptElement<SemanticContextProps, SearchResult[]> {
    constructor(
        props: SemanticContextProps,
        @IPukuIndexingService private readonly indexingService: IPukuIndexingService,
        @ILLMReranker private readonly reranker: ILLMReranker,
        @IInstantiationService private readonly instantiationService: IInstantiationService,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super(props);
    }

    override async prepare(sizing: PromptSizing, progress, token): Promise<SearchResult[]> {
        if (this.indexingService.status !== PukuIndexingStatus.Ready) {
            return [];
        }

        const query = this.props.promptContext.query;
        if (!query || query.length < 3) {
            return [];
        }

        // Extract search query
        const extractor = this.instantiationService.createInstance(ChatQueryExtractor);
        const searchQuery = extractor.buildQuery(query);

        const maxChunks = this.props.maxChunks ?? 5;
        const minScore = this.props.minScore ?? 0.7;
        const rerankingEnabled = this.configService.getConfig(
            ConfigKey.Chat.SemanticContextRerankingEnabled,
            true
        );

        try {
            // Step 1: Get MORE candidates for re-ranking (3x desired results)
            const candidateCount = rerankingEnabled
                ? Math.min(maxChunks * 3, 15)  // Get 3x more candidates
                : maxChunks;                     // Or just what we need

            const results = await this.indexingService.search(
                searchQuery,
                candidateCount
            );

            // Filter by minimum score
            const filtered = results.filter(r => r.score >= minScore);

            if (filtered.length === 0) {
                return [];
            }

            // Step 2: Re-rank using LLM (if enabled)
            if (rerankingEnabled && filtered.length > maxChunks) {
                const reranked = await this.reranker.rerank(
                    query,  // Use original user query, not extracted keywords
                    filtered,
                    maxChunks,
                    token
                );
                return reranked;
            }

            // Step 3: Fallback to semantic ranking
            return filtered.slice(0, maxChunks);

        } catch (error) {
            console.error('[SemanticContext] Search failed:', error);
            return [];
        }
    }

    // render() stays the same...
}
```

---

## Performance Comparison

### Without Re-Ranking
```
Semantic Search: 200ms
Total: 200ms
Precision: 60-70% (vector similarity only)
```

### With Re-Ranking
```
Semantic Search: 200ms (15 candidates)
LLM Re-Ranking: 300-500ms
Total: 500-700ms
Precision: 80-90% (LLM-filtered)
```

**Trade-off:**
- +300-500ms latency
- +20-30% precision improvement
- **Worth it** for better answer quality

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Valid LLM response | `[2, 0, 4]` | Chunks reordered [chunk2, chunk0, chunk4] |
| Invalid JSON | `"2, 0, 4"` | Fallback to original order |
| Empty array | `[]` | Fallback to original order |
| Out of bounds indices | `[0, 99, 2]` | Filter invalid, return [chunk0, chunk2] |
| LLM timeout | 2s timeout | Fallback to original order |
| Network error | API failure | Fallback to original order |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Re-ranking enabled + valid results | Use re-ranked order |
| Re-ranking disabled | Use semantic order |
| Re-ranking fails | Graceful fallback to semantic order |
| Small result set (<5) | Skip re-ranking (not needed) |

---

## Example: Before vs After

### User Query: "How does user authentication work?"

### Before Re-Ranking (Semantic Search Only)
```
1. src/auth/login.ts (score: 0.85)
2. src/models/user.ts (score: 0.82) ← Not directly relevant
3. src/auth/session.ts (score: 0.80)
4. src/utils/validation.ts (score: 0.78) ← Not relevant
5. src/middleware/auth.ts (score: 0.76)
```

### After Re-Ranking (LLM Re-Ranked)
```
LLM Analysis:
- login.ts: ✅ Core authentication implementation
- session.ts: ✅ Session management for auth
- auth.ts: ✅ Auth middleware for requests
- user.ts: ❌ User model, not about authentication flow
- validation.ts: ❌ Generic validation utilities

Re-ranked Results:
1. src/auth/login.ts ← LLM: Most relevant
2. src/auth/session.ts ← LLM: Directly related
3. src/middleware/auth.ts ← LLM: Auth flow
(Removed: user.ts, validation.ts)
```

**Result:** User gets 3 highly relevant chunks instead of 5 mixed-quality chunks.

---

## Configuration

Add to `package.json`:

```json
{
  "configuration": {
    "properties": {
      "puku.chat.semanticContext.reranking.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Use LLM to re-rank search results for better relevance"
      },
      "puku.chat.semanticContext.reranking.candidateCount": {
        "type": "number",
        "default": 15,
        "minimum": 5,
        "maximum": 30,
        "description": "Number of candidates to fetch for re-ranking"
      },
      "puku.chat.semanticContext.reranking.timeout": {
        "type": "number",
        "default": 2000,
        "description": "Re-ranking timeout in milliseconds"
      }
    }
  }
}
```

---

## Success Criteria

- [ ] LLM re-ranking improves precision by 20%+ (measured via user feedback)
- [ ] Re-ranking completes in <500ms (p90)
- [ ] Graceful fallback when re-ranking fails
- [ ] Can be disabled via configuration
- [ ] No breaking changes to existing context system
- [ ] Unit tests cover all error scenarios
- [ ] Integration tests verify end-to-end flow

---

## Implementation Checklist

**Phase 2 (P1):**
- [ ] Create `ILLMReranker` interface
- [ ] Implement `LLMReranker` class
- [ ] Add `buildRerankPrompt()` method
- [ ] Add `parseRankingResponse()` method
- [ ] Integrate into `SemanticContext.prepare()`
- [ ] Add configuration settings
- [ ] Add fallback logic (error handling)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance testing (<500ms)
- [ ] Measure precision improvement

---

## Why Copilot Does This

From analysis of `vscode-copilot-chat` reference implementation:

**Copilot's Re-Ranking Flow:**
```typescript
// 1. Semantic search (get 128 candidates!)
const chunks = await workspaceChunkSearch.searchFileChunks({
    maxResults: 128  // Much more than needed
});

// 2. Build ranking prompt
const prompt = buildSearchPanelPrompt(query, chunks);

// 3. LLM re-ranks
const rankingResult = await endpoint.makeChatRequest('searchPanel', prompt);

// 4. Parse LLM response (JSON with file paths)
const rankedFiles = JSON.parse(rankingResult); // [{ file, query }, ...]

// 5. Combined ranking (semantic + LLM)
const finalChunks = combinedRanking(chunks, rankedFiles);
```

**Key Insight:**
- Semantic search is **recall-focused** (get everything possibly relevant)
- LLM re-ranking is **precision-focused** (filter to truly relevant)
- Combined approach gives **best of both worlds**

---

## Related Documents
- `00-overview.md` - Component overview
- `02-context-formatter.md` - Context formatter (calls re-ranker)
- `../../architecture/chat-semantic-context/system-overview.md` - Architecture

---

**Status**: Ready for Phase 2 Implementation
**Priority**: P1 (Enhancement)
**Estimated Effort**: 4-6 hours
**Expected Impact**: +20-30% precision improvement
**Owner**: TBD
