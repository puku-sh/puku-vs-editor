# GitHub Issue: Implement Position Validation for FIM Completions

**Copy-paste this into a new GitHub issue**

---

## 🎯 Summary

Implement **Position Validation** to prevent stale inline completions from showing in the wrong location when users move their cursor away from where the completion was originally generated.

**Impact:** Better UX, eliminates confusing ghost text, enables future edit interpolation feature.

---

## 📊 Problem

### Current UX Issue

Completions generated at one position can still be displayed after the cursor moves to a completely different location.

**Example:**
```typescript
// User types "def" at line 10
// → Completion shows: "def main():\n    pass" ✅ Correct!

// User presses Cmd+G and jumps to line 50
// → Completion STILL shows at line 50! ❌ Wrong context!
// → User is confused - this doesn't make sense here
// → Must manually press Escape to dismiss
```

### Real-World Scenario

```typescript
// Line 10: User types "import "
// → Shows: "import { useState } from 'react';" ✅

// User scrolls down to line 100 (Node.js file, not React)
// → Same React import STILL showing ❌
// → Completion is wrong and confusing
```

### User Frustration

- Confusing ghost text in wrong locations
- Must manually dismiss (Esc key)
- Breaks flow of coding
- Completion appears out of context

---

## 💡 Solution

### Algorithm

Store the cursor position where each completion was generated. Before showing a completion, verify the cursor hasn't moved away. If it has, clear the stale completion state.

### Code Example

```typescript
class PukuInlineCompletionProvider {
  private _completionPositionByFile = new Map<string, vscode.Position>();

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    ...
  ): Promise<vscode.InlineCompletionItem[] | null> {
    const fileUri = document.uri.toString();
    const lastPosition = this._completionPositionByFile.get(fileUri);

    // POSITION VALIDATION: Check if cursor moved away
    if (lastPosition && !lastPosition.isEqual(position)) {
      console.log(`Position changed: ${lastPosition.line}:${lastPosition.character} → ${position.line}:${position.character}`);
      this._completionPositionByFile.delete(fileUri); // Clear stale state
      // Continue to allow new completion for new position
    }

    // ... existing cache checks ...
    // ... existing API call ...

    // Store position after successful completion
    if (completion) {
      this._completionPositionByFile.set(fileUri, position);
    }

    return completions;
  }
}
```

### Visual Example

**Scenario 1: Cursor Moves to Different Line** ← Clear state
```
Line 10: "def |"
Completion generated at Position(10, 3)
Stored: fileUri → Position(10, 3)

User jumps to line 50
Current position: Position(50, 0)
Last position: Position(10, 3)
→ Position changed! Clear state ✅
→ No stale completion ✅
→ Allow new completion for line 50 ✅
```

---

## 🏗️ Implementation Plan

### Files to Modify

**Single file:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

### Step 1: Add State Tracking (5 min)

```typescript
/**
 * Track the position where each file's last completion was generated.
 * Used to prevent showing stale completions when cursor moves.
 */
private _completionPositionByFile = new Map<string, vscode.Position>();
```

### Step 2: Add Position Validation Check (10 min)

Early in `provideInlineCompletionItems()`, after auth check:

```typescript
// POSITION VALIDATION: Clear stale position if cursor moved
const fileUri = document.uri.toString();
const lastPosition = this._completionPositionByFile.get(fileUri);

if (lastPosition && !lastPosition.isEqual(position)) {
  console.log(
    `[PukuInlineCompletion] POSITION VALIDATION: Cursor moved from ` +
    `${lastPosition.line}:${lastPosition.character} to ${position.line}:${position.character}`
  );
  this._completionPositionByFile.delete(fileUri);
  // Continue to allow new completion
}
```

### Step 3: Store Position After Completion (10 min)

After API success and cache hits:

```typescript
// POSITION VALIDATION: Store position for future validation
this._completionPositionByFile.set(fileUri, position);
```

### Step 4: Clear State on File Switch (5 min)

In file change detection:

```typescript
if (fileChanged && this._lastFileUri) {
  console.log(`Clearing position validation state for old file: ${this._lastFileUri}`);
  this._completionPositionByFile.delete(this._lastFileUri);
}
```

---

## ✅ Acceptance Criteria

**Must have:**
- [ ] Cursor movement to different line clears position state
- [ ] Cursor movement on same line clears position state
- [ ] Position stored after successful API completion
- [ ] Position stored after cache hit
- [ ] File switch clears state for old file
- [ ] Console logs show position changes
- [ ] No stale completions shown in wrong locations
- [ ] Zero performance regression (<0.1ms overhead)

**Verification:**
- [ ] Test: Jump to different line (Cmd+G) → No stale completion
- [ ] Test: Mouse click navigation → State cleared
- [ ] Test: Arrow key navigation → State cleared
- [ ] Test: File switch → State cleared
- [ ] Test: Continued typing → Position updates correctly

---

## 📈 Expected Results

### UX Improvement

**Before:**
```
User types "def" at line 10
→ Completion shows ✅

User jumps to line 50 (Cmd+G)
→ Completion STILL showing ❌
→ Wrong context, confusing
→ Must press Escape
```

**After:**
```
User types "def" at line 10
→ Completion shows ✅

User jumps to line 50 (Cmd+G)
→ State cleared automatically ✅
→ No confusing ghost text ✅
→ User can type immediately ✅
```

### Performance Impact

**Zero overhead:**
- Position comparison: `Position.isEqual()` is O(1) (two integer comparisons)
- Map lookup: `Map.get()` is O(1)
- Total overhead: <0.01ms per request

**Memory:**
- Storage per file: 1 Position object (~24 bytes)
- With 50 open files: ~1.2KB total
- Negligible: 0.001% of extension memory

---

## 🧪 Testing Plan

### Test 1: Cursor Movement to Different Line

```
1. Type "def" at line 10 → ✅ Completion shows
2. Press Cmd+G, jump to line 50
3. Console shows "Cursor moved from 10:3 to 50:0"
4. No stale completion at line 50 ✅
5. Type code at line 50 → New completion works ✅
```

### Test 2: Mouse Click Navigation

```
1. Type "def" at line 10 → Completion shows
2. Click mouse on line 30
3. Console shows position change
4. State cleared ✅
5. Type at line 30 → New completion ✅
```

### Test 3: File Switch

```
1. Type "def" in file A
2. _completionPositionByFile has entry for file A
3. Switch to file B (Cmd+P)
4. Console shows "Clearing state for old file"
5. _completionPositionByFile does NOT have entry for file A ✅
6. Type in file B → Works independently ✅
```

### Test 4: Same Line Movement

```
1. Type "def" at (10, 0)
2. Position stored as (10, 3)
3. Move cursor to (10, 10) with arrow keys
4. Console shows "Cursor moved from 10:3 to 10:10"
5. State cleared ✅
```

### Test 5: Continued Typing

```
1. Type "d" at (10, 0) → Position (10, 1) stored
2. Type "e" → Position changed to (10, 2)
3. Console shows position change
4. Type "f" → Position changed to (10, 3)
5. Each keystroke clears previous position ✅
6. Enables future edit interpolation ✅
```

---

## 🔗 Related Features

### Companion Feature: Refresh Gating

Can be implemented together:
- **Position Validation:** Clears stale state when cursor moves
- **Refresh Gating:** Blocks API calls when only cursor moved (no text change)

See separate issue or `docs/prd/fim/refresh-gating.md`

### Enables Future Feature: Edit Interpolation

Position tracking is **required** for edit interpolation:
- Store position + completion text
- Check if user typed prefix of completion
- If yes, return suffix instantly (no API call)
- 70-80% fewer API calls

See `docs/prd/fim/edit-interpolation.md`

---

## 📝 Implementation Estimate

| Task | Lines | Time |
|------|-------|------|
| Add state field | 5 | 5 min |
| Add validation check | 10 | 10 min |
| Store position after success | 2 × 2 | 5 min |
| Clear state on file switch | 4 | 5 min |
| Helper method (optional) | 5 | 5 min |
| **Coding Total** | **~28** | **~30 min** |
| Manual testing | - | 15 min |
| Integration testing | - | 5 min |
| **Total** | **~28** | **~50 min** |

**Total implementation time: ~50 minutes**

---

## 🚨 Risks and Mitigations

### Risk 1: Position Not Cleared (Memory Leak)

- **Risk:** Memory leak if state not cleared on file close
- **Likelihood:** Low (we clear on file switch)
- **Mitigation:** Clear on file switch (implemented), can add file close listener if needed

### Risk 2: Performance Regression

- **Risk:** Position validation slows down completion requests
- **Likelihood:** Very low (O(1) operations)
- **Mitigation:** Position comparison is <0.01ms, Map lookup is O(1)

### Risk 3: Edge Cases

- **Risk:** `Position.isEqual()` doesn't work as expected
- **Likelihood:** Very low (stable VS Code API)
- **Mitigation:** Comprehensive testing, logging, easy to disable

---

## 📚 Documentation

**Detailed PRD:**
- `docs/prd/fim/position-validation.md` - Complete implementation guide with examples

**Related PRDs:**
- `docs/prd/fim/refresh-gating.md` - Companion feature
- `docs/prd/fim/edit-interpolation.md` - Next feature (requires position validation)

**Source Inspiration:**
- Zed FIM implementation
- `reference/zed/crates/supermaven/src/supermaven_completion_provider.rs`

---

## 🎯 Labels

- `enhancement`
- `ux-improvement`
- `fim`
- `priority:medium-high`
- `effort:1-hour`

---

## 🏁 Next Steps

1. **Assign to implementer**
2. **Review PRD:** `docs/prd/fim/position-validation.md`
3. **Implement** following step-by-step guide
4. **Test** all 5 test scenarios
5. **Monitor** for user reports of "wrong completion location"
6. **Expect:** 0 reports (vs multiple before)

**After this is done:**
- Consider implementing Refresh Gating (companion feature, ~1 hour)
- Implement Edit Interpolation (major feature, requires position validation, 2-3 days)

---

**Expected delivery:** ~50 minutes of focused work
**Expected impact:** Better UX, eliminates confusing ghost text
**Risk level:** Very Low
**Priority:** MEDIUM-HIGH (UX improvement, enables edit interpolation)
