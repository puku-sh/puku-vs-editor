# PRD: Diagnostics-Based Multi-Edit - Automatic Quick Fixes

**Status:** Draft
**Date:** 2025-12-03
**Author:** Puku AI Team
**Related Issue:** #30
**Depends On:** #26 (TAB to jump here)

## Overview

Enable automatic multi-location code fixes using VS Code's diagnostics system, allowing Puku to proactively suggest quick fixes for errors and warnings as users type. Inspired by Cursor's diagnostics-based inline edits.

## Problem Statement

Currently, Puku only provides inline completions at the cursor position via FIM. Users must:
- Manually navigate to diagnostics (red squiggles)
- Open quick fix menu (Ctrl+.)
- Select and apply fixes one by one

**User Pain Points:**
- Interrupts coding flow
- Requires manual action for every diagnostic
- No proactive suggestions
- Miss opportunities to fix related issues

**Competitors:**
- **Cursor:** Automatically shows inline fixes when cursor is near diagnostics
- **Copilot:** Requires manual Ctrl+I (less proactive)

## Goals

### Primary Goals
1. ✅ Automatically suggest fixes for diagnostics within 5 lines of cursor
2. ✅ Show "TAB to jump here" for distant edits (>12 lines away)
3. ✅ Support all language servers (TypeScript, Python, Go, etc.)
4. ✅ Seamless integration with existing FIM completions

### Non-Goals
- Custom LSP implementation (use VS Code's built-in APIs)
- Chat-based workspace edits (future: Issue #31)
- AI-generated diagnostic fixes (future: LLM-based quick fixes)

## Success Metrics

- **Adoption:** >40% of diagnostics fixed via inline suggestions (vs quick fix menu)
- **Satisfaction:** User feedback indicates improved workflow
- **Performance:** No latency added to typing experience
- **Accuracy:** >90% of suggested fixes successfully resolve diagnostics

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  VS Code Diagnostics (TypeScript, Python, ESLint, etc.)     │
│  ├── Errors (red squiggles)                                 │
│  ├── Warnings (yellow squiggles)                            │
│  └── Hints (gray dots)                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  DiagnosticsNextEditProvider                                 │
│  ├── Monitors cursor position                               │
│  ├── Checks diagnostics within 5 lines                      │
│  ├── Fetches code actions via executeCodeActionProvider     │
│  └── Creates inline completion item                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Diagnostic Completion Providers                             │
│  ├── AnyDiagnosticCompletionProvider (generic quick fixes) │
│  ├── ImportDiagnosticsCompletionProvider (imports)         │
│  └── AsyncDiagnosticsCompletionProvider (async/await)      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  InlineCompletionProviderImpl                                │
│  ├── Merges diagnostics + FIM completions                   │
│  ├── Prioritizes diagnostics when cursor near error         │
│  ├── Adds displayLocation for distant edits (>12 lines)    │
│  └── Renders inline ghost text with "TAB to jump here"     │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

#### 1. Trigger: Cursor Near Diagnostic

```typescript
// diagnosticsCompletions.ts:247-248
export function isDiagnosticWithinDistance(
    workspaceDocument: IObservableDocument,
    diagnostic: Diagnostic,
    position: Position,
    maxLineDistance: number
): boolean {
    return diagnosticDistanceToPosition(workspaceDocument, diagnostic, position).lineDelta <= maxLineDistance;
}
```

**Trigger conditions:**
- Cursor is within **5 lines** of a diagnostic
- Diagnostic is valid (not stale)
- Code actions available for diagnostic

#### 2. Fetch Code Actions (No LSP Needed)

```typescript
// vscodeWorkspace.ts:730-739
async function getQuickFixCodeActions(uri: Uri, range: Range, itemResolveCount: number): Promise<CodeAction[]> {
    return commands.executeCommand<CodeAction[]>(
        'vscode.executeCodeActionProvider',  // ✅ Built-in VS Code API
        uri,
        range,
        CodeActionKind.QuickFix.value,
        itemResolveCount
    );
}
```

**Key insight:** Uses VS Code's built-in API, not custom LSP. Works with:
- TypeScript language server
- Python (Pylance)
- Go (gopls)
- ESLint
- Any VS Code extension providing code actions

#### 3. Create Inline Completion

```typescript
// anyDiagnosticsCompletionProvider.ts:86-92
const editDistance = Math.abs(joinedEdit.range.startLineNumber - pos.lineNumber);
if (editDistance > 12) {
    displayLocationLabel = codeAction.title;  // "TAB to jump here"
}

const item = new AnyDiagnosticCompletionItem(
    anyCodeAction,
    diagnostic,
    displayLocationLabel,
    workspaceDocument
);
```

**Display location logic:**
- Edit within 12 lines: Show inline ghost text only
- Edit >12 lines away: Add "TAB to jump here" label at edit location

#### 4. Convert to VS Code API

```typescript
// diagnosticsCompletions.ts:60-67
get displayLocation(): vscode.InlineCompletionDisplayLocation | undefined {
    const displayLocation = this.nextEditDisplayLocation;
    return displayLocation ? {
        range: toExternalRange(displayLocation.range),
        label: displayLocation.label,
        kind: vscode.InlineCompletionDisplayLocationKind.Code  // Show at code location
    } : undefined;
}
```

### Integration with Puku FIM

**Priority Logic:**
```typescript
// Pseudocode for provideInlineCompletionItems()

async provideInlineCompletionItems(document, position, context, token) {
    // 1. Check for diagnostics first (higher priority)
    const diagnosticEdit = await diagnosticsProvider.getNextEdit(docId, context, logContext, token);
    if (diagnosticEdit.result) {
        return diagnosticEdit;  // ✅ Show diagnostic fix
    }

    // 2. Fall back to FIM if no diagnostics
    const fimCompletion = await pukuFIMProvider.getCompletion(document, position, token);
    return fimCompletion;
}
```

**Why diagnostics first?**
- Fixes are more confident (from language server)
- User expects fixes near red squiggles
- FIM can suggest at any location

## User Experience

### Scenario 1: Unused Import (Near Cursor)

**Before (Current):**
```typescript
import { useState, useEffect } from 'react';  // ⚠️ 'useEffect' is unused
                                              // ← Cursor here
function MyComponent() {
    const [count, setCount] = useState(0);
    return <div>{count}</div>;
}

// User must: Ctrl+. → Select "Remove unused import" → Enter
```

**After (With Diagnostics Multi-Edit):**
```typescript
import { useState } from 'react';  // Ghost text showing fix
                                   // ⮐ TAB to apply
function MyComponent() {
    const [count, setCount] = useState(0);
    return <div>{count}</div>;
}

// User: TAB → Done!
```

### Scenario 2: Missing Import (Distant Location)

**Before:**
```typescript
import { useState } from 'react';
                                              // ← Cursor here
function MyComponent() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');

    return (
        <div>
            <p>{count}</p>
            <Button onClick={() => setCount(count + 1)}>  // ⚠️ 'Button' is not defined (line 8)
                Increment
            </Button>
        </div>
    );
}

// User must: Scroll down → Ctrl+. on Button → Select import → Scroll back
```

**After:**
```typescript
import { useState } from 'react';
import { Button } from '@/components/Button';  // Ghost text at top
                                               // ⮐ TAB to apply
function MyComponent() {                       // [TAB to jump here] ← Label at cursor
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');

    return (
        <div>
            <p>{count}</p>
            <Button onClick={() => setCount(count + 1)}>  // Fix shown inline
                Increment
            </Button>
        </div>
    );
}

// User: TAB → Import added + cursor jumps to Button line → Continue coding
```

### Scenario 3: TypeScript Type Error

**Before:**
```typescript
function getUser(id: number) {
    return fetch(`/api/users/${id}`)
        .then(res => res.json());
}

const user = getUser(123);
console.log(user.name);  // ⚠️ Property 'name' does not exist on type 'Promise<any>'
                         // ← Cursor here

// User must: Understand async issue → Manually add await + async
```

**After:**
```typescript
function getUser(id: number) {
    return fetch(`/api/users/${id}`)
        .then(res => res.json());
}

const user = await getUser(123);  // Ghost text: add 'await'
                                  // ⮐ TAB to apply
console.log(user.name);

// OR alternative suggestion:
getUser(123).then(user => {      // Ghost text: use .then()
    console.log(user.name);      // ⮐ TAB to apply
});

// User: TAB → Fixed!
```

## Implementation Plan

### Phase 1: Enable Diagnostics Provider (Week 1) - **2-3 days**

**Goal:** Activate existing diagnostics code (currently inactive)

**Tasks:**
1. Enable `DiagnosticsNextEditProvider` in `inlineEditProviderFeature.ts`
2. Register diagnostic completion providers
3. Integrate with `InlineCompletionProviderImpl`
4. Test with TypeScript diagnostics

**Files to modify:**
- `src/chat/src/extension/inlineEdits/vscode-node/inlineEditProviderFeature.ts` (enable feature)
- `src/chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts` (integrate providers)

**Success criteria:**
- Diagnostics provider triggers within 5 lines of errors
- Quick fix suggestions appear as inline completions
- TAB accepts fix and resolves diagnostic

### Phase 2: Add Display Location for Distant Edits (Week 1) - **1-2 days**

**Goal:** Show "TAB to jump here" for edits >12 lines away

**Tasks:**
1. Ensure `displayLocation` is set for distant edits
2. Test jump navigation with imports
3. Verify label rendering

**Depends on:** Issue #26 (basic displayLocation support in PukuInlineCompletionProvider)

**Success criteria:**
- Edits >12 lines show jump label
- TAB applies fix + moves cursor to edit location
- Label text is clear and actionable

### Phase 3: Puku Branding (Week 2) - **1 day**

**Goal:** Add Puku branding to diagnostics UI

**Tasks:**
1. Customize inline completion item labels
2. Add Puku icon/indicator (if possible via API)
3. Update telemetry to track "puku.diagnosticFix"

**Files to modify:**
- `src/chat/src/extension/inlineEdits/vscode-node/features/diagnosticsCompletions.ts` (customize labels)
- Telemetry events

**Success criteria:**
- Users recognize Puku is providing the fix
- Telemetry tracks diagnostic fix usage

### Phase 4: Custom Diagnostic Providers (Week 3-4) - **3-5 days**

**Goal:** Add Puku-specific diagnostics beyond language server

**Future enhancements:**
1. Code quality suggestions (e.g., "Extract to function")
2. Performance hints (e.g., "Use useMemo here")
3. Security warnings (e.g., "Avoid eval()")

**Implementation:**
- Create `PukuCodeQualityDiagnosticProvider`
- Use static analysis or LLM-based detection
- Register as diagnostic provider

**Out of scope for MVP** - Can be separate issue

## Dependencies

### Existing Code (Reuse)
- `DiagnosticsNextEditProvider` - Already implemented ✅
- `AnyDiagnosticCompletionProvider` - Already implemented ✅
- `ImportDiagnosticsCompletionProvider` - Already implemented ✅
- `AsyncDiagnosticsCompletionProvider` - Already implemented ✅

### VS Code APIs
- `vscode.languages.getDiagnostics()` - Get diagnostics ✅
- `vscode.commands.executeCommand('vscode.executeCodeActionProvider')` - Get quick fixes ✅
- `vscode.InlineCompletionDisplayLocation` - Jump navigation ✅

### Puku Features
- Issue #26: TAB to jump here (must be completed first)
- FIM inline completion provider (existing)

### No New Dependencies
- ❌ No LSP integration needed
- ❌ No backend changes needed
- ❌ No new VS Code proposed APIs

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Conflicts with FIM completions | High | Prioritize diagnostics when cursor near error, FIM otherwise |
| Language server latency | Medium | Use 1-second timeout for code actions, show FIM if timeout |
| User confusion (automatic suggestions) | Medium | Start with conservative trigger (5 lines), add config later |
| Too many suggestions (noisy) | Low | Filter diagnostics by severity, skip hints initially |

## Alternatives Considered

### Alternative 1: LLM-Based Quick Fixes
**Approach:** Use GLM to generate fixes instead of language server code actions
**Pros:** More intelligent, can handle complex scenarios
**Cons:** Requires backend, slower, less accurate than language server
**Decision:** ❌ Rejected for MVP (save for Phase 4)

### Alternative 2: Copilot's Ctrl+I Approach
**Approach:** Require manual user action to trigger multi-edit
**Pros:** Less intrusive, user controls when to see suggestions
**Cons:** Less proactive, requires extra keystrokes
**Decision:** ❌ Rejected (Cursor's automatic approach is better UX)

### Alternative 3: Diagnostics Provider (Selected)
**Approach:** Automatically show fixes when cursor near diagnostics
**Pros:** Proactive, proven pattern (Cursor), reuses existing code
**Cons:** Requires careful prioritization with FIM
**Decision:** ✅ **Selected** (best balance of UX and implementation cost)

## Open Questions

1. **Q:** Should we show diagnostics fixes for warnings (yellow) or only errors (red)?
   **A:** Start with errors + warnings, skip hints (gray) initially

2. **Q:** What if FIM and diagnostics conflict at same location?
   **A:** Prioritize diagnostics (more confident), allow ESC to dismiss and see FIM

3. **Q:** Should we filter by diagnostic severity?
   **A:** MVP: Show all errors + warnings. Post-MVP: Add config for severity filter

4. **Q:** How to handle multiple code actions for one diagnostic?
   **A:** Show first/best action, allow cycling with Tab (future enhancement)

## References

- **Issue #26:** TAB to jump here - Multi-line completion navigation
- **Issue #25:** Parent issue for inline completion improvements
- **Cursor Implementation:** `src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts`
- **VS Code API:** `vscode.executeCodeActionProvider` command
- **Research:** Multi-edit analysis (this conversation)

## Success Criteria

✅ **MVP Complete When:**
- Diagnostics provider enabled for TypeScript, Python, Go
- Quick fixes appear automatically within 5 lines of diagnostics
- TAB applies fix and resolves diagnostic
- Distant edits (>12 lines) show "TAB to jump here" label
- No conflicts with existing FIM completions
- Telemetry tracks diagnostic fix acceptance rate

## Stakeholders

- **Engineering:** Implementation, testing, integration with FIM
- **Product:** UX validation, feature prioritization
- **Users:** Beta testing, feedback on automatic suggestions

## Timeline

- **Week 1:** Phase 1 (enable provider) + Phase 2 (jump navigation)
- **Week 2:** Phase 3 (branding) + testing + beta release
- **Week 3-4:** Phase 4 (custom diagnostics) - optional for MVP

---

**Next Steps:**
1. Create GitHub issue #30 with implementation details
2. Complete Issue #26 (TAB to jump here) as prerequisite
3. Assign Phase 1 to engineer
4. Schedule beta testing session
