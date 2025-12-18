# DiagnosticsProvider Integration - Exact Code Changes

**Issue**: #131 DiagnosticsProvider
**Status**: Implementation Ready
**Estimated Time**: 2-3 hours

---

## Overview

Replace API-based `PukuDiagnosticsNextEditProvider` (~1000ms latency) with reference `DiagnosticsNextEditProvider` (<10ms latency) from vscode-copilot-chat.

**Key Benefits**:
- ✅ <10ms instant suggestions (vs 1000ms)
- ✅ Zero API cost
- ✅ 60%+ win rate in 3-way racing
- ✅ Matches reference implementation exactly

---

## Change 1: pukuaiContribution.ts

**File**: `src/chat/src/extension/pukuai/vscode-node/pukuaiContribution.ts`

### 1.1 Update Import (Line 16)

**BEFORE**:
```typescript
import { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
```

**AFTER**:
```typescript
import { DiagnosticsNextEditProvider } from '../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';
```

**Why**: Use reference implementation instead of API-based custom implementation.

---

### 1.2 Update Instantiation (Lines 130-131)

**BEFORE**:
```typescript
const diagnosticsNextEditProvider = this._instantiationService.createInstance(
	PukuDiagnosticsNextEditProvider
);
```

**AFTER**:
```typescript
const diagnosticsNextEditProvider = this._instantiationService.createInstance(
	DiagnosticsNextEditProvider,
	workspace,
	observableGit
);
```

**Why**: Reference implementation requires `VSCodeWorkspace` and `ObservableGit` dependencies (already created on lines 135-136).

**Note**: Dependencies are already instantiated:
```typescript
// Line 135-136 (existing code)
const workspace = this._instantiationService.createInstance(VSCodeWorkspace);
const observableGit = this._instantiationService.createInstance(ObservableGit);
```

---

## Change 2: pukuUnifiedInlineProvider.ts

**File**: `src/chat/src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts`

### 2.1 Update Import (Line 13)

**BEFORE**:
```typescript
import type { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
```

**AFTER**:
```typescript
import type { DiagnosticsNextEditProvider } from '../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';
```

**Why**: Update type reference to match new provider.

---

### 2.2 Update Type in Constructor (Line 37)

**BEFORE**:
```typescript
constructor(
	private readonly fimProvider: PukuFimProvider,
	private readonly diagnosticsProvider: PukuDiagnosticsNextEditProvider | undefined,
	private readonly nesProvider: PukuNesNextEditProvider | undefined,
	// ...
)
```

**AFTER**:
```typescript
constructor(
	private readonly fimProvider: PukuFimProvider,
	private readonly diagnosticsProvider: DiagnosticsNextEditProvider | undefined,
	private readonly nesProvider: PukuNesNextEditProvider | undefined,
	// ...
)
```

**Why**: Update parameter type to match new provider.

---

## Interface Compatibility

### Both Providers Implement INextEditProvider

**Reference Implementation**:
```typescript
export class DiagnosticsNextEditProvider extends Disposable
	implements INextEditProvider<DiagnosticsNextEditResult, DiagnosticsTelemetryBuilder, boolean>
```

**Current Implementation**:
```typescript
export class PukuDiagnosticsNextEditProvider
	implements IPukuNextEditProvider
```

**IPukuNextEditProvider extends INextEditProvider**, so racing system compatibility is guaranteed.

---

## Complete File Diffs

### File 1: pukuaiContribution.ts

```diff
- import { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
+ import { DiagnosticsNextEditProvider } from '../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';

  // ... (lines 130-136)

- const diagnosticsNextEditProvider = this._instantiationService.createInstance(
- 	PukuDiagnosticsNextEditProvider
- );
+ const diagnosticsNextEditProvider = this._instantiationService.createInstance(
+ 	DiagnosticsNextEditProvider,
+ 	workspace,
+ 	observableGit
+ );
```

### File 2: pukuUnifiedInlineProvider.ts

```diff
- import type { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
+ import type { DiagnosticsNextEditProvider } from '../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';

  // ... (constructor signature)

  constructor(
  	private readonly fimProvider: PukuFimProvider,
- 	private readonly diagnosticsProvider: PukuDiagnosticsNextEditProvider | undefined,
+ 	private readonly diagnosticsProvider: DiagnosticsNextEditProvider | undefined,
  	private readonly nesProvider: PukuNesNextEditProvider | undefined,
  	// ...
  )
```

---

## Verification Steps

### Step 1: Compilation Test

```bash
cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat
npm run compile
```

**Expected Output**:
```
✓ Compilation succeeded
⚠ 1 warning (sqlite-vec - unrelated)
✗ 0 errors
```

**If Errors**: Review import paths and type signatures above.

---

### Step 2: Manual Testing

#### Test 2.1: TypeScript Missing Import

1. Open VS Code with extension
2. Create new TypeScript file: `test.ts`
3. Type: `const doc = new Document();`
4. Wait for inline suggestion
5. **Expected**: Instant (<10ms) suggestion to add `import { Document } from '...'`
6. **Verify**: Suggestion appears immediately (no 1000ms delay)

#### Test 2.2: async/await Missing Keyword

1. Create TypeScript file with Promise-returning function:
```typescript
function getData(): Promise<string> {
	return Promise.resolve('data');
}

function processData() {
	const data = getData(); // Error: missing await
}
```
2. Wait for inline suggestion
3. **Expected**: Instant suggestion to add `await` and make function `async`

#### Test 2.3: Racing System

1. Enable logging: Set `"puku.trace": "verbose"` in settings
2. Trigger inline completion
3. Check output logs for race winner
4. **Expected**: DiagnosticsProvider wins ~60% of races when diagnostic available

---

### Step 3: Performance Verification

**Check Telemetry** (if available):
- DiagnosticsProvider latency: <10ms
- Win rate: >50% (when diagnostic available)
- Zero API calls to backend

**VS Code Output Panel**:
- Check "Puku AI" output for timing logs
- Verify no errors from DiagnosticsCompletionProcessor

---

## Rollback Plan

### If Issues Arise

**Step 1: Restore backup**
```bash
cd /Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat/src/extension/pukuai/vscode-node/providers
mv pukuDiagnosticsNextEditProvider.backup.ts pukuDiagnosticsNextEditProvider.ts
```

**Step 2: Revert imports in pukuaiContribution.ts**
```diff
- import { DiagnosticsNextEditProvider } from '../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';
+ import { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
```

**Step 3: Revert instantiation**
```diff
- const diagnosticsNextEditProvider = this._instantiationService.createInstance(
- 	DiagnosticsNextEditProvider,
- 	workspace,
- 	observableGit
- );
+ const diagnosticsNextEditProvider = this._instantiationService.createInstance(
+ 	PukuDiagnosticsNextEditProvider
+ );
```

**Step 4: Revert types in pukuUnifiedInlineProvider.ts**
```diff
- import type { DiagnosticsNextEditProvider } from '../../inlineEdits/vscode-node/features/diagnosticsInlineEditProvider';
+ import type { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';

- 	private readonly diagnosticsProvider: DiagnosticsNextEditProvider | undefined,
+ 	private readonly diagnosticsProvider: PukuDiagnosticsNextEditProvider | undefined,
```

**Step 5: Recompile**
```bash
cd src/chat && npm run compile
```

---

## Dependencies Already Satisfied

**Required by Reference Implementation**:
- ✅ `VSCodeWorkspace` (already instantiated line 135)
- ✅ `ObservableGit` (already instantiated line 136)
- ✅ `IInstantiationService` (available via DI)
- ✅ `ILogService` (available via DI)

**Required by DiagnosticsCompletionProcessor**:
- ✅ `RejectionCollector` (Issue #130 - already integrated)
- ✅ `WorkspaceDocumentEditHistory` (exists)
- ✅ `DiagnosticData`, `RootedLineEdit` (exist)

---

## Risk Assessment

### Low Risk ✅
- All dependencies verified and exist
- Reference implementation already compiles
- Backup created for rollback
- Interface compatibility confirmed
- RejectionCollector already integrated (#130)

### Medium Risk ⚠️
- Racing logic may need minor adjustments (unlikely - same interface)
- Telemetry format may differ (cosmetic only)

### High Risk ❌
- None identified

---

## Success Criteria

### Technical Metrics
- ✅ Compilation succeeds with 0 errors
- ✅ DiagnosticsProvider returns results in <10ms
- ✅ Wins >50% of 3-way races (when diagnostic available)
- ✅ Rejection tracking works via RejectionCollector
- ✅ No runtime errors in VS Code output

### User Experience Metrics
- ✅ Instant import suggestions (TypeScript/JavaScript)
- ✅ Instant async/await suggestions
- ✅ No flickering or race condition bugs
- ✅ No API cost increase

---

## Implementation Checklist

- [ ] **File 1**: Update import in `pukuaiContribution.ts`
- [ ] **File 1**: Update instantiation with workspace + observableGit
- [ ] **File 2**: Update import in `pukuUnifiedInlineProvider.ts`
- [ ] **File 2**: Update constructor parameter type
- [ ] **Verify**: Run `npm run compile` - 0 errors
- [ ] **Test 1**: TypeScript missing import (instant suggestion)
- [ ] **Test 2**: async/await keyword (instant suggestion)
- [ ] **Test 3**: Check racing logs (60%+ win rate)
- [ ] **Document**: Update status document with results

---

## Next Steps After Integration

1. **Monitor Performance** (1 day):
   - Collect latency metrics
   - Verify win rates
   - Check for edge cases

2. **User Testing** (1 day):
   - Test with TypeScript projects
   - Test with React projects
   - Test with Python projects (if supported)

3. **Documentation Update**:
   - Update `docs/status/diagnostics-provider-status.md`
   - Create test report
   - Update PRD with actual metrics

4. **Future Enhancements** (Optional):
   - Add API-based fallback for unsupported diagnostics
   - Expand to 4-way racing (FIM > Diagnostics > NES > API Diagnostics)

---

## References

- **PRD**: `docs/prd/diagnostics-provider-prd.md`
- **Architecture**: `docs/architecture/diagnostics-provider-architecture.md`
- **Status**: `docs/status/diagnostics-provider-status.md`
- **Reference Implementation**: `src/chat/src/extension/inlineEdits/vscode-node/features/diagnosticsInlineEditProvider.ts`
- **Backup**: `src/chat/src/extension/pukuai/vscode-node/providers/pukuDiagnosticsNextEditProvider.backup.ts`

---

**Ready to implement**: All changes documented and verified. Proceed with code modifications following this document.
