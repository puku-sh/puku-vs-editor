# FIM (Fill-In-Middle) Research & PRDs

> **Status:** 📋 Research & Planning Phase
>
> This directory contains competitive analysis and product requirement documents (PRDs) for improving Puku's FIM (code completion) implementation. **None of these features are implemented yet.**

---

## 📚 Documents

### Research & Analysis

1. **[Aide FIM Analysis](./aide-analysis.md)** - Competitive analysis of Aide's FIM architecture
   - **Status:** Research complete
   - **Key findings:** Line-by-line SSE streaming, prefix overlap caching, request abortion
   - **Related issues:** [#17](https://github.com/puku/puku-editor/issues/17), [#18](https://github.com/puku/puku-editor/issues/18)

2. **[Refact FIM Analysis](./refact-analysis.md)** - Competitive analysis of Refact's FIM architecture
   - **Status:** Research complete
   - **Key findings:** Character-by-character backend caching, AST/VecDB context, adaptive temperature
   - **Most innovative:** Backend character-by-character cache prefetch

3. **[Zed FIM Analysis](./zed-analysis.md)** - Competitive analysis of Zed's FIM architecture
   - **Status:** Research complete
   - **Key findings:** Diff-based rendering, position validation, 75ms debounce, refresh gating
   - **Most innovative:** Diff-based completion rendering with grapheme matching

### Product Requirements

4. **[Position Validation PRD](./position-validation.md)** - Prevent stale completions
   - **Status:** Planning phase (NOT implemented)
   - **Estimated effort:** 50 minutes
   - **Benefits:** Better UX, no stale completions, enables edit interpolation
   - **Priority:** MEDIUM-HIGH (UX improvement, foundation for #6)

5. **[Refresh Gating PRD](./refresh-gating.md)** - Gate requests on text changes only
   - **Status:** Planning phase (NOT implemented)
   - **Estimated effort:** 1 hour
   - **Benefits:** 30-50% fewer API calls, $100/month savings per user
   - **Priority:** HIGH (cost savings)

6. **[Edit Interpolation PRD](./edit-interpolation.md)** - Instant completion updates as user types
   - **Status:** Planning phase (NOT implemented)
   - **Estimated effort:** 2-3 days
   - **Benefits:** 70-80% fewer API calls, <1ms updates
   - **Priority:** HIGH (requires #4 or #5 first)

7. **[Request Abortion PRD](./request-abortion.md)** - Cancel in-flight requests on backspace
   - **Status:** Planning phase (NOT implemented)
   - **Estimated effort:** 1 day
   - **Benefits:** ~20% fewer wasted API calls
   - **Priority:** MEDIUM

8. **[Client-Side Character Caching PRD](./client-char-cache.md)** - Client-side implementation of Refact's caching strategy
   - **Status:** Planning phase (NOT implemented)
   - **Estimated effort:** 5-7 days
   - **Benefits:** 80% fewer API calls, instant completions during acceptance
   - **Cost:** $0 (client-side, no KV operations)
   - **Priority:** HIGH (alternative to #6)

9. **[GitHub Issues Templates](./github-issues.md)** - Ready-to-paste issue templates
   - **Status:** Ready to create
   - **Issues:** Separate issues for Position Validation, Refresh Gating, Edit Interpolation, Request Abortion

---

## 🎯 Summary of Findings

### Current Puku FIM (As Implemented)

| Feature | Status |
|---------|--------|
| Model | ✅ Codestral Mamba (256k context) |
| Context Gathering | ✅ Semantic search + import detection |
| Caching | ✅ Speculative cache + Radix Trie |
| Language Hints | ✅ Prevents hallucinations |
| Streaming | ❌ No (single fetch) |
| Request Abortion | ❌ No |
| Char-by-char Cache | ❌ No |

### Planned Improvements (NOT Implemented)

| Feature | Source | Priority | Estimated Effort |
|---------|--------|----------|------------------|
| **Refresh Gating** | Zed | High | 1 hour |
| **Position Validation** | Zed | Medium-High | 50 minutes |
| **SSE Streaming** | Aide | High | 2-3 weeks |
| **Request Abortion** | Aide | Medium | 1 day |
| **Client Char Cache** | Refact | High | 5-7 days |
| **Edit Interpolation** | Zed | High | 2-3 days |
| **Augment Next Edit** | Custom | High | 7-8 days |
| **Diff-Based Rendering** | Zed | Medium | 2-3 days |
| **Right-Cursor Validation** | Refact | Medium | 1 day |
| **Adaptive Temperature** | Refact | Low | 1 day |

---

## 🏆 Competitive Comparison

### What Each System Does Best

#### **Puku (Current)**
- ✅ **Best context gathering** - Semantic search + import detection
- ✅ **Best model** - Codestral Mamba (native FIM, 2-3x faster than Claude)
- ✅ **Best caching (client-side)** - Speculative + Radix Trie
- ✅ **Lowest cost** - ~$5/month vs $6-68/month
- ❌ **No streaming** - Single fetch, wait for full response

#### **Aide**
- ✅ **Best streaming** - Line-by-line SSE, progressive display
- ✅ **Request abortion** - Cancels in-flight on backspace
- ✅ **Full document context** - Sends entire file + LSP types
- ❌ **Slower** - 500-1500ms latency
- ❌ **Simple cache** - Just prefix overlap

#### **Refact**
- ✅ **Best backend caching** - Character-by-character prefetch
- ✅ **No client debounce** - Cache handles instant responses
- ✅ **Adaptive temperature** - 0.2 automatic, 0.6 manual
- ✅ **AST/VecDB support** - Intelligent context
- ❌ **Backend-dependent** - Requires Rust sidecar
- ❌ **Expensive for cloud** - Character cache needs self-hosting

#### **Zed**
- ✅ **Fastest debounce** - 75ms (aggressive but effective)
- ✅ **Diff-based rendering** - Handles partial user input gracefully
- ✅ **Position validation** - Prevents stale completions
- ✅ **Refresh gating** - Only triggers on text changes
- ✅ **Edit interpolation** - Adjusts predictions as user types
- ❌ **No streaming** - Single fetch, wait for full completion
- ❌ **Rust-only** - Not portable to TypeScript

---

## 💡 Recommended Implementation Strategy

### Phase 1A: Position Validation + Refresh Gating (Priority: **HIGH**)
**Effort:** 1 day | **Cost:** $0 | **Benefit:** 30-50% fewer API calls, no stale completions

Implement Zed's position validation and refresh gating:

```typescript
// Store completion position
this.completionPosition = position;

// Before suggesting, check cursor hasn't moved
if (!this.completionPosition.isEqual(position)) {
  return undefined; // Stale!
}

// Only trigger on text changes, not cursor movement
if (documentText === lastDocumentText) {
  return undefined; // Cursor moved only
}
```

**Why this wins:**
- Quick win (1 day implementation)
- 30-50% fewer API calls immediately
- No stale completions after cursor moves
- Foundation for other improvements

---

### Phase 1B: Client-Side Char Cache (Priority: **HIGH**)
**Effort:** 5-7 days | **Cost:** $0 | **Benefit:** 80% fewer API calls

Implement Refact's character-by-character caching **on the client** (not backend) to avoid Cloudflare KV costs:

```typescript
// After API returns "def main():\n    pass"
// User types "def" → Cache hit → " main():\n    pass" (instant!)
// User types "def " → Cache hit → "main():\n    pass" (instant!)
```

**Why this wins:**
- Zero backend costs (client memory only)
- Instant completions during acceptance
- Simple implementation (~100 lines)
- Compatible with existing caches

See [client-char-cache.md](./client-char-cache.md) for full PRD.

---

### Phase 2: SSE Streaming (Priority: **HIGH**)
**Effort:** 2-3 weeks | **Cost:** ~$0.10/month | **Benefit:** Better UX

Implement line-by-line streaming like Aide:

```typescript
// Progressive display as completion streams
// User sees: "def " → "def m" → "def ma" → "def main()" → ...
```

**Why this wins:**
- Better perceived performance (shows progress)
- Can cancel mid-stream (saves tokens)
- Industry standard (GitHub Copilot, Cursor, etc.)

Implementation tracked in [Issue #18](https://github.com/puku/puku-editor/issues/18).

---

### Phase 3: Request Abortion (Priority: **MEDIUM**)
**Effort:** 1 day | **Cost:** $0 | **Benefit:** Cleaner UX

Abort in-flight requests when user backspaces:

```typescript
// User types "def" → starts API call
// User backspaces → "de" → abort previous request
```

Implementation tracked in [Issue #17](https://github.com/puku/puku-editor/issues/17).

---

### Phase 4: Diff-Based Rendering (Priority: **MEDIUM**)
**Effort:** 2-3 days | **Cost:** $0 | **Benefit:** Graceful race condition handling

Implement Zed's diff-based rendering:

```typescript
// User types "xy" while completion is "axbyc"
// Rendered: "[a]x[b]y[c]" (brackets are inlays)
```

**Why this wins:**
- Handles race conditions gracefully
- Better UX when user types faster than API
- Smoother completion experience

---

## 📈 Expected Impact

### Current Performance:
```
User accepts 20-char completion:
- API calls: ~5 (user types char-by-char, triggers new requests)
- Latency: ~4000ms total waiting time
- Cost: ~$0.05 per completion
```

### After Client Char Cache:
```
User accepts 20-char completion:
- API calls: 1 (only initial request)
- Latency: ~800ms (only first call)
- Cost: ~$0.01 per completion
Savings: 80% fewer calls, 80% less waiting!
```

### After Streaming:
```
User sees completion progressively:
- Perceived latency: ~200ms (first line appears)
- Can cancel mid-stream (saves tokens)
- Better UX (shows progress)
```

---

## 🚀 Next Steps

1. **Review PRDs** - Team review of client-char-cache.md
2. **Create GitHub issues** - Break down into implementable tasks
3. **Prioritize** - Decide which features to implement first
4. **Spike** - 1-2 day prototype of client char cache
5. **Implement** - Follow 7-day rollout plan in PRD

---

## 📊 Metrics to Track

Once implemented, we should measure:

- **Cache hit rate** - % of completions served from cache
- **API call reduction** - Before/after comparison
- **Latency** - Time to first completion
- **User acceptance rate** - % of completions accepted
- **Token cost** - API spend per user per month

---

## 📂 File Structure

```
docs/prd/fim/
├── README.md                                    (This file - index and overview)
├── aide-analysis.md                             (Aide competitive analysis)
├── refact-analysis.md                           (Refact competitive analysis)
├── zed-analysis.md                              (Zed competitive analysis)
├── position-validation.md                       (PRD #4 - 50 min, UX improvement)
├── position-validation-implementation-guide.md  (Modular impl guide for #4)
├── GITHUB_ISSUE_POSITION_VALIDATION.md          (Ready-to-paste issue for #4)
├── refresh-gating.md                            (PRD #5 - 1 hour, cost savings)
├── refresh-gating-implementation-guide.md       (Modular impl guide for #5)
├── GITHUB_ISSUE_REFRESH_GATING.md               (Ready-to-paste issue for #5)
├── edit-interpolation.md                        (PRD #6 - 2-3 days, requires #4 or #5)
├── request-abortion.md                          (PRD #7 - 1 day, independent)
├── client-char-cache.md                         (PRD #8 - 5-7 days, alternative to #6)
└── github-issues.md                             (Combined issue templates reference)
```

---

## 🔗 Related Resources

### Code References
- Current FIM client: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`
- Current FIM backend: `puku-worker/src/routes/completions.ts`
- Current caches: `src/chat/src/extension/pukuai/common/completionsCache.ts`

### GitHub Issues
- [#17: Request Abortion on Backspace](https://github.com/puku/puku-editor/issues/17) (Aide-inspired)
- [#18: SSE Streaming for Progressive Completions](https://github.com/puku/puku-editor/issues/18) (Aide-inspired)
- **#19: Position Validation** (Zed-inspired) - See `GITHUB_ISSUE_POSITION_VALIDATION.md`
- **#20: Refresh Gating** (Zed-inspired) - See `GITHUB_ISSUE_REFRESH_GATING.md`
- **#21: Edit Interpolation** (Zed-inspired) - See `github-issues.md`
- **#22: Request Abortion** (Aide-inspired, simplified) - See `github-issues.md`

### Reference Implementations
- Aide: `reference/aide/extensions/codestory/src/`
- Refact: `reference/refact/refact-vscode/src/`
- Zed: `reference/zed/crates/`

---

**Last Updated:** 2025-12-02
**Status:** Research complete, planning phase, awaiting prioritization
