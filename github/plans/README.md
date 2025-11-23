# Puku Editor Implementation Plans

This folder contains detailed implementation plans for enhancing Puku Editor with Cursor-style features.

## Overview

The goal is to implement a more intelligent FIM (Fill-In-Middle) system that uses semantic search via embeddings to provide better code completions by understanding the entire codebase, not just open files.

## Plans

| Plan | Status | Description |
|------|--------|-------------|
| [Cursor-Style FIM Implementation](./cursor-fim-implementation.md) | ✅ In Progress | Master plan overview |
| [Phase 1: Embeddings Infrastructure](./phase-1-embeddings-infrastructure.md) | ✅ Complete | Add embeddings API (OpenRouter) and SQLite storage |
| [Phase 2: Codebase Indexing](./phase-2-codebase-indexing.md) | ✅ Complete | AST-based chunking with Tree-sitter, embeddings cache |
| [Phase 3: Semantic FIM Context](./phase-3-semantic-fim-context.md) | ✅ Complete | Vector search with cosine similarity for FIM context |
| [Phase 4: Shadow Workspace](./phase-4-shadow-workspace.md) | Not Started | Pre-validate completions with LSP |
| [Puku Indexing API](./puku-indexing-api.md) | Reference | API documentation for indexing service |

## Implementation Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
(Foundation)  (Index)    (FIM)      (Validation)
```

Each phase builds on the previous. Phase 1 is required for all others.

## Current Architecture vs Target

### Current Implementation ✅
- ✅ Embeddings via OpenRouter (codestral-embed-2505)
- ✅ AST-based chunking using Tree-sitter (like Cursor)
- ✅ Vector search with cosine similarity
- ✅ SQLite cache for embeddings
- ✅ FileSystemWatcher for re-indexing
- ⏳ Shadow workspace validation (Phase 4)

### Key Components
- `PukuASTChunker` - Semantic chunking at function/class boundaries
- `PukuEmbeddingsCache` - SQLite storage with chunk metadata
- `PukuIndexingService` - Workspace indexing orchestration
- `PukuSemanticContextProvider` - FIM context via vector search

## Quick Start

1. Start with Phase 1 to add embeddings endpoint to proxy
2. Test embeddings API works correctly
3. Proceed to Phase 2 for indexing
4. Continue through phases sequentially

## Resources

- [FIM Documentation](../docs/fim.md) - Technical details on FIM architecture
- [CLAUDE.md](../../CLAUDE.md) - Project overview and setup
