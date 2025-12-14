#!/usr/bin/env bash
set -e

# Get VS Code version automatically to ensure extension compatibility
VSCODE_VERSION=$(cat src/vscode/package.json | grep '"version"' | cut -d '"' -f 4)
VERSION=${VERSION:-$VSCODE_VERSION}
ARCH="amd64"
PACKAGE_NAME="puku-editor"
BUILD_DIR="build/standalone-deb"
PACKAGE_DIR="${BUILD_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCH}"

echo "=========================================="
echo "Building STANDALONE VERSION of ${PACKAGE_NAME} v${VERSION}"
echo "Self-contained VS Code editor with Puku extension"
echo "=========================================="

# Clean previous build
rm -rf ${BUILD_DIR}
mkdir -p ${PACKAGE_DIR}

# Create directory structure
mkdir -p ${PACKAGE_DIR}/DEBIAN
mkdir -p ${PACKAGE_DIR}/usr/bin
mkdir -p ${PACKAGE_DIR}/opt/puku-editor
mkdir -p ${PACKAGE_DIR}/usr/share/applications
mkdir -p ${PACKAGE_DIR}/usr/share/icons/hicolor/512x512/apps

# Ensure project is built
echo "Ensuring VS Code and extension are built..."
if [ ! -d "src/vscode/out" ]; then
    echo "Building VS Code..."
    make compile-vscode
fi

if [ ! -d "src/chat/dist" ]; then
    echo "Building extension..."
    make compile-extension
fi

# Download Electron if not present
echo "Ensuring Electron is downloaded..."
cd src/vscode
if [ ! -d ".build/electron" ]; then
    echo "Downloading Electron..."
    source ~/.nvm/nvm.sh && nvm use 22.20.0
    npm run electron
fi
cd ../..

# Verify Electron was downloaded
if [ ! -d "src/vscode/.build/electron" ]; then
    echo "❌ Failed to download Electron"
    exit 1
fi

# Copy VS Code build
echo "Copying VS Code files..."
cp -r src/vscode/out ${PACKAGE_DIR}/opt/puku-editor/
cp src/vscode/product.json ${PACKAGE_DIR}/opt/puku-editor/ 2>/dev/null || true
if [ -d "src/vscode/resources" ]; then
    cp -r src/vscode/resources ${PACKAGE_DIR}/opt/puku-editor/
fi

# Copy Electron binary
echo "Copying Electron binary..."
mkdir -p ${PACKAGE_DIR}/opt/puku-editor/electron
cp -r src/vscode/.build/electron/* ${PACKAGE_DIR}/opt/puku-editor/electron/

# Copy Puku extension
echo "Copying Puku extension..."
mkdir -p ${PACKAGE_DIR}/opt/puku-editor/extension/dist
cp -r src/chat/dist/* ${PACKAGE_DIR}/opt/puku-editor/extension/dist/
cp src/chat/package.json ${PACKAGE_DIR}/opt/puku-editor/extension/ 2>/dev/null || true

# Copy ALL VS Code node_modules (required for functionality)
echo "Copying VS Code dependencies..."
mkdir -p ${PACKAGE_DIR}/opt/puku-editor/node_modules

# First copy from remote/node_modules (has compiled native modules)
if [ -d "src/vscode/remote/node_modules" ]; then
    echo "  📋 Copying VS Code remote node_modules with native binaries..."
    # Use cp -r to preserve all files including .node binaries
    cp -r src/vscode/remote/node_modules/* ${PACKAGE_DIR}/opt/puku-editor/node_modules/
fi

# Then copy from main node_modules (may have additional modules not in remote)
if [ -d "src/vscode/node_modules" ]; then
    echo "  📋 Copying VS Code main node_modules..."
    # Copy only modules that don't exist in remote/node_modules
    for module in src/vscode/node_modules/*; do
        module_name=$(basename "$module")
        if [ ! -d "${PACKAGE_DIR}/opt/puku-editor/node_modules/$module_name" ]; then
            cp -r "$module" ${PACKAGE_DIR}/opt/puku-editor/node_modules/
        fi
    done
fi

# Copy essential extension node_modules (tsx and dependencies)
echo "Copying extension dependencies..."
if [ -d "src/chat/node_modules" ]; then
    # Copy only essential extension modules that aren't already in VS Code node_modules
    for dep in tsx esbuild; do
        if [ -d "src/chat/node_modules/${dep}" ] && [ ! -d "${PACKAGE_DIR}/opt/puku-editor/node_modules/${dep}" ]; then
            cp -r src/chat/node_modules/${dep} ${PACKAGE_DIR}/opt/puku-editor/node_modules/
        fi
    done

    # Copy .bin directory
    if [ -d "src/chat/node_modules/.bin" ]; then
        mkdir -p ${PACKAGE_DIR}/opt/puku-editor/node_modules/.bin
        cp src/chat/node_modules/.bin/tsx ${PACKAGE_DIR}/opt/puku-editor/node_modules/.bin/ 2>/dev/null || true
    fi
fi

# Create standalone package.json
echo "Creating standalone package.json..."
# Get the actual VS Code version to ensure extension compatibility
VSCODE_VERSION=$(cat src/vscode/package.json | grep '"version"' | cut -d '"' -f 4)
cat > ${PACKAGE_DIR}/opt/puku-editor/package.json << PKGJSON
{
  "name": "puku-editor-standalone",
  "version": "$VSCODE_VERSION",
  "description": "VS Code with Puku AI extension",
  "main": "out/main.js",
  "type": "module",
  "bin": {
    "puku-editor": "./puku-editor"
  },
  "dependencies": {},
  "engines": {
    "node": ">=22.20.0"
  },
  "keywords": [
    "editor",
    "vscode",
    "ai",
    "chat"
  ]
}
PKGJSON

# Create main launcher
echo "Creating launcher..."
cat > ${PACKAGE_DIR}/opt/puku-editor/puku-editor << 'LAUNCHER'
#!/bin/bash
# Puku Editor Launcher

set -e

# Get installation directory
INSTALL_DIR="/opt/puku-editor"
EXTENSION_DIR="${INSTALL_DIR}/extension"
ELECTRON_BIN="${INSTALL_DIR}/electron/puku"

# Check if Electron binary exists
if [ ! -f "$ELECTRON_BIN" ]; then
    echo "❌ Electron binary not found at $ELECTRON_BIN"
    echo "Installation may be corrupted. Please reinstall Puku Editor."
    exit 1
fi

# Get the folder to open
FOLDER="${1:-.}"

# Convert to absolute path
if [[ "$FOLDER" != /* ]]; then
    FOLDER="$(pwd)/$FOLDER"
fi

echo "🚀 Launching Puku Editor..."
echo "📁 Opening folder: $FOLDER"

# Change to installation directory
cd "$INSTALL_DIR"

# Setup environment
export VSCODE_DEV=0
export VSCODE_SKIP_PRELAUNCH=1

# Launch with Electron
echo "📝 Launching with Electron..."
exec "$ELECTRON_BIN" . \
    --extensionDevelopmentPath="$EXTENSION_DIR" \
    "$FOLDER"
LAUNCHER

chmod +x ${PACKAGE_DIR}/opt/puku-editor/puku-editor

# Create wrapper script in /usr/bin
cat > ${PACKAGE_DIR}/usr/bin/puku-editor << 'WRAPPER'
#!/bin/bash
exec /opt/puku-editor/puku-editor "$@"
WRAPPER

chmod +x ${PACKAGE_DIR}/usr/bin/puku-editor

# Create desktop entry
cat > ${PACKAGE_DIR}/usr/share/applications/puku-editor.desktop << 'DESKTOP'
[Desktop Entry]
Version=1.0
Type=Application
Name=Puku Editor
Comment=AI-powered code editor built on VS Code
GenericName=Text Editor
Exec=/usr/bin/puku-editor %U
Icon=puku-editor
Terminal=false
Categories=Development;IDE;TextEditor;Programming;
Keywords=editor;code;development;programming;ai;chat;
StartupNotify=true
MimeType=text/plain;inode/directory;
Actions=NewWindow;

[Desktop Action NewWindow]
Name=New Window
Exec=/usr/bin/puku-editor
DESKTOP

# Create README
cat > ${PACKAGE_DIR}/opt/puku-editor/README.md << 'README'
# Puku Editor Standalone

AI-powered code editor built on VS Code with Puku extension.

## Installation

This package was installed using the debian installer.

## Usage

### Command Line
```bash
puku-editor                # Open current directory
puku-editor /path/to/folder # Open specific folder
puku-editor file.js         # Open specific file
```

### Applications Menu
- Find "Puku Editor" in your applications menu

## Features

- ✅ AI-powered chat with multiple language models
- ✅ Inline code completions and suggestions
- ✅ Semantic search with vector embeddings
- ✅ Agent mode for autonomous coding tasks
- ✅ Tool calling and external integrations

## Requirements

- No external dependencies required
- Electron runtime is bundled with the package

## Configuration

The editor loads the Puku extension automatically. No additional configuration needed.

## Troubleshooting

If the editor fails to launch, ensure you have the required system libraries:
```bash
sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0
```

## Uninstall

```bash
sudo apt remove puku-editor
```

## Version

- Version: $VERSION
- Architecture: amd64
- Type: Standalone build with bundled Electron runtime
README

# Create control file
cat > ${PACKAGE_DIR}/DEBIAN/control << EOF
Package: ${PACKAGE_NAME}
Version: ${VERSION}
Section: editors
Priority: optional
Architecture: ${ARCH}
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Recommends: git
Maintainer: Puku Team <team@puku.sh>
Description: AI-powered code editor built on VS Code (Standalone Build)
 Puku Editor is a VS Code-based code editor with AI integration,
 featuring chat interfaces, inline completions, semantic search,
 and agent mode for autonomous coding tasks.
 .
 This is a standalone build with VS Code core, Electron runtime,
 and Puku extension bundled. No external dependencies required.
 .
 Features:
  - VS Code editing experience with full feature set
  - Puku AI extension with multiple model support
  - Inline code completions and suggestions
  - Semantic search with vector embeddings
  - Agent mode for multi-step coding tasks
  - Tool calling and external integrations
  - Self-contained with bundled Electron runtime
EOF

# Create postinst script
cat > ${PACKAGE_DIR}/DEBIAN/postinst << 'EOF'
#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Configuring Puku Editor...${NC}"

# Verify Electron binary exists
if [ ! -f "/opt/puku-editor/electron/puku" ]; then
    echo -e "${RED}Error: Electron binary not found${NC}"
    echo "Installation may be corrupted."
    exit 1
fi

echo -e "${GREEN}✅ Electron binary found${NC}"

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

# Create simple icon if not exists
if [ ! -f "/usr/share/icons/hicolor/512x512/apps/puku-editor.png" ]; then
    echo -e "${YELLOW}Creating application icon...${NC}"
    # Create a simple text-based icon
    if command -v convert >/dev/null 2>&1; then
        convert -size 512x512 xc:'#1e1e1e' \
                -fill white -font DejaVu-Sans-Bold -pointsize 72 -gravity center -annotate +0-20 'Puku' \
                -fill '#007acc' -font DejaVu-Sans -pointsize 48 -gravity center -annotate +0+30 'Editor' \
                /usr/share/icons/hicolor/512x512/apps/puku-editor.png 2>/dev/null || true
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Puku Editor Installed Successfully!${NC}"
echo "=========================================="
echo ""
echo "✅ Installation: /opt/puku-editor"
echo "✅ Command: puku-editor"
echo "✅ Applications: Find 'Puku Editor' in menu"
echo ""
echo "Usage:"
echo "  puku-editor                  # Open current folder"
echo "  puku-editor /path/to/project  # Open project folder"
echo "  puku-editor file.js          # Open specific file"
echo ""
echo "=========================================="
EOF

# Create prerm script
cat > ${PACKAGE_DIR}/DEBIAN/prerm << 'EOF'
#!/bin/bash
set -e
# Nothing to do before removal
EOF

# Create postrm script
cat > ${PACKAGE_DIR}/DEBIAN/postrm << 'EOF'
#!/bin/bash
set -e

if [ "$1" = "purge" ]; then
    # Remove icon if we created it
    rm -f /usr/share/icons/hicolor/512x512/apps/puku-editor.png
fi

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
EOF

# Make scripts executable
chmod 755 ${PACKAGE_DIR}/DEBIAN/postinst
chmod 755 ${PACKAGE_DIR}/DEBIAN/prerm
chmod 755 ${PACKAGE_DIR}/DEBIAN/postrm

# Calculate package size
PACKAGE_SIZE=$(du -sh ${PACKAGE_DIR} | cut -f1)

# Build the package
echo "Building .deb package..."
dpkg-deb --build ${PACKAGE_DIR}

# Move to root
mv ${BUILD_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb ./${PACKAGE_NAME}_${VERSION}_${ARCH}.deb

echo ""
echo "=========================================="
echo "✅ Standalone package built successfully!"
echo "=========================================="
echo ""
echo "Package: ${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
echo "Size: ${PACKAGE_SIZE}"
echo "Type: Standalone build with bundled Electron runtime"
echo ""
echo "Install with:"
echo "  sudo dpkg -i ${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
echo ""
echo "If you encounter dependency issues, run:"
echo "  sudo apt-get install -f"
echo ""
echo "Requirements:"
echo "  • System libraries (GTK3, NSS, etc.) - installed automatically"
echo "  • No Node.js required - Electron runtime is bundled"
echo ""
echo "After installation, use:"
echo "  puku-editor /path/to/your/project"