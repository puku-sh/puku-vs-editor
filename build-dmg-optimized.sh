#!/bin/bash
set -e

# Puku Editor - Optimized DMG Build
# Minimal extensions + aggressive compression for smaller download size

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
EXTENSION_DIR="$SCRIPT_DIR/src/chat"
BUILD_DIR="$SCRIPT_DIR/build-production"
DIST_DIR="$SCRIPT_DIR/dist"

# Puku branding
APP_NAME="Puku"
BUNDLE_ID="sh.puku.editor"
VERSION=$(node -p "require('$VSCODE_DIR/package.json').version")

# Essential extensions to bundle (keep only the most used)
ESSENTIAL_EXTENSIONS=(
    # Core editing
    "configuration-editing"
    "emmet"
    "merge-conflict"
    "references-view"

    # Git
    "git"
    "git-base"
    "github"
    "github-authentication"

    # Languages - Keep top 10 most popular
    "typescript-language-features"
    "typescript-basics"
    "javascript"
    "json"
    "json-language-features"
    "markdown-basics"
    "markdown-language-features"
    "html"
    "html-language-features"
    "css"
    "css-language-features"
    "python"
    "go"

    # Themes - Keep 2 light, 2 dark
    "theme-defaults"
    "theme-monokai"
    "theme-solarized-light"
    "theme-solarized-dark"

    # Essential UI
    "simple-browser"
    "media-preview"
    "notebook-renderers"

    # Authentication
    "microsoft-authentication"
)

echo "🚀 Building Optimized Puku Editor DMG v${VERSION}"
echo "📦 Using gulp production build + stripping to $(echo ${ESSENTIAL_EXTENSIONS[@]} | wc -w | tr -d ' ') essential extensions"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Check for gulp production build
echo "📦 Checking for gulp production build..."
GULP_BUILD_DIR="$SCRIPT_DIR/src/VSCode-darwin-arm64"
if [ ! -d "$GULP_BUILD_DIR/Puku.app" ]; then
    echo "❌ Production build not found. Run:"
    echo "   cd src/vscode && npx gulp vscode-darwin-arm64-min"
    echo ""
    echo "This creates a minified production build with all required files."
    exit 1
fi

echo "📦 Checking extension compilation..."
if [ ! -d "$EXTENSION_DIR/dist" ]; then
    echo "❌ Extension not compiled. Run 'make compile-extension' first."
    exit 1
fi

# Copy gulp-built .app and strip extensions
echo ""
echo "📦 Copying gulp production build..."
cp -R "$GULP_BUILD_DIR/${APP_NAME}.app" "$BUILD_DIR/${APP_NAME}.app"

# Setup paths
APP_CONTENTS="$BUILD_DIR/${APP_NAME}.app/Contents"
APP_RESOURCES="$APP_CONTENTS/Resources"
APP_EXTENSIONS="$APP_RESOURCES/app/extensions"

echo "📦 Stripping non-essential extensions from production build..."

BUNDLED_COUNT=0
SKIPPED_COUNT=0

# Remove ALL extensions first (except Puku which we'll add later)
if [ -d "$APP_EXTENSIONS" ]; then
    for ext_path in "$APP_EXTENSIONS"/*; do
        ext_name=$(basename "$ext_path")

        # Skip test/development extensions
        if [[ "$ext_name" == *"test"* ]] || [[ "$ext_name" == "node_modules" ]]; then
            rm -rf "$ext_path"
            continue
        fi

        # Check if extension is in essential list
        IS_ESSENTIAL=false
        for essential in "${ESSENTIAL_EXTENSIONS[@]}"; do
            if [[ "$ext_name" == "$essential" ]]; then
                IS_ESSENTIAL=true
                break
            fi
        done

        if [ "$IS_ESSENTIAL" = true ]; then
            echo "  ✓ Keeping $ext_name"
            BUNDLED_COUNT=$((BUNDLED_COUNT + 1))
        else
            echo "  ✗ Removing $ext_name"
            rm -rf "$ext_path"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        fi
    done
fi

echo "  📊 Kept: $BUNDLED_COUNT | Removed: $SKIPPED_COUNT"

# Bundle Puku Editor extension
echo "📦 Bundling Puku Editor extension..."
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

# Create DMG with maximum compression
echo ""
echo "📦 Creating optimized DMG installer..."
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
DMG_PATH="$DIST_DIR/$DMG_NAME"

# Create temporary directory for DMG contents
DMG_TEMP="$BUILD_DIR/dmg-temp"
mkdir -p "$DMG_TEMP"
cp -R "$BUILD_DIR/${APP_NAME}.app" "$DMG_TEMP/"

# Create Applications symlink for easy installation
ln -s /Applications "$DMG_TEMP/Applications"

# Create DMG with ULFO format (best compression) instead of UDZO
echo "  - Creating disk image with maximum compression..."
hdiutil create -volname "${APP_NAME}" \
    -srcfolder "$DMG_TEMP" \
    -ov -format ULFO \
    "$DMG_PATH"

# Cleanup
rm -rf "$DMG_TEMP"

# Get sizes
APP_SIZE=$(du -sh "$BUILD_DIR/${APP_NAME}.app" | awk '{print $1}')
DMG_SIZE=$(du -sh "$DMG_PATH" | awk '{print $1}')

# Calculate savings
STANDARD_DMG="$DIST_DIR/Puku-${VERSION}.dmg"
if [ -f "$STANDARD_DMG" ]; then
    STANDARD_SIZE=$(du -k "$STANDARD_DMG" | awk '{print $1}')
    OPTIMIZED_SIZE=$(du -k "$DMG_PATH" | awk '{print $1}')
    SAVINGS=$((STANDARD_SIZE - OPTIMIZED_SIZE))
    SAVINGS_PCT=$((SAVINGS * 100 / STANDARD_SIZE))
    echo ""
    echo "💾 Size savings: ~${SAVINGS_PCT}% smaller than standard build"
fi

echo ""
echo "✅ Optimized build complete!"
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
