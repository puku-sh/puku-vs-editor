#!/bin/bash
# Puku Editor Installer

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}❌ This installer requires root privileges.${NC}"
    echo -e "${YELLOW}Please run with: sudo $0${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Installing Puku Editor...${NC}"

# Extract payload
SKIP=XXX  # This will be replaced
OFFSET=$(awk '/^__PAYLOAD_BELOW__$/{print NR + 1; exit 0}' "$0")
tail -n +$OFFSET "$0" | tar xzf -

# Copy files to system
cp -r opt/* /opt/
cp -r usr/* /usr/

# Fix permissions
chmod +x /opt/puku-editor/puku-editor
chmod +x /usr/bin/puku-editor

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

echo -e "${GREEN}✅ Puku Editor installed successfully!${NC}"
echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  • Command line: puku-editor [folder]"
echo "  • Applications: Find Puku Editor in your menu"
echo ""
echo -e "${YELLOW}To uninstall:${NC}"
echo "  sudo rm -rf /opt/puku-editor /usr/bin/puku-editor /usr/share/applications/puku-editor.desktop"

exit 0

__PAYLOAD_BELOW__
