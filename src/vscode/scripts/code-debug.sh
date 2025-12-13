#!/bin/bash

set -e

# Get the absolute path to the vscode directory
VS_CODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to open DevTools in browser
open_devtools() {
    local port=$1
    echo "Opening DevTools for debugging..."
    sleep 3  # Wait for VS Code to start

    # Try different browsers
    if command -v google-chrome >/dev/null 2>&1; then
        google-chrome --new-window --incognito "http://127.0.0.1:$port" >/dev/null 2>&1 &
    elif command -v chromium-browser >/dev/null 2>&1; then
        chromium-browser --new-window --incognito "http://127.0.0.1:$port" >/dev/null 2>&1 &
    elif command -v firefox >/dev/null 2>&1; then
        firefox --new-instance "http://127.0.0.1:$port" >/dev/null 2>&1 &
    else
        echo "No suitable browser found. Please open http://127.0.0.1:$port manually"
    fi
}

# Main function
launch_with_debug() {
    cd "$VS_CODE_DIR"

    # Source nvm if available
    if [ -f ~/.nvm/nvm.sh ]; then
        source ~/.nvm/nvm.sh
        nvm use 22.20.0
    fi

    echo "Launching VS Code with debugging..."
    echo "Main Process Debug: ws://127.0.0.1:5871"
    echo "DevTools: http://127.0.0.1:9223"
    echo "Extension Host: ws://127.0.0.1:5870"

    # Start DevTools opener in background
    open_devtools 9223 &

    # Launch VS Code with full debugging
    ./scripts/code.sh --inspect-brk=5871 --remote-debugging-port=9223 "$@"
}

# Run the function
launch_with_debug "$@"