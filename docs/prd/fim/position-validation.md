# PRD: Position Validation for FIM Completions

> **Status:** 📋 **PLANNING PHASE - NOT YET IMPLEMENTED**
>
> This PRD describes position validation for Puku FIM (Fill-in-Middle) completions.
> **This feature is NOT currently implemented.** Implementation timeline: 30-45 minutes
> Inspired by Zed's FIM implementation.
>
> **Architecture:** Uses utility class pattern (`helpers/positionValidation.ts`) ✅ Utility already created

---

## 📋 Executive Summary

**Position Validation** prevents stale inline completions from showing in the wrong location when the user moves their cursor away from where the completion was originally generated.

**Impact:** Better UX, eliminates confusing ghost text, enables future edit interpolation feature.

---

## 🎯 Problem Statement

### Current Behavior

When a completion is generated at a specific cursor position, it can still be displayed even after the user moves the cursor to a completely different location in the file.

**Example Scenario:**
```typescript
// User types "def" at line 10, column 3
// → API returns completion: " main():\n    pass"
// → Inline completion shows: "def | main():\n    pass" ✅ Correct!

// User presses Cmd+G and jumps to line 50
// → Inline completion STILL shows at line 50! ❌ Wrong context!
// → Shows: " main():\n    pass" at line 50
// → User is confused - this completion doesn't make sense here

// User has to manually press Escape to dismiss
```

### Why This Happens

VS Code's inline completion system doesn't automatically invalidate completions when the cursor position changes. The completion generated for line 10 remains "active" even when the cursor is at line 50.

### UX Impact

**User Frustration:**
- Confusing ghost text in wrong locations
- Must manually dismiss (Esc key)
- Breaks flow of coding
- Completion appears out of context

**Real-World Example:**
```typescript
// Line 10: User types "import "
// → Completion shows: "import { useState } from 'react';" ✅

// User scrolls down to line 100 (different component)
// → Same React import completion shows ❌
// → But user is in a Node.js file, not React code
// → Completion is wrong and confusing
```

---

## 💡 Proposed Solution

### Algorithm: Position Tracking

Store the cursor position where each completion was generated. Before showing a completion, verify the cursor hasn't moved to a different position. If it has, clear the stale completion state.

### Pseudocode

```typescript
class PukuInlineCompletionProvider {
  // State: Map of file URI → position where completion was generated
  private _completionPositionByFile = new Map<string, vscode.Position>();

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null> {
    const fileUri = document.uri.toString();
    const lastPosition = this._completionPositionByFile.get(fileUri);

    // POSITION VALIDATION: Check if cursor moved away
    if (lastPosition && !lastPosition.isEqual(position)) {
      // Cursor moved! Clear stale position state
      console.log(`[PukuInlineCompletion] Position changed: ${lastPosition.line}:${lastPosition.character} → ${position.line}:${position.character}`);
      this._completionPositionByFile.delete(fileUri);
      // Allow new completion for new position (don't return null)
    }

    // ... existing cache checks ...
    // ... existing API call ...

    // Store new position after successful completion
    if (completion) {
      this._completionPositionByFile.set(fileUri, position);
    }

    return completions;
  }
}
```

### Visual Example

**Scenario 1: Cursor Stays at Same Position** ← Valid
```
┌─────────────────────────────────────────────────────────┐
│ Line 10: "def |"                                        │
│ Completion generated at Position(10, 3)                │
│ Stored: fileUri → Position(10, 3)                      │
│                                                          │
│ User continues typing at line 10...                     │
│ Current position: Position(10, 4)                       │
│ Last position: Position(10, 3)                          │
│ Position changed? YES → Clear state ✅                  │
│ Allow new completion for Position(10, 4) ✅             │
└─────────────────────────────────────────────────────────┘
```

**Scenario 2: Cursor Moves to Different Line** ← Invalid (clear state)
```
┌─────────────────────────────────────────────────────────┐
│ Line 10: "def |"                                        │
│ Completion generated at Position(10, 3)                │
│ Stored: fileUri → Position(10, 3)                      │
│                                                          │
│ User presses Cmd+G, jumps to line 50                   │
│ Current position: Position(50, 0)                       │
│ Last position: Position(10, 3)                          │
│ Position changed? YES → Clear state ✅                  │
│ Stale completion cleared ✅                              │
│ Allow new completion for Position(50, 0) ✅             │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Implementation Plan

### Files to Modify

**Primary file:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

### Step 1: Add State Tracking (5 minutes)

**Location:** Class properties (around line 140)

```typescript
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
  // ... existing fields ...
  private _lastFileUri = '';
  private _requestInFlight = false;

  /**
   * POSITION VALIDATION: Track the position where each file's last completion was generated.
   * Used to prevent showing stale completions when cursor moves.
   * Key: file URI, Value: position where completion was generated
   */
  private _completionPositionByFile = new Map<string, vscode.Position>();

  // ... rest of class ...
}
```

### Step 2: Implement Position Validation Check (10 minutes)

**Location:** Early in `provideInlineCompletionItems()`, after auth check (around line 216)

```typescript
async provideInlineCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.InlineCompletionContext,
  token: vscode.CancellationToken
): Promise<vscode.InlineCompletionItem[] | null> {
  const reqId = this._requestCounter++;
  console.log(`[PukuInlineCompletion][${reqId}] Completion requested at ${position.line}:${position.character}`);

  // ... existing auth check ...
  if (!authToken) {
    console.log(`[PukuInlineCompletion][${reqId}] Not authenticated - skipping completion`);
    return null;
  }

  // POSITION VALIDATION: Clear stale position if cursor moved
  const fileUri = document.uri.toString();
  const lastPosition = this._completionPositionByFile.get(fileUri);

  if (lastPosition && !lastPosition.isEqual(position)) {
    console.log(
      `[PukuInlineCompletion][${reqId}] POSITION VALIDATION: Cursor moved from ` +
      `${lastPosition.line}:${lastPosition.character} to ${position.line}:${position.character} - clearing stale position`
    );
    this._completionPositionByFile.delete(fileUri);
    // Continue to allow new completion request for new position
  }

  // ... existing Radix Trie cache check ...
  // ... existing speculative cache check ...
  // ... existing API call ...
}
```

### Step 3: Store Position After Successful Completion (10 minutes)

**Location 1:** After main API call success (around line 519)

```typescript
// Store completion in Radix Trie cache for future lookups
completionsCache.append(prefix, suffix, completion);

// POSITION VALIDATION: Store position for future validation
this._completionPositionByFile.set(fileUri, position);

// Return completion
return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
```

**Location 2:** After speculative cache hit (around line 292)

```typescript
// Store completion in Radix Trie cache for future lookups
completionsCache.append(prefix, suffix, completion);

// POSITION VALIDATION: Store position for future validation
this._completionPositionByFile.set(fileUri, position);

return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
```

### Step 4: Clear State on File Switch (5 minutes)

**Location:** File change detection (around line 308)

```typescript
// Existing file change detection
const fileChanged = this._lastFileUri !== fileUri;
if (fileChanged) {
  console.log(`[PukuInlineCompletion][${reqId}] File changed from ${this._lastFileUri} to ${fileUri} - skipping debounce`);

  // POSITION VALIDATION: Clear state for old file to prevent memory leak
  if (this._lastFileUri) {
    console.log(`[PukuInlineCompletion][${reqId}] Clearing position validation state for old file: ${this._lastFileUri}`);
    this._completionPositionByFile.delete(this._lastFileUri);
  }
}
```

### Step 5: Add Helper Method (Optional, 5 minutes)

**Location:** After constructor, before `provideInlineCompletionItems()`

```typescript
/**
 * Clear position validation state for a file.
 * Called when switching files to prevent memory leaks.
 * @param fileUri - The URI of the file to clear state for
 */
private _clearPositionValidationState(fileUri: string): void {
  this._completionPositionByFile.delete(fileUri);
}
```

Then use in file switch:
```typescript
if (this._lastFileUri) {
  this._clearPositionValidationState(this._lastFileUri);
}
```

---

## ✅ Testing Plan

### Test 1: Cursor Movement to Different Line

**Setup:**
1. Open a TypeScript file
2. Type `def` at line 10
3. Wait for completion to appear
4. Verify: Completion shows correctly

**Test:**
1. Press Cmd+G (Go to Line)
2. Enter line 50, press Enter
3. Check console: Should see "POSITION VALIDATION: Cursor moved from 10:3 to 50:0"
4. Verify: Old completion state cleared
5. Type new code at line 50
6. Verify: New completion generated for line 50 context

**Expected Result:**
- ✅ Console shows position change log
- ✅ State cleared for line 10
- ✅ New completion works at line 50
- ✅ No stale completion from line 10

### Test 2: Cursor Movement on Same Line

**Setup:**
1. Open a file
2. Type `def` at line 10, column 0
3. Wait for completion
4. Note: Position stored as (10, 3)

**Test:**
1. Move cursor right with arrow keys to column 10
2. Check console: Should see "Cursor moved from 10:3 to 10:10"
3. Verify: State cleared
4. Type character
5. Verify: New completion generated for (10, 11)

**Expected Result:**
- ✅ Same-line position changes also clear state
- ✅ New completions work correctly

### Test 3: Mouse Click Navigation

**Setup:**
1. Open a file with 50 lines
2. Type `def` at line 10
3. Wait for completion

**Test:**
1. Click with mouse on line 30
2. Check console: Should see position change log
3. Verify: State cleared
4. Type code at line 30
5. Verify: Completion works for line 30 context

**Expected Result:**
- ✅ Mouse clicks trigger position validation
- ✅ State properly cleared

### Test 4: File Switch Clears State

**Setup:**
1. Open file A (`test.ts`)
2. Type `def` at line 10
3. Verify: `_completionPositionByFile` has entry for file A

**Test:**
1. Switch to file B (`another.ts`) using Cmd+P
2. Check console: Should see "Clearing position validation state for old file"
3. Verify: `_completionPositionByFile` does NOT have entry for file A
4. Type code in file B
5. Verify: Completion works in file B

**Expected Result:**
- ✅ File A state cleared on switch
- ✅ No memory leak
- ✅ File B works independently

### Test 5: Continued Typing at Same Position

**Setup:**
1. Type `d` at line 10, column 0
2. Position stored as (10, 1)

**Test:**
1. Type `e` (position now 10, 2)
2. Check console: Should see "Cursor moved from 10:1 to 10:2"
3. Verify: State cleared, new completion allowed
4. Type `f` (position now 10, 3)
5. Check console: Should see "Cursor moved from 10:2 to 10:3"

**Expected Result:**
- ✅ Each character typed clears previous position
- ✅ Allows new completion for new position
- ✅ Enables future edit interpolation feature

### Test 6: Integration with Existing Caches

**Setup:**
1. Enable Radix Trie cache
2. Type `def` (cache miss → API call)
3. Position stored

**Test:**
1. Move cursor to different line
2. Verify: Position validation runs BEFORE cache check
3. Return to original line
4. Type `def` again
5. Verify: Cache hit works, position updated

**Expected Result:**
- ✅ Position validation is orthogonal to caching
- ✅ Both features work together

---

## 📈 Expected Performance Impact

### UX Improvements

**Before Position Validation:**
```
User types "def" at line 10
→ Completion shows ✅

User jumps to line 50 (Cmd+G)
→ Completion STILL showing at line 50 ❌
→ Wrong context, confusing
→ User must press Escape to dismiss
→ Interrupts flow
```

**After Position Validation:**
```
User types "def" at line 10
→ Completion shows ✅

User jumps to line 50 (Cmd+G)
→ Completion state cleared automatically ✅
→ No confusing ghost text ✅
→ User can type immediately ✅
→ Smooth flow maintained ✅
```

### No Performance Overhead

Position validation adds **negligible overhead**:
- Position comparison: `Position.isEqual()` is O(1) (two integer comparisons)
- Map lookup: `Map.get()` is O(1) average case
- Total overhead: <0.01ms per completion request

**Memory usage:**
- Storage per file: 1 Position object (~24 bytes)
- With 50 open files: ~1.2KB total
- **Negligible:** 0.001% of extension memory

---

## 🔬 Technical Deep Dive

### Position Comparison

VS Code's `Position` class provides `isEqual()`:

```typescript
class Position {
  line: number;      // 0-based line number
  character: number; // 0-based column number

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }
}
```

Fast comparison (two integer checks).

### Why Clear State Instead of Blocking?

**Option 1: Block completion (rejected)**
```typescript
if (lastPosition && !lastPosition.isEqual(position)) {
  return null; // Block new completion ❌
}
```
Problem: User can't get completions at new position!

**Option 2: Clear state and allow (chosen)**
```typescript
if (lastPosition && !lastPosition.isEqual(position)) {
  this._completionPositionByFile.delete(fileUri); // Clear
  // Continue to allow new completion ✅
}
```
Benefit: User can get completions at any position!

### Edge Cases Handled

**Case 1: User accepts completion character-by-character**
```typescript
// Type "d" at (10, 0) → completion generated, stored (10, 1)
// Type "e" at (10, 1) → position changed to (10, 2)
// → Clear state, allow new completion ✅
// → Enables future edit interpolation feature ✅
```

**Case 2: Multiple cursors**
```typescript
// VS Code calls provideInlineCompletionItems for each cursor
// Each call checks/updates position independently
// Works correctly ✅
```

**Case 3: Undo/Redo changing position**
```typescript
// User types "def" at (10, 3), position stored
// User presses Cmd+Z (undo) → cursor moves to (10, 0)
// → Position changed, state cleared ✅
// → Allows new completion at (10, 0) ✅
```

---

## 🔗 Integration with Existing Features

### Compatible with Radix Trie Cache

Position validation runs BEFORE cache checks:
```typescript
1. Auth check
2. POSITION VALIDATION ← (NEW)
3. Radix Trie cache check
4. Speculative cache check
5. API call
```

No impact on caching logic.

### Compatible with Refresh Gating

Can be used together with refresh gating (separate feature):
```typescript
1. Auth check
2. Position validation (clear stale state)
3. Refresh gating (block if no text change)
4. Cache checks
5. API call
```

Both features complement each other:
- **Position validation:** Clears stale state when cursor moves
- **Refresh gating:** Blocks API calls when only cursor moved (no text change)

### Enables Edit Interpolation

Position tracking is **required** for edit interpolation:
```typescript
// Store position + completion text
this._lastCompletionByFile.set(fileUri, {
  text: completion,
  position: position, // ← Position validation provides this!
  documentVersion: document.version
});

// Later: Check if user typed prefix of completion
const userTyped = document.getText(new vscode.Range(lastCompletion.position, position));
if (lastCompletion.text.startsWith(userTyped)) {
  // Edit interpolation! Return suffix instantly
}
```

---

## 📊 Success Metrics

### Primary Metrics

1. **User Confusion Reduction**
   - Measure: User reports of "wrong completion showing"
   - Target: 0 reports after implementation
   - How: Monitor GitHub issues, Discord feedback

2. **Manual Dismissals**
   - Measure: How often users press Escape to dismiss completions
   - Target: 50% reduction (estimated)
   - How: Telemetry (if available)

### Secondary Metrics

3. **Correctness**
   - Measure: Completions shown in correct context
   - Target: 100% of completions show in original position only
   - How: Manual testing + user reports

4. **Edit Interpolation Enablement**
   - Measure: Can implement edit interpolation on top of this
   - Target: Position tracking works correctly for interpolation
   - How: Integration testing with edit interpolation feature

---

## 🚨 Risks and Mitigations

### Risk 1: Position Stored But Not Cleared

**Risk:** Memory leak if position state not cleared on file close

**Likelihood:** Low (we clear on file switch)

**Mitigation:**
- Clear state on file switch (already implemented)
- Add listener for file close event (optional enhancement)
- Use WeakMap if needed (garbage collects automatically)

### Risk 2: Position Comparison Edge Cases

**Risk:** `Position.isEqual()` doesn't work as expected

**Likelihood:** Very low (VS Code API is stable)

**Mitigation:**
- Comprehensive testing of all position change scenarios
- Log all position changes for debugging
- Easy to disable (comment out check)

### Risk 3: Performance Regression

**Risk:** Position validation slows down completion requests

**Likelihood:** Very low (O(1) operations)

**Mitigation:**
- Position comparison is <0.01ms
- Map lookup is O(1) average case
- Add performance timing logs to measure

---

## 📝 Implementation Summary

### Code Changes

| Location | Change | Lines | Time |
|----------|--------|-------|------|
| Class properties | Add `_completionPositionByFile` map | 5 | 5 min |
| `provideInlineCompletionItems()` | Add position validation check | 10 | 10 min |
| After API success | Store position | 2 | 2 min |
| After cache hit | Store position | 2 | 2 min |
| File change detection | Clear state on file switch | 4 | 5 min |
| Helper method | Add `_clearPositionValidationState()` (optional) | 5 | 5 min |
| **Total** | | **~28** | **~30 min** |

### Testing Time

| Test | Time |
|------|------|
| Manual testing (6 test cases) | 15 min |
| Integration testing | 5 min |
| **Total** | **~20 min** |

### Total Implementation Time

**Coding + Testing:** ~50 minutes

---

## 🎯 Acceptance Criteria

**Must have:**
- ✅ Cursor movement to different line clears position state
- ✅ Cursor movement on same line clears position state
- ✅ Position stored after successful API completion
- ✅ Position stored after cache hit
- ✅ File switch clears state for old file
- ✅ Console logs show position changes
- ✅ No stale completions shown in wrong locations
- ✅ Zero performance regression (<0.1ms overhead)

**Nice to have:**
- ✅ Helper method for clearing state
- ✅ Telemetry for position validation events
- ✅ Documentation in code comments

---

## 🔜 Next Steps After Implementation

1. **Test with real users** for 1 week
   - Monitor for any "wrong completion" reports
   - Expect: 0 reports (vs multiple reports before)

2. **Measure UX improvement**
   - Survey users: "Do you see completions in wrong locations?"
   - Before: "Yes, sometimes confusing"
   - After: "No, completions always correct"

3. **Implement Edit Interpolation** (next feature)
   - Requires position tracking (this feature provides it)
   - 70-80% additional API call reduction
   - See `docs/prd/fim/edit-interpolation.md`

4. **Combine with Refresh Gating** (companion feature)
   - Position validation + Refresh gating = complete solution
   - ~30 min additional implementation
   - See `docs/prd/fim/refresh-gating.md`

---

## 📚 References

- **Source inspiration:** Zed FIM implementation (`reference/zed/crates/supermaven/src/supermaven_completion_provider.rs`)
- **Companion feature:** Refresh Gating (`docs/prd/fim/refresh-gating.md`)
- **Next feature:** Edit Interpolation (`docs/prd/fim/edit-interpolation.md`)
- **Competitive analysis:** Zed analysis (`docs/prd/fim/zed-analysis.md`)

---

**Status:** 📋 Planning Phase - Awaiting Implementation
**Priority:** MEDIUM-HIGH (UX improvement, enables edit interpolation)
**Effort:** 30-45 minutes (coding + testing)
**Risk:** Very Low
**Impact:** Better UX, eliminates confusing ghost text, enables future features
