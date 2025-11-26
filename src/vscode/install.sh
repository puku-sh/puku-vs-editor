#!/bin/bash

# Puku Editor Installation Script
# Creates Puku.app and installs 'puku' CLI command

set -e

PUKU_ROOT="/Users/sahamed/Desktop/puku-editor"
VSCODE_ROOT="$PUKU_ROOT/github/vscode"
EDITOR_ROOT="$PUKU_ROOT/github/editor"
APP_NAME="Puku.app"
CLI_NAME="puku"

echo "🚀 Installing Puku Editor..."

# Step 1: Ensure Code-OSS is built
if [ ! -d "$VSCODE_ROOT/.build/electron/Code - OSS.app" ]; then
    echo "❌ Code-OSS app not found. Please build it first with 'npm run compile' in $VSCODE_ROOT"
    exit 1
fi

# Step 2: Create Puku.app wrapper that launches with extension
echo "📦 Creating $APP_NAME..."

# Create app structure
APP_DIR="/Applications/$APP_NAME"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

# Remove old installation
rm -rf "$APP_DIR"

# Create directories
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Create launcher script
cat > "$MACOS_DIR/Puku" << 'LAUNCHER'
#!/bin/bash
PUKU_ROOT="/Users/sahamed/Desktop/puku-editor"
VSCODE_ROOT="$PUKU_ROOT/github/vscode"
EDITOR_ROOT="$PUKU_ROOT/github/editor"

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 23.5.0 > /dev/null 2>&1

# Get the folder to open (passed as argument or current dir)
FOLDER="${1:-.}"

# Launch Code-OSS with Puku extension
cd "$VSCODE_ROOT"
exec ./scripts/code.sh --extensionDevelopmentPath="$EDITOR_ROOT" "$FOLDER"
LAUNCHER

chmod +x "$MACOS_DIR/Puku"

# Create Info.plist
cat > "$CONTENTS_DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>Puku</string>
    <key>CFBundleExecutable</key>
    <string>Puku</string>
    <key>CFBundleIconFile</key>
    <string>Puku.icns</string>
    <key>CFBundleIdentifier</key>
    <string>com.puku.editor</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Puku</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeName</key>
            <string>Folder</string>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>LSHandlerRank</key>
            <string>Alternate</string>
            <key>LSItemContentTypes</key>
            <array>
                <string>public.folder</string>
            </array>
        </dict>
    </array>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>Puku URL</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>puku</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
PLIST

# Copy icon (use Code-OSS icon for now, can be replaced later)
if [ -f "$VSCODE_ROOT/resources/darwin/code.icns" ]; then
    cp "$VSCODE_ROOT/resources/darwin/code.icns" "$RESOURCES_DIR/Puku.icns"
fi

echo "✅ $APP_NAME installed to /Applications/"

# Step 3: Install CLI command
echo "🔧 Installing '$CLI_NAME' CLI command..."

CLI_SCRIPT="/usr/local/bin/$CLI_NAME"

# Create CLI script
sudo tee "$CLI_SCRIPT" > /dev/null << 'CLI'
#!/bin/bash
# Puku Editor CLI
# Usage: puku [folder]

PUKU_ROOT="/Users/sahamed/Desktop/puku-editor"
VSCODE_ROOT="$PUKU_ROOT/github/vscode"
EDITOR_ROOT="$PUKU_ROOT/github/editor"

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 23.5.0 > /dev/null 2>&1

# Get the folder to open
FOLDER="${1:-.}"

# Convert to absolute path
if [[ "$FOLDER" != /* ]]; then
    FOLDER="$(pwd)/$FOLDER"
fi

# Launch
cd "$VSCODE_ROOT"
exec ./scripts/code.sh --extensionDevelopmentPath="$EDITOR_ROOT" "$FOLDER"
CLI

sudo chmod +x "$CLI_SCRIPT"

echo "✅ '$CLI_NAME' CLI installed!"
echo ""
echo "🎉 Installation complete!"
echo ""
echo "Usage:"
echo "  • Open Puku.app from Applications or Spotlight"
echo "  • CLI: puku .              # Open current folder"
echo "  • CLI: puku /path/to/dir   # Open specific folder"
