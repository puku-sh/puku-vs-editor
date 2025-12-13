# Puku Editor Makefile
# Compile and launch VS Code (Code-OSS) with Puku Editor extension

.PHONY: help setup install compile compile-ext compile-vs compile-extension compile-vscode postinstall-extension launch  clean kill all test deb deb-build deb-install deb-clean

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
	@echo "Launch Options:"
	@echo "  make launch           - Launch with no folder"
	@echo "  make launch FOLDER=/path - Launch with specific folder"
	@echo ""
	@echo "Cleanup:"
	@echo "  make kill             - Kill all running Electron processes"
	@echo "  make clean            - Clean build artifacts"
	@echo ""
	@echo "Debian Packaging:"
	@echo "  make deb              - Build .deb package for distribution"
	@echo "  make deb-install      - Build and install .deb package"
	@echo "  make deb-source       - Create source package (for PPA)"
	@echo "  make deb-full         - Build source + binary packages"
	@echo "  make deb-clean        - Clean Debian build artifacts"
	@echo ""
	@echo "Common Workflows:"
	@echo "  make setup                                   # First time (automatic)"
	@echo "  make compile-ext && make quick               # Quick rebuild"
	@echo "  make run FOLDER=src/chat                     # Full rebuild + launch"
	@echo "  make deb && sudo dpkg -i ../puku-editor_*.deb # Package + install"
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
	@$(MAKE) postinstall-extension
	@sleep 2
	@$(MAKE) launch
	@echo ""
	@echo "✅ Setup complete! Puku Editor is running."

# Compile extension (requires Node 23.5.0 for sqlite-vec)
compile-extension:
	@echo "=== Compiling Puku Editor Extension (Node 23.5.0) ==="
	@cd src/chat && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 23.5.0 && npm run compile'

# Run postinstall script after compilation (requires Node 23.5.0)
postinstall-extension:
	@echo "=== Running Extension Post-install (Node 23.5.0) ==="
	@cd src/chat && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 23.5.0 && npm run postinstall'

# Compile VS Code (requires Node 22.20.0)
compile-vscode:
	@echo "=== Compiling VS Code (Node 22.20.0) ==="
	@cd src/vscode && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 22.20.0 && npm run compile'

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

# Install dependencies for extension (requires Node 23.5.0 for sqlite-vec)
install-extension:
	@echo "=== Installing Extension Dependencies (Node 23.5.0) ==="
	@cd src/chat && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 23.5.0 && npm install --ignore-scripts'

# Install dependencies for VS Code (requires Node 22.20.0)
install-vscode:
	@echo "=== Installing VS Code Dependencies (Node 22.20.0) ==="
	@cd src/vscode && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 22.20.0 && npm install && \
	if [ -f gulpfile.mjs ]; then mv gulpfile.mjs gulpfile.js; fi'

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

# Aliases for shorter commands
compile-ext: compile-extension
compile-vs: compile-vscode

# Watch mode for extension (Terminal 1)
watch-extension:
	@echo "=== Starting Extension Watch Mode ==="
	@cd src/chat && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 23.5.0 && npm run watch'

# Test target
test:
	@echo "=== Running Tests ==="
	@cd src/chat && \
	bash -c '. ~/.nvm/nvm.sh && nvm use 23.5.0 && npm test'

# Debian Package Targets
# ================

# Check if required tools are available for building Debian packages
deb-check-tools:
	@echo "=== Checking Debian packaging tools ==="
	@if ! command -v dpkg-buildpackage >/dev/null 2>&1; then \
		echo "Error: dpkg-buildpackage is required. Install with: sudo apt install dpkg-dev"; \
		exit 1; \
	fi
	@if ! dpkg -l debhelper >/dev/null 2>&1; then \
		echo "Error: debhelper is required. Install with: sudo apt install debhelper"; \
		exit 1; \
	fi

# Build Debian package
deb: deb-check-tools
	@echo "=== Building Debian Package ==="
	@echo "This will create a .deb package for distribution"
	@echo ""
	@echo "Building for architecture: $$(dpkg --print-architecture)"
	@echo "Package version: $$(dpkg-parsechangelog -S version 2>/dev/null || echo '1.0.0')"
	@echo ""

	# Ensure debian directory structure exists
	@if [ ! -d debian ]; then \
		echo "Error: debian directory not found. Please create debian/ directory first."; \
		exit 1; \
	fi

	# Set executable permissions on scripts
	@chmod +x debian/rules debian/postinst debian/prerm 2>/dev/null || true

	# Clean previous builds
	@echo "Cleaning previous build artifacts..."
	@dh_clean 2>/dev/null || true
	@rm -f ../puku-editor_*.deb ../puku-editor_*.dsc ../puku-editor_*.tar.gz ../puku-editor_*.build ../puku-editor_*.changes 2>/dev/null || true

	# Build the package
	@echo "Building package..."
	@dpkg-buildpackage -us -uc -b -d

	@echo ""
	@echo "✅ Debian package built successfully!"
	@echo ""
	@echo "Package files created:"
	@ls -la ../puku-editor_*.deb 2>/dev/null || echo "No .deb file found - build may have failed"
	@ls -la ../puku-editor_*.changes 2>/dev/null || true

	@echo ""
	@echo "To install the package:"
	@echo "  sudo dpkg -i ../puku-editor_*.deb"
	@echo "  sudo apt-get install -f  # Fix dependencies if needed"
	@echo ""
	@echo "To uninstall:"
	@echo "  sudo apt remove puku-editor"

# Build and install Debian package
deb-install: deb
	@echo "=== Installing Debian Package ==="
	@sudo dpkg -i ../puku-editor_*.deb || (echo "Fixing dependencies..." && sudo apt-get install -f -y)
	@echo "✅ Package installed successfully!"

# Clean Debian build artifacts
deb-clean:
	@echo "=== Cleaning Debian build artifacts ==="
	@dh_clean 2>/dev/null || true
	@rm -f ../puku-editor_*.deb ../puku-editor_*.dsc ../puku-editor_*.tar.gz ../puku-editor_*.build ../puku-editor_*.changes 2>/dev/null || true
	@rm -rf debian/.debhelper debian/debhelper-build-stamp debian/files debian/*.substvars 2>/dev/null || true
	@echo "✅ Debian build artifacts cleaned"

# Source package (for uploading to PPA)
deb-source:
	@echo "=== Creating Debian source package ==="
	@dpkg-buildpackage -us -uc -S
	@echo "✅ Source package created!"
	@echo "Files created:"
	@ls -la ../puku-editor_*.dsc ../puku-editor_*.tar.gz ../puku-editor_*.changes 2>/dev/null || true

# Full package build (binary + source)
deb-full: deb-check-tools
	@echo "=== Building full Debian package (source + binary) ==="
	@dpkg-buildpackage -us -uc
	@echo "✅ Full package build completed!"
	@echo "Files created:"
	@ls -la ../puku-editor_* 2>/dev/null || true
