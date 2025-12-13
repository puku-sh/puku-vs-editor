#!/bin/bash

# Puku Editor Binary Package Builder
# Creates a self-contained binary bundle

set -e

# Constants
APP_NAME="Puku Editor"
VERSION="2.0.0"
ARCH="amd64"
PACKAGE_NAME="puku-editor-binary"
BUNDLE_DIR="build/${PACKAGE_NAME}-${VERSION}-${ARCH}"

echo "🚀 Building ${APP_NAME} Binary Package v${VERSION}"
echo "============================================"

# First, ensure the project is built
if [ ! -d "src/vscode/out" ]; then
    echo "📦 VS Code not built. Building..."
    make compile-vscode
fi

if [ ! -d "src/chat/dist" ]; then
    echo "📦 Extension not built. Building..."
    make compile-extension
fi

# Install tsx locally if not present
if [ ! -d "src/chat/node_modules/.bin/tsx" ] && [ ! -d "src/chat/node_modules/tsx" ]; then
    echo "📦 Installing tsx for binary package..."
    cd src/chat
    npm install tsx --save
    cd ../..
fi

# Clean previous builds
rm -rf build
mkdir -p "${BUNDLE_DIR}"

# Create bundle structure
mkdir -p "${BUNDLE_DIR}"/{bin,lib,share/{applications,icons/hicolor/512x512/apps}}

# 1. Copy VS Code build
echo "📦 Copying VS Code files..."
cp -r src/vscode/out "${BUNDLE_DIR}/"
cp -r src/vscode/node_modules "${BUNDLE_DIR}/lib/" 2>/dev/null || echo "⚠️ VS Code node_modules not found, will use system Node.js"
cp src/vscode/product.json "${BUNDLE_DIR}/" 2>/dev/null || echo "⚠️ product.json not found"
cp src/vscode/package.json "${BUNDLE_DIR}/" 2>/dev/null || echo "⚠️ package.json not found"
cp -r src/vscode/resources "${BUNDLE_DIR}/" 2>/dev/null || echo "⚠️ No resources directory found"

# 2. Copy Puku extension
echo "📦 Copying Puku extension..."
mkdir -p "${BUNDLE_DIR}/extension"
cp -r src/chat/dist/* "${BUNDLE_DIR}/extension/"
cp src/chat/package.json "${BUNDLE_DIR}/extension/" 2>/dev/null || echo "⚠️ Extension package.json not found"

# Copy tsx from extension node_modules if available
if [ -f "src/chat/node_modules/.bin/tsx" ]; then
    mkdir -p "${BUNDLE_DIR}/lib/.bin"
    cp src/chat/node_modules/.bin/tsx "${BUNDLE_DIR}/lib/.bin/"
    cp -r src/chat/node_modules/tsx "${BUNDLE_DIR}/lib/node_modules/" 2>/dev/null || true
fi

# 3. Copy launch scripts
echo "📦 Copying launch scripts..."
[ -f launch.sh ] && cp launch.sh "${BUNDLE_DIR}/bin/" 2>/dev/null || echo "⚠️ launch.sh not found"
[ -f src/vscode/scripts/code.sh ] && cp src/vscode/scripts/code.sh "${BUNDLE_DIR}/bin/" 2>/dev/null || echo "⚠️ VS Code code.sh not found"
chmod +x "${BUNDLE_DIR}"/bin/*.sh 2>/dev/null || true

# 4. Create main launcher
echo "📦 Creating main launcher..."
cat > "${BUNDLE_DIR}/puku-editor" << 'LAUNCHER'
#!/bin/bash
# Puku Editor Self-Contained Binary Launcher

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Constants
PUKU_ROOT="${SCRIPT_DIR}"
VSCODE_ROOT="${PUKU_ROOT}"
EXTENSION_ROOT="${PUKU_ROOT}/extension"
APP_NAME="Puku Editor"

echo "🚀 Launching $APP_NAME..."

# Check if installation exists
if [ ! -d "$VSCODE_ROOT/out" ]; then
    echo "❌ VS Code build not found in bundle."
    exit 1
fi

if [ ! -d "$EXTENSION_ROOT" ]; then
    echo "❌ Puku Editor extension not found in bundle."
    exit 1
fi

# Setup Node.js environment
export NODE_PATH="${PUKU_ROOT}/lib/node_modules:$NODE_PATH"
export ELECTRON_RUN_AS_NODE=1

# Check Node.js availability
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js >= 22.20.0 from https://nodejs.org or your package manager."
    exit 1
fi

echo "📋 Using Node.js: $(node --version)"

# Get the folder to open (passed as argument or current dir)
FOLDER="${1:-.}"

# Convert to absolute path
if [[ "$FOLDER" != /* ]]; then
    FOLDER="$(pwd)/$FOLDER"
fi

echo "📁 Opening folder: $FOLDER"
echo "🔧 Extension path: $EXTENSION_ROOT"

# Set working directory
cd "$VSCODE_ROOT"

# Launch VS Code with Puku extension using Node.js directly
if [ -f "./out/vs/server/main.js" ]; then
    exec node out/vs/server/main.js --extensionDevelopmentPath="$EXTENSION_ROOT" "$FOLDER"
elif [ -f "./out/main.js" ]; then
    # Check for tsx in local node_modules
    if [ -f "${PUKU_ROOT}/lib/.bin/tsx" ]; then
        # Use local tsx
        export NODE_PATH="${PUKU_ROOT}/lib:${NODE_PATH}"
        exec node "${PUKU_ROOT}/lib/.bin/tsx" out/main.js --extensionDevelopmentPath="$EXTENSION_ROOT" "$FOLDER"
    elif command -v npx >/dev/null 2>&1; then
        # Use npx tsx
        exec npx tsx out/main.js --extensionDevelopmentPath="$EXTENSION_ROOT" "$FOLDER"
    else
        # Try without tsx (might work for some cases)
        exec node out/main.js --extensionDevelopmentPath="$EXTENSION_ROOT" "$FOLDER"
    fi
else
    echo "❌ VS Code main executable not found."
    exit 1
fi
LAUNCHER

chmod +x "${BUNDLE_DIR}/puku-editor"

# 5. Create desktop entry
echo "📦 Creating desktop entry..."
cat > "${BUNDLE_DIR}/share/applications/${APP_NAME}.desktop" << 'DESKTOP'
[Desktop Entry]
Version=1.0
Type=Application
Name=Puku Editor
Comment=AI-powered code editor built on VS Code
Exec=puku-editor %U
Icon=puku-editor
Terminal=false
Categories=Development;IDE;TextEditor;Programming;
Keywords=editor;code;development;programming;ai;chat;
StartupNotify=true
DESKTOP

# 6. Create icon (using a simple text-based icon if no image available)
if command -v convert >/dev/null 2>&1; then
    convert -size 512x512 xc:'#1e1e1e' -fill white -font DejaVu-Sans-Bold -pointsize 72 -gravity center -annotate +0-20 'Puku' -fill '#007acc' -font DejaVu-Sans -pointsize 48 -gravity center -annotate +0+30 'Editor' "${BUNDLE_DIR}/share/icons/hicolor/512x512/apps/puku-editor.png" 2>/dev/null || echo "Creating simple text-based icon failed"
else
    echo "📝 Note: ImageMagick not available, using default icon"
fi

# 7. Create installation script
echo "📦 Creating installation script..."
cat > "${BUNDLE_DIR}/install.sh" << 'INSTALL'
#!/bin/bash
# Puku Editor Installation Script

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_PREFIX="/opt/puku-editor"

echo "🚀 Installing Puku Editor..."

# Check permissions
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ This installer requires root privileges."
    echo "Please run with: sudo ./install.sh"
    exit 1
fi

# Remove existing installation
if [ -d "$INSTALL_PREFIX" ]; then
    echo "🗑️  Removing existing installation..."
    rm -rf "$INSTALL_PREFIX"
fi

# Install files
echo "📦 Installing files..."
mkdir -p "$INSTALL_PREFIX"
cp -r "$SCRIPT_DIR"/* "$INSTALL_PREFIX/"

# Create symlink
echo "🔗 Creating command symlink..."
ln -sf "$INSTALL_PREFIX/puku-editor" /usr/local/bin/puku-editor

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

echo ""
echo "✅ Puku Editor installed successfully!"
echo ""
echo "📋 Usage:"
echo "  • Command line: puku-editor [folder]"
echo "  • Open current folder: puku-editor"
echo "  • Open specific folder: puku-editor /path/to/folder"
echo ""
echo "🗑️  To uninstall: sudo rm -rf /opt/puku-editor /usr/local/bin/puku-editor"
INSTALL

chmod +x "${BUNDLE_DIR}/install.sh"

# 8. Create uninstall script
cat > "${BUNDLE_DIR}/uninstall.sh" << 'UNINSTALL'
#!/bin/bash
# Puku Editor Uninstallation Script

set -e

INSTALL_PREFIX="/opt/puku-editor"

echo "🗑️  Uninstalling Puku Editor..."

# Check permissions
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ This uninstaller requires root privileges."
    echo "Please run with: sudo ./uninstall.sh"
    exit 1
fi

# Remove symlink
if [ -L "/usr/local/bin/puku-editor" ]; then
    echo "🔗 Removing command symlink..."
    rm -f /usr/local/bin/puku-editor
fi

# Remove installation directory
if [ -d "$INSTALL_PREFIX" ]; then
    echo "📦 Removing installation directory..."
    rm -rf "$INSTALL_PREFIX"
fi

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

echo ""
echo "✅ Puku Editor uninstalled successfully!"
UNINSTALL

chmod +x "${BUNDLE_DIR}/uninstall.sh"

# 9. Create README
cat > "${BUNDLE_DIR}/README.md" << 'README'
# Puku Editor Binary Package

A self-contained binary distribution of Puku Editor with all dependencies included.

## Installation

### Quick Install (Recommended)
```bash
sudo ./install.sh
```

### Manual Install
```bash
sudo cp -r * /opt/puku-editor/
sudo ln -sf /opt/puku-editor/puku-editor /usr/local/bin/puku-editor
```

## Usage

### Command Line
```bash
puku-editor
puku-editor /path/to/folder
```

### Requirements
- Node.js >= 22.20.0 (auto-detected)
- No external dependencies required

## Features

- ✅ AI-powered chat interfaces with multiple language models
- ✅ Inline code completions and suggestions
- ✅ Semantic search with vector embeddings
- ✅ Agent mode for autonomous coding tasks
- ✅ Tool calling and external integrations
- ✅ Self-contained - no external downloads needed

## Uninstall

```bash
sudo ./uninstall.sh
```

## Troubleshooting

If Node.js is not found, install it from https://nodejs.org or your package manager.

## Version Information

- Version: 2.0.0
- Architecture: amd64
- Build Date: $(date)
README

# 10. Create tarball
echo "📦 Creating distribution tarball..."
FULL_PACKAGE_NAME="${PACKAGE_NAME}-${VERSION}-${ARCH}"
cd build
tar -czf "${FULL_PACKAGE_NAME}.tar.gz" "${FULL_PACKAGE_NAME}"
rm -rf "${FULL_PACKAGE_NAME}"
cd ..

echo ""
echo "✅ Binary package created successfully!"
echo ""
echo "📁 Package location: build/${FULL_PACKAGE_NAME}.tar.gz"
echo ""
echo "🚀 Installation:"
echo "  tar -xzf ${FULL_PACKAGE_NAME}.tar.gz"
echo "  cd ${FULL_PACKAGE_NAME}"
echo "  sudo ./install.sh"
echo ""
echo "💡 Alternative: Extract and copy manually to /opt/puku-editor/"