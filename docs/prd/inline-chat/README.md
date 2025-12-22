# Puku Inline Chat - Product Requirements Documentation

**Comprehensive PRDs with examples, diagrams, and implementation details**

---

## 🎯 Strategy Update

**NEW APPROACH**: Reuse 95% of Copilot's inline chat + Inject 5% Puku semantic search **WITHOUT BREAKING FIM**

See **[Implementation Without Breaking FIM](./09-implementation-without-breaking-fim.md)** for the complete isolation strategy.

See **[Integration Strategy](./08-integration-strategy.md)** for Copilot reuse details.

---

## 📁 Document Structure

```
inline-chat/
├── README.md                                  # This file
│
├── 01-overview.md                             # ✅ Executive summary
├── 02-ui-ux.md                                # ✅ User interface & flows
├── 03-context-gathering.md                    # ✅ Context collection
│
├── 04-prompt-engineering/                     # Prompt engineering (TSX-based)
│   ├── 01-overview.md                         # ✅ Prompt architecture
│   ├── 02-fix-intent.md                       # ✅ /fix intent with examples
│   ├── 03-generate-intent.md                  # 📝 /generate intent
│   ├── 04-doc-intent.md                       # 📝 /doc intent
│   ├── 05-explain-intent.md                   # 📝 /explain intent
│   └── 06-tsx-components.md                   # 📝 Reusable components
│
├── 05-api-integration/                        # API & networking
│   ├── 01-overview.md                         # ✅ API client architecture
│   ├── 02-request-examples.md                 # 📝 Request formats
│   ├── 03-response-parsing.md                 # 📝 SSE parsing
│   ├── 04-error-handling.md                   # 📝 Error recovery
│   ├── 05-authentication.md                   # 📝 API key management
│   └── 06-streaming.md                        # 📝 Real-time streaming
│
├── 06-semantic-search/                        # Workspace-aware context
│   ├── 01-overview.md                         # 📝 Semantic search flow
│   ├── 02-indexing.md                         # 📝 Embeddings & SQLite
│   ├── 03-query-construction.md               # 📝 Query building
│   ├── 04-result-ranking.md                   # 📝 Relevance scoring
│   └── 05-context-injection.md                # 📝 Prompt enhancement
│
├── 07-response-processing/                    # Code extraction & diffs
│   ├── 01-overview.md                         # 📝 Response flow
│   ├── 02-code-extraction.md                  # 📝 Parse code blocks
│   ├── 03-diff-generation.md                  # 📝 Create diffs
│   ├── 04-edit-application.md                 # 📝 Apply changes
│   └── 05-validation.md                       # 📝 Quality checks
│
├── 08-integration-strategy.md                 # ✅ Copilot reuse strategy
└── 09-implementation-without-breaking-fim.md  # ✅ 🔥 CRITICAL - READ THIS FIRST!
```

**Legend**:
- ✅ Complete with examples & diagrams
- 📝 Planned (coming soon)
- 🔥 **CRITICAL - Read this first!**

---

## 🚀 REVISED IMPLEMENTATION APPROACH

### What Changed?

**Old Plan**: Build everything from scratch (4 weeks)
**New Plan**: Reuse Copilot + Add semantic search (1 week!)

### Why This is Better

✅ **95% less work** - Keep Copilot's battle-tested code
✅ **Lower risk** - Don't rebuild UI/UX/commands
✅ **Faster shipping** - 1 week vs. 4 weeks
✅ **Better quality** - Proven Copilot foundation
✅ **Easy maintenance** - Minimal code to maintain

---

## 📋 Implementation Summary

### What We Keep from Copilot (95%)

```
✅ UI Layer
   - vscode.editorChat.start API
   - Input widget
   - Diff preview
   - Accept/Reject flow

✅ Commands Layer
   - registerInlineChatCommands()
   - /fix, /generate, /doc, /explain
   - Code actions integration

✅ Intent Detection
   - Natural language parsing
   - Diagnostic awareness

✅ Context Gathering
   - CurrentSelection
   - Diagnostics
   - SymbolAtCursor

✅ Response Processing
   - ChatParticipantRequestHandler
   - Code block extraction
   - Diff generation
```

### What We Add (5%)

```
🆕 1 NEW FILE:
   src/extension/prompts/node/inline/pukuSemanticContext.tsx

🔧 4 MODIFIED FILES:
   src/extension/prompts/node/inline/inlineChatFixPrompt.tsx
   src/extension/prompts/node/inline/inlineChatGenerateCodePrompt.tsx
   src/extension/prompts/node/inline/inlineChatGenerateMarkdownPrompt.tsx
   src/extension/prompts/node/inline/inlineChatEditCodePrompt.tsx

⚙️ 1 CONFIG UPDATE:
   package.json (add puku.inlineChat.* settings)
```

---

## 🎨 Visual Architecture

```
┌──────────────────────────────────────────────────────────┐
│         COPILOT INLINE CHAT (Keep 95%)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ vscode.editorChat.start                            │  │
│  │    ↓                                                │  │
│  │ User presses Ctrl+I                                │  │
│  │    ↓                                                │  │
│  │ Input widget appears                               │  │
│  │    ↓                                                │  │
│  │ Intent detection (/fix, /generate, etc.)          │  │
│  │    ↓                                                │  │
│  │ Context gathering (selection, diagnostics)         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│      PUKU ENHANCEMENT (Add 5%)                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🆕 Semantic Search Integration                     │  │
│  │    ↓                                                │  │
│  │ Query: instruction + selected code                 │  │
│  │    ↓                                                │  │
│  │ SQLite search (embeddings)                         │  │
│  │    ↓                                                │  │
│  │ Top 3 similar code chunks                          │  │
│  │    ↓                                                │  │
│  │ Inject into prompt:                                │  │
│  │ "Similar code patterns in your workspace:"        │  │
│  │ ```typescript                                      │  │
│  │ // From: src/utils/math.ts                         │  │
│  │ function safeMod(a, b) { ... }                     │  │
│  │ ```                                                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         COPILOT RESPONSE (Keep 95%)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ChatParticipantRequestHandler                      │  │
│  │    ↓                                                │  │
│  │ Call GitHub Copilot API                            │  │
│  │    ↓                                                │  │
│  │ Parse response                                     │  │
│  │    ↓                                                │  │
│  │ Generate diff                                      │  │
│  │    ↓                                                │  │
│  │ Show preview → User accepts/rejects                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Navigation

### **🚨 START HERE** 👈

1. **[Implementation Without Breaking FIM](./09-implementation-without-breaking-fim.md)** - **CRITICAL**
   - **Zero-risk isolation strategy**
   - Protected FIM components
   - New files only approach
   - No shared state
   - Complete implementation phases
   - FIM regression testing

2. **[Integration Strategy](./08-integration-strategy.md)** - Copilot reuse details
   - What to keep from Copilot
   - What to add from Puku
   - Code examples
   - Testing strategy

### For Context & Background

3. [01-overview.md](./01-overview.md) - Goals & metrics
4. [03-context-gathering.md](./03-context-gathering.md) - How context works
5. [04-prompt-engineering/01-overview.md](./04-prompt-engineering/01-overview.md) - Prompt architecture

### By Role

**Developers (Start Coding)**
- **🚨 READ FIRST**: [09-implementation-without-breaking-fim.md](./09-implementation-without-breaking-fim.md)
- **Then Read**: [08-integration-strategy.md](./08-integration-strategy.md)
- Implementation checklist
- Code samples
- Test cases

**Product Managers**
- [01-overview.md](./01-overview.md) - Vision & goals
- [09-implementation-without-breaking-fim.md](./09-implementation-without-breaking-fim.md) - Zero-risk timeline

**Designers**
- [02-ui-ux.md](./02-ui-ux.md) - User flows (already done by Copilot!)
- No UI changes needed (reusing Copilot UI)

**QA Engineers**
- **🚨 CRITICAL**: [09-implementation-without-breaking-fim.md](./09-implementation-without-breaking-fim.md) - FIM regression testing
- Dual system validation
- Isolation testing

---

## 📊 Implementation Timeline

### ✅ Original Plan (4 weeks)
- Week 1: Build UI from scratch
- Week 2: Implement API client
- Week 3: Create prompts
- Week 4: Testing & polish

### 🔥 NEW Plan (1 week!)

**Week 1: Semantic Search Integration**
- Day 1-2: Create `PukuSemanticContext.tsx` component
- Day 3-4: Modify 4 prompt files to inject semantic context
- Day 5: Add configuration options
- Day 6-7: Testing & documentation

**That's it!** Everything else already works via Copilot.

---

## 🎨 Example: Before/After

### Before (Copilot Only)

User types: **"add error handling"**

```typescript
// Copilot generates (generic):
function divide(a, b) {
  if (!a || !b) {
    return null;
  }
  return a / b;
}
```

❌ Doesn't match your workspace patterns
❌ Generic null check (not your style)
❌ No type annotations

### After (Copilot + Puku Semantic Search)

User types: **"add error handling"**

Puku finds in workspace:
```typescript
// From: src/utils/math.ts
function safeMod(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Modulo by zero');
  }
  return a % b;
}
```

Copilot generates (contextual):
```typescript
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

✅ Matches your workspace patterns!
✅ Same error handling style
✅ Proper type annotations

---

## 🔍 Key Concepts

### Semantic Search Integration

```
User Instruction: "add error handling"
Selected Code: function divide(a, b) { return a / b; }
         │
         ▼
Query Builder: "add error handling\n\nfunction divide(a, b)..."
         │
         ▼
SQLite Search (workspace embeddings)
         │
         ▼
Top 3 Results:
  1. safeMod() - 85% relevance
  2. validateInput() - 78% relevance
  3. fetchWithRetry() - 72% relevance
         │
         ▼
Inject into Prompt:
"Similar code patterns in your workspace:
```typescript
// From: src/utils/math.ts (relevance: 85%)
function safeMod(a: number, b: number): number {
  if (b === 0) throw new Error('Modulo by zero');
  return a % b;
}
```"
         │
         ▼
Copilot generates code matching YOUR patterns!
```

---

## 🎯 Success Metrics

### A/B Test: Semantic Search Impact

| Metric | Without Semantic Search | With Semantic Search | Improvement |
|--------|------------------------|----------------------|-------------|
| **Acceptance Rate** | 75% | 85%+ | +13% |
| **Style Match** | 80% | 95%+ | +19% |
| **Relevance** | 70% | 90%+ | +29% |
| **User Satisfaction** | 7.5/10 | 8.5/10+ | +13% |

---

## ✅ Implementation Checklist

### Phase 1: Semantic Context Component (Day 1-2)

- [ ] Create `src/extension/prompts/node/inline/pukuSemanticContext.tsx`
  ```tsx
  export class PukuSemanticContext extends PromptElement {
    render() {
      return (
        <TextChunk priority={800}>
          Similar code patterns in your workspace:<br />
          {this.props.results.map(r => (
            <CodeBlock language={this.props.languageId}>
              // From: {r.file} (relevance: {r.score}%)<br />
              {r.chunk}
            </CodeBlock>
          ))}
        </TextChunk>
      );
    }
  }
  ```

- [ ] Add unit tests for component
- [ ] Verify rendering with mock data

### Phase 2: Prompt Integration (Day 3-4)

- [ ] Modify `inlineChatFixPrompt.tsx`
  - [ ] Add `prepare()` method
  - [ ] Call `pukuIndexingService.semanticSearch()`
  - [ ] Inject `<PukuSemanticContext />` in render

- [ ] Modify `inlineChatGenerateCodePrompt.tsx`
  - [ ] Same as above

- [ ] Modify `inlineChatGenerateMarkdownPrompt.tsx`
  - [ ] Same as above

- [ ] Modify `inlineChatEditCodePrompt.tsx`
  - [ ] Same as above

### Phase 3: Configuration (Day 5)

- [ ] Update `pukuConfig.ts` interface
  ```typescript
  export interface PukuInlineChatConfig {
    enableSemanticSearch: boolean;
    maxSearchResults: number;
    minRelevanceScore: number;
  }
  ```

- [ ] Add settings to `package.json`
  ```json
  {
    "puku.inlineChat.enableSemanticSearch": {
      "type": "boolean",
      "default": true
    },
    "puku.inlineChat.maxSearchResults": {
      "type": "number",
      "default": 3
    }
  }
  ```

### Phase 4: Testing (Day 6-7)

- [ ] Unit tests
  - [ ] `PukuSemanticContext` renders correctly
  - [ ] Prompt integration works
  - [ ] Config options respected

- [ ] Integration tests
  - [ ] Semantic search called with correct params
  - [ ] Results injected into prompt
  - [ ] Works when disabled

- [ ] E2E tests
  - [ ] User flow: Ctrl+I → type → get contextual result
  - [ ] Acceptance rate improved

- [ ] Documentation
  - [ ] Update user docs
  - [ ] Add examples
  - [ ] Update changelog

---

## 📖 Related Resources

### Critical Reading

1. **[Implementation Without Breaking FIM](./09-implementation-without-breaking-fim.md)** - **START HERE**
2. **[Integration Strategy](./08-integration-strategy.md)** - Copilot reuse guide
3. [Copilot Reference Code](../../../src/vscode/reference/vscode-copilot-chat/)
4. [Puku FIM Provider](../../../src/chat/src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts) - **DO NOT MODIFY**

### Background Reading

- [01-overview.md](./01-overview.md) - Goals & metrics
- [03-context-gathering.md](./03-context-gathering.md) - Context types
- [04-prompt-engineering/](./04-prompt-engineering/) - Prompt architecture

### External

- [VS Code Chat API](https://code.visualstudio.com/api/extension-guides/chat)
- [@vscode/prompt-tsx](https://github.com/microsoft/vscode-prompt-tsx)
- [Puku API Docs](https://docs.puku.ai)

---

## 🤝 Decision Log

### Why Reuse Copilot Instead of Building from Scratch?

**Decision Date**: December 22, 2024

**Reasons**:
1. **Proven Quality** - Copilot's inline chat is battle-tested by millions
2. **Faster Shipping** - 1 week vs. 4 weeks implementation
3. **Lower Risk** - Don't rebuild complex UI/UX flows
4. **Better UX** - Users already familiar with Copilot patterns
5. **Easy Maintenance** - Minimal code surface area

**Trade-offs**:
- ❌ Dependent on Copilot's architecture
- ❌ Can't customize UI deeply
- ✅ BUT: Our goal is semantic search, not UI innovation

**Conclusion**: Reuse Copilot, add semantic search enhancement

---

## 📈 Progress Tracking

| Document | Status | Progress | Last Updated |
|----------|--------|----------|--------------|
| **09-implementation-without-breaking-fim.md** | ✅ **🚨 CRITICAL** | 100% | Dec 22, 2024 |
| **08-integration-strategy.md** | ✅ Complete | 100% | Dec 22, 2024 |
| 01-overview.md | ✅ Complete | 100% | Dec 22, 2024 |
| 02-ui-ux.md | ⚠️ Reference Only | N/A | Dec 22, 2024 |
| 03-context-gathering.md | ✅ Complete | 100% | Dec 22, 2024 |
| 04-prompt-engineering/01-overview.md | ✅ Complete | 100% | Dec 22, 2024 |
| 04-prompt-engineering/02-fix-intent.md | ✅ Complete | 100% | Dec 22, 2024 |
| 05-api-integration/01-overview.md | ⚠️ Reference Only | N/A | Dec 22, 2024 |

**Overall Status**: Ready to implement! Start with [09-implementation-without-breaking-fim.md](./09-implementation-without-breaking-fim.md)

---

## 🚨 Important Notes

### What Changed?

**Before**: Build custom inline chat from scratch
**After**: Reuse Copilot + inject semantic search **WITHOUT BREAKING FIM**

### What This Means

- ✅ **Zero Risk**: FIM system completely isolated (no modifications)
- ✅ **Faster**: 1 week instead of 4 weeks
- ✅ **Simpler**: 8 new files only (no FIM changes)
- ✅ **Safer**: Proven Copilot foundation + protected FIM
- ✅ **Better**: Focus on our unique value (semantic search)

### Critical Constraints

**DO NOT:**
- ❌ Modify FIM provider files (pukuFimProvider.ts, pukuInlineCompletionProvider.ts)
- ❌ Share state between FIM and inline chat
- ❌ Touch FIM registration logic
- ❌ Modify FIM context flows
- ❌ Change FIM API endpoints

**DO:**
- ✅ Create new files only (8 files, ~1450 lines)
- ✅ Use separate VS Code APIs (vscode.editorChat.start vs InlineCompletionProvider)
- ✅ Reuse stateless services (indexing, auth, config)
- ✅ Test FIM after every change

### Migration from Old PRD

Documents 02, 05, 06, 07 are now **reference only** because:
- **02-ui-ux.md**: UI already done by Copilot
- **05-api-integration**: API handled by Copilot
- **06-semantic-search**: Covered in implementation strategy
- **07-response-processing**: Done by Copilot

**Key Documents**:
1. **[09-implementation-without-breaking-fim.md](./09-implementation-without-breaking-fim.md)** - **START HERE** (isolation strategy)
2. [08-integration-strategy.md](./08-integration-strategy.md) - Copilot reuse details

---

**Maintained By**: Puku AI Team
**Last Updated**: December 22, 2024
**Version**: 2.0 (Revised approach)
**Status**: Ready to implement 🚀
