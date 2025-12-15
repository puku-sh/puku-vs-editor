# Puku Editor - Packaging Guide

This document explains how to build production packages of Puku Editor with the extension bundled.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Build Modes](#build-modes)
- [Incremental Builds](#incremental-builds)
- [Fork Updates](#fork-updates)
- [Troubleshooting](#troubleshooting)

## Overview

Puku Editor uses a **bundled extension approach** where the Puku extension is automatically copied into the VS Code package during the build process. This eliminates the need for `--extensionDevelopmentPath` and creates a standalone, distributable application.

### Key Changes

**Modified File**: `src/vscode/build/gulpfile.vscode.ts` (lines 246-250)

```typescript
// PUKU: Include Puku Editor extension from ../chat
const pukuExtension = gulp.src(['../chat/dist/**', '../chat/package.json', '../chat/README.md', '../chat/LICENSE.txt', '../chat/assets/**'], { base: '../chat', dot: true, allowEmpty: true })
	.pipe(rename(function (path) { path.dirname = 'extensions/puku-editor/' + path.dirname; }));

const sources = es.merge(src, extensions, pukuExtension)
	.pipe(filter(['**', '!**/*.{js,css}.map'], { dot: true }));
```

This modification is inside the `packageTask()` function, so it **automatically applies to all platforms**:
- ✅ macOS (ARM64, Intel)
- ✅ Windows (x64, ia32, arm64)
- ✅ Linux (x64, arm64, armhf)

## Quick Start

### First-Time Build

```bash
# 1. Compile the Puku extension
make compile-extension

# 2. Build the package (takes ~57 minutes)
make package

# 3. Launch the packaged app
make launch-package
```

### Subsequent Builds (Fast Path)

```bash
# 1. Update extension code
make compile-extension

# 2. Rebuild package (takes ~11 seconds!)
make package-ci

# 3. Launch
make launch-package
```

## Build Modes

### 1. Full Build (`make package`)

**Duration**: ~57 minutes
**Use when**:
- First time building
- After updating VS Code fork
- After major VS Code dependency changes
- When `.build/` directory doesn't exist

**What it does**:
1. Compiles the Puku extension (`src/chat/dist/`)
2. Compiles VS Code from scratch (creates `.build/`)
3. Bundles Puku extension into the package
4. Creates `src/VSCode-darwin-arm64/Puku.app`

**Command**:
```bash
make package
```

**Equivalent direct command**:
```bash
cd src/chat && npm run compile
cd ../vscode && \
  source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
  export NODE_OPTIONS="--max-old-space-size=16384" && \
  npx gulp vscode-darwin-arm64-min
```

### 2. CI Build (`make package-ci`)

**Duration**: ~11 seconds
**Use when**:
- Iterating on extension code
- Testing packaging changes
- `.build/` directory already exists

**What it does**:
1. Compiles the Puku extension (`src/chat/dist/`)
2. **Reuses** existing `.build/` (skips VS Code compilation)
3. Bundles Puku extension into the package
4. Creates `src/VSCode-darwin-arm64/Puku.app`

**Command**:
```bash
make package-ci
```

**Equivalent direct command**:
```bash
cd src/chat && npm run compile
cd ../vscode && \
  source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
  export NODE_OPTIONS="--max-old-space-size=16384" && \
  npx gulp vscode-darwin-arm64-min-ci
```

### 3. Full Clean Build (`make package-full`)

**Duration**: ~60+ minutes
**Use when**:
- Build is corrupted
- Starting completely fresh
- Before releasing

**What it does**:
1. Cleans all build artifacts
2. Reinstalls dependencies
3. Runs full build

**Command**:
```bash
make package-full
```

## Incremental Builds

The CI build workflow enables **extremely fast iteration** when working on the extension:

### Workflow Example

```bash
# Initial build (one time, ~57 min)
make package

# Now you can iterate quickly:

# 1. Edit extension code in src/chat/
vim src/chat/src/extension/...

# 2. Compile extension (~30 sec)
make compile-extension

# 3. Package (~11 sec)
make package-ci

# 4. Test
make launch-package

# Total iteration time: ~41 seconds!
```

### Protecting the .build/ Directory

The `.build/` directory is **critical** for fast rebuilds. To protect it:

```bash
# Backup .build/ before risky operations
make backup-build

# Restore if something goes wrong
make restore-build
```

**Backups are timestamped**:
```
src/vscode/.build-backup-20251214-162620
src/vscode/.build-backup-20251214-163045
```

## Fork Updates

### Updating from Upstream VS Code

When you update your VS Code fork, you need to preserve the gulpfile.vscode.ts changes:

```bash
# Interactive update process
make update-fork
```

This will:
1. Fetch latest from `microsoft/vscode`
2. Merge into your current branch
3. Warn you about potential conflicts in `build/gulpfile.vscode.ts`

### Resolving Conflicts

If there are merge conflicts in `gulpfile.vscode.ts`:

1. **Our changes are at lines 246-250**:
   ```typescript
   // PUKU: Include Puku Editor extension from ../chat
   const pukuExtension = gulp.src([...])
   ...
   const sources = es.merge(src, extensions, pukuExtension)
   ```

2. **Keep both changes** (upstream + our pukuExtension)

3. **After resolving**:
   ```bash
   # Update dependencies
   make install-vscode

   # Rebuild
   make package
   ```

### Manual Update (Alternative)

```bash
cd src/vscode

# Add upstream if not already added
git remote add upstream https://github.com/microsoft/vscode.git

# Fetch latest
git fetch upstream

# Merge (or rebase)
git merge upstream/main
# or
git rebase upstream/main

# Check for conflicts
git status

# If conflicts in build/gulpfile.vscode.ts:
#   - Resolve manually
#   - Keep lines 246-250 (pukuExtension)

# Continue
git merge --continue  # or git rebase --continue

# Rebuild
make install-vscode
make package
```

## Platform-Specific Builds

The same approach works for all platforms:

### macOS Intel (x64)

```bash
cd src/vscode
npx gulp vscode-darwin-x64-min        # Full
npx gulp vscode-darwin-x64-min-ci     # CI
```

### Windows

```bash
cd src/vscode
npx gulp vscode-win32-x64-min         # Full
npx gulp vscode-win32-x64-min-ci      # CI
```

### Linux

```bash
cd src/vscode
npx gulp vscode-linux-x64-min         # Full
npx gulp vscode-linux-x64-min-ci      # CI
```

**Output locations**:
- macOS: `../VSCode-darwin-arm64/Puku.app`
- Windows: `../VSCode-win32-x64/Puku.exe`
- Linux: `../VSCode-linux-x64/puku`

## Troubleshooting

### Problem: CI build still takes 57 minutes

**Cause**: `.build/` directory is missing or incomplete.

**Solution**:
```bash
# Check if .build/ exists
ls -la src/vscode/.build

# If missing, run full build
make package
```

### Problem: Extension not showing in packaged app

**Cause**: Extension wasn't compiled before packaging.

**Solution**:
```bash
# Always compile extension first
make compile-extension
make package-ci
```

**Verify extension is bundled**:
```bash
ls -la src/VSCode-darwin-arm64/Puku.app/Contents/Resources/app/extensions/puku-editor/
```

You should see:
- `dist/` - Compiled extension code
- `package.json`
- `README.md`
- `LICENSE.txt`
- `assets/`

### Problem: App crashes or shows errors

**Cause**: Mismatched VS Code and extension versions, or corrupted build.

**Solution**:
```bash
# Full clean rebuild
make package-full
```

### Problem: Packaging fails with checksum error

**Cause**: Electron version mismatch with `@vscode/gulp-electron`.

**Solution**: See `BUILD-CI.md` for checksum workaround.

### Problem: Out of memory during build

**Cause**: Node.js heap size too small.

**Solution**: Already configured in Makefile, but you can increase:
```bash
export NODE_OPTIONS="--max-old-space-size=32768"  # 32GB
make package
```

### Problem: Lost .build/ directory

**Cause**: Accidentally deleted or corrupted.

**Solution**:
```bash
# If you have backups
make restore-build

# Otherwise, rebuild from scratch
make package
```

## Build Performance

| Build Type | Duration | Use Case |
|------------|----------|----------|
| Full (`make package`) | ~57 min | First build, fork updates |
| CI (`make package-ci`) | ~11 sec | Extension iteration |
| Compile Extension | ~30 sec | Extension code changes |
| **Total Iteration** | **~41 sec** | Edit → Test cycle |

## Summary

The bundled extension approach provides:

✅ **Fast iteration**: 11-second rebuilds
✅ **Standalone packages**: No `--extensionDevelopmentPath` needed
✅ **Cross-platform**: Works on all platforms automatically
✅ **Fork-friendly**: Easy to update from upstream
✅ **Production-ready**: Same build process for dev and release

For day-to-day development, use `make compile-extension && make package-ci` for the fastest workflow!
