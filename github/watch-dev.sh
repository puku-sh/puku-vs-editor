#!/bin/bash

# Watch Mode Development Script
# Runs VS Code and Editor Extension in watch mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VSCODE_DIR="vscode"
EDITOR_DIR="editor"

echo "🔍 Starting Watch Mode Development..."
echo ""

# Check if directories exist
if [ ! -d "$VSCODE_DIR" ]; then
    echo "❌ Error: $VSCODE_DIR directory not found!"
    exit 1
fi

if [ ! -d "$EDITOR_DIR" ]; then
    echo "❌ Error: $EDITOR_DIR directory not found!"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping watch processes..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start VS Code watch mode in background
echo "📦 Starting VS Code watch mode..."
cd "$VSCODE_DIR"
npm run watch > /tmp/vscode-watch.log 2>&1 &
VSCODE_PID=$!
cd "$SCRIPT_DIR"

# Start Editor extension watch mode in background
echo "📦 Starting Editor extension watch mode..."
cd "$EDITOR_DIR"
npm run watch > /tmp/editor-watch.log 2>&1 &
EDITOR_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "✅ Watch mode started!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 WATCH MODE ACTIVE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  VS Code watch:     PID $VSCODE_PID (logs: /tmp/vscode-watch.log)"
echo "  Editor watch:      PID $EDITOR_PID (logs: /tmp/editor-watch.log)"
echo ""
echo "  💡 Changes will auto-compile"
echo "  💡 Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait a bit for initial compilation
sleep 3

# Show initial logs
echo "📋 Initial compilation status:"
echo ""
echo "VS Code watch:"
tail -n 5 /tmp/vscode-watch.log 2>/dev/null || echo "  (no output yet)"
echo ""
echo "Editor watch:"
tail -n 5 /tmp/editor-watch.log 2>/dev/null || echo "  (no output yet)"
echo ""

# Keep script running and show logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 Live logs (Ctrl+C to stop):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tail both log files
tail -f /tmp/vscode-watch.log /tmp/editor-watch.log 2>/dev/null || {
    # If tail -f doesn't work with multiple files, use a simple loop
    while true; do
        sleep 2
        if [ -f /tmp/vscode-watch.log ]; then
            tail -n 1 /tmp/vscode-watch.log 2>/dev/null | grep -v "^$" || true
        fi
        if [ -f /tmp/editor-watch.log ]; then
            tail -n 1 /tmp/editor-watch.log 2>/dev/null | grep -v "^$" || true
        fi
    done
}

