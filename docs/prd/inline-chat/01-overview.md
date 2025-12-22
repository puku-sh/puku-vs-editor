# PRD: Puku Inline Chat - Overview

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024

---

## 1. Executive Summary

Implement a Copilot-style inline chat feature for Puku Editor that uses **Puku AI API** instead of GitHub Copilot. Users press **Ctrl+I** to open an inline input box, type instructions (e.g., "add error handling"), and receive AI-generated code edits with diff preview.

### Vision

Enable developers to use their own AI infrastructure for inline code editing, giving them full control over:
- API costs and quotas
- Model selection (GLM-4.6, DeepSeek, Claude, etc.)
- Data privacy and security
- Offline capabilities with local models

### Key Differentiators

| Feature | GitHub Copilot | Puku Inline Chat |
|---------|---------------|------------------|
| **API** | GitHub Copilot API | Puku API (your choice) |
| **Models** | GPT-4 only | GLM-4.6, DeepSeek, Claude, etc. |
| **Cost** | $10-19/month subscription | Pay-as-you-go (your API) |
| **Privacy** | Code sent to GitHub | Local-first (optional cloud) |
| **Semantic Search** | ❌ No | ✅ Yes (workspace-aware) |
| **Offline** | ❌ No | ✅ Yes (with local models) |
| **Customization** | Limited | Full control (prompts, models) |

---

## 2. Problem Statement

### Current Limitations

1. **Vendor Lock-in**: Inline chat currently uses `vscode.editorChat.start` which routes to GitHub Copilot API
2. **No API Key Control**: Users cannot use their own Puku API credentials
3. **Cost Management**: No visibility into usage or ability to set quotas
4. **Limited Model Choice**: Stuck with GPT-4, cannot experiment with other models
5. **Privacy Concerns**: Code must be sent to GitHub servers
6. **No Context Awareness**: Doesn't leverage workspace-specific patterns

### User Pain Points

> "I want to use my Puku API key for inline chat, not GitHub Copilot"

> "Why can't I choose which AI model to use?"

> "I need offline support with local models (Ollama)"

> "Copilot is too expensive for my team"

> "The AI doesn't understand my codebase patterns"

---

## 3. Goals & Non-Goals

### Goals (MVP)

✅ **G1**: Support 4 core intents: `/fix`, `/generate`, `/doc`, `/explain`
✅ **G2**: Use Puku API (`/v1/chat/completions`) with user's API key
✅ **G3**: Show inline diff preview exactly like Copilot
✅ **G4**: Integrate semantic search for context-aware code generation
✅ **G5**: Support streaming responses for real-time feedback
✅ **G6**: Handle diagnostics (errors/warnings) automatically

### Non-Goals (Future Versions)

❌ Multi-turn conversations (chat history) - v1.1
❌ Tool calling (read files, run commands) - v1.1
❌ Notebook support (Jupyter cells) - v1.2
❌ Review comments workflow - v1.2
❌ Batch edits across multiple files - v1.2

---

## 4. Success Metrics

### Key Performance Indicators (KPIs)

1. **Adoption**: 70%+ of Puku users try inline chat within first month
2. **Accuracy**: 80%+ acceptance rate for generated edits
3. **Semantic Search Impact**: 30%+ improvement in edit relevance vs. without
4. **Latency**: <2s time-to-first-token for streaming responses
5. **Cost Savings**: 50%+ cost reduction vs. GitHub Copilot (user feedback)

### User Satisfaction Metrics

- 📊 **NPS Score**: Target 40+ (Promoters - Detractors)
- ⭐ **Marketplace Rating**: 4.5+ stars
- 💬 **Issue Resolution**: <24h response time on critical bugs
- 📈 **Retention**: 80%+ monthly active users after 3 months

---

## 5. High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                  PUKU INLINE CHAT SYSTEM                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. UI Layer                                            │
│     - PukuInlineChatWidget (input box)                  │
│     - Diff preview renderer                             │
│                                                          │
│  2. Command Layer                                       │
│     - puku.inlineChat.start                            │
│     - Intent detection (/fix, /generate, etc.)         │
│                                                          │
│  3. Context Layer                                       │
│     - Selection context                                 │
│     - Diagnostics (errors/warnings)                    │
│     - Semantic search (workspace patterns)             │
│     - Language server context                          │
│                                                          │
│  4. Prompt Layer (TSX-based)                           │
│     - Intent-specific prompts                          │
│     - Context composition                              │
│     - Token budget management                          │
│                                                          │
│  5. API Layer                                           │
│     - Puku API client                                  │
│     - Streaming response handler                       │
│     - Error handling & retries                         │
│                                                          │
│  6. Response Processing                                 │
│     - Code block extraction                            │
│     - Diff generation                                  │
│     - Edit application                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

Each layer has dedicated PRD:

1. **[UI & UX](./02-ui-ux.md)** - Widget, diff preview, keybindings
2. **[Context Gathering](./03-context-gathering.md)** - Selection, diagnostics, semantic search
3. **[Prompt Engineering](./04-prompt-engineering.md)** - TSX prompts, intent handling
4. **[API Integration](./05-api-integration.md)** - Puku API client, streaming
5. **[Semantic Search](./06-semantic-search.md)** - Workspace-aware context
6. **[Response Processing](./07-response-processing.md)** - Code extraction, diff application

---

## 6. Implementation Timeline

### Phase 1: Foundation (Week 1)
- Core handler infrastructure
- API client with Puku endpoint
- Basic prompt templates
- **Deliverable**: Can make API calls and get responses

### Phase 2: Context & Search (Week 1-2)
- Semantic search integration
- Context gathering (selection, diagnostics)
- Prompt enhancement with search results
- **Deliverable**: Context-aware completions

### Phase 3: UI Integration (Week 2)
- Update commands to use Puku handler
- Diff preview implementation
- Accept/reject workflow
- **Deliverable**: Full user flow working

### Phase 4: Polish & Testing (Week 3)
- Unit tests (80%+ coverage)
- E2E tests for each intent
- Performance optimization
- **Deliverable**: Production-ready release

---

## 7. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Semantic search slows requests** | High | High | Cache results, limit to 3 chunks, make optional |
| **Poor quality without context** | Medium | Medium | Make semantic search toggleable in settings |
| **API rate limits** | Medium | Medium | Implement exponential backoff, clear error messages |
| **Model hallucinations** | Low | Low | Use temperature=0.7, validate syntax before applying |
| **Privacy concerns** | Low | Medium | Document that semantic search is local-only |

---

## 8. Dependencies

### Internal Dependencies
- ✅ Puku API endpoint (`/v1/chat/completions`) - Already deployed
- ✅ Puku authentication service - Already implemented
- ✅ Semantic search indexing - Already implemented
- ❌ TSX prompt infrastructure - Needs setup

### External Dependencies
- VS Code API: `vscode.WorkspaceEdit` for diff preview
- Puku backend: Streaming chat completions endpoint
- Models: GLM-4.6, DeepSeek, Claude (via Puku API)

---

## 9. Open Questions

1. **Should we support multi-turn conversations in MVP?**
   - **Decision Needed By**: Week 1
   - **Options**: Yes (complex), No (defer to v1.1)
   - **Recommendation**: No - keep MVP focused

2. **How many semantic search results to include?**
   - **Decision Needed By**: Week 1
   - **Options**: 2, 3, 5 chunks
   - **Recommendation**: 3 (balances context vs. token usage)

3. **Should semantic search be enabled by default?**
   - **Decision Needed By**: Week 2
   - **Options**: Yes (better quality), No (faster)
   - **Recommendation**: Yes with toggle in settings

---

## 10. References

### Related Documents
- [UI & UX PRD](./02-ui-ux.md)
- [Context Gathering PRD](./03-context-gathering.md)
- [Prompt Engineering PRD](./04-prompt-engineering.md)
- [API Integration PRD](./05-api-integration.md)
- [Semantic Search PRD](./06-semantic-search.md)
- [Response Processing PRD](./07-response-processing.md)

### External Links
- Copilot Reference: `puku-editor/reference/vscode-copilot-chat/src/extension/inlineChat/`
- Puku API Docs: https://docs.puku.ai/api/chat-completions
- VS Code API: https://code.visualstudio.com/api/references/vscode-api

---

**Approval Sign-Off:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Manager | ___________ | ___________ | ______ |
| Engineering Lead | ___________ | ___________ | ______ |
| Design Lead | ___________ | ___________ | ______ |
