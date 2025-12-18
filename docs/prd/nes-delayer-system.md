# NES Delayer System - Adaptive Debouncing

**Status**: ✅ Implemented
**Priority**: 🔴 Critical
**Effort**: 4 hours
**Reference**: `vscode-copilot-chat/src/extension/inlineEdits/common/delayer.ts`

## Overview

The Delayer System implements adaptive debouncing for Next Edit Suggestions (NES) that learns from user behavior. Instead of using a fixed delay, it dynamically adjusts the debounce time based on whether users accept or reject suggestions, improving UX by reducing unwanted interruptions while keeping helpful suggestions responsive.

## Problem Statement

### Current Behavior (Fixed Debouncing)

```
User types → Wait 500ms → Show suggestion
User types → Wait 500ms → Show suggestion
User types → Wait 500ms → Show suggestion
```

**Issues**:
- User keeps rejecting suggestions → Still shows every 500ms (annoying)
- User keeps accepting suggestions → Still waits 500ms (could be faster)
- No learning from user patterns
- One-size-fits-all approach doesn't adapt to user workflow

### Desired Behavior (Adaptive Debouncing)

```
User accepts 3 suggestions → Delay decreases to 250ms (faster, helpful)
User rejects 3 suggestions → Delay increases to 1500ms (fewer interruptions)
User ignores for 10 min → Delay resets to 500ms (fresh start)
```

**Benefits**:
- Learns from user behavior
- Reduces annoyance (fewer unwanted suggestions)
- Improves responsiveness (faster when suggestions are helpful)
- Adapts to different workflows

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Delayer System                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Delayer Class                       │   │
│  │  - Tracks user actions (accept/reject)          │   │
│  │  - Calculates adaptive delay                    │   │
│  │  - Manages action history (last 10)             │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                                │
│                         │ creates                        │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │           DelaySession Class                     │   │
│  │  - Per-request delay calculation                │   │
│  │  - Accounts for time already spent              │   │
│  │  - Supports extra debounce                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Class Diagram

```typescript
┌──────────────────────────────────────────┐
│          Delayer                          │
├──────────────────────────────────────────┤
│ - _recentUserActions: Action[]           │
│ - _baseDebounceTime: number              │
│ - _backoffDebounceEnabled: boolean       │
├──────────────────────────────────────────┤
│ + createDelaySession(requestTime)        │
│ + handleAcceptance()                     │
│ + handleRejection()                      │
│ - _getExpectedTotalTime(baseTime)        │
│ - _recordUserAction(kind)                │
└──────────────────────────────────────────┘
                    │
                    │ creates
                    ▼
┌──────────────────────────────────────────┐
│        DelaySession                       │
├──────────────────────────────────────────┤
│ - baseDebounceTime: number               │
│ - expectedTotalTime: number?             │
│ - providerInvocationTime: number         │
│ - extraDebounce: number                  │
├──────────────────────────────────────────┤
│ + getDebounceTime(): number              │
│ + getArtificialDelay(): number           │
│ + setExtraDebounce(ms: number)           │
└──────────────────────────────────────────┘
```

## Implementation Details

### 1. Delayer Class

**Location**: `src/chat/src/extension/pukuai/common/delayer.ts`

```typescript
export class Delayer {
	private _recentUserActions: { time: number; kind: 'accepted' | 'rejected' }[] = [];

	constructor(
		private readonly _baseDebounceTime: number = 500,
		private readonly _backoffDebounceEnabled: boolean = true,
	) {}

	public createDelaySession(requestTime: number | undefined): DelaySession {
		const baseDebounceTime = this._baseDebounceTime;
		const expectedTotalTime = this._backoffDebounceEnabled
			? this._getExpectedTotalTime(baseDebounceTime)
			: undefined;
		return new DelaySession(baseDebounceTime, expectedTotalTime, requestTime);
	}

	public handleAcceptance(): void {
		this._recordUserAction('accepted');
	}

	public handleRejection(): void {
		this._recordUserAction('rejected');
	}

	private _getExpectedTotalTime(baseDebounceTime: number): number {
		const DEBOUNCE_DECAY_TIME_MS = 10 * 60 * 1000; // 10 minutes
		const MAX_DEBOUNCE_TIME = 3000; // 3 seconds
		const MIN_DEBOUNCE_TIME = 50; // 50 ms
		const REJECTION_WEIGHT = 1.5;
		const ACCEPTANCE_WEIGHT = 0.8;
		const now = Date.now();
		let multiplier = 1;

		// Calculate impact of each action with time decay
		for (const action of this._recentUserActions) {
			const timeSinceAction = now - action.time;
			if (timeSinceAction > DEBOUNCE_DECAY_TIME_MS) {
				continue;
			}

			// Exponential decay: impact decreases as time passes
			const decayFactor = Math.exp(-timeSinceAction / DEBOUNCE_DECAY_TIME_MS);
			const actionWeight = action.kind === 'rejected' ? REJECTION_WEIGHT : ACCEPTANCE_WEIGHT;
			multiplier *= 1 + ((actionWeight - 1) * decayFactor);
		}

		let debounceTime = baseDebounceTime * multiplier;

		// Clamp the debounce time to reasonable bounds
		debounceTime = Math.min(MAX_DEBOUNCE_TIME, Math.max(MIN_DEBOUNCE_TIME, debounceTime));

		return debounceTime;
	}
}
```

### 2. Integration with PukuNesNextEditProvider

**Location**: `src/chat/src/extension/pukuai/vscode-node/providers/pukuNesNextEditProvider.ts`

```typescript
export class PukuNesNextEditProvider extends Disposable implements IPukuNextEditProvider<PukuNesResult> {
	private readonly _delayer: Delayer;

	constructor(
		private readonly xtabProvider: IStatelessNextEditProvider,
		private readonly historyContextProvider: IHistoryContextProvider,
		private readonly xtabHistoryTracker: NesXtabHistoryTracker,
		private readonly workspace: ObservableWorkspace,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();
		this._delayer = new Delayer(500, true); // 500ms base, backoff enabled
		this._logService.info('[PukuNesNextEdit] Provider initialized with adaptive delayer');
	}

	handleAcceptance(docId: PukuDocumentId, result: PukuNesResult): void {
		this._logService.trace(`[PukuNesNextEdit] NES suggestion accepted (requestId: ${result.requestId})`);
		// Record acceptance in delayer for adaptive debouncing
		this._delayer.handleAcceptance();
		this.xtabProvider.handleAcceptance?.();
	}

	handleRejection(docId: PukuDocumentId, result: PukuNesResult): void {
		this._logService.trace(`[PukuNesNextEdit] NES suggestion rejected (requestId: ${result.requestId})`);
		// Record rejection in delayer for adaptive debouncing
		this._delayer.handleRejection();
		this.xtabProvider.handleRejection?.();
	}
}
```

## Algorithm: Exponential Decay

### Formula

```
multiplier = 1

for each action in recentActions:
  timeSinceAction = now - action.time

  if timeSinceAction > 10 minutes:
    skip  // Action too old

  decayFactor = e^(-timeSinceAction / 10min)
  actionWeight = action.kind === 'rejected' ? 1.5 : 0.8

  multiplier *= 1 + ((actionWeight - 1) * decayFactor)

debounceTime = baseDebounceTime * multiplier
debounceTime = clamp(debounceTime, 50ms, 3000ms)
```

### Example Calculation

**Scenario**: User rejects 3 suggestions in a row

```
Base debounce time: 500ms
REJECTION_WEIGHT: 1.5
ACCEPTANCE_WEIGHT: 0.8

Action 1: Rejected 5 seconds ago
  timeSinceAction = 5000ms
  decayFactor = e^(-5000 / 600000) = 0.9917
  multiplier = 1 * (1 + (1.5 - 1) * 0.9917) = 1.4959

Action 2: Rejected 10 seconds ago
  timeSinceAction = 10000ms
  decayFactor = e^(-10000 / 600000) = 0.9834
  multiplier = 1.4959 * (1 + (1.5 - 1) * 0.9834) = 2.2296

Action 3: Rejected 15 seconds ago
  timeSinceAction = 15000ms
  decayFactor = e^(-15000 / 600000) = 0.9753
  multiplier = 2.2296 * (1 + (1.5 - 1) * 0.9753) = 3.3146

Final debounce time = 500ms * 3.3146 = 1657ms
Clamped to: 1657ms (within 50ms - 3000ms range)
```

**Result**: Delay increased from 500ms to 1657ms after 3 rejections

## Usage Examples

### Example 1: User Accepts Suggestions

```typescript
const delayer = new Delayer(500, true); // 500ms base

// User accepts suggestion
delayer.handleAcceptance();

// Create delay session for next request
const session = delayer.createDelaySession(Date.now());
const delay = session.getDebounceTime();
console.log(delay); // ~400ms (faster due to acceptance)

// User accepts again
delayer.handleAcceptance();

const session2 = delayer.createDelaySession(Date.now());
const delay2 = session2.getDebounceTime();
console.log(delay2); // ~320ms (even faster)
```

### Example 2: User Rejects Suggestions

```typescript
const delayer = new Delayer(500, true);

// User rejects suggestion
delayer.handleRejection();

const session = delayer.createDelaySession(Date.now());
const delay = session.getDebounceTime();
console.log(delay); // ~750ms (slower due to rejection)

// User rejects again
delayer.handleRejection();

const session2 = delayer.createDelaySession(Date.now());
const delay2 = session2.getDebounceTime();
console.log(delay2); // ~1125ms (even slower)

// User rejects 3rd time
delayer.handleRejection();

const session3 = delayer.createDelaySession(Date.now());
const delay3 = session3.getDebounceTime();
console.log(delay3); // ~1687ms (much slower, fewer interruptions)
```

### Example 3: Mixed Actions with Time Decay

```typescript
const delayer = new Delayer(500, true);

// User rejects 3 times
delayer.handleRejection();
delayer.handleRejection();
delayer.handleRejection();

// Delay increases
let session = delayer.createDelaySession(Date.now());
console.log(session.getDebounceTime()); // ~1687ms

// Wait 5 minutes
await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

// Delay starts decreasing (decay effect)
session = delayer.createDelaySession(Date.now());
console.log(session.getDebounceTime()); // ~1200ms

// Wait 10 minutes total
await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

// Delay resets to base (all actions expired)
session = delayer.createDelaySession(Date.now());
console.log(session.getDebounceTime()); // ~500ms
```

### Example 4: Real-World Integration

```typescript
// In PukuNesNextEditProvider
class PukuNesNextEditProvider {
	private readonly _delayer: Delayer;

	constructor() {
		this._delayer = new Delayer(500, true);
	}

	async provideInlineCompletions(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionList | null> {
		// Create delay session for this request
		const delaySession = this._delayer.createDelaySession(Date.now());
		const debounceTime = delaySession.getDebounceTime();

		// Wait for adaptive delay
		await new Promise(resolve => setTimeout(resolve, debounceTime));

		// Check cancellation after delay
		if (token.isCancellationRequested) {
			return null;
		}

		// Generate and return suggestion
		const suggestion = await this.generateSuggestion(document, position);
		return suggestion;
	}

	handleAcceptance(result: PukuNesResult): void {
		// User pressed TAB to accept
		this._delayer.handleAcceptance();
		// Next suggestions will be faster
	}

	handleRejection(result: PukuNesResult): void {
		// User pressed ESC or kept typing
		this._delayer.handleRejection();
		// Next suggestions will be slower
	}
}
```

## Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Base Debounce Time** | 500ms | Starting delay before first action |
| **Min Debounce Time** | 50ms | Minimum delay (fastest) |
| **Max Debounce Time** | 3000ms | Maximum delay (slowest) |
| **Acceptance Weight** | 0.8 | Multiplier for acceptances (decreases delay) |
| **Rejection Weight** | 1.5 | Multiplier for rejections (increases delay) |
| **Decay Time** | 10 minutes | Time for action impact to decay to ~0 |
| **Max Actions** | 10 | Maximum actions tracked |

## Behavior Matrix

| User Pattern | Initial Delay | After 1 Action | After 3 Actions | After 10 min |
|--------------|---------------|----------------|-----------------|--------------|
| **All Accepts** | 500ms | ~400ms | ~256ms | ~500ms (reset) |
| **All Rejects** | 500ms | ~750ms | ~1687ms | ~500ms (reset) |
| **Mixed 50/50** | 500ms | ~500ms | ~500ms | ~500ms (stable) |
| **Accept then Reject** | 500ms | ~400ms | ~450ms | ~500ms (reset) |

## Testing Strategy

### Unit Tests

```typescript
describe('Delayer', () => {
	it('should decrease delay after acceptance', () => {
		const delayer = new Delayer(500, true);
		delayer.handleAcceptance();

		const session = delayer.createDelaySession(Date.now());
		const delay = session.getDebounceTime();

		expect(delay).toBeLessThan(500);
	});

	it('should increase delay after rejection', () => {
		const delayer = new Delayer(500, true);
		delayer.handleRejection();

		const session = delayer.createDelaySession(Date.now());
		const delay = session.getDebounceTime();

		expect(delay).toBeGreaterThan(500);
	});

	it('should clamp to max delay', () => {
		const delayer = new Delayer(500, true);

		// Reject 10 times
		for (let i = 0; i < 10; i++) {
			delayer.handleRejection();
		}

		const session = delayer.createDelaySession(Date.now());
		const delay = session.getDebounceTime();

		expect(delay).toBeLessThanOrEqual(3000);
	});

	it('should reset after 10 minutes', async () => {
		const delayer = new Delayer(500, true);
		delayer.handleRejection();
		delayer.handleRejection();
		delayer.handleRejection();

		// Fast-forward 10 minutes
		jest.advanceTimersByTime(10 * 60 * 1000);

		const session = delayer.createDelaySession(Date.now());
		const delay = session.getDebounceTime();

		expect(delay).toBeCloseTo(500, 0);
	});
});
```

### Integration Tests

```typescript
describe('PukuNesNextEditProvider with Delayer', () => {
	it('should adapt delay based on user actions', async () => {
		const provider = new PukuNesNextEditProvider(...);

		// Measure initial delay
		const start1 = Date.now();
		await provider.provideInlineCompletions(...);
		const delay1 = Date.now() - start1;
		expect(delay1).toBeCloseTo(500, 50);

		// Accept suggestion
		provider.handleAcceptance(...);

		// Measure decreased delay
		const start2 = Date.now();
		await provider.provideInlineCompletions(...);
		const delay2 = Date.now() - start2;
		expect(delay2).toBeLessThan(delay1);
	});
});
```

## Metrics & Telemetry

Track these metrics to validate effectiveness:

```typescript
interface DelayerMetrics {
	// Delay statistics
	averageDelay: number;
	minDelay: number;
	maxDelay: number;

	// User actions
	totalAcceptances: number;
	totalRejections: number;
	acceptanceRate: number;

	// Adaptation metrics
	delayIncreases: number;  // Times delay increased
	delayDecreases: number;  // Times delay decreased

	// User satisfaction (inferred)
	consecutiveRejections: number;
	consecutiveAcceptances: number;
}
```

## Future Enhancements

### 1. Per-Language Adaptation
Different programming languages may have different optimal delays:

```typescript
class LanguageAwareDelayer extends Delayer {
	private delayers = new Map<string, Delayer>();

	getDelayerForLanguage(languageId: string): Delayer {
		if (!this.delayers.has(languageId)) {
			this.delayers.set(languageId, new Delayer(500, true));
		}
		return this.delayers.get(languageId)!;
	}
}
```

### 2. Context-Aware Delays
Adapt based on editing context:

```typescript
interface Context {
	isRefactoring: boolean;
	isWritingTests: boolean;
	isWritingDocs: boolean;
}

function getContextualDelay(context: Context): number {
	if (context.isRefactoring) return 1000; // Slower during refactoring
	if (context.isWritingTests) return 300;  // Faster for tests
	if (context.isWritingDocs) return 2000;  // Very slow for docs
	return 500;
}
```

### 3. Time-of-Day Adaptation
Learn user patterns by time:

```typescript
class TimeAwareDelayer extends Delayer {
	private hourlyMultipliers = new Array(24).fill(1);

	getHourMultiplier(): number {
		const hour = new Date().getHours();
		return this.hourlyMultipliers[hour];
	}
}
```

## References

- **Reference Implementation**: `vscode-copilot-chat/src/extension/inlineEdits/common/delayer.ts`
- **Related**: Issue #2 - NES Delayer System
- **Dependencies**: None (standalone utility class)

## Conclusion

The Delayer System successfully implements adaptive debouncing that learns from user behavior, improving the NES experience by:

1. **Reducing annoyance** - Fewer unwanted suggestions when user rejects
2. **Improving responsiveness** - Faster suggestions when user accepts
3. **Adapting dynamically** - Continuous learning from user patterns
4. **Graceful decay** - Old actions fade away, allowing fresh starts

This creates a more intelligent and user-friendly suggestion system that adapts to individual workflows.
