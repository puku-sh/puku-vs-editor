# Puku Indexing Architecture

This document explains how Puku's code indexing and semantic search system works, from parsing code with Tree-sitter to searching with vector embeddings.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PUKU INDEXING PIPELINE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Tree-sitter AST Parser (PukuASTChunker)                       │
│     │                                                               │
│     ├─ Parses code into AST using language-specific WASM parser   │
│     ├─ Extracts semantic chunks (functions, classes, methods)     │
│     ├─ Fills gaps between chunks with line-based chunks           │
│     └─ Returns SemanticChunk[] with metadata                      │
│                                                                     │
│  2. LLM-based Summarizer (PukuSummaryGenerator)                   │
│     │                                                               │
│     ├─ Sends chunks to Cloudflare Worker API                      │
│     ├─ Uses Qwen Coder for natural language summaries            │
│     ├─ Parallel job processing (5 concurrent jobs)                │
│     └─ Returns natural language descriptions                      │
│                                                                     │
│  3. Embedding Generator (PukuIndexingService)                     │
│     │                                                               │
│     ├─ Computes embeddings from summaries (not raw code!)        │
│     ├─ Uses OpenRouter API with Nomic-embed-text model           │
│     └─ Returns 1024-dimensional vectors                           │
│                                                                     │
│  4. SQLite Storage (PukuEmbeddingsCache)                          │
│     │                                                               │
│     ├─ Stores chunks, summaries, and embeddings in SQLite        │
│     ├─ Uses sqlite-vec for KNN vector search                     │
│     └─ Enables fast semantic search                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete Example: Indexing a TypeScript File

### Input File: `userService.ts`

```typescript
import { Database } from './db';

export class UserService {
    constructor(private db: Database) {}

    async findUserById(userId: string): Promise<User | null> {
        const result = await this.db.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        return result.rows[0] || null;
    }

    async sendEmailNotification(userId: string, message: string): Promise<boolean> {
        const user = await this.findUserById(userId);
        if (!user || !user.email) {
            return false;
        }

        await this.emailService.send({
            to: user.email,
            subject: 'Notification',
            body: message
        });

        return true;
    }
}

// Utility function
function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

---

## Step 1: Tree-sitter AST Parsing

**File**: `src/extension/pukuIndexing/node/pukuASTChunker.ts`

Tree-sitter parses the file using language-specific WASM parsers and identifies semantic nodes based on the `SEMANTIC_NODE_KINDS` mapping:

```typescript
const SEMANTIC_NODE_KINDS: Record<string, ChunkType> = {
    'function_declaration': 'function',
    'method_definition': 'method',
    'class_declaration': 'class',
    'interface_declaration': 'interface',
    // ... 30+ node types
};
```

### AST Traversal

The chunker recursively walks the AST tree:

```typescript
private _extractChunksFromNode(
    node: OverlayNode,
    content: string,
    lines: string[],
    chunks: SemanticChunk[]
): void {
    const chunkType = SEMANTIC_NODE_KINDS[node.kind];

    if (chunkType) {
        const text = content.substring(node.startIndex, node.endIndex);
        const lineStart = this._offsetToLine(content, node.startIndex);
        const lineEnd = this._offsetToLine(content, node.endIndex);

        // Size constraints: 100-8000 chars
        if (text.length >= MIN_CHUNK_SIZE && text.length <= MAX_CHUNK_SIZE) {
            chunks.push({
                text,
                lineStart,
                lineEnd,
                chunkType,
                symbolName: this._extractSymbolName(text, chunkType)
            });
            return; // Don't recurse into extracted chunks
        }
    }

    // Continue traversing
    for (const child of node.children) {
        this._extractChunksFromNode(child, content, lines, chunks);
    }
}
```

### Output: SemanticChunk[]

```typescript
const chunks: SemanticChunk[] = [
    {
        text: 'export class UserService {\n    constructor(private db: Database) {}\n\n    async findUserById...',
        lineStart: 3,
        lineEnd: 29,
        chunkType: 'class',
        symbolName: 'UserService'
    },
    {
        text: 'async findUserById(userId: string): Promise<User | null> {\n    const result = await...',
        lineStart: 6,
        lineEnd: 12,
        chunkType: 'method',
        symbolName: 'findUserById'
    },
    {
        text: 'async sendEmailNotification(userId: string, message: string): Promise<boolean> {...',
        lineStart: 14,
        lineEnd: 27,
        chunkType: 'method',
        symbolName: 'sendEmailNotification'
    },
    {
        text: 'function validateEmail(email: string): boolean {\n    return /^[^\\s@]+@[^\\s@]+\\...',
        lineStart: 32,
        lineEnd: 34,
        chunkType: 'function',
        symbolName: 'validateEmail'
    }
];
```

**Key Features:**
- **Semantic boundaries**: Each chunk is a complete semantic unit (not arbitrary line ranges)
- **Size constraints**: MIN_CHUNK_SIZE (100 chars) to MAX_CHUNK_SIZE (8000 chars)
- **Gap filling**: Code between semantic nodes becomes 'block' chunks (via `_fillGaps()`)
- **Metadata extraction**: Extracts symbol names using regex patterns

---

## Step 2: LLM Summarization with Parallel Jobs

**File**: `src/extension/pukuIndexing/node/pukuSummaryGenerator.ts`

### Parallel Job Processing

For files with many chunks, the summarizer creates multiple jobs that run concurrently:

```typescript
async generateSummariesBatch(
    chunks: SemanticChunk[],
    languageId: string,
    fileId?: number
): Promise<string[]> {
    // Use parallel jobs if fileId provided
    if (fileId !== undefined && this._jobManager) {
        return this._generateSummariesWithJobs(chunks, languageId, fileId);
    }

    // Fallback to sequential processing
    return this._generateSummariesSequential(chunks, languageId);
}
```

**Job Configuration:**
- **CHUNKS_PER_JOB**: 20 chunks per job
- **MAX_PARALLEL_JOBS**: 5 concurrent jobs
- **BATCH_SIZE**: 10 chunks per API call

**Example**: For 100 chunks:
1. Creates 5 jobs (20 chunks each)
2. Processes jobs concurrently (5x faster!)
3. Each job makes 2 API calls (10 chunks per call)

### API Request

**Endpoint**: `https://api.puku.sh/v1/summarize/batch`

**Request Body**:
```json
{
    "chunks": [
        {"text": "export class UserService {...}"},
        {"text": "async findUserById(userId: string) {...}"},
        {"text": "async sendEmailNotification(...) {...}"},
        {"text": "function validateEmail(email: string) {...}"}
    ],
    "languageId": "typescript"
}
```

### Backend Prompt

**File**: `puku-worker/src/routes/completions.ts`

```typescript
const prompt = `Summarize each ${languageId} code chunk in natural language for semantic search.

Rules:
- Use plain English verbs (sends, calculates, stores, retrieves, validates, etc)
- Focus on WHAT it does, not HOW (avoid technical jargon)
- Include inputs and outputs in natural language
- Format: [N] summary text
- NO code syntax, NO thinking tags, ONLY ${chunks.length} summaries

Good examples:
[1] sends email notification to user with message, takes userId and message, returns success status
[2] calculates total price from shopping cart items by summing individual item prices
[3] stores user preferences in database, validates input format before saving

${chunksText}

Output ${chunks.length} natural language summaries:`;
```

**Model**: `qwen/qwen-2.5-coder-32b-instruct` (via OpenRouter)

### LLM Response

```text
[1] user service class with methods for database queries and email notifications
[2] retrieves user from database by user ID, takes userId string, returns user object or null
[3] sends email notification to user, takes userId and message, retrieves user email from database, returns success boolean
[4] validates email address format using regex pattern, takes email string, returns boolean
```

### Parsed Summaries

```typescript
const summaries = [
    "user service class with methods for database queries and email notifications",
    "retrieves user from database by user ID, takes userId string, returns user object or null",
    "sends email notification to user, takes userId and message, retrieves user email from database, returns success boolean",
    "validates email address format using regex pattern, takes email string, returns boolean"
];
```

---

## Step 3: Embedding Generation

**File**: `src/extension/pukuIndexing/node/pukuIndexingService.ts`

### Critical Design Decision: Embed Summaries, Not Code

```typescript
// Line 624-629
// Compute embeddings for summaries (not raw code) to improve semantic search
// When user writes "// send email notification", it will match summary "function that sends email..."
const textsToEmbed = summaries.map((summary, i) =>
    summary || semanticChunks[i].text // Fallback to raw code if no summary
);
const embeddings = await this._computeEmbeddingsBatch(textsToEmbed);
```

**Why this works better:**
- User queries are natural language: `"send email"`, `"validate user input"`
- Summary embeddings capture semantic intent, not syntax
- Works across languages (Go, TypeScript, Python all have similar natural language descriptions)

### Embedding API Call

**Model**: `nomic-ai/nomic-embed-text` (via OpenRouter)
**Dimensions**: 1024

```typescript
private async _computeEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'nomic-ai/nomic-embed-text',
            input: texts
        })
    });

    const data = await response.json();
    return data.data.map(item => item.embedding);
}
```

### Output: Embeddings

```typescript
const embeddings = [
    [0.123, -0.456, 0.789, ..., 0.234], // 1024 dimensions for chunk 1
    [0.234, -0.567, 0.890, ..., 0.345], // 1024 dimensions for chunk 2
    [0.345, -0.678, 0.901, ..., 0.456], // 1024 dimensions for chunk 3
    [0.456, -0.789, 0.012, ..., 0.567]  // 1024 dimensions for chunk 4
];
```

---

## Step 4: SQLite Storage with sqlite-vec

**File**: `src/extension/pukuIndexing/node/pukuEmbeddingsCache.ts`

### Database Schema (Version 6)

```sql
-- Cache metadata (version tracking)
CREATE TABLE CacheMeta (
    version TEXT NOT NULL,  -- "0.37.0-s6" (extension version + schema version)
    model TEXT NOT NULL     -- "puku-embeddings-1024"
);

-- File tracking
CREATE TABLE Files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uri TEXT NOT NULL UNIQUE,
    contentHash TEXT NOT NULL,     -- MD5 hash of file content
    languageId TEXT NOT NULL,      -- "typescript", "go", etc.
    lastIndexed INTEGER NOT NULL   -- Timestamp
);

-- Chunk storage
CREATE TABLE Chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fileId INTEGER NOT NULL,
    text TEXT NOT NULL,              -- Original code
    summary TEXT,                    -- LLM-generated summary
    lineStart INTEGER NOT NULL,
    lineEnd INTEGER NOT NULL,
    embedding BLOB NOT NULL,         -- 1024-dim vector (as BLOB)
    chunkType TEXT,                  -- 'class', 'method', 'function', etc
    symbolName TEXT,                 -- 'UserService', 'findUserById', etc
    FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
);

-- Parallel job tracking for summarization
CREATE TABLE SummaryJobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fileId INTEGER NOT NULL,
    status TEXT NOT NULL,            -- 'pending', 'running', 'completed', 'failed'
    chunkStartIndex INTEGER NOT NULL,
    chunkEndIndex INTEGER NOT NULL,
    summaries TEXT,                  -- JSON array of summaries
    error TEXT,
    createdAt INTEGER NOT NULL,
    completedAt INTEGER,
    FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_files_uri ON Files(uri);
CREATE INDEX idx_files_languageId ON Files(languageId);
CREATE INDEX idx_chunks_fileId ON Chunks(fileId);
CREATE INDEX idx_summary_jobs_fileId ON SummaryJobs(fileId);
CREATE INDEX idx_summary_jobs_status ON SummaryJobs(status);

-- sqlite-vec virtual table for KNN vector search
CREATE VIRTUAL TABLE vec_chunks USING vec0(
    embedding float[1024]
);

-- Mapping table (links vec_chunks rowid to Chunks id)
CREATE TABLE VecMapping (
    vec_rowid INTEGER PRIMARY KEY,   -- rowid in vec_chunks virtual table
    chunk_id INTEGER NOT NULL,       -- id in Chunks table
    FOREIGN KEY (chunk_id) REFERENCES Chunks(id) ON DELETE CASCADE
);

CREATE INDEX idx_vecmapping_chunk_id ON VecMapping(chunk_id);
```

### Inserted Data Example

```sql
-- Files table
INSERT INTO Files VALUES (1, 'file:///userService.ts', 'abc123', 'typescript', 1733097600000);

-- Chunks table
INSERT INTO Chunks VALUES
    (1, 1, 'export class UserService {...}', 'user service class with methods for database queries...', 3, 29, X'<binary_embedding_1>', 'class', 'UserService'),
    (2, 1, 'async findUserById(...)', 'retrieves user from database by user ID...', 6, 12, X'<binary_embedding_2>', 'method', 'findUserById'),
    (3, 1, 'async sendEmailNotification(...)', 'sends email notification to user...', 14, 27, X'<binary_embedding_3>', 'method', 'sendEmailNotification'),
    (4, 1, 'function validateEmail(...)', 'validates email address format using regex...', 32, 34, X'<binary_embedding_4>', 'function', 'validateEmail');

-- vec_chunks virtual table (sqlite-vec manages this)
-- Internally stores vectors for KNN search
INSERT INTO vec_chunks (rowid, embedding) VALUES (1, [0.123, -0.456, 0.789, ...]);
INSERT INTO vec_chunks (rowid, embedding) VALUES (2, [0.234, -0.567, 0.890, ...]);
INSERT INTO vec_chunks (rowid, embedding) VALUES (3, [0.345, -0.678, 0.901, ...]);
INSERT INTO vec_chunks (rowid, embedding) VALUES (4, [0.456, -0.789, 0.012, ...]);

-- VecMapping (links vec_chunks rowid to Chunks id)
INSERT INTO VecMapping VALUES (1, 1), (2, 2), (3, 3), (4, 4);
```

### Why sqlite-vec?

**sqlite-vec** is a pure C extension for SQLite that provides:
- **Fast KNN search**: Native vector operations in C
- **Cosine similarity**: Built-in distance function
- **Cross-platform**: Works on Windows, Mac, Linux, WASM
- **SQL integration**: No separate vector database needed

---

## Step 5: Semantic Search

**File**: `src/extension/pukuIndexing/node/pukuIndexingService.ts`

### User Query: `"send email to user"`

**Step 1: Compute query embedding**

```typescript
const queryEmbedding = await this._computeEmbedding("send email to user");
// Returns: [0.333, -0.666, 0.888, ...] (1024 dimensions)
```

**Step 2: KNN Search with sqlite-vec**

If sqlite-vec is enabled (vecEnabled = true):

```typescript
const results = this._cache.searchKNN(queryEmbedding, limit, languageFilter);
```

Internally, this executes:

```sql
-- KNN search using cosine similarity
SELECT
    c.id, c.text, c.summary, c.lineStart, c.lineEnd, c.chunkType, c.symbolName,
    f.uri, f.languageId,
    vec_distance_cosine(vc.embedding, ?) as distance
FROM vec_chunks vc
JOIN VecMapping vm ON vc.rowid = vm.vec_rowid
JOIN Chunks c ON vm.chunk_id = c.id
JOIN Files f ON c.fileId = f.id
WHERE f.languageId = ? OR ? IS NULL  -- Optional language filter
ORDER BY distance ASC
LIMIT ?;
```

**Step 3: Results (sorted by similarity)**

```typescript
const results = [
    {
        uri: 'file:///userService.ts',
        content: 'async sendEmailNotification(userId: string, message: string): Promise<boolean> {...}',
        summary: 'sends email notification to user, takes userId and message, retrieves user email from database, returns success boolean',
        score: 0.92,  // Very high similarity!
        lineStart: 14,
        lineEnd: 27,
        chunkType: 'method',
        symbolName: 'sendEmailNotification'
    },
    {
        uri: 'file:///userService.ts',
        content: 'async findUserById(userId: string): Promise<User | null> {...}',
        summary: 'retrieves user from database by user ID, takes userId string, returns user object or null',
        score: 0.65,
        lineStart: 6,
        lineEnd: 12,
        chunkType: 'method',
        symbolName: 'findUserById'
    }
];
```

### Fallback: In-Memory Cosine Similarity

If sqlite-vec is not available (e.g., unsupported platform), falls back to in-memory search:

```typescript
private _cosineSimilarity(queryEmbedding: number[], chunks: PukuChunkWithEmbedding[]): SearchResult[] {
    const scores: Array<{ chunk: PukuChunkWithEmbedding; score: number }> = [];

    for (const chunk of chunks) {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        scores.push({ chunk, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
}
```

---

## Why This Approach Works

### 1. Tree-sitter AST Chunking
✅ **Semantic boundaries**: Functions, classes, methods are complete units
✅ **Better embeddings**: Complete functions have coherent meaning
✅ **Metadata-rich**: Extracts symbol names, chunk types automatically
✅ **Language support**: 30+ languages via WASM parsers

### 2. LLM-based Summaries
✅ **Natural language**: "sends email notification" matches user queries better than raw code
✅ **Intent capture**: Describes WHAT (functionality) not HOW (implementation)
✅ **Better search**: User writes `// send email` → Finds `sendEmailNotification` method
✅ **Cross-language**: Same intent in TypeScript, Go, Python gets similar summaries

### 3. Embeddings from Summaries (Not Code)
✅ **Semantic similarity**: Natural language embeddings capture intent
✅ **Language-agnostic**: Same query works across TypeScript, Python, Go
✅ **Query matching**: User's natural language query matches summary's natural language
✅ **Better recall**: Finds synonyms ("email" matches "notify", "message", "send")

### 4. Parallel Job Processing
✅ **5x faster**: 5 concurrent jobs vs sequential processing
✅ **Scalable**: Handles 100+ chunks efficiently
✅ **Resilient**: Individual job failures don't block others
✅ **Progress tracking**: SummaryJobs table tracks status per job

### 5. sqlite-vec KNN Search
✅ **Fast**: Native C extension for vector operations
✅ **Accurate**: Cosine similarity in SQL
✅ **Scalable**: Handles 10,000+ embeddings efficiently
✅ **Integrated**: No separate vector database needed

---

## Comparison: Raw Code vs Summary-based Embeddings

| Feature | Raw Code Embeddings | Summary-based Embeddings (Puku) |
|---------|---------------------|----------------------------------|
| **User Query**: `"send email"` | Matches variable names like `sendEmail()` | Matches intent like `sendEmailNotification()` |
| **Cross-language** | Hard (syntax differences) | Easy (natural language is universal) |
| **Query style** | Must use code-like queries | Can use natural language comments |
| **Accuracy** | Depends on naming conventions | Captures functionality semantically |
| **Synonyms** | Misses `notify`, `message` | Finds `notify`, `message`, `email` |

### Example Comparison

**Without summaries (raw code embedding):**
```typescript
// User query: "send email"
// Embedding of query: [0.1, 0.2, ...]
// Embedding of code: [0.15, 0.25, ...]  (from raw function text)
// Match: 0.78 (good if code literally contains "send" + "email")
```

**With summaries (Puku approach):**
```typescript
// User query: "send email"
// Embedding of query: [0.3, 0.4, ...]
// Summary: "sends email notification to user with message"
// Embedding of summary: [0.32, 0.42, ...]
// Match: 0.92 (excellent! Captures semantic intent)
```

---

## Performance Characteristics

### Indexing Performance

**Sequential processing (old approach):**
- 100 chunks × 10 chunks/batch = 10 API calls
- ~1s per API call = **10 seconds total**

**Parallel processing (v0.37.0):**
- 100 chunks → 5 jobs (20 chunks each)
- Each job: 2 API calls (10 chunks per call)
- 5 jobs run concurrently
- **~2 seconds total** (5x faster!)

### Search Performance

**sqlite-vec KNN search:**
- 10,000 chunks: ~5-10ms
- 100,000 chunks: ~20-50ms

**In-memory fallback:**
- 10,000 chunks: ~50-100ms
- 100,000 chunks: ~500-1000ms

---

## Key Files Reference

| Component | File Path |
|-----------|-----------|
| **AST Chunker** | `src/extension/pukuIndexing/node/pukuASTChunker.ts` |
| **Summary Generator** | `src/extension/pukuIndexing/node/pukuSummaryGenerator.ts` |
| **Job Manager** | `src/extension/pukuIndexing/node/pukuSummaryJobManager.ts` |
| **Indexing Service** | `src/extension/pukuIndexing/node/pukuIndexingService.ts` |
| **Embeddings Cache** | `src/extension/pukuIndexing/node/pukuEmbeddingsCache.ts` |
| **Backend API** | `puku-worker/src/routes/completions.ts` |

---

## Inspiration and Prior Art

This architecture is inspired by:

- **Cursor**: AST-based semantic chunking
- **GitHub Copilot**: Summary-based embeddings for better search
- **Sourcegraph Cody**: Natural language summaries for code understanding
- **sqlite-vec**: Fast vector search in SQLite

Puku combines these proven approaches with enhancements:
- ✅ Parallel job processing for 5x faster indexing
- ✅ Natural language summaries optimized for semantic search
- ✅ Comprehensive metadata tracking (symbol names, chunk types)
- ✅ Robust fallback mechanisms (sequential processing, in-memory search)

---

## Future Enhancements (Deferred)

See `docs/FILE_EXTENSION_DETECTION_PLAN.md` for planned improvements:

1. **Dependency Graph**: Track import relationships between chunks
2. **Hybrid Search**: Combine semantic search with dependency filtering
3. **Incremental Updates**: Update only changed chunks, not entire files
4. **Multi-modal Embeddings**: Include docstrings, comments in embeddings

---

## Testing

Test files:
- `src/extension/pukuIndexing/node/test/pukuASTChunker.spec.ts` (coming soon)
- `src/extension/pukuIndexing/node/test/pukuSummaryGenerator.spec.ts` (49/52 passing)
- `src/extension/pukuIndexing/node/test/pukuSummaryJobManager.spec.ts` (19/19 passing)

Run tests:
```bash
cd src/chat
npm run test:unit
```
