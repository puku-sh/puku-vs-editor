# PRD: FIM API Metadata for Multi-Document Completions

**Priority**: High
**Milestone**: Backend v1.2.0
**Labels**: `enhancement`, `backend`, `fim-api`, `multi-document`
**Depends On**: [Frontend Issue #132](https://github.com/puku-sh/puku-vs-editor/issues/132)

---

## Executive Summary

Enhance the `/v1/fim/context` API endpoint to return metadata alongside completion text, enabling the Puku Editor frontend to display multi-document inline completions. This allows the AI to suggest edits in files other than the currently open document (e.g., adding imports, creating helper files).

**Impact**: Enables GitHub Copilot-level multi-file refactoring capabilities, completing the frontend implementation from Issue #132.

---

## Problem Statement

**Current Limitation**: The FIM API returns only completion text without context about where the completion should be applied.

**User Story**:
> "As a backend service, I need to tell the frontend when a completion belongs to a different file, so that the editor can show it as a clickable label instead of ghost text."

**Example Scenario**:
- User types `import { calculateTotal } from` in `main.ts`
- AI determines the import should be added at the top of `main.ts` (line 1)
- Currently: Returns only text, frontend shows as ghost text at cursor
- Desired: Returns text + metadata, frontend shows as label "📄 Go To Inline Suggestion (main.ts:1)"

---

## Goals & Non-Goals

### Goals
1. ✅ Add `metadata` field to FIM API response
2. ✅ Include target document URI, line, column in metadata
3. ✅ Support `displayType` to control frontend rendering
4. ✅ Maintain backward compatibility (metadata optional)
5. ✅ Enable multi-document completions for Puku Editor

### Non-Goals
❌ Implement AI logic to generate cross-file completions (future work)
❌ Modify existing completion generation logic
❌ Add authentication/authorization changes
❌ Change API endpoint URL or request format

---

## API Specification

### Current Response Format

```json
{
  "id": "cmpl-123",
  "object": "text_completion",
  "created": 1234567890,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "import { calculateTotal } from './utils/math';",
      "index": 0,
      "finish_reason": "stop"
    }
  ]
}
```

### Enhanced Response Format (with metadata)

```json
{
  "id": "cmpl-123",
  "object": "text_completion",
  "created": 1234567890,
  "model": "mistralai/codestral-2501",
  "choices": [
    {
      "text": "import { calculateTotal } from './utils/math';",
      "index": 0,
      "finish_reason": "stop",
      "metadata": {
        "targetDocument": "file:///workspace/src/main.ts",
        "targetLine": 0,
        "targetColumn": 0,
        "displayType": "label"
      }
    }
  ]
}
```

### Metadata Field Specification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetDocument` | `string` | No | URI of target file (e.g., `file:///workspace/src/main.ts`) |
| `targetLine` | `number` | No | 0-indexed line number where edit applies |
| `targetColumn` | `number` | No | 0-indexed column number where edit applies |
| `displayType` | `"code" \| "label"` | No | Display mode: `"code"` for ghost text, `"label"` for clickable label |

**Validation Rules**:
- If `metadata` is present, all fields are optional
- `targetLine` and `targetColumn` must be non-negative integers
- `targetDocument` must be a valid URI (if provided)
- `displayType` defaults to `"code"` if not specified

---

## Implementation Plan

### Phase 1: API Enhancement (Week 1)

**Backend Changes** (`../puku-worker/src/routes/completions.ts`):
1. Add `metadata` field to `CompletionChoice` interface
2. Update response builder to include metadata (initially null/undefined)
3. Add TypeScript types for metadata
4. Update API documentation

**Deliverable**: API supports metadata field (backward compatible, no breaking changes)

### Phase 2: Metadata Generation Logic (Week 2-3)

**AI Integration**:
1. Detect when completion targets different file/location
2. Extract target document URI from context
3. Calculate target line/column from completion intent
4. Determine display type based on completion nature

**Heuristics** (initial implementation):
- Import statements at top of file → `displayType: "label"`
- Same-document edits → `metadata: undefined` (ghost text)
- Cross-file edits → `displayType: "label"` + target URI

**Deliverable**: AI generates metadata for cross-file completions

### Phase 3: Testing & Validation (Week 3)

**Test Cases**:
1. Same-document completion (no metadata)
2. Import at file top (metadata with line 0)
3. Cross-file helper function creation
4. Invalid URI handling
5. Missing metadata fields (graceful degradation)

**Deliverable**: All tests pass, API stable

### Phase 4: Production Release (Week 4)

**Steps**:
1. Deploy to staging environment
2. Coordinate with frontend team for integration testing
3. Monitor error rates and performance
4. Deploy to production
5. Enable feature flag in frontend

**Deliverable**: Production deployment complete

---

## Technical Details

### Response Schema (TypeScript)

```typescript
interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
}

interface CompletionChoice {
  text: string;
  index: number;
  finish_reason: string | null;
  metadata?: CompletionMetadata;  // NEW
}

interface CompletionMetadata {
  targetDocument?: string;    // URI string
  targetLine?: number;         // 0-indexed
  targetColumn?: number;       // 0-indexed
  displayType?: 'code' | 'label';
}
```

### Example Scenarios

#### Scenario 1: Add Import Statement

**Request**:
```json
{
  "prompt": "// File: src/utils.ts\nconst result = calculateTotal(",
  "suffix": ")",
  "openFiles": [
    {"filepath": "src/main.ts", "content": "export const calculateTotal = ..."},
    {"filepath": "src/utils.ts", "content": "const result = calculateTotal()"}
  ],
  "language": "typescript"
}
```

**Response**:
```json
{
  "choices": [{
    "text": "import { calculateTotal } from './main';",
    "metadata": {
      "targetDocument": "file:///workspace/src/utils.ts",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

#### Scenario 2: Same-Document Edit (Ghost Text)

**Request**:
```json
{
  "prompt": "function add(a: number, b: number) { return ",
  "suffix": " }",
  "language": "typescript"
}
```

**Response**:
```json
{
  "choices": [{
    "text": "a + b;",
    "metadata": undefined  // or omit metadata field entirely
  }]
}
```

#### Scenario 3: Create Helper File

**Request**:
```json
{
  "prompt": "// User wants to extract validation logic\nconst isValid = ",
  "suffix": "",
  "language": "typescript"
}
```

**Response**:
```json
{
  "choices": [{
    "text": "export function validateInput(data: any): boolean {\n  // validation logic\n}",
    "metadata": {
      "targetDocument": "file:///workspace/src/utils/validation.ts",
      "targetLine": 0,
      "targetColumn": 0,
      "displayType": "label"
    }
  }]
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API backward compatibility | 100% | No frontend errors with old clients |
| Metadata accuracy | >90% | Correct file/line in manual review |
| Response latency increase | <10ms | p95 latency vs baseline |
| Frontend integration success | 100% | Frontend #132 fully functional |

---

## Dependencies

### Upstream (Blockers)
- None (independent backend work)

### Downstream (Enablers)
- ✅ [Frontend Issue #132](https://github.com/puku-sh/puku-vs-editor/issues/132) - Already implemented, waiting for backend

### External
- Codestral Mamba model capabilities (current model sufficient)
- Cloudflare Workers KV/R2 (no changes needed)

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI generates incorrect target URIs | Medium | High | Validate URIs against workspace files, fallback to no metadata |
| Performance degradation | Low | Medium | Cache file resolution, optimize metadata generation |
| Frontend compatibility issues | Low | High | Coordinate testing with frontend team, feature flag rollout |
| Model hallucinations on metadata | Medium | Medium | Implement strict validation, reject invalid metadata |

---

## Backward Compatibility

**Guaranteed**:
- ✅ Existing clients without metadata support continue working
- ✅ `metadata` field is optional (can be `undefined` or omitted)
- ✅ Response schema remains valid JSON
- ✅ No breaking changes to request format

**Migration Path**:
1. Deploy backend with metadata support (no frontend changes needed)
2. Frontend updates to consume metadata (gradual rollout)
3. AI logic improves metadata generation (iterative)

---

## Open Questions

1. **Q**: Should we support multiple target documents per completion?
   **A**: Not initially. Single target per completion keeps frontend simple.

2. **Q**: How to handle file creation (file doesn't exist yet)?
   **A**: Use intended URI, frontend creates file on acceptance.

3. **Q**: Should we include confidence scores for metadata?
   **A**: Future enhancement. Start without confidence, add if needed.

4. **Q**: What if target file is outside workspace?
   **A**: Reject with validation error, only allow workspace-relative URIs.

---

## Documentation Updates

**Required**:
- [ ] Update API reference docs (`/v1/fim/context` endpoint)
- [ ] Add metadata field examples to OpenAPI spec
- [ ] Create migration guide for API consumers
- [ ] Add troubleshooting section for metadata validation

---

## Acceptance Criteria

**Phase 1 (API Enhancement)**:
- [x] PRD written and reviewed
- [ ] `metadata` field added to response schema
- [ ] TypeScript types updated
- [ ] Backward compatibility verified
- [ ] API documentation updated

**Phase 2 (Metadata Generation)**:
- [ ] AI generates metadata for import statements
- [ ] Cross-file detection logic implemented
- [ ] URI validation added
- [ ] Display type heuristics working

**Phase 3 (Testing)**:
- [ ] Unit tests pass (>90% coverage)
- [ ] Integration tests with frontend pass
- [ ] Manual testing scenarios validated
- [ ] Error handling covers edge cases

**Phase 4 (Production)**:
- [ ] Staging deployment successful
- [ ] Frontend integration confirmed
- [ ] Production deployment complete
- [ ] Success metrics tracked

---

## Related Issues

- [Frontend #132](https://github.com/puku-sh/puku-vs-editor/issues/132) - Multi-document completion UI (completed)
- Backend #TBD - This issue (to be created)

---

**Created**: 2025-12-19
**Assignee**: @backend-team
**Reviewers**: @sahamed, @puku-ai-team
