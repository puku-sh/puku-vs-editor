#!/bin/bash
set -e

# Puku Editor - Production DMG
# RULES:
# 1. Build Puku VS Code fork
# 2. Bundle ONLY Puku Chat extension (src/chat)
# 3. NO marketplace extensions (skip internet downloads)
# 4. Use development structure (same as ./launch.sh)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
BUILD_DIR="$SCRIPT_DIR/build-production"
DIST_DIR="$SCRIPT_DIR/dist"

# Puku branding
APP_NAME="Puku"
BUNDLE_ID="sh.puku.editor"
VERSION=$(node -p "require('$VSCODE_DIR/package.json').version")

echo "🚀 Building Puku VS Code DMG v${VERSION}"
echo ""
echo "Rules:"
echo "  ✓ Build Puku VS Code fork"
echo "  ✓ Bundle ONLY Puku Chat extension (src/chat)"
echo "  ✓ NO marketplace extensions"
echo "  ✓ Development structure (same as ./launch.sh)"
echo ""

# Check if VS Code is compiled
if [ ! -d "$VSCODE_DIR/.build/electron/${APP_NAME}.app" ]; then
    echo "❌ VS Code not built. Run 'make install-vscode' and 'make compile-vscode' first."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Copy the Electron shell
echo "📦 Copying Electron shell from .build/electron/..."
cp -R "$VSCODE_DIR/.build/electron/${APP_NAME}.app" "$BUILD_DIR/"

PUKU_APP="$BUILD_DIR/${APP_NAME}.app"
APP_RESOURCES="$PUKU_APP/Contents/Resources/app"

# Create app directory structure
echo "📦 Creating app directory structure..."
mkdir -p "$APP_RESOURCES"

# Copy compiled VS Code source
echo "📦 Copying compiled VS Code source..."
cp -R "$VSCODE_DIR/out" "$APP_RESOURCES/"
cp -R "$VSCODE_DIR/resources" "$APP_RESOURCES/"
cp "$VSCODE_DIR/package.json" "$APP_RESOURCES/"
cp "$VSCODE_DIR/product.json" "$APP_RESOURCES/"

# Copy built-in extensions
if [ -d "$VSCODE_DIR/extensions" ]; then
	echo "📦 Copying built-in extensions..."
	cp -R "$VSCODE_DIR/extensions" "$APP_RESOURCES/"
fi

# Copy node_modules (production dependencies)
if [ -d "$VSCODE_DIR/node_modules" ]; then
	echo "📦 Copying production dependencies..."
	cp -R "$VSCODE_DIR/node_modules" "$APP_RESOURCES/"
fi

# Bundle Puku Chat extension
echo "📦 Bundling Puku Chat extension..."
EXTENSIONS_DIR="$APP_RESOURCES/extensions"
PUKU_EXTENSION_DIR="$EXTENSIONS_DIR/puku-editor"

mkdir -p "$PUKU_EXTENSION_DIR"

# Copy compiled extension
cp -R "$SCRIPT_DIR/src/chat/dist/"* "$PUKU_EXTENSION_DIR/"
cp "$SCRIPT_DIR/src/chat/package.json" "$PUKU_EXTENSION_DIR/"

# Copy extension dependencies
if [ -d "$SCRIPT_DIR/src/chat/node_modules" ]; then
	echo "  - Copying extension dependencies..."
	cp -R "$SCRIPT_DIR/src/chat/node_modules" "$PUKU_EXTENSION_DIR/"
fi

# Create DMG installer
echo ""
echo "📦 Creating DMG installer..."
DMG_NAME="${APP_NAME}-${VERSION}-$(date +%Y%m%d-%H%M%S).dmg"
DMG_PATH="$DIST_DIR/$DMG_NAME"

# Create temporary directory for DMG contents
DMG_TEMP="$BUILD_DIR/dmg-temp"
mkdir -p "$DMG_TEMP"
cp -R "$BUILD_DIR/${APP_NAME}.app" "$DMG_TEMP/"

# Create Applications symlink for easy installation
ln -s /Applications "$DMG_TEMP/Applications"

# Create DMG
echo "  - Creating disk image..."
hdiutil create -volname "${APP_NAME}" \
    -srcfolder "$DMG_TEMP" \
    -ov -format UDZO \
    "$DMG_PATH"

# Cleanup
rm -rf "$DMG_TEMP"

# Get sizes
APP_SIZE=$(du -sh "$BUILD_DIR/${APP_NAME}.app" | awk '{print $1}')
DMG_SIZE=$(du -sh "$DMG_PATH" | awk '{print $1}')

echo ""
echo "✅ Production build complete!"
echo ""
echo "📦 App Bundle:  $BUILD_DIR/${APP_NAME}.app ($APP_SIZE)"
echo "💿 DMG Installer: $DMG_PATH ($DMG_SIZE)"
echo ""
echo "What's included:"
echo "  • Puku VS Code fork (development mode)"
echo "  • Puku Chat extension (bundled)"
echo "  • NO marketplace extensions"
echo ""
echo "To install:"
echo "  Drag Puku.app to Applications folder"
echo ""
echo "To test before distributing:"
echo "  open \"$BUILD_DIR/${APP_NAME}.app\""
echo ""
