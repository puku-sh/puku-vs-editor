# Inline Semantic Context - Overview

## Project Overview

**Goal**: Enhance inline completions (FIM) with semantic search-based context to provide more accurate and workspace-aware code suggestions, similar to GitHub Copilot's context provider system.

**Current State**: Puku Editor already has basic semantic context for FIM via `PukuSemanticContextProvider`, but it can be significantly enhanced by following Copilot's architecture patterns.

**Target State**: Implement a comprehensive context provider system for inline completions that matches Copilot's capabilities:
- Multiple specialized context providers (imports, snippets, diagnostics, etc.)
- Priority-based context resolution
- Token budget management
- Telemetry and performance tracking
- Configurable and extensible

---

## Architecture Comparison

### Current Puku Implementation

```
PukuInlineCompletionProvider
├── Import context (3 files max)
├── Semantic search (2 chunks, manual integration)
└── Comment-based completion flow
```

**Key Files:**
- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` - Main FIM provider
- `src/chat/src/extension/pukuIndexing/vscode-node/pukuSemanticContextProvider.ts` - Basic semantic context
- `src/chat/src/extension/pukuai/vscode-node/flows/semanticSearch.ts` - Semantic search flow

**Current Limitations:**
- ❌ Hardcoded context gathering (not extensible)
- ❌ No priority-based context selection
- ❌ No token budget management for context
- ❌ Limited telemetry
- ❌ Manual integration in completion provider

### Copilot's Architecture (Reference)

```
Completions Core
├── ICompletionsContextProviderRegistryService
│   ├── CoreContextProviderRegistry
│   ├── Multiple providers (semantic, diagnostics, imports, etc.)
│   ├── Match score calculation
│   └── Priority-based resolution
├── ICompletionsPromptFactoryService
│   ├── Token budget management
│   ├── Context snippets inclusion
│   └── Prompt assembly
└── ContextProvider API
    ├── CodeSnippet
    ├── Diagnostic
    ├── ImportSource
    └── Custom context items
```

**Reference Files:**
- `src/vscode/reference/vscode-copilot-chat/src/extension/completions-core/vscode-node/lib/src/prompt/contextProviderRegistry.ts`
- `src/vscode/reference/vscode-copilot-chat/src/extension/completions-core/vscode-node/lib/src/prompt/prompt.ts`
- `src/vscode/reference/vscode-copilot-chat/src/platform/languageContextProvider/common/languageContextProviderService.ts`

**Key Insights:**
- ✅ Extensible context provider registration
- ✅ Match score + priority-based selection
- ✅ Separate context resolution from prompt assembly
- ✅ Rich telemetry for each provider
- ✅ Token budget management built-in

---

## Component Breakdown

### Phase 1: Foundation (P0 - MVP)
**Goal**: Implement basic context provider infrastructure

| # | Component | Description | File | Effort |
|---|-----------|-------------|------|--------|
| 1 | Context Provider API | Define interfaces for context providers | `contextProviderApi.ts` | 2h |
| 2 | Semantic Context Provider | Refactor existing semantic search | `semanticContextProvider.ts` | 3h |
| 3 | Import Context Provider | Extract import gathering logic | `importContextProvider.ts` | 2h |
| 4 | Context Registry | Provider registration and matching | `contextProviderRegistry.ts` | 4h |
| 5 | Prompt Integration | Integrate context into FIM prompts | `pukuInlineCompletionProvider.ts` | 3h |

**Total Effort**: 14 hours (~2 days)

### Phase 2: Enhancement (P1)
**Goal**: Add advanced features matching Copilot

| # | Component | Description | File | Effort |
|---|-----------|-------------|------|--------|
| 6 | Token Budget Manager | Smart context truncation | `tokenBudgetManager.ts` | 3h |
| 7 | Diagnostics Provider | Include errors/warnings context | `diagnosticsContextProvider.ts` | 2h |
| 8 | Snippet Priority System | Rank snippets by relevance | `snippetPriority.ts` | 3h |
| 9 | Telemetry Integration | Track provider performance | `providerTelemetry.ts` | 2h |

**Total Effort**: 10 hours (~1.5 days)

### Phase 3: Polish (P2)
**Goal**: Configuration and optimization

| # | Component | Description | File | Effort |
|---|-----------|-------------|------|--------|
| 10 | Configuration UI | Settings for context providers | `package.json` | 2h |
| 11 | Performance Optimization | Caching and parallel resolution | Various | 4h |
| 12 | Language-Specific Providers | TypeScript, Python, etc. | `languageProviders/` | 6h |

**Total Effort**: 12 hours (~2 days)

---

## Detailed Component Docs

### Phase 1 (MVP)

1. **[Context Provider API](./01-context-provider-api.md)** - Core interfaces and types
2. **[Semantic Context Provider](./02-semantic-context-provider.md)** - Enhanced semantic search
3. **[Import Context Provider](./03-import-context-provider.md)** - Extract and register import logic
4. **[Context Registry](./04-context-registry.md)** - Provider registration and resolution
5. **[Prompt Integration](./05-prompt-integration.md)** - FIM prompt assembly

### Phase 2 (Enhancement)

6. **[Token Budget Manager](./06-token-budget.md)** - Smart context truncation
7. **[Diagnostics Provider](./07-diagnostics-provider.md)** - Error/warning context
8. **[Snippet Priority](./08-snippet-priority.md)** - Relevance ranking
9. **[Telemetry](./09-telemetry.md)** - Performance tracking

### Phase 3 (Polish)

10. **[Configuration](./10-configuration.md)** - User settings
11. **[Performance](./11-performance.md)** - Optimization strategies
12. **[Language Providers](./12-language-providers.md)** - Language-specific context

---

## Architecture Overview

### New Architecture (Target)

```
┌─────────────────────────────────────────────────────────────┐
│                  PUKU INLINE COMPLETIONS                     │
├─────────────────────────────────────────────────────────────┤
│  PukuInlineCompletionProvider                                │
│  ├── Request FIM completion                                  │
│  └── Delegate to PukuCompletionContext                      │
│                                                               │
│  PukuCompletionContext                                       │
│  ├── IContextProviderRegistry                               │
│  │   ├── Register providers                                 │
│  │   ├── Match providers (language, document)              │
│  │   └── Resolve context (parallel, with timeout)          │
│  ├── ITokenBudgetManager                                    │
│  │   ├── Calculate available tokens                        │
│  │   └── Truncate context to fit budget                    │
│  └── Assemble FIM prompt                                    │
│                                                               │
│  Context Providers                                           │
│  ├── SemanticContextProvider                                │
│  │   ├── PukuIndexingService.search()                      │
│  │   └── Returns CodeSnippet[]                             │
│  ├── ImportContextProvider                                  │
│  │   ├── Extract imports from AST                          │
│  │   └── Returns ImportSource[]                            │
│  ├── DiagnosticsContextProvider                            │
│  │   ├── vscode.languages.getDiagnostics()                │
│  │   └── Returns Diagnostic[]                              │
│  └── [Future] Custom providers...                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Types → FIM Request
    ↓
PukuInlineCompletionProvider.provideInlineCompletionItems()
    ↓
PukuCompletionContext.getContext()
    ├─→ Match providers by language/selector
    ├─→ Resolve all matched providers (parallel)
    │   ├─→ SemanticContextProvider.resolve()
    │   ├─→ ImportContextProvider.resolve()
    │   └─→ DiagnosticsContextProvider.resolve()
    ├─→ Apply token budget (truncate if needed)
    └─→ Return context items
    ↓
Assemble FIM prompt:
    {
        prompt: prefix,
        suffix: suffix,
        context: [
            "// From src/utils/helper.ts\nfunction helper() {...}",
            "// Imports: lodash, react",
            "// Error at line 42: Type mismatch"
        ]
    }
    ↓
Send to API → Get completion
```

---

## Key Design Decisions

### 1. Separate Context Resolution from FIM Provider ✅
**Decision**: Extract context gathering into dedicated service
**Rationale**:
- Single Responsibility Principle
- Easier to test and extend
- Matches Copilot's architecture

### 2. Provider Registry Pattern ✅
**Decision**: Use registry for provider management
**Rationale**:
- Extensible (add providers without modifying core)
- Language-specific providers (TypeScript, Python, etc.)
- Easy to enable/disable providers

### 3. Match Score + Priorities ✅
**Decision**: Rank providers by match score and resolve by priority
**Rationale**:
- Skip irrelevant providers (e.g., TypeScript provider for Python files)
- High-priority providers resolved first
- Better performance (parallel resolution of matched only)

### 4. Token Budget Management ✅
**Decision**: Enforce token limits on context
**Rationale**:
- Models have context limits (e.g., 8k, 16k, 32k)
- Need budget for completion output
- Avoid truncated prompts mid-sentence

### 5. Backwards Compatibility ✅
**Decision**: Keep existing `PukuSemanticContextProvider` working
**Rationale**:
- No breaking changes
- Gradual migration
- Fallback if new system has issues

---

## Performance Targets

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Context resolution | ~200ms | <100ms | Parallel provider resolution |
| Semantic search | ~200ms | <150ms | Already fast, optimize filtering |
| Import parsing | ~50ms | <30ms | Cache AST results |
| Total FIM latency | ~1000ms | <800ms | 200ms savings from context |
| Memory overhead | Minimal | <10MB | Reuse existing caches |

---

## Success Criteria

- [ ] Context provider API defined and documented
- [ ] 3+ providers implemented (semantic, imports, diagnostics)
- [ ] Context resolution <100ms (p90)
- [ ] Token budget management working
- [ ] Telemetry tracking provider performance
- [ ] Configuration UI for enabling/disabling providers
- [ ] No breaking changes to existing FIM
- [ ] Unit tests for all providers (>80% coverage)
- [ ] Integration tests for end-to-end flow

---

## Migration Strategy

### Week 1: Foundation (P0)
1. Define context provider API
2. Extract semantic search into provider
3. Extract import logic into provider
4. Implement context registry
5. Integrate into FIM prompt assembly

### Week 2: Enhancement (P1)
1. Add token budget management
2. Implement diagnostics provider
3. Add snippet priority system
4. Integrate telemetry

### Week 3: Polish (P2)
1. Add configuration UI
2. Performance optimization
3. Add language-specific providers
4. Documentation and examples

---

## Configuration

```json
{
  "puku.inline.context.enabled": true,
  "puku.inline.context.providers": {
    "semantic": {
      "enabled": true,
      "maxChunks": 3,
      "minScore": 0.7
    },
    "imports": {
      "enabled": true,
      "maxFiles": 3,
      "maxLinesPerFile": 500
    },
    "diagnostics": {
      "enabled": true,
      "maxDiagnostics": 5
    }
  },
  "puku.inline.context.tokenBudget": {
    "maxContextTokens": 2000,
    "reserveForCompletion": 200
  }
}
```

---

## References

### Copilot Reference Implementation
- **Context Provider Registry**: `src/vscode/reference/vscode-copilot-chat/src/extension/completions-core/vscode-node/lib/src/prompt/contextProviderRegistry.ts`
- **Prompt Factory**: `src/vscode/reference/vscode-copilot-chat/src/extension/completions-core/vscode-node/lib/src/prompt/prompt.ts`
- **Language Context Service**: `src/vscode/reference/vscode-copilot-chat/src/platform/languageContextProvider/common/languageContextProviderService.ts`

### Puku Current Implementation
- **FIM Provider**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`
- **Semantic Context**: `src/chat/src/extension/pukuIndexing/vscode-node/pukuSemanticContextProvider.ts`
- **Semantic Search Flow**: `src/chat/src/extension/pukuai/vscode-node/flows/semanticSearch.ts`
- **Import Flow**: `src/chat/src/extension/pukuai/vscode-node/flows/importContext.ts`

### Related Docs
- **Chat Semantic Context PRD**: `../chat-semantic-context/00-overview.md`
- **Puku Indexing Service**: `src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts`
- **CLAUDE.md**: Project overview and architecture

---

**Status**: Planning Complete, Ready for Phase 1 Implementation
**Priority**: P0 (MVP)
**Estimated Total Effort**: 36 hours (~1 week)
**Expected Impact**: 20-30% improvement in FIM relevance and accuracy
**Owner**: TBD

---

## Next Steps

1. ✅ Read this overview
2. 📖 Review [Context Provider API](./01-context-provider-api.md) PRD
3. 🚀 Begin Phase 1 implementation (14 hours)
