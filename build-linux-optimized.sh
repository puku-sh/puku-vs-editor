#!/bin/bash
set -e

# Puku Editor - Optimized Linux Build
# Minimal extensions + aggressive compression for smaller download size

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
EXTENSION_DIR="$SCRIPT_DIR/src/chat"
BUILD_DIR="$SCRIPT_DIR/build-production"
DIST_DIR="$SCRIPT_DIR/dist"

# Puku branding
APP_NAME="puku"
VERSION=$(node -p "require('$VSCODE_DIR/package.json').version")

# Architecture (supports x64 and arm64)
ARCH="${VSCODE_ARCH:-x64}"
if [ "$ARCH" != "x64" ] && [ "$ARCH" != "arm64" ]; then
    echo "❌ Unsupported architecture: $ARCH"
    echo "Supported architectures: x64, arm64"
    exit 1
fi

# Essential extensions to bundle (same as macOS)
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

echo "🚀 Building Optimized Puku Editor for Linux v${VERSION} ($ARCH)"
echo "📦 Using gulp production build + stripping to $(echo ${ESSENTIAL_EXTENSIONS[@]} | wc -w | tr -d ' ') essential extensions"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR/puku-linux-${ARCH}"
rm -f "$DIST_DIR/Puku-linux-${ARCH}-${VERSION}.tar.gz"
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Check for gulp production build
echo "📦 Checking for gulp production build..."
GULP_BUILD_DIR="$SCRIPT_DIR/src/VSCode-linux-${ARCH}"
if [ ! -d "$GULP_BUILD_DIR" ]; then
    echo "❌ Production build not found. Run:"
    echo "   cd src/vscode && npx gulp vscode-linux-${ARCH}"
    echo ""
    echo "This creates a minified production build with all required files."
    exit 1
fi

echo "📦 Checking extension compilation..."
if [ ! -d "$EXTENSION_DIR/dist" ]; then
    echo "❌ Extension not compiled. Run 'make compile-extension' first."
    exit 1
fi

# Copy gulp-built output and strip extensions
echo ""
echo "📦 Copying gulp production build..."
cp -R "$GULP_BUILD_DIR" "$BUILD_DIR/puku-linux-${ARCH}"

# Setup paths
APP_ROOT="$BUILD_DIR/puku-linux-${ARCH}"
APP_RESOURCES="$APP_ROOT/resources"
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

            # Ensure essential extensions have their dependencies
            if [ -d "$ext_path" ] && [ -f "$ext_path/package.json" ]; then
                echo "    - Verifying dependencies for $ext_name..."
                cd "$ext_path"
                # Check if extension has node_modules, if not try to install minimal dependencies
                if [ ! -d "node_modules" ]; then
                    echo "    - Installing missing dependencies for $ext_name..."
                    npm install --production --no-audit --no-fund 2>/dev/null || echo "    - No dependencies for $ext_name"
                fi
                cd - > /dev/null
            fi

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
        # Get all dependencies (both dependencies and some critical devDependencies)
        EXT_DEPS=$(node -p "Object.keys(require('./package.json').dependencies || {}).concat(Object.keys(require('./package.json').devDependencies || {}).filter(dep => ['@vscode/codicons', '@vscode/extension-telemetry'].includes(dep))).join(' ')" 2>/dev/null || echo "")

        for dep in $EXT_DEPS; do
            if [ -d "node_modules/$dep" ]; then
                echo "    - $dep"
                cp -R "node_modules/$dep" "$PUKU_EXT_DIR/node_modules/"
            fi
        done
    fi
    cd "$SCRIPT_DIR"
fi

# Update product.json branding
echo ""
echo "📦 Updating product metadata..."
PRODUCT_JSON="$APP_RESOURCES/app/product.json"
if [ -f "$PRODUCT_JSON" ]; then
    # Use node to update JSON (safer than sed)
    node -e "
        const fs = require('fs');
        const product = JSON.parse(fs.readFileSync('$PRODUCT_JSON', 'utf8'));
        product.nameShort = 'Puku';
        product.nameLong = 'Puku Editor';
        product.applicationName = 'puku';
        product.dataFolderName = '.puku';
        fs.writeFileSync('$PRODUCT_JSON', JSON.stringify(product, null, '\t'));
    "
fi

# Create tar.gz archive with maximum compression
echo ""
echo "📦 Creating optimized tar.gz archive..."
ARCHIVE_NAME="Puku-linux-${ARCH}-${VERSION}.tar.gz"
ARCHIVE_PATH="$DIST_DIR/$ARCHIVE_NAME"

cd "$BUILD_DIR"
tar -czf "$ARCHIVE_PATH" puku-linux-${ARCH}
cd "$SCRIPT_DIR"

# Get sizes
APP_SIZE=$(du -sh "$APP_ROOT" | awk '{print $1}')
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" | awk '{print $1}')

echo ""
echo "✅ Optimized Linux build complete!"
echo ""
echo "📦 Build Directory:  $APP_ROOT ($APP_SIZE)"
echo "📦 Archive: $ARCHIVE_PATH ($ARCHIVE_SIZE)"
echo ""
echo "To test before distributing:"
echo "  cd $APP_ROOT"
echo "  ./puku"
echo ""
