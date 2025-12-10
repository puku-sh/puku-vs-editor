# Puku Editor Makefile
# Compile and launch VS Code (Code-OSS) with Puku Editor extension

.PHONY: help install compile compile-ext compile-vs compile-extension compile-vscode launch clean kill all test

# Default target
help:
	@echo "Puku Editor - Makefile Commands"
	@echo "================================"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install          - Install all dependencies (first time)"
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
	@echo "  make install && make compile && make launch  # First time"
	@echo "  make compile-ext && make quick               # Quick rebuild"
	@echo "  make run FOLDER=src/chat                     # Full rebuild + launch"
	@echo ""
	@echo "Note: All commands use Node 23.5.0 (required for sqlite-vec)"

# Compile extension (requires Node 23.5.0)
compile-extension:
	@echo "=== Compiling Puku Editor Extension ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run compile

# Compile VS Code (requires Node 23.5.0)
compile-vscode:
	@echo "=== Compiling VS Code (Code-OSS) ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run compile

# Compile both in sequence
compile:
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
install-vscode:
	@echo "=== Installing VS Code (Code-OSS) Dependencies ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm install

# Install all dependencies (extension + VS Code)
install:
	@echo "=== Installing All Dependencies (Node 23.5.0) ==="
	@echo ""
	@echo "Step 1/2: Installing extension dependencies..."
	@$(MAKE) install-extension
	@echo ""
	@echo "Step 2/2: Installing VS Code dependencies..."
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
