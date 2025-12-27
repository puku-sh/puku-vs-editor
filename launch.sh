#!/bin/bash
set -e

# Launch Code-OSS with Puku Editor extension loaded
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/src/vscode"
source ~/.nvm/nvm.sh && nvm use 22.20.0
# Get the absolute path to the chat directory
CHAT_PATH="$(pwd)/../chat"
# Optional: Add fastapi-app if it exists
if [ -d "../fastapi-app" ]; then
    FASTAPI_PATH="$(pwd)/../fastapi-app"
    ./scripts/code.sh --extensionDevelopmentPath="$CHAT_PATH" "$FASTAPI_PATH"
else
    ./scripts/code.sh --extensionDevelopmentPath="$CHAT_PATH"
fi