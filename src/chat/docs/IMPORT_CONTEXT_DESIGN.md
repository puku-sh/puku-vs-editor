# Import Context System Design

## Goal
Add import-based context to inline completions for Supermaven-like quality. Include content from files that the current file imports, since these are highly relevant to what the user is typing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  IMPORT CONTEXT SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌──────────────────┐                │
│  │ User Types Code │─────>│ Inline Completion│                │
│  └─────────────────┘      │    Provider      │                │
│                            └────────┬─────────┘                │
│                                     │                          │
│                                     ▼                          │
│                      ┌─────────────────────────┐               │
│                      │  Import Extractor       │               │
│                      │  (Tree-sitter AST)      │               │
│                      └──────────┬──────────────┘               │
│                                 │                              │
│                    ┌────────────┴────────────┐                 │
│                    ▼                         ▼                 │
│         ┌──────────────────┐     ┌──────────────────┐          │
│         │  Import Cache    │     │  Path Resolver   │          │
│         │  (LRU)           │     │  (Relative/Abs)  │          │
│         └──────────────────┘     └────────┬─────────┘          │
│                                            ▼                   │
│                                 ┌──────────────────┐            │
│                                 │  File Reader     │            │
│                                 │  (VS Code API)   │            │
│                                 └────────┬─────────┘            │
│                                          │                     │
│                                          ▼                     │
│                           ┌─────────────────────────┐          │
│                           │   Context Builder       │          │
│                           │   (Imports + Semantic)  │          │
│                           └──────────┬──────────────┘          │
│                                      │                         │
│                                      ▼                         │
│                           ┌─────────────────────────┐          │
│                           │   FIM Endpoint          │          │
│                           │   (Codestral Mamba)     │          │
│                           └─────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. **PukuImportExtractor** (New Service)

**Location**: `src/extension/pukuIndexing/node/pukuImportExtractor.ts`

**Responsibilities**:
- Extract import paths from source code using Tree-sitter AST
- Filter out external packages (node_modules, npm packages, etc.)
- Support multiple languages (TypeScript, Python, Go, Java)
- Cache extraction results per file

**Input**:
- `content: string` - File content
- `languageId: string` - VS Code language ID
- `fileUri: string` - File URI for cache key

**Output**:
- `string[]` - Array of import paths (e.g., `['./utils', '../models', '/config']`)

**Key Design Decisions**:
- **AST-based** (not regex) - More accurate for complex imports
- **Language-specific** - Different AST node types per language
- **Filter external** - Only local workspace imports
- **Cached by content hash** - Avoid re-parsing unchanged files

**Cache Strategy**:
- Key: `fileUri`
- Value: `{ contentHash: string, imports: string[] }`
- Size limit: 100 files
- Invalidation: When content hash changes

**Supported Languages**:
| Language | Import Syntax | AST Node Type |
|----------|---------------|---------------|
| TypeScript/JS | `import X from './file'` | `import_statement` |
| TypeScript/JS | `require('./file')` | `call_expression` |
| Python | `from .module import X` | `import_from_statement` |
| Go | `import "./package"` | `import_declaration` |
| Java | `import com.example.Class` | `import_declaration` (skip for now) |

---

### 2. **Import Path Resolver**

**Location**: `pukuInlineCompletionProvider.ts` (helper method)

**Responsibilities**:
- Resolve import paths to actual file URIs
- Handle relative imports (`./utils` → `/workspace/src/utils.ts`)
- Handle absolute imports (`/config` → `/workspace/config.ts`)
- Try multiple file extensions per language

**Input**:
- `importPaths: string[]` - Import paths from extractor
- `currentFile: vscode.Uri` - Current file URI
- `languageId: string` - To determine extensions to try

**Output**:
- `vscode.Uri[]` - Resolved file URIs

**Resolution Algorithm**:
```
For each import path:
  1. Determine if relative (./...) or absolute (/)
  2. Get base directory:
     - Relative: current file's directory
     - Absolute: workspace root
  3. Try file extensions in order:
     - TypeScript: [.ts, .tsx, .js, .jsx]
     - Python: [.py]
     - Go: [.go]
  4. Check if file exists using VS Code API
  5. Return first match or skip
```

**Edge Cases**:
- Import without extension: Try all possible extensions
- Index files: Try `./utils/index.ts` if `./utils` fails
- Non-existent files: Skip silently
- Circular imports: Not a problem (we only read, don't execute)

---

### 3. **Import File Reader**

**Location**: `pukuInlineCompletionProvider.ts` (helper method)

**Responsibilities**:
- Read content from resolved import files
- Truncate to max size (avoid huge context)
- Handle read errors gracefully

**Input**:
- `resolvedUris: vscode.Uri[]` - File URIs to read
- `limit: number` - Max number of files (default: 3)
- `maxCharsPerFile: number` - Max chars per file (default: 500)

**Output**:
- `Array<{ filepath: string, content: string }>`

**Read Strategy**:
- Take **first N files** (not last, to prefer early imports)
- Read **first M chars** (not full file, to save tokens)
- Skip files that fail to read (permissions, deleted, etc.)

**Rationale**:
- Early imports are usually more important (core dependencies)
- 500 chars is enough for type definitions and function signatures
- 3 files × 500 chars = 1500 chars max (manageable context size)

---

### 4. **Context Builder**

**Location**: `pukuInlineCompletionProvider.ts` (provideInlineCompletionItems)

**Responsibilities**:
- Combine import-based context with semantic search context
- Prioritize imports over semantic search
- Build final context array for FIM endpoint

**Context Priority**:
```
openFiles = [
  ...importedFiles (top 3),     // HIGH priority
  ...semanticSearchResults (top 2)  // MEDIUM priority
]
```

**Why Imports First?**
- Explicit dependencies (user chose to import them)
- More likely to contain relevant types/functions
- Better signal than semantic similarity

**Total Context Size**:
- Imports: 3 files × 500 chars = 1,500 chars
- Semantic: 2 files × ~500 chars = 1,000 chars
- **Total: ~2,500 chars** (reasonable for context window)

---

## Data Flow

### Completion Request Flow

```
1. User Types → Trigger Inline Completion
   ├─> Extract imports (AST, cached)
   ├─> Resolve import paths
   ├─> Read import files (top 3, 500 chars each)
   │
   ├─> Run semantic search (current line)
   ├─> Get top 2 results
   │
   └─> Combine contexts (imports + semantic)
       └─> Send to FIM endpoint
           └─> Return completion

Timeline (estimated):
- Import extraction: 5-10ms (cached) or 20-40ms (uncached AST)
- Path resolution: 5-10ms (file system checks)
- File reads: 10-20ms (I/O)
- Semantic search: 50-100ms (embedding + similarity)
- FIM API: 200-500ms (model inference)
---
Total: ~300-700ms
```

### Cache Flow

```
File Changed → Content Hash → Cache Lookup
   │
   ├─> Cache HIT → Return cached imports
   │
   └─> Cache MISS → Parse AST
                  → Extract imports
                  → Store in cache
                  → Return imports
```

---

## Integration Points

### 1. **PukuInlineCompletionProvider**

**Changes Required**:
- Import `pukuImportExtractor` service
- Add `_resolveImportPaths()` helper method
- Add `_getImportedFilesContent()` helper method
- Update `provideInlineCompletionItems()` to call import extraction
- Update speculative request function to include import context

**No changes to**:
- FIM endpoint (already accepts `openFiles[]`)
- Semantic search (runs independently)
- Speculative cache (just add import context to closure)

### 2. **Backend (puku-worker)**

**No changes required!**
- Backend already accepts `openFiles[]` in `/v1/fim/context`
- Just receives more context files
- Model handles de-duplication automatically

---

## Performance Optimizations

### 1. **Caching Strategy**

| Cache Type | Key | Size | Eviction | Invalidation |
|------------|-----|------|----------|--------------|
| Import Cache | File URI | 100 files | LRU | Content hash change |
| AST Cache | (Tree-sitter internal) | N/A | TTL | N/A |

### 2. **Lazy Evaluation**

- Don't extract imports until completion is triggered
- Don't resolve paths until imports are extracted
- Don't read files until paths are resolved

### 3. **Early Exit**

```
if (!imports.length) return [];
if (!resolvedUris.length) return [];
if (token.isCancellationRequested) return null;
```

### 4. **Batch Operations**

- Resolve all import paths in parallel (Promise.all)
- Read all import files in parallel (Promise.all)
- Single semantic search for all files

---

## Benefits Analysis

### 1. **Quality Improvement**

| Scenario | Before (Semantic Only) | After (Imports + Semantic) |
|----------|------------------------|----------------------------|
| Type completion | ❌ May not find type definition | ✅ Type definition from import |
| Function parameters | ⚠️ Guess from similar code | ✅ See actual signature from import |
| New API usage | ❌ No context | ✅ Import shows API patterns |
| Refactoring | ⚠️ May suggest stale patterns | ✅ Current usage from imports |

### 2. **Latency Impact**

| Operation | Time | Mitigation |
|-----------|------|------------|
| AST parsing (uncached) | 20-40ms | Cache by content hash |
| AST parsing (cached) | 5-10ms | Most requests hit cache |
| Path resolution | 5-10ms | Minimal file system checks |
| File reads (3 files) | 10-20ms | Async, parallel reads |
| **Total added latency** | **20-80ms** | Acceptable for quality gain |

### 3. **Token Usage**

| Source | Size | Tokens (approx) |
|--------|------|-----------------|
| Prefix | Variable | 500-2000 |
| Suffix | Variable | 100-500 |
| Imports (3 × 500 chars) | 1,500 chars | ~400 |
| Semantic (2 × 500 chars) | 1,000 chars | ~250 |
| **Total context** | **3,500 chars** | **~1,650 tokens** |

Still well within Codestral Mamba's 256k context window.

---

## Language Support Matrix

| Language | Import Syntax | AST Parsing | Path Resolution | Status |
|----------|---------------|-------------|-----------------|--------|
| TypeScript | `import X from './file'` | ✅ | ✅ | **Supported** |
| JavaScript | `require('./file')` | ✅ | ✅ | **Supported** |
| Python | `from .module import X` | ✅ | ✅ | **Supported** |
| Go | `import "./package"` | ✅ | ✅ | **Supported** |
| Java | `import com.example.Class` | ❌ | ❌ | Future |
| Rust | `use crate::module` | ❌ | ❌ | Future |

---

## Error Handling

### 1. **Import Extraction Failures**

| Error | Handling |
|-------|----------|
| Unsupported language | Return empty array, log warning |
| AST parsing error | Return empty array, log error |
| Invalid syntax | Return empty array (graceful degradation) |

### 2. **Path Resolution Failures**

| Error | Handling |
|-------|----------|
| File not found | Skip import, try next |
| Permission denied | Skip import, try next |
| Invalid path | Skip import, try next |

### 3. **File Read Failures**

| Error | Handling |
|-------|----------|
| File deleted | Skip file, try next |
| Large file (>10MB) | Truncate to 500 chars |
| Binary file | Skip file |

**Principle**: Fail gracefully, never block completions

---

## Testing Strategy

### 1. **Unit Tests**

- [ ] Import extractor for each language
- [ ] Path resolver for relative/absolute imports
- [ ] Cache invalidation logic
- [ ] External package filtering

### 2. **Integration Tests**

- [ ] TypeScript project with imports
- [ ] Python project with relative imports
- [ ] Go project with package imports
- [ ] Edge case: circular imports

### 3. **Performance Tests**

- [ ] Cache hit rate > 80%
- [ ] Import extraction < 50ms (p95)
- [ ] Total added latency < 100ms (p95)

### 4. **Quality Tests**

- [ ] Completion accuracy improves
- [ ] Type completions are correct
- [ ] Function parameter hints are accurate

---

## Metrics to Track

1. **Cache Performance**
   - Cache hit rate
   - Cache size
   - Average AST parse time (cached vs uncached)

2. **Completion Quality**
   - Import context usage rate (% of completions using imports)
   - User acceptance rate (before/after)
   - Average number of imports per completion

3. **Latency**
   - p50/p95/p99 import extraction time
   - p50/p95/p99 total added latency
   - Cache miss rate

---

## Rollout Plan

### Phase 1: TypeScript/JavaScript Only
- Implement import extractor for TS/JS
- Add to completion provider
- Test with internal projects
- Monitor metrics

### Phase 2: Python Support
- Add Python import parsing
- Test with Python projects
- Compare quality improvement

### Phase 3: Go Support
- Add Go import parsing
- Test with Go projects

### Phase 4: Optimization
- Fine-tune cache size
- Optimize file read sizes
- Add parallel processing

---

## Success Criteria

- [ ] Import context adds < 100ms latency (p95)
- [ ] Cache hit rate > 80%
- [ ] Completion quality improves (subjective testing)
- [ ] No crashes or errors in production
- [ ] Works across TypeScript, Python, Go

---

## Future Enhancements

1. **Smarter Import Selection**
   - Rank imports by usage frequency
   - Prefer imports used near cursor
   - Skip rarely-used imports

2. **Import Dependency Graph**
   - Index all imports in workspace
   - Build import graph
   - Use graph for better context selection

3. **Export Detection**
   - Extract what current file exports
   - Include exports in context for better suggestions

4. **LSP Integration**
   - Use LSP for type information
   - Combine with import context
   - Even better type completions
