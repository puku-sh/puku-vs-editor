# RejectionCollector Test Plan

**Feature**: NES RejectionCollector (Issue #130)
**Status**: ✅ Implemented
**Date**: 2025-12-18
**Related**: NextEditCache (#129), NES Provider

---

## Overview

The RejectionCollector prevents users from seeing the same rejected NES (Next Edit Suggestions) repeatedly by:
- Tracking rejected edits with normalization (removes common prefix/suffix)
- Rebasing rejections when document changes
- LRU eviction with 20-document limit
- Blocking re-showing of rejected patterns

---

## Quick 30-Second Test

```
1. Open any .ts file in Puku Editor
2. Type: const x =
3. Wait for NES suggestion
4. Press Esc to reject
5. Undo (Cmd+Z) and type "const x = " again
6. ✅ Expected: Same suggestion should NOT appear
```

Look for log: `[PukuNesNextEdit] ⛔ Edit was previously rejected, skipping`

---

## Test 1: Basic Rejection Tracking

**Purpose**: Verify that rejected suggestions are tracked and blocked

**Steps**:
1. Open a new TypeScript file in Puku Editor
2. Type: `const x = `
3. Wait for NES suggestion to appear
4. Press `Esc` to reject the suggestion
5. Delete the line and type `const x = ` again

**Expected Result**:
- ✅ Same suggestion should NOT appear
- ✅ Log shows: `[PukuNesNextEdit] Tracked rejection in RejectionCollector`

**Actual Result**: _[To be filled during testing]_

---

## Test 2: Rejection Across Document Changes

**Purpose**: Verify that rejections persist even when document is edited (tests edit rebasing)

**Steps**:
1. In the same file, type: `function greet() {`
2. Get a suggestion and press `Esc` to reject
3. Add 5-10 lines of other code above this line
4. Go back to the `greet` function context
5. Try to trigger the same suggestion

**Expected Result**:
- ✅ The rejected suggestion should still be blocked
- ✅ Log shows: `⛔ Edit was previously rejected, skipping`

**Actual Result**: _[To be filled during testing]_

---

## Test 3: Cache Hit Rejection

**Purpose**: Verify that cached suggestions can be rejected and blocked

**Steps**:
1. Type something that triggers a suggestion (e.g., `const name = `)
2. Accept it by pressing Tab
3. Undo (Cmd+Z)
4. Type the same thing again (should come from cache)
5. Press `Esc` to reject
6. Undo and type again

**Expected Result**:
- ✅ Cached suggestion should be blocked
- ✅ Log shows: `⛔ Cached edit was previously rejected, skipping`

**Actual Result**: _[To be filled during testing]_

---

## Test 4: Normalization Works

**Purpose**: Verify that edit normalization matches variations of same edit

**Steps**:
1. Type: `function test() {`
2. Get a suggestion like `\n  return 42;\n}`
3. Reject it with `Esc`
4. Type again with slight variation in whitespace

**Expected Result**:
- ✅ Similar suggestion should still be blocked (normalization removes prefix/suffix)
- ✅ Log shows rejection was tracked with normalized edit

**Actual Result**: _[To be filled during testing]_

---

## Test 5: LRU Eviction (Advanced)

**Purpose**: Verify that old rejections are eventually forgotten

**Steps**:
1. Open 21 different files
2. In each file, reject a different suggestion
3. Go back to the 1st file and try to trigger the same suggestion

**Expected Result**:
- ✅ After the 21st file, the 1st rejection should be evicted
- ✅ The suggestion from file 1 should appear again

**Note**: This is hard to test manually and would be better suited for automated testing

**Actual Result**: _[To be filled during testing]_

---

## How to View Logs

### Option 1: Developer Console (Recommended)

1. In Puku Editor, press `Cmd+Shift+I` (or `Cmd+Option+I`)
2. Go to Console tab
3. Filter by typing: `PukuNesNextEdit`
4. Look for rejection-related messages

### Option 2: Extension Host Output

1. View → Output (or `Cmd+Shift+U`)
2. Select "Extension Host" from dropdown
3. Look for messages with `[PukuNesNextEdit]`

### Option 3: Log Service Trace

1. Open Command Palette (`Cmd+Shift+P`)
2. Type: "Developer: Set Log Level"
3. Select "Trace" for verbose logging
4. Check Output panel

---

## Expected Log Messages

### When Initializing:
```
[PukuNesNextEdit] Provider initialized with adaptive delayer, NextEditCache, and RejectionCollector
```

### When Rejecting:
```
[PukuNesNextEdit] NES suggestion rejected (requestId: xxx)
[PukuNesNextEdit] Tracked rejection in RejectionCollector
```

### When Blocking (API Result):
```
[PukuNesNextEdit][xxx] ⛔ Edit was previously rejected, skipping
```

### When Blocking (Cached Result):
```
[PukuNesNextEdit][xxx] ⛔ Cached edit was previously rejected, skipping
```

---

## Success Criteria

- ✅ Rejected suggestions don't re-appear in same context
- ✅ Rejections persist across document edits
- ✅ Rejections work with both cached and fresh API results
- ✅ Edit normalization correctly identifies similar edits
- ✅ No crashes or errors in console
- ✅ Memory usage stays reasonable (check Task Manager/Activity Monitor)
- ✅ Old rejections are evicted after 20 documents (LRU)

---

## Known Limitations

1. **Document Close**: Rejections are cleared when document is closed
2. **Document Rename**: Rejections are tracked by URI, so renaming clears them
3. **Max Documents**: Only tracks last 20 documents (LRU eviction)
4. **Rebase Failure**: If edit can't be rebased after document change, rejection is removed

---

## Troubleshooting

### Issue: Suggestions still appearing after rejection

**Check**:
- Is the suggestion exactly the same? (Use logs to compare)
- Is normalization working? (Check if prefix/suffix was removed)
- Was the document closed/reopened?

**Solution**:
- Check trace logs for `isRejected` calls
- Verify edit equality in logs

### Issue: No log messages appearing

**Check**:
- Is log level set to Info or Trace?
- Is the correct output channel selected?
- Is the extension loaded?

**Solution**:
- Set log level to Trace
- Check "Extension Host" output channel
- Verify extension is active in Extensions panel

---

## Integration Points

The RejectionCollector is integrated at:

1. **`PukuNesNextEditProvider.constructor()`** (line 118-120)
   - Initializes with `ObservableWorkspace` and trace function

2. **`PukuNesNextEditProvider.getNextEdit()`** (lines 163-166, 270-273)
   - Checks cached edits before returning
   - Checks API results before returning

3. **`PukuNesNextEditProvider.handleRejection()`** (lines 503-504)
   - Tracks rejections using `_rejectionCollector.reject()`

---

## Reference

- **Implementation**: `src/extension/inlineEdits/common/rejectionCollector.ts`
- **PRD**: `docs/prd/rejection-collector-prd.md`
- **Architecture**: `docs/architecture/rejection-collector-architecture.md`
- **GitHub Issue**: #130
