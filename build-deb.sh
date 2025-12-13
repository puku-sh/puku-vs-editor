#!/bin/bash

# Puku Editor Debian Package Build Script
# This script automates the process of building a .deb package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main script
main() {
    print_status "Puku Editor Debian Package Build Script"
    print_status "========================================"

    # Check if we're in the right directory
    if [ ! -f "Makefile" ] || [ ! -d "debian" ]; then
        print_error "This script must be run from the puku-vs-editor root directory"
        exit 1
    fi

    # Check prerequisites
    print_status "Checking prerequisites..."

    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is required but not installed"
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    print_status "Node.js version: $NODE_VERSION"

    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is required but not installed"
        exit 1
    fi

    # Check Debian packaging tools
    MISSING_TOOLS=""
    for tool in dpkg-buildpackage dpkg-dev debhelper; do
        if ! command -v $tool >/dev/null 2>&1; then
            MISSING_TOOLS="$MISSING_TOOLS $tool"
        fi
    done

    if [ -n "$MISSING_TOOLS" ]; then
        print_error "Missing Debian packaging tools:$MISSING_TOOLS"
        echo ""
        echo "Install with:"
        echo "  sudo apt update"
        echo "  sudo apt install -y dpkg-dev debhelper build-essential"
        exit 1
    fi

    print_success "All prerequisites satisfied"

    # Set version
    if [ -n "$1" ]; then
        VERSION="$1"
        print_status "Using version: $VERSION"

        # Update changelog
        cat > debian/changelog << EOF
puku-editor (${VERSION}) unstable; urgency=medium

  * Manual build with version $VERSION

 -- Puku Team <team@puku.sh>  $(date -R)
EOF
    else
        VERSION=$(dpkg-parsechangelog -S version)
        print_status "Using version from changelog: $VERSION"
    fi

    # Clean previous builds
    print_status "Cleaning previous builds..."
    make deb-clean || true

    # Build the project
    print_status "Building Puku Editor..."
    print_status "This may take 5-10 minutes..."

    # Check if NVM is available
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        print_status "Using NVM for Node.js version management"
        source "$HOME/.nvm/nvm.sh"
        nvm use 22.20.0
    else
        print_warning "NVM not found, using system Node.js"
    fi

    # Compile the project
    if ! make compile; then
        print_error "Build failed"
        exit 1
    fi

    print_success "Project compiled successfully"

    # Build Debian package
    print_status "Building Debian package..."
    export DEB_BUILD_OPTIONS="parallel=$(nproc)"

    if ! make deb; then
        print_error "Debian package build failed"
        exit 1
    fi

    print_success "Debian package built successfully!"

    # Show results
    echo ""
    print_status "Generated files:"
    ls -la ../puku-editor_*.deb 2>/dev/null || print_warning "No .deb file found"
    ls -la ../puku-editor_*.changes 2>/dev/null || true

    # Show installation instructions
    echo ""
    print_status "To install the package:"
    echo "  sudo dpkg -i ../puku-editor_${VERSION}_*.deb"
    echo "  sudo apt-get install -f  # Fix dependencies if needed"
    echo ""
    print_status "To uninstall:"
    echo "  sudo apt remove puku-editor"
    echo ""
    print_status "To test installation (from build directory):"
    echo "  sudo dpkg -i ../puku-editor_${VERSION}_*.deb && sudo apt-get install -f"
    echo "  puku-editor --version"
}

# Run main function with all arguments
main "$@"