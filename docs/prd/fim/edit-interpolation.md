# PRD: Edit Interpolation for FIM Completions

> **Status:** 📋 **PLANNING PHASE - NOT YET IMPLEMENTED**
>
> This PRD describes a planned feature for Puku FIM to implement edit interpolation.
> **This feature is NOT currently implemented.** Implementation timeline: 2-3 days
> Inspired by Zed's approach. **Requires Position Validation (PR #19) to be implemented first.**

---

## 📋 Overview

**Edit Interpolation** automatically adjusts completion predictions in real-time as the user types characters that match the beginning of the predicted completion, eliminating the need for redundant API calls.

**Key Insight:** When a user is typing a completion character-by-character, we can simply "strip off" the characters they've typed from the front of the completion, rather than fetching a new completion.

---

## 🎯 Goals

1. **70-80% fewer API calls** when user accepts completion character-by-character
2. **<1ms response time** for interpolated completions (vs 800ms debounce + 500ms API)
3. **Smoother UX** - No flicker as completion updates instantly
4. **Zero backend cost** - All logic happens client-side

---

## 📊 The Problem

### Current Behavior

```typescript
// API returns completion
Completion: "def main():\n    pass"
Position: line 10, col 0

// User types "d"
→ Buffer: "d|"
→ Wait 800ms (debounce)
→ API call (~500ms)
→ Show new completion
→ Total: ~1300ms 😢

// User types "e"
→ Buffer: "de|"
→ Wait 800ms (debounce)
→ API call (~500ms)
→ Show new completion
→ Total: ~1300ms 😢

// User types "f"
→ Buffer: "def|"
→ Wait 800ms (debounce)
→ API call (~500ms)
→ Show new completion
→ Total: ~1300ms 😢

Result: 3 API calls, ~3900ms total, flickering completions
```

### Why Current Caches Don't Help

**Radix Trie Cache:**
- Only matches EXACT same prefix
- Doesn't help as user progressively types accepted completion
- Example: `cache["de"]` won't match `prefix="def"`

**Speculative Cache:**
- Stores next request FUNCTION, not results
- Only helps after user ACCEPTS completion (Tab key)
- Doesn't help during character-by-character typing

---

## 💡 Proposed Solution: Edit Interpolation

### Algorithm

When user types, check if they typed a **prefix** of the last completion:

```typescript
lastCompletion = "def main():\n    pass"
userTyped = "def"

if (lastCompletion.startsWith(userTyped)) {
  // User typed a prefix! Strip it off
  return lastCompletion.substring(userTyped.length);
  // Returns: " main():\n    pass"
}
```

### Visual Example

```typescript
// Initial state
API returns: "def main():\n    pass"
Cursor: line 10, col 0
Store: { text: "def main():\n    pass", position: {line: 10, col: 0} }

// User types "d"
Cursor: line 10, col 1
User typed since last position: "d"
Check: "def main():\n    pass".startsWith("d")? ✅ YES!
Return: "ef main():\n    pass" (instant! <1ms)
Update store: { text: "ef main():\n    pass", position: {line: 10, col: 1} }

// User types "e"
Cursor: line 10, col 2
User typed since last position: "e"
Check: "ef main():\n    pass".startsWith("e")? ✅ YES!
Return: "f main():\n    pass" (instant! <1ms)
Update store: { text: "f main():\n    pass", position: {line: 10, col 2} }

// User types "f"
Cursor: line 10, col 3
User typed since last position: "f"
Check: "f main():\n    pass".startsWith("f")? ✅ YES!
Return: " main():\n    pass" (instant! <1ms)
Update store: { text: " main():\n    pass", position: {line: 10, col 3} }

Result: 1 API call, 3 instant updates, smooth UX!
```

---

## 🏗️ Implementation Plan

### Prerequisites

✅ **Must implement Position Validation first** (PR #19)
- Need `_completionPositionByFile` map for position tracking
- Edit interpolation builds on top of position validation

### Step 1: Add Interpolation State (10 minutes)

**File:** `pukuInlineCompletionProvider.ts`

Add new map to track completion text:

```typescript
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
  // ... existing fields ...
  private _completionPositionByFile = new Map<string, vscode.Position>(); // From PR #19

  // NEW: Edit interpolation state
  private _lastCompletionByFile = new Map<string, {
    text: string;
    position: vscode.Position;
    documentVersion: number;
  }>();
```

---

### Step 2: Add Interpolation Check (1 hour)

**File:** `pukuInlineCompletionProvider.ts`

Insert BEFORE Radix Trie cache check (around line 218):

```typescript
async provideInlineCompletionItems(...) {
  // ... auth check ...
  // ... position validation (from PR #19) ...

  // NEW: Try edit interpolation FIRST
  const interpolated = this._tryInterpolateEdit(document, position);
  if (interpolated) {
    console.log(`[PukuInlineCompletion][${reqId}] Edit interpolation HIT!`);
    return interpolated;
  }

  // ... existing Radix Trie cache check ...
  // ... existing speculative cache check ...
  // ... existing API call logic ...
}
```

---

### Step 3: Implement Interpolation Logic (2-3 hours)

**File:** `pukuInlineCompletionProvider.ts`

Add new private method:

```typescript
/**
 * Try to interpolate edit from last completion
 * Returns completion if user typed a prefix of last completion, null otherwise
 */
private _tryInterpolateEdit(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.InlineCompletionItem[] | null {
  const fileUri = document.uri.toString();
  const lastCompletion = this._lastCompletionByFile.get(fileUri);

  if (!lastCompletion) {
    return null; // No previous completion to interpolate
  }

  // Check document version changed (user typed)
  if (document.version === lastCompletion.documentVersion) {
    return null; // No changes since last completion
  }

  // Check cursor is still on same line (only interpolate same-line typing)
  if (position.line !== lastCompletion.position.line) {
    // User moved to different line
    this._lastCompletionByFile.delete(fileUri);
    return null;
  }

  // Calculate what user typed since last completion
  const lastOffset = document.offsetAt(lastCompletion.position);
  const currentOffset = document.offsetAt(position);

  if (currentOffset < lastOffset) {
    // User deleted text (backspace) - invalidate
    this._lastCompletionByFile.delete(fileUri);
    return null;
  }

  if (currentOffset === lastOffset) {
    // No forward progress
    return null;
  }

  // Get text user typed since last position
  const userTypedText = document.getText(
    new vscode.Range(lastCompletion.position, position)
  );

  // Check if last completion starts with what user typed
  if (lastCompletion.text.startsWith(userTypedText)) {
    // User typed a prefix! Strip it off
    const remainingSuffix = lastCompletion.text.substring(userTypedText.length);

    if (remainingSuffix.length > 0) {
      console.log(`[PukuInlineCompletion] Interpolation: user typed "${userTypedText}", remaining "${remainingSuffix.substring(0, 20)}..."`);

      // Update stored completion for next interpolation
      this._lastCompletionByFile.set(fileUri, {
        text: remainingSuffix,
        position: position,
        documentVersion: document.version,
      });

      return [
        new vscode.InlineCompletionItem(
          remainingSuffix,
          new vscode.Range(position, position)
        ),
      ];
    } else {
      // Completion fully typed - clear state
      this._lastCompletionByFile.delete(fileUri);
      return null;
    }
  }

  // User typed something that doesn't match completion
  console.log(`[PukuInlineCompletion] Interpolation failed: user typed "${userTypedText}", completion starts with "${lastCompletion.text.substring(0, 20)}"`);
  this._lastCompletionByFile.delete(fileUri);
  return null;
}
```

---

### Step 4: Store Completion After API (15 minutes)

**File:** `pukuInlineCompletionProvider.ts`

Update after API success (around line 519):

```typescript
// Store completion in Radix Trie cache for future lookups
completionsCache.append(prefix, suffix, completion);

// Store position for validation (from PR #19)
this._completionPositionByFile.set(fileUri, position);

// NEW: Store for edit interpolation
this._lastCompletionByFile.set(fileUri, {
  text: completion,
  position: position,
  documentVersion: document.version,
});

return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
```

Also after speculative cache hit (around line 292):

```typescript
// Store completion in Radix Trie cache for future lookups
completionsCache.append(prefix, suffix, completion);

// Store position for validation (from PR #19)
this._completionPositionByFile.set(fileUri, position);

// NEW: Store for edit interpolation
this._lastCompletionByFile.set(fileUri, {
  text: completion,
  position: position,
  documentVersion: document.version,
});

return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
```

---

### Step 5: Clear State on File Switch (5 minutes)

**File:** `pukuInlineCompletionProvider.ts`

Update file change detection (around line 308):

```typescript
if (fileChanged) {
  console.log(`[PukuInlineCompletion][${reqId}] File changed - skipping debounce`);

  // Clear state for old file (from PR #19)
  if (this._lastFileUri) {
    this._completionPositionByFile.delete(this._lastFileUri);
    this._lastDocumentTextByFile.delete(this._lastFileUri);

    // NEW: Clear interpolation state
    this._lastCompletionByFile.delete(this._lastFileUri);
  }
}
```

---

## ✅ Testing Plan

### Test 1: Basic Prefix Typing

```typescript
// 1. Type "def" → API returns "def main():\n    pass"
// 2. Type "d" → Check interpolation
// 3. ✅ EXPECT: Shows "ef main():\n    pass" instantly (<1ms)
// 4. ✅ EXPECT: No API call
// 5. ✅ EXPECT: Console shows "Interpolation: user typed 'd'"
```

### Test 2: Multi-Character Typing

```typescript
// 1. API returns "def main():\n    pass"
// 2. Type "def" (3 chars)
// 3. ✅ EXPECT: Each char triggers interpolation
// 4. ✅ EXPECT: Final shows " main():\n    pass"
// 5. ✅ EXPECT: 1 API call total (initial), 3 interpolations
```

### Test 3: Non-Matching Text

```typescript
// 1. API returns "def main()"
// 2. Type "class" (doesn't match "def")
// 3. ✅ EXPECT: Interpolation returns null
// 4. ✅ EXPECT: Console shows "Interpolation failed"
// 5. ✅ EXPECT: State cleared, new API call triggered
```

### Test 4: Backspace Invalidation

```typescript
// 1. API returns "def main()"
// 2. Type "de"
// 3. Backspace to "d"
// 4. ✅ EXPECT: Interpolation invalidated (offset decreased)
// 5. ✅ EXPECT: State cleared
// 6. ✅ EXPECT: New API call for "d"
```

### Test 5: Line Change Invalidation

```typescript
// 1. Type "def" at line 10 → API returns "def main()"
// 2. Press Enter (now line 11)
// 3. ✅ EXPECT: Interpolation invalidated (different line)
// 4. ✅ EXPECT: State cleared
```

### Test 6: Full Completion Typed

```typescript
// 1. API returns "x"
// 2. Type "x" (full completion)
// 3. ✅ EXPECT: Interpolation returns null (remaining suffix empty)
// 4. ✅ EXPECT: State cleared
```

### Test 7: Integration with Radix Trie

```typescript
// 1. Type "def" → API returns "def main()"
// 2. Interpolate as user types → "def main()"
// 3. ✅ EXPECT: Radix Trie also stores completion
// 4. Later: type "def" elsewhere
// 5. ✅ EXPECT: Radix Trie cache hit (fallback)
```

---

## 📈 Expected Impact

### API Call Reduction

**Before (without interpolation):**
```
User accepts 20-char completion "def main():\n    pass"
Types char-by-char: d → e → f → (space) → m → a → i → n → ...
Each char after debounce (800ms) triggers API call
Total: ~15-20 API calls
Cost: ~$0.05
Time: ~20 seconds of waiting
```

**After (with interpolation):**
```
User accepts same 20-char completion
Initial API call: 1
Interpolations: 19 (instant, <1ms each)
Total: 1 API call, 19 instant updates
Cost: ~$0.01
Time: ~800ms (only first call)
Savings: 80% fewer API calls, 95% less time!
```

### Performance Comparison

| Metric | Without Interpolation | With Interpolation | Improvement |
|--------|----------------------|-------------------|-------------|
| API calls (20 chars) | 15-20 | 1 | **80-95%** |
| Total latency | ~20s | ~800ms | **96%** |
| Update latency per char | 800ms + 500ms | <1ms | **99.9%** |
| Cost per completion | $0.05 | $0.01 | **80%** |
| UX | Flickering | Smooth | ✅ |

---

## 🔗 Integration with Other Features

### Requires Position Validation (PR #19)

```typescript
// Edit interpolation DEPENDS on position tracking
// 1. Position validation stores position
// 2. Edit interpolation uses position to calculate user-typed text
// 3. Both share _completionPositionByFile map
```

### Compatible with Radix Trie Cache

```typescript
// Interpolation checked BEFORE Radix Trie
// → If interpolation hits, skip Radix Trie (faster)
// → If interpolation misses, fall back to Radix Trie
// → Both store completion, redundancy is OK
```

### Compatible with Speculative Cache

```typescript
// Interpolation checked AFTER position validation
// → If interpolation hits, skip speculative cache (faster)
// → If interpolation misses, fall back to speculative cache
```

### Foundation for Future Features

```typescript
// Edit interpolation enables:
// → Faster debounce (75ms like Zed) - less waiting needed
// → Better UX metrics (track acceptance rate)
// → Multi-line interpolation (future enhancement)
```

---

## 📝 Summary

### Changes Required

| What | Where | Lines | Time |
|------|-------|-------|------|
| Add state field | Class properties | 5 | 10 min |
| Add interpolation check | `provideInlineCompletionItems()` | 5 | 15 min |
| Implement `_tryInterpolateEdit()` | New method | 60-70 | 2-3 hours |
| Store after API success | After API call | 5 x 2 | 15 min |
| Clear state on file switch | File change detection | 1 | 5 min |
| **TOTAL** | | **~100-120** | **~4 hours** |

### Benefits

- ✅ 70-80% fewer API calls when user accepts char-by-char
- ✅ <1ms response (vs 1300ms per char currently)
- ✅ Smoother UX, no flicker
- ✅ $0.04 saved per completion acceptance
- ✅ Foundation for aggressive debounce (future: 75ms like Zed)

### Dependencies

- ⚠️ **Requires PR #19 (Position Validation) first**
- ✅ Compatible with all existing caches

### Next Steps After This

1. **Request Abortion** (1 day) - Cancel in-flight requests on backspace
2. **Faster Debounce** (1 day) - Reduce from 800ms to 200-400ms safely
3. **Diff-Based Rendering** (2-3 days) - Handle race conditions

---

**Priority:** HIGH (implement after Position Validation)
**Effort:** 2-3 days (4 hours coding + testing + edge cases)
**Risk:** Low (conservative invalidation logic)
**Source:** Zed FIM implementation
**Status:** Planning phase, awaiting PR #19

**Related:**
- See `docs/prd/fim/zed-analysis.md` for Zed's implementation
- See `docs/prd/fim/position-validation-refresh-gating.md` for prerequisite
- See `docs/prd/fim/request-abortion.md` for next step
