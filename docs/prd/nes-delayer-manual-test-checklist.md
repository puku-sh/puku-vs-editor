# NES Delayer System - Manual Testing Checklist

**Test Duration**: ~15 minutes
**Tester**: _____________
**Date**: _____________
**Build Version**: _____________

---

## Pre-Test Setup

### 1. Build and Launch Extension

```bash
cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor
make compile-extension
./launch.sh
```

**Expected**: ✅ Extension launches without errors

### 2. Enable Developer Tools

1. In the launched VS Code window: `Help > Toggle Developer Tools`
2. Click **Console** tab
3. Clear console (trash icon)

**Expected**: ✅ Console is open and clear

### 3. Create Test File

1. Create new file: `test-delayer.ts`
2. Set language to TypeScript

**Expected**: ✅ File is ready for testing

---

## Test Suite 1: Baseline Behavior

### Test 1.1: Initial Delay (No History)

**Objective**: Verify initial delay is ~500ms

**Steps**:
1. Type: `function hello() {`
2. Stop typing
3. Start a timer (or note the time)
4. Wait for NES suggestion to appear

**Expected Results**:
- [ ] Suggestion appears after approximately **500ms** (±100ms tolerance)
- [ ] Console shows: `[PukuNesNextEdit] Returning NES suggestion` or similar

**Actual Results**:
- Delay observed: _______ ms
- Suggestion appeared: [ ] Yes [ ] No
- Notes: _______________________________________________

---

## Test Suite 2: Acceptance Behavior (Delay Decreases)

### Test 2.1: Single Acceptance

**Objective**: Verify delay decreases after accepting a suggestion

**Steps**:
1. Type: `function add(a: number, b: number) {`
2. Wait for suggestion to appear
3. Press **TAB** to accept the suggestion
4. Move to next line (press Enter)
5. Type: `function subtract(a: number, b: number) {`
6. Note the time until next suggestion appears

**Expected Results**:
- [ ] Second suggestion appears **faster** than first (~400ms vs 500ms)
- [ ] Console shows: `[PukuNesNextEdit] NES suggestion accepted`

**Actual Results**:
- First delay: _______ ms
- Second delay: _______ ms
- Faster? [ ] Yes [ ] No
- Notes: _______________________________________________

### Test 2.2: Multiple Acceptances (Progressive Speed-up)

**Objective**: Verify delay keeps decreasing with more acceptances

**Steps**:
1. Accept 3 suggestions in a row (press TAB each time)
2. Record delay for each:
   - Suggestion 1: _______ ms (~500ms expected)
   - Suggestion 2: _______ ms (~400ms expected)
   - Suggestion 3: _______ ms (~320ms expected)
   - Suggestion 4: _______ ms (~256ms expected)

**Expected Results**:
- [ ] Each delay is **less than** the previous
- [ ] Final delay is approximately **256ms** (about half of initial)

**Actual Results**:
- Progressive decrease observed: [ ] Yes [ ] No
- Notes: _______________________________________________

---

## Test Suite 3: Rejection Behavior (Delay Increases)

### Test 3.1: Single Rejection

**Objective**: Verify delay increases after rejecting a suggestion

**Steps**:
1. Type: `const x = 123;`
2. Wait for suggestion to appear
3. Press **ESC** to reject (or just keep typing different code)
4. Move to next line
5. Type: `const y = 456;`
6. Note the time until next suggestion appears

**Expected Results**:
- [ ] Second suggestion appears **slower** than baseline (~750ms vs 500ms)
- [ ] Console shows: `[PukuNesNextEdit] NES suggestion rejected`

**Actual Results**:
- First delay: _______ ms
- Second delay: _______ ms
- Slower? [ ] Yes [ ] No
- Notes: _______________________________________________

### Test 3.2: Multiple Rejections (Progressive Slow-down)

**Objective**: Verify delay keeps increasing with more rejections

**Steps**:
1. Reject 4 suggestions in a row (press ESC or keep typing each time)
2. Record delay for each:
   - Suggestion 1: _______ ms (~500ms expected)
   - Suggestion 2: _______ ms (~750ms expected)
   - Suggestion 3: _______ ms (~1125ms expected)
   - Suggestion 4: _______ ms (~1687ms expected)
   - Suggestion 5: _______ ms (~2531ms expected)

**Expected Results**:
- [ ] Each delay is **greater than** the previous
- [ ] Delay does NOT exceed **3000ms** (max cap)

**Actual Results**:
- Progressive increase observed: [ ] Yes [ ] No
- Max delay capped at 3000ms: [ ] Yes [ ] No [ ] N/A
- Notes: _______________________________________________

---

## Test Suite 4: Mixed Behavior

### Test 4.1: Accept Then Reject

**Objective**: Verify system handles mixed actions correctly

**Steps**:
1. Accept 2 suggestions (TAB, TAB)
2. Note delay after 2nd acceptance: _______ ms (~320ms expected)
3. Reject next suggestion (ESC)
4. Note delay after rejection: _______ ms (~480ms expected)

**Expected Results**:
- [ ] Delay increased from ~320ms to ~480ms after rejection
- [ ] System adapts to changing user behavior

**Actual Results**:
- Delay before rejection: _______ ms
- Delay after rejection: _______ ms
- Adapted correctly: [ ] Yes [ ] No
- Notes: _______________________________________________

### Test 4.2: Reject Then Accept

**Objective**: Verify recovery from rejections

**Steps**:
1. Reject 2 suggestions (ESC, ESC)
2. Note delay after 2nd rejection: _______ ms (~1125ms expected)
3. Accept next suggestion (TAB)
4. Note delay after acceptance: _______ ms (~900ms expected)

**Expected Results**:
- [ ] Delay decreased from ~1125ms to ~900ms after acceptance
- [ ] System recovers from rejection pattern

**Actual Results**:
- Delay before acceptance: _______ ms
- Delay after acceptance: _______ ms
- Recovered correctly: [ ] Yes [ ] No
- Notes: _______________________________________________

---

## Test Suite 5: Time Decay

### Test 5.1: Action History Decay (10 Minutes)

**Objective**: Verify old actions decay and delay resets

**Note**: This test takes 10+ minutes. Can be shortened by modifying `DEBOUNCE_DECAY_TIME_MS` in delayer.ts to 60000 (1 minute) for testing.

**Steps**:
1. Reject 3 suggestions to increase delay to ~1687ms
2. Wait 10 minutes (or 1 minute if using modified code)
3. Type new code
4. Note delay: _______ ms

**Expected Results**:
- [ ] Delay has **reset** to baseline (~500ms)
- [ ] Old rejections no longer affect delay

**Actual Results**:
- Delay after 10 min: _______ ms
- Reset to baseline: [ ] Yes [ ] No
- Notes: _______________________________________________

**Skip this test**: [ ] (Check if time-constrained)

---

## Test Suite 6: Edge Cases

### Test 6.1: Rapid Actions (Stress Test)

**Objective**: Verify system handles rapid accept/reject sequences

**Steps**:
1. Quickly accept 5 suggestions (TAB, TAB, TAB, TAB, TAB)
2. Immediately reject 5 suggestions (ESC, ESC, ESC, ESC, ESC)
3. Accept 3 more suggestions

**Expected Results**:
- [ ] System remains stable (no crashes)
- [ ] Delay adapts smoothly to rapid changes
- [ ] No errors in console

**Actual Results**:
- System stable: [ ] Yes [ ] No
- Errors observed: [ ] Yes [ ] No
- Notes: _______________________________________________

### Test 6.2: Action History Limit (Max 10)

**Objective**: Verify only last 10 actions are tracked

**Steps**:
1. Accept 15 suggestions in a row
2. Note final delay: _______ ms

**Expected Results**:
- [ ] Delay reaches minimum (**50ms**) and stays there
- [ ] Does NOT go below 50ms (MIN_DEBOUNCE_TIME)

**Actual Results**:
- Final delay: _______ ms
- Clamped to minimum: [ ] Yes [ ] No
- Notes: _______________________________________________

### Test 6.3: Maximum Delay Cap

**Objective**: Verify delay never exceeds 3000ms

**Steps**:
1. Reject 10 suggestions in a row
2. Note final delay: _______ ms

**Expected Results**:
- [ ] Delay reaches maximum (**3000ms**) and stays there
- [ ] Does NOT exceed 3000ms (MAX_DEBOUNCE_TIME)

**Actual Results**:
- Final delay: _______ ms
- Capped at maximum: [ ] Yes [ ] No
- Notes: _______________________________________________

---

## Test Suite 7: Console Logging (Optional)

### Test 7.1: Verify Logs Are Present

**Objective**: Verify delayer logs are working

**Steps**:
1. Open Developer Tools Console
2. Filter for: `[PukuNesNextEdit]` or `[Delayer]`
3. Accept a suggestion

**Expected Results**:
- [ ] Console shows acceptance log
- [ ] Console shows delay calculation (if logging added)

**Actual Results**:
- Logs visible: [ ] Yes [ ] No
- Notes: _______________________________________________

---

## Test Results Summary

### Pass/Fail Counts

| Test Suite | Pass | Fail | Skip |
|------------|------|------|------|
| 1. Baseline | ____ | ____ | ____ |
| 2. Acceptance | ____ | ____ | ____ |
| 3. Rejection | ____ | ____ | ____ |
| 4. Mixed | ____ | ____ | ____ |
| 5. Time Decay | ____ | ____ | ____ |
| 6. Edge Cases | ____ | ____ | ____ |
| 7. Logging | ____ | ____ | ____ |
| **TOTAL** | ____ | ____ | ____ |

### Overall Assessment

**Delayer System Working Correctly?**: [ ] Yes [ ] No [ ] Partial

**Critical Issues Found**:
- _________________________________________________________________
- _________________________________________________________________
- _________________________________________________________________

**Minor Issues Found**:
- _________________________________________________________________
- _________________________________________________________________
- _________________________________________________________________

**Recommendations**:
- _________________________________________________________________
- _________________________________________________________________
- _________________________________________________________________

---

## Appendix A: Quick Reference

### Expected Delays by Action Count

| Actions | Accepts | Rejects | Expected Delay |
|---------|---------|---------|----------------|
| 0 | - | - | 500ms (baseline) |
| 1 | ✓ | - | 400ms |
| 2 | ✓✓ | - | 320ms |
| 3 | ✓✓✓ | - | 256ms |
| 1 | - | ✗ | 750ms |
| 2 | - | ✗✗ | 1125ms |
| 3 | - | ✗✗✗ | 1687ms |
| 4 | - | ✗✗✗✗ | 2531ms |
| 5+ | - | ✗✗✗✗✗ | 3000ms (capped) |

### Formula Reference

```
multiplier = 1

for each action:
  decayFactor = e^(-timeSinceAction / 10min)
  weight = action.kind === 'rejected' ? 1.5 : 0.8
  multiplier *= 1 + ((weight - 1) * decayFactor)

delay = baseDelay (500ms) * multiplier
delay = clamp(delay, 50ms, 3000ms)
```

---

## Appendix B: Troubleshooting

### Issue: Suggestions Not Appearing

**Possible Causes**:
1. NES not enabled in settings
2. Wrong file type (NES works best with TypeScript/JavaScript)
3. Extension not loaded

**Solutions**:
1. Check settings: `"github.copilot.inlineEdits.enabled": true`
2. Try a `.ts` or `.js` file
3. Reload window: `Cmd+Shift+P` → "Reload Window"

### Issue: Cannot Measure Delay Accurately

**Solution**: Add console logging to `getNextEdit()`:

```typescript
const start = Date.now();
const session = this._delayer.createDelaySession(start);
console.log(`[Delayer] Delay: ${session.getDebounceTime()}ms`);
await new Promise(resolve => setTimeout(resolve, session.getDebounceTime()));
console.log(`[Delayer] Elapsed: ${Date.now() - start}ms`);
```

### Issue: Delays Don't Match Expected Values

**Note**: Delays are **approximate** and may vary by ±50-100ms due to:
- JavaScript event loop timing
- VS Code rendering delays
- Network latency (if using remote backend)

**Tolerance**: ±100ms is acceptable

---

## Sign-off

**Tester Name**: ____________________
**Signature**: ____________________
**Date**: ____________________

**QA Lead Approval**: ____________________
**Date**: ____________________

---

**Related Documents**:
- [NES Delayer System PRD](./nes-delayer-system.md)
- [NES Delayer Testing Guide](./nes-delayer-testing-guide.md)
