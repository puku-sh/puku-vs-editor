#!/bin/bash

# Fix the Puku Editor launcher to work without tsx dependencies

set -e

LAUNCHER="/opt/puku-editor/puku-editor"

echo "🔧 Fixing Puku Editor launcher..."

# Create a new launcher that works without tsx
sudo tee $LAUNCHER > /dev/null << 'EOF'
#!/bin/bash
# Puku Editor Launcher

set -e

# Get installation directory
INSTALL_DIR="/opt/puku-editor"
EXTENSION_DIR="${INSTALL_DIR}/extension"

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js >= 22.20.0 from https://nodejs.org or your package manager."
    exit 1
fi

# Get the folder to open
FOLDER="${1:-.}"

# Convert to absolute path
if [[ "$FOLDER" != /* ]]; then
    FOLDER="$(pwd)/$FOLDER"
fi

echo "🚀 Launching Puku Editor..."
echo "📁 Opening folder: $FOLDER"
echo "📋 Using Node.js: $(node --version)"

# Change to installation directory
cd "$INSTALL_DIR"

# Setup environment
export NODE_PATH="${INSTALL_DIR}/node_modules:${NODE_PATH}"
export ELECTRON_RUN_AS_NODE=1

# Try different launch methods
if [ -f "./out/vs/server/main.js" ]; then
    # Server mode (recommended for production)
    exec node out/vs/server/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER"
elif [ -f "./out/main.js" ]; then
    # Direct mode - try without tsx first
    echo "📝 Trying direct Node.js execution..."
    if node out/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER" 2>/dev/null; then
        exit 0
    else
        # Try with npx if available
        if command -v npx >/dev/null 2>&1; then
            echo "📝 Trying with npx tsx..."
            exec npx tsx out/main.js --extensionDevelopmentPath="$EXTENSION_DIR" "$FOLDER"
        else
            echo "❌ Cannot launch Puku Editor. The build may require tsx."
            echo "Try installing tsx globally: npm install -g tsx"
            exit 1
        fi
    fi
else
    echo "❌ Cannot find VS Code executable"
    echo "Contents of $INSTALL_DIR/out:"
    ls -la out/ 2>/dev/null || echo "No out directory found"
    exit 1
fi
EOF

sudo chmod +x $LAUNCHER

echo "✅ Launcher fixed!"
echo ""
echo "Try running: puku-editor /home/poridhi"