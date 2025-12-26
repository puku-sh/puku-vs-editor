# PRD: Semantic Search with Voyage AI Reranking

## Executive Summary

Enhance Puku Editor's semantic search capabilities by adding Voyage AI reranking to improve code search relevance by 20-30%. This makes our @codebase feature competitive with Cursor's while maintaining cost efficiency (<$0.20/user/month).

---

## Problem Statement

### Current State
- Semantic search uses vector similarity (cosine similarity) on local embeddings
- Fast (10ms) but imprecise - may miss relevant code with different wording
- No query understanding - treats "add validation" same as "validation addition"
- Search quality: ~60% relevant results in top 3

### User Pain Points
1. **Vague queries fail**: "add error handling" may miss try-catch patterns
2. **Terminology mismatch**: User says "validation", code uses "schema verification"
3. **Context missing**: Can't distinguish "user validation" from "data validation"
4. **Irrelevant results**: Similar embedding ≠ actually relevant

### Competitive Gap
- **Cursor**: Uses HyDE + reranking, 10-30s response time
- **Cody**: Uses reranking with embeddings
- **Puku**: Fast but less accurate

---

## Goals & Success Metrics

### Primary Goals
1. **Improve search relevance** from 60% to 80-90% (top 3 results)
2. **Maintain fast response** - stay under 500ms total latency
3. **Keep costs low** - under $0.20/user/month for 100 users
4. **Zero breaking changes** - fully backward compatible

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Search relevance (top 3) | ~60% | 80-90% | Manual eval (50 queries) |
| Latency P95 | 10ms | <500ms | Telemetry |
| Cost per user/month | $0 | <$0.20 | Voyage bill |
| Cache hit rate | N/A | >60% | Logs |
| Error rate | 0% | <1% | Error tracking |

---

## Solution Overview

### Architecture: Local Search → Worker Reranking → LLM

```
┌─────────────────────────────────────────────────────────────┐
│                    PUKU EDITOR (CLIENT)                      │
├─────────────────────────────────────────────────────────────┤
│  1. User triggers chat/inline chat                          │
│  2. Local SQLite vector search → Top 20 results (16 KB)     │
│  3. Send to puku-worker with results embedded               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PUKU WORKER (SERVER)                      │
├─────────────────────────────────────────────────────────────┤
│  4. Extract semantic_results from request                   │
│  5. Call Voyage AI rerank API → Top 3 refined (200ms)       │
│  6. Inject refined results into LLM prompt                  │
│  7. Call LLM (GLM-4.6) with enriched context                │
│  8. Stream response back to client                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**1. Why send 20 chunks to worker?**
- 16 KB data size is negligible (vs 100s of KB for images)
- Allows worker to make smart filtering decisions
- Enables server-side caching and optimization

**2. Why Voyage AI?**
- 200M free tokens = 48K searches (vs Cohere's trial only)
- 53x cheaper than Cohere ($0.0000375 vs $0.002 per search)
- Best accuracy (beats Cohere by 8.83% on benchmarks)
- Longest context (16K tokens vs 4K)

**3. Why not client-side reranking?**
- Security: API keys stay on server
- Flexibility: Server can cache, fallback, optimize
- Cost: Centralized usage tracking and limits
- Only 15ms latency difference

---

## User Experience

### Use Cases

#### Use Case 1: Inline Chat (Cmd+I)
```
User selects code:
  function login(email, password) {
    // TODO: add validation
  }

User types: "add email validation"

Behind the scenes:
1. Local search finds 20 chunks about validation
2. Sent to worker with chat request
3. Worker reranks → finds Zod schema examples
4. LLM generates with correct pattern:
   const schema = z.object({
     email: z.string().email()
   })
```

**Before reranking:**
- Result 1: regex email validation (score: 0.78)
- Result 2: input sanitization (score: 0.75)
- Result 3: try-catch blocks (score: 0.73)

**After reranking:**
- Result 1: Zod schema validation ✓ (score: 0.92)
- Result 2: Email validation middleware ✓ (score: 0.87)
- Result 3: Input sanitization ✓ (score: 0.81)

#### Use Case 2: Chat Panel with @codebase
```
User: "how do we handle authentication errors?"

Behind the scenes:
1. Local search: 20 chunks with "auth", "error", "handle"
2. Worker reranks: finds actual error handlers
3. LLM explains patterns from codebase

Result: Accurate answer based on actual patterns
```

---

## Technical Specification

### API Changes

#### 1. Chat Completion Request (Client → Worker)

**Endpoint:** `POST /v1/chat/completions`

**Request:**
```typescript
interface ChatCompletionRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
  temperature?: number;

  // NEW: Semantic search results
  semantic_results?: SemanticResult[];
  rerank?: boolean;
}

interface SemanticResult {
  content: string;      // Code chunk text
  file: string;         // File path
  score: number;        // Vector similarity (0-1)
  line_start: number;
  line_end: number;
}
```

**Example:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "add validation to user input"
    }
  ],
  "model": "glm-4.6",
  "stream": true,
  "semantic_results": [
    {
      "content": "const schema = z.object({ email: z.string().email() })",
      "file": "src/validation/schema.ts",
      "score": 0.78,
      "line_start": 10,
      "line_end": 15
    }
    // ... 19 more results
  ],
  "rerank": true
}
```

#### 2. Worker Reranking Logic

**File:** `puku-worker/src/routes/completions.ts`

```typescript
// Pseudocode
if (request.semantic_results && request.rerank) {
  // Step 1: Call Voyage API
  const reranked = await voyageRerank({
    query: extractUserQuery(messages),
    documents: semantic_results.map(r => r.content),
    top_n: 3
  });

  // Step 2: Get top 3 refined results
  const topResults = reranked.map(r => semantic_results[r.index]);

  // Step 3: Format as context
  const context = formatSemanticContext(topResults);

  // Step 4: Inject before last user message
  messages = injectContext(messages, context);
}

// Step 5: Call LLM with enriched prompt
return callLLM(messages);
```

#### 3. Voyage AI Integration

**File:** `puku-worker/src/services/reranker.ts`

```typescript
class VoyageReranker {
  async rerank(request: RerankRequest): Promise<RerankResult[]> {
    const response = await fetch('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'rerank-2-lite',
        query: request.query,
        documents: request.documents,
        top_n: request.top_n,
        return_documents: false
      })
    });

    return response.json().data;
  }
}
```

---

## Configuration

### Environment Variables (puku-worker)

```bash
# Voyage AI Reranking
VOYAGE_API_KEY="pa-xxx..."              # Required
VOYAGE_RERANK_ENABLED="true"            # Feature flag
VOYAGE_RERANK_MODEL="rerank-2-lite"     # Model variant
```

### User Settings (Puku Editor)

```json
{
  "puku.semanticSearch.enabled": true,
  "puku.semanticSearch.useReranking": true,
  "puku.semanticSearch.rerankCandidates": 20
}
```

---

## Cost Analysis

### Token Calculation

**Per search:**
```
Query tokens: ~7 tokens (e.g., "add validation to user input")
Documents: 20 chunks × 200 tokens = 4,000 tokens

Total = (7 × 20) + 4,000 = 4,140 tokens per search
```

### Usage Scenarios

#### Scenario 1: 10 Users
```
Daily searches: 30 (chat + inline chat)
Monthly: 30 × 30 = 900 searches
Tokens: 900 × 4,140 = 3.7M tokens/month
Cost: FREE (within 200M free tier)
```

#### Scenario 2: 100 Users
```
Daily searches: 300
Monthly: 9,000 searches
Tokens: 37.26M tokens/month
Cost: FREE for 5.4 months, then $1.40/month
Per user: $0.014/month
```

#### Scenario 3: 1,000 Users
```
Daily searches: 3,000
Monthly: 90,000 searches
Tokens: 372.6M tokens/month
Cost: $6.47/month ($202/month - $195.53 free tier)
Wait, let me recalculate:
  First 200M: FREE
  Remaining 172.6M: 172.6 × $0.0000375 = $6.47/month
Per user: $0.0065/month
```

### Cost Comparison

| Users | Searches/Month | Voyage Cost | Cohere Cost | Savings |
|-------|----------------|-------------|-------------|---------|
| 10 | 900 | $0 | $1.80 | 100% |
| 100 | 9,000 | $0.00 (free) | $18.00 | 100% |
| 1,000 | 90,000 | $6.47 | $180.00 | 96% |

---

## Implementation Plan

### Phase 1: Core Implementation (Week 1)
- [ ] Create `VoyageReranker` service in puku-worker
- [ ] Add `semantic_results` field to chat API
- [ ] Implement reranking logic in chat handler
- [ ] Add environment variables and config
- [ ] Unit tests for reranker

### Phase 2: Client Integration (Week 1-2)
- [ ] Update `pukuChatEndpoint.ts` to send search results
- [ ] Add configuration UI for reranking
- [ ] Add telemetry for search quality tracking
- [ ] Integration tests end-to-end

### Phase 3: Optimization (Week 2)
- [ ] Add caching layer for reranked results
- [ ] Implement fallback when Voyage API fails
- [ ] Add rate limiting and usage tracking
- [ ] Performance testing and tuning

### Phase 4: Rollout (Week 3)
- [ ] Deploy to staging with 10 internal users
- [ ] A/B test: 50% with reranking, 50% without
- [ ] Collect metrics and user feedback
- [ ] Gradual rollout to 100% users

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Voyage API outage | High | Low | Fallback to vector search |
| Latency spike | Medium | Medium | Cache common queries |
| Cost overrun | Medium | Low | Rate limiting + alerts |
| Search quality regression | High | Low | A/B test before rollout |

### Mitigation Strategies

**1. Fallback mechanism:**
```typescript
try {
  reranked = await voyageRerank(...);
} catch (error) {
  console.error('Reranking failed, using vector results');
  reranked = vectorResults.slice(0, 3); // Top 3 from vector search
}
```

**2. Circuit breaker:**
```typescript
if (errorRate > 5% || latency > 1000ms) {
  disableReranking();
  alertTeam();
}
```

**3. Cost alerts:**
```typescript
if (monthlyUsage > 150M tokens) {
  alertFinance();
  considerRateLimiting();
}
```

---

## Success Criteria

### Launch Criteria (Must Have)
- ✅ Search relevance improves by >15% (manual eval)
- ✅ Latency P95 < 500ms
- ✅ Error rate < 1%
- ✅ Cost tracking implemented
- ✅ Fallback works correctly

### Post-Launch Metrics (Week 1)
- Monitor search quality (user feedback)
- Track cost vs budget
- Measure latency distribution
- A/B test results analysis

### Optimization Goals (Month 1)
- Achieve 60%+ cache hit rate
- Reduce latency to <300ms P50
- Maintain <$0.15/user/month cost

---

## Future Enhancements

### Phase 2 Features
1. **Query expansion (HyDE)**: Generate hypothetical code before search
2. **Custom reranker**: Fine-tune model on code data
3. **Multi-stage retrieval**: Combine BM25 + vector + reranking
4. **Context-aware scoring**: Boost recent files, open tabs

### Long-term Vision
- Real-time reranking as user types (autocomplete)
- Personalized search based on user patterns
- Cross-repository search with reranking
- Offline reranking with local model

---

## Appendix

### A. Performance Benchmarks

**Latency breakdown (P95):**
```
Local SQLite search:     10ms
Upload to worker:        20ms
Worker rerank (Voyage):  250ms
Worker → LLM:           500ms
LLM first token:        200ms
─────────────────────────────
Total to first token:    980ms
```

### B. Token Usage Examples

**Example 1: Simple query**
```
Query: "add validation" (3 tokens)
20 docs × 150 tokens = 3,000 tokens
Total: (3 × 20) + 3,000 = 3,060 tokens
```

**Example 2: Complex query**
```
Query: "implement error handling with retry logic for API calls" (12 tokens)
20 docs × 250 tokens = 5,000 tokens
Total: (12 × 20) + 5,000 = 5,240 tokens
```

### C. Search Quality Evaluation

**Test queries (manual eval):**
1. "add validation to user input"
2. "how do we handle authentication errors"
3. "implement caching for database queries"
4. "write unit tests for this component"
5. "refactor this to use async/await"

**Scoring:**
- Excellent (2 pts): Exactly what user needs
- Good (1 pt): Relevant but not perfect
- Poor (0 pts): Not relevant

**Target:** Average score >1.5 (75% quality)

---

## Approval Sign-offs

- [ ] Product Manager: _______________
- [ ] Engineering Lead: _______________
- [ ] Finance (cost approval): _______________
- [ ] Security (API key handling): _______________

---

**Document Version:** 1.0
**Last Updated:** December 23, 2024
**Author:** Puku Engineering Team
**Status:** Draft → Pending Approval
