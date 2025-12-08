# PRD: Puku NES (Next Edit Suggestions)

**Status**: ✅ Implemented
**Feature ID**: NES-001
**Created**: 2025-01-08
**Owner**: Puku AI Team

---

## Executive Summary

**Puku NES (Next Edit Suggestions)** is an AI-powered feature that predicts and suggests your **next logical code edit** based on context, recent changes, and coding patterns. Unlike inline completions (Tab-based FIM) that complete code at the cursor position, NES proactively suggests where and what to edit next.

**Key Differentiator**: NES predicts **BOTH** the location and content of your next edit, enabling rapid successive edits via keyboard shortcuts.

---

## 1. What is NES?

### The Problem

Traditional code completion (FIM/Tab completions):
- ✅ Completes code **at cursor position**
- ❌ Requires manual cursor movement to next edit location
- ❌ No awareness of multi-step changes (e.g., refactoring, adding error handling)

**Result**: Developers spend time manually navigating between related edits.

### The Solution: NES

NES predicts your **next edit** by analyzing:
1. **Current code context** (surrounding lines, imports, functions)
2. **Recent edits** (what you just changed)
3. **Common patterns** (e.g., after adding a parameter, update all call sites)
4. **Language idioms** (e.g., after adding error handling, add logging)

**Result**: Press `Ctrl+I` (or configure auto-trigger) to jump to the next edit location with AI-generated suggestions.

---

## 2. How NES Works

### User Experience Flow

```
1. User makes an edit (e.g., adds a new function parameter)
   ↓
2. NES analyzes context and predicts next edit location
   ↓
3. Inline suggestion appears at predicted location
   ↓
4. User presses Tab to accept OR Ctrl+I to see alternatives
   ↓
5. Repeat for multi-step changes
```

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Show NES** | `Ctrl+I` | Trigger next edit suggestion at predicted location |
| **Accept** | `Tab` | Accept the suggested edit |
| **Reject** | `Esc` | Dismiss suggestion |
| **Cycle alternatives** | `Alt+[` / `Alt+]` | Cycle through multiple suggestions |

---

## 3. Examples & Use Cases

### Example 1: Adding Error Handling

**Scenario**: You just added a try-catch block. NES predicts you'll want to log the error next.

```typescript
// USER EDIT: Added try-catch
async function fetchData(url: string) {
  try {
    const response = await fetch(url);
    return response.json();
  } catch (error) {
    // ← CURSOR HERE after user edit
  }
}

// NES PREDICTION: Suggests adding logging
async function fetchData(url: string) {
  try {
    const response = await fetch(url);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error); // ← NES suggests this
    throw error; // ← And this on next accept
  }
}
```

**User Action**: Press `Ctrl+I` → NES shows suggestion → Press `Tab` to accept

---

### Example 2: Function Parameter Refactoring

**Scenario**: You added a new parameter to a function. NES predicts you'll need to update all call sites.

```typescript
// BEFORE: User edits function signature
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// USER EDIT: Adds tax parameter
function calculateTotal(items: Item[], taxRate: number) {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

// NES PREDICTION 1: First call site
const total1 = calculateTotal(cartItems); // ← NES highlights this line
//                                          ↓ Suggests:
const total1 = calculateTotal(cartItems, 0.08);

// After accepting, NES PREDICTION 2: Next call site
const total2 = calculateTotal(orderItems); // ← NES moves here
//                                            ↓ Suggests:
const total2 = calculateTotal(orderItems, 0.08);
```

**User Action**: Press `Ctrl+I` → Accept → `Ctrl+I` → Accept (rapid successive edits)

---

### Example 3: Import Management

**Scenario**: You used a new utility function. NES predicts you need to import it.

```typescript
// USER EDIT: Uses new function
function processData(data: string[]) {
  return data.map(item => formatCurrency(parseFloat(item))); // ← Used formatCurrency
}

// NES PREDICTION: Suggests adding import at top of file
import { formatCurrency } from './utils/formatters'; // ← NES suggests this

function processData(data: string[]) {
  return data.map(item => formatCurrency(parseFloat(item)));
}
```

**User Action**: NES auto-shows suggestion at top of file → Press `Tab` to accept

---

### Example 4: Test Generation

**Scenario**: You just implemented a new function. NES predicts you'll want to write a test.

```typescript
// USER EDIT: New function
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// NES PREDICTION: Suggests creating test file
// File: validateEmail.test.ts (NES offers to create this)

import { validateEmail } from './validateEmail';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

**User Action**: `Ctrl+I` → NES shows "Create test file?" → Accept → File created with test template

---

## 4. Technical Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUKU NES SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Editor     │      │  XtabProvider│      │  Puku API    │  │
│  │   (VS Code)  │◄────►│   (Client)   │◄────►│  (Backend)   │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│    User edits            Context gathering      Codestral Mamba  │
│    Ctrl+I trigger        Prompt construction    256k context     │
│    Display suggestions   Streaming response     Code generation  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```typescript
// 1. USER MAKES AN EDIT
editor.onDidChangeTextDocument((event) => {
  // Detect significant edit (not just typing)
  if (isSignificantEdit(event)) {
    nesProvider.prepareNextEditPrediction();
  }
});

// 2. CONTEXT GATHERING
async function gatherContext(document, position, recentEdits) {
  return {
    currentFile: document.getText(),
    cursorPosition: position,
    recentEdits: recentEdits.slice(-5), // Last 5 edits
    languageId: document.languageId,
    imports: extractImports(document),
    relatedFiles: await getRelatedFiles(document),
    diagnostics: await getDiagnostics(document)
  };
}

// 3. PROMPT CONSTRUCTION
const nesPrompt = {
  messages: [
    {
      role: 'system',
      content: `You are a code editing assistant. Predict the user's next logical edit.

Rules:
- Suggest the NEXT edit location and content
- Consider recent edits and patterns
- Provide multiple alternatives if applicable
- Output ONLY the code change, no explanations`
    },
    {
      role: 'user',
      content: `Current file:
${context.currentFile}

Recent edits:
${context.recentEdits.map(e => `- Line ${e.line}: ${e.change}`).join('\n')}

Predict the next edit.`
    }
  ],
  stream: true,
  max_tokens: 4096,
  temperature: 0.7
};

// 4. API REQUEST
const response = await fetch('https://api.puku.sh/v1/nes/edits', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(nesPrompt)
});

// 5. STREAMING RESPONSE
for await (const chunk of streamResponse(response)) {
  // Update inline suggestion in real-time
  editor.showInlineEdit(chunk.delta.content, predictedLocation);
}
```

---

## 5. Puku NES vs Other Features

### Comparison Matrix

| Feature | Trigger | Location | Use Case | Model |
|---------|---------|----------|----------|-------|
| **FIM (Tab)** | Automatic typing | Current cursor | Complete code at cursor | Codestral Mamba |
| **NES (Ctrl+I)** | Manual/Auto | Predicted location | Next logical edit | Codestral Mamba |
| **Chat** | Manual | Chat panel | Q&A, explanations | GLM-4.6 |
| **Agent Mode** | Manual | Chat panel | Multi-file changes | GLM-4.6 |

### When to Use NES vs FIM

**Use FIM (Tab completions) when**:
- ✅ Writing new code line-by-line
- ✅ Completing function signatures
- ✅ Auto-completing variable names

**Use NES (Ctrl+I) when**:
- ✅ Refactoring across multiple locations
- ✅ Adding error handling/logging
- ✅ Updating call sites after API changes
- ✅ Adding imports/dependencies

---

## 6. Configuration

### VS Code Settings

```json
{
  // Enable/disable NES
  "puku.chat.inlineEdits.triggerOnEditorChangeAfterSeconds": 2,

  // Custom NES endpoint (optional)
  "puku.chat.advanced.inlineEdits.xtabProvider.url": "https://api.puku.sh/v1/nes/edits",

  // Custom API key (optional)
  "puku.chat.advanced.inlineEdits.xtabProvider.apiKey": "pk_your_key_here",

  // Model configuration
  "puku.chat.advanced.inlineEdits.xtabProvider.modelConfiguration": {
    "modelName": "puku-nes-codestral",
    "temperature": 0.7
  },

  // Display settings
  "puku.chat.inlineEdits.nextCursorPrediction.displayLine": true,

  // Context limits
  "puku.chat.inlineEdits.nextCursorPrediction.currentFileMaxTokens": 2000
}
```

---

## 7. Implementation Details

### File Locations

| Component | File | Lines |
|-----------|------|-------|
| **NES Provider** | `src/extension/xtab/node/xtabProvider.ts` | 73-1310 |
| **Endpoint Config** | `src/platform/endpoint/node/proxyXtabEndpoint.ts` | 13-43 |
| **API Client** | `src/platform/api/common/pukuApiClient.ts` | 135-137 |
| **Backend API** | `puku-worker/src/routes/completions.ts` | 780-874 |

### Key Functions

```typescript
// Main NES entry point
class XtabProvider implements IStatelessNextEditProvider {
  public async provideNextEdit(
    request: StatelessNextEditRequest,
    pushEdit: PushEdit,
    logContext: InlineEditRequestLogContext,
    cancellationToken: CancellationToken
  ): Promise<StatelessNextEditResult>
}

// Streaming edits to UI
private async streamEdits(
  request: StatelessNextEditRequest,
  pushEdit: PushEdit,
  endpoint: IChatEndpoint,
  messages: Raw.ChatMessage[],
  editWindow: OffsetRange,
  // ... more params
): Promise<void>

// Endpoint configuration
private getEndpoint(configuredModelName: string | undefined): ChatEndpoint {
  const url = 'https://api.puku.sh/v1/nes/edits';
  const apiKey = 'pk_...';
  return this.instaService.createInstance(XtabEndpoint, url, apiKey, configuredModelName);
}
```

---

## 8. Model Details

### Codestral Mamba (mistralai/codestral-2501)

**Why Codestral for NES?**

| Capability | Value | Benefit |
|------------|-------|---------|
| **Context Window** | 256k tokens | Analyze entire file + related files |
| **Output Tokens** | 4096 | Generate complex multi-line edits |
| **Streaming** | Yes | Real-time suggestions |
| **Code Specialization** | Trained on code | Better edit predictions |
| **Temperature** | 0.7 | Balance creativity/accuracy |

**Prompt Strategy**:
- Uses Xtab275 prompting strategy (GitHub Copilot's production approach)
- Minimal 2-sentence system prompt for fast inference
- No XML tags in output (raw code only)
- Direct line-by-line diff parsing for efficient streaming
- Optimized for token efficiency (~50% fewer prompt tokens vs structured approaches)
- Includes recent edit history (last 5 edits)
- Provides current file context with line numbers
- Uses special tags for code regions in prompt (`<|code_to_edit|>`, `<|cursor|>`)

---

## 9. Performance Metrics

### Latency Targets

| Metric | Target | Actual |
|--------|--------|--------|
| **First token** | < 500ms | ~400ms |
| **Full suggestion** | < 2s | ~1.5s |
| **Context gathering** | < 100ms | ~80ms |

### Accuracy Goals

| Metric | Target |
|--------|--------|
| **Prediction accuracy** | > 60% accept rate |
| **Location accuracy** | > 70% within 5 lines |
| **Content relevance** | > 80% useful suggestions |

---

## 10. Example Session

### Complete Workflow: Adding Authentication

```typescript
// STEP 1: User adds auth check
function handleRequest(req: Request) {
  if (!req.headers.authorization) { // ← USER EDIT
    // ← CURSOR HERE
  }

  // existing code...
}

// NES PREDICTION 1: Add error response
function handleRequest(req: Request) {
  if (!req.headers.authorization) {
    return new Response('Unauthorized', { status: 401 }); // ← NES suggests
  }

  // existing code...
}

// USER: Accepts (Tab)
// NES PREDICTION 2: Extract token
function handleRequest(req: Request) {
  if (!req.headers.authorization) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = req.headers.authorization.split(' ')[1]; // ← NES suggests
  // existing code...
}

// USER: Accepts (Tab)
// NES PREDICTION 3: Verify token
function handleRequest(req: Request) {
  if (!req.headers.authorization) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = req.headers.authorization.split(' ')[1];
  const user = await verifyToken(token); // ← NES suggests
  if (!user) { // ← And this
    return new Response('Invalid token', { status: 403 });
  }

  // existing code...
}

// USER: Accepts (Tab)
// NES PREDICTION 4: Add import at top
import { verifyToken } from './auth'; // ← NES jumps to top of file

function handleRequest(req: Request) {
  // ... rest of code
}
```

**Total time**: ~10 seconds for 4 edits (vs ~30 seconds manually)

---

## 11. Known Limitations

### Current Constraints

1. **Single-file focus**: NES primarily predicts edits within the current file
   - **Planned**: Multi-file refactoring support

2. **Language coverage**: Works best with TypeScript, JavaScript, Python, Go
   - **Planned**: Expand to all languages

3. **Context window**: Limited to ~12k tokens of current file context
   - **Workaround**: Uses intelligent clipping of long files

4. **No undo tracking**: Doesn't track if user undoes suggested edit
   - **Planned**: Edit survival tracking (Issue #65)

---

## 12. Roadmap

### Phase 1: ✅ Core NES (Completed)
- [x] Basic next edit prediction
- [x] Streaming suggestions
- [x] Keyboard shortcuts
- [x] Puku API integration

### Phase 2: 🚧 Enhanced Intelligence (In Progress)
- [ ] Multi-file refactoring
- [ ] Better location prediction (90%+ accuracy)
- [ ] Learning from user acceptance patterns
- [ ] Rejection tracking (Issue #56)

### Phase 3: 🔮 Future
- [ ] Voice-triggered NES ("next edit")
- [ ] Predictive diff view
- [ ] Team-wide pattern learning
- [ ] IDE-wide refactoring chains

---

## 13. References

- **GitHub Copilot NES**: [Microsoft's implementation](https://github.com/microsoft/vscode-copilot-chat/blob/main/src/extension/xtab/node/xtabProvider.ts)
- **Cursor's Composer**: Multi-step edit prediction inspiration
- **Feature #64**: [Multiple Completions](https://github.com/puku-sh/puku-vs-editor/issues/64)
- **Feature #55**: [Forward Stability](https://github.com/puku-sh/puku-vs-editor/issues/55)

---

## 14. FAQs

**Q: How is NES different from Tab completions?**
A: Tab (FIM) completes code **at your cursor**. NES predicts **where to edit next** and what to change.

**Q: Does NES work offline?**
A: No, NES requires API access to Puku backend (Codestral Mamba).

**Q: Can I disable NES?**
A: Yes, set `puku.chat.inlineEdits.triggerOnEditorChangeAfterSeconds: null`

**Q: How much does NES cost?**
A: Included with Puku API (same pricing as FIM completions).

**Q: Does NES use GitHub Copilot?**
A: No! Puku NES uses Codestral Mamba via OpenRouter (no Copilot dependency).

---

## Appendix A: API Contract

### Request Format

```typescript
POST https://api.puku.sh/v1/nes/edits

{
  "messages": [
    {
      "role": "system",
      "content": "You are a code editing assistant..."
    },
    {
      "role": "user",
      "content": "Current file:\n...\n\nPredict next edit."
    }
  ],
  "stream": true,
  "max_tokens": 4096,
  "temperature": 0.7
}
```

### Response Format (Streaming)

```
data: {"id":"nes-123","object":"chat.completion.chunk","created":1704672000,"model":"mistralai/codestral-2501","choices":[{"index":0,"delta":{"role":"assistant","content":"const"},"finish_reason":null}]}

data: {"id":"nes-123","object":"chat.completion.chunk","created":1704672000,"model":"mistralai/codestral-2501","choices":[{"index":0,"delta":{"content":" token"},"finish_reason":null}]}

data: [DONE]
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-08
**Contributors**: Puku AI Team, inspired by Microsoft Copilot & Cursor
