# displayLocation Architecture: Tab-to-Jump Inline Completions

## Overview

The `displayLocation` feature enables **Tab-to-jump** functionality for inline code completions, allowing the editor to show a completion at one location (current cursor) while inserting the code at a different location (target line). This is particularly useful for:

- **Import statements** - Show import suggestion at cursor, insert at top of file (line 0)
- **Multi-file edits** - Show suggestion in current file, insert in different file
- **Distant edits** - Show suggestion at cursor, insert >12 lines away

**User Experience:**
1. User types code at line 20
2. AI suggests an import statement
3. UI shows "⇥ Tab to jump to line 1" at cursor position
4. User presses Tab
5. Cursor jumps to line 1, import is inserted

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER TYPES CODE                          │
│                         (line 20, col 23)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND: pukuFimProvider                     │
│  1. Debounce 800ms                                              │
│  2. Build FIM request (prompt, suffix, context)                 │
│  3. Send to /v1/fim/context                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND: Puku Worker API                        │
│  1. Generate completion with Codestral Mamba                    │
│  2. MetadataGenerator detects import pattern                    │
│  3. Return completion + metadata:                               │
│     {                                                            │
│       "text": "e\nimport React from 'react';",                  │
│       "metadata": {                                              │
│         "targetDocument": "file:///workspace/hi.ts",            │
│         "targetLine": 0,                                         │
│         "targetColumn": 0,                                       │
│         "displayType": "label"                                   │
│       }                                                          │
│     }                                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: Document Resolution                       │
│  1. DocumentResolver.resolveFromMetadata()                      │
│     - Normalize /workspace → actual workspace root              │
│     - Resolve target document from URI                          │
│     - Create target range from targetLine/targetColumn          │
│     - Return ResolvedDocument (even for same-document)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           FRONTEND: InlineCompletionItem Creation                │
│  1. displayLocationFactory.createLabel()                        │
│     - displayLocation.range = current position (line 20)        │
│     - displayLocation.label = "⇥ Tab to jump to line 1"         │
│     - displayLocation.kind = Label                              │
│  2. new InlineCompletionItem(text, targetRange)                 │
│     - range = target position (line 0) ← Where code inserts     │
│  3. item.displayLocation = displayLocation                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VS CODE: Display & Action                     │
│  1. Show "⇥ Tab to jump to line 1" label at line 20            │
│  2. User presses Tab                                             │
│  3. Jump cursor to line 0 (item.range)                          │
│  4. Insert completion text at line 0                            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### Backend Components

#### 1. MetadataGenerator (`puku-worker/src/lib/metadata-generator.ts`)

**Responsibility:** Analyze completion text and generate metadata for displayLocation

**Heuristics:**
1. **Import detection** - Detects import statements at wrong position (line > 0)
2. **File creation** - Detects `// File: path` comments
3. **Distance-based** - Detects edits >12 lines from cursor
4. **Same-document ghost text** - Returns `undefined` for normal completions

**Key Methods:**
```typescript
generate(completion: string, context: FimContext): CompletionMetadata | undefined
isImportAtWrongPosition(completion: string, context: FimContext): boolean
extractFilePathComment(completion: string): string | undefined
detectTargetLine(completion: string, context: FimContext): number | null
```

**Import Detection (Multi-line Support):**
```typescript
private isImportAtWrongPosition(completion: string, context: FimContext): boolean {
    // Regex matches import anywhere in completion (handles "e\nimport React...")
    const hasImport = /(^|\n)\s*(import\s+|from\s+['"]|require\(|#include\s+|using\s+)/.test(completion);
    const atWrongLine = (context.position?.line ?? 0) > 0;
    return hasImport && atWrongLine;
}
```

**Output:**
```typescript
interface CompletionMetadata {
    targetDocument?: string;  // URI string (e.g., "file:///workspace/src/utils.ts")
    targetLine?: number;      // 0-indexed line number
    targetColumn?: number;    // 0-indexed column number
    displayType?: 'code' | 'label';  // 'label' for Tab-to-jump UI
}
```

### Frontend Components

#### 2. DocumentResolver (`src/extension/pukuai/vscode-node/utils/documentResolver.ts`)

**Responsibility:** Resolve target document and range from completion metadata

**Key Features:**
- **URI normalization** - Converts `/workspace/` prefix to actual workspace root
- **Document caching** - Caches resolved documents for performance
- **Same-document redirects** - Returns resolved document even if same as current
- **Cache invalidation** - Handles file renames and deletions

**Critical Fix for Same-Document Redirects:**
```typescript
resolveFromMetadata(
    metadata: CompletionMetadata | undefined,
    currentDocumentUri: vscode.Uri
): ResolvedDocument | undefined {
    if (!metadata || !metadata.targetDocument) {
        return undefined; // Same document edit (no metadata)
    }

    let targetUri = vscode.Uri.parse(metadata.targetDocument);

    // Normalize /workspace prefix to actual workspace root
    if (targetUri.path.startsWith('/workspace/')) {
        const workspaceFolder = this._workspace.getWorkspaceFolder(currentDocumentUri);
        if (workspaceFolder) {
            const relativePath = targetUri.path.replace('/workspace/', '');
            targetUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
        }
    }

    // Resolve document from workspace
    const document = this.resolveFromUri(targetUri);
    if (!document) {
        return undefined;
    }

    // Create range from metadata
    const line = metadata.targetLine ?? 0;
    const col = metadata.targetColumn ?? 0;
    const range = new vscode.Range(
        new vscode.Position(line, col),
        new vscode.Position(line, col)
    );

    // ✅ CRITICAL: Return resolved document even if same as current
    // This allows same-document redirects (e.g., import to line 0)
    return { uri: targetUri, document, range };
}
```

**Output:**
```typescript
interface ResolvedDocument {
    uri: vscode.Uri;
    document: vscode.TextDocument;
    range: vscode.Range;  // Target range for insertion
}
```

#### 3. DisplayLocationFactory (`src/extension/pukuai/vscode-node/utils/displayLocationFactory.ts`)

**Responsibility:** Create VS Code `InlineCompletionDisplayLocation` objects

**Key Method:**
```typescript
createLabel(
    currentPosition: vscode.Position,
    targetDocument: vscode.TextDocument,
    targetRange: vscode.Range
): vscode.InlineCompletionDisplayLocation {
    // Create zero-width range at current cursor position
    // This is where the LABEL will be displayed (not where code will be inserted)
    const currentRange = new vscode.Range(currentPosition, currentPosition);

    // Create user-friendly label
    const label = `⇥ Tab to jump to line ${targetRange.start.line + 1}`;

    // Return display location with CURRENT position for label display
    return {
        range: currentRange,  // Current position (where label shows) - NOT target
        label,
        kind: vscode.InlineCompletionDisplayLocationKind.Label  // Navigation UI
    };
}
```

**Display Location Types:**
- **`Label`** - Shows navigation UI ("⇥ Tab to jump...") - Used by Puku
- **`Code`** - Shows ghost text at target location - Used by Copilot

#### 4. PukuFimProvider (`src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts`)

**Responsibility:** Main FIM provider that orchestrates the entire flow

**Key Steps:**

1. **Import filter bypass** (lines 852-865):
```typescript
const hasDisplayLocationMetadata = metadata && metadata.displayType === 'label';
const filteredText = ImportFilteringAspect.filterCompletion(trimmed, languageId);

if (!filteredText || filteredText.trim().length === 0) {
    if (!hasDisplayLocationMetadata) {
        console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} contains only imports, filtering out`);
        continue;
    }
    console.log(`[FetchCompletion] ✅ Choice ${i + 1} is import-only BUT has displayLocation metadata, allowing`);
}

const completionText = hasDisplayLocationMetadata ? trimmed : (filteredText || trimmed).trim();
```

2. **Document resolution** (lines 920-935):
```typescript
const resolvedDoc = metadata
    ? documentResolver.resolveFromMetadata(metadata, document.uri)
    : undefined;

const targetDocument = resolvedDoc?.document ?? document;
const targetRange = resolvedDoc?.range ?? range;
```

3. **displayLocation creation** (lines 937-945):
```typescript
const displayLocation = resolvedDoc && metadata?.displayType === 'label'
    ? displayLocationFactory.createLabel(
        position,
        targetDocument,
        targetRange
    )
    : undefined;
```

4. **InlineCompletionItem creation** (line 980):
```typescript
// ✅ CRITICAL: Use targetRange for insertion point
const item = new vscode.InlineCompletionItem(completion, targetRange);
item.displayLocation = displayLocation;
```

## API Pattern: displayLocation.range vs InlineCompletionItem.range

**This is the core concept of the displayLocation feature:**

### VS Code InlineCompletionItem API

```typescript
interface InlineCompletionItem {
    range: Range;  // ← Where code will be INSERTED
    displayLocation?: InlineCompletionDisplayLocation;
}

interface InlineCompletionDisplayLocation {
    range: Range;  // ← Where UI will be DISPLAYED
    label: string;
    kind: InlineCompletionDisplayLocationKind;
}
```

### Two Ranges Explained

| Property | Purpose | Example (Import at line 20 → line 0) |
|----------|---------|--------------------------------------|
| `displayLocation.range` | Where to show the UI/label | Line 20, col 23 (current cursor) |
| `InlineCompletionItem.range` | Where to insert the code | Line 0, col 0 (top of file) |

**Correct Pattern:**
```typescript
const currentPosition = new vscode.Position(20, 23);  // Where user is typing
const targetPosition = new vscode.Position(0, 0);     // Where import goes

// displayLocation shows UI at CURRENT position
const displayLocation = {
    range: new vscode.Range(currentPosition, currentPosition),
    label: "⇥ Tab to jump to line 1",
    kind: vscode.InlineCompletionDisplayLocationKind.Label
};

// InlineCompletionItem inserts at TARGET position
const item = new vscode.InlineCompletionItem(
    "import React from 'react';",
    new vscode.Range(targetPosition, targetPosition)  // ← Target range
);
item.displayLocation = displayLocation;
```

**What happens:**
1. VS Code shows "⇥ Tab to jump to line 1" at line 20
2. User presses Tab
3. Cursor jumps to line 0 (from `item.range`)
4. Import is inserted at line 0

## Backend Metadata Structure

### Example: Import Statement at Wrong Position

**Request:**
```json
{
  "prompt": "// add react import her",
  "suffix": "\n\nexport default App;",
  "language": "typescript",
  "currentDocument": "file:///workspace/hi.ts",
  "position": {"line": 20, "column": 23},
  "workspaceRoot": "/workspace"
}
```

**Model Response:**
```
"e\nimport React from 'react';"
```

**MetadataGenerator Analysis:**
- Completion contains import: `/(^|\n)\s*import\s+/` → ✅ Match
- Current line > 0: line 20 → ✅ True
- **Decision:** Import at wrong position → targetLine: 0

**API Response:**
```json
{
  "choices": [
    {
      "text": "e\nimport React from 'react';",
      "metadata": {
        "targetDocument": "file:///workspace/hi.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Example: File Creation Comment

**Request:**
```json
{
  "prompt": "// File: src/utils/validation.ts\n",
  "suffix": "",
  "currentDocument": "file:///workspace/src/math.ts",
  "position": {"line": 2, "column": 0}
}
```

**MetadataGenerator Analysis:**
- Completion contains file comment: `// File: src/utils/validation.ts`
- Extract path: `src/utils/validation.ts`
- **Decision:** File creation → targetDocument: new file

**API Response:**
```json
{
  "choices": [
    {
      "text": "export function isEmail(str: string): boolean {\n  ...",
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

### Example: Normal Inline Completion (No Metadata)

**Request:**
```json
{
  "prompt": "function add(a: number, b: number) {\n    return ",
  "suffix": "\n}",
  "position": {"line": 5, "column": 12}
}
```

**MetadataGenerator Analysis:**
- No import pattern
- No file comment
- Distance from cursor: 0
- **Decision:** Normal inline completion → undefined

**API Response:**
```json
{
  "choices": [
    {
      "text": "a + b;"
      // No metadata → shows as ghost text
    }
  ]
}
```

## Same-Document Redirects

**Definition:** Edits in the same file but at a different line (e.g., import to line 0 while cursor is at line 20)

### Critical Bug and Fix

**Bug:** `documentResolver.resolveFromMetadata()` was returning `undefined` for same-document URIs, causing `targetRange` to fall back to current position.

**Old Code (BUGGY):**
```typescript
resolveFromMetadata(...) {
    let targetUri = vscode.Uri.parse(metadata.targetDocument);

    // ❌ BUG: Early return for same-document URIs
    if (targetUri.toString() === currentDocumentUri.toString()) {
        return undefined; // Same document
    }

    // This code never runs for same-document redirects
    const document = this.resolveFromUri(targetUri);
    const range = new vscode.Range(...);
    return { uri: targetUri, document, range };
}
```

**Result:** Import inserted at line 20 instead of line 0.

**Fixed Code:**
```typescript
resolveFromMetadata(...) {
    let targetUri = vscode.Uri.parse(metadata.targetDocument);

    // Normalize /workspace prefix
    if (targetUri.path.startsWith('/workspace/')) {
        const workspaceFolder = this._workspace.getWorkspaceFolder(currentDocumentUri);
        if (workspaceFolder) {
            const relativePath = targetUri.path.replace('/workspace/', '');
            targetUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
        }
    }

    // Resolve document from workspace (works for both same and different documents)
    const document = this.resolveFromUri(targetUri);
    if (!document) {
        return undefined;
    }

    // Create range from metadata
    const range = new vscode.Range(
        new vscode.Position(metadata.targetLine ?? 0, metadata.targetColumn ?? 0),
        new vscode.Position(metadata.targetLine ?? 0, metadata.targetColumn ?? 0)
    );

    // ✅ Return resolved document even if same as current
    // This allows same-document redirects (e.g., import to line 0)
    return { uri: targetUri, document, range };
}
```

**Result:** Import correctly inserted at line 0.

## Multi-Line Import Edge Case

**Issue #137:** Model sometimes completes typing "her" → "here" AND adds import on next line:

```
Prompt: "// add react import her"
Completion: "e\nimport React from 'react';"
```

### Backend Fix: Multi-line Import Detection

**Old Regex (BUGGY):**
```typescript
const hasImport = /^(import\s+|from\s+['"]|require\()/.test(completion);
```
- Only matches if import is at the **start** of the completion
- Fails for `"e\nimport React..."` because it starts with `"e"`

**New Regex (FIXED):**
```typescript
const hasImport = /(^|\n)\s*(import\s+|from\s+['"]|require\(|#include\s+|using\s+)/.test(completion);
```
- Matches import at start **OR** after a newline
- Handles `"e\nimport React..."` correctly

### Frontend Fix: Import Filter Bypass

**Problem:** Import-only completions are normally filtered out to avoid ghost text imports.

**Solution:** Bypass import filter when completion has `displayLocation` metadata:

```typescript
const hasDisplayLocationMetadata = metadata && metadata.displayType === 'label';
const filteredText = ImportFilteringAspect.filterCompletion(trimmed, languageId);

if (!filteredText || filteredText.trim().length === 0) {
    if (!hasDisplayLocationMetadata) {
        // Normal import-only completion → filter out
        console.log(`⚠️ Choice ${i + 1} contains only imports, filtering out`);
        continue;
    }
    // Import-only WITH metadata → allow (will show as label)
    console.log(`✅ Choice ${i + 1} is import-only BUT has displayLocation metadata, allowing`);
}

const completionText = hasDisplayLocationMetadata ? trimmed : (filteredText || trimmed).trim();
```

**Logic:**
- Import-only + no metadata → filter out (avoid ghost imports)
- Import-only + metadata → allow (will show "Tab to jump" label)

## Comparison with GitHub Copilot

### Reference Implementation

Copilot's `inlineCompletionProvider.ts:368-373`:

```typescript
const displayLocationRange = result.displayLocation && doc.fromRange(document, toExternalRange(result.displayLocation.range));
const displayLocation: InlineCompletionDisplayLocation | undefined = result.displayLocation && displayLocationRange ? {
    range: displayLocationRange,
    label: result.displayLocation.label,
    kind: InlineCompletionDisplayLocationKind.Code,  // ← Uses Code, not Label
} : undefined;
```

### Key Differences

| Aspect | Puku Implementation | Copilot Reference |
|--------|---------------------|-------------------|
| **displayLocation kind** | `Label` | `Code` |
| **UX** | Shows "⇥ Tab to jump..." navigation UI | Shows ghost text at target location |
| **Same-document redirects** | ✅ Supported | ✅ Supported |
| **Document resolution** | Always returns resolved doc with target range | Same pattern |

### Kind: Label vs Code

**`InlineCompletionDisplayLocationKind.Label`** (Puku):
- Shows navigation label at current position
- User sees "⇥ Tab to jump to line 1"
- Pressing Tab navigates to target and inserts code

**`InlineCompletionDisplayLocationKind.Code`** (Copilot):
- Shows ghost text at target position
- User sees actual code preview at target location
- Pressing Tab accepts and navigates to target

**Both approaches:**
- Support Tab-to-jump functionality
- Work with same-document redirects
- Use the same two-range pattern (`displayLocation.range` vs `item.range`)

## Code Examples

### Backend: Metadata Generation

**File:** `puku-worker/src/lib/metadata-generator.ts`

```typescript
export class MetadataGenerator {
    generate(completion: string, context: FimContext): CompletionMetadata | undefined {
        // Heuristic 1: Import statement at wrong position
        if (this.isImportAtWrongPosition(completion, context)) {
            return {
                targetDocument: context.currentDocument,
                targetLine: 0,
                targetColumn: 0,
                displayType: 'label'
            };
        }

        // Heuristic 2: File creation comment detected
        const newFilePath = this.extractFilePathComment(completion);
        if (newFilePath && context.workspaceRoot) {
            return {
                targetDocument: this.buildUri(context.workspaceRoot, newFilePath),
                targetLine: 0,
                targetColumn: 0,
                displayType: 'label'
            };
        }

        // Heuristic 3: Distance-based display location
        const targetLine = this.detectTargetLine(completion, context);
        if (targetLine !== null && context.position) {
            const distance = Math.abs(targetLine - context.position.line);
            if (distance > 12) {
                return {
                    targetDocument: context.currentDocument,
                    targetLine: targetLine,
                    targetColumn: 0,
                    displayType: 'label'
                };
            }
        }

        // Heuristic 4: Same-document edits at current position use ghost text
        return undefined;
    }

    private isImportAtWrongPosition(completion: string, context: FimContext): boolean {
        // Check for various import patterns anywhere in the completion
        // Handles multi-line completions like "e\nimport React from 'react';"
        const hasImport = /(^|\n)\s*(import\s+|from\s+['"]|require\(|#include\s+|using\s+)/.test(completion);
        const atWrongLine = (context.position?.line ?? 0) > 0;
        return hasImport && atWrongLine;
    }
}
```

### Frontend: Document Resolution

**File:** `src/extension/pukuai/vscode-node/utils/documentResolver.ts`

```typescript
export class DocumentResolver {
    resolveFromMetadata(
        metadata: CompletionMetadata | undefined,
        currentDocumentUri: vscode.Uri
    ): ResolvedDocument | undefined {
        if (!metadata || !metadata.targetDocument) {
            return undefined;
        }

        let targetUri = vscode.Uri.parse(metadata.targetDocument);

        // Normalize /workspace prefix to actual workspace root
        if (targetUri.path.startsWith('/workspace/')) {
            const workspaceFolder = this._workspace.getWorkspaceFolder(currentDocumentUri);
            if (workspaceFolder) {
                const relativePath = targetUri.path.replace('/workspace/', '');
                targetUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
            }
        }

        // Resolve document from workspace
        const document = this.resolveFromUri(targetUri);
        if (!document) {
            return undefined;
        }

        // Create range from metadata
        const line = metadata.targetLine ?? 0;
        const col = metadata.targetColumn ?? 0;
        const range = new vscode.Range(
            new vscode.Position(line, col),
            new vscode.Position(line, col)
        );

        // Return resolved document even if same as current
        return { uri: targetUri, document, range };
    }
}
```

### Frontend: InlineCompletionItem Creation

**File:** `src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts`

```typescript
// Resolve target document and range from metadata
const resolvedDoc = metadata
    ? documentResolver.resolveFromMetadata(metadata, document.uri)
    : undefined;

const targetDocument = resolvedDoc?.document ?? document;
const targetRange = resolvedDoc?.range ?? range;

// Create displayLocation if metadata indicates label display
const displayLocation = resolvedDoc && metadata?.displayType === 'label'
    ? displayLocationFactory.createLabel(position, targetDocument, targetRange)
    : undefined;

// Create InlineCompletionItem with TARGET range
const item = new vscode.InlineCompletionItem(completion, targetRange);
item.displayLocation = displayLocation;
```

## Testing

### Backend Test Script

**File:** `puku-worker/test-displayLocation.sh`

**Test Cases:**

1. **Import redirection** - Completion with import → targetLine: 0
2. **File creation** - Completion with `// File:` comment → new targetDocument
3. **Normal completion** - No metadata → ghost text
4. **Distance-based** - Completion with `@line:42` marker → targetLine: 42
5. **Multi-line import** (Edge case) - `"e\nimport React..."` → targetLine: 0

**Test 5 Example:**
```bash
RESPONSE=$(curl -s -X POST http://localhost:8787/v1/fim/context \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer session_test_user" \
    -d '{
        "prompt": "// add react import her",
        "suffix": "\n\nexport default App;",
        "language": "typescript",
        "currentDocument": "file:///workspace/hi.ts",
        "position": {"line": 20, "column": 23}
    }')

# Expected response
{
  "choices": [
    {
      "text": "e\nimport React from 'react';",
      "metadata": {
        "targetDocument": "file:///workspace/hi.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Manual Testing Workflow

1. **Setup:**
   ```bash
   # Terminal 1: Run backend
   cd puku-worker && npx wrangler dev --port 8787

   # Terminal 2: Run extension
   cd puku-editor/src/chat && npm run watch
   ```

2. **Test Import Redirect:**
   - Open `hi.ts` file
   - Go to line 20
   - Type: `// add react import her`
   - Wait for completion
   - **Expected:** "⇥ Tab to jump to line 1" label appears
   - Press Tab
   - **Expected:** Cursor jumps to line 1, import inserted

3. **Verify Logs:**
   ```
   [FetchCompletion] ✅ Choice 1 is import-only BUT has displayLocation metadata, allowing
   [DocumentResolver] Normalized /workspace URI: file:///workspace/hi.ts → file:///Users/.../hi.ts
   [PukuFimProvider] Created displayLocation label for line 1
   ```

4. **Common Issues:**
   - **Label shows but Tab doesn't jump** → Check `item.range` is targetRange, not range
   - **Import at wrong line** → Check documentResolver returns resolved doc for same-document
   - **No label appears** → Check backend returning metadata, check displayType === 'label'

## File References

### Backend Files

- `puku-worker/src/lib/metadata-generator.ts:12-154` - Metadata generation logic
- `puku-worker/src/types.ts` - CompletionMetadata interface
- `puku-worker/test-displayLocation.sh` - Test script

### Frontend Files

- `src/extension/pukuai/vscode-node/utils/documentResolver.ts:34-149` - Document resolution
- `src/extension/pukuai/vscode-node/utils/displayLocationFactory.ts:1-77` - displayLocation creation
- `src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts:852-980` - Main provider logic

### Reference Files

- `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts:368-373` - Copilot reference

### Documentation Files

- `docs/issues/ISSUE-displayLocation-tab-navigation.md` - Original issue documentation
- `docs/architecture/displayLocation-tab-to-jump.md` - This file

## Real-World Usage Examples

### Example 1: React Import While Writing Component

**Scenario:** User is writing a React component and types a comment asking for an import.

**User Action:**
```typescript
// hi.ts (line 20)
const App = () => {
  const [count, setCount] = useState(0);
  // add react import her█
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "const App = () => {\n  const [count, setCount] = useState(0);\n  // add react import her",
  "suffix": "\n\n  return <div>...</div>;\n}",
  "language": "typescript",
  "currentDocument": "file:///workspace/hi.ts",
  "position": {"line": 20, "column": 23}
}
```

2. **Model Completion:**
```
"e\nimport React, { useState } from 'react';"
```

3. **MetadataGenerator:**
   - Detects import: `/(^|\n)\s*import\s+/` → ✅ Match on `\nimport`
   - Line > 0: line 20 → ✅ True
   - Returns metadata with targetLine: 0

4. **API Response:**
```json
{
  "choices": [{
    "text": "e\nimport React, { useState } from 'react';",
    "metadata": {
      "targetDocument": "file:///workspace/hi.ts",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

**Frontend Flow:**

1. **Document Resolution:**
   - DocumentResolver normalizes URI
   - Resolves to same document (`hi.ts`)
   - Creates targetRange at (0, 0)

2. **Display Location:**
```typescript
displayLocation = {
  range: Range(20, 23, 20, 23),  // Current cursor
  label: "⇥ Tab to jump to line 1",
  kind: Label
}
```

3. **Inline Completion Item:**
```typescript
item = new InlineCompletionItem(
  "e\nimport React, { useState } from 'react';",
  Range(0, 0, 0, 0)  // Target: top of file
)
item.displayLocation = displayLocation
```

**User Experience:**
```
Line 20: // add react import here
         ⇥ Tab to jump to line 1  ← Label appears

[User presses Tab]

Line 1:  import React, { useState } from 'react';█  ← Cursor jumps here
```

---

### Example 2: Creating a New Utility File

**Scenario:** User wants to create a new validation utility file from main code.

**User Action:**
```typescript
// math.ts (line 5)
export function add(a: number, b: number) {
  return a + b;
}

// File: src/utils/validation.ts█
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "export function add(a: number, b: number) {\n  return a + b;\n}\n\n// File: src/utils/validation.ts",
  "suffix": "",
  "currentDocument": "file:///workspace/src/math.ts",
  "position": {"line": 5, "column": 0}
}
```

2. **Model Completion:**
```typescript
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

3. **MetadataGenerator:**
   - Detects file comment: `// File: src/utils/validation.ts`
   - Extracts path: `src/utils/validation.ts`
   - Builds new URI: `file:///workspace/src/utils/validation.ts`

4. **API Response:**
```json
{
  "choices": [{
    "text": "export function isEmail(email: string): boolean {\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return emailRegex.test(email);\n}",
    "metadata": {
      "targetDocument": "file:///workspace/src/utils/validation.ts",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

**Frontend Flow:**

1. **Document Resolution:**
   - Normalizes `/workspace/src/utils/validation.ts` → actual path
   - Creates new file if doesn't exist
   - targetRange at (0, 0)

2. **Display Location:**
```typescript
displayLocation = {
  range: Range(5, 0, 5, 0),  // Current cursor in math.ts
  label: "⇥ Tab to jump to validation.ts:1",
  kind: Label
}
```

**User Experience:**
```
math.ts (line 5): // File: src/utils/validation.ts
                  ⇥ Tab to jump to validation.ts:1  ← Label

[User presses Tab]

[New file opens: src/utils/validation.ts]
Line 1:  export function isEmail(email: string): boolean {█
```

---

### Example 3: Python Import at Wrong Position

**Scenario:** User working on Python code mid-file requests numpy import.

**User Action:**
```python
# analysis.py (line 15)
def calculate_mean(data):
    # import numpy her█
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "def calculate_mean(data):\n    # import numpy her",
  "suffix": "\n    return result",
  "language": "python",
  "currentDocument": "file:///workspace/analysis.py",
  "position": {"line": 15, "column": 22}
}
```

2. **Model Completion:**
```
"e\nimport numpy as np"
```

3. **MetadataGenerator:**
   - Detects import: `/(^|\n)\s*import\s+/` → ✅ Match
   - Line > 0: line 15 → ✅ True
   - Returns targetLine: 0

4. **API Response:**
```json
{
  "choices": [{
    "text": "e\nimport numpy as np",
    "metadata": {
      "targetDocument": "file:///workspace/analysis.py",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

**User Experience:**
```
Line 15: def calculate_mean(data):
             # import numpy here
             ⇥ Tab to jump to line 1  ← Label

[User presses Tab]

Line 1:  import numpy as np█  ← Import added at top
```

---

### Example 4: C++ Include Guard

**Scenario:** User working on header file needs include at top.

**User Action:**
```cpp
// vector3d.h (line 20)
class Vector3D {
public:
    // #include <cmath> her█
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "class Vector3D {\npublic:\n    // #include <cmath> her",
  "suffix": "\n};",
  "language": "cpp",
  "currentDocument": "file:///workspace/vector3d.h",
  "position": {"line": 20, "column": 26}
}
```

2. **Model Completion:**
```
"e\n#include <cmath>"
```

3. **MetadataGenerator:**
   - Detects include: `/(^|\n)\s*#include\s+/` → ✅ Match
   - Line > 0: line 20 → ✅ True
   - Returns targetLine: 0

4. **API Response:**
```json
{
  "choices": [{
    "text": "e\n#include <cmath>",
    "metadata": {
      "targetDocument": "file:///workspace/vector3d.h",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

**User Experience:**
```
Line 20: class Vector3D {
         public:
             // #include <cmath> here
             ⇥ Tab to jump to line 1  ← Label

[User presses Tab]

Line 1:  #include <cmath>█  ← Include added at top
```

---

### Example 5: Normal Inline Completion (No Jump)

**Scenario:** User writing function body, normal completion.

**User Action:**
```typescript
// utils.ts (line 5)
function add(a: number, b: number) {
    return █
}
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "function add(a: number, b: number) {\n    return ",
  "suffix": "\n}",
  "language": "typescript",
  "currentDocument": "file:///workspace/utils.ts",
  "position": {"line": 5, "column": 11}
}
```

2. **Model Completion:**
```
"a + b;"
```

3. **MetadataGenerator:**
   - No import pattern → ❌
   - No file comment → ❌
   - Distance: 0 lines → ❌
   - Returns `undefined` (no metadata)

4. **API Response:**
```json
{
  "choices": [{
    "text": "a + b;"
    // No metadata
  }]
}
```

**Frontend Flow:**

1. **Document Resolution:**
   - metadata is undefined
   - resolvedDoc is undefined
   - targetRange = range (current position)

2. **Display Location:**
   - displayLocation is undefined (no label)

3. **Inline Completion Item:**
```typescript
item = new InlineCompletionItem(
  "a + b;",
  Range(5, 11, 5, 11)  // Same as cursor
)
// No displayLocation → shows as ghost text
```

**User Experience:**
```
Line 5: function add(a: number, b: number) {
            return a + b;  ← Gray ghost text
                   █

[User presses Tab]

Line 5:     return a + b;█  ← Accepted inline
```

---

### Example 6: Distance-Based Label (>12 Lines Away)

**Scenario:** Model suggests adding a helper function far from cursor.

**User Action:**
```typescript
// app.ts (line 50)
function processData(data: any[]) {
    // helper function for validation█
}
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "function processData(data: any[]) {\n    // helper function for validation",
  "suffix": "\n}",
  "currentDocument": "file:///workspace/app.ts",
  "position": {"line": 50, "column": 0}
}
```

2. **Model Completion (with line marker):**
```
"@line:10\nfunction validateData(data: any): boolean {\n  return data !== null && data !== undefined;\n}"
```

3. **MetadataGenerator:**
   - Detects line marker: `@line:10` → targetLine: 9 (0-indexed)
   - Distance: |9 - 50| = 41 > 12 → ✅ Show as label
   - Returns targetLine: 9

4. **API Response:**
```json
{
  "choices": [{
    "text": "function validateData(data: any): boolean {\n  return data !== null && data !== undefined;\n}",
    "metadata": {
      "targetDocument": "file:///workspace/app.ts",
      "targetLine": 9,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

**User Experience:**
```
Line 50: function processData(data: any[]) {
             // helper function for validation
             ⇥ Tab to jump to line 10  ← Label (41 lines away)

[User presses Tab]

Line 10: function validateData(data: any): boolean {█
```

---

### Example 7: Edge Case - Multi-Line Completion Starting Mid-Word

**Scenario:** Model completes partial word and adds import.

**User Action:**
```typescript
// component.tsx (line 25)
const MyComponent = () => {
    const [state, setState] = useState(0);

    // import useEffect her█
```

**Backend Flow:**

1. **FIM Request:**
```json
{
  "prompt": "const MyComponent = () => {\n    const [state, setState] = useState(0);\n    \n    // import useEffect her",
  "suffix": "\n\n    return <div>...</div>;\n}",
  "language": "typescriptreact",
  "currentDocument": "file:///workspace/component.tsx",
  "position": {"line": 25, "column": 27}
}
```

2. **Model Completion:**
```
"e\nimport { useEffect } from 'react';"
```

3. **MetadataGenerator:**
   - Multi-line completion starting with "e"
   - Detects import on second line: `/(^|\n)\s*import\s+/` → ✅ Match
   - Line > 0: line 25 → ✅ True
   - Returns targetLine: 0

4. **API Response:**
```json
{
  "choices": [{
    "text": "e\nimport { useEffect } from 'react';",
    "metadata": {
      "targetDocument": "file:///workspace/component.tsx",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

**Frontend Flow:**

1. **Import Filter Bypass:**
```typescript
// Completion is "e\nimport { useEffect } from 'react';"
// After filtering imports: "e" (just the word completion)
// But metadata.displayType === 'label' → bypass filter
// Use original trimmed text
completionText = "e\nimport { useEffect } from 'react';"
```

2. **Display Location:**
```typescript
displayLocation = {
  range: Range(25, 27, 25, 27),  // Current cursor
  label: "⇥ Tab to jump to line 1",
  kind: Label
}
```

**User Experience:**
```
Line 25:     // import useEffect here
             ⇥ Tab to jump to line 1  ← Label

[User presses Tab]

Line 1:  import { useEffect } from 'react';█
Line 25:     // import useEffect here  ← "e" is also inserted here
```

---

## Summary

The displayLocation architecture enables Tab-to-jump functionality through:

1. **Backend metadata generation** - Detects import patterns and generates targetLine/targetDocument
2. **Frontend document resolution** - Resolves target document/range from metadata (including same-document)
3. **Two-range pattern** - displayLocation.range (UI) vs InlineCompletionItem.range (insertion)
4. **Import filter bypass** - Allows import-only completions with metadata
5. **Multi-line import support** - Regex detects imports anywhere in completion text

**Key Insight:** The displayLocation API uses **two ranges** - one for showing UI (current position) and one for inserting code (target position). This separation enables the Tab-to-jump UX.

## Common Patterns

| Pattern | Trigger | targetLine | displayType | UX |
|---------|---------|------------|-------------|-----|
| **Import at wrong line** | Import statement, line > 0 | 0 | label | Tab to line 1 |
| **File creation** | `// File: path` comment | 0 | label | Tab to new file |
| **Distance-based** | `@line:N` marker, distance > 12 | N | label | Tab to line N |
| **Normal completion** | No special pattern | (none) | (none) | Ghost text inline |
| **Multi-line import** | Word + `\n` + import | 0 | label | Tab to line 1 |
