# Prompt Integration - PRD

## Component Overview
**Purpose**: Integrate context aggregator into inline edit prompt assembly
**Priority**: P0 (MVP - Week 1)
**Dependencies**: `IContextAggregator`, `ServerPoweredInlineEditProvider`
**Files Modified**: `src/chat/src/extension/inlineEdits/node/serverPoweredInlineEditProvider.ts`

---

## Problem

Currently, `ServerPoweredInlineEditProvider` sends minimal context to the backend:
- Selected code range
- Document before/after edits
- User instruction (from inline edit input box)

**Missing**:
- Recent edit history
- Relevant code from workspace
- Diagnostics/errors

We need to inject the aggregated context into the prompt sent to the LLM.

---

## Requirements

### FR-1: Inject Context into Request (P0)
Add context to the serialized request sent to backend.

**Current Request Format**:
```typescript
interface ISerializedNextEditRequest {
    documentBeforeEdits: string;
    documentAfterEdits: string;
    editRange: { startLine: number; endLine: number };
    selection?: { startLine: number; endLine: number };
    // NEW: Add context field
    context?: string;
}
```

**Integration Point**:
```typescript
class ServerPoweredInlineEditProvider {
    async provideNextEdit(
        request: StatelessNextEditRequest,
        pushEdit: PushEdit,
        logContext: InlineEditRequestLogContext,
        cancellationToken: CancellationToken
    ): Promise<StatelessNextEditResult> {
        // NEW: Gather context
        const context = await this.gatherContext(request, cancellationToken);

        // Serialize request WITH context
        const serializedRequest = request.serialize();
        serializedRequest.context = context; // Add context

        // Send to backend
        const response = await fetch('http://localhost:8001', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serializedRequest),
        });

        // ... rest of implementation
    }
}
```

### FR-2: Extract User Instruction (P0)
Get user's instruction from inline edit input box.

**Challenge**: The instruction is not directly available in `StatelessNextEditRequest`

**Solution**: Access from VS Code context
```typescript
// User instruction comes from inline edit input box (Ctrl+I)
// It's passed via InlineEditRequestLogContext or request metadata

function getUserInstruction(request: StatelessNextEditRequest): string {
    // The instruction is stored in the request metadata or log context
    // For now, we can infer from the edit type or use empty string
    // Better: Pass instruction explicitly through request chain

    // Placeholder implementation
    return request.metadata?.instruction ?? '';
}
```

**Better Approach**: Modify request chain to pass instruction

### FR-3: Context Gathering (P0)
Call `IContextAggregator` to get combined context.

**Implementation**:
```typescript
private async gatherContext(
    request: StatelessNextEditRequest,
    token: CancellationToken
): Promise<string> {
    try {
        // Extract document and position from request
        const document = request.getActiveDocument();
        const selection = request.getSelection();

        // Get user instruction (from inline edit input)
        const instruction = this.getUserInstruction(request);

        // Get selected code
        const selectedCode = request.getSelectedCode();

        // Build context request
        const contextRequest: ContextRequest = {
            document: document.document,
            position: selection || document.position,
            instruction,
            selectedCode,
        };

        // Call context aggregator
        const context = await this.contextAggregator.getContext(contextRequest, token);

        return context;

    } catch (error) {
        console.error('[ServerPoweredInlineEditProvider] Context gathering failed:', error);
        return ''; // Return empty on error
    }
}
```

### FR-4: Backend Prompt Assembly (P0)
Modify backend to use context in LLM prompt.

**Backend Changes** (in `puku-worker` or inline edit server):

```python
# Backend: /v1/inline-edit endpoint

def build_llm_prompt(request: InlineEditRequest) -> str:
    context = request.get('context', '')
    instruction = request.get('instruction', 'Refactor this code')
    selected_code = get_selected_code(request)

    prompt = f"""You are an AI code editor. The user has selected code and wants to edit it.

{context}

## User's Code

```{request['languageId']}
{selected_code}
```

## User's Instruction

{instruction}

## Your Task

Generate the edited code that implements the user's instruction.
Use the context above to understand patterns, recent changes, and diagnostics.
Match the coding style from the workspace examples.

Output ONLY the edited code, no explanations.
"""

    return prompt
```

### FR-5: Configuration (P0)
Support enabling/disabling context injection.

**Settings**:
```json
{
  "puku.inlineEdit.context.enabled": true,
  "puku.inlineEdit.context.includeInPrompt": true
}
```

---

## API Design

### Modified ServerPoweredInlineEditProvider

```typescript
/*---------------------------------------------------------------------------------------------
 *  Modified: ServerPoweredInlineEditProvider
 *  Now includes context gathering
 *--------------------------------------------------------------------------------------------*/

import { IContextAggregator, ContextRequest } from '../common/contextAggregator';

export class ServerPoweredInlineEditProvider implements IStatelessNextEditProvider {
    public static readonly ID = 'ServerPoweredInlineEditProvider';

    constructor(
        @IChatMLFetcher private readonly fetcher: IChatMLFetcher,
        @IContextAggregator private readonly contextAggregator: IContextAggregator,
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {}

    async provideNextEdit(
        request: StatelessNextEditRequest,
        pushEdit: PushEdit,
        logContext: InlineEditRequestLogContext,
        cancellationToken: CancellationToken
    ): Promise<StatelessNextEditResult> {

        const telemetryBuilder = new StatelessNextEditTelemetryBuilder(request);

        // NEW: Gather context
        const context = await this.gatherContext(request, cancellationToken);

        // Serialize request
        const serializedRequest: SerializedRequest = request.serialize();

        // NEW: Add context to request
        if (context) {
            serializedRequest.context = context;
            logContext.addLog(`[Context] Gathered ${this.estimateTokens(context)} tokens of context`);
        }

        const requestAsJson = JSON.stringify(serializedRequest, null, 2);
        this.logContextRequest(requestAsJson, logContext);

        // Fetch from backend
        const abortCtrl = new AbortController();
        const fetchDisposable = cancellationToken.onCancellationRequested(() => abortCtrl.abort());

        let r: Response;
        try {
            r = await fetch('http://localhost:8001', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestAsJson,
                signal: abortCtrl.signal,
            });
        } catch (e: unknown) {
            logContext.setError(e);
            if (e instanceof Error && e.message === 'AbortError') {
                return StatelessNextEditResult.noEdit(new NoNextEditReason.GotCancelled('afterFetchCall'), telemetryBuilder);
            }
            return StatelessNextEditResult.noEdit(new NoNextEditReason.FetchFailure(fromUnknown(e)), telemetryBuilder);
        } finally {
            fetchDisposable.dispose();
        }

        // ... rest of implementation (unchanged)
        if (r.status === 200) {
            const response: unknown = await r.json();
            assert(SerializedServerResponse.isSerializedServerResponse(response));
            this.spyOnPromptAndResponse(this.fetcher, { user_prompt: response.user_prompt, model_response: response.model_response });
            this.logContextResponse(response, logContext);
            const edits = response.edits.map(e => LineReplacement.deserialize(e));
            const sortingPermutation = Permutation.createSortPermutation(edits, (a, b) => a.lineRange.startLineNumber - b.lineRange.startLineNumber);
            const lineEdit = new LineEdit(sortingPermutation.apply(edits));
            lineEdit.replacements.forEach(edit => pushEdit(Result.ok({ edit })));
            pushEdit(Result.error(new NoNextEditReason.NoSuggestions(request.documentBeforeEdits, undefined)));
            return StatelessNextEditResult.streaming(telemetryBuilder);
        } else {
            const errorPayload = {
                code: r.status,
                message: r.statusText,
                response: await r.text(),
            };
            const errMsg = `Fetch errored: ${JSON.stringify(errorPayload, null, 2)}`;
            const error = new Error(errMsg);
            logContext.setError(error);
            return StatelessNextEditResult.noEdit(new NoNextEditReason.FetchFailure(error), telemetryBuilder);
        }
    }

    /**
     * NEW: Gather context from aggregator
     */
    private async gatherContext(
        request: StatelessNextEditRequest,
        token: CancellationToken
    ): Promise<string> {
        const config = this.configService.getConfig();
        const enabled = config['puku.inlineEdit.context.enabled'] ?? true;
        const includeInPrompt = config['puku.inlineEdit.context.includeInPrompt'] ?? true;

        if (!enabled || !includeInPrompt) {
            return '';
        }

        try {
            // Extract document and position from request
            const activeDoc = request.getActiveDocument();
            const document = activeDoc.document;
            const position = activeDoc.position;

            // Get user instruction
            // TODO: Pass instruction explicitly through request chain
            const instruction = this.getUserInstruction(request);

            // Get selected code
            const selectedCode = this.getSelectedCode(request);

            // Build context request
            const contextRequest: ContextRequest = {
                document,
                position,
                instruction,
                selectedCode,
            };

            // Call context aggregator with timeout
            const contextPromise = this.contextAggregator.getContext(contextRequest, token);
            const timeoutPromise = new Promise<string>((_, reject) => {
                setTimeout(() => reject(new Error('Context timeout')), 500);
            });

            const context = await Promise.race([contextPromise, timeoutPromise]);

            console.log(`[ServerPoweredInlineEditProvider] Gathered context: ${this.estimateTokens(context)} tokens`);
            return context;

        } catch (error) {
            if (error.message === 'Context timeout') {
                console.warn('[ServerPoweredInlineEditProvider] Context gathering timed out');
            } else {
                console.error('[ServerPoweredInlineEditProvider] Context gathering failed:', error);
            }
            return ''; // Return empty on error
        }
    }

    /**
     * Get user instruction from request
     * TODO: Pass instruction explicitly through request chain
     */
    private getUserInstruction(request: StatelessNextEditRequest): string {
        // Placeholder: instruction should be passed through request
        // For now, return empty string
        return request.metadata?.instruction ?? '';
    }

    /**
     * Get selected code from request
     */
    private getSelectedCode(request: StatelessNextEditRequest): string {
        const activeDoc = request.getActiveDocument();
        const selection = request.getSelection();

        if (selection) {
            return activeDoc.document.getText(selection);
        }

        return '';
    }

    /**
     * Estimate tokens (rough approximation)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    // ... rest of existing methods unchanged
}
```

### Backend Integration (Python Example)

```python
# Backend: puku-worker/src/routes/inline_edit.py

from typing import Optional

class InlineEditRequest:
    document_before: str
    document_after: str
    edit_range: dict
    context: Optional[str] = None  # NEW: Context from frontend

def build_llm_prompt(request: InlineEditRequest) -> str:
    """Build LLM prompt with context"""

    context = request.context or ''
    selected_code = extract_selected_code(request)
    language_id = request.language_id or 'typescript'

    # Build prompt with context
    prompt = f"""You are an AI code editor. The user has selected code and wants to edit it.

{context}

## User's Code

```{language_id}
{selected_code}
```

## Your Task

Generate the edited code based on the user's changes and context above.
Match the coding style and patterns from the workspace examples.
Fix any diagnostics (errors/warnings) if present.
Use recent edit patterns as reference.

Output ONLY the edited code, no explanations.
"""

    return prompt
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Context enabled | Config: enabled=true | Context included |
| Context disabled | Config: enabled=false | No context |
| Empty context | Aggregator returns '' | Request without context |
| Context timeout | Aggregator takes >500ms | Empty context |
| Cancellation | Token cancelled | Returns early |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Full workflow | Context → Request → Backend → Response |
| Backend receives context | Request.context is populated |
| LLM uses context | Response matches context patterns |
| Configuration | Respects enabled/disabled setting |

---

## Example: Before vs After

### Before (No Context)

**Request to Backend**:
```json
{
  "documentBeforeEdits": "function fetchUser(userId) { ... }",
  "documentAfterEdits": "function fetchUser(userId) { ... }",
  "editRange": { "startLine": 1, "endLine": 5 }
}
```

**LLM Prompt** (Backend):
```
User's Code:
function fetchUser(userId) { ... }

Generate edited code.
```

### After (With Context)

**Request to Backend**:
```json
{
  "documentBeforeEdits": "function fetchUser(userId) { ... }",
  "documentAfterEdits": "function fetchUser(userId) { ... }",
  "editRange": { "startLine": 1, "endLine": 5 },
  "context": "## Diagnostics\n**ERROR**: Missing return type\n\n## Recent Changes\nAdded try/catch to loginUser\n\n## Relevant Code\nExample from api/client.ts"
}
```

**LLM Prompt** (Backend):
```
You are an AI code editor.

## Diagnostics

**ERROR** [typescript] (line 1): Missing return type annotation.

## Recent Changes

**File**: `src/auth/login.ts` (2 minutes ago)
**Change**: Added error handling with try/catch block
```typescript
try { ... } catch (error) { ... }
```

## Relevant Code from Workspace

**File**: `src/api/client.ts` - function: `apiRequest`
```typescript
async function apiRequest(endpoint: string): Promise<any> { ... }
```

---

## User's Code

```typescript
function fetchUser(userId) {
    return fetch(`/api/users/${userId}`)
        .then(res => res.json());
}
```

## Your Task

Generate the edited code. Fix the missing return type. Use async/await like the examples.
```

**Result**: Much better edit quality!

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Context gathering | <300ms | Aggregator call |
| Serialization | <10ms | JSON stringify |
| Backend prompt assembly | <50ms | String formatting |
| **Total overhead** | **<350ms** | Added latency |

---

## Success Criteria

- [ ] Context injected into request
- [ ] Backend receives context field
- [ ] LLM prompt includes context
- [ ] Edit quality improves (user study)
- [ ] Configuration support
- [ ] Timeout handling (500ms)
- [ ] Error handling (graceful degradation)
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests pass
- [ ] Performance <350ms overhead

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Modify `ServerPoweredInlineEditProvider`
- [ ] Add `gatherContext()` method
- [ ] Add `getUserInstruction()` method
- [ ] Add `getSelectedCode()` method
- [ ] Add timeout protection (500ms)
- [ ] Add context to serialized request
- [ ] Update backend to accept `context` field
- [ ] Update backend prompt assembly
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test end-to-end with backend

---

## Configuration

```json
{
  "puku.inlineEdit.context.enabled": true,
  "puku.inlineEdit.context.includeInPrompt": true,
  "puku.inlineEdit.context.gatherTimeout": 500
}
```

---

## Migration Notes

### Frontend Changes

1. Add `IContextAggregator` dependency to `ServerPoweredInlineEditProvider`
2. Call `gatherContext()` before serializing request
3. Add `context` field to `ISerializedNextEditRequest`

### Backend Changes

1. Add `context?: string` field to request schema
2. Modify `build_llm_prompt()` to include context
3. Update prompt template to use context

### Testing

1. Unit test: context gathering
2. Integration test: end-to-end with mock backend
3. User study: measure edit quality improvement

---

## Related Documents

- `00-overview.md` - Project overview
- `05-context-aggregator.md` - Context aggregator (dependency)
- `01-edit-history-tracker.md` - Edit tracking
- `02-history-context-provider.md` - History context
- `03-semantic-context-provider.md` - Semantic context
- `04-diagnostics-context-provider.md` - Diagnostics context

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 4 hours (frontend) + 2 hours (backend) = 6 hours total
**Dependencies**: Context Aggregator (05)
**Owner**: TBD

---

## Next Steps

1. Implement frontend changes in `ServerPoweredInlineEditProvider`
2. Update backend to accept and use context
3. Test end-to-end workflow
4. Measure edit quality improvement
5. Iterate on prompt template based on results
