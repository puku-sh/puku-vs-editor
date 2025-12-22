# PRD: /fix Intent - Error Handling & Bug Fixes

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024
**Related**: [Prompt Overview](./01-overview.md)

---

## 1. Overview

The `/fix` intent is used to fix errors, add error handling, and resolve bugs in existing code.

### Use Cases

- Fix compilation errors
- Add null/undefined checks
- Add try-catch blocks
- Fix logic bugs
- Add input validation
- Handle edge cases

---

## 2. Prompt Template

### 2.1 Full TSX Structure

```tsx
export class InlineChatFixPrompt extends PromptElement<InlineFixProps> {
  async prepare() {
    // Fetch diagnostics, semantic search, language server context
    this.diagnostics = await this.getDiagnostics();
    this.semanticContext = await this.getSemanticContext();
    this.lsContext = await this.getLanguageServerContext();
  }

  render(state: void, sizing: PromptSizing) {
    const { document, selection, userQuery } = this.props;
    const languageId = document.languageId;

    return (
      <>
        {/* System Prompt */}
        <SystemMessage priority={1000}>
          You are Puku AI, an AI programming assistant.<br />
          When asked for your name, you must respond with "Puku AI".<br />
          You are a world class expert in programming, and especially good at {languageId}.<br />
          <SafetyRules />
        </SystemMessage>

        {/* Instructions */}
        <HistoryWithInstructions inline={true} historyPriority={700}>
          <InstructionMessage priority={1000}>
            Source code is always contained in ``` blocks.<br />
            The user needs help fixing or modifying code.<br />
            When fixing errors, add proper error handling and validation.<br />
            Follow best practices for {languageId}.<br />
          </InstructionMessage>
        </HistoryWithInstructions>

        {/* User Message */}
        <UserMessage priority={900} flexGrow={2}>
          {/* Custom Instructions */}
          <CustomInstructions priority={725} languageId={languageId} />

          {/* Diagnostics (if any) */}
          {this.diagnostics.length > 0 && (
            <Diagnostics priority={850} diagnostics={this.diagnostics} />
          )}

          {/* Semantic Search Context */}
          <SemanticContext
            priority={800}
            tokenBudget={12500}
            results={this.semanticContext}
          />

          {/* Language Server Context */}
          <LanguageServerContext
            priority={700}
            context={this.lsContext}
          />

          {/* Selected Code */}
          <SelectedCode
            priority={900}
            flexGrow={2}
            selection={selection}
            language={languageId}
          />

          {/* User Query */}
          <UserQuery priority={1000} query={userQuery} />

          {/* File Metadata */}
          <FileMetadata priority={500} document={document} />
        </UserMessage>

        {/* Response Format Instructions */}
        <AssistantMessage priority={500}>
          <InstructionMessage>
            Output ONLY the fixed code in a single code block.<br />
            Do not include explanations unless asked.<br />
            Preserve existing code style and formatting.<br />
          </InstructionMessage>
        </AssistantMessage>
      </>
    );
  }
}
```

---

## 3. Example Scenarios

### 3.1 Scenario: Add Null Check

**User Input**:
```typescript
// User selects:
function getUsername(user) {
  return user.name.toUpperCase();
}

// User types: "add null check"
```

**Diagnostics**: None

**Semantic Search Results**:
```typescript
// From: src/utils/user.ts (relevance: 82%)
function getEmail(user: User | null): string {
  if (!user || !user.email) {
    throw new Error('Invalid user');
  }
  return user.email;
}
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
// From: src/utils/user.ts (relevance: 82%)
function getEmail(user: User | null): string {
  if (!user || !user.email) {
    throw new Error('Invalid user');
  }
  return user.email;
}
```

Code to fix:

```typescript
function getUsername(user) {
  return user.name.toUpperCase();
}
```

User instruction: add null check

File: src/utils/helpers.ts
Language: TypeScript
Indent: 2 spaces

Output ONLY the fixed code in a single code block.
Preserve existing code style and formatting.
```

**Expected AI Response**:
```typescript
function getUsername(user: User | null): string {
  if (!user || !user.name) {
    throw new Error('Invalid user');
  }
  return user.name.toUpperCase();
}
```

---

### 3.2 Scenario: Fix Division by Zero

**User Input**:
```typescript
// User selects:
function divide(a, b) {
  return a / b;
}

// Diagnostics: ⚠️ Warning: Division by zero not handled
// User types: "fix this"
```

**Semantic Search Results**:
```typescript
// From: src/utils/math.ts (relevance: 91%)
function safeMod(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Modulo by zero');
  }
  return a % b;
}
```

**Generated Prompt**:
```
[System]
You are Puku AI, an AI programming assistant.
You are a world class expert in programming, and especially good at TypeScript.

[User]
Errors/Warnings in selection:
1. Division by zero not handled (line 2)

Similar code patterns in your workspace:

```typescript
// From: src/utils/math.ts (relevance: 91%)
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

User instruction: fix this

File: src/calculator.ts
Language: TypeScript
```

**Expected AI Response**:
```typescript
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

---

### 3.3 Scenario: Add Try-Catch

**User Input**:
```typescript
// User selects:
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data;
}

// User types: "add error handling with try catch"
```

**Semantic Search Results**:
```typescript
// From: src/api/products.ts (relevance: 88%)
async function fetchProduct(id: string): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw error;
  }
}
```

**Generated Prompt**:
```
[System]
You are Puku AI, an AI programming assistant.
You are a world class expert in programming, and especially good at TypeScript.

[User]
Similar code patterns in your workspace:

```typescript
// From: src/api/products.ts (relevance: 88%)
async function fetchProduct(id: string): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw error;
  }
}
```

Code to fix:

```typescript
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data;
}
```

User instruction: add error handling with try catch

File: src/api/users.ts
Language: TypeScript
```

**Expected AI Response**:
```typescript
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

---

## 4. Prompt Variations

### 4.1 With Diagnostics (High Priority)

When diagnostics exist, they get TOP priority in the prompt:

```
[User]
🚨 ERRORS/WARNINGS (MUST FIX):
1. Type 'string | undefined' is not assignable to type 'string' (line 5)
2. Object is possibly 'null' (line 7)

[Rest of context...]
```

### 4.2 Without Diagnostics (General Fix)

When no diagnostics, focus on semantic patterns:

```
[User]
Similar code patterns in your workspace:
[... semantic search results ...]

Code to improve:
[... selected code ...]

User instruction: [... user query ...]
```

### 4.3 Complex Fix (Multiple Issues)

For complex fixes, add step-by-step instructions:

```
[System]
...
When fixing multiple issues:
1. First address errors (red squiggles)
2. Then address warnings (yellow squiggles)
3. Then add defensive checks
4. Finally, optimize if needed
...
```

---

## 5. Semantic Search Integration

### 5.1 Query Construction

```typescript
class FixIntentSemanticQuery {
  buildQuery(userQuery: string, selectedCode: string, diagnostics: Diagnostic[]): string {
    // Prioritize diagnostic messages in query
    const diagnosticKeywords = diagnostics.map(d => {
      // Extract key terms from diagnostic message
      const terms = this.extractKeyTerms(d.message);
      return terms.join(' ');
    }).join(' ');

    // Combine: user query + diagnostic keywords + code snippet
    return `${userQuery} ${diagnosticKeywords}\n\n${selectedCode}`.trim();
  }

  private extractKeyTerms(message: string): string[] {
    // Extract important terms
    const terms = [];

    // Type-related
    if (message.includes('null') || message.includes('undefined')) {
      terms.push('null check', 'validation');
    }

    // Error handling
    if (message.includes('error') || message.includes('exception')) {
      terms.push('error handling', 'try catch');
    }

    // Type errors
    if (message.includes('type') || message.includes('assignable')) {
      terms.push('type annotation', 'typescript');
    }

    return terms;
  }
}
```

### 5.2 Result Filtering

```typescript
class FixIntentResultFilter {
  filterResults(
    results: SemanticSearchResult[],
    diagnostics: Diagnostic[]
  ): SemanticSearchResult[] {
    // If we have diagnostics, filter for results that handle similar errors
    if (diagnostics.length > 0) {
      const filtered = results.filter(r => {
        return diagnostics.some(d => this.isRelevantFix(r, d));
      });

      // Return filtered if we have matches, otherwise return all
      return filtered.length > 0 ? filtered : results;
    }

    return results;
  }

  private isRelevantFix(result: SemanticSearchResult, diagnostic: Diagnostic): boolean {
    const code = result.chunk.toLowerCase();

    // Null/undefined check
    if (diagnostic.message.includes('null') || diagnostic.message.includes('undefined')) {
      return code.includes('if (!') || code.includes('if (') || code.includes('??');
    }

    // Try-catch
    if (diagnostic.message.includes('error') || diagnostic.message.includes('exception')) {
      return code.includes('try') || code.includes('catch');
    }

    // Type annotation
    if (diagnostic.message.includes('type')) {
      return code.includes(': ') || code.includes('<');
    }

    return false;
  }
}
```

---

## 6. Token Budget Breakdown

For `/fix` intent:

| Component | Tokens | Priority | Notes |
|-----------|--------|----------|-------|
| System Prompt | 5,000 | 1000 | Fixed size |
| Diagnostics | 2,500 | 850 | NEVER truncated |
| User Query | 2,000 | 1000 | NEVER truncated |
| Selected Code | 15,000 | 900 | Truncate if >15k |
| Semantic Search | 12,500 | 800 | 3 results → 2 if needed |
| Language Server | 5,000 | 700 | 5 refs → 2 if needed |
| File Metadata | 500 | 500 | Minimal |
| Instructions | 2,500 | 1000 | Fixed size |
| **Total** | **45,000** | - | +5k reserved = 50k |

---

## 7. Quality Metrics

### Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Fix Accuracy** | 85%+ | % of fixes that resolve the issue |
| **Style Preservation** | 95%+ | % of fixes that match original style |
| **No New Errors** | 98%+ | % of fixes that don't introduce bugs |
| **Latency** | <2s | Time to first token |
| **Acceptance Rate** | 80%+ | % of fixes user accepts |

### Quality Checks

```typescript
class FixQualityValidator {
  validateFix(original: string, fixed: string, diagnostics: Diagnostic[]): ValidationResult {
    const checks = {
      syntaxValid: this.checkSyntax(fixed),
      diagnosticsResolved: this.checkDiagnostics(fixed, diagnostics),
      stylePreserved: this.checkStyle(original, fixed),
      noRegressions: this.checkRegressions(original, fixed)
    };

    return {
      isValid: Object.values(checks).every(c => c),
      checks
    };
  }
}
```

---

## 8. Error Handling

### Common Issues

**Issue 1: Fix Introduces New Errors**
- **Cause**: AI adds type annotations incorrectly
- **Solution**: Validate syntax before showing diff
- **Fallback**: Show error message, allow retry

**Issue 2: Fix Changes Too Much**
- **Cause**: AI refactors beyond the fix
- **Solution**: Add instruction: "ONLY fix the error, don't refactor"
- **Fallback**: User can reject and rephrase

**Issue 3: No Semantic Results**
- **Cause**: Codebase doesn't have similar patterns
- **Solution**: Use built-in error handling templates
- **Fallback**: Generic best practices for language

---

## 9. Testing

### Test Cases

```typescript
describe('/fix Intent', () => {
  it('should add null check when requested', async () => {
    const result = await fixIntent({
      code: 'function getUsername(user) { return user.name; }',
      instruction: 'add null check'
    });

    expect(result).toContain('if (!user');
    expect(result).toContain('throw new Error');
  });

  it('should fix division by zero', async () => {
    const result = await fixIntent({
      code: 'function divide(a, b) { return a / b; }',
      instruction: 'fix this',
      diagnostics: [{ message: 'Division by zero', line: 1 }]
    });

    expect(result).toContain('if (b === 0)');
  });

  it('should preserve code style', async () => {
    const result = await fixIntent({
      code: 'function foo(){\n\treturn bar;\n}',  // tabs, no spaces
      instruction: 'add null check for bar'
    });

    expect(result).toContain('\t');  // Should preserve tabs
    expect(result).not.toContain('  ');  // Should not use spaces
  });
});
```

---

## 10. Examples Gallery

### Example 1: TypeScript Type Error
```typescript
// Before
function process(data) {
  return data.map(item => item.value);
}

// After (/fix: "add proper types")
function process(data: Array<{ value: string }>): string[] {
  return data.map(item => item.value);
}
```

### Example 2: Async Error Handling
```typescript
// Before
async function loadData() {
  const res = await fetch('/api/data');
  return res.json();
}

// After (/fix: "add error handling")
async function loadData(): Promise<Data> {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;
  }
}
```

### Example 3: Input Validation
```typescript
// Before
function createUser(name, email) {
  return { id: Date.now(), name, email };
}

// After (/fix: "add validation")
function createUser(name: string, email: string): User {
  if (!name || name.trim().length === 0) {
    throw new Error('Name is required');
  }
  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required');
  }
  return { id: Date.now(), name: name.trim(), email };
}
```

---

**Next**: [/generate Intent](./03-generate-intent.md)
