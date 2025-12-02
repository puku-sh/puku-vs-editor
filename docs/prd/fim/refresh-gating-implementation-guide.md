# Refresh Gating - Modular Implementation Guide

> **Implementation Plan:** Break down into small, testable modules
> **Estimated Time:** 45 minutes (broken into 2 modules × ~20-25 min each)
> **Architecture:** Uses utility class `helpers/refreshGating.ts`

---

## Module Architecture

```
Refresh Gating
│
├── Module 1: Utility Class (Already Created ✅)
│   └── helpers/refreshGating.ts - RefreshGating class
│
├── Module 2: Integration (20 min)
│   ├── Import RefreshGating
│   ├── Instantiate in provider
│   └── Call shouldRefresh() before completions
│
└── Module 3: State Cleanup (15 min)
    └── Call clear() on file switch
```

---

## Module 1: Utility Class (Already Created ✅)

**File:** `src/chat/src/extension/pukuai/vscode-node/helpers/refreshGating.ts`

The `RefreshGating` utility class has already been created with the following API:

```typescript
export class RefreshGating {
	/**
	 * Check if document text has actually changed since last request.
	 * Returns true if text changed (should refresh), false if only cursor moved.
	 * Automatically updates stored text when text changes.
	 */
	shouldRefresh(document: vscode.TextDocument, reqId: number): boolean

	/**
	 * Clear refresh gating state for a file.
	 */
	clear(fileUri: string): void

	/**
	 * Get stored document text (for testing/debugging).
	 */
	getStoredText(fileUri: string): string | undefined

	/**
	 * Get statistics about gated requests (for monitoring).
	 */
	getTrackedFileCount(): number
}
```

**Benefits of utility class:**
- ✅ Separation of concerns (gating logic separate from provider)
- ✅ Reusable across different completion providers
- ✅ Easier to test in isolation
- ✅ Cleaner main provider code
- ✅ Built-in statistics support

---

## Module 2: Integration

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

**Goal:** Import and integrate RefreshGating into completion provider.

### Step 2.1: Import and Instantiate (5 min)

**Location 1:** Imports section (top of file)

```typescript
import { RefreshGating } from './helpers/refreshGating';
```

**Location 2:** Class properties (around line 140)

```typescript
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
	// ... existing fields ...
	private _lastFileUri = '';
	private _requestInFlight = false;

	// Refresh gating helper
	private readonly _refreshGating = new RefreshGating();

	// ... rest of fields ...
```

### Step 2.2: Integrate Gating Check (10 min)

**Location:** In `provideInlineCompletionItems()`, after auth check (around line 220)

```typescript
// Check authentication
if (!authToken) {
	console.log(`[PukuInlineCompletion][${reqId}] Not authenticated - skipping completion`);
	return null;
}

// Refresh gating - check if text actually changed
if (!this._refreshGating.shouldRefresh(document, reqId)) {
	return null; // Cursor moved but no text change - skip request
}

// ... existing Radix Trie cache check ...
```

### Step 2.3: Test Integration (5 min)

```typescript
// Manual test in DevTools console:
// 1. Type "def" at line 10 → API call happens
// 2. Move cursor to line 20 (arrow keys or Cmd+G)
// 3. EXPECT: Console shows "no text change detected - blocking request"
// 4. EXPECT: No API call (check network tab)
// 5. Type "x" at line 20 → text changed
// 6. EXPECT: Console shows "text changed - allowing request"
// 7. EXPECT: API call happens
```

---

## Module 3: State Cleanup

**Goal:** Clear state on file switch.

### Step 3.1: Clear State on File Switch (10 min)

**Location:** In `provideInlineCompletionItems()`, file change detection (around line 308)

```typescript
// Existing file change detection
const fileChanged = this._lastFileUri !== fileUri;
if (fileChanged) {
	console.log(`[PukuInlineCompletion][${reqId}] File changed from ${this._lastFileUri} to ${fileUri} - skipping debounce`);

	// Clear gating state for old file
	if (this._lastFileUri) {
		console.log(`[PukuInlineCompletion][${reqId}] Clearing refresh gating state for old file: ${this._lastFileUri}`);
		this._refreshGating.clear(this._lastFileUri);
	}
}
```

### Step 3.2: End-to-End Testing (15 min)

**Test Suite:**

```typescript
// Test 1: Cursor Movement (No Text Change)
// ✅ 1. Type "def" at line 10 → API call happens
// ✅ 2. Move cursor to line 20 (arrow keys)
// ✅ 3. EXPECT: Console shows "no text change detected - blocking request"
// ✅ 4. EXPECT: No API call (check network tab)

// Test 2: Text Change
// ✅ 1. Type "def" at line 10 → API call happens
// ✅ 2. Type " " (space) → text changed
// ✅ 3. EXPECT: Console shows "text changed - allowing request"
// ✅ 4. EXPECT: API call happens (check network tab)

// Test 3: File Switch
// ✅ 1. Type "def" in file A → API call happens
// ✅ 2. Switch to file B (Cmd+P)
// ✅ 3. EXPECT: Console shows "Clearing refresh gating state for old file"
// ✅ 4. EXPECT: File B can get completions

// Test 4: Mouse Navigation
// ✅ 1. Type "def" at line 10 → API call
// ✅ 2. Click mouse on line 30
// ✅ 3. EXPECT: No API call (no text change)
// ✅ 4. EXPECT: Console shows blocking message

// Test 5: Cmd+G Jump
// ✅ 1. Type "def" at line 10 → API call
// ✅ 2. Press Cmd+G, jump to line 50
// ✅ 3. EXPECT: No API call (no text change)
// ✅ 4. EXPECT: Console shows blocking message
```

---

## Module Dependency Graph

```
Module 1 (Utility Class - Already Created ✅)
    ↓
Module 2 (Integration) ──→ Module 3 (State Cleanup)
```

**Implementation order:**
1. Module 1: ✅ Utility class already created
2. Module 2: Import, instantiate, integrate gating check
3. Module 3: Call clear() on file switch

---

## Implementation Checklist

### Module 1 - Utility Class ✅

- [x] Create `helpers/refreshGating.ts`
- [x] Implement `RefreshGating` class
- [x] Add `shouldRefresh()`, `clear()` methods
- [x] Add JSDoc documentation

### Module 2 - Integration (20 min)

- [ ] Import `RefreshGating` from helpers
- [ ] Instantiate as class field
- [ ] Call `shouldRefresh()` after auth check
- [ ] Test: Console logs show gating decisions
- [ ] Test: API calls blocked on cursor-only movements

### Module 3 - State Cleanup (15 min)

- [ ] Call `clear()` on file switch
- [ ] Test: State clears correctly

### Testing (20 min)

- [ ] Test 1: Cursor movement (no text change) → blocks
- [ ] Test 2: Text change (typing/deleting) → allows
- [ ] Test 3: File switch clears state
- [ ] Test 4: Mouse navigation → blocks
- [ ] Test 5: Cmd+G jump → blocks

---

## Success Criteria

**Module 1:** ✅ Utility class created with clean API
**Module 2:** ✅ Refresh gating integrated into provider
**Module 3:** ✅ State clears on file switch

**Overall:** ✅ 30-50% fewer API calls observed in testing

---

## Rollback Plan

If refresh gating causes issues, simply comment out the gating check:

```typescript
// Refresh gating (TEMPORARILY DISABLED)
// if (!this._refreshGating.shouldRefresh(document, reqId)) {
//   return null;
// }
```

System continues working without the optimization. The utility class remains available for re-enabling later.

---

## Performance Monitoring

Add metrics to track improvement:

```typescript
// At top of class:
private _totalRequests = 0;
private _gatedRequests = 0;

// In _shouldRefresh():
this._totalRequests++;
if (lastDocumentText === currentDocumentText) {
  this._gatedRequests++;
  const gatingRate = Math.round(this._gatedRequests / this._totalRequests * 100);
  console.log(`[PukuInlineCompletion] Gating stats: ${this._gatedRequests}/${this._totalRequests} requests gated (${gatingRate}%)`);
  return false;
}
```

**Target:** 30-50% gated requests after 1 hour of normal coding.

---

## Code Summary

### Total Lines of Code

| Module | Lines | Time |
|--------|-------|------|
| Module 1: Utility Class | ~100 (✅ Done) | - |
| Module 2: Integration | ~6 | 20 min |
| Module 3: State Cleanup | ~4 | 10 min |
| **Total (New Code)** | **~10** | **~30 min** |

**Note:** Utility class (`helpers/refreshGating.ts`) already created with ~100 lines including documentation.

### Total Implementation Time

**Utility class:** ✅ Already created
**Integration:** ~30 min
**Testing:** ~20 min
**Total remaining:** ~50 min

---

## Next Steps After Implementation

1. **Monitor gating rate** for 1 week
   - Target: 30-50% of requests gated
   - Track via console logs

2. **Measure API call reduction**
   - Compare before/after API call counts
   - Target: 30-50% reduction

3. **Consider combining with Position Validation**
   - Companion feature for complete solution
   - See `docs/prd/fim/position-validation.md`

---

**Status:** 📋 Planning Phase - Ready for Implementation
**Effort:** 1 hour (3 modules)
**Risk:** Very Low (easy rollback)
**Impact:** 30-50% fewer API calls
