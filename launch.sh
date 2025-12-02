#!/bin/bash

# Launch Code-OSS with Puku Editor extension
# Usage: ./launch.sh [folder_path]
# Default: Opens fastapi-app folder

FOLDER="${1:-/Users/sahamed/Desktop/puku-vs-editor/puku-editor/fastapi-app}"

cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/vscode && \
source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
./scripts/code.sh --extensionDevelopmentPath=/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat "$FOLDER"
