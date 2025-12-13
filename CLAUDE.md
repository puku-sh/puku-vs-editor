# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This workspace contains multiple projects:

- **`src/chat`** - **Puku Editor** - AI-powered code editor extension built on GitHub Copilot Chat architecture with support for Z.AI's GLM models. Provides chat interfaces, inline completions (FIM), agent mode, and tool calling.
- **`src/vscode`** - **Forked VS Code** (Code-OSS) from `poridhiAILab/vscode`. Custom VS Code build for UI modifications and extension debugging.
- **`../puku-worker`** - **Puku Backend API** - Cloudflare Worker that provides API endpoints for completions, FIM, embeddings, and authentication (if present).

## Requirements

- **Node.js Dual Version Setup:**
  - **Node 23.5.0+** (extension) - Required for sqlite-vec extension support
  - **Node 22.20.0+** (VS Code) - Required for VS Code compilation
  - Managed automatically via Makefile with nvm
- Python >= 3.10, <= 3.12
- Git Large File Storage (LFS) - for running tests
- (Windows) Visual Studio Build Tools >=2019 - for building with node-gyp

## Common Commands

### Quick Start (First Time Setup)

```bash
make setup              # ONE-COMMAND setup: installs deps + compiles + launches
```

### Development Workflow

```bash
make compile            # Compile extension + VS Code
make all                # Compile everything and launch IDE
make run                # Kill existing, compile, and launch
make quick              # Kill and launch (no compilation)
make watch-extension    # Start extension watch mode (Terminal 1)
```

### Individual Commands

```bash
make install            # Install all dependencies (extension + VS Code)
make compile-extension  # Compile only the extension
make compile-vscode     # Compile only VS Code
make postinstall-extension # Run extension postinstall after build
make launch             # Launch editor (no build)
make launch FOLDER=/path # Launch with specific folder
make kill               # Kill all running Electron processes
make clean              # Clean build artifacts
make test               # Run tests
```

### Extension-Specific Commands (in `src/chat/`)

```bash
npm run compile         # Development build
npm run build          # Production build
npm run watch          # Watch all (runs watch:* scripts in parallel)
npm run test:unit      # Unit tests (Node.js)
npm run test:extension # Integration tests (VS Code)
npm run simulate       # Simulation tests (LLM-based, cached)
npm run lint           # ESLint with zero warnings policy
```

### VS Code Tasks

Use the `start-watch-tasks` VS Code task to monitor compilation errors in real-time. This runs:

- `npm: watch:tsc-extension`
- `npm: watch:tsc-extension-web`
- `npm: watch:tsc-simulation-workbench`
- `npm: watch:esbuild`

**Z.AI API Key** (for GLM 4.6 model):

```text
bb67b33d81b74ae7a5882c94f222f2a8.ZNWzVkKE0V1rz0m9
```

## Puku AI Integration

### Built-in AI Support

Puku Editor has built-in Puku AI support with Z.AI's GLM models:

1. **Build and run:**

   ```bash
   make setup              # First time setup
   make watch-extension    # Start development watch mode
   make launch             # Launch Puku Editor
   ```

2. **Configure VS Code to use the Puku proxy:**

   Add to `.vscode/settings.json` or user settings:

   ```json
   {
     "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
   }
   ```

3. **Select Ollama provider in Chat:**

   - Open Copilot Chat panel
   - Click on the current model name
   - Click "Manage Models..."
   - Select "Ollama" from providers
   - Choose GLM-4.6, GLM-4.5, or GLM-4.5-Air

### AI Features

- **Chat Interface**: Conversational AI with multiple participants
- **Inline Completions**: GitHub Copilot-style code suggestions (FIM)
- **Agent Mode**: Multi-step autonomous coding tasks
- **Semantic Search**: AST-based code indexing with vector embeddings
- **Tool Calling**: Integration with external tools and APIs

### Backend API

The Puku Worker backend provides:

- `/v1/chat/completions` - Chat completions
- `/v1/completions` - Fill-in-middle for inline suggestions
- `/v1/fim/context` - Enhanced FIM with context support
- `/v1/summarize/batch` - Code summarization for semantic search

**How it works:**

The extension's `OllamaLMProvider` (in `src/extension/byok/vscode-node/ollamaProvider.ts`) will:

- Query `/api/version` to check compatibility (our proxy returns 0.6.4)
- Fetch models from `/api/tags` (returns GLM-4.6, GLM-4.5, GLM-4.5-Air)
- Get model details from `/api/show` (returns capabilities: tools, vision, context length)
- Send chat requests to `/v1/chat/completions` for Chat panel
- Send completion requests to `/v1/completions` for inline suggestions

**FIM Implementation (Enhanced Copilot Approach with Context):**

Puku uses an enhanced approach inspired by Copilot and Cursor with smart context gathering:

- **Model**: Codestral Mamba (`mistralai/codestral-2501`) with 256k context window
- **Client**: Prefix/suffix extraction + import-based context + semantic search
- **Backend**: `/v1/fim/context` endpoint with language hints and context support
- **Rate Limiting**: 800ms debounce + single-char change skip + speculative caching
- **Intelligence**: Combines model's 256k context with relevant code snippets

**Architecture:**
```typescript
// Client (pukuInlineCompletionProvider.ts):
// 1. Check speculative cache FIRST (bypass debounce if hit)
if (cache.has(lastCompletionId)) {
    return await cache.request(lastCompletionId); // Instant!
}

// 2. Debounce check (only for cache misses)
if (now - lastRequestTime < 800ms) return null;

// 3. Gather context
const importedFiles = await getImportedFilesContent(document, 3, 500);
const semanticFiles = await semanticSearch(currentLine, 2, languageId);

// 4. Call FIM with context + language hint
await fetch('/v1/fim/context', {
    prompt: prefix,
    suffix: suffix,
    openFiles: [...importedFiles, ...semanticFiles],
    language: document.languageId, // NEW: Language hint for model
    max_tokens: 100,
    temperature: 0.1
});

// Backend (puku-worker):
// Prepends language comment: "// Language: Go"
// Includes context from openFiles
// Calls Codestral Mamba with enhanced prompt
```

**Backend API (puku-worker):**

The backend is a Cloudflare Worker located at `../puku-worker`. Key endpoints:

- `/v1/fim/context` - FIM with context support (used by Puku Editor)
  - **Location**: `src/routes/completions.ts:222-392`
  - **Accepts**: `{ prompt, suffix, language, openFiles, max_tokens, temperature, n }`
  - **Returns**: `{ choices: [{ text, index, finish_reason }] }`
  - **Model**: Mistral Codestral via `env.CODESTRAL_FIM_URL`

- `/v1/completions` - Standard FIM endpoint
  - **Location**: `src/routes/completions.ts:119-219`

- `/v1/chat/completions` - Chat completions (for Chat panel)
  - **Location**: `src/routes/completions.ts:9-116`

- `/v1/summarize/batch` - Code summarization for semantic search
  - **Location**: `src/routes/completions.ts:536-642`

**To modify backend code:**
```bash
cd ../puku-worker
# Edit src/routes/completions.ts
npm run deploy  # Deploy to Cloudflare Workers
```

**Example:**
```bash
# With language hint and context
curl -X POST https://api.puku.sh/v1/fim/context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pk_xxx" \
  -d '{
    "prompt": "func main() {\n\t",
    "suffix": "",
    "language": "go",
    "openFiles": [
      {"filepath": "user.go", "content": "type User struct {...}"}
    ],
    "max_tokens": 100,
    "temperature": 0.1
  }'
```

**Key Features (2025-11-28 Updates):**

1. **Language-Aware Completions** ✅
   - Client sends `language: "go"` to backend
   - Backend prepends `// Language: Go` to prompt
   - Fixes wrong-language hallucinations (Kotlin in Go files)

2. **Smart Context Filtering** ✅
   - **Import-based**: Extracts and includes imported files (up to 3 files, 500 chars each)
   - **Semantic search**: Finds similar code chunks using embeddings (2 chunks max)
   - **Overlap detection**: Excludes chunks containing cursor position
   - Filters out duplicates to avoid confusing model

3. **Speculative Caching (Copilot-style)** ✅
   - Stores REQUEST FUNCTIONS, not results
   - Cache check happens BEFORE debounce
   - Cache hit → Instant completion (bypasses 800ms debounce)
   - Cache miss → Apply debounce + fetch from API
   - Automatically prefetches next completion after user accepts

4. **Aggressive Rate Limiting** ✅
   - 800ms debounce between requests (up from 200ms)
   - Skip single-character changes (user still typing)
   - Reduces API calls while maintaining responsiveness

**Performance Characteristics:**
- **Cache hit**: ~0ms (instant, bypasses debounce)
- **Cache miss**: 800ms debounce + 500-1000ms API call
- **Context gathering**: <50ms (import extraction + semantic search)
- **Overall UX**: Competitive with Copilot (783-1883ms average)

**Why this approach:**
- ✅ Language hints eliminate hallucinations
- ✅ Import context improves relevance
- ✅ Semantic search finds similar patterns
- ✅ Speculative caching enables instant follow-up completions
- ✅ Smart debounce reduces API costs without hurting UX
- ✅ Overlap filtering avoids duplicate suggestions
- ✅ Proven architecture (Copilot + Cursor hybrid)

**Tests:**
- Speculative caching flow: `src/chat/src/extension/pukuai/test/pukuInlineCompletionCache.spec.ts`
- 11 tests covering cache behavior, debounce, and request flow

See `test-supermaven/FINDINGS.md` for research and rationale.

**Feature Gaps vs GitHub Copilot:**

We've analyzed Puku's inline completion system against Copilot and identified 12 missing features. See:
- **GitHub Issues**: [#55-#66](https://github.com/puku-sh/puku-vs-editor/issues?q=is%3Aissue+is%3Aopen+label%3Aarea%3Ainline-completions)
- **PRD Example**: `src/chat/docs/prd-forward-stability.md` (enableForwardStability flag)

**Priority Roadmap:**
1. 🔴 **Critical**: Forward stability (#55), Rejection tracking (#56), Typing-as-suggested (#57)
2. 🟠 **High**: Edit rebasing cache (#58), Reduce diagnostics delay (#59), Streaming responses (#60)
3. 🟡 **Medium**: 3-provider racing (#61), Server-side trimming (#62), Indentation hints (#63), Multiple completions (#64)
4. 🟢 **Low**: Edit survival tracking (#65), Advanced telemetry (#66)

### Build & Development

```bash
npm run compile          # Development build
npm run build           # Production build
npm run watch           # Watch all (runs watch:* scripts in parallel)
```

Use the `start-watch-tasks` VS Code task to monitor compilation errors in real-time. This runs:

- `npm: watch:tsc-extension`
- `npm: watch:tsc-extension-web`
- `npm: watch:tsc-simulation-workbench`
- `npm: watch:esbuild`

### Testing

```bash
npm run test:unit              # Unit tests (Node.js)
npm run test:extension         # Integration tests (VS Code)
npm run simulate              # Simulation tests (LLM-based, cached)
npm run simulate-require-cache # Verify simulation cache is populated
npm run simulate-update-baseline # Update simulation baseline
npm test                      # Run all tests
```

### Code Quality

```bash
npm run lint               # ESLint with zero warnings policy
```

### Debugging

There are two ways to debug the Puku Editor extension:

#### Option 1: Debug with VS Code Insiders (Quick)

- Use "Launch Puku Editor Extension - Watch Mode" debug configuration
- Run `cmd+shift+B` to start build task
- Press F5 to launch

#### Option 2: Debug with Forked VS Code (Code-OSS) - Recommended

Use this for full development workflow with UI modifications and extension debugging.

**Setup forked VS Code (first time only):**

```bash
cd src/vscode
source ~/.nvm/nvm.sh && nvm use 22.20.0
npm i                    # Install dependencies
npm run compile          # Build VS Code (takes ~5-10 min first time)
```

**Running forked VS Code with Puku Editor extension:**

```bash
# Terminal 1: Watch and build the extension
cd src/chat
npm run watch

# Terminal 2: Run forked VS Code with extension loaded
cd src/vscode
source ~/.nvm/nvm.sh && nvm use 22.20.0
./scripts/code.sh --extensionDevelopmentPath=/path/to/puku-editor/src/chat
```

Or use the full path:
```bash
./scripts/code.sh --extensionDevelopmentPath=/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat
```

**Debug configurations (from `src/chat/.vscode/launch.json`):**

| Configuration | Description |
|--------------|-------------|
| "Launch Puku Editor Extension - Watch Mode - Code OSS" | Launches forked VS Code with extension and debugger attached |
| "Attach to Extension Host - Code OSS" | Attach debugger to already running Code-OSS (port 5870) |

**To debug with breakpoints:**

1. Open `src/chat` in your regular VS Code
2. Run `npm run watch` in terminal (or use `cmd+shift+B`)
3. Select **"Launch Puku Editor Extension - Watch Mode - Code OSS"** from debug panel
4. Press F5 - forked VS Code launches with extension loaded
5. Set breakpoints in your extension code - they will hit when triggered in Code-OSS

**Quick Start (all-in-one command):**

```bash
# From puku-editor root
cd src/vscode && source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
```

#### Debugging Tips

- Use "Show Chat Debug View" command to inspect prompts, tool calls, and responses
- Debug port for Code-OSS extension host: `5870`
- Debug port for TypeScript Server: `9223`
- If Code-OSS fails to start, ensure Node 22.20.0+ is active (`node -v`)

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

## Known Issues & Solutions

### Common Build Issues

**1. "source: not found" Error**
- **Cause**: Makefile uses `source` command which doesn't exist in `/bin/sh`
- **Solution**: Already fixed - Makefile now uses `bash -c '. ~/.nvm/nvm.sh && ...'`

**2. "Missing script: compile" Error**
- **Cause**: Extension package.json was corrupted/minified, missing dependencies and scripts
- **Solution**: Restored from git: `git show d71bd723:src/chat/package.json > package.json`

**3. "Cannot find module './build/gulpfile.mjs'" Error**
- **Cause**: VS Code gulpfile trying to import compiled JavaScript that doesn't exist
- **Solution**: Renamed `gulpfile.mjs` to `gulpfile.js` and use tsx for TypeScript execution

**4. "No checksum found for electron-v39.2.0-linux-x64.zip" Error**
- **Cause**: Version mismatch between `.npmrc` (v39.2.0) and checksum file (v39.2.3)
- **Solution**: Updated `.npmrc` target version from "39.2.0" to "39.2.3"

**5. "Missing script: build" in VS Code package.json**
- **Cause**: VS Code scripts using `node` on TypeScript files
- **Solution**: Updated scripts to use `npx tsx` for TypeScript execution

### Critical Setup Requirements

**Always run setup in correct order:**
```bash
# The complete setup flow that works:
make setup               # Does: install-extension → install-vscode → compile-extension → compile-vscode → postinstall-extension → launch

# If individual steps fail:
make clean               # Clean all artifacts
make install             # Install all dependencies
make compile             # Build everything
make launch              # Launch editor
```

**Electron Download Issues:**
- Electron binaries are large (~100MB) and may take time to download
- Check if `.build/electron/` directory exists after `npm run electron`
- If download fails, try `rm -rf .build/electron && npm run electron`

### Development Debugging

**Extension Debugging:**
- Debug port: `5870` (extension host)
- TypeScript Server debug port: `9223`
- Use "Show Chat Debug View" command to inspect AI prompts/responses

**VS Code Build Debugging:**
- Monitor `start-watch-tasks` VS Code task for real-time compilation errors
- Never rely on `compile` task alone for validation
- Check `.build/electron/` directory if Electron fails to launch

### Performance Notes

**Expected Build Times:**
- First-time setup: 5-10 minutes (includes Electron download)
- Subsequent compiles: 1-3 minutes (VS Code) + 30 seconds (extension)
- Extension watch mode: Near-instant for changes

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
