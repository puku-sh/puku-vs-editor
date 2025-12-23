# Chat Semantic Context - Architecture Documentation

## Quick Links

### PRD Documents (Product Requirements)
- **[00-overview.md](../../prd/chat-semantic-context/00-overview.md)** - Project overview and component breakdown
- **[01-query-extractor.md](../../prd/chat-semantic-context/01-query-extractor.md)** - Extract search keywords from messages
- **[02-context-formatter.md](../../prd/chat-semantic-context/02-context-formatter.md)** - Format search results as markdown
- **[03-prompt-integration.md](../../prd/chat-semantic-context/03-prompt-integration.md)** - Integrate into chat prompts

### Architecture Documents
- **[system-overview.md](./system-overview.md)** - High-level architecture and data flow
- **[integration-points.md](./integration-points.md)** - How components integrate with existing code *(to be created)*
- **[data-flow.md](./data-flow.md)** - Detailed data flow diagrams *(to be created)*

---

## Project Structure

```
docs/
├── prd/chat-semantic-context/          # Product Requirements
│   ├── 00-overview.md                  # Overview + component list
│   ├── 01-query-extractor.md           # Query extraction PRD
│   ├── 02-context-formatter.md         # Context formatting PRD
│   └── 03-prompt-integration.md        # Prompt integration PRD
│
└── architecture/chat-semantic-context/ # Architecture Docs
    ├── README.md                        # This file
    ├── system-overview.md               # High-level architecture
    ├── integration-points.md            # Integration details
    └── data-flow.md                     # Data flow diagrams
```

---

## Component Overview

### Phase 1: MVP (Week 1)

| Component | File | Status | Doc |
|-----------|------|--------|-----|
| Query Extractor | `src/chat/src/extension/context/node/chatQueryExtractor.ts` | Pending | [PRD](../../prd/chat-semantic-context/01-query-extractor.md) |
| Context Formatter | `src/chat/src/extension/prompts/node/panel/semanticContext.tsx` | Pending | [PRD](../../prd/chat-semantic-context/02-context-formatter.md) |
| Prompt Integration | `src/chat/src/extension/prompts/node/panel/panelChatBasePrompt.tsx` | Pending | [PRD](../../prd/chat-semantic-context/03-prompt-integration.md) |

### Phase 2: Enhancement (Week 2)

| Component | File | Status | Doc |
|-----------|------|--------|-----|
| LLM Re-Ranker | TBD | Future | TBD |
| Token Budget Manager | TBD | Future | TBD |

### Phase 3: Polish (Week 3)

| Component | File | Status | Doc |
|-----------|------|--------|-----|
| Context UI | TBD | Future | TBD |
| Telemetry | TBD | Future | TBD |

---

## Architecture Principles

### 1. Reuse Existing Infrastructure
- ✅ Leverage `PukuIndexingService` (90% already built)
- ✅ Use sqlite-vec for fast KNN search
- ✅ AST-based chunking already working

### 2. Non-Breaking Changes
- ✅ Configuration-gated (can disable)
- ✅ Graceful degradation (silent failures)
- ✅ Backwards compatible

### 3. Performance First
- ✅ <300ms search latency (p90)
- ✅ No additional memory overhead
- ✅ Async prepare, sync render (TSX pattern)

### 4. User Control
- ✅ Enable/disable via settings
- ✅ Configurable chunk count and threshold
- ✅ Future: UI indicators and manual override

---

## Key Decisions

### Why TSX Components?
- Consistent with existing prompt system
- Priority-based token budget management
- Async `prepare()` for I/O, sync `render()` for output

### Why Priority 850?
- After custom instructions (750) - user preferences first
- Before tool references (899) - context is implicit
- Before user query (900) - context should frame the question

### Why Silent Failures?
- Chat must always work, even without context
- Indexing may not be ready (acceptable state)
- Avoid confusing users with errors

### Why Simple Query Extraction (P0)?
- Regex-based keyword extraction is fast (<10ms)
- Good enough for MVP
- Can enhance with LLM in Phase 2 if needed

---

## Data Flow Summary

```
User Message → Query Extraction → Semantic Search → Filter → Format → Inject → LLM
     ↓              ↓                  ↓              ↓        ↓        ↓
"How does     "auth work"      SearchResult[]    Filter   Markdown  Prompt   Response
auth work?"                      (10 chunks)      (5)      Blocks    w/Context
```

---

## Performance Targets

| Metric | Target | Actual (Expected) |
|--------|--------|-------------------|
| Query extraction | <10ms | ~5ms (regex) |
| Semantic search | <300ms (p90) | ~200ms (sqlite-vec) |
| Context formatting | <50ms | ~20ms (string ops) |
| **Total overhead** | **<350ms** | **~225ms** |

---

## Testing Strategy

### Unit Tests
- Query extraction logic
- Context formatting
- Configuration handling
- Error scenarios

### Integration Tests
- End-to-end chat with context
- Disabled feature (backwards compat)
- Large codebase performance
- Indexing unavailable scenario

### Manual Testing
- Various question types
- Different codebase sizes
- Enable/disable feature
- Verify answer quality improvement

---

## Rollout Plan

### Week 1: MVP
- [ ] Implement 3 core components
- [ ] Unit tests
- [ ] Integration tests
- [ ] Internal dogfooding

### Week 2: Enhancement
- [ ] LLM re-ranking (if needed)
- [ ] Token budget management
- [ ] Performance optimization
- [ ] Beta testing

### Week 3: Polish
- [ ] UI indicators
- [ ] Telemetry
- [ ] Documentation
- [ ] Public release

---

## Success Criteria

- [ ] 70%+ of chats include automatic context
- [ ] 75%+ context relevance (user feedback)
- [ ] <300ms search latency (p90)
- [ ] No chat performance degradation
- [ ] Feature can be disabled
- [ ] Zero breaking changes

---

## References

### Code References
- `src/chat/src/extension/pukuIndexing/` - Existing indexing infrastructure
- `src/chat/src/extension/prompts/node/panel/` - Existing prompt components
- `src/vscode/reference/vscode-copilot-chat/` - Copilot reference implementation

### Documentation
- `../../CLAUDE.md` - Project overview
- `../../prd-chat-semantic-context.md` - Original comprehensive PRD
- GitHub Copilot Chat source analysis (in overview docs)

---

**Last Updated**: 2025-12-21
**Status**: Architecture Complete, Ready for Implementation
**Phase**: Planning → Implementation (Phase 1)
