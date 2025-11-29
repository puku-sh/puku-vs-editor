# Puku AI Inline Completion Tests

Comprehensive test suite for the Radix Trie-based completions cache implementation.

## Test Files

### Unit Tests

#### 1. `radixTrie.test.ts`
Tests for the core `LRURadixTrie` data structure.

**Coverage:**
- Basic operations (set, findAll, delete)
- Edge splitting and merging
- LRU eviction behavior
- Code completion scenarios
- Performance and edge cases
- Multi-line completions
- Special characters and unicode
- Overlapping prefixes

**Key Test Scenarios:**
```typescript
// Basic insertion and retrieval
trie.set('const x = ', '42');
trie.findAll('const x = ');  // [{ remainingKey: '', value: '42' }]

// Word-by-word acceptance
trie.set('function hello() {\n    ', 'console.log("Hello");');
trie.findAll('function hello() {\n    console');
// Returns remaining: '.log("Hello");'
```

#### 2. `completionsCache.test.ts`
Tests for the `CompletionsCache` wrapper class.

**Coverage:**
- Finding exact and partial matches
- Word-by-word acceptance (Cmd+Right Arrow)
- Suffix matching
- Multiple completions per prefix
- Cache clearing
- LRU eviction (100 entry limit)
- Real-world scenarios (Go, Python, JavaScript)

**Key Test Scenarios:**
```typescript
// Exact match
cache.append('const x = ', '', '42');
cache.findAll('const x = ', '');  // ['42']

// Partial typing (user typed '4')
cache.findAll('const x = 4', '');  // ['2'] (remaining)

// Suffix matching
cache.append('def func():\n    ', '\n    return x', 'value = 42');
cache.findAll('def func():\n    ', '\n    return x');  // ['value = 42']
```

### Integration Tests

#### 3. `pukuInlineCompletionCache.integration.test.ts`
Integration tests for the cache within the inline completion provider.

**Coverage:**
- Radix Trie cache behavior with provider
- Debounce interaction with cache
- Context search optimization (only on API calls)
- Edge cases (cancellation, auth, empty completions)
- Performance benchmarks

**Key Test Scenarios:**
```typescript
// Cache hit bypasses API
await provider.provideInlineCompletionItems(...);  // API call
await provider.provideInlineCompletionItems(...);  // Cache hit (instant!)

// Context search only on API calls
let searchCalls = 0;
await provider.provideInlineCompletionItems(...);  // searchCalls++
await provider.provideInlineCompletionItems(...);  // searchCalls unchanged (cache hit)
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Extension/Integration Tests Only
```bash
npm run test:extension
```

### Run Specific Test File
```bash
# Using vitest (for unit tests)
npm run vitest src/extension/pukuai/test/completionsCache.test.ts

# Using vscode-test (for integration tests)
npm run test:extension -- src/extension/pukuai/test/pukuInlineCompletionCache.integration.test.ts
```

### Watch Mode (Auto-rerun on changes)
```bash
npm run vitest -- --watch
```

## Test Structure

All tests follow Mocha's `suite` and `test` pattern:

```typescript
suite('Feature Name', function () {
	let cache: CompletionsCache;

	setup(function () {
		// Setup before each test
		cache = new CompletionsCache();
	});

	suite('Method Name', function () {
		test('specific behavior', function () {
			// Arrange
			cache.append('prefix', 'suffix', 'completion');

			// Act
			const results = cache.findAll('prefix', 'suffix');

			// Assert
			assert.deepStrictEqual(results, ['completion']);
		});
	});
});
```

## Coverage Goals

### Current Coverage
- **LRURadixTrie**: ~95% (core data structure)
- **CompletionsCache**: ~90% (wrapper class)
- **Integration**: ~80% (provider integration)

### Key Scenarios Tested
- ✅ Exact match lookups
- ✅ Partial typing (prefix extension)
- ✅ Word-by-word acceptance (Cmd+Right Arrow)
- ✅ Suffix matching (FIM with context after cursor)
- ✅ Backspace handling
- ✅ LRU eviction (100 entries)
- ✅ Multi-line completions
- ✅ Unicode and special characters
- ✅ Context search optimization
- ✅ Debounce bypass on cache hits
- ✅ Performance (cache < 10ms, API ~200-500ms)

## Testing Philosophy

### Unit Tests
- Test individual components in isolation
- Fast execution (< 1 second total)
- No external dependencies (mocked)
- Deterministic results

### Integration Tests
- Test component interactions
- VS Code API integration (mocked when possible)
- Realistic scenarios
- Performance benchmarks

## Debugging Tests

### VS Code Debugger
1. Set breakpoints in test files
2. Use "Debug Test" CodeLens (appears above each test)
3. Or run debug configuration: "Extension Tests"

### Console Logging
Tests use `console.log` for debug output:
```typescript
test('debug scenario', function () {
	const results = cache.findAll('prefix', 'suffix');
	console.log('Results:', results);  // Visible in test output
	assert.ok(results.length > 0);
});
```

### Test Isolation
Each test runs in isolation with fresh instances:
```typescript
setup(function () {
	// Runs before EACH test
	cache = new CompletionsCache();
});
```

## Performance Benchmarks

Expected performance characteristics from integration tests:

| Operation | Expected Time | Actual (Example) |
|-----------|--------------|------------------|
| Cache hit | < 10ms | ~2-5ms |
| Cache miss (with debounce) | 200-600ms | ~400ms |
| API call (no debounce) | 200-1000ms | ~500-800ms |
| Radix Trie lookup | < 1ms | ~0.1-0.5ms |

## Common Issues & Solutions

### Issue: Tests fail with "Cannot find module"
**Solution:** Run `npm run compile` first to build TypeScript files

### Issue: Integration tests timeout
**Solution:** Increase timeout in test:
```typescript
test('slow operation', async function () {
	this.timeout(10000);  // 10 seconds
	await slowOperation();
});
```

### Issue: Flaky tests
**Solution:** Ensure proper cleanup in `setup()` and avoid shared state

### Issue: Mock services not working
**Solution:** Check that all required methods are mocked:
```typescript
const mockService = {
	requiredMethod: async () => ({ ... }),
	// Don't forget to mock ALL methods used in tests!
};
```

## Adding New Tests

### 1. Create Test File
```bash
touch src/extension/pukuai/test/newFeature.test.ts
```

### 2. Follow Template
```typescript
import * as assert from 'assert';
import { YourClass } from '../common/yourFile';

suite('YourClass', function () {
	let instance: YourClass;

	setup(function () {
		instance = new YourClass();
	});

	suite('methodName', function () {
		test('does what it should', function () {
			const result = instance.methodName();
			assert.strictEqual(result, expectedValue);
		});
	});
});
```

### 3. Run Tests
```bash
npm run test:unit
```

## CI/CD Integration

Tests automatically run on:
- Pre-commit hooks (husky)
- Pull requests (GitHub Actions)
- Release builds

Ensure all tests pass before committing:
```bash
npm test
```

## References

- **Radix Trie Algorithm**: Copilot reference implementation
- **Test Framework**: Mocha + VS Code Test Runner
- **Assertion Library**: Node.js `assert` module
- **Coverage Tool**: c8 (Istanbul)
- **CI/CD**: GitHub Actions

## Future Improvements

- [ ] Add performance regression tests
- [ ] Increase integration test coverage to 90%+
- [ ] Add stress tests (1000+ cache entries)
- [ ] Test concurrent requests in detail
- [ ] Add snapshot testing for complex completions
- [ ] Test cross-language scenarios (Python, Go, Rust, etc.)
