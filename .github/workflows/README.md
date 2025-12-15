# GitHub Actions Workflows

This directory contains GitHub Actions workflows for building Puku Editor across multiple platforms.

## Workflows

### Platform-Specific Builds

#### `build-macos.yml` - macOS Builds
Builds Puku Editor for macOS on both x64 and ARM64 architectures.

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch with architecture selection
- Called by `build-all-platforms.yml`

**Outputs:**
- `puku-editor-macos-arm64` - DMG for Apple Silicon Macs
- `puku-editor-macos-x64` - DMG for Intel Macs

**Runners:**
- ARM64: `macos-14` (Apple Silicon)
- x64: `macos-13` (Intel)

#### `build-linux.yml` - Linux Builds
Builds Puku Editor for Linux on both x64 and ARM64 architectures.

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch with architecture selection
- Called by `build-all-platforms.yml`

**Outputs:**
- `puku-editor-linux-x64` - DEB, RPM, and tar.gz for x64
- `puku-editor-linux-arm64` - DEB, RPM, and tar.gz for ARM64

**Runner:** `ubuntu-22.04`

#### `build-windows.yml` - Windows Builds
Builds Puku Editor for Windows on both x64 and ARM64 architectures.

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch with architecture selection
- Called by `build-all-platforms.yml`

**Outputs:**
- `puku-editor-windows-x64` - EXE and ZIP for x64
- `puku-editor-windows-arm64` - EXE and ZIP for ARM64

**Runner:** `windows-2022`

### Orchestration

#### `build-all-platforms.yml` - Build All Platforms
Orchestrates builds for all platforms and creates GitHub releases.

**Triggers:**
- Push to tags matching `v*` (e.g., `v0.43.3`)
- Manual dispatch

**Jobs:**
1. **build-macos** - Builds both ARM64 and x64 macOS binaries in parallel
2. **build-linux** - Builds both ARM64 and x64 Linux packages in parallel
3. **build-windows** - Builds both ARM64 and x64 Windows installers in parallel
4. **create-release** - Creates a draft GitHub release with all artifacts (only on tag push)

### Testing

#### `test-setup.yml` - CI Test Setup
Tests the Makefile setup on Linux (existing workflow).

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Changes to `Makefile` or workflow file

## Usage

### Manual Build for Specific Platform

To manually trigger a build for a specific platform:

1. Go to Actions tab in GitHub
2. Select the workflow (e.g., "Build macOS")
3. Click "Run workflow"
4. Select the architecture (arm64, x64, or both)
5. Click "Run workflow"

### Create a Release

To create a release with all platform builds:

```bash
# Tag the release
git tag -a v0.43.4 -m "Release v0.43.4"

# Push the tag
git push origin v0.43.4
```

This will:
1. Trigger `build-all-platforms.yml`
2. Build all platforms (6 builds total: 2 macOS + 2 Linux + 2 Windows)
3. Create a draft GitHub release with all artifacts attached

### Download Build Artifacts

Artifacts are available for 30 days after each workflow run:

1. Go to Actions tab
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download the desired platform build

## Build Features

### Caching
All workflows use GitHub Actions cache for:
- `node_modules` - Keyed by platform, architecture, and package-lock hash
- Separate caches for extension and VS Code dependencies

### Retry Logic
All `npm ci` commands retry up to 3 times on failure to handle transient network issues.

### Error Handling
On build failure, workflows upload:
- Build logs from VS Code
- Extension compilation output
- Retained for 7 days for debugging

### Architecture Support

| Platform | x64 | ARM64 | Runner |
|----------|-----|-------|--------|
| macOS    | ✅  | ✅    | macos-13 / macos-14 |
| Linux    | ✅  | ✅    | ubuntu-22.04 |
| Windows  | ✅  | ✅    | windows-2022 |

## Build Scripts

Each workflow uses platform-specific build scripts:

- macOS: `build-dmg-optimized.sh`
- Linux: `build-linux-optimized.sh`
- Windows: `build-windows-optimized.ps1`

## Environment Variables

### Common
- `VSCODE_ARCH` - Target architecture (x64 or arm64)
- `GITHUB_TOKEN` - For npm registry access (auto-provided)
- `ELECTRON_SKIP_BINARY_DOWNLOAD=1` - Skip during initial install
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` - Skip during initial install

### macOS Specific
- `NPM_ARCH` - Architecture for npm native modules
- `GYP_DEFINES=kerberos_use_rtld=false` - Fix Kerberos loading issues

### Windows Specific
- `npm_config_arch` - Architecture for npm native modules (ARM64 only)

### Linux Specific
- `npm_config_arch` - Architecture for npm native modules (ARM64 only)

## Troubleshooting

### Build fails with "npm install failed"
- Check the retry logic is working (should see 3 attempts)
- Check GitHub Actions status page for npm registry issues
- Review build logs artifact for detailed error

### Cache issues
- Manually clear cache by changing `package-lock.json`
- Or trigger workflow with different architecture to use fresh cache

### Platform-specific issues
- macOS: Ensure Xcode command line tools are available (check runner logs)
- Linux: Ensure system dependencies are installed (see workflow `apt-get` commands)
- Windows: Ensure Visual Studio Build Tools are available

## Future Enhancements

See [Issue #84](https://github.com/puku-sh/puku-vs-editor/issues/84) for planned improvements:
- Code signing for macOS and Windows
- SBOM generation
- Unit and integration tests
- Smoke tests
- Universal macOS binaries
