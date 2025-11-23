# Phase 3: Semantic FIM Context

## Goal

Integrate the workspace embeddings index into the FIM (Fill-In-Middle) completion system to provide semantically relevant context from the entire codebase, not just open files.

## Duration

2-3 days

## Prerequisites

- Phase 1 complete (embeddings infrastructure)
- Phase 2 complete (codebase indexing)
- Workspace index populated and searchable

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FIM REQUEST FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User types → Trigger completion                            │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            CONTEXT GATHERING                          │   │
│  │                                                        │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌────────────┐  │   │
│  │  │ Cursor      │   │ Workspace   │   │ Open Tabs  │  │   │
│  │  │ Context     │   │ Index       │   │ (Jaccard)  │  │   │
│  │  │ (lines)     │   │ (semantic)  │   │            │  │   │
│  │  └──────┬──────┘   └──────┬──────┘   └─────┬──────┘  │   │
│  │         │                 │                 │         │   │
│  │         └─────────────────┼─────────────────┘         │   │
│  │                           │                            │   │
│  │                           ▼                            │   │
│  │                   ┌──────────────┐                    │   │
│  │                   │   RANKER     │                    │   │
│  │                   │ (dedupe,sort)│                    │   │
│  │                   └──────────────┘                    │   │
│  │                           │                            │   │
│  └───────────────────────────┼────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │  PROMPT BUILDER  │                     │
│                    │  (FIM format)    │                     │
│                    └──────────────────┘                     │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │    LLM API       │                     │
│                    └──────────────────┘                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tasks

### 3.1 Create Semantic Context Provider

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/prompt/contextProviders/semanticContext.ts` (new file)

```typescript
import { PukuWorkspaceIndex, IndexedChunk } from '../../../../../../platform/workspaceIndex/node/pukuWorkspaceIndex';

export interface SemanticContextOptions {
  maxSnippets: number;
  maxTokensPerSnippet: number;
  minSimilarityScore: number;
}

const DEFAULT_OPTIONS: SemanticContextOptions = {
  maxSnippets: 5,
  maxTokensPerSnippet: 200,
  minSimilarityScore: 0.3
};

export interface SemanticSnippet {
  filePath: string;
  content: string;
  range: { startLine: number; endLine: number };
  score: number;
}

export class SemanticContextProvider {
  constructor(
    private readonly _workspaceIndex: PukuWorkspaceIndex
  ) {}

  async getRelevantSnippets(
    cursorContext: string,
    currentFile: string,
    options: SemanticContextOptions = DEFAULT_OPTIONS
  ): Promise<SemanticSnippet[]> {
    // Don't search if index not ready
    if (this._workspaceIndex.stats.status !== 'ready') {
      return [];
    }

    // Search the index
    const results = await this._workspaceIndex.search(
      cursorContext,
      options.maxSnippets * 2 // Get extra for filtering
    );

    // Filter and transform results
    return results
      .filter(r => {
        // Exclude current file to avoid duplication
        if (r.chunk.file.toString() === currentFile) return false;
        return true;
      })
      .slice(0, options.maxSnippets)
      .map(r => ({
        filePath: r.chunk.file.fsPath,
        content: this._truncateContent(r.chunk.text, options.maxTokensPerSnippet),
        range: {
          startLine: r.chunk.range.startLineNumber,
          endLine: r.chunk.range.endLineNumber
        },
        score: 0 // Score not exposed from search currently
      }));
  }

  private _truncateContent(content: string, maxTokens: number): string {
    // Rough token estimate: ~4 chars per token
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) return content;
    return content.substring(0, maxChars) + '...';
  }
}
```

### 3.2 Integrate with FIM Prompt Builder

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/prompt/components/semanticSnippets.tsx` (new file)

```tsx
import { PromptElement, UserMessage } from '@vscode/prompt-tsx';
import { SemanticSnippet } from '../contextProviders/semanticContext';

interface SemanticSnippetsProps {
  snippets: SemanticSnippet[];
}

export class SemanticSnippets extends PromptElement<SemanticSnippetsProps> {
  render() {
    const { snippets } = this.props;

    if (snippets.length === 0) {
      return null;
    }

    const snippetText = snippets
      .map(s => `// File: ${s.filePath}:${s.range.startLine}-${s.range.endLine}\n${s.content}`)
      .join('\n\n');

    return (
      <UserMessage priority={50}>
        {`// Related code from codebase:\n${snippetText}\n\n`}
      </UserMessage>
    );
  }
}
```

### 3.3 Modify Completions Prompt Factory

**File**: Modify `github/editor/src/extension/completions-core/vscode-node/lib/src/prompt/completionsPromptFactory/componentsCompletionsPromptFactory.tsx`

Add semantic context to the prompt:

```typescript
import { SemanticContextProvider } from '../contextProviders/semanticContext';
import { SemanticSnippets } from '../components/semanticSnippets';

// In the prompt factory class:

async buildPrompt(request: CompletionRequest): Promise<CompletionPrompt> {
  // ... existing code ...

  // Get semantic context if enabled
  let semanticSnippets: SemanticSnippet[] = [];
  if (this._config.useSemanticContext && this._semanticContextProvider) {
    const cursorContext = this._extractCursorContext(request);
    semanticSnippets = await this._semanticContextProvider.getRelevantSnippets(
      cursorContext,
      request.document.uri.toString()
    );
  }

  // Build prompt with semantic snippets
  return {
    // ... existing prompt parts ...
    semanticSnippets,
  };
}

private _extractCursorContext(request: CompletionRequest): string {
  // Extract ~10 lines before and after cursor for context
  const lines = request.document.getText().split('\n');
  const cursorLine = request.position.line;

  const startLine = Math.max(0, cursorLine - 10);
  const endLine = Math.min(lines.length, cursorLine + 10);

  return lines.slice(startLine, endLine).join('\n');
}
```

### 3.4 Update FIM Prompt Format

**File**: Modify existing FIM prompt construction to include semantic snippets

```typescript
function buildFIMPrompt(
  prefix: string,
  suffix: string,
  semanticSnippets: SemanticSnippet[],
  similarFileSnippets: SimilarFileSnippet[]
): string {
  const parts: string[] = [];

  // Add semantic snippets first (highest relevance)
  if (semanticSnippets.length > 0) {
    parts.push('// Relevant code from codebase:');
    for (const snippet of semanticSnippets) {
      parts.push(`// File: ${snippet.filePath}`);
      parts.push(snippet.content);
      parts.push('');
    }
  }

  // Add similar file snippets (Jaccard-based, existing)
  if (similarFileSnippets.length > 0) {
    parts.push('// Similar code from open files:');
    for (const snippet of similarFileSnippets) {
      parts.push(`// File: ${snippet.relativePath}`);
      parts.push(snippet.text);
      parts.push('');
    }
  }

  // Add current file context with FIM tokens
  parts.push('<|fim_prefix|>');
  parts.push(prefix);
  parts.push('<|fim_suffix|>');
  parts.push(suffix);
  parts.push('<|fim_middle|>');

  return parts.join('\n');
}
```

### 3.5 Add Configuration

**File**: Add to `package.json` contributes.configuration

```json
{
  "puku.fim.useSemanticContext": {
    "type": "boolean",
    "default": true,
    "description": "Use semantic search to find relevant code from entire codebase for completions"
  },
  "puku.fim.maxSemanticSnippets": {
    "type": "number",
    "default": 5,
    "description": "Maximum number of semantic snippets to include in completion context"
  },
  "puku.fim.semanticContextEnabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable semantic context for FIM completions"
  }
}
```

### 3.6 Create Hybrid Context Strategy

**File**: `github/editor/src/extension/completions-core/vscode-node/lib/src/prompt/contextProviders/hybridContext.ts` (new file)

Combines semantic (embeddings) and lexical (Jaccard) context:

```typescript
import { SemanticContextProvider, SemanticSnippet } from './semanticContext';
import { SimilarFilesProvider, SimilarFileSnippet } from './similarFiles';

export interface HybridContextOptions {
  semanticWeight: number;  // 0-1, how much to prefer semantic results
  maxTotalSnippets: number;
  dedupeByFile: boolean;
}

const DEFAULT_OPTIONS: HybridContextOptions = {
  semanticWeight: 0.7,
  maxTotalSnippets: 6,
  dedupeByFile: true
};

export interface HybridSnippet {
  source: 'semantic' | 'jaccard';
  filePath: string;
  content: string;
  score: number;
}

export class HybridContextProvider {
  constructor(
    private readonly _semanticProvider: SemanticContextProvider,
    private readonly _jaccardProvider: SimilarFilesProvider
  ) {}

  async getContext(
    cursorContext: string,
    currentFile: string,
    openFiles: string[],
    options: HybridContextOptions = DEFAULT_OPTIONS
  ): Promise<HybridSnippet[]> {
    // Get both types of context in parallel
    const [semanticResults, jaccardResults] = await Promise.all([
      this._semanticProvider.getRelevantSnippets(cursorContext, currentFile),
      this._jaccardProvider.getSimilarSnippets(cursorContext, openFiles)
    ]);

    // Combine and dedupe
    const allSnippets: HybridSnippet[] = [];
    const seenFiles = new Set<string>();

    // Add semantic results first (weighted higher)
    const semanticCount = Math.ceil(options.maxTotalSnippets * options.semanticWeight);
    for (const s of semanticResults.slice(0, semanticCount)) {
      if (options.dedupeByFile && seenFiles.has(s.filePath)) continue;
      seenFiles.add(s.filePath);
      allSnippets.push({
        source: 'semantic',
        filePath: s.filePath,
        content: s.content,
        score: s.score
      });
    }

    // Fill remaining with Jaccard results
    const remaining = options.maxTotalSnippets - allSnippets.length;
    for (const s of jaccardResults.slice(0, remaining)) {
      if (options.dedupeByFile && seenFiles.has(s.filePath)) continue;
      seenFiles.add(s.filePath);
      allSnippets.push({
        source: 'jaccard',
        filePath: s.filePath,
        content: s.content,
        score: s.score
      });
    }

    return allSnippets;
  }
}
```

## Testing

### Test 1: Semantic Context Retrieval

```typescript
test('semantic provider returns relevant snippets', async () => {
  const provider = new SemanticContextProvider(mockWorkspaceIndex);

  const snippets = await provider.getRelevantSnippets(
    'function authenticate(user, password)',
    '/current/file.ts'
  );

  expect(snippets.length).toBeGreaterThan(0);
  expect(snippets.some(s => s.content.includes('auth') || s.content.includes('login'))).toBe(true);
});
```

### Test 2: Prompt Integration

```typescript
test('FIM prompt includes semantic snippets', async () => {
  const factory = new CompletionsPromptFactory(config, semanticProvider);

  const prompt = await factory.buildPrompt({
    document: mockDocument,
    position: { line: 10, character: 0 }
  });

  expect(prompt).toContain('// Relevant code from codebase:');
  expect(prompt).toContain('<|fim_prefix|>');
});
```

### Test 3: Hybrid Context

```typescript
test('hybrid context combines semantic and jaccard', async () => {
  const provider = new HybridContextProvider(semanticProvider, jaccardProvider);

  const context = await provider.getContext(
    'cursor context',
    '/current.ts',
    ['/open1.ts', '/open2.ts']
  );

  expect(context.some(c => c.source === 'semantic')).toBe(true);
  expect(context.some(c => c.source === 'jaccard')).toBe(true);
});
```

## Performance Considerations

### Latency Budget

| Step | Target | Max |
|------|--------|-----|
| Semantic search | 20ms | 50ms |
| Jaccard search | 10ms | 20ms |
| Prompt building | 5ms | 10ms |
| **Total context** | **35ms** | **80ms** |

### Optimization Strategies

1. **Parallel fetching**: Get semantic and Jaccard results simultaneously
2. **Caching**: Cache recent semantic queries
3. **Early termination**: Stop search once enough results found
4. **Timeout fallback**: If semantic search slow, use Jaccard only

```typescript
async getContextWithTimeout(
  cursorContext: string,
  timeoutMs: number = 50
): Promise<HybridSnippet[]> {
  const semanticPromise = this._semanticProvider.getRelevantSnippets(cursorContext);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), timeoutMs)
  );

  try {
    return await Promise.race([semanticPromise, timeoutPromise]);
  } catch {
    // Fallback to Jaccard only
    return this._jaccardProvider.getSimilarSnippets(cursorContext);
  }
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/src/prompt/contextProviders/semanticContext.ts` | Create | Semantic context provider |
| `lib/src/prompt/components/semanticSnippets.tsx` | Create | Prompt component |
| `lib/src/prompt/contextProviders/hybridContext.ts` | Create | Combined context provider |
| `lib/src/prompt/completionsPromptFactory/*.tsx` | Modify | Integrate semantic context |
| `package.json` | Modify | Add configuration options |

## Definition of Done

- [ ] Semantic context provider working
- [ ] FIM prompts include semantic snippets
- [ ] Hybrid context strategy implemented
- [ ] Configuration options available
- [ ] Latency within budget (<100ms total)
- [ ] Tests passing
- [ ] A/B comparison with Jaccard-only approach

## Next Phase

Once this phase is complete, proceed to [Phase 4: Shadow Workspace](./phase-4-shadow-workspace.md).
