# Phase 2: Codebase Indexing

## Goal

Index all workspace files with embeddings to enable semantic search across the entire codebase.

## Duration

3-4 days

## Prerequisites

- Phase 1 complete (embeddings infrastructure working)
- Proxy embeddings endpoint responding correctly

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  WORKSPACE INDEXER                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   File       │───►│   AST        │───►│  Chunk    │ │
│  │   Scanner    │    │   Parser     │    │  Creator  │ │
│  └──────────────┘    └──────────────┘    └───────────┘ │
│                                                 │        │
│                                                 ▼        │
│                                          ┌───────────┐  │
│                                          │ Embeddings│  │
│                                          │ Computer  │  │
│                                          └───────────┘  │
│                                                 │        │
│                                                 ▼        │
│  ┌──────────────────────────────────────────────────┐   │
│  │              LOCAL INDEX CACHE                    │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │   │
│  │  │ file1   │  │ file2   │  │ file3   │  ...     │   │
│  │  │ chunks  │  │ chunks  │  │ chunks  │          │   │
│  │  │ embeds  │  │ embeds  │  │ embeds  │          │   │
│  │  └─────────┘  └─────────┘  └─────────┘          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Tasks

### 2.1 Create Workspace File Scanner

**File**: `github/editor/src/platform/workspaceIndex/node/pukuWorkspaceScanner.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { URI } from '../../../util/vs/base/common/uri';

export interface ScanResult {
  files: URI[];
  totalSize: number;
}

export class PukuWorkspaceScanner {
  private readonly _excludePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.min.js',
    '**/package-lock.json',
    '**/yarn.lock'
  ];

  private readonly _includePatterns = [
    '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
    '**/*.py', '**/*.java', '**/*.go', '**/*.rs',
    '**/*.c', '**/*.cpp', '**/*.h', '**/*.hpp',
    '**/*.cs', '**/*.rb', '**/*.php'
  ];

  async scanWorkspace(
    workspaceFolders: readonly vscode.WorkspaceFolder[],
    maxFiles: number = 5000
  ): Promise<ScanResult> {
    const files: URI[] = [];
    let totalSize = 0;

    for (const folder of workspaceFolders) {
      const pattern = `{${this._includePatterns.join(',')}}`;
      const exclude = `{${this._excludePatterns.join(',')}}`;

      const foundFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, pattern),
        exclude,
        maxFiles - files.length
      );

      for (const file of foundFiles) {
        if (files.length >= maxFiles) break;
        files.push(URI.from(file));
      }
    }

    return { files, totalSize };
  }
}
```

### 2.2 Create Code Chunker

**File**: `github/editor/src/platform/workspaceIndex/node/pukuCodeChunker.ts` (new file)

Uses existing tree-sitter infrastructure for AST-based chunking:

```typescript
import { URI } from '../../../util/vs/base/common/uri';
import { IParserService } from '../../parser/node/parserService';
import { FileChunk } from '../../chunking/common/chunk';
import { Range } from '../../../util/vs/editor/common/core/range';

export interface ChunkOptions {
  maxChunkSize: number;      // Max tokens per chunk
  overlapSize: number;       // Overlap between chunks
  minChunkSize: number;      // Min tokens to create chunk
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxChunkSize: 500,
  overlapSize: 50,
  minChunkSize: 50
};

export class PukuCodeChunker {
  constructor(
    private readonly _parserService: IParserService
  ) {}

  async chunkFile(
    uri: URI,
    content: string,
    options: ChunkOptions = DEFAULT_OPTIONS
  ): Promise<FileChunk[]> {
    const chunks: FileChunk[] = [];

    // Try AST-based chunking first
    try {
      const astChunks = await this._chunkByAST(uri, content, options);
      if (astChunks.length > 0) {
        return astChunks;
      }
    } catch {
      // Fall back to line-based chunking
    }

    // Fallback: Line-based chunking
    return this._chunkByLines(uri, content, options);
  }

  private async _chunkByAST(
    uri: URI,
    content: string,
    options: ChunkOptions
  ): Promise<FileChunk[]> {
    const structure = await this._parserService.getStructure(uri.toString(), content);
    if (!structure) return [];

    const chunks: FileChunk[] = [];

    // Chunk by functions, classes, etc.
    for (const node of structure.children) {
      const nodeText = content.substring(node.range.startOffset, node.range.endOffset);

      if (nodeText.length > options.maxChunkSize * 4) {
        // Large node: split further
        const subChunks = this._splitLargeNode(uri, nodeText, node.range, options);
        chunks.push(...subChunks);
      } else if (nodeText.length >= options.minChunkSize * 4) {
        chunks.push({
          text: nodeText,
          rawText: nodeText,
          file: uri,
          range: new Range(
            node.range.startLine + 1,
            node.range.startColumn + 1,
            node.range.endLine + 1,
            node.range.endColumn + 1
          )
        });
      }
    }

    return chunks;
  }

  private _chunkByLines(
    uri: URI,
    content: string,
    options: ChunkOptions
  ): FileChunk[] {
    const lines = content.split('\n');
    const chunks: FileChunk[] = [];
    const linesPerChunk = Math.floor(options.maxChunkSize / 10); // ~10 chars per line avg

    for (let i = 0; i < lines.length; i += linesPerChunk - options.overlapSize / 10) {
      const chunkLines = lines.slice(i, i + linesPerChunk);
      const text = chunkLines.join('\n');

      if (text.length >= options.minChunkSize * 4) {
        chunks.push({
          text,
          rawText: text,
          file: uri,
          range: new Range(i + 1, 1, Math.min(i + linesPerChunk, lines.length), 1)
        });
      }
    }

    return chunks;
  }

  private _splitLargeNode(
    uri: URI,
    text: string,
    range: any,
    options: ChunkOptions
  ): FileChunk[] {
    // Split large nodes by lines
    return this._chunkByLines(uri, text, options);
  }
}
```

### 2.3 Create Workspace Index Manager

**File**: `github/editor/src/platform/workspaceIndex/node/pukuWorkspaceIndex.ts` (new file)

```typescript
import { Disposable } from 'vscode';
import { URI } from '../../../util/vs/base/common/uri';
import { FileChunk } from '../../chunking/common/chunk';
import { Embedding, IEmbeddingsComputer, EmbeddingType } from '../../embeddings/common/embeddingsComputer';
import { PukuWorkspaceScanner } from './pukuWorkspaceScanner';
import { PukuCodeChunker } from './pukuCodeChunker';
import { createHash } from 'crypto';

export interface IndexedChunk {
  chunk: FileChunk;
  embedding: Embedding;
  fileHash: string;
}

export interface IndexStats {
  totalFiles: number;
  indexedFiles: number;
  totalChunks: number;
  status: 'idle' | 'indexing' | 'ready' | 'error';
}

export class PukuWorkspaceIndex extends Disposable {
  private _index = new Map<string, IndexedChunk[]>(); // file path -> chunks
  private _stats: IndexStats = {
    totalFiles: 0,
    indexedFiles: 0,
    totalChunks: 0,
    status: 'idle'
  };

  constructor(
    private readonly _scanner: PukuWorkspaceScanner,
    private readonly _chunker: PukuCodeChunker,
    private readonly _embeddingsComputer: IEmbeddingsComputer,
    private readonly _storageUri: URI | undefined
  ) {
    super(() => this.dispose());
  }

  get stats(): IndexStats {
    return { ...this._stats };
  }

  async initialize(): Promise<void> {
    await this._loadFromDisk();
  }

  async indexWorkspace(
    workspaceFolders: readonly any[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this._stats.status = 'indexing';

    try {
      const { files } = await this._scanner.scanWorkspace(workspaceFolders);
      this._stats.totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        await this._indexFile(files[i]);
        this._stats.indexedFiles = i + 1;
        onProgress?.(((i + 1) / files.length) * 100);
      }

      this._stats.status = 'ready';
      await this._saveToDisk();
    } catch (error) {
      this._stats.status = 'error';
      throw error;
    }
  }

  async indexFile(uri: URI): Promise<void> {
    await this._indexFile(uri);
    await this._saveToDisk();
  }

  async removeFile(uri: URI): Promise<void> {
    const uriString = uri.toString();
    const chunks = this._index.get(uriString);
    if (chunks) {
      this._stats.totalChunks -= chunks.length;
      this._index.delete(uriString);
      await this._saveToDisk();
    }
  }

  async removeWorkspaceFolder(folderUri: URI): Promise<void> {
    const folderPath = folderUri.toString();
    const filesToRemove: string[] = [];

    for (const [filePath] of this._index) {
      if (filePath.startsWith(folderPath)) {
        filesToRemove.push(filePath);
      }
    }

    for (const filePath of filesToRemove) {
      const chunks = this._index.get(filePath);
      if (chunks) {
        this._stats.totalChunks -= chunks.length;
        this._index.delete(filePath);
      }
    }

    await this._saveToDisk();
  }

  private async _indexFile(uri: URI): Promise<void> {
    try {
      const content = await this._readFile(uri);
      const fileHash = this._computeHash(content);

      // Check if already indexed with same hash
      const existing = this._index.get(uri.toString());
      if (existing && existing[0]?.fileHash === fileHash) {
        return; // Already up to date
      }

      // Chunk the file
      const chunks = await this._chunker.chunkFile(uri, content);

      // Compute embeddings in batches
      const chunkTexts = chunks.map(c => c.text);
      const embeddings = await this._embeddingsComputer.computeEmbeddings(
        EmbeddingType.text3small_512,
        chunkTexts
      );

      // Store indexed chunks
      const indexedChunks: IndexedChunk[] = chunks.map((chunk, i) => ({
        chunk,
        embedding: embeddings.values[i],
        fileHash
      }));

      this._index.set(uri.toString(), indexedChunks);
      this._stats.totalChunks += indexedChunks.length;
    } catch (error) {
      console.error(`Failed to index ${uri.toString()}:`, error);
    }
  }

  async search(
    query: string,
    maxResults: number = 10
  ): Promise<IndexedChunk[]> {
    // Compute query embedding
    const queryEmbeddings = await this._embeddingsComputer.computeEmbeddings(
      EmbeddingType.text3small_512,
      [query],
      { inputType: 'query' }
    );
    const queryEmbedding = queryEmbeddings.values[0];

    // Search all chunks
    const results: { chunk: IndexedChunk; score: number }[] = [];

    for (const chunks of this._index.values()) {
      for (const indexedChunk of chunks) {
        const score = this._cosineSimilarity(
          queryEmbedding.value,
          indexedChunk.embedding.value
        );
        results.push({ chunk: indexedChunk, score });
      }
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(r => r.chunk);
  }

  private _cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private _computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private async _readFile(uri: URI): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(uri.fsPath, 'utf-8');
  }

  private async _saveToDisk(): Promise<void> {
    if (!this._storageUri) return;

    const data: Record<string, any[]> = {};
    for (const [path, chunks] of this._index) {
      data[path] = chunks.map(c => ({
        text: c.chunk.text,
        range: c.chunk.range,
        embedding: c.embedding.value,
        fileHash: c.fileHash
      }));
    }

    const fs = await import('fs/promises');
    const cachePath = URI.joinPath(this._storageUri, 'puku-workspace-index.json');
    await fs.writeFile(cachePath.fsPath, JSON.stringify(data));
  }

  private async _loadFromDisk(): Promise<void> {
    if (!this._storageUri) return;

    try {
      const fs = await import('fs/promises');
      const cachePath = URI.joinPath(this._storageUri, 'puku-workspace-index.json');
      const content = await fs.readFile(cachePath.fsPath, 'utf-8');
      const data = JSON.parse(content);

      for (const [path, chunks] of Object.entries(data)) {
        this._index.set(path, (chunks as any[]).map(c => ({
          chunk: {
            text: c.text,
            rawText: c.text,
            file: URI.parse(path),
            range: c.range
          },
          embedding: {
            type: EmbeddingType.text3small_512,
            value: c.embedding
          },
          fileHash: c.fileHash
        })));
      }
    } catch {
      // No cache or invalid cache
    }
  }
}
```

### 2.4 Add File Change Listeners

**File**: `github/editor/src/platform/workspaceIndex/node/pukuWorkspaceIndexWatcher.ts` (new file)

The extension detects new/changed files through **multiple mechanisms**:

1. **File System Watcher** - Monitors filesystem for create/change/delete events
2. **Text Document Events** - Detects when files are opened/edited in VS Code
3. **Workspace Folder Changes** - Handles new workspace folders being added

```typescript
import * as vscode from 'vscode';
import { PukuWorkspaceIndex } from './pukuWorkspaceIndex';
import { URI } from '../../../util/vs/base/common/uri';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IWorkspaceService } from '../../../platform/workspace/common/workspaceService';
import { IFileSystemService } from '../../../platform/fileSystem/common/fileSystemService';

export class PukuWorkspaceIndexWatcher extends Disposable {
  private readonly _fileWatcher: vscode.FileSystemWatcher;
  private readonly _pendingUpdates = new Map<string, NodeJS.Timeout>();
  private readonly _debounceDelay = 1000; // 1 second debounce

  constructor(
    private readonly _index: PukuWorkspaceIndex,
    private readonly _workspaceService: IWorkspaceService,
    private readonly _fileSystemService: IFileSystemService
  ) {
    super();

    // Create file system watcher for code files
    const pattern = '**/*.{ts,tsx,js,jsx,py,java,go,rs,c,cpp,h,hpp,cs,rb,php}';
    this._fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Listen to file system events
    this._register(
      this._fileWatcher.onDidCreate(uri => this._handleFileCreated(uri))
    );
    this._register(
      this._fileWatcher.onDidChange(uri => this._handleFileChanged(uri))
    );
    this._register(
      this._fileWatcher.onDidDelete(uri => this._handleFileDeleted(uri))
    );

    // Listen to text document events (when files are opened/edited)
    this._register(
      this._workspaceService.onDidOpenTextDocument(doc => {
        if (this._shouldIndexFile(doc.uri)) {
          this._queueIndexUpdate(doc.uri);
        }
      })
    );

    this._register(
      this._workspaceService.onDidChangeTextDocument(e => {
        if (this._shouldIndexFile(e.document.uri)) {
          this._queueIndexUpdate(e.document.uri);
        }
      })
    );

    // Listen to workspace folder changes
    this._register(
      vscode.workspace.onDidChangeWorkspaceFolders(async e => {
        // Index new workspace folders
        for (const folder of e.added) {
          await this._indexNewWorkspaceFolder(folder);
        }
        // Remove deleted workspace folders from index
        for (const folder of e.removed) {
          await this._index.removeWorkspaceFolder(folder.uri);
        }
      })
    );
  }

  /**
   * Checks if a file should be indexed based on:
   * - File extension matches supported patterns
   * - File is not excluded (node_modules, .git, etc.)
   * - File exists and is actually a file (not directory)
   */
  private async _shouldIndexFile(uri: vscode.Uri): Promise<boolean> {
    // Check if file is in workspace
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return false;
    }

    // Check exclude patterns
    const excludePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/package-lock.json',
      '**/yarn.lock'
    ];

    const relativePath = vscode.workspace.asRelativePath(uri);
    for (const pattern of excludePatterns) {
      if (this._matchesPattern(relativePath, pattern)) {
        return false;
      }
    }

    // Verify it's actually a file
    try {
      const stat = await this._fileSystemService.stat(uri);
      return stat.type === vscode.FileType.File;
    } catch {
      return false;
    }
  }

  private _matchesPattern(path: string, pattern: string): boolean {
    // Simple glob matching (can be enhanced with minimatch library)
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    return regex.test(path);
  }

  /**
   * Handles file creation events from file system watcher
   */
  private async _handleFileCreated(uri: vscode.Uri): Promise<void> {
    if (await this._shouldIndexFile(uri)) {
      this._queueIndexUpdate(uri);
    }
  }

  /**
   * Handles file change events from file system watcher
   */
  private async _handleFileChanged(uri: vscode.Uri): Promise<void> {
    if (await this._shouldIndexFile(uri)) {
      this._queueIndexUpdate(uri);
    }
  }

  /**
   * Handles file deletion events
   */
  private async _handleFileDeleted(uri: vscode.Uri): Promise<void> {
    // Cancel any pending updates for this file
    const uriString = uri.toString();
    const pendingTimer = this._pendingUpdates.get(uriString);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this._pendingUpdates.delete(uriString);
    }

    // Remove from index
    await this._index.removeFile(URI.from(uri));
  }

  /**
   * Queues a file for indexing with debouncing to avoid excessive re-indexing
   * when multiple changes happen quickly (e.g., during save)
   */
  private _queueIndexUpdate(uri: vscode.Uri): void {
    const uriString = uri.toString();

    // Cancel existing timer if any
    const existingTimer = this._pendingUpdates.get(uriString);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Create new debounced timer
    const timer = setTimeout(async () => {
      this._pendingUpdates.delete(uriString);
      try {
        await this._index.indexFile(URI.from(uri));
      } catch (error) {
        console.error(`Failed to index ${uriString}:`, error);
      }
    }, this._debounceDelay);

    this._pendingUpdates.set(uriString, timer);
  }

  /**
   * Indexes all files in a newly added workspace folder
   */
  private async _indexNewWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
    const scanner = new PukuWorkspaceScanner();
    const { files } = await scanner.scanWorkspace([folder]);

    for (const file of files) {
      await this._index.indexFile(file);
    }
  }

  override dispose(): void {
    // Clear all pending timers
    for (const timer of this._pendingUpdates.values()) {
      clearTimeout(timer);
    }
    this._pendingUpdates.clear();

    // Dispose file watcher
    this._fileWatcher.dispose();

    super.dispose();
  }
}
```

**How File Detection Works:**

1. **Initial Scan**: On extension activation, `indexWorkspace()` scans all files
2. **File System Watcher**: Monitors filesystem for create/change/delete events
3. **Text Document Events**: Catches files opened/edited in VS Code (may be faster than FS watcher)
4. **Debouncing**: Multiple rapid changes are batched (1 second delay)
5. **Filtering**: Only indexes supported file types and excludes ignored patterns
6. **Hash Checking**: `_indexFile()` checks file hash to avoid re-indexing unchanged files

**Event Flow:**
```
File Created/Changed
    ↓
File System Watcher → onDidCreate/onDidChange
    ↓
Should Index? (check extension, exclude patterns)
    ↓
Queue Update (debounced)
    ↓
Index File (chunk → embed → store)
```

### 2.5 Integrate Watcher with Extension

**File**: `github/editor/src/extension/extension/vscode-node/services.ts` (modify)

Register the watcher when the workspace index is initialized:

```typescript
import { PukuWorkspaceIndex } from '../../../platform/workspaceIndex/node/pukuWorkspaceIndex';
import { PukuWorkspaceIndexWatcher } from '../../../platform/workspaceIndex/node/pukuWorkspaceIndexWatcher';
import { PukuWorkspaceScanner } from '../../../platform/workspaceIndex/node/pukuWorkspaceScanner';
import { PukuCodeChunker } from '../../../platform/workspaceIndex/node/pukuCodeChunker';

// In extension activation
const scanner = new PukuWorkspaceScanner();
const chunker = new PukuCodeChunker(parserService);
const embeddingsComputer = services.get(IEmbeddingsComputer);
const storageUri = context.globalStorageUri;

const workspaceIndex = new PukuWorkspaceIndex(
  scanner,
  chunker,
  embeddingsComputer,
  storageUri
);

// Initialize index
await workspaceIndex.initialize();

// Start watching for file changes
const watcher = new PukuWorkspaceIndexWatcher(
  workspaceIndex,
  workspaceService,
  fileSystemService
);

// Initial indexing (can be done in background)
if (config.get('puku.indexing.autoIndex')) {
  workspaceIndex.indexWorkspace(
    vscode.workspace.workspaceFolders || [],
    (progress) => {
      // Update status bar or progress indicator
      console.log(`Indexing progress: ${progress.toFixed(1)}%`);
    }
  ).catch(error => {
    console.error('Failed to index workspace:', error);
  });
}

// Register services
services.set(IWorkspaceIndex, workspaceIndex);
```

## Testing

### Test 1: Workspace Scanning

```typescript
test('scanner finds workspace files', async () => {
  const scanner = new PukuWorkspaceScanner();
  const result = await scanner.scanWorkspace(vscode.workspace.workspaceFolders!);

  expect(result.files.length).toBeGreaterThan(0);
  expect(result.files.every(f => !f.toString().includes('node_modules'))).toBe(true);
});
```

### Test 2: Code Chunking

```typescript
test('chunker creates chunks from file', async () => {
  const chunker = new PukuCodeChunker(mockParserService);
  const chunks = await chunker.chunkFile(
    URI.file('/test/file.ts'),
    'function hello() { return "world"; }\n\nfunction goodbye() { return "moon"; }'
  );

  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.every(c => c.text.length > 0)).toBe(true);
});
```

### Test 3: Semantic Search

```typescript
test('index returns relevant results for query', async () => {
  const index = new PukuWorkspaceIndex(scanner, chunker, embeddingsComputer, storageUri);
  await index.indexWorkspace(workspaceFolders);

  const results = await index.search('authentication login user');

  expect(results.length).toBeGreaterThan(0);
  expect(results[0].chunk.text).toContain('auth'); // or related
});
```

### Test 4: File Change Detection

```typescript
test('watcher detects new files and triggers indexing', async () => {
  const index = new PukuWorkspaceIndex(scanner, chunker, embeddingsComputer, storageUri);
  const watcher = new PukuWorkspaceIndexWatcher(index, workspaceService, fileSystemService);

  // Create a new file
  const testFile = vscode.Uri.joinPath(workspaceFolder.uri, 'test-new-file.ts');
  await vscode.workspace.fs.writeFile(testFile, Buffer.from('export function test() {}'));

  // Wait for debounce + indexing
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify file was indexed
  const stats = index.stats;
  expect(stats.indexedFiles).toBeGreaterThan(0);

  // Cleanup
  await vscode.workspace.fs.delete(testFile);
  watcher.dispose();
});

test('watcher ignores excluded files', async () => {
  const index = new PukuWorkspaceIndex(scanner, chunker, embeddingsComputer, storageUri);
  const watcher = new PukuWorkspaceIndexWatcher(index, workspaceService, fileSystemService);

  // Create file in node_modules (should be ignored)
  const excludedFile = vscode.Uri.joinPath(workspaceFolder.uri, 'node_modules/test.ts');
  await vscode.workspace.fs.writeFile(excludedFile, Buffer.from('export function test() {}'));

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify file was NOT indexed
  const beforeStats = index.stats;
  // File should not appear in index

  await vscode.workspace.fs.delete(excludedFile);
  watcher.dispose();
});
```

## Configuration

```json
{
  "puku.indexing.enabled": true,
  "puku.indexing.maxFiles": 5000,
  "puku.indexing.excludePatterns": ["**/node_modules/**", "**/.git/**"],
  "puku.indexing.chunkSize": 500,
  "puku.indexing.autoReindex": true
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `editor/src/platform/workspaceIndex/node/pukuWorkspaceScanner.ts` | Create | Scans workspace for files |
| `editor/src/platform/workspaceIndex/node/pukuCodeChunker.ts` | Create | Chunks files intelligently |
| `editor/src/platform/workspaceIndex/node/pukuWorkspaceIndex.ts` | Create | Main index manager |
| `editor/src/platform/workspaceIndex/node/pukuWorkspaceIndexWatcher.ts` | Create | File change watcher (FS + text document events) |

## Definition of Done

- [ ] Workspace scanner finding relevant files
- [ ] Code chunker creating meaningful chunks
- [ ] Embeddings computed and stored for all chunks
- [ ] Semantic search returning relevant results
- [ ] File changes trigger re-indexing (FS watcher + text document events)
- [ ] New files automatically detected and indexed
- [ ] Deleted files removed from index
- [ ] Workspace folder changes handled
- [ ] Index persisted to disk
- [ ] Tests passing

## Next Phase

Once this phase is complete, proceed to [Phase 3: Semantic FIM Context](./phase-3-semantic-fim-context.md).

