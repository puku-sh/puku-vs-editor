# PRD: Prompt Engineering - Overview

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024
**Related**: [Main Overview](../01-overview.md) | [Context Gathering](../03-context-gathering.md)

---

## 1. Overview

Define how prompts are constructed for Puku inline chat using TSX-based prompt engineering (following Copilot's `@vscode/prompt-tsx` pattern).

### Goals

- ✅ Intent-specific prompts (/fix, /generate, /doc, /explain)
- ✅ TSX-based composition for maintainability
- ✅ Token budget management
- ✅ Context prioritization
- ✅ Reusable prompt components

---

## 2. Prompt Architecture

### 2.1 TSX Prompt System

**Pattern**: Following Copilot's `@vscode/prompt-tsx` library

```
┌──────────────────────────────────────────────────────────┐
│             TSX PROMPT ARCHITECTURE                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  PromptElement (Base Class)                              │
│  ├── prepare() - Async data fetching                     │
│  └── render() - Sync prompt generation                   │
│                                                           │
│  Message Components:                                     │
│  ├── <SystemMessage priority={1000}>                     │
│  ├── <UserMessage priority={900}>                        │
│  └── <AssistantMessage priority={800}>                   │
│                                                           │
│  Utility Components:                                     │
│  ├── <TextChunk priority={700}>                          │
│  ├── <CodeBlock language="typescript">                   │
│  ├── <Tag name="selection">                              │
│  └── <InstructionMessage>                                │
│                                                           │
│  Sizing:                                                 │
│  ├── flexGrow - Expand to fill space                     │
│  ├── flexReserve - Minimum guaranteed tokens             │
│  └── tokenBudget - Hard limit                            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Prompt Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. INTENT DETECTION                                      │
│    User: "add error handling"                           │
│    → Detected: /fix intent                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. CONTEXT GATHERING                                    │
│    ├─ Selection: function divide(a, b) { ... }         │
│    ├─ Diagnostics: None                                │
│    ├─ Semantic Search: Found safeMod() example         │
│    └─ File Metadata: TypeScript, 2 spaces              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PROMPT SELECTION                                     │
│    Intent: /fix → InlineChatFixPrompt.tsx              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. PROMPT COMPOSITION (TSX)                            │
│    <InlineChatFixPrompt>                               │
│      <SystemMessage>You are Puku AI...</SystemMessage> │
│      <UserMessage>                                      │
│        <SemanticContext />                             │
│        <Diagnostics />                                 │
│        <SelectedCode />                                │
│        <UserQuery />                                   │
│      </UserMessage>                                     │
│    </InlineChatFixPrompt>                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. TOKEN BUDGET ENFORCEMENT                            │
│    System: 5k tokens (10%)                             │
│    Context: 42.5k tokens (85%)                         │
│    Reserved: 2.5k tokens (5%)                          │
│    → Total: 50k / 50k ✅                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. FINAL PROMPT                                         │
│    [                                                    │
│      {role: "system", content: "You are..."},          │
│      {role: "user", content: "Fix this code..."}       │
│    ]                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Intent Types

### 3.1 Supported Intents

| Intent | Prompt File | Purpose | Example |
|--------|------------|---------|---------|
| **/fix** | `InlineChatFixPrompt.tsx` | Fix errors, add error handling | "add null checks" |
| **/generate** | `InlineChatGeneratePrompt.tsx` | Create new code | "create a validation function" |
| **/doc** | `InlineChatDocPrompt.tsx` | Generate documentation | "add JSDoc comments" |
| **/explain** | `InlineChatExplainPrompt.tsx` | Explain code | "explain this algorithm" |

### 3.2 Intent Detection

```typescript
class IntentDetector {
  detect(userMessage: string): Intent {
    const normalized = userMessage.trim().toLowerCase();

    // Explicit intent (/fix, /generate, etc.)
    if (normalized.startsWith('/')) {
      const intentName = normalized.split(' ')[0].substring(1);
      if (this.isValidIntent(intentName)) {
        return intentName as Intent;
      }
    }

    // Implicit intent detection
    if (this.hasFixKeywords(normalized)) return 'fix';
    if (this.hasGenerateKeywords(normalized)) return 'generate';
    if (this.hasDocKeywords(normalized)) return 'doc';
    if (this.hasExplainKeywords(normalized)) return 'explain';

    // Default to /fix if there are diagnostics, else /generate
    return this.hasDiagnostics() ? 'fix' : 'generate';
  }

  private hasFixKeywords(message: string): boolean {
    const fixKeywords = ['fix', 'repair', 'error', 'bug', 'handle', 'catch'];
    return fixKeywords.some(kw => message.includes(kw));
  }

  private hasGenerateKeywords(message: string): boolean {
    const genKeywords = ['create', 'generate', 'write', 'make', 'add'];
    return genKeywords.some(kw => message.includes(kw));
  }

  private hasDocKeywords(message: string): boolean {
    const docKeywords = ['document', 'comment', 'jsdoc', 'explain'];
    return docKeywords.some(kw => message.includes(kw));
  }
}
```

---

## 4. Prompt Components Hierarchy

### 4.1 Component Tree

```
InlineChatFixPrompt (Root)
├── SystemMessage (priority: 1000)
│   ├── Identity: "You are Puku AI..."
│   ├── Capabilities: "Expert in {languageId}..."
│   └── SafetyRules: Don't generate harmful code
│
├── HistoryWithInstructions (priority: 700)
│   └── InstructionMessage
│       ├── "Source code is in ``` blocks"
│       └── "User needs help modifying code"
│
├── UserMessage (priority: 900)
│   ├── CustomInstructions (priority: 725)
│   │   └── User's custom workspace rules
│   │
│   ├── SemanticContext (priority: 800)
│   │   ├── Similar code patterns
│   │   ├── Relevant imports
│   │   └── Type definitions
│   │
│   ├── Diagnostics (priority: 850)
│   │   └── Error/warning messages
│   │
│   ├── LanguageServerContext (priority: 700)
│   │   ├── Symbol at cursor
│   │   └── Type information
│   │
│   ├── SelectedCode (priority: 900, flexGrow: 2)
│   │   └── Code block with selection
│   │
│   └── UserQuery (priority: 1000)
│       └── User's instruction
│
└── ResponseFormat (priority: 500)
    └── Expected output format
```

### 4.2 Priority System

**How Priorities Work**:
- Higher number = Higher priority
- When token budget is exceeded, lowest priority items are dropped first
- Items with same priority are evaluated by order

**Priority Ranges**:
- `1000`: Critical (system prompt, user query)
- `900-999`: Very high (selected code, diagnostics)
- `800-899`: High (semantic context, custom instructions)
- `700-799`: Medium (language server context, history)
- `500-699`: Low (examples, formatting rules)

---

## 5. Token Budget Management

### 5.1 Budget Allocation

```typescript
interface TokenBudget {
  total: number;           // e.g., 50000 (60% of 128k model)
  reserved: number;        // 2500 (5% for response)
  available: number;       // 47500

  allocations: {
    systemPrompt: number;    // 5000 (10%)
    userQuery: number;       // 2500 (5%)
    selectedCode: number;    // 15000 (30%)
    semanticSearch: number;  // 12500 (25%)
    diagnostics: number;     // 2500 (5%)
    languageServer: number;  // 5000 (10%)
    metadata: number;        // 500 (1%)
    other: number;           // 4500 (9%)
  };
}
```

### 5.2 Sizing Strategies

**flexGrow**: Expand to fill available space
```tsx
<SelectedCode priority={900} flexGrow={2}>
  {selectedText}
</SelectedCode>
```

**flexReserve**: Minimum guaranteed tokens
```tsx
<UserMessage priority={900} flexReserve={2000}>
  {userQuery}
</UserMessage>
```

**tokenBudget**: Hard limit
```tsx
<SemanticContext priority={800} tokenBudget={12500}>
  {searchResults}
</SemanticContext>
```

### 5.3 Truncation Example

**Scenario**: Context exceeds 50k token budget

```
Before Truncation:
├── System: 5k ✅
├── User Query: 2.5k ✅
├── Selected Code: 20k ⚠️ (exceeds 15k allocation)
├── Semantic Search: 15k ⚠️ (exceeds 12.5k allocation)
├── Diagnostics: 2.5k ✅
└── Language Server: 8k ⚠️ (exceeds 5k allocation)
Total: 53k ❌ (exceeds 50k limit)

After Truncation (priority-based):
├── System: 5k ✅
├── User Query: 2.5k ✅
├── Selected Code: 15k ✅ (truncated, summarized)
├── Semantic Search: 12.5k ✅ (top 3 → top 2 results)
├── Diagnostics: 2.5k ✅ (never truncated)
└── Language Server: 5k ✅ (5 refs → 2 refs)
Total: 42.5k ✅
Reserved: 2.5k (for response)
Grand Total: 45k ✅ (under 50k limit)
```

---

## 6. Reusable Components

### 6.1 SemanticContext Component

```tsx
// pukuSemanticContext.tsx
export class SemanticContext extends PromptElement<SemanticContextProps> {
  async prepare() {
    // Fetch semantic search results
    this.results = await this.props.searchFlow.search(
      this.props.instruction,
      this.props.selectedCode,
      this.props.document
    );
  }

  render(state: void, sizing: PromptSizing) {
    const { results, imports, types } = this.results;

    if (results.length === 0) {
      return null; // No context to add
    }

    return (
      <TextChunk priority={800} flexGrow={1}>
        {results.length > 0 && (
          <>
            Similar code patterns in your workspace:<br />
            {results.map((result, i) => (
              <CodeBlock key={i} language={this.props.language}>
                // From: {result.file} (relevance: {(result.score * 100).toFixed(0)}%)<br />
                {result.chunk}
              </CodeBlock>
            ))}
          </>
        )}

        {imports.length > 0 && (
          <>
            <br />
            Relevant imports found in your codebase:<br />
            {imports.map(imp => `${imp}\n`)}
          </>
        )}
      </TextChunk>
    );
  }
}
```

### 6.2 Diagnostics Component

```tsx
// diagnosticsContext.tsx
export class Diagnostics extends PromptElement<DiagnosticsProps> {
  render(state: void, sizing: PromptSizing) {
    const { diagnostics } = this.props;

    if (diagnostics.length === 0) {
      return null;
    }

    return (
      <TextChunk priority={850}>
        <Tag name="diagnostics">
          Errors/Warnings in selection:<br />
          {diagnostics.map((d, i) => (
            <>{i + 1}. {d.message} (line {d.range.start.line + 1})<br /></>
          ))}
        </Tag>
      </TextChunk>
    );
  }
}
```

### 6.3 SelectedCode Component

```tsx
// selectedCode.tsx
export class SelectedCode extends PromptElement<SelectedCodeProps> {
  render(state: void, sizing: PromptSizing) {
    const { selection, language } = this.props;

    return (
      <TextChunk priority={900} flexGrow={2}>
        <Tag name="selection">
          Code to modify:<br />
          <CodeBlock language={language}>
            {selection.selectedText}
          </CodeBlock>
        </Tag>
      </TextChunk>
    );
  }
}
```

---

## 7. Example Prompts

### Example 1: /fix with Diagnostics

**Input**:
```typescript
// User selects:
function divide(a, b) {
  return a / b;
}

// User types: "add error handling"
// Diagnostics: None
// Semantic search: Found safeMod() function
```

**Generated Prompt**:
```
[System]
You are Puku AI, an AI programming assistant.
When asked for your name, you must respond with "Puku AI".
You are a world class expert in programming, and especially good at TypeScript.

Follow the user's requirements carefully & to the letter.
First think step-by-step - describe your plan in pseudocode, written out in great detail.
Then output the code in a single code block.
Minimize any other prose.

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

Code to modify:

```typescript
function divide(a, b) {
  return a / b;
}
```

User instruction: add error handling

File: src/calculator.ts
Language: TypeScript
Indent: 2 spaces
```

### Example 2: /generate

**Input**:
```typescript
// Cursor at empty line
// User types: "create a user validation function"
// Semantic search: Found zod validation examples
```

**Generated Prompt**:
```
[System]
You are Puku AI, an AI programming assistant.
Generate code that is clean, well-structured, and follows best practices.

[User]
Similar code patterns in your workspace:

```typescript
// From: src/validators/product.ts (relevance: 78%)
import { z } from 'zod';

export const validateProduct = (input: unknown): Product => {
  const schema = z.object({
    name: z.string().min(1),
    price: z.number().positive(),
  });
  return schema.parse(input);
};
```

Relevant imports found in your codebase:
import { z } from 'zod';
import { ValidationError } from './errors';

User instruction: create a user validation function

File: src/validators/user.ts
Language: TypeScript
Indent: 2 spaces
```

---

## 8. Performance Optimization

### 8.1 Caching Strategy

| Component | Cache Duration | Cache Key |
|-----------|----------------|-----------|
| System Prompt | Permanent | `system-prompt-${languageId}` |
| Semantic Search | 10 minutes | `semantic-${instruction}-${hash(selection)}` |
| Language Server | 30 seconds | `lsp-${documentUri}-${position}` |
| File Metadata | 5 minutes | `metadata-${documentUri}` |

### 8.2 Lazy Evaluation

```typescript
class InlineChatFixPrompt extends PromptElement {
  async prepare() {
    // Only fetch what's needed
    const tasks = [];

    if (this.props.enableSemanticSearch) {
      tasks.push(this.fetchSemanticContext());
    }

    if (this.props.enableLanguageServer) {
      tasks.push(this.fetchLanguageServerContext());
    }

    await Promise.all(tasks);
  }
}
```

---

## 9. Testing

### Unit Tests

```typescript
describe('Prompt Engineering', () => {
  it('should generate fix prompt with diagnostics', async () => {
    const prompt = new InlineChatFixPrompt({ ... });
    const rendered = await prompt.renderToMessages();

    expect(rendered).toHaveLength(2); // System + User
    expect(rendered[0].role).toBe('system');
    expect(rendered[1].content).toContain('Errors/Warnings');
  });

  it('should respect token budget', async () => {
    const prompt = new InlineChatFixPrompt({ ... });
    const rendered = await prompt.renderToMessages();
    const tokenCount = countTokens(rendered);

    expect(tokenCount).toBeLessThanOrEqual(50000);
  });

  it('should prioritize diagnostics over semantic search', async () => {
    const prompt = new InlineChatFixPrompt({
      tokenBudget: 10000,  // Tight budget
      hasDiagnostics: true,
      hasSemanticResults: true
    });
    const rendered = await prompt.renderToMessages();

    expect(rendered[1].content).toContain('Errors/Warnings');
    // Semantic search may be truncated
  });
});
```

---

## 10. Related Documents

- [/fix Intent PRD](./02-fix-intent.md)
- [/generate Intent PRD](./03-generate-intent.md)
- [/doc Intent PRD](./04-doc-intent.md)
- [/explain Intent PRD](./05-explain-intent.md)
- [TSX Components Reference](./06-tsx-components.md)

---

**Next**: [/fix Intent Details](./02-fix-intent.md)
