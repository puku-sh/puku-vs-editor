# Manual Testing Guide: .puku Folder Deletion Recovery

This guide provides step-by-step instructions for manually testing the .puku folder deletion recovery system (Issues #149-152).

---

## Prerequisites

1. **Build the extension:**
   ```bash
   cd src/chat
   npm run compile
   ```

2. **Launch Puku Editor:**
   ```bash
   cd src/vscode
   ./scripts/code.sh --extensionDevelopmentPath=$(pwd)/../chat
   ```

3. **Open a test workspace** with some code files (TypeScript/JavaScript recommended)

---

## Test 1: Basic Deletion Detection and Recovery

**Goal:** Verify file system watcher detects deletion and recreates folder

### Steps:

1. **Open a workspace** in Puku Editor
2. **Start indexing:**
   - Open Command Palette (`Cmd+Shift+P`)
   - Run command: `Puku: Reindex Workspace`
   - Wait for indexing to complete (watch status bar)

3. **Verify .puku folder exists:**
   ```bash
   ls -la .puku/
   # Should show: puku-embeddings.db
   ```

4. **Delete the .puku folder while editor is running:**
   ```bash
   rm -rf .puku
   ```

### Expected Results:

✅ **Within 1-2 seconds:**
- Console log shows: `[PukuIndexing] ⚠️  .puku folder deleted`
- Console log shows: `[PukuIndexing] Creating .puku folder...`
- Console log shows: `[PukuIndexing] ✅ Folder and database recreated`

✅ **Notification appears:**
- Warning message: "⚠️ The .puku folder was deleted. All indexed data has been lost."
- Three buttons: "Reindex Now", "Reindex Later", "Learn More"

✅ **Folder recreated:**
```bash
ls -la .puku/
# Should show: puku-embeddings.db (empty, 0 files indexed)
```

---

## Test 2: Deletion During Active Indexing

**Goal:** Verify recovery works during indexing with progress tracking

### Steps:

1. **Open a large workspace** (100+ files)
2. **Start indexing:**
   - Command: `Puku: Reindex Workspace`

3. **While indexing is in progress (50% complete):**
   ```bash
   rm -rf .puku
   ```

### Expected Results:

✅ **Indexing stops immediately**

✅ **Notification shows progress lost:**
- Message includes: "while indexing. Progress lost: X of Y files"
- Example: "Progress lost: 250 of 500 files"

✅ **Folder recreated with empty database**

✅ **If you click "Reindex Now":**
- Indexing restarts from 0
- Status bar shows progress

---

## Test 3: Database Error Handling (ENOENT Detection)

**Goal:** Verify database operations detect missing database and trigger recovery

### Steps:

1. **Complete indexing** in a workspace
2. **Verify search works:**
   - Command: `Puku: Semantic Search`
   - Enter query: "function"
   - Should return results

3. **Delete only the database file (not folder):**
   ```bash
   rm .puku/puku-embeddings.db
   ```

4. **Try semantic search again:**
   - Command: `Puku: Semantic Search`
   - Enter query: "function"

### Expected Results:

✅ **No crash** - Extension handles gracefully

✅ **Console shows:**
- `[PukuIndexing] Database missing during search`
- Returns empty results

✅ **On next indexing attempt:**
- New database file is created
- Indexing proceeds normally

---

## Test 4: Read-Only File System Fallback

**Goal:** Verify fallback to in-memory database on read-only FS

### Steps (macOS/Linux):

1. **Create a read-only workspace:**
   ```bash
   mkdir /tmp/readonly-test
   cd /tmp/readonly-test
   echo "console.log('test');" > test.js
   chmod -R 555 /tmp/readonly-test  # Make read-only
   ```

2. **Open the read-only workspace** in Puku Editor

3. **Try to start indexing:**
   - Command: `Puku: Reindex Workspace`

### Expected Results:

✅ **Notification appears:**
- "Puku indexing using in-memory mode (read-only file system)"

✅ **Console shows:**
- `[PukuIndexing] Read-only FS, using in-memory DB`

✅ **Indexing works** but data is not persisted to disk

✅ **Search works** using in-memory data

---

## Test 5: User Notification Settings

**Goal:** Verify notification can be disabled

### Steps:

1. **Open Settings:**
   - `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)

2. **Search for:** `puku.indexing.notifyOnFolderDeletion`

3. **Disable notifications:**
   - Uncheck the setting

4. **Delete .puku folder:**
   ```bash
   rm -rf .puku
   ```

### Expected Results:

✅ **No notification appears** (silent recovery)

✅ **Console still shows logs:**
- `[PukuIndexing] Notifications disabled, skipping`

✅ **Folder is still recreated** automatically

---

## Test 6: Rapid Repeated Deletions

**Goal:** Verify debouncing prevents multiple recovery attempts

### Steps:

1. **Run a script that deletes folder repeatedly:**
   ```bash
   # In terminal, run this loop:
   for i in {1..5}; do
     rm -rf .puku
     sleep 0.5
   done
   ```

### Expected Results:

✅ **Only one recovery** is triggered (not 5)

✅ **Console shows:**
- `[PukuIndexing] Already recreating, skipping...` (on subsequent deletions)

---

## Test 7: "Learn More" Button

**Goal:** Verify documentation link opens

### Steps:

1. **Delete .puku folder:**
   ```bash
   rm -rf .puku
   ```

2. **Click "Learn More"** in the notification

### Expected Results:

✅ **Browser opens to:**
- URL: `https://docs.puku.sh/indexing/puku-folder`

✅ **Notification dismisses**

---

## Test 8: "Reindex Now" Button

**Goal:** Verify immediate reindexing works

### Steps:

1. **Delete .puku folder:**
   ```bash
   rm -rf .puku
   ```

2. **Click "Reindex Now"** in the notification

### Expected Results:

✅ **Indexing starts immediately**

✅ **Status bar shows progress:**
- "Indexing: 10/100 files"

✅ **Notification dismisses**

---

## Test 9: Window Reload Recovery

**Goal:** Verify state persists across window reloads

### Steps:

1. **Complete indexing** (e.g., 100 files)

2. **Reload VS Code window:**
   - Command: `Developer: Reload Window`

3. **Verify indexed data persists:**
   - Command: `Puku: Semantic Search`
   - Search should work with cached data

4. **Delete folder and reload:**
   ```bash
   rm -rf .puku
   ```

5. **Reload window again:**
   - Command: `Developer: Reload Window`

### Expected Results:

✅ **After first reload:** Search works (data persisted)

✅ **After deletion + reload:**
- Folder recreated on startup
- Empty database (needs reindexing)

---

## Test 10: Multi-Root Workspace

**Goal:** Verify independent handling of multiple workspace folders

### Steps:

1. **Open multi-root workspace:**
   - File > Add Folder to Workspace
   - Add 2 different folders

2. **Each folder should have its own .puku:**
   ```bash
   ls workspace1/.puku/  # Should exist
   ls workspace2/.puku/  # Should exist
   ```

3. **Delete only one:**
   ```bash
   rm -rf workspace1/.puku
   ```

### Expected Results:

✅ **Only workspace1 triggers recovery**

✅ **workspace2 continues working** normally

---

## Debugging Tips

### View Console Logs

1. **Open Developer Tools:**
   - `Cmd+Shift+I` (macOS) or `F12` (Windows/Linux)

2. **Look for logs starting with:**
   - `[PukuIndexing]`

### Check Database State

```bash
# View database schema
sqlite3 .puku/puku-embeddings.db ".schema"

# Count indexed files
sqlite3 .puku/puku-embeddings.db "SELECT COUNT(*) FROM files;"

# Count chunks
sqlite3 .puku/puku-embeddings.db "SELECT COUNT(*) FROM chunks;"
```

### Force Clean State

```bash
# Delete all indexing data
rm -rf .puku/

# Restart editor
# Folder will be recreated automatically
```

---

## Performance Benchmarks

Expected timings for recovery:

| Operation | Target | How to Measure |
|-----------|--------|----------------|
| Detect deletion (watcher) | <1s | Check console timestamp |
| Close database | <100ms | Included in recovery |
| Recreate folder | <100ms | Check filesystem |
| Initialize new DB | <500ms | Check console logs |
| Show notification | <100ms | Visual check |
| **Total recovery time** | **<2s** | From deletion to notification |

---

## Common Issues

### Issue: Notification doesn't appear
**Solution:** Check if `puku.indexing.notifyOnFolderDeletion` is enabled in settings

### Issue: Folder not recreated
**Solution:** Check console for errors, verify workspace folder exists

### Issue: Permission errors on macOS
**Solution:** Grant Full Disk Access to Puku Editor in System Preferences > Privacy

### Issue: Tests fail on Windows
**Solution:** Use PowerShell or Git Bash for `rm -rf` commands

---

## Success Criteria

All tests should show:

✅ No crashes or unhandled exceptions
✅ Folder recreated within 2 seconds
✅ User notified with clear actions
✅ Database operations handle errors gracefully
✅ Read-only FS falls back to in-memory
✅ Settings respected
✅ Recovery works on all platforms

---

## Next Steps

After manual testing:

1. **Report any bugs** as GitHub issues
2. **Update this guide** with any missing scenarios
3. **Run automated tests:** `npm test -- pukuIndexingService.deletion`
4. **Test on all platforms:** Windows, macOS, Linux

---

## Questions?

- **Implementation:** See `src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts`
- **Tests:** See `src/chat/src/extension/pukuIndexing/test/node/pukuIndexingService.deletion.spec.ts`
- **Issues:** #149, #150, #151, #152, #153
