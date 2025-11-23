# Fill-In-Middle (FIM) Architecture Documentation

## Overview

Fill-in-the-Middle (FIM) is a specialized code completion technique that enables language models to generate code by considering both the preceding (prefix) and following (suffix) context. This approach differs from traditional autocompletion by instructing the model to generate text that fits seamlessly between existing code sections.

## Basic FIM Concept

```
┌────────────────────────────────────────────────────────┐
│  def calculate_total(items):                           │ ← PREFIX
│      total = 0                                         │
│      for item in items:                                │
│          █                                             │ ← CURSOR (generate here)
│      return total                                      │ ← SUFFIX
└────────────────────────────────────────────────────────┘
```

The model sees **both** prefix AND suffix, then fills in the middle.

## FIM Prompt Format

Models are trained with special tokens to understand the FIM task:

```
<|fim_prefix|>def calculate_total(items):
    total = 0
    for item in items:
        <|fim_suffix|>
    return total<|fim_middle|>
```

The model generates after the `<|fim_middle|>` token, knowing what comes after.

### Common FIM Token Formats

| Provider | Prefix Token | Suffix Token | Middle Token |
|----------|--------------|--------------|--------------|
| OpenAI | `<\|fim_prefix\|>` | `<\|fim_suffix\|>` | `<\|fim_middle\|>` |
| StarCoder | `<fim_prefix>` | `<fim_suffix>` | `<fim_middle>` |
| DeepSeek | `<｜fim▁begin｜>` | `<｜fim▁hole｜>` | `<｜fim▁end｜>` |
| CodeLlama | `<PRE>` | `<SUF>` | `<MID>` |

---

## Cursor FIM Architecture

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER TYPES IN EDITOR                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              1. CONTEXT GATHERING                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Current File    │  │ Embeddings      │  │ Open Tabs    │ │
│  │ (prefix/suffix) │  │ Index Search    │  │ Recent Edits │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                    │                   │         │
│           └────────────────────┼───────────────────┘         │
│                                │                             │
└────────────────────────────────┼─────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              2. PROMPT CONSTRUCTION                          │
│                                                              │
│  // Similar file 1 (from embeddings)                        │
│  <|fim_prefix|>                                             │
│  // Path: src/utils/math.ts                                 │
│  function sum(arr) { return arr.reduce((a,b) => a+b, 0); }  │
│                                                              │
│  // Current file                                            │
│  def calculate_total(items):                                │
│      total = 0                                              │
│      for item in items:                                     │
│          <|fim_suffix|>                                     │
│      return total<|fim_middle|>                             │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              3. FAST FIM MODEL                               │
│                                                              │
│  - Small model (1-7B params) trained for FIM                │
│  - Very low latency (~50-200ms)                             │
│  - Generates: "total += item.price"                         │
│                                                              │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              4. SHADOW WORKSPACE VALIDATION                  │
│                                                              │
│  - Apply completion to hidden workspace                     │
│  - Run language server (TypeScript, Python LSP, etc.)       │
│  - Check for:                                               │
│    ✓ Syntax errors                                          │
│    ✓ Type errors                                            │
│    ✓ Import issues                                          │
│  - If errors → filter out or re-generate                    │
│                                                              │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              5. SHOW TO USER                                 │
│                                                              │
│  def calculate_total(items):                                │
│      total = 0                                              │
│      for item in items:                                     │
│          total += item.price  ← (ghost text)                │
│      return total                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Context Gathering

Cursor uses **embeddings-based semantic search** to find relevant code:

```
User typing in auth.py
    │
    ├── Embeddings query: "authentication, user, login"
    │
    └── Returns relevant code from:
        ├── models/user.py (User class definition)
        ├── utils/jwt.py (token functions)
        └── config/auth.py (auth settings)
```

Unlike simpler approaches that only look at open files, Cursor searches the **entire codebase**.

#### 2. Shadow Workspace

Cursor validates completions before showing them:

```
Main Editor                    Shadow Workspace (hidden)
┌──────────────┐              ┌──────────────┐
│ Your code    │              │ Copy of code │
│              │  ──────────► │ + completion │
│              │              │              │
│              │              │ LSP checks:  │
│              │  ◄────────── │ ✓ No errors  │
│              │              └──────────────┘
│ Show ghost   │
│ text         │
└──────────────┘
```

#### 3. Multi-Model Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Fast Model  │ ──► │ Apply Model  │ ──► │ Validation  │
│ (generate)  │     │ (fix syntax) │     │ (LSP check) │
│ ~1-3B       │     │ ~1B          │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## GitHub Copilot FIM Architecture

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER TYPES IN EDITOR                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              1. CONTEXT GATHERING                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Current File    │  │ Similar Files   │  │ Recent Edits │ │
│  │ (prefix/suffix) │  │ (Jaccard match) │  │              │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                    │                   │         │
│           └────────────────────┼───────────────────┘         │
│                                │                             │
└────────────────────────────────┼─────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              2. PROMPT CONSTRUCTION                          │
│                                                              │
│  - Max 4 snippets from similar files                        │
│  - 60 tokens per snippet                                    │
│  - Prefix + Suffix from current file                        │
│                                                              │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              3. FIM MODEL                                    │
│                                                              │
│  - GitHub/OpenAI models                                     │
│  - Generates completion                                     │
│                                                              │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              4. SHOW TO USER                                 │
│                                                              │
│  - No pre-validation                                        │
│  - Direct ghost text display                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Jaccard Similarity Matching

Copilot uses **token overlap** (Jaccard similarity) instead of embeddings:

```typescript
// Jaccard similarity = intersection / union
function jaccardSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  return intersection.size / union.size;
}
```

**Pros**: Very fast, no API calls needed
**Cons**: Only finds lexically similar code, not semantically related

### Context Sources

| Source | Description | Default Limit |
|--------|-------------|---------------|
| Current file | Prefix + Suffix around cursor | Full file |
| Similar files | Open tabs with high Jaccard score | 20 files max |
| Snippets | Best matching code blocks | 4 snippets |
| Recent edits | Recent changes in current buffer | Varies |

---

## Comparison: Cursor vs Copilot FIM

### Architecture Differences

| Aspect | Cursor | GitHub Copilot |
|--------|--------|----------------|
| **Base** | VS Code fork (deep integration) | VS Code extension |
| **Model** | Multiple LLMs (Claude, GPT-4, custom) | GitHub/OpenAI models |
| **Context** | Vector embeddings (whole codebase) | Jaccard similarity (open files) |
| **Indexing** | Remote (Turbopuffer vector DB) | Local (JSON + in-memory) |

### FIM Specific Differences

| Feature | Cursor | GitHub Copilot |
|---------|--------|----------------|
| **Context source** | Indexed codebase + open files | Open files + recent edits |
| **Similarity method** | Embeddings (semantic) | Jaccard (token overlap) |
| **@codebase search** | Yes (in completions) | No (only in chat) |
| **Shadow workspace** | Yes (validates with LSP) | No |
| **Multi-model** | Yes (fast + apply models) | Single model |
| **Pre-validation** | Yes (LSP checks) | No |

### Performance Characteristics

| Metric | Cursor | Copilot |
|--------|--------|---------|
| **Latency** | ~100-300ms | ~50-200ms |
| **Accuracy** | Higher (more context + validation) | Good |
| **Large repos** | Better (indexed) | Limited (750-2500 files) |
| **Privacy** | Code sent to remote index | More local processing |

---

## FIM Model Training

### Training Objective

FIM models are trained with a special objective that teaches them to predict middle content:

```
Original: "def hello(): print('world')"

FIM Training Sample:
  Prefix: "def hello(): "
  Suffix: "('world')"
  Middle: "print"  ← Model learns to predict this
```

### PSM vs SPM Formats

**PSM (Prefix-Suffix-Middle)**:
```
<prefix>code before<suffix>code after<middle>
```

**SPM (Suffix-Prefix-Middle)**:
```
<suffix>code after<prefix>code before<middle>
```

Most modern models support both formats.

### Recommended FIM Models

| Model | Size | Best For |
|-------|------|----------|
| DeepSeek-Coder | 1.3B-33B | General code completion |
| StarCoder2 | 3B-15B | Multi-language support |
| CodeLlama | 7B-34B | Python, strong FIM |
| Codestral | 22B (MoE) | Low latency, high quality |

---

## Implementation Guide

### Basic FIM Request

```typescript
interface FIMRequest {
  prefix: string;      // Code before cursor
  suffix: string;      // Code after cursor
  maxTokens: number;   // Max completion length
  temperature: number; // Creativity (0-1)
  stop: string[];      // Stop sequences
}

async function getFIMCompletion(request: FIMRequest): Promise<string> {
  const prompt = formatFIMPrompt(request.prefix, request.suffix);
  const response = await model.complete(prompt, {
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    stop: request.stop
  });
  return response.text;
}

function formatFIMPrompt(prefix: string, suffix: string): string {
  return `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
}
```

### Adding Context from Similar Files

```typescript
async function getFIMWithContext(
  prefix: string,
  suffix: string,
  similarFiles: FileContent[]
): Promise<string> {
  // Build context from similar files
  const contextSnippets = similarFiles
    .slice(0, 4)
    .map(f => `// Path: ${f.path}\n${f.content}`)
    .join('\n\n');

  // Construct full prompt
  const fullPrefix = contextSnippets + '\n\n' + prefix;

  return getFIMCompletion({
    prefix: fullPrefix,
    suffix: suffix,
    maxTokens: 150,
    temperature: 0.2,
    stop: ['\n\n', '<|fim_end|>']
  });
}
```

### Shadow Workspace Validation

```typescript
async function validateCompletion(
  document: TextDocument,
  position: Position,
  completion: string
): Promise<boolean> {
  // Create shadow document with completion applied
  const shadowDoc = applyCompletion(document, position, completion);

  // Get diagnostics from language server
  const diagnostics = await languageServer.getDiagnostics(shadowDoc);

  // Filter to only errors in the completion range
  const completionRange = getCompletionRange(position, completion);
  const errors = diagnostics.filter(d =>
    d.severity === 'error' &&
    rangesOverlap(d.range, completionRange)
  );

  return errors.length === 0;
}
```

---

## Best Practices

### For Better FIM Results

1. **Provide sufficient context**: Include relevant imports and type definitions
2. **Keep cursor in logical position**: Middle of function, not random location
3. **Use appropriate model**: Smaller models (1-7B) for speed, larger for accuracy
4. **Set good stop sequences**: Prevent over-generation

### For Implementation

1. **Cache embeddings**: Don't recompute for unchanged files
2. **Debounce requests**: Don't fire on every keystroke
3. **Timeout gracefully**: Show no completion rather than slow completion
4. **Filter bad completions**: Basic syntax checks before showing

---

## Puku Editor FIM Implementation

Puku Editor provides its own FIM implementation through `PukuInlineCompletionProvider`.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PUKU FIM FLOW                            │
├─────────────────────────────────────────────────────────────┤
│  1. User types in editor                                    │
│       ↓                                                     │
│  2. PukuInlineCompletionProvider triggered                  │
│       ↓                                                     │
│  3. Extract prefix (before cursor) + suffix (after cursor)  │
│       ↓                                                     │
│  4. Try native /v1/completions endpoint first               │
│       ↓ (if fails)                                          │
│  5. Fallback to /v1/chat/completions with FIM prompt        │
│       ↓                                                     │
│  6. Return InlineCompletionItem to VS Code                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` | Standalone FIM provider |
| `src/extension/pukuai/vscode-node/pukuaiContribution.ts` | Provider registration |
| `github/proxy/src/routes/completions.ts` | Proxy FIM endpoint |

### Supported Languages

TypeScript, JavaScript, Python, Java, C/C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Vue, Svelte, HTML, CSS, SCSS, JSON, YAML, Markdown, SQL, Shell, Bash

### Provider Flow

```typescript
// 1. Provider registered with VS Code
vscode.languages.registerInlineCompletionItemProvider(selector, provider);

// 2. On typing, VS Code calls provideInlineCompletionItems()
async provideInlineCompletionItems(document, position, context, token) {
  // Extract context
  const prefix = document.getText(new Range(start, position));
  const suffix = document.getText(new Range(position, end));

  // Fetch completion from proxy
  const completion = await this._fetchCompletion(prefix, suffix, languageId, token);

  // Return as inline completion
  return [new InlineCompletionItem(completion, new Range(position, position))];
}
```

### Dual Endpoint Strategy

Puku FIM tries two approaches:

1. **Native Completions** (`/v1/completions`)
   - Direct FIM with `prompt` + `suffix` parameters
   - Lower latency, simpler prompt

2. **Chat Fallback** (`/v1/chat/completions`)
   - Builds FIM prompt with `CODE_BEFORE` and `CODE_AFTER` markers
   - Works with any chat model

### Semantic Context Integration

Puku FIM can optionally use semantic search to enhance completions:

```
┌─────────────────────────────────────────────────────────────┐
│                  FIM + SEMANTIC CONTEXT                      │
├─────────────────────────────────────────────────────────────┤
│  1. User types in editor                                     │
│       ↓                                                      │
│  2. Extract prefix/suffix                                    │
│       ↓                                                      │
│  3. PukuSemanticContext queries indexed embeddings           │
│       ↓                                                      │
│  4. Top-k similar code chunks added to context               │
│       ↓                                                      │
│  5. Enhanced FIM prompt sent to model                        │
└─────────────────────────────────────────────────────────────┘
```

**Current**: In-memory cosine similarity search
**Planned**: sqlite-vec for efficient KNN queries

### Configuration

The provider uses the endpoint configured in:
```json
{
  "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
}
```

---

## References

- [Fill-in-the-Middle Research Paper](https://arxiv.org/abs/2207.14255)
- [DeepSeek-Coder](https://github.com/deepseek-ai/DeepSeek-Coder)
- [StarCoder2](https://huggingface.co/bigcode/starcoder2)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
