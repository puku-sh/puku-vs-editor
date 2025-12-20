# Feature PRD: Fix Tab to Jump Navigation for displayLocation

## 🚨 CRITICAL ISSUE

**Current State**: Tab to Jump functionality is **completely broken** for displayLocation-based suggestions
**Impact**: Users cannot navigate to target locations for import fixes and multi-line edits
**Severity**: HIGH - Core functionality failure

---

## 1. Problem Overview

### 1.1 Current Behavior (BROKEN)

```
Line 15: // Add React import:█
         📄 Go To Inline Suggestion
         [User presses Tab]
Line 15: // Add React import: import React from 'react'  ← ❌ WRONG: Inserted at cursor
```

### 1.2 Expected Behavior (WORKING)

```
Line 15: // Add React import:█
         📄 Go To Inline Suggestion
         [User presses Tab]

         ↓ JUMP ↓

Line 1:  import React from 'react'█                     ← ✅ CORRECT: Cursor jumped + ghost text
         [User presses Tab again]
Line 1:  import React from 'react'                     ← ✅ CORRECT: Inserted at target
```

---

## 2. Root Cause Analysis

### 2.1 The Core Problem

**File:** `pukuFimProvider.ts:823` and `pukuUnifiedInlineProvider.ts:142`

```typescript
// ❌ CURRENT IMPLEMENTATION (BROKEN)
const displayLocation = {
    range: targetRange,  // ← WRONG: Target location (line 1)
    label: "📄 Go To Inline Suggestion",
    kind: InlineCompletionDisplayLocationKind.Code
};

const item = new vscode.InlineCompletionItem(completion, range);
//                                                        ^^^^^
//                                                        ← WRONG: Current cursor (line 15)
item.displayLocation = displayLocation;
```

**Result:**
- VS Code shows label at line 15 ✅
- User presses Tab → Inserts at line 15 ❌ (uses `InlineCompletionItem.range`)

### 2.2 VS Code API Understanding

From analyzing VS Code source code and Copilot reference:

```typescript
// ✅ CORRECT IMPLEMENTATION (FROM COPILOT)
// File: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts:323-330

const requestingPosition = position;  // ← Current cursor (line 15)
const range = new Range(requestingPosition, requestingPosition);  // ← Same as cursor

const displayLocation: InlineCompletionDisplayLocation = {
    range,  // ← SAME as InlineCompletionItem.range (current position)
    label: GoToNextEdit,
    kind: InlineCompletionDisplayLocationKind.Label  // ← CRITICAL: Use Label, not Code
};

// The magic: VS Code handles navigation internally when kind=Label
// and displayLocation.range == InlineCompletionItem.range
```

---

## 3. Solution Architecture

### 3.1 Visual Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TAB TO JUMP - SOLUTION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USER INPUT:                                                   │
│  Line 15: // Add React import:█                                 │
│                                                                 │
│  BACKEND RESPONSE:                                             │
│  {                                                             │
│    "text": "import React from 'react';",                       │
│    "metadata": {                                               │
│      "targetLine": 0,                                          │
│      "targetColumn": 0,                                        │
│      "displayType": "label"                                    │
│    }                                                           │
│  }                                                             │
│                                                                 │
│  ┌─────────────────┐    ┌────────────────────────────────────┐ │
│  │   FRONTEND      │    │          VS CODE                   │ │
│  │   PUKU SIDE     │    │        INTERNALS                  │ │
│  └─────────────────┘    └────────────────────────────────────┘ │
│           │                           │                      │
│           │ 1. Create displayLocation  │                      │
│           │    range = CURRENT (line 15)                      │
│           │    kind = Label                                   │
│           │    label = "Go to Suggestion"                     │
│           │                           │                      │
│           │───────────────────────────▶│                      │
│           │                           │ 2. Shows label at    │
│           │                           │    current position  │
│           │                           │    (line 15)         │
│           │                           │                      │
│           │                           │◀────────────────────│
│           │                           │                      │
│           │ 3. User presses Tab       │                      │
│           │───────────────────────────▶│                      │
│           │                           │ 4. Detects Label +   │
│           │                           │    different target   │
│           │                           │    → JUMPS to target  │
│           │                           │    (line 1)          │
│           │                           │                      │
│           │                           │◀────────────────────│
│           │                           │                      │
│  RESULT: ✅                                                   │
│  Line 1: import React from 'react'█                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Technical Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      TECHNICAL FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BACKEND → FRONTEND (Current):                                  │
│  ────────────────────────────────────────                       │
│  metadata.targetLine = 0                                        │
│  metadata.targetColumn = 0                                      │
│  metadata.displayType = "label"                                 │
│                                                                 │
│  FRONTEND PROCESSING (Fix Required):                           │
│  ────────────────────────────────────────                       │
│                                                                 │
│  ❌ BROKEN (pukuFimProvider.ts:823):                           │
│  const item = new vscode.InlineCompletionItem(completion, range)│
│  item.displayLocation = {                                       │
│      range: targetRange,    // ← WRONG: Target location         │
│      kind: Code            // ← WRONG: Should be Label         │
│  }                                                             │
│                                                                 │
│  ✅ FIXED:                                                      │
│  const currentPosition = new vscode.Range(position, position)   │
│  const displayLocation = {                                      │
│      range: currentPosition, // ← CORRECT: Current position     │
│      label: "📄 Go To Inline Suggestion",                       │
│      kind: vscode.InlineCompletionDisplayLocationKind.Label     │
│  }                                                              │
│                                                                 │
│  const item = new vscode.InlineCompletionItem(completion, targetRange) │
│  //                                                    ^^^^^^^^^^^  │
│  //                                                    Target location │
│  item.displayLocation = displayLocation                          │
│                                                                 │
│  VS CODE INTERNALS (Copilot Reference):                        │
│  ────────────────────────────────────────                       │
│  if (item.displayLocation?.kind === Label) {                   │
│      if (item.displayLocation.range === item.range) {          │
│          // Same range = current position → Show label          │
│          // Different range = target position → Handle jump     │
│          if (item.range !== item.displayLocation.range) {      │
│              // This is a jump-to-edit scenario                │
│              editor.setPosition(item.range.start);             │
│              showGhostTextAt(item.range, item.insertText);      │
│          }                                                      │
│      }                                                          │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Plan

### 4.1 Files to Modify

#### **Priority 1: Critical Fix**

**File:** `src/chat/src/extension/pukuai/vscode-node/providers/pukuFimProvider.ts`
- **Line 823**: `_createCompletionItem()` method
- **Fix**: Add displayLocation parameter and handling

#### **Priority 2: Import Fix Support**

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts`
- **Lines 132-156**: Import fix handling
- **Fix**: Convert to displayLocation pattern for consistency

### 4.2 Detailed Implementation

#### **Step 1: Update `_createCompletionItem()` signature**

```typescript
// BEFORE (pukuFimProvider.ts:817)
private _createCompletionItem(
    completion: string,
    range: vscode.Range,
    position: vscode.Position,
    documentUri: vscode.Uri
): vscode.InlineCompletionItem

// AFTER
private _createCompletionItem(
    completion: string,
    range: vscode.Range,
    position: vscode.Position,
    documentUri: vscode.Uri,
    displayLocation?: vscode.InlineCompletionDisplayLocation | null
): vscode.InlineCompletionItem
```

#### **Step 2: Add displayLocation creation helper**

```typescript
// NEW METHOD in pukuFimProvider.ts
private _createDisplayLocation(
    targetRange: vscode.Range,
    currentPosition: vscode.Position
): vscode.InlineCompletionDisplayLocation | null {
    // Check if this is a jump scenario
    const isJumpScenario = !targetRange.contains(currentPosition);

    if (!isJumpScenario) {
        return null; // No displayLocation needed for inline completions
    }

    const distance = Math.abs(targetRange.start.line - currentPosition.line);
    const filename = this._getFilename(documentUri);
    const lineNumber = targetRange.start.line + 1;

    // Show line number if far away
    const label = distance > 12
        ? `📄 Go To Inline Suggestion (${filename}:${lineNumber})`
        : `📄 Go To Inline Suggestion`;

    // CRITICAL: displayLocation.range = current position (where label shows)
    const currentRange = new vscode.Range(currentPosition, currentPosition);

    return {
        range: currentRange,  // ← Current position (NOT target)
        label,
        kind: vscode.InlineCompletionDisplayLocationKind.Label  // ← Use Label, not Code
    };
}

private _getFilename(uri: vscode.Uri): string {
    return uri.fsPath.split(/[/\\]/).pop() || '';
}
```

#### **Step 3: Update `_createCompletionItem()` implementation**

```typescript
// FIXED pukuFimProvider.ts:817
private _createCompletionItem(
    completion: string,
    range: vscode.Range,
    position: vscode.Position,
    documentUri: vscode.Uri,
    displayLocation?: vscode.InlineCompletionDisplayLocation | null
): vscode.InlineCompletionItem {
    const item = new vscode.InlineCompletionItem(completion, range);

    if (displayLocation) {
        item.displayLocation = displayLocation;
    }

    return item;
}
```

#### **Step 4: Update calls to `_createCompletionItem()`**

```typescript
// pukuFimProvider.ts:291 (CurrentGhostText case)
const completionItems = [this._createCompletionItem(
    typingAsSuggested,
    new vscode.Range(position, position),
    position,
    document.uri
    // No displayLocation for inline completions
)];

// pukuFimProvider.ts:314 (Radix Trie cache case)
const completionItems = completions.map(completion =>
    this._createCompletionItem(
        completion,
        new vscode.Range(position, position),
        position,
        document.uri
        // No displayLocation for inline completions
    )
);

// pukuFimProvider.ts:368 (Speculative cache case)
const completionItems = completions.map(completion =>
    this._createCompletionItem(
        completion,
        new vscode.Range(position, position),
        position,
        document.uri
        // No displayLocation for inline completions
    )
);

// pukuFimProvider.ts:581 (API response case) - NEEDS DISPLAYLOCATION LOGIC
const completionItems = completions.map(completion => {
    // Check if completion has displayLocation metadata
    let displayLocation: vscode.InlineCompletionDisplayLocation | null = null;

    // For now, only create displayLocation for import-like completions
    // TODO: Add backend metadata support for displayLocation
    if (this._isImportLikeCompletion(completion, position)) {
        const targetLine = this._detectTargetLine(completion, document);
        if (targetLine !== null && targetLine !== position.line) {
            const targetRange = new vscode.Range(targetLine, 0, targetLine, completion.length);
            displayLocation = this._createDisplayLocation(targetRange, position);
        }
    }

    return this._createCompletionItem(
        completion,
        finalRange,
        position,
        document.uri,
        displayLocation
    );
});
```

#### **Step 5: Fix Import Fix in Unified Provider**

```typescript
// pukuUnifiedInlineProvider.ts:132-156 (FIXED)
if (isImportFix) {
    console.log('[PukuUnifiedProvider] Import fix - using displayLocation for jump');

    const currentRange = new vscode.Range(position, position); // Current cursor
    const distance = Math.abs(fix.range.start.line - position.line);
    const filename = document.fileName.split(/[/\\]/).pop() || '';
    const lineNumber = fix.range.start.line + 1;

    const label = distance > 12
        ? `📄 Go To Inline Suggestion (${filename}:${lineNumber})`
        : `📄 Go To Inline Suggestion`;

    const displayLocation: vscode.InlineCompletionDisplayLocation = {
        range: currentRange,  // ← Current position (where label shows)
        label,
        kind: vscode.InlineCompletionDisplayLocationKind.Label  // ← Use Label
    };

    const item: vscode.InlineCompletionItem = {
        insertText: fix.newText,
        range: fix.range, // ← Target position (where code inserts)
        displayLocation
    };

    this.completionsByText.set(fix.newText, { document, position });

    return {
        items: [item],
        enableForwardStability: true
    };
}
```

---

## 5. Testing Strategy

### 5.1 Test Cases

#### **Test Case 1: Import Fix Jump**
```
Setup:
1. test.tsx with existing React usage but no import
2. Cursor at line 15: "// Add React import:"

Expected:
1. Label shows: "📄 Go To Inline Suggestion (test.tsx:1)"
2. Press Tab → Cursor jumps to line 1
3. Ghost text shows: "import React from 'react';"
4. Press Tab again → Import inserted at line 1
```

#### **Test Case 2: Normal Inline Completion**
```
Setup:
1. Type: function add(a, b) { return

Expected:
1. No label shown
2. Ghost text inline: " a + b;"
3. Press Tab → Inserted inline immediately
```

#### **Test Case 3: Multi-line Refactoring**
```
Setup:
1. Function that needs refactoring
2. AI suggests replacement at different location

Expected:
1. Label shows with line number if far away
2. Tab jumps to target location
3. Second tab accepts the edit
```

### 5.2 Automated Tests

```typescript
// test/pukuTabToJump.spec.ts
suite('Tab to Jump - displayLocation', () => {
    test('Import fix jumps to top of file', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: `// Add React import:
function App() {
    return <div>Hello</div>;
}`
        });

        const provider = new PukuFimProvider(...);
        const result = await provider.getNextEdit(
            { document: doc, position: new vscode.Position(0, 22) },
            {},
            new vscode.CancellationTokenSource().token
        );

        const item = result.completion[0];
        assert.strictEqual(item.displayLocation?.kind, vscode.InlineCompletionDisplayLocationKind.Label);
        assert.strictEqual(item.range.start.line, 0); // Target is line 0
        assert.strictEqual(item.displayLocation.range.start.line, 0); // Label shows at line 0

        // Simulate Tab press
        await vscode.commands.executeCommand('inlineSuggest.accept');

        // Cursor should have moved to target line
        const editor = vscode.window.activeTextEditor;
        assert.strictEqual(editor.selection.start.line, 0);
    });
});
```

---

## 6. Rollback Plan

### 6.1 If Fix Breaks Other Functionality

```typescript
// EMERGENCY ROLLBACK - Simple fix
private _createCompletionItem(
    completion: string,
    range: vscode.Range,
    position: vscode.Position,
    documentUri: vscode.Uri,
    displayLocation?: vscode.InlineCompletionDisplayLocation | null
): vscode.InlineCompletionItem {
    const item = new vscode.InlineCompletionItem(completion, range);

    // TEMPORARILY DISABLE displayLocation
    // if (displayLocation) {
    //     item.displayLocation = displayLocation;
    // }

    return item;
}
```

### 6.2 Feature Flag

```typescript
// Add config option for gradual rollout
private _shouldUseDisplayLocation(): boolean {
    return this._configService.getConfig()?.features?.enableTabToJump ?? false;
}
```

---

## 7. Success Metrics

### 7.1 Functional Metrics
- ✅ Tab to Jump works for import fixes
- ✅ Normal inline completions unaffected
- ✅ No performance regression
- ✅ All test cases pass

### 7.2 User Experience Metrics
- **Tab success rate**: % of Tab presses that result in expected action
- **Jump accuracy**: % of jumps that land at correct target location
- **Import fix adoption**: % of import fixes accepted vs ignored
- **User feedback**: Issue reports related to Tab behavior

### 7.3 Technical Metrics
- **Zero compilation errors**
- **No VS Code API violations**
- **Backward compatibility maintained**
- **Performance impact < 5ms**

---

## 8. Timeline

### **Phase 1: Critical Fix (1 day)**
- [ ] Update `_createCompletionItem()` method
- [ ] Add displayLocation helper methods
- [ ] Fix import fix handling in unified provider
- [ ] Basic manual testing

### **Phase 2: Comprehensive Testing (1 day)**
- [ ] Add automated test suite
- [ ] Test edge cases and error scenarios
- [ ] Performance testing
- [ ] Documentation updates

### **Phase 3: Polish & Rollout (1 day)**
- [ ] Add feature flag for gradual rollout
- [ ] User experience refinement
- [ ] Monitor production metrics
- [ ] Address any issues

**Total Estimated Time**: 3 days

---

## 9. Risks & Mitigations

### Risk 1: VS Code API Changes
- **Mitigation**: Test against multiple VS Code versions, use feature flags

### Risk 2: Regression in Normal Completions
- **Mitigation**: Comprehensive test suite, gradual rollout

### Risk 3: Performance Impact
- **Mitigation**: Minimal code changes, benchmark critical paths

### Risk 4: User Confusion
- **Mitigation**: Clear visual indicators, user documentation

---

## 10. Conclusion

This is a **critical bug fix** for a core functionality that is currently completely broken. The issue is well-understood with a clear reference implementation from VS Code/Copilot. The fix is surgical and low-risk, with a high impact on user experience.

**Key Points:**
1. **Root cause**: `displayLocation.range` should be current position, not target
2. **Critical fix**: Use `InlineCompletionDisplayLocationKind.Label`, not `Code`
3. **Implementation**: Update `_createCompletionItem()` and import fix handling
4. **Testing**: Comprehensive test coverage for all scenarios
5. **Timeline**: 3 days to full resolution

This fix will restore the expected Tab to Jump functionality and significantly improve the user experience with multi-line edits and import fixes.