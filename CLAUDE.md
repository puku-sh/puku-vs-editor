# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Puku Editor** monorepo containing:

- **`src/chat`** - **Puku Editor Extension** - AI-powered VS Code extension built on GitHub Copilot Chat architecture. Provides chat interface, inline completions (FIM), agent mode, and tool calling.
- **`src/vscode`** - **Forked VS Code** (Code-OSS) - Custom VS Code build for bundling and packaging the extension as a standalone application.
- **Backend API** - Puku backend API (separate repo at `../puku-worker`) provides completions, FIM, embeddings, and authentication endpoints.

## Repository Structure

```
puku-vs-editor/puku-editor/
├── src/
│   ├── chat/              # Puku Editor extension source
│   │   ├── src/           # TypeScript source
│   │   ├── dist/          # Compiled bundles (22MB+)
│   │   ├── package.json   # Extension dependencies (120 deps)
│   │   └── .esbuild.ts    # esbuild bundler configuration
│   └── vscode/            # Forked VS Code (Code-OSS)
│       ├── src/           # VS Code source
│       ├── build/         # Build scripts
│       └── .nvmrc         # Node 22.20.0
├── .github/
│   └── workflows/         # CI/CD for 6 platforms
│       ├── build-macos.yml
│       ├── build-linux.yml
│       └── build-windows.yml
├── Makefile              # Build automation
├── build-dmg-optimized.sh # macOS DMG packaging
└── CLAUDE.md             # This file
```

## Requirements

- **Node.js**: 23.5.0+ for extension, 22.20.0 for VS Code (managed by nvm)
- **Python**: >= 3.10, <= 3.12 (for VS Code native modules)
- **Git LFS**: For running tests
- **Platform-specific**:
  - macOS: Xcode Command Line Tools
  - Linux: libx11-dev, libxkbfile-dev, libsecret-1-dev
  - Windows: Visual Studio Build Tools >=2019

## Quick Start

### Local Development

```bash
# Install dependencies (run from repo root)
cd src/chat && npm install
cd ../vscode && npm install

# Build extension (~2s)
make build-ext

# Build VS Code (~5-10 min first time)
make build-vs

# Run VS Code with extension
cd src/vscode
./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
```

### Build & Package

```bash
# Full build (extension + VS Code)
make build

# Create macOS DMG (~20s)
./build-dmg-optimized.sh
# Output: Puku-1.107.0.dmg (~311MB)
```

## CI/CD & Releases

### GitHub Actions Workflows

The project builds for 6 platforms via GitHub Actions:

| Platform | Architectures | Workflow |
|----------|--------------|----------|
| macOS | arm64, x64 | `build-macos.yml` |
| Linux | x64, arm64 | `build-linux.yml` |
| Windows | x64, arm64 | `build-windows.yml` |

**Trigger**: Push tags matching `v*.*.*` (e.g., `v0.43.6`)

**Build Process**:
1. Checkout code
2. Setup Node.js 22.20.0 (from `.nvmrc`)
3. Cache node_modules
4. Install dependencies (if cache miss)
5. Run `make build` (builds extension + VS Code)
6. Create platform-specific package
7. Upload artifacts (1-day retention)
8. Create GitHub release (on success)

### Creating a Release

```bash
# Ensure everything is committed and pushed
git add . && git commit -m "Your changes"
git push origin main

# Create and push tag
git tag -a v0.43.7 -m "Release v0.43.7 - Description"
git push origin v0.43.7

# Monitor builds at:
# https://github.com/puku-sh/puku-vs-editor/actions
```

**Note**: Repository is public to get unlimited CI/CD minutes and artifact storage.

## Puku AI Backend Integration

**Backend API** (separate repo at `../puku-worker`):

The Puku backend is a Cloudflare Worker providing AI endpoints:

- **`/v1/fim/context`** - Fill-in-middle with context (used by inline completions)
- **`/v1/completions`** - Standard FIM endpoint
- **`/v1/chat/completions`** - Chat interface (used by Chat panel)
- **`/v1/summarize/batch`** - Code summarization for semantic search

**Models**:
- **Codestral Mamba** (`mistralai/codestral-2501`) - FIM with 256k context
- **GLM-4.6** - Chat with tool calling and vision (via Z.AI)

**Authentication**: Uses API key from `puku.apiKey` setting or environment

### Configuring Puku AI

In VS Code settings (`.vscode/settings.json`):

```json
{
  "puku.apiKey": "pk_your_api_key_here",
  "puku.apiEndpoint": "https://api.puku.sh"
}
```

The extension will:
- Send inline completion requests to `/v1/fim/context` with context
- Send chat requests to `/v1/chat/completions`
- Include language hints, imported files, and semantic search results

### Inline Completions (FIM)

**Architecture**: Enhanced approach inspired by GitHub Copilot and Cursor

**Key Features**:
1. **Language-aware**: Sends language hints to prevent wrong-language hallucinations
2. **Context-aware**: Includes imported files (3 max) + semantic search results (2 chunks)
3. **Speculative caching**: Prefetches next completion for instant follow-ups (<1ms)
4. **Smart debouncing**: 800ms delay + skip single-char changes to reduce API calls

**Performance**:
- Cache hit: ~0ms (instant)
- Cache miss: 800-1000ms (debounce + API)
- Overall UX: Competitive with Copilot

**Implementation**:
- Client: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`
- Backend: `../puku-worker/src/routes/completions.ts` → `/v1/fim/context`
- Model: Codestral Mamba (256k context)
- Tests: `src/chat/src/extension/pukuai/test/pukuInlineCompletionCache.spec.ts`

**Feature Gaps vs GitHub Copilot**: 12 missing features tracked in issues [#55-#66](https://github.com/puku-sh/puku-vs-editor/issues?q=is%3Aissue+is%3Aopen+label%3Aarea%3Ainline-completions)

## Development Workflow

### Build Commands

```bash
# Extension only (~2s)
cd src/chat
npm run compile          # Development build
npm run build           # Production build
npm run watch           # Watch mode

# Or use Makefile from repo root
make build-ext          # Build extension
make build-vs           # Build VS Code
make build              # Build both
```

### Testing

```bash
cd src/chat
npm run test:unit              # Unit tests (Node.js)
npm run test:extension         # Integration tests (VS Code)
npm run simulate              # Simulation tests (LLM-based, cached)
npm test                      # Run all tests
npm run lint                  # ESLint (zero warnings policy)
```

### Debugging

**Option 1: VS Code Insiders (Quick)**
- Run `cmd+shift+B` to start build
- Press F5 to launch extension host

**Option 2: Forked VS Code (Recommended)**

```bash
# Terminal 1: Watch extension
cd src/chat && npm run watch

# Terminal 2: Run Code-OSS with extension
cd src/vscode
./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
```

**Debug Configurations**:
- **Launch - Code OSS**: F5 to start Code-OSS with debugger attached
- **Attach - Code OSS**: Attach to running Code-OSS (port 5870)

**Tips**:
- Use "Show Chat Debug View" command to inspect prompts and tool calls
- Debug ports: Extension Host (5870), TypeScript Server (9223)
- Monitor `start-watch-tasks` VS Code task for real-time compilation errors

## Puku Indexing (Semantic Search)

Puku Editor includes a built-in semantic search system for codebase indexing using embeddings.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PUKU INDEXING SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│  PukuIndexingService                                         │
│  ├── AST-based code chunking (functions, classes, blocks)   │
│  ├── Batch embeddings via OpenRouter API                    │
│  ├── Cosine similarity search                               │
│  └── File watcher for incremental updates                   │
├─────────────────────────────────────────────────────────────┤
│  PukuEmbeddingsCache (SQLite)                               │
│  ├── Files table (uri, contentHash, lastIndexed)           │
│  ├── Chunks table (text, lineStart, lineEnd, embedding)    │
│  └── Automatic version-based schema migration              │
└─────────────────────────────────────────────────────────────┘
```

### Cache Versioning

The embeddings cache automatically rebuilds when:
- Extension version changes (from `package.json`)
- Schema version changes (internal `SCHEMA_VERSION`)

Cache version format: `{extension_version}-s{schema_version}` (e.g., `0.34.4-s1`)

### Commands

| Command | Description |
|---------|-------------|
| `puku.semanticSearch` | Search codebase semantically |
| `puku.reindex` | Force re-index the workspace |
| `puku.clearIndexCache` | Delete cache and rebuild |

### Key Files

- `src/extension/pukuIndexing/node/pukuIndexingService.ts` - Main indexing service
- `src/extension/pukuIndexing/node/pukuEmbeddingsCache.ts` - SQLite cache with version management
- `src/extension/pukuIndexing/node/pukuASTChunker.ts` - AST-based code chunking
- `src/extension/pukuIndexing/vscode-node/pukuIndexing.contribution.ts` - VS Code integration

### Cache Location

The SQLite database is stored at: `{workspace}/.puku/puku-embeddings.db`

### Vector Search with sqlite-vec

**sqlite-vec** is integrated for efficient KNN search (v0.34.7+):
- Pure C extension, works everywhere (Windows/Mac/Linux/WASM)
- KNN queries directly in SQL via `searchKNN()` method
- Uses mapping table (`VecMapping`) to link vec_chunks rowids to chunk IDs
- Requires Node.js 23.5.0+ for `node:sqlite` extension support
- Non-1024-dim embeddings fall back to in-memory cosine similarity

## Architecture Overview

### Directory Structure

The codebase is organized into three main layers:

**`src/extension/`** - Feature implementations organized by domain:

- `conversation/` - Chat participants, agents, conversation flow
- `intents/` - Chat participant/slash command implementations
- `prompts/` - TSX-based prompt engineering system
- `inlineChat/`, `inlineEdits/` - Inline editing features (`Ctrl+I`)
- `context/`, `typescriptContext/` - Context resolution and code analysis
- `tools/` - Language model tool integrations
- `search/`, `workspaceChunkSearch/`, `workspaceSemanticSearch/` - Search functionality
- `authentication/` - GitHub authentication and token management
- `endpoint/` - AI service endpoints and model selection
- `mcp/` - Model Context Protocol integration

**`src/platform/`** - Shared platform services:

- `chat/` - Core chat services
- `openai/` - OpenAI API protocol integration
- `embedding/` - Vector embeddings for semantic search
- `parser/` - Code parsing and AST analysis
- `search/`, `workspace/`, `git/`, `notebook/` - Platform integrations

**`src/util/`** - Infrastructure and utilities:

- `common/` - Shared utilities and service infrastructure
- `vs/` - Utilities from microsoft/vscode repo (readonly, managed by `script/setup/copySources.ts`)

### Runtime Layers

Code is organized by runtime target with clear dependencies:

- `common/` - JavaScript builtins only
- `vscode/` - VS Code APIs (can use `common`)
- `node/` - Node.js APIs (can use `common`)
- `vscode-node/` - VS Code + Node.js (can use all above)
- `worker/` - Web Worker APIs (can use `common`)
- `vscode-worker/` - VS Code + Web Worker (can use `common`, `vscode`, `worker`)

### Extension Activation

1. **Base Activation** (`src/extension/extension/vscode/extension.ts`)
2. **Service Registration** via `src/extension/extension/{vscode,vscode-node,vscode-worker}/services.ts`
3. **Contribution Loading** via `src/extension/extension/{vscode,vscode-node,vscode-worker}/contributions.ts`

Contributions and services automatically register based on runtime target.

### Prompts System

Prompts use TSX-based composition (`@vscode/prompt-tsx`):

- Prompts are `PromptElement` components with `render()` methods
- Messages have priorities for token budget management
- Components: `<SystemMessage>`, `<UserMessage>`, `<AssistantMessage>`
- Safety rules reused via `<SafetyRules>` component
- Async work done in optional `prepare()` method before sync `render()`

### Agent Mode

Key files for agent mode:

- `src/extension/prompts/node/agent/agentPrompt.tsx` - Main prompt entrypoint
- `src/extension/prompts/node/agent/agentInstructions.tsx` - System prompt
- `src/extension/intents/node/toolCallingLoop.ts` - Agentic loop
- `src/extension/conversation/vscode-node/chatParticipants.ts` - Participant registration

### Tools

Tools follow VS Code's Language Model Tool API:

- Defined in `package.json` (descriptions and schemas)
- Names in `src/extension/tools/common/toolNames.ts`
- Implementations in `src/extension/tools/node/`
- Some implement extended `ICopilotTool` interface for custom behavior
- See `docs/tools.md` for development guidelines

## Coding Standards

### TypeScript Style

- **Indentation**: Tabs (not spaces)
- **Naming**: `PascalCase` for types/enums, `camelCase` for functions/variables
- **Strings**: "double quotes" for user-facing, 'single quotes' for internal
- **Functions**: Arrow functions `=>` preferred
- **Braces**: Always use, opening brace on same line
- **Types**: Avoid `any`/`unknown`, use `readonly` when possible

### Arrow Functions

```typescript
x => x + x                    // ✓ Correct
(x, y) => x + y              // ✓ Correct
<T>(x: T, y: T) => x === y   // ✓ Correct
(x) => x + x                 // ✗ Wrong (unnecessary parens)
```

### Architecture Patterns

- **Service-oriented**: Dependency injection via `IInstantiationService`
- **Contribution-based**: Features self-register
- **Event-driven**: VS Code events and disposables
- **URI-based**: Use `URI` type instead of string paths
- **Service abstractions**: Use `IFileService` instead of node `fs`, etc.

## Validation Workflow

**ALWAYS check compilation before declaring work complete:**

1. Monitor `start-watch-tasks` task output for real-time errors
2. Fix all compilation errors before proceeding
3. DO NOT rely on `compile` task alone for validation

## Important Notes

- **VS Code utilities**: Use `src/util/vs/` utilities from microsoft/vscode repo. To add modules, edit `script/setup/copySources.ts` and run `npx tsx script/setup/copySources.ts`
- **Proposed APIs**: Extension uses many VS Code proposed APIs (see `.github/copilot-instructions.md` for details)
- **Web support**: Code should work in both Node.js and Web Worker runtimes when possible
- **Simulation tests**: LLM-based tests use cached results in `test/simulation/cache/`. Cache layers must be created by VS Code team members.
- **Troubleshooting**: Use "Show Chat Debug View" command to inspect prompts, tool calls, and responses

## Reference Documentation

- **CONTRIBUTING.md** - Detailed architecture and development guide
- **.github/copilot-instructions.md** - Comprehensive project overview and coding standards
- **docs/prompts.md** - Prompt engineering documentation
- **docs/tools.md** - Tool development guidelines
