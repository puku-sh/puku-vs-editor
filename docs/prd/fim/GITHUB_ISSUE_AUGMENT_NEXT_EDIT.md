# GitHub Issue: Implement "Augment Next Edit" Feature for FIM

**Copy-paste this into a new GitHub issue**

---

## 🎯 Summary

Implement **"Augment Next Edit"** - an interactive diff panel that shows users how they've modified AI-generated completions, with visual red/green diffs and the ability to review and manage edits before applying them.

**Impact:** Major UX enhancement, competitive differentiator, better control over AI suggestions

---

## 📸 Reference Screenshot

![Augment Next Edit Feature](screenshot-reference-augment-panel.png)

**Key UI Elements:**
1. **Edit Queue** (left panel): Shows pending edits with line numbers
2. **Diff View** (right panel): Red lines (original) vs Green lines (augmented)
3. **Action Buttons**: Accept (✓), Reject (✕), Navigate (↓←)

---

## 📊 Problem

### Current Limitations

Users who modify AI-generated completions have:
- ❌ **No visibility** into what changed from the AI suggestion
- ❌ **No review process** to inspect edits before applying
- ❌ **No history** of what was AI-generated vs user-added
- ❌ **No selective control** - must accept all edits together

### Example Scenario

```go
// AI generates:
"github.com/labstack/echo/v4"

// User types and adds comment:
"github.com/labstack/echo/v4" // import echo framework

// Problems:
// ❌ Can't see what was added vs what was AI-suggested
// ❌ No way to review the modification
// ❌ No option to reject just the comment if desired
```

---

## 💡 Proposed Solution

### Feature Overview

**Augment Next Edit** provides a visual diff panel that:
1. **Tracks edits** automatically when user modifies completions
2. **Shows diffs** with red (original) and green (modified) highlighting
3. **Queues edits** for review with line numbers and descriptions
4. **Allows selective action** - accept or reject individual edits

### Visual Design

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

---

## 🏗️ Technical Implementation

### Architecture

```typescript
// 1. Edit Tracker
class EditTracker {
  trackEdit(original: string, augmented: string, line: number): void;
  getAllPendingEdits(): Edit[];
  acceptEdit(id: string): void;
  rejectEdit(id: string): void;
}

// 2. Diff Calculator
class DiffCalculator {
  calculateDiff(original: string, modified: string): Diff;
  // Returns: { removed, added, prefix, suffix }
}

// 3. Augment Panel UI
class AugmentPanel {
  show(edit: Edit): void;
  // Display webview with red/green diff
}
```

### Data Flow

```
User Types
    ↓
Edit Interpolation Detects Augmentation
    ↓
EditTracker.trackEdit(original, augmented, lineNum)
    ↓
DiffCalculator.calculateDiff(original, augmented)
    ↓
AugmentPanel.show(edit)
    ↓
User Clicks [Accept] or [Reject]
    ↓
Edit Applied/Discarded
```

---

## 📝 Implementation Plan

### Phase 1: Edit Tracking (2 days)

**Goal:** Automatically detect and track user modifications to completions

**Tasks:**
- [ ] Create `helpers/editTracker.ts` with Edit interface
- [ ] Implement `trackEdit()` method
- [ ] Store edit queue in memory
- [ ] Generate edit descriptions automatically

**Code Example:**
```typescript
// In pukuInlineCompletionProvider.ts
if (userTypedBeyondCompletion) {
  const original = this.lastCompletion;
  const augmented = document.lineAt(position.line).text;

  this.editTracker.trackEdit(original, augmented, position.line);
}
```

### Phase 2: Diff Calculation (1 day)

**Goal:** Calculate visual diffs for display

**Tasks:**
- [ ] Create `helpers/diffCalculator.ts`
- [ ] Implement common prefix/suffix algorithm
- [ ] Format output for red/green display
- [ ] Handle multi-line diffs

**Algorithm:**
```typescript
function calculateDiff(original: string, modified: string): Diff {
  const prefix = findCommonPrefix(original, modified);
  const suffix = findCommonSuffix(original, modified);

  return {
    removed: original.slice(prefix.length, original.length - suffix.length),
    added: modified.slice(prefix.length, modified.length - suffix.length),
    prefix,
    suffix
  };
}
```

### Phase 3: Augment Panel UI (2-3 days)

**Goal:** Create interactive webview panel for reviewing edits

**Tasks:**
- [ ] Create VS Code webview panel
- [ ] Design HTML template with diff display
- [ ] Style CSS for red/green highlighting
- [ ] Implement action buttons (Accept/Reject/Navigate)
- [ ] Add keyboard shortcuts (Enter=accept, Esc=reject)
- [ ] Wire up communication between panel and extension

**Files:**
- `augmentPanel/augmentPanelView.ts` (~200 lines)
- `augmentPanel/augmentPanel.html` (~100 lines)
- `augmentPanel/augmentPanel.css` (~50 lines)

### Phase 4: Edit Queue UI (1 day)

**Goal:** Display list of pending edits

**Tasks:**
- [ ] Create tree view for edit queue
- [ ] Show line numbers and descriptions
- [ ] Allow navigation between edits
- [ ] Highlight current edit

**Files:**
- `augmentPanel/editQueueView.ts` (~100 lines)

---

## ✅ Acceptance Criteria

### Must Have

- [ ] Visual diff panel showing red (original) and green (modified) lines
- [ ] Edit queue showing all pending edits with line numbers
- [ ] Accept button applies edit to document
- [ ] Reject button discards edit
- [ ] Real-time updates as user types modifications
- [ ] Keyboard shortcuts: Enter (accept), Esc (reject), Arrow keys (navigate)
- [ ] Panel automatically appears when user modifies completion

### Nice to Have

- [ ] Edit history showing accepted/rejected edits
- [ ] Undo/redo for accepted edits
- [ ] Statistics (acceptance rate, common patterns)
- [ ] Export edit summary for analysis

---

## 🧪 Testing Plan

### Test 1: Simple Comment Addition

```
1. Generate completion: "github.com/labstack/echo/v4"
2. User types: "github.com/labstack/echo/v4" // comment
3. EXPECT: Panel shows with diff:
   - Red: "github.com/labstack/echo/v4"
   - Green: "github.com/labstack/echo/v4" // comment
4. Click [Accept]
5. EXPECT: Edit applied, panel closes
```

### Test 2: Multiple Edits

```
1. Generate 3 completions on lines 5, 10, 15
2. User modifies all 3 with different comments
3. EXPECT: Edit queue shows 3 pending edits
4. Navigate to each edit using arrow keys
5. Accept first, reject second, accept third
6. EXPECT: Lines 5 and 15 have edits, line 10 unchanged
```

### Test 3: Real-time Updates

```
1. Generate completion
2. User starts typing modification
3. EXPECT: Panel updates dynamically as user types
4. EXPECT: Diff recalculates on each keystroke (debounced 200ms)
```

### Test 4: Keyboard Shortcuts

```
1. Panel open with edit
2. Press Enter → Edit accepted
3. Next edit appears
4. Press Esc → Edit rejected
5. Press ↓ → Navigate to next edit
6. Press ← → Navigate to previous edit
```

---

## 📈 Expected Impact

### Metrics

**User Experience:**
- Clear visibility into modifications (red/green diff)
- Review process before applying (accept/reject buttons)
- Selective control over edits (individual accept/reject)

**Success Criteria:**
- 80%+ of users engage with augment panel
- Average review time < 5 seconds per edit
- 90%+ of edits accepted (indicates useful feature)

### Business Value

**Competitive Advantage:**
- Unique feature not found in GitHub Copilot or Cursor
- Better control over AI suggestions
- Improved trust in AI completions

---

## 🚧 Dependencies

### Required (Must implement first)

1. **Position Validation** (#19)
   - Track where completions were generated
   - **Status:** ✅ Utility class created

2. **Edit Interpolation** (#21)
   - Detect when user modifies completion
   - **Status:** ⏳ PRD exists, not implemented
   - **Blocker:** Must implement this first

### Optional (Improves experience)

1. **Refresh Gating** (#20)
   - Reduces API calls
   - **Status:** ✅ Utility class created

2. **Request Abortion** (#22)
   - Cleaner UX
   - **Status:** ⏳ PRD exists

---

## 📝 Implementation Estimate

| Phase | Component | LOC | Time |
|-------|-----------|-----|------|
| Phase 1 | Edit Tracker | ~150 | 2 days |
| Phase 2 | Diff Calculator | ~100 | 1 day |
| Phase 3 | Augment Panel UI | ~350 | 2-3 days |
| Phase 4 | Edit Queue UI | ~100 | 1 day |
| Testing | All components | - | 1 day |
| **Total** | **~700 lines** | **7-8 days** |

---

## 🎨 UI Mockup Details

### Panel Layout

```
┌─────────────────────┬─────────────────────────────────────┐
│  Edit Queue         │  Diff View                          │
│                     │                                     │
│  ◎ file.go          │  ✓ Accept  ✕ Reject  ← → Navigate │
│   ├ 1:Add: comment  │                                     │
│   └ 6:Add: import   │  - Original line (red background)  │
│                     │  + Modified line (green background)│
│                     │                                     │
│  [Select edit]      │  [Shows selected edit's diff]      │
└─────────────────────┴─────────────────────────────────────┘
```

### Color Scheme

- **Red background** (`#ff000020`): Removed/original text
- **Green background** (`#00ff0020`): Added/modified text
- **Gray text**: Unchanged prefix/suffix
- **Bold**: Changed portions within line

---

## 🔗 Related Issues

- #19: Position Validation (prerequisite) ✅
- #20: Refresh Gating (optional enhancement) ✅
- #21: Edit Interpolation (prerequisite) ⏳
- #22: Request Abortion (optional enhancement) ⏳

---

## 📚 Documentation

**Detailed PRD:** `docs/prd/fim/augment-next-edit.md`

**Related PRDs:**
- `docs/prd/fim/edit-interpolation.md` - Prerequisite feature
- `docs/prd/fim/position-validation.md` - Foundation feature
- `docs/prd/fim/zed-analysis.md` - Diff rendering inspiration

---

## 🎯 Labels

- `enhancement`
- `ux-improvement`
- `fim`
- `priority:high`
- `effort:1-2-weeks`
- `competitive-advantage`

---

## 🏁 Next Steps

1. **Review PRD** - `docs/prd/fim/augment-next-edit.md`
2. **Implement Edit Interpolation** (#21) - Required dependency
3. **Prototype UI** - 1-2 day spike for panel design
4. **Phase 1 Implementation** - Edit Tracker (2 days)
5. **Phase 2-4** - Follow implementation plan above

---

**Expected delivery:** 7-8 days after dependencies complete
**Expected impact:** Major UX differentiator, improved AI trust
**Risk level:** MEDIUM (UI complexity, well-scoped)
**Priority:** HIGH (competitive advantage)
