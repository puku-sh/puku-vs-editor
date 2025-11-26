#!/bin/bash

# Launch VS Code Fork Script
# This script compiles and launches VS Code from source

set -e

VSCODE_DIR="vscode"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Launching VS Code Fork..."
echo ""

# Check if vscode directory exists
if [ ! -d "$VSCODE_DIR" ]; then
    echo "❌ Error: $VSCODE_DIR directory not found!"
    echo "   Make sure you're running this from the project root."
    exit 1
fi

cd "$VSCODE_DIR"

# Check if node_modules exists (dependencies installed)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (this may take a while)..."
    npm install
    echo ""
fi

# Check if already compiled
if [ ! -d ".build/electron" ]; then
    echo "🔨 Compiling VS Code (first time - this will take 10-20 minutes)..."
    echo "   You can skip this if already compiled by setting SKIP_COMPILE=1"
    if [ -z "$SKIP_COMPILE" ]; then
        npm run compile
        echo ""
    fi
else
    echo "✅ VS Code already compiled"
    echo ""
fi

# Compile editor extension if needed
EDITOR_DIR="$SCRIPT_DIR/editor"
if [ -d "$EDITOR_DIR" ]; then
    cd "$EDITOR_DIR"
    if [ ! -d "dist" ] || [ ! -f "dist/extension.js" ]; then
        echo "🔨 Compiling Puku Editor extension..."
        npm run compile
        echo ""
    else
        echo "✅ Editor extension already compiled"
        echo ""
    fi
    cd "$SCRIPT_DIR/$VSCODE_DIR"
fi

# Launch VS Code with editor extension
echo "🎯 Launching VS Code with Puku Editor extension..."
echo ""

# Launch VS Code with extension development path
./scripts/code.sh \
    --extensionDevelopmentPath="$EDITOR_DIR" \
    "$@"

