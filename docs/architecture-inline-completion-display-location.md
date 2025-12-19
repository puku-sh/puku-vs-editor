# Architecture: InlineCompletionDisplayLocation with Label

**Feature**: Multi-Document Inline Completions
**Version**: 1.0
**Date**: 2025-12-19
**Status**: Design

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Component Design](#3-component-design)
4. [Data Models](#4-data-models)
5. [Sequence Diagrams](#5-sequence-diagrams)
6. [API Specifications](#6-api-specifications)
7. [State Management](#7-state-management)
8. [Error Handling](#8-error-handling)
9. [Performance Considerations](#9-performance-considerations)
10. [Security & Privacy](#10-security--privacy)

---

## 1. Overview

### 1.1 Purpose

Enable Puku Editor's FIM provider to suggest code completions that target files OTHER than the currently open document, using VS Code's `InlineCompletionDisplayLocation` API with label-based display.

### 1.2 Design Principles

1. **Backward Compatibility**: Existing single-file completions must continue working unchanged
2. **Performance**: Document resolution must be <50ms, no UI blocking
3. **User Control**: Clear visual distinction between inline (ghost text) and label (cross-file) completions
4. **Graceful Degradation**: Fallback to same-document completions if target file unavailable
5. **Copilot Parity**: Match GitHub Copilot's UX and architecture patterns

### 1.3 High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         VS Code Editor                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  User Types → InlineCompletionProvider.provideItems()       │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│                         ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │            PukuFimProvider (Extension)                      │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │ 1. Fetch completions from API                       │   │  │
│  │  │ 2. Resolve target document (NEW)                    │   │  │
│  │  │ 3. Determine display type: Label vs Code (NEW)      │   │  │
│  │  │ 4. Create InlineCompletionItem with displayLocation│   │  │
│  │  │ 5. Return to VS Code                                │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│                         ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  VS Code Renders:                                           │  │
│  │   ├─ Code display → Ghost text inline                      │  │
│  │   └─ Label display → Clickable label "Go To..."            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                         │                                          │
│                         ▼ (User accepts label)                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Execute navigation command:                                │  │
│  │   vscode.open(targetUri, { selection: range })              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                       Puku Editor Extension                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  PukuFimProvider                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Existing Components:                                   │  │  │
│  │  │   • provideInlineCompletionItems()                     │  │  │
│  │  │   • _fetchCompletion() - API calls                     │  │  │
│  │  │   • isInlineSuggestion() - Filter validation          │  │  │
│  │  │   • _createCompletionItem() - Item creation           │  │  │
│  │  │   • LRU Cache (Layer 0)                               │  │  │
│  │  │   • CurrentGhostText Cache (Layer 1)                  │  │  │
│  │  │   • Radix Trie Cache (Layer 2)                        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  NEW Components:                                        │  │  │
│  │  │   • resolveTargetDocument() ◄─────────┐                │  │  │
│  │  │   • createDisplayLocation() ◄─────────┤                │  │  │
│  │  │   • createNavigationCommand() ◄───────┤                │  │  │
│  │  │   • isMultiDocumentEdit() ◄───────────┘                │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              DocumentResolver (NEW)                          │  │
│  │  Responsibilities:                                           │  │
│  │   • Convert offset ranges to document URIs                  │  │
│  │   • Resolve document from workspace                         │  │
│  │   • Cache document lookups                                  │  │
│  │   • Handle missing/invalid documents                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          DisplayLocationFactory (NEW)                        │  │
│  │  Responsibilities:                                           │  │
│  │   • Create label text                                       │  │
│  │   • Set display location kind                               │  │
│  │   • Generate preview tooltips                               │  │
│  │   • Handle label formatting                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          NavigationCommandFactory (NEW)                      │  │
│  │  Responsibilities:                                           │  │
│  │   • Create vscode.open commands                             │  │
│  │   • Set selection ranges                                    │  │
│  │   • Handle navigation errors                                │  │
│  │   • Track navigation telemetry                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Layer 1: VS Code API                                              │
│   • InlineCompletionItemProvider interface                         │
│   • InlineCompletionItem, InlineCompletionList                     │
│   • InlineCompletionDisplayLocation, DisplayLocationKind           │
│   • Command API (vscode.commands.executeCommand)                   │
└────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌────────────────────────────────────────────────────────────────────┐
│  Layer 2: Provider Interface                                       │
│   • PukuFimProvider (implements InlineCompletionItemProvider)      │
│   • Lifecycle handlers (handleShown, handleAcceptance, etc.)       │
│   • Cache management (LRU, CurrentGhostText, Radix Trie)           │
└────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌────────────────────────────────────────────────────────────────────┐
│  Layer 3: Business Logic (NEW)                                     │
│   • DocumentResolver - Resolve target documents                    │
│   • DisplayLocationFactory - Create display locations              │
│   • NavigationCommandFactory - Create navigation commands          │
│   • MultiDocumentEditDetector - Detect cross-file edits            │
└────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌────────────────────────────────────────────────────────────────────┐
│  Layer 4: Data Access                                              │
│   • API Client (existing _fetchCompletion)                         │
│   • Workspace API (vscode.workspace)                               │
│   • Document cache                                                 │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Design

### 3.1 PukuFimProvider (Modified)

**File**: `src/chat/src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts`

**Responsibilities**:
- Orchestrate completion item creation
- Delegate to new components for multi-document logic
- Maintain backward compatibility

**Key Changes**:

```typescript
export class PukuFimProvider implements vscode.InlineCompletionItemProvider {
	// Existing properties...

	// NEW: Document resolver
	private readonly _documentResolver: DocumentResolver;

	// NEW: Display location factory
	private readonly _displayLocationFactory: DisplayLocationFactory;

	// NEW: Navigation command factory
	private readonly _navigationCommandFactory: NavigationCommandFactory;

	constructor(
		/* existing params */
		documentResolver: DocumentResolver,
		displayLocationFactory: DisplayLocationFactory,
		navigationCommandFactory: NavigationCommandFactory
	) {
		// Initialize new components
		this._documentResolver = documentResolver;
		this._displayLocationFactory = displayLocationFactory;
		this._navigationCommandFactory = navigationCommandFactory;
	}

	// MODIFIED: Enhanced completion item creation
	private _createCompletionItem(
		completion: string,
		range: vscode.Range,
		position: vscode.Position,
		currentDocumentUri: vscode.URI
	): vscode.InlineCompletionItem {
		// NEW: Resolve target document
		const targetDoc = this._documentResolver.resolveFromCompletion(
			completion,
			currentDocumentUri
		);

		// NEW: Determine if multi-document edit
		const isMultiDoc = targetDoc &&
			targetDoc.uri.toString() !== currentDocumentUri.toString();

		let displayLocation: vscode.InlineCompletionDisplayLocation | undefined;
		let command: vscode.Command | undefined;

		if (isMultiDoc) {
			// NEW: Create label-based display for cross-file edits
			displayLocation = this._displayLocationFactory.createLabel(
				targetDoc!,
				range,
				position,
				completion
			);

			command = this._navigationCommandFactory.create(
				targetDoc!.uri,
				range
			);
		}

		return {
			insertText: completion,
			range: isMultiDoc ? new vscode.Range(position, position) : range,
			displayLocation,
			command
		};
	}
}
```

---

### 3.2 DocumentResolver (New)

**File**: `src/chat/src/extension/pukuai/vscode-node/utils/documentResolver.ts`

**Responsibilities**:
- Parse completion metadata for target document info
- Resolve document URI from workspace
- Convert offset ranges to VS Code Ranges
- Cache resolved documents for performance

**Interface**:

```typescript
export interface IDocumentResolver {
	/**
	 * Resolve target document from completion metadata
	 * @param completion Completion text with metadata
	 * @param currentUri Current document URI
	 * @returns Resolved document and range, or undefined if same document
	 */
	resolveFromCompletion(
		completion: string,
		currentUri: vscode.Uri
	): ResolvedDocument | undefined;

	/**
	 * Resolve document from URI string
	 * @param uriString Document URI string
	 * @returns TextDocument if found, undefined otherwise
	 */
	resolveFromUri(uriString: string): vscode.TextDocument | undefined;

	/**
	 * Clear document cache
	 */
	clearCache(): void;
}

export interface ResolvedDocument {
	uri: vscode.Uri;
	document: vscode.TextDocument;
	range: vscode.Range;
}
```

**Implementation**:

```typescript
export class DocumentResolver implements IDocumentResolver {
	private readonly _cache = new Map<string, vscode.TextDocument>();

	constructor(private readonly _workspace: typeof vscode.workspace) {}

	resolveFromCompletion(
		completion: string,
		currentUri: vscode.Uri
	): ResolvedDocument | undefined {
		// Parse metadata from completion
		// Metadata format: <!-- target:file://path:line:col -->
		const metadata = this.parseMetadata(completion);
		if (!metadata) {
			return undefined; // Same document edit
		}

		// Check if target is different from current
		if (metadata.uri.toString() === currentUri.toString()) {
			return undefined; // Same document
		}

		// Resolve document from workspace
		const document = this.resolveFromUri(metadata.uri.toString());
		if (!document) {
			console.warn(`[DocumentResolver] Target document not found: ${metadata.uri}`);
			return undefined;
		}

		// Convert line:col to Range
		const range = new vscode.Range(
			new vscode.Position(metadata.line, metadata.col),
			new vscode.Position(metadata.line, metadata.col)
		);

		return { uri: metadata.uri, document, range };
	}

	resolveFromUri(uriString: string): vscode.TextDocument | undefined {
		// Check cache
		if (this._cache.has(uriString)) {
			return this._cache.get(uriString);
		}

		// Find in workspace
		const uri = vscode.Uri.parse(uriString);
		const documents = this._workspace.textDocuments;
		const document = documents.find(d => d.uri.toString() === uri.toString());

		if (document) {
			this._cache.set(uriString, document);
		}

		return document;
	}

	private parseMetadata(completion: string): {
		uri: vscode.Uri;
		line: number;
		col: number;
	} | undefined {
		// Parse metadata comment: <!-- target:file://path:line:col -->
		const match = completion.match(/<!--\s*target:(.*):(\d+):(\d+)\s*-->/);
		if (!match) {
			return undefined;
		}

		return {
			uri: vscode.Uri.parse(match[1]),
			line: parseInt(match[2], 10),
			col: parseInt(match[3], 10)
		};
	}

	clearCache(): void {
		this._cache.clear();
	}
}
```

**Caching Strategy**:
- **Cache Key**: Document URI string
- **Cache Value**: VS Code TextDocument
- **TTL**: Clear on file close/delete events
- **Size Limit**: 50 documents (LRU eviction)

---

### 3.3 DisplayLocationFactory (New)

**File**: `src/chat/src/extension/pukuai/vscode-node/utils/displayLocationFactory.ts`

**Responsibilities**:
- Create `InlineCompletionDisplayLocation` for labels
- Format label text
- Generate preview tooltips
- Set display location kind

**Interface**:

```typescript
export interface IDisplayLocationFactory {
	/**
	 * Create label-based display location for multi-document edit
	 * @param targetDocument Target document
	 * @param targetRange Edit range in target document
	 * @param currentPosition Current cursor position
	 * @param completionText Preview text for tooltip
	 * @returns Display location with label
	 */
	createLabel(
		targetDocument: vscode.TextDocument,
		targetRange: vscode.Range,
		currentPosition: vscode.Position,
		completionText: string
	): vscode.InlineCompletionDisplayLocation;
}
```

**Implementation**:

```typescript
export class DisplayLocationFactory implements IDisplayLocationFactory {
	createLabel(
		targetDocument: vscode.TextDocument,
		targetRange: vscode.Range,
		currentPosition: vscode.Position,
		completionText: string
	): vscode.InlineCompletionDisplayLocation {
		// Extract filename from URI
		const filename = this.getFilename(targetDocument.uri);

		// Format line number (1-indexed for display)
		const lineNumber = targetRange.start.line + 1;

		// Create label text
		const label = `📄 Go To Inline Suggestion (${filename}:${lineNumber})`;

		// Create preview tooltip (first 50 chars)
		const preview = this.createPreview(completionText);

		return {
			range: new vscode.Range(currentPosition, currentPosition),
			label,
			tooltip: preview,
			kind: vscode.InlineCompletionDisplayLocationKind.Label
		};
	}

	private getFilename(uri: vscode.Uri): string {
		const path = uri.path;
		const parts = path.split('/');
		return parts[parts.length - 1];
	}

	private createPreview(text: string): string {
		// Remove metadata comments
		const cleaned = text.replace(/<!--.*?-->/g, '').trim();

		// Take first 50 chars
		const preview = cleaned.substring(0, 50);

		// Add ellipsis if truncated
		return cleaned.length > 50 ? `${preview}...` : preview;
	}
}
```

---

### 3.4 NavigationCommandFactory (New)

**File**: `src/chat/src/extension/pukuai/vscode-node/utils/navigationCommandFactory.ts`

**Responsibilities**:
- Create `vscode.open` commands for navigation
- Set selection ranges
- Handle navigation errors
- Track navigation telemetry

**Interface**:

```typescript
export interface INavigationCommandFactory {
	/**
	 * Create navigation command to open target document
	 * @param targetUri Target document URI
	 * @param targetRange Range to navigate to
	 * @returns VS Code command
	 */
	create(
		targetUri: vscode.Uri,
		targetRange: vscode.Range
	): vscode.Command;
}
```

**Implementation**:

```typescript
export class NavigationCommandFactory implements INavigationCommandFactory {
	constructor(
		private readonly _telemetryService?: ITelemetryService
	) {}

	create(
		targetUri: vscode.Uri,
		targetRange: vscode.Range
	): vscode.Command {
		const commandArgs: vscode.TextDocumentShowOptions = {
			preserveFocus: false,
			selection: new vscode.Range(targetRange.start, targetRange.start),
			viewColumn: vscode.ViewColumn.Active
		};

		// Track telemetry
		this._telemetryService?.logEvent('puku.multiDocumentCompletion.navigation', {
			targetUri: targetUri.toString(),
			targetLine: targetRange.start.line
		});

		return {
			command: 'vscode.open',
			title: 'Go To Inline Suggestion',
			tooltip: `Open ${this.getFilename(targetUri)} and navigate to edit`,
			arguments: [targetUri, commandArgs]
		};
	}

	private getFilename(uri: vscode.Uri): string {
		const path = uri.path;
		const parts = path.split('/');
		return parts[parts.length - 1];
	}
}
```

---

## 4. Data Models

### 4.1 Extended InlineCompletionItem

```typescript
interface PukuInlineCompletionItem extends vscode.InlineCompletionItem {
	// Standard VS Code properties
	insertText: string;
	range: vscode.Range;

	// NEW: Display location for multi-document edits
	displayLocation?: vscode.InlineCompletionDisplayLocation;

	// NEW: Navigation command
	command?: vscode.Command;

	// Existing Puku properties
	filterText?: string;
	sortText?: string;
}
```

### 4.2 InlineCompletionDisplayLocation

```typescript
interface InlineCompletionDisplayLocation {
	// Display range (where to show the label)
	range: vscode.Range;

	// Label text (e.g., "Go To Inline Suggestion (main.ts:1)")
	label?: string;

	// Preview tooltip
	tooltip?: string | vscode.MarkdownString;

	// Display kind
	kind: InlineCompletionDisplayLocationKind;
}

enum InlineCompletionDisplayLocationKind {
	Code = 0,  // Show as ghost text (default)
	Label = 1  // Show as clickable label
}
```

### 4.3 Completion Metadata Format

**API Response Enhancement**:

```json
{
  "choices": [
    {
      "text": "import { myFunction } from './utils/helpers';",
      "metadata": {
        "targetDocument": "file:///workspace/src/main.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

**Alternative: Inline Metadata (Fallback)**:

```typescript
// Completion text with embedded metadata
const completion = `<!-- target:file:///workspace/src/main.ts:0:0 -->
import { myFunction } from './utils/helpers';`;
```

---

## 5. Sequence Diagrams

### 5.1 Multi-Document Completion Flow

```
┌──────┐  ┌────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐
│ User │  │VS Code │  │PukuFimProvider│  │DocumentRes│  │DisplayLoc│
└──┬───┘  └───┬────┘  └───────┬──────┘  └─────┬─────┘  └────┬─────┘
   │          │               │                │             │
   │  Types   │               │                │             │
   ├─────────>│               │                │             │
   │          │               │                │             │
   │   provideInlineCompletionItems()         │             │
   │          ├──────────────>│                │             │
   │          │               │                │             │
   │          │               │ Fetch completions from API   │
   │          │               ├───────┐        │             │
   │          │               │       │        │             │
   │          │               │<──────┘        │             │
   │          │               │                │             │
   │          │               │ resolveFromCompletion(...)   │
   │          │               ├───────────────>│             │
   │          │               │                │             │
   │          │               │  Parse metadata, resolve doc │
   │          │               │<───────────────┤             │
   │          │               │                │             │
   │          │               │ Is multi-doc?  │             │
   │          │               ├───────┐        │             │
   │          │               │       │Yes     │             │
   │          │               │<──────┘        │             │
   │          │               │                │             │
   │          │               │ createLabel(...) ────────────>│
   │          │               │                │             │
   │          │               │  Create label display        │
   │          │               │<─────────────────────────────┤
   │          │               │                │             │
   │          │               │ createNavigationCommand(...) │
   │          │               ├───────┐        │             │
   │          │               │       │        │             │
   │          │               │<──────┘        │             │
   │          │               │                │             │
   │          │  Return InlineCompletionItem   │             │
   │          │<──────────────┤                │             │
   │          │               │                │             │
   │  Render label           │                │             │
   │<─────────┤               │                │             │
   │          │               │                │             │
   │  📄 Go To Inline...     │                │             │
   │          │               │                │             │
   │ Accepts  │               │                │             │
   ├─────────>│               │                │             │
   │          │               │                │             │
   │   Execute command       │                │             │
   │   vscode.open(...)      │                │             │
   │          ├───────┐       │                │             │
   │          │       │       │                │             │
   │          │<──────┘       │                │             │
   │          │               │                │             │
   │  Opens target file,     │                │             │
   │  applies edit           │                │             │
   │<─────────┤               │                │             │
   │          │               │                │             │
```

### 5.2 Same-Document Completion Flow (Backward Compatibility)

```
┌──────┐  ┌────────┐  ┌──────────────┐  ┌───────────┐
│ User │  │VS Code │  │PukuFimProvider│  │DocumentRes│
└──┬───┘  └───┬────┘  └───────┬──────┘  └─────┬─────┘
   │          │               │                │
   │  Types   │               │                │
   ├─────────>│               │                │
   │          │               │                │
   │   provideInlineCompletionItems()         │
   │          ├──────────────>│                │
   │          │               │                │
   │          │               │ Fetch completions from API
   │          │               ├───────┐        │
   │          │               │       │        │
   │          │               │<──────┘        │
   │          │               │                │
   │          │               │ resolveFromCompletion(...)
   │          │               ├───────────────>│
   │          │               │                │
   │          │               │  No metadata / same doc
   │          │               │<───────────────┤
   │          │               │  returns undefined
   │          │               │                │
   │          │               │ Is multi-doc?  │
   │          │               ├───────┐        │
   │          │               │       │No      │
   │          │               │<──────┘        │
   │          │               │                │
   │          │               │ Use Code display (ghost text)
   │          │               │ No displayLocation set
   │          │               │                │
   │          │  Return InlineCompletionItem   │
   │          │<──────────────┤                │
   │          │               │                │
   │  Render ghost text      │                │
   │<─────────┤               │                │
   │          │               │                │
   │  const user = { ... }   │                │
   │              ▔▔▔▔▔▔▔▔▔  │                │
   │          │               │                │
   │ Accepts  │               │                │
   ├─────────>│               │                │
   │          │               │                │
   │  Applies edit inline    │                │
   │<─────────┤               │                │
   │          │               │                │
```

---

## 6. API Specifications

### 6.1 Backend API Extension

**Endpoint**: `POST /v1/fim/context`

**Request** (unchanged):
```typescript
{
  "prompt": string;
  "suffix"?: string;
  "language": string;
  "max_tokens": number;
}
```

**Response** (enhanced):
```typescript
{
  "choices": [
    {
      "text": string;
      "finish_reason": string;

      // NEW: Multi-document metadata
      "metadata": {
        "targetDocument"?: string;  // URI of target document
        "targetLine"?: number;      // Target line number (0-indexed)
        "targetColumn"?: number;    // Target column (0-indexed)
        "displayType"?: "code" | "label";  // Display type hint
        "editDescription"?: string; // Human-readable description
      }
    }
  ]
}
```

**Example Response**:
```json
{
  "choices": [
    {
      "text": "import { calculateTotal } from './utils/math';",
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/src/main.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label",
        "editDescription": "Add missing import for calculateTotal"
      }
    }
  ]
}
```

### 6.2 VS Code API Usage

**InlineCompletionDisplayLocation**:
```typescript
// From vscode.d.ts
interface InlineCompletionDisplayLocation {
	range: Range;
	label?: string;
	tooltip?: string | MarkdownString;
	kind: InlineCompletionDisplayLocationKind;
}

enum InlineCompletionDisplayLocationKind {
	Code = 0,
	Label = 1
}
```

**Command API**:
```typescript
// Navigation command
const command: vscode.Command = {
	command: 'vscode.open',
	title: 'Go To Inline Suggestion',
	tooltip: 'Open main.ts and navigate to edit',
	arguments: [
		targetUri,  // vscode.Uri
		{
			preserveFocus: false,
			selection: new vscode.Range(line, col, line, col),
			viewColumn: vscode.ViewColumn.Active
		} as vscode.TextDocumentShowOptions
	]
};

// Execute command
await vscode.commands.executeCommand(
	command.command,
	...command.arguments!
);
```

---

## 7. State Management

### 7.1 Provider State

```typescript
class PukuFimProvider {
	// Existing state
	private _pendingFimRequest: Promise<string[]> | null = null;
	private _currentGhostTextCache: Map<string, CachedCompletion>;
	private _radixTrieCache: RadixTrie<CachedCompletion>;

	// NEW: Multi-document state
	private _activeMultiDocEdits: Map<string, ActiveMultiDocEdit>;

	// NEW: Document resolver cache
	private _documentResolver: DocumentResolver;
}

interface ActiveMultiDocEdit {
	requestId: string;
	targetUri: vscode.Uri;
	targetRange: vscode.Range;
	completionText: string;
	timestamp: number;
}
```

### 7.2 Cache Invalidation

**Trigger Events**:
1. **File deleted** → Clear document resolver cache for deleted file
2. **File renamed** → Update URI mappings
3. **Workspace closed** → Clear all caches
4. **Completion accepted** → Remove from active edits map

**Implementation**:
```typescript
// Listen to file system events
vscode.workspace.onDidDeleteFiles(event => {
	event.files.forEach(uri => {
		this._documentResolver.clearCache(uri.toString());
		this._activeMultiDocEdits.delete(uri.toString());
	});
});

vscode.workspace.onDidRenameFiles(event => {
	event.files.forEach(({ oldUri, newUri }) => {
		this._documentResolver.updateUri(
			oldUri.toString(),
			newUri.toString()
		);
	});
});
```

---

## 8. Error Handling

### 8.1 Error Scenarios

| Scenario | Error Handling | User Experience |
|----------|---------------|-----------------|
| **Target document not found** | Log warning, fallback to same-document edit | Show ghost text in current file |
| **Invalid URI in metadata** | Log error, skip completion | No completion shown |
| **Navigation command fails** | Show error notification | "Failed to open {filename}" |
| **Document parse error** | Catch exception, return undefined | No completion shown |
| **Cache miss** | Resolve from workspace, populate cache | Slight delay (<50ms) |

### 8.2 Error Logging

```typescript
try {
	const resolved = this._documentResolver.resolveFromCompletion(
		completion,
		currentUri
	);

	if (!resolved) {
		console.log('[PukuFim] Same-document edit or no metadata');
		return this.createInlineCompletion(completion, range);
	}

	return this.createMultiDocCompletion(resolved, completion);

} catch (error) {
	console.error('[PukuFim] Error resolving multi-document edit:', error);
	this._telemetryService.logError('multiDocEditResolution', error);

	// Fallback to same-document completion
	return this.createInlineCompletion(completion, range);
}
```

### 8.3 Graceful Degradation

**Fallback Chain**:
1. **Primary**: Multi-document label completion
2. **Fallback 1**: Same-document ghost text
3. **Fallback 2**: No completion (if validation fails)

---

## 9. Performance Considerations

### 9.1 Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Document resolution | <50ms | Time from `resolveFromCompletion()` to return |
| Label creation | <10ms | Time to create `displayLocation` |
| Command execution | <200ms | Time from accept to file open |
| Cache hit rate | >80% | Document resolver cache hits / total lookups |

### 9.2 Optimization Strategies

#### 9.2.1 Document Resolver Caching

```typescript
class DocumentResolver {
	// LRU cache with max 50 documents
	private _cache = new LRUCache<string, vscode.TextDocument>(50);

	resolveFromUri(uriString: string): vscode.TextDocument | undefined {
		// Check cache first (O(1))
		const cached = this._cache.get(uriString);
		if (cached) {
			return cached;
		}

		// Resolve from workspace (O(n) where n = open documents)
		const document = this._workspace.textDocuments.find(
			d => d.uri.toString() === uriString
		);

		if (document) {
			this._cache.set(uriString, document);
		}

		return document;
	}
}
```

#### 9.2.2 Lazy Command Creation

```typescript
// Only create navigation command when display type is Label
if (isMultiDoc) {
	// Defer command creation until needed
	Object.defineProperty(item, 'command', {
		get: () => this._navigationCommandFactory.create(targetUri, range),
		configurable: true
	});
}
```

#### 9.2.3 Debounced Document Watching

```typescript
// Batch file system events to reduce cache invalidation overhead
const debouncedCacheClear = debounce((uris: vscode.Uri[]) => {
	uris.forEach(uri => this._documentResolver.clearCache(uri.toString()));
}, 100);

vscode.workspace.onDidDeleteFiles(event => {
	debouncedCacheClear(event.files);
});
```

---

## 10. Security & Privacy

### 10.1 Security Considerations

**URI Validation**:
```typescript
private isValidWorkspaceUri(uri: vscode.Uri): boolean {
	// Only allow file:// URIs within workspace
	if (uri.scheme !== 'file') {
		console.warn('[Security] Blocked non-file URI:', uri.toString());
		return false;
	}

	// Check if within workspace folders
	const workspaceFolders = vscode.workspace.workspaceFolders || [];
	const isInWorkspace = workspaceFolders.some(folder =>
		uri.path.startsWith(folder.uri.path)
	);

	if (!isInWorkspace) {
		console.warn('[Security] Blocked out-of-workspace URI:', uri.toString());
		return false;
	}

	return true;
}
```

**Path Traversal Prevention**:
```typescript
private sanitizeUri(uriString: string): string {
	// Remove directory traversal attempts
	return uriString.replace(/\.\./g, '');
}
```

### 10.2 Privacy Considerations

**Telemetry**:
- ✅ **DO**: Log filename (e.g., `main.ts`)
- ✅ **DO**: Log line numbers
- ❌ **DON'T**: Log file paths (PII)
- ❌ **DON'T**: Log completion content

**Example**:
```typescript
this._telemetryService.logEvent('multiDocCompletion.navigation', {
	targetFilename: path.basename(targetUri.path),  // ✅ OK
	targetLine: range.start.line,                   // ✅ OK
	// targetPath: targetUri.path,                  // ❌ DON'T
	// completionText: completion                   // ❌ DON'T
});
```

---

## 11. Testing Architecture

### 11.1 Unit Test Structure

```
tests/
├── documentResolver.test.ts
│   ├── resolveFromCompletion()
│   │   ├── should return undefined for same-document edits
│   │   ├── should resolve valid cross-document edits
│   │   ├── should handle missing metadata
│   │   └── should cache resolved documents
│   └── resolveFromUri()
│       ├── should find open documents
│       ├── should return undefined for missing documents
│       └── should respect cache TTL
├── displayLocationFactory.test.ts
│   ├── createLabel()
│   │   ├── should format label with filename and line
│   │   ├── should create preview tooltip
│   │   └── should set Label display kind
│   └── createPreview()
│       ├── should truncate long text
│       └── should remove metadata comments
└── navigationCommandFactory.test.ts
    └── create()
        ├── should create vscode.open command
        ├── should set selection range
        └── should track telemetry
```

### 11.2 Integration Test Cases

```typescript
describe('Multi-Document Inline Completions', () => {
	test('should show label for cross-file edit', async () => {
		// Setup: Open main.ts, prepare helpers.ts
		const mainDoc = await openDocument('main.ts');
		const position = new vscode.Position(10, 20);

		// Mock API response with cross-file metadata
		mockApiResponse({
			text: "import { helper } from './helpers';",
			metadata: {
				targetDocument: 'file:///workspace/src/main.ts',
				targetLine: 0,
				displayType: 'label'
			}
		});

		// Trigger completion
		const items = await provider.provideInlineCompletionItems(
			mainDoc,
			position,
			context,
			token
		);

		// Assert: Label-based display
		expect(items.items[0].displayLocation).toBeDefined();
		expect(items.items[0].displayLocation?.kind).toBe(
			vscode.InlineCompletionDisplayLocationKind.Label
		);
		expect(items.items[0].displayLocation?.label).toMatch(/Go To Inline/);
	});

	test('should navigate to target file on accept', async () => {
		// Setup completion with navigation command
		const item = createMultiDocCompletionItem(
			'import statement',
			targetUri,
			range
		);

		// Execute command
		await vscode.commands.executeCommand(
			item.command!.command,
			...item.command!.arguments!
		);

		// Assert: Target file opened
		expect(vscode.window.activeTextEditor?.document.uri.toString())
			.toBe(targetUri.toString());

		// Assert: Cursor at target range
		expect(vscode.window.activeTextEditor?.selection.start)
			.toEqual(range.start);
	});
});
```

---

## 12. Migration Path

### Phase 1: Foundation (Week 1)
- Implement `DocumentResolver`, `DisplayLocationFactory`, `NavigationCommandFactory`
- Add unit tests for new components
- No user-facing changes yet

### Phase 2: Integration (Week 1-2)
- Update `PukuFimProvider._createCompletionItem()` to use new components
- Add integration tests
- Feature flag: `puku.multiDocumentCompletions.enabled` (default: false)

### Phase 3: Backend Coordination (Week 2)
- Coordinate with backend team for API response enhancement
- Implement metadata parsing (inline comment fallback)
- Add telemetry for multi-document events

### Phase 4: Rollout (Week 3)
- Enable feature flag by default
- Monitor telemetry for errors
- Iterate based on user feedback

---

## 13. Rollback Plan

**If issues arise**:

1. **Immediate**: Set feature flag `puku.multiDocumentCompletions.enabled = false`
2. **Fallback**: All completions render as ghost text (existing behavior)
3. **Investigation**: Review telemetry for error patterns
4. **Fix**: Deploy patch release with fixes
5. **Re-enable**: Gradually enable for 10% → 50% → 100% of users

**Feature Flag Implementation**:
```typescript
const isMultiDocEnabled = vscode.workspace
	.getConfiguration('puku')
	.get<boolean>('multiDocumentCompletions.enabled', false);

if (!isMultiDocEnabled || !isMultiDoc) {
	// Fallback to ghost text
	return this.createInlineCompletion(completion, range);
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-19
**Review**: Architecture Review Board (pending)
