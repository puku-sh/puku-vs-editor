# Puku Editor Makefile
# Compile and launch VS Code (Code-OSS) with Puku Editor extension

.PHONY: help setup check-vscode install compile compile-ext compile-vs compile-extension compile-vscode launch clean kill all test first-time-setup

# VS Code fork repository
VSCODE_REPO = https://github.com/poridhiAILab/vscode.git
VSCODE_DIR = src/vscode

# Default target
help:
	@echo "Puku Editor - Makefile Commands"
	@echo "================================"
	@echo ""
	@echo "🚀 First Time Setup (ONE COMMAND!):"
	@echo "  make setup            - Clone VS Code + install all deps + compile + launch"
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
	@echo "Launch Options:"
	@echo "  make launch           - Launch with no folder"
	@echo "  make launch FOLDER=/path - Launch with specific folder"
	@echo ""
	@echo "Cleanup:"
	@echo "  make kill             - Kill all running Electron processes"
	@echo "  make clean            - Clean build artifacts"
	@echo ""
	@echo "Common Workflows:"
	@echo "  make setup                                   # First time (automatic)"
	@echo "  make compile-ext && make quick               # Quick rebuild"
	@echo "  make run FOLDER=src/chat                     # Full rebuild + launch"
	@echo ""
	@echo "Note: All commands use Node 23.5.0 (required for sqlite-vec)"

# Check if VS Code directory exists and has content
check-vscode:
	@if [ ! -d "$(VSCODE_DIR)" ] || [ ! -f "$(VSCODE_DIR)/package.json" ]; then \
		echo "❌ VS Code fork not found at $(VSCODE_DIR)"; \
		echo ""; \
		echo "Run 'make setup' to clone VS Code automatically"; \
		echo "Or manually clone: git clone $(VSCODE_REPO) $(VSCODE_DIR)"; \
		exit 1; \
	fi

# Clone VS Code fork if needed
clone-vscode:
	@echo "=== Checking VS Code Fork ==="
	@if [ ! -d "$(VSCODE_DIR)" ] || [ ! -f "$(VSCODE_DIR)/package.json" ]; then \
		echo "📥 Cloning VS Code fork from $(VSCODE_REPO)..."; \
		echo "This may take 5-10 minutes (large repository)..."; \
		rm -rf $(VSCODE_DIR); \
		git clone --depth 1 $(VSCODE_REPO) $(VSCODE_DIR); \
		echo "✅ VS Code cloned successfully"; \
	else \
		echo "✅ VS Code already cloned"; \
	fi

# First-time setup: clone + install + compile + launch
setup: clone-vscode
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

# Compile extension (requires Node 23.5.0)
compile-extension:
	@echo "=== Compiling Puku Editor Extension ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run compile

# Compile VS Code (requires Node 23.5.0)
compile-vscode: check-vscode
	@echo "=== Compiling VS Code (Code-OSS) ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run compile

# Compile both in sequence
compile: check-vscode
	@echo "=== Starting Compilation ==="
	@$(MAKE) compile-extension
	@$(MAKE) compile-vscode
	@echo "=== Compilation Complete ==="

# Launch Code-OSS with extension
# Usage: make launch [FOLDER=/path/to/folder]
launch:
	@echo "=== Launching Puku Editor ==="
	@if [ -n "$(FOLDER)" ]; then \
		echo "Opening folder: $(FOLDER)"; \
		./launch.sh "$(FOLDER)"; \
	else \
		./launch.sh; \
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
	@echo "Clean complete"

# Install dependencies for extension (requires Node 23.5.0)
install-extension:
	@echo "=== Installing Extension Dependencies ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm install

# Install dependencies for VS Code (requires Node 23.5.0)
install-vscode: check-vscode
	@echo "=== Installing VS Code (Code-OSS) Dependencies ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm install

# Install all dependencies (extension + VS Code)
install: clone-vscode
	@echo "=== Installing All Dependencies (Node 23.5.0) ==="
	@$(MAKE) install-extension
	@$(MAKE) install-vscode
	@echo ""
	@echo "=== Installation Complete ==="
	@echo ""
	@echo "Next steps:"
	@echo "  make compile     # Compile extension + VS Code"
	@echo "  make all         # Compile and launch"

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
