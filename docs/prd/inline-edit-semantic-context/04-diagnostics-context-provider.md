# Diagnostics Context Provider - PRD

## Component Overview
**Purpose**: Provide errors, warnings, and hints at cursor position as context for inline edits
**Priority**: P0 (MVP - Week 1)
**Dependencies**: VS Code Diagnostics API
**File**: `src/chat/src/extension/inlineEdits/common/diagnosticsContextProvider.ts`

---

## Problem

When users invoke inline edit, the LLM should be aware of:
- TypeScript errors at the cursor
- ESLint warnings
- Missing imports
- Type mismatches
- Unused variables

**Example**: User selects function with error "Missing return type" and says "Fix this"

**Without diagnostics context**: LLM makes generic fixes

**With diagnostics context**: LLM sees the specific error and fixes it correctly

---

## Requirements

### FR-1: Gather Diagnostics (P0)
Query VS Code diagnostics API for errors/warnings at cursor.

**API:**
```typescript
export interface IDiagnosticsContextProvider {
    /**
     * Get diagnostics context for inline edit
     *
     * @param document - Current document
     * @param position - Cursor position or selection range
     * @param maxDiagnostics - Maximum diagnostics to include (default: 5)
     * @returns Formatted context string
     */
    getDiagnosticsContext(
        document: vscode.TextDocument,
        position: vscode.Position | vscode.Range,
        maxDiagnostics?: number
    ): string;
}
```

**Gathering:**
```typescript
function gatherDiagnostics(
    document: vscode.TextDocument,
    position: vscode.Position | vscode.Range
): vscode.Diagnostic[] {
    // Get all diagnostics for document
    const allDiagnostics = vscode.languages.getDiagnostics(document.uri);

    // Filter to diagnostics at or near cursor
    const range = position instanceof vscode.Range ? position : new vscode.Range(position, position);

    return allDiagnostics.filter(diag => {
        // Check if diagnostic overlaps with position/selection
        return diag.range.intersection(range) !== undefined ||
               // Or is nearby (within 5 lines)
               Math.abs(diag.range.start.line - range.start.line) <= 5;
    });
}
```

### FR-2: Filter by Severity (P0)
Prioritize errors over warnings over hints.

**Severity Levels:**
```typescript
enum DiagnosticSeverity {
    Error = 0,       // Red squigglies (most important)
    Warning = 1,     // Yellow squigglies
    Information = 2, // Blue squigglies
    Hint = 3         // Grayed out (least important)
}
```

**Filtering:**
```typescript
function filterBySeverity(
    diagnostics: vscode.Diagnostic[],
    maxDiagnostics: number
): vscode.Diagnostic[] {
    const config = this.configService.getConfig();
    const severities = config['puku.inlineEdit.context.diagnostics.severities'] ??
                      ['error', 'warning'];

    // Filter by allowed severities
    const filtered = diagnostics.filter(diag => {
        const severity = getSeverityName(diag.severity);
        return severities.includes(severity);
    });

    // Sort by severity (errors first)
    filtered.sort((a, b) => {
        if (a.severity !== b.severity) {
            return a.severity - b.severity; // Lower number = higher priority
        }
        // Same severity: sort by distance to cursor
        return a.range.start.line - b.range.start.line;
    });

    return filtered.slice(0, maxDiagnostics);
}

function getSeverityName(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
        case vscode.DiagnosticSeverity.Error: return 'error';
        case vscode.DiagnosticSeverity.Warning: return 'warning';
        case vscode.DiagnosticSeverity.Information: return 'info';
        case vscode.DiagnosticSeverity.Hint: return 'hint';
        default: return 'unknown';
    }
}
```

### FR-3: Include Code Context (P0)
Show the code that triggered the diagnostic.

**Implementation:**
```typescript
interface DiagnosticWithCode {
    diagnostic: vscode.Diagnostic;
    code: string;
    lineNumber: number;
}

function addCodeContext(
    diagnostics: vscode.Diagnostic[],
    document: vscode.TextDocument
): DiagnosticWithCode[] {
    return diagnostics.map(diag => ({
        diagnostic: diag,
        code: document.getText(diag.range),
        lineNumber: diag.range.start.line + 1, // 1-indexed for display
    }));
}
```

### FR-4: Format as Markdown (P0)
Format diagnostics for LLM consumption.

**Format:**
```typescript
function formatAsMarkdown(diagnostics: DiagnosticWithCode[]): string {
    if (diagnostics.length === 0) {
        return '';
    }

    let markdown = '## Diagnostics\n\n';

    for (const { diagnostic, code, lineNumber } of diagnostics) {
        const severity = getSeverityName(diagnostic.severity).toUpperCase();
        const source = diagnostic.source ? `[${diagnostic.source}]` : '';

        markdown += `**${severity}** ${source} (line ${lineNumber}): ${diagnostic.message}\n`;

        if (code.trim()) {
            markdown += '```\n';
            markdown += code;
            markdown += '\n```\n';
        }

        // Add code actions if available
        if (diagnostic.code) {
            markdown += `_Code: ${diagnostic.code}_\n`;
        }

        markdown += '\n';
    }

    return markdown;
}
```

### FR-5: Configuration (P0)
Support configuration for diagnostic filtering.

**Settings:**
```json
{
  "puku.inlineEdit.context.diagnostics.enabled": true,
  "puku.inlineEdit.context.diagnostics.maxDiagnostics": 5,
  "puku.inlineEdit.context.diagnostics.severities": ["error", "warning"],
  "puku.inlineEdit.context.diagnostics.proximityLines": 5
}
```

---

## API Design

### Full Implementation

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Diagnostics Context Provider
 *  Provides errors/warnings as context for inline edits
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

export const IDiagnosticsContextProvider = createServiceIdentifier<IDiagnosticsContextProvider>('IDiagnosticsContextProvider');

export interface IDiagnosticsContextProvider {
    readonly _serviceBrand: undefined;

    getDiagnosticsContext(
        document: vscode.TextDocument,
        position: vscode.Position | vscode.Range,
        maxDiagnostics?: number
    ): string;
}

interface DiagnosticWithCode {
    diagnostic: vscode.Diagnostic;
    code: string;
    lineNumber: number;
}

export class DiagnosticsContextProvider extends Disposable implements IDiagnosticsContextProvider {
    declare readonly _serviceBrand: undefined;

    constructor(
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();
    }

    getDiagnosticsContext(
        document: vscode.TextDocument,
        position: vscode.Position | vscode.Range,
        maxDiagnostics: number = 5
    ): string {
        const config = this.configService.getConfig();
        const enabled = config['puku.inlineEdit.context.diagnostics.enabled'] ?? true;

        if (!enabled) {
            return '';
        }

        // Gather diagnostics
        const diagnostics = this.gatherDiagnostics(document, position);

        if (diagnostics.length === 0) {
            return '';
        }

        // Filter by severity
        const filtered = this.filterBySeverity(diagnostics, maxDiagnostics);

        // Add code context
        const withCode = this.addCodeContext(filtered, document);

        // Format as markdown
        return this.formatAsMarkdown(withCode);
    }

    /**
     * Gather diagnostics at or near position
     */
    private gatherDiagnostics(
        document: vscode.TextDocument,
        position: vscode.Position | vscode.Range
    ): vscode.Diagnostic[] {
        const config = this.configService.getConfig();
        const proximityLines = config['puku.inlineEdit.context.diagnostics.proximityLines'] ?? 5;

        // Get all diagnostics for document
        const allDiagnostics = vscode.languages.getDiagnostics(document.uri);

        // Convert position to range
        const range = position instanceof vscode.Range ?
            position :
            new vscode.Range(position, position);

        // Filter to diagnostics at or near cursor
        return allDiagnostics.filter(diag => {
            // Check if diagnostic overlaps with range
            if (diag.range.intersection(range)) {
                return true;
            }

            // Check if nearby (within N lines)
            const distance = Math.abs(diag.range.start.line - range.start.line);
            return distance <= proximityLines;
        });
    }

    /**
     * Filter by severity and limit count
     */
    private filterBySeverity(
        diagnostics: vscode.Diagnostic[],
        maxDiagnostics: number
    ): vscode.Diagnostic[] {
        const config = this.configService.getConfig();
        const allowedSeverities = config['puku.inlineEdit.context.diagnostics.severities'] ??
                                  ['error', 'warning'];

        // Filter by allowed severities
        const filtered = diagnostics.filter(diag => {
            const severity = this.getSeverityName(diag.severity);
            return allowedSeverities.includes(severity);
        });

        // Sort by severity (errors first), then by line number
        filtered.sort((a, b) => {
            if (a.severity !== b.severity) {
                return a.severity - b.severity; // Lower = higher priority
            }
            return a.range.start.line - b.range.start.line;
        });

        return filtered.slice(0, maxDiagnostics);
    }

    /**
     * Add code context to diagnostics
     */
    private addCodeContext(
        diagnostics: vscode.Diagnostic[],
        document: vscode.TextDocument
    ): DiagnosticWithCode[] {
        return diagnostics.map(diag => ({
            diagnostic: diag,
            code: document.getText(diag.range),
            lineNumber: diag.range.start.line + 1, // 1-indexed
        }));
    }

    /**
     * Format diagnostics as markdown
     */
    private formatAsMarkdown(diagnostics: DiagnosticWithCode[]): string {
        if (diagnostics.length === 0) {
            return '';
        }

        let markdown = '## Diagnostics\n\n';

        for (const { diagnostic, code, lineNumber } of diagnostics) {
            const severity = this.getSeverityName(diagnostic.severity).toUpperCase();
            const source = diagnostic.source ? `[${diagnostic.source}]` : '';

            markdown += `**${severity}** ${source} (line ${lineNumber}): ${diagnostic.message}\n`;

            if (code.trim()) {
                markdown += '```\n';
                markdown += code;
                markdown += '\n```\n';
            }

            if (diagnostic.code) {
                markdown += `_Code: ${diagnostic.code}_\n`;
            }

            markdown += '\n';
        }

        return markdown;
    }

    /**
     * Get severity name as string
     */
    private getSeverityName(severity: vscode.DiagnosticSeverity): string {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'error';
            case vscode.DiagnosticSeverity.Warning:
                return 'warning';
            case vscode.DiagnosticSeverity.Information:
                return 'info';
            case vscode.DiagnosticSeverity.Hint:
                return 'hint';
            default:
                return 'unknown';
        }
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Error at cursor | Cursor on line with error | Error included |
| Warning nearby | Warning 3 lines away | Warning included |
| Info 10 lines away | Info 10 lines away | Not included (>5 lines) |
| Filter by severity | Config: only errors | Warnings excluded |
| Sort by severity | 2 warnings, 1 error | Error first |
| Max diagnostics | 10 diagnostics, max=5 | Only 5 included |
| No diagnostics | Clean code | Empty string |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| TypeScript error | Shows TS error with code |
| ESLint warning | Shows ESLint warning |
| Multiple sources | Shows both TS and ESLint |
| Configuration disabled | Returns empty string |

---

## Example Output

### Input: TypeScript File with Errors

```typescript
function fetchUser(userId) {  // Missing return type
    return fetch(`/api/users/${userId}`)
        .then(res => res.json());
}
```

**Diagnostics at cursor:**
- Error: Missing return type annotation
- Warning: Function should be async

### Output: Formatted Context

```markdown
## Diagnostics

**ERROR** [typescript] (line 1): Missing return type annotation.
```
function fetchUser(userId)
```
_Code: 7010_

**WARNING** [eslint] (line 1): Async function should use async/await instead of Promise chaining.
```
function fetchUser(userId) {
    return fetch(`/api/users/${userId}`)
        .then(res => res.json());
}
```
_Code: @typescript-eslint/promise-function-async_
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Gather diagnostics | <10ms | VS Code API call |
| Filtering | <5ms | In-memory operations |
| Formatting | <10ms | String concatenation |
| **Total** | **<30ms** | End-to-end |

---

## Success Criteria

- [ ] Gathers diagnostics from VS Code API
- [ ] Filters by severity (errors, warnings)
- [ ] Filters by proximity (within 5 lines)
- [ ] Sorts by severity priority
- [ ] Includes code context
- [ ] Formats as markdown
- [ ] Configuration support
- [ ] Unit tests (>80% coverage)
- [ ] Performance <30ms

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `IDiagnosticsContextProvider` interface
- [ ] Implement `DiagnosticsContextProvider` class
- [ ] Add `gatherDiagnostics()` method
- [ ] Add `filterBySeverity()` method
- [ ] Add `addCodeContext()` method
- [ ] Add `formatAsMarkdown()` method
- [ ] Add `getSeverityName()` helper
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests

---

## Configuration

```json
{
  "puku.inlineEdit.context.diagnostics.enabled": true,
  "puku.inlineEdit.context.diagnostics.maxDiagnostics": 5,
  "puku.inlineEdit.context.diagnostics.severities": ["error", "warning"],
  "puku.inlineEdit.context.diagnostics.proximityLines": 5,
  "puku.inlineEdit.context.diagnostics.includeSources": ["typescript", "eslint", "prettier"]
}
```

---

## Related Documents

- `00-overview.md` - Project overview
- `05-context-aggregator.md` - Aggregates diagnostics with other context
- `06-prompt-integration.md` - Uses formatted context in prompts

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 2 hours
**Dependencies**: None (VS Code API only)
**Owner**: TBD
