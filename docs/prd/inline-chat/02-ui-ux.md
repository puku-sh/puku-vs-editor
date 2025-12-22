# PRD: Puku Inline Chat - UI & UX

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024
**Related**: [Overview](./01-overview.md)

---

## 1. Overview

Define the user interface and user experience for Puku inline chat, ensuring it matches or exceeds GitHub Copilot's inline chat UX.

---

## 2. User Flow

### 2.1 Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Trigger                                              │
│ - User selects code OR positions cursor                     │
│ - Presses Ctrl+I (Cmd+I on Mac)                            │
│ - OR clicks lightbulb → "Ask Copilot"                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Input Widget Appears                                │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💬 Edit, refactor, and generate code                    ││
│ │ ┌─────────────────────────────────────────────────────┐││
│ │ │ add error handling_                                  │││  ← User types here
│ │ └─────────────────────────────────────────────────────┘││
│ │ [/fix] [/generate] [/doc] [/explain]                   ││  ← Quick actions
│ └─────────────────────────────────────────────────────────┘│
└────────────────────┬────────────────────────────────────────┘
                     │ Press Enter
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Loading State                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ⏳ Puku AI is working...                                ││
│ │ • Analyzing selection                                   ││
│ │ • Searching workspace patterns                         ││  ← Progressive updates
│ │ • Generating code                                       ││
│ └─────────────────────────────────────────────────────────┘│
└────────────────────┬────────────────────────────────────────┘
                     │ Streaming starts
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Diff Preview                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │   1 function divide(a, b) {                             ││
│ │ - 2   return a / b;                                     ││  ← Red (removed)
│ │ + 2 function divide(a: number, b: number): number {     ││  ← Green (added)
│ │ + 3   if (b === 0) {                                    ││
│ │ + 4     throw new Error('Division by zero');            ││
│ │ + 5   }                                                  ││
│ │ + 6   return a / b;                                     ││
│ │ + 7 }                                                    ││
│ │                                                          ││
│ │ ✅ Accept (Enter)  ❌ Reject (Esc)  🔄 Edit             ││  ← Actions
│ └─────────────────────────────────────────────────────────┘│
└────────────────────┬────────────────────────────────────────┘
                     │ User chooses
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Result                                              │
│ - Accept → Code applied, widget closed                     │
│ - Reject → Changes discarded, widget closed                │
│ - Edit → Return to input, keep context                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Widget Design

### 3.1 Input Widget

**Location**: Directly above/below cursor position (context-aware)

**Components**:
```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Edit, refactor, and generate code        [puku-ai ▼]    │  ← Header
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [User types instruction here]                           │ │  ← Text input
│ │                                                          │ │
│ │ Tip: Try "/fix", "/generate", "/doc", or "/explain"    │ │  ← Hint text
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [/fix] [/generate] [/doc] [/explain]                       │  ← Quick actions
│                                               [Submit ⏎]   │  ← Submit button
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- ✅ Auto-focus on input field
- ✅ Multiline support (Shift+Enter for newline)
- ✅ History navigation (Up/Down arrows)
- ✅ Model selector dropdown (puku-ai ▼)
- ✅ Intent suggestion as you type

### 3.2 Loading States

**Initial Loading** (0-500ms):
```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ Analyzing your code...                                   │
└─────────────────────────────────────────────────────────────┘
```

**Semantic Search** (500-1000ms):
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Searching workspace for similar patterns...             │
└─────────────────────────────────────────────────────────────┘
```

**Generating** (1000ms+):
```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Generating code...                                       │
│ [████████░░░░░░░░░░░░] 40%                                  │  ← Progress bar
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Diff Preview

**Format**: VS Code's built-in diff viewer

**Features**:
- ✅ Side-by-side diff (if space available)
- ✅ Inline diff (for small changes)
- ✅ Syntax highlighting
- ✅ Line numbers
- ✅ Expandable context (±3 lines)
- ✅ Scroll to changed lines

**Example**:
```diff
  1  function divide(a, b) {
- 2    return a / b;
+ 2  function divide(a: number, b: number): number {
+ 3    if (b === 0) {
+ 4      throw new Error('Division by zero');
+ 5    }
+ 6    return a / b;
+ 7  }
```

---

## 4. Interactions

### 4.1 Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| **Ctrl+I** (Cmd+I) | Open inline chat | Always |
| **Enter** | Submit / Accept | Input / Diff |
| **Shift+Enter** | New line in input | Input only |
| **Esc** | Close / Reject | Always |
| **Up/Down** | History navigation | Input only |
| **Tab** | Cycle through suggestions | Diff only |
| **Ctrl+/** | Toggle intent buttons | Input only |

### 4.2 Mouse Interactions

- **Click input** → Focus and type
- **Click intent button** → Pre-fill input with intent
- **Click "Submit"** → Same as Enter
- **Click "Accept"** → Apply changes
- **Click "Reject"** → Discard changes
- **Click "Edit"** → Return to input
- **Hover over diff** → Show inline explanation

### 4.3 Error States

**API Error**:
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Failed to connect to Puku API                            │
│ Check your API key in settings                             │
│ [Retry] [Settings]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Rate Limited**:
```
┌─────────────────────────────────────────────────────────────┐
│ ⏸️  Rate limit exceeded                                     │
│ Try again in 60 seconds                                     │
│ [Upgrade Plan]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Invalid Response**:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  AI response couldn't be parsed                          │
│ Try rephrasing your request                                │
│ [Try Again]                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Accessibility

### 5.1 Screen Reader Support

- ✅ All buttons have aria-labels
- ✅ Loading states announced
- ✅ Diff changes read line-by-line
- ✅ Error messages announced immediately
- ✅ Focus management (auto-focus on open)

### 5.2 Keyboard Navigation

- ✅ Tab through all interactive elements
- ✅ No mouse-only interactions
- ✅ Visible focus indicators
- ✅ Shortcuts work with screen reader

### 5.3 Visual Accessibility

- ✅ High contrast mode support
- ✅ Minimum font size: 12px
- ✅ Color-blind friendly (not just red/green)
- ✅ Sufficient color contrast (WCAG AA)

---

## 6. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Widget Open** | <100ms | Time from Ctrl+I to visible |
| **First Response** | <2s | Time to first streaming token |
| **Diff Render** | <200ms | Time to show diff after response |
| **Accept/Reject** | <50ms | Time to apply/discard changes |
| **Memory Usage** | <50MB | Widget + diff viewer combined |

---

## 7. Responsive Design

### Small Screens (<1200px width)
- Inline diff only (no side-by-side)
- Collapsed intent buttons (show on click)
- Reduced padding

### Large Screens (>1200px width)
- Side-by-side diff preferred
- Expanded intent buttons visible
- More context lines (±5)

### Vertical Space
- Widget height: max 400px (scrollable)
- Diff preview: max 600px (scrollable)

---

## 8. Animations & Transitions

### Widget Appear
- **Duration**: 200ms
- **Easing**: ease-out
- **Effect**: Slide down + fade in

### Loading Spinner
- **Type**: Rotating circle (VS Code style)
- **Duration**: Infinite
- **Color**: Theme accent color

### Diff Highlight
- **Duration**: 300ms
- **Easing**: ease-in-out
- **Effect**: Pulse green/red on added/removed lines

### Accept/Reject
- **Duration**: 150ms
- **Effect**: Fade out widget

---

## 9. Theming

### Light Theme
- Background: `#ffffff`
- Border: `#e5e5e5`
- Text: `#333333`
- Accent: `#007acc`
- Success: `#28a745`
- Error: `#dc3545`

### Dark Theme
- Background: `#1e1e1e`
- Border: `#3c3c3c`
- Text: `#d4d4d4`
- Accent: `#007acc`
- Success: `#34d058`
- Error: `#f97583`

### High Contrast
- Follow VS Code high contrast theme
- Stronger borders (2px instead of 1px)
- No subtle grays (only black/white)

---

## 10. Implementation Notes

### File Locations
- Widget: `src/extension/inlineChat/vscode-node/pukuInlineChatWidget.ts`
- Styles: `src/extension/inlineChat/vscode-node/pukuInlineChatWidget.css`
- Diff Renderer: Reuse VS Code's `vscode.diff` API

### Dependencies
- VS Code API: `vscode.window.createInputBox()`
- Custom WebView for rich UI (if needed)
- CSS-in-JS for theming

### Testing Checklist
- [ ] Widget opens on Ctrl+I
- [ ] All intent buttons work
- [ ] Diff preview renders correctly
- [ ] Accept applies changes
- [ ] Reject discards changes
- [ ] Error states display properly
- [ ] Keyboard navigation works
- [ ] Screen reader announces states
- [ ] Works in light/dark/high contrast themes
- [ ] Performance meets targets

---

## 11. Future Enhancements

### v1.1
- [ ] Inline explanation tooltips
- [ ] Multiple suggestions (cycle with Tab)
- [ ] Custom intent buttons
- [ ] Voice input support

### v1.2
- [ ] Multi-turn conversations in widget
- [ ] Suggested follow-up questions
- [ ] Rich media preview (images, charts)
- [ ] Collaborative editing (show other users)

---

**Next**: [Context Gathering PRD](./03-context-gathering.md)
