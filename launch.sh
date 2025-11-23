#!/bin/bash

# Launch Code-OSS with Puku Editor extension
# Usage: ./launch.sh [folder_path]
# Default: Opens fastapi-app folder

FOLDER="${1:-/Users/sahamed/Desktop/puku-editor/fastapi-app}"

cd /Users/sahamed/Desktop/puku-editor/github/vscode && \
source ~/.nvm/nvm.sh && nvm use 23.5.0 && \
./scripts/code.sh --extensionDevelopmentPath=/Users/sahamed/Desktop/puku-editor/github/editor "$FOLDER"
