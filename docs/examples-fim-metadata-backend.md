# Examples: FIM API Metadata for Multi-Document Completions

**Date**: 2025-12-19
**Related**: [PRD](/tmp/prd-fim-metadata-backend.md) | [Architecture](/tmp/architecture-fim-metadata-backend.md)

---

## Table of Contents

1. [Example 1: Add Import Statement](#example-1-add-import-statement)
2. [Example 2: Same-Document Edit (Ghost Text)](#example-2-same-document-edit-ghost-text)
3. [Example 3: Create Helper File](#example-3-create-helper-file)
4. [Example 4: Fix Import Path](#example-4-fix-import-path)
5. [Example 5: Add Configuration Entry](#example-5-add-configuration-entry)
6. [Example 6: Multi-Step Refactoring](#example-6-multi-step-refactoring)
7. [Code Implementation Examples](#code-implementation-examples)
8. [Test Examples](#test-examples)

---

## Example 1: Add Import Statement

### Context

**Current File**: `src/utils.ts` (line 15)

```typescript
// src/utils.ts
const result = calculateTotal(█  // cursor position
```

**Open Files**:
- `src/main.ts`: Contains `export const calculateTotal = (items) => ...`
- `src/utils.ts`: Current file (missing import)

### API Request

```json
POST /v1/fim/context

{
  "prompt": "// File: src/utils.ts\nconst result = calculateTotal(",
  "suffix": ")",
  "openFiles": [
    {
      "filepath": "src/main.ts",
      "content": "export const calculateTotal = (items: Item[]) => items.reduce((sum, i) => sum + i.price, 0);"
    },
    {
      "filepath": "src/utils.ts",
      "content": "const result = calculateTotal(items);"
    }
  ],
  "language": "typescript",
  "max_tokens": 500,
  "temperature": 0.1
}
```

### API Response

```json
{
  "id": "cmpl-abc123",
  "object": "text_completion",
  "created": 1734633600,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "import { calculateTotal } from './main';",
      "index": 0,
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/src/utils.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Frontend Behavior

**Before** (without metadata):
- Shows ghost text at cursor: `import { calculateTotal } from './main';)`
- ❌ Wrong position (should be at top of file)

**After** (with metadata):
- Shows clickable label: **📄 Go To Inline Suggestion (utils.ts:1)**
- User clicks → navigates to line 1
- User accepts → adds import at line 0

---

## Example 2: Same-Document Edit (Ghost Text)

### Context

**Current File**: `src/math.ts` (line 5)

```typescript
// src/math.ts
function add(a: number, b: number) {
  return █  // cursor position
}
```

### API Request

```json
POST /v1/fim/context

{
  "prompt": "function add(a: number, b: number) { return ",
  "suffix": " }",
  "openFiles": [],
  "language": "typescript"
}
```

### API Response

```json
{
  "id": "cmpl-def456",
  "object": "text_completion",
  "created": 1734633601,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "a + b;",
      "index": 0,
      "finish_reason": "stop"
      // NO metadata field (or metadata: undefined)
    }
  ]
}
```

### Frontend Behavior

**Behavior**:
- Shows ghost text at cursor: `a + b;`
- User accepts → inserts inline (existing behavior)
- ✅ No change from current experience

---

## Example 3: Create Helper File

### Context

**Current File**: `src/components/UserProfile.tsx` (line 20)

```typescript
// src/components/UserProfile.tsx
const isValidEmail = █  // cursor position, user wants to extract validation
```

### API Request

```json
POST /v1/fim/context

{
  "prompt": "// User wants to extract email validation to separate file\nconst isValidEmail = ",
  "suffix": "",
  "openFiles": [
    {
      "filepath": "src/components/UserProfile.tsx",
      "content": "const email = user.email;\nconst isValidEmail = "
    }
  ],
  "language": "typescript"
}
```

### API Response

```json
{
  "id": "cmpl-ghi789",
  "object": "text_completion",
  "created": 1734633602,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "// File: src/utils/validation.ts\nexport function validateEmail(email: string): boolean {\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return emailRegex.test(email);\n}",
      "index": 0,
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/src/utils/validation.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Frontend Behavior

**Behavior**:
- Shows clickable label: **📄 Go To Inline Suggestion (validation.ts:1)**
- User clicks → VS Code creates file `src/utils/validation.ts` and navigates to it
- User accepts → creates file with validation function
- ✅ Enables extracting code to new files

---

## Example 4: Fix Import Path

### Context

**Current File**: `src/components/Dashboard.tsx` (line 1)

```typescript
// src/components/Dashboard.tsx
import { formatDate } from '../helpers/date';  // ❌ File moved to ../utils/
█  // cursor at import line
```

**Note**: User moved `helpers/date.ts` → `utils/date.ts` but imports are stale.

### API Request

```json
POST /v1/fim/context

{
  "prompt": "import { formatDate } from '../helpers/date';",
  "suffix": "",
  "openFiles": [
    {
      "filepath": "src/utils/date.ts",
      "content": "export const formatDate = ..."
    }
  ],
  "language": "typescript"
}
```

### API Response

```json
{
  "id": "cmpl-jkl012",
  "object": "text_completion",
  "created": 1734633603,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "import { formatDate } from '../utils/date';",
      "index": 0,
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/src/components/Dashboard.tsx",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Frontend Behavior

**Behavior**:
- Shows clickable label: **📄 Go To Inline Suggestion (Dashboard.tsx:1)**
- User accepts → replaces old import with corrected path
- ✅ Enables automated import path fixes

---

## Example 5: Add Configuration Entry

### Context

**Current File**: `src/App.tsx` (line 10)

```typescript
// src/App.tsx
const API_URL = █  // cursor, user needs config value
```

**Config File**: `config/development.json` (should add `API_URL` here)

### API Request

```json
POST /v1/fim/context

{
  "prompt": "const API_URL = ",
  "suffix": "",
  "openFiles": [
    {
      "filepath": "config/development.json",
      "content": "{\n  \"PORT\": 3000\n}"
    }
  ],
  "language": "typescript"
}
```

### API Response

```json
{
  "id": "cmpl-mno345",
  "object": "text_completion",
  "created": 1734633604,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "  \"API_URL\": \"http://localhost:8000\"",
      "index": 0,
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/config/development.json",
        "targetLine": 2,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Frontend Behavior

**Behavior**:
- Shows clickable label: **📄 Go To Inline Suggestion (development.json:3)**
- User clicks → opens config file, navigates to line 2
- User accepts → adds config entry
- ✅ Enables cross-file configuration updates

---

## Example 6: Multi-Step Refactoring

### Context

User wants to refactor a large component into smaller pieces.

**Current File**: `src/components/LargeComponent.tsx` (line 50)

```typescript
// Extracted helper should go to separate file
const validateForm = █
```

### API Response (Step 1: Extract to Helper)

```json
{
  "choices": [{
    "text": "// File: src/components/helpers/formValidation.ts\nexport function validateForm(data: FormData): ValidationResult {\n  // validation logic\n}",
    "metadata": {
      "targetDocument": "file:///workspace/src/components/helpers/formValidation.ts",
      "targetLine": 0,
      "displayType": "label"
    }
  }]
}
```

### API Response (Step 2: Add Import)

After user accepts first suggestion, AI suggests:

```json
{
  "choices": [{
    "text": "import { validateForm } from './helpers/formValidation';",
    "metadata": {
      "targetDocument": "file:///workspace/src/components/LargeComponent.tsx",
      "targetLine": 0,
      "displayType": "label"
    }
  }]
}
```

---

## Code Implementation Examples

### Backend: Metadata Generator

```typescript
// src/services/metadataGenerator.ts
export class MetadataGenerator {
  async generate(
    completion: string,
    context: FimContext
  ): Promise<CompletionMetadata | undefined> {
    // Import statement at cursor line > 0
    if (this.isImportAtWrongPosition(completion, context)) {
      return {
        targetDocument: context.currentDocument,
        targetLine: 0,
        targetColumn: 0,
        displayType: 'label'
      };
    }

    // File creation comment detected
    const newFilePath = this.extractFilePathComment(completion);
    if (newFilePath) {
      return {
        targetDocument: this.buildUri(context.workspaceRoot, newFilePath),
        targetLine: 0,
        targetColumn: 0,
        displayType: 'label'
      };
    }

    // Same-document edit
    return undefined;  // Ghost text
  }

  private isImportAtWrongPosition(completion: string, context: FimContext): boolean {
    const isImport = /^import\s+/.test(completion.trim());
    const atWrongLine = context.position.line > 0;
    return isImport && atWrongLine;
  }

  private extractFilePathComment(completion: string): string | undefined {
    const match = completion.match(/\/\/\s*File:\s*(.+)/);
    return match?.[1];
  }

  private buildUri(workspace: string, path: string): string {
    return `file://${workspace}/${path}`;
  }
}
```

### Backend: Response Builder

```typescript
// src/routes/completions.ts
async function handleFimContext(request: Request): Promise<Response> {
  const body = await request.json();

  // Generate completion (existing)
  const completion = await generateCompletion(body);

  // Generate metadata (NEW)
  const metadataGen = new MetadataGenerator();
  const metadata = await metadataGen.generate(completion, {
    currentDocument: body.currentDocument,
    position: body.position,
    workspaceRoot: body.workspaceRoot
  });

  // Validate metadata
  const validator = new MetadataValidator();
  const validatedMetadata = validator.validate(metadata) ? metadata : undefined;

  // Build response
  return new Response(JSON.stringify({
    id: generateId(),
    object: 'text_completion',
    created: Date.now(),
    model: 'mistralai/codestral-2501',
    choices: [{
      text: completion,
      index: 0,
      finish_reason: 'stop',
      metadata: validatedMetadata  // Optional field
    }]
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## Test Examples

### Unit Test: Import Statement Detection

```typescript
describe('MetadataGenerator', () => {
  it('generates metadata for import statement at wrong position', () => {
    const gen = new MetadataGenerator();

    const result = gen.generate(
      "import { calculateTotal } from './main';",
      {
        currentDocument: 'file:///workspace/src/utils.ts',
        position: { line: 10, column: 0 },  // NOT at top of file
        workspaceRoot: '/workspace'
      }
    );

    expect(result).toEqual({
      targetDocument: 'file:///workspace/src/utils.ts',
      targetLine: 0,
      targetColumn: 0,
      displayType: 'label'
    });
  });

  it('returns undefined for same-document inline edit', () => {
    const gen = new MetadataGenerator();

    const result = gen.generate(
      'a + b;',
      {
        currentDocument: 'file:///workspace/src/math.ts',
        position: { line: 5, column: 10 },
        workspaceRoot: '/workspace'
      }
    );

    expect(result).toBeUndefined();
  });
});
```

### Integration Test: End-to-End

```typescript
describe('FIM API with metadata', () => {
  it('returns metadata for import completion', async () => {
    const response = await fetch('http://localhost:8787/v1/fim/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'const total = calculateTotal(',
        suffix: ')',
        openFiles: [
          { filepath: 'main.ts', content: 'export const calculateTotal = ...' }
        ],
        language: 'typescript',
        currentDocument: 'file:///workspace/utils.ts',
        position: { line: 10, column: 0 },
        workspaceRoot: '/workspace'
      })
    });

    const data = await response.json();

    // Verify response structure
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0].metadata).toBeDefined();

    // Verify metadata content
    expect(data.choices[0].metadata.targetLine).toBe(0);
    expect(data.choices[0].metadata.displayType).toBe('label');
  });

  it('returns undefined metadata for inline completion', async () => {
    const response = await fetch('http://localhost:8787/v1/fim/context', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'function add(a, b) { return ',
        suffix: ' }',
        language: 'typescript'
      })
    });

    const data = await response.json();
    expect(data.choices[0].metadata).toBeUndefined();
  });
});
```

### Validation Test: Metadata Validator

```typescript
describe('MetadataValidator', () => {
  const validator = new MetadataValidator();

  it('accepts valid metadata', () => {
    expect(validator.validate({
      targetDocument: 'file:///workspace/src/main.ts',
      targetLine: 0,
      targetColumn: 0,
      displayType: 'label'
    })).toBe(true);
  });

  it('rejects invalid URI', () => {
    expect(validator.validate({
      targetDocument: 'http://invalid.com',
      targetLine: 0
    })).toBe(false);
  });

  it('rejects negative line number', () => {
    expect(validator.validate({
      targetDocument: 'file:///workspace/main.ts',
      targetLine: -1
    })).toBe(false);
  });

  it('accepts undefined metadata', () => {
    expect(validator.validate(undefined)).toBe(true);
  });
});
```

---

## Summary

These examples demonstrate the complete metadata workflow:

1. **Import statements** → metadata with line 0, label display
2. **Same-document edits** → no metadata, ghost text
3. **File creation** → metadata with new file URI
4. **Import path fixes** → metadata with corrected path
5. **Configuration updates** → metadata targeting config file
6. **Multi-step refactoring** → sequence of metadata-driven edits

The backend implementation is straightforward, backward-compatible, and enables powerful multi-file refactoring capabilities in the frontend.
