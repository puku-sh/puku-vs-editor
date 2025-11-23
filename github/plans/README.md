# Puku Editor Implementation Plans

This folder contains detailed implementation plans for building Puku Editor - an AI-powered code editor.

## Overview

Puku Editor is a fork of VS Code (Code-OSS) with built-in AI features powered by:
- **Chat**: Z.AI GLM-4.6 model
- **FIM (Fill-In-Middle)**: OpenRouter Codestral for inline completions
- **Embeddings**: OpenRouter for semantic code search
- **Indexing**: AST-based chunking with sqlite-vec for vector search

## Roadmap

```
Phase 1-3 (Foundation)     Phase 4-7 (Product)      Phase 8 (ML/AI)
─────────────────────────  ──────────────────────   ─────────────────
✅ Embeddings              ⏳ Shadow Workspace      🔮 FIM RL Training
✅ Codebase Indexing       📋 Remove Copilot Brand
✅ Semantic FIM Context    📋 Bundle Extension
✅ Native FIM (v0.35.0)    📋 Release Pipeline
```

## Plans

### Foundation (Complete)

| Phase | Status | Description | Doc |
|-------|--------|-------------|-----|
| **Phase 1** | ✅ Complete | Embeddings Infrastructure | [Link](./phase-1-embeddings-infrastructure.md) |
| **Phase 2** | ✅ Complete | Codebase Indexing (AST + sqlite-vec) | [Link](./phase-2-codebase-indexing.md) |
| **Phase 3** | ✅ Complete | Semantic FIM Context | [Link](./phase-3-semantic-fim-context.md) |
| **v0.35.0** | ✅ Complete | Native FIM with Codestral | Released |

### Product (In Progress)

| Phase | Status | Description | Doc |
|-------|--------|-------------|-----|
| **Phase 4** | ⏳ Not Started | Shadow Workspace (LSP validation) | [Link](./phase-4-shadow-workspace.md) |
| **Phase 5** | 📋 Planned | Remove Copilot Branding | [Link](./phase-5-remove-copilot-branding.md) |
| **Phase 6** | 📋 Planned | Bundle Extension into Code-OSS | [Link](./phase-6-bundle-extension.md) |
| **Phase 7** | 📋 Planned | Release Pipeline (CI/CD) | [Link](./phase-7-release-pipeline.md) |

### ML/AI (Future)

| Phase | Status | Description | Doc |
|-------|--------|-------------|-----|
| **Phase 8** | 🔮 Future | FIM Reinforcement Learning | [Link](./phase-8-fim-rl-training.md) |

## Architecture

### Current Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      PUKU EDITOR                                 │
├─────────────────────────────────────────────────────────────────┤
│  Extension (github/editor)                                       │
│  ├── Chat Panel (Z.AI GLM-4.6)                                  │
│  ├── Inline Completions (OpenRouter Codestral FIM)              │
│  ├── Semantic Search (sqlite-vec + embeddings)                  │
│  └── Agent Mode (tool calling)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Proxy (github/proxy)                                           │
│  ├── /v1/chat/completions → Z.AI API                           │
│  ├── /v1/completions → OpenRouter FIM                          │
│  └── /v1/embeddings → OpenRouter                               │
├─────────────────────────────────────────────────────────────────┤
│  Forked VS Code (github/vscode)                                 │
│  └── Code-OSS with Puku branding (Phase 6-7)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Target Stack (After Phase 7)

```
┌─────────────────────────────────────────────────────────────────┐
│                 PUKU EDITOR (Standalone App)                     │
├─────────────────────────────────────────────────────────────────┤
│  Built-in Features (bundled, not extension)                      │
│  ├── Puku Chat (puku.*)                                         │
│  ├── Puku Completions (native FIM)                              │
│  ├── Puku Indexing (semantic search)                            │
│  └── Puku Agent (tool calling)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Proxy (cloud-hosted or self-hosted)                            │
│  ├── Chat API                                                   │
│  ├── FIM API                                                    │
│  └── Embeddings API                                             │
├─────────────────────────────────────────────────────────────────┤
│  Distribution                                                    │
│  ├── macOS (.dmg) - Intel & Apple Silicon                       │
│  ├── Windows (.exe) - x64 & arm64                               │
│  └── Linux (.deb, .AppImage) - x64 & arm64                      │
└─────────────────────────────────────────────────────────────────┘
```

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v0.35.0 | 2024-11-23 | Native FIM with Codestral, removed Copilot API |
| v0.34.9 | 2024-11-21 | Node.js 23.5.0 for sqlite-vec support |
| v0.34.6 | 2024-11-20 | Documentation updates |
| v0.34.4 | 2024-11-19 | Puku Indexing with embeddings |

## Cost Estimates

### Current (Development)
- **API costs**: ~$50-100/month (OpenRouter + Z.AI)
- **Infrastructure**: $0 (local development)

### After Phase 7 (Production)
- **Build pipeline**: ~$22/month (4 releases)
- **API costs**: Scale with users
- **Code signing**: $99/year (Apple) + optional Windows

### Phase 8 (ML Training)
- **Modal (cloud)**: $3-5K/month for online RL
- **DGX Spark**: $3K one-time (break-even ~2 months)

## Quick Links

- [CLAUDE.md](../../CLAUDE.md) - Project setup and development guide
- [Cursor FIM Implementation](./cursor-fim-implementation.md) - Master plan overview
- [Puku Indexing API](./puku-indexing-api.md) - API documentation

## Priority Order

**Immediate (Next 2 weeks):**
1. Phase 5: Remove Copilot Branding
2. Phase 6: Bundle Extension

**Short-term (Next month):**
3. Phase 7: Release Pipeline
4. Phase 4: Shadow Workspace

**Medium-term (Next quarter):**
5. Phase 8.1: Telemetry Collection
6. Phase 8.2: Contextual Filter

**Long-term:**
7. Phase 8.3-8.4: ML Training
