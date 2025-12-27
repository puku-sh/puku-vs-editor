# PRD: Handle `.puku` Folder Deletion During Indexing

## Problem Statement

When the `.puku` folder is deleted while indexing is in progress, the indexing service crashes or enters an error state, resulting in:

1. **Database operation failures** - All SQLite operations fail with "database not found" errors
2. **Lost indexing progress** - All indexed data is lost and needs to be regenerated
3. **Poor user experience** - No recovery mechanism, extension may need reload
4. **Silent failures** - User may not know why indexing stopped working

### Current Behavior Example

```
User Workspace:
├── .puku/
│   └── puku-embeddings.db (5,755 files being indexed)
└── src/
    └── ... (files being indexed)

[User or another process deletes .puku folder]

Result:
- Error: "ENOENT: no such file or directory, open '.puku/puku-embeddings.db'"
- Indexing service status: Error
- All indexed data: Lost
- Recovery: Manual - requires reloading window and re-indexing
```

### When This Can Happen

1. **Accidental deletion** - User deletes `.puku` thinking it's temporary/cache
2. **Git operations** - `git clean -fdx` removes untracked folders
3. **Build tools** - Some build systems clean "hidden" folders
4. **Disk cleanup tools** - Automated cleanup of cache-like folders
5. **Version control** - Switching branches that don't have `.puku` folder

## Goals

1. **Detect folder deletion** - Monitor `.puku` folder and database file
2. **Graceful degradation** - Don't crash when folder is deleted
3. **Automatic recovery** - Recreate folder and database automatically
4. **User notification** - Inform user about the deletion and recovery
5. **Preserve work** - Optionally restart indexing automatically

## Non-Goals

1. Preventing folder deletion (not possible)
2. Recovering deleted database data (no backup mechanism)
3. Handling deletions of individual files within `.puku/`

## Proposed Solution

### 1. File System Watching

Add VS Code file system watcher for `.puku` folder:

```typescript
// In PukuIndexingService
private _pukuFolderWatcher: vscode.FileSystemWatcher | undefined;

private _setupFolderWatcher(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const pukuPattern = new vscode.RelativePattern(workspaceFolder, '.puku/**');
    this._pukuFolderWatcher = vscode.workspace.createFileSystemWatcher(pukuPattern);

    // Watch for folder deletion
    this._pukuFolderWatcher.onDidDelete(async (uri) => {
        if (uri.path.endsWith('.puku')) {
            await this._handlePukuFolderDeletion();
        }
    });
}
```

### 2. Deletion Detection

Detect when `.puku` folder or database is deleted:

```typescript
private async _handlePukuFolderDeletion(): Promise<void> {
    console.warn('[PukuIndexing] .puku folder deleted, recreating...');

    // Stop current indexing if in progress
    if (this._isIndexing) {
        this.stopIndexing();
    }

    // Set status to error temporarily
    this._setStatus(PukuIndexingStatus.Error, 'Indexing folder was deleted');

    // Close existing database connection
    if (this._cache) {
        this._cache.dispose();
    }

    // Recreate folder and database
    await this._recreatePukuFolder();

    // Notify user with recovery options
    await this._showDeletionRecoveryPrompt();
}
```

### 3. Auto-Recreation

Automatically recreate `.puku` folder and database:

```typescript
private async _recreatePukuFolder(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const pukuFolderUri = vscode.Uri.joinPath(workspaceFolder.uri, '.puku');

    try {
        // Create folder
        await vscode.workspace.fs.createDirectory(pukuFolderUri);
        console.log('[PukuIndexing] ✅ Recreated .puku folder');

        // Reinitialize cache and database
        this._cache = new PukuEmbeddingsCache(pukuFolderUri, this._configService);
        await this._cache.initialize();
        console.log('[PukuIndexing] ✅ Recreated database');

        // Clear indexed files map (all data lost)
        this._indexedFiles.clear();

        // Update status to not available (needs re-indexing)
        this._setStatus(PukuIndexingStatus.NotAvailable);
    } catch (error) {
        console.error('[PukuIndexing] Failed to recreate .puku folder:', error);
        this._setStatus(PukuIndexingStatus.Error, 'Failed to recreate indexing folder');
    }
}
```

### 4. User Notification

Show notification with recovery options:

```typescript
private async _showDeletionRecoveryPrompt(): Promise<void> {
    const message = 'The .puku indexing folder was deleted. All indexed data has been lost.';
    const action = await vscode.window.showWarningMessage(
        message,
        'Reindex Now',
        'Reindex Later',
        'Learn More'
    );

    if (action === 'Reindex Now') {
        await this.startIndexing();
    } else if (action === 'Learn More') {
        // Open documentation about .puku folder
        vscode.env.openExternal(vscode.Uri.parse(
            'https://docs.puku.sh/indexing#puku-folder'
        ));
    }
}
```

### 5. Error Handling for Database Operations

Add try-catch to all database operations:

```typescript
private async _indexFile(file: vscode.Uri): Promise<'indexed' | 'cached' | 'skipped'> {
    try {
        // Check if .puku folder still exists before operations
        if (!await this._verifyPukuFolderExists()) {
            await this._handlePukuFolderDeletion();
            return 'skipped';
        }

        // ... existing indexing logic ...

        this._cache.storeFile(uri.toString(), contentHash, languageId, chunksWithEmbeddings);
        return 'indexed';
    } catch (error) {
        // Check if error is due to missing database
        if (this._isDatabaseNotFoundError(error)) {
            await this._handlePukuFolderDeletion();
            return 'skipped';
        }
        throw error;
    }
}

private _isDatabaseNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    return error.message.includes('ENOENT') ||
           error.message.includes('no such file or directory') ||
           error.message.includes('database') && error.message.includes('not found');
}

private async _verifyPukuFolderExists(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return false;
    }

    const pukuFolderUri = vscode.Uri.joinPath(workspaceFolder.uri, '.puku');
    try {
        await vscode.workspace.fs.stat(pukuFolderUri);
        return true;
    } catch {
        return false;
    }
}
```

## User Experience Flow

### Scenario 1: Folder Deleted During Indexing

```
User action: rm -rf .puku (while indexing 2,500/5,755 files)

System response:
1. Detect deletion via file watcher
2. Stop ongoing indexing immediately
3. Show notification: "The .puku folder was deleted. Indexed data lost."
4. Recreate .puku folder and empty database
5. Status changes: Indexing → Error → NotAvailable
6. User chooses: "Reindex Now" → starts fresh indexing from file 1
```

### Scenario 2: Folder Deleted While Idle

```
User action: git clean -fdx (cleans .puku folder)

System response:
1. Detect deletion via file watcher
2. Show notification: "The .puku folder was deleted. Reindex to restore semantic search."
3. Recreate .puku folder and empty database silently
4. Status changes: Ready → NotAvailable
5. Next search attempt: Shows "Index not available, please reindex"
```

### Scenario 3: Database File Deleted (Not Folder)

```
User action: rm .puku/puku-embeddings.db

System response:
1. Next database operation fails
2. Detect database-not-found error
3. Log warning: "Database file missing, recreating"
4. Recreate database file with empty schema
5. Continue with NotAvailable status
6. No notification (less severe, might be intentional)
```

## Edge Cases

### 1. Deletion During Database Write

```typescript
// SQLite handles this with WAL (Write-Ahead Logging)
// If database is deleted mid-write:
// - Current transaction fails
// - Catch error and trigger recreation
// - No data corruption in new database
```

### 2. Multiple Rapid Deletions

```typescript
// Debounce recreation to avoid rapid recreation cycles
private _recreationDebounce: NodeJS.Timeout | undefined;

private async _handlePukuFolderDeletion(): Promise<void> {
    if (this._recreationDebounce) {
        clearTimeout(this._recreationDebounce);
    }

    this._recreationDebounce = setTimeout(async () => {
        await this._recreatePukuFolder();
        await this._showDeletionRecoveryPrompt();
    }, 1000); // Wait 1 second before recreating
}
```

### 3. Deletion Followed by Immediate Re-Creation

```typescript
// Check if folder exists before showing warning
private async _showDeletionRecoveryPrompt(): Promise<void> {
    // Verify folder is still missing
    if (await this._verifyPukuFolderExists()) {
        console.log('[PukuIndexing] .puku folder restored externally, skipping prompt');
        await this._cache.initialize();
        return;
    }

    // ... show prompt ...
}
```

### 4. Read-Only File System

```typescript
private async _recreatePukuFolder(): Promise<void> {
    try {
        await vscode.workspace.fs.createDirectory(pukuFolderUri);
    } catch (error) {
        if (this._isReadOnlyError(error)) {
            vscode.window.showErrorMessage(
                'Cannot recreate .puku folder: File system is read-only. ' +
                'Semantic search will use in-memory mode.'
            );
            // Fall back to in-memory database
            this._cache = new PukuEmbeddingsCache(undefined, this._configService);
            await this._cache.initialize();
        }
    }
}
```

## Success Metrics

1. **Zero crashes** - No unhandled exceptions from folder deletion
2. **Recovery time < 5s** - Folder recreation completes within 5 seconds
3. **User awareness** - 100% of deletions show notification
4. **Auto-recovery rate** - >80% of users choose "Reindex Now"

## Implementation Plan

### Phase 1: Detection (Week 1)
- Add file system watcher for `.puku` folder
- Add error detection for database operations
- Log deletions with telemetry

### Phase 2: Recovery (Week 2)
- Implement folder recreation logic
- Add database reinitialization
- Handle edge cases (rapid deletions, read-only FS)

### Phase 3: User Experience (Week 3)
- Add user notifications
- Implement auto-reindex option
- Add documentation about `.puku` folder

### Phase 4: Testing (Week 4)
- Integration tests for deletion scenarios
- Manual testing on all platforms
- Performance testing for large workspaces

## Testing Scenarios

### Manual Testing

1. **Delete during indexing**
   ```bash
   # Start indexing large workspace
   # Delete .puku folder mid-indexing
   rm -rf .puku
   # Verify: error handling, notification, recreation
   ```

2. **Delete while idle**
   ```bash
   # Complete indexing
   # Delete .puku folder
   rm -rf .puku
   # Verify: search shows "not available", can reindex
   ```

3. **Git clean**
   ```bash
   git clean -fdx
   # Verify: .puku recreated, notification shown
   ```

4. **Database file only**
   ```bash
   rm .puku/puku-embeddings.db
   # Verify: graceful recreation without notification
   ```

### Automated Testing

```typescript
suite('PukuIndexing - Folder Deletion', () => {
    test('handles .puku folder deletion during indexing', async () => {
        const service = new PukuIndexingService(...);
        await service.initialize();

        // Start indexing
        service.startIndexing();

        // Simulate folder deletion
        await deletePukuFolder();

        // Verify service recovers
        assert.equal(service.status, PukuIndexingStatus.NotAvailable);
        assert.ok(await pukuFolderExists());
    });

    test('recreates database on missing file error', async () => {
        const service = new PukuIndexingService(...);
        await service.initialize();

        // Delete database file
        await deleteDatabaseFile();

        // Trigger database operation
        await service.search('test query');

        // Verify database recreated
        assert.ok(await databaseFileExists());
    });
});
```

## Alternative Approaches Considered

### 1. Periodic Health Checks
**Approach**: Poll `.puku` folder existence every 10 seconds
**Rejected**: Resource intensive, delayed detection (up to 10s)

### 2. Lock File
**Approach**: Create lock file to prevent deletion
**Rejected**: Cannot prevent user/system deletions, adds complexity

### 3. Backup Database
**Approach**: Periodically backup database to recover data
**Rejected**: Large storage overhead (duplicates 100MB+ database)

### 4. No Recovery
**Approach**: Show error, require manual window reload
**Rejected**: Poor user experience, loses in-progress work

## Documentation Updates

1. **README.md** - Add section explaining `.puku` folder
2. **FAQ.md** - Add "What if I delete .puku folder?"
3. **Troubleshooting.md** - Add deletion recovery guide
4. **Extension Settings** - Add `puku.indexing.autoReindexOnDeletion` setting

## Related Issues

- #123 - Improve error handling for indexing failures
- #456 - Add telemetry for indexing errors
- #789 - Support in-memory fallback when disk unavailable

## Questions for Review

1. Should we auto-reindex without prompt? (Pro: seamless, Con: unexpected CPU usage)
2. Should we add `.puku` to `.gitignore` automatically?
3. Should we show notification for database file deletion (less severe)?
4. Should we support recovery from database corruption (separate issue)?
