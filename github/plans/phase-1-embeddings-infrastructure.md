# Phase 1: Embeddings Infrastructure

## Goal

Add the foundational infrastructure for computing and storing text embeddings. This enables semantic search across the codebase.

## Duration

2-3 days

## Prerequisites

- Proxy server running (`github/proxy`)
- Extension compiling (`github/editor`)
- OpenRouter API key (recommended for code embeddings)
- Cloudflare account (optional, alternative to OpenRouter)
- Ollama installed locally (optional, for local embeddings)

## Tasks

### 1.1 Add Embeddings Endpoint to Proxy

**File**: `github/proxy/src/index.ts`

Add OpenAI-compatible embeddings endpoint:

```typescript
// POST /v1/embeddings
app.post('/v1/embeddings', async (req, res) => {
  const { input, model, dimensions } = req.body;

  // Normalize input to array
  const inputs = Array.isArray(input) ? input : [input];

  // Option A: Use OpenRouter Voyage-Code-3 (Recommended for code)
  const embeddings = await computeOpenRouterEmbeddings(inputs, 'voyageai/voyage-code-3');

  // Option B: Use Cloudflare Workers AI
  // const embeddings = await computeCloudflareEmbeddings(inputs);

  // Option C: Use local model (Ollama)
  // const embeddings = await computeOllamaEmbeddings(inputs);

  // Return OpenAI-compatible response
  res.json({
    object: 'list',
    data: embeddings.map((embedding, index) => ({
      object: 'embedding',
      index,
      embedding
    })),
    model: model || 'voyageai/voyage-code-3',
    usage: {
      prompt_tokens: inputs.reduce((sum, i) => sum + i.length / 4, 0),
      total_tokens: inputs.reduce((sum, i) => sum + i.length / 4, 0)
    }
  });
});
```

### 1.2 Implement Cloudflare Embeddings

**File**: `github/proxy/src/embeddings.ts` (new file)

```typescript
const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;

export async function computeCloudflareEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: [text] })
      }
    );

    const data = await response.json();
    results.push(data.result.data[0]);
  }

  return results;
}
```

### 1.3 OpenRouter Embeddings (Recommended for Code)

**File**: `github/proxy/src/embeddings.ts`

OpenRouter provides **Voyage-Code-3**, which is specifically optimized for code retrieval tasks. This is the **recommended option** for semantic code search as it outperforms general-purpose embedding models.

```typescript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function computeOpenRouterEmbeddings(
  texts: string[],
  model: string = 'voyageai/voyage-code-3',
  dimensions: number = 1024
): Promise<number[][]> {
  const results: number[][] = [];

  // OpenRouter supports batch requests
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/puku-ai/puku-editor',
      'X-Title': 'Puku Editor'
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions // 1024 (default), 256, 512, or 2048
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}
```

**Model Options:**
- `voyageai/voyage-code-3` - **Best for code** (32K context, 1024 dims)
- `voyageai/voyage-code-2` - Older code model (16K context, 1536 dims)
- `voyageai/voyage-3.5` - General purpose (32K context, 1024 dims)

### 1.4 Alternative: Ollama Embeddings

**File**: `github/proxy/src/embeddings.ts`

```typescript
export async function computeOllamaEmbeddings(
  texts: string[],
  model: string = 'nomic-embed-text'
): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });

    const data = await response.json();
    results.push(data.embedding);
  }

  return results;
}
```

### 1.5 Create Extension Embeddings Service

**File**: `github/editor/src/platform/embeddings/node/pukuEmbeddingsComputer.ts` (new file)

```typescript
import { CancellationToken } from 'vscode';
import { IFetcherService } from '../../networking/common/fetcherService';
import {
  Embedding,
  EmbeddingType,
  Embeddings,
  IEmbeddingsComputer
} from '../common/embeddingsComputer';

export class PukuEmbeddingsComputer implements IEmbeddingsComputer {
  readonly _serviceBrand: undefined;

  private readonly _endpoint = 'http://localhost:11434/v1/embeddings';

  constructor(
    @IFetcherService private readonly _fetcherService: IFetcherService,
  ) {}

  async computeEmbeddings(
    type: EmbeddingType,
    inputs: readonly string[],
    options?: { inputType?: 'document' | 'query' },
    telemetryInfo?: any,
    token?: CancellationToken
  ): Promise<Embeddings> {
    const response = await this._fetcherService.fetch(this._endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: inputs,
        model: 'voyageai/voyage-code-3',
        dimensions: 1024
      })
    });

    const data = await response.json();

    return {
      type,
      values: data.data.map((item: any): Embedding => ({
        type,
        value: item.embedding
      }))
    };
  }
}
```

### 1.6 Register Puku Embeddings Service

**File**: `github/editor/src/extension/extension/vscode-node/services.ts`

Add registration for Puku embeddings when using Puku AI:

```typescript
// In services registration
import { PukuEmbeddingsComputer } from '../../../platform/embeddings/node/pukuEmbeddingsComputer';

// Register based on configuration
if (usePukuAI) {
  services.set(IEmbeddingsComputer, new PukuEmbeddingsComputer(fetcherService));
}
```

### 1.7 Create Embeddings Cache

**File**: `github/editor/src/platform/embeddings/node/pukuEmbeddingsCache.ts` (new file)

```typescript
import { URI } from '../../../util/vs/base/common/uri';
import { Embedding, EmbeddingType } from '../common/embeddingsComputer';

interface CacheEntry {
  embedding: number[];
  hash: string;
  timestamp: number;
}

export class PukuEmbeddingsCache {
  private _cache = new Map<string, CacheEntry>();
  private _cacheFile: URI | undefined;

  constructor(storageUri: URI | undefined) {
    this._cacheFile = storageUri
      ? URI.joinPath(storageUri, 'puku-embeddings-cache.json')
      : undefined;
  }

  async get(key: string, hash: string): Promise<Embedding | undefined> {
    const entry = this._cache.get(key);
    if (entry && entry.hash === hash) {
      return {
        type: EmbeddingType.text3small_512,
        value: entry.embedding
      };
    }
    return undefined;
  }

  async set(key: string, hash: string, embedding: Embedding): Promise<void> {
    this._cache.set(key, {
      embedding: [...embedding.value],
      hash,
      timestamp: Date.now()
    });
  }

  async persist(): Promise<void> {
    // Save cache to disk
  }

  async load(): Promise<void> {
    // Load cache from disk
  }
}
```

## Testing

### Test 1: Proxy Embeddings Endpoint

```bash
curl -X POST http://localhost:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "function hello() { return world; }",
    "model": "voyageai/voyage-code-3",
    "dimensions": 1024
  }'
```

Expected response:
```json
{
  "object": "list",
  "data": [{
    "object": "embedding",
    "index": 0,
    "embedding": [0.123, -0.456, ...]
  }],
  "model": "voyageai/voyage-code-3"
}
```

### Test 2: Batch Embeddings

```bash
curl -X POST http://localhost:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      "function hello() { return world; }",
      "class User { constructor(name) { this.name = name; } }"
    ]
  }'
```

### Test 3: Extension Service

Add unit test in `github/editor/src/platform/embeddings/test/`:

```typescript
test('PukuEmbeddingsComputer computes embeddings', async () => {
  const computer = new PukuEmbeddingsComputer(mockFetcherService);
  const result = await computer.computeEmbeddings(
    EmbeddingType.text3small_512,
    ['test code']
  );

  expect(result.values.length).toBe(1);
  expect(result.values[0].value.length).toBeGreaterThan(0);
});
```

## Configuration

Add to extension settings:

```json
{
  "puku.embeddings.endpoint": "http://localhost:11434/v1/embeddings",
  "puku.embeddings.model": "voyageai/voyage-code-3",
  "puku.embeddings.dimensions": 1024,
  "puku.embeddings.batchSize": 10,
  "puku.embeddings.provider": "openrouter"
}
```

**Provider Options:**
- `openrouter` - Use OpenRouter Voyage-Code-3 (recommended for code)
- `cloudflare` - Use Cloudflare Workers AI
- `ollama` - Use local Ollama model

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `proxy/src/index.ts` | Modify | Add `/v1/embeddings` endpoint |
| `proxy/src/embeddings.ts` | Create | Embeddings computation logic (OpenRouter, Cloudflare, Ollama) |
| `editor/src/platform/embeddings/node/pukuEmbeddingsComputer.ts` | Create | Extension embeddings service |
| `editor/src/platform/embeddings/node/pukuEmbeddingsCache.ts` | Create | Local cache for embeddings |
| `editor/src/extension/extension/vscode-node/services.ts` | Modify | Register Puku embeddings |

## Definition of Done

- [ ] Proxy `/v1/embeddings` endpoint working
- [ ] Extension can compute embeddings via proxy
- [ ] Embeddings cached locally
- [ ] Basic tests passing
- [ ] Documentation updated

## Next Phase

Once this phase is complete, proceed to [Phase 2: Codebase Indexing](./phase-2-codebase-indexing.md).
