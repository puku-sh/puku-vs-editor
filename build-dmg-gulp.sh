#!/bin/bash
set -e

# Puku Editor - Production DMG Build (using VS Code's official gulp build)
# This script builds Puku's forked VS Code using the official gulp build system,
# then packages it with the Puku Editor extension into a DMG installer.

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

# Step 1: Build VS Code using official gulp build system
echo ""
echo "📦 Building VS Code with gulp (this may take 10-15 minutes)..."
cd "$VSCODE_DIR"

# Ensure correct Node version
source ~/.nvm/nvm.sh && nvm use 22.20.0

# Run gulp production build with increased memory
export NODE_OPTIONS="--max-old-space-size=8192"
npx gulp vscode-darwin-arm64-min

# Check if build succeeded
GULP_OUTPUT_DIR="$SCRIPT_DIR/VSCode-darwin-arm64"
if [ ! -d "$GULP_OUTPUT_DIR" ]; then
    echo "❌ Gulp build failed - output directory not found: $GULP_OUTPUT_DIR"
    exit 1
fi

echo "✅ Gulp build complete!"
echo ""

# Step 2: Copy gulp-built VS Code to our build directory
echo "📦 Packaging Puku.app from gulp build..."
cp -R "$GULP_OUTPUT_DIR/VSCode-darwin-arm64.app" "$BUILD_DIR/${APP_NAME}.app"

# Setup paths
APP_CONTENTS="$BUILD_DIR/${APP_NAME}.app/Contents"
APP_RESOURCES="$APP_CONTENTS/Resources"

# Step 3: Add Puku Editor extension
echo "📦 Adding Puku Editor extension..."
PUKU_EXT_DIR="$APP_RESOURCES/app/extensions/puku-editor"
mkdir -p "$PUKU_EXT_DIR"

# Copy extension files
cp -R "$EXTENSION_DIR/dist" "$PUKU_EXT_DIR/"
cp "$EXTENSION_DIR/package.json" "$PUKU_EXT_DIR/"
cp "$EXTENSION_DIR/README.md" "$PUKU_EXT_DIR/" 2>/dev/null || true
cp "$EXTENSION_DIR/LICENSE" "$PUKU_EXT_DIR/" 2>/dev/null || true

# Copy extension production dependencies
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

# Step 4: Update app metadata with Puku branding
echo ""
echo "🎨 Applying Puku branding..."
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

# Step 5: Create DMG installer
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
rm -rf "$GULP_OUTPUT_DIR"

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
