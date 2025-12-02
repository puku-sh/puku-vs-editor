# Supermaven sm-agent Research Findings

**Date:** 2025-11-27
**Binary Version:** 8.0.0

## Critical Discovery

**sm-agent is NOT a local inference engine.** It's a thin client that:
1. Collects code context locally
2. Uploads context to Supermaven edge servers
3. Receives completions from cloud-based Babble model
4. Returns completions to the editor

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│   Editor    │─────▶│  sm-agent    │─────▶│ Supermaven Edge  │
│ (Neovim/VS) │      │  (local bin) │      │   Servers (WS)   │
└─────────────┘      └──────────────┘      └──────────────────┘
                            ▲                        │
                            │                        ▼
                            │                 ┌──────────────┐
                            └─────────────────│ Babble Model │
                              (completions)   │  (300k ctx)  │
                                              └──────────────┘
```

## Architecture

### Communication Protocol

**Client → sm-agent (stdin/stdout):**
```json
// 1. Greeting
{"kind": "greeting", "allowGitignore": false}

// 2. State updates
{
  "kind": "state_update",
  "newId": "123",
  "updates": [
    {"kind": "file_update", "path": "/file.go", "content": "..."},
    {"kind": "cursor_update", "path": "/file.go", "offset": 142}
  ]
}
```

**sm-agent → Cloud:**
- WebSocket connection to `edge.supermaven.com` (or similar)
- Requires authentication (API key or OAuth)
- Sends file context + cursor position
- Receives streaming completions

**sm-agent → Client (stdout):**
```
SM-MESSAGE {"kind": "response", "stateId": "123", "items": [...]}
SM-MESSAGE {"kind": "metadata", "dustStrings": [...]}
SM-MESSAGE {"kind": "connection_status", "is_connected": true}
```

### Authentication

sm-agent requires:
1. Supermaven account activation
2. Config file: `~/.supermaven/config.json`
3. WebSocket auth token

Without auth:
```
ERROR: Unauthorized (fatal)
```

### Performance Characteristics

**Why Supermaven is fast:**
1. **Persistent binary process** - No startup overhead
2. **WebSocket connection** - Keeps connection alive
3. **Cloud-based Babble model** - Powerful hardware, optimized inference
4. **Edge servers** - Geographically distributed
5. **25ms polling** - Aggressive client-side polling
6. **State caching** - Reuses partial completions

**NOT because of:**
- ❌ Local model inference
- ❌ Novel client-side algorithms
- ❌ Special semantic search

## What We Learned

### 1. Supermaven's Speed Secret

Speed comes from:
- **Infrastructure:** Global edge network + powerful servers
- **Model:** Babble architecture (300k-1M context window, O(N) complexity)
- **Engineering:** Persistent connections, aggressive polling, smart caching

### 2. Client Plugin Simplicity

The Neovim/VS Code plugins are **remarkably simple**:
- Just send file content + cursor position
- No AST parsing
- No semantic search
- No embeddings
- No complex context gathering

All intelligence is in the cloud.

### 3. Why Puku Can't Replicate This

To match Supermaven's speed, we would need:
1. ✅ Persistent connection to API (doable)
2. ❌ 300k-1M context window model (OpenRouter doesn't have this for FIM)
3. ❌ <250ms inference latency (OpenRouter FIM is slower)
4. ❌ Edge network infrastructure (Supermaven has, we don't)
5. ❌ Babble-style model architecture (proprietary)

## Implications for Puku Editor

### What We CAN Do

**Option 1: Simplified Copilot Approach** ⭐ RECOMMENDED
- Send prefix/suffix (2000/500 chars) to OpenRouter `/v1/completions`
- Remove semantic search for FIM
- Remove recent edits for FIM
- Debounce: 250ms (vs Supermaven's 25ms)
- Accept slower response times (500-1000ms vs 250ms)

**Benefits:**
- Simple, reliable
- Easy to debug
- Proven approach (Copilot uses this)
- Modern FIM models work well with local context

**Tradeoffs:**
- Slower than Supermaven (but competitive with Copilot)
- Less context-aware

---

**Option 2: Continue.dev Middle Ground**
- Lightweight context retrieval (1k tokens max)
- Fast semantic search (cached)
- 250ms debounce + 150ms model timeout
- Position-based caching

**Benefits:**
- Better quality than simple prefix/suffix
- Still reasonably fast

**Tradeoffs:**
- More complex
- Harder to debug
- May not be worth the complexity

---

**Option 3: Hybrid Approach**
- Use Supermaven for inline completions (requires account)
- Use Puku's semantic search for Chat
- Best of both worlds

**Benefits:**
- Best performance for completions
- Rich context for chat

**Tradeoffs:**
- Requires Supermaven subscription
- Two different systems

### What We CAN'T Do

❌ Build a local Babble-equivalent model
❌ Match Supermaven's 250ms latency with cloud APIs
❌ Use sm-agent without Supermaven account
❌ Run sm-agent as local-only inference

## Recommendations

### For Inline Completions (FIM)

**Go with Option 1: Simplified Approach**

```typescript
// Current (complex):
const context = await this._gatherCodeContext(document, position);
const hasContext = context.recentEdits.length > 0 || context.semanticResults.length > 0;
if (hasContext) {
  return await this._fetchChatBasedCompletion(...); // Slow!
}

// Recommended (simple):
const prefix = document.getText(new Range(new Position(position.line - 50, 0), position));
const suffix = document.getText(new Range(position, new Position(position.line + 10, 1000)));
return await this._fetchNativeCompletion(prefix, suffix, token);
```

**Remove:**
- `_gatherCodeContext()` for FIM
- Recent edits tracking for FIM
- Semantic search for FIM
- Smart endpoint selection
- Chat-based completions for FIM

**Keep for Chat:**
- Semantic search
- Recent edits
- Context gathering
- Smart prompting

### For Chat

Keep all current features:
- ✅ Semantic search
- ✅ Recent edits
- ✅ Context gathering
- ✅ Agent mode
- ✅ Tool calling

These make sense for chat where latency tolerance is higher.

## Next Steps

1. **Simplify FIM provider** - Remove context gathering
2. **Fix trigger issue** - Debug why VS Code isn't calling provider
3. **Optimize debounce** - Test 150ms, 200ms, 250ms
4. **Add position caching** - Reuse completions for same position
5. **Measure baseline** - Test current simple FIM latency

## Files to Modify

### src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts

**Remove:**
- Lines 100-150: `_gatherCodeContext` call
- Lines 180-220: Smart endpoint selection logic
- Lines 300-350: `_fetchChatBasedCompletion` method

**Keep:**
- `_fetchNativeCompletion` (simple prefix/suffix FIM)
- `_isDuplicateCompletion` (local ±20 line check)
- Debouncing logic

**Simplify:**
```typescript
async provideInlineCompletionItems(document, position, context, token) {
  // Get prefix/suffix
  const prefix = this._getPrefix(document, position);
  const suffix = this._getSuffix(document, position);

  // Call native FIM
  const completion = await this._fetchNativeCompletion(prefix, suffix, token);

  // Check duplicate
  if (this._isDuplicateCompletion(document, completion, position)) {
    return null;
  }

  return [new InlineCompletionItem(completion)];
}
```

## Conclusion

Supermaven's speed comes from **cloud infrastructure + Babble model**, not from clever client-side algorithms.

Puku should:
1. ✅ Simplify FIM to Copilot-style (prefix/suffix only)
2. ✅ Keep rich context for Chat
3. ✅ Focus on quality over speed for inline completions
4. ✅ Optimize what we can (debounce, caching, duplicate detection)

Accept that we won't match Supermaven's 250ms without their infrastructure. That's okay - Copilot is slower too (783-1883ms) and widely used.

---

## Implementation Status (2025-11-27)

### ✅ Completed Simplifications

**Frontend (`pukuInlineCompletionProvider.ts`):**
- Removed semantic search for FIM
- Removed recent edits tracking
- Removed context gathering (`_gatherCodeContext()`)
- Removed smart endpoint selection
- Removed chat-based completions
- Removed post-processing (`extractCodeFromResponse()`)
- Removed duplicate detection (rely on model intelligence)
- **Result:** 180 lines (down from ~350), simple prefix/suffix to `/v1/completions`

**Backend (`puku-worker`):**
- Using Codestral Mamba (`mistralai/codestral-2501`) with 256k context window
- Added optional `recentEdits` support (Cursor-style)
- Model handles duplicate avoidance via its intelligence
- **Deployed:** `https://api.puku.sh` (Version: 279d6c72)

**Architecture:**
```typescript
// Client sends:
{
  prompt: "entire file content up to cursor",
  suffix: "entire file content after cursor",
  recentEdits: [{ filepath: "...", content: "..." }] // optional
}

// Worker prepends recent edits and calls Codestral Mamba
// Model returns completion using 256k context intelligence
```

**Benefits:**
- Simple, reliable, easy to debug
- Relies on Codestral Mamba's 256k context window
- No complex client-side logic
- Fast enough (competitive with Copilot's 783-1883ms)
