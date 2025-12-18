# DiagnosticsProvider Manual Testing Guide

**Issue**: #131 DiagnosticsProvider
**Date**: 2024-12-18
**Status**: Ready for Testing

---

## Overview

This guide provides step-by-step instructions to manually test the instant diagnostic-based inline suggestions feature after integrating the reference `DiagnosticsNextEditProvider`.

**Expected Improvements**:
- ✅ <10ms latency (vs ~1000ms API-based)
- ✅ Zero API cost for diagnostic fixes
- ✅ 60%+ win rate in 3-way racing
- ✅ Instant import and async/await suggestions

---

## Prerequisites

1. **Build Extension**:
   ```bash
   cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor
   make compile-extension
   ```

2. **Launch Puku Editor**:
   ```bash
   ./launch.sh
   ```

3. **Enable Verbose Logging** (Optional):
   - Open Settings (Cmd+,)
   - Search for "puku.trace"
   - Set to "verbose"
   - Check "Puku AI" output panel for detailed logs

---

## Test 1: TypeScript Missing Import Suggestion

### Setup

1. Create new TypeScript file: `test-imports.ts`
2. Ensure TypeScript language server is active

### Test Steps

**Step 1.1: Missing React Import**
```typescript
// test-imports.ts
function MyComponent() {
	return <div>Hello World</div>;
}
```

**Expected Result**:
- Instant inline suggestion appears (<10ms)
- Suggestion: Add `import React from 'react';` at top
- Suggestion appears as ghost text or inline completion

**Step 1.2: Missing Type Import**
```typescript
// test-imports.ts
function processUser(user: User) {
	console.log(user.name);
}
```

**Expected Result**:
- Instant suggestion: `import { User } from './types';`
- Or suggestion to define `User` type locally

**Step 1.3: Missing Multiple Imports**
```typescript
// test-imports.ts
const doc = new Document();
const parser = new Parser();
```

**Expected Result**:
- Suggestion for first missing import (`Document`)
- After accepting, suggestion for second import (`Parser`)

### Success Criteria
- [ ] Suggestions appear instantly (<10ms perceived latency)
- [ ] Suggestions are accurate and match VS Code quick fixes
- [ ] Accepting suggestion resolves the diagnostic error
- [ ] No API calls to backend (check network tab or logs)

---

## Test 2: async/await Missing Keyword Suggestion

### Setup

1. Create new TypeScript file: `test-async.ts`
2. Define a Promise-returning function

### Test Steps

**Step 2.1: Missing await Keyword**
```typescript
// test-async.ts
async function fetchData(): Promise<string> {
	return new Promise(resolve => setTimeout(() => resolve('data'), 1000));
}

function processData() {
	const data = fetchData(); // Error: missing await
	console.log(data);
}
```

**Expected Result**:
- Instant inline suggestion: Add `await` before `fetchData()`
- Suggestion: `const data = await fetchData();`

**Step 2.2: Missing async Keyword on Function**
```typescript
// test-async.ts
function processData() {
	const data = await fetchData(); // Error: await requires async function
	console.log(data);
}
```

**Expected Result**:
- Instant suggestion: Make function `async`
- Suggestion: `async function processData() {`

**Step 2.3: Promise.then() → async/await Refactor**
```typescript
// test-async.ts
function getData() {
	fetchData().then(data => {
		console.log(data);
	});
}
```

**Expected Result**:
- Suggestion to convert to async/await (if language server provides this)
- Or no suggestion (acceptable, as this is a stylistic choice)

### Success Criteria
- [ ] Missing `await` suggestions appear instantly
- [ ] Missing `async` suggestions appear instantly
- [ ] Suggestions resolve diagnostic errors
- [ ] No lag or flickering during suggestion display

---

## Test 3: Racing System Performance

### Setup

1. Create TypeScript file with intentional errors
2. Enable verbose logging to see race winner

### Test Steps

**Step 3.1: Diagnostic vs FIM Race**
```typescript
// test-racing.ts
function calculateTotal(items: Item[]) {
	return items.reduce((sum, item) => sum + item.price, 0);
	// Type 'I' to trigger both FIM and diagnostics
}
```

**Expected Behavior**:
- DiagnosticsProvider should win when diagnostic is available
- FIM should win when typing new code without errors
- Check logs for race timing:
  ```
  [DiagnosticsProvider] Completed in 5ms
  [FimProvider] Completed in 850ms
  [Race Winner] DiagnosticsProvider
  ```

**Step 3.2: No Diagnostic Available**
```typescript
// test-racing.ts
function newFunc() {
	// Start typing here - no diagnostic error
	con|
}
```

**Expected Behavior**:
- FIM should provide suggestions (since no diagnostic)
- DiagnosticsProvider returns empty result quickly
- No conflict or flickering between providers

### Success Criteria
- [ ] DiagnosticsProvider wins race when diagnostic available (~60%+ win rate)
- [ ] FIM still works when no diagnostic available
- [ ] No flickering or suggestion conflicts
- [ ] Logs show correct race timing (<10ms for diagnostics)

---

## Test 4: Edit Rebasing (Document Changes)

### Setup

1. Create TypeScript file with diagnostic error
2. Trigger diagnostic suggestion
3. Modify document while suggestion is active

### Test Steps

**Step 4.1: Insert Lines Before Error**
```typescript
// test-rebasing.ts
const result = myFunction(); // Error: myFunction not defined

// Diagnostic suggestion appears: "import { myFunction } from '...'"

// Now insert blank lines ABOVE the error:


const result = myFunction(); // Suggestion should update to new line number
```

**Expected Result**:
- Diagnostic suggestion range updates automatically
- Suggestion remains valid and applicable
- No stale or incorrect suggestions

**Step 4.2: Edit Line with Error**
```typescript
// test-rebasing.ts
const x = undefinedVar; // Suggestion: import undefinedVar

// Edit the line:
const x = undefinedVar + 5; // Suggestion should still work or disappear if invalid
```

**Expected Result**:
- Suggestion adapts to edit if still valid
- Or suggestion disappears if edit makes it invalid

### Success Criteria
- [ ] Suggestions update ranges when document changes
- [ ] No stale suggestions pointing to wrong lines
- [ ] Accepting rebased suggestion applies correctly

---

## Test 5: Rejection Tracking (RejectionCollector Integration)

### Setup

1. Create TypeScript file with diagnostic error
2. Trigger diagnostic suggestion

### Test Steps

**Step 5.1: Reject Suggestion (Escape Key)**
```typescript
// test-rejection.ts
const doc = new Document(); // Error: Cannot find name 'Document'

// Diagnostic suggestion appears
// Press Escape to reject
```

**Expected Result**:
- Suggestion disappears
- RejectionCollector records rejection
- Same suggestion doesn't reappear immediately for same error

**Step 5.2: Reject by Typing Over**
```typescript
// test-rejection.ts
const doc = new Document(); // Suggestion appears

// Start typing different code instead of accepting:
const doc = {}; // Typed over suggestion
```

**Expected Result**:
- Suggestion is implicitly rejected
- Rejection tracked by RejectionCollector

**Step 5.3: Accept Suggestion (Tab Key)**
```typescript
// test-rejection.ts
const doc = new Document(); // Suggestion appears

// Press Tab to accept
```

**Expected Result**:
- Suggestion accepted and applied
- Not tracked as rejection
- Diagnostic error resolved

### Success Criteria
- [ ] Rejections are tracked (check logs if verbose enabled)
- [ ] Accepted suggestions are not tracked as rejections
- [ ] RejectionCollector prevents suggestion spam

---

## Test 6: Cross-Language Support

### Test Steps

**Step 6.1: JavaScript Missing Import**
```javascript
// test.js
const doc = new Document(); // Missing import
```

**Expected**: Instant suggestion (if language server supports it)

**Step 6.2: Python Missing Import** (if supported)
```python
# test.py
from typing import List

def process(items: MyType):  # Missing import
    pass
```

**Expected**: Suggestion if Python language server provides diagnostics

**Step 6.3: Rust Missing Import** (if supported)
```rust
// test.rs
fn main() {
    let doc = Document::new(); // Missing use statement
}
```

**Expected**: Suggestion if Rust analyzer provides diagnostics

### Success Criteria
- [ ] TypeScript support confirmed (primary)
- [ ] JavaScript support confirmed
- [ ] Other languages work if language server provides diagnostics

---

## Test 7: Performance Validation

### Methodology

1. Enable verbose logging
2. Trigger 10 diagnostic suggestions
3. Record latency for each
4. Calculate average and percentiles

### Test Steps

**Step 7.1: Measure Latency**
```typescript
// Trigger suggestions and check logs:
const a = Foo(); // Check log: [DiagnosticsProvider] Completed in Xms
const b = Bar(); // Check log again
const c = Baz(); // Repeat 10 times
```

**Step 7.2: Check Output Panel**
```
Search for:
[DiagnosticsProvider] Completed in Xms
[Race Winner] DiagnosticsProvider
```

### Success Criteria
- [ ] Average latency <10ms
- [ ] P95 latency <20ms
- [ ] Zero API calls (check network or backend logs)
- [ ] Win rate >50% when diagnostic available

---

## Test 8: Rollback Validation (If Issues Found)

### Rollback Steps

If issues are encountered and rollback is needed:

```bash
cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat/src/extension/pukuai/vscode-node/providers

# Restore backup
mv pukuDiagnosticsNextEditProvider.backup.ts pukuDiagnosticsNextEditProvider.ts
```

**Then revert code changes**:

1. Revert `pukuaiContribution.ts`:
   - Change import back to `./providers/pukuDiagnosticsNextEditProvider`
   - Change instantiation back to `createInstance(PukuDiagnosticsNextEditProvider)`

2. Revert `pukuUnifiedInlineProvider.ts`:
   - Change import back to `./providers/pukuDiagnosticsNextEditProvider`
   - Change type back to `PukuDiagnosticsNextEditProvider`

3. Recompile:
   ```bash
   make compile-extension
   ```

### Rollback Verification
- [ ] Extension compiles successfully
- [ ] API-based diagnostics work as before
- [ ] No regression in other features

---

## Test Results Summary

### Environment
- **OS**: macOS / Linux / Windows
- **VS Code Version**:
- **Puku Editor Version**: 0.43.28
- **Test Date**:

### Performance Metrics

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Average Latency | <10ms | ___ms | ☐ Pass ☐ Fail |
| P95 Latency | <20ms | ___ms | ☐ Pass ☐ Fail |
| Win Rate (diagnostics available) | >50% | __% | ☐ Pass ☐ Fail |
| API Calls | 0 | ___ | ☐ Pass ☐ Fail |

### Feature Tests

| Test | Status | Notes |
|------|--------|-------|
| TypeScript Missing Import | ☐ Pass ☐ Fail | |
| async/await Keywords | ☐ Pass ☐ Fail | |
| Racing System | ☐ Pass ☐ Fail | |
| Edit Rebasing | ☐ Pass ☐ Fail | |
| Rejection Tracking | ☐ Pass ☐ Fail | |
| Cross-Language | ☐ Pass ☐ Fail | |

### Issues Encountered

1. **Issue**:
   - **Severity**: Critical / Major / Minor
   - **Reproducible**: Yes / No
   - **Workaround**:

2. **Issue**:
   - **Severity**: Critical / Major / Minor
   - **Reproducible**: Yes / No
   - **Workaround**:

### Overall Assessment

- ☐ **Ready for Production** - All tests passed
- ☐ **Needs Minor Fixes** - Most tests passed, minor issues found
- ☐ **Needs Major Fixes** - Critical issues found
- ☐ **Rollback Required** - Feature not working as expected

### Recommendations

1.
2.
3.

---

## Troubleshooting

### No Suggestions Appearing

**Possible Causes**:
1. Language server not active (check status bar)
2. Diagnostic provider not instantiated (check logs)
3. VS Code diagnostics API not providing quick fixes

**Debug Steps**:
```typescript
// Enable verbose logging
// Check output panel for:
[DiagnosticsProvider] getNextEdit called
[DiagnosticsProvider] Found X diagnostics
[DiagnosticsProvider] Completed in Xms
```

### Suggestions Too Slow

**Possible Causes**:
1. Still using old API-based provider (check imports)
2. Language server slow (unrelated to our code)
3. Racing logic delay

**Debug Steps**:
- Check logs for which provider won race
- Verify compilation successful with new imports
- Check VS Code diagnostic performance

### Wrong Suggestions

**Possible Causes**:
1. Language server providing incorrect quick fixes
2. Diagnostic range calculation off
3. Edit rebasing issue

**Debug Steps**:
- Compare with VS Code's built-in quick fix (Cmd+.)
- Check diagnostic range in logs
- Test after document changes

---

## References

- **PRD**: `docs/prd/diagnostics-provider-prd.md`
- **Architecture**: `docs/architecture/diagnostics-provider-architecture.md`
- **Implementation**: `docs/implementation/diagnostics-provider-integration.md`
- **Status**: `docs/status/diagnostics-provider-status.md`
- **Reference Code**: `src/chat/src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts`
