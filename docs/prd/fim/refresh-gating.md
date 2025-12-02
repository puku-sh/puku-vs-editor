# PRD: Refresh Gating for FIM Completions

> **Status:** 📋 **PLANNING PHASE - NOT YET IMPLEMENTED**
>
> This PRD describes refresh gating optimization for Puku FIM (Fill-in-Middle) completions.
> **This feature is NOT currently implemented.** Implementation timeline: 1-2 hours
> Inspired by Zed's FIM implementation.
>
> **Architecture:** Uses utility class pattern (`helpers/refreshGating.ts`) ✅ Utility already created

---

## 📋 Executive Summary

**Refresh Gating** is a simple optimization that prevents wasted API calls by only triggering completion requests when the document text actually changes, not when the cursor just moves around.

**Impact:** 30-50% fewer API calls with zero UX degradation.

---

## 🎯 Problem Statement

### Current Behavior

Puku's inline completion provider is triggered on **every cursor position change**, even when the user is just navigating through code without typing.

**Example Scenario:**
```typescript
// User types "def" at line 10
// → provideInlineCompletionItems() called
// → API call triggered ✅ (useful)
// → Completion returned: "def main():\n    pass"

// User presses arrow key down (moves to line 11)
// → provideInlineCompletionItems() called
// → API call triggered ❌ (WASTED - no text changed!)
// → Returns completion for empty line

// User presses arrow key down again (moves to line 12)
// → provideInlineCompletionItems() called
// → API call triggered ❌ (WASTED - no text changed!)
// → Returns completion for empty line

// User presses Cmd+G, jumps to line 50
// → provideInlineCompletionItems() called
// → API call triggered ❌ (WASTED - no text changed!)
// → Returns completion for line 50

// Result: 4 API calls, only 1 was useful (75% waste!)
```

### Why This Happens

VS Code's `InlineCompletionItemProvider.provideInlineCompletionItems()` is called whenever:
1. User types a character (text change) ✅ **Should trigger**
2. User deletes a character (text change) ✅ **Should trigger**
3. User moves cursor with arrow keys (no text change) ❌ **Should NOT trigger**
4. User moves cursor with mouse click (no text change) ❌ **Should NOT trigger**
5. User jumps to line with Cmd+G (no text change) ❌ **Should NOT trigger**
6. User scrolls and cursor focus changes (no text change) ❌ **Should NOT trigger**

**Current issue:** We treat all triggers equally and make API calls for all of them.

### Cost Impact

**Assumptions:**
- User navigates 10 times per minute (arrow keys, mouse clicks, jumps)
- User types actual code 5 times per minute
- Current: 15 API calls/minute
- Cost per call: ~$0.001

**Current waste:**
- 10 wasted calls/minute × 60 minutes = 600 wasted calls/hour
- 600 calls × $0.001 = $0.60/hour wasted
- $0.60 × 8 hours/day × 20 days/month = **$96/month wasted per user**

**With refresh gating:**
- Only 5 useful calls/minute × 60 minutes = 300 calls/hour
- 300 calls × $0.001 = $0.30/hour
- **50% cost savings = $48/month saved per user**

---

## 💡 Proposed Solution

### Algorithm: Document Text Comparison

Store a snapshot of the document text after each API call. Before making a new API call, compare the current document text with the stored snapshot:

- **If text is identical** → Cursor moved only → **Block request** (return `null`)
- **If text differs** → User typed/deleted → **Allow request** (update snapshot)

### Pseudocode

```typescript
class PukuInlineCompletionProvider {
  // State: Map of file URI → last known document text
  private _lastDocumentTextByFile = new Map<string, string>();

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null> {
    const fileUri = document.uri.toString();
    const currentText = document.getText();
    const lastText = this._lastDocumentTextByFile.get(fileUri);

    // REFRESH GATE: Check if text actually changed
    if (lastText === currentText) {
      // Cursor moved but no text change
      console.log('[PukuInlineCompletion] No text change - blocking request');
      return null; // Block API call
    }

    // Text changed - update snapshot and proceed
    this._lastDocumentTextByFile.set(fileUri, currentText);

    // ... existing cache checks ...
    // ... existing API call ...

    return completions;
  }
}
```

### Visual Example

**Scenario 1: Cursor Movement (No Text Change)**
```
┌─────────────────────────────────────────────────────────┐
│ Before: "def main():\n    pass"                         │
│ User: Presses arrow key down (line 10 → line 11)       │
│ After:  "def main():\n    pass"  (SAME!)                │
│                                                          │
│ lastText === currentText → TRUE                         │
│ Action: return null (BLOCK API call) ✅                 │
└─────────────────────────────────────────────────────────┘
```

**Scenario 2: Text Change**
```
┌─────────────────────────────────────────────────────────┐
│ Before: "def main():\n    pass"                         │
│ User: Types "x" at line 10                              │
│ After:  "defx main():\n    pass"  (DIFFERENT!)          │
│                                                          │
│ lastText === currentText → FALSE                        │
│ Action: Update snapshot, proceed with API call ✅       │
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
   * REFRESH GATING: Track the last known document text for each file.
   * Used to gate requests - only trigger when text actually changes, not on cursor movement.
   * Key: file URI, Value: document.getText() snapshot
   */
  private _lastDocumentTextByFile = new Map<string, string>();

  // ... rest of class ...
}
```

### Step 2: Implement Refresh Gate Check (15 minutes)

**Location:** Early in `provideInlineCompletionItems()`, after auth check, before cache checks (around line 220)

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

  // REFRESH GATING: Check if document text actually changed
  const fileUri = document.uri.toString();
  const currentDocumentText = document.getText();
  const lastDocumentText = this._lastDocumentTextByFile.get(fileUri);

  if (lastDocumentText !== undefined && lastDocumentText === currentDocumentText) {
    // Cursor moved but no text changed - gate the request
    console.log(`[PukuInlineCompletion][${reqId}] REFRESH GATE: No text change detected - blocking request (cursor movement only)`);
    return null;
  }

  // Text changed or first request - update snapshot
  console.log(`[PukuInlineCompletion][${reqId}] REFRESH GATE: Text changed or first request - allowing request`);
  this._lastDocumentTextByFile.set(fileUri, currentDocumentText);

  // ... existing Radix Trie cache check ...
  // ... existing speculative cache check ...
  // ... existing API call ...
}
```

### Step 3: Clear State on File Switch (5 minutes)

**Location:** File change detection (around line 308)

```typescript
// Existing file change detection
const fileChanged = this._lastFileUri !== fileUri;
if (fileChanged) {
  console.log(`[PukuInlineCompletion][${reqId}] File changed from ${this._lastFileUri} to ${fileUri} - skipping debounce`);

  // REFRESH GATING: Clear state for old file to prevent memory leak
  if (this._lastFileUri) {
    console.log(`[PukuInlineCompletion][${reqId}] Clearing refresh gating state for old file: ${this._lastFileUri}`);
    this._lastDocumentTextByFile.delete(this._lastFileUri);
  }
}
```

### Step 4: Add Helper Method for Cleanup (Optional, 5 minutes)

**Location:** After constructor, before `provideInlineCompletionItems()`

```typescript
/**
 * Clear refresh gating state for a file.
 * Called when switching files to prevent memory leaks.
 * @param fileUri - The URI of the file to clear state for
 */
private _clearRefreshGatingState(fileUri: string): void {
  this._lastDocumentTextByFile.delete(fileUri);
}
```

Then use in file switch:
```typescript
if (this._lastFileUri) {
  this._clearRefreshGatingState(this._lastFileUri);
}
```

---

## ✅ Testing Plan

### Test 1: Cursor Movement (No Text Change)

**Setup:**
1. Open a TypeScript file
2. Type `def` at line 10
3. Wait for completion to appear
4. Check console: Should see API call log

**Test:**
1. Press arrow key down (move to line 11)
2. Check console: Should see `REFRESH GATE: No text change detected - blocking request`
3. Verify: No API call in Network tab
4. Press arrow key down again (move to line 12)
5. Check console: Should see same blocking message
6. Verify: Still no API call

**Expected Result:**
- ✅ Only 1 API call (initial "def" typing)
- ✅ 2 blocked requests (arrow key movements)
- ✅ Console shows refresh gate blocking messages

### Test 2: Text Change Triggers Request

**Setup:**
1. Open a TypeScript file
2. Type `def` at line 10
3. Wait for completion
4. Note: 1 API call made

**Test:**
1. Type space character (` `)
2. Check console: Should see `REFRESH GATE: Text changed - allowing request`
3. Verify: New API call in Network tab
4. Type another character (`m`)
5. Check console: Should see allowing message again
6. Verify: Another API call

**Expected Result:**
- ✅ 3 API calls total (def, def , def m)
- ✅ All requests allowed (text changed each time)
- ✅ Console shows allowing messages

### Test 3: File Switch Clears State

**Setup:**
1. Open file A (`test.ts`)
2. Type `def` at line 10
3. Check: `_lastDocumentTextByFile` has entry for file A

**Test:**
1. Switch to file B (`another.ts`) using Cmd+P
2. Check console: Should see `Clearing refresh gating state for old file`
3. Verify: `_lastDocumentTextByFile` does NOT have entry for file A
4. Move cursor in file B
5. Check: Should allow first request (no previous text stored)

**Expected Result:**
- ✅ File A state cleared on switch
- ✅ File B treated as new file (first request allowed)
- ✅ Console shows state clearing message

### Test 4: Mouse Click Navigation

**Setup:**
1. Open a file with 50 lines
2. Type `def` at line 10
3. Wait for completion

**Test:**
1. Click with mouse on line 25
2. Check console: Should see refresh gate blocking
3. Click with mouse on line 40
4. Check console: Should see refresh gate blocking again

**Expected Result:**
- ✅ No API calls for mouse clicks
- ✅ Console shows blocking messages

### Test 5: Cmd+G Jump Navigation

**Setup:**
1. Open a file
2. Type `def` at line 10
3. Wait for completion

**Test:**
1. Press Cmd+G (Go to Line)
2. Enter line 100
3. Press Enter
4. Check console: Should see refresh gate blocking

**Expected Result:**
- ✅ No API call for jump
- ✅ Console shows blocking message

### Test 6: Integration with Existing Caches

**Setup:**
1. Enable Radix Trie cache
2. Type `def` (cache miss → API call)
3. Type `de` (backspace)
4. Type `def` again (cache hit possible)

**Test:**
1. Move cursor (no text change)
2. Verify: Refresh gate blocks BEFORE cache check
3. Type `f` (text change)
4. Verify: Refresh gate allows, cache check proceeds

**Expected Result:**
- ✅ Refresh gate runs before all caches
- ✅ Blocked requests skip cache checks entirely
- ✅ Allowed requests proceed to cache/API as normal

---

## 📈 Expected Performance Impact

### API Call Reduction

**Baseline (before refresh gating):**
```
10 minutes of coding:
- User types code: 50 times → 50 API calls ✅
- User navigates (arrows/mouse/jumps): 100 times → 100 API calls ❌
Total: 150 API calls
Useful: 50 (33%)
Wasted: 100 (67%)
```

**With refresh gating:**
```
10 minutes of coding:
- User types code: 50 times → 50 API calls ✅
- User navigates: 100 times → 0 API calls (gated!)
Total: 50 API calls
Useful: 50 (100%)
Wasted: 0 (0%)
Reduction: 67% fewer API calls!
```

### Real-World Measurement

We expect 30-50% reduction in API calls based on:
- Conservative estimate: 30% of triggers are cursor-only movements
- Aggressive estimate: 50% of triggers are cursor-only movements
- Zed's implementation shows similar results

### Latency Impact

**No negative impact on perceived latency:**
- Refresh gate check is instant (string comparison via reference equality)
- Comparison time: <0.1ms (strings are equal by reference if unchanged)
- User won't notice any difference in completion speed

**Possible positive impact:**
- Fewer API calls = less server load = potentially faster responses
- Fewer cache lookups = slightly faster code path for blocked requests

### Cost Savings

**Per user per month:**
```
Before: 150,000 API calls/month × $0.001 = $150/month
After:  50,000 API calls/month × $0.001 = $50/month
Savings: $100/month per active user
```

**With 1000 active users:**
```
Monthly savings: 1000 × $100 = $100,000/month
Annual savings: $100,000 × 12 = $1,200,000/year
```

---

## 🔬 Technical Deep Dive

### Why String Comparison is Fast

JavaScript/TypeScript optimizes string equality checks:

```typescript
// First call - store reference
this._lastDocumentTextByFile.set(fileUri, currentText);
// currentText is stored by reference

// Cursor movement (no text change)
const newText = document.getText(); // Returns SAME string object
const oldText = this._lastDocumentTextByFile.get(fileUri);

// Comparison
oldText === newText
// → TRUE (reference equality, instant!)
```

**Even if VS Code creates a new string:**
```typescript
// Worst case: new string with same content
"def main()" === "def main()"
// → Still fast (V8 engine interns short strings)
```

### Memory Impact

**Storage cost per file:**
```
Average file size: 10KB
Map overhead: ~100 bytes
Total per file: ~10.1KB
```

**With 50 open files:**
```
50 files × 10.1KB = 505KB
```

**Negligible compared to:**
- VS Code memory usage: ~200-500MB
- Extension host memory: ~50-100MB
- **0.5MB is 0.1% of extension memory** ✅

### Edge Cases Handled

**Case 1: File modified externally**
```typescript
// User modifies file in another editor
// VS Code reloads file → getText() returns new content
// Our stored text is stale → comparison fails → allows request ✅
```

**Case 2: Undo/Redo**
```typescript
// User types "def" → stored: "def"
// User presses Cmd+Z (undo) → getText() returns ""
// Stored text differs → allows request ✅
```

**Case 3: Multiple cursors**
```typescript
// VS Code calls provideInlineCompletionItems for each cursor
// Each call gets current document text
// If text unchanged since last call → blocked ✅
```

**Case 4: File encoding changes**
```typescript
// getText() returns decoded string
// Encoding change → string content may differ → allows request ✅
```

---

## 🔗 Integration with Existing Features

### Compatible with Radix Trie Cache

**Order of checks:**
```typescript
1. Auth check
2. REFRESH GATE ← (NEW)
3. Radix Trie cache check
4. Speculative cache check
5. API call
```

**Benefit:** Blocked requests skip ALL cache checks (faster code path)

### Compatible with Speculative Cache

Refresh gating happens BEFORE speculative cache:
```typescript
if (no text change) return null; // Blocked!
// Speculative cache never checked (saves work)
```

### Compatible with Debouncing

Refresh gating is orthogonal to debouncing:
- **Debouncing:** Delays requests to batch rapid typing
- **Refresh gating:** Blocks requests when no text changed

Both work together:
```typescript
// User types "d" → debounce timer starts
// User types "e" → debounce timer resets
// User waits 800ms → debounce expires, checks refresh gate
// → Text changed? Yes → API call proceeds ✅

// User types "def" → debounce timer starts
// User moves cursor → debounce timer may trigger
// → Check refresh gate
// → No text change? → Blocked, no API call ✅
```

### Foundation for Future Features

**Enables edit interpolation:**
```typescript
// Store document text snapshot
this._lastDocumentTextByFile.set(fileUri, currentText);

// Later: Check if user typed prefix of last completion
const userTyped = currentText.substring(lastCompletion.position, position);
if (lastCompletion.text.startsWith(userTyped)) {
  // Edit interpolation! Return suffix instantly
  return lastCompletion.text.substring(userTyped.length);
}
```

---

## 📊 Success Metrics

### Primary Metrics

1. **API Call Reduction**
   - Measure: API calls per hour (before vs after)
   - Target: 30-50% reduction
   - How: Add telemetry to count gated vs allowed requests

2. **Cost Savings**
   - Measure: API spend per user per month
   - Target: 30-50% reduction
   - How: Track billable API calls in dashboard

### Secondary Metrics

3. **User Satisfaction**
   - Measure: User reports of "completion feels faster/snappier"
   - Target: No negative reports
   - How: Monitor GitHub issues, Discord feedback

4. **Correctness**
   - Measure: False positive gating (blocking when should allow)
   - Target: 0% false positives
   - How: Manual testing + user reports

### Monitoring

Add console logging to track gating rate:
```typescript
private _totalRequests = 0;
private _gatedRequests = 0;

// In refresh gate check:
this._totalRequests++;
if (lastText === currentText) {
  this._gatedRequests++;
  const gatingRate = (this._gatedRequests / this._totalRequests * 100).toFixed(1);
  console.log(`[PukuInlineCompletion] REFRESH GATE: Blocked request | Gating rate: ${this._gatedRequests}/${this._totalRequests} (${gatingRate}%)`);
  return null;
}
```

**Target gating rate:** 30-50% (indicates optimization is working)

---

## 🚨 Risks and Mitigations

### Risk 1: False Positive Gating

**Risk:** Block request when text actually changed

**Likelihood:** Very low (string comparison is exact)

**Mitigation:**
- Use exact string equality (`===`)
- Log all gating decisions for debugging
- Easy to disable (comment out check)

### Risk 2: Memory Leak

**Risk:** `_lastDocumentTextByFile` grows unbounded

**Likelihood:** Low

**Mitigation:**
- Clear state on file close (add listener)
- Clear state on file switch (already implemented)
- Use WeakMap if needed (garbage collects automatically)

### Risk 3: Performance Regression

**Risk:** String comparison slows down provider

**Likelihood:** Very low

**Mitigation:**
- String comparison is O(1) for reference equality
- Worst case O(n) for content equality (V8 optimized)
- Add performance timing logs to measure

---

## 📝 Implementation Summary

### Code Changes

| Location | Change | Lines | Time |
|----------|--------|-------|------|
| Class properties | Add `_lastDocumentTextByFile` map | 5 | 5 min |
| `provideInlineCompletionItems()` | Add refresh gate check | 12 | 15 min |
| File change detection | Clear state on file switch | 4 | 5 min |
| **Total** | | **~21** | **~25 min** |

### Testing Time

| Test | Time |
|------|------|
| Manual testing (6 test cases) | 20 min |
| Integration testing | 10 min |
| Performance validation | 5 min |
| **Total** | **~35 min** |

### Total Implementation Time

**Coding + Testing:** ~1 hour

---

## 🎯 Acceptance Criteria

**Must have:**
- ✅ Cursor movement (no text change) blocks API calls
- ✅ Text changes (typing/deleting) allow API calls
- ✅ File switch clears state for old file
- ✅ Console logs show gating decisions
- ✅ No false positives (never block text changes)
- ✅ 30-50% reduction in API calls observed

**Nice to have:**
- ✅ Telemetry to track gating rate
- ✅ Performance metrics logged
- ✅ Documentation in code comments

---

## 🔜 Next Steps After Implementation

1. **Monitor gating rate** for 1 week
   - Target: 30-50% of requests gated
   - If lower: Investigate why
   - If higher: Celebrate! 🎉

2. **Measure cost savings**
   - Compare API spend before/after
   - Report to team

3. **Implement Position Validation** (companion feature)
   - Prevents stale completions when cursor moves
   - ~30 min implementation
   - See `docs/prd/fim/position-validation-refresh-gating.md`

4. **Implement Edit Interpolation** (next major feature)
   - Requires refresh gating as foundation
   - 70-80% additional API call reduction
   - See `docs/prd/fim/edit-interpolation.md`

---

## 📚 References

- **Source inspiration:** Zed FIM implementation (`reference/zed/crates/supermaven/src/supermaven_completion_provider.rs`)
- **Related PRD:** Position Validation (`docs/prd/fim/position-validation-refresh-gating.md`)
- **Implementation guide:** Modular approach (`docs/prd/fim/position-validation-implementation-guide.md`)
- **Competitive analysis:** Zed analysis (`docs/prd/fim/zed-analysis.md`)

---

**Status:** 📋 Planning Phase - Awaiting Implementation
**Priority:** HIGH (quick win, foundation for edit interpolation)
**Effort:** 1-2 hours (coding + testing)
**Risk:** Very Low
**Impact:** 30-50% fewer API calls, $100/month savings per user
