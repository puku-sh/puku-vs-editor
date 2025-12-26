# Architecture: Semantic Search with Voyage AI Reranking

## Table of Contents
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [API Specifications](#api-specifications)
5. [Database Schema](#database-schema)
6. [Security Model](#security-model)
7. [Performance Considerations](#performance-considerations)
8. [Error Handling](#error-handling)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUKU EDITOR (CLIENT)                     │
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐               │
│  │  User Interface │         │ Chat/Inline Chat │               │
│  │  (VSCode UI)    │────────▶│    Components    │               │
│  └─────────────────┘         └────────┬─────────┘               │
│                                       │                          │
│                                       ▼                          │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         PukuIndexingService (Singleton)              │       │
│  │  ┌────────────────────────────────────────────┐     │       │
│  │  │  SQLite Database (.puku/embeddings.db)     │     │       │
│  │  │  - Files table (uri, hash, timestamp)      │     │       │
│  │  │  - Chunks table (text, embedding, lines)   │     │       │
│  │  │  - VecChunks (sqlite-vec, 1024-dim)        │     │       │
│  │  └────────────────────────────────────────────┘     │       │
│  │                                                      │       │
│  │  search(query, limit=20)                            │       │
│  │    └─▶ Vector search with cosine similarity         │       │
│  │        └─▶ Returns top 20 chunks (16 KB)            │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         PukuChatEndpoint (HTTP Client)              │       │
│  │  - Builds chat request with semantic_results        │       │
│  │  - Sends to puku-worker API                         │       │
│  └──────────────────────────┬───────────────────────────┘       │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTPS
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                   PUKU WORKER (CLOUDFLARE)                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │     POST /v1/chat/completions (Handler)             │    │
│  │  1. Extract semantic_results from request           │    │
│  │  2. Check if rerank flag is enabled                 │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                 │
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         VoyageReranker (Service)                     │    │
│  │  ┌────────────────────────────────────────────┐     │    │
│  │  │  Voyage AI API Integration                 │     │    │
│  │  │  - Model: rerank-2-lite                    │     │    │
│  │  │  - Input: query + 20 documents             │     │    │
│  │  │  - Output: top 3 indices + scores          │     │    │
│  │  └────────────────────────────────────────────┘     │    │
│  │                                                      │    │
│  │  rerank(query, docs[], top_n=3)                     │    │
│  │    └─▶ POST https://api.voyageai.com/v1/rerank     │    │
│  │        └─▶ Returns ranked indices                   │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                 │
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │     Message Enrichment (Logic)                       │    │
│  │  1. Get top 3 reranked results                       │    │
│  │  2. Format as markdown context                       │    │
│  │  3. Inject before last user message                  │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                 │
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         GLM-4.6 LLM Call (Z.AI)                      │    │
│  │  - Stream response back to client                    │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Puku Editor Components

#### 1.1 PukuIndexingService

**Location:** `src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts`

**Responsibilities:**
- Maintain local SQLite database with code embeddings
- Perform vector search using cosine similarity
- Manage file watching and incremental indexing
- Compute embeddings via Puku API

**Key Methods:**
```typescript
class PukuIndexingService {
  // Vector search on local embeddings
  async search(
    query: string,
    limit: number = 20,
    languageId?: string
  ): Promise<SearchResult[]>

  // Compute embedding for query
  async computeEmbedding(text: string): Promise<number[]>

  // Check if indexing is available
  isAvailable(): boolean
}
```

**Database Schema:**
```sql
-- Files table
CREATE TABLE Files (
  id INTEGER PRIMARY KEY,
  uri TEXT UNIQUE NOT NULL,
  contentHash TEXT NOT NULL,
  lastIndexed INTEGER NOT NULL,
  languageId TEXT
);

-- Chunks table
CREATE TABLE Chunks (
  id INTEGER PRIMARY KEY,
  fileId INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding BLOB NOT NULL,  -- JSON array of floats
  lineStart INTEGER NOT NULL,
  lineEnd INTEGER NOT NULL,
  chunkType TEXT,
  symbolName TEXT,
  FOREIGN KEY (fileId) REFERENCES Files(id)
);

-- Vector search table (sqlite-vec)
CREATE VIRTUAL TABLE VecChunks USING vec0(
  embedding FLOAT[1024]
);

-- Mapping table
CREATE TABLE VecMapping (
  vecRowId INTEGER,
  chunkId INTEGER,
  PRIMARY KEY (vecRowId, chunkId)
);
```

#### 1.2 PukuChatEndpoint

**Location:** `src/chat/src/platform/endpoint/node/pukuChatEndpoint.ts`

**Responsibilities:**
- Build chat requests with semantic search results
- Send requests to puku-worker API
- Handle streaming responses

**Flow:**
```typescript
async makeChatRequest2(options: ChatRequestOptions) {
  // 1. Perform local search if enabled
  let semanticResults = null;
  if (options.enableSemanticSearch) {
    const query = extractUserQuery(options.messages);
    semanticResults = await this.indexingService.search(query, 20);
  }

  // 2. Build request body
  const body = {
    messages: options.messages,
    model: this.modelId,
    stream: true,
    semantic_results: semanticResults,  // Include raw results
    rerank: true
  };

  // 3. Send to worker
  return fetch(this.urlOrRequestMetadata, {
    method: 'POST',
    headers: this.getExtraHeaders(),
    body: JSON.stringify(body)
  });
}
```

### 2. Puku Worker Components

#### 2.1 Chat Completions Handler

**Location:** `puku-worker/src/routes/completions.ts`

**Responsibilities:**
- Receive chat requests with semantic results
- Orchestrate reranking pipeline
- Call LLM with enriched context
- Stream response back to client

**Flow:**
```typescript
async function handleChatCompletions(request: Request, env: Env) {
  const body = await request.json();

  // Step 1: Extract semantic results
  if (body.semantic_results && body.rerank) {
    // Step 2: Rerank
    const reranker = new VoyageReranker(env.VOYAGE_API_KEY);
    const query = extractUserQuery(body.messages);

    const reranked = await reranker.rerank({
      query,
      documents: body.semantic_results.map(r => r.content),
      top_n: 3
    });

    // Step 3: Get top 3 results
    const topResults = reranked.map(r => body.semantic_results[r.index]);

    // Step 4: Inject into messages
    body.messages = injectContext(body.messages, topResults);
  }

  // Step 5: Call LLM
  return callLLM(body.messages, body.model, env);
}
```

#### 2.2 VoyageReranker Service

**Location:** `puku-worker/src/services/reranker.ts`

**Responsibilities:**
- Interface with Voyage AI rerank API
- Handle errors and retries
- Log performance metrics

**Implementation:**
```typescript
class VoyageReranker {
  constructor(
    private apiKey: string,
    private model: string = 'rerank-2-lite'
  ) {}

  async rerank(request: RerankRequest): Promise<RerankResult[]> {
    const startTime = Date.now();

    // Call Voyage API
    const response = await fetch('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        query: request.query,
        documents: request.documents,
        top_n: request.top_n,
        return_documents: false  // We already have them
      })
    });

    if (!response.ok) {
      throw new Error(`Voyage rerank failed: ${await response.text()}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    console.log(`[Reranker] ${request.documents.length} → ${data.data.length} in ${latency}ms`);

    return data.data;  // [{ index: 5, relevance_score: 0.92 }, ...]
  }
}
```

---

## Data Flow

### Detailed Sequence Diagram

```
User                Editor              IndexingService    Worker             Voyage AI         LLM
 │                    │                      │               │                   │              │
 │  Cmd+I "add       │                      │               │                   │              │
 │  validation"      │                      │               │                   │              │
 ├──────────────────>│                      │               │                   │              │
 │                    │                      │               │                   │              │
 │                    │  search(query, 20)   │               │                   │              │
 │                    ├─────────────────────>│               │                   │              │
 │                    │                      │               │                   │              │
 │                    │  [SQLite vector      │               │                   │              │
 │                    │   search: 10ms]      │               │                   │              │
 │                    │                      │               │                   │              │
 │                    │<─────────────────────┤               │                   │              │
 │                    │  20 results (16 KB)  │               │                   │              │
 │                    │                      │               │                   │              │
 │                    │  POST /v1/chat/completions           │                   │              │
 │                    │  {                   │               │                   │              │
 │                    │    messages: [...],  │               │                   │              │
 │                    │    semantic_results: [20 chunks],    │                   │              │
 │                    │    rerank: true      │               │                   │              │
 │                    │  }                   │               │                   │              │
 │                    ├────────────────────────────────────>│                   │              │
 │                    │                      │               │                   │              │
 │                    │                      │               │  POST /v1/rerank  │              │
 │                    │                      │               │  {                │              │
 │                    │                      │               │    query: "...",  │              │
 │                    │                      │               │    documents: [20]│              │
 │                    │                      │               │    top_n: 3       │              │
 │                    │                      │               │  }                │              │
 │                    │                      │               ├──────────────────>│              │
 │                    │                      │               │                   │              │
 │                    │                      │               │  [Rerank: 200ms]  │              │
 │                    │                      │               │                   │              │
 │                    │                      │               │<──────────────────┤              │
 │                    │                      │               │  [                │              │
 │                    │                      │               │    {idx:5, 0.92}, │              │
 │                    │                      │               │    {idx:2, 0.87}, │              │
 │                    │                      │               │    {idx:12, 0.81} │              │
 │                    │                      │               │  ]                │              │
 │                    │                      │               │                   │              │
 │                    │                      │               │  [Inject top 3    │              │
 │                    │                      │               │   into messages]  │              │
 │                    │                      │               │                   │              │
 │                    │                      │               │  POST /chat/completions          │
 │                    │                      │               │  {                │              │
 │                    │                      │               │    messages: [    │              │
 │                    │                      │               │      system,      │              │
 │                    │                      │               │      context (3), │              │
 │                    │                      │               │      user query   │              │
 │                    │                      │               │    ]              │              │
 │                    │                      │               │  }                │              │
 │                    │                      │               ├─────────────────────────────────>│
 │                    │                      │               │                   │              │
 │                    │                      │               │                   │  [LLM: 500ms]│
 │                    │                      │               │                   │              │
 │                    │                      │               │<─────────────────────────────────┤
 │                    │                      │               │  Stream response  │              │
 │                    │<────────────────────────────────────┤                   │              │
 │                    │  SSE stream          │               │                   │              │
 │<───────────────────┤                      │               │                   │              │
 │  Display response  │                      │               │                   │              │
 │                    │                      │               │                   │              │
```

### Data Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: LOCAL VECTOR SEARCH (Editor)                           │
├─────────────────────────────────────────────────────────────────┤
│ Input:  "add validation to user input"                          │
│ Output: 20 chunks with cosine similarity scores                 │
│                                                                  │
│ [                                                                │
│   { content: "const schema = z.object(...)", score: 0.78 },     │
│   { content: "function validate(input)", score: 0.75 },         │
│   { content: "// Input validation", score: 0.73 },              │
│   ... 17 more                                                    │
│ ]                                                                │
│                                                                  │
│ Data size: ~16 KB                                               │
│ Latency: ~10ms                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: VOYAGE AI RERANKING (Worker)                           │
├─────────────────────────────────────────────────────────────────┤
│ Input:                                                           │
│   query: "add validation to user input"                         │
│   documents: [20 code chunks]                                   │
│   top_n: 3                                                       │
│                                                                  │
│ Processing:                                                      │
│   - Cross-encoder scores each (query, doc) pair                 │
│   - Understands semantic meaning better than embeddings         │
│   - Returns top 3 with relevance scores                         │
│                                                                  │
│ Output:                                                          │
│ [                                                                │
│   { index: 5, relevance_score: 0.92 },   ← Zod schema (was #6) │
│   { index: 2, relevance_score: 0.87 },   ← Validator (was #3)  │
│   { index: 12, relevance_score: 0.81 }   ← Middleware (was #13)│
│ ]                                                                │
│                                                                  │
│ Latency: ~200ms                                                  │
│ Cost: 4,140 tokens = $0.0001554                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: CONTEXT INJECTION (Worker)                             │
├─────────────────────────────────────────────────────────────────┤
│ Format top 3 results as markdown:                               │
│                                                                  │
│ "Similar code patterns in your workspace:                       │
│                                                                  │
│ From: src/validation/schema.ts (relevance: 92%)                 │
│ ```typescript                                                    │
│ const schema = z.object({                                       │
│   email: z.string().email(),                                    │
│   name: z.string().min(1)                                       │
│ })                                                               │
│ ```                                                              │
│                                                                  │
│ From: src/middleware/validate.ts (relevance: 87%)               │
│ ```typescript                                                    │
│ function validateInput(data) {                                  │
│   if (!data) throw new Error('Invalid');                        │
│   return sanitize(data);                                        │
│ }                                                                │
│ ```                                                              │
│ ..."                                                             │
│                                                                  │
│ Inject before last user message in chat history                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 4: LLM INFERENCE (Z.AI)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Messages:                                                        │
│ [                                                                │
│   { role: "system", content: "You are an AI assistant..." },    │
│   { role: "user", content: "<context with 3 examples>" },       │
│   { role: "user", content: "add validation to user input" }     │
│ ]                                                                │
│                                                                  │
│ LLM sees relevant examples and generates better code            │
│                                                                  │
│ Latency: ~500ms                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Specifications

### 1. Chat Completions API (Worker)

**Endpoint:** `POST /v1/chat/completions`

**Request:**
```typescript
interface ChatCompletionRequest {
  // Standard OpenAI-compatible fields
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;

  // Puku-specific: Semantic search enhancement
  semantic_results?: Array<{
    content: string;      // Code chunk text
    file: string;         // File path (relative to workspace)
    score: number;        // Vector similarity score (0-1)
    line_start: number;   // Starting line number
    line_end: number;     // Ending line number
  }>;
  rerank?: boolean;       // Enable Voyage AI reranking
}
```

**Response (Streaming):**
```
event: data
data: {"choices":[{"delta":{"content":"const"}}]}

event: data
data: {"choices":[{"delta":{"content":" schema"}}]}

...

event: done
data: [DONE]
```

**Response (Non-streaming):**
```typescript
interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'error';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### 2. Voyage AI Rerank API (External)

**Endpoint:** `POST https://api.voyageai.com/v1/rerank`

**Request:**
```typescript
interface VoyageRerankRequest {
  model: string;           // "rerank-2-lite" or "rerank-2"
  query: string;           // User query
  documents: string[];     // Array of document texts
  top_n: number;           // Number of results to return
  return_documents?: boolean;  // Return docs or just indices
}
```

**Response:**
```typescript
interface VoyageRerankResponse {
  object: 'list';
  data: Array<{
    index: number;           // Index in original documents array
    relevance_score: number; // 0-1, higher = more relevant
    document?: string;       // Only if return_documents=true
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}
```

**Example:**
```bash
curl -X POST https://api.voyageai.com/v1/rerank \
  -H "Authorization: Bearer pa-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "rerank-2-lite",
    "query": "add validation to user input",
    "documents": [
      "const schema = z.object({ email: z.string().email() })",
      "function validate(input) { if (!input) throw new Error() }",
      "// Input validation middleware"
    ],
    "top_n": 3,
    "return_documents": false
  }'
```

**Response:**
```json
{
  "object": "list",
  "data": [
    { "index": 0, "relevance_score": 0.92 },
    { "index": 1, "relevance_score": 0.87 },
    { "index": 2, "relevance_score": 0.81 }
  ],
  "model": "rerank-2-lite",
  "usage": { "total_tokens": 4140 }
}
```

---

## Security Model

### 1. API Key Management

**Voyage AI API Key:**
- Stored in: Cloudflare Worker environment variables
- Access: Server-side only (never exposed to client)
- Rotation: Monthly via Cloudflare dashboard

**Puku API Key:**
- Stored in: User's VS Code settings (encrypted by VS Code)
- Used for: Authenticating to puku-worker
- Rotation: User-controlled

### 2. Data Privacy

**Local Data:**
- All code embeddings stored locally in SQLite
- Never sent to external services (except Voyage for reranking)
- User controls what gets indexed (.pukuignore file)

**Network Data:**
- Only code chunks (not full files) sent to worker
- HTTPS encryption in transit
- No logging of code content on server

### 3. Rate Limiting

**Worker-side:**
```typescript
// Per-user rate limiting
const RATE_LIMIT = {
  rerank: 100,  // per hour
  search: 1000  // per hour
};

if (userRateExceeded(userId, 'rerank')) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

**Voyage AI:**
- Free tier: No published rate limits
- Paid tier: Contact sales for limits
- Graceful degradation on 429 errors

---

## Performance Considerations

### 1. Latency Budget

```
Target: < 1000ms time to first token

Breakdown:
- Local search:         10ms  (1%)
- Network to worker:    20ms  (2%)
- Worker processing:    10ms  (1%)
- Voyage reranking:    200ms  (20%)
- Worker → LLM:        100ms  (10%)
- LLM first token:     500ms  (50%)
- Network back:         50ms  (5%)
─────────────────────────────────
Total:                 890ms

Buffer: 110ms for variance
```

### 2. Caching Strategy

**Client-side (Editor):**
```typescript
// Cache embeddings
class EmbeddingCache {
  private cache = new Map<string, number[]>();

  async get(text: string): Promise<number[] | null> {
    const key = hash(text);
    return this.cache.get(key) || null;
  }

  set(text: string, embedding: number[]) {
    const key = hash(text);
    this.cache.set(key, embedding);
  }
}
```

**Server-side (Worker):**
```typescript
// Cache reranked results (1 hour TTL)
class RerankCache {
  async get(query: string, docHashes: string[]): Promise<RerankResult[] | null> {
    const key = hash(query + docHashes.join(','));
    return await env.KV.get(key, 'json');
  }

  async set(query: string, docHashes: string[], results: RerankResult[]) {
    const key = hash(query + docHashes.join(','));
    await env.KV.put(key, JSON.stringify(results), { expirationTtl: 3600 });
  }
}
```

### 3. Optimization Techniques

**Batch Processing:**
```typescript
// Process multiple queries in parallel
async function batchRerank(queries: string[], docs: string[][]) {
  return Promise.all(
    queries.map((q, i) => reranker.rerank({
      query: q,
      documents: docs[i],
      top_n: 3
    }))
  );
}
```

**Request Deduplication:**
```typescript
// Deduplicate identical in-flight requests
const pendingRequests = new Map<string, Promise<any>>();

async function rerankWithDedup(query: string, docs: string[]) {
  const key = hash(query + docs.join(''));

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = reranker.rerank({ query, documents: docs, top_n: 3 });
  pendingRequests.set(key, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}
```

---

## Error Handling

### 1. Fallback Strategy

```typescript
async function searchWithReranking(query: string, docs: SearchResult[]) {
  try {
    // Try reranking
    const reranked = await voyageRerank(query, docs);
    return reranked;
  } catch (error) {
    console.error('[Search] Reranking failed:', error);

    // Fallback to vector search results
    return docs.slice(0, 3);
  }
}
```

### 2. Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try again
      if (Date.now() - this.lastFailure > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker open');
      }
    }

    try {
      const result = await fn();

      // Success - reset
      this.failures = 0;
      this.state = 'closed';

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      // Open circuit after 5 failures
      if (this.failures >= 5) {
        this.state = 'open';
        console.error('[CircuitBreaker] Opened after 5 failures');
      }

      throw error;
    }
  }
}

const rerankCircuitBreaker = new CircuitBreaker();
```

### 3. Error Classification

```typescript
enum ErrorType {
  // Retryable errors
  NetworkError = 'network_error',
  RateLimitError = 'rate_limit_error',
  TimeoutError = 'timeout_error',

  // Non-retryable errors
  AuthenticationError = 'auth_error',
  InvalidRequest = 'invalid_request',
  ServerError = 'server_error'
}

function classifyError(error: any): ErrorType {
  if (error.status === 401 || error.status === 403) {
    return ErrorType.AuthenticationError;
  }
  if (error.status === 429) {
    return ErrorType.RateLimitError;
  }
  if (error.status >= 500) {
    return ErrorType.ServerError;
  }
  if (error.name === 'TimeoutError') {
    return ErrorType.TimeoutError;
  }
  return ErrorType.NetworkError;
}

async function rerankWithRetry(query: string, docs: string[], maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await reranker.rerank({ query, documents: docs, top_n: 3 });
    } catch (error) {
      const errorType = classifyError(error);

      // Don't retry authentication errors
      if (errorType === ErrorType.AuthenticationError) {
        throw error;
      }

      // Exponential backoff for retryable errors
      if (i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);
      }

      lastError = error;
    }
  }

  throw lastError;
}
```

---

## Monitoring & Observability

### 1. Metrics

**Latency Metrics:**
```typescript
const metrics = {
  vector_search_latency: histogram('vector_search_ms'),
  rerank_latency: histogram('rerank_ms'),
  total_search_latency: histogram('total_search_ms'),
  llm_latency: histogram('llm_ms')
};

// Usage
const start = Date.now();
const results = await voyageRerank(...);
metrics.rerank_latency.observe(Date.now() - start);
```

**Business Metrics:**
```typescript
const counters = {
  searches_total: counter('searches_total'),
  reranks_total: counter('reranks_total'),
  rerank_errors: counter('rerank_errors'),
  cache_hits: counter('cache_hits'),
  cache_misses: counter('cache_misses')
};
```

**Cost Metrics:**
```typescript
const gauges = {
  voyage_tokens_used: gauge('voyage_tokens_used'),
  estimated_cost: gauge('estimated_cost_usd')
};

// Track token usage
gauges.voyage_tokens_used.inc(response.usage.total_tokens);
gauges.estimated_cost.inc(response.usage.total_tokens * 0.0000000375);
```

### 2. Logging

**Structured Logging:**
```typescript
interface LogContext {
  query: string;
  num_candidates: number;
  num_results: number;
  rerank_latency_ms: number;
  cache_hit: boolean;
  user_id?: string;
}

function logSearch(context: LogContext) {
  console.log(JSON.stringify({
    level: 'info',
    event: 'search_completed',
    timestamp: new Date().toISOString(),
    ...context
  }));
}
```

### 3. Alerting

**Alert Rules:**
```typescript
// Alert if error rate > 5%
if (errorRate > 0.05) {
  sendAlert({
    severity: 'warning',
    message: 'Reranking error rate elevated',
    rate: errorRate
  });
}

// Alert if latency P95 > 1000ms
if (latencyP95 > 1000) {
  sendAlert({
    severity: 'warning',
    message: 'Reranking latency high',
    p95: latencyP95
  });
}

// Alert if cost projection exceeds budget
if (monthlyProjection > budget) {
  sendAlert({
    severity: 'critical',
    message: 'Cost projection exceeds budget',
    projected: monthlyProjection,
    budget: budget
  });
}
```

---

## Deployment Architecture

### Cloudflare Worker Configuration

```toml
# wrangler.toml
name = "puku-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.kv_namespaces]]
binding = "KV"
id = "xxx"

[[env.production.r2_buckets]]
binding = "R2"
bucket_name = "puku-cache"

[env.production.env]
VOYAGE_API_KEY = "pa-xxx"  # Set via dashboard
VOYAGE_RERANK_ENABLED = "true"
VOYAGE_RERANK_MODEL = "rerank-2-lite"
```

### Scaling Considerations

**Horizontal Scaling:**
- Cloudflare Workers auto-scale globally
- No explicit configuration needed
- Pay-per-request pricing

**Rate Limiting:**
```typescript
// Per-worker instance limits
const LIMITS = {
  maxConcurrentReranks: 10,
  maxQueuedRequests: 50
};

let activeReranks = 0;
const requestQueue: Promise<any>[] = [];

async function throttledRerank(request: RerankRequest) {
  if (activeReranks >= LIMITS.maxConcurrentReranks) {
    if (requestQueue.length >= LIMITS.maxQueuedRequests) {
      throw new Error('Queue full');
    }
    await Promise.race(requestQueue);
  }

  activeReranks++;
  const promise = reranker.rerank(request);
  requestQueue.push(promise);

  try {
    return await promise;
  } finally {
    activeReranks--;
    requestQueue.splice(requestQueue.indexOf(promise), 1);
  }
}
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
describe('VoyageReranker', () => {
  it('should rerank documents correctly', async () => {
    const reranker = new VoyageReranker('test-key');
    const result = await reranker.rerank({
      query: 'test query',
      documents: ['doc1', 'doc2', 'doc3'],
      top_n: 2
    });

    expect(result).toHaveLength(2);
    expect(result[0].relevance_score).toBeGreaterThan(result[1].relevance_score);
  });

  it('should handle API errors gracefully', async () => {
    const reranker = new VoyageReranker('invalid-key');

    await expect(
      reranker.rerank({ query: 'test', documents: ['doc'], top_n: 1 })
    ).rejects.toThrow('Voyage rerank failed');
  });
});
```

### 2. Integration Tests

```typescript
describe('Chat Completions with Reranking', () => {
  it('should enrich messages with reranked results', async () => {
    const request = {
      messages: [{ role: 'user', content: 'test' }],
      semantic_results: mockSearchResults(20),
      rerank: true
    };

    const response = await handleChatCompletions(request, mockEnv);

    // Verify context was injected
    const messages = extractMessages(response);
    expect(messages).toHaveLength(2); // system + user with context
    expect(messages[0].content).toContain('Similar code patterns');
  });
});
```

### 3. Performance Tests

```typescript
describe('Performance', () => {
  it('should complete search + rerank in < 500ms', async () => {
    const start = Date.now();

    await searchWithReranking('test query', mockDocs);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

---

## Appendix

### A. File Locations

```
puku-editor/
├── src/chat/src/extension/
│   ├── pukuIndexing/
│   │   ├── node/
│   │   │   ├── pukuIndexingService.ts    # Vector search
│   │   │   └── pukuEmbeddingsCache.ts    # SQLite DB
│   │   └── common/
│   │       └── pukuIndexing.ts           # Interfaces
│   └── platform/endpoint/node/
│       └── pukuChatEndpoint.ts           # HTTP client

puku-worker/
├── src/
│   ├── routes/
│   │   └── completions.ts                # Chat handler
│   ├── services/
│   │   └── reranker.ts                   # Voyage integration
│   └── config/
│       └── env.ts                        # Environment
```

### B. Dependencies

**Puku Editor:**
```json
{
  "dependencies": {
    "@vscode/prompt-tsx": "^0.2.0",
    "sqlite3": "^5.1.0",
    "sqlite-vec": "^0.1.0"
  }
}
```

**Puku Worker:**
```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.0.0"
  }
}
```

### C. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VOYAGE_API_KEY` | Yes | - | Voyage AI API key |
| `VOYAGE_RERANK_ENABLED` | No | `"false"` | Enable reranking |
| `VOYAGE_RERANK_MODEL` | No | `"rerank-2-lite"` | Model variant |
| `RERANK_TIMEOUT_MS` | No | `5000` | API timeout |
| `RERANK_CACHE_TTL` | No | `3600` | Cache TTL (seconds) |

---

**Document Version:** 1.0
**Last Updated:** December 23, 2024
**Author:** Puku Engineering Team
**Status:** Final
