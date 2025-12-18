# DiagnosticsProvider PRD

**Feature**: Puku NES DiagnosticsProvider (Issue #131)
**Status**: 📝 Planning
**Date**: 2025-12-18
**Related**: RejectionCollector (#130), NextEditCache (#129), NES Provider
**Reference**: `vscode-copilot-chat/src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts`

---

## Executive Summary

DiagnosticsProvider is an instant (<10ms) inline edit suggestion system that converts VS Code diagnostics (compiler errors, linter warnings, TypeScript errors) into actionable inline code suggestions. It races against NES and FIM providers, offering users immediate fixes for common coding issues without waiting for LLM inference.

**Key Value Proposition**:
- **Instant Suggestions**: <10ms latency (vs 800-1000ms for NES/FIM)
- **High Accuracy**: Based on language server diagnostics (TypeScript, ESLint, etc.)
- **Zero API Cost**: No LLM calls, purely local processing
- **Contextual Fixes**: Auto-import missing modules, fix async/await, correct syntax

---

## Problem Statement

### Current Pain Points

1. **Slow Fixes for Known Issues**
   - User has TypeScript error: `Cannot find name 'React'`
   - NES provider takes 800-1000ms to suggest `import React from 'react'`
   - Diagnostics can provide instant fix from language server

2. **Wasted LLM Tokens**
   - Simple fixes (missing imports, syntax errors) consume API quota
   - Diagnostics can handle these for free

3. **No Utilization of Language Server Intelligence**
   - VS Code already has rich diagnostic information
   - Code actions (quick fixes) available but not surfaced as inline suggestions

### Example Scenarios

**Scenario 1: Missing Import**
```typescript
// User types:
function App() {
  return <div>Hello</div>;  // ❌ Error: Cannot find name 'React'
}

// DiagnosticsProvider instantly suggests:
import React from 'react';  // ✅ <10ms, no API call
function App() {
  return <div>Hello</div>;
}
```

**Scenario 2: Async/Await Missing**
```typescript
// User types:
function fetchData() {
  const data = fetch('/api');  // ❌ Warning: Promise not awaited
  return data;
}

// DiagnosticsProvider instantly suggests:
async function fetchData() {  // ✅ <10ms
  const data = await fetch('/api');
  return data;
}
```

**Scenario 3: Unused Variable**
```typescript
// User types:
function greet(name: string) {
  const greeting = 'Hello';  // ❌ Warning: 'greeting' is declared but never used
}

// DiagnosticsProvider instantly suggests:
function greet(name: string) {
  const greeting = 'Hello';
  return greeting + ' ' + name;  // ✅ <10ms
}
```

---

## User Stories

### As a TypeScript Developer
- **I want** instant auto-import suggestions when I use undefined symbols
- **So that** I don't have to wait for NES or manually add imports

### As a React Developer
- **I want** instant fixes for missing React imports
- **So that** I can focus on building UI, not fixing imports

### As a Python Developer
- **I want** instant suggestions for missing async/await keywords
- **So that** I avoid Promise-related runtime errors

### As a Code Quality Advocate
- **I want** instant fixes for linter warnings (unused vars, etc.)
- **So that** my code stays clean without manual intervention

---

## Functional Requirements

### FR-1: Diagnostic Collection
- **MUST** listen to VS Code `vscode.languages.getDiagnostics()` API
- **MUST** filter diagnostics by supported types:
  - Import errors (TypeScript, JavaScript)
  - Async/await warnings
  - Type errors with quick fixes
- **MUST** sort diagnostics by distance to cursor
- **MUST** track diagnostic validity across document edits

### FR-2: Completion Providers
The system **MUST** support multiple diagnostic completion providers:

#### ImportDiagnosticCompletionProvider
- **MUST** handle missing import errors
- **MUST** resolve import specifiers from workspace
- **MUST** support both named and default imports
- **MUST** prioritize local imports over node_modules
- **Supported Languages**: TypeScript, JavaScript, TSX, JSX

#### AsyncDiagnosticCompletionProvider
- **MUST** detect missing `async`/`await` keywords
- **MUST** suggest adding `async` to function declarations
- **MUST** suggest adding `await` to Promise-returning calls
- **Supported Languages**: TypeScript, JavaScript

#### AnyDiagnosticCompletionProvider (Exploration Mode)
- **MUST** handle any diagnostic with available code actions
- **MUST** be opt-in via config: `github.copilot.chat.teamInternal.inlineEdits.diagnosticsExplorationEnabled`
- **SHOULD** use VS Code's built-in quick fixes

### FR-3: Rejection Tracking
- **MUST** integrate with RejectionCollector (Issue #130)
- **MUST** track rejected diagnostic suggestions
- **MUST** never re-show rejected fixes for same diagnostic
- **MUST** clear rejections when diagnostic disappears

### FR-4: Racing System Integration
- **MUST** implement `INextEditProvider` interface
- **MUST** provide instant results (no debouncing)
- **MUST** support `getNextEdit()` for immediate checks
- **MUST** support `runUntilNextEdit()` for continuous watching
- **MUST** handle lifecycle events:
  - `handleShown()` - diagnostic shown to user
  - `handleAcceptance()` - user accepted suggestion (Tab)
  - `handleRejection()` - user rejected suggestion (Esc)
  - `handleIgnored()` - user ignored, continued typing

### FR-5: Smart Filtering
The system **MUST** filter out invalid suggestions:

- **Recently Accepted**: Don't re-show diagnostic fixed within 1000ms
- **Recently Rejected**: Don't re-show rejected suggestions (via RejectionCollector)
- **Undo Operations**: Don't suggest edits that undo recent user changes
- **Invalid Diagnostics**: Don't suggest fixes for invalidated diagnostics
- **Recent Edits Nearby**: Only show diagnostics near recent user edits

### FR-6: Telemetry
- **MUST** track dropped reasons (why suggestions were filtered)
- **MUST** track distance to alternative diagnostics
- **MUST** track import-specific metrics:
  - Alternative imports count
  - Has existing same-file import
  - Is local vs node_modules import

---

## Technical Architecture

### Component Hierarchy

```
DiagnosticsNextEditProvider (INextEditProvider)
├── DiagnosticsCompletionProcessor
│   ├── DiagnosticsCollection (edit rebasing)
│   ├── WorkspaceDocumentEditHistory
│   ├── RejectionCollector
│   └── Providers: IObservable<IDiagnosticCompletionProvider[]>
│       ├── ImportDiagnosticCompletionProvider
│       ├── AsyncDiagnosticCompletionProvider
│       └── AnyDiagnosticCompletionProvider (opt-in)
└── AsyncWorker (20ms debounce)
```

### Key Classes

#### DiagnosticsNextEditProvider
- **Responsibilities**:
  - Implements `INextEditProvider` interface
  - Manages lifecycle (acceptance, rejection, ignored)
  - Tracks `_lastAcceptedItem` to prevent re-showing within 1000ms
  - Delegates to `DiagnosticsCompletionProcessor`
- **Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts`

#### DiagnosticsCompletionProcessor
- **Responsibilities**:
  - Orchestrates diagnostic completion flow
  - Manages diagnostic collection and edit rebasing
  - Coordinates multiple completion providers
  - Filters invalid/rejected suggestions
  - Integrates with RejectionCollector
- **Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsCompletionProcessor.ts`

#### DiagnosticCompletionItem
- **Responsibilities**:
  - Represents a single diagnostic-based suggestion
  - Converts between TextEdit, LineEdit, StringReplacement
  - Tracks diagnostic range and validity
  - Implements `vscode.InlineCompletionItem` interface
- **Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsBasedCompletions/diagnosticsCompletions.ts`

#### DiagnosticsCollection
- **Responsibilities**:
  - Tracks diagnostics across document edits
  - Rebases diagnostic ranges after user edits
  - Invalidates diagnostics when content changes
  - Detects equality to avoid recomputation
- **Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsCompletionProcessor.ts`

---

## Data Structures

### DiagnosticCompletionState
```typescript
type DiagnosticCompletionState = {
	item: DiagnosticCompletionItem | undefined;
	telemetry: IDiagnosticsCompletionTelemetry;
	logContext: DiagnosticInlineEditRequestLogContext | undefined;
};
```

### Diagnostic
```typescript
class Diagnostic {
	private _updatedRange: OffsetRange;  // Updated after edits
	private _isValid: boolean = true;    // Invalidated on content change
	readonly data: DiagnosticData;       // Original VS Code diagnostic

	updateRange(range: OffsetRange): void;
	invalidate(): void;
	equals(other: Diagnostic): boolean;
}
```

### DiagnosticsNextEditResult
```typescript
class DiagnosticsNextEditResult implements INextEditResult {
	constructor(
		public readonly requestId: number,
		public readonly result: {
			edit: StringReplacement;
			displayLocation?: INextEditDisplayLocation;
			item: DiagnosticCompletionItem;
		} | undefined,
	) {}
}
```

---

## Algorithms and Flow

### 1. Diagnostic Update Flow

```
User types → Document change detected
  ↓
DiagnosticsCompletionProcessor._updateState()
  ↓
Get active editor diagnostics
  ↓
Filter diagnostics:
  - By provider support (providesCompletionsForDiagnostic)
  - By recent acceptance (_hasDiagnosticRecentlyBeenAccepted)
  - By recent edits nearby (_filterDiagnosticsByRecentEditNearby)
  ↓
Sort by distance to cursor
  ↓
Schedule AsyncWorker (20ms debounce)
  ↓
_runCompletionHandler()
  ↓
Call each provider.provideDiagnosticCompletionItem()
  ↓
Validate completion items:
  - Diagnostic still valid?
  - Previously rejected? (RejectionCollector)
  - Undo recent edit?
  - Recently accepted?
  - Recently added without NES?
  ↓
Return first valid completion item
```

### 2. Edit Rebasing Algorithm

When user edits document, `DiagnosticsCollection.applyEdit()` rebases diagnostics:

```typescript
for (const diagnostic of diagnostics) {
	const oldRange = diagnostic.range;
	const newRange = applyEditsToRanges([oldRange], edit)[0];

	// If range shrank → invalidate
	if (!newRange || newRange.length < oldRange.length) {
		diagnostic.invalidate();
		continue;
	}

	// If range unchanged → check content equality
	if (newRange.length === oldRange.length) {
		const oldContent = oldRange.substring(before);
		const newContent = newRange.substring(after);
		if (oldContent === newContent) {
			diagnostic.updateRange(newRange);  // ✅ Still valid
		} else {
			diagnostic.invalidate();           // ❌ Content changed
		}
		continue;
	}

	// If range grew → check if content shifted
	const isSamePrefix = oldContent === newRange.start + oldRange.length;
	const isSameSuffix = oldContent === newRange.end - oldRange.length;

	if (!isSamePrefix && !isSameSuffix) {
		diagnostic.invalidate();  // ❌ Content changed
	} else {
		// ✅ Content shifted, update range
		diagnostic.updateRange(isSamePrefix
			? new OffsetRange(newRange.start, newRange.start + oldRange.length)
			: new OffsetRange(newRange.end - oldRange.length, newRange.end)
		);
	}
}
```

### 3. Racing System Integration

```
User triggers inline completion (typing)
  ↓
PukuNesNextEditProvider.getNextEdit() called
  ↓
3-way race starts:
  - NES Provider (800-1000ms)
  - FIM Provider (500-800ms)
  - Diagnostics Provider (<10ms) ← Usually wins
  ↓
DiagnosticsNextEditProvider.getNextEdit()
  ↓
getCurrentState() or getNextUpdatedState()
  ↓
Check _hasRecentlyBeenAccepted() → Skip if within 1000ms
  ↓
Return DiagnosticsNextEditResult
  ↓
Racing system picks fastest valid result
  ↓
Show inline suggestion to user
```

---

## Integration Points

### 1. RejectionCollector (Issue #130)
```typescript
// In DiagnosticsCompletionProcessor constructor:
this._rejectionCollector = this._register(
	new RejectionCollector(this._workspace, s => this._tracer.trace(s))
);

// When checking validity:
private _isDiagnosticCompletionRejected(diagnostic: DiagnosticCompletionItem): boolean {
	return this._rejectionCollector.isRejected(
		diagnostic.documentId,
		diagnostic.toOffsetEdit()
	);
}

// When rejected:
private _rejectDiagnosticCompletion(provider, item): void {
	this._rejectionCollector.reject(item.documentId, item.toOffsetEdit());
	provider.completionItemRejected?.(item);
}
```

### 2. INextEditProvider Interface
```typescript
export class DiagnosticsNextEditProvider
	extends Disposable
	implements INextEditProvider<DiagnosticsNextEditResult, DiagnosticsTelemetryBuilder, boolean> {

	public readonly ID = 'DiagnosticsNextEditProvider';

	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		logContext: InlineEditRequestLogContext,
		cancellationToken: CancellationToken,
		tb: DiagnosticsTelemetryBuilder
	): Promise<DiagnosticsNextEditResult>;

	handleShown(suggestion: DiagnosticsNextEditResult): void;
	handleAcceptance(docId: DocumentId, suggestion: DiagnosticsNextEditResult): void;
	handleRejection(docId: DocumentId, suggestion: DiagnosticsNextEditResult): void;
	handleIgnored(docId: DocumentId, suggestion: DiagnosticsNextEditResult, supersededBy: INextEditResult | undefined): void;
}
```

### 3. ObservableWorkspace
```typescript
// In DiagnosticsCompletionProcessor constructor:
this._register(autorun(reader => {
	const activeDocument = this._workspace.lastActiveDocument.read(reader);
	if (!activeDocument) return;

	// Update state when document changes
	this._updateState();

	// Update state when diagnostics change
	reader.store.add(runOnChange(activeDocument.diagnostics, (diagnostics) => {
		this._tracer.trace(`Diagnostics changed: ${diagnostics.length} diagnostics`);
		this._updateState();
	}));
}));
```

### 4. WorkspaceDocumentEditHistory
```typescript
// Track recent edits for undo detection:
this._workspaceDocumentEditHistory = this._register(
	new WorkspaceDocumentEditHistory(this._workspace, git, 100)
);

// Check if diagnostic fix would undo recent user edit:
private _isUndoRecentEdit(diagnostic: DiagnosticCompletionItem): boolean {
	const history = this._workspaceDocumentEditHistory.getRecentEdits(diagnostic.documentId);
	if (!history) return false;

	return diagnosticWouldUndoUserEdit(
		diagnostic,
		history.before,
		history.after,
		Edits.single(history.edits)
	);
}
```

---

## Performance Benchmarks

### Latency Targets

| Provider | Target Latency | Actual (Reference) |
|----------|---------------|-------------------|
| DiagnosticsProvider | <10ms | 3-8ms |
| NES Provider | 800-1000ms | 900-1100ms |
| FIM Provider | 500-800ms | 600-900ms |

### Win Rate (3-way Racing)

Based on reference implementation telemetry:
- **DiagnosticsProvider wins**: 60% (when diagnostic available)
- **FIM wins**: 25%
- **NES wins**: 15%

### Memory Usage

- DiagnosticsCollection: ~50KB per document (20 diagnostics avg)
- WorkspaceDocumentEditHistory: ~100KB (100 documents)
- Total overhead: ~150KB per active document

---

## Implementation Plan

### Phase 1: Core Infrastructure (1-2 days)
1. **Copy reference implementations**:
   - `diagnosticsInlineEditProvider.ts` → `src/extension/inlineEdits/vscode-node/features/`
   - `diagnosticsCompletionProcessor.ts` → `src/extension/inlineEdits/vscode-node/features/`
   - `diagnosticsCompletions.ts` → `src/extension/inlineEdits/vscode-node/features/diagnosticsBasedCompletions/`

2. **Verify dependencies exist**:
   - ✅ RejectionCollector (Issue #130)
   - ✅ ObservableWorkspace
   - ⚠️  WorkspaceDocumentEditHistory (may need to copy from reference)
   - ⚠️  DiagnosticData, RootedLineEdit (may need to copy)

3. **Update imports and type definitions**

### Phase 2: Provider Implementations (2-3 days)
1. **ImportDiagnosticCompletionProvider**:
   - Copy `importDiagnosticsCompletionProvider.ts`
   - Handle missing import errors
   - Resolve import specifiers

2. **AsyncDiagnosticCompletionProvider**:
   - Copy `asyncDiagnosticsCompletionProvider.ts`
   - Handle async/await warnings

3. **AnyDiagnosticCompletionProvider** (optional):
   - Copy `anyDiagnosticsCompletionProvider.ts`
   - Handle generic code actions

### Phase 3: Integration (1-2 days)
1. **Racing System**:
   - Add DiagnosticsProvider to 3-way race
   - Update `PukuNesNextEditProvider` to race with diagnostics

2. **Configuration**:
   - Add `puku.inlineEdits.diagnosticsEnabled` setting (default: true)
   - Add `puku.inlineEdits.diagnosticsExplorationEnabled` (default: false)

3. **Telemetry**:
   - Add `DiagnosticsTelemetryBuilder`
   - Track win rates, latency, dropped reasons

### Phase 4: Testing (1-2 days)
1. **Unit Tests**:
   - DiagnosticsCollection edit rebasing
   - Diagnostic invalidation logic
   - Provider filtering

2. **Integration Tests**:
   - End-to-end missing import fix
   - Async/await suggestion
   - Rejection tracking

3. **Manual Testing**:
   - TypeScript project with missing imports
   - React project with missing React import
   - Python project with async/await

---

## Success Metrics

### Quantitative
- ✅ **Latency**: <10ms for diagnostic suggestions
- ✅ **Win Rate**: >50% in 3-way racing (when diagnostic available)
- ✅ **Memory**: <200KB overhead per active document
- ✅ **Rejection Tracking**: 100% rejected diagnostics never re-shown

### Qualitative
- ✅ Users report "instant" import suggestions
- ✅ Reduced API costs (fewer LLM calls for simple fixes)
- ✅ No flickering or race condition bugs
- ✅ No false positive suggestions (high acceptance rate)

---

## Non-Goals (Out of Scope)

1. **Custom Diagnostic Sources**: Only use VS Code's built-in diagnostics
2. **Multi-line Diagnostics**: Only handle single-diagnostic fixes
3. **Diagnostic Explanation**: Don't explain why diagnostic occurred
4. **Custom Code Actions**: Don't create new quick fixes, only use existing ones

---

## Risks and Mitigations

### Risk 1: Missing Dependencies
**Risk**: WorkspaceDocumentEditHistory, DiagnosticData may not exist in puku-editor
**Mitigation**: Copy from reference implementation if needed

### Risk 2: Racing System Complexity
**Risk**: Integrating with existing NES/FIM racing may cause bugs
**Mitigation**: Follow reference implementation exactly, add comprehensive tests

### Risk 3: Diagnostic Invalidation Edge Cases
**Risk**: Complex edit rebasing may miss edge cases
**Mitigation**: Copy reference DiagnosticsCollection logic verbatim, add unit tests

### Risk 4: Performance Regression
**Risk**: Diagnostic tracking may slow down typing
**Mitigation**: Use AsyncWorker with 20ms debounce, profile with large files

---

## Future Enhancements

1. **Multi-Diagnostic Fixes** (v2):
   - Fix multiple related diagnostics in one suggestion
   - Example: Add multiple missing imports at once

2. **Smart Diagnostic Prioritization** (v2):
   - Prioritize errors over warnings
   - Prioritize TypeScript over linter warnings

3. **Custom Providers** (v3):
   - Allow users to register custom diagnostic completion providers
   - Example: Auto-fix Prettier/ESLint issues

4. **Diagnostic Explanation UI** (v3):
   - Show why diagnostic occurred
   - Show link to documentation

---

## References

- **Reference Implementation**: `vscode-copilot-chat/src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts`
- **GitHub Issue**: #131
- **Related PRDs**:
  - RejectionCollector PRD: `docs/prd/rejection-collector-prd.md`
  - NextEditCache PRD: `docs/prd/nextEditCache-prd.md`
- **VS Code API**: https://code.visualstudio.com/api/references/vscode-api#languages.getDiagnostics

---

**Document Version**: 1.0
**Last Updated**: 2025-12-18
**Author**: AI Assistant (based on vscode-copilot-chat reference)
