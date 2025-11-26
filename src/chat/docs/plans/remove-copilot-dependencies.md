# Plan: Remove Copilot Dependencies from Puku Editor

## Overview

This document outlines the comprehensive plan to remove all GitHub Copilot dependencies from Puku Editor, making it a fully independent AI-powered code editor using Puku's own infrastructure.

## Current State Analysis

### Dependency Summary

| Category | Count | Severity |
|----------|-------|----------|
| Files referencing "copilot" in editor | 741 | - |
| Files referencing "copilot" in VS Code fork | 133 | - |
| Files using `@vscode/copilot-api` package | 37 | CRITICAL |
| Files using `CopilotToken`/`ICopilotToken` | 84 | CRITICAL |
| Chat participants with `github.copilot.*` ID | 13 | HIGH |
| Commands with `github.copilot.*` prefix | 70+ | HIGH |
| Settings with `github.copilot.*` prefix | 50+ | MEDIUM |
| Context keys with `github.copilot.*` prefix | 20+ | MEDIUM |

### Existing Puku Infrastructure (Already Built)

- `src/extension/pukuai/` - Puku AI integration
- `src/extension/byok/` - BYOK (Bring Your Own Key) with Ollama support
- `src/extension/pukuIndexing/` - Custom semantic indexing with sqlite-vec
- `src/extension/pukuChat/` - Puku chat participant (in progress)
- `github/proxy/` - Proxy server for GLM models (GLM-4.6, GLM-4.5, GLM-4.5-Air)

---

## Phase 1: Abstract Authentication Layer

**Goal:** Replace Copilot token management with Puku's own authentication system.

### 1.1 Current Copilot Authentication Files

```
src/platform/authentication/
├── common/
│   ├── copilotToken.ts              # Token class, plan detection, quota
│   ├── copilotTokenManager.ts       # ICopilotTokenManager interface
│   └── copilotTokenStore.ts         # Token persistence
└── node/
    └── copilotTokenManager.ts       # Implementation, calls api.github.com
```

### 1.2 New Puku Authentication Structure

```
src/platform/authentication/
├── common/
│   ├── pukuAuthTypes.ts             # NEW: Auth types and interfaces
│   ├── pukuAuthService.ts           # NEW: IPukuAuthService interface
│   └── authProviders.ts             # NEW: Provider abstraction
├── node/
│   ├── pukuAuthService.ts           # NEW: Main auth service
│   ├── providers/
│   │   ├── pukuAiProvider.ts        # NEW: Puku AI (Z.AI) auth
│   │   ├── ollamaProvider.ts        # NEW: Ollama/BYOK auth (no auth needed)
│   │   └── openRouterProvider.ts    # NEW: OpenRouter auth
│   └── copilotTokenManager.ts       # DEPRECATED: Keep for backward compat
└── vscode-node/
    └── pukuAuth.contribution.ts     # NEW: Register auth providers
```

### 1.3 IPukuAuthService Interface

```typescript
// src/platform/authentication/common/pukuAuthService.ts

export const IPukuAuthService = createDecorator<IPukuAuthService>('pukuAuthService');

export interface IPukuAuthService {
  readonly _serviceBrand: undefined;

  // Get current auth provider
  readonly currentProvider: IObservable<AuthProvider>;

  // Get auth headers for API requests
  getAuthHeaders(): Promise<Record<string, string>>;

  // Check if authenticated
  isAuthenticated(): Promise<boolean>;

  // Get API endpoint URL
  getEndpointUrl(): string;

  // Switch auth provider
  setProvider(provider: AuthProvider): Promise<void>;
}

export enum AuthProvider {
  PukuAI = 'puku-ai',      // Z.AI GLM models
  Ollama = 'ollama',        // Local Ollama
  OpenRouter = 'openrouter', // OpenRouter API
  Custom = 'custom'         // Custom endpoint
}
```

### 1.4 Migration Strategy

1. Create new `IPukuAuthService` alongside existing `ICopilotTokenManager`
2. Update services to prefer `IPukuAuthService` when available
3. Fall back to `ICopilotTokenManager` for backward compatibility
4. Gradually migrate all consumers to new service
5. Eventually deprecate Copilot token manager

### 1.5 Files to Modify

| File | Action |
|------|--------|
| `src/extension/extension/vscode-node/services.ts` | Register IPukuAuthService |
| `src/extension/conversation/vscode-node/languageModelAccess.ts` | Use IPukuAuthService |
| `src/platform/endpoint/node/chatEndpoint.ts` | Use IPukuAuthService for headers |
| `src/platform/endpoint/common/capiClient.ts` | Abstract to support multiple backends |

---

## Phase 2: Replace @vscode/copilot-api Package

**Goal:** Remove dependency on `@vscode/copilot-api` NPM package (version ^0.1.13).

### 2.1 Current Usage

The package provides 3 main exports used across 32 files:

| Export | Used In | Purpose |
|--------|---------|---------|
| `RequestType` | 28 files | Enum for different API request types |
| `RequestMetadata` | 10 files | Metadata object with `type` field |
| `CAPIClient` | 1 file | Base class for Copilot API client |

Additional types used in tests:
- `CopilotToken`, `FetchOptions`, `IDomainChangeResponse`

### 2.2 RequestType Enum Values Used

```typescript
// All RequestType values currently used in codebase:
RequestType.CopilotToken           // Token acquisition
RequestType.CopilotNLToken         // NL token
RequestType.CopilotUserInfo        // User info
RequestType.ChatCompletions        // Chat API
RequestType.ChatResponses          // Responses API
RequestType.ProxyChatCompletions   // Proxy completions
RequestType.Models                 // Model list
RequestType.AutoModels             // Auto model selection
RequestType.ModelPolicy            // Model policy acceptance
RequestType.CAPIEmbeddings         // CAPI embeddings
RequestType.DotcomEmbeddings       // Dotcom embeddings
RequestType.EmbeddingsIndex        // Embeddings index
RequestType.EmbeddingsCodeSearch   // Code search
RequestType.EmbeddingsModels       // Embedding models
RequestType.Chunks                 // Code chunking
RequestType.ContentExclusion       // Content exclusion rules
RequestType.ChatAttachmentUpload   // File uploads
RequestType.RemoteAgent            // Remote agent
RequestType.RemoteAgentChat        // Remote agent chat
RequestType.ListSkills             // Skill listing
RequestType.SearchSkill            // Search skill
RequestType.SnippyMatch            // Snippy matching
RequestType.SnippyFilesForMatch    // Snippy file matching
RequestType.CodeReviewAgent        // Code review
RequestType.ListModel              // Model listing
```

### 2.3 Files Using @vscode/copilot-api (32 total)

**Critical Path (Authentication & Endpoints):**
```
src/platform/authentication/node/copilotTokenManager.ts
src/platform/endpoint/node/chatEndpoint.ts
src/platform/endpoint/node/embeddingsEndpoint.ts
src/platform/endpoint/node/modelMetadataFetcher.ts
src/platform/endpoint/node/automodeService.ts
src/platform/endpoint/node/proxyInstantApplyShortEndpoint.ts
src/platform/endpoint/node/proxy4oEndpoint.ts
src/platform/endpoint/node/proxyXtabEndpoint.ts
src/platform/endpoint/common/capiClient.ts
src/platform/endpoint/common/endpointProvider.ts
```

**Networking:**
```
src/platform/networking/common/networking.ts
src/platform/networking/test/node/networking.spec.ts
```

**Search & Embeddings:**
```
src/platform/embeddings/common/remoteEmbeddingsComputer.ts
src/platform/workspaceChunkSearch/common/githubAvailableEmbeddingTypes.ts
src/platform/remoteCodeSearch/common/githubCodeSearchService.ts
src/platform/remoteSearch/node/codeOrDocsSearchClientImpl.ts
src/platform/chunking/common/chunkingEndpointClientImpl.ts
```

**Features:**
```
src/platform/ignore/node/remoteContentExclusion.ts
src/platform/image/node/imageServiceImpl.ts
src/platform/snippy/common/snippyFetcher.ts
src/extension/conversation/vscode-node/remoteAgents.ts
src/extension/review/node/githubReviewAgent.ts
src/extension/xtab/node/xtabProvider.ts
src/extension/log/vscode-node/loggingActions.ts
src/extension/prompt/vscode-node/requestLoggerImpl.ts
src/extension/prompts/node/panel/image.tsx
src/extension/prompts/node/panel/toolCalling.tsx
```

**Tests:**
```
src/platform/test/node/telemetry.ts
src/platform/endpoint/test/node/capiEndpoint.ts
```

### 2.4 New Type Definitions

Create `src/platform/api/common/pukuRequestTypes.ts`:

```typescript
/**
 * Request types for Puku API - replaces @vscode/copilot-api RequestType
 *
 * For Puku, we simplify to only the types we actually need:
 * - Authentication: PukuAuth
 * - Chat: ChatCompletions, ChatResponses
 * - Embeddings: Embeddings
 * - Models: Models
 */
export enum PukuRequestType {
  // Authentication (only needed for Copilot compat mode)
  CopilotToken = 'copilot-token',
  CopilotNLToken = 'copilot-nl-token',
  CopilotUserInfo = 'copilot-user-info',

  // Chat
  ChatCompletions = 'chat-completions',
  ChatResponses = 'chat-responses',
  ProxyChatCompletions = 'proxy-chat-completions',

  // Models
  Models = 'models',
  AutoModels = 'auto-models',
  ModelPolicy = 'model-policy',
  ListModel = 'list-model',

  // Embeddings
  CAPIEmbeddings = 'capi-embeddings',
  DotcomEmbeddings = 'dotcom-embeddings',
  EmbeddingsIndex = 'embeddings-index',
  EmbeddingsCodeSearch = 'embeddings-code-search',
  EmbeddingsModels = 'embeddings-models',

  // Chunking
  Chunks = 'chunks',

  // Content
  ContentExclusion = 'content-exclusion',
  ChatAttachmentUpload = 'chat-attachment-upload',

  // Remote Agents (may deprecate)
  RemoteAgent = 'remote-agent',
  RemoteAgentChat = 'remote-agent-chat',
  ListSkills = 'list-skills',
  SearchSkill = 'search-skill',

  // Snippy (may deprecate)
  SnippyMatch = 'snippy-match',
  SnippyFilesForMatch = 'snippy-files-for-match',

  // Code Review (may deprecate)
  CodeReviewAgent = 'code-review-agent',
}

/**
 * Request metadata - replaces @vscode/copilot-api RequestMetadata
 */
export interface PukuRequestMetadata {
  type: PukuRequestType;
  // Optional fields for specific request types
  modelId?: string;
  repoWithOwner?: string;
  repos?: string[];
  slug?: string;
  uploadName?: string;
  mimeType?: string;
  isModelLab?: boolean;
}

/**
 * Type alias for backward compatibility during migration
 */
export type RequestType = PukuRequestType;
export type RequestMetadata = PukuRequestMetadata;
```

### 2.5 CAPIClient Replacement

The `CAPIClient` class from `@vscode/copilot-api` is only used in one file:
`src/platform/endpoint/common/capiClient.ts`

Create `src/platform/api/common/pukuApiClient.ts`:

```typescript
import { IFetcherService } from '../../networking/common/fetcherService';
import { PukuRequestMetadata } from './pukuRequestTypes';

export interface IPukuClientOptions {
  machineId: string;
  sessionId: string;
  vscodeVersion: string;
  buildType: string;
  name: string;
  version: string;
}

export interface IRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Base Puku API client - replaces CAPIClient from @vscode/copilot-api
 */
export class PukuApiClient {
  constructor(
    protected readonly options: IPukuClientOptions,
    protected readonly licenseAgreement: string,
    protected readonly fetcherService: IFetcherService,
    protected readonly hmac?: string,
    protected readonly forceDevMode?: boolean
  ) {}

  /**
   * Make a request to the Puku API
   */
  async makeRequest<T>(
    requestOptions: IRequestOptions,
    metadata: PukuRequestMetadata
  ): Promise<T> {
    // Implementation will route to appropriate backend based on configuration
    // - Puku AI (Z.AI)
    // - Ollama
    // - OpenRouter
    // - Copilot (backward compat)
    throw new Error('Not implemented - use specific provider');
  }

  /**
   * Get the URL for a specific request type
   */
  protected getUrlForRequestType(metadata: PukuRequestMetadata): string {
    // Route based on request type and configured backend
    throw new Error('Not implemented - use specific provider');
  }
}
```

### 2.6 Migration Strategy

**Step 1: Create Puku types (non-breaking)**
1. Create `src/platform/api/common/pukuRequestTypes.ts`
2. Create `src/platform/api/common/pukuApiClient.ts`
3. Export both old names (`RequestType`, `RequestMetadata`) for compatibility

**Step 2: Update imports incrementally**
```typescript
// Before
import { RequestType } from '@vscode/copilot-api';

// After
import { RequestType } from '../../../platform/api/common/pukuRequestTypes';
```

**Step 3: Update files in order of dependency**
1. `src/platform/api/common/` - New types
2. `src/platform/endpoint/common/capiClient.ts` - Use new base class
3. `src/platform/authentication/node/copilotTokenManager.ts` - Use new types
4. All endpoint files
5. All feature files
6. Tests

**Step 4: Remove @vscode/copilot-api**
1. Remove from `package.json`
2. Run `npm install`
3. Verify build passes

### 2.7 Testing Strategy

1. Create unit tests for new types
2. Ensure all existing tests pass with new imports
3. Integration test with proxy server

---

## Phase 3: Rename Identifiers

**Goal:** Change all `github.copilot.*` identifiers to `puku.*`.

### 3.1 Chat Participants

**Current → New:**
```
github.copilot.default → puku.default
github.copilot.workspace → puku.workspace
github.copilot.editor → puku.editor
github.copilot.terminal → puku.terminal
github.copilot.notebook → puku.notebook
github.copilot.editingSession → puku.editingSession
github.copilot.editsAgent → puku.editsAgent
... (13 total)
```

**Files to modify:**
- `package.json` - chatParticipants section
- `src/extension/conversation/vscode-node/chatParticipants.ts`
- All files registering or referencing participants

### 3.2 Commands

**Current → New (examples):**
```
github.copilot.chat.open → puku.chat.open
github.copilot.chat.newSession → puku.chat.newSession
github.copilot.debug.startDebugging → puku.debug.startDebugging
github.copilot.terminal.explainLastCommand → puku.terminal.explainLastCommand
... (70+ total)
```

**Files to modify:**
- `package.json` - commands section
- All files using `vscode.commands.executeCommand('github.copilot.*')`
- All files using `vscode.commands.registerCommand('github.copilot.*')`

### 3.3 Settings

**Current → New (examples):**
```
github.copilot.chat.localeOverride → puku.chat.localeOverride
github.copilot.chat.terminalChatLocation → puku.chat.terminalChatLocation
github.copilot.advanced.debug.overrideProxyUrl → puku.advanced.debug.overrideProxyUrl
... (50+ total)
```

**Files to modify:**
- `package.json` - configuration section
- `src/platform/configuration/common/configurationService.ts`
- All files reading settings

### 3.4 Context Keys

**Current → New:**
```
github.copilot.chat.debug → puku.chat.debug
github.copilot.auth.missingPermissiveSession → puku.auth.missingPermissiveSession
github.copilot.interactiveSession.disabled → puku.interactiveSession.disabled
github.copilot.offline → puku.offline
... (20+ total)
```

**Files to modify:**
- `package.json` - when clauses
- `src/extension/contextKeys/vscode-node/contextKeys.contribution.ts`
- All files using context keys

### 3.5 Migration Script

Create a script to automate bulk renaming:

```typescript
// scripts/rename-identifiers.ts

const RENAMES = {
  'github.copilot.': 'puku.',
  'GitHub.copilot': 'Puku.puku',
  'copilot-chat': 'puku-editor',
};

// Process package.json, all .ts files, etc.
```

---

## Phase 4: Create Puku API Client

**Goal:** Replace CAPI client with Puku's own API client supporting multiple backends.

### 4.1 New API Client Structure

```
src/platform/api/
├── common/
│   ├── pukuApiTypes.ts          # Request/response types
│   ├── pukuApiClient.ts         # IPukuApiClient interface
│   └── apiProviders.ts          # Provider definitions
├── node/
│   ├── pukuApiClient.ts         # Main API client
│   ├── providers/
│   │   ├── zaiProvider.ts       # Z.AI GLM backend
│   │   ├── ollamaProvider.ts    # Ollama backend
│   │   └── openRouterProvider.ts # OpenRouter backend
│   └── streaming.ts             # SSE streaming support
└── vscode-node/
    └── pukuApi.contribution.ts  # Registration
```

### 4.2 IPukuApiClient Interface

```typescript
// src/platform/api/common/pukuApiClient.ts

export const IPukuApiClient = createDecorator<IPukuApiClient>('pukuApiClient');

export interface IPukuApiClient {
  readonly _serviceBrand: undefined;

  // Chat completion
  chat(request: PukuChatRequest): Promise<PukuChatResponse>;
  chatStream(request: PukuChatRequest): AsyncIterable<PukuChatChunk>;

  // Text completion (for FIM)
  complete(request: PukuCompletionRequest): Promise<PukuCompletionResponse>;

  // Embeddings
  embed(request: PukuEmbeddingRequest): Promise<PukuEmbeddingResponse>;

  // Get available models
  getModels(): Promise<PukuModel[]>;
}
```

### 4.3 Backend Providers

| Provider | Endpoint | Auth | Models |
|----------|----------|------|--------|
| Z.AI | `api.z.ai/api/coding/paas/v4/` | API Key | GLM-4.6, GLM-4.5, GLM-4.5-Air |
| Ollama | `localhost:11434/v1/` | None | Local models |
| OpenRouter | `openrouter.ai/api/v1/` | API Key | Multiple providers |
| Custom | User-defined | User-defined | User-defined |

---

## Phase 5: Update VS Code Fork

**Goal:** Configure forked VS Code to use Puku as default chat agent.

### 5.1 product.json Changes

```json
// Current
{
  "defaultChatAgent": {
    "extensionId": "GitHub.copilot",
    "chatExtensionId": "GitHub.copilot-chat",
    ...
  }
}

// New
{
  "defaultChatAgent": {
    "extensionId": "Puku.puku-editor",
    "chatExtensionId": "Puku.puku-editor",
    "name": "Puku AI",
    "documentationUrl": "https://puku.sh/docs",
    "termsStatementUrl": "https://puku.sh/terms",
    "privacyStatementUrl": "https://puku.sh/privacy",
    "provider": {
      "default": { "id": "puku", "name": "Puku AI" }
    }
  }
}
```

### 5.2 Chat Setup Modifications

**File:** `src/vs/workbench/contrib/chat/browser/chatSetup.ts`

- Update extension ID references
- Update branding strings
- Remove GitHub-specific setup flow

### 5.3 Files Already Modified (Previous Work)

- `chatStatus.ts` - Changed "Copilot" → "Puku"
- `chat.contribution.ts` - Changed "GitHub Copilot" → "Puku AI"
- `chatListRenderer.ts` - Changed `COPILOT_USERNAME` to "Puku AI"

### 5.4 Remaining VS Code Files

| File | Changes Needed |
|------|----------------|
| `product.json` | Update defaultChatAgent |
| `chatSetup.ts` | Update extension IDs |
| `chatAgents.ts` | Remove Copilot-specific logic |
| `languageModels.ts` | Abstract model providers |

---

## Phase 6: Rebrand Assets

**Goal:** Replace all Copilot branding with Puku branding.

### 6.1 Assets to Replace

| Current | New | Location |
|---------|-----|----------|
| `copilot.png` | `puku.png` | `assets/` |
| `copilot.woff` | `puku.woff` (if custom font) | `assets/` |
| `copilot-cloud-*.svg` | `puku-cloud-*.svg` | `assets/` |

### 6.2 Strings to Update

**File:** `package.nls.json`

- Search for "Copilot" → Replace with "Puku"
- Search for "GitHub Copilot" → Replace with "Puku AI"
- Review all 200+ user-facing strings

### 6.3 Identity Prompt

**File:** `src/extension/prompts/node/base/copilotIdentity.tsx`

Already updated to identify as "Puku Editor" - verify and enhance.

---

## Phase 7: Integrate Puku Indexing with Chat

**Goal:** Use Puku's semantic indexing system as the context provider for chat.

### 7.1 Current State

- `PukuIndexingService` - AST-based code chunking + embeddings
- `PukuEmbeddingsCache` - SQLite storage with sqlite-vec
- Workspace semantic search working

### 7.2 Integration Points

1. **Chat Context Resolution**
   - Replace `IWorkspaceChunkSearchService` with `IPukuIndexingService`
   - Use Puku embeddings for semantic file search

2. **Code Mapping**
   - Use AST chunks for precise code references
   - Enable inline editing with proper file locations

3. **Files to Modify:**
   - `src/extension/context/node/contextResolvers.ts`
   - `src/extension/search/node/workspaceSearchProvider.ts`
   - Chat participant handlers

---

## Implementation Order

### Sprint 1: Foundation (Week 1-2)
- [ ] Phase 1: Abstract Authentication Layer
- [ ] Phase 2: Replace @vscode/copilot-api Package

### Sprint 2: Identifiers (Week 3)
- [ ] Phase 3: Rename Identifiers (automated script + manual review)

### Sprint 3: API & VS Code (Week 4)
- [ ] Phase 4: Create Puku API Client
- [ ] Phase 5: Update VS Code Fork

### Sprint 4: Polish (Week 5)
- [ ] Phase 6: Rebrand Assets
- [ ] Phase 7: Integrate Puku Indexing with Chat

---

## Testing Strategy

### Unit Tests
- Auth provider switching
- API client with different backends
- Identifier migration correctness

### Integration Tests
- Chat flow with Puku AI backend
- Chat flow with Ollama backend
- Inline editing with Agent mode
- Semantic search with Puku indexing

### Manual Testing
- Full chat conversation
- Code editing and applying changes
- FIM completions
- All 70+ commands work

---

## Rollback Plan

1. Keep `ICopilotTokenManager` as deprecated fallback
2. Support both `github.copilot.*` and `puku.*` identifiers temporarily
3. Feature flag for switching between Copilot and Puku backends

---

## Success Criteria

- [ ] Extension works without any Copilot API calls
- [ ] No `@vscode/copilot-api` in package.json
- [ ] All identifiers use `puku.*` prefix
- [ ] Chat works with GLM models via proxy
- [ ] Inline editing works in Agent mode
- [ ] Semantic search uses Puku indexing
- [ ] No "Copilot" or "GitHub Copilot" visible in UI

---

## Appendix: File Inventory

### Critical Files (Must Change)

1. `src/platform/authentication/node/copilotTokenManager.ts`
2. `src/platform/authentication/common/copilotToken.ts`
3. `src/platform/endpoint/common/capiClient.ts`
4. `src/platform/endpoint/node/copilotChatEndpoint.ts`
5. `package.json`
6. `github/vscode/product.json`

### High Priority Files (84 files using CopilotToken)

See full list in analysis report.

### Medium Priority Files (Settings, Commands, Context Keys)

Automated script will handle bulk updates.

### Low Priority Files (Branding)

Manual review for user-facing strings.
