# Phase 7: Release Pipeline

## Status: Not Started

## Goal
Create automated CI/CD pipeline to build and release Puku Editor for all platforms.

## Target Platforms

| Platform | Architecture | Package Format |
|----------|--------------|----------------|
| macOS | x64 (Intel) | .dmg, .zip |
| macOS | arm64 (Apple Silicon) | .dmg, .zip |
| Windows | x64 | .exe (NSIS), .zip |
| Windows | arm64 | .exe (NSIS), .zip |
| Linux | x64 | .deb, .rpm, .AppImage, .tar.gz |
| Linux | arm64 | .deb, .rpm, .AppImage, .tar.gz |

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRIGGER: Tag push (v*)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD PUKU EXTENSION                          │
│  Runner: ubuntu-latest                                           │
│  Steps:                                                          │
│    1. Checkout editor repo                                       │
│    2. npm install                                                │
│    3. npm run build                                              │
│    4. Upload artifact: puku-extension                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               BUILD CODE-OSS (Parallel Matrix)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ macOS x64   │  │ macOS arm64 │  │ Windows x64 │              │
│  │ macos-13    │  │ macos-14    │  │ windows-latest│             │
│  │ ~30 min     │  │ ~25 min     │  │ ~40 min     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ Linux x64   │  │ Linux arm64 │                               │
│  │ ubuntu-latest│ │ ubuntu-latest│                               │
│  │ ~25 min     │  │ ~30 min     │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CODE SIGNING                                │
│  - macOS: Apple Developer ID + Notarization                      │
│  - Windows: Authenticode signing (optional)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GITHUB RELEASE                                 │
│  - Create release from tag                                       │
│  - Upload all artifacts                                          │
│  - Generate changelog                                            │
└─────────────────────────────────────────────────────────────────┘
```

## GitHub Actions Workflow

### File: `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true

env:
  NODE_VERSION: '22.20.0'

jobs:
  build-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          path: editor

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        working-directory: editor
        run: npm ci

      - name: Build extension
        working-directory: editor
        run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: puku-extension
          path: |
            editor/dist/
            editor/package.json
            editor/package.nls.json
            editor/assets/

  build-vscode:
    needs: build-extension
    strategy:
      matrix:
        include:
          - os: macos-13
            platform: darwin
            arch: x64
          - os: macos-14
            platform: darwin
            arch: arm64
          - os: windows-latest
            platform: win32
            arch: x64
          - os: ubuntu-latest
            platform: linux
            arch: x64

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
        with:
          repository: puku-sh/vscode
          path: vscode

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - uses: actions/download-artifact@v4
        with:
          name: puku-extension
          path: vscode/extensions/puku

      - name: Install dependencies
        working-directory: vscode
        run: npm ci

      - name: Build
        working-directory: vscode
        run: npm run compile

      - name: Package
        working-directory: vscode
        run: |
          npm run gulp vscode-${{ matrix.platform }}-${{ matrix.arch }}-min

      - uses: actions/upload-artifact@v4
        with:
          name: puku-editor-${{ matrix.platform }}-${{ matrix.arch }}
          path: vscode/.build/

  release:
    needs: build-vscode
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: artifacts/**/*
          generate_release_notes: true
```

## Cost Estimates

### Per Release Build
| Runner | Minutes | Rate | Cost |
|--------|---------|------|------|
| macOS (x2) | 55 | $0.08/min | $4.40 |
| Windows | 40 | $0.016/min | $0.64 |
| Linux (x2) | 55 | $0.008/min | $0.44 |
| **Total** | | | **~$5.50** |

### Monthly (assuming 4 releases)
- **Total**: ~$22/month

## Code Signing Requirements

### macOS
- Apple Developer ID ($99/year)
- Notarization requires hardened runtime
- Secrets needed:
  - `APPLE_DEVELOPER_ID_APPLICATION`
  - `APPLE_DEVELOPER_ID_INSTALLER`
  - `APPLE_ID`
  - `APPLE_ID_PASSWORD`
  - `APPLE_TEAM_ID`

### Windows (Optional)
- Code signing certificate (~$200-500/year)
- Or use Azure SignTool (free with Azure subscription)
- Secrets needed:
  - `WINDOWS_SIGNING_CERT`
  - `WINDOWS_SIGNING_PASSWORD`

## Repository Secrets Required

| Secret | Purpose |
|--------|---------|
| `APPLE_DEVELOPER_ID_APPLICATION` | macOS app signing |
| `APPLE_DEVELOPER_ID_INSTALLER` | macOS pkg signing |
| `APPLE_ID` | Notarization account |
| `APPLE_ID_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team |
| `WINDOWS_SIGNING_CERT` | Windows signing (optional) |

## Testing

- [ ] Pipeline triggers on tag push
- [ ] All matrix builds complete
- [ ] Artifacts are properly named
- [ ] Release is created with all assets
- [ ] macOS app is notarized (if signing enabled)
- [ ] Windows installer works
- [ ] Linux packages install correctly

## Dependencies
- Phase 5: Remove Copilot Branding (complete first)
- Phase 6: Bundle Extension (complete first)
- Apple Developer account (for macOS signing)

## Estimated Effort
- **Initial setup**: 4-8 hours
- **Code signing setup**: 2-4 hours
- **Testing & debugging**: 4-8 hours
- **Total**: 10-20 hours
