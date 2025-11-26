#!/bin/bash

# Launch Code-OSS with Puku Editor extension
# Usage: ./launch.sh [folder_path]
# Default: Opens editor folder

FOLDER="${1:-/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/vscode/github/editor}"

cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/vscode && \
source ~/.nvm/nvm.sh && nvm use 22.20.0 && \
./scripts/code.sh --extensionDevelopmentPath=/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/vscode/github/editor "$FOLDER"
