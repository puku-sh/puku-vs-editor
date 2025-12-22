# PRD: Inline Chat Implementation Without Breaking FIM

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024
**Priority:** CRITICAL

---

## 1. Executive Summary

This PRD defines a **safe, isolated implementation strategy** for adding VS Code's Inline Chat (`Ctrl+I`) functionality to Puku Editor **without breaking the existing FIM (Fill-in-Middle) autocomplete system**.

### Key Constraints

1. **DO NOT touch existing FIM code** - Current FIM works well and is battle-tested
2. **DO NOT modify provider registration** - Keep FIM provider registration unchanged
3. **DO NOT share state between systems** - Inline chat and FIM must be completely isolated
4. **Reuse Copilot's architecture** - 95% reuse from `reference/vscode-copilot-chat/src/`
5. **Add semantic search only** - 5% new code for Puku-specific features

---

## 2. Current FIM Architecture (DO NOT MODIFY)

### 2.1 FIM Components (Protected)

**File:** `src/chat/src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts`

```
┌────────────────────────────────────────────────────────┐
│           CURRENT FIM SYSTEM (DO NOT TOUCH)            │
├────────────────────────────────────────────────────────┤
│  PukuFimProvider                                       │
│  ├── IPukuNextEditProvider interface                  │
│  ├── getNextEdit() - main entry point                 │
│  ├── Racing provider architecture                     │
│  ├── Speculative request cache                        │
│  ├── CurrentGhostText cache (Layer 1)                 │
│  ├── Radix Trie cache (Layer 2)                       │
│  ├── Multi-document support                           │
│  └── Context flows (comment, refactoring, imports)    │
├────────────────────────────────────────────────────────┤
│  PukuInlineCompletionProvider (Wrapper)                │
│  ├── vscode.InlineCompletionItemProvider interface    │
│  ├── provideInlineCompletionItems()                   │
│  ├── Wraps PukuFimProvider                            │
│  └── LRU cache + ghost text optimization              │
└────────────────────────────────────────────────────────┘
```

**Current Features:**
- ✅ Auto-triggered inline completions
- ✅ Multi-document completions (displayLocation)
- ✅ Semantic search integration
- ✅ Import context awareness
- ✅ Refactoring detection
- ✅ Comment-based completions
- ✅ Speculative caching (instant follow-ups)
- ✅ Typing-as-suggested optimization

**Protected Files (DO NOT MODIFY):**
- `src/chat/src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts` (1116 lines)
- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` (892 lines)
- `src/chat/src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts`
- `src/chat/src/extension/pukuai/vscode-node/flows/` (all flow handlers)
- `src/chat/src/extension/pukuai/common/` (shared interfaces)

---

## 3. Inline Chat Architecture (NEW - ISOLATED)

### 3.1 VS Code Inline Chat API

Inline Chat uses a **completely different API** from FIM:

| Feature | FIM (Auto-complete) | Inline Chat (User-triggered) |
|---------|---------------------|------------------------------|
| **API** | `vscode.InlineCompletionItemProvider` | `vscode.editorChat.start()` |
| **Trigger** | Automatic (on typing) | Manual (Ctrl+I) |
| **UI** | Ghost text | Chat widget with input box |
| **Response** | Single completion | Streaming text + diff view |
| **Acceptance** | Tab key | Accept/Reject buttons |
| **State** | Stateless (racing) | Stateful (conversation) |

**No overlap!** These are separate VS Code APIs with separate lifecycles.

### 3.2 Implementation Strategy: Copilot Reuse + Puku Semantic Search

```
┌────────────────────────────────────────────────────────────────┐
│                    INLINE CHAT ARCHITECTURE                     │
│                  (NEW - ISOLATED FROM FIM)                      │
├────────────────────────────────────────────────────────────────┤
│  UI Layer (Copilot - 100% Reuse)                               │
│  ├── vscode.editorChat.start() API                             │
│  ├── Chat widget UI (input box, buttons)                       │
│  ├── Diff view rendering                                       │
│  └── Accept/Reject/Regenerate actions                          │
├────────────────────────────────────────────────────────────────┤
│  Commands Layer (Copilot - 100% Reuse)                         │
│  ├── registerInlineChatCommands()                              │
│  ├── Ctrl+I → editor.action.inlineChat.start                   │
│  ├── /fix, /generate, /doc, /explain intents                   │
│  └── Context resolution                                        │
├────────────────────────────────────────────────────────────────┤
│  Prompt Layer (Copilot 95% + Puku 5%)                          │
│  ├── TSX prompt templates (from Copilot)                       │
│  ├── 🆕 PukuSemanticContext component (NEW)                    │
│  ├── SystemMessage, UserMessage, AssistantMessage              │
│  └── Token budget management                                   │
├────────────────────────────────────────────────────────────────┤
│  API Layer (Copilot - Use Puku endpoints)                      │
│  ├── Streaming chat completions                                │
│  ├── Use existing IPukuAuthService                             │
│  ├── Use existing IFetcherService                              │
│  └── Same endpoints as chat panel                              │
├────────────────────────────────────────────────────────────────┤
│  Services Layer (Shared - No FIM Dependency)                   │
│  ├── IPukuIndexingService (semantic search)                    │
│  ├── IPukuConfigService (settings)                             │
│  ├── IPukuAuthService (authentication)                         │
│  └── ILogService (logging)                                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Isolation Strategy: No Shared State

### 4.1 Separate Registration

**FIM Provider (Existing - Protected):**
```typescript
// src/chat/src/extension/pukuai/vscode-node/pukuaiContribution.ts
vscode.languages.registerInlineCompletionItemProvider(
	{ pattern: '**' },
	pukuInlineCompletionProvider
);
```

**Inline Chat Provider (New - Isolated):**
```typescript
// src/extension/inlineChat/vscode-node/inlineChatContribution.ts
registerInlineChatCommands(context, {
	indexingService,
	authService,
	configService,
	logService
});
```

**No shared registration!** These are separate VS Code extension points.

### 4.2 No Shared Caches

| Cache Type | FIM (Protected) | Inline Chat (New) |
|------------|-----------------|-------------------|
| **Completion Cache** | `PukuFimProvider._speculativeCache` | N/A (stateful conversation) |
| **Ghost Text** | `PukuFimProvider._currentGhostTextByFile` | N/A (shows diff view) |
| **Radix Trie** | `CompletionsCache` per file | N/A (streaming responses) |
| **Request Locks** | `_requestsInFlightByFile` | N/A (sequential chat) |

**No cache sharing!** Inline chat is stateful, FIM is stateless.

### 4.3 No Shared Providers

| Component | FIM | Inline Chat |
|-----------|-----|-------------|
| **Provider Interface** | `IPukuNextEditProvider` | N/A (direct API calls) |
| **Racing Model** | `PukuUnifiedInlineProvider` | N/A (single-threaded) |
| **Context Flows** | Comment, Refactoring, Import | Uses prompt TSX |

**No provider sharing!** FIM uses racing providers, inline chat uses prompts.

### 4.4 Shared Services (Safe)

These services are **stateless and reusable** (no risk to FIM):

- ✅ `IPukuIndexingService` - semantic search (read-only)
- ✅ `IPukuAuthService` - **authentication tokens (read-only)** ← Same auth as FIM
- ✅ `IPukuConfigService` - settings (read-only)
- ✅ `ILogService` - logging (append-only)
- ✅ `IFetcherService` - HTTP client (stateless)

**Why IPukuAuthService is safe to share:**

```typescript
// Interface is read-only - no state mutation
interface IPukuAuthService {
  getToken(): Promise<{ token: string } | null>;  // Read-only
  // No setToken(), no cache manipulation, no state
}
```

Both FIM and inline chat call `getToken()` independently:
- No shared caches between FIM and inline chat
- No lock contention (service handles concurrency)
- Token refresh managed by service internally
- Both systems get same token automatically

---

## 5. File Structure: New Files Only

### 5.1 New Directory Structure

```
src/chat/src/extension/
├── inlineChat/                    # NEW - Inline chat feature
│   ├── common/
│   │   └── inlineChatTypes.ts     # NEW - Types for inline chat
│   ├── vscode-node/
│   │   ├── inlineChatContribution.ts  # NEW - Registration
│   │   └── inlineChatCommands.ts      # NEW - From Copilot (95% reuse)
│   └── node/
│       └── (empty - web support later)
├── prompts/
│   └── node/
│       └── inline/                # NEW - TSX prompts for inline chat
│           ├── pukuSemanticContext.tsx  # NEW - Puku's 5%
│           ├── fixPrompt.tsx           # NEW - From Copilot (95% reuse)
│           ├── generatePrompt.tsx      # NEW - From Copilot (95% reuse)
│           ├── docPrompt.tsx           # NEW - From Copilot (95% reuse)
│           └── explainPrompt.tsx       # NEW - From Copilot (95% reuse)
└── pukuai/                        # PROTECTED - DO NOT MODIFY
    ├── vscode-node/
    │   ├── providers/
    │   │   └── pukuFimProvider.ts       # PROTECTED
    │   ├── pukuInlineCompletionProvider.ts  # PROTECTED
    │   └── flows/                       # PROTECTED
    └── common/
        └── nextEditProvider.ts          # PROTECTED
```

### 5.2 Files to Create (8 New Files)

1. **`src/extension/inlineChat/common/inlineChatTypes.ts`** (~50 lines)
   - Type definitions for inline chat
   - No FIM dependencies

2. **`src/extension/inlineChat/vscode-node/inlineChatContribution.ts`** (~100 lines)
   - Register inline chat commands
   - Use dependency injection for services
   - No FIM dependencies

3. **`src/extension/inlineChat/vscode-node/inlineChatCommands.ts`** (~500 lines)
   - From Copilot's `inlineChatCommands.ts` (95% reuse)
   - Replace GitHub API with Puku API
   - No FIM dependencies

4. **`src/extension/prompts/node/inline/pukuSemanticContext.tsx`** (~100 lines)
   - NEW - Puku's semantic search injection
   - TSX prompt component
   - Calls `IPukuIndexingService.search()`

5. **`src/extension/prompts/node/inline/fixPrompt.tsx`** (~200 lines)
   - From Copilot's `/fix` intent (95% reuse)
   - Inject `<PukuSemanticContext>` component
   - No FIM dependencies

6. **`src/extension/prompts/node/inline/generatePrompt.tsx`** (~200 lines)
   - From Copilot's `/generate` intent (95% reuse)
   - Inject `<PukuSemanticContext>` component
   - No FIM dependencies

7. **`src/extension/prompts/node/inline/docPrompt.tsx`** (~150 lines)
   - From Copilot's `/doc` intent (95% reuse)
   - Inject `<PukuSemanticContext>` component
   - No FIM dependencies

8. **`src/extension/prompts/node/inline/explainPrompt.tsx`** (~150 lines)
   - From Copilot's `/explain` intent (95% reuse)
   - Inject `<PukuSemanticContext>` component
   - No FIM dependencies

**Total:** ~1,450 new lines (8 files)

### 5.3 Files to Modify (1 File)

1. **`package.json`** (~20 line changes)
   - Add inline chat commands
   - Add keybindings (Ctrl+I)
   - Add configuration settings

---

## 6. API Endpoint Reuse

Inline chat uses **the same API endpoints as the chat panel** (no FIM endpoints):

| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/v1/chat/completions` | Inline chat, Chat panel | Streaming chat responses |
| `/v1/fim/context` | FIM only | Fill-in-middle completions |
| `/v1/completions` | (deprecated) | Old FIM endpoint |

**No endpoint conflicts!** FIM uses FIM endpoints, inline chat uses chat endpoints.

---

## 6.1 Authentication Reuse (CRITICAL)

**Inline chat MUST use the same authentication as FIM:**

```typescript
// ✅ CORRECT - Reuse existing IPukuAuthService
constructor(
  @IPukuAuthService private readonly _authService: IPukuAuthService,
  // ... other services
) {
  // Get token the SAME WAY FIM does
  const authToken = await this._authService.getToken();

  // Use token in API calls
  headers['Authorization'] = `Bearer ${authToken.token}`;
}
```

**Why this is safe:**
- ✅ `IPukuAuthService` is **stateless and read-only**
- ✅ Both systems just call `getToken()` independently
- ✅ No shared auth state or caches
- ✅ No lock contention
- ✅ Token refresh handled by service (not by FIM/chat)

**Implementation Pattern:**

```typescript
// src/extension/inlineChat/vscode-node/inlineChatCommands.ts
export async function registerInlineChatCommands(
  context: vscode.ExtensionContext,
  services: {
    indexingService: IPukuIndexingService;
    authService: IPukuAuthService;  // ← Same service FIM uses
    configService: IPukuConfigService;
    logService: ILogService;
    fetcherService: IFetcherService;
  }
) {
  // Use authService to get token
  const authToken = await services.authService.getToken();

  if (!authToken) {
    // Same behavior as FIM - skip if not authenticated
    return;
  }

  // Make API call with token
  const response = await services.fetcherService.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
}
```

**Testing Authentication Reuse:**

1. **Login once, both systems work**
   - Login via Puku settings
   - FIM completions work
   - Inline chat works
   - Both use same token

2. **Logout, both systems stop**
   - Logout
   - FIM stops showing completions
   - Inline chat shows "not authenticated" message
   - No crashes or errors

3. **Token refresh**
   - Let token expire
   - IPukuAuthService refreshes token
   - FIM continues working
   - Inline chat continues working
   - No manual re-login needed

---

## 7. Implementation Phases

### Phase 1: Foundation (Day 1-2) - 0% Risk to FIM

**Create new files only** (no FIM modifications):

1. Create directory structure
2. Create `inlineChatTypes.ts` (types)
3. Create `pukuSemanticContext.tsx` (Puku's 5%)
4. Verify compilation (no FIM code touched)

**Success Criteria:**
- ✅ New files compile
- ✅ FIM still works (no regressions)
- ✅ Semantic search component renders

### Phase 2: Copilot Integration (Day 3-4) - 0% Risk to FIM

**Copy Copilot code** (no FIM modifications):

1. Copy `inlineChatCommands.ts` from Copilot reference
2. Replace GitHub API with Puku API
3. Create `inlineChatContribution.ts` (registration)
4. Register commands in extension activation
5. Verify Ctrl+I opens chat widget

**Success Criteria:**
- ✅ Ctrl+I opens inline chat widget
- ✅ Can type messages
- ✅ FIM still works (no regressions)

### Phase 3: Prompts (Day 5-6) - 0% Risk to FIM

**Create TSX prompts** (no FIM modifications):

1. Copy prompt templates from Copilot
2. Inject `<PukuSemanticContext>` in each prompt
3. Test `/fix`, `/generate`, `/doc`, `/explain`
4. Verify streaming responses

**Success Criteria:**
- ✅ All 4 intents work
- ✅ Semantic search results appear in prompts
- ✅ FIM still works (no regressions)

### Phase 4: Polish (Day 7) - 0% Risk to FIM

**Final touches** (no FIM modifications):

1. Add configuration settings
2. Add keybindings
3. Update package.json
4. Test on multiple file types
5. Final FIM regression test

**Success Criteria:**
- ✅ Full inline chat feature works
- ✅ Settings apply correctly
- ✅ FIM still works (zero regressions)

---

## 8. Testing Strategy: Dual System Validation

### 8.1 FIM Regression Tests (CRITICAL)

**Before each commit:**

1. **Auto-complete still triggers**
   - Type in a file
   - Verify ghost text appears
   - Accept with Tab

2. **Multi-document completions still work**
   - Trigger displayLocation completion
   - Verify label appears
   - Tab to navigate + accept

3. **Caches still work**
   - Verify speculative cache hits (instant follow-ups)
   - Verify typing-as-suggested works
   - Verify Radix Trie cache works

4. **Context flows still work**
   - Comment-based completions
   - Import context
   - Semantic search context

**If ANY regression:** Stop and fix immediately.

### 8.2 Inline Chat Feature Tests

**After each phase:**

1. **Widget opens**
   - Press Ctrl+I
   - Verify chat widget appears
   - Type a message

2. **Intents work**
   - `/fix` - fixes errors
   - `/generate` - generates code
   - `/doc` - adds documentation
   - `/explain` - explains code

3. **Semantic search injected**
   - Verify similar code appears in context
   - Check debug logs for semantic results

4. **Streaming works**
   - Verify text streams in real-time
   - Verify diff view updates

### 8.3 Isolation Tests

**Verify no interaction between FIM and inline chat:**

1. **Concurrent use**
   - Open inline chat (Ctrl+I)
   - Type in another file (trigger FIM)
   - Both should work independently

2. **State isolation**
   - Accept inline chat suggestion
   - FIM cache should be unaffected
   - FIM completions should still work

3. **Service sharing**
   - Both use IPukuIndexingService
   - No lock contention
   - No cache pollution

4. **Authentication sharing**
   - Both use same IPukuAuthService
   - Login once, both systems work
   - Logout, both systems stop gracefully
   - Token refresh affects both systems simultaneously
   - No auth conflicts or race conditions

---

## 9. Risk Mitigation

### 9.1 Zero-Risk Approach

**DO NOT:**
- ❌ Modify FIM provider files
- ❌ Share state between FIM and inline chat
- ❌ Touch FIM registration logic
- ❌ Modify FIM context flows
- ❌ Change FIM API endpoints

**DO:**
- ✅ Create new files only
- ✅ Use separate VS Code APIs
- ✅ Reuse stateless services
- ✅ Test FIM after every change
- ✅ Use Copilot's battle-tested code

### 9.2 Rollback Plan

If inline chat breaks FIM:

1. **Immediate rollback**
   - Revert all commits
   - Delete new files
   - Verify FIM works

2. **Root cause analysis**
   - Identify what touched FIM
   - Fix isolation breach
   - Re-test

3. **Incremental re-implementation**
   - Re-add changes one by one
   - Test FIM after each change
   - Stop at first regression

---

## 10. Success Metrics

### 10.1 FIM Health (Zero Tolerance)

- **Auto-completion success rate:** 95%+ (unchanged)
- **Speculative cache hit rate:** 70%+ (unchanged)
- **Typing-as-suggested speed:** <1ms (unchanged)
- **Multi-document completions:** 100% working (unchanged)

### 10.2 Inline Chat Quality

- **Widget open latency:** <100ms
- **First token latency:** <500ms
- **Semantic search accuracy:** 80%+ relevant results
- **Intent detection accuracy:** 90%+ correct intent
- **User acceptance rate:** 70%+ accepted suggestions

---

## 11. Configuration

### 11.1 Settings (package.json)

```json
{
  "puku.inlineChat.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable inline chat (Ctrl+I)"
  },
  "puku.inlineChat.enableSemanticSearch": {
    "type": "boolean",
    "default": true,
    "description": "Include semantic search results in inline chat prompts"
  },
  "puku.inlineChat.semanticSearchMaxResults": {
    "type": "number",
    "default": 3,
    "description": "Maximum semantic search results to include"
  }
}
```

### 11.2 Keybindings

```json
{
  "command": "editor.action.inlineChat.start",
  "key": "ctrl+i",
  "mac": "cmd+i",
  "when": "editorTextFocus && !editorReadonly"
}
```

---

## 12. Timeline

| Phase | Duration | Risk to FIM |
|-------|----------|-------------|
| Phase 1: Foundation | 2 days | **0%** (new files only) |
| Phase 2: Copilot Integration | 2 days | **0%** (separate API) |
| Phase 3: Prompts | 2 days | **0%** (isolated prompts) |
| Phase 4: Polish | 1 day | **0%** (config only) |
| **Total** | **7 days** | **0% cumulative risk** |

---

## 13. Appendix: Why This Works

### 13.1 Separate VS Code APIs

FIM and inline chat use **completely different extension points**:

**FIM:** `vscode.languages.registerInlineCompletionItemProvider()`
- Auto-triggered on typing
- Returns `InlineCompletionItem[]`
- Stateless racing architecture

**Inline Chat:** `vscode.commands.registerCommand('editor.action.inlineChat.start')`
- Manual trigger (Ctrl+I)
- Opens chat widget UI
- Stateful conversation

**No overlap possible!** These are separate VS Code subsystems.

### 13.2 No Shared State

| Component | FIM | Inline Chat | Shared? |
|-----------|-----|-------------|---------|
| **Provider** | `IPukuNextEditProvider` | N/A | ❌ No |
| **Cache** | Speculative + Radix Trie | N/A | ❌ No |
| **Context** | Flow-based | Prompt-based | ❌ No |
| **API** | `/v1/fim/context` | `/v1/chat/completions` | ❌ No |
| **Services** | Indexing, Auth, Config | Indexing, Auth, Config | ✅ Yes (safe) |

### 13.3 Battle-Tested Code

95% of inline chat code comes from **GitHub Copilot's production implementation**:
- Used by millions of developers daily
- Handles edge cases we haven't thought of
- Proven stable architecture
- Well-tested prompt engineering

We only add 5%: semantic search injection.

---

## 14. Decision Log

### Why Not Modify FIM?

**Option A:** Extend FIM provider to support inline chat
- ❌ High risk of breaking auto-complete
- ❌ Mixing stateless (FIM) and stateful (chat) logic
- ❌ Complex testing matrix
- ❌ Hard to rollback

**Option B:** Create isolated inline chat feature ✅
- ✅ Zero risk to FIM
- ✅ Clear separation of concerns
- ✅ Easy to test independently
- ✅ Easy to rollback if needed

### Why Reuse Copilot?

**Option A:** Build from scratch
- ❌ 4 weeks of development
- ❌ Reinvent edge case handling
- ❌ Unknown unknowns

**Option B:** Reuse Copilot (95%) + inject semantic search (5%) ✅
- ✅ 1 week of development
- ✅ Production-proven code
- ✅ Handles known edge cases

---

**Next Steps:** Begin Phase 1 implementation (create new files only).
