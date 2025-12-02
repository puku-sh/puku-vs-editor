# GitHub Issues for FIM Improvements

This document provides an index of GitHub issue templates for FIM improvement features.

**Note:** Position Validation and Refresh Gating now have dedicated standalone issue files for easier copy-pasting.

---

## Issue #19: Position Validation

**See:** `GITHUB_ISSUE_POSITION_VALIDATION.md` for complete ready-to-paste issue template.

**Quick Summary:**
- Prevent stale completions when cursor moves
- ~50 minutes implementation
- Better UX, enables edit interpolation

---

## Issue #20: Refresh Gating

**See:** `GITHUB_ISSUE_REFRESH_GATING.md` for complete ready-to-paste issue template.

**Quick Summary:**
- Gate requests on text changes only (not cursor movement)
- ~1 hour implementation
- 30-50% fewer API calls, $100/month savings per user

---

## Issue #21: Edit Interpolation

```markdown
### Summary

Implement position validation and refresh gating to reduce API calls by 30-50% and prevent stale completions.

Inspired by Zed's FIM implementation.

### Problem

1. **Stale completions**: When user moves cursor to different line, old completion still shows (wrong context)
2. **Wasted API calls**: Cursor movement (no text change) triggers completion requests unnecessarily

### Solution

**Position Validation:**
- Store position where completion was generated
- Check if cursor moved before showing completion
- Clear stale position when cursor moves away

**Refresh Gating:**
- Track document text hash
- Only trigger new requests when text actually changes
- Skip requests on pure cursor movement

### Benefits

- ✅ 30-50% fewer API calls (cursor movement no longer triggers)
- ✅ No stale completions (position validation)
- ✅ Better UX (no confusing ghost text in wrong location)
- ✅ Foundation for edit interpolation (#20)

### Implementation Estimate

- **Effort:** 1 day (~1 hour coding + testing)
- **Risk:** Very Low
- **Priority:** HIGH (quick win)

### Files to Change

- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` (~50-60 lines)

### Detailed PRD

See `docs/prd/fim/position-validation-refresh-gating.md` for complete implementation plan.

### Related

- Source: Zed FIM implementation (`docs/prd/fim/zed-analysis.md`)
- Enables: Edit Interpolation (#20)
- Part of FIM improvements: #17, #18, #19, #20, #21
```

---

## Issue #20: Edit Interpolation

```markdown
### Summary

Implement edit interpolation to provide instant completion updates as user types, reducing API calls by 70-80% and improving UX.

Inspired by Zed's FIM implementation.

### Problem

When user accepts completion character-by-character, each character triggers new API call:

```
User types "def main()" char-by-char
→ 10+ API calls (one per character after debounce)
→ ~13 seconds total waiting time
→ Flickering completions
→ $0.05 cost per acceptance
```

### Solution

**Edit Interpolation:**
- After API returns completion, store text + position
- When user types, check if they typed a prefix of stored completion
- If yes, strip prefix and show remaining suffix (instant, no API call)
- If no, invalidate and fetch new completion

**Example:**
```typescript
API returns: "def main():\n    pass"
User types "d" → Check: "def main()...".startsWith("d")? YES
→ Show "ef main()..." instantly (<1ms)
User types "e" → Check: "ef main()...".startsWith("e")? YES
→ Show "f main()..." instantly (<1ms)
Result: 1 API call, 2+ instant updates!
```

### Benefits

- ✅ 70-80% fewer API calls when user accepts char-by-char
- ✅ <1ms response time (vs 1300ms currently)
- ✅ Smoother UX, no flicker
- ✅ $0.04 saved per completion acceptance
- ✅ Foundation for aggressive debounce (future)

### Implementation Estimate

- **Effort:** 2-3 days (~4 hours coding + testing + edge cases)
- **Risk:** Low (conservative invalidation logic)
- **Priority:** HIGH (implement after #19)

### Prerequisites

- ⚠️ **Requires #19 (Position Validation) first**
- Builds on position tracking infrastructure

### Files to Change

- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` (~100-120 lines)

### Detailed PRD

See `docs/prd/fim/edit-interpolation.md` for complete implementation plan with test cases.

### Related

- Source: Zed FIM implementation (`docs/prd/fim/zed-analysis.md`)
- Requires: Position Validation (#19)
- Part of FIM improvements: #17, #18, #19, #20, #21
```

---

## Issue #22: Request Abortion on Backspace

```markdown
### Summary

Abort in-flight API requests when user backspaces or changes input before request completes, saving ~20% wasted API calls.

Inspired by Aide's FIM implementation.

### Problem

```
Current behavior:
User types "def" → API call starts (800ms debounce + 500ms request)
User backspaces to "de" (300ms later)
→ First request STILL in flight ❌
→ First request completes → Shows wrong completion for "def" ❌
→ Second request starts for "de"
Result: Two API calls, one was wasted
```

### Solution

Use VS Code's `CancellationToken` (already passed to provider) to abort requests:

```typescript
// Convert VS Code token to AbortSignal
const abortController = new AbortController();
token.onCancellationRequested(() => abortController.abort());

// Pass signal to fetch
await this._fetcherService.fetch(url, {
  signal: abortController.signal,
  ...
});
```

### Benefits

- ✅ ~20% fewer wasted API calls
- ✅ Better UX (don't show completions for old/wrong context)
- ✅ Token savings (don't pay for discarded completions)

### Implementation Estimate

- **Effort:** 1 day (~1 hour coding + testing)
- **Risk:** Low
- **Priority:** MEDIUM (after #19 and #20)

### Files to Change

- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` (~15 lines)

### Detailed PRD

See `docs/prd/fim/request-abortion.md` for complete implementation plan.

### Related

- Source: Aide FIM implementation (`docs/prd/fim/aide-analysis.md`)
- Complements: Position Validation (#19), Edit Interpolation (#20)
- Part of FIM improvements: #17, #18, #19, #20, #21
```

---

## Issue #23: Augment Next Edit

**See:** `GITHUB_ISSUE_AUGMENT_NEXT_EDIT.md` for complete ready-to-paste issue template.

**Quick Summary:**
- Interactive diff panel showing original AI completion vs user modifications
- Visual red/green diff highlighting
- Edit queue with line numbers
- Accept/reject individual edits
- ~7-8 days implementation
- Major UX enhancement, competitive advantage

---

## Implementation Order

**Recommended sequence:**

1. **Issue #20** (Refresh Gating) - 1 hour
   - Highest priority: Cost savings
   - 30-50% fewer API calls immediately
   - Independent, can implement alone

2. **Issue #19** (Position Validation) - 50 minutes
   - UX improvement
   - Eliminates confusing stale completions
   - Foundation for #21

3. **Issue #21** (Edit Interpolation) - 2-3 days
   - Biggest impact, 70-80% improvement
   - Requires #19 or #20 first

4. **Issue #22** (Request Abortion) - 1 day
   - Polish, 20% improvement
   - Independent, can do anytime

**Total effort:** ~5 days
**Total impact:** 90-95% fewer API calls, much smoother UX

---

## Labels to Add

- `enhancement`
- `performance`
- `fim`
- `priority:high` (for #19, #20)
- `priority:medium` (for #21)

---

## How to Use

1. Copy issue template above
2. Create new GitHub issue
3. Paste template
4. Add labels
5. Assign to implementer
