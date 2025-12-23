# Product Requirements Document (PRD)
## Puku Inline Chat - AI-Powered Code Editing

**Version:** 1.0
**Author:** Puku AI Team
**Date:** December 2024
**Status:** Draft

---

## 1. Executive Summary

Implement a Copilot-style inline chat feature for Puku Editor that uses **Puku AI API** instead of GitHub Copilot. Users press **Ctrl+I** to open an inline input box, type instructions (e.g., "add error handling"), and receive AI-generated code edits with diff preview.

### Key Differentiators

- ✅ Uses **your Puku API credentials** (not GitHub Copilot)
- ✅ **Model flexibility** (GLM-4.6, DeepSeek, Claude, etc.)
- ✅ **Semantic search integration** for context-aware edits
- ✅ **Cost control** via Puku dashboard
- ✅ **Privacy-first** (works with local models)

---

## 2. Problem Statement

### Current Limitations

1. **Inline chat uses GitHub Copilot API** - Users cannot use their own API keys
2. **Vendor lock-in** - Dependent on GitHub Copilot subscription
3. **No cost control** - Cannot track usage or set quotas
4. **Limited model choice** - Stuck with GPT-4 only
5. **Privacy concerns** - Code sent to GitHub servers

### User Pain Points

- "I want to use my Puku API key for inline chat"
- "Why can't I choose which model to use?"
- "I need offline support with local models"
- "Copilot is expensive for my team"

---

## 3. Goals & Non-Goals

### Goals (MVP)

✅ **G1**: Support `/fix`, `/generate`, `/doc`, `/explain` intents
✅ **G2**: Use Puku API (`/v1/chat/completions`) with user's API key
✅ **G3**: Show inline diff preview (like Copilot)
✅ **G4**: **Semantic search integration** for context-aware code generation
✅ **G5**: Support streaming responses
✅ **G6**: Handle diagnostics (errors/warnings)

### Non-Goals (Future)

❌ Multi-turn conversations (just single request/response)
❌ Tool calling (read files, run commands)
❌ Notebook support (code cells)
❌ Review comments workflow

---

## 4. User Experience

### 4.1 User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Trigger Inline Chat                                 │
│ - User selects code OR positions cursor                     │
│ - Presses Ctrl+I (Cmd+I on Mac)                            │
│ - Inline input box appears                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: User Input                                          │
│ Types instruction:                                          │
│ - "add error handling"                                      │
│ - "fix this bug"                                            │
│ - "explain this code"                                       │
│ - "generate tests"                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Semantic Search (NEW!)                             │
│ - Find similar code patterns in workspace                   │
│ - Retrieve relevant imports and type definitions           │
│ - Pass as context to AI model                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: AI Processing                                       │
│ - Puku API receives request with:                          │
│   • User instruction                                        │
│   • Selected code                                           │
│   • Diagnostics (errors/warnings)                          │
│   • Semantic search results (similar code)                 │
│   • File language/context                                  │
│ - Model generates response (streaming)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Diff Preview                                        │
│ - Shows inline diff:                                        │
│   ✅ Green: Added lines                                     │
│   ❌ Red: Removed lines                                     │
│   📝 Explanation text                                       │
│ - User reviews changes                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Accept/Reject                                       │
│ - Accept: Press Enter → Code applied                       │
│ - Reject: Press Esc → Discard changes                      │
│ - Edit again: Type new instruction                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Example Interactions

**Example 1: Fix Error**

```typescript
// User selects this code (has error):
function divide(a, b) {
  return a / b;  // ⚠️ Division by zero possible
}

// User presses Ctrl+I, types: "add error handling"

// AI response (with semantic search context):
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

**Example 2: Generate Code**

```typescript
// User positions cursor, presses Ctrl+I, types:
// "create a user authentication middleware"

// AI response (using semantic search to find similar patterns):
async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 5. Technical Architecture

### 5.1 Architecture Diagram (Copilot-Style)

```
┌──────────────────────────────────────────────────────────────┐
│                    PUKU INLINE CHAT SYSTEM                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. USER INTERACTION LAYER                                   │
│     ┌────────────────────────────────────────────┐          │
│     │ Ctrl+I → PukuInlineChatWidget               │          │
│     │ - Input box at cursor                       │          │
│     │ - Intent buttons (/fix, /generate, etc.)   │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  2. COMMAND LAYER                                            │
│     ┌────────────────▼───────────────────────────┐          │
│     │ puku.inlineChat.start                       │          │
│     │ - Captures selection, diagnostics           │          │
│     │ - Routes to handler                         │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  3. CONTEXT GATHERING (Following Copilot Pattern)            │
│     ┌────────────────▼───────────────────────────┐          │
│     │ PukuInlineChatHandler                       │          │
│     │ ├─ CurrentSelection                         │          │
│     │ ├─ Diagnostics (errors/warnings)           │          │
│     │ ├─ FileIndentInfo                          │          │
│     │ ├─ LanguageServerContext                   │          │
│     │ └─ SemanticSearchFlow (NEW!)              │          │
│     │    • Query: instruction + selection         │          │
│     │    • Results: 2-3 similar code chunks      │          │
│     │    • Boosts context relevance              │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  4. PROMPT CONSTRUCTION (TSX-based like Copilot)            │
│     ┌────────────────▼───────────────────────────┐          │
│     │ InlineChatFixPrompt.tsx                     │          │
│     │ InlineChatGeneratePrompt.tsx                │          │
│     │ InlineChatDocPrompt.tsx                     │          │
│     │ InlineChatExplainPrompt.tsx                 │          │
│     │                                              │          │
│     │ Structure:                                   │          │
│     │ <SystemMessage>                             │          │
│     │   You are Puku AI assistant...              │          │
│     │ </SystemMessage>                            │          │
│     │ <UserMessage>                               │          │
│     │   <SemanticContext /> (NEW!)               │          │
│     │   <CustomInstructions />                    │          │
│     │   <Diagnostics />                           │          │
│     │   <SelectedCode />                          │          │
│     │   <UserQuery />                             │          │
│     │ </UserMessage>                              │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  5. API LAYER                                                │
│     ┌────────────────▼───────────────────────────┐          │
│     │ PukuAIEndpoint                              │          │
│     │ POST /v1/chat/completions                   │          │
│     │ Headers:                                     │          │
│     │   Authorization: Bearer pk_xxx              │          │
│     │ Body:                                        │          │
│     │   model: "glm-4.6"                          │          │
│     │   messages: [...]                           │          │
│     │   stream: true                              │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  6. RESPONSE PROCESSING                                      │
│     ┌────────────────▼───────────────────────────┐          │
│     │ PatchEditReplyProcessor                     │          │
│     │ - Extract code blocks (```...```)          │          │
│     │ - Parse markdown explanations              │          │
│     │ - Create TextEdit[] for diff preview       │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  7. DIFF PREVIEW & APPLICATION                               │
│     ┌────────────────▼───────────────────────────┐          │
│     │ WorkspaceEdit.applyEdit()                   │          │
│     │ - Show VS Code diff preview                │          │
│     │ - Accept (Enter) / Reject (Esc)            │          │
│     └────────────────────────────────────────────┘          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 File Structure (Following Copilot Reference)

```
puku-editor/src/chat/src/extension/
├── inlineChat/
│   ├── common/
│   │   └── inlineChatTypes.ts              # Shared types
│   ├── node/
│   │   ├── inlineChatIntent.ts             # Intent detection
│   │   └── patchEditProcessor.ts           # Edit parsing
│   └── vscode-node/
│       ├── pukuInlineChatHandler.ts        # 🆕 Main handler
│       ├── pukuInlineChatWidget.ts         # 🆕 UI widget
│       ├── inlineChatCommands.ts           # ✏️ Update commands
│       └── inlineChatCodeActions.ts        # ✏️ Update actions
│
├── prompts/node/inline/
│   ├── pukuInlineChatFixPrompt.tsx         # 🆕 /fix prompt
│   ├── pukuInlineChatGeneratePrompt.tsx    # 🆕 /generate prompt
│   ├── pukuInlineChatDocPrompt.tsx         # 🆕 /doc prompt
│   ├── pukuInlineChatExplainPrompt.tsx     # 🆕 /explain prompt
│   └── pukuSemanticContext.tsx             # 🆕 Semantic search
│
└── pukuai/
    ├── node/
    │   └── pukuSemanticSearchFlow.ts       # 🆕 Semantic search
    └── vscode-node/
        └── pukuInlineChatEndpoint.ts       # 🆕 API client

Legend:
🆕 = New file
✏️ = Modified file
```

---

## 6. Semantic Search Integration

### 6.1 Why Semantic Search?

**Problem**: AI models lack workspace-specific context

- Don't know your coding patterns
- Miss relevant type definitions
- Generate code that doesn't match your style

**Solution**: Semantic search provides relevant examples

- Find similar code in workspace
- Include imports and type definitions
- Boost accuracy and consistency

### 6.2 Semantic Search Flow

```typescript
class SemanticSearchFlow {
  async enhanceContext(
    instruction: string,
    selectedCode: string,
    document: vscode.TextDocument
  ): Promise<SemanticContext> {
    // 1. Build search query from instruction + selection
    const query = `${instruction}\n\n${selectedCode}`;

    // 2. Search workspace embeddings
    const results = await this.indexingService.semanticSearch(query, {
      maxResults: 3,  // Top 3 matches
      minScore: 0.7,  // Relevance threshold
      excludeFile: document.uri  // Don't include current file
    });

    // 3. Extract code chunks
    const similarCode = results.map(r => ({
      file: r.file,
      code: r.chunk,
      score: r.score
    }));

    // 4. Return enhanced context
    return {
      similarPatterns: similarCode,
      imports: this.extractImports(similarCode),
      types: this.extractTypes(similarCode)
    };
  }
}
```

### 6.3 Prompt Enhancement

```tsx
// pukuSemanticContext.tsx
export class SemanticContext extends PromptElement {
  async render() {
    const { similarPatterns, imports, types } = this.props.context;

    return (
      <TextChunk priority={800}>
        {similarPatterns.length > 0 && (
          <>
            Similar code patterns in your workspace:<br />
            {similarPatterns.map((p, i) => (
              <CodeBlock key={i} language={p.language}>
                // From: {p.file}<br />
                {p.code}
              </CodeBlock>
            ))}
          </>
        )}

        {imports.length > 0 && (
          <>
            Relevant imports:<br />
            {imports.map(imp => `import ${imp}\n`)}
          </>
        )}
      </TextChunk>
    );
  }
}
```

### 6.4 Example: Semantic-Enhanced Generation

**User Request**: "create a validation function"

**Without Semantic Search**:

```typescript
// Generic validation (may not match your patterns)
function validate(input: any): boolean {
  return input !== null && input !== undefined;
}
```

**With Semantic Search** (finds your existing validators):

```typescript
// Matches your workspace patterns! (found via semantic search)
import { z } from 'zod';  // ← Found in similar code
import { ValidationError } from './errors';  // ← Found in similar code

export const validateUserInput = (input: unknown): User => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  try {
    return schema.parse(input);
  } catch (error) {
    throw new ValidationError('Invalid user input', error);
  }
};
```

---

## 7. API Specifications

### 7.1 Puku API Request

```http
POST https://api.puku.sh/v1/chat/completions
Authorization: Bearer pk_your_api_key
Content-Type: application/json

{
  "model": "glm-4.6",
  "messages": [
    {
      "role": "system",
      "content": "You are Puku AI, a code editing assistant..."
    },
    {
      "role": "user",
      "content": "Fix this code:\n\n```typescript\nfunction divide(a, b) { return a / b; }\n```\n\nAdd error handling for division by zero.\n\nSimilar patterns in workspace:\n\n```typescript\n// From: src/utils/math.ts\nfunction safeMod(a: number, b: number): number {\n  if (b === 0) throw new Error('Modulo by zero');\n  return a % b;\n}\n```"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 7.2 Response Format (Streaming)

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"```typescript\n"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"function divide(a: number, b: number): number {\n"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"  if (b === 0) {\n"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"    throw new Error('Division by zero');\n"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"  }\n  return a / b;\n}\n```"},"finish_reason":"stop"}]}

data: [DONE]
```

---

## 8. Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

- [ ] Create `PukuInlineChatHandler` class
- [ ] Implement API client with Puku endpoint
- [ ] Add streaming response parser
- [ ] Create TSX prompt templates (fix, generate, doc, explain)

### Phase 2: Semantic Search Integration (Week 1-2)

- [ ] Implement `SemanticSearchFlow` for inline chat
- [ ] Create `SemanticContext` TSX component
- [ ] Add import/type extraction from search results
- [ ] Test context enhancement quality

### Phase 3: UI Integration (Week 2)

- [ ] Update `inlineChatCommands.ts` to use Puku handler
- [ ] Modify code actions to trigger Puku inline chat
- [ ] Implement diff preview with WorkspaceEdit
- [ ] Add accept/reject keybindings

### Phase 4: Testing & Polish (Week 3)

- [ ] Unit tests for handler, prompts, semantic search
- [ ] E2E tests for each intent (/fix, /generate, etc.)
- [ ] Performance optimization (cache, debounce)
- [ ] Documentation and examples

---

## 9. Configuration

### 9.1 Settings (package.json)

```json
{
  "puku.inlineChat.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable Puku inline chat (Ctrl+I)"
  },
  "puku.inlineChat.model": {
    "type": "string",
    "default": "glm-4.6",
    "enum": ["glm-4.6", "deepseek-chat", "claude-3.5-sonnet"],
    "description": "AI model for inline chat"
  },
  "puku.inlineChat.enableSemanticSearch": {
    "type": "boolean",
    "default": true,
    "description": "Use semantic search to find relevant code examples"
  },
  "puku.inlineChat.semanticSearchMaxResults": {
    "type": "number",
    "default": 3,
    "description": "Max number of semantic search results to include"
  },
  "puku.inlineChat.temperature": {
    "type": "number",
    "default": 0.7,
    "minimum": 0,
    "maximum": 2,
    "description": "Sampling temperature (0 = deterministic, 2 = creative)"
  }
}
```

---

## 10. Success Metrics

### Key Performance Indicators (KPIs)

1. **Adoption**: 70%+ of Puku users try inline chat within first month
2. **Accuracy**: 80%+ acceptance rate for generated edits
3. **Semantic Search Impact**: 30%+ improvement in edit relevance with semantic search vs. without
4. **Latency**: <2s time-to-first-token for streaming responses
5. **Cost**: 50%+ cost reduction vs. GitHub Copilot (user feedback)

### User Satisfaction Metrics

- 📊 **NPS Score**: Target 40+ (Promoters - Detractors)
- ⭐ **Rating**: 4.5+ stars on marketplace
- 💬 **Feedback**: Monitor Discord/GitHub issues for pain points

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Semantic search slows down requests** | High | Cache search results, limit to 3 chunks max |
| **Poor edit quality without semantic context** | Medium | Make semantic search optional, allow toggle in settings |
| **API rate limits** | Medium | Implement retry logic, show clear error messages |
| **Model hallucinations** | Low | Use temperature=0.7, validate output syntax |
| **Privacy concerns with semantic search** | Medium | Document that search is local-only, never sent externally |

---

## 12. Future Enhancements (Post-MVP)

### v1.1 Features

- [ ] Multi-turn conversations (chat history)
- [ ] Tool calling (read files, run tests)
- [ ] Code actions menu integration
- [ ] Custom prompt templates

### v1.2 Features

- [ ] Notebook support (Jupyter cells)
- [ ] Review comments workflow
- [ ] Batch edits across multiple files
- [ ] AI-suggested edits (proactive)

---

## 13. Appendix

### A. Comparison: Copilot vs. Puku Inline Chat

| Feature | GitHub Copilot | Puku Inline Chat |
|---------|---------------|------------------|
| **API** | GitHub Copilot API | Puku API (your choice) |
| **Models** | GPT-4 only | GLM-4.6, DeepSeek, Claude, etc. |
| **Cost** | $10-19/month subscription | Pay-as-you-go (your API) |
| **Privacy** | Code sent to GitHub | Local-first (optional cloud) |
| **Semantic Search** | ❌ No | ✅ Yes (workspace-aware) |
| **Offline** | ❌ No | ✅ Yes (with local models) |
| **Customization** | Limited | Full control (prompts, models) |

### B. References

- Copilot Inline Chat: `puku-editor/reference/vscode-copilot-chat/src/extension/inlineChat/`
- Copilot Prompts: `puku-editor/reference/vscode-copilot-chat/src/extension/prompts/node/inline/`
- Puku API Docs: https://docs.puku.ai/api/chat-completions
- Puku Semantic Search: `puku-editor/src/chat/src/extension/pukuIndexing/`

---

**Approval Sign-Off:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Manager | ___________ | ___________ | ______ |
| Engineering Lead | ___________ | ___________ | ______ |
| Design Lead | ___________ | ___________ | ______ |

---

**Questions?** Reach out on Discord or create a GitHub issue.
