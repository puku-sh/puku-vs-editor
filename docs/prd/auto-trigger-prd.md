# PRD: Auto-Triggering System for Inline Completions

**Issue**: #88
**Priority**: P0 (Critical)
**Effort**: 3-4 days
**Status**: Ready for Implementation

---

## 1. Problem Statement

Currently, NES (Next Edit Suggestions) and diagnostics providers are integrated into the 3-way racing system but **never triggered automatically**. Users must manually press keyboard shortcuts (`Option+]` or `Ctrl+I`) to see suggestions.

**Impact**: Without auto-triggering, the 3-way racing system is essentially non-functional for real-world use.

---

## 2. Goals

### Primary Goals
1. **Automatic Triggering**: Suggestions appear automatically as users type and move cursor
2. **Smart Debouncing**: Avoid triggering too frequently (performance/cost)
3. **Rejection Awareness**: Don't re-trigger immediately after user rejects a suggestion
4. **Same-line Cooldown**: Avoid spamming suggestions on the same line

### Success Metrics
- Auto-trigger firing rate: 2-5 per minute during active coding
- User-perceived latency: <1s from trigger to first suggestion
- False positive rate: <5% (triggers when user doesn't want suggestions)

---

## 3. Architecture Overview

### 3.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                 PukuAutoTrigger Service                      │
├─────────────────────────────────────────────────────────────┤
│  • Document Change Listener                                  │
│    - Tracks edit timestamps per document                     │
│    - Ignores undo/redo events                               │
│                                                              │
│  • Selection Change Listener                                 │
│    - Monitors cursor movements                               │
│    - Applies cooldown logic                                  │
│    - Triggers completion via callback                        │
│                                                              │
│  • State Management                                          │
│    - LastChange map (per document)                          │
│    - Rejection timestamps                                    │
│    - Line-level trigger history                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    triggerCallback()
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          vscode.commands.executeCommand(                     │
│            'editor.action.inlineCompletions.trigger'         │
│          )                                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           PukuUnifiedInlineProvider                          │
│           (provideInlineCompletionItems)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Data Structures

### 4.1 LastChange Class

Tracks recent edit history for a document.

```typescript
class LastChange {
	/**
	 * Timestamp when document was last edited (milliseconds)
	 */
	public lastEditedTimestamp: number;

	/**
	 * Map of line numbers to trigger timestamps
	 * Used for same-line cooldown logic
	 *
	 * Example:
	 * {
	 *   15: 1703001234567,  // Line 15 triggered at timestamp
	 *   16: 1703001235789,  // Line 16 triggered at timestamp
	 *   20: 1703001240123   // Line 20 triggered at timestamp
	 * }
	 */
	public lineNumberTriggers: Map<number, number>;

	/**
	 * Document URI for reference
	 */
	public documentUri: string;

	constructor(document: vscode.TextDocument) {
		this.lastEditedTimestamp = Date.now();
		this.lineNumberTriggers = new Map();
		this.documentUri = document.uri.toString();
	}
}
```

### 4.2 PukuAutoTrigger State

```typescript
class PukuAutoTrigger {
	/**
	 * Map of document URIs to their last change state
	 *
	 * Example:
	 * {
	 *   "file:///Users/user/project/src/main.ts": LastChange { ... },
	 *   "file:///Users/user/project/src/utils.ts": LastChange { ... }
	 * }
	 */
	private readonly docToLastChangeMap: Map<string, LastChange>;

	/**
	 * URI of the document that last had a selection change
	 * Used to detect document switches
	 */
	private lastDocWithSelectionUri: string | undefined;

	/**
	 * Timestamp of the most recent edit across all documents
	 */
	private lastEditTimestamp: number | undefined;

	/**
	 * Timestamp when user last rejected a completion (pressed ESC)
	 * Used for rejection cooldown
	 */
	private lastRejectionTime: number;
}
```

---

## 5. Triggering Logic & Rules

### 5.1 Document Change Event

**Trigger**: `vscode.workspace.onDidChangeTextDocument`

**Actions**:
1. Record edit timestamp: `lastEditTimestamp = Date.now()`
2. Create/update `LastChange` for document
3. Ignore undo/redo events
4. Ignore special documents (output pane, git, debug)

**Example Flow**:
```typescript
User types "const x = " in main.ts
  ↓
onDidChangeTextDocument fires
  ↓
docToLastChangeMap.set('file:///.../main.ts', new LastChange(doc))
  ↓
lastEditTimestamp = 1703001234567
```

### 5.2 Selection Change Event

**Trigger**: `vscode.window.onDidChangeTextEditorSelection`

**Conditions for Triggering** (ALL must be true):

| Condition | Rule | Reason |
|-----------|------|--------|
| Single selection | `e.selections.length === 1` | Multi-cursor not supported |
| Empty selection | `e.selections[0].isEmpty` | User not selecting text |
| Not in rejection cooldown | `now - lastRejectionTime > 5000ms` | User rejected recently |
| Document has recent edit | `now - lastEditedTimestamp < 10000ms` | Document edited within 10s |
| Not same line cooldown | `now - lineLastTrigger > 5000ms` | Avoid spamming same line |

**Example Flow**:
```typescript
User types "const x = " then moves cursor to next line
  ↓
onDidChangeTextEditorSelection fires
  ↓
Check conditions:
  ✅ Single selection
  ✅ Empty selection (cursor, not highlighting)
  ✅ No rejection in last 5s
  ✅ Document edited 2s ago (< 10s limit)
  ✅ Different line than last trigger
  ↓
triggerCallback() → executeCommand('editor.action.inlineCompletions.trigger')
  ↓
PukuUnifiedInlineProvider.provideInlineCompletionItems() called
  ↓
3-way racing starts (FIM vs NES vs Diagnostics)
```

---

## 6. Cooldown Constants

Reference: `vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineEditModel.ts:29-31`

```typescript
/**
 * Only trigger if document was edited within last 10 seconds
 * Prevents triggering on old documents user is just browsing
 */
const TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT = 10000; // 10s

/**
 * Don't trigger on same line within 5 seconds
 * Prevents spamming same line with suggestions
 */
const TRIGGER_INLINE_EDIT_ON_SAME_LINE_COOLDOWN = 5000; // 5s

/**
 * Don't trigger within 5s of user rejecting (ESC key)
 * Respects user intent to not see suggestions
 */
const TRIGGER_INLINE_EDIT_REJECTION_COOLDOWN = 5000; // 5s
```

---

## 7. Examples

### Example 1: Normal Typing Flow

**Scenario**: User types code and moves cursor

```typescript
// Initial state: empty file

// [User types] "function add(a, b) {"
Document Change Event → lastEditTimestamp = T0
  docToLastChangeMap['file://main.ts'] = LastChange(T0)

// [User presses Enter and moves to next line]
Selection Change Event (T0 + 500ms)
  ✅ Document edited 500ms ago (< 10s)
  ✅ Line 1 → Line 2 (new line)
  ✅ No rejection cooldown
  ↓
  🚀 TRIGGER! → Show NES/diagnostics/FIM suggestions
  lineNumberTriggers.set(2, T0 + 500ms)

// [User accepts suggestion with Tab]
// [User types more]
Document Change Event → lastEditTimestamp = T0 + 3000ms

// [User moves cursor again on line 2]
Selection Change Event (T0 + 3200ms)
  ❌ Same line cooldown (triggered line 2 only 2.7s ago)
  ↓
  ⛔ DON'T TRIGGER

// [User moves to line 3]
Selection Change Event (T0 + 4000ms)
  ✅ Different line (3 vs 2)
  ✅ Document edited 1s ago
  ↓
  🚀 TRIGGER! → Show suggestions for line 3
```

### Example 2: Rejection Cooldown

**Scenario**: User rejects suggestion, continues typing

```typescript
// [Auto-trigger shows suggestion]
Selection Change Event → Show FIM suggestion

// [User presses ESC to reject]
notifyRejection() → lastRejectionTime = T0

// [User moves cursor immediately]
Selection Change Event (T0 + 100ms)
  ❌ Rejection cooldown (only 100ms since rejection)
  ↓
  ⛔ DON'T TRIGGER
  Also clear docToLastChangeMap (reset state)

// [User makes new edit after 6 seconds]
Document Change Event (T0 + 6000ms)
  lastEditTimestamp = T0 + 6000ms

// [User moves cursor]
Selection Change Event (T0 + 6500ms)
  ✅ Rejection cooldown expired (6500ms > 5000ms)
  ✅ Document edited 500ms ago
  ↓
  🚀 TRIGGER! → Show suggestions again
```

### Example 3: Stale Document (No Trigger)

**Scenario**: User opens old file, just browsing

```typescript
// [User opened file 5 minutes ago, no edits]
lastEditTimestamp = T0 (5 minutes ago)

// [User scrolls and clicks cursor to line 50]
Selection Change Event (now = T0 + 300000ms)
  ❌ No recent edit (300000ms > 10000ms limit)
  ↓
  ⛔ DON'T TRIGGER
  (User is just browsing, not actively coding)

// [User makes edit]
Document Change Event → lastEditTimestamp = T1

// [User moves cursor]
Selection Change Event (T1 + 200ms)
  ✅ Document edited 200ms ago (< 10s)
  ↓
  🚀 TRIGGER! → Now user is actively coding
```

---

## 8. Integration Points

### 8.1 PukuUnifiedInlineProvider

**Change Required**: Add rejection notification

```typescript
export class PukuUnifiedInlineProvider {
	private autoTrigger?: PukuAutoTrigger;

	constructor(..., autoTrigger: PukuAutoTrigger) {
		this.autoTrigger = autoTrigger;
	}

	public handleEndOfLifetime(
		item: vscode.InlineCompletionItem,
		reason: vscode.InlineCompletionEndOfLifeReason
	): void {
		// Existing code...

		if (reason.kind === vscode.InlineCompletionEndOfLifeReasonKind.Rejected) {
			// NEW: Notify auto-trigger about rejection
			this.autoTrigger?.notifyRejection();
		}
	}
}
```

### 8.2 pukuaiContribution.ts

**Change Required**: Instantiate and register auto-trigger

```typescript
// Create auto-trigger service
const autoTrigger = this._instantiationService.createInstance(
	PukuAutoTrigger,
	() => {
		// Trigger callback: invoke VS Code's inline completion API
		vscode.commands.executeCommand(
			'editor.action.inlineCompletions.trigger'
		);
	}
);

// Pass to unified provider
const unifiedProvider = this._instantiationService.createInstance(
	PukuUnifiedInlineProvider,
	fimProvider,
	diagnosticsNextEditProvider,
	nesProvider,
	autoTrigger,  // NEW parameter
	this._logService,
	this._instantiationService
);

// Register disposables
this._register(autoTrigger);
```

---

## 9. Testing Strategy

### 9.1 Manual Testing Checklist

- [ ] **Normal typing flow**: Type code, move cursor → suggestions appear
- [ ] **Rejection cooldown**: Press ESC, move cursor → no suggestions for 5s
- [ ] **Same-line cooldown**: Move cursor on same line quickly → only 1 trigger per 5s
- [ ] **Stale document**: Open old file, move cursor → no suggestions (no recent edit)
- [ ] **Multi-cursor**: Select with multiple cursors → no trigger
- [ ] **Text selection**: Highlight text → no trigger
- [ ] **Undo/redo**: Press Cmd+Z → no trigger (ignores undo events)
- [ ] **Output pane**: Type in output pane → no trigger (ignored scheme)

### 9.2 Expected Behavior

**Scenario**: Open TypeScript file, type function

```typescript
// File: test.ts (empty)

// Type: "function hello() {"
//   → Document change recorded
// Press Enter, cursor moves to line 2
//   → ✅ AUTO-TRIGGER fires
//   → FIM/NES/Diagnostics race
//   → Ghost text suggestion appears within ~800ms

// Type: "console.log('hello');"
//   → Document change recorded
// Press Enter again
//   → ✅ AUTO-TRIGGER fires
//   → New suggestions appear

// Press ESC to reject
//   → Rejection recorded
// Move cursor immediately
//   → ⛔ NO TRIGGER (cooldown active)

// Wait 6 seconds, move cursor
//   → ✅ AUTO-TRIGGER fires (cooldown expired)
```

---

## 10. Performance Considerations

### 10.1 Memory Management

**Problem**: `lineNumberTriggers` map could grow unbounded

**Solution**: Cleanup old entries

```typescript
// Cleanup old line triggers (prevent memory leak)
if (mostRecentChange.lineNumberTriggers.size > 100) {
	for (const [lineNumber, timestamp] of mostRecentChange.lineNumberTriggers.entries()) {
		if (now - timestamp > TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT) {
			mostRecentChange.lineNumberTriggers.delete(lineNumber);
		}
	}
}
```

### 10.2 Event Frequency

**Document changes**: ~100-1000/min during active typing
**Selection changes**: ~10-50/min during normal coding
**Actual triggers**: ~2-5/min (after cooldown filtering)

**Result**: 95%+ of events filtered out → minimal performance impact

---

## 11. Future Enhancements

### Phase 2 (Issue #92 - Delayer/Debouncing)
- Adaptive debouncing (faster after acceptance, slower after rejection)
- First 2 selection changes trigger immediately, 3rd+ debounced

### Phase 3 (Optional)
- Document switch triggering (open file → auto-suggest)
- Configurable cooldown times via settings
- Per-language trigger rules

---

## 12. Reference Implementation

**Location**: `@puku-editor/reference/vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineEditModel.ts`

**Key Classes**:
- `InlineEditTriggerer` (lines 87-313) - Main auto-trigger logic
- `LastChange` (lines 66-85) - State tracking

**Key Methods**:
- `_registerDocumentChangeListener()` (lines 121-147)
- `_registerSelectionChangeListener()` (lines 149-263)
- `_triggerInlineEdit()` (lines 310-312)

---

## 13. Acceptance Criteria

### Must Have (P0)
- [x] Document change monitoring implemented
- [x] Selection change monitoring implemented
- [x] Rejection cooldown (5s) working
- [x] Same-line cooldown (5s) working
- [x] Recent edit filter (10s) working
- [x] Integration with PukuUnifiedInlineProvider
- [x] Auto-triggers fire 2-5 times per minute during active coding

### Nice to Have (P1)
- [ ] Configurable cooldown times
- [ ] Telemetry for trigger frequency
- [ ] Adaptive debouncing (Issue #92)

### Out of Scope
- Blocklist filtering (comments/strings/imports) → Issue #89
- Streaming support → Issue #91
- Multi-document awareness → Issue #96

---

## 14. Rollout Plan

### Phase 1: Implementation (2 days)
1. Create `PukuAutoTrigger` service (Day 1)
2. Integrate with `PukuUnifiedInlineProvider` (Day 1)
3. Register in `pukuaiContribution.ts` (Day 1)
4. Manual testing (Day 2)

### Phase 2: Testing & Refinement (1 day)
1. Test all cooldown scenarios
2. Verify performance (CPU/memory)
3. Adjust cooldown constants if needed

### Phase 3: Deployment (1 day)
1. Internal dogfooding
2. Collect trigger frequency metrics
3. Fix any edge cases
4. Release to users

**Total Estimated Time**: 3-4 days

---

## 15. Success Metrics (Post-Launch)

After 1 week of usage:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Auto-trigger firing rate | 2-5/min | Log frequency in PukuAutoTrigger |
| User-perceived latency | <1s | Time from trigger to first suggestion |
| Rejection rate | <30% | Ratio of rejections to acceptances |
| False positive rate | <5% | User feedback + rejection patterns |
| Performance impact | <1% CPU | Profile VS Code extension host |

---

## 16. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Too frequent triggering → API cost | Medium | High | Cooldown constants, telemetry monitoring |
| Too infrequent triggering → poor UX | Medium | Medium | User feedback, adjust constants |
| Memory leak (lineNumberTriggers) | Low | Medium | Cleanup logic (>100 entries) |
| Performance impact on large files | Low | Medium | Ignore documents >10k lines |
| Conflict with manual triggers | Low | Low | VS Code handles duplicate triggers |

---

## Appendix A: VS Code API Reference

### Trigger Inline Completion

```typescript
// Method 1: Command (recommended)
vscode.commands.executeCommand('editor.action.inlineCompletions.trigger');

// Method 2: Direct call (if provider has reference)
// Not needed - VS Code automatically calls provideInlineCompletionItems
```

### Events Used

```typescript
// Document changes
vscode.workspace.onDidChangeTextDocument(
	(e: vscode.TextDocumentChangeEvent) => { ... }
);

// Cursor movements
vscode.window.onDidChangeTextEditorSelection(
	(e: vscode.TextEditorSelectionChangeEvent) => { ... }
);
```

### Completion Lifecycle

```typescript
interface vscode.InlineCompletionItemProvider {
	provideInlineCompletionItems(...): Promise<...>;

	// Optional: handle lifecycle events
	handleEndOfLifetime?(
		item: vscode.InlineCompletionItem,
		reason: vscode.InlineCompletionEndOfLifeReason
	): void;
}

// Rejection detection
if (reason.kind === vscode.InlineCompletionEndOfLifeReasonKind.Rejected) {
	// User pressed ESC
}
```

---

**End of PRD**

---

**Next Steps**:
1. Review and approve PRD
2. Begin implementation of `PukuAutoTrigger` service
3. Integrate with existing 3-way racing system
4. Test and refine cooldown constants
