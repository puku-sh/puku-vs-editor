# NES Delayer System - Testing Guide

**Related**: [NES Delayer System PRD](./nes-delayer-system.md)

## Quick Testing Overview

There are 3 ways to test the Delayer System:

1. **Manual Testing** - Use the extension and observe behavior
2. **Unit Tests** - Test the Delayer class directly
3. **Integration Tests** - Test with the full NES provider

## 1. Manual Testing (Recommended First)

### Setup

1. **Build and launch the extension**:
   ```bash
   cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor
   make compile-extension
   ./launch.sh
   ```

2. **Enable NES suggestions** in VS Code settings:
   ```json
   {
     "github.copilot.inlineEdits.enabled": true
   }
   ```

3. **Open a TypeScript/JavaScript file** for testing

### Test Case 1: Baseline Delay (No History)

**Goal**: Verify initial delay is ~500ms

**Steps**:
1. Create a new file: `test-delayer.ts`
2. Type: `function hello`
3. Stop typing and wait
4. **Expected**: NES suggestion appears after ~500ms

**How to measure**:
```typescript
// Add this to PukuNesNextEditProvider.getNextEdit() temporarily
const start = Date.now();
const session = this._delayer.createDelaySession(Date.now());
const delay = session.getDebounceTime();
this._logService.info(`[Delayer] Calculated delay: ${delay}ms`);
// ... rest of method

// At the end, log actual time
const elapsed = Date.now() - start;
this._logService.info(`[Delayer] Actual elapsed: ${elapsed}ms`);
```

**Check logs**:
- Open VS Code Developer Tools: `Help > Toggle Developer Tools`
- Console tab → Filter for "[Delayer]"
- Look for: `[Delayer] Calculated delay: 500ms`

### Test Case 2: Accepting Suggestions (Delay Decreases)

**Goal**: Verify delay decreases when user accepts suggestions

**Steps**:
1. Type: `function add(a, b`
2. Wait for NES suggestion to appear
3. **Press TAB** to accept the suggestion
4. Move to next line
5. Type: `function subtract(a, b`
6. **Expected**: Suggestion appears faster (~400ms)

**Repeat**:
7. Accept 2 more suggestions
8. **Expected**: Delay keeps decreasing (256ms → 205ms → 164ms)

**Verification**:
```bash
# Check logs for delay changes
# Developer Tools > Console > Filter: [Delayer]
```

You should see:
```
[Delayer] Calculated delay: 500ms  (initial)
[Delayer] Calculated delay: 400ms  (after 1 accept)
[Delayer] Calculated delay: 320ms  (after 2 accepts)
[Delayer] Calculated delay: 256ms  (after 3 accepts)
```

### Test Case 3: Rejecting Suggestions (Delay Increases)

**Goal**: Verify delay increases when user rejects suggestions

**Steps**:
1. Type: `const x = `
2. Wait for suggestion
3. **Press ESC** to reject (or just keep typing different code)
4. Move to next line
5. Type: `const y = `
6. **Expected**: Suggestion appears slower (~750ms)

**Repeat**:
7. Reject 2 more suggestions
8. **Expected**: Delay keeps increasing (1125ms → 1687ms → 2531ms → capped at 3000ms)

**Verification**:
```
[Delayer] Calculated delay: 500ms   (initial)
[Delayer] Calculated delay: 750ms   (after 1 reject)
[Delayer] Calculated delay: 1125ms  (after 2 rejects)
[Delayer] Calculated delay: 1687ms  (after 3 rejects)
```

### Test Case 4: Time Decay (Reset After 10 Minutes)

**Goal**: Verify old actions decay and delay resets

**Steps**:
1. Reject 3 suggestions (delay increases to ~1687ms)
2. Wait 10 minutes (or fast-forward system time for testing)
3. Type new code
4. **Expected**: Delay resets back to ~500ms

**Quick Test with Mock Time**:
Add temporary code to Delayer class:
```typescript
private _getExpectedTotalTime(baseDebounceTime: number): number {
	const DEBOUNCE_DECAY_TIME_MS = 60 * 1000; // 1 minute for testing (was 10 min)
	// ... rest of code
}
```

Then:
1. Reject 3 suggestions → delay increases
2. Wait 1 minute
3. Type new code → delay resets

### Test Case 5: Mixed Actions

**Goal**: Verify system handles mixed accept/reject

**Steps**:
1. Accept 2 suggestions (delay decreases to ~320ms)
2. Reject 1 suggestion (delay increases to ~480ms)
3. Accept 1 suggestion (delay decreases to ~384ms)
4. **Expected**: Delay adapts based on net effect

**Formula Check**:
- 2 accepts: multiplier = 0.8 × 0.8 = 0.64 → 320ms
- +1 reject: multiplier = 0.64 × 1.5 = 0.96 → 480ms
- +1 accept: multiplier = 0.96 × 0.8 = 0.768 → 384ms

## 2. Unit Tests

### Test File Location

Create: `src/chat/src/extension/pukuai/test/delayer.test.ts`

### Basic Unit Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Delayer, DelaySession } from '../common/delayer';

describe('Delayer', () => {
	let delayer: Delayer;

	beforeEach(() => {
		delayer = new Delayer(500, true);
	});

	describe('createDelaySession', () => {
		it('should return base delay when no actions recorded', () => {
			const session = delayer.createDelaySession(Date.now());
			const delay = session.getDebounceTime();

			expect(delay).toBeCloseTo(500, 10); // Within 10ms
		});

		it('should account for time already spent', async () => {
			const start = Date.now();
			const session = delayer.createDelaySession(start);

			// Wait 100ms
			await new Promise(resolve => setTimeout(resolve, 100));

			const delay = session.getDebounceTime();

			// Should be ~400ms (500ms - 100ms already spent)
			expect(delay).toBeCloseTo(400, 50);
		});
	});

	describe('handleAcceptance', () => {
		it('should decrease delay after acceptance', () => {
			const session1 = delayer.createDelaySession(Date.now());
			const delay1 = session1.getDebounceTime();

			delayer.handleAcceptance();

			const session2 = delayer.createDelaySession(Date.now());
			const delay2 = session2.getDebounceTime();

			expect(delay2).toBeLessThan(delay1);
		});

		it('should decrease delay progressively with multiple acceptances', () => {
			const delays: number[] = [];

			// Record baseline
			delays.push(delayer.createDelaySession(Date.now()).getDebounceTime());

			// Accept 3 times
			for (let i = 0; i < 3; i++) {
				delayer.handleAcceptance();
				const session = delayer.createDelaySession(Date.now());
				delays.push(session.getDebounceTime());
			}

			// Each delay should be less than previous
			expect(delays[1]).toBeLessThan(delays[0]); // ~400ms < 500ms
			expect(delays[2]).toBeLessThan(delays[1]); // ~320ms < 400ms
			expect(delays[3]).toBeLessThan(delays[2]); // ~256ms < 320ms
		});
	});

	describe('handleRejection', () => {
		it('should increase delay after rejection', () => {
			const session1 = delayer.createDelaySession(Date.now());
			const delay1 = session1.getDebounceTime();

			delayer.handleRejection();

			const session2 = delayer.createDelaySession(Date.now());
			const delay2 = session2.getDebounceTime();

			expect(delay2).toBeGreaterThan(delay1);
		});

		it('should increase delay progressively with multiple rejections', () => {
			const delays: number[] = [];

			delays.push(delayer.createDelaySession(Date.now()).getDebounceTime());

			for (let i = 0; i < 3; i++) {
				delayer.handleRejection();
				const session = delayer.createDelaySession(Date.now());
				delays.push(session.getDebounceTime());
			}

			expect(delays[1]).toBeGreaterThan(delays[0]); // ~750ms > 500ms
			expect(delays[2]).toBeGreaterThan(delays[1]); // ~1125ms > 750ms
			expect(delays[3]).toBeGreaterThan(delays[2]); // ~1687ms > 1125ms
		});

		it('should not exceed max delay (3000ms)', () => {
			// Reject 10 times
			for (let i = 0; i < 10; i++) {
				delayer.handleRejection();
			}

			const session = delayer.createDelaySession(Date.now());
			const delay = session.getDebounceTime();

			expect(delay).toBeLessThanOrEqual(3000);
		});
	});

	describe('action history limit', () => {
		it('should keep only last 10 actions', () => {
			// Add 15 acceptances
			for (let i = 0; i < 15; i++) {
				delayer.handleAcceptance();
			}

			// Delay should be based on 10 actions, not 15
			const session = delayer.createDelaySession(Date.now());
			const delay = session.getDebounceTime();

			// With 10 acceptances: 500 * (0.8^10) ≈ 53.7ms
			// Should be clamped to MIN_DEBOUNCE_TIME (50ms)
			expect(delay).toBeCloseTo(50, 10);
		});
	});

	describe('time decay', () => {
		it('should decay action impact over time', async () => {
			delayer.handleRejection();
			delayer.handleRejection();
			delayer.handleRejection();

			const delay1 = delayer.createDelaySession(Date.now()).getDebounceTime();

			// Fast-forward time by mocking Date.now()
			const originalDateNow = Date.now;
			Date.now = () => originalDateNow() + 5 * 60 * 1000; // +5 minutes

			const delay2 = delayer.createDelaySession(Date.now()).getDebounceTime();

			// Restore Date.now
			Date.now = originalDateNow;

			// Delay should be less than before (decay effect)
			expect(delay2).toBeLessThan(delay1);
			expect(delay2).toBeGreaterThan(500); // But still > base
		});

		it('should reset to base after decay time', () => {
			delayer.handleRejection();
			delayer.handleRejection();

			// Fast-forward 10 minutes
			const originalDateNow = Date.now;
			Date.now = () => originalDateNow() + 10 * 60 * 1000;

			const session = delayer.createDelaySession(Date.now());
			const delay = session.getDebounceTime();

			Date.now = originalDateNow;

			// Should reset to base
			expect(delay).toBeCloseTo(500, 50);
		});
	});

	describe('mixed actions', () => {
		it('should handle accept then reject', () => {
			delayer.handleAcceptance(); // Decrease
			delayer.handleAcceptance(); // Decrease more

			const delay1 = delayer.createDelaySession(Date.now()).getDebounceTime();

			delayer.handleRejection(); // Increase

			const delay2 = delayer.createDelaySession(Date.now()).getDebounceTime();

			expect(delay2).toBeGreaterThan(delay1);
		});

		it('should handle reject then accept', () => {
			delayer.handleRejection(); // Increase
			delayer.handleRejection(); // Increase more

			const delay1 = delayer.createDelaySession(Date.now()).getDebounceTime();

			delayer.handleAcceptance(); // Decrease

			const delay2 = delayer.createDelaySession(Date.now()).getDebounceTime();

			expect(delay2).toBeLessThan(delay1);
		});
	});
});

describe('DelaySession', () => {
	describe('getDebounceTime', () => {
		it('should return base time when no expected time', () => {
			const session = new DelaySession(500, undefined, Date.now());
			expect(session.getDebounceTime()).toBe(500);
		});

		it('should use min of base and expected time', () => {
			const session1 = new DelaySession(500, 300, Date.now());
			expect(session1.getDebounceTime()).toBe(300);

			const session2 = new DelaySession(500, 700, Date.now());
			expect(session2.getDebounceTime()).toBe(500);
		});

		it('should account for extra debounce', () => {
			const session = new DelaySession(500, undefined, Date.now());
			session.setExtraDebounce(100);
			expect(session.getDebounceTime()).toBe(600);
		});

		it('should never return negative time', async () => {
			const start = Date.now();
			const session = new DelaySession(100, undefined, start);

			// Wait longer than debounce time
			await new Promise(resolve => setTimeout(resolve, 200));

			const delay = session.getDebounceTime();
			expect(delay).toBeGreaterThanOrEqual(0);
		});
	});

	describe('getArtificialDelay', () => {
		it('should return 0 when no expected time', () => {
			const session = new DelaySession(500, undefined, Date.now());
			expect(session.getArtificialDelay()).toBe(0);
		});

		it('should return remaining time', () => {
			const session = new DelaySession(500, 1000, Date.now());
			const delay = session.getArtificialDelay();
			expect(delay).toBeCloseTo(1000, 50);
		});
	});
});
```

### Run Unit Tests

```bash
cd src/chat
npm run test:unit -- delayer.test.ts
```

## 3. Integration Tests

### Test with Full NES Provider

Create: `src/chat/src/extension/pukuai/test/integration/nesDelayerIntegration.test.ts`

```typescript
import * as vscode from 'vscode';
import { PukuNesNextEditProvider } from '../../vscode-node/providers/pukuNesNextEditProvider';

describe('NES Delayer Integration', () => {
	let provider: PukuNesNextEditProvider;
	let testDocument: vscode.TextDocument;

	beforeEach(async () => {
		// Create test document
		testDocument = await vscode.workspace.openTextDocument({
			content: '',
			language: 'typescript'
		});

		// Initialize provider
		provider = new PukuNesNextEditProvider(/* ... dependencies */);
	});

	it('should adapt delay based on user acceptance', async () => {
		// Request 1: Get initial suggestion
		const result1 = await provider.getNextEdit(
			{ document: testDocument, position: new vscode.Position(0, 0) },
			{} as vscode.InlineCompletionContext,
			new vscode.CancellationTokenSource().token
		);

		expect(result1).toBeTruthy();

		// Accept it
		provider.handleAcceptance(
			{ document: testDocument, position: new vscode.Position(0, 0) },
			result1!
		);

		// Request 2: Should be faster
		const start = Date.now();
		const result2 = await provider.getNextEdit(
			{ document: testDocument, position: new vscode.Position(1, 0) },
			{} as vscode.InlineCompletionContext,
			new vscode.CancellationTokenSource().token
		);
		const elapsed = Date.now() - start;

		// Should be faster than initial 500ms
		expect(elapsed).toBeLessThan(450);
	});

	it('should adapt delay based on user rejection', async () => {
		// Get suggestion
		const result1 = await provider.getNextEdit(
			{ document: testDocument, position: new vscode.Position(0, 0) },
			{} as vscode.InlineCompletionContext,
			new vscode.CancellationTokenSource().token
		);

		// Reject it
		provider.handleRejection(
			{ document: testDocument, position: new vscode.Position(0, 0) },
			result1!
		);

		// Next request should be slower
		const start = Date.now();
		const result2 = await provider.getNextEdit(
			{ document: testDocument, position: new vscode.Position(1, 0) },
			{} as vscode.InlineCompletionContext,
			new vscode.CancellationTokenSource().token
		);
		const elapsed = Date.now() - start;

		// Should be slower than initial 500ms
		expect(elapsed).toBeGreaterThan(550);
	});
});
```

### Run Integration Tests

```bash
cd src/chat
npm run test:extension -- nesDelayerIntegration.test.ts
```

## 4. Visual Testing with Logs

### Add Detailed Logging

Temporarily add this to `PukuNesNextEditProvider`:

```typescript
async getNextEdit(
	docId: PukuDocumentId,
	context: vscode.InlineCompletionContext,
	token: vscode.CancellationToken
): Promise<PukuNesResult | null> {
	const requestStart = Date.now();

	// Create delay session
	const delaySession = this._delayer.createDelaySession(requestStart);
	const calculatedDelay = delaySession.getDebounceTime();

	console.log('─────────────────────────────────────');
	console.log(`[NES Delayer] Request #${++this._requestId}`);
	console.log(`[NES Delayer] Calculated delay: ${calculatedDelay}ms`);

	// Wait for adaptive delay
	await new Promise(resolve => setTimeout(resolve, calculatedDelay));

	const actualElapsed = Date.now() - requestStart;
	console.log(`[NES Delayer] Actual elapsed: ${actualElapsed}ms`);
	console.log('─────────────────────────────────────');

	// ... rest of getNextEdit implementation
}

handleAcceptance(docId: PukuDocumentId, result: PukuNesResult): void {
	console.log('✅ [NES Delayer] User ACCEPTED suggestion');
	this._delayer.handleAcceptance();
	// ... rest
}

handleRejection(docId: PukuDocumentId, result: PukuNesResult): void {
	console.log('❌ [NES Delayer] User REJECTED suggestion');
	this._delayer.handleRejection();
	// ... rest
}
```

### Test Session Example

```bash
# 1. Launch extension
make compile-extension && ./launch.sh

# 2. Open Developer Tools
# Help > Toggle Developer Tools

# 3. Test scenario
```

**Expected Console Output**:
```
─────────────────────────────────────
[NES Delayer] Request #1
[NES Delayer] Calculated delay: 500ms
[NES Delayer] Actual elapsed: 502ms
─────────────────────────────────────

✅ [NES Delayer] User ACCEPTED suggestion

─────────────────────────────────────
[NES Delayer] Request #2
[NES Delayer] Calculated delay: 400ms
[NES Delayer] Actual elapsed: 405ms
─────────────────────────────────────

✅ [NES Delayer] User ACCEPTED suggestion

─────────────────────────────────────
[NES Delayer] Request #3
[NES Delayer] Calculated delay: 320ms
[NES Delayer] Actual elapsed: 322ms
─────────────────────────────────────

❌ [NES Delayer] User REJECTED suggestion

─────────────────────────────────────
[NES Delayer] Request #4
[NES Delayer] Calculated delay: 480ms
[NES Delayer] Actual elapsed: 483ms
─────────────────────────────────────
```

## 5. Performance Testing

### Measure Impact on Suggestion Speed

```typescript
// Add to getNextEdit
const metrics = {
	requestId: this._requestId++,
	calculatedDelay: 0,
	actualDelay: 0,
	suggestionTime: 0,
	totalTime: 0
};

const start = Date.now();

const delaySession = this._delayer.createDelaySession(start);
metrics.calculatedDelay = delaySession.getDebounceTime();

const beforeSuggestion = Date.now();
await new Promise(resolve => setTimeout(resolve, metrics.calculatedDelay));
metrics.actualDelay = Date.now() - beforeSuggestion;

// Generate suggestion
const suggestion = await this.xtabProvider.getNextEdit(/* ... */);
metrics.suggestionTime = Date.now() - beforeSuggestion - metrics.actualDelay;
metrics.totalTime = Date.now() - start;

console.table(metrics);
```

**Output**:
```
┌─────────────────┬────────┐
│     Metric      │ Value  │
├─────────────────┼────────┤
│ requestId       │ 1      │
│ calculatedDelay │ 500    │
│ actualDelay     │ 502    │
│ suggestionTime  │ 234    │
│ totalTime       │ 736    │
└─────────────────┴────────┘
```

## 6. Automated Test Suite

### Create Comprehensive Test

Create: `src/chat/src/extension/pukuai/test/delayerBehavior.test.ts`

```bash
cd src/chat
npm run test:unit -- delayerBehavior.test.ts
```

### Expected Results

All tests should pass:
```
 PASS  src/extension/pukuai/test/delayer.test.ts
  Delayer
    createDelaySession
      ✓ should return base delay when no actions recorded (2 ms)
    handleAcceptance
      ✓ should decrease delay after acceptance (1 ms)
      ✓ should decrease delay progressively (1 ms)
    handleRejection
      ✓ should increase delay after rejection (1 ms)
      ✓ should increase delay progressively (1 ms)
      ✓ should not exceed max delay (1 ms)
    action history limit
      ✓ should keep only last 10 actions (1 ms)
    time decay
      ✓ should decay action impact over time (1 ms)
      ✓ should reset to base after decay time (1 ms)
    mixed actions
      ✓ should handle accept then reject (1 ms)
      ✓ should handle reject then accept (1 ms)
  DelaySession
    getDebounceTime
      ✓ should return base time when no expected time (1 ms)
      ✓ should use min of base and expected time (1 ms)
      ✓ should account for extra debounce (1 ms)
      ✓ should never return negative time (201 ms)
    getArtificialDelay
      ✓ should return 0 when no expected time (1 ms)
      ✓ should return remaining time (1 ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

## Summary

**Quickest way to test manually**:
1. Launch extension with logging
2. Accept 3 suggestions → watch delay decrease
3. Reject 3 suggestions → watch delay increase
4. Check Developer Tools console for logs

**For CI/CD**:
1. Run unit tests: `npm run test:unit -- delayer.test.ts`
2. Run integration tests: `npm run test:extension`
3. Verify all tests pass

**Success Criteria**:
- ✅ Initial delay: ~500ms
- ✅ After 3 accepts: ~256ms (faster)
- ✅ After 3 rejects: ~1687ms (slower)
- ✅ After 10 min: Reset to ~500ms
- ✅ All unit tests pass
- ✅ No errors in console
