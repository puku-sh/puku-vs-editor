#!/bin/bash
set -e

# Launch Code-OSS with Puku Editor extension loaded
cd src/vscode
source ~/.nvm/nvm.sh && nvm use 22.20.0
./scripts/code.sh --extensionDevelopmentPath=/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat /Users/sahamed/Desktop/puku-vs-editor/puku-editor/fastapi-app
