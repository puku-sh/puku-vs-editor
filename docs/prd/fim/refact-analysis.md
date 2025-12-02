# Refact FIM Architecture Analysis - Key Findings

> **Status:** 📋 **RESEARCH PHASE - NOT YET IMPLEMENTED**
>
> This document contains competitive analysis of Refact's FIM implementation.
> Features described here are **planned improvements** for Puku FIM, not current functionality.
> The character-by-character caching strategy is particularly innovative but not yet implemented in Puku.

## 🔍 Research Summary

After analyzing Refact's FIM implementation, I've identified their complete architecture from client to Rust backend. Here's what makes their approach unique:

---

## 📊 Architecture Comparison: Refact vs Aide vs Puku

### **1. CLIENT ARCHITECTURE**

#### **Refact's Approach** (`completionProvider.ts`)
```typescript
// Simple provider + Rust sidecar backend
class MyInlineCompletionProvider {
  - NO debounce in client (handled by backend cache)
  - NO client-side caching (all caching in backend)
  - Multiline detection (empty left of cursor)
  - Right-of-cursor validation (only special chars allowed)
  - Temperature escalation on manual invokes (0.2 → 0.6)
  - File size limit: 180KB max
  - Unicode-aware cursor position correction
}
```

**Key Features:**
- No debounce (backend cache is instant)
- Adaptive temperature (manual invoke = higher creativity)
- Right-cursor validation (blocks mid-word completions)
- UCS-2 encoding correction for emojis/Chinese chars

#### **Aide's Approach** (`sidecarCompletion.ts`)
```typescript
class SidecarCompletionProvider {
  - DEBOUNCE: 350ms
  - Cached completions (displayed vs current text matching)
  - Multi-line detection (detectMultiline)
  - Context preparation (getPromptHelper, getCurrentDocContext)
  - Clipboard integration
  - Type definitions from LSP (identifierNodes)
}
```

#### **Puku's Approach** (`pukuInlineCompletionProvider.ts`)
```typescript
class PukuInlineCompletionProvider {
  - DEBOUNCE: 200ms → 800ms (adaptive)
  - Speculative cache (stores REQUEST FUNCTIONS)
  - Radix Trie cache (intelligent prefix matching)
  - Context flows: comments, imports, semantic search
  - Language hints (fixes hallucinations)
}
```

**Comparison:**
| Feature | Refact | Aide | Puku |
|---------|--------|------|------|
| Debounce | ❌ None (backend handles) | 350ms | 200-800ms |
| Client Cache | ❌ No | ✅ Simple prefix | ✅ Speculative + Radix |
| Context Gathering | ❌ Sends full doc | ✅ LSP types | ✅ Semantic search |
| Streaming | ❌ No | ✅ Line-by-line | ❌ No |

---

### **2. BACKEND ARCHITECTURE**

#### **Refact's Backend** (`/v1/code-completion`)
```rust
// Rust + Axum backend with aggressive caching
{
  "inputs": {
    "sources": { "filename.py": "full file content" },
    "cursor": { "file": "filename.py", "line": 10, "character": 5 },
    "multiline": true
  },
  "parameters": {
    "max_new_tokens": 50,
    "temperature": 0.2
  },
  "model": "",
  "stream": false,
  "no_cache": false,
  "use_ast": true,
  "use_vecdb": false,
  "rag_tokens_n": 0
}
```

**Response:**
```json
{
  "choices": [{
    "index": 0,
    "code_completion": "def foo():\n    pass",
    "finish_reason": "stop"
  }],
  "model": "deepseek-coder-1.3b",
  "cached": false,
  "snippet_telemetry_id": 12345
}
```

**Key Features:**
- ✅ **Sends FULL document** (like Aide)
- ✅ **AST support** (`use_ast: true` for better context)
- ✅ **VecDB support** (optional RAG-based context)
- ✅ **Streaming support** (optional, not used by default)
- ✅ **Aggressive caching** (character-by-character prefetch)
- ✅ **User-configurable model**

---

### **3. CACHING IMPLEMENTATION** (🔥 **MOST INNOVATIVE**)

Refact's caching is **character-by-character prefetch**, not just prefix matching:

```rust
// completion_cache.rs:155-173
impl Drop for CompletionSaveToCache {
    fn drop(&mut self) {
        // When completion finishes, cache EVERY character position ahead!
        for char_num in 0..believe_chars {
            // If completion is "def foo():\n    pass"
            // Cache keys:
            // - "def " → "foo():\n    pass"
            // - "def f" → "oo():\n    pass"
            // - "def fo" → "o():\n    pass"
            // - "def foo" → "():\n    pass"
            // ... and so on for EVERY character!

            let code_completion_ahead = completion_text.skip(char_num);
            let cache_key_ahead = original_key + completion_text.take(char_num);

            cache_put(cache_arc, cache_key_ahead, {
                "choices": [{ "code_completion": code_completion_ahead }]
            });
        }
    }
}
```

**Example flow:**
```typescript
// User types "de"
// Backend returns: "def main():\n    pass"
// Backend IMMEDIATELY caches:
cache["de"] = "def main():\n    pass"
cache["def"] = " main():\n    pass"
cache["def "] = "main():\n    pass"
cache["def m"] = "ain():\n    pass"
cache["def ma"] = "in():\n    pass"
cache["def mai"] = "n():\n    pass"
cache["def main"] = "():\n    pass"
... (for EVERY character!)

// User types "def" → INSTANT cache hit! ✅
// User types "def " → INSTANT cache hit! ✅
// User types "def m" → INSTANT cache hit! ✅
```

**Cache Configuration:**
```rust
const CACHE_ENTRIES: usize = 500;        // Max 500 completions
const CACHE_KEY_CHARS: usize = 5000;     // Last 5000 chars of context
// Memory: 5000 * 500 = 2.5MB
```

**Cache Key:**
```rust
// Key = (last 5000 chars before cursor, multiline/singleline)
cache_key_from_post() {
    let prefix = last_5000_chars_before_cursor(doc, cursor);
    let suffix = multiline ? "multiline" : "singleline";
    return (prefix, suffix);
}
```

#### **Comparison:**

| Feature | Refact | Aide | Puku |
|---------|--------|------|------|
| Cache Type | Character-by-character prefetch | Prefix overlap | Speculative + Radix Trie |
| Cache Location | Backend (Rust) | Client (TypeScript) | Client (TypeScript) |
| Cache Size | 500 completions (2.5MB) | LRU cache | Radix Trie + Request functions |
| Cache Hits | Instant (no API call) | Instant (no API call) | Instant (bypasses debounce) |
| Cache Invalidation | LRU (oldest removed) | Abort on prefix mismatch | TTL-based |

**Why this is brilliant:**

1. **No debounce needed** - Cache hits are instant (no network call)
2. **Covers user typing** - As user accepts completion char-by-char, cache pre-populated
3. **Handles backspace** - Prefix overlap naturally handles deletion
4. **Backend-side** - Shared across all clients (VS Code, JetBrains, etc.)
5. **Low memory** - Only 2.5MB for 500 completions

---

### **4. STREAMING (OPTIONAL)**

Refact supports streaming but **doesn't use it by default**:

```typescript
// fetchAPI.ts:95-152
supply_stream(h2stream: Promise<fetchH2.Response>) {
    h2stream.then(async (result_stream) => {
        if (this.streaming_callback) {
            let readable = await result_stream.readable();
            readable.on("readable", async () => {
                while (1) {
                    let chunk = readable.read();
                    if (chunk === null) break;

                    this.streaming_buf += chunk.toString();
                    await this.look_for_completed_data_in_streaming_buf();
                }
            });
        } else {
            // Not streaming (default)
            let json_arrived = await result_stream.json();
            resolve(json_arrived);
        }
    });
}
```

**Streaming format:**
```
data: {"choices":[{"delta":"def "}]}

data: {"choices":[{"delta":"main"}]}

data: {"choices":[{"delta":"():"}]}

data: [DONE]
```

**Why streaming is NOT used by default:**
- Character-by-character caching provides instant results
- No need for progressive display (cache hits are instant)
- Simplifies client implementation

---

### **5. AST & VECDB SUPPORT**

Refact's backend can use AST/VecDB for context:

```rust
// code_completion.rs:60-67
let ast_service_opt = gcx.read().await.ast_service.clone();
let mut scratchpad = scratchpads::create_code_completion_scratchpad(
    gcx.clone(),
    &model_rec,
    &code_completion_post.clone(),
    cache_arc.clone(),
    tele_storage.clone(),
    ast_service_opt  // Optional AST indexing
).await
```

**AST Indexing:**
- Parses codebase with tree-sitter
- Extracts symbols, definitions, references
- Provides intelligent context to model

**VecDB (RAG):**
- Embeds code chunks
- Semantic search for relevant snippets
- Similar to Puku's semantic search

---

## 💡 Key Architectural Insights

### **What Refact Does Better:**

1. **Character-by-Character Caching** ⭐⭐⭐
   - Most innovative caching strategy seen
   - Pre-populates cache for every typed character
   - Eliminates debounce entirely
   - Instant completions after first model call

2. **Backend-Side Caching**
   - Shared across all clients
   - Lower memory on client
   - Easier to debug/monitor

3. **Adaptive Temperature**
   - 0.2 for automatic completions (deterministic)
   - 0.6 for manual invokes (creative)
   - Escalates on repeated manual invokes

4. **Right-Cursor Validation**
   - Only suggests when right of cursor is empty or special chars
   - Prevents mid-word completions
   - Cleaner UX

5. **AST + VecDB Support**
   - Optional intelligent context
   - Similar to Puku's semantic search
   - Backend handles complexity

### **What Puku Does Better:**

1. **Speculative Caching**
   - Stores REQUEST FUNCTIONS (lazy evaluation)
   - Cache check BEFORE debounce
   - Prefetches next completion

2. **Radix Trie Cache**
   - Structural understanding (not just string matching)
   - Handles typing, backspace, partial edits
   - File-aware caching

3. **Smart Context Gathering**
   - Semantic search (finds relevant code)
   - Import detection (includes referenced files)
   - Language hints (prevents hallucinations)

4. **Lightweight Backend**
   - Cloudflare Workers (serverless, fast)
   - Prefix/suffix only (smaller payloads)
   - No server state (scales infinitely)

### **What Aide Does Better:**

1. **Line-by-Line Streaming**
   - Progressive display
   - Better perceived performance
   - Can cancel mid-stream

2. **Request Abortion**
   - Aborts in-flight on backspace
   - Saves tokens

---

## 🎯 Recommendations for Puku

### **High Priority: Character-by-Character Cache (Backend)**

Implement Refact's character-by-character caching strategy on the backend:

```typescript
// puku-worker/src/routes/completions.ts
completions.post('/v1/fim/context', async (c) => {
  const { prompt, suffix, ... } = await c.req.json();

  // Check cache first
  const cacheKey = getCacheKey(prompt, suffix);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return c.json(cached); // Instant!
  }

  // Call model
  const completion = await callCodestralMamba(...);

  // Cache EVERY character ahead (Refact-style)
  for (let i = 0; i < completion.length; i++) {
    const keyAhead = cacheKey + completion.substring(0, i);
    const valueAhead = completion.substring(i);
    await cache.set(keyAhead, { choices: [{ text: valueAhead }] });
  }

  return c.json(completion);
});
```

**Benefits:**
- Eliminates client-side debounce (cache hits are instant)
- Works with existing Radix Trie (complementary)
- Backend-side (shared across clients)
- Proven by Refact

**Implementation:**
- Use Cloudflare KV or Durable Objects for distributed cache
- TTL: 5 minutes (like Refact)
- Max size: 500 entries (2.5MB)

### **Medium Priority: Right-Cursor Validation**

```typescript
// pukuInlineCompletionProvider.ts
const currentLine = document.lineAt(position.line);
const rightOfCursor = currentLine.text.substring(position.character);
const rightIsEmpty = /^[:\s\t\n\r(){},."'\];]*$/.test(rightOfCursor);

if (!rightIsEmpty) {
  return []; // Don't suggest mid-word
}
```

**Benefits:**
- Cleaner UX (no mid-word suggestions)
- Less confusing for users
- Matches Refact/GitHub Copilot behavior

### **Low Priority: Adaptive Temperature**

```typescript
// Track manual invoke count
let manualInvokeCount = 0;

if (context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke) {
  manualInvokeCount++;
  temperature = manualInvokeCount > 1 ? 0.6 : 0.2;
} else {
  manualInvokeCount = 0;
  temperature = 0.2;
}
```

**Benefits:**
- First manual invoke: deterministic (0.2)
- Repeated invokes: creative (0.6)
- Better for exploring alternatives

---

## 📝 Implementation Priority

### **Phase 1: Character-by-Character Cache (Backend)** (3-5 days)
- Implement cache logic in puku-worker
- Use Cloudflare KV for distributed cache
- Test cache hit rates

### **Phase 2: Right-Cursor Validation (Client)** (1 day)
- Add validation in pukuInlineCompletionProvider
- Test edge cases (comments, strings, etc.)

### **Phase 3: Adaptive Temperature (Optional)** (1 day)
- Add manual invoke tracking
- Test temperature escalation

---

## 🔑 Key Takeaway

**Refact's strength:** Character-by-character backend caching (eliminates debounce)
**Puku's strength:** Speculative caching + smart context gathering
**Aide's strength:** SSE streaming + request abortion

**Best of all worlds:** Puku's context intelligence + Refact's character caching + Aide's streaming

The biggest missing piece in Puku is **Refact's character-by-character backend caching** - this would eliminate debounce entirely and provide instant completions after the first model call.

---

## 📂 File References

### Refact Implementation
- Client: `reference/refact/refact-vscode/src/completionProvider.ts`
- Fetch API: `reference/refact/refact-vscode/src/fetchAPI.ts`
- Backend: `reference/refact/refact-agent/engine/src/http/routers/v1/code_completion.rs`
- Cache: `reference/refact/refact-agent/engine/src/completion_cache.rs`
- Validation: `reference/refact/refact-agent/engine/src/call_validation.rs`

### Puku Implementation
- Client: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`
- Backend: `puku-worker/src/routes/completions.ts`
- Cache: `src/chat/src/extension/pukuai/common/completionsCache.ts`

---

## 🧪 Key Code Patterns to Study

### 1. Refact's Character-by-Character Cache

```rust
// completion_cache.rs:155-173
impl Drop for CompletionSaveToCache {
    fn drop(&mut self) {
        // When completion finishes, save EVERY character ahead
        for char_num in 0..believe_chars {
            let code_completion_ahead: String =
                self.completion0_text.chars().skip(char_num).collect();

            let cache_key_ahead: (String, String) = (
                self.cache_key.0.clone() +
                &self.completion0_text.chars().take(char_num).collect::<String>(),
                self.cache_key.1.clone()
            );

            cache_put(self.cache_arc.clone(), cache_key_ahead, serde_json::json!({
                "choices": [{
                    "code_completion": code_completion_ahead,
                    "finish_reason": self.completion0_finish_reason,
                }],
                "model": self.model,
                "cached": true,
                "snippet_telemetry_id": self.completion0_snippet_telemetry_id,
            }));
        }
    }
}
```

### 2. Refact's Right-Cursor Validation

```typescript
// completionProvider.ts:37-40
let right_of_cursor = current_line.text.substring(position.character);
let right_of_cursor_has_only_special_chars =
    Boolean(right_of_cursor.match(/^[:\s\t\n\r(){},."'\];]*$/));

if (!right_of_cursor_has_only_special_chars) {
    return []; // Don't suggest mid-word
}
```

### 3. Refact's Adaptive Temperature

```typescript
// completionProvider.ts:130-139
let temperature = 0.2;
if (this.called_manually_count > 1) {
    temperature = 0.6; // Escalate creativity on repeated manual invokes
}
```

### 4. Puku's Speculative Cache (Keep This!)

```typescript
// pukuInlineCompletionProvider.ts:106-129
class SpeculativeRequestCache {
  async request(completionId: string): Promise<string | null> {
    const fn = this.cache.get(completionId);
    if (fn === undefined) return null;

    this.cache.delete(completionId);
    return await fn(); // Execute lazy function
  }
}

// Usage:
if (this._speculativeCache.has(lastCompletionId)) {
  const cachedCompletion = await this._speculativeCache.request(lastCompletionId);
  if (cachedCompletion) return [new vscode.InlineCompletionItem(cachedCompletion)];
}
```

---

## 🚀 Next Steps

1. **Test character-by-character caching locally** with Refact's backend
2. **Benchmark**: Refact caching vs Puku's current approach
3. **Implement hybrid**: Keep Puku's caching + Add Refact's character cache
4. **A/B test**: Measure completion acceptance rates

---

## 📊 Final Comparison Table

| Feature | Refact | Aide | Puku |
|---------|--------|------|------|
| **Model** | User-configurable | Claude Haiku/Sonnet | Codestral Mamba |
| **Latency** | 200-500ms (with cache) | 500-1500ms | 200-500ms |
| **Context** | Full doc + AST/VecDB | LSP types + clipboard | Semantic search + imports |
| **Caching** | ⭐ Char-by-char (backend) | Prefix overlap | Speculative + Radix Trie |
| **Streaming** | ❌ Optional (not used) | ✅ Line-by-line | ❌ No |
| **Debounce** | ❌ None (cache handles) | 350ms | 200-800ms |
| **Backend** | Rust (Axum) | Python/Rust (FastAPI) | Cloudflare Workers |
| **Right-cursor validation** | ✅ Yes | ❌ No | ❌ No |
| **Adaptive temperature** | ✅ Yes | ❌ No | ❌ No |

**Winner in each category:**
- **Caching**: Refact (char-by-char)
- **Context**: Puku (semantic search)
- **Streaming**: Aide (line-by-line)
- **Simplicity**: Refact (no debounce)
- **Scalability**: Puku (serverless)
