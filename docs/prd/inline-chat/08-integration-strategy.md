# PRD: Integration Strategy - Reuse Copilot + Add Semantic Search

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024

---

## 1. Executive Summary

**Strategy**: Reuse 95% of Copilot's inline chat implementation and only inject Puku's semantic search for workspace-aware context.

**Why This Works**:
- ✅ Copilot's inline chat is production-ready
- ✅ Already uses VS Code's `vscode.editorChat` API
- ✅ Has all UI/UX patterns we need
- ✅ We only need to enhance prompt context

**What We Add**:
- ✅ Semantic search integration in prompt construction
- ✅ Puku API endpoint configuration (optional)
- ✅ Custom instructions from workspace

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│           COPILOT INLINE CHAT (KEEP 95%)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ UI Layer (Keep)                                          │
│     - vscode.editorChat.start API                           │
│     - Input widget                                           │
│     - Diff preview                                           │
│     - Accept/Reject flow                                     │
│                                                               │
│  ✅ Command Layer (Keep)                                     │
│     - registerInlineChatCommands()                          │
│     - doFix(), doGenerate(), doDoc(), doExplain()           │
│     - Code actions integration                              │
│                                                               │
│  ✅ Intent Detection (Keep)                                  │
│     - Intent enum (Fix, Generate, Doc, Explain)            │
│     - Natural language detection                            │
│                                                               │
│  ✅ Context Gathering (Keep)                                 │
│     - CurrentSelection                                       │
│     - Diagnostics                                            │
│     - SymbolAtCursor                                         │
│                                                               │
│  🔧 Prompt Construction (MODIFY - Add Semantic Search)      │
│     ┌────────────────────────────────────────────┐         │
│     │ InlineChatFixPrompt.tsx                     │         │
│     │ ├─ SystemMessage (keep)                    │         │
│     │ ├─ Diagnostics (keep)                      │         │
│     │ ├─ SelectedCode (keep)                     │         │
│     │ ├─ UserQuery (keep)                        │         │
│     │ └─ 🆕 PukuSemanticContext (ADD!)          │         │
│     └────────────────────────────────────────────┘         │
│                                                               │
│  ✅ Response Processing (Keep)                               │
│     - ChatParticipantRequestHandler                         │
│     - Code block extraction                                 │
│     - Diff generation                                       │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│           PUKU ENHANCEMENTS (ADD 5%)                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🆕 Semantic Search Component                                │
│     ┌────────────────────────────────────────────┐         │
│     │ PukuSemanticContext.tsx                     │         │
│     │ ├─ Query workspace embeddings              │         │
│     │ ├─ Extract imports & types                 │         │
│     │ └─ Inject into prompt                      │         │
│     └────────────────────────────────────────────┘         │
│                                                               │
│  🆕 Semantic Search Service                                  │
│     ┌────────────────────────────────────────────┐         │
│     │ PukuIndexingService (already exists!)       │         │
│     │ ├─ semanticSearch(query, options)          │         │
│     │ ├─ SQLite + embeddings                     │         │
│     │ └─ Return top N similar code chunks        │         │
│     └────────────────────────────────────────────┘         │
│                                                               │
│  🆕 Configuration                                            │
│     ┌────────────────────────────────────────────┐         │
│     │ Settings                                    │         │
│     │ ├─ puku.inlineChat.enableSemanticSearch    │         │
│     │ ├─ puku.inlineChat.maxSearchResults: 3     │         │
│     │ └─ puku.inlineChat.minRelevanceScore: 0.7  │         │
│     └────────────────────────────────────────────┘         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Integration Points

### 3.1 Where to Inject Semantic Search

**File**: `src/extension/prompts/node/inline/inlineChatFixPrompt.tsx` (and similar for generate/doc/explain)

**Before** (Copilot's original):
```tsx
export class InlineChatFixPrompt extends PromptElement {
  render() {
    return (
      <>
        <SystemMessage>You are GitHub Copilot...</SystemMessage>
        <UserMessage>
          <Diagnostics />
          <SelectedCode />
          <UserQuery />
        </UserMessage>
      </>
    );
  }
}
```

**After** (With Puku semantic search):
```tsx
export class InlineChatFixPrompt extends PromptElement {
  async prepare() {
    // NEW: Fetch semantic search results
    if (this.configService.get('puku.inlineChat.enableSemanticSearch')) {
      this.semanticResults = await this.pukuIndexingService.semanticSearch(
        this.props.userQuery,
        {
          maxResults: 3,
          minScore: 0.7,
          excludeFile: this.props.document.uri
        }
      );
    }
  }

  render() {
    return (
      <>
        <SystemMessage>You are GitHub Copilot...</SystemMessage>
        <UserMessage>
          {/* NEW: Add semantic context BEFORE other context */}
          {this.semanticResults && (
            <PukuSemanticContext priority={800} results={this.semanticResults} />
          )}

          {/* KEEP: Copilot's existing context */}
          <Diagnostics />
          <SelectedCode />
          <UserQuery />
        </UserMessage>
      </>
    );
  }
}
```

---

## 4. Implementation Plan

### Phase 1: Create Semantic Context Component (Week 1)

**File**: `src/extension/prompts/node/inline/pukuSemanticContext.tsx`

```tsx
/*---------------------------------------------------------------------------------------------
 *  Puku AI - Semantic Search Context for Inline Chat
 *  Injects workspace-aware code patterns into Copilot's inline chat prompts
 *--------------------------------------------------------------------------------------------*/

import { PromptElement, PromptSizing, TextChunk } from '@vscode/prompt-tsx';
import { CodeBlock } from '../../panel/safeElements';
import { IPukuIndexingService, SemanticSearchResult } from '../../../pukuIndexing/node/pukuIndexingService';

export interface PukuSemanticContextProps {
  results: SemanticSearchResult[];
  languageId: string;
}

/**
 * Semantic search context component for Puku inline chat
 * Adds similar code patterns from workspace to prompt
 */
export class PukuSemanticContext extends PromptElement<PukuSemanticContextProps> {
  render(state: void, sizing: PromptSizing) {
    const { results, languageId } = this.props;

    if (!results || results.length === 0) {
      return null;
    }

    return (
      <TextChunk priority={800}>
        Similar code patterns in your workspace:<br />
        {results.map((result, i) => (
          <CodeBlock key={i} language={languageId}>
            // From: {result.file} (relevance: {(result.score * 100).toFixed(0)}%)<br />
            {result.chunk}
          </CodeBlock>
        ))}
        <br />
      </TextChunk>
    );
  }
}
```

### Phase 2: Modify Prompt Files (Week 1)

**Files to Modify** (4 files):
1. `src/extension/prompts/node/inline/inlineChatFixPrompt.tsx`
2. `src/extension/prompts/node/inline/inlineChatGenerateCodePrompt.tsx`
3. `src/extension/prompts/node/inline/inlineChatGenerateMarkdownPrompt.tsx`
4. `src/extension/prompts/node/inline/inlineChatEditCodePrompt.tsx`

**Changes**:
```tsx
// Add import
import { PukuSemanticContext } from './pukuSemanticContext';
import { IPukuIndexingService } from '../../../pukuIndexing/node/pukuIndexingService';

// Modify class
export class InlineChatFixPrompt extends PromptElement {
  constructor(
    props: InlineFixProps,
    @IIgnoreService private readonly ignoreService: IIgnoreService,
    @IParserService private readonly parserService: IParserService,
    // NEW: Inject Puku services
    @IPukuIndexingService private readonly pukuIndexingService: IPukuIndexingService,
    @IPukuConfigService private readonly pukuConfigService: IPukuConfigService
  ) {
    super(props);
  }

  async prepare() {
    // NEW: Fetch semantic search if enabled
    const enableSemanticSearch = this.pukuConfigService.getConfig()?.inlineChat?.enableSemanticSearch ?? true;

    if (enableSemanticSearch) {
      const query = `${this.props.promptContext.query}\n\n${this.props.documentContext.selection}`;

      this.semanticResults = await this.pukuIndexingService.semanticSearch(query, {
        maxResults: this.pukuConfigService.getConfig()?.inlineChat?.maxSearchResults ?? 3,
        minScore: this.pukuConfigService.getConfig()?.inlineChat?.minRelevanceScore ?? 0.7,
        excludeFile: this.props.documentContext.document.uri
      });
    }
  }

  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <SystemMessage priority={1000}>
          {/* Keep Copilot's system prompt */}
        </SystemMessage>

        <UserMessage priority={900}>
          {/* NEW: Add semantic context */}
          {this.semanticResults && this.semanticResults.length > 0 && (
            <PukuSemanticContext
              priority={800}
              results={this.semanticResults}
              languageId={this.props.documentContext.document.languageId}
            />
          )}

          {/* KEEP: All existing Copilot context */}
          <Diagnostics />
          <SelectedCode />
          <UserQuery />
        </UserMessage>
      </>
    );
  }
}
```

### Phase 3: Configuration (Week 1)

**File**: `src/extension/pukuIndexing/common/pukuConfig.ts`

```typescript
export interface PukuInlineChatConfig {
  enableSemanticSearch: boolean;       // Default: true
  maxSearchResults: number;            // Default: 3
  minRelevanceScore: number;           // Default: 0.7
  includeImports: boolean;             // Default: true
  includeTypes: boolean;               // Default: true
}

export interface PukuConfig {
  // ... existing config ...
  inlineChat?: PukuInlineChatConfig;
}
```

**File**: `package.json`

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "puku.inlineChat.enableSemanticSearch": {
          "type": "boolean",
          "default": true,
          "description": "Use semantic search to find similar code patterns in workspace"
        },
        "puku.inlineChat.maxSearchResults": {
          "type": "number",
          "default": 3,
          "minimum": 1,
          "maximum": 5,
          "description": "Maximum number of similar code examples to include"
        },
        "puku.inlineChat.minRelevanceScore": {
          "type": "number",
          "default": 0.7,
          "minimum": 0,
          "maximum": 1,
          "description": "Minimum relevance score for semantic search results (0-1)"
        }
      }
    }
  }
}
```

---

## 5. Files to Copy/Keep from Copilot

### Keep As-Is (95% of code)

```
src/extension/inlineChat/
├── node/
│   ├── inlineChatIntent.ts                    ✅ Keep
│   ├── inlineChatConstants.ts                 ✅ Keep
│   ├── promptCraftingTypes.ts                 ✅ Keep
│   └── codeContextRegion.ts                   ✅ Keep
│
└── vscode-node/
    ├── inlineChatCommands.ts                  ✅ Keep (no changes)
    ├── inlineChatCodeActions.ts               ✅ Keep (no changes)
    └── inlineChatNotebookActions.ts           ✅ Keep (no changes)

src/extension/prompts/node/inline/
├── inlineChatFixPrompt.tsx                    🔧 Modify (add semantic search)
├── inlineChatGenerateCodePrompt.tsx           🔧 Modify (add semantic search)
├── inlineChatGenerateMarkdownPrompt.tsx       🔧 Modify (add semantic search)
├── inlineChatEditCodePrompt.tsx               🔧 Modify (add semantic search)
├── pukuSemanticContext.tsx                    🆕 Add (new file)
└── [all other files]                          ✅ Keep (no changes)
```

---

## 6. Example: Before/After

### Before (Copilot Only)

**User**: "add error handling"

**Copilot's Prompt**:
```
[System]
You are GitHub Copilot, an AI assistant...

[User]
Code to fix:
```typescript
function divide(a, b) {
  return a / b;
}
```

User instruction: add error handling
```

**Result**: Generic error handling (may not match your patterns)

---

### After (Copilot + Puku Semantic Search)

**User**: "add error handling"

**Enhanced Prompt**:
```
[System]
You are GitHub Copilot, an AI assistant...

[User]
Similar code patterns in your workspace:

```typescript
// From: src/utils/math.ts (relevance: 85%)
function safeMod(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Modulo by zero');
  }
  return a % b;
}
```

Code to fix:
```typescript
function divide(a, b) {
  return a / b;
}
```

User instruction: add error handling
```

**Result**: Matches your workspace patterns! Uses same error handling style as your existing code.

---

## 7. Testing Strategy

### Unit Tests

```typescript
describe('Puku Semantic Context Integration', () => {
  it('should inject semantic results into prompt', async () => {
    const prompt = new InlineChatFixPrompt({ ... }, pukuIndexingService, pukuConfigService);
    await prompt.prepare();
    const rendered = await prompt.renderToMessages();

    expect(rendered[1].content).toContain('Similar code patterns');
  });

  it('should skip semantic search when disabled', async () => {
    pukuConfigService.setConfig({ inlineChat: { enableSemanticSearch: false } });
    const prompt = new InlineChatFixPrompt({ ... }, pukuIndexingService, pukuConfigService);
    await prompt.prepare();
    const rendered = await prompt.renderToMessages();

    expect(rendered[1].content).not.toContain('Similar code patterns');
  });

  it('should limit results based on config', async () => {
    pukuConfigService.setConfig({ inlineChat: { maxSearchResults: 2 } });
    const prompt = new InlineChatFixPrompt({ ... }, pukuIndexingService, pukuConfigService);
    await prompt.prepare();

    expect(mockIndexingService.semanticSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxResults: 2 })
    );
  });
});
```

### Integration Tests

```typescript
describe('Inline Chat with Semantic Search (E2E)', () => {
  it('should generate contextually relevant fixes', async () => {
    // Setup: Workspace with existing error handling patterns
    await indexWorkspace(['src/utils/math.ts']);

    // User action: Select code, press Ctrl+I, type "add error handling"
    const result = await executeInlineChat({
      code: 'function divide(a, b) { return a / b; }',
      instruction: 'add error handling'
    });

    // Should match workspace patterns
    expect(result).toContain('if (b === 0)');
    expect(result).toContain("throw new Error('");
  });
});
```

---

## 8. Migration Path

### Option A: Gradual Rollout (Recommended)

1. **Week 1**: Add semantic search, disabled by default
   - Config: `puku.inlineChat.enableSemanticSearch: false`
   - Test internally

2. **Week 2**: Enable for beta users
   - Config: `puku.inlineChat.enableSemanticSearch: true` (for insiders)
   - Collect feedback

3. **Week 3**: Enable for all users
   - Make it default: `default: true`
   - Monitor metrics

### Option B: Immediate Rollout

1. **Week 1**: Add semantic search, enabled by default
   - Config: `puku.inlineChat.enableSemanticSearch: true`
   - Ship to all users

---

## 9. Success Metrics

### A/B Test: Semantic Search On vs. Off

| Metric | Without Semantic Search | With Semantic Search | Target Improvement |
|--------|------------------------|----------------------|-------------------|
| Acceptance Rate | 75% | 85%+ | +10% |
| Style Match | 80% | 95%+ | +15% |
| User Satisfaction | 7.5/10 | 8.5/10+ | +1 point |
| Context Relevance | 70% | 90%+ | +20% |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Semantic search slows prompts | High | Cache results, parallel fetch |
| No relevant results found | Medium | Gracefully degrade (show nothing) |
| Breaking Copilot updates | Low | Pin Copilot version, test updates |
| Token budget exceeded | Medium | Limit to 3 results, truncate if needed |

---

## 11. Timeline

### Week 1: Foundation
- ✅ Create `PukuSemanticContext.tsx`
- ✅ Add config options
- ✅ Unit tests

### Week 2: Integration
- ✅ Modify 4 prompt files
- ✅ Wire up services
- ✅ Integration tests

### Week 3: Polish
- ✅ Performance optimization
- ✅ User documentation
- ✅ Beta rollout

---

## 12. Documentation

### User-Facing Docs

**File**: `docs/inline-chat-semantic-search.md`

```markdown
# Semantic Search in Inline Chat

Puku's inline chat now searches your workspace for similar code patterns
and includes them as context. This helps the AI generate code that matches
your existing style and conventions.

## How it Works

1. You press Ctrl+I and type an instruction
2. Puku searches your workspace for similar code
3. Top 3 matches are added to the AI prompt
4. AI generates code matching your patterns

## Configuration

```json
{
  "puku.inlineChat.enableSemanticSearch": true,
  "puku.inlineChat.maxSearchResults": 3,
  "puku.inlineChat.minRelevanceScore": 0.7
}
```

## Example

**Before** (Generic):
```typescript
function validate(input) {
  if (!input) return false;
  return true;
}
```

**After** (Matches your workspace):
```typescript
import { z } from 'zod';  // Found in your code!

function validate(input: unknown): User {
  const schema = z.object({ name: z.string() });
  return schema.parse(input);
}
```
```

---

**Summary**:
- ✅ Keep 95% of Copilot's battle-tested inline chat
- ✅ Add 5% enhancement: semantic search
- ✅ Simple integration: just inject `PukuSemanticContext` component
- ✅ Low risk, high impact

**Next Steps**: Start with `PukuSemanticContext.tsx` component?
