#!/bin/bash
# VS Code Gulp Launcher
set -e

# Run gulp with tsx to handle TypeScript
node --max-old-space-size=8192 ./node_modules/tsx/dist/cli.mjs ./node_modules/gulp/bin/gulp.js "$@"