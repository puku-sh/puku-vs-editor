# History Context Provider - PRD

## Component Overview
**Purpose**: Format edit history as context for inline edit prompts
**Priority**: P0 (MVP - Week 1)
**Dependencies**: `IEditHistoryTracker`
**File**: `src/chat/src/extension/inlineEdits/common/historyContextProvider.ts`

---

## Problem

`EditHistoryTracker` stores raw edit events, but we need to:
- Format edits as human-readable context
- Describe what the user changed and why
- Present in a format useful for LLM
- Filter to only relevant edits

**Example raw edit**:
```typescript
{
    uri: 'file:///src/auth/login.ts',
    timestamp: 1705315842000,
    range: Range(10, 0, 15, 1),
    oldText: '',
    newText: 'try {\n    ...\n} catch (error) {\n    ...\n}',
    editType: 'insert'
}
```

**Needs to become**:
```markdown
## Recent Changes

**File**: `src/auth/login.ts` (2 minutes ago)
**Change**: Added error handling with try/catch block
```typescript
try {
    const result = await loginUser(credentials);
    return result;
} catch (error) {
    console.error('Login failed:', error);
    throw error;
}
```
```

---

## Requirements

### FR-1: Format Edit Descriptions (P0)
Generate human-readable descriptions of edits.

**API:**
```typescript
export interface IHistoryContextProvider {
    /**
     * Get formatted history context for inline edit prompt
     *
     * @param uri - Current document URI
     * @param position - Current cursor position
     * @param maxEdits - Maximum edits to include (default: 3)
     * @returns Formatted context string
     */
    getHistoryContext(
        uri: vscode.Uri,
        position: vscode.Position,
        maxEdits?: number
    ): string;

    /**
     * Get recent edits with descriptions
     */
    getRecentEditsWithDescriptions(
        uri: vscode.Uri,
        maxEdits?: number
    ): EditDescription[];
}

export interface EditDescription {
    edit: DocumentEdit;
    description: string;
    relativeTime: string;
}
```

**Description Generation:**
```typescript
function describeEdit(edit: DocumentEdit): string {
    const editType = edit.editType;
    const lines = edit.newText.split('\n').length;

    // Analyze the code change
    if (editType === 'insert') {
        if (edit.newText.includes('try') && edit.newText.includes('catch')) {
            return 'Added error handling with try/catch block';
        }
        if (edit.newText.includes('async') || edit.newText.includes('await')) {
            return 'Added async/await code';
        }
        if (edit.newText.includes('function') || edit.newText.includes('=>')) {
            return 'Added new function';
        }
        if (edit.newText.includes('class')) {
            return 'Added new class';
        }
        if (edit.newText.includes('import')) {
            return 'Added import statement';
        }
        return `Inserted ${lines} line${lines > 1 ? 's' : ''} of code`;
    }

    if (editType === 'delete') {
        return `Deleted ${lines} line${lines > 1 ? 's' : ''} of code`;
    }

    if (editType === 'replace') {
        return `Modified ${lines} line${lines > 1 ? 's' : ''} of code`;
    }

    return 'Made changes';
}
```

### FR-2: Relative Timestamps (P0)
Show when edits happened in human-friendly format.

**Implementation:**
```typescript
function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) {
        return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}
```

### FR-3: Relevance Filtering (P0)
Only include edits relevant to current context.

**Filters:**
1. **Same file priority** - Edits in current file are most relevant
2. **Recent first** - Newer edits more relevant than old
3. **Proximity** - Edits near cursor more relevant
4. **Semantic relevance** - Edits with similar keywords

**Implementation:**
```typescript
function filterRelevantEdits(
    allEdits: DocumentEdit[],
    currentUri: vscode.Uri,
    currentPosition: vscode.Position,
    maxEdits: number
): DocumentEdit[] {
    // Score each edit
    const scored = allEdits.map(edit => ({
        edit,
        score: calculateRelevanceScore(edit, currentUri, currentPosition),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top N
    return scored.slice(0, maxEdits).map(s => s.edit);
}

function calculateRelevanceScore(
    edit: DocumentEdit,
    currentUri: vscode.Uri,
    currentPosition: vscode.Position
): number {
    let score = 0;

    // Same file: +50 points
    if (edit.uri.toString() === currentUri.toString()) {
        score += 50;

        // Proximity to cursor: +0 to +25 points
        const distance = Math.abs(edit.range.start.line - currentPosition.line);
        const proximityScore = Math.max(0, 25 - distance);
        score += proximityScore;
    }

    // Recency: +0 to +25 points (last 30 min)
    const ageMinutes = (Date.now() - edit.timestamp) / (60 * 1000);
    const recencyScore = Math.max(0, 25 - ageMinutes);
    score += recencyScore;

    return score;
}
```

### FR-4: Markdown Formatting (P0)
Format context as markdown for LLM consumption.

**Format:**
```typescript
function formatAsMarkdown(edits: EditDescription[]): string {
    if (edits.length === 0) {
        return '';
    }

    let markdown = '## Recent Changes\n\n';

    for (const { edit, description, relativeTime } of edits) {
        const relativePath = vscode.workspace.asRelativePath(edit.uri);

        markdown += `**File**: \`${relativePath}\` (${relativeTime})\n`;
        markdown += `**Change**: ${description}\n`;
        markdown += '```' + getLanguageId(edit.uri) + '\n';
        markdown += edit.newText.trim();
        markdown += '\n```\n\n';
    }

    return markdown;
}
```

### FR-5: Context Limits (P0)
Limit context length to fit token budget.

**Limits:**
- **Max edits**: 3 (configurable)
- **Max code length per edit**: 500 characters
- **Total context**: ~1000 tokens (~4000 characters)

**Truncation:**
```typescript
function truncateCode(code: string, maxLength: number = 500): string {
    if (code.length <= maxLength) {
        return code;
    }

    // Truncate and add ellipsis
    return code.substring(0, maxLength) + '\n// ... (truncated)';
}
```

---

## API Design

### Full Implementation

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - History Context Provider
 *  Formats edit history as context for inline edit prompts
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IEditHistoryTracker, DocumentEdit, EditType } from './editHistoryTracker';

export const IHistoryContextProvider = createServiceIdentifier<IHistoryContextProvider>('IHistoryContextProvider');

export interface IHistoryContextProvider {
    readonly _serviceBrand: undefined;

    getHistoryContext(
        uri: vscode.Uri,
        position: vscode.Position,
        maxEdits?: number
    ): string;

    getRecentEditsWithDescriptions(
        uri: vscode.Uri,
        maxEdits?: number
    ): EditDescription[];
}

export interface EditDescription {
    edit: DocumentEdit;
    description: string;
    relativeTime: string;
}

export class HistoryContextProvider extends Disposable implements IHistoryContextProvider {
    declare readonly _serviceBrand: undefined;

    constructor(
        @IEditHistoryTracker private readonly historyTracker: IEditHistoryTracker,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();
    }

    getHistoryContext(
        uri: vscode.Uri,
        position: vscode.Position,
        maxEdits: number = 3
    ): string {
        const editsWithDescriptions = this.getRecentEditsWithDescriptions(uri, maxEdits);

        if (editsWithDescriptions.length === 0) {
            return '';
        }

        return this.formatAsMarkdown(editsWithDescriptions);
    }

    getRecentEditsWithDescriptions(
        uri: vscode.Uri,
        maxEdits: number = 3
    ): EditDescription[] {
        const config = this.configService.getConfig();
        const enabled = config['puku.inlineEdit.context.history.enabled'] ?? true;

        if (!enabled) {
            return [];
        }

        // Get all recent edits
        const allEdits = this.historyTracker.getAllRecentEdits(20);

        // Filter to relevant edits
        const relevantEdits = this.filterRelevantEdits(allEdits, uri, maxEdits);

        // Generate descriptions
        return relevantEdits.map(edit => ({
            edit,
            description: this.describeEdit(edit),
            relativeTime: this.formatRelativeTime(edit.timestamp),
        }));
    }

    /**
     * Filter edits to most relevant ones
     */
    private filterRelevantEdits(
        allEdits: DocumentEdit[],
        currentUri: vscode.Uri,
        maxEdits: number
    ): DocumentEdit[] {
        // Prioritize same-file edits
        const sameFileEdits = allEdits.filter(e => e.uri.toString() === currentUri.toString());
        const otherFileEdits = allEdits.filter(e => e.uri.toString() !== currentUri.toString());

        // Take up to maxEdits from same file, then fill from other files
        const result: DocumentEdit[] = [];
        result.push(...sameFileEdits.slice(0, maxEdits));

        const remaining = maxEdits - result.length;
        if (remaining > 0) {
            result.push(...otherFileEdits.slice(0, remaining));
        }

        return result;
    }

    /**
     * Describe what the edit did
     */
    private describeEdit(edit: DocumentEdit): string {
        const editType = edit.editType;
        const newText = edit.newText;
        const lines = newText.split('\n').length;

        // Pattern matching for common edits
        if (editType === 'insert') {
            if (newText.includes('try') && newText.includes('catch')) {
                return 'Added error handling with try/catch block';
            }
            if (newText.includes('async') || newText.includes('await')) {
                return 'Added async/await code';
            }
            if (newText.match(/function\s+\w+|const\s+\w+\s*=/)) {
                return 'Added new function';
            }
            if (newText.includes('class ')) {
                return 'Added new class';
            }
            if (newText.includes('import ')) {
                return 'Added import statement';
            }
            if (newText.includes('interface ') || newText.includes('type ')) {
                return 'Added type definition';
            }
            if (newText.match(/\/\*\*|\/\//)) {
                return 'Added comments/documentation';
            }
            return `Inserted ${lines} line${lines > 1 ? 's' : ''} of code`;
        }

        if (editType === 'delete') {
            return `Deleted ${lines} line${lines > 1 ? 's' : ''} of code`;
        }

        if (editType === 'replace') {
            return `Modified ${lines} line${lines > 1 ? 's' : ''} of code`;
        }

        if (editType === 'format') {
            return 'Formatted code';
        }

        return 'Made changes';
    }

    /**
     * Format timestamp as relative time
     */
    private formatRelativeTime(timestamp: number): string {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) {
            return 'just now';
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }

        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    /**
     * Format edits as markdown
     */
    private formatAsMarkdown(edits: EditDescription[]): string {
        if (edits.length === 0) {
            return '';
        }

        let markdown = '## Recent Changes\n\n';

        for (const { edit, description, relativeTime } of edits) {
            const relativePath = vscode.workspace.asRelativePath(edit.uri);
            const languageId = this.getLanguageId(edit.uri);

            markdown += `**File**: \`${relativePath}\` (${relativeTime})\n`;
            markdown += `**Change**: ${description}\n`;
            markdown += '```' + languageId + '\n';
            markdown += this.truncateCode(edit.newText.trim());
            markdown += '\n```\n\n';
        }

        return markdown;
    }

    /**
     * Truncate code to fit token budget
     */
    private truncateCode(code: string, maxLength: number = 500): string {
        if (code.length <= maxLength) {
            return code;
        }

        return code.substring(0, maxLength) + '\n// ... (truncated)';
    }

    /**
     * Get language ID from URI
     */
    private getLanguageId(uri: vscode.Uri): string {
        const ext = uri.path.split('.').pop() || '';
        const langMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'js': 'javascript',
            'jsx': 'javascriptreact',
            'py': 'python',
            'go': 'go',
            'rs': 'rust',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
        };
        return langMap[ext] || '';
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Single edit | 1 try/catch insert | "Added error handling with try/catch block" |
| Multiple edits | 3 edits in same file | 3 formatted entries |
| Empty history | No edits | Empty string |
| Relative time | 2 min ago | "2 minutes ago" |
| Code truncation | 1000 char code | Truncated to 500 chars + "..." |
| Same file priority | 5 edits, 2 same file | Same file edits first |
| Language detection | `.ts` file | Code block with `typescript` |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Format for prompt | Valid markdown with code blocks |
| Token budget | Total context <1000 tokens |
| Configuration | Respects enabled/disabled setting |

---

## Example Output

### Input: 3 Recent Edits

```typescript
// Edit 1: 2 minutes ago
Added try/catch to loginUser()

// Edit 2: 5 minutes ago
Added async/await to fetchData()

// Edit 3: 10 minutes ago
Added import for User type
```

### Output: Formatted Context

```markdown
## Recent Changes

**File**: `src/auth/login.ts` (2 minutes ago)
**Change**: Added error handling with try/catch block
```typescript
try {
    const result = await loginUser(credentials);
    return result;
} catch (error) {
    console.error('Login failed:', error);
    throw error;
}
```

**File**: `src/api/data.ts` (5 minutes ago)
**Change**: Added async/await code
```typescript
async function fetchData(id: string): Promise<Data> {
    const response = await fetch(`/api/data/${id}`);
    return await response.json();
}
```

**File**: `src/types/user.ts` (10 minutes ago)
**Change**: Added import statement
```typescript
import { User } from './models';
```
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Context generation | <20ms | String formatting |
| Edit description | <5ms | Pattern matching |
| Markdown formatting | <10ms | String concatenation |
| Total | <50ms | End-to-end |

---

## Success Criteria

- [ ] Formats edit history as markdown
- [ ] Generates meaningful descriptions
- [ ] Shows relative timestamps
- [ ] Filters to relevant edits
- [ ] Prioritizes same-file edits
- [ ] Truncates code to fit budget
- [ ] Handles empty history gracefully
- [ ] Unit tests (>80% coverage)
- [ ] Performance <50ms

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `IHistoryContextProvider` interface
- [ ] Implement `HistoryContextProvider` class
- [ ] Add `describeEdit()` pattern matching
- [ ] Add `formatRelativeTime()`
- [ ] Add `filterRelevantEdits()`
- [ ] Add `formatAsMarkdown()`
- [ ] Add `truncateCode()`
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests

---

## Configuration

```json
{
  "puku.inlineEdit.context.history.enabled": true,
  "puku.inlineEdit.context.history.maxEdits": 3,
  "puku.inlineEdit.context.history.maxCodeLength": 500,
  "puku.inlineEdit.context.history.includeOtherFiles": true
}
```

---

## Related Documents

- `00-overview.md` - Project overview
- `01-edit-history-tracker.md` - Edit tracking (dependency)
- `05-context-aggregator.md` - Aggregates history with other context
- `06-prompt-integration.md` - Uses formatted context in prompts

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 3 hours
**Dependencies**: Edit History Tracker must be implemented first
**Owner**: TBD
