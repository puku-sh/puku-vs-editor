# Inline Edit Semantic Context - Overview

## Project Overview

**Goal**: Enhance inline edits (Ctrl+I) with intelligent context gathering from the workspace to provide more accurate code generation, refactoring, and fixes.

**Feature**: Inline Edit (Ctrl+I / Cmd+I)
- User invokes with keyboard shortcut
- Shows input box: "Edit, refactor, and generate code"
- User provides natural language instructions
- Can manually add context via "Add Context..." button
- Generates multi-line edits based on instruction + context

**Current State**: Puku Editor has basic inline edit functionality but lacks automatic semantic context gathering.

**Target State**: Implement comprehensive context gathering for inline edits matching GitHub Copilot's capabilities:
- **History Context**: Recent edits in current session (what user just did)
- **Semantic Search**: Relevant code snippets from workspace
- **Diagnostics Context**: Errors/warnings at cursor position
- **Symbol Context**: Related functions, classes, types
- **Cross-tab Context**: Edits from other open files (NES - Network Edit Streaming)

---

## Architecture Comparison

### Current Puku Implementation

```
PukuInlineEditModel
├── FIM Provider (fast path)
├── Diagnostics Provider (import fixes)
└── NES Provider (refactoring suggestions)
    → No automatic context gathering
    → User must manually add context
```

**Key Files:**
- `src/chat/src/extension/pukuai/vscode-node/pukuInlineEditModel.ts` - 3-way racing model
- `src/chat/src/extension/inlineEdits/node/serverPoweredInlineEditProvider.ts` - Server-based provider
- `src/chat/src/extension/inlineEdits/vscode-node/inlineEditProviderFeature.ts` - VS Code integration

**Current Limitations:**
- ❌ No automatic context gathering
- ❌ User must manually click "Add Context..."
- ❌ No edit history tracking
- ❌ No semantic search integration
- ❌ Limited diagnostic integration

### Copilot's Architecture (Reference)

```
NextEditProvider
├── HistoryContextProvider
│   ├── Track recent edits (DocumentHistory)
│   ├── Cross-file edit tracking (NesXtabHistoryTracker)
│   └── Selection state
├── Semantic Search (via codebase tool)
│   ├── Similar code snippets
│   └── Relevant implementations
├── Diagnostics Integration
│   ├── Errors at cursor
│   └── Related warnings
└── Symbol Context
    ├── Function/class definitions
    └── Type information
```

**Reference Files:**
- `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/node/nextEditProvider.ts` - Main provider
- `src/vscode/reference/vscode-copilot-chat/src/platform/inlineEdits/common/workspaceEditTracker/historyContextProvider.ts` - Edit history
- `src/vscode/reference/vscode-copilot-chat/src/platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker.ts` - Cross-tab tracking

**Key Insights:**
- ✅ Tracks all edits in session (undo-friendly)
- ✅ Cross-file edit awareness
- ✅ Semantic search for relevant code
- ✅ Rich diagnostic integration
- ✅ Automatic context injection into prompts

---

## Component Breakdown

### Phase 1: Foundation (P0 - MVP)
**Goal**: Implement core context providers

| # | Component | Description | File | Effort |
|---|-----------|-------------|------|--------|
| 1 | Edit History Tracker | Track user edits in current session | `editHistoryTracker.ts` | 4h |
| 2 | History Context Provider | Provide recent edits as context | `historyContextProvider.ts` | 3h |
| 3 | Semantic Context Provider | Workspace search for relevant code | `semanticContextProvider.ts` | 3h |
| 4 | Diagnostics Context Provider | Errors/warnings at cursor | `diagnosticsContextProvider.ts` | 2h |
| 5 | Context Aggregator | Combine all context sources | `contextAggregator.ts` | 3h |
| 6 | Prompt Integration | Inject context into edit prompts | `serverPoweredInlineEditProvider.ts` | 4h |

**Total Effort**: 19 hours (~2.5 days)

### Phase 2: Enhancement (P1)
**Goal**: Match Copilot's advanced features (cross-tab tracking, undo/redo awareness)

| # | Component | Description | File | Effort |
|---|-----------|-------------|------|--------|
| 7 | Cross-Tab History Tracker | Track edits across ALL open files (like Copilot's NesXtabHistoryTracker) | `crossTabHistoryTracker.ts` | 5h |
| 8 | Undo/Redo Aware Tracking | Detect and filter undo/redo operations (like Copilot's EditReason) | `undoRedoTracker.ts` | 4h |
| 9 | Symbol Context Provider | Function/class definitions and type info | `symbolContextProvider.ts` | 3h |
| 10 | Token Budget Manager | Smart context truncation with priorities | `tokenBudgetManager.ts` | 2h |

**Total Effort**: 14 hours (~2 days)

### Phase 3: Polish (P2)
**Goal**: Configuration and optimization

| # | Component | Description | File | Effort |
|---|-----------|-------------|------|--------|
| 11 | Configuration UI | Settings for context providers | `package.json` | 2h |
| 12 | Performance Optimization | Caching and incremental updates | Various | 4h |
| 13 | Telemetry Integration | Track context usage and quality | `telemetry.ts` | 3h |

**Total Effort**: 9 hours (~1 day)

---

## Detailed Component Docs

### Phase 1 (MVP)

1. **[Edit History Tracker](./01-edit-history-tracker.md)** - Track user edits in session
2. **[History Context Provider](./02-history-context-provider.md)** - Provide recent edits as context
3. **[Semantic Context Provider](./03-semantic-context-provider.md)** - Workspace semantic search
4. **[Diagnostics Context Provider](./04-diagnostics-context-provider.md)** - Errors/warnings context
5. **[Context Aggregator](./05-context-aggregator.md)** - Combine all context sources
6. **[Prompt Integration](./06-prompt-integration.md)** - Inject into edit prompts

### Phase 2 (Enhancement)

7. **[Cross-Tab History Tracker](./07-cross-tab-history-tracker.md)** - Track edits across ALL open tabs
8. **[Undo/Redo Tracker](./08-undo-redo-tracker.md)** - Detect and filter undo/redo operations
9. **[Symbol Context Provider](./09-symbol-context-provider.md)** - Function/class definitions (TBD)
10. **[Token Budget Manager](./10-token-budget-manager.md)** - Smart context truncation (TBD)

### Phase 3 (Polish)

11. **[Configuration](./11-configuration.md)** - User settings
12. **[Performance](./12-performance.md)** - Optimization strategies
13. **[Telemetry](./13-telemetry.md)** - Usage tracking

---

## Architecture Overview

### New Architecture (Target)

```
┌─────────────────────────────────────────────────────────────┐
│                    INLINE EDIT (Ctrl+I)                      │
├─────────────────────────────────────────────────────────────┤
│  User Input: "Refactor this function to use async/await"    │
│                                                               │
│  PukuInlineEditModel (3-way racing)                          │
│  ├── FIM Provider (fast path)                               │
│  ├── Diagnostics Provider                                   │
│  └── NES Provider                                           │
│                                                               │
│  NEW: Context Aggregator                                     │
│  ├─→ HistoryContextProvider                                 │
│  │   ├── Recent edits (last 5 edits)                        │
│  │   ├── Edit timestamps                                     │
│  │   └── Selection state                                     │
│  ├─→ SemanticContextProvider                                │
│  │   ├── PukuIndexingService.search()                      │
│  │   └── Related code snippets (3-5 chunks)                │
│  ├─→ DiagnosticsContextProvider                            │
│  │   ├── vscode.languages.getDiagnostics()                │
│  │   └── Errors at cursor position                         │
│  ├─→ SymbolContextProvider (Phase 2)                       │
│  │   ├── Function definitions                              │
│  │   └── Class/type declarations                           │
│  └─→ CrossTabContextProvider (Phase 2)                     │
│      ├── Other open file edits                             │
│      └── Related file changes                              │
│                                                               │
│  Assemble Prompt:                                            │
│  {                                                            │
│    instruction: "Refactor this function to use async/await", │
│    selectedCode: "...",                                      │
│    context: {                                                │
│      history: ["User just added error handling", ...],      │
│      similar: ["Similar async function in utils.ts", ...],  │
│      diagnostics: ["Missing return type", ...],             │
│      symbols: ["Promise type definition", ...]              │
│    }                                                          │
│  }                                                            │
│  ↓                                                            │
│  Send to LLM → Get edit suggestions                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Types Instruction → Ctrl+I
    ↓
PukuInlineEditModel.getCompletion()
    ↓
ContextAggregator.getContext()
    ├─→ HistoryContextProvider.getRecentEdits()
    │   └─→ Returns: Recent edit history
    ├─→ SemanticContextProvider.search()
    │   └─→ PukuIndexingService.search(instruction + selected code)
    │   └─→ Returns: Relevant code snippets
    ├─→ DiagnosticsContextProvider.getDiagnostics()
    │   └─→ vscode.languages.getDiagnostics(document, range)
    │   └─→ Returns: Errors/warnings at cursor
    └─→ SymbolContextProvider.getSymbols() (Phase 2)
        └─→ Returns: Function/class definitions
    ↓
Aggregate context items
Apply token budget (truncate if needed)
    ↓
ServerPoweredInlineEditProvider.provideNextEdit()
    ├─→ Build prompt with context
    ├─→ Send to backend API (POST /inline-edit)
    └─→ Return edit suggestions
    ↓
Show in editor as ghost text
User accepts/rejects
```

---

## Key Design Decisions

### 1. Edit History Tracking ✅
**Decision**: Track all edits in current session
**Rationale**:
- Provides context about what user is trying to do
- Helps LLM understand user intent
- Enables "continue from where I left off" patterns

**Implementation**:
- Listen to `vscode.workspace.onDidChangeTextDocument`
- Store last 5-10 edits per file
- Include: timestamp, range, old text, new text
- Clear on file close

### 2. Automatic Context Gathering ✅
**Decision**: Automatically gather context without user interaction
**Rationale**:
- Reduces friction (no manual "Add Context...")
- Better UX - works out of the box
- Matches Copilot's behavior

### 3. Multiple Context Providers ✅
**Decision**: Separate providers for different context types
**Rationale**:
- Single Responsibility Principle
- Easy to test and extend
- Can enable/disable independently
- Different providers have different performance characteristics

### 4. Token Budget Management ✅
**Decision**: Limit total context tokens
**Rationale**:
- Models have context limits (8k, 16k, 32k)
- Need budget for instruction + selected code + completion
- Avoid truncated prompts

### 5. Integration with Existing Providers ✅
**Decision**: Enhance existing `ServerPoweredInlineEditProvider`
**Rationale**:
- No breaking changes
- Works with existing 3-way racing architecture
- Gradual rollout

---

## Performance Targets

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| History lookup | N/A | <10ms | In-memory lookup |
| Semantic search | ~200ms | <150ms | Already fast |
| Diagnostics lookup | ~50ms | <30ms | VS Code API |
| Symbol lookup | N/A | <50ms | TypeScript API |
| Total context gathering | N/A | <250ms | Parallel execution |
| Total edit latency | ~1000ms | ~1200ms | +200ms for context |

**Trade-off**: +200ms latency for much better edit quality

---

## Success Criteria

- [ ] Edit history tracking implemented
- [ ] History context provider working
- [ ] Semantic search context integrated
- [ ] Diagnostics context provider working
- [ ] Context aggregator combines all sources
- [ ] Prompts include automatic context
- [ ] Context gathering <250ms (p90)
- [ ] Token budget management working
- [ ] No breaking changes to existing inline edits
- [ ] Unit tests for all providers (>80% coverage)
- [ ] Integration tests for end-to-end flow
- [ ] User study shows improved edit quality

---

## Migration Strategy

### Week 1: Foundation (P0)
1. **Edit History Tracker** (4h)
   - Listen to document changes
   - Store edit history
   - Clear on file close

2. **History Context Provider** (3h)
   - Implement provider interface
   - Format edit history as context
   - Add to prompt

3. **Semantic Context Provider** (3h)
   - Integrate `PukuIndexingService`
   - Search based on instruction + selected code
   - Return relevant snippets

4. **Diagnostics Context Provider** (2h)
   - Query VS Code diagnostics API
   - Filter to cursor position
   - Format as context

5. **Context Aggregator** (3h)
   - Combine all providers
   - Apply token budget
   - Return aggregated context

6. **Prompt Integration** (4h)
   - Modify `ServerPoweredInlineEditProvider`
   - Build prompt with context
   - Send to backend

### Week 2: Enhancement (P1)
1. Cross-tab context tracking (4h)
2. Symbol context provider (3h)
3. Token budget manager (3h)
4. Context ranking (2h)

### Week 3: Polish (P2)
1. Configuration UI (2h)
2. Performance optimization (4h)
3. Telemetry integration (3h)

---

## Example: Before vs After

### Before (No Context)

**User Instruction**: "Refactor this function to use async/await"

**Prompt to LLM**:
```typescript
// Selected code:
function fetchUser(userId) {
    return fetch(`/api/users/${userId}`)
        .then(res => res.json())
        .then(user => user);
}

// Instruction: Refactor this function to use async/await
```

**LLM Response**: Basic async/await conversion (may miss error handling patterns, may not match project conventions)

### After (With Semantic Context)

**User Instruction**: "Refactor this function to use async/await"

**Prompt to LLM**:
```typescript
// CONTEXT: Recent edits in this file
User just added try/catch error handling to another function

// CONTEXT: Similar code from workspace
File: src/api/auth.ts (lines 42-50)
async function loginUser(credentials) {
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

// CONTEXT: Diagnostics
Warning: Missing return type annotation

// Selected code:
function fetchUser(userId) {
    return fetch(`/api/users/${userId}`)
        .then(res => res.json())
        .then(user => user);
}

// Instruction: Refactor this function to use async/await
```

**LLM Response**: High-quality refactoring matching project patterns:
```typescript
async function fetchUser(userId: string): Promise<User> {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error(`Fetch user failed: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch user error:', error);
        throw error;
    }
}
```

**Key improvements**:
- ✅ Adds try/catch (from edit history context)
- ✅ Matches error handling pattern (from semantic context)
- ✅ Adds response.ok check (from similar code)
- ✅ Adds type annotations (from diagnostics context)
- ✅ Matches project conventions

---

## Configuration

```json
{
  "puku.inlineEdit.context.enabled": true,
  "puku.inlineEdit.context.providers": {
    "history": {
      "enabled": true,
      "maxEdits": 5,
      "maxAgeMinutes": 30
    },
    "semantic": {
      "enabled": true,
      "maxChunks": 3,
      "minScore": 0.7
    },
    "diagnostics": {
      "enabled": true,
      "maxDiagnostics": 5,
      "severities": ["error", "warning"]
    },
    "symbols": {
      "enabled": true,
      "maxSymbols": 3
    },
    "crossTab": {
      "enabled": false,
      "maxFiles": 2
    }
  },
  "puku.inlineEdit.context.tokenBudget": {
    "maxContextTokens": 2000,
    "reserveForInstruction": 500,
    "reserveForCompletion": 1000
  }
}
```

---

## References

### Copilot Reference Implementation
- **Next Edit Provider**: `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/node/nextEditProvider.ts`
- **History Context**: `src/vscode/reference/vscode-copilot-chat/src/platform/inlineEdits/common/workspaceEditTracker/historyContextProvider.ts`
- **Cross-Tab Tracking**: `src/vscode/reference/vscode-copilot-chat/src/platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker.ts`

### Puku Current Implementation
- **Inline Edit Model**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineEditModel.ts`
- **Server Provider**: `src/chat/src/extension/inlineEdits/node/serverPoweredInlineEditProvider.ts`
- **Provider Feature**: `src/chat/src/extension/inlineEdits/vscode-node/inlineEditProviderFeature.ts`
- **Indexing Service**: `src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts`

### Related Docs
- **Inline Completions Context PRD**: `../inline-semantic-context/00-overview.md` (FIM)
- **Chat Semantic Context PRD**: `../chat-semantic-context/00-overview.md` (Chat panel)

---

**Status**: Phase 2 Planning Complete
**Priority**: P0 (Phase 1 MVP), P1 (Phase 2 Enhancement)
**Estimated Total Effort**:
- Phase 1: 19 hours (~2.5 days) - 80% feature parity
- Phase 2: 14 hours (~2 days) - 95% feature parity (matches Copilot)
- Phase 3: 9 hours (~1 day) - Polish and optimization
- **Total**: 42 hours (~1 week)

**Expected Impact**:
- Phase 1: 30-40% improvement in inline edit quality
- Phase 2: 45-55% improvement (cross-tab + undo/redo awareness)

**Owner**: TBD

---

## Next Steps

### Phase 1 (MVP - Start Here)
1. ✅ Read this overview
2. 📖 Review [Edit History Tracker](./01-edit-history-tracker.md) PRD
3. 🚀 Begin Phase 1 implementation (19 hours)
   - Edit History Tracker (4h)
   - History Context Provider (3h)
   - Semantic Context Provider (3h)
   - Diagnostics Context Provider (2h)
   - Context Aggregator (3h)
   - Prompt Integration (4h)

### Phase 2 (Copilot Parity)
4. 📖 Review [Cross-Tab History Tracker](./07-cross-tab-history-tracker.md) PRD
5. 📖 Review [Undo/Redo Tracker](./08-undo-redo-tracker.md) PRD
6. 🚀 Begin Phase 2 implementation (14 hours)
   - Cross-Tab History Tracker (5h)
   - Undo/Redo Tracker (4h)
   - Symbol Context Provider (3h)
   - Token Budget Manager (2h)

### Phase 3 (Polish)
7. 🚀 Configuration, performance, and telemetry (9 hours)
