# [Feature] LLM-Based Semantic Summaries for Comment-Based Code Generation

## 📋 Overview

**Problem:** Comment-based code generation (e.g., `// send email to user`) produces poor results because semantic search matches against raw code syntax instead of functionality descriptions.

**Solution:** Generate LLM-based natural language summaries for each code chunk during indexing, embed the summaries instead of raw code, enabling accurate semantic matching between natural language comments and code functionality.

**Impact:** 🚀 Dramatically improves comment-based code generation quality (similar to GitHub Copilot's approach)

---

## 🎯 Problem Statement

### Current Behavior (Without Summaries)

```
┌────────────────────────────────────────────────────────────┐
│ User types comment:                                        │
│ // send email to user                                     │
└────────────────────────────────────────────────────────────┘
                         ↓
            ┌──────────────────────────┐
            │  Embed comment           │
            │  Vector: [0.2, 0.8, ...] │
            └──────────────────────────┘
                         ↓
    ┌────────────────────────────────────────────┐
    │  Search against RAW CODE embeddings:       │
    │                                            │
    │  Code: "function sendNotification(...) {  │
    │           const user = db.getUser(...);   │
    │           emailService.send(...);         │
    │         }"                                 │
    │  Vector: [0.5, 0.3, 0.9, ...]            │
    └────────────────────────────────────────────┘
                         ↓
           ❌ POOR MATCH (similarity: 0.42)

  Why? No keyword overlap: "send email user" vs
       "sendNotification getUser emailService"
```

### Desired Behavior (With LLM Summaries)

```
┌────────────────────────────────────────────────────────────┐
│ User types comment:                                        │
│ // send email to user                                     │
└────────────────────────────────────────────────────────────┘
                         ↓
            ┌──────────────────────────┐
            │  Embed comment           │
            │  Vector: [0.2, 0.8, ...] │
            └──────────────────────────┘
                         ↓
    ┌────────────────────────────────────────────────────┐
    │  Search against SUMMARY embeddings:                │
    │                                                     │
    │  Summary: "function that sends email notification  │
    │            to user, takes userId and message,      │
    │            returns boolean indicating success"     │
    │  Vector: [0.21, 0.79, 0.11, ...]                  │
    └────────────────────────────────────────────────────┘
                         ↓
           ✅ EXCELLENT MATCH (similarity: 0.94)

  Why? Semantic overlap: "send email user" ≈
       "sends email notification to user"
```

---

## 🏗️ Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INDEXING PHASE (One-time)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Source File (user.go)                                                   │
│      │                                                                   │
│      ├─→ [Tree-sitter Parser] Parse AST                                │
│      │       │                                                           │
│      │       ├─→ type User struct { ... }        (chunkType: 'type')   │
│      │       ├─→ func createDB() { ... }         (chunkType: 'function')│
│      │       └─→ func insertUser() { ... }       (chunkType: 'function')│
│      │                                                                   │
│      ├─→ [PukuSummaryGenerator] Generate summaries via GLM-4.5-Air     │
│      │       │                                                           │
│      │       ├─→ "type User struct with ID, Name, Email fields"        │
│      │       ├─→ "function creates MySQL connection using GORM"         │
│      │       └─→ "function inserts user into database, returns error"  │
│      │                                                                   │
│      ├─→ [Embedding API] Create vectors FROM SUMMARIES                  │
│      │       │                                                           │
│      │       ├─→ [0.31, 0.82, 0.19, ...]                               │
│      │       ├─→ [0.45, 0.71, 0.33, ...]                               │
│      │       └─→ [0.52, 0.68, 0.41, ...]                               │
│      │                                                                   │
│      └─→ [SQLite + sqlite-vec] Store chunks                            │
│              │                                                           │
│              └─→ chunks table:                                          │
│                  ┌──────────────────────────────────────────┐          │
│                  │ id | text (code) | summary | embedding  │          │
│                  ├──────────────────────────────────────────┤          │
│                  │ 1  | type User.. | "type User..."  | blob│          │
│                  │ 2  | func create | "function crea..."| blob│          │
│                  │ 3  | func insert | "function inse..."| blob│          │
│                  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    SEARCH PHASE (Real-time, <100ms)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User comment: "// insert user into database"                           │
│      │                                                                   │
│      ├─→ [Embedding API] Embed comment                                  │
│      │       │                                                           │
│      │       └─→ Vector: [0.50, 0.70, 0.39, ...]                       │
│      │                                                                   │
│      ├─→ [SQLite KNN Search] Compare with summary embeddings            │
│      │       │                                                           │
│      │       ├─→ Similarity to chunk 1: 0.62  (type definition)        │
│      │       ├─→ Similarity to chunk 2: 0.71  (create connection)      │
│      │       └─→ Similarity to chunk 3: 0.95  (insert user) ✅          │
│      │                                                                   │
│      ├─→ [Top K Results] Return ORIGINAL CODE (not summaries)           │
│      │       │                                                           │
│      │       └─→ [{ filepath: "user.go", content: "func insertUser..." }]│
│      │                                                                   │
│      └─→ [Codestral FIM] Generate completion with context               │
│              │                                                           │
│              └─→ Generated code:                                        │
│                  func insertUser(user User) error {                     │
│                      db := createDBConnection()                         │
│                      result := db.Create(&user)                         │
│                      return result.Error                                │
│                  }                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌───────────────┐
│ Raw Code Text │
└───────┬───────┘
        │
        ├─────────────────────────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────┐                    ┌─────────────────┐
│  Tree-sitter     │                    │  CURRENT        │
│  AST Chunking    │                    │  APPROACH       │
│  (Semantic       │                    │  (Embed raw     │
│   boundaries)    │                    │   code)         │
└──────┬───────────┘                    └─────────────────┘
       │                                         │
       │ Complete semantic units                 ❌ Poor semantic
       │ (functions, classes)                       matching
       ▼
┌──────────────────┐
│  NEW: LLM        │
│  Summary         │
│  Generation      │
│  (GLM-4.5-Air)   │
└──────┬───────────┘
       │
       │ Natural language descriptions
       │ (functionality + inputs/outputs)
       ▼
┌──────────────────┐
│  Embedding API   │
│  (Create vectors │
│   from summaries)│
└──────┬───────────┘
       │
       │ Semantic vectors
       │
       ▼
┌──────────────────────────────┐
│  SQLite Storage              │
│  ┌────────────────────────┐  │
│  │ Original Code (text)   │  │ ← Return to Codestral
│  │ Summary (summary)      │  │ ← For debugging/UI
│  │ Vector (embedding)     │  │ ← For search
│  └────────────────────────┘  │
└──────────────────────────────┘
       │
       │ Comment query
       ▼
┌──────────────────┐
│  Vector Search   │
│  (Cosine         │
│   similarity)    │
└──────┬───────────┘
       │
       ✅ Excellent semantic
          matching
```

---

## 💡 Real-World Example

### Scenario: User wants to insert data using existing DB connection

**Workspace Code:**
```go
// File: db/connection.go
package db

import (
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

func createDBConnection() *gorm.DB {
    dsn := "user:pass@tcp(127.0.0.1:3306)/dbname"
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    return db
}

// File: models/user.go
package models

type User struct {
    ID    int    `json:"id" gorm:"primaryKey"`
    Name  string `json:"name"`
    Email string `json:"email" gorm:"unique"`
}
```

**User Types:**
```go
// File: handlers/user.go
package handlers

// insert user into database
```

### What Happens (Step-by-Step)

#### 1. Indexing Phase (Already Complete)

**Tree-sitter extracts chunks:**
```
Chunk 1:
  text: "func createDBConnection() *gorm.DB { ... }"
  chunkType: "function"
  symbolName: "createDBConnection"

Chunk 2:
  text: "type User struct { ID int; Name string; Email string }"
  chunkType: "type"
  symbolName: "User"
```

**LLM generates summaries:**
```
Chunk 1 Summary (GLM-4.5-Air):
  "function that creates MySQL database connection using GORM,
   returns database instance, terminates on error"

Chunk 2 Summary (GLM-4.5-Air):
  "type User struct with fields ID, Name, Email for user data,
   includes JSON tags and GORM primary key annotation"
```

**Embeddings created FROM summaries:**
```
Chunk 1 Embedding: [0.45, 0.71, 0.33, 0.82, ...]  (1024 dims)
Chunk 2 Embedding: [0.62, 0.58, 0.91, 0.24, ...]  (1024 dims)
```

**SQLite stores all three:**
```sql
INSERT INTO chunks VALUES (
  1,
  'func createDBConnection() *gorm.DB { ... }',  -- original code
  'function that creates MySQL database...',      -- summary
  <blob: [0.45, 0.71, ...]>                      -- embedding of summary
);
```

#### 2. Search Phase (Real-time)

**User comment:** `// insert user into database`

**System embeds comment:**
```
Comment Embedding: [0.50, 0.70, 0.39, 0.88, ...]
```

**SQLite KNN search (sqlite-vec):**
```sql
-- Searches against summary embeddings
SELECT id, text, summary,
       vec_distance_cosine(embedding, ?) as distance
FROM chunks
ORDER BY distance
LIMIT 3;

Results:
  1. distance: 0.05 (95% similarity) ✅
     summary: "function that creates MySQL database connection..."
     text: "func createDBConnection() *gorm.DB { ... }"

  2. distance: 0.12 (88% similarity) ✅
     summary: "type User struct with fields ID, Name, Email..."
     text: "type User struct { ID int; Name string; ... }"
```

#### 3. Context Assembly

```typescript
// Returned to FIM system
const context = {
  importedFiles: [
    { filepath: "models/user.go", content: "type User struct {...}" }
  ],
  semanticFiles: [
    { filepath: "db/connection.go", content: "func createDBConnection() {...}" },
    { filepath: "models/user.go", content: "type User struct {...}" }
  ]
};
```

#### 4. Codestral Generation

**FIM Request:**
```json
{
  "prompt": "package handlers\n\n// insert user into database\n",
  "suffix": "",
  "language": "go",
  "openFiles": [
    {"filepath": "db/connection.go", "content": "func createDBConnection()..."},
    {"filepath": "models/user.go", "content": "type User struct..."}
  ],
  "max_tokens": 150,
  "temperature": 0.1
}
```

**Generated Code:**
```go
func insertUser(user User) error {
    db := createDBConnection()
    result := db.Create(&user)
    if result.Error != nil {
        return result.Error
    }
    return nil
}
```

✅ **Perfect!** Codestral understood:
- Need to use `createDBConnection()` from context
- `User` struct from context
- GORM's `.Create()` method
- Proper error handling

---

## 🧪 Test Cases

### Unit Tests

#### Test Suite 1: `pukuSummaryGenerator.test.ts`

```typescript
describe('PukuSummaryGenerator', () => {
  describe('generateSummary', () => {
    test('summarizes Go function with parameters', async () => {
      const chunk: SemanticChunk = {
        text: 'func sendEmail(userId int, message string) bool {\n  user := db.GetUser(userId)\n  return emailService.Send(user.Email, message)\n}',
        chunkType: 'function',
        symbolName: 'sendEmail',
        lineStart: 10,
        lineEnd: 14
      };

      const summary = await generator.generateSummary(chunk, 'go');

      expect(summary).toContain('function');
      expect(summary).toContain('sendEmail' || 'send' || 'email');
      expect(summary).toContain('userId');
      expect(summary).toContain('message');
      expect(summary).toContain('bool' || 'boolean' || 'returns');
    });

    test('summarizes TypeScript class', async () => {
      const chunk: SemanticChunk = {
        text: 'class UserService {\n  async getUser(id: number) {}\n  async updateUser(id: number, data: any) {}\n}',
        chunkType: 'class',
        symbolName: 'UserService',
        lineStart: 5,
        lineEnd: 8
      };

      const summary = await generator.generateSummary(chunk, 'typescript');

      expect(summary).toContain('class');
      expect(summary).toContain('UserService' || 'user');
      expect(summary).toContain('getUser' || 'updateUser' || 'methods');
    });

    test('summarizes Python function with docstring', async () => {
      const chunk: SemanticChunk = {
        text: 'def calculate_total(items: List[Item]) -> float:\n    """Calculate total price of items"""\n    return sum(item.price for item in items)',
        chunkType: 'function',
        symbolName: 'calculate_total',
        lineStart: 20,
        lineEnd: 22
      };

      const summary = await generator.generateSummary(chunk, 'python');

      expect(summary).toContain('calculate' || 'total');
      expect(summary).toContain('items' || 'List');
      expect(summary).toContain('float' || 'number' || 'returns');
    });
  });

  describe('generateSummariesBatch', () => {
    test('batches 10 chunks per API call', async () => {
      const chunks = Array(25).fill(null).map((_, i) => ({
        text: `function test${i}() {}`,
        chunkType: 'function' as const,
        symbolName: `test${i}`,
        lineStart: i,
        lineEnd: i
      }));

      const mockFetch = jest.spyOn(global, 'fetch');
      await generator.generateSummariesBatch(chunks, 'javascript', authService);

      // Should make 3 API calls (10 + 10 + 5)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('handles API errors gracefully', async () => {
      const chunks = [createMockChunk()];
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API Error'));

      const summaries = await generator.generateSummariesBatch(chunks, 'go', authService);

      // Should fallback to empty or basic summaries
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toBeDefined();
    });
  });
});
```

#### Test Suite 2: `pukuEmbeddingsCache.test.ts`

```typescript
describe('PukuEmbeddingsCache with Summaries', () => {
  test('stores summary column in chunks table', async () => {
    const cache = new PukuEmbeddingsCache(storageUri);
    await cache.open();

    cache.storeFile('file:///test.go', 'hash123', 'go', [
      {
        text: 'func test() {}',
        summary: 'function that tests something',
        embedding: new Array(1024).fill(0.5),
        lineStart: 1,
        lineEnd: 1,
        chunkType: 'function',
        symbolName: 'test'
      }
    ]);

    const chunks = cache.getChunksForFile('file:///test.go');

    expect(chunks[0].summary).toBe('function that tests something');
  });

  test('rebuilds cache when schema version changes', async () => {
    // Create cache with old schema
    const oldCache = new PukuEmbeddingsCache(storageUri);
    await oldCache.open();
    oldCache.storeFile('file:///old.go', 'hash1', 'go', [mockChunk]);
    oldCache.close();

    // Bump SCHEMA_VERSION in code (simulated)
    const newCache = new PukuEmbeddingsCache(storageUri);
    await newCache.open();

    // Old data should be cleared
    expect(newCache.getAllChunks()).toHaveLength(0);
  });
});
```

#### Test Suite 3: `pukuIndexingService.test.ts`

```typescript
describe('PukuIndexingService with Summaries', () => {
  test('generates summaries before creating embeddings', async () => {
    const mockGenerator = {
      generateSummariesBatch: jest.fn().mockResolvedValue([
        'function that does X',
        'function that does Y'
      ])
    };

    const service = new PukuIndexingService(authService);
    service['_summaryGenerator'] = mockGenerator;

    await service['_indexFile'](mockUri);

    expect(mockGenerator.generateSummariesBatch).toHaveBeenCalledWith(
      expect.any(Array),
      'go',
      authService
    );
  });

  test('embeds summaries instead of raw code', async () => {
    const mockEmbedding = jest.spyOn(service as any, '_computeEmbeddingsBatch');
    mockEmbedding.mockResolvedValue([[0.1, 0.2, ...]]);

    await service['_indexFile'](mockUri);

    // Check that embeddings were created from summaries
    const callArg = mockEmbedding.mock.calls[0][0];
    expect(callArg[0]).toContain('function that'); // Summary text, not raw code
  });
});
```

### Integration Tests

```typescript
describe('End-to-End: Comment-based Code Generation', () => {
  test('Go: insert user into database', async () => {
    // 1. Index workspace
    const indexingService = new PukuIndexingService(authService);
    await indexingService.initialize();

    // Create test files
    await createTestFile('db/connection.go', `
      func createDBConnection() *gorm.DB {
        db, _ := gorm.Open(mysql.Open("dsn"), &gorm.Config{})
        return db
      }
    `);

    await createTestFile('models/user.go', `
      type User struct {
        ID    int
        Name  string
        Email string
      }
    `);

    await indexingService.startIndexing();

    // 2. Search for context
    const results = await indexingService.search('insert user into database', 3, 'go');

    // 3. Verify results
    expect(results).toHaveLength(2);
    expect(results[0].content).toContain('createDBConnection');
    expect(results[1].content).toContain('type User');

    // 4. Generate code using FIM
    const completion = await fimProvider.provideInlineCompletionItems(
      document,
      position,
      context,
      token
    );

    expect(completion[0].text).toContain('db := createDBConnection()');
    expect(completion[0].text).toContain('db.Create(&user)');
  });

  test('TypeScript: send email notification', async () => {
    await createTestFile('services/email.ts', `
      class EmailService {
        async sendNotification(userId: string, message: string) {
          const user = await db.getUser(userId);
          return await mailer.send(user.email, message);
        }
      }
    `);

    await indexingService.startIndexing();

    const results = await indexingService.search('send email to user', 2, 'typescript');

    expect(results[0].content).toContain('sendNotification');
    expect(results[0].score).toBeGreaterThan(0.85); // High similarity
  });
});
```

### Performance Tests

```typescript
describe('Performance: Summary Generation', () => {
  test('indexes 100 files in <30 seconds', async () => {
    const startTime = Date.now();

    // Create 100 test files with 5 functions each
    for (let i = 0; i < 100; i++) {
      await createTestFile(`file${i}.go`, generateMockGoFile(5));
    }

    await indexingService.startIndexing();

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  test('search latency remains <100ms', async () => {
    await indexingService.startIndexing();

    const startTime = Date.now();
    await indexingService.search('insert user', 5, 'go');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });

  test('batches API calls (10 chunks per request)', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    // Index file with 25 functions
    await service['_indexFile'](uriWith25Functions);

    // Should make 3 API calls (10 + 10 + 5)
    const summaryApiCalls = fetchSpy.mock.calls.filter(
      call => call[0].includes('/v1/chat/completions')
    );
    expect(summaryApiCalls).toHaveLength(3);
  });
});
```

---

## 📊 Performance Benchmarks

### Expected Metrics

| Metric | Current (Without Summaries) | Target (With Summaries) |
|--------|----------------------------|------------------------|
| **Indexing Time** (100 files) | ~5 seconds | ~20 seconds (+15s for LLM calls) |
| **Search Latency** | 10-50ms | 10-50ms (no change) |
| **Semantic Match Accuracy** | ~45% | **>85%** ✅ |
| **Comment→Code Quality** | Poor | Excellent ✅ |
| **API Calls** (per 100 files) | 500 (embeddings only) | 550 (50 summary + 500 embeddings) |

### Breakdown: Indexing Time (100 files)

```
┌──────────────────────────────────────────────┐
│ CURRENT (Without Summaries): ~5 seconds     │
├──────────────────────────────────────────────┤
│ • File scanning: 0.5s                        │
│ • Tree-sitter parsing: 1.5s                  │
│ • Embedding API (500 chunks): 3s             │
│ • SQLite writes: 0.5s                        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ TARGET (With Summaries): ~20 seconds         │
├──────────────────────────────────────────────┤
│ • File scanning: 0.5s                        │
│ • Tree-sitter parsing: 1.5s                  │
│ • LLM summary generation (50 batches): 10s   │ ← NEW
│ • Embedding API (500 chunks): 3s             │
│ • SQLite writes: 0.5s                        │
│ • Progress UI overhead: 0.5s                 │
└──────────────────────────────────────────────┘
```

**Justification:** 15-second increase is acceptable for one-time indexing that dramatically improves code generation quality.

---

## 🔧 Implementation Details

### File 1: `pukuSummaryGenerator.ts`

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Summary Generator - LLM-based code summarization
 *--------------------------------------------------------------------------------------------*/

import { SemanticChunk } from './pukuASTChunker';
import { IPukuAuthService } from '../common/pukuAuth';

export class PukuSummaryGenerator {
  constructor(
    private readonly _authService: IPukuAuthService
  ) {}

  /**
   * Generate summaries for multiple chunks in batched API calls
   * Batches 10 chunks per request for efficiency
   */
  async generateSummariesBatch(
    chunks: SemanticChunk[],
    languageId: string,
    progressCallback?: (current: number, total: number) => void
  ): Promise<string[]> {
    const BATCH_SIZE = 10;
    const summaries: string[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      // Report progress
      if (progressCallback) {
        progressCallback(i + batch.length, chunks.length);
      }

      try {
        const batchSummaries = await this._generateBatch(batch, languageId);
        summaries.push(...batchSummaries);
      } catch (error) {
        console.error('[SummaryGenerator] Batch failed:', error);
        // Fallback to basic summaries
        summaries.push(...batch.map(c => this._fallbackSummary(c)));
      }
    }

    return summaries;
  }

  /**
   * Generate summaries for a single batch using GLM-4.5-Air
   */
  private async _generateBatch(
    chunks: SemanticChunk[],
    languageId: string
  ): Promise<string[]> {
    const token = await this._authService.getToken();
    if (!token) {
      throw new Error('No auth token available');
    }

    // Create prompt for batch processing
    const prompt = this._createBatchPrompt(chunks, languageId);

    // Call GLM-4.5-Air
    const response = await fetch('https://api.puku.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4-air',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000, // ~100 tokens per summary × 10 chunks
        temperature: 0.3
      })
    });

    const data = await response.json();
    return this._parseBatchResponse(data.choices[0].message.content, chunks.length);
  }

  /**
   * Create batch prompt for LLM
   */
  private _createBatchPrompt(chunks: SemanticChunk[], languageId: string): string {
    const chunksText = chunks.map((chunk, i) =>
      `[CHUNK ${i + 1}]\n${chunk.text}\n`
    ).join('\n');

    return `You are a code documentation expert. Summarize each ${languageId} code chunk below in ONE sentence. For each chunk, describe:
1. What it does (functionality)
2. What inputs it takes
3. What it returns or produces

Format: Return EXACTLY ${chunks.length} lines, one summary per line, starting with "[${i + 1}] " prefix.

${chunksText}`;
  }

  /**
   * Parse batch response from LLM
   */
  private _parseBatchResponse(response: string, expectedCount: number): string[] {
    const lines = response.split('\n').filter(l => l.trim());
    const summaries: string[] = [];

    for (let i = 0; i < expectedCount; i++) {
      const line = lines.find(l => l.startsWith(`[${i + 1}]`));
      if (line) {
        summaries.push(line.replace(/^\[\d+\]\s*/, '').trim());
      } else {
        summaries.push('Code chunk'); // Fallback
      }
    }

    return summaries;
  }

  /**
   * Fallback summary when LLM fails (basic extraction from AST metadata)
   */
  private _fallbackSummary(chunk: SemanticChunk): string {
    const { chunkType, symbolName } = chunk;

    if (chunkType && symbolName) {
      return `${chunkType} ${symbolName}`;
    }

    // Extract first non-comment line
    const lines = chunk.text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('#'));

    return lines[0]?.substring(0, 100) || 'Code block';
  }
}

export const pukuSummaryGenerator = new PukuSummaryGenerator();
```

### File 2: `pukuEmbeddingsCache.ts` (Schema Update)

```typescript
/**
 * Schema version - bump this when schema changes require a clean rebuild
 */
private static readonly SCHEMA_VERSION = '5'; // Changed from '4'

/**
 * Initialize database schema
 */
private _initializeSchema(): void {
  // ... existing code ...

  // Create chunks table with summary column
  this._db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fileId INTEGER NOT NULL,
      text TEXT NOT NULL,
      summary TEXT,                    -- NEW: LLM-generated summary
      lineStart INTEGER NOT NULL,
      lineEnd INTEGER NOT NULL,
      embedding BLOB NOT NULL,         -- Now stores embedding of SUMMARY
      contentHash TEXT NOT NULL,
      languageId TEXT NOT NULL,
      chunkType TEXT,
      symbolName TEXT,
      FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
    )
  `);

  // ... rest of schema ...
}

/**
 * Store chunks with summaries
 */
storeFile(
  uri: string,
  contentHash: string,
  languageId: string,
  chunks: Array<{
    text: string;
    summary: string;        // NEW
    lineStart: number;
    lineEnd: number;
    embedding: number[];
    chunkType?: ChunkType;
    symbolName?: string;
  }>
): void {
  // ... implementation with summary column ...
}
```

### File 3: `pukuIndexingService.ts` (Integration)

```typescript
private async _indexFile(uri: vscode.Uri): Promise<'cached' | 'indexed' | 'skipped'> {
  // ... existing code ...

  // Chunk the content using AST-based chunking
  const semanticChunks = await pukuASTChunker.chunkContent(content, languageId);

  // NEW: Generate summaries for all chunks
  const summaries = await pukuSummaryGenerator.generateSummariesBatch(
    semanticChunks,
    languageId,
    (current, total) => {
      // Update progress UI
      this._updateProgress({
        status: PukuIndexingStatus.Indexing,
        totalFiles: this._progress.totalFiles,
        indexedFiles: this._progress.indexedFiles,
        currentFile: `${uri.fsPath} (summaries: ${current}/${total})`
      });
    }
  );

  // Compute embeddings for SUMMARIES (not raw code)
  const embeddings = await this._computeEmbeddingsBatch(summaries);

  // Store with summaries
  const chunksWithSummaries = semanticChunks.map((chunk, i) => ({
    text: chunk.text,
    summary: summaries[i],
    embedding: embeddings[i],
    lineStart: chunk.lineStart,
    lineEnd: chunk.lineEnd,
    chunkType: chunk.chunkType,
    symbolName: chunk.symbolName
  }));

  this._cache.storeFile(uri.toString(), contentHash, languageId, chunksWithSummaries);

  // ... rest of implementation ...
}
```

---

## ✅ Success Metrics

### Quantitative Metrics

- [ ] **Semantic match accuracy** ≥85% (measured on 100 test comments)
- [ ] **Indexing time** <30 seconds for 100-file workspace
- [ ] **Search latency** <100ms (no regression from current system)
- [ ] **API call efficiency** ≤10 chunks per batch (minimize costs)
- [ ] **Summary quality** ≥4/5 rating (manual review of 50 summaries)

### Qualitative Metrics

- [ ] Comment "send email" → finds email-related functions
- [ ] Comment "insert user" → finds database insertion code
- [ ] Comment "validate input" → finds validation functions
- [ ] Works across all Tree-sitter supported languages
- [ ] Users report improved code generation quality

---

## 🚀 Migration Plan

### Phase 1: Development (Week 1)
- [ ] Implement `PukuSummaryGenerator` with GLM-4.5-Air integration
- [ ] Update `PukuEmbeddingsCache` schema (add summary column)
- [ ] Modify `PukuIndexingService` to generate summaries before embedding
- [ ] Add progress UI for summary generation

### Phase 2: Testing (Week 1)
- [ ] Unit tests for summary generation
- [ ] Integration tests for E2E flow
- [ ] Performance benchmarks
- [ ] Manual quality testing

### Phase 3: Rollout (Week 2)
- [ ] Bump `SCHEMA_VERSION` to trigger cache rebuild
- [ ] Add migration notice for users
- [ ] Monitor indexing performance
- [ ] Collect user feedback

### User Migration Notice

```
┌─────────────────────────────────────────────────────┐
│  Puku Editor - Indexing Update Required             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  We've improved semantic search with LLM-based       │
│  code summaries for better comment-based             │
│  completions!                                        │
│                                                      │
│  Your workspace will be re-indexed (~20 seconds).   │
│                                                      │
│  [Re-index Now]  [Later]                            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📚 References

- [GitHub Copilot Architecture](https://github.blog/2023-05-17-how-github-copilot-is-getting-better-at-understanding-your-code/)
- [Cursor Codebase Indexing](https://cursor.sh/blog/semantic-search)
- [Code Search via Semantic Embeddings (Research)](https://arxiv.org/abs/2305.10415)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [sqlite-vec Extension](https://github.com/asg017/sqlite-vec)

---

**Labels:** `enhancement`, `semantic-search`, `indexing`, `ai-features`, `high-priority`

**Estimated Effort:** 2-3 days (1 dev + 1 testing)

**Priority:** High - Critical for improving code generation quality
