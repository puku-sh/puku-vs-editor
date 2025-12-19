# Architecture: FIM API Metadata for Multi-Document Completions

**Version**: 1.0
**Date**: 2025-12-19
**Status**: Design
**Related**: [PRD](/tmp/prd-fim-metadata-backend.md)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [API Specification](#api-specification)
6. [Metadata Generation](#metadata-generation)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)
9. [Testing Strategy](#testing-strategy)

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUKU BACKEND (Cloudflare Worker)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /v1/fim/context Endpoint                               │   │
│  │  ├── Request Handler                                     │   │
│  │  ├── Context Builder                                     │   │
│  │  └── Response Formatter                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Codestral Mamba (mistralai/codestral-2501)            │   │
│  │  ├── Completion Generation                              │   │
│  │  └── Context Understanding                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Metadata Generator (NEW)                               │   │
│  │  ├── Target Document Resolver                           │   │
│  │  ├── Position Calculator                                │   │
│  │  └── Display Type Classifier                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Response Builder                                        │   │
│  │  ├── Metadata Validator                                 │   │
│  │  ├── JSON Serializer                                    │   │
│  │  └── Error Handler                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Frontend (VS   │
                    │  Code Extension)│
                    └─────────────────┘
```

---

## Architecture Layers

### Layer 1: API Handler
**Responsibility**: HTTP request/response handling

```typescript
// src/routes/completions.ts
export async function handleFimContext(request: Request): Promise<Response> {
  // Parse request
  const body = await request.json();

  // Generate completion
  const completion = await generateCompletion(body);

  // Generate metadata
  const metadata = await generateMetadata(completion, body);

  // Build response
  return buildResponse(completion, metadata);
}
```

### Layer 2: Completion Generator
**Responsibility**: AI completion generation (existing)

```typescript
// Existing code, no changes needed
async function generateCompletion(params: FimParams): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'codestral-2501',
      prompt: params.prompt,
      suffix: params.suffix,
      // ...
    })
  });

  return response.choices[0].text;
}
```

### Layer 3: Metadata Generator (NEW)
**Responsibility**: Generate metadata from completion and context

```typescript
async function generateMetadata(
  completion: string,
  context: FimContext
): Promise<CompletionMetadata | undefined> {
  // Detect if multi-document edit
  const isMultiDoc = detectMultiDocument(completion, context);
  if (!isMultiDoc) return undefined;

  // Extract target document
  const targetDoc = extractTargetDocument(completion, context);

  // Calculate position
  const { line, column } = calculatePosition(completion, context);

  // Determine display type
  const displayType = classifyDisplayType(completion);

  return {
    targetDocument: targetDoc,
    targetLine: line,
    targetColumn: column,
    displayType
  };
}
```

### Layer 4: Response Builder
**Responsibility**: Format final JSON response

```typescript
function buildResponse(
  completion: string,
  metadata: CompletionMetadata | undefined
): Response {
  const response = {
    id: generateId(),
    object: 'text_completion',
    created: Date.now(),
    model: 'mistralai/codestral-2501',
    choices: [{
      text: completion,
      index: 0,
      finish_reason: 'stop',
      metadata  // NEW: optional field
    }]
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## Component Design

### 1. MetadataGenerator

**Responsibility**: Generate completion metadata

```typescript
// src/services/metadataGenerator.ts
export class MetadataGenerator {
  /**
   * Generate metadata for a completion
   */
  async generate(
    completion: string,
    context: FimContext
  ): Promise<CompletionMetadata | undefined> {
    // Step 1: Detect if multi-document
    if (!this.isMultiDocument(completion, context)) {
      return undefined;  // Same-document edit, no metadata needed
    }

    // Step 2: Resolve target document
    const targetDoc = this.resolveTargetDocument(completion, context);
    if (!targetDoc) {
      console.warn('[MetadataGenerator] Failed to resolve target document');
      return undefined;
    }

    // Step 3: Calculate position
    const position = this.calculatePosition(completion, context, targetDoc);

    // Step 4: Determine display type
    const displayType = this.classifyDisplayType(completion);

    return {
      targetDocument: targetDoc,
      targetLine: position.line,
      targetColumn: position.column,
      displayType
    };
  }

  /**
   * Detect if completion targets different document
   */
  private isMultiDocument(completion: string, context: FimContext): boolean {
    // Heuristic 1: Import statement at beginning of file
    if (this.isImportStatement(completion) && context.position.line > 0) {
      return true;  // Import should go to top, not cursor position
    }

    // Heuristic 2: Completion references external file
    if (this.referencesExternalFile(completion, context)) {
      return true;
    }

    // Heuristic 3: Completion creates new file
    if (this.createsNewFile(completion)) {
      return true;
    }

    return false;
  }

  /**
   * Resolve target document URI
   */
  private resolveTargetDocument(
    completion: string,
    context: FimContext
  ): string | undefined {
    // For import statements, target is current file
    if (this.isImportStatement(completion)) {
      return context.currentDocument;
    }

    // For file creation, extract path from completion
    const newFilePath = this.extractNewFilePath(completion);
    if (newFilePath) {
      return this.buildUri(context.workspaceRoot, newFilePath);
    }

    return undefined;
  }

  /**
   * Calculate target position
   */
  private calculatePosition(
    completion: string,
    context: FimContext,
    targetDoc: string
  ): { line: number; column: number } {
    // Import statements go to line 0
    if (this.isImportStatement(completion)) {
      return { line: 0, column: 0 };
    }

    // New file creation goes to line 0
    if (targetDoc !== context.currentDocument) {
      return { line: 0, column: 0 };
    }

    // Default: cursor position
    return {
      line: context.position.line,
      column: context.position.column
    };
  }

  /**
   * Classify display type
   */
  private classifyDisplayType(completion: string): 'code' | 'label' {
    // Import statements use label
    if (this.isImportStatement(completion)) {
      return 'label';
    }

    // Multi-line completions use label
    if (completion.split('\n').length > 1) {
      return 'label';
    }

    // Default: ghost text
    return 'code';
  }

  // Helper methods
  private isImportStatement(text: string): boolean {
    return /^import\s+/.test(text.trim()) || /^from\s+/.test(text.trim());
  }

  private referencesExternalFile(text: string, context: FimContext): boolean {
    // Check if completion mentions file paths
    const pathPattern = /['"](\.\/.+?)['\"]/g;
    return pathPattern.test(text);
  }

  private createsNewFile(text: string): boolean {
    // Heuristic: Completion starts with export or multiple lines
    return text.startsWith('export') && text.split('\n').length > 3;
  }

  private extractNewFilePath(text: string): string | undefined {
    // Extract file path from comments like // File: src/utils/helper.ts
    const match = text.match(/\/\/\s*File:\s*(.+)/);
    return match?.[1];
  }

  private buildUri(workspace: string, path: string): string {
    return `file://${workspace}/${path}`;
  }
}
```

### 2. MetadataValidator

**Responsibility**: Validate metadata before sending to frontend

```typescript
// src/services/metadataValidator.ts
export class MetadataValidator {
  validate(metadata: CompletionMetadata | undefined): boolean {
    if (!metadata) return true;  // undefined is valid (no metadata)

    // Validate target document
    if (metadata.targetDocument && !this.isValidUri(metadata.targetDocument)) {
      console.error('[MetadataValidator] Invalid target document URI');
      return false;
    }

    // Validate target line/column
    if (metadata.targetLine !== undefined && metadata.targetLine < 0) {
      console.error('[MetadataValidator] Invalid target line (negative)');
      return false;
    }

    if (metadata.targetColumn !== undefined && metadata.targetColumn < 0) {
      console.error('[MetadataValidator] Invalid target column (negative)');
      return false;
    }

    // Validate display type
    if (metadata.displayType && !['code', 'label'].includes(metadata.displayType)) {
      console.error('[MetadataValidator] Invalid display type');
      return false;
    }

    return true;
  }

  private isValidUri(uri: string): boolean {
    try {
      const url = new URL(uri);
      return url.protocol === 'file:';
    } catch {
      return false;
    }
  }
}
```

---

## Data Flow

### Sequence Diagram

```
Frontend                API Handler              AI Model             Metadata Gen
   │                        │                        │                     │
   │  POST /v1/fim/context  │                        │                     │
   │───────────────────────>│                        │                     │
   │                        │                        │                     │
   │                        │  Generate completion   │                     │
   │                        │───────────────────────>│                     │
   │                        │                        │                     │
   │                        │  Completion text       │                     │
   │                        │<───────────────────────│                     │
   │                        │                        │                     │
   │                        │  Generate metadata(completion, context)      │
   │                        │─────────────────────────────────────────────>│
   │                        │                        │                     │
   │                        │                        │  Detect multi-doc   │
   │                        │                        │  Resolve target     │
   │                        │                        │  Calculate position │
   │                        │                        │  Classify display   │
   │                        │                        │                     │
   │                        │  Metadata              │                     │
   │                        │<─────────────────────────────────────────────│
   │                        │                        │                     │
   │                        │  Validate metadata     │                     │
   │                        │──────┐                 │                     │
   │                        │      │                 │                     │
   │                        │<─────┘                 │                     │
   │                        │                        │                     │
   │  Response with metadata│                        │                     │
   │<───────────────────────│                        │                     │
   │                        │                        │                     │
```

---

## API Specification

### Request Format (Unchanged)

```typescript
interface FimRequest {
  prompt: string;
  suffix: string;
  openFiles: Array<{ filepath: string; content: string }>;
  language: string;
  max_tokens?: number;
  temperature?: number;
  n?: number;
}
```

### Response Format (Enhanced)

```typescript
interface FimResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: FimChoice[];
}

interface FimChoice {
  text: string;
  index: number;
  finish_reason: string | null;
  metadata?: CompletionMetadata;  // NEW
}

interface CompletionMetadata {
  targetDocument?: string;    // file:///workspace/src/file.ts
  targetLine?: number;         // 0-indexed line number
  targetColumn?: number;       // 0-indexed column number
  displayType?: 'code' | 'label';
}
```

---

## Metadata Generation

### Decision Tree

```
Is completion multi-document?
│
├─ NO ──> Return undefined (ghost text)
│
└─ YES
   │
   ├─ Is import statement?
   │  └─ YES ──> targetLine: 0, displayType: 'label'
   │
   ├─ Creates new file?
   │  └─ YES ──> targetDoc: new file URI, targetLine: 0
   │
   └─ References external file?
      └─ YES ──> targetDoc: referenced file, displayType: 'label'
```

### Heuristics

| Pattern | Metadata |
|---------|----------|
| `import { X } from 'Y'` at line > 0 | targetLine: 0, displayType: 'label' |
| Multi-line completion | displayType: 'label' |
| `// File: path/to/file.ts` comment | targetDoc: path, targetLine: 0 |
| Same-document edit | metadata: undefined |

---

## Error Handling

### Error Cases

| Error | HTTP Status | Response |
|-------|-------------|----------|
| Invalid request body | 400 | `{ error: 'Invalid request' }` |
| Missing required fields | 400 | `{ error: 'Missing: prompt' }` |
| AI model error | 500 | `{ error: 'Model unavailable' }` |
| Metadata validation failed | 200 | Return completion without metadata |

### Graceful Degradation

```typescript
try {
  const metadata = await metadataGenerator.generate(completion, context);

  // Validate metadata
  if (!metadataValidator.validate(metadata)) {
    console.warn('[API] Invalid metadata, returning without metadata');
    return buildResponse(completion, undefined);  // Fallback to no metadata
  }

  return buildResponse(completion, metadata);
} catch (error) {
  console.error('[API] Metadata generation failed:', error);
  return buildResponse(completion, undefined);  // Fallback to no metadata
}
```

---

## Performance Considerations

### Latency Budget

| Operation | Target | Max |
|-----------|--------|-----|
| Metadata detection | <5ms | 10ms |
| Target resolution | <5ms | 10ms |
| Position calculation | <1ms | 5ms |
| Metadata validation | <1ms | 5ms |
| **Total overhead** | **<15ms** | **30ms** |

### Optimization Strategies

1. **Caching**: Cache file URI mappings
2. **Lazy evaluation**: Skip metadata if not multi-document
3. **Parallel execution**: Run metadata generation while AI streams
4. **Heuristic shortcuts**: Fast-path for common cases (imports)

---

## Testing Strategy

### Unit Tests

```typescript
describe('MetadataGenerator', () => {
  it('returns undefined for same-document edits', () => {
    const gen = new MetadataGenerator();
    const result = gen.generate('const x = 1;', context);
    expect(result).toBeUndefined();
  });

  it('generates metadata for import statements', () => {
    const gen = new MetadataGenerator();
    const result = gen.generate("import { x } from 'y';", context);
    expect(result).toEqual({
      targetDocument: 'file:///workspace/src/main.ts',
      targetLine: 0,
      targetColumn: 0,
      displayType: 'label'
    });
  });

  it('validates URIs correctly', () => {
    const validator = new MetadataValidator();
    expect(validator.validate({ targetDocument: 'file:///valid' })).toBe(true);
    expect(validator.validate({ targetDocument: 'http://invalid' })).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('FIM API with metadata', () => {
  it('returns metadata for cross-file completions', async () => {
    const response = await fetch('/v1/fim/context', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'const total = calculateTotal(',
        suffix: ')',
        openFiles: [{ filepath: 'main.ts', content: 'export const calculateTotal = ...' }]
      })
    });

    const data = await response.json();
    expect(data.choices[0].metadata).toBeDefined();
    expect(data.choices[0].metadata.targetLine).toBe(0);
  });
});
```

---

## Migration Path

### Phase 1: Schema Update (Week 1)
- Add `metadata` field to response types
- Deploy without metadata generation
- Verify backward compatibility

### Phase 2: Metadata Generation (Week 2)
- Implement `MetadataGenerator`
- Deploy with metadata for import statements only
- Monitor error rates

### Phase 3: Full Rollout (Week 3)
- Enable all metadata heuristics
- Frontend consumes metadata
- End-to-end validation

---

**Version History**:
- v1.0 (2025-12-19): Initial architecture design
