# Examples: InlineCompletionDisplayLocation with Label

**Feature**: Multi-Document Inline Completions
**Version**: 1.0
**Date**: 2025-12-19

---

## Table of Contents

1. [Example 1: Add Missing Import](#example-1-add-missing-import)
2. [Example 2: Extract Function to New File](#example-2-extract-function-to-new-file)
3. [Example 3: Add Type Definition](#example-3-add-type-definition)
4. [Example 4: Fix Import Path (Refactoring)](#example-4-fix-import-path-refactoring)
5. [Example 5: Add Configuration Entry](#example-5-add-configuration-entry)
6. [Example 6: Same-Document Edit (Backward Compatibility)](#example-6-same-document-edit-backward-compatibility)
7. [Example 7: Multi-Step Refactoring](#example-7-multi-step-refactoring)
8. [Example 8: Add Missing Dependency](#example-8-add-missing-dependency)
9. [Code Examples](#code-examples)
10. [API Response Examples](#api-response-examples)

---

## Example 1: Add Missing Import

### Scenario
User calls a function `calculateTotal()` that exists in `utils/math.ts` but hasn't been imported in the current file.

### Before
```typescript
// File: src/main.ts (cursor at █)
function processOrder(items: Item[]) {
	const total = calculateTotal(█items);
	return total;
}
```

### User Action
- User types `calculateTotal(`
- AI detects function exists in `utils/math.ts` but not imported

### AI Response (Label-Based Completion)

**Display**:
```
function processOrder(items: Item[]) {
	const total = calculateTotal(█items);

	📄 Go To Inline Suggestion (main.ts:1)
	   Add missing import for calculateTotal
}
```

**Metadata**:
```json
{
  "text": "import { calculateTotal } from './utils/math';",
  "metadata": {
    "targetDocument": "file:///workspace/src/main.ts",
    "targetLine": 0,
    "targetColumn": 0,
    "displayType": "label",
    "editDescription": "Add missing import for calculateTotal"
  }
}
```

### After (User Accepts)
```typescript
// File: src/main.ts
import { calculateTotal } from './utils/math';  // ← Added

function processOrder(items: Item[]) {
	const total = calculateTotal(items);
	return total;
}
```

**Navigation**: Cursor jumps to line 1, import added at top of file

---

## Example 2: Extract Function to New File

### Scenario
User has a large utility function that should be moved to a separate file for better organization.

### Before
```typescript
// File: src/app.ts (cursor at █)
// ... existing code ...

// This function is too long and should be in utils/helpers.ts
function complexDataTransform(data: any[]) {█
	// ... 50 lines of complex logic ...
	return transformedData;
}
```

### User Action
- User positions cursor in function
- AI suggests extracting to `utils/helpers.ts`

### AI Response (Label-Based Completion)

**Display**:
```
📄 Go To Inline Suggestion (helpers.ts:1)
   Extract complexDataTransform to utils/helpers.ts
```

**Metadata**:
```json
{
  "text": "export function complexDataTransform(data: any[]) {\n\t// ... 50 lines ...\n\treturn transformedData;\n}",
  "metadata": {
    "targetDocument": "file:///workspace/src/utils/helpers.ts",
    "targetLine": 0,
    "targetColumn": 0,
    "displayType": "label",
    "editDescription": "Extract complexDataTransform to separate file"
  }
}
```

### After (User Accepts)

**File**: `src/utils/helpers.ts` (created or opened)
```typescript
export function complexDataTransform(data: any[]) {
	// ... 50 lines of complex logic ...
	return transformedData;
}
```

**Navigation**: VS Code opens `helpers.ts`, function code inserted at top

**Manual Step**: User removes function from `app.ts` and adds import (future: auto-remove)

---

## Example 3: Add Type Definition

### Scenario
User uses a type `UserProfile` that doesn't exist yet. AI suggests creating it in `types/user.ts`.

### Before
```typescript
// File: src/components/Profile.tsx (cursor at █)
interface Props {
	profile: UserProfile█;
}

function ProfileCard({ profile }: Props) {
	return <div>{profile.name}</div>;
}
```

### User Action
- User types `UserProfile`
- AI detects type doesn't exist
- AI suggests creating definition in `types/user.ts`

### AI Response (Label-Based Completion)

**Display**:
```
interface Props {
	profile: UserProfile█;
}

📄 Go To Inline Suggestion (user.ts:1)
   Create UserProfile type definition
```

**Metadata**:
```json
{
  "text": "export interface UserProfile {\n\tname: string;\n\temail: string;\n\tid: number;\n}",
  "metadata": {
    "targetDocument": "file:///workspace/src/types/user.ts",
    "targetLine": 0,
    "displayType": "label",
    "editDescription": "Create UserProfile interface"
  }
}
```

### After (User Accepts)

**File**: `src/types/user.ts` (created)
```typescript
export interface UserProfile {
	name: string;
	email: string;
	id: number;
}
```

**File**: `src/components/Profile.tsx` (user adds import manually)
```typescript
import { UserProfile } from '../types/user';  // ← Add this

interface Props {
	profile: UserProfile;
}
```

---

## Example 4: Fix Import Path (Refactoring)

### Scenario
User moved a file, and imports need to be updated across multiple files.

### Before
```typescript
// File: src/services/api.ts
// Old import path (file was moved)
import { formatDate } from '../helpers/date';  // ❌ Wrong path
```

### User Action
- User notices red squiggly (import error)
- AI detects correct path is `../utils/date`

### AI Response (Label-Based Completion)

**Display**:
```
import { formatDate } from '../helpers/date';█
                          ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
📄 Go To Inline Suggestion (api.ts:5)
   Update import path to ../utils/date
```

**Metadata**:
```json
{
  "text": "import { formatDate } from '../utils/date';",
  "metadata": {
    "targetDocument": "file:///workspace/src/services/api.ts",
    "targetLine": 4,
    "targetColumn": 0,
    "displayType": "label",
    "editDescription": "Fix import path after file move"
  }
}
```

### After (User Accepts)
```typescript
// File: src/services/api.ts
import { formatDate } from '../utils/date';  // ✅ Fixed
```

---

## Example 5: Add Configuration Entry

### Scenario
User uses a feature that requires configuration, but config file is missing the entry.

### Before
```typescript
// File: src/app.ts (cursor at █)
const apiKey = config.get('OPENAI_API_KEY')█;
```

```json
// File: config/default.json
{
  "DATABASE_URL": "...",
  "PORT": 3000
  // Missing: OPENAI_API_KEY
}
```

### User Action
- User types `config.get('OPENAI_API_KEY')`
- AI detects key missing from config

### AI Response (Label-Based Completion)

**Display**:
```
const apiKey = config.get('OPENAI_API_KEY')█;

📄 Go To Inline Suggestion (default.json:4)
   Add OPENAI_API_KEY to configuration
```

**Metadata**:
```json
{
  "text": "\"OPENAI_API_KEY\": \"your-api-key-here\",",
  "metadata": {
    "targetDocument": "file:///workspace/config/default.json",
    "targetLine": 3,
    "displayType": "label",
    "editDescription": "Add missing config entry"
  }
}
```

### After (User Accepts)
```json
// File: config/default.json
{
  "DATABASE_URL": "...",
  "PORT": 3000,
  "OPENAI_API_KEY": "your-api-key-here"  // ← Added
}
```

---

## Example 6: Same-Document Edit (Backward Compatibility)

### Scenario
Standard inline completion within the same file (existing behavior).

### Before
```typescript
// File: src/main.ts (cursor at █)
const user = █
```

### User Action
- User types `const user = `
- AI suggests object literal

### AI Response (Ghost Text - Code Display)

**Display**:
```typescript
const user = { name: 'John', age: 30 }
             ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
             Ghost text (inline code)
```

**Metadata**:
```json
{
  "text": "{ name: 'John', age: 30 }",
  "metadata": {
    // No targetDocument or same as current
    "displayType": "code"
  }
}
```

### After (User Accepts)
```typescript
// File: src/main.ts
const user = { name: 'John', age: 30 }  // ← Applied inline
```

**No navigation** - edit applied in place (existing behavior preserved)

---

## Example 7: Multi-Step Refactoring

### Scenario
User refactors code that requires changes in multiple files.

### Step 1: Add Utility Function

**Before**:
```typescript
// File: src/feature.ts (cursor at █)
function processData(data: any) {
	// Complex validation logic█
	if (isValid) { ... }
}
```

**AI Suggestion**:
```
📄 Go To Inline Suggestion (validation.ts:1)
   Extract validation to utils/validation.ts
```

**After Accept**:
```typescript
// File: src/utils/validation.ts (created)
export function validateData(data: any): boolean {
	// Validation logic
	return isValid;
}
```

### Step 2: Update Original File

**Before**:
```typescript
// File: src/feature.ts
function processData(data: any) {
	// Complex validation logic
	if (isValid) { ... }
}
```

**AI Suggestion** (after Step 1):
```
📄 Go To Inline Suggestion (feature.ts:1)
   Add import for validateData
```

**After Accept**:
```typescript
// File: src/feature.ts
import { validateData } from './utils/validation';

function processData(data: any) {
	if (validateData(data)) { ... }
}
```

---

## Example 8: Add Missing Dependency

### Scenario
User tries to use a package that isn't in `package.json`.

### Before
```typescript
// File: src/app.ts (cursor at █)
import axios from 'axios'█;  // ❌ axios not in package.json
```

### User Action
- User types `import axios`
- AI detects package missing

### AI Response (Label-Based Completion)

**Display**:
```
import axios from 'axios'█;

📄 Go To Inline Suggestion (package.json:15)
   Add axios to dependencies
```

**Metadata**:
```json
{
  "text": "\"axios\": \"^1.6.0\",",
  "metadata": {
    "targetDocument": "file:///workspace/package.json",
    "targetLine": 14,
    "displayType": "label",
    "editDescription": "Add axios dependency"
  }
}
```

### After (User Accepts)
```json
// File: package.json
{
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.6.0"  // ← Added
  }
}
```

**Follow-up**: User runs `npm install` to install the package

---

## Code Examples

### Implementation: Document Resolver

```typescript
// File: src/chat/src/extension/pukuai/vscode-node/utils/documentResolver.ts

export class DocumentResolver {
	private _cache = new Map<string, vscode.TextDocument>();

	resolveFromCompletion(
		completion: string,
		currentUri: vscode.Uri
	): ResolvedDocument | undefined {
		// Parse metadata from completion
		const metadata = this.parseMetadata(completion);
		if (!metadata) {
			return undefined; // Same-document edit
		}

		// Check if different document
		if (metadata.uri.toString() === currentUri.toString()) {
			return undefined;
		}

		// Resolve from workspace
		const document = this.resolveFromUri(metadata.uri.toString());
		if (!document) {
			console.warn(`Target document not found: ${metadata.uri}`);
			return undefined;
		}

		const range = new vscode.Range(
			new vscode.Position(metadata.line, metadata.col),
			new vscode.Position(metadata.line, metadata.col)
		);

		return { uri: metadata.uri, document, range };
	}

	private parseMetadata(completion: string): {
		uri: vscode.Uri;
		line: number;
		col: number;
	} | undefined {
		// Parse: <!-- target:file://path:line:col -->
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

	resolveFromUri(uriString: string): vscode.TextDocument | undefined {
		// Check cache
		if (this._cache.has(uriString)) {
			return this._cache.get(uriString);
		}

		// Find in workspace
		const uri = vscode.Uri.parse(uriString);
		const document = vscode.workspace.textDocuments.find(
			d => d.uri.toString() === uri.toString()
		);

		if (document) {
			this._cache.set(uriString, document);
		}

		return document;
	}

	clearCache(): void {
		this._cache.clear();
	}
}
```

### Implementation: Display Location Factory

```typescript
// File: src/chat/src/extension/pukuai/vscode-node/utils/displayLocationFactory.ts

export class DisplayLocationFactory {
	createLabel(
		targetDocument: vscode.TextDocument,
		targetRange: vscode.Range,
		currentPosition: vscode.Position,
		completionText: string
	): vscode.InlineCompletionDisplayLocation {
		const filename = this.getFilename(targetDocument.uri);
		const lineNumber = targetRange.start.line + 1;
		const label = `📄 Go To Inline Suggestion (${filename}:${lineNumber})`;
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

### Implementation: Navigation Command Factory

```typescript
// File: src/chat/src/extension/pukuai/vscode-node/utils/navigationCommandFactory.ts

export class NavigationCommandFactory {
	create(
		targetUri: vscode.Uri,
		targetRange: vscode.Range
	): vscode.Command {
		const commandArgs: vscode.TextDocumentShowOptions = {
			preserveFocus: false,
			selection: new vscode.Range(targetRange.start, targetRange.start),
			viewColumn: vscode.ViewColumn.Active
		};

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

### Implementation: PukuFimProvider Integration

```typescript
// File: src/chat/src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts

export class PukuFimProvider implements vscode.InlineCompletionItemProvider {
	private readonly _documentResolver: DocumentResolver;
	private readonly _displayLocationFactory: DisplayLocationFactory;
	private readonly _navigationCommandFactory: NavigationCommandFactory;

	constructor(
		// ... existing params
		documentResolver: DocumentResolver,
		displayLocationFactory: DisplayLocationFactory,
		navigationCommandFactory: NavigationCommandFactory
	) {
		this._documentResolver = documentResolver;
		this._displayLocationFactory = displayLocationFactory;
		this._navigationCommandFactory = navigationCommandFactory;
	}

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

		// NEW: Check if multi-document edit
		const isMultiDoc = targetDoc &&
			targetDoc.uri.toString() !== currentDocumentUri.toString();

		let displayLocation: vscode.InlineCompletionDisplayLocation | undefined;
		let command: vscode.Command | undefined;

		if (isMultiDoc) {
			// Create label-based display for cross-file edits
			displayLocation = this._displayLocationFactory.createLabel(
				targetDoc!.document,
				targetDoc!.range,
				position,
				completion
			);

			command = this._navigationCommandFactory.create(
				targetDoc!.uri,
				targetDoc!.range
			);

			console.log(`[PukuFim] Multi-document edit: ${targetDoc!.uri.path}:${targetDoc!.range.start.line}`);
		} else {
			console.log('[PukuFim] Same-document edit (ghost text)');
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

## API Response Examples

### Example: Add Missing Import

**Request**:
```json
{
  "prompt": "const total = calculateTotal(",
  "suffix": "items);\n  return total;\n}",
  "language": "typescript",
  "max_tokens": 100
}
```

**Response**:
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

### Example: Same-Document Completion

**Request**:
```json
{
  "prompt": "const user = ",
  "suffix": "",
  "language": "typescript",
  "max_tokens": 50
}
```

**Response**:
```json
{
  "choices": [
    {
      "text": "{ name: 'John', age: 30 }",
      "finish_reason": "stop",
      "metadata": {
        // No targetDocument = same file
        "displayType": "code"
      }
    }
  ]
}
```

### Example: Extract to New File

**Request**:
```json
{
  "prompt": "// This function is too long\nfunction complexDataTransform(data: any[]) {",
  "suffix": "\n  // ... 50 lines ...\n}",
  "language": "typescript",
  "max_tokens": 200
}
```

**Response**:
```json
{
  "choices": [
    {
      "text": "export function complexDataTransform(data: any[]) {\n  // ... 50 lines of complex logic ...\n  return transformedData;\n}",
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/src/utils/helpers.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label",
        "editDescription": "Extract complexDataTransform to separate file"
      }
    }
  ]
}
```

---

## Testing Examples

### Unit Test: Document Resolver

```typescript
// File: tests/documentResolver.test.ts

import { DocumentResolver } from '../utils/documentResolver';
import * as vscode from 'vscode';

describe('DocumentResolver', () => {
	let resolver: DocumentResolver;

	beforeEach(() => {
		resolver = new DocumentResolver(vscode.workspace);
	});

	test('resolveFromCompletion - same document', () => {
		const completion = "{ name: 'John' }";  // No metadata
		const currentUri = vscode.Uri.parse('file:///workspace/main.ts');

		const result = resolver.resolveFromCompletion(completion, currentUri);

		expect(result).toBeUndefined();  // Same document
	});

	test('resolveFromCompletion - different document', () => {
		const completion = "<!-- target:file:///workspace/helpers.ts:0:0 -->\nimport { foo } from './bar';";
		const currentUri = vscode.Uri.parse('file:///workspace/main.ts');

		// Mock workspace.textDocuments
		const mockDoc = {
			uri: vscode.Uri.parse('file:///workspace/helpers.ts'),
			getText: () => ''
		} as vscode.TextDocument;

		jest.spyOn(vscode.workspace, 'textDocuments', 'get')
			.mockReturnValue([mockDoc]);

		const result = resolver.resolveFromCompletion(completion, currentUri);

		expect(result).toBeDefined();
		expect(result?.uri.path).toContain('helpers.ts');
		expect(result?.range.start.line).toBe(0);
	});

	test('resolveFromUri - cache hit', () => {
		const uriString = 'file:///workspace/main.ts';
		const mockDoc = {
			uri: vscode.Uri.parse(uriString),
			getText: () => ''
		} as vscode.TextDocument;

		jest.spyOn(vscode.workspace, 'textDocuments', 'get')
			.mockReturnValue([mockDoc]);

		// First call populates cache
		const result1 = resolver.resolveFromUri(uriString);

		// Second call uses cache
		const result2 = resolver.resolveFromUri(uriString);

		expect(result1).toBe(result2);  // Same instance from cache
	});
});
```

### Integration Test: Multi-Document Completion

```typescript
// File: tests/integration/multiDocCompletion.test.ts

import * as vscode from 'vscode';
import { PukuFimProvider } from '../providers/pukuFimProvider';

describe('Multi-Document Inline Completions', () => {
	let provider: PukuFimProvider;

	beforeEach(async () => {
		provider = new PukuFimProvider(/* ... */);
	});

	test('shows label for cross-file edit', async () => {
		// Setup: Open main.ts
		const mainDoc = await vscode.workspace.openTextDocument(
			vscode.Uri.parse('file:///workspace/main.ts')
		);

		const position = new vscode.Position(10, 20);

		// Mock API response with cross-file metadata
		mockApiResponse({
			text: "import { helper } from './helpers';",
			metadata: {
				targetDocument: 'file:///workspace/main.ts',
				targetLine: 0,
				displayType: 'label'
			}
		});

		// Trigger completion
		const context: vscode.InlineCompletionContext = {
			triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
			selectedCompletionInfo: undefined
		};

		const items = await provider.provideInlineCompletionItems(
			mainDoc,
			position,
			context,
			new vscode.CancellationTokenSource().token
		);

		// Assert: Label-based display
		expect(items).toBeDefined();
		expect(items!.items[0].displayLocation).toBeDefined();
		expect(items!.items[0].displayLocation?.kind).toBe(
			vscode.InlineCompletionDisplayLocationKind.Label
		);
		expect(items!.items[0].displayLocation?.label).toMatch(/Go To Inline/);
	});

	test('navigates to target file on accept', async () => {
		const targetUri = vscode.Uri.parse('file:///workspace/helpers.ts');
		const targetRange = new vscode.Range(0, 0, 0, 0);

		// Create completion item with navigation command
		const item: vscode.InlineCompletionItem = {
			insertText: "import { helper } from './helpers';",
			range: new vscode.Range(0, 0, 0, 0),
			command: {
				command: 'vscode.open',
				title: 'Go To Inline Suggestion',
				arguments: [
					targetUri,
					{
						selection: targetRange,
						preserveFocus: false
					} as vscode.TextDocumentShowOptions
				]
			}
		};

		// Execute navigation command
		await vscode.commands.executeCommand(
			item.command!.command,
			...item.command!.arguments!
		);

		// Assert: Target file opened
		expect(vscode.window.activeTextEditor?.document.uri.toString())
			.toBe(targetUri.toString());

		// Assert: Cursor at target position
		expect(vscode.window.activeTextEditor?.selection.start.line)
			.toBe(0);
	});
});
```

---

## Summary

**Key Takeaways**:

1. **Label-based completions** enable multi-file refactoring workflows
2. **Navigation commands** seamlessly open target files
3. **Backward compatibility** preserved for same-document edits (ghost text)
4. **Metadata-driven** approach allows flexible backend responses
5. **User-friendly** display with filename, line number, and preview

**Common Use Cases**:
- ✅ Add missing imports
- ✅ Extract functions to new files
- ✅ Create type definitions
- ✅ Fix import paths after refactoring
- ✅ Add configuration entries
- ✅ Add package dependencies

**Next Steps**:
- Implement document resolver, display location factory, and navigation command factory
- Integrate with PukuFimProvider
- Coordinate backend API updates for metadata support
- Add comprehensive tests
- Ship v0.44.0 with multi-document completions!

---

**Document Version**: 1.0
**Last Updated**: 2025-12-19
