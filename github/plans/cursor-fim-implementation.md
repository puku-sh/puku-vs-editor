# Cursor-Style FIM Implementation Plan

## Overview

This document outlines the complete plan to implement Cursor-style FIM (Fill-In-Middle) completions in Puku Editor. The implementation is divided into 4 phases, each building on the previous.

## Goals

1. **Semantic code search**: Find relevant code from entire codebase, not just open files
2. **Better completions**: More context = better suggestions
3. **Pre-validation**: Catch errors before showing completions
4. **Performance**: Keep latency acceptable (<300ms)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUKU EDITOR                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   FIM        │───►│  Embeddings  │───►│  Local Cache     │  │
│  │   Provider   │    │  Service     │    │  (JSON + Map)    │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                   │                                    │
│         │                   ▼                                    │
│         │            ┌──────────────┐                           │
│         │            │   Proxy      │                           │
│         │            │   Server     │                           │
│         │            └──────────────┘                           │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │   Shadow     │    │  Cloudflare  │                           │
│  │   Workspace  │    │  /Z.AI API   │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Phases

### Phase 1: Embeddings Infrastructure (2-3 days) ✅ COMPLETED
**Goal**: Add the ability to compute and store embeddings

- ✅ Add `/v1/embeddings` endpoint to proxy (OpenRouter)
- ✅ Create embeddings service in extension (PukuEmbeddingsComputer)
- ✅ Set up local storage for embeddings cache (SQLite)

**Dependencies**: None
**Deliverable**: Working embeddings API that can convert text to vectors

### Phase 2: Codebase Indexing (3-4 days) ✅ COMPLETED
**Goal**: Index all workspace files with embeddings

- ✅ Scan workspace files on open
- ✅ Chunk files using AST-based semantic chunking (Tree-sitter)
- ✅ Compute and cache embeddings for each chunk (SQLite)
- ✅ Re-index on file changes (FileSystemWatcher)

**Implementation:**
- `pukuASTChunker.ts` - AST-based chunking using VS Code's Tree-sitter parser
- `pukuIndexingService.ts` - File scanning, chunking, and embedding orchestration
- `pukuEmbeddingsCache.ts` - SQLite storage with chunk metadata

**Dependencies**: Phase 1
**Deliverable**: Indexed codebase with searchable embeddings

### Phase 3: Semantic FIM Context (2-3 days) ✅ COMPLETED
**Goal**: Use embeddings to find relevant context for FIM

- ✅ Query embeddings index with cursor context
- ✅ Rank using cosine similarity (vector search)
- ✅ PukuSemanticContextProvider registered as default
- ✅ Integrated with FIM completion system

**Implementation:**
- `pukuSemanticContext.ts` - Context provider for FIM completions
- Uses cosine similarity for semantic ranking (NOT Jaccard)

**Dependencies**: Phase 2
**Deliverable**: FIM completions with codebase-wide context

### Phase 4: Shadow Workspace Validation (3-4 days)
**Goal**: Pre-validate completions before showing

- Create hidden workspace for validation
- Apply completion and check LSP diagnostics
- Filter out completions with errors
- Optimize for latency

**Dependencies**: Phase 3
**Deliverable**: Validated, higher-quality completions

## Timeline

```
Week 1: Phase 1 (Embeddings Infrastructure)
Week 2: Phase 2 (Codebase Indexing)
Week 3: Phase 3 (Semantic FIM Context)
Week 4: Phase 4 (Shadow Workspace)
```

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Context scope | Open files only | Entire codebase |
| Completion accuracy | Good | Better (semantic) |
| Error rate | ~5-10% | <2% (validated) |
| Latency | ~100ms | <300ms |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Slow embeddings API | Use fast local model or cache aggressively |
| Large codebases | Limit indexing to relevant files, lazy indexing |
| Latency increase | Parallel requests, caching, timeout fallback |
| Storage growth | Compress embeddings, prune old entries |

## Configuration Options

```json
{
  "puku.fim.useSemanticContext": true,
  "puku.fim.maxContextSnippets": 5,
  "puku.fim.indexingEnabled": true,
  "puku.fim.maxIndexedFiles": 5000,
  "puku.fim.validateCompletions": true
}
```

## Next Steps

1. Review Phase 1 plan in detail
2. Set up embeddings endpoint in proxy
3. Test with simple embeddings queries
4. Proceed to Phase 2
