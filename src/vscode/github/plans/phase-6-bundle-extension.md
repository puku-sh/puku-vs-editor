# Phase 6: Bundle Extension into Code-OSS

## Status: Not Started

## Goal
Bundle Puku Editor extension directly into the forked VS Code (Code-OSS) so it appears as a native feature, not an installable extension.

## Architecture

### Current State
```
User installs VS Code → User installs Puku Extension → Extension activates
```

### Target State
```
User installs Puku Editor (Code-OSS fork) → Puku features built-in
```

## Implementation

### 1. Extension Location
VS Code built-in extensions live in `extensions/` folder:

```
vscode/
├── extensions/
│   ├── git/                    # Built-in
│   ├── typescript-language-features/  # Built-in
│   ├── puku/                   # NEW - Puku Editor built-in
│   │   ├── package.json
│   │   ├── package.nls.json
│   │   ├── dist/              # Compiled extension
│   │   └── assets/
│   └── ...
└── product.json
```

### 2. Build Integration

#### Option A: Copy at build time (Recommended)
Add build script to copy compiled extension:

```bash
# In vscode build process
cp -r ../editor/dist extensions/puku/
cp ../editor/package.json extensions/puku/
cp ../editor/package.nls.json extensions/puku/
```

#### Option B: Git submodule
Add editor as submodule in `extensions/puku`

#### Option C: Monorepo build
Build both in single pipeline

### 3. Extension Manifest Changes

For built-in extensions, modify `package.json`:

```json
{
  "name": "puku",
  "publisher": "vscode",  // Built-in uses "vscode" publisher
  "version": "0.35.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "extensionKind": ["workspace"],
  "main": "./dist/extension.js",
  "browser": "./dist/extension-web.js"
}
```

### 4. Product.json Configuration

Update `vscode/product.json`:

```json
{
  "nameShort": "Puku Editor",
  "nameLong": "Puku Editor",
  "applicationName": "puku-editor",
  "dataFolderName": ".puku-editor",
  "serverDataFolderName": ".puku-editor-server",
  "licenseName": "MIT",
  "licenseUrl": "https://github.com/puku-sh/puku-editor/blob/main/LICENSE",
  "win32MutexName": "pukueditor",
  "win32DirName": "Puku Editor",
  "win32NameVersion": "Puku Editor",
  "win32RegValueName": "PukuEditor",
  "win32AppUserModelId": "Puku.PukuEditor",
  "urlProtocol": "puku-editor",
  "extensionAllowedProposedApi": [
    "puku.puku"
  ],
  "builtInExtensions": [
    {
      "name": "puku",
      "version": "0.35.0",
      "repo": "puku-sh/puku-vs-editor",
      "path": "extensions/puku"
    }
  ]
}
```

### 5. Build Scripts

Create `scripts/bundle-puku.sh`:

```bash
#!/bin/bash
set -e

EDITOR_DIR="../editor"
PUKU_EXT_DIR="extensions/puku"

echo "Building Puku Editor extension..."
cd $EDITOR_DIR
npm run build

echo "Copying to extensions folder..."
cd -
mkdir -p $PUKU_EXT_DIR
cp -r $EDITOR_DIR/dist $PUKU_EXT_DIR/
cp $EDITOR_DIR/package.json $PUKU_EXT_DIR/
cp $EDITOR_DIR/package.nls.json $PUKU_EXT_DIR/
cp -r $EDITOR_DIR/assets $PUKU_EXT_DIR/

echo "Puku extension bundled successfully"
```

### 6. Remove Extension Marketplace References
- Remove extension install prompts
- Remove marketplace badge from welcome page
- Disable extension updates for built-in puku

## Files to Create/Modify

### In `vscode/` repository:
- `product.json` - Branding configuration
- `scripts/bundle-puku.sh` - Bundle script
- `build/gulpfile.extensions.js` - Add puku to build
- `.gitignore` - Ignore `extensions/puku/dist`

### In `editor/` repository:
- Update `package.json` for built-in compatibility
- Ensure all paths are relative

## Testing

- [ ] `npm run compile` builds successfully
- [ ] Extension appears in built-in extensions list
- [ ] All features work without manual installation
- [ ] Extension cannot be uninstalled (built-in behavior)
- [ ] Settings sync works correctly

## Dependencies
- Phase 5 (Remove Copilot Branding) should complete first
- All extension features should be stable

## Estimated Effort
- **Time**: 2-4 hours
- **Risk**: Low-Medium
- **Build time impact**: +2-3 minutes
