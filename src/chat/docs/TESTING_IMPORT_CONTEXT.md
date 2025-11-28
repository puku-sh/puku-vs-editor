# Testing Import Context Feature

This guide explains how to test the import-based context feature for inline completions.

## Test Structure

### Unit Tests
**Location:** `src/extension/pukuIndexing/test/node/pukuImportExtractor.test.ts`

Tests the AST-based import extractor in isolation:
- Import extraction for 13 languages (TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, C#, Ruby, PHP)
- Cache functionality (hit/miss, invalidation, size limits)
- External package filtering
- Edge cases (empty files, syntax errors, unsupported languages)

### Integration Tests
**Location:** `src/extension/pukuai/test/vscode-node/pukuImportContext.integration.test.ts`

Tests the full import context flow:
- End-to-end import extraction in workspace
- Multi-language support
- Performance benchmarks
- Error handling

### E2E Tests with API
**Location:** `src/extension/pukuai/test/vscode-node/pukuFimWithImportContext.e2e.test.ts`

Tests the complete FIM flow with real api.puku.sh:
- TypeScript completions with imported utilities
- Python completions with helper modules
- Go completions with imported packages
- Comparison: no context vs import context
- Performance benchmarks with API calls
- Error handling (invalid auth, large context)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Only Extension Integration Tests
```bash
npm run test:extension
```

### Run Specific Test File
```bash
# Unit tests
npm run test:unit -- --grep "PukuImportExtractor"

# Integration tests
npm run test:extension -- --grep "Import Context"

# E2E tests with API (requires network)
npm run test:extension -- --grep "E2E"
```

### Run E2E Tests Only
```bash
# Run only E2E tests that call api.puku.sh
npm run test:extension -- --grep "FIM with Import Context - E2E"
```

**Note:** E2E tests require:
- Active internet connection
- Valid api.puku.sh API key
- May take longer (API latency)
- Use real API quota

### Run with Debug Output
```bash
# Set environment variable for verbose logging
DEBUG=* npm test
```

## Test Coverage

### What's Tested

**✅ Import Extraction:**
- TypeScript: `import X from './file'`, `require('./file')`
- JavaScript: `require('./file')`, dynamic imports
- Python: `from .module import X`, `import module`
- Go: `import "./package"`
- Rust: `use crate::module`, `use super::module`
- Java: `import com.example.Class`
- C/C++: `#include "local.h"`
- C#: `using Namespace`
- Ruby: `require './file'`, `require_relative`
- PHP: `require './file.php'`, `include`

**✅ Cache Functionality:**
- Cache hits return same results
- Cache invalidates on content change
- LRU eviction for 100+ files
- Cache clear works correctly

**✅ External Package Filtering:**
- npm packages (react, lodash, etc.)
- System libraries (stdio.h, java.util, etc.)
- Scoped packages (@angular/core, etc.)

**✅ Edge Cases:**
- Empty files
- Syntax errors
- Unsupported languages
- Large files (100+ imports)

**✅ Performance:**
- Cache miss: < 50ms
- Cache hit: < 10ms
- Large files: < 1s

## Manual Testing

### Test Import Context in VS Code

1. **Start Extension in Debug Mode:**
   ```bash
   cd src/chat
   npm run watch
   # Press F5 in VS Code to launch extension host
   ```

2. **Create Test File:**
   Create `test.ts` with:
   ```typescript
   import utils from './utils';
   import helper from '../lib/helper';

   // Type something here to trigger inline completion
   const foo =
   ```

3. **Check Console Logs:**
   Open Debug Console and look for:
   ```
   [PukuInlineCompletion] Import context: 2 files
   Total context: 2 files (2 imports, 0 semantic)
   ```

4. **Verify Imported Files Are Read:**
   Check that imported files' content is sent to FIM endpoint in network logs

### Test with Different Languages

**Python example:**
```python
from .models import User
from ..utils import helper

# Type here
```

**Go example:**
```go
package main

import "./utils"
import "../models"

// Type here
```

**Rust example:**
```rust
use crate::utils::helpers;
use super::models;

// Type here
```

## Debugging Tests

### View Test Output
```bash
# Run with reporter that shows all test names
npm test -- --reporter spec
```

### Debug Single Test in VS Code

1. Set breakpoint in test file
2. Open Run & Debug panel
3. Select "Extension Tests"
4. Press F5

### Add More Logging

Edit test files to add console.log:
```typescript
test('my test', async () => {
	const imports = await extractor.extractImports(code, 'typescript');
	console.log('Extracted imports:', imports); // Add logging
	assert.ok(imports.includes('./utils'));
});
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Commits to main branch
- Pre-commit hook (if configured)

### GitHub Actions
```yaml
- name: Run tests
  run: npm test
```

## Expected Results

### Unit Tests
- **Total:** ~40 tests
- **Duration:** < 10 seconds
- **Pass rate:** 100%

### Integration Tests
- **Total:** ~15 tests
- **Duration:** < 30 seconds
- **Pass rate:** 100%

## Troubleshooting

### Tests Fail with "Tree-sitter not found"
```bash
# Rebuild native modules
npm rebuild
```

### Tests Timeout
Increase timeout in test:
```typescript
test('slow test', async function() {
	this.timeout(10000); // 10 seconds
	// ...
});
```

### Cache Tests Fail
Clear cache before running:
```typescript
setup(() => {
	extractor.clearCache();
});
```

## Performance Benchmarks

Run performance tests:
```bash
npm run test:unit -- --grep "Performance"
```

Expected results:
- Import extraction (uncached): < 50ms
- Import extraction (cached): < 10ms
- Large file (1000 lines): < 100ms
- 100 files indexing: < 5s

## Next Steps

After tests pass:
1. ✅ Verify all tests green
2. ✅ Check code coverage (aim for >80%)
3. ✅ Manual testing in VS Code
4. ✅ Test with real-world projects
5. ✅ Monitor performance in production
