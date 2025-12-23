# Context-Aware Label System Design

## Overview

The label system provides **context-aware, user-friendly messages** for the displayLocation Tab-to-jump feature. Instead of showing generic "Go To Inline Suggestion" labels, the system generates intelligent messages based on the **type of edit** and **context**.

## Architecture

### Components

```
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND: MetadataGenerator                 │
│  1. Detects edit type (import, include, newFile, etc.)      │
│  2. Returns CompletionMetadata with editType                 │
│     { targetLine: 0, displayType: 'label', editType: 'import' } │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                FRONTEND: DisplayLocationFactory              │
│  1. LabelGenerator.generateLabel(editType, ...)             │
│     - Analyzes completion text for module names             │
│     - Considers target line, distance, same/diff file       │
│     - Generates context-specific message                    │
│  2. DisplayLocationFactory.createLabel(...)                 │
│     - Calls LabelGenerator with editType                    │
│     - Creates VS Code InlineCompletionDisplayLocation        │
└──────────────────────────────────────────────────────────────┘
```

### Edit Types

| EditType | Trigger | Backend Detection | Label Examples |
|----------|---------|-------------------|----------------|
| **Import** | `import`, `from`, `require` | Regex: `/(^|\n)\s*(import\s+\|from\s+)/.test()` | "⇥ Tab to add import from 'react' at top" |
| **Include** | `#include`, `using` | Regex: `/(^|\n)\s*#include\s+/.test()` | "⇥ Tab to include <cmath> at top" |
| **NewFile** | `// File: path` comment | Regex: `/\/\/\s*[Ff]ile:\s*(.+)/.test()` | "⇥ Tab to create validation.ts" |
| **DistantEdit** | Line marker `@line:N` or distance > 12 | `Math.abs(targetLine - cursorLine) > 12` | "⇥ Tab to jump to line 42 (30 lines below)" |
| **Generic** | Fallback for other edits | Default | "⇥ Tab to jump to line 10" |

## Label Generation Logic

### LabelGenerator.generateLabel()

```typescript
generateLabel(
    editType: EditType,
    targetDocument: vscode.TextDocument,
    targetRange: vscode.Range,
    currentDocument: vscode.TextDocument,
    currentPosition: vscode.Position,
    completionText: string
): string
```

**Context Analysis:**
- **targetLine** - Where code will be inserted (1-indexed for display)
- **currentLine** - Where user is typing
- **distance** - `|targetLine - currentLine|`
- **isSameDocument** - Same file or different file edit
- **targetFilename** - Filename for different-file edits

**Label Variations by EditType:**

#### 1. Import Labels

```typescript
// Extract module name from completion text
const importMatch = completionText.match(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
const module = importMatch?.[3]; // "react", "lodash", etc.

// Line 1 with module
"⇥ Tab to add import from 'react' at top"

// Line 1 without module
"⇥ Tab to add import at top"

// Line N same file
"⇥ Tab to add import at line 5"

// Different file
"⇥ Tab to add import in utils.ts:1"
```

**Examples:**

| Completion | Label |
|-----------|-------|
| `import React from 'react';` at line 0 | "⇥ Tab to add import from 'react' at top" |
| `import { useState } from 'react';` at line 0 | "⇥ Tab to add import from 'react' at top" |
| `const _ = require('lodash');` at line 0 | "⇥ Tab to add import at top" |
| `import utils from './utils';` at line 5 | "⇥ Tab to add import at line 6" |

#### 2. Include Labels (C/C++)

```typescript
// Extract header name
const includeMatch = completionText.match(/#include\s+[<"]([^>"]+)[>"]/);
const header = includeMatch?.[1]; // "cmath", "vector", etc.

// Line 1 with header
"⇥ Tab to include <cmath> at top"

// Line 1 without header
"⇥ Tab to add include at top"

// Line N same file
"⇥ Tab to add include at line 3"

// Different file
"⇥ Tab to add include in vector3d.h:1"
```

**Examples:**

| Completion | Label |
|-----------|-------|
| `#include <cmath>` at line 0 | "⇥ Tab to include <cmath> at top" |
| `#include "utils.h"` at line 0 | "⇥ Tab to include <utils.h> at top" |
| `#include <vector>` at line 3 | "⇥ Tab to add include at line 4" |

#### 3. NewFile Labels

```typescript
// For new file creation, always line 1
"⇥ Tab to create validation.ts"
"⇥ Tab to create auth.service.ts"
"⇥ Tab to create index.html"
```

**Examples:**

| Target File | Label |
|-----------|-------|
| `src/utils/validation.ts` | "⇥ Tab to create validation.ts" |
| `components/Button.tsx` | "⇥ Tab to create Button.tsx" |

#### 4. DistantEdit Labels

```typescript
const direction = targetLine < currentLine ? 'above' : 'below';

// Far away (>50 lines), show direction
"⇥ Tab to jump to line 10 (45 lines above)"
"⇥ Tab to jump to line 100 (60 lines below)"

// Moderately distant (12-50 lines)
"⇥ Tab to jump to line 25"

// Different file
"⇥ Tab to jump to utils.ts:42"
```

**Examples:**

| Current Line | Target Line | Distance | Label |
|--------------|-------------|----------|-------|
| 50 | 5 | 45 | "⇥ Tab to jump to line 5 (45 lines above)" |
| 10 | 80 | 70 | "⇥ Tab to jump to line 80 (70 lines below)" |
| 30 | 40 | 10 | (No label - distance < 12, shows ghost text) |
| 20 | 35 | 15 | "⇥ Tab to jump to line 35" |

#### 5. Generic Labels (Fallback)

```typescript
// Same file, line 1
"⇥ Tab to jump to top of file"

// Same file, line N
"⇥ Tab to jump to line 15"

// Different file
"⇥ Tab to edit main.ts:10"
```

## Backend Implementation

### CompletionMetadata Interface

```typescript
// puku-worker/src/types.ts
export interface CompletionMetadata {
    targetDocument?: string;
    targetLine?: number;
    targetColumn?: number;
    displayType?: 'code' | 'label';
    editType?: 'import' | 'include' | 'newFile' | 'distantEdit' | 'generic'; // NEW
}
```

### MetadataGenerator.generate()

```typescript
// puku-worker/src/lib/metadata-generator.ts
generate(completion: string, context: FimContext): CompletionMetadata | undefined {
    // Detect import type (import vs include)
    const importType = this.detectImportType(completion, context);
    if (importType) {
        return {
            targetDocument: context.currentDocument,
            targetLine: 0,
            targetColumn: 0,
            displayType: 'label',
            editType: importType // 'import' or 'include'
        };
    }

    // File creation
    const newFilePath = this.extractFilePathComment(completion);
    if (newFilePath && context.workspaceRoot) {
        return {
            targetDocument: this.buildUri(context.workspaceRoot, newFilePath),
            targetLine: 0,
            targetColumn: 0,
            displayType: 'label',
            editType: 'newFile'
        };
    }

    // Distant edit
    const targetLine = this.detectTargetLine(completion, context);
    if (targetLine !== null && context.position) {
        const distance = Math.abs(targetLine - context.position.line);
        if (distance > 12) {
            return {
                targetDocument: context.currentDocument,
                targetLine: targetLine,
                targetColumn: 0,
                displayType: 'label',
                editType: 'distantEdit'
            };
        }
    }

    return undefined; // Ghost text
}
```

### detectImportType()

```typescript
private detectImportType(completion: string, context: FimContext): 'import' | 'include' | null {
    const atWrongLine = (context.position?.line ?? 0) > 0;
    if (!atWrongLine) {
        return null;
    }

    // Check for #include (C/C++)
    if (/(^|\n)\s*#include\s+/.test(completion)) {
        return 'include';
    }

    // Check for import/from/require (JS/TS/Python)
    if (/(^|\n)\s*(import\s+|from\s+['"]|require\(|using\s+)/.test(completion)) {
        return 'import';
    }

    return null;
}
```

## Frontend Implementation

### EditType Enum

```typescript
// src/extension/pukuai/vscode-node/utils/displayLocationFactory.ts
export enum EditType {
    Import = 'import',
    Include = 'include',
    NewFile = 'newFile',
    DistantEdit = 'distantEdit',
    Generic = 'generic'
}
```

### LabelGenerator Class

```typescript
export class LabelGenerator {
    generateLabel(
        editType: EditType,
        targetDocument: vscode.TextDocument,
        targetRange: vscode.Range,
        currentDocument: vscode.TextDocument,
        currentPosition: vscode.Position,
        completionText: string
    ): string {
        const targetLine = targetRange.start.line + 1; // 1-indexed
        const isSameDocument = targetDocument.uri.toString() === currentDocument.uri.toString();
        const targetFilename = this.getFilename(targetDocument.uri);

        switch (editType) {
            case EditType.Import:
                return this.generateImportLabel(targetLine, completionText, isSameDocument, targetFilename);
            case EditType.Include:
                return this.generateIncludeLabel(targetLine, completionText, isSameDocument, targetFilename);
            case EditType.NewFile:
                return this.generateNewFileLabel(targetFilename, targetLine);
            case EditType.DistantEdit:
                return this.generateDistantEditLabel(targetLine, currentLine, distance, isSameDocument, targetFilename);
            case EditType.Generic:
            default:
                return this.generateGenericLabel(targetLine, isSameDocument, targetFilename);
        }
    }

    private generateImportLabel(targetLine: number, completionText: string, isSameDocument: boolean, targetFilename: string): string {
        const importMatch = completionText.match(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
        const module = importMatch?.[3];

        if (targetLine === 1) {
            return module
                ? `⇥ Tab to add import from '${module}' at top`
                : `⇥ Tab to add import at top`;
        } else if (isSameDocument) {
            return `⇥ Tab to add import at line ${targetLine}`;
        } else {
            return `⇥ Tab to add import in ${targetFilename}:${targetLine}`;
        }
    }

    // Similar methods for Include, NewFile, DistantEdit, Generic...
}
```

### DisplayLocationFactory Integration

```typescript
export class DisplayLocationFactory {
    private readonly labelGenerator = new LabelGenerator();

    createLabel(
        editType: EditType,
        targetDocument: vscode.TextDocument,
        targetRange: vscode.Range,
        currentDocument: vscode.TextDocument,
        currentPosition: vscode.Position,
        completionText: string
    ): vscode.InlineCompletionDisplayLocation {
        // Generate context-aware label
        const label = this.labelGenerator.generateLabel(
            editType,
            targetDocument,
            targetRange,
            currentDocument,
            currentPosition,
            completionText
        );

        const currentRange = new vscode.Range(currentPosition, currentPosition);

        return {
            range: currentRange,
            label,
            kind: vscode.InlineCompletionDisplayLocationKind.Label
        };
    }
}
```

### Provider Integration

```typescript
// src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts
if (hasMetadataLabel || resolvedDocument || isInlineEdit) {
    const targetDocument = resolvedDocument?.document ?? document;
    const targetRange = resolvedDocument?.range ?? range;

    // Map backend editType to frontend EditType enum
    const editType = this.mapMetadataEditType(metadata?.editType);

    // Create context-aware label
    const displayLocation = this._displayLocationFactory.createLabel(
        editType,
        targetDocument,
        targetRange,
        document,
        position,
        completion
    );

    // ...rest of completion item creation
}

private mapMetadataEditType(editType: string | undefined): EditType {
    const { EditType } = require('../utils/displayLocationFactory');

    switch (editType) {
        case 'import':
            return EditType.Import;
        case 'include':
            return EditType.Include;
        case 'newFile':
            return EditType.NewFile;
        case 'distantEdit':
            return EditType.DistantEdit;
        case 'generic':
        default:
            return EditType.Generic;
    }
}
```

## Example Scenarios

### Scenario 1: React Import

**User Action:**
```typescript
// Line 20
const App = () => {
  // add react import her█
```

**Backend:**
```json
{
  "text": "e\nimport React, { useState } from 'react';",
  "metadata": {
    "targetLine": 0,
    "displayType": "label",
    "editType": "import"  // ← Detected by MetadataGenerator
  }
}
```

**Frontend:**
```typescript
LabelGenerator.generateImportLabel(
  targetLine: 1,
  completionText: "e\nimport React, { useState } from 'react';",
  isSameDocument: true,
  targetFilename: "hi.ts"
)
// Returns: "⇥ Tab to add import from 'react' at top"
```

**UI:**
```
Line 20: // add react import here
         ⇥ Tab to add import from 'react' at top  ← Context-aware label!
```

---

### Scenario 2: C++ Include

**User Action:**
```cpp
// Line 25
class Vector3D {
public:
    // #include <cmath> her█
```

**Backend:**
```json
{
  "text": "e\n#include <cmath>",
  "metadata": {
    "targetLine": 0,
    "displayType": "label",
    "editType": "include"  // ← Detected as C++ include
  }
}
```

**Frontend:**
```typescript
LabelGenerator.generateIncludeLabel(
  targetLine: 1,
  completionText: "e\n#include <cmath>",
  isSameDocument: true,
  targetFilename: "vector3d.h"
)
// Returns: "⇥ Tab to include <cmath> at top"
```

**UI:**
```
Line 25: // #include <cmath> here
         ⇥ Tab to include <cmath> at top  ← C++-specific label!
```

---

### Scenario 3: Distant Edit (60 Lines Below)

**User Action:**
```typescript
// Line 10
function processData(data: any[]) {
    // helper function for validation█
}
```

**Backend:**
```json
{
  "text": "function validateData(data: any): boolean { ... }",
  "metadata": {
    "targetLine": 69,  // 0-indexed, displays as line 70
    "displayType": "label",
    "editType": "distantEdit"  // ← Distance > 12 lines
  }
}
```

**Frontend:**
```typescript
LabelGenerator.generateDistantEditLabel(
  targetLine: 70,
  currentLine: 11,
  distance: 59,  // |70 - 11| > 50
  isSameDocument: true,
  targetFilename: "app.ts"
)
// Returns: "⇥ Tab to jump to line 70 (59 lines below)"
```

**UI:**
```
Line 11: // helper function for validation
         ⇥ Tab to jump to line 70 (59 lines below)  ← Shows direction & distance!
```

## Benefits

1. **User-Friendly** - Clear, actionable messages ("add import" vs generic "Go To")
2. **Context-Aware** - Detects what's being added (module name, header file)
3. **Distance-Aware** - Shows direction and distance for far edits
4. **Cross-Language** - Handles JS/TS imports, C++ includes, Python imports
5. **File-Aware** - Distinguishes same-file vs different-file edits
6. **Extensible** - Easy to add new EditTypes (e.g., `export`, `type`, `interface`)

## Future Enhancements

1. **More Edit Types:**
   - `export` - "⇥ Tab to add export to index.ts"
   - `type` - "⇥ Tab to add type definition at top"
   - `interface` - "⇥ Tab to add interface above class"

2. **Smarter Analysis:**
   - Detect named vs default imports
   - Show full import statement in label for complex imports
   - Detect ESM vs CommonJS for different messaging

3. **Localization:**
   - Support multiple languages
   - Configurable label templates

4. **User Preferences:**
   - Setting for label verbosity (concise vs detailed)
   - Custom label templates
   - Distance threshold configuration

## Summary

The context-aware label system transforms generic navigation messages into helpful, specific guidance based on the type of edit and context. By analyzing the completion text and edit metadata, the system provides:

- **Import/Include detection** with module/header extraction
- **Distance-based labels** showing direction for far edits
- **File creation labels** highlighting new file creation
- **Cross-language support** for JS/TS, Python, C/C++

This creates a more intuitive and informative user experience for the Tab-to-jump feature.
