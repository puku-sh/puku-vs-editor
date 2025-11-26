# Phase 5: Remove Copilot Branding - Step by Step Plan

## Overview
Break down the rebranding into small, testable steps. Each step should compile and be testable before moving to the next.

## Progress Tracker

| Step | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | toolNames.ts: `copilot_` → `puku_` | ✅ Done | - |
| 2 | package.json: tool `name` fields | 🔄 In Progress | - |
| 3 | Test compilation & activation | ⏳ Pending | - |
| 4 | Commit & push Step 1-3 | ⏳ Pending | - |
| 5 | package.json: command IDs `github.copilot.*` → `puku.*` | ⏳ Pending | - |
| 6 | Test compilation & activation | ⏳ Pending | - |
| 7 | Commit & push Step 5-6 | ⏳ Pending | - |
| 8 | Source files: update command references | ⏳ Pending | - |
| 9 | Test compilation & activation | ⏳ Pending | - |
| 10 | Commit & push Step 8-9 | ⏳ Pending | - |
| 11 | package.nls.json: localization strings | ⏳ Pending | - |
| 12 | Context keys & when clauses | ⏳ Pending | - |
| 13 | Final test & release | ⏳ Pending | - |

---

## Step 1: toolNames.ts Constants ✅ DONE

**File**: `src/extension/tools/common/toolNames.ts`

**Changes**:
- `ContributedToolName` enum: `copilot_*` → `puku_*` (40 tools)
- `ToolName.GetNotebookSummary`: `copilot_getNotebookSummary` → `puku_getNotebookSummary`

**Test**: `npm run compile` ✅ Passed

---

## Step 2: package.json Tool Definitions 🔄 IN PROGRESS

**File**: `package.json`

**Section**: `contributes.languageModelTools`

**Changes needed**:
```json
// FROM:
{ "name": "copilot_searchCodebase", ... }
// TO:
{ "name": "puku_searchCodebase", ... }
```

**Count**: ~40 tool definitions

**Test**: `npm run compile` then load extension

---

## Step 3: Test Compilation & Activation

**Commands**:
```bash
npm run compile
# Then in VS Code: F5 to launch extension host
# Check: Tools appear in chat, commands work
```

---

## Step 4: Commit & Push Steps 1-3

```bash
git add src/extension/tools/common/toolNames.ts package.json
git commit -m "refactor: Rename tool names copilot_ → puku_ (Phase 5.1)"
git push
```

---

## Step 5: Command IDs

**File**: `package.json`

**Section**: `contributes.commands`

**Changes**:
```json
// FROM:
{ "command": "github.copilot.chat.explain", ... }
// TO:
{ "command": "puku.chat.explain", ... }
```

**Estimated count**: ~80 commands

---

## Step 6: Test Compilation & Activation

Same as Step 3

---

## Step 7: Commit & Push Steps 5-6

```bash
git commit -m "refactor: Rename commands github.copilot.* → puku.* (Phase 5.2)"
git push
```

---

## Step 8: Source File References

**Files to update** (grep for patterns):
```bash
# Find files with copilot references
grep -r "github.copilot" src/ --include="*.ts" -l
grep -r "'copilot_" src/ --include="*.ts" -l
```

**Key files**:
- `src/extension/extension/vscode/extension.ts`
- `src/extension/conversation/vscode-node/chatParticipants.ts`
- `src/extension/tools/node/*.ts`
- All command handlers

---

## Step 9: Test Compilation & Activation

Same as Step 3 + run unit tests:
```bash
npm run test:unit
```

---

## Step 10: Commit & Push Steps 8-9

```bash
git commit -m "refactor: Update source file copilot references (Phase 5.3)"
git push
```

---

## Step 11: Localization Strings

**File**: `package.nls.json`

**Changes**:
```json
// FROM:
"github.copilot.command.explainThis": "Explain This"
// TO:
"puku.command.explainThis": "Explain This"
```

**Also update**: `%github.copilot.*%` → `%puku.*%` in package.json

---

## Step 12: Context Keys & When Clauses

**File**: `package.json`

**Section**: `when` clauses

**Changes**:
```json
// FROM:
"when": "github.copilot-chat.activated"
// TO:
"when": "puku.chat.activated"
```

---

## Step 13: Final Test & Release

1. Full compilation
2. Extension activation test
3. Unit tests
4. Manual testing:
   - Chat panel
   - Inline chat
   - All tools
   - Commands from palette
5. Bump version to v0.36.0
6. Create release

---

## Rollback Plan

If any step breaks:
```bash
git checkout -- <file>
npm run compile
```

If need to revert entire phase:
```bash
git revert HEAD~N  # N = number of commits to revert
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/extension/tools/common/toolNames.ts` | 41 string replacements |
| `package.json` | ~200 replacements (tools, commands, when clauses) |
| `package.nls.json` | ~100 replacements |
| `src/**/*.ts` | ~300 replacements across many files |

**Total estimated**: ~640 string replacements
