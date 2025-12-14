#!/usr/bin/env bash
set -e

# Get VS Code version automatically to ensure extension compatibility
VSCODE_VERSION=$(cat src/vscode/package.json | grep '"version"' | cut -d '"' -f 4)
VERSION=${VERSION:-$VSCODE_VERSION}
ARCH=$(uname -m | sed 's/x86_64/amd64/')
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
PACKAGE_NAME="puku-editor"

# Set OS-specific values
case "$OS" in
  "linux")
    EXTENSION="deb"
    PACKAGE_FORMAT="debian"
    INSTALL_PREFIX="/opt"
    ;;
  "darwin")
    EXTENSION="pkg"
    PACKAGE_FORMAT="macos"
    INSTALL_PREFIX="/Applications"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

BUILD_DIR="build/standalone-${OS}"
PACKAGE_DIR="${BUILD_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCH}"

echo "=========================================="
echo "Building STANDALONE VERSION of ${PACKAGE_NAME} v${VERSION}"
echo "Self-contained VS Code editor with Puku extension for ${OS^}"
echo "=========================================="

# Clean previous build
rm -rf ${BUILD_DIR}
mkdir -p ${PACKAGE_DIR}

# Create directory structure
mkdir -p ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}

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
if [ "$OS" = "darwin" ]; then
    # On macOS, copy to app bundle structure
    APP_DIR="${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}.app/Contents"
    mkdir -p ${APP_DIR}/Resources/app
    cp -r src/vscode/out/* ${APP_DIR}/Resources/app/
    cp src/vscode/product.json ${APP_DIR}/Resources/app/ 2>/dev/null || true
    if [ -d "src/vscode/resources" ]; then
        cp -r src/vscode/resources ${APP_DIR}/Resources/app/
    fi

    # Copy Electron binary to MacOS
    mkdir -p ${APP_DIR}/MacOS
    cp -r src/vscode/.build/electron/Electron.app/Contents/MacOS/* ${APP_DIR}/MacOS/
    cp -r src/vscode/.build/electron/Electron.app/Contents/Frameworks ${APP_DIR}/
    cp -r src/vscode/.build/electron/Electron.app/Contents/Resources ${APP_DIR}/

    # Update Info.plist
    cat > ${APP_DIR}/Info.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>Puku Editor</string>
    <key>CFBundleExecutable</key>
    <string>Electron</string>
    <key>CFBundleIconFile</key>
    <string>electron.icns</string>
    <key>CFBundleIdentifier</key>
    <string>sh.puku.editor</string>
    <key>CFBundleName</key>
    <string>Puku Editor</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>EOF
    echo -n "$VSCODE_VERSION" >> ${APP_DIR}/Info.plist
    cat >> ${APP_DIR}/Info.plist << 'EOF'
</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
EOF
else
    # Linux
    cp -r src/vscode/out ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/
    cp src/vscode/product.json ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/ 2>/dev/null || true
    if [ -d "src/vscode/resources" ]; then
        cp -r src/vscode/resources ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/
    fi

    # Copy Electron binary
    mkdir -p ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/electron
    cp -r src/vscode/.build/electron/* ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/electron/
fi

# Copy Puku extension
echo "Copying Puku extension..."
EXTENSION_DIR="${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/extension"
mkdir -p ${EXTENSION_DIR}/dist
cp -r src/chat/dist/* ${EXTENSION_DIR}/dist/
cp src/chat/package.json ${EXTENSION_DIR}/ 2>/dev/null || true

# Copy ALL VS Code node_modules (required for functionality)
echo "Copying VS Code dependencies..."
mkdir -p ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules

# First copy from remote/node_modules (has compiled native modules)
if [ -d "src/vscode/remote/node_modules" ]; then
    echo "  📋 Copying VS Code remote node_modules with native binaries..."
    # Use cp -r to preserve all files including .node binaries
    cp -r src/vscode/remote/node_modules/* ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/
fi

# Then copy from main node_modules (may have additional modules not in remote)
if [ -d "src/vscode/node_modules" ]; then
    echo "  📋 Copying VS Code main node_modules..."
    # Copy only modules that don't exist in remote/node_modules
    for module in src/vscode/node_modules/*; do
        module_name=$(basename "$module")
        if [ ! -d "${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/$module_name" ]; then
            cp -r "$module" ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/
        fi
    done
fi

# Copy essential extension node_modules (tsx and dependencies)
echo "Copying extension dependencies..."
if [ -d "src/chat/node_modules" ]; then
    # Copy only essential extension modules that aren't already in VS Code node_modules
    for dep in tsx esbuild; do
        if [ -d "src/chat/node_modules/${dep}" ] && [ ! -d "${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/${dep}" ]; then
            cp -r src/chat/node_modules/${dep} ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/
        fi
    done

    # Copy .bin directory
    if [ -d "src/chat/node_modules/.bin" ]; then
        mkdir -p ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/.bin
        cp src/chat/node_modules/.bin/tsx ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/node_modules/.bin/ 2>/dev/null || true
    fi
fi

# Create package.json
echo "Creating standalone package.json..."
cat > ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/package.json << PKGJSON
{
  "name": "puku-editor-standalone",
  "version": "$VSCODE_VERSION",
  "description": "VS Code with Puku AI extension",
  "main": "out/main.js",
  "type": "module",
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

# Create launcher scripts and package files based on OS
if [ "$OS" = "darwin" ]; then
    # macOS launcher
    echo "Creating macOS launcher..."

    # The executable is already in the app bundle at Contents/MacOS/Electron
    # No additional launcher needed

    # Create command-line wrapper
    mkdir -p ${PACKAGE_DIR}/usr/local/bin
    cat > ${PACKAGE_DIR}/usr/local/bin/puku-editor << 'WRAPPER'
#!/bin/bash
exec /Applications/Puku\ Editor.app/Contents/MacOS/Electron . --extensionDevelopmentPath=/Applications/Puku\ Editor.app/Contents/Resources/app/extension "$@"
WRAPPER
    chmod +x ${PACKAGE_DIR}/usr/local/bin/puku-editor

    # Create package
    echo "Creating .pkg package..."
    mkdir -p ${BUILD_DIR}/pkgroot
    cp -r ${PACKAGE_DIR}/Applications ${BUILD_DIR}/pkgroot/
    cp -r ${PACKAGE_DIR}/usr ${BUILD_DIR}/pkgroot/

    # Create distribution script for pkgbuild
    cat > ${BUILD_DIR}/distribution << 'DIST'
#!/usr/bin/env bash
# Preinstall and postinstall scripts would go here
exit 0
DIST
    chmod +x ${BUILD_DIR}/distribution

    # Build pkg
    pkgbuild --root ${BUILD_DIR}/pkgroot \
             --identifier sh.puku.editor \
             --version $VSCODE_VERSION \
             --install-location / \
             --scripts ${BUILD_DIR}/distribution \
             ${BUILD_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCH}.pkg

else
    # Linux (existing logic)
    echo "Creating launcher..."
    cat > ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/${PACKAGE_NAME} << 'LAUNCHER'
#!/bin/bash
# Puku Editor Launcher

set -e

# Get installation directory
INSTALL_DIR="/opt/puku-editor"
EXTENSION_DIR="${INSTALL_DIR}/extension"
ELECTRON_BIN="${INSTALL_DIR}/electron/code"

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

    chmod +x ${PACKAGE_DIR}/${INSTALL_PREFIX:1}/${PACKAGE_NAME}/${PACKAGE_NAME}

    # Create wrapper script in /usr/bin
    mkdir -p ${PACKAGE_DIR}/usr/bin
    cat > ${PACKAGE_DIR}/usr/bin/${PACKAGE_NAME} << 'WRAPPER'
#!/bin/bash
exec /opt/puku-editor/${PACKAGE_NAME} "$@"
WRAPPER

    chmod +x ${PACKAGE_DIR}/usr/bin/${PACKAGE_NAME}

    # Create desktop entry
    mkdir -p ${PACKAGE_DIR}/usr/share/applications
    cat > ${PACKAGE_DIR}/usr/share/applications/${PACKAGE_NAME}.desktop << 'DESKTOP'
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

    # Create DEBIAN directory and control file
    mkdir -p ${PACKAGE_DIR}/DEBIAN
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

    # Build deb
    dpkg-deb --build ${PACKAGE_DIR}
fi

# Move to root
cp ${BUILD_DIR}/${PACKAGE_NAME}_${VERSION}_${ARCH}.${EXTENSION} ./

echo ""
echo "=========================================="
echo "✅ Standalone package built successfully!"
echo "=========================================="
echo ""
echo "Package: ${PACKAGE_NAME}_${VERSION}_${ARCH}.${EXTENSION}"
echo "Type: Standalone build with bundled Electron runtime"
echo ""

if [ "$OS" = "darwin" ]; then
    echo "Install with:"
    echo "  sudo installer -pkg ${PACKAGE_NAME}_${VERSION}_${ARCH}.pkg -target /"
    echo ""
    echo "Or just copy the app to /Applications"
    echo ""
    echo "After installation, use:"
    echo "  puku-editor /path/to/your/project"
    echo "  or open Puku Editor.app"
else
    echo "Install with:"
    echo "  sudo dpkg -i ${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
    echo ""
    echo "If you encounter dependency issues, run:"
    echo "  sudo apt-get install -f"
    echo ""
    echo "After installation, use:"
    echo "  puku-editor /path/to/your/project"
fi
echo ""
echo "Requirements:"
echo "  • System libraries (GTK3/NSS for Linux, 10.15+ for macOS) - auto-installed"
echo "  • No Node.js required - Electron runtime is bundled"