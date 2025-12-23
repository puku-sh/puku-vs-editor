# Product Requirements Document (PRD)
## Automatic Semantic Context for Puku Editor Chat
### Leveraging Existing Puku Indexing Infrastructure

---

## 1. Executive Summary

### 1.1 Problem Statement
Puku Editor chat currently requires users to manually provide context via `#file` references. This creates friction and leads to generic responses instead of workspace-aware answers.

### 1.2 Solution
**Leverage Puku's existing `PukuIndexingService`** to automatically inject relevant code context into chat prompts, similar to GitHub Copilot's @workspace and Cursor's automatic context approach.

**Key Advantage**: We already have 80% of the infrastructure built:
- ✅ SQLite-based embeddings cache (`PukuEmbeddingsCache`)
- ✅ AST-based chunking (`pukuASTChunker`)
- ✅ Semantic search (`PukuIndexingService.search()`)
- ✅ File watching and incremental indexing
- ✅ sqlite-vec for fast KNN search

**What we need to add**:
- Query extraction from user messages
- Context formatting for chat prompts
- Integration with existing chat prompt system
- Optional LLM re-ranking for better precision

### 1.3 Success Metrics
- **Adoption**: 70%+ of chat queries automatically include relevant context
- **Relevance**: 75%+ of retrieved chunks are relevant (user feedback)
- **Performance**: Context retrieval <300ms (p90)
- **Quality**: 40%+ improvement in workspace-specific answer accuracy

---

## 2. Existing Infrastructure Analysis

### 2.1 What We Have ✅

#### PukuIndexingService
```typescript
interface IPukuIndexingService {
    // Status events
    onDidChangeStatus: Event<PukuIndexingProgress>;
    onDidCompleteIndexing: Event<void>;
    status: PukuIndexingStatus;

    // Core methods
    search(query: string, limit?: number, languageId?: string): Promise<SearchResult[]>;
    computeEmbedding(text: string): Promise<number[] | null>;
    getIndexedFiles(): PukuIndexedFile[];
}
```

**SearchResult Structure:**
```typescript
interface SearchResult {
    uri: vscode.Uri;           // File location
    content: string;           // Code chunk text
    score: number;             // Similarity score (0-1)
    lineStart: number;         // Start line
    lineEnd: number;           // End line
    chunkType?: ChunkType;     // function, class, block, etc.
    symbolName?: string;       // Extracted symbol name
}
```

**Current Capabilities:**
- ✅ AST-based chunking (functions, classes, imports)
- ✅ Cosine similarity search with embeddings
- ✅ sqlite-vec KNN search (fast, 1024-dim vectors)
- ✅ File watcher with incremental updates
- ✅ Content hash-based cache invalidation
- ✅ Language filtering support

**Current Limitations:**
- ❌ No query optimization/rephrasing
- ❌ No LLM re-ranking
- ❌ Fixed limit (default: 5 chunks)
- ❌ Not integrated with chat prompts

### 2.2 What Copilot Has That We Don't

| Feature | Copilot | Puku (Current) | Priority |
|---------|---------|----------------|----------|
| Meta-prompt query rephrasing | ✅ | ❌ | P1 |
| LLM re-ranking | ✅ | ❌ | P1 |
| Hybrid search (embeddings + keywords) | ✅ | ❌ (embeddings only) | P2 |
| Token budget management | ✅ | ❌ | P1 |
| Progressive enhancement | ✅ | ❌ | P2 |
| Tool calling integration | ✅ | ❌ | P3 |
| Remote indexing fallback | ✅ | ❌ | P3 |

---

## 3. Technical Design

### 3.1 Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                  CHAT WITH SEMANTIC CONTEXT                 │
├────────────────────────────────────────────────────────────┤
│  1. User sends message                                      │
│     "How does authentication work?"                         │
│                    ↓                                         │
│  2. Query Extractor (NEW)                                   │
│     - Extract keywords from message                         │
│     - Optional: LLM meta-prompt for rephrasing             │
│     Result: "authentication login session user verify"      │
│                    ↓                                         │
│  3. PukuIndexingService (EXISTING)                         │
│     - search(query, limit=5, languageId)                   │
│     - Returns SearchResult[] with scores                    │
│                    ↓                                         │
│  4. Context Ranker (NEW - Optional P2)                      │
│     - LLM re-ranks chunks for relevance                     │
│     - Filters low-quality results                           │
│                    ↓                                         │
│  5. Context Formatter (NEW)                                 │
│     - Format as markdown code blocks                        │
│     - Include file paths and line numbers                   │
│     - Respect token budget                                  │
│                    ↓                                         │
│  6. Prompt Injection (NEW)                                  │
│     - Insert <SemanticContext> in PanelChatBasePrompt      │
│     - Position with priority 850                            │
│                    ↓                                         │
│  7. LLM receives enhanced prompt                            │
│     - User query + relevant code context                    │
│     - Generates workspace-aware response                    │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Component Design

#### A. Query Extractor (NEW)
**File**: `src/chat/src/extension/context/node/chatQueryExtractor.ts`

**Responsibilities:**
- Extract search query from user message
- Simple keyword extraction (P0)
- Optional LLM meta-prompt for rephrasing (P2)

**Implementation (P0 - Simple):**
```typescript
export class ChatQueryExtractor {
    // Extract keywords using regex (like Copilot's getKeywordsForContent)
    extractKeywords(message: string): string[] {
        const identifiers = new Set<string>();
        for (const match of message.matchAll(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g)) {
            if (match[0].length > 2) { // Skip short words
                identifiers.add(match[0].toLowerCase());
            }
        }
        return Array.from(identifiers);
    }

    // Build search query
    buildQuery(message: string): string {
        return this.extractKeywords(message).join(' ');
    }
}
```

**Implementation (P2 - Enhanced with LLM):**
```typescript
export class ChatQueryExtractor {
    async buildQueryWithLLM(message: string, endpoint: IChatEndpoint): Promise<string> {
        // Use LLM to rephrase query for better search
        const metaPrompt = `Extract search keywords from: "${message}"
Return only keywords, space-separated, no explanation.`;

        const result = await endpoint.makeChatRequest(...);
        return result.value;
    }
}
```

#### B. Context Formatter (NEW)
**File**: `src/chat/src/extension/prompts/node/panel/semanticContext.tsx`

**TSX Component:**
```tsx
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

    // Prepare phase: fetch search results
    override async prepare(sizing: PromptSizing, progress, token): Promise<SearchResult[]> {
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

        // Search using existing PukuIndexingService
        const results = await this.indexingService.search(
            searchQuery,
            this.props.maxChunks ?? 5
        );

        // Filter by minimum score
        const minScore = this.props.minScore ?? 0.7;
        return results.filter(r => r.score >= minScore);
    }

    // Render phase: format context
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

                    return <TextChunk key={i} priority={(this.props.priority ?? 850) + (1 - i / state.length)}>
                        **File**: `{filePath}` (lines {result.lineStart}-{result.lineEnd})
                        {result.symbolName && ` - ${result.chunkType}: \`${result.symbolName}\``}<br />
                        {createFencedCodeBlock(languageId, result.content)}<br /><br />
                    </TextChunk>;
                })}
            </TextChunk>
        </>;
    }
}
```

#### C. Prompt Integration (MODIFY EXISTING)
**File**: `src/chat/src/extension/prompts/node/panel/panelChatBasePrompt.tsx`

**Changes:**
```tsx
export class PanelChatBasePrompt extends PromptElement<PanelChatBasePromptProps> {
    async render(state: void, sizing: PromptSizing) {
        const { query, history, chatVariables } = this.props.promptContext;

        // Check if semantic context is enabled
        const semanticContextEnabled = this._configurationService.getConfig(
            'puku.chat.semanticContext.enabled',
            true
        );

        return (
            <>
                <SystemMessage priority={1000}>
                    You are an AI programming assistant.<br />
                    <CopilotIdentityRules />
                    <SafetyRules />
                    <Capabilities location={ChatLocation.Panel} />
                    <WorkspaceFoldersHint flexGrow={1} priority={800} />
                    {!this.envService.isSimulation() && <><br />The current date is {new Date().toLocaleDateString()}.</>}
                </SystemMessage>

                <HistoryWithInstructions flexGrow={1} historyPriority={700} passPriority history={history} currentTurnVars={chatVariables}>
                    <InstructionMessage priority={1000}>
                        Use Markdown formatting in your answers.<br />
                        <CodeBlockFormattingRules />
                        {/* ... existing instructions ... */}
                    </InstructionMessage>
                </HistoryWithInstructions>

                <UserMessage flexGrow={2}>
                    {useProjectLabels && <ProjectLabels flexGrow={1} priority={600} />}
                    <CustomInstructions flexGrow={1} priority={750} languageId={undefined} chatVariables={chatVariables} />

                    {/* NEW: Automatic semantic context */}
                    {semanticContextEnabled && (
                        <SemanticContext
                            flexGrow={2}
                            priority={850}
                            promptContext={this.props.promptContext}
                            maxChunks={this._configurationService.getConfig('puku.chat.semanticContext.maxChunks', 5)}
                            minScore={this._configurationService.getConfig('puku.chat.semanticContext.minSimilarity', 0.7)}
                        />
                    )}

                    <ChatToolReferences priority={899} flexGrow={2} promptContext={this.props.promptContext} />
                    <ChatVariablesAndQuery flexGrow={3} flexReserve='/3' priority={900} chatVariables={chatVariables} query={query} includeFilepath={true} />
                </UserMessage>
            </>
        );
    }
}
```

### 3.3 Configuration Settings

**Add to `src/chat/package.json`:**
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
        "description": "Maximum number of code chunks to include as context"
      },
      "puku.chat.semanticContext.minSimilarity": {
        "type": "number",
        "default": 0.7,
        "minimum": 0.0,
        "maximum": 1.0,
        "description": "Minimum similarity score for including a chunk (0.0-1.0)"
      },
      "puku.chat.semanticContext.showIndicator": {
        "type": "boolean",
        "default": true,
        "description": "Show indicator when context is included in chat"
      }
    }
  }
}
```

---

## 4. Implementation Phases

### Phase 1: MVP (Week 1)
**Goal**: Basic automatic context working end-to-end

**Tasks:**
- [ ] Create `ChatQueryExtractor` with simple keyword extraction
- [ ] Create `SemanticContext` TSX component
- [ ] Integrate into `PanelChatBasePrompt`
- [ ] Add configuration settings
- [ ] Basic unit tests

**Success Criteria:**
- Chat automatically includes 3-5 relevant code chunks
- Works when `PukuIndexingService.status === Ready`
- Gracefully degrades when indexing unavailable

### Phase 2: Enhancement (Week 2)
**Goal**: Improve quality and add polish

**Tasks:**
- [ ] Implement LLM-based query rephrasing (meta-prompt)
- [ ] Add LLM re-ranking for better precision
- [ ] Token budget management (respect prompt limits)
- [ ] Cache search results per conversation
- [ ] Performance optimization

**Success Criteria:**
- Context relevance improves by 20%+
- Search completes in <300ms (p90)
- No impact on chat latency

### Phase 3: UX Polish (Week 3)
**Goal**: User-facing improvements

**Tasks:**
- [ ] Add context indicator in chat UI ("📎 3 files used")
- [ ] Show which files were included (expandable)
- [ ] Add manual override (`/no-context` command)
- [ ] Telemetry and analytics
- [ ] User documentation

**Success Criteria:**
- Users understand when context is used
- Can see and control context inclusion
- Telemetry tracks usage and quality

---

## 5. Functional Requirements

### FR-1: Automatic Context Retrieval (P0)
- **Trigger**: User sends message in chat panel
- **Condition**: `PukuIndexingService.status === Ready`
- **Process**:
  1. Extract search query from message
  2. Call `PukuIndexingService.search(query, limit=5)`
  3. Filter results by min similarity score (default: 0.7)
  4. Format as code blocks with file paths
  5. Inject into chat prompt
- **Fallback**: If indexing not ready, proceed without context (silent)

### FR-2: Context Formatting (P0)
- **Format**:
  ```markdown
  ## Relevant Code Context

  **File**: `src/auth/login.ts` (lines 42-68) - function: `login`
  ```typescript
  export async function login(username: string, password: string) {
      // ... authentication logic
  }
  ```
  ```
- **Include**: File path, line numbers, symbol name, code content
- **Sorting**: By relevance score (highest first)

### FR-3: Configuration (P0)
- Enable/disable feature (`puku.chat.semanticContext.enabled`)
- Max chunks (`maxChunks`, default: 5)
- Min similarity threshold (`minSimilarity`, default: 0.7)

### FR-4: Smart Query Extraction (P1)
- Simple: Regex-based keyword extraction
- Enhanced (P2): LLM meta-prompt for query rephrasing

### FR-5: LLM Re-Ranking (P2)
- Send top 10-20 chunks to LLM
- Ask LLM to rank by relevance
- Return top 5 ranked chunks
- Improves precision significantly

### FR-6: Token Budget Management (P2)
- Track total prompt tokens
- Remove low-priority chunks if over budget
- Ensure context doesn't exceed limit

### FR-7: Context Visibility (P3)
- Show "📎 N files" indicator in chat
- Expandable to see which files
- Allow users to click to open files

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Search latency**: <300ms (p90)
- **Memory**: Use existing `PukuIndexingService` cache (no additional memory)
- **CPU**: Minimal impact (search is already indexed)

### 6.2 Reliability
- **Graceful degradation**: Works without context if indexing unavailable
- **Error handling**: Silent failures, don't block chat
- **Index freshness**: Leverage existing file watcher (auto-reindex on changes)

### 6.3 Compatibility
- **Reuses existing infrastructure**: `PukuIndexingService`, `PukuEmbeddingsCache`
- **No breaking changes**: Pure addition to existing chat
- **Backward compatible**: Can disable via settings

---

## 7. Success Metrics & Testing

### 7.1 Acceptance Criteria
- [ ] Semantic context automatically included in 70%+ of chats
- [ ] Context relevance score ≥0.75 average
- [ ] Search latency <300ms (p90)
- [ ] No increase in chat response time
- [ ] Feature can be disabled
- [ ] Works with existing `PukuIndexingService`

### 7.2 Test Cases

| Test Case | Expected Result |
|-----------|----------------|
| User asks "How does X work?" | Retrieves code chunks mentioning X |
| User asks generic question | No context (or minimal context) |
| Indexing not ready | Chat works, no context included |
| Large codebase (1000+ files) | Search completes <300ms |
| User disables feature | No semantic search performed |
| File changes | New context available after reindex |

---

## 8. Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **User Experience** | Must manually add `#file` | Automatic context |
| **Response Quality** | Generic | Workspace-specific |
| **Context Gathering** | Manual (user effort) | Automatic (AI effort) |
| **Search Time** | N/A | <300ms |
| **Code Reuse** | N/A | 90% existing code |
| **Infrastructure** | Puku indexing only for FIM | Used for chat too |

---

## 9. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Irrelevant context | Medium | Medium | Tune min similarity threshold, add LLM re-ranking (P2) |
| Search too slow | Medium | Low | Already optimized with sqlite-vec KNN |
| Indexing not ready | Low | Medium | Graceful degradation, silent fallback |
| Token budget exceeded | Medium | Low | Token budget management (P2) |
| User confusion | Low | Low | Clear indicator, documentation |

---

## 10. Dependencies & Prerequisites

### 10.1 Existing Infrastructure (✅ Already Built)
- ✅ `PukuIndexingService` - semantic search
- ✅ `PukuEmbeddingsCache` - SQLite storage
- ✅ `pukuASTChunker` - AST-based chunking
- ✅ sqlite-vec - fast KNN search
- ✅ File watcher - incremental updates

### 10.2 What We Need to Build (🔨 New)
- 🔨 `ChatQueryExtractor` - extract search query from user message
- 🔨 `SemanticContext` TSX component - format and inject context
- 🔨 Integration into `PanelChatBasePrompt`
- 🔨 Configuration settings

### 10.3 Optional Enhancements (P2/P3)
- ⏳ LLM meta-prompt for query rephrasing
- ⏳ LLM re-ranking for precision
- ⏳ Token budget management
- ⏳ Context visibility UI

---

## 11. Key Advantages Over Copilot

| Feature | Copilot | Puku |
|---------|---------|------|
| **Indexing Speed** | Slower (cloud + local) | Faster (local sqlite-vec) |
| **Privacy** | Sends data to cloud | 100% local |
| **Cost** | API calls for indexing | Free (local) |
| **Context Window** | 32k tokens | Configurable |
| **AST Awareness** | Yes (Tree-sitter) | Yes (Tree-sitter) |
| **Chunk Types** | Generic | Typed (function, class, etc.) |

---

## 12. Example Output

### User Query:
```
"How does user authentication work in this project?"
```

### Automatic Context Injected:
```markdown
## Relevant Code Context

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

**File**: `src/middleware/auth.ts` (lines 80-95) - function: `authMiddleware`
```typescript
export function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).send('Unauthorized');

    const session = await sessionManager.validate(token);
    if (!session) return res.status(401).send('Invalid session');

    req.user = session.user;
    next();
}
```
```

### LLM Response:
```
Based on your codebase, user authentication works through a three-part system:

1. **Login** (`src/auth/login.ts`): The `login()` function validates username/password
   against the database and uses bcrypt for password verification...

2. **Session Management** (`src/auth/session.ts`): The `SessionManager` creates secure
   session tokens using crypto.randomBytes()...

3. **Middleware** (`src/middleware/auth.ts`): The `authMiddleware()` validates Bearer
   tokens on incoming requests...

[Full workspace-aware explanation based on actual code]
```

---

## 13. How GitHub Copilot Does It

Based on analysis of VS Code Copilot Chat reference implementation:

### Copilot's Approach:

1. **Meta-Prompt for Query Optimization**
   - Sends user query to LLM with special meta-prompt
   - LLM returns rephrased query + keywords
   - Example: "How does auth work?" → "authentication login session user verification"

2. **Hybrid Search**
   - Embeddings search (primary)
   - TF-IDF keyword search (fallback)
   - GitHub Code Search remote API (cloud)
   - Full workspace scan (small repos)

3. **LLM Re-Ranking** ⭐ Key Innovation
   - Get top 128 chunks from semantic search
   - Send to LLM with user query
   - LLM ranks chunks by relevance (returns JSON)
   - Combine LLM ranking with semantic scores
   - **This improves precision by 20-30%**

4. **Combined Ranking**
   - Semantic search scores
   - LLM relevance judgments
   - Keyword match scores
   - Code structure analysis (Tree-sitter)

5. **Context Formatting**
   - Format as markdown code blocks
   - Include file paths and line numbers
   - Inject into chat prompt via TSX components
   - Token budget management with priorities

### What We Should Adopt:

| Copilot Feature | Puku Implementation | Priority |
|-----------------|---------------------|----------|
| Meta-prompt query rephrasing | Add in Phase 2 | P1 |
| LLM re-ranking | Add in Phase 2 | P1 |
| Token budget management | Add in Phase 2 | P1 |
| Hybrid search | Keep embeddings-only (simpler) | P2 |
| Tool calling | Future enhancement | P3 |

---

## 14. Timeline & Milestones

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| Week 1 | MVP | Basic automatic context working |
| Week 2 | Enhancement | LLM re-ranking, token budget |
| Week 3 | Polish | UI indicator, telemetry, docs |
| Week 4 | Beta | User testing and feedback |

---

## 15. References

### Code References:
- **Existing Infrastructure**:
  - `src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts`
  - `src/chat/src/extension/pukuIndexing/node/pukuEmbeddingsCache.ts`
  - `src/chat/src/extension/pukuIndexing/node/pukuASTChunker.ts`

- **Chat System**:
  - `src/chat/src/extension/prompts/node/panel/panelChatBasePrompt.tsx`
  - `src/chat/src/extension/conversation/vscode-node/chatParticipants.ts`
  - `src/chat/src/extension/context/node/resolvers/genericPanelIntentInvocation.ts`

- **Copilot Reference**:
  - `src/vscode/reference/vscode-copilot-chat/src/extension/tools/node/codebaseTool.tsx`
  - `src/vscode/reference/vscode-copilot-chat/src/extension/prompts/node/panel/workspace/workspaceContext.tsx`
  - `src/vscode/reference/vscode-copilot-chat/src/extension/workspaceSemanticSearch/node/semanticSearchTextSearchProvider.ts`

### Documentation:
- `docs/architecture/` - Architecture decisions
- `CLAUDE.md` - Project overview
- `docs/prd/prd-inline-completion-display-location.md` - Similar feature PRD

---

**Document Status**: Final v2.0 (Leveraging Existing Infrastructure)
**Author**: Puku AI Team
**Last Updated**: 2025-12-21
**Key Innovation**: Reuses 90% of existing `PukuIndexingService` infrastructure
**Next Steps**: Review and approve for Phase 1 implementation
