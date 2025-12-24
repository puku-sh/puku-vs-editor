#!/bin/bash
set -e

# Puku Editor - Linux DEB Package Build
# Creates a proper .deb package that installs to /opt/puku-editor/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/src/vscode"
EXTENSION_DIR="$SCRIPT_DIR/src/chat"
BUILD_DIR="$SCRIPT_DIR/build-production"
DIST_DIR="$SCRIPT_DIR/dist"

# Puku branding
APP_NAME="puku"
PACKAGE_NAME="puku-editor"
VERSION=$(node -p "require('$VSCODE_DIR/package.json').version")

# Architecture (supports x64 and arm64)
ARCH="${VSCODE_ARCH:-x64}"
if [ "$ARCH" != "x64" ] && [ "$ARCH" != "arm64" ]; then
    echo "❌ Unsupported architecture: $ARCH"
    echo "Supported architectures: x64, arm64"
    exit 1
fi

# Convert to Debian architecture naming
DEB_ARCH="${ARCH}"
if [ "$ARCH" == "x64" ]; then
    DEB_ARCH="amd64"
fi

# Essential extensions to bundle
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

echo "🚀 Building Puku Editor DEB Package v${VERSION} (${DEB_ARCH})"
echo "📦 Using gulp production build + stripping to $(echo ${ESSENTIAL_EXTENSIONS[@]} | wc -w | tr -d ' ') essential extensions"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR/${PACKAGE_NAME}_${VERSION}-${DEB_ARCH}"
rm -f "$DIST_DIR/${PACKAGE_NAME}_${VERSION}_${DEB_ARCH}.deb"
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

# DEB package structure
DEB_ROOT="$BUILD_DIR/${PACKAGE_NAME}_${VERSION}-${DEB_ARCH}"
DEBIAN_DIR="$DEB_ROOT/DEBIAN"
INSTALL_DIR="$DEB_ROOT/opt/puku-editor"

# Create directory structure
mkdir -p "$DEBIAN_DIR"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DEB_ROOT/usr/local/bin"

echo "📦 Copying gulp production build..."
cp -R "$GULP_BUILD_DIR"/* "$INSTALL_DIR/"

# Setup paths
APP_RESOURCES="$INSTALL_DIR/resources"
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

# Update product.json branding
echo ""
echo "📦 Updating product metadata..."
PRODUCT_JSON="$APP_RESOURCES/app/product.json"
if [ -f "$PRODUCT_JSON" ]; then
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

# Create DEBIAN/control file
echo "📦 Creating package control files..."
cat > "$DEBIAN_DIR/control" <<EOF
Package: ${PACKAGE_NAME}
Version: ${VERSION}
Architecture: ${DEB_ARCH}
Maintainer: Puku Editor <contact@puku.sh>
Installed-Size: $(du -sk "$DEB_ROOT" | cut -f1)
Depends: libgtk-3-0, libnss3, libxss1, libasound2, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libappindicator3-1, libsecret-1-0
Section: devel
Priority: optional
Homepage: https://puku.sh
Description: Puku Editor - AI-powered code editor
 Puku Editor is an AI-powered code editor built on GitHub Copilot Chat
 architecture, providing chat interface, inline completions (FIM),
 agent mode, and tool calling.
EOF

# Create DEBIAN/postinst script (runs after installation)
cat > "$DEBIAN_DIR/postinst" <<'EOF'
#!/bin/bash
set -e

# Create symlink for the 'puku' command
# Note: The binary is at /opt/puku-editor/puku (not in bin/ subdirectory)
if [ ! -e /usr/local/bin/puku ]; then
    ln -sf /opt/puku-editor/puku /usr/local/bin/puku
    echo "✅ Created symlink: /usr/local/bin/puku -> /opt/puku-editor/puku"
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications 2>/dev/null || true
fi

echo "🚀 Puku Editor installed successfully!"
echo "   Run 'puku' to start the editor."

EOF

chmod +x "$DEBIAN_DIR/postinst"

# Create DEBIAN/prerm script (runs before removal)
cat > "$DEBIAN_DIR/prerm" <<'EOF'
#!/bin/bash
set -e

# Remove symlink
if [ -L /usr/local/bin/puku ]; then
    rm -f /usr/local/bin/puku
    echo "🗑️  Removed symlink: /usr/local/bin/puku"
fi

EOF

chmod +x "$DEBIAN_DIR/prerm"

# Create desktop entry file
echo "📦 Creating desktop entry..."
mkdir -p "$DEB_ROOT/usr/share/applications"
cat > "$DEB_ROOT/usr/share/applications/${PACKAGE_NAME}.desktop" <<EOF
[Desktop Entry]
Name=Puku Editor
Comment=AI-powered code editor
GenericName=Text Editor
Exec=/opt/puku-editor/puku %F
Icon=/opt/puku-editor/resources/app/puku.png
Type=Application
Categories=TextEditor;Development;IDE;
Keywords=puku;editor;code;development;programming;
StartupNotify=true
StartupWMClass=puku
MimeType=text/plain;inode/directory;
EOF

# Build the DEB package
echo ""
echo "📦 Building DEB package..."
cd "$BUILD_DIR"

# Calculate installed size for control file
INSTALLED_SIZE=$(du -sk "$DEB_ROOT" | cut -f1)
sed -i "s/^Installed-Size: .*/Installed-Size: ${INSTALLED_SIZE}/" "$DEBIAN_DIR/control"

# Build the package
dpkg-deb --build "${PACKAGE_NAME}_${VERSION}-${DEB_ARCH}" "${DIST_DIR}/${PACKAGE_NAME}_${VERSION}_${DEB_ARCH}.deb"

cd "$SCRIPT_DIR"

# Get sizes
APP_SIZE=$(du -sh "$INSTALL_DIR" | awk '{print $1}')
DEB_SIZE=$(du -sh "$DIST_DIR/${PACKAGE_NAME}_${VERSION}_${DEB_ARCH}.deb" | awk '{print $1}')

echo ""
echo "✅ DEB package created successfully!"
echo ""
echo "📦 Package: ${DIST_DIR}/${PACKAGE_NAME}_${VERSION}_${DEB_ARCH}.deb ($DEB_SIZE)"
echo "📦 Installation Size: $APP_SIZE"
echo ""
echo "To install:"
echo "  sudo dpkg -i ${DIST_DIR}/${PACKAGE_NAME}_${VERSION}_${DEB_ARCH}.deb"
echo ""
echo "If dependencies are missing, run:"
echo "  sudo apt-get install -f"
echo ""
echo "After installation, simply type:"
echo "  puku"
echo ""
