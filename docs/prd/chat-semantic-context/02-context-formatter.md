# Context Formatter - PRD

## Component Overview
**Purpose**: Format search results as markdown code blocks for chat prompts
**Priority**: P0 (MVP - Week 1)
**Dependencies**: `PukuIndexingService`, `ChatQueryExtractor`
**File**: `src/chat/src/extension/prompts/node/panel/semanticContext.tsx`

---

## Problem
`PukuIndexingService.search()` returns raw `SearchResult[]` objects. We need to:
1. Fetch search results based on user query
2. Filter by relevance score
3. Format as readable markdown code blocks
4. Inject into chat prompt with proper priorities

---

## Requirements

### FR-1: Search Execution (P0)
Query `PukuIndexingService` with extracted keywords.

**Process:**
1. Check if indexing service is ready (`status === PukuIndexingStatus.Ready`)
2. Extract query from user message
3. Call `indexingService.search(query, limit, languageId)`
4. Filter results by minimum similarity score

**Configuration:**
- `maxChunks`: Maximum chunks to include (default: 5, range: 1-20)
- `minScore`: Minimum similarity score (default: 0.7, range: 0.0-1.0)

### FR-2: Result Formatting (P0)
Format `SearchResult[]` as markdown code blocks.

**Format:**
```markdown
## Relevant Code Context

**File**: `src/auth/login.ts` (lines 42-68) - function: `login`
```typescript
export async function login(username: string, password: string) {
    // ... code ...
}
```

**File**: `src/auth/session.ts` (lines 15-35) - class: `SessionManager`
```typescript
export class SessionManager {
    // ... code ...
}
```
```

**Include:**
- File path (relative to workspace)
- Line numbers (start-end)
- Chunk type (function, class, block, etc.)
- Symbol name (if available)
- Code content with language-specific syntax highlighting

### FR-3: Priority Management (P0)
Assign TSX priorities for token budget management.

**Rules:**
- Base priority: 850 (between custom instructions and variables)
- First chunk: priority 850 + 1.0
- Last chunk: priority 850 + 0.0
- Linear interpolation for chunks in between

**Example (3 chunks):**
- Chunk 0: priority 851.0 (most relevant)
- Chunk 1: priority 850.5
- Chunk 2: priority 850.0 (least relevant)

### FR-4: Graceful Degradation (P0)
Handle cases where search fails or returns no results.

**Scenarios:**
- Indexing not ready → Return empty (silent)
- Query too short (<3 chars) → Return empty (silent)
- No results found → Return empty (silent)
- All results below threshold → Return empty (silent)

**Do NOT show errors to user** - chat should work normally without context.

---

## API Design

### TSX Component

```typescript
export interface SemanticContextProps extends BasePromptElementProps {
    promptContext: IBuildPromptContext;
    maxChunks?: number;
    minScore?: number;
}

export class SemanticContext extends PromptElement<SemanticContextProps, SearchResult[]> {
    constructor(
        props: SemanticContextProps,
        @IPukuIndexingService private readonly indexingService: IPukuIndexingService,
        @IInstantiationService private readonly instantiationService: IInstantiationService,
    ) {
        super(props);
    }

    /**
     * Prepare phase: fetch search results
     * Runs asynchronously before render
     */
    override async prepare(
        sizing: PromptSizing,
        progress: vscode.Progress<vscode.ChatResponsePart> | undefined,
        token: CancellationToken
    ): Promise<SearchResult[]> {
        // Check if indexing is ready
        if (this.indexingService.status !== PukuIndexingStatus.Ready) {
            return [];
        }

        const query = this.props.promptContext.query;
        if (!query || query.length < 3) {
            return [];
        }

        // Extract search keywords
        const extractor = this.instantiationService.createInstance(ChatQueryExtractor);
        const searchQuery = extractor.buildQuery(query);

        if (!searchQuery || searchQuery.trim().length === 0) {
            return [];
        }

        try {
            // Search using existing PukuIndexingService
            const results = await this.indexingService.search(
                searchQuery,
                this.props.maxChunks ?? 5
            );

            // Filter by minimum score
            const minScore = this.props.minScore ?? 0.7;
            return results.filter(r => r.score >= minScore);
        } catch (error) {
            console.error('[SemanticContext] Search failed:', error);
            return []; // Silent failure
        }
    }

    /**
     * Render phase: format context
     * Synchronous, outputs TSX
     */
    override render(state: SearchResult[], sizing: PromptSizing): PromptPiece {
        if (state.length === 0) {
            return undefined; // No context available
        }

        return <>
            <TextChunk priority={this.props.priority ?? 850}>
                ## Relevant Code Context<br />
                The following code snippets from your workspace may be relevant:<br /><br />

                {state.map((result, i) => {
                    const filePath = vscode.workspace.asRelativePath(result.uri);
                    const languageId = getLanguageId(result.uri);

                    // Calculate priority (highest for most relevant)
                    const chunkPriority = (this.props.priority ?? 850) + (1 - i / state.length);

                    return <TextChunk key={i} priority={chunkPriority}>
                        **File**: `{filePath}` (lines {result.lineStart}-{result.lineEnd})
                        {result.symbolName && result.chunkType &&
                            ` - ${result.chunkType}: \`${result.symbolName}\``}<br />
                        {createFencedCodeBlock(languageId, result.content)}<br /><br />
                    </TextChunk>;
                })}
            </TextChunk>
        </>;
    }
}
```

---

## Configuration Settings

Add to `src/chat/package.json`:

```json
{
  "configuration": {
    "properties": {
      "puku.chat.semanticContext.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Automatically include relevant code context in chat"
      },
      "puku.chat.semanticContext.maxChunks": {
        "type": "number",
        "default": 5,
        "minimum": 1,
        "maximum": 20,
        "description": "Maximum number of code chunks to include"
      },
      "puku.chat.semanticContext.minSimilarity": {
        "type": "number",
        "default": 0.7,
        "minimum": 0.0,
        "maximum": 1.0,
        "description": "Minimum similarity score (0.0-1.0)"
      }
    }
  }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Setup | Expected Result |
|-----------|-------|-----------------|
| Indexing ready + valid query | Status: Ready, Query: "auth" | Returns 5 chunks |
| Indexing not ready | Status: Idle | Returns `[]` |
| Query too short | Query: "ab" | Returns `[]` |
| No results above threshold | All scores < 0.7 | Returns `[]` |
| Partial results | 10 results, 3 above threshold | Returns 3 chunks |

### Integration Tests

| Test Case | Expected Output |
|-----------|----------------|
| User asks "How does X work?" | Context with 3-5 code chunks about X |
| User asks generic question | No context (or minimal) |
| Large codebase (1000+ files) | Search completes <300ms |
| File recently changed | New context reflects changes |

---

## Performance Requirements
- **Search latency**: <300ms (p90)
- **Memory**: Reuse `PukuIndexingService` cache (no additional memory)
- **Token usage**: Respect priority-based budget management

---

## Success Criteria
- [ ] Fetches relevant search results from `PukuIndexingService`
- [ ] Formats as readable markdown code blocks
- [ ] Includes file paths, line numbers, symbol names
- [ ] Assigns proper TSX priorities
- [ ] Gracefully handles failures (silent)
- [ ] <300ms search latency
- [ ] Unit and integration tests pass

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `SemanticContext` TSX component
- [ ] Implement `prepare()` method (search execution)
- [ ] Implement `render()` method (formatting)
- [ ] Add configuration settings to package.json
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Add error handling (silent failures)

---

## Example Output

**User Query:** "How does authentication work?"

**Rendered Context:**
```markdown
## Relevant Code Context
The following code snippets from your workspace may be relevant:

**File**: `src/auth/login.ts` (lines 42-68) - function: `login`
```typescript
export async function login(username: string, password: string) {
    const user = await db.users.findOne({ username });
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid password');

    return createSession(user.id);
}
```

**File**: `src/auth/session.ts` (lines 15-35) - class: `SessionManager`
```typescript
export class SessionManager {
    async createSession(userId: string): Promise<Session> {
        const token = crypto.randomBytes(32).toString('hex');
        return await db.sessions.create({ userId, token, expiresAt: ... });
    }
}
```
```

---

## Related Documents
- `01-query-extractor.md` - Query extraction (dependency)
- `03-prompt-integration.md` - Prompt integration (consumes this component)
- `../../architecture/chat-semantic-context/data-flow.md` - Data flow

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 4-6 hours
**Owner**: TBD
