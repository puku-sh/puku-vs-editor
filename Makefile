# Puku Editor Makefile
# Compile and launch VS Code (Code-OSS) with Puku Editor extension

.PHONY: help install compile compile-ext compile-vs compile-extension compile-vscode launch clean kill all test

# Default target
help:
	@echo "Puku Editor - Makefile Commands"
	@echo "================================"
	@echo ""
	@echo "Setup (First Time):"
	@echo "  make install          - Install all dependencies (extension + VS Code)"
	@echo ""
	@echo "Development:"
	@echo "  make all              - Compile everything and launch IDE"
	@echo "  make compile          - Compile both extension and VS Code"
	@echo "  make compile-ext      - Compile only the extension (alias)"
	@echo "  make compile-vs       - Compile only VS Code (alias)"
	@echo "  make compile-extension - Compile only the extension"
	@echo "  make compile-vscode   - Compile only VS Code (Code-OSS)"
	@echo "  make launch           - Launch Code-OSS with extension"
	@echo "  make launch FOLDER=/path - Launch with specific folder"
	@echo "  make run              - Kill existing, compile, and launch"
	@echo "  make run FOLDER=/path - Kill, compile, and launch with folder"
	@echo ""
	@echo "Cleanup:"
	@echo "  make kill             - Kill all running Electron processes"
	@echo "  make clean            - Clean build artifacts"
	@echo ""
	@echo "Examples:"
	@echo "  make install                    # First time setup"
	@echo "  make compile-ext                # Quick extension build"
	@echo "  make launch FOLDER=src/chat     # Launch with folder"
	@echo "  make run FOLDER=/Users/name/project"
	@echo ""
	@echo "Node Setup:"
	@echo "  make node-extension   - Switch to Node 23.5.0 (for extension)"
	@echo "  make node-vscode      - Switch to Node 22.20.0 (for VS Code)"

# Compile extension (requires Node 23.5.0)
compile-extension:
	@echo "=== Compiling Puku Editor Extension ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run compile

# Compile VS Code (requires Node 22.20.0)
compile-vscode:
	@echo "=== Compiling VS Code (Code-OSS) ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
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

# Switch to Node 23.5.0 (for extension development)
node-extension:
	@echo "Switching to Node 23.5.0..."
	@source ~/.nvm/nvm.sh && nvm use 23.5.0 && node -v

# Switch to Node 22.20.0 (for VS Code development)
node-vscode:
	@echo "Switching to Node 22.20.0..."
	@source ~/.nvm/nvm.sh && nvm use 22.20.0 && node -v

# Install dependencies for extension (requires Node 23.5.0)
install-extension:
	@echo "=== Installing Extension Dependencies ==="
	@cd src/chat && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm install

# Install dependencies for VS Code (requires Node 22.20.0)
install-vscode:
	@echo "=== Installing VS Code (Code-OSS) Dependencies ==="
	@cd src/vscode && \
	source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
	npm install

# Install all dependencies (extension + VS Code)
install:
	@echo "=== Installing All Dependencies ==="
	@echo ""
	@echo "Step 1/2: Installing extension dependencies (Node 23.5.0)..."
	@$(MAKE) install-extension
	@echo ""
	@echo "Step 2/2: Installing VS Code dependencies (Node 22.20.0)..."
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
