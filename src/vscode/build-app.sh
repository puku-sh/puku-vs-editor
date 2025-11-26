#!/bin/bash
set -e

# Puku Editor - Build Script
# Creates a Puku.app wrapper that launches Code-OSS with the extension

echo "🚀 Building Puku Editor..."

PUKU_ROOT="/Users/sahamed/Desktop/puku-editor"
VSCODE_ROOT="$PUKU_ROOT/github/vscode"
EDITOR_ROOT="$PUKU_ROOT/github/editor"
BUILD_DIR="$PUKU_ROOT/build"
APP_NAME="Puku.app"
APP_PATH="$BUILD_DIR/$APP_NAME"

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Create app structure
CONTENTS="$APP_PATH/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

mkdir -p "$MACOS"
mkdir -p "$RESOURCES"

# Create launcher that runs Code-OSS with extension
echo "📝 Creating launcher..."
cat > "$MACOS/Puku" << 'LAUNCHER'
#!/bin/bash
PUKU_ROOT="/Users/sahamed/Desktop/puku-editor"
VSCODE_APP="$PUKU_ROOT/github/vscode/.build/electron/Code - OSS.app"
EDITOR_EXT="$PUKU_ROOT/github/editor"

# Get folder from arguments or use home directory
FOLDER="$HOME"
for arg in "$@"; do
    if [[ -d "$arg" ]] || [[ -f "$arg" ]]; then
        FOLDER="$arg"
        break
    fi
done

# Convert to absolute path
[[ "$FOLDER" != /* ]] && FOLDER="$(cd "$FOLDER" 2>/dev/null && pwd)"

# Launch Code-OSS with extension
open -a "$VSCODE_APP" --args --extensionDevelopmentPath="$EDITOR_EXT" "$FOLDER"
LAUNCHER
chmod +x "$MACOS/Puku"

# Copy icon
if [ -f "$VSCODE_ROOT/resources/darwin/code.icns" ]; then
    cp "$VSCODE_ROOT/resources/darwin/code.icns" "$RESOURCES/Puku.icns"
fi

# Create Info.plist
echo "📝 Creating Info.plist..."
cat > "$CONTENTS/Info.plist" << 'PLIST'
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

# Create CLI script
echo "📝 Creating CLI..."
cat > "$BUILD_DIR/puku" << 'CLI'
#!/bin/bash
# Puku Editor CLI - Usage: puku [folder]

PUKU_ROOT="/Users/sahamed/Desktop/puku-editor"
VSCODE_APP="$PUKU_ROOT/github/vscode/.build/electron/Code - OSS.app"
EDITOR_EXT="$PUKU_ROOT/github/editor"

FOLDER="${1:-.}"
[[ "$FOLDER" != /* ]] && FOLDER="$(cd "$FOLDER" 2>/dev/null && pwd)"

open -a "$VSCODE_APP" --args --extensionDevelopmentPath="$EDITOR_EXT" "$FOLDER"
CLI
chmod +x "$BUILD_DIR/puku"

echo "✅ Build complete!"
echo ""
echo "Files created:"
echo "  • $APP_PATH"
echo "  • $BUILD_DIR/puku (CLI)"
echo ""
echo "To install:"
echo "  1. cp -R '$APP_PATH' /Applications/"
echo "  2. sudo cp '$BUILD_DIR/puku' /usr/local/bin/"
echo ""
echo "Or test now:"
echo "  open '$APP_PATH'"
echo "  $BUILD_DIR/puku ."
