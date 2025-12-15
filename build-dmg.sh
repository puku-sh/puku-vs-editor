#!/bin/bash
set -e

# Puku Editor - DMG Build Script
# Packages the compiled VS Code as Puku.app and creates a DMG installer

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
EXTENSION_DIR="$SCRIPT_DIR/src/chat"
BUILD_DIR="$SCRIPT_DIR/build"
DIST_DIR="$SCRIPT_DIR/dist"

# Puku branding
APP_NAME="Puku"
BUNDLE_ID="sh.puku.editor"
VERSION=$(node -p "require('$VSCODE_DIR/package.json').version")

echo "🚀 Building Puku Editor DMG v${VERSION}"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Step 1: Ensure VS Code is compiled
echo ""
echo "📦 Checking VS Code compilation..."
if [ ! -d "$VSCODE_DIR/out" ]; then
    echo "❌ VS Code not compiled. Run 'make compile-vscode' first."
    exit 1
fi

# Step 2: Ensure extension is compiled
echo "📦 Checking extension compilation..."
if [ ! -d "$EXTENSION_DIR/dist" ]; then
    echo "❌ Extension not compiled. Run 'make compile-extension' first."
    exit 1
fi

# Step 3: Get Electron app from node_modules
echo ""
echo "📦 Copying Electron app..."
ELECTRON_APP="$VSCODE_DIR/node_modules/electron/dist/Electron.app"
if [ ! -d "$ELECTRON_APP" ]; then
    echo "❌ Electron not found. Run 'make install-vscode' first."
    exit 1
fi

cp -R "$ELECTRON_APP" "$BUILD_DIR/${APP_NAME}.app"

# Step 4: Copy VS Code resources
echo "📦 Copying VS Code resources..."
APP_CONTENTS="$BUILD_DIR/${APP_NAME}.app/Contents"
APP_RESOURCES="$APP_CONTENTS/Resources"

# Create app directory structure
mkdir -p "$APP_RESOURCES/app"

# Copy compiled VS Code
cp -R "$VSCODE_DIR/out" "$APP_RESOURCES/app/out"
cp -R "$VSCODE_DIR/node_modules" "$APP_RESOURCES/app/node_modules"
cp "$VSCODE_DIR/package.json" "$APP_RESOURCES/app/"
cp "$VSCODE_DIR/product.json" "$APP_RESOURCES/app/"

# Copy extensions
mkdir -p "$APP_RESOURCES/app/extensions"
cp -R "$VSCODE_DIR/extensions"/* "$APP_RESOURCES/app/extensions/"

# Copy built-in extensions
if [ -d "$VSCODE_DIR/out/extensions" ]; then
    cp -R "$VSCODE_DIR/out/extensions"/* "$APP_RESOURCES/app/extensions/"
fi

# Step 5: Bundle Puku Editor extension
echo "📦 Bundling Puku Editor extension..."
PUKU_EXT_DIR="$APP_RESOURCES/app/extensions/puku-editor"
mkdir -p "$PUKU_EXT_DIR"
cp -R "$EXTENSION_DIR/dist" "$PUKU_EXT_DIR/"
cp "$EXTENSION_DIR/package.json" "$PUKU_EXT_DIR/"
cp "$EXTENSION_DIR/README.md" "$PUKU_EXT_DIR/" 2>/dev/null || true

# Copy extension node_modules (only production dependencies)
if [ -d "$EXTENSION_DIR/node_modules" ]; then
    echo "📦 Copying extension dependencies..."
    mkdir -p "$PUKU_EXT_DIR/node_modules"
    # Copy only essential deps (sqlite-vec and native modules)
    for dep in sqlite-vec; do
        if [ -d "$EXTENSION_DIR/node_modules/$dep" ]; then
            cp -R "$EXTENSION_DIR/node_modules/$dep" "$PUKU_EXT_DIR/node_modules/"
        fi
    done
fi

# Step 6: Update app Info.plist
echo "📦 Updating app metadata..."
INFO_PLIST="$APP_CONTENTS/Info.plist"

# Use PlistBuddy to update the plist (macOS built-in tool)
/usr/libexec/PlistBuddy -c "Set :CFBundleName ${APP_NAME}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${APP_NAME}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ${BUNDLE_ID}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${VERSION}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "$INFO_PLIST"

# Update icon if puku.icns exists
if [ -f "$VSCODE_DIR/asset/puku.icns" ]; then
    echo "🎨 Updating app icon..."
    cp "$VSCODE_DIR/asset/puku.icns" "$APP_RESOURCES/${APP_NAME}.icns"
    /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile ${APP_NAME}.icns" "$INFO_PLIST"
fi

# Step 7: Create DMG
echo ""
echo "📦 Creating DMG..."
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
DMG_PATH="$DIST_DIR/$DMG_NAME"

# Create a temporary directory for DMG contents
DMG_TEMP="$BUILD_DIR/dmg-temp"
mkdir -p "$DMG_TEMP"
cp -R "$BUILD_DIR/${APP_NAME}.app" "$DMG_TEMP/"

# Create symlink to Applications folder
ln -s /Applications "$DMG_TEMP/Applications"

# Create DMG using hdiutil (macOS built-in)
hdiutil create -volname "${APP_NAME}" \
    -srcfolder "$DMG_TEMP" \
    -ov -format UDZO \
    "$DMG_PATH"

# Cleanup temp files
rm -rf "$DMG_TEMP"

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 DMG: $DMG_PATH"
echo "📂 App: $BUILD_DIR/${APP_NAME}.app"
echo ""
echo "To install: Open the DMG and drag ${APP_NAME}.app to Applications"
echo ""
