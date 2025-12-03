# PRD: TAB to Jump Here - Multi-line Completion Navigation

**Status:** Draft
**Date:** 2025-12-03
**Author:** Puku AI Team
**Related Issue:** TBD

## Overview

Implement a "TAB to jump here" feature for multi-line inline completions in Puku Editor, allowing users to quickly navigate to the end of long completions after accepting them.

## Problem Statement

Currently, when users accept multi-line inline completions in Puku:
- Cursor stays at the original position where completion was triggered
- Users must manually navigate to the end of inserted code (using arrow keys or mouse)
- This creates friction, especially for completions spanning 5+ lines
- Competitors (Cursor, GitHub Copilot) provide smooth navigation to completion endpoints

**User Impact:**
- Reduced productivity for multi-line completions
- Extra keystrokes/mouse movements required
- Disrupts coding flow

## Goals

### Primary Goals
1. ✅ Show "TAB to jump here" indicator for multi-line completions (>3 lines)
2. ✅ Auto-navigate cursor to end of completion on TAB accept
3. ✅ Maintain backward compatibility with existing single-line completions

### Non-Goals
- Customizable jump behavior (keep simple for MVP)
- Jump indicators for single-line completions
- Multiple jump points within one completion

## Success Metrics

- **Adoption:** >50% of users accept multi-line completions with TAB (vs ESC/ignore)
- **Satisfaction:** User feedback indicates improved completion UX
- **Performance:** No measurable latency added to completion rendering

## Technical Design

### Implementation Approach

Use VS Code's **proposed API** `InlineCompletionDisplayLocation` (already available in codebase).

### API Overview

```typescript
export interface InlineCompletionItem {
    displayLocation?: InlineCompletionDisplayLocation;
}

export interface InlineCompletionDisplayLocation {
    range: Range;              // Where to jump to
    kind: InlineCompletionDisplayLocationKind;
    label: string;             // "TAB to jump here"
}

export enum InlineCompletionDisplayLocationKind {
    Code = 1,   // Display at code location
    Label = 2   // Display as clickable label
}
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PukuInlineCompletionProvider                                │
│                                                               │
│  provideInlineCompletionItems()                              │
│  ├── Fetch completion from API                              │
│  ├── Calculate completion line count                         │
│  ├── IF lines > 3:                                           │
│  │   ├── Calculate end position                             │
│  │   └── Add displayLocation                                │
│  └── Return InlineCompletionItem with displayLocation       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  VS Code Inline Completion UI                                │
│  ├── Renders ghost text                                      │
│  ├── Renders "TAB to jump here" at displayLocation.range    │
│  └── On TAB accept: moves cursor to displayLocation.range   │
└─────────────────────────────────────────────────────────────┘
```

### Code Changes

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

**Location:** Around line 700+ in `provideInlineCompletionItems()`

```typescript
// BEFORE:
return new vscode.InlineCompletionItem(
    completion,
    new vscode.Range(position, position)
);

// AFTER:
const completionLines = completion.split('\n');
let displayLocation: vscode.InlineCompletionDisplayLocation | undefined;

// Only show jump indicator for multi-line completions
if (completionLines.length > 3) {
    const lastLineIndex = completionLines.length - 1;
    const endLine = position.line + lastLineIndex;
    const endChar = completionLines[lastLineIndex].length;
    const endPosition = new vscode.Position(endLine, endChar);

    displayLocation = {
        range: new vscode.Range(endPosition, endPosition),
        label: "TAB to jump here",
        kind: vscode.InlineCompletionDisplayLocationKind.Code
    };
}

return new vscode.InlineCompletionItem(
    completion,
    new vscode.Range(position, position),
    { displayLocation }
);
```

### Configuration

**Option 1: Hardcoded Threshold (MVP)**
- Show jump for completions with >3 lines
- Simple, no config needed

**Option 2: Server Config (Future)**
```typescript
// In pukuConfig.ts
interface PukuConfig {
    performance: {
        // ... existing fields
        jumpIndicatorMinLines: number;  // Default: 3
    }
}
```

**Recommendation:** Start with hardcoded threshold (Option 1), add config later if needed.

## User Experience

### Before (Current Behavior)

```
User types: func createUser(
          ↓ API returns multi-line completion
┌────────────────────────────────────────────┐
│ func createUser(db *gorm.DB, name string,  │
│     user := User{Name: name, Email: email} │
│     db.Create(&user)                        │
│ }█                                          │ ← Cursor here
└────────────────────────────────────────────┘
User presses TAB → completion accepted, but cursor stays at line 1
User must manually navigate down 3 lines to continue coding
```

### After (With TAB to Jump)

```
User types: func createUser(
          ↓ API returns multi-line completion
┌────────────────────────────────────────────┐
│ func createUser(db *gorm.DB, name string,  │
│     user := User{Name: name, Email: email} │
│     db.Create(&user)                        │
│ }                        [TAB to jump here]│ ← Indicator shown
└────────────────────────────────────────────┘
User presses TAB → completion accepted AND cursor jumps to end
                                           █
User continues coding immediately
```

## Implementation Plan

### Phase 1: MVP (Week 1)
- [x] Research VS Code API (DONE)
- [ ] Implement displayLocation logic
- [ ] Test with multi-line completions (Go, TypeScript, Python)
- [ ] Update unit tests

### Phase 2: Polish (Week 2)
- [ ] Add telemetry (track jump indicator usage)
- [ ] Gather user feedback
- [ ] Adjust line threshold if needed

### Phase 3: Future Enhancements
- [ ] Add server config for threshold
- [ ] Support custom jump labels
- [ ] A/B test different thresholds

## Testing Strategy

### Manual Testing
1. **Multi-line completion (>3 lines):**
   - Trigger completion
   - Verify "TAB to jump here" appears at end
   - Press TAB
   - Verify cursor jumps to end position

2. **Single-line completion:**
   - Trigger completion
   - Verify NO jump indicator shown
   - Press TAB
   - Verify cursor stays at insertion point (existing behavior)

3. **Edge cases:**
   - Completion with empty last line
   - Completion with trailing whitespace
   - Completion in middle of file vs end of file

### Automated Testing
Add test cases to `pukuInlineCompletionCache.spec.ts`:
```typescript
describe('displayLocation', () => {
    it('should add jump indicator for multi-line completions', () => {
        const completion = 'line1\nline2\nline3\nline4';
        const item = provider.createCompletionItem(position, completion);
        expect(item.displayLocation).toBeDefined();
        expect(item.displayLocation?.label).toBe('TAB to jump here');
    });

    it('should NOT add jump indicator for short completions', () => {
        const completion = 'line1\nline2';
        const item = provider.createCompletionItem(position, completion);
        expect(item.displayLocation).toBeUndefined();
    });
});
```

## Dependencies

- **VS Code Proposed API:** `vscode.proposed.inlineCompletionsAdditions.d.ts` (already in codebase)
- **No backend changes required**

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| VS Code API changes | High | Use stable proposed API, monitor VS Code releases |
| User confusion (unexpected jump) | Medium | Clear indicator text, start with conservative threshold (3 lines) |
| Performance impact | Low | Minimal (just position calculation), no API calls |

## Alternatives Considered

### Alternative 1: Command Palette Action
**Approach:** Add "Jump to End of Completion" command
**Pros:** No automatic behavior
**Cons:** Requires extra keystrokes, discoverability issue
**Decision:** ❌ Rejected (less intuitive than TAB behavior)

### Alternative 2: Always Jump (No Indicator)
**Approach:** Auto-jump on every TAB accept
**Pros:** Simpler implementation
**Cons:** Unexpected for short completions
**Decision:** ❌ Rejected (confusing UX for single-line completions)

### Alternative 3: Cursor's Approach (Selected)
**Approach:** Show indicator for long completions, jump on TAB
**Pros:** Clear affordance, industry standard
**Cons:** Requires proposed API
**Decision:** ✅ **Selected** (best UX, proven pattern)

## Open Questions

1. **Q:** Should threshold be configurable?
   **A:** Start hardcoded (3 lines), add config if users request

2. **Q:** Should we support Cmd+Enter to jump (like Copilot)?
   **A:** Phase 2 consideration, TAB is sufficient for MVP

3. **Q:** What about partial accepts (word/line)?
   **A:** Out of scope for MVP, jump only on full accept

## References

- **VS Code API:** `src/extension/vscode.proposed.inlineCompletionsAdditions.d.ts`
- **Cursor Implementation:** `src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts`
- **GitHub Copilot:** Uses similar pattern with `InlineCompletionDisplayLocation`
- **Issue #20:** FIM Config Refactoring (related work)

## Success Criteria

✅ **MVP Complete When:**
- Multi-line completions (>3 lines) show "TAB to jump here"
- TAB accepts completion AND jumps cursor to end
- Single-line completions work as before (no jump)
- No performance degradation
- Unit tests pass

## Stakeholders

- **Engineering:** Implementation, testing
- **Product:** UX validation, user feedback
- **Users:** Beta testers, feedback collection

## Timeline

- **Week 1:** Implementation + testing
- **Week 2:** Beta release + feedback
- **Week 3:** Production rollout

---

**Next Steps:**
1. Create GitHub issue with implementation details
2. Assign to engineer
3. Schedule beta testing session
