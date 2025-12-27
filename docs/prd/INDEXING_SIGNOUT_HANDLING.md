# PRD: Indexing Sign-Out Handling

**Status:** Draft
**Priority:** Medium
**Effort:** 2-3 hours
**Related Issues:** TBD

---

## Problem Statement

When a user signs out during active indexing, the indexing process **does not stop**. This causes:

1. **Wasted resources** - Continues processing files despite no authentication
2. **Confusing UX** - Status bar shows "Indexing..." but no progress is made
3. **Silent failures** - API calls fail without user notification
4. **Incomplete indexing** - Files are processed but not stored (no embeddings)

### Current Behavior

**What happens today:**

```
User: [Signs out during indexing]
   ↓
Auth Status: Authenticated → Unauthenticated
   ↓
Service: Sets status to "Disabled"
   ↓
Indexing: CONTINUES RUNNING ❌
   ↓
For each file:
   - Summary generation: Returns empty strings (fallback)
   - Embedding computation: Returns null (no token)
   - Storage: Skips (no valid embeddings)
   ↓
Result:
   - Progress bar keeps moving
   - Files are "indexed" but not stored
   - User thinks indexing is working
```

**Code Location:**

`src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts:191-200`

```typescript
this._register(this._authService.onDidChangeAuthStatus((status) => {
    if (status === PukuAuthStatus.Authenticated) {
        this.initialize();
    } else if (status === PukuAuthStatus.Unauthenticated) {
        this._setStatus(PukuIndexingStatus.Disabled);  // ❌ Doesn't stop indexing!
    }
}));
```

---

## Expected Behavior

**What should happen:**

```
User: [Signs out during indexing]
   ↓
Auth Status: Authenticated → Unauthenticated
   ↓
Service:
   1. Stop indexing immediately ✅
   2. Set status to "Disabled" ✅
   3. Notify user (optional) ✅
   ↓
Indexing: STOPS
   ↓
Result:
   - Progress bar stops
   - Files already indexed are saved
   - Clear user feedback
```

---

## Proposed Solution

### 1. Stop Indexing on Sign-Out

**Change:** Update auth status listener to stop indexing

**Location:** `pukuIndexingService.ts:191-200`

**Code:**

```typescript
this._register(this._authService.onDidChangeAuthStatus((status) => {
    if (status === PukuAuthStatus.Authenticated) {
        console.log('[PukuIndexing] Auth ready, starting indexing initialization');
        this.initialize().catch(err => {
            console.error('[PukuIndexing] Failed to initialize after auth ready:', err);
        });
    } else if (status === PukuAuthStatus.Unauthenticated) {
        // NEW: Stop indexing if in progress
        if (this._isIndexing) {
            this.stopIndexing();
            console.log('[PukuIndexing] Stopped indexing due to sign-out');
        }
        this._setStatus(PukuIndexingStatus.Disabled);
    }
}));
```

**Benefits:**
- ✅ Stops immediately (no wasted processing)
- ✅ Respects user action
- ✅ Simple implementation (2 lines)

---

### 2. User Notification (Optional)

**Option A: Silent Stop (Minimal)**

- Stop indexing without notification
- User sees status bar change from "Indexing..." to nothing
- Simple and non-intrusive

**Option B: Informative Notification (Recommended)**

Show a notification explaining what happened:

```typescript
} else if (status === PukuAuthStatus.Unauthenticated) {
    if (this._isIndexing) {
        const filesIndexed = this._indexedFiles.size;
        const totalFiles = this.status.totalFiles;

        this.stopIndexing();

        vscode.window.showInformationMessage(
            `Indexing stopped (${filesIndexed} of ${totalFiles} files indexed). Sign in to resume indexing.`,
            'Sign In',
            'Dismiss'
        ).then(action => {
            if (action === 'Sign In') {
                vscode.commands.executeCommand('puku.signIn');
            }
        });
    }
    this._setStatus(PukuIndexingStatus.Disabled);
}
```

**Benefits:**
- ✅ User understands why indexing stopped
- ✅ Shows progress achieved
- ✅ Offers quick action to resume
- ✅ Educates user about auth requirement

**Recommendation:** Implement Option B (informative notification)

---

### 3. Resume on Sign-In (Already Implemented)

The existing code already handles sign-in correctly:

```typescript
if (status === PukuAuthStatus.Authenticated) {
    this.initialize();  // ✅ Already restarts indexing
}
```

No changes needed.

---

## User Experience Flow

### Scenario 1: Sign-out during indexing (small workspace)

```
1. User starts indexing (100 files)
2. Progress: 40/100 files indexed
3. User signs out
4. Notification appears: "Indexing stopped (40 of 100 files indexed).
   Sign in to resume indexing."
5. Status changes to "Disabled"
6. User clicks "Sign In"
7. Indexing resumes from file 41
```

### Scenario 2: Sign-out during indexing (large workspace)

```
1. User starts indexing (10,000 files)
2. Progress: 2,500/10,000 files indexed
3. User signs out
4. Notification: "Indexing stopped (2,500 of 10,000 files indexed).
   Sign in to resume indexing."
5. User dismisses notification
6. Later, user signs back in
7. Indexing auto-resumes (only 7,500 remaining files)
```

### Scenario 3: Sign-out while idle

```
1. Indexing is complete (100/100 files)
2. User signs out
3. No notification (not indexing)
4. Status changes to "Disabled"
5. Search functionality disabled
```

---

## Edge Cases

### Edge Case 1: Sign-out immediately after starting

```
User: Start indexing → Sign out (1 second later)
Expected:
  - Stop after indexing 0-1 files
  - Notification shows "0 of 100 files indexed"
  - Resume from file 1 on sign-in
```

### Edge Case 2: Sign-out during database write

```
User: Signs out while file is being stored
Expected:
  - Current file write completes (SQLite transaction)
  - Next file is skipped
  - Clean state (no corruption)
```

### Edge Case 3: Rapid sign-out/sign-in

```
User: Sign out → Sign in immediately
Expected:
  - Stop indexing cleanly
  - Wait for status change
  - Resume indexing on authenticated
  - No race conditions
```

### Edge Case 4: Sign-out + window reload

```
User: Sign out → Reload window
Expected:
  - On reload, status is "Disabled"
  - No auto-indexing
  - Requires sign-in first
```

---

## Testing Strategy

### Unit Tests

**File:** `src/extension/pukuIndexing/test/node/pukuIndexingService.signout.spec.ts`

```typescript
suite('PukuIndexing - Sign-Out Handling', () => {
    test('stops indexing on sign-out', async () => {
        const service = new PukuIndexingService(...);
        await service.initialize();

        // Start indexing
        await service.startIndexing();
        assert.ok(service._isIndexing);

        // Simulate sign-out
        service._authService.setStatus(PukuAuthStatus.Unauthenticated);

        // Verify indexing stopped
        assert.ok(!service._isIndexing);
        assert.strictEqual(service.status.status, PukuIndexingStatus.Disabled);
    });

    test('does not stop indexing if not running', () => {
        const service = new PukuIndexingService(...);

        // Sign out without indexing
        service._authService.setStatus(PukuAuthStatus.Unauthenticated);

        // Should not throw
        assert.strictEqual(service.status.status, PukuIndexingStatus.Disabled);
    });

    test('resumes indexing on sign-in', async () => {
        const service = new PukuIndexingService(...);

        // Sign out
        service._authService.setStatus(PukuAuthStatus.Unauthenticated);

        // Sign in
        service._authService.setStatus(PukuAuthStatus.Authenticated);
        await delay(100);

        // Should auto-start indexing
        assert.ok(service._isIndexing || service.status.status === PukuIndexingStatus.Indexing);
    });
});
```

### Manual Testing

See: `MANUAL_TESTING_DELETION_RECOVERY.md` - Test 11

**Steps:**

1. Open a workspace with 100+ files
2. Start indexing: `Puku: Reindex Workspace`
3. Wait until 50% progress
4. Sign out: `Puku: Sign Out`
5. **Expected:**
   - Indexing stops immediately
   - Notification shows progress
   - Status bar clears
6. Sign in: `Puku: Sign In`
7. **Expected:**
   - Indexing auto-resumes
   - Progress continues from where it stopped

---

## Performance Considerations

### Impact Analysis

**Before fix:**
- ❌ Processes all files even without auth
- ❌ Wastes CPU/memory
- ❌ Makes unnecessary failed API calls

**After fix:**
- ✅ Stops within 1 event loop tick (<10ms)
- ✅ No wasted processing
- ✅ Clean state

**Performance metrics:**

| Metric | Before | After |
|--------|--------|-------|
| Stop time | N/A (doesn't stop) | <10ms |
| Wasted API calls | 100% of remaining files | 0 |
| CPU usage post-signout | High (continues) | Low (stopped) |

---

## Implementation Checklist

### Phase 1: Core Fix (Required)

- [ ] Update auth status listener to stop indexing
- [ ] Add `stopIndexing()` call on `Unauthenticated` status
- [ ] Add console logging for debugging
- [ ] Test basic stop functionality

### Phase 2: User Notification (Recommended)

- [ ] Add informative notification with progress
- [ ] Add "Sign In" action button
- [ ] Handle notification dismissal
- [ ] Test notification appearance

### Phase 3: Testing

- [ ] Write 3 unit tests (stop, no-op, resume)
- [ ] Add manual test to testing guide
- [ ] Test edge cases (rapid sign-out/in, etc.)
- [ ] Verify on all platforms

### Phase 4: Documentation

- [ ] Update CHANGELOG.md
- [ ] Update manual testing guide
- [ ] Update user documentation (if exists)

---

## Acceptance Criteria

**Must have:**

- ✅ Indexing stops immediately on sign-out
- ✅ Status changes to "Disabled"
- ✅ No crashes or errors
- ✅ Indexing resumes on sign-in

**Should have:**

- ✅ User notification with progress
- ✅ "Sign In" quick action
- ✅ Unit tests pass
- ✅ Manual testing complete

**Nice to have:**

- ✅ Debouncing for rapid sign-out/in
- ✅ Persisted progress across sessions
- ✅ User setting to disable notification

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition (stop while writing) | Medium | SQLite transactions handle this |
| Rapid sign-out/in | Low | Existing debouncing prevents issues |
| Notification spam | Low | Only show during active indexing |
| Lost progress | Low | Already indexed files are saved |

---

## Alternatives Considered

### Alternative 1: Continue indexing without auth

**Approach:** Keep indexing but skip API calls

**Pros:**
- Simpler implementation
- No UX interruption

**Cons:**
- ❌ Wastes resources
- ❌ Confusing progress bar
- ❌ Files not actually indexed

**Decision:** ❌ Rejected

---

### Alternative 2: Pause instead of stop

**Approach:** Pause indexing, resume on sign-in without restarting

**Pros:**
- Seamless resume
- No duplicate work

**Cons:**
- ❌ More complex state management
- ❌ Memory held during pause
- ❌ Not worth complexity for rare scenario

**Decision:** ❌ Rejected (use simple stop/restart)

---

### Alternative 3: Queue pending files

**Approach:** Queue remaining files, process on sign-in

**Pros:**
- Efficient resume
- No re-scanning

**Cons:**
- ❌ Added complexity
- ❌ Current restart mechanism already works

**Decision:** ❌ Rejected (current approach is sufficient)

---

## Related Work

### Related Issues

- Issue #149: File system watcher for .puku deletion
- Issue #150: Automatic folder recreation
- Issue #151: User notification for deletion
- Issue #152: Database error handling

### Similar Patterns

The sign-out handling follows the same pattern as folder deletion:

```typescript
// Deletion handling (Issue #151)
await this._showDeletionNotification(wasIndexing, filesIndexed, totalFiles);

// Sign-out handling (This PRD)
await this._showSignOutNotification(filesIndexed, totalFiles);
```

Both scenarios:
- Interrupt ongoing indexing
- Notify user with progress
- Offer recovery action

---

## Success Metrics

**How we measure success:**

1. **User feedback:** "Indexing stops when I sign out" (0 complaints)
2. **Telemetry:** Sign-out during indexing events (track frequency)
3. **Performance:** 0 wasted API calls after sign-out
4. **Support tickets:** 0 tickets about "indexing not stopping"

---

## Timeline

**Estimated effort:** 2-3 hours

- **Phase 1 (Core fix):** 30 minutes
- **Phase 2 (Notification):** 1 hour
- **Phase 3 (Testing):** 1 hour
- **Phase 4 (Documentation):** 30 minutes

**Target completion:** Next sprint

---

## Open Questions

1. **Should we show notification if only 1-2 files were indexed?**
   - Recommendation: Yes, always show (user needs to understand)

2. **Should notification be dismissible via setting?**
   - Recommendation: No (similar to deletion notification, always important)

3. **Should we log telemetry for sign-out during indexing?**
   - Recommendation: Yes (helps understand frequency)

---

## References

- Code: `src/chat/src/extension/pukuIndexing/node/pukuIndexingService.ts:191-200`
- Tests: `src/chat/src/extension/pukuIndexing/test/node/pukuIndexingService.deletion.spec.ts`
- Manual tests: `MANUAL_TESTING_DELETION_RECOVERY.md`
- Related PRD: `.puku` folder deletion recovery (Issues #149-152)
