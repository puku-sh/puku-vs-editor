#!/bin/bash

# Puku Editor Complete Binary Package Creator
# Creates a fully self-contained binary package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Constants
APP_NAME="Puku Editor"
VERSION="2.0.0"
ARCH=$(uname -m | sed 's/x86_64/amd64/')
PACKAGE_NAME="puku-editor"
BUILD_DIR="binary-build"
PACKAGE_FILE="${PACKAGE_NAME}-${VERSION}-${ARCH}.run"

echo -e "${BLUE}🚀 Creating ${APP_NAME} Complete Binary Package${NC}"
echo -e "${BLUE}============================================${NC}"

# Clean previous builds
rm -rf ${BUILD_DIR} ${PACKAGE_FILE}
mkdir -p ${BUILD_DIR}

# Ensure project is built
echo -e "${YELLOW}📦 Ensuring project is built...${NC}"

# Build VS Code if needed
if [ ! -d "src/vscode/out" ]; then
    echo -e "${YELLOW}  Building VS Code...${NC}"
    make compile-vscode || {
        echo -e "${RED}❌ Failed to build VS Code${NC}"
        exit 1
    }
fi

# Build extension if needed
if [ ! -d "src/chat/dist" ]; then
    echo -e "${YELLOW}  Building extension...${NC}"
    make compile-extension || {
        echo -e "${RED}❌ Failed to build extension${NC}"
        exit 1
    }
fi

# Also copy the entire VS Code node_modules to be safe (we'll filter later)
echo -e "${YELLOW}📦 Preparing VS Code dependencies...${NC}"
if [ -d "src/vscode/node_modules" ]; then
    mkdir -p ${BUILD_DIR}/opt/puku-editor/vscode-node_modules
    # Copy just essential modules to save space
    for module in original-fs original-path original-cwd original-url @vscode; do
        if [ -d "src/vscode/node_modules/${module}" ]; then
            cp -r src/vscode/node_modules/${module} ${BUILD_DIR}/opt/puku-editor/vscode-node_modules/ 2>/dev/null || true
        fi
        # Also copy modules starting with these prefixes
        for dir in src/vscode/node_modules/${module}*; do
            if [ -d "$dir" ]; then
                cp -r "$dir" ${BUILD_DIR}/opt/puku-editor/vscode-node_modules/ 2>/dev/null || true
            fi
        done
    done
fi

# Create package structure
echo -e "${YELLOW}📁 Creating package structure...${NC}"
mkdir -p ${BUILD_DIR}/{opt/puku-editor,usr/bin,usr/share/applications,usr/share/icons/hicolor/512x512/apps}

# 1. Copy VS Code files
echo -e "${YELLOW}📦 Copying VS Code files...${NC}"
cp -r src/vscode/out ${BUILD_DIR}/opt/puku-editor/
cp src/vscode/product.json ${BUILD_DIR}/opt/puku-editor/ 2>/dev/null || true
cp src/vscode/package.json ${BUILD_DIR}/opt/puku-editor/ 2>/dev/null || true
if [ -d "src/vscode/resources" ]; then
    cp -r src/vscode/resources ${BUILD_DIR}/opt/puku-editor/
fi

# 2. Copy extension files
echo -e "${YELLOW}📦 Copying extension files...${NC}"
mkdir -p ${BUILD_DIR}/opt/puku-editor/extension
cp -r src/chat/dist/* ${BUILD_DIR}/opt/puku-editor/extension/
cp src/chat/package.json ${BUILD_DIR}/opt/puku-editor/extension/ 2>/dev/null || true

# 3. Copy essential VS Code node_modules
echo -e "${YELLOW}📦 Copying essential VS Code dependencies...${NC}"
mkdir -p ${BUILD_DIR}/opt/puku-editor/node_modules

# Copy VS Code's essential modules if they exist
if [ -d "src/vscode/node_modules" ]; then
    # Copy only essential VS Code modules (not all to save space)
    for module in original-fs original-path original-cwd original-url electron; do
        if [ -d "src/vscode/node_modules/${module}" ]; then
            cp -r src/vscode/node_modules/${module} ${BUILD_DIR}/opt/puku-editor/node_modules/ 2>/dev/null || true
        fi
    done
fi

# 4. Create main launcher
echo -e "${YELLOW}🔧 Creating main launcher...${NC}"
cat > ${BUILD_DIR}/opt/puku-editor/puku-editor << 'EOF'
#!/bin/bash
# Puku Editor Launcher

set -e

# Get installation directory
INSTALL_DIR="/opt/puku-editor"
EXTENSION_DIR="${INSTALL_DIR}/extension"

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js >= 22.20.0 from https://nodejs.org or your package manager."
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
echo "📋 Using Node.js: $(node --version)"

# Change to installation directory
cd "$INSTALL_DIR"

# Setup environment
export NODE_PATH="${INSTALL_DIR}/node_modules:${INSTALL_DIR}/vscode-node_modules:${NODE_PATH}"
export ELECTRON_RUN_AS_NODE=1

# Check for Electron binary in common locations
ELECTRON_PATHS=(
    "./node_modules/electron/dist/electron"
    "/usr/bin/electron"
    "/usr/local/bin/electron"
)

ELECTRON_BIN=""
for path in "${ELECTRON_PATHS[@]}"; do
    if [ -f "$path" ]; then
        ELECTRON_BIN="$path"
        break
    fi
done

# Try different launch methods
if [ -f "./out/vs/server/main.js" ]; then
    # Server mode (preferred)
    if [ -n "$ELECTRON_BIN" ]; then
        echo "📝 Launching with Electron server mode..."
        exec "$ELECTRON_BIN" out/vs/server/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER"
    else
        echo "📝 Launching with Node.js server mode..."
        exec node out/vs/server/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER"
    fi
elif [ -f "./out/main.js" ]; then
    # Direct mode
    if [ -n "$ELECTRON_BIN" ]; then
        echo "📝 Launching with Electron..."
        exec "$ELECTRON_BIN" out/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER"
    else
        echo "📝 Launching with Node.js..."
        # Try with different Node.js options for VS Code
        NODE_OPTIONS="--experimental-modules --no-lazy" exec node out/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER"
    fi
else
    echo "❌ Cannot find VS Code executable"
    echo "Contents of out directory:"
    ls -la out/ 2>/dev/null || echo "No out directory found"
    exit 1
fi
EOF

chmod +x ${BUILD_DIR}/opt/puku-editor/puku-editor

# 5. Create usr/bin symlink launcher
echo -e "${YELLOW}🔗 Creating command launcher...${NC}"
cat > ${BUILD_DIR}/usr/bin/puku-editor << 'EOF'
#!/bin/bash
exec /opt/puku-editor/puku-editor "$@"
EOF
chmod +x ${BUILD_DIR}/usr/bin/puku-editor

# 6. Create desktop entry
echo -e "${YELLOW}📄 Creating desktop entry...${NC}"
cat > ${BUILD_DIR}/usr/share/applications/puku-editor.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Puku Editor
Comment=AI-powered code editor built on VS Code
Exec=/usr/bin/puku-editor %U
Icon=puku-editor
Terminal=false
Categories=Development;IDE;TextEditor;Programming;
Keywords=editor;code;development;programming;ai;chat;
StartupNotify=true
MimeType=text/plain;inode/directory;
EOF

# 7. Create README
echo -e "${YELLOW}📖 Creating README...${NC}"
cat > ${BUILD_DIR}/opt/puku-editor/README.md << EOF
# Puku Editor ${VERSION}

AI-powered code editor built on VS Code with Puku extension.

## Installation

This package was installed using the installer script. Puku Editor is now available:

- Command line: \`puku-editor\`
- Desktop: Find "Puku Editor" in your applications menu

## Usage

\`\`\`bash
# Open current directory
puku-editor

# Open specific folder
puku-editor /path/to/folder

# Open with specific file
puku-editor file.js
\`\`\`

## Features

- ✅ AI-powered chat with multiple language models
- ✅ Inline code completions and suggestions
- ✅ Semantic search with vector embeddings
- ✅ Agent mode for autonomous coding tasks
- ✅ Tool calling and external integrations

## Requirements

- Node.js >= 22.20.0

## Uninstall

To remove Puku Editor:
\`\`\`bash
sudo rm -rf /opt/puku-editor
sudo rm /usr/bin/puku-editor
sudo rm /usr/share/applications/puku-editor.desktop
\`\`\`

## Version

- Version: ${VERSION}
- Architecture: ${ARCH}
EOF

# 8. Create self-extracting installer
echo -e "${YELLOW}🏗️  Creating self-extracting installer...${NC}"

# Create install script that will be embedded
cat > ${BUILD_DIR}/install.sh << 'INSTALL_SCRIPT'
#!/bin/bash
# Puku Editor Installer

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}❌ This installer requires root privileges.${NC}"
    echo -e "${YELLOW}Please run with: sudo $0${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Installing Puku Editor...${NC}"

# Extract payload
SKIP=XXX  # This will be replaced
OFFSET=$(awk '/^__PAYLOAD_BELOW__$/{print NR + 1; exit 0}' "$0")
tail -n +$OFFSET "$0" | tar xzf -

# Copy files to system
cp -r opt/* /opt/
cp -r usr/* /usr/

# Fix permissions
chmod +x /opt/puku-editor/puku-editor
chmod +x /usr/bin/puku-editor

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

echo -e "${GREEN}✅ Puku Editor installed successfully!${NC}"
echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  • Command line: puku-editor [folder]"
echo "  • Applications: Find Puku Editor in your menu"
echo ""
echo -e "${YELLOW}To uninstall:${NC}"
echo "  sudo rm -rf /opt/puku-editor /usr/bin/puku-editor /usr/share/applications/puku-editor.desktop"

exit 0

__PAYLOAD_BELOW__
INSTALL_SCRIPT

chmod +x ${BUILD_DIR}/install.sh

# 9. Create the self-extracting installer
echo -e "${YELLOW}📦 Building self-extracting installer...${NC}"

# Get the size of install script
SCRIPT_SIZE=$(wc -l < ${BUILD_DIR}/install.sh)

# Create the final installer by combining script and payload
sed "s/^SKIP=XXX/SKIP=${SCRIPT_SIZE}/" ${BUILD_DIR}/install.sh > ${PACKAGE_FILE}

# Add payload (compressed files)
cd ${BUILD_DIR}
tar czf - opt usr install.sh >> ../${PACKAGE_FILE}
cd ..

chmod +x ${PACKAGE_FILE}

# Clean up
rm -rf ${BUILD_DIR}

# Show final info
PACKAGE_SIZE=$(du -h ${PACKAGE_FILE} | cut -f1)
echo ""
echo -e "${GREEN}✅ Binary package created successfully!${NC}"
echo ""
echo -e "${YELLOW}📁 Package file:${NC} ${PACKAGE_FILE}"
echo -e "${YELLOW}📦 Package size:${NC} ${PACKAGE_SIZE}"
echo ""
echo -e "${BLUE}🚀 To install:${NC}"
echo "  sudo ./${PACKAGE_FILE}"
echo ""
echo -e "${BLUE}💡 To distribute:${NC}"
echo "  Upload ${PACKAGE_FILE} to GitHub Releases"
echo "  Users can install with: sudo ${PACKAGE_FILE}"