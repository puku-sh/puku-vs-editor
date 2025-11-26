#!/bin/bash

# Puku Editor Launch Script
# This script launches Puku Editor in Extension Development mode

echo "🚀 Launching Puku Editor..."
echo ""

# Launch VS Code Extension Development Host
code --extensionDevelopmentPath="$(pwd)" \
     --disable-extensions \
     --enable-proposed-api=PukuEditor.puku-editor

echo ""
echo "✅ Extension Development Host launched!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1️⃣  Wait for new window to open"
echo "     → Look for '[Extension Development Host]' in title"
echo ""
echo "  2️⃣  In the new window, press Cmd+Option+I"
echo "     → This opens the Chat panel"
echo ""
echo "  3️⃣  Click model name → Manage Models → Ollama"
echo "     → Select GLM-4.6, GLM-4.5, or GLM-4.5-Air"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Proxy is running at: http://localhost:11434"
echo "📚 See GLM-SETUP.md for detailed instructions"
echo ""
