# Puku AI Indexing API

This document describes the Puku AI indexing API endpoints added to the proxy server to support workspace indexing and semantic search.

## Overview

The Puku AI indexing system provides:
- Embedding model discovery
- Auth token generation for embedding requests
- Status endpoint for indexing health checks
- Embeddings proxy endpoint

## API Endpoints

### GET /puku/v1/models

Returns available embedding models for workspace indexing.

**Response:**
```json
{
  "models": [
    {"id": "puku-embeddings-1024", "active": true},
    {"id": "codestral-embed-2505", "active": true}
  ]
}
```

### GET /puku/v1/token

Returns an auth token for embedding requests.

**Response:**
```json
{
  "token": "puku-auth-token",
  "expires_at": 1763815620,
  "refresh_in": 1800,
  "endpoints": {
    "api": "http://localhost:11434",
    "embeddings": "http://localhost:11434/v1/embeddings"
  },
  "indexing_enabled": true,
  "semantic_search_enabled": true
}
```

### GET /puku/v1/status

Returns the indexing service status.

**Response:**
```json
{
  "status": "ready",
  "embeddings_available": true,
  "indexing_available": true,
  "model": "codestral-embed-2505",
  "dimensions": 1024
}
```

### POST /puku/v1/embeddings

Proxy endpoint for embedding requests. Forwards to `/v1/embeddings`.

**Request:**
```json
{
  "model": "codestral-embed-2505",
  "input": ["text to embed"]
}
```

### GET /puku/v1/user

Returns mock user info for the local Puku setup.

**Response:**
```json
{
  "id": "puku-local-user",
  "name": "Puku Editor User",
  "email": "puku@localhost"
}
```

## Integration with Puku Editor

The editor's `PukuEmbeddingsComputer` can use these endpoints to:
1. Discover available embedding models via `/puku/v1/models`
2. Get auth tokens via `/puku/v1/token`
3. Check service status via `/puku/v1/status`
4. Compute embeddings via `/puku/v1/embeddings` or `/v1/embeddings`

## Files

### Proxy Server
- `github/proxy/src/routes/puku-api.ts` - Puku API route handlers
- `github/proxy/src/index.ts` - Main proxy server with route registration

### Editor Frontend Services
- `github/editor/src/extension/pukuIndexing/common/pukuAuth.ts` - `IPukuAuthService` / `PukuAuthService` - Auth token management
- `github/editor/src/extension/pukuIndexing/common/pukuEmbeddingTypes.ts` - `IPukuEmbeddingTypesService` / `PukuEmbeddingTypesService` - Model discovery
- `github/editor/src/extension/pukuIndexing/node/pukuIndexingService.ts` - `IPukuIndexingService` / `PukuIndexingService` - Main indexing service
- `github/editor/src/extension/pukuIndexing/node/pukuASTChunker.ts` - `PukuASTChunker` - AST-based semantic chunking using Tree-sitter
- `github/editor/src/extension/pukuIndexing/node/pukuEmbeddingsCache.ts` - `PukuEmbeddingsCache` - SQLite storage with chunk metadata
- `github/editor/src/extension/pukuIndexing/vscode-node/pukuIndexing.contribution.ts` - `PukuIndexingContribution` - Auto-triggers indexing on startup

### Service Registration
- `github/editor/src/extension/extension/vscode-node/services.ts` - Service registration
- `github/editor/src/extension/extension/vscode-node/contributions.ts` - Contribution registration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Puku Editor (VS Code)                   │
├─────────────────────────────────────────────────────────────┤
│  PukuIndexingContribution                                   │
│    └── Auto-starts indexing on workspace open               │
├─────────────────────────────────────────────────────────────┤
│  PukuIndexingService                                        │
│    ├── Scans workspace files                                │
│    ├── AST-based chunking via PukuASTChunker (Tree-sitter)  │
│    ├── Chunk types: function, method, class, interface, etc │
│    ├── Computes embeddings via PukuEmbeddingsComputer       │
│    └── Stores in SQLite via PukuEmbeddingsCache             │
├─────────────────────────────────────────────────────────────┤
│  PukuASTChunker                                             │
│    ├── Uses VS Code's Tree-sitter parser (structureComputer)│
│    ├── Extracts semantic chunks at function/class boundaries│
│    ├── Fallback to line-based for unsupported languages     │
│    └── Preserves chunk metadata (type, symbol name)         │
├─────────────────────────────────────────────────────────────┤
│  PukuAuthService              PukuEmbeddingTypesService     │
│    ├── GET /puku/v1/token     ├── GET /puku/v1/models       │
│    ├── GET /puku/v1/user      └── Discovers embedding models│
│    └── Token refresh                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Proxy Server (Express)                   │
├─────────────────────────────────────────────────────────────┤
│  /puku/v1/models    - Returns available embedding models    │
│  /puku/v1/token     - Returns auth token + endpoints        │
│  /puku/v1/user      - Returns user info                     │
│  /puku/v1/status    - Returns indexing status               │
│  /puku/v1/embeddings - Proxies to embeddings endpoint       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenRouter API                           │
│  POST /v1/embeddings (mistralai/codestral-embed-2505)       │
└─────────────────────────────────────────────────────────────┘
```

## Testing

```bash
# Test models endpoint
curl http://localhost:11434/puku/v1/models

# Test token endpoint
curl http://localhost:11434/puku/v1/token

# Test status endpoint
curl http://localhost:11434/puku/v1/status

# Test embeddings
curl -X POST http://localhost:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "codestral-embed-2505", "input": ["hello world"]}'
```
