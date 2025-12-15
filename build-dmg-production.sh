#!/bin/bash
set -e

# Puku Editor - Production DMG Build
# Creates a self-contained .app bundle with all dependencies and a DMG installer

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
EXTENSION_DIR="$SCRIPT_DIR/src/chat"
BUILD_DIR="$SCRIPT_DIR/build-production"
DIST_DIR="$SCRIPT_DIR/dist"

# Puku branding
APP_NAME="Puku"
BUNDLE_ID="sh.puku.editor"
VERSION=$(node -p "require('$VSCODE_DIR/package.json').version")

echo "🚀 Building Puku Editor Production DMG v${VERSION}"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Check compilation
echo "📦 Checking VS Code compilation..."
if [ ! -d "$VSCODE_DIR/out" ]; then
    echo "❌ VS Code not compiled. Run 'make compile-vscode' first."
    exit 1
fi

echo "📦 Checking extension compilation..."
if [ ! -d "$EXTENSION_DIR/dist" ]; then
    echo "❌ Extension not compiled. Run 'make compile-extension' first."
    exit 1
fi

# Get Electron app
echo ""
echo "📦 Copying Electron base..."
ELECTRON_APP="$VSCODE_DIR/node_modules/electron/dist/Electron.app"
if [ ! -d "$ELECTRON_APP" ]; then
    echo "❌ Electron not found. Run 'make install-vscode' first."
    exit 1
fi

cp -R "$ELECTRON_APP" "$BUILD_DIR/${APP_NAME}.app"

# Setup paths
APP_CONTENTS="$BUILD_DIR/${APP_NAME}.app/Contents"
APP_RESOURCES="$APP_CONTENTS/Resources"
mkdir -p "$APP_RESOURCES/app"

echo "📦 Bundling VS Code (this may take a few minutes)..."

# Copy VS Code compiled output
echo "  - Copying compiled code..."
cp -R "$VSCODE_DIR/out" "$APP_RESOURCES/app/out"

# Copy ENTIRE out-build directory (contains NLS files and other build artifacts)
echo "  - Copying build artifacts..."
if [ -d "$VSCODE_DIR/out-build" ]; then
    cp -R "$VSCODE_DIR/out-build" "$APP_RESOURCES/app/out-build"
fi

# Copy ALL node_modules (including nested deps) - this is safer
echo "  - Bundling all dependencies (this takes a few minutes)..."
cd "$VSCODE_DIR"
cp -R node_modules "$APP_RESOURCES/app/"
cd "$SCRIPT_DIR"

# Copy config files
cp "$VSCODE_DIR/package.json" "$APP_RESOURCES/app/"
cp "$VSCODE_DIR/product.json" "$APP_RESOURCES/app/"

# Copy resources
echo "📦 Copying resources..."
cp -R "$VSCODE_DIR/resources" "$APP_RESOURCES/app/resources"

# Copy built-in extensions
echo "📦 Bundling built-in extensions..."
mkdir -p "$APP_RESOURCES/app/extensions"

# Copy all VS Code built-in extensions (skip test extensions)
for ext_path in "$VSCODE_DIR/extensions"/*; do
    ext_name=$(basename "$ext_path")
    # Skip test/development extensions
    if [[ "$ext_name" == *"test"* ]] || [[ "$ext_name" == "node_modules" ]]; then
        continue
    fi
    if [ -d "$ext_path" ]; then
        echo "  - $ext_name"
        cp -R "$ext_path" "$APP_RESOURCES/app/extensions/"
    fi
done

# Bundle Puku Editor extension
echo "📦 Bundling Puku Editor extension..."
PUKU_EXT_DIR="$APP_RESOURCES/app/extensions/puku-editor"
mkdir -p "$PUKU_EXT_DIR"

# Copy extension files
cp -R "$EXTENSION_DIR/dist" "$PUKU_EXT_DIR/"
cp "$EXTENSION_DIR/package.json" "$PUKU_EXT_DIR/"
cp "$EXTENSION_DIR/README.md" "$PUKU_EXT_DIR/" 2>/dev/null || true
cp "$EXTENSION_DIR/LICENSE" "$PUKU_EXT_DIR/" 2>/dev/null || true

# Copy extension production dependencies (sqlite-vec and other native modules)
if [ -d "$EXTENSION_DIR/node_modules" ]; then
    echo "  - Bundling extension dependencies..."
    mkdir -p "$PUKU_EXT_DIR/node_modules"

    # Get extension production dependencies
    cd "$EXTENSION_DIR"
    if [ -f package.json ]; then
        EXT_DEPS=$(node -p "Object.keys(require('./package.json').dependencies || {}).join(' ')" 2>/dev/null || echo "")

        for dep in $EXT_DEPS; do
            if [ -d "node_modules/$dep" ]; then
                echo "    - $dep"
                cp -R "node_modules/$dep" "$PUKU_EXT_DIR/node_modules/"
            fi
        done
    fi
    cd "$SCRIPT_DIR"
fi

# Update app metadata
echo ""
echo "📦 Updating app metadata..."
INFO_PLIST="$APP_CONTENTS/Info.plist"

/usr/libexec/PlistBuddy -c "Set :CFBundleName ${APP_NAME}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${APP_NAME}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ${BUNDLE_ID}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${VERSION}" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "$INFO_PLIST"

# Update icon
if [ -f "$VSCODE_DIR/asset/puku.icns" ]; then
    echo "🎨 Updating app icon..."
    cp "$VSCODE_DIR/asset/puku.icns" "$APP_RESOURCES/${APP_NAME}.icns"
    /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile ${APP_NAME}.icns" "$INFO_PLIST"
fi

# Create DMG
echo ""
echo "📦 Creating DMG installer..."
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
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
echo "To install:"
echo "  1. Open the DMG: open \"$DMG_PATH\""
echo "  2. Drag ${APP_NAME}.app to Applications folder"
echo ""
echo "To test before distributing:"
echo "  open \"$BUILD_DIR/${APP_NAME}.app\""
echo ""
