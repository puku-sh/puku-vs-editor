# PRD: NES (Next Edit Suggestions) Provider Implementation

**Status**: Draft
**Priority**: P2 (Nice to have - FIM + Diagnostics sufficient for MVP)
**Effort**: Large (4-6 weeks)
**Owner**: TBD
**Created**: 2025-01-17

## Executive Summary

Implement a full NES (Next Edit Suggestions) provider for Puku Editor to enable intelligent code refactoring suggestions based on edit history. This will complete the 3-way racing architecture (FIM, Diagnostics, NES) pioneered by GitHub Copilot.

## Background

### Current State

Puku Editor currently has:
- ✅ **FIM Provider** (`pukuFimProvider.ts`) - Context-aware inline completions
- ✅ **Diagnostics Provider** (`pukuDiagnosticsNextEditProvider.ts`) - Error/warning fixes
- ⚠️ **NES Provider** (`pukuNesNextEditProvider.ts`) - Stub only, not functional

### Why NES?

NES (Next Edit Suggestions) provides:
1. **Intelligent refactoring** based on recent edit patterns
2. **Multi-document suggestions** when editing related files
3. **Xtab (cross-tab) awareness** - learn from edits across the workspace
4. **Racing architecture** - best suggestion wins from 3 providers

### Reference Implementation

GitHub Copilot Chat implements NES in:
- `vscode-copilot-chat/src/extension/inlineEdits/node/nextEditProvider.ts`
- `vscode-copilot-chat/src/extension/xtab/node/xtabProvider.ts`

## Problem Statement

The current NES provider stub at `pukuNesNextEditProvider.ts` cannot function because it lacks:

1. **Edit History Infrastructure** - No tracking of document edits over time
2. **Observable Documents** - No reactive document state management
3. **Xtab History Tracker** - No cross-tab edit pattern learning
4. **Stateless Request Construction** - Cannot create `StatelessNextEditRequest` (requires 12 parameters)
5. **Result Processing** - No streaming via `PushEdit`, no edit rebasing

## Goals

### Primary Goals

1. Implement full edit history tracking infrastructure
2. Create observable document wrappers for VS Code documents
3. Build Xtab history tracker for cross-tab learning
4. Construct proper `StatelessNextEditRequest` instances
5. Handle streaming results and edit rebasing

### Non-Goals

1. Not replacing FIM or Diagnostics providers
2. Not changing the racing architecture
3. Not modifying the unified inline provider interface

## User Stories

### Story 1: Refactoring Pattern Learning
**As a** developer
**I want** the editor to learn from my refactoring patterns
**So that** it can suggest similar changes in related code

**Acceptance Criteria**:
- When I rename a variable in one function, NES suggests similar renames in related functions
- When I add null checks to one method, NES suggests similar checks elsewhere
- Suggestions appear within 1s of completing the initial edit

### Story 2: Multi-Document Refactoring
**As a** developer
**I want** suggestions that span multiple files
**So that** I can maintain consistency across my codebase

**Acceptance Criteria**:
- When I update an interface, NES suggests updating implementations
- When I change a function signature, NES suggests updating call sites
- Multi-file suggestions are clearly labeled

### Story 3: Cross-Tab Learning
**As a** developer
**I want** the editor to learn from edits across all open tabs
**So that** it can detect broader refactoring patterns

**Acceptance Criteria**:
- Xtab history tracks last 20 edits across workspace
- Pattern detection works across TypeScript, JavaScript, Python, Go
- History persists across editor restarts (optional)

## Technical Design

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    NES Provider Architecture                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PukuNesNextEditProvider (Adapter)                              │
│  ├─ Implements: IPukuNextEditProvider<PukuNesResult>            │
│  ├─ Delegates to: XtabProvider (IStatelessNextEditProvider)     │
│  └─ Converts: VS Code types ↔ Internal types                    │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Edit History Infrastructure                                     │
│  ├─ HistoryContext                                               │
│  │  ├─ Tracks: Document edits over time                         │
│  │  ├─ Stores: LineEdit, Edits, RootedLineEdit                 │
│  │  └─ Provides: Document before/after states                   │
│  │                                                               │
│  ├─ IObservableDocument                                          │
│  │  ├─ Wraps: vscode.TextDocument                               │
│  │  ├─ Observes: Content changes, selection changes             │
│  │  └─ Emits: Observable<StringText>, Observable<Selection>     │
│  │                                                               │
│  └─ XtabHistoryTracker                                          │
│     ├─ Tracks: Last 20 edits across workspace                   │
│     ├─ Learns: Edit patterns (renames, type changes, etc.)      │
│     └─ Returns: IXtabHistoryEntry[]                             │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Request Construction                                            │
│  ├─ StatelessNextEditRequest (12 parameters)                    │
│  │  ├─ headerRequestId: string                                  │
│  │  ├─ opportunityId: string                                    │
│  │  ├─ documentBeforeEdits: StringText                          │
│  │  ├─ documents: StatelessNextEditDocument[]                   │
│  │  ├─ activeDocumentIdx: number                                │
│  │  ├─ xtabEditHistory: IXtabHistoryEntry[]                     │
│  │  ├─ firstEdit: DeferredPromise<Result<...>>                  │
│  │  ├─ nLinesEditWindow: number | undefined                     │
│  │  ├─ logContext: InlineEditRequestLogContext                  │
│  │  ├─ recordingBookmark: DebugRecorderBookmark | undefined     │
│  │  ├─ recording: LogEntry[] | undefined                        │
│  │  └─ providerRequestStartDateTime: number | undefined         │
│  │                                                               │
│  └─ StatelessNextEditDocument (8 parameters)                    │
│     ├─ id: DocumentId                                            │
│     ├─ workspaceRoot: URI | undefined                           │
│     ├─ languageId: LanguageId                                   │
│     ├─ documentLinesBeforeEdit: string[]                        │
│     ├─ recentEdit: LineEdit                                     │
│     ├─ documentBeforeEdits: StringText                          │
│     ├─ recentEdits: Edits                                       │
│     └─ lastSelectionInAfterEdit: OffsetRange | undefined        │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Result Processing                                               │
│  ├─ PushEdit Callback                                           │
│  │  ├─ Receives: Result<{edit, window?, targetDocument?}, ...>  │
│  │  ├─ Converts: LineEdit → VS Code Range + text               │
│  │  └─ Creates: vscode.InlineCompletionItem                     │
│  │                                                               │
│  ├─ Edit Rebasing                                                │
│  │  ├─ Checks: Document state consistency                       │
│  │  ├─ Rebases: Cached edits if document changed               │
│  │  └─ Falls back: Create new request if rebase fails          │
│  │                                                               │
│  └─ Caching                                                      │
│     ├─ Reuses: Pending requests for same document               │
│     ├─ Caches: Results for fast replay                          │
│     └─ Invalidates: On document changes                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. HistoryContext
```typescript
interface HistoryContext {
	documents: IObservableDocument[];
	getDocumentAndIdx(docId: DocumentId): { doc: IObservableDocument; idx: number } | undefined;
	getLastEdit(docId: DocumentId): RootedEdit | undefined;
	getLastEdits(docId: DocumentId): Edits | undefined;
}
```

**Implementation**:
- Track document edits in a circular buffer (last 100 edits per document)
- Store as `LineEdit` instances (line-based operations)
- Compute `documentBeforeEdits` and `documentAfterEdits` on demand
- Clear history when document closes

#### 2. IObservableDocument
```typescript
interface IObservableDocument {
	readonly id: DocumentId;
	readonly value: IObservable<StringText>;
	readonly selection: IObservable<OffsetRange[]>;
	readonly languageId: LanguageId;
	dispose(): void;
}
```

**Implementation**:
- Wrap `vscode.TextDocument` with observable state
- Listen to `vscode.workspace.onDidChangeTextDocument`
- Listen to `vscode.window.onDidChangeTextEditorSelection`
- Emit changes as `Observable<StringText>` and `Observable<Selection>`

#### 3. XtabHistoryTracker
```typescript
interface IXtabHistoryEntry {
	documentId: DocumentId;
	edit: LineEdit;
	timestamp: number;
	patternType?: 'rename' | 'typeChange' | 'nullCheck' | 'addParameter';
}

class XtabHistoryTracker {
	private _history: IXtabHistoryEntry[] = [];

	trackEdit(docId: DocumentId, edit: LineEdit): void;
	getHistory(): readonly IXtabHistoryEntry[];
	detectPattern(recentEdits: IXtabHistoryEntry[]): PatternDetectionResult;
}
```

**Implementation**:
- Maintain circular buffer of last 20 edits across workspace
- Detect patterns using AST analysis (via `tree-sitter` or TypeScript API)
- Store in-memory only (no persistence for MVP)

#### 4. Document Processing Pipeline
```typescript
function processDocument(doc: IObservableDocument): {
	recentEdit: LineEdit;
	nextEditDoc: StatelessNextEditDocument;
	documentAfterEdits: StringText;
} {
	const documentLinesBeforeEdit = doc.value.get().getLines();
	const recentEdits = historyContext.getLastEdits(doc.id);
	const recentEdit = RootedLineEdit.fromEdit(
		new RootedEdit(doc.lastEdit.base, recentEdits.compose())
	).removeCommonSuffixPrefixLines().edit;

	const documentBeforeEdits = doc.lastEdit.base;
	const lastSelectionInAfterEdits = doc.lastSelection;
	const workspaceRoot = workspace.getWorkspaceRoot(doc.id);

	const nextEditDoc = new StatelessNextEditDocument(
		doc.id,
		workspaceRoot,
		doc.languageId,
		documentLinesBeforeEdit,
		recentEdit,
		documentBeforeEdits,
		recentEdits,
		lastSelectionInAfterEdits
	);

	return {
		recentEdit: doc.lastEdit,
		nextEditDoc,
		documentAfterEdits: nextEditDoc.documentAfterEdits
	};
}
```

### Data Structures

#### LineEdit
Represents line-based edits (vs character-based):
```typescript
class LineEdit {
	constructor(
		public readonly replacements: LineReplacement[]
	) {}

	static createFromUnsorted(replacements: LineReplacement[]): LineEdit;
	apply(text: string): string;
	serialize(): SerializedLineEdit;
}

class LineReplacement {
	constructor(
		public readonly range: LineRange,  // { startLine, endLine }
		public readonly text: string
	) {}
}
```

#### Edits
Composition of multiple edits:
```typescript
class Edits {
	constructor(private readonly edits: StringEdit[]) {}

	compose(): StringEdit;
	apply(text: string): string;
	serialize(): SerializedEdit[];
}
```

#### StringText
Immutable text representation:
```typescript
class StringText {
	constructor(public readonly value: string) {}

	getLines(): string[];
	getLineCount(): number;
	getLine(lineNumber: number): string;
}
```

### API Integration

The NES provider will call the Puku backend API:

**Endpoint**: `POST /v1/nes/suggestions`

**Request**:
```typescript
interface NesRequest {
	documentId: string;
	languageId: string;
	documentBeforeEdits: string;
	documentAfterEdits: string;
	recentEdit: {
		range: { startLine: number; endLine: number };
		text: string;
	};
	xtabHistory: Array<{
		documentId: string;
		edit: { range: { startLine: number; endLine: number }; text: string };
		patternType?: string;
	}>;
	contextDocuments?: Array<{
		uri: string;
		content: string;
		languageId: string;
	}>;
}
```

**Response**:
```typescript
interface NesResponse {
	suggestions: Array<{
		targetDocument: string;  // URI or 'current'
		edit: {
			range: { startLine: number; endLine: number };
			text: string;
		};
		confidence: number;  // 0-1
		explanation?: string;
	}>;
}
```

## Implementation Plan

### Phase 1: Infrastructure (Week 1-2)

**Tasks**:
1. Implement `StringText`, `LineEdit`, `LineReplacement`, `Edits` classes
2. Create `HistoryContext` with edit tracking
3. Build `IObservableDocument` wrapper around `vscode.TextDocument`
4. Set up unit tests for core data structures

**Files to Create**:
- `src/util/vs/editor/common/core/text/abstractText.ts` (StringText)
- `src/util/vs/editor/common/core/edits/lineEdit.ts` (LineEdit)
- `src/util/vs/editor/common/core/edits/stringEdit.ts` (StringEdit)
- `src/platform/inlineEdits/common/historyContext.ts`
- `src/platform/inlineEdits/common/observableDocument.ts`

**Acceptance Criteria**:
- ✅ All data structures have 90%+ test coverage
- ✅ HistoryContext tracks edits correctly
- ✅ ObservableDocument emits changes on document edits

### Phase 2: Xtab History (Week 2-3)

**Tasks**:
1. Implement `XtabHistoryTracker` with circular buffer
2. Add pattern detection for common refactoring operations
3. Integrate with `HistoryContext`
4. Add telemetry for pattern detection

**Files to Create**:
- `src/platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker.ts`
- `src/platform/inlineEdits/common/patternDetection.ts`

**Acceptance Criteria**:
- ✅ Tracks last 20 edits across workspace
- ✅ Detects renames, type changes, null checks
- ✅ Pattern detection has 80%+ precision

### Phase 3: Request Construction (Week 3-4)

**Tasks**:
1. Implement document processing pipeline
2. Create `StatelessNextEditRequest` instances
3. Handle `DeferredPromise` for async results
4. Add request caching and reuse logic

**Files to Modify**:
- `src/extension/pukuai/vscode-node/providers/pukuNesNextEditProvider.ts`

**Acceptance Criteria**:
- ✅ Constructs valid `StatelessNextEditRequest` with all 12 parameters
- ✅ Reuses pending requests when document unchanged
- ✅ Cancels stale requests on document changes

### Phase 4: Result Processing (Week 4-5)

**Tasks**:
1. Implement `PushEdit` callback for streaming
2. Convert `LineEdit` results to `vscode.InlineCompletionItem`
3. Handle edit rebasing when document changes
4. Add result caching

**Files to Modify**:
- `src/extension/pukuai/vscode-node/providers/pukuNesNextEditProvider.ts`
- `src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts` (racing)

**Acceptance Criteria**:
- ✅ Streaming suggestions appear within 1s
- ✅ Edit rebasing works for 90%+ of cases
- ✅ Cached results render instantly (<10ms)

### Phase 5: Backend Integration (Week 5-6)

**Tasks**:
1. Create `/v1/nes/suggestions` API endpoint
2. Implement model prompt for NES suggestions
3. Add context enrichment (related files, imports)
4. Deploy and test end-to-end

**Files to Create** (in `puku-worker` repo):
- `src/routes/nes.ts`
- `src/prompts/nesPrompt.ts`

**Acceptance Criteria**:
- ✅ API returns suggestions within 500ms p95
- ✅ Suggestions are relevant in 70%+ of cases
- ✅ No regressions in FIM or Diagnostics providers

### Phase 6: Testing & Polish (Week 6)

**Tasks**:
1. Add integration tests for full flow
2. Add telemetry for NES suggestions
3. Performance optimization (caching, debouncing)
4. Documentation

**Acceptance Criteria**:
- ✅ All tests passing
- ✅ Telemetry tracking acceptance rate
- ✅ Performance meets targets (see below)

## Success Metrics

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First suggestion latency | < 1s p95 | Time from edit completion to suggestion shown |
| Cached suggestion latency | < 10ms p95 | Time to show cached suggestion |
| Pattern detection accuracy | > 80% | Manual review of 100 samples |
| Suggestion acceptance rate | > 20% | User accepts NES suggestion |
| Racing win rate | > 30% | NES wins over FIM + Diagnostics |

### User Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active users using NES | > 50% | % of DAU who see ≥1 NES suggestion |
| NES acceptance rate | > 20% | % of NES suggestions accepted |
| Time saved | > 5 min/day | Estimated based on accepted suggestions |

## Risk Assessment

### High Risks

1. **Complexity** - NES requires significant infrastructure
   - *Mitigation*: Phase implementation, thorough testing

2. **Performance** - Edit history tracking could slow editor
   - *Mitigation*: Profiling, circular buffers, async processing

3. **Model Quality** - Backend model may not generate good suggestions
   - *Mitigation*: Prompt engineering, fine-tuning, user feedback

### Medium Risks

1. **Memory Usage** - Storing edit history consumes memory
   - *Mitigation*: Circular buffers, limit history size

2. **Multi-document Complexity** - Cross-file suggestions are hard
   - *Mitigation*: Start with single-file, add multi-file later

## Open Questions

1. Should we persist Xtab history across editor restarts?
2. What's the optimal Xtab history size? (20 edits? 50?)
3. Should NES suggestions have a different UI than FIM?
4. Do we need fine-tuning for the NES model, or is prompting enough?

## References

- [Copilot NES Implementation](../../../vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/node/nextEditProvider.ts)
- [Copilot Xtab Provider](../../../vscode/reference/vscode-copilot-chat/src/extension/xtab/node/xtabProvider.ts)
- [Stateless Provider Interface](../../../platform/inlineEdits/common/statelessNextEditProvider.ts)
- [Edit History Types](../../../util/vs/editor/common/core/edits/)

## Appendix

### Related Issues

- #106 - FIM Provider Implementation ✅ Done
- #107 - Diagnostics Provider Implementation ✅ Done
- #108 - Import Filtering Implementation ✅ Done
- #TBD - NES Provider Implementation (this PRD)

### Alternatives Considered

#### Alternative 1: Skip NES, Use Only FIM + Diagnostics
**Pros**: Simpler, faster to ship
**Cons**: Miss refactoring suggestions, no cross-tab learning
**Decision**: Deferred to post-MVP

#### Alternative 2: Simplified NES Without Edit History
**Pros**: Easier to implement
**Cons**: Less intelligent suggestions, no pattern learning
**Decision**: Not viable - defeats purpose of NES

#### Alternative 3: Server-Side Edit Tracking
**Pros**: Offload complexity to backend
**Cons**: Latency, privacy concerns, requires always-on connection
**Decision**: Not suitable for local-first architecture
