# Build Instructions

## Prerequisites
- Node.js 23.5.0 (automatically selected via .nvmrc)
- nvm installed

## Quick Start

### 1. Switch to correct Node version
\`\`\`bash
nvm use  # Reads .nvmrc automatically
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install --legacy-peer-deps --ignore-scripts
\`\`\`

### 3. Compile
\`\`\`bash
make compile  # or: npm run compile
\`\`\`

### 4. Watch mode (auto-rebuild)
\`\`\`bash
make watch    # or: npm run watch
\`\`\`

## Testing the Extension

Press **F5** in VS Code to launch Extension Development Host.

## What's Compiled
- \`dist/extension.js\` - Main extension bundle (14.2 MB)
- \`dist/test-extension.js\` - Test bundle
- Forward stability feature ✅ included

## Node Version
This project requires **Node.js 23.5.0** (specified in .nvmrc).
The \`.nvmrc\` file ensures the correct version is used automatically.

