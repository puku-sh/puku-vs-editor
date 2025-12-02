# PRD: Augment Next Edit for FIM Completions

> **Status:** 📋 **PLANNING PHASE - NOT YET IMPLEMENTED**
>
> This PRD describes the "Augment Next Edit" feature for Puku FIM completions.
> **This feature is NOT currently implemented.** Implementation timeline: 5-7 days
> **Prerequisites:** Position Validation (#19), Edit Interpolation (#21)

---

## 📋 Executive Summary

**Augment Next Edit** is an advanced FIM feature that provides a visual diff panel showing how users have modified AI-generated completions, allowing them to review and manage their edits before applying them.

**Key Features:**
- Side-by-side diff view (original completion vs user-augmented version)
- Multi-edit queue tracking with line numbers
- Interactive accept/reject for individual edits
- Real-time preview as user types

---

## 🎯 Problem Statement

### Current Behavior

When AI generates a completion and the user modifies it:
- No visual feedback showing what changed
- No way to review edits before applying
- No history of modifications
- No ability to accept/reject specific changes

**Example Scenario:**
```go
// AI suggests:
"github.com/labstack/echo/v4"

// User types and adds comment:
"github.com/labstack/echo/v4" // import echo framework

// Problem:
// ❌ Can't see diff between AI suggestion and user edit
// ❌ Can't review change before applying
// ❌ No record of what was modified
```

### User Pain Points

1. **Lack of Visibility** - Users don't know what they changed from the original
2. **No Review Process** - Can't inspect edits before committing
3. **No History** - Lost track of what was AI-generated vs user-added
4. **No Selective Application** - Must accept all edits together

---

## 💡 Proposed Solution

### Visual Design (From Screenshot)

```
┌─────────────────────────────────────────────────────────────┐
│  AUGMENT NEXT EDIT  │  1                                     │
├─────────────────────────────────────────────────────────────┤
│  ◎ fastapi-app/hello/main.go                                │
│    ├─ 1:Add: // write simple api in echo                    │
│    └─ 6:Add: // import echo framework                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓  Add: // import echo framework            ↓  ✕  ←        │
│                                                               │
│     - "github.com/labstack/echo/v4"                          │
│     + "github.com/labstack/echo/v4" // import echo framework │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Edit Queue Panel** (Left)
   - Shows list of pending edits
   - Format: `{lineNumber}:Add: {description}`
   - Clickable to navigate between edits

2. **Diff View Panel** (Right)
   - **Red line** (`-`): Original AI-generated completion
   - **Green line** (`+`): User-augmented version
   - **Action buttons**: Accept (✓), Reject (✕), Navigate (↓←)

---

## 🏗️ Technical Architecture

### Core Components

#### 1. Edit Tracker
```typescript
interface Edit {
  id: string;
  lineNumber: number;
  description: string;
  original: string;
  augmented: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

class EditTracker {
  private edits: Map<string, Edit> = new Map();

  trackEdit(original: string, augmented: string, line: number): void;
  getEdit(id: string): Edit | undefined;
  getAllPendingEdits(): Edit[];
  acceptEdit(id: string): void;
  rejectEdit(id: string): void;
}
```

#### 2. Diff Calculator
```typescript
class DiffCalculator {
  /**
   * Calculate character-level diff between two strings
   */
  calculateDiff(original: string, modified: string): Diff {
    const commonPrefix = this.findCommonPrefix(original, modified);
    const commonSuffix = this.findCommonSuffix(original, modified);

    return {
      removed: original.slice(commonPrefix.length, original.length - commonSuffix.length),
      added: modified.slice(commonPrefix.length, modified.length - commonSuffix.length),
      prefix: commonPrefix,
      suffix: commonSuffix
    };
  }

  private findCommonPrefix(a: string, b: string): string;
  private findCommonSuffix(a: string, b: string): string;
}
```

#### 3. Augment Panel UI
```typescript
class AugmentPanel {
  private panel: vscode.WebviewPanel;
  private editTracker: EditTracker;

  show(edit: Edit): void {
    // Display diff view with red/green highlighting
    const html = this.generateDiffHTML(edit);
    this.panel.webview.html = html;
  }

  private generateDiffHTML(edit: Edit): string {
    // Generate HTML with:
    // - Red line for original
    // - Green line for augmented
    // - Action buttons
  }
}
```

---

## 📊 Implementation Plan

### Phase 1: Edit Tracking (2 days)

**Goal:** Track when user modifies AI-generated completions

**Steps:**
1. Detect when user types text that augments completion
2. Store original + augmented versions
3. Generate edit description automatically
4. Maintain edit queue in memory

**Files to create:**
- `helpers/editTracker.ts` (~150 lines)

**Integration point:**
- In `pukuInlineCompletionProvider.ts`, after edit interpolation detects user typing

### Phase 2: Diff Calculation (1 day)

**Goal:** Calculate visual diffs between original and augmented text

**Steps:**
1. Implement diff algorithm (common prefix/suffix)
2. Format output for display (red/green highlighting)
3. Handle multi-line diffs

**Files to create:**
- `helpers/diffCalculator.ts` (~100 lines)

### Phase 3: Augment Panel UI (2-3 days)

**Goal:** Create interactive panel for reviewing edits

**Steps:**
1. Create VS Code webview panel
2. Design HTML/CSS for diff display
3. Implement action buttons (accept/reject)
4. Add keyboard shortcuts
5. Wire up communication between panel and extension

**Files to create:**
- `augmentPanel/augmentPanelView.ts` (~200 lines)
- `augmentPanel/augmentPanel.html` (~100 lines)
- `augmentPanel/augmentPanel.css` (~50 lines)

### Phase 4: Multi-Edit Queue UI (1 day)

**Goal:** Show list of pending edits

**Steps:**
1. Create tree view or list view for edit queue
2. Allow navigation between edits
3. Show edit status (pending/accepted/rejected)

**Files to create:**
- `augmentPanel/editQueueView.ts` (~100 lines)

---

## 🎨 User Experience Flow

### Scenario: User Augments Completion

```go
// Step 1: AI generates completion
Line 6: "github.com/labstack/echo/v4"
        ↓
        [User starts typing]

// Step 2: User adds comment
Line 6: "github.com/labstack/echo/v4" // import echo framework
        ↓
        [System detects augmentation]

// Step 3: Edit tracked automatically
Edit created:
  - lineNumber: 6
  - description: "Add: // import echo framework"
  - original: "github.com/labstack/echo/v4"
  - augmented: "github.com/labstack/echo/v4" // import echo framework

// Step 4: Panel shows diff
AUGMENT NEXT EDIT panel appears with:
  - Red line: "github.com/labstack/echo/v4"
  - Green line: "github.com/labstack/echo/v4" // import echo framework
  - Buttons: [Accept] [Reject] [Next]

// Step 5: User reviews and accepts
User clicks [Accept]
  → Edit applied to document
  → Removed from queue
  → Next edit shown (if any)
```

---

## 🧪 Testing Plan

### Unit Tests

```typescript
describe('DiffCalculator', () => {
  it('should find common prefix', () => {
    const diff = new DiffCalculator();
    const result = diff.calculateDiff(
      '"github.com/labstack/echo/v4"',
      '"github.com/labstack/echo/v4" // comment'
    );
    expect(result.prefix).toBe('"github.com/labstack/echo/v4"');
    expect(result.added).toBe(' // comment');
  });
});

describe('EditTracker', () => {
  it('should track edits', () => {
    const tracker = new EditTracker();
    tracker.trackEdit('original', 'modified', 10);
    expect(tracker.getAllPendingEdits()).toHaveLength(1);
  });
});
```

### Integration Tests

**Test 1: Simple Comment Addition**
```
1. Generate completion: `"echo/v4"`
2. User types: `"echo/v4" // comment`
3. Verify: Edit tracked with correct diff
4. Verify: Panel shows red/green diff
```

**Test 2: Multiple Edits**
```
1. Generate 3 completions on different lines
2. User augments all 3
3. Verify: All 3 edits in queue
4. Verify: Can navigate between edits
5. Accept first, reject second, accept third
6. Verify: Correct edits applied
```

**Test 3: Real-time Updates**
```
1. Generate completion
2. User starts typing augmentation
3. Verify: Panel updates in real-time as user types
4. Verify: Diff recalculates dynamically
```

---

## 📈 Expected Impact

### User Experience

**Before:**
- No visibility into what was modified
- No review process
- Manually track changes

**After:**
- Clear visual diff (red = original, green = modified)
- Review before applying
- Selective accept/reject
- Edit history for session

### Metrics

**Success criteria:**
- 80%+ of users use augment panel when modifying completions
- Average review time < 5 seconds per edit
- 90%+ of edits are accepted (indicates useful suggestions)

---

## 🚧 Technical Challenges

### Challenge 1: Real-time Diff Calculation

**Problem:** Calculating diff on every keystroke might be expensive

**Solution:**
- Debounce diff calculation (200ms)
- Cache previous diff results
- Only recalculate if text changed significantly

### Challenge 2: Multi-line Diffs

**Problem:** Completions can span multiple lines with complex formatting

**Solution:**
- Use line-based diffing for multi-line completions
- Highlight only changed portions within lines
- Handle indentation changes gracefully

### Challenge 3: Panel State Management

**Problem:** Keeping panel in sync with editor state

**Solution:**
- Event-driven architecture
- Panel subscribes to document change events
- Update panel immediately when relevant edits occur

---

## 🔗 Dependencies

### Required Features (Must implement first)

1. **Position Validation** (#19)
   - Needed to track where completions were generated
   - Status: Utility class created ✅

2. **Edit Interpolation** (#21)
   - Needed to detect when user modifies completion
   - Status: PRD exists, not implemented

### Optional Enhancements

1. **Refresh Gating** (#20)
   - Improves performance, but not required
   - Status: Utility class created ✅

2. **Request Abortion** (#22)
   - Cleaner UX, but not required
   - Status: PRD exists

---

## 📝 Implementation Estimate

| Phase | Component | Lines of Code | Time |
|-------|-----------|---------------|------|
| Phase 1 | Edit Tracker | ~150 | 2 days |
| Phase 2 | Diff Calculator | ~100 | 1 day |
| Phase 3 | Augment Panel UI | ~350 | 2-3 days |
| Phase 4 | Edit Queue UI | ~100 | 1 day |
| **Total** | **~700 lines** | **6-7 days** |

**Additional time:**
- Testing: 1 day
- Documentation: 0.5 days
- **Grand total: 7-8 days**

---

## 🎯 Success Criteria

### Must Have

- [ ] Visual diff panel showing red/green changes
- [ ] Edit queue showing all pending edits
- [ ] Accept/reject buttons working
- [ ] Real-time updates as user types
- [ ] Keyboard shortcuts for navigation

### Nice to Have

- [ ] Edit history (show accepted/rejected edits)
- [ ] Undo/redo for accepted edits
- [ ] Export edit summary
- [ ] Statistics (acceptance rate, most common augmentations)

---

## 🔄 Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Smart Edit Suggestions**
   - AI learns common augmentation patterns
   - Suggests similar edits for future completions

2. **Collaborative Editing**
   - Share edit patterns with team
   - Learn from teammates' augmentations

3. **Edit Templates**
   - Save common augmentation patterns
   - Apply templates to new completions

---

## 📚 Related Documentation

- **Edit Interpolation PRD:** `docs/prd/fim/edit-interpolation.md`
- **Position Validation PRD:** `docs/prd/fim/position-validation.md`
- **Zed Analysis:** `docs/prd/fim/zed-analysis.md` (diff-based rendering inspiration)

---

## 🏁 Next Steps

1. **Review this PRD** with team
2. **Create GitHub issue** (use `GITHUB_ISSUE_AUGMENT_NEXT_EDIT.md`)
3. **Implement dependencies** (Position Validation, Edit Interpolation)
4. **Prototype UI** (1-2 day spike)
5. **Full implementation** (follow phase plan above)

---

**Last Updated:** 2025-12-02
**Status:** Planning Phase
**Priority:** HIGH (major UX differentiator)
**Risk:** MEDIUM (UI complexity, but well-scoped)
