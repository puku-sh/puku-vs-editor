# NES Debouncing Architecture

**Last Updated**: December 18, 2025
**Reference**: `vscode-copilot-chat/src/extension/inlineEdits/`

## Overview

The NES (Next Edit Suggestions) system implements a sophisticated **adaptive debouncing** strategy that learns from user behavior. Unlike simple time-based debouncing, this system dynamically adjusts delays based on whether users accept or reject suggestions.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                       │
├─────────────────────────────────────────────────────────────────┤
│  InlineCompletionItemProvider API                                │
│  - debounceDelayMs: 0  ← Disabled (we handle debouncing)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PukuNesNextEditProvider (Adapter Layer)                         │
│  - Wraps XtabProvider for racing                                │
│  - Tracks acceptance/rejection patterns                          │
│  - NO manual debouncing (delegates to XtabProvider)              │
│                                                                   │
│  handleAcceptance() → xtabProvider.handleAcceptance()            │
│  handleRejection()  → xtabProvider.handleRejection()             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  XtabProvider (Core Provider Layer)                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Delayer Instance                                           │  │
│  │ - Tracks last 10 user actions (accept/reject)             │  │
│  │ - Calculates adaptive debounce time                       │  │
│  │ - Weight: Rejection=1.5x, Acceptance=0.8x                 │  │
│  │ - Exponential decay over 10 minutes                       │  │
│  │ - Bounds: 50ms - 3000ms                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  provideNextEdit()                                               │
│    1. createDelaySession(requestTime)                            │
│    2. await debounce(delaySession) ← DELAY HAPPENS HERE          │
│    3. Fetch language context (timeBudget = debounceTime)         │
│    4. Construct prompt                                           │
│    5. Fetch LLM completion                                       │
│    6. enforceArtificialDelay() (UX consistency)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Copilot / Puku AI Backend                                       │
│  - Codestral Mamba (FIM)                                         │
│  - GLM-4.6 (Chat)                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Delayer System Components

### 1. DelaySession Class

Manages a single debounce session with time-aware adjustment.

```typescript
class DelaySession {
    constructor(
        private baseDebounceTime: number,        // e.g., 200ms
        private expectedTotalTime: number | undefined,  // Adaptive time
        private providerInvocationTime: number   // Request start timestamp
    ) {}

    getDebounceTime(): number {
        // Calculate how much time to wait
        const expectedTime = this.expectedTotalTime ?? this.baseDebounceTime;
        const timeAlreadySpent = Date.now() - this.providerInvocationTime;
        return Math.max(0, expectedTime - timeAlreadySpent);
    }

    getArtificialDelay(): number {
        // Calculate extra delay to maintain UX consistency
        if (!this.expectedTotalTime) return 0;
        const timeAlreadySpent = Date.now() - this.providerInvocationTime;
        return Math.max(0, this.expectedTotalTime - timeAlreadySpent);
    }
}
```

**Key Features**:
- **Time-aware**: Subtracts time already spent (e.g., from previous async work)
- **Extra debounce**: Can add delay for cursor at end of line
- **Artificial delay**: Enforces minimum total time for consistent UX

### 2. Delayer Class

Implements adaptive debouncing based on user behavior.

```typescript
class Delayer {
    private _recentUserActions: { time: number; kind: 'accepted' | 'rejected' }[] = [];

    handleAcceptance(): void {
        this._recordUserAction('accepted');
    }

    handleRejection(): void {
        this._recordUserAction('rejected');
    }

    createDelaySession(requestTime?: number): DelaySession {
        const baseTime = this.configService.get('InlineEditsDebounce', 200);
        const adaptiveTime = this._getExpectedTotalTime(baseTime);
        return new DelaySession(baseTime, adaptiveTime, requestTime);
    }

    private _getExpectedTotalTime(baseTime: number): number {
        const DECAY_TIME = 10 * 60 * 1000;  // 10 minutes
        const REJECTION_WEIGHT = 1.5;        // Slow down
        const ACCEPTANCE_WEIGHT = 0.8;       // Speed up

        let multiplier = 1.0;

        for (const action of this._recentUserActions) {
            const age = Date.now() - action.time;
            if (age > DECAY_TIME) continue;

            const decay = Math.exp(-age / DECAY_TIME);
            const weight = action.kind === 'rejected'
                ? REJECTION_WEIGHT
                : ACCEPTANCE_WEIGHT;

            multiplier *= 1 + ((weight - 1) * decay);
        }

        const time = baseTime * multiplier;
        return Math.min(3000, Math.max(50, time));  // Clamp 50-3000ms
    }
}
```

## Debouncing Flow

### Timeline Diagram

```
User Types "function hello() {"
    ↓ t=0ms
VS Code fires onDidChangeTextDocument
    ↓
PukuNesNextEditProvider.getNextEdit() called
    ↓
XtabProvider.provideNextEdit() called
    │
    ├─ t=0ms: Create DelaySession
    │           baseTime = 200ms
    │           adaptiveTime = calculate based on history
    │
    ├─ Calculate adaptive delay:
    │   ┌────────────────────────────────────────┐
    │   │ User History: [accept, accept, reject] │
    │   │                                        │
    │   │ accept (30s ago):  0.8 × e^(-30/600)  │
    │   │ accept (45s ago):  0.8 × e^(-45/600)  │
    │   │ reject (10s ago):  1.5 × e^(-10/600)  │
    │   │                                        │
    │   │ multiplier ≈ 1.12                     │
    │   │ adaptiveTime = 200ms × 1.12 = 224ms   │
    │   └────────────────────────────────────────┘
    │
    ├─ t=0ms: await debounce(224ms)
    │           ⏸️ WAIT HERE
    │
    ├─ t=224ms: Debounce complete
    │
    ├─ t=224ms: Fetch language context
    │            (timeBudget = 224ms)
    │            - Import statements
    │            - Semantic search results
    │
    ├─ t=280ms: Context fetched (56ms elapsed)
    │
    ├─ t=280ms: Construct prompt
    │
    ├─ t=285ms: Fetch LLM completion
    │            ⏸️ WAIT FOR API
    │
    ├─ t=850ms: LLM response received
    │
    ├─ t=850ms: Stream edit to UI
    │            User sees suggestion appear
    │
    └─ t=850ms: Done

Total time: 850ms
Debounce time: 224ms (adaptive)
API time: 565ms
```

## Adaptive Behavior Examples

### Example 1: Active User (Frequent Acceptances)

```
History: [✓, ✓, ✓, ✓, ✓]  (5 recent acceptances)

Calculation:
  multiplier = (1 + (0.8 - 1) × e^(-t₁/600))
             × (1 + (0.8 - 1) × e^(-t₂/600))
             × ...
             ≈ 0.72

  debounceTime = 200ms × 0.72 = 144ms
  clamped to: max(50ms, 144ms) = 144ms

Result: Suggestions appear faster ⚡
```

### Example 2: User Rejecting Suggestions

```
History: [✗, ✗, ✗, ✗, ✗]  (5 recent rejections)

Calculation:
  multiplier = (1 + (1.5 - 1) × e^(-t₁/600))
             × (1 + (1.5 - 1) × e^(-t₂/600))
             × ...
             ≈ 2.48

  debounceTime = 200ms × 2.48 = 496ms
  clamped to: min(3000ms, 496ms) = 496ms

Result: Suggestions appear slower 🐌 (less annoying)
```

### Example 3: Mixed Behavior

```
History: [✓, ✓, ✗, ✓, ✗]  (mixed accepts/rejects)

Recent actions have more weight due to exponential decay:
  - ✗ 5s ago:   1.5 × e^(-5/600)  ≈ 1.488
  - ✓ 15s ago:  0.8 × e^(-15/600) ≈ 0.780
  - ✗ 30s ago:  1.5 × e^(-30/600) ≈ 1.427
  - ✓ 45s ago:  0.8 × e^(-45/600) ≈ 0.749
  - ✓ 60s ago:  0.8 × e^(-60/600) ≈ 0.724

  multiplier ≈ 1.08

  debounceTime = 200ms × 1.08 = 216ms

Result: Near baseline (slightly slower)
```

### Example 4: Old History (Exponential Decay)

```
History: [✗ (9min ago), ✗ (9.5min ago), ✗ (10min ago)]

Calculation:
  - ✗ 540s ago:  1.5 × e^(-540/600) ≈ 1.20  (still has impact)
  - ✗ 570s ago:  1.5 × e^(-570/600) ≈ 1.19  (slight impact)
  - ✗ 600s ago:  1.5 × e^(-600/600) ≈ 1.18  (minimal impact)

  multiplier ≈ 1.72

  debounceTime = 200ms × 1.72 = 344ms

After 10 minutes:
  - All actions decay to ~0 impact
  - debounceTime returns to 200ms baseline

Result: Impact fades over time ⏰
```

## Configuration Settings

All debounce-related settings in Puku:

```typescript
// File: src/platform/configuration/common/configurationService.ts

// Base debounce time (default: 200ms)
export const InlineEditsDebounce = defineSetting<number>(
    'chat.advanced.inlineEdits.debounce',
    200
);

// Enable adaptive backoff (default: true)
export const InlineEditsBackoffDebounceEnabled = defineSetting<boolean>(
    'chat.advanced.inlineEdits.backoffDebounceEnabled',
    true
);

// Extra debounce when cursor at end of line (default: 0ms)
export const InlineEditsExtraDebounceEndOfLine = defineSetting<number>(
    'chat.advanced.inlineEdits.extraDebounceEndOfLine',
    0
);

// Debounce on selection change (default: undefined = disabled)
export const InlineEditsDebounceOnSelectionChange = defineSetting<number | undefined>(
    'chat.advanced.inlineEdits.debounceOnSelectionChange',
    undefined
);
```

### User Configuration Example

```json
{
  "puku.chat.advanced.inlineEdits.debounce": 200,
  "puku.chat.advanced.inlineEdits.backoffDebounceEnabled": true,
  "puku.chat.advanced.inlineEdits.extraDebounceEndOfLine": 100,
  "puku.chat.advanced.inlineEdits.debounceOnSelectionChange": 500
}
```

## Code Integration Points

### 1. XtabProvider Integration

**File**: `src/extension/xtab/node/xtabProvider.ts`

```typescript
export class XtabProvider implements IStatelessNextEditProvider {
    private readonly delayer: Delayer;

    constructor(
        @IConfigurationService configService: IConfigurationService,
        @IExperimentationService expService: IExperimentationService
    ) {
        this.delayer = new Delayer(configService, expService);
    }

    public async provideNextEdit(
        request: StatelessNextEditRequest,
        pushEdit: PushEdit,
        logContext: InlineEditRequestLogContext,
        cancellationToken: CancellationToken
    ): Promise<StatelessNextEditResult> {
        // Step 1: Create delay session
        const delaySession = this.delayer.createDelaySession(
            request.providerRequestStartDateTime
        );

        // Step 2: Apply debounce BEFORE fetching
        await this.debounce(delaySession, telemetryBuilder);

        if (cancellationToken.isCancellationRequested) {
            return Result.error(new NoNextEditReason.GotCancelled('afterDebounce'));
        }

        // Step 3: Use debounce time as context time budget
        const debounceTime = delaySession.getDebounceTime();
        const contextRequest = {
            timeBudget: debounceTime,
            timeoutEnd: Date.now() + debounceTime,
            // ...
        };

        // Step 4: Fetch language context
        const context = await raceTimeout(
            getContext(contextRequest),
            debounceTime
        );

        // Step 5: Construct prompt and fetch completion
        const completion = await this.fetchCompletion(context);

        // Step 6: Enforce artificial delay for UX consistency
        await this.enforceArtificialDelay(delaySession, telemetryBuilder);

        return Result.ok(completion);
    }

    private async debounce(
        delaySession: DelaySession,
        telemetry: StatelessNextEditTelemetryBuilder
    ) {
        const debounceTime = delaySession.getDebounceTime();
        telemetry.setDebounceTime(debounceTime);
        await timeout(debounceTime);
    }

    private async enforceArtificialDelay(
        delaySession: DelaySession,
        telemetry: StatelessNextEditTelemetryBuilder
    ) {
        const artificialDelay = delaySession.getArtificialDelay();
        telemetry.setArtificialDelay(artificialDelay);
        if (artificialDelay > 0) {
            await timeout(artificialDelay);
        }
    }

    public handleAcceptance(): void {
        this.delayer.handleAcceptance();
    }

    public handleRejection(): void {
        this.delayer.handleRejection();
    }
}
```

### 2. PukuNesNextEditProvider Integration

**File**: `src/extension/pukuai/vscode-node/providers/pukuNesNextEditProvider.ts`

```typescript
export class PukuNesNextEditProvider implements IPukuNextEditProvider<PukuNesResult> {
    private readonly _delayer: Delayer;

    constructor(
        private readonly xtabProvider: IStatelessNextEditProvider,
        // ...
    ) {
        super();
        // Track patterns in this layer for potential future use
        this._delayer = new Delayer(500, true);
    }

    async getNextEdit(
        docId: PukuDocumentId,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<PukuNesResult | null> {
        // NO manual delay here - XtabProvider handles debouncing
        const result = await this.xtabProvider.provideNextEdit(/* ... */);
        return result;
    }

    handleAcceptance(docId: PukuDocumentId, result: PukuNesResult): void {
        // Track locally AND delegate to xtabProvider
        this._delayer.handleAcceptance();
        this.xtabProvider.handleAcceptance?.();
    }

    handleRejection(docId: PukuDocumentId, result: PukuNesResult): void {
        // Track locally AND delegate to xtabProvider
        this._delayer.handleRejection();
        this.xtabProvider.handleRejection?.();
    }
}
```

### 3. VS Code API Registration

**File**: `src/extension/inlineEdits/vscode-node/inlineEditProviderFeature.ts`

```typescript
// Register with VS Code's InlineCompletionItemProvider API
languages.registerInlineCompletionItemProvider('*', provider, {
    displayName: 'Puku NES',
    yieldTo: ['github.copilot'],  // Yield to Copilot if it provides
    debounceDelayMs: 0,  // ← IMPORTANT: Disable VS Code debouncing
    groupId: 'nes',
    excludes: ['output'],
});
```

**Why `debounceDelayMs: 0`?**

VS Code provides built-in debouncing via `debounceDelayMs`, but we set it to 0 because:
1. We implement **adaptive** debouncing (learns from user behavior)
2. VS Code's debouncing is **static** (same delay always)
3. We need fine-grained control (end-of-line detection, context time budget, etc.)

## Selection Change Debouncing

**File**: `src/extension/inlineEdits/vscode-node/inlineEditModel.ts`

```typescript
private _registerSelectionChangeListener() {
    this._register(this._workspaceService.onDidChangeTextEditorSelection((e) => {
        // ... validation checks ...

        const debounceOnSelectionChange = this._configurationService.get(
            'InlineEditsDebounceOnSelectionChange'
        );

        if (debounceOnSelectionChange === undefined) {
            // No debounce - trigger immediately
            this._triggerInlineEdit();
        } else {
            // Allow 2 immediate changes (from edit + intentional move),
            // then debounce subsequent changes
            const N_ALLOWED_IMMEDIATE = 2;

            if (mostRecentChange.nConsequtiveSelectionChanges < N_ALLOWED_IMMEDIATE) {
                this._triggerInlineEdit();
            } else {
                mostRecentChange.timeout.value = createTimeout(
                    debounceOnSelectionChange,
                    () => this._triggerInlineEdit()
                );
            }

            mostRecentChange.incrementSelectionChangeEventCount();
        }
    }));
}
```

**Strategy**:
1. First selection change: From the edit itself → trigger immediately
2. Second selection change: User moving cursor → trigger immediately
3. Third+ selection changes: User rapidly moving cursor → debounce

## Performance Characteristics

### Baseline Performance (No History)

```
User types → 0ms
Debounce   → 200ms (base time)
Context    → 50ms  (language imports, semantic search)
Prompt     → 5ms   (construct)
LLM API    → 500ms (network + inference)
Display    → 5ms   (stream to UI)
────────────────────
Total      → 760ms
```

### Active User Performance (5 Acceptances)

```
User types → 0ms
Debounce   → 144ms (reduced 28%)
Context    → 50ms
Prompt     → 5ms
LLM API    → 500ms
Display    → 5ms
────────────────────
Total      → 704ms (56ms faster)
```

### Rejecting User Performance (5 Rejections)

```
User types → 0ms
Debounce   → 496ms (increased 148%)
Context    → 50ms
Prompt     → 5ms
LLM API    → 500ms
Display    → 5ms
────────────────────
Total      → 1056ms (296ms slower - less annoying)
```

## Testing Strategy

### Unit Tests

**File**: `src/extension/pukuai/common/delayer.spec.ts`

```typescript
describe('Delayer', () => {
    it('should start with baseline delay', () => {
        const delayer = new Delayer(200, true);
        const session = delayer.createDelaySession(Date.now());
        expect(session.getDebounceTime()).toBe(200);
    });

    it('should decrease delay after acceptances', () => {
        const delayer = new Delayer(200, true);

        delayer.handleAcceptance();
        delayer.handleAcceptance();
        delayer.handleAcceptance();

        const session = delayer.createDelaySession(Date.now());
        expect(session.getDebounceTime()).toBeLessThan(200);
    });

    it('should increase delay after rejections', () => {
        const delayer = new Delayer(200, true);

        delayer.handleRejection();
        delayer.handleRejection();
        delayer.handleRejection();

        const session = delayer.createDelaySession(Date.now());
        expect(session.getDebounceTime()).toBeGreaterThan(200);
    });

    it('should clamp delay between 50ms and 3000ms', () => {
        const delayer = new Delayer(200, true);

        // Try to go below 50ms
        for (let i = 0; i < 20; i++) {
            delayer.handleAcceptance();
        }
        let session = delayer.createDelaySession(Date.now());
        expect(session.getDebounceTime()).toBeGreaterThanOrEqual(50);

        // Try to go above 3000ms
        const delayer2 = new Delayer(200, true);
        for (let i = 0; i < 20; i++) {
            delayer2.handleRejection();
        }
        session = delayer2.createDelaySession(Date.now());
        expect(session.getDebounceTime()).toBeLessThanOrEqual(3000);
    });
});
```

### Integration Tests

**File**: `src/extension/pukuai/vscode-node/providers/pukuNesNextEditProvider.spec.ts`

```typescript
describe('PukuNesNextEditProvider', () => {
    it('should delegate acceptance to xtabProvider', async () => {
        const xtabProvider = mock<IStatelessNextEditProvider>();
        const provider = new PukuNesNextEditProvider(xtabProvider, ...);

        await provider.handleAcceptance(docId, result);

        expect(xtabProvider.handleAcceptance).toHaveBeenCalled();
    });

    it('should delegate rejection to xtabProvider', async () => {
        const xtabProvider = mock<IStatelessNextEditProvider>();
        const provider = new PukuNesNextEditProvider(xtabProvider, ...);

        await provider.handleRejection(docId, result);

        expect(xtabProvider.handleRejection).toHaveBeenCalled();
    });
});
```

### Manual Testing

See: `docs/prd/nes-delayer-manual-test-checklist.md`

## Debugging

### Enable Debug Logging

```json
{
  "puku.log.level": "trace"
}
```

### Console Logs to Watch

```typescript
// XtabProvider debounce
[NES] [XtabProvider] Debouncing for 224 ms

// Context time budget
[NES] [XtabProvider] Context timeBudget: 224ms, timeoutEnd: 1702901234567

// Artificial delay
[NES] [XtabProvider] Enforcing artificial delay of 50 ms

// Acceptance/Rejection tracking
[PukuNesNextEdit] NES suggestion accepted (requestId: 42)
[PukuNesNextEdit] NES suggestion rejected (requestId: 43)
```

### Telemetry Data

```typescript
interface NesDebouncetelemetry {
    debounceTime: number;           // Actual debounce time used
    artificialDelay: number;        // Extra delay for UX
    contextFetchTime: number;       // Time to get language context
    llmResponseTime: number;        // LLM API latency
    totalTime: number;              // End-to-end time
    userActionHistory: string[];    // ['accept', 'accept', 'reject', ...]
}
```

## Design Rationale

### Why Adaptive Debouncing?

1. **Respect active users**: If user frequently accepts suggestions, reduce delay for faster workflow
2. **Reduce noise for skeptical users**: If user rejects suggestions, increase delay to be less intrusive
3. **Learn from patterns**: Recent actions have more weight than old ones (exponential decay)
4. **Prevent API abuse**: Slower debounce = fewer API calls for users who don't benefit

### Why Exponential Decay?

```
Impact over time for a single rejection (weight 1.5):

t=0s:   1.5 × e^(0)     = 1.500  (100% impact)
t=60s:  1.5 × e^(-0.1)  = 1.357  (71% impact)
t=300s: 1.5 × e^(-0.5)  = 1.212  (42% impact)
t=600s: 1.5 × e^(-1.0)  = 1.084  (17% impact)
t=900s: 1.5 × e^(-1.5)  = 1.033  (7% impact)

After 10 minutes: impact is negligible
```

This ensures that:
- Recent behavior has strong influence
- Old behavior fades naturally
- System adapts to changing user patterns

### Why Time-Aware Adjustment?

If we've already spent 50ms doing async work (e.g., validation), we only wait an additional 150ms instead of the full 200ms. This ensures consistent **total** delay, not **added** delay.

```
Without time-aware:
  Validation: 50ms
  Debounce:   200ms
  Total:      250ms ❌ (inconsistent)

With time-aware:
  Validation: 50ms
  Debounce:   150ms (200 - 50)
  Total:      200ms ✅ (consistent)
```

### Why Artificial Delay?

Ensures minimum total time for UX predictability. If LLM responds very quickly (e.g., 50ms), we add artificial delay to avoid "jumpy" suggestions that appear/disappear rapidly.

```
Fast LLM response:
  Debounce:        200ms
  LLM response:    50ms
  Total so far:    250ms
  Artificial delay: 0ms (expected 200ms already passed)

Very fast LLM:
  Debounce:        200ms
  LLM response:    10ms
  Total so far:    210ms
  Artificial delay: 0ms (within expected window)

No debounce, fast LLM:
  Debounce:        0ms
  LLM response:    50ms
  Total so far:    50ms
  Artificial delay: 150ms (enforce minimum 200ms total)
```

## Future Enhancements

### Possible Improvements

1. **Per-language adjustment**: Different debounce for TypeScript vs Markdown
2. **Time-of-day learning**: Slower during morning warmup, faster during flow state
3. **File-type awareness**: Slower for config files, faster for code
4. **Cursor position heuristics**: Extra delay at end of line (already supported via config)
5. **Multi-model racing**: Use debounce time to race multiple LLM providers

### Experimental Features

Currently disabled in Puku but available in reference:

```typescript
// Extra debounce when cursor at end of line
if (isCursorAtEndOfLine) {
    delaySession.setExtraDebounce(100);
}

// Debounce on selection change
if (consecutiveSelectionChanges > 2) {
    await timeout(500);
}
```

## Related Documentation

- [NES Delayer System PRD](../prd/nes-delayer-system.md) - Product requirements and algorithm details
- [NES Delayer Testing Guide](../prd/nes-delayer-testing-guide.md) - Unit/integration test examples
- [NES Delayer Manual Test Checklist](../prd/nes-delayer-manual-test-checklist.md) - QA testing steps

## References

- Reference implementation: `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/`
- VS Code InlineCompletionItemProvider API: `vscode.proposed.inlineCompletionsAdditions.d.ts`
- Exponential decay formula: https://en.wikipedia.org/wiki/Exponential_decay
