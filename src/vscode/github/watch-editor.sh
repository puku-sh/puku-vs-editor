#!/bin/bash

# Editor Extension Watch Mode
# Watches and recompiles the editor extension automatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/editor"

echo "🔍 Starting Editor Extension Watch Mode..."
echo ""
echo "  💡 Files will auto-recompile on change"
echo "  💡 Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run watch

