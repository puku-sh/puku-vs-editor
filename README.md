# Puku Editor

AI-powered code editor built on VS Code (Code-OSS) with integrated Puku authentication and semantic search.

## 🚀 Quick Start (One Command)

```bash
# Clone and run everything automatically
git clone https://github.com/puku-sh/puku-vs-editor.git
cd puku-vs-editor/puku-editor
make setup
```

That's it! The Makefile will:
1. Clone the VS Code fork (if needed)
2. Install all dependencies
3. Compile everything
4. Launch the editor

**📖 Full documentation:** See [SETUP.md](SETUP.md)

---

## Prerequisites

### Required Node.js Versions

**IMPORTANT**: Different Node versions are required for different components:

- **Extension (src/chat)**: Node.js **23.5.0** (required for sqlite-vec)
- **VS Code (src/vscode)**: Node.js **22.20.0** (as specified in .nvmrc)

The Makefile handles this automatically by switching Node versions for each build step.

### Other Requirements

- **Python 3.10-3.12**
- **nvm** (Node version manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install both required Node versions
nvm install 23.5.0
nvm install 22.20.0

# Default to 22.20.0 for VS Code
nvm use 22.20.0
```

---

## Development Workflow

### Using Makefile (Recommended)

```bash
# First time setup (automatic)
make setup

# Compile and launch
make all

# Quick rebuild
make compile-ext && make quick

# View all commands
make help
```

### Manual Setup

See [SETUP.md](SETUP.md) for detailed manual setup instructions.
cd ../chat
npm run compile

cd ../vscode
npm run compile  # Takes ~2 minutes first time

# 3. Launch with extension
cd ../..
./launch.sh
```

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (extension + VS Code) |
| `make run` | Kill existing processes, compile everything, and launch |
| `make run FOLDER=/path` | Kill, compile, and launch with specific folder |
| `make compile` | Compile both extension and VS Code |
| `make compile-ext` | Compile only the Puku Editor extension (alias) |
| `make compile-vs` | Compile only VS Code (alias) |
| `make compile-extension` | Compile only the Puku Editor extension |
| `make compile-vscode` | Compile only VS Code (Code-OSS) |
| `make launch` | Launch Code-OSS with extension |
| `make launch FOLDER=/path` | Launch with specific folder |
| `make quick` | Kill and launch without compilation |
| `make kill` | Kill all Electron processes |
| `make clean` | Clean build artifacts |
| `make watch-extension` | Watch mode for extension development |
| `make dmg` | Build Puku.app (development, fast) |
| `make dmg-production` | Build production DMG installer |

**Examples:**
```bash
# First time setup
make install                      # Install all dependencies

# Quick builds
make compile-ext                  # Just rebuild extension
make compile-vs                   # Just rebuild VS Code

# Launch with specific folder
make launch FOLDER=src/chat
make run FOLDER=/Users/name/my-project
```

**Note:** All commands use Node 23.5.0 (required for sqlite-vec extension support)

### Launch Options

```bash
# Development launch (uses launch.sh in project root)
./launch.sh

# Or specify a folder to open
./launch.sh /path/to/project
```

## Project Structure

```
puku-editor/
├── src/
│   ├── chat/                # Puku Editor extension source
│   │   ├── src/extension/   # Extension code
│   │   ├── docs/            # PRDs and documentation
│   │   └── dist/            # Compiled extension (generated)
│   └── vscode/              # Forked VS Code (Code-OSS)
│       ├── src/             # VS Code source code
│       └── out/             # Compiled VS Code (generated)
├── Makefile                 # Build automation
├── launch.sh                # Development launcher
└── README.md                # This file
```

## Features

### Authentication
- **Google OAuth** - Direct sign-in via `https://api.puku.sh/auth/google`
- **Puku Account** - Integrated authentication at both VS Code and extension layers
- **Token Bridging** - Seamless auth between workbench and extension

### AI Capabilities
- **AI Chat** - Powered by Puku API with usage quotas
- **Semantic Search** - AST-based code chunking with vector embeddings
- **Code Indexing** - Automatic workspace indexing with SQLite cache

### Commands
- `puku.auth.signIn` - Sign in with Google
- `puku.auth.signOut` - Sign out
- `puku.auth.status` - View auth status
- `puku.semanticSearch` - Search codebase semantically
- `puku.reindex` - Force re-index workspace

## Authentication Architecture

The editor uses a two-layer authentication system:

1. **VS Code Layer** (`src/vs/workbench/services/chat/common/pukuAuthService.ts`)
   - Handles Google OAuth flow
   - Manages session storage
   - Exposes commands: `_puku.workbench.getSessionToken`, `_puku.workbench.getUserInfo`

2. **Extension Layer** (`github/editor/src/extension/pukuAuth/`)
   - Implements `vscode.AuthenticationProvider`
   - Bridges to VS Code layer via fallback commands
   - Provides token to indexing and other services

## Configuration

The editor works out of the box with Puku authentication. For advanced configuration, see `CLAUDE.md`.

## Development

```bash
# Watch mode for extension (Terminal 1)
cd src/chat
npm run watch

# Launch Code-OSS with extension (Terminal 2)
cd ../..
./launch.sh

# Or use Makefile for everything
make watch-extension  # Terminal 1: watch mode
make launch          # Terminal 2: launch
```

### Debugging
- Extension debug port: `5870`
- Use "Show Chat Debug View" command for AI debugging
- Check logs in Developer Tools console

---

## Building macOS App

You can build Puku as a standalone macOS application in two ways:

### Development Build (Fast)

For local testing and development:

```bash
# Build Puku.app with symlinks (fast, ~5 seconds)
make dmg
```

This creates `build/Puku.app` using symlinks to your compiled code. Great for testing changes quickly.

### Production Build (Distributable)

For distribution to other users:

```bash
# Build self-contained DMG installer (~2-5 minutes)
make dmg-production
```

This creates:
- `build-production/Puku.app` - Self-contained app bundle with all dependencies
- `dist/Puku-{version}.dmg` - DMG installer for distribution

**To install the production build:**

1. Open the DMG: `open dist/Puku-*.dmg`
2. Drag Puku.app to Applications folder
3. Launch from Spotlight or Applications

**App Features:**
- ✅ Custom Puku icon (`puku.icns`)
- ✅ Bundle ID: `sh.puku.editor`
- ✅ App name: "Puku" (not "Code - OSS")
- ✅ Puku Editor extension pre-installed
- ✅ All built-in VS Code extensions included

---

## Recent Updates

- ✅ Fixed authentication token bridging between VS Code and extension layers
- ✅ Implemented Google OAuth with `api.puku.sh`
- ✅ Removed permission dialogs for direct OAuth flow
- ✅ Added workbench commands for token/user info access

## License

See individual project directories for license information.
