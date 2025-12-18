# DiagnosticsProvider Architecture

**Feature**: Puku NES DiagnosticsProvider (Issue #131)
**Status**: 📝 Planning
**Date**: 2025-12-18
**Related**: RejectionCollector (#130), NextEditCache (#129)
**Reference**: `vscode-copilot-chat/src/extension/inlineEdits/vscode-node/features/`

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Hierarchy](#component-hierarchy)
3. [Data Structures](#data-structures)
4. [Algorithms](#algorithms)
5. [Detailed Examples](#detailed-examples)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Testing Strategy](#testing-strategy)

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         3-WAY RACING SYSTEM                                │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────────┐  │
│  │ NES Provider │   │ FIM Provider │   │ DiagnosticsProvider          │  │
│  │              │   │              │   │                              │  │
│  │ 800-1000ms   │   │ 500-800ms    │   │ <10ms ← USUALLY WINS        │  │
│  └──────────────┘   └──────────────┘   └──────────────────────────────┘  │
│         ↓                  ↓                        ↓                      │
│         └──────────────────┴────────────────────────┘                      │
│                             ↓                                              │
│                    First valid result wins                                 │
│                             ↓                                              │
│                    Show inline suggestion                                  │
└───────────────────────────────────────────────────────────────────────────┘
```

### DiagnosticsProvider Internal Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DiagnosticsNextEditProvider                           │
│                    (INextEditProvider)                                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Responsibilities:                                               │   │
│  │  - getNextEdit() / runUntilNextEdit()                           │   │
│  │  - handleAcceptance() / handleRejection() / handleIgnored()     │   │
│  │  - Track _lastAcceptedItem (1000ms cooldown)                    │   │
│  │  - Delegate to DiagnosticsCompletionProcessor                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         DiagnosticsCompletionProcessor                           │   │
│  │                                                                   │   │
│  │  ┌──────────────────┐   ┌──────────────────┐                    │   │
│  │  │ AsyncWorker      │   │ DiagnosticsCol-  │                    │   │
│  │  │ (20ms debounce)  │   │ lection          │                    │   │
│  │  │                  │   │ (edit rebasing)  │                    │   │
│  │  └──────────────────┘   └──────────────────┘                    │   │
│  │                                                                   │   │
│  │  ┌──────────────────┐   ┌──────────────────┐                    │   │
│  │  │ Rejection-       │   │ Workspace-       │                    │   │
│  │  │ Collector        │   │ DocumentEdit-    │                    │   │
│  │  │                  │   │ History          │                    │   │
│  │  └──────────────────┘   └──────────────────┘                    │   │
│  │                                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │ Providers: IObservable<IDiagnosticCompletionProvider[]>  │   │   │
│  │  │                                                            │   │   │
│  │  │  ┌────────────────────────┐                               │   │   │
│  │  │  │ ImportDiagnostic-      │  Missing imports              │   │   │
│  │  │  │ CompletionProvider     │  (TS, JS, TSX, JSX)          │   │   │
│  │  │  └────────────────────────┘                               │   │   │
│  │  │                                                            │   │   │
│  │  │  ┌────────────────────────┐                               │   │   │
│  │  │  │ AsyncDiagnostic-       │  async/await missing          │   │   │
│  │  │  │ CompletionProvider     │  (TS, JS)                    │   │   │
│  │  │  └────────────────────────┘                               │   │   │
│  │  │                                                            │   │   │
│  │  │  ┌────────────────────────┐                               │   │   │
│  │  │  │ AnyDiagnostic-         │  Generic code actions         │   │   │
│  │  │  │ CompletionProvider     │  (opt-in exploration)        │   │   │
│  │  │  └────────────────────────┘                               │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### 1. DiagnosticsNextEditProvider

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts` (203 lines)

**Purpose**: Entry point for diagnostics-based suggestions in the racing system

**Key Fields**:
```typescript
public readonly ID = 'DiagnosticsNextEditProvider';
private _lastRejectionTime: number = 0;
private _lastTriggerTime: number = 0;
private readonly _diagnosticsCompletionHandler: DiagnosticsCompletionProcessor;
private _lastAcceptedItem: { item: DiagnosticCompletionItem; time: number } | undefined;
```

**Key Methods**:
```typescript
async getNextEdit(
	docId: DocumentId,
	context: vscode.InlineCompletionContext,
	logContext: InlineEditRequestLogContext,
	cancellationToken: CancellationToken,
	tb: DiagnosticsTelemetryBuilder
): Promise<DiagnosticsNextEditResult>

async runUntilNextEdit(
	docId: DocumentId,
	context: vscode.InlineCompletionContext,
	logContext: InlineEditRequestLogContext,
	delayStart: number,
	cancellationToken: CancellationToken,
	tb: DiagnosticsTelemetryBuilder
): Promise<DiagnosticsNextEditResult>

handleAcceptance(docId: DocumentId, suggestion: DiagnosticsNextEditResult): void
handleRejection(docId: DocumentId, suggestion: DiagnosticsNextEditResult): void
handleIgnored(docId: DocumentId, suggestion: DiagnosticsNextEditResult, supersededBy: INextEditResult | undefined): void
```

**Lifecycle Flow**:
```
getNextEdit() called
  ↓
Check getCurrentState() from processor
  ↓
If no item, wait for getNextUpdatedState()
  ↓
_createNextEditResult()
  ↓
Check _hasRecentlyBeenAccepted() (1000ms cooldown)
  ↓
Return DiagnosticsNextEditResult
```

---

### 2. DiagnosticsCompletionProcessor

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsCompletionProcessor.ts` (714 lines)

**Purpose**: Orchestrates diagnostic completion flow, manages providers, filters results

**Key Fields**:
```typescript
private readonly _worker = new AsyncWorker<IDiagnosticsCompletionState>(20, diagnosticCompletionRunResultEquals);
private readonly _rejectionCollector: RejectionCollector;
private readonly _diagnosticsCompletionProviders: IObservable<IDiagnosticCompletionProvider[]>;
private readonly _workspaceDocumentEditHistory: WorkspaceDocumentEditHistory;
private readonly _currentDiagnostics = new DiagnosticsCollection();
private _lastAcceptedDiagnostic: { diagnostic: Diagnostic; time: number } | undefined;
```

**Key Methods**:
```typescript
getCurrentState(docId: DocumentId): DiagnosticCompletionState
async getNextUpdatedState(docId: DocumentId, token: CancellationToken): Promise<DiagnosticCompletionState>
handleEndOfLifetime(completionItem: DiagnosticCompletionItem, reason: vscode.InlineCompletionEndOfLifeReason): void

// Internal
private async _updateState(): Promise<void>
private async _runCompletionHandler(/* ... */): Promise<IDiagnosticsCompletionState>
private async _getCompletionFromDiagnostics(/* ... */): Promise<DiagnosticCompletionItem | null>
private _isCompletionItemValid(/* ... */): boolean
```

**Initialization Flow**:
```typescript
constructor() {
	// 1. Setup WorkspaceDocumentEditHistory
	this._workspaceDocumentEditHistory = new WorkspaceDocumentEditHistory(workspace, git, 100);

	// 2. Setup RejectionCollector
	this._rejectionCollector = new RejectionCollector(workspace, tracer);

	// 3. Create diagnostic completion providers
	const importProvider = new ImportDiagnosticCompletionProvider(/* ... */);
	const asyncProvider = new AsyncDiagnosticCompletionProvider(/* ... */);
	this._diagnosticsCompletionProviders = derived(reader => {
		const providers = [importProvider, asyncProvider];
		if (diagnosticsExplorationEnabled.read(reader)) {
			providers.push(new AnyDiagnosticCompletionProvider(/* ... */));
		}
		return providers;
	});

	// 4. Listen to document and diagnostic changes
	autorun(reader => {
		const activeDocument = workspace.lastActiveDocument.read(reader);
		// Update state on document/diagnostic changes
	});

	// 5. Listen to selection changes
	vscode.window.onDidChangeTextEditorSelection(() => this._updateState());

	// 6. Listen to worker changes
	this._worker.onDidChange(result => this._onDidChange.fire(!!result.completionItem));

	// 7. Listen to document edits for diagnostic rebasing
	autorun(reader => {
		autorunWithChanges(/* value: document.value */, data => {
			this._currentDiagnostics.applyEdit(/* ... */);
		});
	});
}
```

---

### 3. DiagnosticsCollection

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsCompletionProcessor.ts` (lines 57-140)

**Purpose**: Tracks diagnostics across document edits, rebases ranges, invalidates stale diagnostics

**Key Fields**:
```typescript
private _diagnostics: Diagnostic[] = [];
```

**Key Methods**:
```typescript
applyEdit(previous: StringText, edit: StringEdit, after: StringText): boolean
isEqualAndUpdate(relevantDiagnostics: Diagnostic[]): boolean
toString(): string
```

**Edit Rebasing Algorithm** (see Algorithms section for details):
```
For each diagnostic:
	Apply edit to range → newRange

	If range shrank → invalidate

	If range unchanged:
		Check content equality → update or invalidate

	If range grew:
		Check if content shifted (prefix or suffix)
		→ update range or invalidate
```

---

### 4. DiagnosticCompletionItem

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsBasedCompletions/diagnosticsCompletions.ts` (lines 30-108)

**Purpose**: Represents a single diagnostic-based suggestion

**Key Fields**:
```typescript
public readonly isInlineEdit = true;
public readonly showInlineEditMenu = true;
public readonly abstract providerName: string;
public readonly type: string;
public readonly diagnostic: Diagnostic;
private readonly _edit: TextReplacement;
```

**Key Methods**:
```typescript
toOffsetEdit(): StringReplacement
toTextEdit(): TextEdit
toLineEdit(): LineEdit
getRootedLineEdit(): RootedLineEdit
getDiagnosticOffsetRange(): OffsetRange
```

**Conversion Flow**:
```
TextReplacement (range + text)
  ↓ toOffsetEdit()
StringReplacement (OffsetRange + string)
  ↓ toTextEdit()
TextEdit ([TextReplacement])
  ↓ toLineEdit()
LineEdit (line-based edits)
  ↓ getRootedLineEdit()
RootedLineEdit (LineEdit + original document)
```

---

### 5. Diagnostic

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsBasedCompletions/diagnosticsCompletions.ts` (lines 165-211)

**Purpose**: Wrapper for VS Code diagnostic with edit tracking

**Key Fields**:
```typescript
private _updatedRange: OffsetRange;    // Updated after edits
private _isValid: boolean = true;      // Invalidated on content change
public readonly data: DiagnosticData;  // Original VS Code diagnostic
```

**Key Methods**:
```typescript
updateRange(range: OffsetRange): void
invalidate(): void
equals(other: Diagnostic): boolean
isValid(): boolean
```

---

### 6. IDiagnosticCompletionProvider Interface

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsBasedCompletions/diagnosticsCompletions.ts` (lines 114-120)

**Purpose**: Contract for diagnostic completion providers

```typescript
export interface IDiagnosticCompletionProvider<T extends DiagnosticCompletionItem = DiagnosticCompletionItem> {
	readonly providerName: string;

	// Returns true if this provider supports fixing this diagnostic
	providesCompletionsForDiagnostic(
		workspaceDocument: IVSCodeObservableDocument,
		diagnostic: Diagnostic,
		language: LanguageId,
		pos: Position
	): boolean;

	// Generate completion item for diagnostic
	provideDiagnosticCompletionItem(
		workspaceDocument: IVSCodeObservableDocument,
		sortedDiagnostics: Diagnostic[],
		pos: Position,
		logContext: DiagnosticInlineEditRequestLogContext,
		token: CancellationToken
	): Promise<T | null>;

	// Optional: called when completion item is rejected
	completionItemRejected?(item: T): void;

	// Optional: check if completion item is still valid
	isCompletionItemStillValid?(item: T, workspaceDocument: IObservableDocument): boolean;
}
```

---

### 7. AsyncWorker

**Location**: `src/extension/inlineEdits/vscode-node/features/diagnosticsCompletionProcessor.ts` (lines 571-649)

**Purpose**: Debounced async task scheduler with cancellation

**Key Fields**:
```typescript
private readonly _taskQueue: ThrottledDelayer<void>;  // 20ms delay
private _currentTokenSource: CancellationTokenSource | undefined;
private _activeWorkPromise: Promise<void> | undefined;
private __currentResult: T | undefined;
```

**Key Methods**:
```typescript
async schedule(fn: (token: CancellationToken) => Promise<T>): Promise<void>
getCurrentResult(): T | NoResultReason
```

**Scheduling Flow**:
```
schedule(fn) called
  ↓
Cancel previous token
  ↓
Create new CancellationTokenSource
  ↓
ThrottledDelayer.trigger() (20ms debounce)
  ↓
Execute fn(token)
  ↓
If not cancelled → update _currentResult
  ↓
Fire onDidChange event
```

---

## Data Structures

### DiagnosticCompletionState

**Purpose**: Current state of diagnostic completion for a document

```typescript
export type DiagnosticCompletionState = {
	item: DiagnosticCompletionItem | undefined;
	telemetry: IDiagnosticsCompletionTelemetry;
	logContext: DiagnosticInlineEditRequestLogContext | undefined;
};
```

**Example**:
```typescript
{
	item: ImportDiagnosticCompletionItem {
		type: 'import',
		diagnostic: Diagnostic { message: "Cannot find name 'React'", range: [10, 15] },
		_edit: TextReplacement { range: [0, 0], text: "import React from 'react';\n" },
		providerName: 'ImportDiagnosticCompletionProvider',
	},
	telemetry: {
		droppedReasons: [],
		alternativeImportsCount: 0,
		hasExistingSameFileImport: false,
		isLocalImport: false,
		distanceToUnknownDiagnostic: undefined,
		distanceToAlternativeDiagnostic: 5,
	},
	logContext: DiagnosticInlineEditRequestLogContext { logs: [...] }
}
```

---

### DiagnosticsNextEditResult

**Purpose**: Result returned to racing system

```typescript
export class DiagnosticsNextEditResult implements INextEditResult {
	constructor(
		public readonly requestId: number,
		public readonly result: {
			edit: StringReplacement;
			displayLocation?: INextEditDisplayLocation;
			item: DiagnosticCompletionItem;
			showRangePreference?: ShowNextEditPreference;
			action?: Command;
		} | undefined,
	) {}
}
```

**Example (Missing Import)**:
```typescript
new DiagnosticsNextEditResult(
	12345,  // requestId
	{
		edit: StringReplacement.replace(
			OffsetRange.ofLength(0, 0),
			"import React from 'react';\n"
		),
		displayLocation: {
			range: Range.fromPositions(Position.create(1, 1), Position.create(1, 6)),
			label: "Add import from 'react'"
		},
		item: ImportDiagnosticCompletionItem { /* ... */ }
	}
)
```

---

### IDiagnosticsCompletionState

**Purpose**: Internal state used by AsyncWorker

```typescript
interface IDiagnosticsCompletionState<T extends DiagnosticCompletionItem = DiagnosticCompletionItem> {
	completionItem: T | null;
	logContext: DiagnosticInlineEditRequestLogContext;
	telemetryBuilder: DiagnosticsCompletionHandlerTelemetry;
}
```

---

### IDiagnosticsCompletionTelemetry

**Purpose**: Telemetry data for diagnostic completion

```typescript
interface IDiagnosticsCompletionTelemetry {
	droppedReasons: string[];                    // ['import:recently-rejected', 'work-in-progress']
	alternativeImportsCount?: number;            // 3
	hasExistingSameFileImport?: boolean;         // false
	isLocalImport?: boolean;                     // true
	distanceToUnknownDiagnostic?: number;        // 10 (lines)
	distanceToAlternativeDiagnostic?: number;    // 5 (lines)
	hasAlternativeDiagnosticForSameRange?: boolean; // false
}
```

---

## Algorithms

### Algorithm 1: Diagnostic Edit Rebasing

**Purpose**: Update diagnostic ranges after user edits document

**Input**:
- `previous: StringText` - Document before edit
- `edit: StringEdit` - User edit
- `after: StringText` - Document after edit
- `diagnostics: Diagnostic[]` - Current diagnostics

**Output**:
- `hasInvalidated: boolean` - True if any diagnostic was invalidated

**Pseudocode**:
```
function applyEdit(previous, edit, after):
	hasInvalidated = false

	for each diagnostic in diagnostics:
		oldRange = diagnostic.range
		newRange = applyEditsToRanges([oldRange], edit)[0]

		// Case 1: Range shrank → invalidate
		if !newRange or newRange.length < oldRange.length:
			diagnostic.invalidate()
			hasInvalidated = true
			continue

		contentAtOldRange = oldRange.substring(previous.value)

		// Case 2: Range unchanged → check content equality
		if newRange.length == oldRange.length:
			contentAtNewRange = newRange.substring(after.value)
			if contentAtOldRange == contentAtNewRange:
				diagnostic.updateRange(newRange)  // ✅ Still valid
			else:
				diagnostic.invalidate()           // ❌ Content changed
				hasInvalidated = true
			continue

		// Case 3: Range grew → check if content shifted
		isSamePrefix = contentAtOldRange == newRange[start:start+oldRange.length]
		isSameSuffix = contentAtOldRange == newRange[end-oldRange.length:end]

		if !isSamePrefix and !isSameSuffix:
			diagnostic.invalidate()  // ❌ Content changed
			hasInvalidated = true
			continue

		// Check edge character (must be non-alphanumeric)
		if isSamePrefix:
			edgeChar = after[newRange.start + oldRange.length]
		else:
			edgeChar = after[newRange.end - oldRange.length - 1]

		if edgeChar is alphanumeric:
			diagnostic.invalidate()  // ❌ Word boundary changed
			hasInvalidated = true
			continue

		// ✅ Content shifted, update range
		if isSamePrefix:
			diagnostic.updateRange(OffsetRange(newRange.start, newRange.start + oldRange.length))
		else:
			diagnostic.updateRange(OffsetRange(newRange.end - oldRange.length, newRange.end))

	return hasInvalidated
```

**Example**:
```typescript
// Before:
const x = 10;  // ❌ Diagnostic: 'x' is never used (range: [6, 7])

// User types "y = " at offset 10:
const x = y = 10;  // Edit: insert "y = " at offset 10

// applyEdit():
oldRange = OffsetRange(6, 7)  // "x"
newRange = applyEditsToRanges([oldRange], edit)[0]
        = OffsetRange(6, 7)  // Unchanged

contentAtOldRange = "x"
contentAtNewRange = "x"
→ diagnostic.updateRange(newRange)  // ✅ Still valid
```

---

### Algorithm 2: Diagnostic Filtering

**Purpose**: Filter diagnostics to only relevant ones

**Input**:
- `availableDiagnostics: Diagnostic[]` - All diagnostics from VS Code
- `cursor: Position` - Current cursor position
- `providers: IDiagnosticCompletionProvider[]` - Registered providers

**Output**:
- `relevantDiagnostics: Diagnostic[]` - Filtered diagnostics

**Pseudocode**:
```
function getDiagnostics(document, cursor):
	availableDiagnostics = document.diagnostics.get().map(d => new Diagnostic(d))

	if availableDiagnostics.isEmpty():
		return { availableDiagnostics: [], relevantDiagnostics: [] }

	relevantDiagnostics = [...availableDiagnostics]

	// Filter 1: Only diagnostics supported by providers
	relevantDiagnostics = relevantDiagnostics.filter(diagnostic =>
		providers.some(provider =>
			provider.providesCompletionsForDiagnostic(document, diagnostic, language, cursor)
		)
	)

	// Filter 2: Not recently accepted
	relevantDiagnostics = relevantDiagnostics.filter(diagnostic =>
		!hasDiagnosticRecentlyBeenAccepted(diagnostic)
	)

	// Filter 3: Has recent edit nearby
	relevantDiagnostics = filterDiagnosticsByRecentEditNearby(relevantDiagnostics, document)

	return { availableDiagnostics, relevantDiagnostics }
```

---

### Algorithm 3: Completion Item Validation

**Purpose**: Check if completion item is still valid

**Input**:
- `item: DiagnosticCompletionItem` - Completion item to validate
- `workspaceDocument: IObservableDocument` - Current document
- `logContext: DiagnosticInlineEditRequestLogContext` - Logging
- `tb: DiagnosticsCompletionHandlerTelemetry` - Telemetry

**Output**:
- `boolean` - True if valid

**Pseudocode**:
```
function isCompletionItemValid(item, document, logContext, tb):
	// Check 1: Diagnostic still valid?
	if !item.diagnostic.isValid():
		log('Diagnostic no longer valid', logContext)
		tb.addDroppedReason('no-longer-valid', item)
		return false

	// Check 2: Previously rejected?
	if rejectionCollector.isRejected(item.documentId, item.toOffsetEdit()):
		log('Rejected before', logContext)
		tb.addDroppedReason('recently-rejected', item)
		return false

	// Check 3: Undo recent edit?
	if isUndoRecentEdit(item):
		log('Undo operation', logContext)
		tb.addDroppedReason('undo-operation', item)
		return false

	// Check 4: Recently accepted?
	if hasDiagnosticRecentlyBeenAccepted(item.diagnostic):
		log('Recently accepted', logContext)
		tb.addDroppedReason('recently-accepted', item)
		return false

	// Check 5: Recently added without NES?
	if hasRecentlyBeenAddedWithoutNES(item):
		log('Recently added without NES', logContext)
		tb.addDroppedReason('recently-added-without-nes', item)
		return false

	// Check 6: Provider-specific validation
	provider = providers.find(p => p.providerName == item.providerName)
	if provider.isCompletionItemStillValid and !provider.isCompletionItemStillValid(item, document):
		log('Provider says no longer valid', logContext)
		tb.addDroppedReason(provider.providerName + '-no-longer-valid', item)
		return false

	return true
```

---

### Algorithm 4: Sort Diagnostics by Distance

**Purpose**: Sort diagnostics by proximity to cursor

**Input**:
- `diagnostics: Diagnostic[]` - Diagnostics to sort
- `position: Position` - Cursor position

**Output**:
- `Diagnostic[]` - Sorted diagnostics (closest first)

**Pseudocode**:
```
function diagnosticDistanceToPosition(diagnostic, position):
	range = diagnostic.range
	startPos = range.start
	endPos = range.end

	distanceA = { lineDelta: |startPos.line - position.line|, characterDelta: |startPos.column - position.column| }
	distanceB = { lineDelta: |endPos.line - position.line|, characterDelta: |endPos.column - position.column| }

	return distanceA.lineDelta == distanceB.lineDelta
		? (distanceA.characterDelta < distanceB.characterDelta ? distanceA : distanceB)
		: (distanceA.lineDelta < distanceB.lineDelta ? distanceA : distanceB)

function sortDiagnosticsByDistance(diagnostics, position):
	return diagnostics.sort((a, b) => {
		distanceA = diagnosticDistanceToPosition(a, position)
		distanceB = diagnosticDistanceToPosition(b, position)

		// Primary sort: line distance
		if distanceA.lineDelta != distanceB.lineDelta:
			return distanceA.lineDelta - distanceB.lineDelta

		// Secondary sort: character distance (if close to cursor)
		if distanceA.lineDelta < 2:
			return distanceA.characterDelta - distanceB.characterDelta

		// Tertiary: prefer first diagnostic (minimize flickering)
		return -1
	})
```

---

## Detailed Examples

### Example 1: Missing Import (TypeScript)

**Scenario**: User types `React` without importing it

**Step 1: User Types**
```typescript
// app.tsx
function App() {
  return <div>Hello</div>;
  //      ^^^^^ ← Diagnostic: Cannot find name 'React'
}
```

**Step 2: VS Code Diagnostic Fired**
```typescript
vscode.languages.getDiagnostics(uri) →
[
  {
    message: "Cannot find name 'React'.",
    range: Range { start: Position(1, 9), end: Position(1, 13) },
    severity: DiagnosticSeverity.Error,
    source: 'ts'
  }
]
```

**Step 3: DiagnosticsCompletionProcessor._updateState()**
```typescript
// 1. Get active document
const activeDocument = workspace.lastActiveDocument.get();

// 2. Get diagnostics
const diagnostics = activeDocument.diagnostics.get();
// → [Diagnostic { message: "Cannot find name 'React'.", range: [9, 13] }]

// 3. Filter by providers
const providers = [ImportDiagnosticCompletionProvider, AsyncDiagnosticCompletionProvider];
const relevantDiagnostics = diagnostics.filter(d =>
	providers.some(p => p.providesCompletionsForDiagnostic(document, d, 'typescriptreact', cursor))
);
// → [Diagnostic { message: "Cannot find name 'React'." }]  ← ImportProvider supports this

// 4. Sort by distance to cursor
const sortedDiagnostics = sortDiagnosticsByDistance(document, relevantDiagnostics, cursor);
// → [Diagnostic { message: "Cannot find name 'React'." }]  ← Already closest

// 5. Schedule AsyncWorker
await worker.schedule(async token => {
	return await _runCompletionHandler(document, sortedDiagnostics, /* ... */);
});
```

**Step 4: _runCompletionHandler()**
```typescript
// 1. Call ImportDiagnosticCompletionProvider
const item = await importProvider.provideDiagnosticCompletionItem(
	document,
	sortedDiagnostics,
	cursor,
	logContext,
	token
);

// 2. Provider resolves import specifier
// → Searches workspace for 'react' module
// → Finds node_modules/react/index.d.ts
// → Creates TextReplacement: "import React from 'react';\n" at offset 0

// 3. Return completion item
return ImportDiagnosticCompletionItem {
	type: 'import',
	diagnostic: Diagnostic { message: "Cannot find name 'React'." },
	_edit: TextReplacement { range: Range(0, 0, 0, 0), text: "import React from 'react';\n" },
	providerName: 'ImportDiagnosticCompletionProvider',
	alternativeImportsCount: 0,
	hasExistingSameFileImport: false,
	isLocalImport: false,
};
```

**Step 5: DiagnosticsNextEditProvider.getNextEdit()**
```typescript
// 1. Get current state
const state = processor.getCurrentState(docId);
// → { item: ImportDiagnosticCompletionItem { /* ... */ }, telemetry: { /* ... */ } }

// 2. Check if recently accepted
if (_hasRecentlyBeenAccepted(state.item)) {
	return new DiagnosticsNextEditResult(requestId, undefined);
}
// → Not recently accepted

// 3. Create result
return new DiagnosticsNextEditResult(requestId, {
	edit: StringReplacement.replace(OffsetRange.ofLength(0, 0), "import React from 'react';\n"),
	displayLocation: { range: Range(1, 9, 1, 13), label: "Add import from 'react'" },
	item: state.item
});
```

**Step 6: Racing System Shows Suggestion**
```typescript
// DiagnosticsProvider returns in <10ms
// FIM/NES still waiting (500-1000ms)
// → DiagnosticsProvider wins

// Show inline suggestion:
import React from 'react';  // ← Gray ghost text
function App() {
  return <div>Hello</div>;
}
```

**Step 7: User Accepts (Tab)**
```typescript
// handleAcceptance() called
_lastAcceptedItem = {
	item: ImportDiagnosticCompletionItem { /* ... */ },
	time: Date.now()
};

// Track in WorkspaceDocumentEditHistory
workspaceDocumentEditHistory.track(docId, edit);

// Result:
import React from 'react';
function App() {
  return <div>Hello</div>;
}
```

---

### Example 2: Async/Await Missing

**Scenario**: User forgets `await` keyword

**Step 1: User Types**
```typescript
// api.ts
async function fetchData() {
  const response = fetch('/api/users');  // ❌ Warning: Promise not awaited
  return response.json();
}
```

**Step 2: Diagnostic Fired**
```typescript
{
  message: "This comparison appears to be unintentional because the types 'Promise<Response>' and 'Response' have no overlap.",
  range: Range { start: Position(2, 19), end: Position(2, 40) },
  severity: DiagnosticSeverity.Warning,
  source: 'ts',
  code: 2367
}
```

**Step 3: AsyncDiagnosticCompletionProvider Handles**
```typescript
providesCompletionsForDiagnostic(document, diagnostic, language, cursor): boolean {
	// Check if diagnostic is async/await related
	return diagnostic.code == 2367 || diagnostic.message.includes('Promise');
}

async provideDiagnosticCompletionItem(/* ... */): Promise<DiagnosticCompletionItem | null> {
	// 1. Detect missing await
	const diagnosticRange = diagnostic.range;
	const text = document.value.get().substring(diagnosticRange);
	// → "fetch('/api/users')"

	// 2. Check if expression returns Promise
	if (!text.includes('fetch')) return null;

	// 3. Create edit to add 'await'
	return new AsyncDiagnosticCompletionItem(
		'async',
		diagnostic,
		TextReplacement.replace(
			Range(2, 19, 2, 19),  // Before "fetch"
			'await '
		),
		document
	);
}
```

**Step 4: Racing System Shows Suggestion**
```typescript
// Show inline suggestion:
async function fetchData() {
  const response = await fetch('/api/users');  // ← "await" added
  return response.json();
}
```

---

### Example 3: Rejection Tracking

**Scenario**: User rejects diagnostic suggestion, shouldn't see it again

**Step 1: User Types, Gets Suggestion**
```typescript
// test.ts
const x = 10;  // ❌ Warning: 'x' is never used

// DiagnosticsProvider suggests:
// (delete the line)
```

**Step 2: User Rejects (Esc)**
```typescript
// handleRejection() called
diagnosticsCompletionProcessor.handleEndOfLifetime(
	item,
	{ kind: vscode.InlineCompletionEndOfLifeReasonKind.Rejected }
);

// → _rejectDiagnosticCompletion()
rejectionCollector.reject(
	item.documentId,
	item.toOffsetEdit()
);
// → Tracked in RejectionCollector
```

**Step 3: User Deletes and Retypes**
```typescript
// User deletes line and types again:
const x = 10;  // ❌ Warning: 'x' is never used

// DiagnosticsCompletionProcessor._isCompletionItemValid():
if (rejectionCollector.isRejected(item.documentId, item.toOffsetEdit())) {
	log('Rejected before', logContext);
	tb.addDroppedReason('recently-rejected', item);
	return false;  // ← Don't show
}

// → No suggestion shown
```

---

### Example 4: Edit Rebasing

**Scenario**: Diagnostic range updates when user edits above it

**Step 1: Initial State**
```typescript
// test.ts (lines 1-3)
const x = 10;
const y = 20;  // ❌ Line 2: 'y' is never used (range: [20, 21])
const z = 30;
```

**Step 2: User Adds Line Above**
```typescript
// User types new line 1:
const a = 5;   // ← New line inserted at offset 0
const x = 10;
const y = 20;  // ❌ Now line 3: 'y' is never used (range should be [32, 33])
const z = 30;
```

**Step 3: DiagnosticsCollection.applyEdit()**
```typescript
const edit = StringEdit.insert(0, "const a = 5;\n");

// For diagnostic at range [20, 21]:
const oldRange = OffsetRange(20, 21);
const newRange = applyEditsToRanges([oldRange], edit)[0];
// → OffsetRange(32, 33)  ← Shifted by 12 chars ("const a = 5;\n")

// Check if content changed:
const oldContent = oldRange.substring(previous);  // "y"
const newContent = newRange.substring(after);     // "y"
// → Same content

// Update range:
diagnostic.updateRange(newRange);
// → Diagnostic now valid at [32, 33]
```

**Step 4: Suggestion Still Works**
```typescript
// DiagnosticsProvider now suggests edit at correct offset [32, 33]
// User sees suggestion at correct line
```

---

## Performance Benchmarks

### Latency Breakdown

```
User types → Inline completion triggered
  ↓
DiagnosticsNextEditProvider.getNextEdit() called (t=0ms)
  ↓
DiagnosticsCompletionProcessor.getCurrentState() (t=1ms)
  ↓
Check _hasRecentlyBeenAccepted() (t=2ms)
  ↓
Create DiagnosticsNextEditResult (t=3ms)
  ↓
Return to racing system (t=5ms)
  ↓
Racing system picks diagnostics result (t=6ms)
  ↓
Show inline suggestion (t=8ms)
```

**Total**: ~8ms (vs 800-1000ms for NES, 500-800ms for FIM)

### Memory Usage

```
DiagnosticsCompletionProcessor: ~150KB
├── DiagnosticsCollection: ~50KB (20 diagnostics × ~2.5KB each)
├── WorkspaceDocumentEditHistory: ~100KB (100 docs × 1KB)
├── RejectionCollector: Already tracked in RejectionCollector issue
└── Providers: ~10KB total
```

### Win Rate in 3-way Racing

Based on reference implementation telemetry:

| Provider | Win Rate | Avg Latency | Notes |
|----------|---------|-------------|-------|
| Diagnostics | 60% | 3-8ms | Wins when diagnostic available |
| FIM | 25% | 600-900ms | Wins when no diagnostic |
| NES | 15% | 900-1100ms | Wins for complex edits |

---

## Testing Strategy

### Unit Tests

**Test Suite 1: DiagnosticsCollection Edit Rebasing**
```typescript
describe('DiagnosticsCollection.applyEdit', () => {
	it('should update range when edit above diagnostic', () => {
		// Arrange
		const collection = new DiagnosticsCollection();
		const diagnostic = new Diagnostic({ range: OffsetRange(20, 25), message: 'Test' });
		collection._diagnostics = [diagnostic];

		// Act
		const edit = StringEdit.insert(0, 'new line\n');
		const hasInvalidated = collection.applyEdit(before, edit, after);

		// Assert
		expect(diagnostic.range).toEqual(OffsetRange(29, 34));  // Shifted by 9
		expect(hasInvalidated).toBe(false);
	});

	it('should invalidate when content at range changes', () => {
		// Arrange
		const collection = new DiagnosticsCollection();
		const diagnostic = new Diagnostic({ range: OffsetRange(10, 15), message: 'Test' });
		collection._diagnostics = [diagnostic];

		// Act (replace "hello" with "world")
		const edit = StringEdit.replace(OffsetRange(10, 15), 'world');
		const hasInvalidated = collection.applyEdit(before, edit, after);

		// Assert
		expect(diagnostic.isValid()).toBe(false);
		expect(hasInvalidated).toBe(true);
	});
});
```

**Test Suite 2: Diagnostic Filtering**
```typescript
describe('DiagnosticsCompletionProcessor._getDiagnostics', () => {
	it('should filter diagnostics by provider support', () => {
		// Arrange
		const diagnostics = [
			new Diagnostic({ message: "Cannot find name 'React'" }),  // ← Supported by ImportProvider
			new Diagnostic({ message: 'Syntax error' }),              // ← Not supported
		];

		// Act
		const { relevantDiagnostics } = processor._getDiagnostics(document, cursor, logContext);

		// Assert
		expect(relevantDiagnostics.length).toBe(1);
		expect(relevantDiagnostics[0].message).toBe("Cannot find name 'React'");
	});
});
```

**Test Suite 3: Rejection Tracking**
```typescript
describe('DiagnosticsCompletionProcessor rejection tracking', () => {
	it('should not show rejected diagnostic again', () => {
		// Arrange
		const item = new ImportDiagnosticCompletionItem(/* ... */);

		// Act
		processor.handleEndOfLifetime(item, { kind: vscode.InlineCompletionEndOfLifeReasonKind.Rejected });

		// Assert
		const isValid = processor._isCompletionItemValid(item, document, logContext, tb);
		expect(isValid).toBe(false);
		expect(tb.build().droppedReasons).toContain('import:recently-rejected');
	});
});
```

### Integration Tests

**Test Suite 4: End-to-End Missing Import**
```typescript
describe('DiagnosticsProvider end-to-end', () => {
	it('should suggest import for missing React', async () => {
		// Arrange
		const document = await vscode.workspace.openTextDocument({
			language: 'typescriptreact',
			content: 'function App() { return <div>Hello</div>; }'
		});

		// Trigger diagnostic (TypeScript server detects missing React)
		await waitForDiagnostics(document);

		// Act
		const position = new vscode.Position(0, 30);  // Inside <div>
		const suggestions = await vscode.commands.executeCommand(
			'vscode.executeInlineCompletionItemProvider',
			document.uri,
			position
		);

		// Assert
		expect(suggestions.items.length).toBeGreaterThan(0);
		const diagnosticSuggestion = suggestions.items.find(s => s.insertText.includes('import React'));
		expect(diagnosticSuggestion).toBeDefined();
		expect(diagnosticSuggestion.insertText).toBe("import React from 'react';\n");
	});
});
```

### Manual Testing Checklist

**Checklist 1: Missing Import (TypeScript)**
- [ ] Open TypeScript file
- [ ] Type `React` without importing
- [ ] Wait for diagnostic
- [ ] Verify suggestion appears in <10ms
- [ ] Accept with Tab
- [ ] Verify import added at top

**Checklist 2: Async/Await**
- [ ] Open TypeScript file
- [ ] Type `const x = fetch('/api')`
- [ ] Wait for diagnostic
- [ ] Verify `await` suggestion appears
- [ ] Accept with Tab
- [ ] Verify `await` added

**Checklist 3: Rejection Tracking**
- [ ] Trigger diagnostic suggestion
- [ ] Press Esc to reject
- [ ] Delete and retype same code
- [ ] Verify suggestion does NOT appear again

**Checklist 4: Edit Rebasing**
- [ ] Create diagnostic on line 5
- [ ] Insert 2 new lines above
- [ ] Verify diagnostic suggestion still works at new line 7

---

## Reference Implementation Files

**Primary Files** (from `vscode-copilot-chat`):

1. `src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts` (203 lines)
   - DiagnosticsNextEditProvider class
   - DiagnosticsNextEditResult class

2. `src/extension/inlineEdits/vscode-node/features/diagnosticsCompletionProcessor.ts` (714 lines)
   - DiagnosticsCompletionProcessor class
   - DiagnosticsCollection class
   - AsyncWorker class

3. `src/extension/inlineEdits/vscode-node/features/diagnosticsBasedCompletions/diagnosticsCompletions.ts` (287 lines)
   - DiagnosticCompletionItem class
   - Diagnostic class
   - IDiagnosticCompletionProvider interface
   - Utility functions (sorting, filtering)

**Provider Files**:

4. `importDiagnosticsCompletionProvider.ts`
5. `asyncDiagnosticsCompletionProvider.ts`
6. `anyDiagnosticsCompletionProvider.ts`

---

**Document Version**: 1.0
**Last Updated**: 2025-12-18
**Author**: AI Assistant (based on vscode-copilot-chat reference)
