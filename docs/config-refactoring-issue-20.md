# Config Refactoring: FIM Provider (Issue #20)

**Issue**: https://github.com/puku-sh/puku-vs-editor/issues/20
**Status**: ✅ Completed
**Date**: 2025-12-02

## Problem

The FIM inline completion provider had hardcoded configuration values:
- Debounce: `200ms` (line 141)
- FIM endpoint: `${this._endpoint}/v1/fim/context` (line 612)

This prevented:
- Server-side configuration updates
- A/B testing of performance parameters
- Environment-specific endpoints

## Solution

Refactored the provider to use `IPukuConfigService` for all configuration values.

## Changes Made

### 1. Removed Hardcoded Debounce Value

**Before:**
```typescript
export class PukuInlineCompletionProvider extends Disposable {
    private _debounceMs = 200; // Hardcoded
    // ...
}
```

**After:**
```typescript
export class PukuInlineCompletionProvider extends Disposable {
    // Field removed, now using getter

    /**
     * Get debounce delay from config service
     */
    private get _debounceMs(): number {
        return this._configService.getConfig().performance.debounceMs;
    }
}
```

**Location**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts:183-185`

### 2. Replaced Hardcoded FIM Endpoint

**Before:**
```typescript
private async _fetchContextAwareCompletion(...) {
    const url = `${this._endpoint}/v1/fim/context`;
    console.log(`[PukuInlineCompletion] Calling ${url} with language=${languageId}`);
    // ...
}
```

**After:**
```typescript
private async _fetchContextAwareCompletion(...) {
    const config = this._configService.getConfig();
    const url = config.endpoints.fim;
    const model = config.models.fim;
    console.log(`[PukuInlineCompletion] Calling ${url} with language=${languageId}, model=${model}`);
    // ...
}
```

**Location**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts:618-621`

### 3. Added Config Logging

**Added to constructor:**
```typescript
constructor(..., @IPukuConfigService private readonly _configService: IPukuConfigService) {
    super();
    const config = this._configService.getConfig();
    this._logService.info(`[PukuInlineCompletion] Provider created with endpoint: ${_endpoint}`);
    this._logService.info(`[PukuInlineCompletion] Config: FIM endpoint=${config.endpoints.fim}, model=${config.models.fim}, debounce=${config.performance.debounceMs}ms`);
    console.log(`[PukuInlineCompletion] Config loaded: debounce=${config.performance.debounceMs}ms, model=${config.models.fim}`);
    // ...
}
```

**Location**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts:172-175`

### 4. Updated Test Documentation

Added comments to test files explaining that hardcoded `800ms` values come from server config:

```typescript
const debounceMs = 800; // From server config (DEFAULT_PUKU_CONFIG.performance.debounceMs)
```

**Location**: `src/chat/src/extension/pukuai/test/pukuInlineCompletionCache.spec.ts:196,234,329`

## Files Modified

1. **pukuInlineCompletionProvider.ts**
   - Removed `_debounceMs` field
   - Added `_debounceMs` getter
   - Updated `_fetchContextAwareCompletion` to use config
   - Added config logging in constructor

2. **pukuInlineCompletionCache.spec.ts**
   - Added comments documenting hardcoded test values

## Configuration Source

The provider now reads from `IPukuConfigService`, which fetches from:

**Server API**: `https://api.puku.sh/v1/config`

**Default Config** (fallback):
```typescript
{
  endpoints: {
    fim: 'https://api.puku.sh/v1/fim/context',
    // ...
  },
  models: {
    fim: 'mistralai/codestral-2501',
    // ...
  },
  performance: {
    debounceMs: 800,
    cacheTTL: 300000,
    maxConcurrentJobs: 5,
    chunksPerJob: 20
  }
}
```

**Location**: `src/chat/src/extension/pukuIndexing/common/pukuConfig.ts:43-68`

## Benefits

✅ **Server-side tuning**: Change debounce without rebuilding client
✅ **Environment flexibility**: Different configs for dev/staging/prod
✅ **A/B testing**: Test different debounce values server-side
✅ **Single source of truth**: All config from `/v1/config` API
✅ **Better visibility**: Config values logged on startup
✅ **Type safety**: Zod validation on server + TypeScript on client

## Testing

### Manual Testing

1. **Launch extension in debug mode:**
   ```bash
   cd src/chat
   # Press F5 or use "Launch Puku Editor Extension - Watch Mode"
   ```

2. **Check console logs for:**
   ```
   [PukuInlineCompletion] Config: FIM endpoint=https://api.puku.sh/v1/fim/context, model=mistralai/codestral-2501, debounce=800ms
   ```

3. **Verify API calls use config endpoint:**
   - Open a `.go` file
   - Start typing: `func main() {`
   - Look for: `[PukuInlineCompletion] Calling https://api.puku.sh/v1/fim/context with language=go, model=mistralai/codestral-2501`

### Verify Config API

```bash
curl https://api.puku.sh/v1/config | jq
```

### Test Debounce Behavior

- **Fast typing** (< 800ms): Should see `[PukuInlineCompletion][X] Debounced`
- **Slow typing** (> 800ms): Should see API calls

## Compilation

```bash
npm run compile
```

**Result**: ✅ Success (only pre-existing warnings)

## Related Issues

- **Next**: [#21 - Refactor summary generator to use PukuConfigService](https://github.com/puku-sh/puku-vs-editor/issues/21)
- **Next**: [#22 - Refactor embeddings computer to use PukuConfigService](https://github.com/puku-sh/puku-vs-editor/issues/22)
- **Next**: [#23 - Refactor refactoring detection to use PukuConfigService](https://github.com/puku-sh/puku-vs-editor/issues/23)
- **Next**: [#24 - Remove hardcoded https://api.puku.sh base URLs](https://github.com/puku-sh/puku-vs-editor/issues/24)

## Architecture Notes

### Config Service Flow

```
Extension Activation
    ↓
VsCodePukuConfigService.initialize()
    ↓
Fetch https://api.puku.sh/v1/config
    ↓
Cache config (auto-refresh every 5 minutes)
    ↓
PukuInlineCompletionProvider reads via getConfig()
    ↓
Uses config.performance.debounceMs
    ↓
Uses config.endpoints.fim
    ↓
Uses config.models.fim (for logging)
```

### Config Service Interface

```typescript
interface IPukuConfigService {
    getConfig(): PukuConfig;  // Returns config or DEFAULT_PUKU_CONFIG
    refresh(): Promise<void>;  // Force refresh from server
    onDidChangeConfig: Event<PukuConfig>;  // Config change events
}
```

## Future Improvements

1. **Dynamic config updates**: Listen to `onDidChangeConfig` event to apply config changes without restart
2. **Per-file debounce**: Different debounce for different file types
3. **User overrides**: Allow users to override server config via VS Code settings
4. **Config validation**: Add runtime validation of config values

## Notes

- The `_endpoint` constructor parameter is still used as a fallback/bootstrap value
- Config is refreshed automatically every 5 minutes (configurable via `performance.cacheTTL`)
- If server is unavailable, falls back to `DEFAULT_PUKU_CONFIG`
- All config access is synchronous via `getConfig()` (config is pre-loaded during initialization)
