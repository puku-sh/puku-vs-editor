# Zed FIM Implementation Analysis

> **Status:** 📋 **RESEARCH PHASE - NOT YET IMPLEMENTED**
>
> This document contains competitive analysis of Zed's FIM (Fill-in-Middle) implementation.
> Features described here are **research findings** for Puku FIM, not current functionality.

---

## Overview

**Zed** is a high-performance code editor written in Rust with GPUI framework. Their FIM implementation uses a unique **diff-based rendering** approach via the "EditPrediction" system, supporting both GitHub Copilot and Supermaven providers.

---

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    ZED EDITPREDICTION SYSTEM                 │
├─────────────────────────────────────────────────────────────┤
│  EditPredictionProvider Trait                                │
│  ├── CopilotCompletionProvider (GitHub Copilot)             │
│  ├── SupermavenCompletionProvider (Supermaven)              │
│  └── (Extensible for other providers)                       │
├─────────────────────────────────────────────────────────────┤
│  EditPrediction Enum                                         │
│  ├── Local: Edits within current buffer                     │
│  │   └── Vec<(Range<Anchor>, Arc<str>)> - inlay edits     │
│  └── Jump: Navigate to different file                       │
├─────────────────────────────────────────────────────────────┤
│  EditPredictionContext (Optional)                           │
│  ├── AST-based code chunking                                │
│  ├── Import detection                                        │
│  ├── Semantic declaration scoring                           │
│  └── Text similarity matching                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Innovation: Diff-Based Rendering

Zed's **completion_from_diff** algorithm matches completion text against buffer text **grapheme-by-grapheme**, inserting inlays only for unmatched parts:

```rust
// Given completion: "axbyc"
// Given buffer text: "xy"
// Rendered output: "[a]x[b]y[c]"
//                   ^^^ ^^^ ^^^ = inlays (ghost text)
```

**Algorithm:**
1. Split completion and buffer into grapheme arrays
2. Greedily find next buffer grapheme in completion
3. Text between matches → inlay insertion
4. Remaining completion text → final inlay
5. Return `Vec<(Range<Anchor>, Arc<str>)>` of edits

---

## Implementation Details

### 1. Copilot Provider

**File:** `reference/zed/crates/copilot/src/copilot_completion_provider.rs`

**Key Features:**
- **Debounce:** 75ms (fastest of all implementations!)
- **Cycling:** Supports Prev/Next through multiple completions
- **Async refresh:** Fetches completions via `copilot.completions().await`
- **State management:** Tracks `active_completion_index`, `completions` vec

**Code Highlights:**
```rust
pub const COPILOT_DEBOUNCE_TIMEOUT: Duration = Duration::from_millis(75);

pub struct CopilotCompletionProvider {
    cycled: bool,
    buffer_id: Option<EntityId>,
    completions: Vec<Completion>,
    active_completion_index: usize,
    copilot: Entity<Copilot>,
}

fn refresh(&mut self, buffer: Entity<Buffer>, cursor_position: Anchor,
           debounce: bool, cx: &mut Context<Self>) {
    self.pending_refresh = Some(cx.spawn(async move |this, cx| {
        if debounce {
            cx.background_executor().timer(COPILOT_DEBOUNCE_TIMEOUT).await;
        }

        let completions = copilot.update(cx, |copilot, cx| {
            copilot.completions(&buffer, cursor_position, cx)
        })?.await?;

        this.update(cx, |this, cx| {
            this.completions = completions;
            this.active_completion_index = 0;
            cx.notify();
        })?;
        Ok(())
    }));
}

fn cycle(&mut self, direction: Direction, cx: &mut Context<Self>) {
    if self.completions.is_empty() { return; }

    self.active_completion_index = match direction {
        Direction::Prev => self.active_completion_index.saturating_sub(1),
        Direction::Next => {
            let next = self.active_completion_index + 1;
            if next >= self.completions.len() { 0 } else { next }
        }
    };
    self.cycled = true;
    cx.notify();
}
```

---

### 2. Supermaven Provider

**File:** `reference/zed/crates/supermaven/src/supermaven_completion_provider.rs`

**Key Features:**
- **Debounce:** 75ms (same as Copilot)
- **Diff-based rendering:** Uses `completion_from_diff()` for smart inlays
- **Position tracking:** Caches `completion_position` to prevent stale completions
- **Streaming updates:** Async loop over `completion.updates.next().await`
- **Text caching:** Stores `completion_text: Option<String>` to avoid re-fetching

**Code Highlights:**
```rust
pub const DEBOUNCE_TIMEOUT: Duration = Duration::from_millis(75);

pub struct SupermavenCompletionProvider {
    supermaven: Entity<Supermaven>,
    buffer_id: Option<EntityId>,
    completion_id: Option<SupermavenCompletionStateId>,
    completion_text: Option<String>,
    file_extension: Option<String>,
    pending_refresh: Option<Task<Result<()>>>,
    completion_position: Option<Anchor>,
}

fn refresh(&mut self, buffer: Entity<Buffer>, cursor_position: Anchor,
           debounce: bool, cx: &mut Context<Self>) {
    // Only make new requests when debounce is true (text typed)
    // When debounce is false (cursor movement), don't make new requests
    if !debounce {
        return;
    }

    reset_completion_cache(self, cx);

    let Some(mut completion) = self.supermaven.update(cx, |supermaven, cx| {
        supermaven.complete(&buffer, cursor_position, cx)
    }) else {
        return;
    };

    self.pending_refresh = Some(cx.spawn(async move |this, cx| {
        if debounce {
            cx.background_executor().timer(DEBOUNCE_TIMEOUT).await;
        }

        // Stream completion updates
        while let Some(()) = completion.updates.next().await {
            this.update(cx, |this, cx| {
                if let Some(text) = this.supermaven.read(cx)
                    .completion(&buffer, cursor_position, cx) {
                    this.completion_text = Some(text.to_string());
                    this.completion_position = Some(cursor_position);
                }

                this.completion_id = Some(completion.id);
                this.buffer_id = Some(buffer.entity_id());
                cx.notify();
            })?;
        }
        Ok(())
    }));
}

fn suggest(&mut self, buffer: &Entity<Buffer>, cursor_position: Anchor,
           cx: &mut Context<Self>) -> Option<EditPrediction> {
    // Check cursor is still at same position as completion request
    if let Some(completion_position) = self.completion_position {
        if cursor_position != completion_position {
            return None; // Stale completion!
        }
    } else {
        return None;
    }

    let completion_text = if let Some(cached_text) = &self.completion_text {
        cached_text.as_str()
    } else {
        let text = self.supermaven.read(cx)
            .completion(buffer, cursor_position, cx)?;
        self.completion_text = Some(text.to_string());
        text
    };

    let completion_text = trim_to_end_of_line_unless_leading_newline(completion_text);
    let completion_text = completion_text.trim_end();

    if !completion_text.trim().is_empty() {
        let snapshot = buffer.read(cx).snapshot();

        // Calculate range from cursor to end of line
        let cursor_point = cursor_position.to_point(&snapshot);
        let end_of_line = snapshot.anchor_after(Point::new(
            cursor_point.row,
            snapshot.line_len(cursor_point.row),
        ));
        let delete_range = cursor_position..end_of_line;

        Some(completion_from_diff(
            snapshot,
            completion_text,
            cursor_position,
            delete_range,
        ))
    } else {
        None
    }
}
```

**Diff Algorithm:**
```rust
fn completion_from_diff(
    snapshot: BufferSnapshot,
    completion_text: &str,
    position: Anchor,
    delete_range: Range<Anchor>,
) -> EditPrediction {
    let buffer_text = snapshot.text_for_range(delete_range).collect::<String>();

    let mut edits: Vec<(Range<Anchor>, Arc<str>)> = Vec::new();

    let completion_graphemes: Vec<&str> = completion_text.graphemes(true).collect();
    let buffer_graphemes: Vec<&str> = buffer_text.graphemes(true).collect();

    let mut offset = position.to_offset(&snapshot);

    let mut i = 0; // completion index
    let mut j = 0; // buffer index
    while i < completion_graphemes.len() && j < buffer_graphemes.len() {
        // Find next instance of buffer[j] in completion[i..]
        let k = completion_graphemes[i..].iter()
            .position(|c| *c == buffer_graphemes[j]);

        match k {
            Some(k) => {
                if k != 0 {
                    let anchor = snapshot.anchor_after(offset);
                    // The range from i to i+k is an inlay
                    let edit = (
                        anchor..anchor,
                        completion_graphemes[i..i + k].join("").into(),
                    );
                    edits.push(edit);
                }
                i += k + 1;
                j += 1;
                offset.add_assign(buffer_graphemes[j - 1].len());
            }
            None => {
                // No more matching completions, drop remaining text as inlay
                break;
            }
        }
    }

    if j == buffer_graphemes.len() && i < completion_graphemes.len() {
        let anchor = snapshot.anchor_after(offset);
        // Leftover completion text → final inlay
        let edit_range = anchor..anchor;
        let edit_text = completion_graphemes[i..].join("");
        edits.push((edit_range, edit_text.into()));
    }

    EditPrediction::Local {
        id: None,
        edits,
        edit_preview: None,
    }
}
```

---

### 3. EditPrediction System

**File:** `reference/zed/crates/edit_prediction/src/edit_prediction.rs`

**Core Types:**

```rust
pub enum EditPrediction {
    /// Edits within the buffer that requested the prediction
    Local {
        id: Option<SharedString>,
        edits: Vec<(Range<Anchor>, Arc<str>)>,
        edit_preview: Option<EditPreview>,
    },
    /// Jump to a different file from the one that requested the prediction
    Jump {
        id: Option<SharedString>,
        snapshot: BufferSnapshot,
        target: Anchor,
    },
}
```

**Provider Trait:**
```rust
pub trait EditPredictionProvider: 'static + Sized {
    fn name() -> &'static str;
    fn display_name() -> &'static str;
    fn show_completions_in_menu() -> bool;
    fn show_tab_accept_marker() -> bool;
    fn supports_jump_to_edit() -> bool;

    fn is_enabled(&self, buffer: &Entity<Buffer>, cursor_position: Anchor, cx: &App) -> bool;
    fn is_refreshing(&self, cx: &App) -> bool;

    fn refresh(
        &mut self,
        buffer: Entity<Buffer>,
        cursor_position: Anchor,
        debounce: bool,
        cx: &mut Context<Self>,
    );

    fn cycle(
        &mut self,
        buffer: Entity<Buffer>,
        cursor_position: Anchor,
        direction: Direction,
        cx: &mut Context<Self>,
    );

    fn accept(&mut self, cx: &mut Context<Self>);
    fn discard(&mut self, cx: &mut Context<Self>);

    fn suggest(
        &mut self,
        buffer: &Entity<Buffer>,
        cursor_position: Anchor,
        cx: &mut Context<Self>,
    ) -> Option<EditPrediction>;
}
```

**Interpolation for User Edits:**

Zed has a clever `interpolate_edits()` function that adjusts predicted edits when the user types:

```rust
/// Returns edits updated based on user edits since the old snapshot.
/// None is returned if any user edit is not a prefix of a predicted insertion.
pub fn interpolate_edits(
    old_snapshot: &BufferSnapshot,
    new_snapshot: &BufferSnapshot,
    current_edits: &[(Range<Anchor>, Arc<str>)],
) -> Option<Vec<(Range<Anchor>, Arc<str>)>> {
    // Iterate through user edits since old snapshot
    for user_edit in new_snapshot.edits_since::<usize>(&old_snapshot.version) {
        // Check if user edit matches a predicted edit
        if let Some((model_old_range, model_new_text)) = model_edits.peek() {
            let user_new_text = new_snapshot
                .text_for_range(user_edit.new.clone())
                .collect::<String>();

            // If user typed a prefix of the prediction, adjust the suffix
            if let Some(model_suffix) = model_new_text.strip_prefix(&user_new_text) {
                if !model_suffix.is_empty() {
                    let anchor = old_snapshot.anchor_after(user_edit.old.end);
                    edits.push((anchor..anchor, model_suffix.into()));
                }
                continue;
            }
        }

        return None; // User edit doesn't match → invalidate prediction
    }

    Some(edits)
}
```

---

### 4. EditPredictionContext (Optional)

**File:** `reference/zed/crates/edit_prediction_context/src/edit_prediction_context.rs`

**Purpose:** Optional context gathering for more intelligent completions (similar to Puku's approach).

**Features:**
- **Import detection:** `Imports::gather(&buffer, parent_abs_path)`
- **AST-based excerpts:** `EditPredictionExcerpt::select_from_buffer()`
- **Semantic scoring:** `scored_declarations()` ranks relevant code chunks
- **Text similarity:** `Occurrences::within_string()` for matching
- **SyntaxIndex:** Optional AST-based code indexing

**Context Structure:**
```rust
pub struct EditPredictionContext {
    pub excerpt: EditPredictionExcerpt,
    pub excerpt_text: EditPredictionExcerptText,
    pub cursor_point: Point,
    pub declarations: Vec<ScoredDeclaration>,
}

pub struct EditPredictionContextOptions {
    pub use_imports: bool,
    pub excerpt: EditPredictionExcerptOptions,
    pub score: EditPredictionScoreOptions,
    pub max_retrieved_declarations: u8,
}
```

**Gathering Context:**
```rust
pub fn gather_context(
    cursor_point: Point,
    buffer: &BufferSnapshot,
    parent_abs_path: Option<&Path>,
    options: &EditPredictionContextOptions,
    index_state: Option<&SyntaxIndexState>,
) -> Option<Self> {
    // 1. Gather imports (like Puku's import-based context)
    let imports = if options.use_imports {
        Imports::gather(&buffer, parent_abs_path)
    } else {
        Imports::default()
    };

    // 2. Select excerpt around cursor (AST-aware)
    let excerpt = EditPredictionExcerpt::select_from_buffer(
        cursor_point,
        buffer,
        &options.excerpt,
        index_state,
    )?;
    let excerpt_text = excerpt.text(buffer);

    // 3. Score declarations by relevance (like Puku's semantic search)
    let declarations = if options.max_retrieved_declarations > 0 && index_state.is_some() {
        let excerpt_occurrences = text_similarity::Occurrences::within_string(&excerpt_text.body);
        let adjacent_occurrences = text_similarity::Occurrences::within_string(...);

        let mut declarations = scored_declarations(
            &options.score,
            &index_state,
            &excerpt,
            &excerpt_occurrences,
            &adjacent_occurrences,
            &imports,
            references,
            cursor_offset_in_file,
            buffer,
        );
        declarations.truncate(options.max_retrieved_declarations as usize);
        declarations
    } else {
        vec![]
    };

    Some(Self { excerpt, excerpt_text, cursor_point, declarations })
}
```

---

## Key Findings

### 1. Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Debounce** | 75ms | Fastest of all implementations (Copilot + Supermaven) |
| **Refresh trigger** | Text changes only | Cursor movement doesn't trigger new requests |
| **Caching** | Text-based | Caches `completion_text: Option<String>` |
| **Position validation** | ✅ Yes | Checks `cursor_position == completion_position` |
| **State reset** | On accept/discard | Clears cache when completion accepted/rejected |

### 2. Unique Features

**Diff-Based Rendering:**
- **Why innovative:** Allows completions to work even when user has already typed partial text
- **Example:** User types "xy", completion is "axbyc" → shows "[a]x[b]y[c]"
- **Use case:** Handle race conditions where user types faster than API responds

**Position Tracking:**
- **Why innovative:** Prevents stale completions from showing after cursor moves
- **Implementation:** Store `completion_position: Option<Anchor>`, check in `suggest()`
- **Result:** No ghost text when cursor moves away

**Refresh Gating:**
- **Why innovative:** Only refresh on text changes, not cursor movement
- **Implementation:** Check `if !debounce { return; }` at start of `refresh()`
- **Result:** Fewer API calls, better performance

**Edit Interpolation:**
- **Why innovative:** Adjusts predictions as user types prefix of completion
- **Implementation:** `interpolate_edits()` strips user-typed prefix from prediction
- **Result:** Smooth experience as user accepts completion character-by-character

### 3. Strengths

✅ **Fastest debounce** - 75ms (vs 200-800ms in other implementations)
✅ **Diff-based rendering** - Handles partial user input gracefully
✅ **Position validation** - Prevents stale completions
✅ **Edit interpolation** - Smooth prefix-typing experience
✅ **Refresh gating** - No requests on cursor movement
✅ **Multiple providers** - Extensible architecture (Copilot, Supermaven)
✅ **Cycling support** - Prev/Next through multiple completions
✅ **Optional context** - Import detection, AST-based scoring (similar to Puku)

### 4. Weaknesses

❌ **No streaming** - Single fetch, wait for full completion
❌ **No request abortion** - Can't cancel in-flight requests
❌ **Simple caching** - Just stores last completion text, no speculative cache
❌ **No char-by-char cache** - Doesn't prefetch like Refact
❌ **Rust-only** - Not portable to TypeScript (Puku's constraint)
❌ **GPUI dependency** - Tightly coupled to Zed's framework

---

## Competitive Comparison

### How Zed Compares to Other Implementations

| Feature | **Zed** | **Puku** | **Aide** | **Refact** |
|---------|---------|----------|----------|------------|
| **Debounce** | 75ms ⭐ | 200-800ms | 350ms | 0ms ⭐ |
| **Diff-based rendering** | ✅ ⭐ | ❌ | ❌ | ❌ |
| **Position validation** | ✅ ⭐ | ❌ | ❌ | ✅ |
| **Streaming** | ❌ | ❌ | ✅ ⭐ | ❌ |
| **Request abortion** | ❌ | ❌ | ✅ ⭐ | ❌ |
| **Caching** | Text-based | Speculative + Radix Trie ⭐ | Prefix overlap | Char-by-char ⭐ |
| **Context gathering** | Optional (AST) | Semantic + imports ⭐ | LSP types | AST/VecDB |
| **Refresh gating** | ✅ ⭐ | ❌ | ❌ | ❌ |
| **Edit interpolation** | ✅ ⭐ | ❌ | ❌ | ❌ |
| **Language** | Rust | TypeScript | TypeScript/Python | Rust |

**Zed wins:** 5/10 categories (debounce, diff rendering, position validation, refresh gating, edit interpolation)

---

## What Puku Can Learn from Zed

### 1. Diff-Based Rendering (Priority: **MEDIUM**)

**Benefit:** Handle race conditions where user types faster than API responds.

**Implementation:**
```typescript
function completionFromDiff(
  completionText: string,
  bufferText: string,
  position: vscode.Position
): vscode.InlineCompletionItem[] {
  const completionGraphemes = [...completionText]; // Unicode graphemes
  const bufferGraphemes = [...bufferText];

  const edits: Array<{ range: vscode.Range; text: string }> = [];

  let i = 0; // completion index
  let j = 0; // buffer index
  let offset = position.character;

  while (i < completionGraphemes.length && j < bufferGraphemes.length) {
    // Find next buffer[j] in completion[i..]
    const k = completionGraphemes.slice(i).indexOf(bufferGraphemes[j]);

    if (k !== -1) {
      if (k > 0) {
        // Insert inlay for completion[i..i+k]
        const inlay = completionGraphemes.slice(i, i + k).join('');
        edits.push({
          range: new vscode.Range(position.line, offset, position.line, offset),
          text: inlay,
        });
      }
      i += k + 1;
      j += 1;
      offset += bufferGraphemes[j - 1].length;
    } else {
      break; // No more matches
    }
  }

  // Remaining completion text
  if (j === bufferGraphemes.length && i < completionGraphemes.length) {
    const remaining = completionGraphemes.slice(i).join('');
    edits.push({
      range: new vscode.Range(position.line, offset, position.line, offset),
      text: remaining,
    });
  }

  // Convert edits to InlineCompletionItem
  return edits.map(edit => ({
    insertText: edit.text,
    range: edit.range,
  }));
}
```

**Why this helps:**
- User types "xy" while API returns "axbyc" → shows "[a]x[b]y[c]" (graceful!)
- Reduces jarring "completion disappeared" experience
- Works with existing caching strategies

---

### 2. Position Validation (Priority: **HIGH**)

**Benefit:** Prevent stale completions from showing after cursor moves.

**Implementation:**
```typescript
class PukuInlineCompletionProvider {
  private completionPosition: vscode.Position | null = null;

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    // Check if cursor moved since last completion
    if (this.completionPosition && !this.completionPosition.isEqual(position)) {
      this.resetCache(); // Clear stale completion
      this.completionPosition = null;
    }

    // ... fetch completion ...

    // Store position when we get completion
    this.completionPosition = position;

    return completions;
  }

  private resetCache() {
    this.lastCompletion = null;
    this.completionPosition = null;
  }
}
```

**Why this helps:**
- No ghost text when user moves cursor
- Prevents confusing stale completions
- Simple to implement (~10 lines)

---

### 3. Refresh Gating (Priority: **HIGH**)

**Benefit:** Only trigger new completions on text changes, not cursor movement.

**Implementation:**
```typescript
async provideInlineCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.InlineCompletionContext,
  token: vscode.CancellationToken
): Promise<vscode.InlineCompletionItem[] | undefined> {
  // Only make new requests on text changes (not cursor movement)
  if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
    // Check if this was a cursor movement without text change
    const lastText = this.lastDocumentText;
    const currentText = document.getText();

    if (lastText === currentText) {
      // Cursor moved but no text changed → don't fetch
      return undefined;
    }

    this.lastDocumentText = currentText;
  }

  // ... proceed with fetch ...
}
```

**Why this helps:**
- Reduces API calls by 30-50%
- Better performance (no wasted requests)
- Simple to implement (~5 lines)

---

### 4. Faster Debounce (Priority: **LOW**)

**Current:** 800ms debounce
**Zed:** 75ms debounce

**Consideration:** Zed can use 75ms because they have:
- Diff-based rendering (handles partial input)
- Refresh gating (no cursor movement requests)
- Local Copilot/Supermaven servers (low latency)

**For Puku:**
- Our 800ms debounce is justified (cloud API, higher latency)
- **BUT** with client char cache (Priority 1), we can reduce to 200-400ms
- Char cache handles instant follow-up completions → debounce becomes less critical

---

## Recommendations

### Phase 1: Position Validation & Refresh Gating (Priority: **HIGH**)
**Effort:** 1 day | **Cost:** $0 | **Benefit:** Better UX, fewer API calls

Implement Zed's position validation and refresh gating:
- Store `completionPosition: vscode.Position | null`
- Check `position.isEqual(completionPosition)` before suggesting
- Gate requests on text changes (not cursor movement)

**Expected impact:**
- 30-50% fewer API calls
- No stale completions
- Cleaner UX

---

### Phase 2: Diff-Based Rendering (Priority: **MEDIUM**)
**Effort:** 2-3 days | **Cost:** $0 | **Benefit:** Graceful race condition handling

Adapt Zed's `completion_from_diff()` for TypeScript:
- Match completion against buffer text grapheme-by-grapheme
- Insert inlays only for unmatched parts
- Handle partial user input gracefully

**Expected impact:**
- Better UX when user types faster than API
- Smoother completion experience
- Works with existing caching

---

### Phase 3: Edit Interpolation (Priority: **LOW**)
**Effort:** 3-5 days | **Cost:** $0 | **Benefit:** Smooth prefix-typing experience

Implement `interpolate_edits()` to adjust predictions as user types:
- Track buffer versions
- Strip user-typed prefix from completion
- Update inlays dynamically

**Expected impact:**
- Smoother acceptance flow
- Less jarring text changes
- More polished experience

---

## Summary

### Zed's Key Innovations:

1. **Diff-based rendering** - Handles partial user input gracefully
2. **Position validation** - Prevents stale completions
3. **Refresh gating** - No requests on cursor movement
4. **Edit interpolation** - Adjusts predictions as user types prefix
5. **Fastest debounce** - 75ms (aggressive but works with above features)

### What Puku Should Adopt:

| Feature | Priority | Effort | Cost | Benefit |
|---------|----------|--------|------|---------|
| **Position validation** | HIGH | 1 day | $0 | Better UX, no stale completions |
| **Refresh gating** | HIGH | 1 day | $0 | 30-50% fewer API calls |
| **Diff-based rendering** | MEDIUM | 2-3 days | $0 | Graceful race condition handling |
| **Edit interpolation** | LOW | 3-5 days | $0 | Smooth prefix-typing experience |

### What Puku Already Does Better:

- ✅ **Context gathering** - Semantic search + imports (vs optional AST)
- ✅ **Caching** - Speculative + Radix Trie (vs simple text cache)
- ✅ **Model** - Codestral Mamba (native FIM, 256k context)
- ✅ **Cost** - ~$5/month vs self-hosted Copilot/Supermaven

---

## File References

### Zed Source Files:
- **Copilot provider:** `reference/zed/crates/copilot/src/copilot_completion_provider.rs`
- **Supermaven provider:** `reference/zed/crates/supermaven/src/supermaven_completion_provider.rs`
- **EditPrediction core:** `reference/zed/crates/edit_prediction/src/edit_prediction.rs`
- **Context gathering:** `reference/zed/crates/edit_prediction_context/src/edit_prediction_context.rs`

### Puku Implementation:
- **Client:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`
- **Backend:** `puku-worker/src/routes/completions.ts`
- **Caches:** `src/chat/src/extension/pukuai/common/completionsCache.ts`

---

**Last Updated:** 2025-12-02
**Status:** Research complete, awaiting prioritization
**Next Steps:** Review findings with team, decide which features to implement
