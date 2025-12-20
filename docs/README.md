# Puku Editor Documentation

Welcome to Puku Editor! This guide helps you navigate all documentation and get started step-by-step, whether you're a beginner or advanced developer.

## 🚀 Quick Start for Beginners

### Step 1: Understand the Project
- **[Product Requirements Document (PRD)](prd/)** - High-level overview of Puku Editor's vision and goals
- **[Architecture Documentation](architecture/)** - Technical architecture and system design

### Step 2: Development Setup
1. **[Prerequisites](#prerequisites)** - What you need before starting
2. **[Installation Guide](#installation)** - Step-by-step setup instructions
3. **[Build System](#build-system)** - Understanding the Makefile and build process

### Step 3: Core Features Overview
- **[Next Edit Suggestions (NES)](features/IMPLEMENT_NES.md)** - AI-powered next edit predictions ✅ **IMPLEMENTED**
- **[Multi-Edit Diagnostics](prd-multi-edit-diagnostics.md)** - AI-powered error fixes
- **[Tab-to-Jump Feature](prd-tab-to-jump-feature.md)** - Quick navigation enhancement

## 📚 Documentation Index

### 🏗️ Architecture & Design
- **[Architecture Documentation](architecture/)** - System design, components, and patterns
- **[Configuration Reference](config-refactoring-issue-20.md)** - Configuration system details
- **[Racing Strategy PRD](racing-strategy-prd.md)** - Multi-provider completion strategy

### ✨ Feature Documentation
- **[Next Edit Suggestions (NES)](features/IMPLEMENT_NES.md)** - Complete implementation guide
- **[Next Edit Suggestions Status](features/NES_STATUS.md)** - Current implementation status and usage
- **[Multi-Edit Diagnostics](prd-multi-edit-diagnostics.md)** - Automated error resolution
- **[Tab-to-Jump Feature](prd-tab-to-jump-feature.md)** - Navigation enhancement

## 🛠️ Development Guide

### Prerequisites
Before you start developing Puku Editor, ensure you have:

**Required Software:**
- **Node.js**: 23.5.0+ for extension development
- **Node.js**: 22.20.0 for VS Code build (managed via nvm)
- **Python**: >= 3.10, <= 3.12 (for VS Code native modules)
- **Git LFS**: For running tests

**Platform-Specific Requirements:**
- **macOS**: Xcode Command Line Tools
- **Linux**: `libx11-dev`, `libxkbfile-dev`, `libsecret-1-dev`
- **Windows**: Visual Studio Build Tools >= 2019

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/puku-sh/puku-vs-editor.git
   cd puku-vs-editor
   ```

2. **Set Up Node Versions**
   ```bash
   # Extension uses Node 23.5.0+
   cd src/chat
   node --version  # Should be 23.5.0+

   # VS Code uses Node 22.20.0 (auto-managed)
   cd ../vscode
   cat .nvmrc  # Shows 22.20.0
   ```

3. **Install Dependencies**
   ```bash
   # Extension dependencies
   cd src/chat && npm install

   # VS Code dependencies
   cd ../vscode && npm install
   ```

### Build System

Puku Editor uses a Makefile for simplified building:

```bash
# Quick commands
make build-ext          # Build extension only (~2s)
make build-vs           # Build VS Code only (~5-10 min first time)
make build              # Build both
make clean              # Clean build artifacts

# Packaging
./build-dmg-optimized.sh    # Create macOS DMG (~20s)
```

**Development Workflow:**
```bash
# Terminal 1: Watch extension (auto-rebuild on changes)
cd src/chat && npm run watch

# Terminal 2: Run VS Code with extension
cd src/vscode
./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
```

## 🔧 Feature Implementation Guides

### Next Edit Suggestions (NES) - ✅ **COMPLETE**
**Status**: Fully implemented and enabled by default

**What it does**: Provides AI-powered suggestions for the next logical edit after making changes

**How to verify it's working**:
1. Open any file and make an edit
2. Open VS Code Developer Tools (`Help > Toggle Developer Tools`)
3. Look for `[PukuNesNextEdit]` logs appearing ~500ms after you stop typing
4. Watch for ghost text suggestions labeled as "Next Edit"

**Configuration**:
- `puku.nextEditSuggestions.enabled` (default: true)
- `puku.nextEditSuggestions.timeout` (default: 3000ms)
- `puku.nextEditSuggestions.nesDelay` (default: 500ms)

**Key Files**:
- `src/extension/pukuai/vscode-node/providers/pukuNesNextEditProvider.ts` - Main NES provider
- `src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts` - 3-way racing coordinator
- `src/extension/xtab/node/xtabProvider.ts` - LLM backend implementation

### Multi-Edit Diagnostics
**Status**: Planned - See [PRD](prd-multi-edit-diagnostics.md)

**What it will do**: Automatically detect and fix multiple errors in code using AI

### Tab-to-Jump Feature
**Status**: Planned - See [PRD](prd-tab-to-jump-feature.md)

**What it will do**: Enhanced navigation using Tab key to jump between logical points

## 🏃‍♂️ Common Development Tasks

### Adding a New Feature
1. **Create PRD**: Document the feature in `docs/` folder
2. **Architecture Design**: Review `docs/architecture/` for patterns
3. **Implementation**: Follow existing patterns in `src/extension/`
4. **Testing**: Add tests in `src/test/`
5. **Documentation**: Update relevant docs

### Debugging Issues
1. **Enable Verbose Logging**: Set `puku.logging.enabled: true`
2. **Developer Console**: `Help > Toggle Developer Tools`
3. **Show Chat Debug View**: Run command "Show Chat Debug View"
4. **Debug Ports**: Extension Host (5870), TypeScript Server (9223)

### Running Tests
```bash
cd src/chat
npm run test:unit              # Unit tests (Node.js)
npm run test:extension         # Integration tests (VS Code)
npm run simulate              # Simulation tests (LLM-based, cached)
npm test                      # Run all tests
npm run lint                  # ESLint (zero warnings policy)
```

## 📁 Project Structure

```
puku-vs-editor/
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
├── docs/                  # This documentation
│   ├── features/          # Feature-specific docs
│   ├── prd/              # Product requirements
│   └── architecture/     # System design
├── Makefile              # Build automation
└── .github/workflows/    # CI/CD for 6 platforms
```

## 🚢 CI/CD & Releases

### Automatic Builds
**Trigger**: Push tags matching `v*.*.*` (e.g., `v0.43.6`) OR push to `feat/ubunut` branch

**Platforms**:
- macOS (arm64, x64)
- Linux (x64, arm64)
- Windows (x64, arm64)

### Creating a Release
```bash
# Ensure everything is committed
git add . && git commit -m "Your changes"
git push origin main

# Create and push tag
git tag -a v0.43.8 -m "Release v0.43.8 - Description"
git push origin v0.43.8

# Monitor builds at:
# https://github.com/puku-sh/puku-vs-editor/actions
```

## 🔐 Puku AI Backend Integration

**Backend API**: Separate repository at `../puku-worker`

**Key Endpoints**:
- `/v1/fim/context` - Fill-in-middle with context (inline completions)
- `/v1/completions` - Standard FIM endpoint
- `/v1/chat/completions` - Chat interface
- `/v1/nes/edits` - Next Edit Suggestions (NEW!)
- `/v1/summarize/batch` - Code summarization

**Authentication**: Uses `puku.apiKey` setting or environment variable

## 🤝 Contributing

### Coding Standards
- **TypeScript**: Follow existing patterns in codebase
- **Indentation**: Tabs (not spaces)
- **Naming**: `PascalCase` for types, `camelCase` for functions
- **Architecture**: Service-oriented with dependency injection

### Before Submitting
1. **Run tests**: `npm test` (must pass)
2. **Lint**: `npm run lint` (zero warnings policy)
3. **Build**: `make build` (must compile)
4. **Documentation**: Update relevant docs
5. **Git**: Clean commits with clear messages

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/puku-sh/puku-vs-editor/issues)
- **Documentation**: This guide and feature-specific docs
- **Architecture**: See `docs/architecture/` folder

## 📖 Additional Resources

### VS Code Extension Development
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Authoring Guide](https://code.visualstudio.com/api/get-started/extension-authoring)

### Puku Specific
- [Feature Implementation Issues](https://github.com/puku-sh/puku-vs-editor/issues?q=is%3Aissue+label%3Aarea%3Ainline-completions)
- [Architecture Discussions](https://github.com/puku-sh/puku-vs-editor/discussions)

---

## 🎯 Where to Start?

1. **New to the project?** → Start with [PRD](prd/) and [Architecture](architecture/)
2. **Want to contribute?** → Check [Feature Implementation Guides](#-feature-implementation-guides)
3. **Need to debug?** → Follow [Debugging Issues](#debugging-issues)
4. **Ready to build?** → Use [Development Workflow](#development-workflow)

Welcome to Puku Editor development! 🎉