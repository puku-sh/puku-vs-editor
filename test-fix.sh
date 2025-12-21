#!/bin/bash
set -e

# Test script to verify the fix for simple-browser extension build issue
# This script simulates the GitHub Actions build process locally

echo "🧪 Testing fix for simple-browser @vscode/codicons build issue..."
echo

# Check if we're in the right directory
if [ ! -f "src/vscode/package.json" ]; then
    echo "❌ Error: Please run this script from the puku-vs-editor root directory"
    exit 1
fi

cd src/vscode

echo "🔧 Installing extension dependencies..."

# Install dependencies for extensions that commonly have issues
echo "Installing markdown-math dependencies..."
cd extensions/markdown-math
npm install
cd ../..

echo "Installing markdown-language-features dependencies..."
cd extensions/markdown-language-features
npm install
cd ../..

echo "Installing simple-browser dependencies (the main fix)..."
cd extensions/simple-browser
npm install
cd ../..

echo "Installing other critical extension dependencies..."
for ext in configuration-editing git git-base github-authentication; do
    if [ -d "extensions/$ext" ] && [ -f "extensions/$ext/package.json" ]; then
        echo "Installing dependencies for $ext extension..."
        cd extensions/$ext
        npm install 2>/dev/null || echo "No dependencies for $ext or install failed"
        cd ../..
    fi
done

echo
echo "✅ Extension dependencies installed successfully!"

# Now test the specific esbuild command that was failing
echo
echo "🧪 Testing the esbuild command that was failing..."

cd extensions/simple-browser

# Check if the required file exists
if [ -f "node_modules/@vscode/codicons/dist/codicon.css" ]; then
    echo "✅ @vscode/codicons/dist/codicon.css found!"
else
    echo "❌ @vscode/codicons/dist/codicon.css not found!"
    echo "Contents of node_modules/@vscode/codicons (if exists):"
    ls -la node_modules/@vscode/codicons 2>/dev/null || echo "Directory not found"
    exit 1
fi

# Run the esbuild command
echo "🏗️  Running esbuild-preview.mjs..."
node ./esbuild-preview.mjs

if [ $? -eq 0 ]; then
    echo "✅ esbuild completed successfully!"
else
    echo "❌ esbuild failed!"
    exit 1
fi

# Check if the output files were created
if [ -f "media/index.js" ] && [ -f "media/codicon.js" ]; then
    echo "✅ Output files created successfully!"
    echo "📄 Created files:"
    ls -la media/
else
    echo "❌ Output files not found!"
    exit 1
fi

echo
echo "🎉 All tests passed! The fix should work in GitHub Actions."
echo
echo "Summary of the fix:"
echo "1. Install extension dependencies before building VS Code"
echo "2. Specifically target simple-browser extension for @vscode/codicons"
echo "3. Add comprehensive extension dependency installation"
echo "4. This prevents the 'Could not resolve codicon.css' error"