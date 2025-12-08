# NES (Next Edit Suggestions) - Live Demo

## Visual Walkthrough: Adding Error Handling to API Call

This demonstrates how NES predicts your next 5 edits in a real coding session.

---

### 🎬 Frame 1: Initial State

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string) {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
  }
}
```

**User Action**: Types `try {` before the fetch call ⌨️

---

### 🎬 Frame 2: After User Edit

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string) {
    try {                                              // ← USER TYPED THIS
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
      █  // ← CURSOR HERE
```

**🤖 NES Analysis**:
```
✓ Detected: User added try block
✓ Pattern: Error handling incomplete
✓ Next action: Add catch block
✓ Confidence: 95%
```

**💡 NES Prediction**:
- Location: Line 7 (after return data)
- Suggestion: Add catch block with error handling

---

### 🎬 Frame 3: NES Shows Suggestion

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string) {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    } catch (error) {                                  // ← NES SUGGESTS (ghost text)
      console.error('Failed to fetch user:', error);   // ← NES SUGGESTS
      throw error;                                     // ← NES SUGGESTS
    }                                                  // ← NES SUGGESTS
    █  // ← CURSOR MOVED HERE BY NES
```

**User sees**: Dimmed gray suggestion text (like Copilot ghost text)

**User Action**: Presses `Tab` to accept ✅

---

### 🎬 Frame 4: After Accept - Next Prediction

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string) {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch user:', error);   // ✓ ACCEPTED
      throw error;                                     // ✓ ACCEPTED
    }
  }
}
█  // ← CURSOR HERE
```

**🤖 NES Analysis**:
```
✓ Detected: Error handling added
✓ Pattern: Generic error object
✓ Next action: Type the error for better debugging
✓ Confidence: 87%
```

**💡 NES Prediction 2**: Add error type

---

### 🎬 Frame 5: Type Safety Suggestion

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string) {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    } catch (error) {                                  // ← NES HIGHLIGHTS THIS LINE
      if (error instanceof Error) {                    // ← NES SUGGESTS
        console.error('Failed to fetch user:', error.message);  // ← NES SUGGESTS (updated)
        throw error;
      }
      throw new Error('Unknown error occurred');       // ← NES SUGGESTS
    }
  }
}
```

**User Action**: Presses `Ctrl+I` to see alternative → Accepts with `Tab` ✅

---

### 🎬 Frame 6: Status Code Check

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string) {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();              // ← NES HIGHLIGHTS
      if (!response.ok) {                              // ← NES SUGGESTS
        throw new Error(`HTTP ${response.status}`);    // ← NES SUGGESTS
      }                                                // ← NES SUGGESTS
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to fetch user:', error.message);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }
}
```

**🤖 NES Analysis**:
```
✓ Detected: Missing HTTP status check
✓ Pattern: Should check response.ok before parsing
✓ Next action: Add status validation
✓ Confidence: 92%
```

**User Action**: Accepts with `Tab` ✅

---

### 🎬 Frame 7: Retry Logic

```typescript
// user-service.ts
export class UserService {
  async fetchUser(userId: string, retries = 3) {      // ← NES SUGGESTS (parameter added)
    for (let i = 0; i < retries; i++) {                // ← NES SUGGESTS
      try {                                            // ← NES SUGGESTS (indented existing code)
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        if (i === retries - 1) throw error;            // ← NES SUGGESTS
        await new Promise(r => setTimeout(r, 1000));   // ← NES SUGGESTS (backoff)
      }                                                // ← NES SUGGESTS
    }                                                  // ← NES SUGGESTS
  }
}
```

**🤖 NES Analysis**:
```
✓ Detected: Error handling without retry
✓ Pattern: Network requests should retry
✓ Next action: Add retry loop with backoff
✓ Confidence: 78%
```

**User sees**: This is a BIG change - NES shows diff preview with accept/reject buttons

**User Action**: Clicks "Accept" or presses `Tab` ✅

---

### 🎬 Frame 8: Final - Add Logging Import

```typescript
// user-service.ts
import { Logger } from './logger';                     // ← NES JUMPS TO TOP AND SUGGESTS

export class UserService {
  private logger = new Logger('UserService');          // ← NES SUGGESTS

  async fetchUser(userId: string, retries = 3) {
    this.logger.info(`Fetching user ${userId}`);       // ← NES SUGGESTS (at start of method)
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        this.logger.info(`Successfully fetched user ${userId}`);  // ← NES SUGGESTS
        return data;
      } catch (error) {
        this.logger.warn(`Retry ${i+1}/${retries} failed`);  // ← NES SUGGESTS
        if (i === retries - 1) throw error;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
}
```

**🤖 NES Analysis**:
```
✓ Detected: Production code without logging
✓ Pattern: Should log API calls
✓ Next action: Add logger import + usage
✓ Confidence: 85%
```

**User Action**: Accepts with `Tab` ✅

---

## 📊 Session Summary

**Total Time**: ~25 seconds (vs ~2 minutes manually)

**Edits Made**:
1. ✅ Added try-catch block (NES predicted)
2. ✅ Added error typing (NES predicted)
3. ✅ Added HTTP status check (NES predicted)
4. ✅ Added retry logic (NES predicted)
5. ✅ Added logging (NES predicted)

**Keystrokes**:
- Manual editing: ~200 keystrokes
- With NES: ~10 keystrokes (mostly Tab accepts)

**Efficiency Gain**: 95% fewer keystrokes! 🚀

---

## 🎮 How to Trigger NES

### Method 1: Manual Trigger
```
1. Make an edit
2. Press Ctrl+I
3. See suggestion
4. Press Tab to accept
```

### Method 2: Auto Trigger
```json
// settings.json
{
  "puku.chat.inlineEdits.triggerOnEditorChangeAfterSeconds": 2
}
```

NES will automatically show suggestions 2 seconds after you stop typing.

### Method 3: After Completion
When you accept a Tab completion, NES automatically predicts what's next!

---

## 🎨 Visual Indicators

### Ghost Text (Like Copilot)
```typescript
const user = await fetchUser(  // ← You type this
  userId,                      // ← NES shows this in gray
  3                            // ← NES shows this in gray
);                             // ← NES shows this in gray
```

### Inline Diff (For Large Changes)
```diff
async fetchUser(userId: string) {
+ async fetchUser(userId: string, retries = 3) {
+   for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`/api/users/${userId}`);
        // ...
+     } catch (error) {
+       if (i === retries - 1) throw error;
+       await new Promise(r => setTimeout(r, 1000));
+     }
+   }
  }
```

### Gutter Icon
```typescript
│ 🤖  async fetchUser(userId: string, retries = 3) {  // ← Icon shows NES is active
│       for (let i = 0; i < retries; i++) {
```

---

## 🔥 Advanced Example: Refactoring Across Files

### Starting Point
```typescript
// api.ts
export function getUser(id: string) {
  return fetch(`/users/${id}`).then(r => r.json());
}

export function getPost(id: string) {
  return fetch(`/posts/${id}`).then(r => r.json());
}

export function getComment(id: string) {
  return fetch(`/comments/${id}`).then(r => r.json());
}
```

**USER EDIT**: Decides to add error handling to `getUser`

---

### After 1st Edit
```typescript
// api.ts
export async function getUser(id: string) {
  try {
    const response = await fetch(`/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get user:', error);
    throw error;
  }
}

export function getPost(id: string) {  // ← NES HIGHLIGHTS THIS
  // ← NES predicts: "Apply same pattern to getPost"
```

**NES SUGGESTION**: "Apply error handling to getPost?"

**User Action**: Presses `Tab` → NES applies same transformation ✅

---

### After 2nd Edit
```typescript
// api.ts
export async function getUser(id: string) { /* ... */ }

export async function getPost(id: string) {
  try {
    const response = await fetch(`/posts/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get post:', error);
    throw error;
  }
}

export function getComment(id: string) {  // ← NES HIGHLIGHTS THIS
  // ← NES predicts: "Apply same pattern to getComment"
```

**NES SUGGESTION**: "Apply error handling to getComment?"

**User Action**: Presses `Tab` → Done! ✅

---

### Result: 3 Functions Updated in 6 Seconds

**Manual**: ~60 seconds (copy-paste + edit 3 times)
**With NES**: ~6 seconds (3 Tab presses)

---

## 🧠 How NES "Thinks"

### Context NES Analyzes

1. **Recent edits** (last 5 changes)
2. **Current file** (with syntax tree)
3. **Related files** (imports, same package)
4. **Diagnostics** (errors, warnings)
5. **Patterns** (code style, idioms)

### Example Analysis

```typescript
// Recent edit: Added parameter `taxRate: number`
function calculateTotal(items: Item[], taxRate: number) {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

// Call site 1
const total1 = calculateTotal(cartItems);  // ← TypeScript error: missing argument
```

**NES Reasoning**:
```
1. Detected parameter addition
2. Found TypeScript error at call site
3. Pattern: Need to add missing argument
4. Suggestion: Add taxRate argument (0.08 based on common US tax rate)
5. Confidence: 98%
```

**NES Action**: Highlights `calculateTotal(cartItems)` and suggests `calculateTotal(cartItems, 0.08)`

---

## 💡 Pro Tips

### Tip 1: Chain NES Accepts
Instead of:
1. Edit → Move cursor → Edit → Move cursor → Edit

Do this:
1. Edit → `Tab` → `Tab` → `Tab` (NES predicts each next location)

### Tip 2: Use Alt+] for Alternatives
NES often has multiple predictions. Cycle through them:
- `Ctrl+I` - Show suggestion
- `Alt+]` - Next alternative
- `Alt+[` - Previous alternative
- `Tab` - Accept current

### Tip 3: Combine with FIM
1. Type partial code (FIM completes it)
2. Press `Tab` to accept FIM
3. NES automatically predicts next edit!

### Tip 4: Let NES Drive Refactoring
When refactoring, make the first change, then let NES suggest the rest:
1. Rename one variable
2. NES highlights all other references
3. Press `Tab` repeatedly to update all

---

## 🎯 Summary

**NES = AI-Powered "Next Step" Predictor**

| Feature | Benefit |
|---------|---------|
| Predicts **location** | No manual cursor movement |
| Predicts **content** | No typing boilerplate |
| Learns **patterns** | Consistent code style |
| Works **fast** | 400ms first token |
| Supports **streaming** | See suggestions appear live |

**Bottom Line**: NES turns multi-step edits into rapid-fire Tab accepts! 🚀

---

**Ready to try it?** Press `Ctrl+I` in your editor!
