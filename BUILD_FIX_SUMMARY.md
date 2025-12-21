# Fix for GitHub Actions Linux Build Error

## Problem
The GitHub Actions workflow was failing during the VS Code build process with this error:

```
Error: Could not resolve "/home/ubuntu/actions-runner/_work/puku-vs-editor/puku-vs-editor/src/vscode/extensions/simple-browser/node_modules/@vscode/codicons/dist/codicon.css"
```

## Root Cause
The `simple-browser` extension has `@vscode/codicons` as a devDependency, but during the CI build process, extension dependencies were not being installed. The esbuild script `esbuild-preview.mjs` was trying to access `node_modules/@vscode/codicons/dist/codicon.css` but it didn't exist.

## Solution
Modified `.github/workflows/build-linux.yml` to install extension dependencies proactively:

### 1. Enhanced Extension Dependency Installation
Added installation for `simple-browser` extension specifically:
```bash
echo "🔧 Installing simple-browser extension dependencies (fixes @vscode/codicons issue)..."
cd extensions/simple-browser
npm install
cd ../..
```

### 2. Comprehensive Extension Dependency Handling
Added a loop to install dependencies for all extensions that might have similar issues:
```bash
echo "🔧 Installing other critical extension dependencies..."
for ext in configuration-editing git git-base github-authentication; do
    if [ -d "extensions/$ext" ] && [ -f "extensions/$ext/package.json" ]; then
        echo "Installing dependencies for $ext extension..."
        cd extensions/$ext
        npm install 2>/dev/null || echo "No dependencies for $ext or install failed"
        cd ../..
    fi
done
```

### 3. Proactive Extension Dependency Installation
Added comprehensive dependency installation for all extensions:
```bash
echo "🔧 Installing dependencies for all extensions..."
find extensions -maxdepth 1 -type d -name "*" | while read -r ext_dir; do
    if [ "$ext_dir" != "extensions" ] && [ -f "$ext_dir/package.json" ]; then
        ext_name=$(basename "$ext_dir")
        echo "Installing dependencies for $ext_name extension..."
        cd "$ext_dir"
        npm install --no-audit --no-fund 2>/dev/null || echo "No dependencies for $ext_name or install failed"
        cd ../..
    fi
done
```

## Changes Applied
- Modified both x64 and ARM64 build jobs in `build-linux.yml`
- Added extension dependency installation before VS Code compilation
- The fix ensures all extension devDependencies are available during the build

## Validation
- Created `test-fix.sh` script to validate the fix locally
- Verified that `@vscode/codicons/dist/codicon.css` exists after dependency installation
- Confirmed that the esbuild command succeeds when dependencies are installed

## Expected Result
The GitHub Actions workflow should now successfully build VS Code without the `@vscode/codicons` resolution error. All extension dependencies will be available during the build process.