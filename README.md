# Puku Editor

AI-powered code editor built on VS Code (Code-OSS) with GLM model support via Z.AI.

## Quick Start

### Prerequisites

- Node.js 23.5.0+ (`nvm install 23.5.0 && nvm use 23.5.0`)
- macOS 10.15+

### Build & Install

```bash
# 1. Build Code-OSS (first time only)
cd github/vscode
npm install
npm run compile

# 2. Build Puku Editor extension
cd github/editor
npm install
npm run compile

# 3. Build Puku.app and CLI
./build-app.sh

# 4. Install CLI globally
sudo cp build/puku /usr/local/bin/

# 5. (Optional) Install Puku.app to Applications
cp -R build/Puku.app /Applications/
```

### Launch

```bash
# Open current directory
puku .

# Open specific folder
puku /path/to/project

# Or use launch.sh for development
./launch.sh /path/to/project
```

## Project Structure

- `github/editor/` - Puku Editor extension (AI chat, FIM completions, semantic search)
- `github/vscode/` - Forked Code-OSS with UI modifications
- `github/proxy/` - Proxy server for Z.AI GLM models (optional)
- `build-app.sh` - Build script for Puku.app and CLI
- `launch.sh` - Development launcher

## Features

- **AI Chat** - Powered by GLM-4.6 via Z.AI or OpenRouter
- **Inline Completions (FIM)** - Native fill-in-middle via Codestral
- **Semantic Search** - AST-based code chunking with embeddings
- **Agent Mode** - Multi-step task execution with tool calling

## Configuration

See `github/editor/CLAUDE.md` for detailed configuration options including:
- Z.AI API setup
- OpenRouter integration
- Proxy server configuration

## Development

```bash
# Watch mode for extension development
cd github/editor
npm run watch

# Launch with debug output
./launch.sh
```

## License

See individual project directories for license information.
