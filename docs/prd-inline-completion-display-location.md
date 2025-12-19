# PRD: InlineCompletionDisplayLocation with Label

**Status**: Draft
**Priority**: High
**Target Release**: v0.44.0
**Owner**: Puku AI Team
**Created**: 2025-12-19

---

## 1. Executive Summary

Implement label-based inline completion display for multi-document edits, enabling Puku Editor to suggest code changes in files other than the currently open document. This feature is critical for advanced refactoring workflows where AI-suggested changes span multiple files (e.g., adding an import statement in one file while using it in another).

**Current State**: Puku FIM provider only shows completions in the current document as inline ghost text.

**Future State**: Puku FIM provider can show label-based completions (e.g., "Go To Inline Suggestion") that navigate users to suggested edits in other files.

**Impact**: Enables GitHub Copilot-level multi-file refactoring capabilities, improving developer productivity for complex code changes.

---

## 2. Problem Statement

### 2.1 User Pain Points

**Current Limitations**:
1. AI can only suggest edits within the currently focused document
2. Multi-file refactorings (e.g., extract to new file, add missing import) are impossible
3. Users must manually apply related changes across files
4. No visibility into cross-file dependencies during code completion

**User Story**:
> "As a developer, I want the AI to suggest adding an import statement in another file when I use a new function, so that I don't have to manually track down and fix import errors."

### 2.2 Business Impact

- **Productivity Loss**: Developers spend ~15% of coding time managing imports and cross-file dependencies
- **Competitive Gap**: GitHub Copilot supports multi-document edits; we don't
- **User Churn Risk**: Power users expect advanced refactoring features

### 2.3 Technical Gap

**Missing VS Code API Usage**:
- `InlineCompletionDisplayLocation` - VS Code API for showing completion labels instead of inline text
- `InlineCompletionDisplayLocationKind` - Enum for display types (Label vs Code)
- Multi-document edit resolution from offset ranges

**Reference**: GitHub Copilot implements this in `inlineCompletionProvider.ts:326-373`

---

## 3. Goals & Non-Goals

### 3.1 Goals

1. **Support multi-document inline completions** with label-based display
2. **Enable navigation to target file** when user accepts completion
3. **Match GitHub Copilot UX** for cross-file edit suggestions
4. **Maintain backward compatibility** with existing single-file completions

### 3.2 Non-Goals

1. ❌ Automatic multi-file edit application (user must navigate and accept)
2. ❌ Batch multi-file refactoring (future feature)
3. ❌ Real-time multi-file preview (requires VS Code core changes)
4. ❌ Undo/redo across multiple files (VS Code limitation)

### 3.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Multi-document completion acceptance rate | >15% | Telemetry: accepted cross-file suggestions / shown |
| User satisfaction (NPS) | +10 points | Post-release survey |
| Feature usage | >25% of users | Telemetry: users who accepted ≥1 cross-file completion |
| Navigation success rate | >90% | Telemetry: successful file opens / attempted navigations |

---

## 4. User Experience

### 4.1 User Flow

**Scenario: Adding Missing Import**

1. **Trigger**: User types `const result = myUtilFunction(` in `main.ts`
2. **AI Detection**: FIM provider detects `myUtilFunction` is defined in `utils/helpers.ts` but not imported
3. **Multi-Document Suggestion**:
   - **Target File**: `main.ts` (current file)
   - **Suggested Edit**: Add `import { myUtilFunction } from './utils/helpers';` at top of file
   - **Display**: Label-based completion: `📄 Go To Inline Suggestion (main.ts:1)`
4. **User Action**: User accepts completion (Tab/Enter)
5. **Navigation**: VS Code opens `main.ts`, scrolls to line 1, applies import statement
6. **Feedback**: Success notification: "Import added to main.ts"

### 4.2 UI/UX Design

#### 4.2.1 Label-Based Completion Display

```
┌─────────────────────────────────────────────────────────────┐
│ main.ts                                                      │
├─────────────────────────────────────────────────────────────┤
│  1  // Current cursor position                              │
│  2  const result = myUtilFunction(█                         │
│  3                                                           │
│  4  📄 Go To Inline Suggestion (main.ts:1)                  │
│     ↳ Add missing import for myUtilFunction                │
└─────────────────────────────────────────────────────────────┘

                    [Tab to accept]
```

**Display Properties**:
- **Icon**: 📄 (document icon) for cross-file edits
- **Label Text**: "Go To Inline Suggestion ({filename}:{line})"
- **Tooltip**: Preview of suggested edit (first 50 chars)
- **Position**: Below cursor line, indented to match cursor column
- **Styling**: Dimmed text (same as ghost text), clickable

#### 4.2.2 Inline Code Display (Current Document)

For edits in the SAME document, continue showing inline ghost text:

```
┌─────────────────────────────────────────────────────────────┐
│ main.ts                                                      │
├─────────────────────────────────────────────────────────────┤
│  1  import { myUtilFunction } from './utils/helpers';       │
│  2  const result = myUtilFunction(█data, options)           │
│                                    ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔          │
│                                    Ghost text suggestion     │
└─────────────────────────────────────────────────────────────┘
```

**Decision Rule**:
- **Same document** → `displayLocation.kind = InlineCompletionDisplayLocationKind.Code` (ghost text)
- **Different document** → `displayLocation.kind = InlineCompletionDisplayLocationKind.Label` (clickable label)

### 4.3 Keyboard Shortcuts

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Accept label-based completion | Tab / Enter | Navigate to target file and apply edit |
| Dismiss completion | Esc | Hide suggestion |
| Cycle completions (Feature #64) | Alt+] / Alt+[ | Show next/previous suggestion |

---

## 5. Technical Requirements

### 5.1 Functional Requirements

#### FR1: Display Location Detection
- **REQ-1.1**: Provider MUST determine if edit targets current document or other file
- **REQ-1.2**: Provider MUST resolve target document URI from offset range
- **REQ-1.3**: Provider MUST set `displayLocation.kind` based on target document

#### FR2: Label Creation
- **REQ-2.1**: Label MUST show target filename and line number
- **REQ-2.2**: Label MUST be clickable/actionable
- **REQ-2.3**: Label MUST show preview tooltip on hover

#### FR3: Navigation Command
- **REQ-3.1**: Accepting label completion MUST open target file
- **REQ-3.2**: Opened file MUST scroll to edit location
- **REQ-3.3**: Cursor MUST be positioned at edit start range
- **REQ-3.4**: Edit MUST be applied automatically after navigation

#### FR4: Backward Compatibility
- **REQ-4.1**: Existing single-file completions MUST continue working
- **REQ-4.2**: Ghost text display MUST remain for same-document edits
- **REQ-4.3**: No breaking changes to `PukuFimProvider` API

### 5.2 Non-Functional Requirements

#### NFR1: Performance
- **REQ-5.1**: Document resolution MUST complete <50ms
- **REQ-5.2**: Label creation MUST not block UI thread
- **REQ-5.3**: Navigation MUST complete <200ms

#### NFR2: Reliability
- **REQ-6.1**: Invalid document URIs MUST be handled gracefully
- **REQ-6.2**: Missing target files MUST show error notification
- **REQ-6.3**: Navigation failures MUST not crash provider

#### NFR3: Observability
- **REQ-7.1**: Telemetry MUST track multi-document completion events
- **REQ-7.2**: Logs MUST show target document and range
- **REQ-7.3**: Errors MUST be logged with context

---

## 6. Technical Design Overview

### 6.1 Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    PukuFimProvider                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ provideInlineCompletionItems()                        │  │
│  │  ├─ Get completions from API                         │  │
│  │  ├─ Filter with isInlineSuggestion()                 │  │
│  │  └─ Create completion items                          │  │
│  │      ├─ resolveTargetDocument() ◄─── NEW             │  │
│  │      │   ├─ Check if edit targets other file         │  │
│  │      │   └─ Return (document, range)                 │  │
│  │      ├─ createCompletionItem()                       │  │
│  │      │   ├─ Same doc? → Code display (ghost text)    │  │
│  │      │   └─ Other doc? → Label display ◄─── NEW      │  │
│  │      └─ createDisplayLocation() ◄─── NEW             │  │
│  │          ├─ Create label text                        │  │
│  │          ├─ Create navigation command                │  │
│  │          └─ Set display location kind                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              VS Code InlineCompletionItem                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Properties:                                           │  │
│  │  ├─ insertText: string                               │  │
│  │  ├─ range: Range                                     │  │
│  │  ├─ command?: Command ◄─── For navigation            │  │
│  │  └─ displayLocation?: InlineCompletionDisplayLocation│  │
│  │      ├─ range: Range                                 │  │
│  │      ├─ label?: string ◄─── "Go To Inline Suggestion"│  │
│  │      └─ kind: InlineCompletionDisplayLocationKind    │  │
│  │          ├─ Code (0) = ghost text                    │  │
│  │          └─ Label (1) = clickable label              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Data Flow

```
1. User types → Trigger FIM request
2. API returns completion with target document info
3. Provider resolves target document:
   ┌─ Same as current doc? → Use Code display (ghost text)
   └─ Different doc? → Use Label display with navigation command
4. VS Code renders:
   ┌─ Code: Show ghost text inline
   └─ Label: Show clickable label below cursor
5. User accepts:
   ┌─ Code: Apply edit inline
   └─ Label: Execute navigation command → Open file → Apply edit
```

### 6.3 API Contract

**New Method: `resolveTargetDocument()`**
```typescript
/**
 * Resolve target document and range for completion edit
 * Based on Copilot's doc.fromOffsetRange() pattern
 */
private resolveTargetDocument(
	edit: { replaceRange: { start: number; end: number }; newText: string },
	currentDocument: vscode.TextDocument
): [vscode.TextDocument | undefined, vscode.Range | undefined] {
	// Implementation: Convert offset range to document URI and range
	// Return undefined if document not found
}
```

**New Method: `createDisplayLocation()`**
```typescript
/**
 * Create display location for multi-document edits
 * Based on Copilot's createNextEditorEditCompletionItem() pattern
 */
private createDisplayLocation(
	targetDocument: vscode.TextDocument,
	range: vscode.Range,
	currentPosition: vscode.Position
): vscode.InlineCompletionDisplayLocation {
	const label = `Go To Inline Suggestion (${targetDocument.fileName}:${range.start.line + 1})`;
	return {
		range: new vscode.Range(currentPosition, currentPosition),
		label,
		kind: vscode.InlineCompletionDisplayLocationKind.Label
	};
}
```

**Updated Method: `_createCompletionItem()`**
```typescript
private _createCompletionItem(
	completion: string,
	range: vscode.Range,
	position: vscode.Position,
	currentDocumentUri: vscode.URI
): vscode.InlineCompletionItem {
	// NEW: Resolve target document
	const [targetDocument, targetRange] = this.resolveTargetDocument(edit, currentDocument);

	// NEW: Determine display type
	const isSameDocument = targetDocument?.uri.toString() === currentDocumentUri.toString();

	let displayLocation: vscode.InlineCompletionDisplayLocation | undefined;
	let command: vscode.Command | undefined;

	if (!isSameDocument && targetDocument && targetRange) {
		// Multi-document edit: Use label display
		displayLocation = this.createDisplayLocation(targetDocument, targetRange, position);
		command = {
			command: 'vscode.open',
			title: 'Go To Inline Suggestion',
			arguments: [
				targetDocument.uri,
				{ selection: new vscode.Range(targetRange.start, targetRange.start) }
			]
		};
	}

	return {
		insertText: completion,
		range: isSameDocument ? range : new vscode.Range(position, position),
		displayLocation,
		command
	};
}
```

---

## 7. Implementation Plan

### 7.1 Phase 1: Foundation (Week 1)

**Milestone: Basic Multi-Document Detection**

- [ ] **Task 1.1**: Implement `resolveTargetDocument()` method
  - Parse API response for target document info
  - Resolve document URI from workspace
  - Convert offset range to VS Code Range
  - Handle missing/invalid documents

- [ ] **Task 1.2**: Update `_createCompletionItem()` to detect multi-document edits
  - Compare target document with current document
  - Set `isSameDocument` flag
  - Add logging for document resolution

**Deliverable**: Provider can detect when edit targets another file

### 7.2 Phase 2: Label Display (Week 1-2)

**Milestone: Label-Based Completions**

- [ ] **Task 2.1**: Implement `createDisplayLocation()` method
  - Create label text with filename and line number
  - Set `InlineCompletionDisplayLocationKind.Label`
  - Add tooltip with edit preview

- [ ] **Task 2.2**: Add navigation command creation
  - Create `vscode.open` command with target URI
  - Set selection range to edit location
  - Handle command errors gracefully

**Deliverable**: Multi-document edits show as clickable labels

### 7.3 Phase 3: Integration & Testing (Week 2)

**Milestone: End-to-End Multi-File Workflow**

- [ ] **Task 3.1**: Integration testing
  - Test label display in various scenarios
  - Test navigation to different file types
  - Test error handling for missing files

- [ ] **Task 3.2**: Telemetry integration
  - Track multi-document completion events
  - Track navigation success/failure
  - Track acceptance rates by display type

**Deliverable**: Production-ready multi-document completions

### 7.4 Phase 4: Documentation & Release (Week 3)

**Milestone: Public Release**

- [ ] **Task 4.1**: User documentation
  - Update README with multi-file examples
  - Create video demo
  - Update changelog

- [ ] **Task 4.2**: Release preparation
  - Update version to v0.44.0
  - Create release notes
  - Tag and publish

**Deliverable**: v0.44.0 released with multi-document completions

---

## 8. Examples & Test Cases

### 8.1 Example 1: Add Missing Import

**Scenario**: User uses function that needs import

**Input**:
```typescript
// File: src/main.ts (cursor at █)
const result = calculateTotal(█
```

**AI Response**:
```json
{
  "edit": {
    "newText": "import { calculateTotal } from './utils/math';\n",
    "replaceRange": { "start": 0, "end": 0 }
  },
  "targetDocument": "src/main.ts",
  "targetLine": 0
}
```

**Expected Display**:
```
📄 Go To Inline Suggestion (main.ts:1)
   Add missing import for calculateTotal
```

**User Action**: Tab to accept

**Expected Result**:
- File `src/main.ts` opens (if not already open)
- Cursor moves to line 1
- Import statement inserted: `import { calculateTotal } from './utils/math';`

---

### 8.2 Example 2: Extract to New File

**Scenario**: User extracts helper function to separate file

**Input**:
```typescript
// File: src/app.ts
function complexLogic() {
  // ... 50 lines of code
}
```

**AI Response**:
```json
{
  "edit": {
    "newText": "export function complexLogic() {\n  // ... 50 lines\n}\n",
    "replaceRange": { "start": 0, "end": 0 }
  },
  "targetDocument": "src/utils/helpers.ts",
  "targetLine": 0
}
```

**Expected Display**:
```
📄 Go To Inline Suggestion (helpers.ts:1)
   Extract complexLogic to separate file
```

**User Action**: Tab to accept

**Expected Result**:
- New file `src/utils/helpers.ts` created (or opened if exists)
- Function code inserted at top of file
- User can manually remove from original file

---

### 8.3 Example 3: Same Document Edit (Backward Compatibility)

**Scenario**: User continues typing in current file

**Input**:
```typescript
// File: src/main.ts (cursor at █)
const user = █
```

**AI Response**:
```json
{
  "edit": {
    "newText": "{ name: 'John', age: 30 }",
    "replaceRange": { "start": 45, "end": 45 }
  },
  "targetDocument": "src/main.ts",
  "targetLine": 5
}
```

**Expected Display**:
```typescript
const user = { name: 'John', age: 30 }
             ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
             Ghost text (inline code display)
```

**User Action**: Tab to accept

**Expected Result**:
- Edit applied inline in current file (no navigation)

---

## 9. Testing Strategy

### 9.1 Unit Tests

**File**: `pukuFimProvider.test.ts`

```typescript
describe('Multi-Document Completions', () => {
	test('resolveTargetDocument() - same document', () => {
		const [doc, range] = provider.resolveTargetDocument(edit, currentDoc);
		expect(doc?.uri).toEqual(currentDoc.uri);
	});

	test('resolveTargetDocument() - different document', () => {
		const [doc, range] = provider.resolveTargetDocument(edit, currentDoc);
		expect(doc?.uri.path).toContain('helpers.ts');
	});

	test('createDisplayLocation() - label format', () => {
		const displayLocation = provider.createDisplayLocation(targetDoc, range, position);
		expect(displayLocation.label).toMatch(/Go To Inline Suggestion \(.+:\d+\)/);
		expect(displayLocation.kind).toBe(vscode.InlineCompletionDisplayLocationKind.Label);
	});

	test('_createCompletionItem() - multi-document command', () => {
		const item = provider._createCompletionItem(completion, range, position, currentUri);
		expect(item.command?.command).toBe('vscode.open');
		expect(item.displayLocation?.kind).toBe(vscode.InlineCompletionDisplayLocationKind.Label);
	});
});
```

### 9.2 Integration Tests

**File**: `multiDocumentCompletion.test.ts`

```typescript
describe('Multi-Document Completion Integration', () => {
	test('shows label for different document', async () => {
		const completions = await provider.provideInlineCompletionItems(doc, position, context, token);
		const item = completions.items[0];
		expect(item.displayLocation?.kind).toBe(vscode.InlineCompletionDisplayLocationKind.Label);
	});

	test('navigation command opens target file', async () => {
		const item = completions.items[0];
		await vscode.commands.executeCommand(item.command!.command, ...item.command!.arguments!);
		expect(vscode.window.activeTextEditor?.document.uri.path).toContain('helpers.ts');
	});
});
```

### 9.3 E2E Tests

**Manual Test Plan**:

1. **Test Case 1: Missing Import**
   - Open file without import
   - Type function call to trigger completion
   - Verify label shows "Go To Inline Suggestion"
   - Accept completion
   - Verify import added to target file

2. **Test Case 2: Cross-File Refactoring**
   - Open file with code to extract
   - Trigger completion for extraction
   - Verify label points to new file
   - Accept completion
   - Verify new file created with extracted code

3. **Test Case 3: Error Handling**
   - Delete target file before accepting
   - Accept completion
   - Verify error notification shown
   - Verify no crash

---

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Type | Mitigation |
|------------|------|------------|
| VS Code API `InlineCompletionDisplayLocation` | External | Already available in VS Code 1.68+ |
| API response includes target document info | Backend | Coordinate with backend team for schema update |
| Document resolution from offset ranges | Internal | Implement custom resolution logic if API doesn't provide URIs |

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API doesn't provide target document info | Medium | High | Fallback to same-document completions only |
| Document resolution performance issues | Low | Medium | Cache resolved documents, optimize lookup |
| User confusion with label vs ghost text | Medium | Low | Add user education, tooltips, settings |
| Navigation failures for deleted files | High | Low | Graceful error handling, notifications |

---

## 11. Open Questions

1. **Q**: Should we show preview of target file content in label tooltip?
   - **A**: Yes, show first 50 characters of edit for context

2. **Q**: How to handle edits in unsaved/new files?
   - **A**: Create new file automatically, prompt user for save

3. **Q**: Should we support edits in multiple files simultaneously?
   - **A**: No, out of scope for v1. Future feature.

4. **Q**: What if target file is outside workspace?
   - **A**: Show error notification, don't allow edit

5. **Q**: Should label completions appear in completion cycling (Alt+])?
   - **A**: Yes, treat them same as regular completions

---

## 12. Future Enhancements

**Post-v0.44.0 Roadmap**:

1. **Batch Multi-File Edits** (v0.45.0)
   - Apply edits to multiple files in one action
   - Show file tree view of pending edits
   - Support undo/redo across files

2. **Real-Time Multi-File Preview** (v0.46.0)
   - Split editor view showing target file
   - Live preview of edit as user types
   - Diff view before accepting

3. **Smart Import Management** (v0.47.0)
   - Auto-organize imports after adding
   - Remove unused imports
   - Suggest import path aliases

---

## 13. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| Engineering | | | |
| QA | | | |

---

**Document Version**: 1.0
**Last Updated**: 2025-12-19
**Next Review**: After Phase 2 completion
