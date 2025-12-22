# PRD: Puku Inline Chat - Context Gathering

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024
**Related**: [Overview](./01-overview.md) | [UI & UX](./02-ui-ux.md)

---

## 1. Overview

Define how Puku inline chat gathers context from the workspace to provide accurate, relevant code suggestions.

### Goals
- ✅ Capture user selection and cursor position
- ✅ Extract diagnostics (errors/warnings) automatically
- ✅ Retrieve file metadata (language, indent info)
- ✅ Find relevant workspace patterns via semantic search
- ✅ Integrate language server context (symbols, types)

---

## 2. Context Types

### 2.1 Selection Context

**What**: The code selected by the user (or cursor position)

**Collection**:
```typescript
interface SelectionContext {
  document: vscode.TextDocument;
  selection: vscode.Range;
  selectedText: string;
  wholeRange: vscode.Range;  // Full function/class containing selection
  language: string;
  fileIndentInfo: FileIndentInfo;
}
```

**Implementation**:
```typescript
class CurrentSelection {
  static getCurrentSelection(
    tabsAndEditorsService: ITabsAndEditorsService,
    allowEmpty?: boolean
  ): SelectionContext | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return undefined;

    const selection = editor.selection;
    if (selection.isEmpty && !allowEmpty) {
      return undefined;
    }

    return {
      document: editor.document,
      selection: new vscode.Range(selection.start, selection.end),
      selectedText: editor.document.getText(selection),
      wholeRange: this.expandToScope(editor.document, selection),
      language: editor.document.languageId,
      fileIndentInfo: this.detectIndent(editor.document)
    };
  }
}
```

**Edge Cases**:
- Empty selection → Expand to current line or symbol
- Multi-cursor → Use first cursor only (show warning)
- Read-only file → Allow read, block edits

---

### 2.2 Diagnostics Context

**What**: Errors and warnings from VS Code's language server

**Collection**:
```typescript
interface DiagnosticsContext {
  diagnostics: vscode.Diagnostic[];
  severity: 'error' | 'warning' | 'info';
  messages: string[];
  affectedRanges: vscode.Range[];
}
```

**Implementation**:
```typescript
class DiagnosticsCollector {
  static getDiagnostics(
    document: vscode.TextDocument,
    selection: vscode.Range
  ): DiagnosticsContext {
    const allDiagnostics = vscode.languages.getDiagnostics(document.uri);

    // Filter to selection
    const relevant = allDiagnostics.filter(d =>
      d.range.intersection(selection)
    );

    // Prioritize errors over warnings
    const errors = relevant.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
    const warnings = relevant.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);

    return {
      diagnostics: errors.length > 0 ? errors : warnings,
      severity: errors.length > 0 ? 'error' : 'warning',
      messages: relevant.map(d => d.message),
      affectedRanges: relevant.map(d => d.range)
    };
  }
}
```

**Formatting for Prompt**:
```typescript
function formatDiagnostics(ctx: DiagnosticsContext): string {
  if (ctx.diagnostics.length === 0) return '';

  return `
Errors/Warnings in selection:
${ctx.diagnostics.map(d => `- ${d.message} (line ${d.range.start.line + 1})`).join('\n')}
  `.trim();
}
```

---

### 2.3 File Metadata

**What**: Language, indent style, file path

**Collection**:
```typescript
interface FileMetadata {
  languageId: string;
  fileName: string;
  filePath: string;
  indentStyle: 'tabs' | 'spaces';
  indentSize: number;
  lineEnding: '\n' | '\r\n';
  encoding: string;
}
```

**Implementation**:
```typescript
class FileMetadataCollector {
  static collect(document: vscode.TextDocument): FileMetadata {
    const config = vscode.workspace.getConfiguration('editor', document.uri);

    return {
      languageId: document.languageId,
      fileName: path.basename(document.uri.fsPath),
      filePath: vscode.workspace.asRelativePath(document.uri),
      indentStyle: config.get('insertSpaces') ? 'spaces' : 'tabs',
      indentSize: config.get('tabSize') || 4,
      lineEnding: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
      encoding: document.uri.scheme === 'file' ? 'utf-8' : 'unknown'
    };
  }
}
```

---

### 2.4 Language Server Context

**What**: Symbols, types, hover info from LSP

**Collection**:
```typescript
interface LanguageServerContext {
  symbolAtCursor?: vscode.DocumentSymbol;
  hoverInfo?: vscode.Hover;
  typeDefinition?: vscode.Location;
  references?: vscode.Location[];
}
```

**Implementation**:
```typescript
class LanguageServerContextCollector {
  static async collect(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<LanguageServerContext> {
    const [symbols, hover, typeDef, refs] = await Promise.all([
      vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      ),
      vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      ),
      vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeTypeDefinitionProvider',
        document.uri,
        position
      ),
      vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        document.uri,
        position
      )
    ]);

    return {
      symbolAtCursor: this.findSymbolAtPosition(symbols, position),
      hoverInfo: hover?.[0],
      typeDefinition: typeDef?.[0],
      references: refs?.slice(0, 5)  // Limit to 5 references
    };
  }
}
```

---

### 2.5 Semantic Search Context

**What**: Similar code patterns from workspace

**See**: [Semantic Search PRD](./06-semantic-search.md) for full details

**Summary**:
```typescript
interface SemanticSearchContext {
  query: string;  // instruction + selected code
  results: Array<{
    file: string;
    chunk: string;
    score: number;
    lineStart: number;
    lineEnd: number;
  }>;
  imports: string[];  // Extracted from results
  types: string[];    // Extracted from results
}
```

**Collection**:
```typescript
class SemanticSearchFlow {
  async search(
    instruction: string,
    selectedCode: string,
    document: vscode.TextDocument
  ): Promise<SemanticSearchContext> {
    const query = `${instruction}\n\n${selectedCode}`;

    const results = await this.indexingService.semanticSearch(query, {
      maxResults: 3,
      minScore: 0.7,
      excludeFile: document.uri
    });

    return {
      query,
      results: results.map(r => ({
        file: r.file,
        chunk: r.text,
        score: r.score,
        lineStart: r.lineStart,
        lineEnd: r.lineEnd
      })),
      imports: this.extractImports(results),
      types: this.extractTypes(results)
    };
  }
}
```

---

## 3. Context Prioritization

### Token Budget Allocation

Total budget: **60% of model's context window** (e.g., 50k tokens for 128k model)

| Context Type | Priority | Token Budget | Justification |
|--------------|----------|--------------|---------------|
| **User Instruction** | 1000 (highest) | 5% (2.5k) | User's intent is critical |
| **Selected Code** | 900 | 30% (15k) | The code being edited |
| **Diagnostics** | 800 | 5% (2.5k) | Errors to fix |
| **Semantic Search** | 700 | 25% (12.5k) | Workspace patterns |
| **Language Server** | 600 | 10% (5k) | Type info, symbols |
| **File Metadata** | 500 | 1% (0.5k) | Language, indent |
| **System Prompt** | 1000 | 10% (5k) | Instructions to model |
| **Response Buffer** | - | 40% | Reserved for output |

### Truncation Strategy

When context exceeds budget:
1. **Never truncate**: User instruction, diagnostics
2. **Truncate first**: Language server references (5 → 2)
3. **Truncate second**: Semantic search results (3 → 2)
4. **Truncate third**: Selected code (summarize if >10k tokens)

---

## 4. Context Composition

### Example: `/fix` Intent

**Input**:
- User types: "add error handling"
- Selected code: `function divide(a, b) { return a / b; }`
- Diagnostics: None
- Semantic search: Found similar error handling in `math.ts`

**Composed Context**:
```
System: You are Puku AI, a code editing assistant...

User: Fix this code by adding error handling:

```typescript
// Current selection:
function divide(a, b) {
  return a / b;
}
```

Similar patterns in your workspace:

```typescript
// From: src/utils/math.ts (score: 0.85)
function safeMod(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Modulo by zero');
  }
  return a % b;
}
```

Language: TypeScript
Indent: 2 spaces
File: src/calculator.ts
```

---

## 5. Performance Optimization

### Caching Strategy

| Context Type | Cache Duration | Invalidation |
|--------------|----------------|--------------|
| File Metadata | 5 minutes | On file change |
| Diagnostics | 1 second | On diagnostics update |
| Language Server | 30 seconds | On file change |
| Semantic Search | 10 minutes | On index update |

### Parallel Collection

Collect contexts in parallel to minimize latency:

```typescript
async function gatherContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  instruction: string
): Promise<AllContext> {
  const [selection, diagnostics, metadata, lsContext, semanticSearch] =
    await Promise.all([
      CurrentSelection.getCurrentSelection(tabsAndEditorsService),
      DiagnosticsCollector.getDiagnostics(document, selection),
      FileMetadataCollector.collect(document),
      LanguageServerContextCollector.collect(document, position),
      SemanticSearchFlow.search(instruction, selectedText, document)
    ]);

  return { selection, diagnostics, metadata, lsContext, semanticSearch };
}
```

**Target Latency**: <500ms for all context gathering

---

## 6. Error Handling

### Missing Context

| Context | Behavior if Missing | Fallback |
|---------|---------------------|----------|
| Selection | Show error, require selection | Expand to current line |
| Diagnostics | Continue without | Empty diagnostics |
| Semantic Search | Continue without | Show warning in UI |
| Language Server | Continue without | Use basic syntax only |
| File Metadata | Use defaults | tabs, 4 spaces |

### Timeouts

- Language server: 1 second
- Semantic search: 2 seconds
- Other contexts: 500ms

If timeout → Log warning, continue without

---

## 7. Privacy & Security

### Data Handling

- ✅ **Local-first**: All context gathering happens locally
- ✅ **No external calls**: Semantic search uses local SQLite
- ✅ **Ignore files**: Respect `.pukuignore` and `.gitignore`
- ✅ **Sensitive data**: Never send API keys, tokens, passwords

### Ignored Files

```typescript
class IgnoreService {
  async isPukuIgnored(uri: vscode.Uri): Promise<boolean> {
    // Check .pukuignore
    const pukuIgnore = await this.loadIgnoreFile('.pukuignore');
    if (pukuIgnore.matches(uri)) return true;

    // Check .gitignore
    const gitIgnore = await this.loadIgnoreFile('.gitignore');
    if (gitIgnore.matches(uri)) return true;

    // Check built-in patterns
    const builtInPatterns = [
      '**/node_modules/**',
      '**/.env',
      '**/.env.*',
      '**/secrets.json',
      '**/*.key',
      '**/*.pem'
    ];
    return builtInPatterns.some(pattern => minimatch(uri.fsPath, pattern));
  }
}
```

---

## 8. Testing

### Unit Tests

```typescript
describe('Context Gathering', () => {
  it('should collect selection context', async () => {
    const context = await CurrentSelection.getCurrentSelection(...);
    expect(context).toBeDefined();
    expect(context.selectedText).toBe('function divide(a, b) { ... }');
  });

  it('should filter diagnostics to selection', async () => {
    const ctx = DiagnosticsCollector.getDiagnostics(doc, selection);
    expect(ctx.diagnostics.length).toBe(1);
    expect(ctx.severity).toBe('error');
  });

  it('should handle missing language server', async () => {
    const ctx = await LanguageServerContextCollector.collect(doc, pos);
    expect(ctx).toBeDefined();  // Should not throw
    expect(ctx.hoverInfo).toBeUndefined();
  });
});
```

### Integration Tests

- [ ] Context gathering completes in <500ms
- [ ] Semantic search returns relevant results
- [ ] Diagnostics are correctly filtered
- [ ] Ignored files are excluded
- [ ] Timeouts work correctly

---

## 9. Configuration

```json
{
  "puku.inlineChat.context.enableSemanticSearch": {
    "type": "boolean",
    "default": true,
    "description": "Include semantic search results in context"
  },
  "puku.inlineChat.context.semanticSearchMaxResults": {
    "type": "number",
    "default": 3,
    "minimum": 1,
    "maximum": 5,
    "description": "Maximum number of semantic search results"
  },
  "puku.inlineChat.context.includeLanguageServer": {
    "type": "boolean",
    "default": true,
    "description": "Include language server context (types, symbols)"
  },
  "puku.inlineChat.context.maxTokens": {
    "type": "number",
    "default": 50000,
    "description": "Maximum tokens for context (before truncation)"
  }
}
```

---

## 10. Future Enhancements

### v1.1
- [ ] Multi-file context (imported modules)
- [ ] Git history context (recent changes)
- [ ] Terminal output context (for debugging)
- [ ] Browser context (for web development)

### v1.2
- [ ] Project-wide symbol index
- [ ] Code graph analysis (call hierarchies)
- [ ] Dependency context (package.json, imports)
- [ ] Smart context expansion (auto-include related files)

---

**Next**: [Prompt Engineering PRD](./04-prompt-engineering.md)
