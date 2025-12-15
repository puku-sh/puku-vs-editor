# Puku Editor Makefile
# Compile and launch VS Code (Code-OSS) with Puku Editor extension bundled

.PHONY: help setup install compile compile-ext compile-vs compile-extension compile-vscode launch clean kill all test package package-ci package-full clean-package update-fork build build-ext build-vs build-minimal build-watch

# Default target
help:
	@echo "Puku Editor - Makefile Commands"
	@echo "================================"
	@echo ""
	@echo "🚀 First Time Setup (ONE COMMAND!):"
	@echo "  make setup            - Install all deps + compile + launch"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install          - Install all dependencies"
	@echo "  make compile          - Build extension + VS Code"
	@echo "  make launch           - Launch the editor (no build)"
	@echo ""
	@echo "Development:"
	@echo "  make all              - Compile everything and launch IDE"
	@echo "  make run              - Kill existing, compile, and launch"
	@echo "  make quick            - Kill and launch (no compilation)"
	@echo "  make compile-ext      - Compile only the extension"
	@echo "  make compile-vs       - Compile only VS Code"
	@echo ""
	@echo "Incremental Builds (Smart + Fast):"
	@echo "  make build            - Incremental: only build changed files"
	@echo "  make build-ext        - Incremental: extension only (~5 sec)"
	@echo "  make build-vs         - Incremental: VS Code only"
	@echo "  make build-minimal    - Incremental: ext + package (~16 sec)"
	@echo "  make build-watch      - Watch mode: auto-rebuild on changes"
	@echo ""
	@echo "Packaging (Bundled Approach):"
	@echo "  make package          - Full build: compile + package (57+ min)"
	@echo "  make package-ci       - Fast rebuild: package only (~11 sec)"
	@echo "  make package-full     - Clean build from scratch"
	@echo "  make clean-package    - Remove packaged app"
	@echo ""
	@echo "Fork Updates:"
	@echo "  make update-fork      - Update VS Code fork from upstream"
	@echo ""
	@echo "Launch Options:"
	@echo "  make launch           - Launch development build"
	@echo "  make launch-package   - Launch packaged build"
	@echo "  make launch FOLDER=/path - Launch with specific folder"
	@echo ""
	@echo "Cleanup:"
	@echo "  make kill             - Kill all running Electron processes"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make clean-all        - Clean everything (build + packages)"
	@echo ""
	@echo "Common Workflows:"
	@echo "  Development (fastest):"
	@echo "    make build-minimal      # Extension + package (~16 sec)"
	@echo "    make launch-package     # Test packaged build"
	@echo ""
	@echo "  Extension iteration:"
	@echo "    make build-ext          # Incremental build (~5 sec)"
	@echo "    make quick              # Launch dev build"
	@echo ""
	@echo "  Watch mode:"
	@echo "    make build-watch        # Auto-rebuild on changes"
	@echo ""
	@echo "  Full workflows:"
	@echo "    make setup              # First time (automatic)"
	@echo "    make package            # Full package (~57 min)"
	@echo "    make package-ci         # Fast package (~11 sec)"
	@echo ""
	@echo "Note: Extension uses Node 23.5.0, VS Code uses Node 22.20.0"

# First-time setup: install + compile + launch
setup:
	@echo ""
	@echo "🚀 Setting up Puku Editor (this may take 5-10 minutes)..."
	@echo ""
	@$(MAKE) install-extension
	@$(MAKE) install-vscode
	@$(MAKE) compile-extension
	@$(MAKE) compile-vscode
	@sleep 2
	@$(MAKE) launch
	@echo ""
	@echo "✅ Setup complete! Puku Editor is running."

# Compile extension (requires Node 23.5.0 for sqlite-vec)
compile-extension:
	@echo "=== Compiling Puku Editor Extension (Node 23.5.0) ==="
	@cd src/chat && \
	if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c "source ~/.nvm/nvm.sh && nvm use 23.5.0 && npm run compile"; \
	else \
		npm run compile; \
	fi

# Compile VS Code (requires Node 22.20.0)
compile-vscode:
	@echo "=== Compiling VS Code (Node 22.20.0) ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	npm run compile

# Compile both in sequence
compile:
	@echo "=== Starting Compilation ==="
	@$(MAKE) compile-extension
	@$(MAKE) compile-vscode
	@echo "=== Compilation Complete ==="

# Launch Code-OSS with extension (development mode)
# Usage: make launch [FOLDER=/path/to/folder]
launch:
	@echo "=== Launching Puku Editor (Development) ==="
	@if [ -n "$(FOLDER)" ]; then \
		echo "Opening folder: $(FOLDER)"; \
		./launch.sh "$(FOLDER)"; \
	else \
		./launch.sh; \
	fi

# Launch packaged build (bundled extension)
launch-package:
	@echo "=== Launching Puku Editor (Packaged Build) ==="
	@if [ ! -d "src/VSCode-darwin-arm64/Puku.app" ]; then \
		echo "❌ Packaged app not found. Run 'make package' first."; \
		exit 1; \
	fi
	@if [ -n "$(FOLDER)" ]; then \
		echo "Opening folder: $(FOLDER)"; \
		open src/VSCode-darwin-arm64/Puku.app "$(FOLDER)"; \
	else \
		open src/VSCode-darwin-arm64/Puku.app; \
	fi

# Kill all Electron processes
kill:
	@echo "=== Killing Electron processes ==="
	@killall "Electron" 2>/dev/null || true
	@sleep 2

# Full workflow: kill, compile, launch
run: kill compile
	@sleep 3
	@make launch

# Quick run: kill and launch (no compilation)
quick: kill
	@sleep 3
	@make launch

# All: compile and launch
all: compile
	@sleep 2
	@make launch

# Clean build artifacts
clean:
	@echo "=== Cleaning build artifacts ==="
	@rm -rf src/chat/dist
	@rm -rf src/chat/out
	@rm -rf src/vscode/out
	@rm -rf src/vscode/.build
	@echo "Clean complete"

# Clean packaged builds
clean-package:
	@echo "=== Cleaning packaged builds ==="
	@rm -rf src/VSCode-darwin-arm64
	@rm -rf build-production
	@echo "Package clean complete"

# Clean everything
clean-all: clean clean-package
	@echo "=== All clean complete ==="

# Install dependencies for extension (requires Node 23.5.0 for sqlite-vec)
install-extension:
	@echo "=== Installing Extension Dependencies (Node 23.5.0) ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm install

# Install dependencies for VS Code (requires Node 22.20.0)
install-vscode:
	@echo "=== Installing VS Code Dependencies (Node 22.20.0) ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	npm install

# Install all dependencies (extension + VS Code)
install:
	@echo "=== Installing All Dependencies ==="
	@$(MAKE) install-extension
	@$(MAKE) install-vscode
	@echo ""
	@echo "=== Installation Complete ==="
	@echo ""
	@echo "Next steps:"
	@echo "  make compile     # Compile extension + VS Code"
	@echo "  make all         # Compile and launch"

# ============================================================================
# NEW: Packaging with Bundled Extension
# ============================================================================

# Package the app with extension bundled (full build: compile + package)
# This is the SLOW path - takes 57+ minutes
package: compile-extension
	@echo ""
	@echo "=== Building Packaged App (Full Build: ~57 minutes) ==="
	@echo ""
	@echo "This will:"
	@echo "  1. Compile VS Code from scratch"
	@echo "  2. Bundle Puku extension into the app"
	@echo "  3. Create production build in src/VSCode-darwin-arm64/"
	@echo ""
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	export NODE_OPTIONS="--max-old-space-size=16384" && \
	npx gulp vscode-darwin-arm64-min 2>&1 | tee /tmp/puku-package-full.log
	@echo ""
	@echo "✅ Packaging complete! App location: src/VSCode-darwin-arm64/Puku.app"
	@echo "   Launch with: make launch-package"

# Package only (CI mode) - assumes .build/ directory exists
# This is the FAST path - takes ~11 seconds
package-ci: compile-extension
	@echo ""
	@echo "=== Building Packaged App (CI Mode: ~11 seconds) ==="
	@echo ""
	@if [ ! -d "src/vscode/.build" ]; then \
		echo "❌ .build/ directory not found. Run 'make package' first for initial build."; \
		echo "   CI mode only works for incremental rebuilds."; \
		exit 1; \
	fi
	@echo "This will:"
	@echo "  1. Skip VS Code compilation (reuse .build/)"
	@echo "  2. Bundle Puku extension into the app"
	@echo "  3. Package in ~11 seconds"
	@echo ""
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	export NODE_OPTIONS="--max-old-space-size=16384" && \
	npx gulp vscode-darwin-arm64-min-ci 2>&1 | tee /tmp/puku-package-ci.log
	@echo ""
	@echo "✅ Packaging complete! App location: src/VSCode-darwin-arm64/Puku.app"
	@echo "   Launch with: make launch-package"

# Full clean build (clean everything first, then build)
package-full: clean-all
	@echo ""
	@echo "=== Full Clean Build ==="
	@echo ""
	@$(MAKE) install
	@$(MAKE) package
	@echo ""
	@echo "✅ Full build complete!"

# ============================================================================
# Fork Updates and Incremental Builds
# ============================================================================

# Update VS Code fork from upstream
update-fork:
	@echo "=== Updating VS Code Fork ==="
	@echo ""
	@echo "This will:"
	@echo "  1. Fetch latest from upstream VS Code"
	@echo "  2. Merge into current branch"
	@echo "  3. Preserve our gulpfile.vscode.ts changes"
	@echo ""
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ ! $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "Aborted."; \
		exit 1; \
	fi
	@cd src/vscode && \
	git remote add upstream https://github.com/microsoft/vscode.git 2>/dev/null || true && \
	git fetch upstream && \
	echo "" && \
	echo "Current branch: $$(git branch --show-current)" && \
	echo "" && \
	read -p "Merge from upstream/main? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		git merge upstream/main; \
		echo ""; \
		echo "✅ Merge complete. Check for conflicts in build/gulpfile.vscode.ts"; \
		echo "   Our changes are at lines 246-250 (pukuExtension)"; \
		echo ""; \
		echo "Next steps:"; \
		echo "  1. Resolve any conflicts"; \
		echo "  2. Run 'make install-vscode' to update dependencies"; \
		echo "  3. Run 'make package' to rebuild"; \
	fi

# Backup .build directory (for CI workflow)
backup-build:
	@echo "=== Backing up .build directory ==="
	@if [ ! -d "src/vscode/.build" ]; then \
		echo "❌ .build/ directory not found. Nothing to backup."; \
		exit 1; \
	fi
	@cd src/vscode && \
	cp -r .build .build-backup-$$(date +%Y%m%d-%H%M%S)
	@echo "✅ Backup created"
	@ls -d src/vscode/.build-backup-* 2>/dev/null | tail -5

# Restore .build directory from latest backup
restore-build:
	@echo "=== Restoring .build directory ==="
	@LATEST=$$(ls -dt src/vscode/.build-backup-* 2>/dev/null | head -1); \
	if [ -z "$$LATEST" ]; then \
		echo "❌ No backups found."; \
		exit 1; \
	fi; \
	echo "Restoring from: $$LATEST"; \
	cd src/vscode && \
	rm -rf .build && \
	cp -r "$$LATEST" .build
	@echo "✅ Restore complete"

# Aliases for shorter commands
compile-ext: compile-extension
compile-vs: compile-vscode

# Watch mode for extension (Terminal 1)
watch-extension:
	@echo "=== Starting Extension Watch Mode ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run watch

# Test target
test:
	@echo "=== Running Tests ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm test

# ============================================================================
# Incremental Builds (Smart + Fast)
# ============================================================================

# Incremental build: only rebuild changed files
build:
	@echo "=== Incremental Build (Smart) ==="
	@if [ -f "src/chat/.tsbuildinfo" ]; then \
		echo "TypeScript build cache found - incremental build"; \
	else \
		echo "No build cache - full build"; \
	fi
	@$(MAKE) build-ext
	@$(MAKE) build-vs
	@echo "✅ Incremental build complete"

# Incremental extension build (~5 seconds with cache)
build-ext:
	@echo "=== Incremental Extension Build ==="
	@cd src/chat && \
	if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c "source ~/.nvm/nvm.sh && nvm use 23.5.0 && npm run compile"; \
	else \
		npm run compile; \
	fi
	@echo "✅ Extension build complete"

# Incremental VS Code build (only changed files)
build-vs:
	@echo "=== Incremental VS Code Build ==="
	@cd src/vscode && \
	if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c "source ~/.nvm/nvm.sh && nvm use 22.20.0 && npm run compile"; \
	else \
		npm run compile; \
	fi
	@echo "✅ VS Code build complete"

# Minimal incremental: extension + package (~16 seconds total)
# This is the FASTEST edit-test cycle for packaged builds
build-minimal: build-ext package-ci
	@echo ""
	@echo "✅ Minimal build complete! (~16 seconds)"
	@echo "   Launch with: make launch-package"

# Watch mode: auto-rebuild on file changes (parallel processes)
build-watch:
	@echo "=== Starting Watch Mode ==="
	@echo ""
	@echo "This will start two parallel watch processes:"
	@echo "  1. Extension watch (Terminal 1)"
	@echo "  2. VS Code watch (Terminal 2)"
	@echo ""
	@echo "To stop: Press Ctrl+C in each terminal"
	@echo ""
	@echo "Starting in 3 seconds..."
	@sleep 3
	@# Start extension watch in background
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run watch &
	@# Start VS Code watch in foreground
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	npm run watch

# Watch mode for extension only
watch-ext:
	@echo "=== Extension Watch Mode ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run watch

# Watch mode for VS Code only
watch-vs:
	@echo "=== VS Code Watch Mode ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	npm run watch

# Smart build: detect what changed and only build that
build-smart:
	@echo "=== Smart Build (Auto-detect changes) ==="
	@CHANGED=0; \
	if git diff --quiet HEAD -- src/chat/ 2>/dev/null; then \
		echo "No extension changes detected"; \
	else \
		echo "Extension changes detected - rebuilding"; \
		$(MAKE) build-ext; \
		CHANGED=1; \
	fi; \
	if git diff --quiet HEAD -- src/vscode/src/ 2>/dev/null; then \
		echo "No VS Code changes detected"; \
	else \
		echo "VS Code changes detected - rebuilding"; \
		$(MAKE) build-vs; \
		CHANGED=1; \
	fi; \
	if [ $$CHANGED -eq 0 ]; then \
		echo "No changes detected - nothing to build"; \
	else \
		echo "✅ Smart build complete"; \
	fi
