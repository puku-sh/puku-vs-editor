# Puku Editor - Optimized Windows Build
# Minimal extensions + aggressive compression for smaller download size

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$VSCODE_DIR = Join-Path $SCRIPT_DIR "src\vscode"
$EXTENSION_DIR = Join-Path $SCRIPT_DIR "src\chat"
$BUILD_DIR = Join-Path $SCRIPT_DIR "build-production"
$DIST_DIR = Join-Path $SCRIPT_DIR "dist"

# Puku branding
$APP_NAME = "puku"
$VERSION = (Get-Content "$VSCODE_DIR\package.json" | ConvertFrom-Json).version

# Essential extensions to bundle (same as macOS/Linux)
$ESSENTIAL_EXTENSIONS = @(
    # Core editing
    "configuration-editing",
    "emmet",
    "merge-conflict",
    "references-view",

    # Git
    "git",
    "git-base",
    "github",
    "github-authentication",

    # Languages - Keep top 10 most popular
    "typescript-language-features",
    "typescript-basics",
    "javascript",
    "json",
    "json-language-features",
    "markdown-basics",
    "markdown-language-features",
    "html",
    "html-language-features",
    "css",
    "css-language-features",
    "python",
    "go",

    # Themes - Keep 2 light, 2 dark
    "theme-defaults",
    "theme-monokai",
    "theme-solarized-light",
    "theme-solarized-dark",

    # Essential UI
    "simple-browser",
    "media-preview",
    "notebook-renderers",

    # Authentication
    "microsoft-authentication"
)

Write-Host "🚀 Building Optimized Puku Editor for Windows v$VERSION"
Write-Host "📦 Using gulp production build + stripping to $($ESSENTIAL_EXTENSIONS.Count) essential extensions"
Write-Host ""

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..."
Remove-Item -Path "$BUILD_DIR\puku-win32-x64" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DIST_DIR\Puku-win32-x64-$VERSION.zip" -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $BUILD_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $DIST_DIR | Out-Null

# Check for gulp production build
Write-Host "📦 Checking for gulp production build..."
$GULP_BUILD_DIR = Join-Path $SCRIPT_DIR "src\VSCode-win32-x64"
if (-not (Test-Path $GULP_BUILD_DIR)) {
    Write-Host "❌ Production build not found. Run:"
    Write-Host "   cd src\vscode && npx gulp vscode-win32-x64"
    Write-Host ""
    Write-Host "This creates a minified production build with all required files."
    exit 1
}

Write-Host "📦 Checking extension compilation..."
if (-not (Test-Path "$EXTENSION_DIR\dist")) {
    Write-Host "❌ Extension not compiled. Run 'make compile-extension' first."
    exit 1
}

# Copy gulp-built output and strip extensions
Write-Host ""
Write-Host "📦 Copying gulp production build..."
Copy-Item -Path $GULP_BUILD_DIR -Destination "$BUILD_DIR\puku-win32-x64" -Recurse

# Setup paths
$APP_ROOT = Join-Path $BUILD_DIR "puku-win32-x64"
$APP_RESOURCES = Join-Path $APP_ROOT "resources"
$APP_EXTENSIONS = Join-Path $APP_RESOURCES "app\extensions"

Write-Host "📦 Stripping non-essential extensions from production build..."

$BUNDLED_COUNT = 0
$SKIPPED_COUNT = 0

# Remove ALL extensions first (except Puku which we'll add later)
if (Test-Path $APP_EXTENSIONS) {
    Get-ChildItem -Path $APP_EXTENSIONS -Directory | ForEach-Object {
        $ext_name = $_.Name

        # Skip test/development extensions
        if ($ext_name -like "*test*" -or $ext_name -eq "node_modules") {
            Remove-Item -Path $_.FullName -Recurse -Force
            return
        }

        # Check if extension is in essential list
        $IS_ESSENTIAL = $ESSENTIAL_EXTENSIONS -contains $ext_name

        if ($IS_ESSENTIAL) {
            Write-Host "  ✓ Keeping $ext_name"
            $script:BUNDLED_COUNT++
        } else {
            Write-Host "  ✗ Removing $ext_name"
            Remove-Item -Path $_.FullName -Recurse -Force
            $script:SKIPPED_COUNT++
        }
    }
}

Write-Host "  📊 Kept: $BUNDLED_COUNT | Removed: $SKIPPED_COUNT"

# Bundle Puku Editor extension
Write-Host "📦 Bundling Puku Editor extension..."
$PUKU_EXT_DIR = Join-Path $APP_RESOURCES "app\extensions\puku-editor"
New-Item -ItemType Directory -Force -Path $PUKU_EXT_DIR | Out-Null

# Copy extension files
Copy-Item -Path "$EXTENSION_DIR\dist" -Destination "$PUKU_EXT_DIR\dist" -Recurse
Copy-Item -Path "$EXTENSION_DIR\package.json" -Destination $PUKU_EXT_DIR
Copy-Item -Path "$EXTENSION_DIR\README.md" -Destination $PUKU_EXT_DIR -ErrorAction SilentlyContinue
Copy-Item -Path "$EXTENSION_DIR\LICENSE" -Destination $PUKU_EXT_DIR -ErrorAction SilentlyContinue

# Copy extension production dependencies
if (Test-Path "$EXTENSION_DIR\node_modules") {
    Write-Host "  - Bundling extension dependencies..."
    New-Item -ItemType Directory -Force -Path "$PUKU_EXT_DIR\node_modules" | Out-Null

    $package = Get-Content "$EXTENSION_DIR\package.json" | ConvertFrom-Json
    if ($package.dependencies) {
        $package.dependencies.PSObject.Properties | ForEach-Object {
            $dep = $_.Name
            $depPath = Join-Path "$EXTENSION_DIR\node_modules" $dep
            if (Test-Path $depPath) {
                Write-Host "    - $dep"
                Copy-Item -Path $depPath -Destination "$PUKU_EXT_DIR\node_modules\$dep" -Recurse
            }
        }
    }
}

# Update product.json branding
Write-Host ""
Write-Host "📦 Updating product metadata..."
$PRODUCT_JSON = Join-Path $APP_RESOURCES "app\product.json"
if (Test-Path $PRODUCT_JSON) {
    $product = Get-Content $PRODUCT_JSON | ConvertFrom-Json
    $product.nameShort = "Puku"
    $product.nameLong = "Puku Editor"
    $product.applicationName = "puku"
    $product.dataFolderName = ".puku"
    $product | ConvertTo-Json -Depth 100 | Set-Content $PRODUCT_JSON
}

# Create ZIP archive with maximum compression
Write-Host ""
Write-Host "📦 Creating optimized ZIP archive..."
$ARCHIVE_NAME = "Puku-win32-x64-$VERSION.zip"
$ARCHIVE_PATH = Join-Path $DIST_DIR $ARCHIVE_NAME

Compress-Archive -Path "$APP_ROOT\*" -DestinationPath $ARCHIVE_PATH -CompressionLevel Optimal -Force

# Get sizes
$APP_SIZE = "{0:N2} MB" -f ((Get-ChildItem -Path $APP_ROOT -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB)
$ARCHIVE_SIZE = "{0:N2} MB" -f ((Get-Item $ARCHIVE_PATH).Length / 1MB)

Write-Host ""
Write-Host "✅ Optimized Windows build complete!"
Write-Host ""
Write-Host "📦 Build Directory:  $APP_ROOT ($APP_SIZE)"
Write-Host "📦 Archive: $ARCHIVE_PATH ($ARCHIVE_SIZE)"
Write-Host ""
Write-Host "To test before distributing:"
Write-Host "  cd $APP_ROOT"
Write-Host "  .\puku.exe"
Write-Host ""
