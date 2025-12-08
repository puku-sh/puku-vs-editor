# .pukuignore File Documentation

## Overview

`.pukuignore` files allow you to exclude specific files and directories from being used as context by Puku's AI features, including:
- **NES (Next Edit Suggestions)** - Inline code predictions (Ctrl+I)
- **Chat** - Codebase context in chat responses
- **Semantic Search** - Context gathering for completions

This helps protect sensitive files, reduce noise from build artifacts, and improve AI suggestion quality.

## File Location

Place `.pukuignore` files at the root of your workspace or in any subdirectory. Puku will automatically discover and apply all `.pukuignore` files in your workspace.

```
my-project/
├── .pukuignore          # Root-level ignore rules
├── src/
│   └── tests/
│       └── .pukuignore  # Test-specific ignore rules
└── docs/
```

## Syntax

`.pukuignore` uses the same syntax as `.gitignore`:

### Basic Patterns

```gitignore
# Comments start with #

# Ignore specific files
secret.key
database.sql

# Ignore all files with extension
*.log
*.env

# Ignore directories
node_modules/
dist/
build/

# Ignore files in any subdirectory
**/.DS_Store
**/temp/
```

### Negation Patterns

Use `!` to explicitly include files that would otherwise be ignored:

```gitignore
# Ignore all .env files
*.env

# But include the example
!.env.example
```

### Advanced Patterns

```gitignore
# Ignore all .txt files in the current directory only (not subdirectories)
/*.txt

# Ignore all .json files in src/ and subdirectories
src/**/*.json

# Ignore files matching pattern anywhere in the tree
**/secrets/**
```

## Common Use Cases

### Protecting Sensitive Data

```gitignore
# Environment files
.env
.env.local
.env.production

# Credentials
credentials.json
auth.yaml
*.key
*.pem

# API keys
**/config/secrets/**
```

### Excluding Build Artifacts

```gitignore
# Build outputs
dist/
build/
out/
target/

# Dependencies
node_modules/
vendor/
.venv/

# Caches
.cache/
.next/
.nuxt/
```

### Reducing Noise from Generated Files

```gitignore
# Generated code
**/*.generated.ts
**/codegen/**

# Compiled files
*.pyc
*.class
*.o

# Lock files (usually not useful as context)
package-lock.json
yarn.lock
Gemfile.lock
```

### Project-Specific Examples

**JavaScript/TypeScript:**
```gitignore
node_modules/
dist/
build/
.next/
coverage/
*.map
```

**Python:**
```gitignore
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/
.pytest_cache/
```

**Java:**
```gitignore
target/
*.class
.gradle/
build/
```

**Go:**
```gitignore
vendor/
*.exe
*.test
```

## How It Works

1. **Automatic Discovery**: Puku scans your workspace for `.pukuignore` files on extension activation
2. **File Watching**: Changes to `.pukuignore` files are detected and applied immediately
3. **Hierarchical Rules**: Rules in subdirectories are applied relative to that directory
4. **Filtering**: Before providing context to AI models, Puku checks each file against ignore rules

## Implementation Details

### Local vs Remote Exclusions

- **Local**: `.pukuignore` files in your workspace (always applied)
- **Remote**: Server-side content exclusions via authentication (optional, requires Puku account)

Both types of exclusions are combined when filtering files.

### Performance

- Ignore rules are compiled into efficient patterns using minimatch
- File checks are cached to avoid redundant checks
- Large workspaces with many ignore rules may experience slight delays during initial indexing

### API Integration

The ignore service is accessible via `IIgnoreService`:

```typescript
import { IIgnoreService } from 'src/platform/ignore/common/ignoreService';

// Check if file should be ignored
const ignored = await ignoreService.isPukuIgnored(fileUri);

// Get minimatch pattern for all ignore rules
const pattern = await ignoreService.asMinimatchPattern();
```

## Migration from GitHub Copilot

If you previously used `.copilotignore` files with GitHub Copilot, simply rename them to `.pukuignore`:

```bash
# Rename all .copilotignore files in your workspace
find . -name ".copilotignore" -exec sh -c 'mv "$1" "$(dirname "$1")/.pukuignore"' _ {} \;
```

The syntax is identical, so no other changes are needed.

## Best Practices

1. **Start with gitignore**: Copy your `.gitignore` as a starting point for `.pukuignore`
2. **Be specific**: Only exclude files that truly shouldn't be used as context
3. **Document exceptions**: Add comments explaining non-obvious exclusions
4. **Test your rules**: Use Puku's semantic search to verify excluded files aren't appearing in context
5. **Review periodically**: Update ignore rules as your project structure evolves

## Troubleshooting

### Files still appearing in context

1. Check file is matched by your pattern:
   ```bash
   # Test pattern manually
   echo ".env" | grep -E "\.env"
   ```

2. Ensure `.pukuignore` is in the correct directory relative to the file

3. Reload VS Code to ensure rules are re-read

### Too many files excluded

1. Review your patterns for overly broad rules (e.g., `*.js` excludes ALL JavaScript)
2. Use negation patterns (`!`) to re-include specific files
3. Check for multiple `.pukuignore` files with conflicting rules

## Related Features

- **NES (Next Edit Suggestions)**: `docs/prd-nes.md`
- **Semantic Search**: `docs/PUKU_INDEXING_ARCHITECTURE.md`
- **Ignore Service Implementation**: `src/platform/ignore/node/ignoreServiceImpl.ts`

## See Also

- [gitignore documentation](https://git-scm.com/docs/gitignore)
- [minimatch pattern syntax](https://github.com/isaacs/minimatch)
