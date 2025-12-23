# Chat Semantic Context - System Overview

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ "How does authentication work?"
                     ↓
┌──────────────────────────────────────────────────────────────┐
│              CHAT REQUEST HANDLER                             │
│  (chatParticipants.ts → ChatParticipantRequestHandler)       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Build prompt context
                     ↓
┌──────────────────────────────────────────────────────────────┐
│              PANEL CHAT BASE PROMPT                           │
│            (panelChatBasePrompt.tsx)                         │
│                                                               │
│  1. System Message (priority: 1000)                          │
│  2. History + Instructions (priority: 700-1000)              │
│  3. User Message:                                             │
│     ├─ Custom Instructions (priority: 750)                   │
│     ├─ [NEW] Semantic Context (priority: 850) ◄────┐        │
│     ├─ Tool References (priority: 899)              │        │
│     └─ User Query + Variables (priority: 900)       │        │
└────────────────────┬─────────────────────────────│──┘        │
                     │                              │           │
                     │ Render prompt               │           │
                     ↓                              │           │
┌──────────────────────────────────────────────────┼───────────┤
│              SEMANTIC CONTEXT COMPONENT           │           │
│               (semanticContext.tsx)               │           │
│                                                   │           │
│  prepare() phase:                                 │           │
│  ┌──────────────────────────────────────────┐   │           │
│  │ 1. Check indexing status                 │   │           │
│  │ 2. Extract query ─────────┐              │   │           │
│  │ 3. Search index           │              │   │           │
│  │ 4. Filter by score        │              │   │           │
│  └───────────────────────────┼──────────────┘   │           │
│                               │                   │           │
│  render() phase:              │                   │           │
│  ┌──────────────────────────┼───────────────┐   │           │
│  │ 1. Format as markdown    │               │   │           │
│  │ 2. Add file paths        │               │   │           │
│  │ 3. Set priorities        │               │   │           │
│  └──────────────────────────────────────────┘   │           │
└────────────────────┬──────────────────┬──────────┘           │
                     │                   │                      │
                     │                   │ Extract keywords     │
         ┌───────────┴──────────┐       │                      │
         │                       │       ↓                      │
         │                   ┌───┴───────────────────┐         │
         │                   │  QUERY EXTRACTOR      │         │
         │                   │ (chatQueryExtractor)  │         │
         │                   │                        │         │
         │                   │  buildQuery(message)   │         │
         │                   │  → "auth login user"   │         │
         │                   └────────────────────────┘         │
         │                                                       │
         │ Search workspace                                     │
         ↓                                                       │
┌──────────────────────────────────────────────────────────────┤
│         PUKU INDEXING SERVICE (EXISTING)                      │
│          (pukuIndexingService.ts)                             │
│                                                               │
│  search(query, limit, languageId): Promise<SearchResult[]>   │
│  ├─ Compute query embedding                                  │
│  ├─ KNN search via sqlite-vec                                │
│  ├─ Return top N chunks with scores                          │
│  └─ Include: uri, content, score, lines, chunkType, symbol   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Return search results
                     ↓
┌──────────────────────────────────────────────────────────────┐
│         PUKU EMBEDDINGS CACHE (EXISTING)                      │
│          (pukuEmbeddingsCache.ts)                             │
│                                                               │
│  SQLite Database: .puku/puku-embeddings.db                   │
│  ├─ Files table (uri, hash, lastIndexed)                    │
│  ├─ Chunks table (text, lines, embedding[1024])             │
│  └─ sqlite-vec extension (KNN search)                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Flow

### 1. User Sends Chat Message

**Entry Point:** User types message in chat panel
**Handler:** `ChatParticipantRequestHandler.handle()`
**Output:** `IBuildPromptContext` with user query

### 2. Prompt Building

**Component:** `PanelChatBasePrompt.render()`
**Decision:** Check if `puku.chat.semanticContext.enabled === true`
**Action:** Include `<SemanticContext>` component if enabled

### 3. Query Extraction

**Component:** `ChatQueryExtractor.buildQuery()`
**Input:** User message (e.g., "How does authentication work?")
**Process:**
1. Extract identifiers via regex
2. Filter stop words
3. Join into search query
**Output:** Search query string (e.g., "authentication work")

### 4. Semantic Search

**Component:** `PukuIndexingService.search()`
**Input:** Query string, limit (default: 5)
**Process:**
1. Compute embedding for query
2. KNN search in sqlite-vec
3. Cosine similarity scoring
4. Return top N chunks
**Output:** `SearchResult[]` with scores

### 5. Result Filtering

**Component:** `SemanticContext.prepare()`
**Input:** Raw search results
**Filter:** `score >= minSimilarity` (default: 0.7)
**Output:** Filtered `SearchResult[]`

### 6. Context Formatting

**Component:** `SemanticContext.render()`
**Input:** Filtered results
**Process:**
1. Format as markdown code blocks
2. Add file paths, line numbers, symbols
3. Assign TSX priorities
**Output:** TSX elements for prompt

### 7. Prompt Rendering

**Component:** `PromptRenderer`
**Input:** Complete TSX tree
**Process:**
1. Flatten TSX components
2. Apply token budget (priority-based)
3. Convert to LLM messages
**Output:** Final prompt for LLM

### 8. LLM Response

**Input:** Enhanced prompt with context
**Output:** Workspace-aware response

---

## Data Flow

```
User Message
    ↓
IBuildPromptContext { query, history, chatVariables }
    ↓
PanelChatBasePrompt.render()
    ├─ System Message
    ├─ History + Instructions
    └─ User Message
        ├─ Custom Instructions
        ├─ Semantic Context ← NEW
        │   ↓
        │   ChatQueryExtractor.buildQuery()
        │   ↓
        │   Search Query String
        │   ↓
        │   PukuIndexingService.search()
        │   ↓
        │   SearchResult[] (raw)
        │   ↓
        │   Filter by score
        │   ↓
        │   SearchResult[] (filtered)
        │   ↓
        │   Format as TSX
        │   ↓
        │   <TextChunk priority={850}>
        │       ## Relevant Code Context
        │       [Code blocks...]
        │   </TextChunk>
        │
        ├─ Tool References
        └─ User Query + Variables
    ↓
Rendered Prompt Messages
    ↓
LLM API Request
    ↓
LLM Response
```

---

## Key Design Decisions

### 1. Reuse Existing Infrastructure ✅
**Decision:** Use `PukuIndexingService` instead of building new search
**Rationale:**
- Already has embeddings, chunking, sqlite-vec
- Proven performance (<300ms searches)
- No additional memory/storage needed

### 2. TSX Component Architecture ✅
**Decision:** Implement as TSX `PromptElement`
**Rationale:**
- Consistent with existing prompt system
- Priority-based token budget management
- Async `prepare()` + sync `render()` pattern

### 3. Priority Positioning ✅
**Decision:** Priority 850 (between custom instructions and tool refs)
**Rationale:**
- Context should come before user query for better understanding
- But after custom instructions (user preferences first)
- Before tool references (context is implicit, tools are explicit)

### 4. Graceful Degradation ✅
**Decision:** Silent failures, no user-facing errors
**Rationale:**
- Chat should always work, even without context
- Indexing may not be ready (acceptable)
- Avoid confusing error messages

### 5. Configuration-First ✅
**Decision:** Feature controlled by settings
**Rationale:**
- Users can opt-out if not desired
- Easy to A/B test
- No breaking changes

---

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Query extraction | <10ms | Regex-based, simple |
| Semantic search | <300ms (p90) | sqlite-vec KNN, indexed |
| Context formatting | <50ms | String manipulation |
| **Total overhead** | **<350ms** | Acceptable for chat |

**Memory:**
- No additional memory (reuses indexing cache)
- Temporary: ~100KB for search results

**CPU:**
- Minimal (search is pre-indexed)
- Query extraction is lightweight

---

## Scalability

### Small Codebase (<100 files)
- Search: <50ms
- Memory: <10MB cache

### Medium Codebase (100-1000 files)
- Search: <200ms
- Memory: <100MB cache

### Large Codebase (1000+ files)
- Search: <500ms
- Memory: <500MB cache
- Still acceptable for chat use case

---

## Error Handling

### Indexing Not Ready
- **Behavior:** Return empty context (silent)
- **UX:** Chat works normally, no context included

### Search Timeout
- **Behavior:** Return empty after 5s timeout
- **UX:** Chat continues, log warning

### Parse Errors
- **Behavior:** Catch exceptions, return empty
- **UX:** Silent failure, chat unaffected

### Invalid Configuration
- **Behavior:** Use defaults
- **UX:** No errors, sensible fallbacks

---

## Security Considerations

### File Access
- **Respect:** `.gitignore`, `.copilotignore`
- **Exclude:** Credentials, secrets, `.env` files
- **Already handled by:** `PukuIndexingService`

### Privacy
- **All local:** No data sent to cloud
- **User control:** Can disable feature
- **Transparent:** Can see which files used (future: UI indicator)

---

## Future Enhancements

### Phase 2 (P1)
- LLM re-ranking for better precision
- Token budget management
- Conversation-scoped caching

### Phase 3 (P2)
- UI indicators ("📎 3 files used")
- Expandable context preview
- Manual override commands

### Phase 4 (P3)
- Tool calling integration
- Multi-turn conversation context
- Hybrid search (embeddings + keywords)

---

## Related Documents
- `../prd/chat-semantic-context/00-overview.md` - Component overview
- `data-flow.md` - Detailed data flow diagrams
- `integration-points.md` - Integration with existing code

---

**Status**: Architecture Complete
**Last Updated**: 2025-12-21
**Next Step**: Begin Phase 1 implementation
