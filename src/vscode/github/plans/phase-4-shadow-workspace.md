# Phase 4: Shadow Workspace Validation

## Goal

Implement a shadow workspace system that pre-validates code completions using language servers (LSP) before showing them to users. This catches syntax errors, type errors, and other issues before the user sees the completion.

## Duration

3-4 days

## Prerequisites

- Phase 1-3 complete (semantic FIM working)
- Understanding of VS Code Language Server Protocol
- TypeScript/JavaScript LSP available

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHADOW WORKSPACE SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   MAIN EDITOR                            │    │
│  │  ┌──────────────┐                                        │    │
│  │  │ User's code  │ ───────────────────┐                  │    │
│  │  │ + cursor     │                    │                  │    │
│  │  └──────────────┘                    │                  │    │
│  │                                       │                  │    │
│  └───────────────────────────────────────┼──────────────────┘    │
│                                          │                       │
│                                          ▼                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 SHADOW WORKSPACE                         │    │
│  │                   (Hidden)                               │    │
│  │                                                          │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │    │
│  │  │ Copy of      │───►│ Apply       │───►│ Language  │ │    │
│  │  │ document     │    │ completion  │    │ Server    │ │    │
│  │  └──────────────┘    └──────────────┘    └───────────┘ │    │
│  │                                               │         │    │
│  │                                               ▼         │    │
│  │                                        ┌───────────┐   │    │
│  │                                        │Diagnostics│   │    │
│  │                                        └───────────┘   │    │
│  │                                               │         │    │
│  └───────────────────────────────────────────────┼─────────┘    │
│                                                  │              │
│                                                  ▼              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   VALIDATION RESULT                      │    │
│  │                                                          │    │
│  │    ✓ No errors    → Show completion                     │    │
│  │    ✗ Has errors   → Filter out / Try alternative        │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tasks

### 4.1 Create Shadow Document Manager

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/validation/shadowDocument.ts` (new file)

```typescript
import * as vscode from 'vscode';

export interface ShadowDocument {
  uri: vscode.Uri;
  content: string;
  languageId: string;
  version: number;
}

export class ShadowDocumentManager {
  private readonly _shadowScheme = 'puku-shadow';
  private readonly _documents = new Map<string, ShadowDocument>();
  private readonly _provider: vscode.TextDocumentContentProvider;

  constructor() {
    this._provider = {
      provideTextDocumentContent: (uri: vscode.Uri) => {
        return this._documents.get(uri.toString())?.content ?? '';
      }
    };

    vscode.workspace.registerTextDocumentContentProvider(
      this._shadowScheme,
      this._provider
    );
  }

  createShadowDocument(
    originalUri: vscode.Uri,
    content: string,
    languageId: string
  ): ShadowDocument {
    const shadowUri = originalUri.with({
      scheme: this._shadowScheme,
      path: originalUri.path + '.shadow'
    });

    const doc: ShadowDocument = {
      uri: shadowUri,
      content,
      languageId,
      version: Date.now()
    };

    this._documents.set(shadowUri.toString(), doc);
    return doc;
  }

  updateShadowDocument(uri: vscode.Uri, content: string): void {
    const doc = this._documents.get(uri.toString());
    if (doc) {
      doc.content = content;
      doc.version = Date.now();
    }
  }

  disposeShadowDocument(uri: vscode.Uri): void {
    this._documents.delete(uri.toString());
  }

  dispose(): void {
    this._documents.clear();
  }
}
```

### 4.2 Create Completion Validator

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/validation/completionValidator.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { ShadowDocumentManager, ShadowDocument } from './shadowDocument';

export interface ValidationResult {
  isValid: boolean;
  errors: vscode.Diagnostic[];
  warnings: vscode.Diagnostic[];
}

export interface ValidatorOptions {
  timeoutMs: number;
  allowWarnings: boolean;
  checkTypes: boolean;
}

const DEFAULT_OPTIONS: ValidatorOptions = {
  timeoutMs: 100,
  allowWarnings: true,
  checkTypes: true
};

export class CompletionValidator {
  constructor(
    private readonly _shadowManager: ShadowDocumentManager
  ) {}

  async validateCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    completion: string,
    options: ValidatorOptions = DEFAULT_OPTIONS
  ): Promise<ValidationResult> {
    // Create content with completion applied
    const originalContent = document.getText();
    const offset = document.offsetAt(position);
    const newContent =
      originalContent.substring(0, offset) +
      completion +
      originalContent.substring(offset);

    // Create shadow document
    const shadowDoc = this._shadowManager.createShadowDocument(
      document.uri,
      newContent,
      document.languageId
    );

    try {
      // Get diagnostics from language server
      const diagnostics = await this._getDiagnosticsWithTimeout(
        shadowDoc,
        options.timeoutMs
      );

      // Filter to completion range
      const completionRange = new vscode.Range(
        position,
        document.positionAt(offset + completion.length)
      );

      const relevantDiagnostics = diagnostics.filter(d =>
        this._rangesOverlap(d.range, completionRange)
      );

      const errors = relevantDiagnostics.filter(
        d => d.severity === vscode.DiagnosticSeverity.Error
      );
      const warnings = relevantDiagnostics.filter(
        d => d.severity === vscode.DiagnosticSeverity.Warning
      );

      return {
        isValid: errors.length === 0 && (options.allowWarnings || warnings.length === 0),
        errors,
        warnings
      };
    } finally {
      // Clean up shadow document
      this._shadowManager.disposeShadowDocument(shadowDoc.uri);
    }
  }

  private async _getDiagnosticsWithTimeout(
    shadowDoc: ShadowDocument,
    timeoutMs: number
  ): Promise<vscode.Diagnostic[]> {
    return new Promise(async (resolve) => {
      const timeout = setTimeout(() => resolve([]), timeoutMs);

      try {
        // Open the shadow document to trigger language server
        const doc = await vscode.workspace.openTextDocument(shadowDoc.uri);

        // Wait briefly for language server to process
        await new Promise(r => setTimeout(r, 50));

        // Get diagnostics
        const diagnostics = vscode.languages.getDiagnostics(shadowDoc.uri);
        clearTimeout(timeout);
        resolve(diagnostics);
      } catch {
        clearTimeout(timeout);
        resolve([]);
      }
    });
  }

  private _rangesOverlap(a: vscode.Range, b: vscode.Range): boolean {
    return !(a.end.isBefore(b.start) || b.end.isBefore(a.start));
  }
}
```

### 4.3 Create Validated Completion Provider

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/validation/validatedCompletionProvider.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { CompletionValidator, ValidationResult } from './completionValidator';

export interface CompletionCandidate {
  text: string;
  score: number;
}

export interface ValidatedCompletion {
  text: string;
  score: number;
  validation: ValidationResult;
}

export class ValidatedCompletionProvider {
  constructor(
    private readonly _validator: CompletionValidator
  ) {}

  async validateCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    candidates: CompletionCandidate[],
    maxValidCompletions: number = 3
  ): Promise<ValidatedCompletion[]> {
    const validatedCompletions: ValidatedCompletion[] = [];

    // Validate candidates in parallel with limit
    const validationPromises = candidates.slice(0, 5).map(async (candidate) => {
      const validation = await this._validator.validateCompletion(
        document,
        position,
        candidate.text
      );
      return { ...candidate, validation };
    });

    const results = await Promise.all(validationPromises);

    // Filter to valid completions
    for (const result of results) {
      if (result.validation.isValid) {
        validatedCompletions.push(result);
        if (validatedCompletions.length >= maxValidCompletions) {
          break;
        }
      }
    }

    // If no valid completions, return best unvalidated ones with warning
    if (validatedCompletions.length === 0) {
      return results.slice(0, maxValidCompletions);
    }

    return validatedCompletions;
  }

  async getBestValidCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    candidates: CompletionCandidate[]
  ): Promise<ValidatedCompletion | undefined> {
    const validated = await this.validateCompletions(
      document,
      position,
      candidates,
      1
    );
    return validated[0];
  }
}
```

### 4.4 Integrate with FIM Provider

**File**: Modify the inline completion provider to use validation

```typescript
// In the inline completion provider

import { ValidatedCompletionProvider } from './validation/validatedCompletionProvider';

class PukuInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private readonly _validator: ValidatedCompletionProvider;

  constructor(
    // ... existing dependencies
    validator: ValidatedCompletionProvider
  ) {
    this._validator = validator;
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[]> {
    // Get completion candidates from LLM
    const candidates = await this._getCompletionCandidates(document, position);

    if (candidates.length === 0) {
      return [];
    }

    // Validate if enabled
    if (this._config.validateCompletions) {
      const validated = await this._validator.getBestValidCompletion(
        document,
        position,
        candidates
      );

      if (validated && validated.validation.isValid) {
        return [new vscode.InlineCompletionItem(validated.text)];
      }

      // Optionally show unvalidated completion with indicator
      if (validated && !this._config.requireValidation) {
        return [new vscode.InlineCompletionItem(validated.text)];
      }

      return [];
    }

    // No validation - return first candidate
    return [new vscode.InlineCompletionItem(candidates[0].text)];
  }
}
```

### 4.5 Add Multi-Candidate Generation

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/validation/multiCandidateGenerator.ts` (new file)

Generate multiple completion candidates to validate:

```typescript
export interface GenerationOptions {
  numCandidates: number;
  temperature: number;
  topP: number;
}

export class MultiCandidateGenerator {
  constructor(
    private readonly _llmClient: LLMClient
  ) {}

  async generateCandidates(
    prompt: string,
    options: GenerationOptions = { numCandidates: 3, temperature: 0.8, topP: 0.95 }
  ): Promise<CompletionCandidate[]> {
    // Request multiple completions with higher temperature for variety
    const responses = await Promise.all(
      Array(options.numCandidates).fill(null).map(async (_, i) => {
        const response = await this._llmClient.complete(prompt, {
          temperature: options.temperature + (i * 0.1), // Vary temperature
          top_p: options.topP,
          max_tokens: 150,
          n: 1
        });
        return {
          text: response.text,
          score: 1 - (i * 0.1) // Score by order
        };
      })
    );

    // Dedupe similar completions
    return this._dedupeCompletions(responses);
  }

  private _dedupeCompletions(candidates: CompletionCandidate[]): CompletionCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      const normalized = c.text.trim().toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }
}
```

### 4.6 Add Configuration

**File**: Add to `package.json` contributes.configuration

```json
{
  "puku.fim.validateCompletions": {
    "type": "boolean",
    "default": true,
    "description": "Validate completions with language server before showing"
  },
  "puku.fim.validationTimeoutMs": {
    "type": "number",
    "default": 100,
    "description": "Maximum time to wait for validation (ms)"
  },
  "puku.fim.requireValidation": {
    "type": "boolean",
    "default": false,
    "description": "Only show completions that pass validation"
  },
  "puku.fim.generateMultipleCandidates": {
    "type": "boolean",
    "default": true,
    "description": "Generate multiple completion candidates for validation"
  },
  "puku.fim.numCandidates": {
    "type": "number",
    "default": 3,
    "description": "Number of completion candidates to generate"
  }
}
```

## Testing

### Test 1: Shadow Document Creation

```typescript
test('shadow document manager creates and disposes documents', () => {
  const manager = new ShadowDocumentManager();

  const shadowDoc = manager.createShadowDocument(
    vscode.Uri.file('/test/file.ts'),
    'const x = 1;',
    'typescript'
  );

  expect(shadowDoc.uri.scheme).toBe('puku-shadow');
  expect(shadowDoc.content).toBe('const x = 1;');

  manager.disposeShadowDocument(shadowDoc.uri);
});
```

### Test 2: Completion Validation

```typescript
test('validator catches syntax errors', async () => {
  const validator = new CompletionValidator(shadowManager);

  const result = await validator.validateCompletion(
    mockDocument,
    new vscode.Position(5, 10),
    'function( {' // Invalid syntax
  );

  expect(result.isValid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('validator accepts valid completions', async () => {
  const validator = new CompletionValidator(shadowManager);

  const result = await validator.validateCompletion(
    mockDocument,
    new vscode.Position(5, 10),
    'return x + y;'
  );

  expect(result.isValid).toBe(true);
  expect(result.errors.length).toBe(0);
});
```

### Test 3: Multi-Candidate Selection

```typescript
test('selects valid completion from candidates', async () => {
  const provider = new ValidatedCompletionProvider(validator);

  const candidates = [
    { text: 'invalid syntax {{', score: 1.0 },
    { text: 'return value;', score: 0.9 },
    { text: 'console.log(x);', score: 0.8 }
  ];

  const result = await provider.getBestValidCompletion(
    mockDocument,
    new vscode.Position(5, 0),
    candidates
  );

  expect(result?.text).toBe('return value;');
  expect(result?.validation.isValid).toBe(true);
});
```

## Performance Considerations

### Latency Budget

| Step | Target | Max |
|------|--------|-----|
| Generate candidates | 100ms | 200ms |
| Shadow document | 5ms | 10ms |
| LSP diagnostics | 50ms | 100ms |
| **Total validation** | **155ms** | **310ms** |

### Optimization Strategies

1. **Parallel validation**: Validate multiple candidates simultaneously
2. **Early termination**: Stop once one valid completion found
3. **Caching**: Cache validation results for identical completions
4. **Timeout fallback**: Show unvalidated if validation times out
5. **Language filtering**: Only validate for languages with good LSP support

```typescript
// Languages with reliable LSP validation
const VALIDATED_LANGUAGES = new Set([
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
  'python',
  'rust',
  'go'
]);

function shouldValidate(languageId: string): boolean {
  return VALIDATED_LANGUAGES.has(languageId);
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/src/validation/shadowDocument.ts` | Create | Shadow document management |
| `lib/src/validation/completionValidator.ts` | Create | Validation logic |
| `lib/src/validation/validatedCompletionProvider.ts` | Create | Validated completion provider |
| `lib/src/validation/multiCandidateGenerator.ts` | Create | Multi-candidate generation |
| Inline completion provider | Modify | Integrate validation |
| `package.json` | Modify | Add configuration options |

## Definition of Done

- [ ] Shadow workspace system working
- [ ] Completions validated before showing
- [ ] Invalid completions filtered out
- [ ] Multi-candidate generation working
- [ ] Latency within acceptable range (<300ms total)
- [ ] Configuration options available
- [ ] Tests passing
- [ ] Works for TypeScript, JavaScript, Python

## Future Improvements

1. **Smart retry**: If validation fails, adjust completion and retry
2. **Error-aware prompting**: Include validation errors in next prompt
3. **Cached validation**: Remember valid patterns
4. **Type inference**: Use LSP for better type-aware completions
5. **Quick fixes**: Apply LSP quick fixes to make completion valid

## Conclusion

With all 4 phases complete, Puku Editor will have:

1. **Semantic codebase search** via embeddings
2. **Full codebase indexing** for context
3. **Richer FIM context** from semantic + lexical search
4. **Pre-validated completions** via shadow workspace

This matches the core features that make Cursor's FIM feel "smarter" than traditional Copilot.
