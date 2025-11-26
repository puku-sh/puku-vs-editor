# FIM Context - Preventing Code Duplication from References

## Problem Statement

When using tree-sitter to index and retrieve code chunks for FIM context, we face a critical issue:

**Current Behavior:**
```typescript
// Semantic search returns complete function from another file:
function calculateTotal(items: Item[]): number {
  const sum = items.reduce((acc, item) => acc + item.price, 0);
  const tax = sum * TAX_RATE;
  return sum + tax;
}

// User is writing similar code:
function calculateDiscount(items: Item[]): number {
  |  // <-- Cursor here
}

// AI might DUPLICATE the reference function instead of completing current one:
function calculateDiscount(items: Item[]): number {
  const sum = items.reduce((acc, item) => acc + item.price, 0);  // ❌ WRONG
  const tax = sum * TAX_RATE;                                      // ❌ WRONG
  return sum + tax;                                                // ❌ WRONG
}

// What we want:
function calculateDiscount(items: Item[]): number {
  const total = items.reduce((acc, item) => acc + item.price, 0);  // ✓ Similar pattern
  return total * DISCOUNT_RATE;                                     // ✓ Different logic
}
```

## Root Cause

Tree-sitter indexes **complete code chunks** (functions, classes, methods). When we pass these as context:
- AI sees fully implemented code
- AI might think it should reproduce that exact code
- Especially problematic with similar function names/signatures

## How Cursor Solves This

Based on research and observed behavior, Cursor likely uses:

### 1. **Signature Extraction**
Extract only the "shape" of code, not implementation:

```typescript
// Full chunk from tree-sitter:
export async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    email: data.email
  };
}

// Transform to signature only:
fetchUser(userId: string): Promise<User>
```

### 2. **Type Information Extraction**
Include types but minimal implementation:

```typescript
// Full class:
class UserService {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async getUser(id: string): Promise<User> {
    // ... implementation
  }
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    // ... implementation
  }
}

// Transform to interface/type:
class UserService {
  getUser(id: string): Promise<User>
  updateUser(id: string, data: Partial<User>): Promise<User>
}
```

### 3. **Usage Pattern Extraction**
Show HOW the code is used, not full implementation:

```typescript
// Instead of full function implementation:
function formatDate(date: Date): string { /* ... */ }

// Show usage pattern:
// Usage: formatDate(new Date()) → "2024-01-15"
formatDate(date: Date): string
```

### 4. **Structured Prompt Sections**

Clear visual separation between reference and current code:

```
═══════════════════════════════════════════
REFERENCE CODE (for pattern guidance only)
═══════════════════════════════════════════

Similar patterns found in codebase:
• api.get(url: string): Promise<Response>
• formatDate(date: Date): string
• UserService.fetchUser(id: string): Promise<User>

═══════════════════════════════════════════
CURRENT FILE (complete this code)
═══════════════════════════════════════════

File: hooks/useUserData.ts
Language: typescript

async function getUserProfile(userId: string) {
  const response = await |
```

## Proposed Solution for Puku Editor

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  1. Tree-sitter Indexing (PukuIndexingService)          │
│     - Indexes complete functions/classes                │
│     - Stores with metadata (name, type, params)         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  2. Semantic Search (Extension)                          │
│     - Finds similar code chunks                          │
│     - Returns top 3 results                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  3. Context Transformation (NEW - Extension)             │
│     ┌─────────────────────────────────────────────────┐ │
│     │ _transformSemanticContextToSignatures()         │ │
│     │                                                  │ │
│     │ For each result:                                │ │
│     │  - Parse with tree-sitter                       │ │
│     │  - Extract function signature                   │ │
│     │  - Extract type definitions                     │ │
│     │  - Remove implementation details                │ │
│     │  - Keep docstrings/comments                     │ │
│     └─────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  4. Send to Worker (/v1/fim/context)                     │
│     {                                                    │
│       prompt: "...",                                     │
│       suffix: "...",                                     │
│       signatures: [                                      │
│         "fetchUser(id: string): Promise<User>",         │
│         "formatDate(date: Date): string"                │
│       ]                                                  │
│     }                                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  5. Worker Prompt Construction (UPDATED)                 │
│     ┌─────────────────────────────────────────────────┐ │
│     │ System Message:                                 │ │
│     │ "You complete code. Use reference signatures   │ │
│     │  as patterns. NEVER copy them directly."       │ │
│     │                                                  │ │
│     │ User Message:                                   │ │
│     │ "SIMILAR FUNCTIONS (reference only):           │ │
│     │  • fetchUser(id: string): Promise<User>        │ │
│     │  • formatDate(date: Date): string              │ │
│     │                                                  │ │
│     │  COMPLETE THIS CODE:                            │ │
│     │  async function getUserData(id) { |"           │ │
│     └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Signature Extraction (Extension)

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

**New Method:**
```typescript
/**
 * Transform semantic search results to signatures only
 * Prevents AI from duplicating reference code
 */
private _extractSignatures(
  semanticResults: Array<{ filepath: string; content: string }>
): Array<{ signature: string; filepath: string }> {
  const signatures: Array<{ signature: string; filepath: string }> = [];

  for (const result of semanticResults) {
    const content = result.content;

    // Try to extract function signature
    const functionMatch = content.match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/
    );

    if (functionMatch) {
      const [, name, params, returnType] = functionMatch;
      const signature = returnType
        ? `${name}(${params}): ${returnType.trim()}`
        : `${name}(${params})`;

      signatures.push({
        signature,
        filepath: result.filepath
      });
      continue;
    }

    // Try to extract class/interface signature
    const classMatch = content.match(
      /(class|interface)\s+(\w+)(?:\s+extends\s+[\w,\s]+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/
    );

    if (classMatch) {
      const [, type, name] = classMatch;

      // Extract method signatures (not implementations)
      const methods: string[] = [];
      const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/g;
      let methodMatch;

      while ((methodMatch = methodRegex.exec(content)) !== null) {
        const [, methodName, params, returnType] = methodMatch;
        if (methodName !== name) { // Skip constructor
          methods.push(
            returnType
              ? `  ${methodName}(${params}): ${returnType.trim()}`
              : `  ${methodName}(${params})`
          );
        }
      }

      const signature = `${type} ${name} {\n${methods.slice(0, 3).join('\n')}\n}`;

      signatures.push({
        signature,
        filepath: result.filepath
      });
      continue;
    }

    // Fallback: Use first line + type annotation if available
    const firstLine = content.split('\n')[0].trim();
    if (firstLine) {
      signatures.push({
        signature: firstLine,
        filepath: result.filepath
      });
    }
  }

  return signatures;
}
```

**Update `_gatherCodeContext`:**
```typescript
// OLD:
context.semanticResults = results.map(r => ({
  filepath: vscode.workspace.asRelativePath(r.uri),
  content: r.content.substring(0, 300)
}));

// NEW:
const rawResults = results.map(r => ({
  filepath: vscode.workspace.asRelativePath(r.uri),
  content: r.content
}));

// Transform to signatures only
const signatures = this._extractSignatures(rawResults);
context.semanticResults = signatures.map(s => ({
  filepath: s.filepath,
  content: s.signature  // Just signature, not full code
}));
```

### Phase 2: Worker Prompt Enhancement

**File:** `puku-worker/src/routes/completions.ts`

**Update `/v1/fim/context` endpoint:**

```typescript
// Build enhanced prompt with clear sections
let enhancedPrompt = '';

// Check if we have semantic context (signatures from similar code)
const hasSemanticContext = request.openFiles?.some(f =>
  f.content.includes('(') && f.content.includes(')')  // Likely a signature
);

if (hasSemanticContext) {
  enhancedPrompt += `╔════════════════════════════════════════════════════╗
║  REFERENCE SIGNATURES (for pattern guidance only)  ║
║  DO NOT COPY THESE - Use similar patterns         ║
╚════════════════════════════════════════════════════╝

Similar functions in your codebase:
`;

  // Add signatures from similar code
  if (request.openFiles && request.openFiles.length > 0) {
    for (const file of request.openFiles.slice(0, 3)) {
      enhancedPrompt += `• ${file.content}  // from ${file.filepath}\n`;
    }
  }

  enhancedPrompt += `
╔════════════════════════════════════════════════════╗
║  CURRENT FILE - COMPLETE THIS CODE                 ║
╚════════════════════════════════════════════════════╝
`;
}

// Add current file metadata
if (request.filepath) {
  enhancedPrompt += `File: ${request.filepath}\n`;
}
if (request.language) {
  enhancedPrompt += `Language: ${request.language}\n\n`;
}

// Add the actual code to complete
enhancedPrompt += request.prompt;
```

**Update system message in FIM request:**

```typescript
const fimRequest = {
  model: env.FIM_MODEL,
  prompt: enhancedPrompt,
  suffix: request.suffix,
  max_tokens: request.max_tokens ?? 100,
  temperature: request.temperature ?? 0.1,
  stream: request.stream || false,
};

// For chat-based FIM, add system message
if (useChatEndpoint) {
  return {
    model: env.FIM_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a code completion assistant.

IMPORTANT RULES:
1. The "REFERENCE SIGNATURES" section shows similar code from the codebase
2. These are for PATTERN REFERENCE ONLY - DO NOT copy them
3. Use similar patterns/styles but write NEW code for the current file
4. Complete ONLY the code in "CURRENT FILE" section
5. Do not repeat code that's already written
6. Output only the completion, no explanations`
      },
      {
        role: 'user',
        content: enhancedPrompt
      }
    ],
    max_tokens: request.max_tokens ?? 100,
    temperature: request.temperature ?? 0.1,
    stream: request.stream || false
  };
}
```

### Phase 3: Advanced - Tree-sitter Parsing (Future)

For even better signature extraction, use tree-sitter in the extension:

```typescript
import Parser from 'web-tree-sitter';

async function extractSignatureWithTreeSitter(
  code: string,
  language: string
): Promise<string> {
  const parser = new Parser();

  // Load appropriate language grammar
  const lang = await Parser.Language.load(`tree-sitter-${language}.wasm`);
  parser.setLanguage(lang);

  const tree = parser.parse(code);
  const rootNode = tree.rootNode;

  // Find function/class declarations
  const declarations = rootNode.descendantsOfType([
    'function_declaration',
    'method_definition',
    'class_declaration'
  ]);

  if (declarations.length === 0) return code;

  const firstDecl = declarations[0];

  // Extract just the signature (everything before opening brace)
  const signatureEndPos = firstDecl.text.indexOf('{');
  if (signatureEndPos === -1) return firstDecl.text;

  return firstDecl.text.substring(0, signatureEndPos).trim();
}
```

## Examples

### Example 1: Function Completion

**Semantic Search Returns:**
```typescript
// Full implementation from UserService.ts
async function fetchUserById(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return await response.json();
}
```

**After Transformation:**
```typescript
fetchUserById(userId: string): Promise<User>  // from UserService.ts
```

**Sent to AI:**
```
REFERENCE SIGNATURES (for pattern guidance only):
• fetchUserById(userId: string): Promise<User>  // from UserService.ts

CURRENT FILE - COMPLETE THIS CODE:
File: ProductService.ts
Language: typescript

async function fetchProductById(productId: string) {
  |
```

**AI Completes (correctly):**
```typescript
async function fetchProductById(productId: string) {
  const response = await fetch(`${API_BASE}/products/${productId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }
  return await response.json();
}
```

### Example 2: Class Method Completion

**Semantic Search Returns:**
```typescript
// Full class from AuthService.ts
class AuthService {
  private token: string | null = null;

  async login(username: string, password: string): Promise<void> {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    this.token = data.token;
  }

  async logout(): Promise<void> {
    this.token = null;
    await fetch('/api/logout', { method: 'POST' });
  }
}
```

**After Transformation:**
```typescript
class AuthService {
  login(username: string, password: string): Promise<void>
  logout(): Promise<void>
}
```

**Sent to AI:**
```
REFERENCE SIGNATURES (for pattern guidance only):
• class AuthService {
    login(username: string, password: string): Promise<void>
    logout(): Promise<void>
  }  // from AuthService.ts

CURRENT FILE - COMPLETE THIS CODE:
File: PaymentService.ts
Language: typescript

class PaymentService {
  async processPayment(amount: number, cardToken: string) {
    |
```

**AI Completes (correctly):**
```typescript
class PaymentService {
  async processPayment(amount: number, cardToken: string) {
    const response = await fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify({ amount, cardToken })
    });
    const data = await response.json();
    return data.transactionId;
  }
```

## Testing Strategy

### Test Cases

**Test 1: Should not duplicate reference function**
```typescript
// Given reference:
calculateTotal(items: Item[]): number

// User writes:
function calculateDiscount(items: Item[]) {
  |
}

// Should NOT output:
const sum = items.reduce((acc, item) => acc + item.price, 0);  // ❌

// Should output:
const total = calculateTotal(items);  // ✓ (uses reference)
return total * 0.1;  // ✓ (new logic)
```

**Test 2: Should use similar patterns**
```typescript
// Given reference:
formatDate(date: Date): string  // Usage: formatDate(new Date()) → "2024-01-15"

// User writes:
function formatTime(date: Date) {
  |
}

// Should output:
return date.toLocaleTimeString();  // ✓ Similar pattern, different logic
```

**Test 3: Should respect file context**
```typescript
// Given reference from React component:
useAuth(): { user: User; isLoading: boolean }

// User writes in Vue component:
const authState = |

// Should output:
useAuth()  // ✓ Uses hook pattern
// NOT duplicate React implementation
```

### Metrics to Track

1. **Duplication Rate:**
   - % of completions that exactly match reference code
   - Target: <5%

2. **Pattern Similarity:**
   - % of completions using similar patterns (AST structure)
   - Target: >70%

3. **Acceptance Rate:**
   - % of completions accepted by users
   - Target: >30% (baseline), >40% (with signatures)

4. **Context Relevance:**
   - % of completions where reference context was helpful
   - Measured by user acceptance when context present vs absent

## Rollout Plan

### Stage 1: Prototype (Week 1)
- Implement signature extraction with regex
- Test with TypeScript/JavaScript only
- A/B test: 50% users get signatures, 50% get full code

### Stage 2: Refinement (Week 2-3)
- Analyze duplication rates
- Tune prompt structure based on results
- Add support for Python, Go, Rust

### Stage 3: Tree-sitter Integration (Week 4-5)
- Replace regex with tree-sitter parsing
- More accurate signature extraction
- Support for complex types, generics

### Stage 4: Full Rollout (Week 6)
- 100% users get signature-based context
- Monitor metrics
- Iterate based on feedback

## Alternative Approaches Considered

### 1. **Post-processing Deduplication**
- Let AI generate, then check for exact duplicates
- **Rejected:** Too late, wastes tokens, bad UX

### 2. **No Context At All**
- Just use prefix/suffix, no semantic search
- **Rejected:** Loses valuable pattern information

### 3. **Few-shot Examples**
- Include 2-3 examples of good completions
- **Maybe later:** Could combine with signatures

### 4. **Negative Examples**
- Tell AI what NOT to do
- **Rejected:** Models don't respond well to negatives

## References

- Cursor's RAG approach: https://www.cursor.com/blog/retrieval
- Codex FIM paper: https://arxiv.org/abs/2207.14255
- Tree-sitter for code parsing: https://tree-sitter.github.io/
- Best practices for code completion prompts: https://platform.openai.com/docs/guides/code-completion

## Conclusion

**Key Insight:** The problem isn't the AI model—it's what we feed it.

By transforming complete code chunks into signatures/patterns, we:
✅ Keep the benefits of semantic search (relevant context)
✅ Avoid the pitfall of code duplication
✅ Guide the AI to use patterns, not copy code
✅ Maintain fast, accurate completions

**Next Step:** Implement Phase 1 (signature extraction) and measure results.
