#!/bin/bash
set -e

# Simplified Puku Editor DMG Build
# Uses the existing Code-OSS setup and packages it with Puku branding

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
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

# Check compilation
echo "📦 Checking compilation..."
if [ ! -d "$VSCODE_DIR/out" ]; then
    echo "❌ VS Code not compiled. Run 'make compile-vscode' first."
    exit 1
fi

# Get Electron app
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

echo "📦 Symlinking to development build..."
# Use symlinks to avoid copying huge node_modules
ln -s "$VSCODE_DIR/out" "$APP_RESOURCES/app/out"
ln -s "$VSCODE_DIR/node_modules" "$APP_RESOURCES/app/node_modules"
ln -s "$VSCODE_DIR/resources" "$APP_RESOURCES/app/resources"

# Create extensions directory and symlink built-in extensions
mkdir -p "$APP_RESOURCES/app/extensions"
# Symlink VS Code built-in extensions
for ext in "$VSCODE_DIR/extensions"/*; do
    if [ -d "$ext" ]; then
        ln -s "$ext" "$APP_RESOURCES/app/extensions/$(basename "$ext")"
    fi
done

# Add Puku Editor extension
echo "📦 Adding Puku Editor extension..."
PUKU_EXT="$APP_RESOURCES/app/extensions/puku-editor"
ln -s "$SCRIPT_DIR/src/chat" "$PUKU_EXT"

# Copy just the config files
cp "$VSCODE_DIR/package.json" "$APP_RESOURCES/app/"
cp "$VSCODE_DIR/product.json" "$APP_RESOURCES/app/"

# Update app metadata
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

echo ""
echo "✅ Development build complete!"
echo ""
echo "📂 App: $BUILD_DIR/${APP_NAME}.app"
echo ""
echo "To launch:"
echo "  open \"$BUILD_DIR/${APP_NAME}.app\""
echo ""
echo "Note: This is a development build using:"
echo "  • npm run compile → out/ directory (fast iteration)"
echo "  • Symlinks to src/vscode/out and src/chat"
echo "  • Changes to compiled code reflect immediately"
echo ""
echo "For production builds (distributable DMG):"
echo "  make dmg-gulp  # Uses official gulp build system"
echo ""
