# PRD: Request Abortion on Backspace

> **Status:** 📋 **PLANNING PHASE - NOT YET IMPLEMENTED**
>
> This PRD describes a planned feature for Puku FIM to abort in-flight API requests when user backspaces or changes direction.
> **This feature is NOT currently implemented.** Implementation timeline: 1 day
> Inspired by Aide's approach.

---

## 📋 Overview

Abort in-flight API requests when the user backspaces or changes their input before the request completes, saving wasted API calls and tokens.

---

## 🎯 Goals

1. **~20% fewer wasted API calls** - Cancel requests when user changes mind
2. **Better UX** - Don't show completions for old/wrong context
3. **Token savings** - Don't pay for completions we'll discard

---

## 📊 The Problem

```typescript
// Current behavior:
User types "def" → API call starts (800ms debounce + 500ms request)
User backspaces to "de" (300ms later)
→ First request STILL in flight! ❌
→ First request completes → Shows completion for "def" ❌ (wrong!)
→ Second request starts for "de"
→ Two API calls, one was wasted
```

---

## 💡 Proposed Solution

```typescript
class PukuInlineCompletionProvider {
  private _abortController: AbortController | null = null;

  async provideInlineCompletionItems(...) {
    // Abort previous request if still in flight
    if (this._abortController) {
      this._abortController.abort();
      console.log(`[PukuInlineCompletion] Aborted previous request`);
    }

    // Create new abort controller
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    try {
      // Use signal in fetch
      const response = await this._fetcherService.fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal, // NEW: Pass abort signal
      });

      // ... process response ...
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`[PukuInlineCompletion] Request aborted`);
        return null;
      }
      throw error;
    } finally {
      this._abortController = null;
    }
  }
}
```

---

## 🏗️ Implementation Plan

### Step 1: Add AbortController State (5 min)

```typescript
export class PukuInlineCompletionProvider {
  private _abortController: AbortController | null = null;
```

### Step 2: Abort Previous Request (10 min)

At start of `provideInlineCompletionItems()`:

```typescript
// Abort previous request if in flight
if (this._abortController) {
  this._abortController.abort();
  this._abortController = null;
}

// Create new controller
this._abortController = new AbortController();
```

### Step 3: Pass Signal to Fetch (15 min)

In `_fetchContextAwareCompletion()`:

```typescript
const response = await this._fetcherService.fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(requestBody),
  signal: token, // Use VS Code's CancellationToken (already passed)
});
```

Actually, VS Code already provides `CancellationToken` - we just need to convert it to AbortSignal:

```typescript
// At start of provideInlineCompletionItems
if (token.isCancellationRequested) {
  return null;
}

// Create AbortController from VS Code token
const abortController = new AbortController();
token.onCancellationRequested(() => abortController.abort());

// Pass signal to fetch
await this._fetchContextAwareCompletion(..., abortController.signal);
```

### Step 4: Handle AbortError (5 min)

In `_fetchContextAwareCompletion()`:

```typescript
try {
  const response = await this._fetcherService.fetch(url, {
    signal: abortSignal,
    ...
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log(`[PukuInlineCompletion] Request aborted`);
    return null;
  }
  throw error; // Re-throw other errors
}
```

---

## ✅ Testing Plan

### Test 1: Backspace Abortion

```
1. Type "def" → API call starts
2. Backspace to "de" (before first call completes)
3. ✅ EXPECT: First request aborted
4. ✅ EXPECT: Console shows "Request aborted"
5. ✅ EXPECT: Only second request completes
```

### Test 2: Rapid Typing

```
1. Type "d" → API call 1 starts
2. Type "de" → API call 1 aborted, call 2 starts
3. Type "def" → API call 2 aborted, call 3 starts
4. ✅ EXPECT: Only call 3 completes
```

---

## 📈 Expected Impact

**Before:**
```
User types "def" → backspaces → types "class"
→ 2 API calls (both complete)
→ 2x cost, wrong completion shown briefly
```

**After:**
```
User types "def" → backspaces → types "class"
→ 1 API call (first aborted)
→ 1x cost, only correct completion shown
Savings: ~20% fewer wasted calls
```

---

## 📝 Summary

| What | Lines | Time |
|------|-------|------|
| Use VS Code CancellationToken | 10 | 30 min |
| Handle AbortError | 5 | 10 min |
| Testing | - | 20 min |
| **TOTAL** | **~15** | **~1 hour** |

**Benefits:**
- 20% fewer wasted API calls
- Cleaner UX
- Token savings

**Priority:** MEDIUM (after Position Validation and Edit Interpolation)
**Source:** Aide FIM implementation
