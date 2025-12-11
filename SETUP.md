# Puku Editor - Setup Guide

## 🚀 Quick Start (One Command)

After cloning this repository, run:

```bash
make setup
```

This will:
1. ✅ Clone the VS Code fork (if not present)
2. ✅ Install all dependencies (extension + VS Code)
3. ✅ Compile everything
4. ✅ Launch the editor

**That's it!** No manual steps needed.

---

## Requirements

- **Node.js**: 23.5.0 (installed via nvm)
- **Python**: 3.10-3.12
- **Git**: For cloning repositories
- **nvm**: Node version manager

### Install Requirements

```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 23.5.0
nvm install 23.5.0
nvm use 23.5.0
```

---

## Manual Setup (Step by Step)

If you prefer manual control:

### 1. Clone VS Code Fork (if needed)

```bash
git clone --depth 1 https://github.com/poridhiAILab/vscode.git src/vscode
```

### 2. Install Dependencies

```bash
make install
```

### 3. Compile

```bash
make compile
```

### 4. Launch

```bash
make launch
```

---

## Common Commands

| Command | Description |
|---------|-------------|
| `make setup` | **First-time setup** (clone + install + compile + launch) |
| `make install` | Install all dependencies |
| `make compile` | Compile extension + VS Code |
| `make launch` | Launch the editor |
| `make all` | Compile and launch |
| `make run` | Kill existing, compile, and launch |
| `make quick` | Kill and launch (no compilation) |
| `make help` | Show all available commands |

---

## Development Workflow

### Watch Mode (Recommended)

Terminal 1 - Watch extension changes:
```bash
make watch-extension
```

Terminal 2 - Launch editor:
```bash
make quick
```

Now any changes to the extension will auto-compile, and you can restart the editor with `make quick`.

### Quick Rebuild

```bash
make compile-ext && make quick
```

### Full Rebuild

```bash
make run
```

### Open with Specific Folder

```bash
make launch FOLDER=/path/to/your/project
```

---

## Troubleshooting

### "VS Code fork not found"

Run `make setup` or manually clone:
```bash
git clone --depth 1 https://github.com/poridhiAILab/vscode.git src/vscode
```

### "node: No such file or directory"

Make sure you're using Node 23.5.0:
```bash
nvm use 23.5.0
node -v  # Should show v23.5.0
```

### "npm install" fails in VS Code

The Makefile automatically handles this by cloning VS Code first. If you see this error:
```
Error: Cannot find module '/path/to/vscode/build/npm/preinstall.js'
```

Run:
```bash
make setup
```

This will clone VS Code if missing and then install dependencies.

### Clean Build

```bash
make clean
make compile
```

---

## What Gets Cloned?

- **Main Repository**: `puku-editor` (this repo)
- **VS Code Fork**: `poridhiAILab/vscode` (automatically cloned to `src/vscode`)

The VS Code fork is **not** a git submodule - it's cloned on demand by the Makefile.

---

## Architecture

```
puku-editor/
├── src/
│   ├── chat/          # Puku Editor extension (chat, FIM, indexing)
│   └── vscode/        # VS Code fork (cloned automatically)
├── Makefile           # Build automation
├── launch.sh          # Launch script
└── SETUP.md          # This file
```

---

## CI/CD Integration

For automated builds:

```yaml
# .github/workflows/build.yml
jobs:
  build:
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '23.5.0'
      - run: make setup
```

---

## Next Steps

After setup, check out:
- `CLAUDE.md` - Project overview and development guide
- `CONTRIBUTING.md` - How to contribute
- `src/chat/README.md` - Extension architecture

---

**Need help?** Run `make help` for all available commands.
