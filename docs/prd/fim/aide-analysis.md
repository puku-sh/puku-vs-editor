# Aide FIM Architecture Analysis - Key Findings

> **Status:** 📋 **RESEARCH PHASE - NOT YET IMPLEMENTED**
>
> This document contains competitive analysis of Aide's FIM implementation.
> Features described here are **planned improvements** for Puku FIM, not current functionality.
> Implementation tracked in GitHub issues: [#17](https://github.com/puku/puku-editor/issues/17), [#18](https://github.com/puku/puku-editor/issues/18)

## 🔍 Research Summary

After analyzing Aide's reference implementation, I've identified their complete FIM architecture from client to backend. Here's what makes their approach work:

---

## 📊 Architecture Comparison: Aide vs Puku

### **1. CLIENT ARCHITECTURE**

#### **Aide's Approach** (`sidecarCompletion.ts`)
```typescript
// Multi-layered caching + streaming line-by-line
class SidecarCompletionProvider {
  - DEBOUNCE: 350ms (DEBOUNCE_DELAY)
  - Cached completions (displayed vs current text matching)
  - Multi-line detection (detectMultiline)
  - Context preparation (getPromptHelper, getCurrentDocContext)
  - Clipboard integration
  - Type definitions from LSP (identifierNodes)
  - Request lifecycle: debounce → cache check → streaming response
}
```

#### **Puku's Approach** (`pukuInlineCompletionProvider.ts`)
```typescript
// Speculative caching + Radix Trie + context flows
class PukuInlineCompletionProvider {
  - DEBOUNCE: 200ms → 800ms (adaptive)
  - Speculative cache (stores REQUEST FUNCTIONS)
  - Radix Trie cache (intelligent prefix matching)
  - Context flows: comments, imports, semantic search
  - Language hints (fixes hallucinations)
  - Request lifecycle: cache check BEFORE debounce → flows → API
}
```

**Key Differences:**
- ✅ **Puku has BETTER caching** (speculative + Radix Trie vs simple cache)
- ✅ **Puku has SMARTER context** (semantic search + import detection vs basic LSP types)
- ❌ **Aide has LINE-BY-LINE streaming** (Puku fetches full completion)
- ❌ **Aide has more aggressive debounce** (350ms vs Puku's 200ms base)

---

### **2. REQUEST MANAGER** (Cache + Request Lifecycle)

#### **Aide's RequestManager** (`request-manager.ts`)
```typescript
class RequestManager {
  - LRU cache for completed requests
  - Prefix overlap detection (reuse if prefix matches)
  - Completion string cache: stores "prefix + completion"
  - Abort previous request if prefix doesn't match
  - Cache hit → instant return of remaining text
}
```

**Example flow:**
```typescript
// User types "func ma"
// Completion: "func main() {}"
// Cache stores: "func main() {}"

// User types "func mai"
// Prefix overlap detected → return "n() {}"  ✅ INSTANT
```

#### **Puku's Cache Strategy**
```typescript
// 1. Speculative Cache (request functions)
cache.set(completionId, () => fetch(endpoint, ...))
if (cache.has(lastCompletionId)) return cache.request(completionId)

// 2. Radix Trie Cache (intelligent matching)
cache.insert(prefix, completion)
cache.search(newPrefix) // Handles typing, backspace, partial edits
```

**Key Insight:**
- Aide's prefix overlap = simple string matching
- Puku's Radix Trie = **structural understanding** of code prefixes

---

### **3. BACKEND ARCHITECTURE**

#### **Aide's Backend** (`/api/inline_completion/inline_completion`)
```python
# FastAPI/Rust backend (sidecar)
{
  "filepath": str,
  "language": str,
  "text": str,  # FULL document text
  "position": { line, character, byteOffset },
  "model_config": {...},
  "clipboard_content": str,
  "type_identifiers": [...],  # LSP type info
  "user_id": str
}
```

**Features:**
- ✅ **Sends FULL document** (not just prefix/suffix)
- ✅ **Type identifiers from LSP** (for better context)
- ✅ **Server-side streaming** (line-by-line via SSE)
- ✅ **Model configuration per request**
- ✅ **User tracking for analytics**

#### **Puku's Backend** (`/v1/fim/context`)
```typescript
// Cloudflare Workers (Hono.js)
{
  "prompt": str,      // Enhanced prefix with context
  "suffix": str,
  "language": str,    // Language hint
  "openFiles": [...], // Semantic search results
  "max_tokens": 100,
  "temperature": 0.1
}
```

**Features:**
- ✅ **Language hints** (fixes hallucinations)
- ✅ **Semantic search context** (relevant code snippets)
- ✅ **Lightweight payload** (prefix/suffix only, not full document)
- ❌ **No streaming** (single completion response)
- ❌ **No LSP type info** (relies on semantic search instead)

---

### **4. STREAMING IMPLEMENTATION**

#### **Aide's Streaming** (`inlineCompletionTextNewLine`)
```typescript
// Server-Sent Events (SSE) streaming
async *inlineCompletionTextNewLine() {
  const stream = await callServerEventStreamingBufferedPOST(url, body)

  for await (const line of stream) {
    // Parse: data:"{...completion...}"
    const response = JSON.parse(line)
    const delta = response.delta  // Incremental text

    // Buffer logic:
    // - Accumulate until newline
    // - Yield complete lines progressively
    // - Handle \n prefix for multi-line

    if (delta === '\n') { /* new line detected */ }
    yield { completion, stopReason, delta }
  }
}
```

**Why this matters:**
- Shows **partial completions** as they stream (better UX)
- User sees completion **line-by-line** (feels faster)
- Can **cancel mid-stream** if user types ahead

#### **Puku's Non-Streaming**
```typescript
// Single fetch, full completion
const response = await fetch(endpoint, {...})
const completion = await response.json()
return completion.choices[0].text
```

**Trade-off:**
- ❌ No progressive display (wait for full response)
- ✅ Simpler implementation (no SSE handling)
- ✅ Better for speculative caching (store complete result)

---

## 💡 Key Architectural Insights

### **What Aide Does Better:**

1. **Line-by-Line Streaming**
   - Better perceived performance (shows progress)
   - Can cancel mid-stream (saves tokens)
   - More responsive to user typing

2. **Full Document Context**
   - Sends entire file to backend (better context)
   - LSP type definitions (better type awareness)
   - Backend can analyze full AST

3. **Request Lifecycle Management**
   - Prefix overlap detection (smart cache reuse)
   - Abort previous requests automatically
   - Completion string caching (instant prefix matches)

### **What Puku Does Better:**

1. **Speculative Caching** (Copilot-style)
   - Stores REQUEST FUNCTIONS (lazy evaluation)
   - Cache check BEFORE debounce (instant hits)
   - Prefetch next completion (faster follow-ups)

2. **Radix Trie Cache**
   - Structural understanding (not just string matching)
   - Handles typing, backspace, partial edits
   - File-aware caching (separate per file)

3. **Smart Context Gathering**
   - Semantic search (finds relevant code)
   - Import detection (includes referenced files)
   - Language hints (prevents hallucinations)

4. **Lightweight Backend**
   - Cloudflare Workers (serverless, fast)
   - Prefix/suffix only (smaller payloads)
   - No server state (scales infinitely)

---

## 🎯 Recommendations for Puku

### **High Priority: Add Streaming**
```typescript
// Implement SSE streaming like Aide
completions.post('/v1/fim/context', async (c) => {
  return streamSSE(c, async (stream) => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      // Emit line-by-line like Aide
      yield { completion, delta, stopReason }
    }
  })
})
```

**Benefits:**
- Better UX (progressive display)
- Can cancel mid-stream
- Perceived faster performance

### **Medium Priority: Request Manager**
```typescript
// Add prefix overlap detection like Aide
class RequestManager {
  private completionCache: string | undefined

  async requestPlain(params) {
    const prefix = params.docContext.prefix

    // Check if prefix matches cached completion
    if (this.completionCache?.startsWith(prefix)) {
      const remaining = this.completionCache.substring(prefix.length)
      return { completion: remaining, source: 'Cache' }
    }

    // Otherwise, abort previous and start new
    this.previousRequest?.abort()
    // ... fetch new completion
  }
}
```

### **Low Priority: Full Document Context**
```typescript
// Option to send full document (not just prefix/suffix)
{
  "text": document.getText(),  // Full file
  "position": { line, character, byteOffset },
  "language": document.languageId
}
```

**Trade-off:** Larger payloads vs better context

---

## 📝 Implementation Priority

### **Phase 1: Streaming (2-3 days)**
- Implement SSE streaming in `/v1/fim/context`
- Update client to handle progressive responses
- Add line-by-line buffering logic

### **Phase 2: Request Manager (1-2 days)**
- Add prefix overlap detection
- Implement completion string caching
- Add request abortion logic

### **Phase 3: Full Document Context (Optional)**
- Add full document sending
- Update backend to analyze full AST
- Compare performance vs current approach

---

## 🔑 Key Takeaway

**Aide's strength:** Robust streaming + prefix overlap caching
**Puku's strength:** Speculative caching + smart context gathering

**Best of both worlds:** Puku's context intelligence + Aide's streaming UX

The biggest missing piece in Puku is **streaming** - everything else is already competitive or better than Aide.

---

## 📂 File References

### Aide Implementation
- Client: `reference/aide/extensions/codestory/src/inlineCompletion/sidecarCompletion.ts`
- Provider: `reference/aide/extensions/codestory/src/completions/providers/sidecarProvider.ts`
- Request Manager: `reference/aide/extensions/codestory/src/completions/request-manager.ts`
- Client API: `reference/aide/extensions/codestory/src/sidecar/client.ts` (line 628-762)
- Main Flow: `reference/aide/extensions/codestory/src/completions/get-inline-completions.ts`
- Context: `reference/aide/extensions/codestory/src/completions/get-current-doc-context.ts`

### Puku Implementation
- Client: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`
- Backend: `puku-worker/src/routes/completions.ts`
- Cache: `src/chat/src/extension/pukuai/common/completionsCache.ts`
- Flows: `src/chat/src/extension/pukuai/vscode-node/flows/`

---

## 🧪 Key Code Patterns to Study

### 1. Aide's Prefix Overlap Cache
```typescript
// From request-manager.ts:106-129
const prefix = requestParams.docContext.prefix
const completionCacheString = this.completionCache

if (completionCacheString) {
  const equalStart = completionCacheString.startsWith(prefix)
  if (equalStart) {
    // Instant cache hit - return remaining text
    const remainingCompletion = completionCacheString.substring(prefix.length)
    const completionToShow = remainingCompletion.trimRight()
    return {
      completions: [{ insertText: completionToShow, ... }],
      source: InlineCompletionsResultSource.Cache,
    }
  } else {
    // Prefix doesn't match - abort previous request
    this.previousRequest?.abort()
    this.completionCache = undefined
  }
}
```

### 2. Aide's Line-by-Line Streaming
```typescript
// From client.ts:628-762
for await (const line of asyncIterableResponse) {
  const delta = editFileResponse.completions[0].delta

  if (delta === null || delta === undefined) {
    // End of completion
    yield { completion: finalAnswer, stopReason: RequestFinished }
    return
  }

  // Buffer until newline
  bufferedAnswer = bufferedAnswer + delta

  while (true) {
    const indexOfNewLine = bufferedAnswer.indexOf('\n')
    if (indexOfNewLine === -1) break

    const completeLine = bufferedAnswer.substring(0, indexOfNewLine)
    const finalCompletion = prefix + runningPreviousLines + '\n' + completeLine

    yield { completion: finalCompletion, stopReason: StreamingChunk }

    runningPreviousLines += '\n' + completeLine
    bufferedAnswer = bufferedAnswer.substring(indexOfNewLine + 1)
  }
}
```

### 3. Puku's Speculative Cache (Keep This!)
```typescript
// From pukuInlineCompletionProvider.ts:106-129
class SpeculativeRequestCache {
  async request(completionId: string): Promise<string | null> {
    const fn = this.cache.get(completionId)
    if (fn === undefined) return null

    this.cache.delete(completionId)
    return await fn()  // Execute lazy function
  }
}

// Usage:
if (this._speculativeCache.has(lastCompletionId)) {
  // Instant cache hit - BEFORE debounce!
  const cachedCompletion = await this._speculativeCache.request(lastCompletionId)
  if (cachedCompletion) return [new vscode.InlineCompletionItem(cachedCompletion)]
}
```

---

## 🚀 Next Steps

1. **Test streaming locally** with Aide's reference backend
2. **Benchmark**: Aide streaming vs Puku's current approach
3. **Implement hybrid**: Keep Puku's caching + Add Aide's streaming
4. **A/B test**: Measure completion acceptance rates
