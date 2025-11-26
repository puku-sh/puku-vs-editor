# Phase 5: Remove Copilot Branding

## Status: Not Started

## Goal
Remove all GitHub Copilot branding and rename to Puku branding throughout the codebase.

## Scope

### 1. Command IDs (`github.copilot.*` → `puku.*`)
- [ ] `github.copilot.chat.explain` → `puku.chat.explain`
- [ ] `github.copilot.chat.fix` → `puku.chat.fix`
- [ ] `github.copilot.chat.generate` → `puku.chat.generate`
- [ ] `github.copilot.chat.generateTests` → `puku.chat.generateTests`
- [ ] `github.copilot.chat.generateDocs` → `puku.chat.generateDocs`
- [ ] `github.copilot.chat.review` → `puku.chat.review`
- [ ] `github.copilot.git.generateCommitMessage` → `puku.git.generateCommitMessage`
- [ ] `github.copilot.terminal.*` → `puku.terminal.*`
- [ ] `github.copilot.debug.*` → `puku.debug.*`
- [ ] All other `github.copilot.*` commands

### 2. Tool Names (`copilot_*` → `puku_*`)
- [ ] `copilot_searchCodebase` → `puku_searchCodebase`
- [ ] `copilot_searchWorkspaceSymbols` → `puku_searchWorkspaceSymbols`
- [ ] `copilot_listCodeUsages` → `puku_listCodeUsages`
- [ ] `copilot_getVSCodeAPI` → `puku_getVSCodeAPI`
- [ ] `copilot_findFiles` → `puku_findFiles`
- [ ] `copilot_findTextInFiles` → `puku_findTextInFiles`
- [ ] `copilot_applyPatch` → `puku_applyPatch`
- [ ] `copilot_readFile` → `puku_readFile`
- [ ] `copilot_listDirectory` → `puku_listDirectory`
- [ ] `copilot_getErrors` → `puku_getErrors`
- [ ] `copilot_readProjectStructure` → `puku_readProjectStructure`
- [ ] `copilot_getChangedFiles` → `puku_getChangedFiles`
- [ ] `copilot_testFailure` → `puku_testFailure`
- [ ] `copilot_createFile` → `puku_createFile`
- [ ] `copilot_insertEdit` → `puku_insertEdit`
- [ ] `copilot_replaceString` → `puku_replaceString`
- [ ] `copilot_editFiles` → `puku_editFiles`
- [ ] `copilot_memory` → `puku_memory`
- [ ] All other `copilot_*` tools

### 3. Chat Participants
- [ ] `github.copilot.default` → `puku.default`
- [ ] `github.copilot.workspace` → `puku.workspace`
- [ ] `github.copilot.editor` → `puku.editor`
- [ ] `github.copilot.terminal` → `puku.terminal`
- [ ] `github.copilot.notebook` → `puku.notebook`
- [ ] `github.copilot.vscode` → `puku.vscode`

### 4. Configuration Settings
- [ ] `github.copilot.chat.*` → `puku.chat.*`
- [ ] `github.copilot.advanced.*` → `puku.advanced.*`

### 5. Context Keys
- [ ] `github.copilot-chat.activated` → `puku.chat.activated`
- [ ] `github.copilot.interactiveSession.*` → `puku.interactiveSession.*`
- [ ] `github.copilot.chat.debug` → `puku.chat.debug`

### 6. Assets
- [ ] Replace `copilot.png` with Puku icon
- [ ] Update all icon references

### 7. Localization Strings
- [ ] Update `package.nls.json` - replace all `%github.copilot.*%` strings
- [ ] Update `%copilot.*%` strings

### 8. Extension Identity
- [ ] `package.json`: `publisher` → `puku`
- [ ] `package.json`: `name` → `puku-editor`
- [ ] `package.json`: `displayName` → `Puku Editor`

## Files to Modify

### Core Files
- `package.json` - All identifiers and contributions
- `package.nls.json` - Localization strings
- `src/extension/tools/common/toolNames.ts` - Tool name constants

### Source Files (grep for patterns)
```bash
# Find all copilot references
grep -r "copilot" src/ --include="*.ts" | wc -l
grep -r "github.copilot" src/ --include="*.ts" | wc -l
```

## Implementation Strategy

### Option A: Search & Replace (Risky)
- Global find/replace
- High risk of breaking things
- Fast but error-prone

### Option B: Incremental (Recommended)
1. Update `toolNames.ts` constants first
2. Update `package.json` contributions
3. Update source files that import from toolNames
4. Update remaining hardcoded strings
5. Run tests after each step

## Testing
- [ ] All existing tests pass
- [ ] Extension activates correctly
- [ ] All commands work
- [ ] All tools work
- [ ] Chat panel functions correctly
- [ ] Inline chat works
- [ ] Terminal integration works

## Estimated Effort
- **Time**: 4-8 hours
- **Risk**: Medium (many string replacements)
- **Dependencies**: None
