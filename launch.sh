#!/bin/bash
set -e

# Launch Code-OSS with Puku Editor extension loaded
cd src/vscode
source ~/.nvm/nvm.sh && nvm use 22.20.0

# Get the absolute path to the chat directory
CHAT_PATH="$(pwd)/../chat"

# Get the folder to open (if provided)
FOLDER_TO_OPEN=""
if [ -n "$1" ]; then
    FOLDER_TO_OPEN="$1"
fi

# Use the official code.sh script which handles everything correctly
# Disable extension api tests for development
DISABLE_TEST_EXTENSION="--disable-extension=vscode.vscode-api-tests"

echo "🚀 Launching Puku Editor..."
echo "📁 Extension: $CHAT_PATH"
if [ -n "$FOLDER_TO_OPEN" ]; then
    echo "📂 Opening folder: $FOLDER_TO_OPEN"
fi

# Launch using the code.sh script with development mode
export NODE_ENV=development
export ELECTRON_ENABLE_INSPECTOR=0  # Disable inspector to avoid waiting

# Execute the code.sh script with our extension
exec ./scripts/code.sh $DISABLE_TEST_EXTENSION --extensionDevelopmentPath="$CHAT_PATH" $FOLDER_TO_OPEN
