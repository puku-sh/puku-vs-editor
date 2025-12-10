# Testing Guide: Rejection Tracking (Issue #56)

**Feature**: Block re-showing of rejected inline completions
**Status**: ✅ Implemented, ready for testing
**Test Time**: ~15 minutes

---

## Quick Start

### 1. Build & Launch

```bash
# Terminal 1: Build extension
cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat
npm run compile

# Press F5 in VS Code to launch debug instance
# Or use: "Launch Puku Editor Extension - Watch Mode"
```

### 2. Open DevTools Console

In the debug instance:
- **Help → Toggle Developer Tools**
- Switch to **Console** tab
- Filter logs: Type `PukuUnified` or `Rejection` in search box

---

## Test Suite

### ✅ Test 1: Explicit Rejection (ESC Key)

**Goal**: Verify completions don't reappear after ESC

**Steps**:

1. **Create test file** `test-rejection.ts`:
   ```typescript
   function calculateSum(a: number, b: number) {
       // Type "ret" here
   }
   ```

2. **Trigger completion**:
   - Place cursor after `//` comment
   - Type: `ret`
   - Wait 800ms for completion

3. **Expected**: Ghost text appears:
   ```typescript
   function calculateSum(a: number, b: number) {
       return a + b;  // ← Ghost text
   }
   ```

4. **Reject**: Press **ESC** key

5. **Check console**:
   ```
   [PukuUnifiedProvider] handleEndOfLifetime: Rejected
   [RejectionCollector] Rejected completion at test-rejection.ts:2:4
   ```

6. **Re-trigger**: Delete `ret` and type `ret` again

7. **Expected**: NO ghost text

8. **Check console**:
   ```
   [PukuUnifiedProvider] ⛔ Blocking previously rejected completion
   [RejectionCollector] ⛔ Blocking previously rejected completion at test-rejection.ts:2:4
   ```

**✅ PASS**: Completion blocked after rejection

---

### ✅ Test 2: Acceptance (TAB Key)

**Goal**: Verify accepted completions can be shown again

**Steps**:

1. **New function**:
   ```typescript
   function multiply(x: number, y: number) {
       // Type "ret" here
   }
   ```

2. **Trigger completion**: Type `ret`

3. **Accept**: Press **TAB** key

4. **Check console**:
   ```
   [PukuUnifiedProvider] handleEndOfLifetime: Accepted
   [PukuUnifiedProvider] ✅ Completion accepted
   ```

5. **Undo**: Press **Cmd+Z** (Mac) or **Ctrl+Z** (Windows/Linux)

6. **Re-trigger**: Type `ret` again

7. **Expected**: Ghost text APPEARS (acceptance doesn't block)

**✅ PASS**: Accepted completions can be shown again

---

### ✅ Test 3: Ignored (Typing Over)

**Goal**: Verify typing different text doesn't count as rejection

**Steps**:

1. **New function**:
   ```typescript
   function divide(a: number, b: number) {
       // Type "ret" here
   }
   ```

2. **Trigger completion**: Type `ret`

3. **Type different text**: Type `const result = a / b;`
   - **DON'T** press TAB or ESC
   - Just keep typing different text

4. **Check console**:
   ```
   [PukuUnifiedProvider] handleEndOfLifetime: Ignored
   [PukuUnifiedProvider] 🔄 Completion ignored (superseded or timeout)
   ```

5. **Undo**: Clear the line

6. **Re-trigger**: Type `ret` again

7. **Expected**: Ghost text APPEARS (ignored ≠ rejected)

**✅ PASS**: Ignored completions can be shown again

---

### ✅ Test 4: Position Specificity

**Goal**: Verify rejections are position-specific

**Steps**:

1. **Create multi-line function**:
   ```typescript
   function subtract(a: number, b: number) {
       // Line 2: Type "ret" here

       // Line 4: Type "ret" here
   }
   ```

2. **Trigger at Line 2**: Type `ret` at line 2

3. **Reject**: Press **ESC**

4. **Check console**:
   ```
   [RejectionCollector] Rejected completion at test-rejection.ts:2:4
   ```

5. **Move to Line 4**: Type `ret` at line 4

6. **Expected**: Ghost text APPEARS (different position = different completion)

7. **Check console**: NO blocking message

**✅ PASS**: Rejections are position-specific

---

### ✅ Test 5: Prefix Matching

**Goal**: Verify partial completions are also blocked

**Steps**:

1. **New function**:
   ```typescript
   function formatUser(user: User) {
       // Type "ret" here
   }
   ```

2. **Trigger long completion**: Type `ret`
   - Ghost text: `return user.name + " (" + user.email + ")";`

3. **Reject**: Press **ESC**

4. **Trigger partial**: Type `ret` again
   - If completion is shorter: `return user.name;`

5. **Expected**: Blocked (prefix match)

6. **Check console**:
   ```
   [PukuUnifiedProvider] ⛔ Blocking previously rejected completion
   ```

**✅ PASS**: Prefix matching works

---

### ✅ Test 6: Cross-Document

**Goal**: Verify rejections are document-specific

**Steps**:

1. **In File A** (`math.ts`):
   ```typescript
   function add(a: number, b: number) {
       ret  // Reject this
   }
   ```

2. **Reject completion**: Press **ESC**

3. **In File B** (`utils.ts`):
   ```typescript
   function concatenate(a: string, b: string) {
       ret  // Should show even though rejected in File A
   }
   ```

4. **Trigger completion**: Type `ret`

5. **Expected**: Ghost text APPEARS (different document)

**✅ PASS**: Rejections are document-specific

---

### ✅ Test 7: LRU Eviction

**Goal**: Verify LRU cache prevents memory leaks

**Steps**:

1. **Reject 21 completions** at different positions:
   ```typescript
   function test() {
       ret  // Position 1 - Reject
       ret  // Position 2 - Reject
       ret  // Position 3 - Reject
       // ... (continue to 21 positions)
   }
   ```

2. **Check disposal stats**:
   - Reload window (Cmd+R)
   - Check console before disposal:
   ```
   [PukuUnifiedProvider] Rejection tracker stats on dispose: {
     documents: 1,
     totalRejections: 20  // ← Max 20, oldest evicted
   }
   ```

3. **Re-trigger first rejection**: Go back to position 1, type `ret`

4. **Expected**: Ghost text APPEARS (evicted from cache)

**✅ PASS**: LRU cache limits to 20 rejections

---

## Automated Console Log Checker

Use this script to verify logs:

```javascript
// Paste in Browser DevTools Console

// Test 1: Rejection
const testRejection = () => {
    console.log('🧪 TEST 1: Rejection Tracking');
    console.log('Instructions:');
    console.log('1. Type "ret" in a function');
    console.log('2. Press ESC when ghost text appears');
    console.log('3. Type "ret" again');
    console.log('Expected logs:');
    console.log('  ✓ handleEndOfLifetime: Rejected');
    console.log('  ✓ Rejected completion at ...');
    console.log('  ✓ ⛔ Blocking previously rejected completion');
};

// Test 2: Acceptance
const testAcceptance = () => {
    console.log('🧪 TEST 2: Acceptance Tracking');
    console.log('Instructions:');
    console.log('1. Type "ret" in a function');
    console.log('2. Press TAB when ghost text appears');
    console.log('Expected logs:');
    console.log('  ✓ handleEndOfLifetime: Accepted');
    console.log('  ✓ ✅ Completion accepted');
};

// Test 3: Ignored
const testIgnored = () => {
    console.log('🧪 TEST 3: Ignored Tracking');
    console.log('Instructions:');
    console.log('1. Type "ret" in a function');
    console.log('2. Keep typing different text (no TAB/ESC)');
    console.log('Expected logs:');
    console.log('  ✓ handleEndOfLifetime: Ignored');
    console.log('  ✓ 🔄 Completion ignored');
};

// Run all tests
const runAllTests = () => {
    testRejection();
    console.log('\n');
    testAcceptance();
    console.log('\n');
    testIgnored();
};

// Execute
runAllTests();
```

---

## Common Issues & Debugging

### Issue 1: Ghost text not appearing

**Symptom**: No completion shows when typing `ret`

**Debug**:
1. Check if Puku extension is active:
   ```
   CMD+SHIFT+P → "Puku: Show Status"
   ```

2. Check console for errors:
   ```
   Filter by: "PukuUnified"
   ```

3. Verify API key is set:
   ```
   CMD+SHIFT+P → "Preferences: Open Settings"
   Search: "puku api key"
   ```

**Fix**: Ensure Puku is running and API key is configured

---

### Issue 2: Rejection not blocking

**Symptom**: Completion reappears after ESC

**Debug**:
1. Check console logs for rejection:
   ```
   Expected: [RejectionCollector] Rejected completion at ...
   ```

2. If missing, check if `handleEndOfLifetime` is called:
   ```
   Expected: [PukuUnifiedProvider] handleEndOfLifetime: Rejected
   ```

3. Check VS Code version (requires 1.85+):
   ```
   CMD+SHIFT+P → "Help: About"
   ```

**Fix**: Ensure VS Code API supports `handleEndOfLifetime()`

---

### Issue 3: All completions blocked

**Symptom**: No completions show anywhere

**Debug**:
1. Check rejection count:
   ```
   CMD+SHIFT+P → "Developer: Reload Window"
   Check console on shutdown:
   [PukuUnifiedProvider] Rejection tracker stats: { totalRejections: X }
   ```

2. If count is high (>50), cache may be over-rejecting

**Fix**: Clear rejection cache:
```typescript
// In debug console
pukuProvider.rejectionCollector.clear();
```

---

## Expected Console Output

### Successful Rejection Flow

```
[PukuUnifiedProvider] provideInlineCompletionItems called {
  file: '/Users/dev/test-rejection.ts',
  line: 2,
  char: 4,
  isCycling: false
}
[PukuUnifiedProvider] ⚡ Calling model.getCompletion()...
[PukuUnifiedProvider] ⚡ Model returned: fim
[PukuUnifiedProvider] Returning 1 FIM completion(s) with forward stability

// User presses ESC
[PukuUnifiedProvider] handleEndOfLifetime: Rejected {
  textPreview: 'return a + b;',
  position: 'test-rejection.ts:2:4'
}
[PukuUnifiedProvider] ❌ Completion explicitly rejected (ESC key)
[RejectionCollector] Rejected completion at test-rejection.ts:2:4 {
  textPreview: 'return a + b;',
  totalRejections: 1
}

// User types "ret" again
[PukuUnifiedProvider] provideInlineCompletionItems called {
  file: '/Users/dev/test-rejection.ts',
  line: 2,
  char: 4,
  isCycling: false
}
[PukuUnifiedProvider] ⛔ Blocking previously rejected completion
[RejectionCollector] ⛔ Blocking previously rejected completion at test-rejection.ts:2:4
[PukuUnifiedProvider] No result from model
```

---

## Test Result Checklist

After running all tests:

- [ ] **Test 1**: Rejection blocks re-showing ✅
- [ ] **Test 2**: Acceptance allows re-showing ✅
- [ ] **Test 3**: Ignored allows re-showing ✅
- [ ] **Test 4**: Position-specific rejections ✅
- [ ] **Test 5**: Prefix matching works ✅
- [ ] **Test 6**: Cross-document independence ✅
- [ ] **Test 7**: LRU eviction prevents leaks ✅

**All tests passed**: ✅ Feature ready for production

**Some tests failed**: ❌ Review console logs and debug

---

## Performance Testing

### Memory Usage

**Test**: Reject 100 completions, check memory

**Steps**:
1. Open Chrome Task Manager (Shift+Esc in Chrome DevTools)
2. Find "Extension Host" process
3. Note initial memory
4. Reject 100 completions
5. Note final memory

**Expected**: <1MB increase (LRU cache limits to 20)

---

### Lookup Performance

**Test**: Measure `isRejected()` call time

**Steps**:
1. Paste in console:
   ```javascript
   const measure = () => {
       const start = performance.now();
       // Trigger completion check (internal)
       const end = performance.now();
       console.log(`isRejected() took ${end - start}ms`);
   };
   ```

**Expected**: <1ms per check (O(1) hash map)

---

## Telemetry Verification (TODO)

Once telemetry is implemented:

### Test Telemetry Events

1. **Rejection event**:
   ```bash
   curl https://api.puku.sh/v1/telemetry/events \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "event_name": "inline_completion.rejected",
       "properties": { "file": "test.ts", "language": "typescript" },
       "measurements": { "line": 2, "character": 4 },
       "timestamp": 1702234567890
     }'
   ```

2. **Check R2 storage**:
   ```bash
   wrangler r2 object get TELEMETRY/events/2025/12/10/session-123.json
   ```

---

## Cleanup After Testing

```bash
# Clear rejection cache
CMD+SHIFT+P → "Developer: Reload Window"

# Or programmatically
pukuProvider.rejectionCollector.clear();

# Check stats
pukuProvider.rejectionCollector.getStats();
// → { documents: 0, totalRejections: 0 }
```

---

## Reporting Issues

If you find bugs, report with:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Console logs** (paste full output)
5. **VS Code version** (CMD+SHIFT+P → "Help: About")
6. **Puku version** (from `package.json`)

**Example**:
```
**Bug**: Rejection not blocking re-showing

**Steps**:
1. Type "ret" at line 5
2. Press ESC
3. Type "ret" again at line 5

**Expected**: No ghost text
**Actual**: Ghost text appears

**Console logs**:
[PukuUnifiedProvider] handleEndOfLifetime: Rejected ✓
[RejectionCollector] Rejected completion... ✓
[PukuUnifiedProvider] ⛔ Blocking... ✗ (MISSING!)

**VS Code**: 1.85.2
**Puku**: 0.34.8
```

---

## Summary

**Test Time**: ~15 minutes for full suite

**Critical Tests**:
1. ✅ Test 1 (Rejection blocking) - **MUST PASS**
2. ✅ Test 2 (Acceptance allows) - **MUST PASS**
3. ✅ Test 7 (LRU eviction) - **MUST PASS**

**Nice-to-Have Tests**:
- Test 3-6 (edge cases)

**Ready for Production**: All critical tests pass + console logs confirm behavior

---

**Happy Testing! 🎉**
