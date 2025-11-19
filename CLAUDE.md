# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This workspace contains multiple projects:

- **`github/puku-editor`** - **Puku Editor** - AI-powered code editor built on GitHub Copilot Chat architecture with support for Z.AI's GLM models. Provides chat interfaces, inline completions (FIM), agent mode, and tool calling.
- **`github/co-proxy`** - Ollama-compatible proxy server that bridges VS Code extensions with Z.AI's GLM models (GLM-4.6, GLM-4.5, GLM-4.5-Air)
- **`github/vscode-copilot-chat`** - Reference copy of the official vscode-copilot-chat repository

## Requirements

- Node 22.x
- Python >= 3.10, <= 3.12
- Git Large File Storage (LFS) - for running tests
- (Windows) Visual Studio Build Tools >=2019 - for building with node-gyp

## Common Commands

### Setup

```bash
npm install
npm run get_token
```

**Z.AI API Key** (for GLM 4.6 model):

```text
bb67b33d81b74ae7a5882c94f222f2a8.ZNWzVkKE0V1rz0m9
```

**Copilot Proxy Features:**

- `/v1/chat/completions` - Chat interface (works with Copilot Chat panel) ✅ Working
- `/v1/completions` - Fill-In-Middle (FIM) for inline code suggestions ✅ Working
- Ollama API compatible endpoints (`/api/tags`, `/api/show`, etc.)
- Supports GLM-4.6, GLM-4.5, GLM-4.5-Air models

**To run the proxy:**

```bash
cd github/co-proxy
export ZAI_API_KEY="bb67b33d81b74ae7a5882c94f222f2a8.ZNWzVkKE0V1rz0m9"
uv run copilot-proxy --host 127.0.0.1 --port 11434
```

**Currently running:** PID 51318 on `http://127.0.0.1:11434`

**Using the Proxy with Puku Editor:**

Puku Editor (in `github/puku-editor`) has built-in Ollama support. To use GLM models:

1. **Build and run the extension:**

   ```bash
   cd github/puku-editor
   npm install
   npm run compile
   ```

2. **Configure VS Code to use the proxy:**

   Add to `.vscode/settings.json` or user settings:

   ```json
   {
     "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
   }
   ```

   The extension will automatically discover GLM models from the proxy:

   - GLM-4.6 (flagship with tool calling and vision)
   - GLM-4.5 (balanced performance)
   - GLM-4.5-Air (lightweight, faster)

3. **Select Ollama provider in Chat:**

   - Open Copilot Chat panel
   - Click on the current model name
   - Click "Manage Models..."
   - Select "Ollama" from the list of providers
   - Choose your preferred GLM model

**How it works:**

The extension's `OllamaLMProvider` (in `src/extension/byok/vscode-node/ollamaProvider.ts`) will:

- Query `/api/version` to check compatibility (our proxy returns 0.6.4)
- Fetch models from `/api/tags` (returns GLM-4.6, GLM-4.5, GLM-4.5-Air)
- Get model details from `/api/show` (returns capabilities: tools, vision, context length)
- Send chat requests to `/v1/chat/completions` for Chat panel
- Send completion requests to `/v1/completions` for inline suggestions

**FIM Implementation Details:**

The proxy converts GitHub Copilot's FIM (Fill-In-Middle) completion requests to chat format:

- **Without suffix**: Simple code continuation prompt
- **With suffix**: Uses `<CODE_BEFORE>` and `<CODE_AFTER>` markers to clearly delineate context
- Tested and verified working for both simple and complex completions

Example test:

```bash
# Simple completion
curl -X POST http://localhost:11434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"prompt": "def hello():", "suffix": "", "max_tokens": 50, "stream": false}'

# FIM with suffix
curl -X POST http://localhost:11434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"prompt": "def fibonacci(n):", "suffix": "\n    return result", "max_tokens": 200, "stream": false}'
```

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

- Use "Launch Copilot Extension - Watch Mode" or "Launch Copilot Extension" debug configurations
- Run `cmd+shift+B` to start build task
- Use "Show Chat Debug View" command to inspect prompts, tool calls, and responses

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
