# Puku Editor Architecture Documentation

This directory contains comprehensive architecture documentation for major features and systems in Puku Editor.

## Table of Contents

### Inline Completions & Suggestions

1. **[displayLocation Tab-to-Jump](./displayLocation-tab-to-jump.md)** (41KB)
   - Complete architecture for multi-document inline completions
   - 7 real-world usage examples (React, Python, C++, etc.)
   - Backend metadata generation + Frontend display location handling
   - Same-document redirect implementation
   - Multi-line import edge case handling
   - Comparison with GitHub Copilot reference

2. **[Context-Aware Label System](./label-system-design.md)** (17KB)
   - Intelligent label generation based on edit type
   - 5 edit types: Import, Include, NewFile, DistantEdit, Generic
   - Module/header extraction for context-specific messages
   - Distance-aware labels with direction indicators
   - Cross-language support (JS/TS, Python, C/C++)

3. **[NES Debouncing Architecture](./nes-debouncing-architecture.md)** (26KB)
   - Next Edit Suggestion debouncing system
   - Prevents excessive API calls during typing
   - 800ms delay with single-char skip optimization
   - Ghost text lifecycle management

4. **[Diagnostics Provider Architecture](./diagnostics-provider-architecture.md)** (40KB)
   - Code diagnostics and error detection system
   - Integration with VS Code's diagnostics API
   - Error highlighting and fix suggestions

5. **[Rejection Collector Architecture](./rejection-collector-architecture.md)** (25KB)
   - Tracks rejected inline completion suggestions
   - Feedback loop for model improvement
   - Telemetry and analytics integration

### Authentication & Security

6. **[Authentication Architecture](./AUTHENTICATION_ARCHITECTURE.md)** (24KB)
   - GitHub OAuth integration
   - Token management and refresh
   - Session handling

---

## Feature Overview: displayLocation Tab-to-Jump

### What is it?

The **displayLocation** feature enables Tab-to-jump functionality for inline code completions, allowing the editor to show a completion suggestion at the current cursor position while inserting the code at a different location (like imports at the top of the file).

### Quick Example

**User types at line 20:**
```typescript
const App = () => {
  const [count, setCount] = useState(0);
  // add react import her█
```

**AI suggests:**
```
Line 20: // add react import here
         ⇥ Tab to add import from 'react' at top  ← Label appears
```

**User presses Tab:**
```
Line 1:  import React, { useState } from 'react';█  ← Cursor jumps, import inserted
```

### Key Concepts

1. **Two Ranges Pattern**
   - `displayLocation.range` - Where UI/label shows (current cursor)
   - `InlineCompletionItem.range` - Where code inserts (target line)

2. **Backend Metadata**
   ```json
   {
     "text": "e\nimport React from 'react';",
     "metadata": {
       "targetDocument": "file:///workspace/hi.ts",
       "targetLine": 0,
       "targetColumn": 0,
       "displayType": "label",
       "editType": "import"
     }
   }
   ```

3. **Frontend Processing**
   - `DocumentResolver` - Resolves target document/range from metadata
   - `LabelGenerator` - Creates context-aware label text
   - `DisplayLocationFactory` - Creates VS Code display location object
   - `PukuFimProvider` - Orchestrates the entire flow

### Architecture Flow

```
User Types Code (line 20)
         ↓
FIM Provider debounces (800ms)
         ↓
Backend: MetadataGenerator
  - Detects import pattern
  - Returns metadata with targetLine: 0, editType: 'import'
         ↓
Frontend: DocumentResolver
  - Normalizes /workspace URI
  - Resolves to same document
  - Creates targetRange at (0, 0)
         ↓
Frontend: LabelGenerator
  - Analyzes completion text
  - Extracts module name: 'react'
  - Generates: "⇥ Tab to add import from 'react' at top"
         ↓
Frontend: DisplayLocationFactory
  - displayLocation.range = (20, 23) ← Current cursor
  - displayLocation.label = "⇥ Tab to add import from 'react' at top"
  - displayLocation.kind = Label
         ↓
Frontend: InlineCompletionItem
  - item.range = (0, 0) ← Target: top of file
  - item.displayLocation = displayLocation
         ↓
VS Code displays label at cursor
User presses Tab
Cursor jumps to line 0, import inserted
```

### Use Cases

| Use Case | Trigger | Label Example |
|----------|---------|---------------|
| **Import at wrong line** | `import React from 'react';` at line 20 | "⇥ Tab to add import from 'react' at top" |
| **C++ include** | `#include <cmath>` at line 30 | "⇥ Tab to include <cmath> at top" |
| **New file creation** | `// File: src/utils.ts` | "⇥ Tab to create utils.ts" |
| **Distant edit** | Edit 60 lines away | "⇥ Tab to jump to line 70 (59 lines below)" |
| **Normal completion** | Edit at current position | (No label, shows ghost text) |

---

## Feature Overview: Context-Aware Label System

### What is it?

An intelligent label generation system that provides **context-specific, user-friendly messages** based on the type of edit and surrounding context, rather than generic "Go To Inline Suggestion" messages.

### Edit Types & Labels

#### 1. Import (JS/TS/Python)

**Detection:**
- Backend regex: `/(^|\n)\s*(import\s+|from\s+['"]|require\(|using\s+)/`
- Extracts module name from completion text

**Label Examples:**
- `import React from 'react';` → **"⇥ Tab to add import from 'react' at top"**
- `import { useState } from 'react';` → **"⇥ Tab to add import from 'react' at top"**
- `const _ = require('lodash');` → **"⇥ Tab to add import at top"**

#### 2. Include (C/C++)

**Detection:**
- Backend regex: `/(^|\n)\s*#include\s+/`
- Extracts header file name

**Label Examples:**
- `#include <cmath>` → **"⇥ Tab to include <cmath> at top"**
- `#include "utils.h"` → **"⇥ Tab to include <utils.h> at top"**

#### 3. New File Creation

**Detection:**
- Backend regex: `/\/\/\s*[Ff]ile:\s*(.+)/`
- Extracts file path from comment

**Label Examples:**
- `// File: src/utils/validation.ts` → **"⇥ Tab to create validation.ts"**
- `// File: components/Button.tsx` → **"⇥ Tab to create Button.tsx"**

#### 4. Distant Edit (>12 lines away)

**Detection:**
- Distance calculation: `|targetLine - currentLine| > 12`
- Direction detection: above/below

**Label Examples:**
- 45 lines above → **"⇥ Tab to jump to line 5 (45 lines above)"**
- 70 lines below → **"⇥ Tab to jump to line 80 (70 lines below)"**
- 15 lines away (≤50) → **"⇥ Tab to jump to line 35"**

#### 5. Generic (Fallback)

**Labels:**
- Line 1 → **"⇥ Tab to jump to top of file"**
- Line N → **"⇥ Tab to jump to line 15"**
- Different file → **"⇥ Tab to edit main.ts:10"**

### Implementation

**Backend (`puku-worker`):**
```typescript
// CompletionMetadata with editType
{
  targetDocument: "file:///workspace/hi.ts",
  targetLine: 0,
  displayType: "label",
  editType: "import"  // ← New field
}

// MetadataGenerator detects type
private detectImportType(completion: string, context: FimContext): 'import' | 'include' | null {
  if (/(^|\n)\s*#include\s+/.test(completion)) return 'include';
  if (/(^|\n)\s*(import\s+|from\s+['"])/.test(completion)) return 'import';
  return null;
}
```

**Frontend (`puku-editor`):**
```typescript
// LabelGenerator creates context-aware labels
generateImportLabel(targetLine: number, completionText: string, ...): string {
  // Extract module name
  const importMatch = completionText.match(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
  const module = importMatch?.[3]; // "react"

  if (targetLine === 1) {
    return module
      ? `⇥ Tab to add import from '${module}' at top`
      : `⇥ Tab to add import at top`;
  }
  // ... more variations
}
```

### Benefits

1. ✅ **User-Friendly** - Clear, actionable messages
2. ✅ **Context-Aware** - Shows what's being added (module, header)
3. ✅ **Distance-Aware** - Direction and distance for far edits
4. ✅ **Cross-Language** - JS/TS, Python, C/C++ support
5. ✅ **File-Aware** - Same-file vs different-file distinction
6. ✅ **Extensible** - Easy to add new edit types

---

## Real-World Examples

### Example 1: React Component Import

**File:** `hi.ts` (line 20)
```typescript
const App = () => {
  const [count, setCount] = useState(0);
  // add react import her█
```

**Backend Flow:**
1. FIM request sent after 800ms debounce
2. Model completes: `"e\nimport React, { useState } from 'react';"`
3. MetadataGenerator detects:
   - Import pattern: `/(^|\n)\s*import\s+/` ✅
   - Line > 0: true ✅
   - Returns: `{ targetLine: 0, editType: 'import' }`

**Frontend Flow:**
1. DocumentResolver normalizes URI, creates targetRange(0, 0)
2. LabelGenerator:
   - Extracts module: `'react'`
   - Generates: `"⇥ Tab to add import from 'react' at top"`
3. DisplayLocationFactory:
   - `displayLocation.range` = (20, 23)
   - `item.range` = (0, 0)

**UI:**
```
Line 20: // add react import here
         ⇥ Tab to add import from 'react' at top
```

**After Tab:**
```
Line 1:  import React, { useState } from 'react';█
```

---

### Example 2: C++ Include Header

**File:** `vector3d.h` (line 25)
```cpp
class Vector3D {
public:
    // #include <cmath> her█
```

**Backend:** Detects `#include` pattern, returns `{ targetLine: 0, editType: 'include' }`

**Frontend:** Generates `"⇥ Tab to include <cmath> at top"`

**UI:**
```
Line 25: // #include <cmath> here
         ⇥ Tab to include <cmath> at top
```

---

### Example 3: New File Creation

**File:** `math.ts` (line 5)
```typescript
export function add(a: number, b: number) {
  return a + b;
}

// File: src/utils/validation.ts█
```

**Backend:** Detects file comment, returns `{ targetDocument: "file:///workspace/src/utils/validation.ts", editType: 'newFile' }`

**Frontend:** Generates `"⇥ Tab to create validation.ts"`

**After Tab:** Opens new file `validation.ts` with completion inserted

---

### Example 4: Distant Edit with Direction

**File:** `app.ts` (line 10)
```typescript
function processData(data: any[]) {
    // helper function for validation█
}
```

**Backend:** Detects distance = 59 lines, returns `{ targetLine: 69, editType: 'distantEdit' }`

**Frontend:** Generates `"⇥ Tab to jump to line 70 (59 lines below)"`

**UI:**
```
Line 11: // helper function for validation
         ⇥ Tab to jump to line 70 (59 lines below)
```

---

## File Organization

### Backend (`puku-worker`)

```
puku-worker/
├── src/
│   ├── types.ts                     # CompletionMetadata interface
│   ├── lib/
│   │   └── metadata-generator.ts    # Metadata generation logic
│   └── routes/
│       └── completions.ts           # FIM API endpoint
└── test-displayLocation.sh          # Test script
```

### Frontend (`puku-editor`)

```
puku-editor/src/chat/src/extension/pukuai/
├── vscode-node/
│   ├── providers/
│   │   └── pukuFimProvider.ts       # Main FIM provider
│   └── utils/
│       ├── documentResolver.ts      # Document/range resolution
│       ├── displayLocationFactory.ts # Label generation
│       └── navigationCommandFactory.ts # Navigation commands
└── common/
    └── types.ts                     # Frontend types
```

### Documentation

```
puku-editor/docs/
├── architecture/
│   ├── README.md                           # This file
│   ├── displayLocation-tab-to-jump.md      # Complete architecture (41KB)
│   └── label-system-design.md              # Label system design (17KB)
└── issues/
    └── ISSUE-displayLocation-tab-navigation.md # Original issue docs
```

---

## Key Insights

### 1. Two-Range Pattern is Critical

The displayLocation API uses **two separate ranges**:
- **displayLocation.range** - Where to show UI (current cursor)
- **InlineCompletionItem.range** - Where to insert code (target)

This separation enables the Tab-to-jump UX.

### 2. Same-Document Redirects Work

The system supports **same-document redirects** (e.g., import at line 20 → line 0) by:
- Always returning `ResolvedDocument` even when URI matches current document
- Using `targetRange` from metadata instead of falling back to current position

### 3. Multi-Line Completions Need Special Handling

Completions like `"e\nimport React..."` require:
- Backend: Regex that matches import **after newline** `/(^|\n)\s*import/`
- Frontend: Bypass import filter when `displayType === 'label'`

### 4. Context-Aware Labels Improve UX

Generic labels like "Go To Inline Suggestion" are replaced with:
- "⇥ Tab to add import from 'react' at top"
- "⇥ Tab to include <cmath> at top"
- "⇥ Tab to jump to line 70 (59 lines below)"

Users get **clear, actionable guidance** instead of generic navigation messages.

---

## Testing

### Manual Testing Workflow

1. **Start backend:**
   ```bash
   cd puku-worker && npx wrangler dev --port 8787
   ```

2. **Start extension:**
   ```bash
   cd puku-editor/src/chat && npm run watch
   ```

3. **Test import redirect:**
   - Open `hi.ts`, go to line 20
   - Type: `// add react import her`
   - Wait for completion
   - **Expected:** Label "⇥ Tab to add import from 'react' at top" appears
   - Press Tab
   - **Expected:** Cursor jumps to line 1, import inserted

### Automated Testing

```bash
cd puku-worker
./test-displayLocation.sh
```

**Test Cases:**
1. Import redirection (line 20 → line 0)
2. File creation (`// File:` comment)
3. Normal completion (no metadata)
4. Distance-based label (>12 lines)
5. Multi-line import edge case (`"e\nimport..."`)

---

## Future Enhancements

### 1. More Edit Types
- **Export** - "⇥ Tab to add export to index.ts"
- **Type/Interface** - "⇥ Tab to add type definition at top"
- **Function** - "⇥ Tab to add helper function above"

### 2. Smarter Analysis
- Detect named vs default imports
- Show full import in label for complex imports
- ESM vs CommonJS detection

### 3. User Preferences
- Label verbosity setting (concise vs detailed)
- Custom label templates
- Distance threshold configuration
- Disable Tab-to-jump for specific patterns

### 4. Multi-Language Support
- Go: `import "fmt"` detection
- Rust: `use std::collections::HashMap;`
- Java: `import java.util.*;`

---

## Contributing

When adding new features to the displayLocation system:

1. **Update Backend Metadata:** Add new `editType` values in `types.ts`
2. **Update MetadataGenerator:** Add detection logic in `metadata-generator.ts`
3. **Update Frontend Enum:** Add to `EditType` enum in `displayLocationFactory.ts`
4. **Add Label Generator:** Implement `generateXxxLabel()` method
5. **Update Documentation:** Add examples to this README and architecture docs
6. **Add Tests:** Update `test-displayLocation.sh` with new test cases

---

## References

- **GitHub Copilot Reference:** `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts`
- **VS Code API:** [InlineCompletionDisplayLocation](https://code.visualstudio.com/api/references/vscode-api#InlineCompletionDisplayLocation)
- **Original Issue:** `docs/issues/ISSUE-displayLocation-tab-navigation.md`

---

## Quick Links

- [displayLocation Tab-to-Jump Architecture](./displayLocation-tab-to-jump.md) - Complete technical deep-dive
- [Label System Design](./label-system-design.md) - Context-aware label generation
- [NES Debouncing](./nes-debouncing-architecture.md) - Inline completion debouncing
- [Diagnostics Provider](./diagnostics-provider-architecture.md) - Error detection system
