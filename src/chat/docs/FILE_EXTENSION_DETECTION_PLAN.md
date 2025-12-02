# File Extension Detection in Indexing Layer - Implementation Plan

## Current State Analysis

### Problems with Current Implementation

**1. Hardcoded File Extensions (Line 537 in `pukuIndexingService.ts`)**
```typescript
const pattern = '**/*.{ts,tsx,js,jsx,py,java,c,cpp,h,hpp,cs,go,rs,rb,php,swift,kt,scala,vue,svelte,md,json,yaml,yml,toml}';
```

Issues:
- ❌ Unmaintainable - changes require modifying multiple places
- ❌ No single source of truth
- ❌ Duplicate extension lists across codebase
- ❌ Easy to miss extensions when adding language support
- ❌ No categorization (code vs config vs documentation)

**2. Language ID Dependency**
- Currently relies on VS Code's `document.languageId`
- Works for opened files but not for workspace scanning
- No fallback for unknown file types

**3. Missing Features**
- ❌ No extension-to-language mapping
- ❌ No priority/ranking system (e.g., prefer `.ts` over `.d.ts`)
- ❌ No support for custom/user-defined extensions
- ❌ No detection of minified/generated files by extension
- ❌ No exclusion patterns for test files, build artifacts

---

## Proposed Solution

### Architecture: Centralized File Extension Registry

```typescript
┌─────────────────────────────────────────────────────────┐
│         PukuFileExtensionRegistry (Singleton)           │
├─────────────────────────────────────────────────────────┤
│  Language Definitions                                   │
│  ├── TypeScript (.ts, .tsx, .mts, .cts)                │
│  ├── JavaScript (.js, .jsx, .mjs, .cjs)                │
│  ├── Python (.py, .pyi, .pyw)                          │
│  └── ... (13+ languages)                               │
├─────────────────────────────────────────────────────────┤
│  Methods                                                 │
│  ├── getLanguageForExtension(ext: string)              │
│  ├── getSupportedExtensions(): string[]                │
│  ├── getGlobPattern(): string                          │
│  ├── isCodeFile(uri: Uri): boolean                     │
│  ├── shouldIndex(uri: Uri): boolean                    │
│  └── getFileCategory(uri: Uri): FileCategory           │
└─────────────────────────────────────────────────────────┘
```

### File Category System

```typescript
enum FileCategory {
  Code = 'code',              // Source code files
  Test = 'test',              // Test files (*.test.*, *.spec.*)
  Config = 'config',          // Configuration (package.json, tsconfig.json)
  Documentation = 'docs',     // Markdown, text files
  Generated = 'generated',    // .d.ts, build artifacts
  Binary = 'binary',          // Images, compiled files
  Excluded = 'excluded',      // node_modules, .git
}
```

---

## Implementation Plan

### Phase 1: Create Extension Registry (Core)

**File:** `src/extension/pukuIndexing/common/pukuFileExtensionRegistry.ts`

```typescript
interface LanguageDefinition {
  id: string;                    // Language ID (matches Tree-sitter)
  name: string;                  // Human-readable name
  extensions: string[];          // File extensions (.ts, .tsx)
  priority: number;              // Ranking (1 = highest)
  supportsAST: boolean;          // Has Tree-sitter grammar
  category: FileCategory;        // Default category

  // Optional matchers
  testFilePatterns?: RegExp[];   // Detect test files
  excludePatterns?: RegExp[];    // Skip specific files
}

export class PukuFileExtensionRegistry {
  private static instance: PukuFileExtensionRegistry;
  private languages: Map<string, LanguageDefinition>;
  private extensionToLanguage: Map<string, LanguageDefinition>;

  // Singleton
  static getInstance(): PukuFileExtensionRegistry;

  // Query methods
  getLanguageForExtension(ext: string): LanguageDefinition | undefined;
  getLanguageForFile(uri: vscode.Uri): LanguageDefinition | undefined;
  getSupportedExtensions(): string[];
  getGlobPattern(): string;

  // Filtering
  shouldIndex(uri: vscode.Uri): boolean;
  getFileCategory(uri: vscode.Uri): FileCategory;
  isTestFile(uri: vscode.Uri): boolean;
  isMinified(uri: vscode.Uri): boolean;

  // Registration (for extensions)
  registerLanguage(definition: LanguageDefinition): void;
}
```

**Language Definitions Example:**

```typescript
const TYPESCRIPT: LanguageDefinition = {
  id: 'typescript',
  name: 'TypeScript',
  extensions: ['.ts', '.tsx', '.mts', '.cts'],
  priority: 10,
  supportsAST: true,
  category: FileCategory.Code,
  testFilePatterns: [/\.test\.tsx?$/, /\.spec\.tsx?$/],
  excludePatterns: [/\.d\.ts$/], // Type definitions - lower priority
};

const JAVASCRIPT: LanguageDefinition = {
  id: 'javascript',
  name: 'JavaScript',
  extensions: ['.js', '.jsx', '.mjs', '.cjs'],
  priority: 9,
  supportsAST: true,
  category: FileCategory.Code,
  testFilePatterns: [/\.test\.jsx?$/, /\.spec\.jsx?$/],
  excludePatterns: [/\.min\.js$/], // Minified files
};
```

---

### Phase 2: Integration with Indexing Service

**Update `pukuIndexingService.ts`:**

```typescript
import { PukuFileExtensionRegistry } from '../common/pukuFileExtensionRegistry';

export class PukuIndexingService {
  private _extensionRegistry = PukuFileExtensionRegistry.getInstance();

  private async _getWorkspaceFiles(): Promise<vscode.Uri[]> {
    // Use registry for pattern
    const pattern = this._extensionRegistry.getGlobPattern();
    const excludePattern = this._getExcludePattern();

    const files = await vscode.workspace.findFiles(pattern, excludePattern, 1000);

    // Filter using registry
    return files.filter(uri => this._extensionRegistry.shouldIndex(uri));
  }

  private async _indexFile(uri: vscode.Uri): Promise<'cached' | 'indexed' | 'skipped'> {
    // Check if file should be indexed
    if (!this._extensionRegistry.shouldIndex(uri)) {
      return 'skipped';
    }

    // Get language from extension
    const language = this._extensionRegistry.getLanguageForFile(uri);
    if (!language) {
      return 'skipped';
    }

    // ... existing indexing logic
  }
}
```

---

### Phase 3: Smart File Detection

**Add intelligent detection:**

```typescript
export class PukuFileExtensionRegistry {
  /**
   * Detect if file is minified by checking:
   * 1. Extension (.min.js)
   * 2. File size vs line count ratio
   * 3. Average line length
   */
  isMinified(uri: vscode.Uri): boolean {
    // Extension check
    if (uri.fsPath.match(/\.min\.(js|css)$/)) {
      return true;
    }

    // Could analyze content if needed
    return false;
  }

  /**
   * Detect generated files:
   * - .d.ts (TypeScript definitions)
   * - .g.dart (Flutter generated)
   * - _generated.go (Go codegen)
   */
  isGenerated(uri: vscode.Uri): boolean {
    const path = uri.fsPath;
    const generatedPatterns = [
      /\.d\.ts$/,
      /\.g\.dart$/,
      /_generated\.go$/,
      /\.pb\.go$/,
      /\.generated\./,
    ];

    return generatedPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Detect binary/non-text files
   */
  isBinary(uri: vscode.Uri): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
      '.woff', '.woff2', '.ttf', '.eot',
      '.exe', '.dll', '.so', '.dylib',
      '.zip', '.tar', '.gz',
    ];

    return binaryExtensions.some(ext => uri.fsPath.endsWith(ext));
  }
}
```

---

### Phase 4: Configuration Support

**User/Workspace Settings:**

```json
{
  "puku.indexing.includeExtensions": ["ts", "js", "py"],
  "puku.indexing.excludeExtensions": ["min.js", "d.ts"],
  "puku.indexing.indexTestFiles": false,
  "puku.indexing.indexGeneratedFiles": false,
  "puku.indexing.customLanguages": [
    {
      "id": "mylang",
      "extensions": [".mlang"],
      "category": "code"
    }
  ]
}
```

**Implementation:**

```typescript
export class PukuFileExtensionRegistry {
  constructor() {
    this._loadDefaultLanguages();
    this._loadUserConfiguration();
  }

  private _loadUserConfiguration(): void {
    const config = vscode.workspace.getConfiguration('puku.indexing');

    // User includes
    const includeExts = config.get<string[]>('includeExtensions', []);
    // User excludes
    const excludeExts = config.get<string[]>('excludeExtensions', []);
    // Custom languages
    const customLangs = config.get<LanguageDefinition[]>('customLanguages', []);

    customLangs.forEach(lang => this.registerLanguage(lang));
  }
}
```

---

### Phase 5: Performance Optimizations

**1. Caching:**
```typescript
class PukuFileExtensionRegistry {
  private _globPatternCache?: string;
  private _extensionListCache?: string[];

  getGlobPattern(): string {
    if (!this._globPatternCache) {
      const exts = this.getSupportedExtensions();
      this._globPatternCache = `**/*.{${exts.join(',')}}`;
    }
    return this._globPatternCache;
  }
}
```

**2. Fast Path Lookups:**
```typescript
private extensionToLanguage = new Map<string, LanguageDefinition>();

getLanguageForExtension(ext: string): LanguageDefinition | undefined {
  // O(1) lookup
  return this.extensionToLanguage.get(ext.toLowerCase());
}
```

---

## Migration Strategy

### Step 1: Create Registry (No Breaking Changes)
- Implement `PukuFileExtensionRegistry`
- Add tests
- No changes to existing code

### Step 2: Gradual Integration
- Update `pukuIndexingService.ts` to use registry
- Keep fallback to VS Code `languageId`
- Monitor for issues

### Step 3: Expand Usage
- Update import extractor to use registry
- Update AST chunker to query registry
- Consolidate all file extension logic

### Step 4: Enable Advanced Features
- Add minified file detection
- Add generated file detection
- Add user configuration support

---

## Testing Strategy

### Unit Tests

**Test File:** `src/extension/pukuIndexing/test/common/pukuFileExtensionRegistry.spec.ts`

```typescript
suite('PukuFileExtensionRegistry', () => {
  test('detects TypeScript files', () => {
    const registry = PukuFileExtensionRegistry.getInstance();
    const lang = registry.getLanguageForExtension('.ts');
    assert.strictEqual(lang?.id, 'typescript');
  });

  test('detects test files', () => {
    const uri = vscode.Uri.file('/src/utils.test.ts');
    assert.strictEqual(registry.isTestFile(uri), true);
  });

  test('detects minified files', () => {
    const uri = vscode.Uri.file('/dist/bundle.min.js');
    assert.strictEqual(registry.isMinified(uri), true);
  });

  test('generates correct glob pattern', () => {
    const pattern = registry.getGlobPattern();
    assert.ok(pattern.includes('ts'));
    assert.ok(pattern.includes('js'));
  });
});
```

---

## Success Metrics

### Before (Current State)
- ❌ Hardcoded extensions in 1+ places
- ❌ Manual updates required for new languages
- ❌ No filtering of test/generated files
- ❌ No user configuration

### After (With Registry)
- ✅ Single source of truth for file extensions
- ✅ Automatic glob pattern generation
- ✅ Smart detection (tests, minified, generated)
- ✅ User-configurable
- ✅ Extensible for new languages
- ✅ Performance optimized (caching, fast lookups)

---

## File Structure

```
src/extension/pukuIndexing/
├── common/
│   ├── pukuFileExtensionRegistry.ts     # NEW: Core registry
│   └── fileCategories.ts                # NEW: Enums and types
├── node/
│   ├── pukuIndexingService.ts           # MODIFIED: Use registry
│   ├── pukuASTChunker.ts                # MODIFIED: Query registry
│   └── pukuImportExtractor.ts           # MODIFIED: Use registry
└── test/
    └── common/
        └── pukuFileExtensionRegistry.spec.ts  # NEW: Tests
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `pukuFileExtensionRegistry.ts`
- [ ] Define `LanguageDefinition` interface
- [ ] Implement core registry methods
- [ ] Add language definitions (13 languages)
- [ ] Write unit tests (20+ tests)

### Phase 2: Integration
- [ ] Update `pukuIndexingService.ts` to use registry
- [ ] Update `pukuASTChunker.ts` to query registry
- [ ] Update `pukuImportExtractor.ts` to use registry
- [ ] Test with existing codebase

### Phase 3: Smart Detection
- [ ] Implement `isTestFile()`
- [ ] Implement `isMinified()`
- [ ] Implement `isGenerated()`
- [ ] Implement `isBinary()`
- [ ] Add detection tests

### Phase 4: Configuration
- [ ] Add VS Code settings schema
- [ ] Implement configuration loading
- [ ] Add custom language support
- [ ] Document configuration options

### Phase 5: Documentation
- [ ] Update `IMPORT_CONTEXT_DESIGN.md`
- [ ] Add `FILE_EXTENSION_REGISTRY.md`
- [ ] Update README with configuration
- [ ] Add migration guide

---

## Related Features

This registry can be reused for:
- ✅ Import context (already using languageId)
- ✅ Semantic search (file filtering)
- ✅ Code completion (language detection)
- ✅ Syntax highlighting preferences
- ✅ File watcher patterns
- ✅ Workspace analysis tools

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Estimated Effort:** 2-3 days
**Priority:** High (improves maintainability and extensibility)
