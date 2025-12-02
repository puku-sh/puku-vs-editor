# Position Validation - Modular Implementation Guide

> **Implementation Plan:** Break down into small, testable modules
> **Estimated Time:** 50 minutes (broken into 3 modules × ~15-20 min each)
> **Architecture:** Uses utility class `helpers/positionValidation.ts`

---

## Module Architecture

```
Position Validation
│
├── Module 1: Utility Class (Already Created ✅)
│   └── helpers/positionValidation.ts - PositionValidator class
│
├── Module 2: Integration (20 min)
│   ├── Import PositionValidator
│   ├── Instantiate in provider
│   └── Call validate() before completions
│
└── Module 3: State Updates (15 min)
    ├── Call update() after successful completions
    └── Call clear() on file switch
```

---

## Module 1: Utility Class (Already Created ✅)

**File:** `src/chat/src/extension/pukuai/vscode-node/helpers/positionValidation.ts`

The `PositionValidator` utility class has already been created with the following API:

```typescript
export class PositionValidator {
	/**
	 * Check if cursor has moved away from stored completion position.
	 * Clears stale position state if cursor moved.
	 */
	validate(fileUri: string, currentPosition: vscode.Position, reqId: number): void

	/**
	 * Store position after successful completion.
	 */
	update(fileUri: string, position: vscode.Position): void

	/**
	 * Clear position validation state for a file.
	 */
	clear(fileUri: string): void

	/**
	 * Get stored position (for testing/debugging).
	 */
	getStoredPosition(fileUri: string): vscode.Position | undefined
}
```

**Benefits of utility class:**
- ✅ Separation of concerns (validation logic separate from provider)
- ✅ Reusable across different completion providers
- ✅ Easier to test in isolation
- ✅ Cleaner main provider code

---

## Module 2: Integration

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

**Goal:** Import and integrate PositionValidator into completion provider.

### Step 2.1: Import and Instantiate (5 min)

**Location 1:** Imports section (top of file)

```typescript
import { PositionValidator } from './helpers/positionValidation';
```

**Location 2:** Class properties (around line 140)

```typescript
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
	// ... existing fields ...
	private _lastFileUri = '';
	private _requestInFlight = false;

	// Position validation helper
	private readonly _positionValidator = new PositionValidator();

	// ... rest of fields ...
```

### Step 2.2: Integrate Validation Check (5 min)

**Location:** In `provideInlineCompletionItems()`, after auth check (around line 216)

```typescript
// Check authentication
if (!authToken) {
	console.log(`[PukuInlineCompletion][${reqId}] Not authenticated - skipping completion`);
	return null;
}

// Position validation - clear stale position if cursor moved
const fileUri = document.uri.toString();
this._positionValidator.validate(fileUri, position, reqId);

// ... existing Radix Trie cache check ...
```

### Step 2.3: Test Integration (5 min)

```typescript
// Manual test in DevTools console:
// 1. Type "def" at line 10 → completion shows
// 2. Move cursor to line 20 (arrow keys or Cmd+G)
// 3. EXPECT: Console shows "Cursor moved from 10:X to 20:Y"
// 4. Type at line 20 → new completion works
```

---

## Module 3: State Updates

**Goal:** Update position state after successful completions and clear on file switch.

### Step 3.1: Store Position After API Success (5 min)

**Location 1:** After main API call success (around line 519)

```typescript
// Store completion in Radix Trie cache for future lookups
completionsCache.append(prefix, suffix, completion);

// Store position for validation
this._positionValidator.update(fileUri, position);

// Return completion
return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
```

**Location 2:** After speculative cache hit (around line 292)

```typescript
// Store completion in Radix Trie cache for future lookups
completionsCache.append(prefix, suffix, completion);

// Store position for validation
this._positionValidator.update(fileUri, position);

return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
```

### Step 3.2: Clear State on File Switch (5 min)

**Location:** In `provideInlineCompletionItems()`, file change detection (around line 308)

```typescript
// Existing file change detection
const fileChanged = this._lastFileUri !== fileUri;
if (fileChanged) {
	console.log(`[PukuInlineCompletion][${reqId}] File changed from ${this._lastFileUri} to ${fileUri} - skipping debounce`);

	// Clear validation state for old file
	if (this._lastFileUri) {
		console.log(`[PukuInlineCompletion][${reqId}] Clearing position validation state for old file: ${this._lastFileUri}`);
		this._positionValidator.clear(this._lastFileUri);
	}
}
```

### Step 3.3: End-to-End Testing (15 min)

**Test Suite:**

```typescript
// Test 1: Position Validation - Cursor Movement to Different Line
// ✅ 1. Type "def" at line 10 → completion shows
// ✅ 2. Move cursor to line 20 (Cmd+G)
// ✅ 3. EXPECT: Console shows "Cursor moved from 10:X to 20:Y"
// ✅ 4. EXPECT: State cleared
// ✅ 5. Type at line 20 → new completion works

// Test 2: Position Validation - Same Line Movement
// ✅ 1. Type "def" at line 10, col 0
// ✅ 2. Completion shows
// ✅ 3. Move cursor to line 10, col 10 (arrow keys)
// ✅ 4. EXPECT: State cleared (position changed)
// ✅ 5. Type character → new completion works

// Test 3: Mouse Click Navigation
// ✅ 1. Type "def" at line 10
// ✅ 2. Click mouse on line 30
// ✅ 3. EXPECT: Console shows "Cursor moved"
// ✅ 4. EXPECT: State cleared
// ✅ 5. Type at line 30 → new completion

// Test 4: File Switch
// ✅ 1. Type "def" in file A
// ✅ 2. Check: this._completionPositionByFile.has('file://A') === true
// ✅ 3. Switch to file B (Cmd+P)
// ✅ 4. EXPECT: Console shows "Clearing state for old file"
// ✅ 5. Check: this._completionPositionByFile.has('file://A') === false

// Test 5: Continued Typing
// ✅ 1. Type "d" at line 10 → position stored
// ✅ 2. Type "e" → position changes, state cleared
// ✅ 3. Type "f" → position changes again, state cleared
// ✅ 4. EXPECT: Each keystroke clears previous position
// ✅ 5. Enables future edit interpolation feature
```

---

## Module Dependency Graph

```
Module 1 (Utility Class - Already Created ✅)
    ↓
Module 2 (Integration) ──→ Module 3 (State Updates)
```

**Implementation order:**
1. Module 1: ✅ Utility class already created
2. Module 2: Import, instantiate, integrate validation check
3. Module 3: Call update() after completions, clear() on file switch

---

## Implementation Checklist

### Module 1 - Utility Class ✅

- [x] Create `helpers/positionValidation.ts`
- [x] Implement `PositionValidator` class
- [x] Add `validate()`, `update()`, `clear()` methods
- [x] Add JSDoc documentation

### Module 2 - Integration (15 min)

- [ ] Import `PositionValidator` from helpers
- [ ] Instantiate as class field
- [ ] Call `validate()` before completions
- [ ] Test: Console logs show position changes

### Module 3 - State Updates (15 min)

- [ ] Call `update()` after API success
- [ ] Call `update()` after cache hit
- [ ] Call `clear()` on file switch
- [ ] Test: State updates correctly

### Testing (20 min)

- [ ] Test 1: Cursor movement to different line → state cleared
- [ ] Test 2: Same-line movement → state cleared
- [ ] Test 3: Mouse navigation → state cleared
- [ ] Test 4: File switch → state cleared
- [ ] Test 5: Continued typing → position updates

---

## Success Criteria

**Module 1:** ✅ Utility class created with clean API
**Module 2:** ✅ Position validation integrated into provider
**Module 3:** ✅ State updates after completions and clears on file switch

**Overall:** ✅ No stale completions shown in wrong locations

---

## Rollback Plan

If position validation causes issues, simply comment out the validation call:

```typescript
// Position validation (TEMPORARILY DISABLED)
// this._positionValidator.validate(fileUri, position, reqId);
```

System continues working without position validation. The utility class remains available for re-enabling later.

---

## Code Summary

### Total Lines of Code

| Module | Lines | Time |
|--------|-------|------|
| Module 1: Utility Class | ~90 (✅ Done) | - |
| Module 2: Integration | ~8 | 15 min |
| Module 3: State Updates | ~6 | 15 min |
| **Total (New Code)** | **~14** | **~30 min** |

**Note:** Utility class (`helpers/positionValidation.ts`) already created with ~90 lines including documentation.

### Total Implementation Time

**Utility class:** ✅ Already created
**Integration:** ~30 min
**Testing:** ~20 min
**Total remaining:** ~50 min

---

## Next Steps After Implementation

1. **Test with real coding** for 1 hour
   - Verify no stale completions appear
   - Check console logs for position changes

2. **Monitor for issues**
   - Target: 0 reports of "wrong completion location"

3. **Consider companion feature**
   - Refresh Gating (blocks API calls on cursor-only movement)
   - See `docs/prd/fim/refresh-gating.md`

4. **Enable edit interpolation**
   - Position tracking is required for this feature
   - See `docs/prd/fim/edit-interpolation.md`

---

**Status:** 📋 Planning Phase - Ready for Implementation
**Effort:** 50 minutes (4 modules)
**Risk:** Very Low (easy rollback)
**Impact:** Better UX, no stale completions, enables edit interpolation
