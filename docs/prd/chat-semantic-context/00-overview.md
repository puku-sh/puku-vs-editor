# Chat Semantic Context - Overview

## Problem Statement
Puku Editor chat requires users to manually provide context via `#file` references, leading to generic responses instead of workspace-aware answers.

## Solution
Automatically inject relevant code context into chat prompts using existing `PukuIndexingService` infrastructure.

## Key Innovation
- **90% existing infrastructure**: Reuse `PukuIndexingService`, `PukuEmbeddingsCache`, sqlite-vec
- **Inspired by Copilot**: LLM re-ranking for 20-30% precision improvement
- **Modular design**: Split into independent, testable components

## Component Breakdown

| Component | Purpose | Priority | Document |
|-----------|---------|----------|----------|
| **Query Extractor** | Extract search keywords from user messages | P0 | `01-query-extractor.md` |
| **Context Formatter** | Format search results as code blocks | P0 | `02-context-formatter.md` |
| **Prompt Integration** | Inject context into chat prompts | P0 | `03-prompt-integration.md` |
| **LLM Re-Ranker** | Improve context relevance | P1 | `04-llm-reranker.md` |
| **Token Budget Manager** | Respect prompt token limits | P1 | `05-token-budget.md` |
| **Context UI** | Show context indicators in chat | P2 | `06-context-ui.md` |

## Implementation Phases

### Phase 1: MVP (Week 1)
- Query Extractor (simple keyword extraction)
- Context Formatter (basic TSX component)
- Prompt Integration (add to `PanelChatBasePrompt`)

### Phase 2: Enhancement (Week 2)
- LLM Re-Ranker (improve precision)
- Token Budget Manager (respect limits)

### Phase 3: Polish (Week 3)
- Context UI (indicators, expandable views)
- Telemetry and analytics

## Success Metrics
- **Adoption**: 70%+ of chats include automatic context
- **Relevance**: 75%+ retrieved chunks relevant
- **Performance**: <300ms context retrieval (p90)
- **Quality**: 40%+ improvement in answer accuracy

## Architecture Documents
- `../architecture/chat-semantic-context/system-overview.md` - High-level architecture
- `../architecture/chat-semantic-context/data-flow.md` - Data flow diagrams
- `../architecture/chat-semantic-context/integration-points.md` - Integration with existing code

## Related Documents
- `../../architecture/` - Existing architecture docs
- `../prd-chat-semantic-context.md` - Original comprehensive PRD
- `../../CLAUDE.md` - Project overview

---

**Status**: Planning
**Last Updated**: 2025-12-21
**Next Step**: Review individual component PRDs
