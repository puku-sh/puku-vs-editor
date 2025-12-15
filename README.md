# Puku Editor

AI-powered VS Code extension and standalone editor with inline completions, chat, and semantic search.

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/puku-sh/puku-vs-editor.git
cd puku-vs-editor/puku-editor

# Install dependencies
cd src/chat && npm install
cd ../vscode && npm install

# Build and run
cd ../..
make build                    # Build extension + VS Code
./build-dmg-optimized.sh     # Create macOS installer (optional)
```

**📖 Full documentation:** See [CLAUDE.md](CLAUDE.md)

---

## Prerequisites

- **Node.js**: 23.5.0+ for extension, 22.20.0 for VS Code (use nvm)
- **Python**: 3.10-3.12 (for VS Code native modules)
- **Platform-specific**:
  - macOS: Xcode Command Line Tools
  - Linux: libx11-dev, libxkbfile-dev, libsecret-1-dev
  - Windows: Visual Studio Build Tools >=2019

```bash
# Install nvm (if needed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node versions
nvm install 23.5.0
nvm install 22.20.0
```

---

## Development

### Build Commands

```bash
# Build extension (~2s)
make build-ext

# Build VS Code (~5-10 min first time)
make build-vs

# Build both
make build

# Create macOS DMG (~20s)
./build-dmg-optimized.sh
# Output: Puku-1.107.0.dmg (~311MB)
```

### Development Workflow

```bash
# Terminal 1: Watch extension
cd src/chat && npm run watch

# Terminal 2: Run Code-OSS with extension
cd src/vscode
./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
```

### Testing

```bash
cd src/chat
npm run test:unit         # Unit tests
npm run test:extension    # Integration tests
npm test                  # All tests
npm run lint              # ESLint
```

### Debugging

- Use "Show Chat Debug View" command to inspect prompts and tool calls
- Extension debug port: 5870
- See [CLAUDE.md](CLAUDE.md) for detailed debugging setup

## Project Structure

```
puku-vs-editor/puku-editor/
├── src/
│   ├── chat/                    # Puku Editor extension
│   │   ├── src/extension/       # Extension source code
│   │   ├── dist/                # Compiled bundles (22MB+)
│   │   ├── package.json         # 120 dependencies
│   │   └── .esbuild.ts          # Build configuration
│   └── vscode/                  # Forked VS Code (Code-OSS)
│       ├── src/                 # VS Code source
│       └── .nvmrc               # Node 22.20.0
├── .github/workflows/           # CI/CD (6 platforms)
├── Makefile                     # Build automation
├── build-dmg-optimized.sh       # macOS packaging
└── CLAUDE.md                    # Full documentation
```

## Features

### 🤖 AI-Powered Coding

**Inline Completions (FIM)**:
- Context-aware code completions with Codestral Mamba (256k context)
- Language hints to prevent hallucinations
- Speculative caching for instant follow-ups (<1ms)
- Smart debouncing (800ms) to reduce API calls

**Chat Interface**:
- AI chat powered by GLM-4.6 (tool calling + vision)
- Agent mode with tool calling
- Context from imports + semantic search

**Semantic Search**:
- AST-based code chunking
- Vector embeddings with sqlite-vec
- Automatic workspace indexing
- Cache: `{workspace}/.puku/puku-embeddings.db`

### 🔧 Commands

- `puku.auth.signIn` / `puku.auth.signOut` - Authentication
- `puku.semanticSearch` - Search codebase semantically
- `puku.reindex` - Force re-index workspace
- `puku.clearIndexCache` - Clear embeddings cache

### ⚙️ Configuration

In VS Code settings (`.vscode/settings.json`):

```json
{
  "puku.apiKey": "pk_your_api_key_here",
  "puku.apiEndpoint": "https://api.puku.sh"
}
```

---

## CI/CD & Releases

### Automated Builds

GitHub Actions builds for 6 platforms on every release tag:

| Platform | Architectures |
|----------|--------------|
| macOS | arm64, x64 |
| Linux | x64, arm64 |
| Windows | x64, arm64 |

**Creating a Release**:

```bash
# Tag and push
git tag -a v0.43.7 -m "Release v0.43.7 - Description"
git push origin v0.43.7

# Monitor builds at:
# https://github.com/puku-sh/puku-vs-editor/actions
```

### Local macOS Build

```bash
# Create DMG installer (~20s)
./build-dmg-optimized.sh

# Output: Puku-1.107.0.dmg (~311MB)
```

**DMG Features**:
- ✅ Self-contained app bundle (872MB)
- ✅ Compressed DMG (311MB)
- ✅ Puku Editor extension pre-installed
- ✅ 29 core VS Code extensions included
- ✅ Custom Puku branding and icons

---

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete development guide
- **[src/chat/CONTRIBUTING.md](src/chat/CONTRIBUTING.md)** - Architecture details
- **[src/chat/.github/copilot-instructions.md](src/chat/.github/copilot-instructions.md)** - Coding standards

## License

MIT License - See individual project directories for details.
