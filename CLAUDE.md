# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Puku Editor** monorepo containing:

- **`src/chat`** - **Puku Editor Extension** - AI-powered VS Code extension built on GitHub Copilot Chat architecture. Provides chat interface, inline completions (FIM), agent mode, and tool calling.
- **`src/vscode`** - **Forked VS Code** (Code-OSS) - Custom VS Code build for bundling and packaging the extension as a standalone application.
- **Backend API** - Puku backend API (separate repo at `../puku-worker`) provides completions, FIM, embeddings, and authentication endpoints.

## Repository Structure

```
puku-vs-editor/
├── src/
│   ├── chat/              # Puku Editor extension source
│   │   ├── src/           # TypeScript source
│   │   ├── dist/          # Compiled bundles (22MB+)
│   │   ├── package.json   # Extension dependencies
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
├── launch.sh             # Launch Code-OSS with extension
├── build-dmg-optimized.sh # macOS DMG packaging
├── build-linux-optimized.sh # Linux tar.gz packaging
└── CLAUDE.md             # This file
```

## Requirements

- **Node.js**: 23.5.0+ for extension (sqlite-vec support), 22.20.0 for VS Code (managed by nvm)
- **Python**: >= 3.10, <= 3.12 (for VS Code native modules)
- **Git LFS**: For running tests
- **Platform-specific**:
  - macOS: Xcode Command Line Tools
  - Linux: libx11-dev, libxkbfile-dev, libsecret-1-dev
  - Windows: Visual Studio Build Tools >=2019

### Node.js Version Management

The project uses different Node.js versions:
- **Extension**: Node 23.5.0+ (required for sqlite-vec extension support)
- **VS Code**: Node 22.20.0 (from src/vscode/.nvmrc)

The build system automatically switches versions using nvm:
```bash
# Install required versions
nvm install 23.5.0
nvm install 22.20.0

# The Makefile handles version switching automatically
make build-ext    # Uses Node 23.5.0 (for sqlite-vec)
make build-vs     # Uses Node 22.20.0 (VS Code requirement)
make install      # Runs install-extension + install-vscode
```

**Note**: If nvm is not available, the Makefile falls back to using the current Node.js version, but this is not recommended.

## Quick Start

### First-Time Setup (Automated)

```bash
# One-command setup (install + compile + launch)
make setup

# Manual setup steps
make install           # Install all dependencies
make compile           # Build extension + VS Code
make launch            # Launch the editor
```

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
# Option 1: Use the convenience script from repo root
./launch.sh

# Option 2: Manual launch
cd src/vscode
./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
```

### Common Development Workflows

**Fast Development Loop**:
```bash
# Terminal 1: Watch extension for changes
cd src/chat && npm run watch

# Terminal 2: Launch editor (no recompile)
make quick
```

**Package Testing**:
```bash
# Fast edit-test cycle for packaged builds
make build-minimal      # Build extension + package (~16s)
make launch-package     # Test packaged build
```

**Watch Mode Development**:
```bash
# Auto-rebuild on file changes
make build-watch        # Parallel watch for extension + VS Code
```

### Build & Package

```bash
# Full build (extension + VS Code)
make build

# Incremental builds (smart + fast)
make build-ext          # Extension only (~5s with cache)
make build-vs           # VS Code only
make build-minimal      # Extension + package (~16s)

# Create platform packages
./build-dmg-optimized.sh    # macOS DMG (~20s, 311MB) - requires gulp build first
./build-linux-optimized.sh  # Linux .deb (~30s) - requires gulp build first
# Output: Puku-1.107.0.dmg / puku-editor_1.107.0_amd64.deb

# Package workflows
make package            # Full build + package (~57min first time)
make package-ci         # Fast package only (~11s, requires .build/)
make clean-package      # Remove packaged apps
```

## CI/CD & Releases

### GitHub Actions Workflows

The project builds for 6 platforms via GitHub Actions on self-hosted runners (Namespace.so):

| Platform | Architectures | Workflow |
|----------|--------------|----------|
| macOS | arm64, x64 | `build-macos.yml` |
| Linux | x64, arm64 | `build-linux.yml` |
| Windows | x64, arm64 | `build-windows.yml` |

**Triggers**:
- Push tags matching `v*.*.*` (e.g., `v0.43.6`) - creates release
- Push to `feat/ubuntu` branch - Linux builds only
- Manual workflow dispatch - for testing specific architectures

**Build Process** (Linux example - applies similarly to macOS/Windows):
1. Checkout code
2. Setup Node.js 22.20.0 (from `src/vscode/.nvmrc`) with npm cache
3. Setup Python 3.11
4. Install system dependencies (`build-essential`, `libx11-dev`, `libxkbfile-dev`, `libsecret-1-dev`)
5. Cache node_modules (extension + VS Code)
6. Cache VS Code build output (saves 30-60 minutes)
7. Install dependencies with `make install` (if cache miss) - retries up to 5 times
8. **Important**: The Makefile `install` target automatically switches Node.js versions:
   - Extension: Node 23.5.0+ (for sqlite-vec)
   - VS Code: Node 22.20.0 (from `.nvmrc`)
9. Create VS Code production build using `npx gulp vscode-linux-{arch}`
10. Create optimized .deb package using `./build-linux-optimized.sh`
11. Upload artifacts (1-day retention)
12. Create GitHub release (on tag push)

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

### Current Branch Status

- `feat/ubuntu` - Linux build development (triggers Linux builds on push)
- `main` - Main development branch (full CI/CD on tag push)

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
npm run simulate-require-cache # Verify simulation cache is populated
npm run simulate-update-baseline # Update simulation baseline
npm test                      # Run all tests
npm run lint                  # ESLint (zero warnings policy)
```

### Running Single Tests

```bash
# Run specific unit test file
cd src/chat
npm run test:unit -- path/to/test.spec.ts

# Run specific extension test
npm run test:extension -- --grep "test name"

# Run simulation tests for specific scenario
npm run simulate -- path/to/test.stest.ts
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

# Or use the convenience script from repo root:
./launch.sh
```

**Debug Configurations**:
- **Launch - Code OSS**: F5 to start Code-OSS with debugger attached
- **Attach - Code OSS**: Attach to running Code-OSS (port 5870)

**Tips**:
- Use "Show Chat Debug View" command to inspect prompts and tool calls
- Debug ports: Extension Host (5870), TypeScript Server (9223)
- Monitor `start-watch-tasks` VS Code task for real-time compilation errors

**Alternative Launch Methods**:

```bash
# Using Makefile (from repo root)
make quick               # Kill existing processes and launch
make launch              # Launch development build
make launch-package      # Launch packaged build (if built)

# With specific folder
make launch FOLDER=/path/to/project
./launch.sh /path/to/project
```

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

## Key Files & Entry Points

### Extension Core
- `src/chat/src/extension/extension/vscode/extension.ts` - Extension activation entry point
- `src/chat/src/extension/extension/vscode-node/services.ts` - Service registration
- `src/chat/src/extension/extension/vscode-node/contributions.ts` - Feature contributions
- `src/chat/package.json` - Extension manifest and VS Code contributions

### Build & Configuration
- `Makefile` - Build automation with comprehensive targets
- `src/chat/.esbuild.ts` - Extension bundler configuration
- `src/chat/tsconfig.json` - TypeScript configuration
- `launch.sh` - Convenience script for launching Code-OSS with extension

### AI Integration
- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` - Inline completions (FIM)
- `src/chat/src/extension/prompts/node/agent/` - Agent mode prompts and instructions
- `src/chat/src/extension/tools/node/` - Language model tool implementations

### Key Development Entry Points

**For Chat/AI Features**:
- Start in `src/chat/src/extension/conversation/` for chat participants
- Modify `src/chat/src/extension/prompts/` for prompt engineering
- Update `src/chat/src/extension/intents/` for slash command implementations

**For Inline Completions**:
- Edit `src/chat/src/extension/pukuai/` for FIM functionality
- Cache logic in `src/chat/src/extension/pukuai/test/pukuInlineCompletionCache.spec.ts`

**For Search & Context**:
- Semantic search in `src/chat/src/extension/workspaceSemanticSearch/`
- Context resolution in `src/chat/src/extension/context/`
- AST parsing in `src/chat/src/extension/pukuIndexing/node/pukuASTChunker.ts`

## Validation Workflow

**ALWAYS check compilation before declaring work complete:**

1. Monitor `start-watch-tasks` task output for real-time errors
2. Fix all compilation errors before proceeding
3. DO NOT rely on `compile` task alone for validation

## Troubleshooting

### Common Issues

**Build Failures**:
- Ensure correct Node.js version: `nvm use 23.5.0` for extension, `nvm use 22.20.0` for VS Code
- Run `make clean` before rebuilding if experiencing cache issues
- Check `start-watch-tasks` output for real-time compilation errors

**Extension Not Loading**:
- Verify extension path: `ls -la src/chat/dist/extension.js`
- Check VS Code version compatibility (requires ^1.107.0)
- Use "Show Chat Debug View" command to inspect loading errors

**sqlite-vec Issues**:
- Requires Node.js 23.5.0+ for `node:sqlite` extension support
- Falls back to in-memory cosine similarity for non-1024-dim embeddings
- Clear cache: `rm -rf {workspace}/.puku/puku-embeddings.db`

**Memory Issues**:
- Increase Node.js memory: `export NODE_OPTIONS="--max-old-space-size=16384"`
- Monitor memory usage during packaging builds

**VS Code Fork Issues**:
- Update fork: `make update-fork` (merges upstream VS Code changes)
- Clean build: `make clean-all` then `make package-full`

### Debug Commands

```bash
# Check extension loading
code --extensionDevelopmentPath=$(pwd)/src/chat --verbose

# Monitor compilation
# Start "start-watch-tasks" VS Code task and watch output

# Inspect prompts and tool calls
# Run "Show Chat Debug View" command in VS Code

# Test sqlite-vec functionality
cd src/chat && npm run test:unit -- pukuEmbeddingsCache
```

## Important Notes

- **VS Code utilities**: Use `src/util/vs/` utilities from microsoft/vscode repo. To add modules, edit `script/setup/copySources.ts` and run `npx tsx script/setup/copySources.ts`
- **Proposed APIs**: Extension uses many VS Code proposed APIs (see `.github/copilot-instructions.md` for details)
- **Web support**: Code should work in both Node.js and Web Worker runtimes when possible
- **Simulation tests**: LLM-based tests use cached results in `test/simulation/cache/`. Cache layers must be created by VS Code team members.
- **Performance**: Use incremental builds (`make build-ext`) for faster development cycles

## Reference Documentation

- **CONTRIBUTING.md** - Detailed architecture and development guide
- **.github/copilot-instructions.md** - Comprehensive project overview and coding standards
- **docs/prompts.md** - Prompt engineering documentation
- **docs/tools.md** - Tool development guidelines
