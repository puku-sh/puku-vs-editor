# Puku Editor Makefile
# Compile and launch VS Code (Code-OSS) with Puku Editor extension

.PHONY: help compile compile-extension compile-vscode launch clean kill all test

# Default target
help:
	@echo "Puku Editor - Makefile Commands"
	@echo "================================"
	@echo ""
	@echo "Development:"
	@echo "  make all              - Compile everything and launch IDE"
	@echo "  make compile          - Compile both extension and VS Code"
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
	@echo "  make launch FOLDER=github/editor"
	@echo "  make run FOLDER=/Users/name/project"
	@echo ""
	@echo "Node Setup:"
	@echo "  make node-extension   - Switch to Node 23.5.0 (for extension)"
	@echo "  make node-vscode      - Switch to Node 22.20.0 (for VS Code)"

# Compile extension (requires Node 23.5.0)
compile-extension:
	@echo "=== Compiling Puku Editor Extension ==="
	@cd src/vscode/github/editor && \
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
	@rm -rf src/vscode/github/editor/dist
	@rm -rf src/vscode/github/editor/out
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

# Watch mode for extension (Terminal 1)
watch-extension:
	@echo "=== Starting Extension Watch Mode ==="
	@cd src/vscode/github/editor && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm run watch

# Test target
test:
	@echo "=== Running Tests ==="
	@cd src/vscode/github/editor && \
	source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
	npm test
