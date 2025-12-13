# Debian Package Build Guide

This guide explains how to build a Debian (.deb) package for Puku Editor that can be distributed and installed on Debian-based systems.

## Prerequisites

First, install the required Debian packaging tools:

```bash
# Install packaging dependencies
sudo apt update
sudo apt install -y \
    build-essential \
    debhelper \
    dpkg-dev \
    devscripts \
    fakeroot \
    python3 \
    python3-dev \
    python3-pil \
    imagemagick

# Install runtime dependencies for the package
sudo apt install -y \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2-dev \
    libgtk-3-dev \
    libgconf-2-4
```

## Quick Build Process

### Step 1: Prepare the Environment

```bash
# Clone or navigate to your puku-vs-editor directory
cd /path/to/puku-vs-editor

# Ensure Node.js is installed and correct version
node --version  # Should be >= 22.20.0
npm --version   # Should be >= 8.0.0

# Install NVM for dual Node.js version management (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22.20.0
nvm install 23.5.0
```

### Step 2: Build the Package

```bash
# Use the Makefile target for easy building
make deb

# Or manually:
# 1. Clean previous builds
make deb-clean

# 2. Build the project
make compile

# 3. Build the Debian package
dpkg-buildpackage -us -uc -b
```

### Step 3: Install the Package

```bash
# Install the generated .deb file
sudo dpkg -i ../puku-editor_*.deb

# Fix any dependency issues
sudo apt-get install -f

# Or use the Makefile target
make deb-install
```

## Manual Build Steps (Detailed)

If you want to understand what's happening under the hood, here are the detailed steps:

### 1. Verify Debian Directory Structure

```bash
ls -la debian/
```

Expected files:
- `control` - Package metadata
- `rules` - Build instructions
- `changelog` - Version history
- `postinst` - Post-installation script
- `prerm` - Pre-removal script
- `compat` - Debhelper compatibility
- `puku-editor.desktop` - Desktop entry
- `puku-editor.png` - Application icon

### 2. Set Package Version

Edit `debian/changelog` to update the version:

```bash
# Update the changelog
dch --newversion "1.0.0" "Release version 1.0.0"

# Or edit manually
nano debian/changelog
```

### 3. Clean Previous Builds

```bash
# Clean build artifacts
make deb-clean

# Or manually
dh_clean
rm -f ../puku-editor_*.deb ../puku-editor_*.dsc ../puku-editor_*.tar.gz
```

### 4. Build the Package

```bash
# Set build options
export DEB_BUILD_OPTIONS="parallel=$(nproc)"

# Build the package
dpkg-buildpackage -us -uc -b

# Options explained:
# -us: unsigned source package
# -uc: unsigned changes file
# -b: binary-only build (no source package)
```

### 5. Verify the Package

```bash
# Check generated files
ls -la ../puku-editor_*

# Inspect package contents
dpkg -c ../puku-editor_*_amd64.deb

# Check package information
dpkg --info ../puku-editor_*_amd64.deb
```

## Package Contents

The generated package will install:

- **Binary files**: `/opt/puku-editor/`
- **Launcher script**: `/usr/bin/puku-editor`
- **Desktop entry**: `/usr/share/applications/puku-editor.desktop`
- **Icon**: `/usr/share/icons/hicolor/512x512/apps/puku-editor.png`
- **Documentation**: `/opt/puku-editor/CLAUDE.md`

## Testing the Package

### Test Installation

```bash
# Install the package
sudo dpkg -i ../puku-editor_1.0.0_amd64.deb

# Test the launcher
puku-editor --version

# Check desktop integration
desktop-file-validate /usr/share/applications/puku-editor.desktop
```

### Test Functionality

```bash
# Launch Puku Editor
puku-editor

# Check if it launches correctly
# Test AI features
# Verify extension loading
```

### Test Uninstallation

```bash
# Remove the package
sudo apt remove puku-editor

# Check cleanup
ls -la /opt/puku-editor/  # Should be removed
ls -la /usr/bin/puku-editor  # Should be removed
```

## Building for Different Architectures

### AMD64 (Standard PCs)

```bash
# Default architecture
dpkg-buildpackage -us -uc -b -aamd64
```

### ARM64 (Raspberry Pi, ARM servers)

```bash
# Cross-compile (requires cross-compilation tools)
dpkg-buildpackage -us -uc -b -aarm64

# Or build natively on ARM64 system
```

## Troubleshooting

### Common Issues

1. **Node.js version error**:
   ```bash
   # Ensure correct Node.js version
   nvm use 22.20.0
   node --version
   ```

2. **Missing dependencies**:
   ```bash
   # Install missing build dependencies
   sudo apt-get install -f
   ```

3. **Permission errors**:
   ```bash
   # Fix permissions on debian scripts
   chmod +x debian/rules debian/postinst debian/prerm
   ```

4. **Build failures**:
   ```bash
   # Clean and retry
   make clean
   make deb-clean
   make compile
   make deb
   ```

### Debug Build Process

```bash
# Verbose build output
export DH_VERBOSE=1
dpkg-buildpackage -us -uc -b

# Check build logs
cat ../puku-editor_*.buildlog
```

## Automation

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/build-deb-package.yml`) that can automatically build packages when:

- Tags are pushed (for releases)
- Commits are pushed to main branch
- Manual workflow dispatch

### Local Script

Create a script for automated local building:

```bash
#!/bin/bash
# build-deb.sh

set -e

echo "Building Puku Editor Debian package..."

# Check prerequisites
if ! command -v dpkg-buildpackage >/dev/null 2>&1; then
    echo "Error: dpkg-buildpackage not found. Install dpkg-dev"
    exit 1
fi

# Clean previous builds
make deb-clean

# Build the project
make compile

# Build package
make deb

echo "Package built successfully!"
echo "Install with: sudo dpkg -i ../puku-editor_*.deb"
```

## Distribution

### Upload to GitHub Releases

1. Tag your release:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. Use GitHub Actions to build and upload packages

### Create APT Repository (Advanced)

For large-scale distribution, consider setting up an APT repository:

```bash
# Install reprepro for repository management
sudo apt install reprepro

# Set up repository structure
mkdir -p apt/conf
mkdir -p apt/incoming

# Create reprepro configuration
# ... (see reprepro documentation)
```

## File Locations After Installation

- **Main executable**: `/usr/bin/puku-editor`
- **Application files**: `/opt/puku-editor/`
- **Desktop entry**: `/usr/share/applications/puku-editor.desktop`
- **Icon**: `/usr/share/icons/hicolor/512x512/apps/puku-editor.png`
- **Documentation**: `/opt/puku-editor/CLAUDE.md`

## Package Structure

```
puku-editor_1.0.0_amd64.deb
├── DEBIAN/
│   ├── control          # Package metadata
│   ├── postinst         # Post-install script
│   ├── prerm           # Pre-remove script
│   └── md5sums        # File checksums
└── opt/puku-editor/    # Application files
    ├── bin/            # Launch scripts
    ├── out/            # VS Code binaries
    ├── extension/      # Puku extension
    └── node_modules/   # Dependencies
```

This comprehensive guide should help you build, test, and distribute Debian packages for Puku Editor effectively.