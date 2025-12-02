# Puku Editor Authentication Architecture

## Overview

Puku Editor uses a **multi-layered authentication system** that integrates Google OAuth through a custom Cloudflare Worker API, with session management across VS Code workbench layer and extension layer.

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Cloudflare Worker (api.puku.sh)                             │
│     ├── /auth/google - Initiate Google OAuth                    │
│     ├── /auth/google/callback - OAuth callback handler          │
│     ├── /auth/session - Validate session & get user info        │
│     ├── /auth/logout - Invalidate session                       │
│     └── KV Store - Session storage (7 day expiry)               │
│                                                                  │
│  2. VS Code Workbench Layer                                      │
│     ├── PukuAuthService (pukuAuthService.ts)                    │
│     │   ├── signInWithGoogle() - Opens browser to OAuth         │
│     │   ├── handleURL() - Receives callback via puku:// URI     │
│     │   ├── Stores session in VS Code storage                   │
│     │   └── Exposes commands for extension layer                │
│     │                                                            │
│     └── ChatEntitlementService (chatEntitlementService.ts)      │
│         ├── Uses PukuAuthService for Google sign-in             │
│         └── Bypasses VS Code AuthenticationProvider             │
│                                                                  │
│  3. Extension Layer                                              │
│     ├── PukuAuthContribution (pukuAuth.contribution.ts)         │
│     │   ├── Registers VS Code commands                          │
│     │   ├── Status bar UI (hidden - handled by VS Code layer)   │
│     │   └── Bridges workbench ↔ extension                       │
│     │                                                            │
│     ├── PukuAuthProvider (pukuAuthProvider.ts)                  │
│     │   ├── Implements vscode.AuthenticationProvider            │
│     │   ├── Registered with ID "puku"                           │
│     │   └── Used by VS Code auth system (optional)              │
│     │                                                            │
│     └── VsCodePukuAuthService (vscodePukuAuthService.ts)        │
│         ├── Polls for auth state via commands                   │
│         ├── Provides token for indexing/API calls               │
│         └── Used by PukuIndexingService                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Component Breakdown

### 1. Cloudflare Worker (puku-worker)

**Location:** `/Users/sahamed/Desktop/puku-vs-editor/puku-worker/`

**Key Files:**
- `src/routes/auth.ts` - Authentication routes
- `src/middleware/auth.ts` - Session validation middleware

**Authentication Endpoints:**

#### GET `/auth/google`
Initiates Google OAuth flow:
1. Generates CSRF state token
2. Stores state in KV (10 min expiry)
3. Redirects to Google OAuth with:
   - `client_id`, `redirect_uri`, `scope`
   - `access_type=offline`, `prompt=consent`

#### GET `/auth/google/callback`
Handles OAuth callback:
1. Validates state parameter
2. Exchanges auth code for Google tokens
3. Fetches user info from Google
4. Creates session ID (32-byte random)
5. Stores session in KV (7 day expiry)
6. Returns HTML page with:
   - Session token for manual copy
   - Button to open `puku://puku.puku-editor/auth/callback?token=xxx`

#### GET `/auth/session`
Validates session and returns user info:
- Requires: `Authorization: Bearer <session_token>`
- Returns: `{ id, email, name, picture, createdAt }`
- Used by both VS Code layer and extension layer

#### POST `/auth/logout`
Invalidates session:
- Requires: `Authorization: Bearer <session_token>`
- Deletes session from KV store
- Returns: `{ success: true }`

**Session Storage (KV):**
```javascript
Key: `session:${sessionId}`
Value: {
  id: string,          // Google user ID
  email: string,
  name: string,
  picture: string,
  accessToken: string, // Google access token
  refreshToken: string,
  createdAt: number
}
Expiry: 7 days
```

### 2. VS Code Workbench Layer

**Location:** `/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/vscode/src/vs/workbench/services/chat/common/`

#### PukuAuthService (`pukuAuthService.ts`)

**Purpose:** Manages Puku authentication at the VS Code workbench level

**Key Methods:**

```typescript
async signInWithGoogle(): Promise<AuthenticationSession>
```
- Opens browser to `https://api.puku.sh/auth/google`
- Waits for URI callback via `handleURL()`
- Timeout: 5 minutes
- Returns VS Code compatible `AuthenticationSession`

```typescript
async handleURL(uri: URI): Promise<boolean>
```
- Handles: `puku://puku.puku-editor/auth/callback?token=xxx`
- Validates session token via `/auth/session`
- Stores in VS Code storage:
  - `puku.sessionToken` → session token
  - `puku.user` → JSON user info
- Fires `onDidChangeSession` event
- Resolves pending `signInWithGoogle()` promise

```typescript
async initialize(): Promise<void>
```
- Restores session from VS Code storage on startup
- Validates stored token via `/auth/session`
- Clears invalid sessions

**Storage Keys:**
- `puku.sessionToken` (StorageScope.APPLICATION, StorageTarget.MACHINE)
- `puku.user` (StorageScope.APPLICATION, StorageTarget.MACHINE)

**Commands Exposed:**
- `_puku.workbench.getSessionToken` → Returns current session token
- `_puku.workbench.getUserInfo` → Returns current user info

#### ChatEntitlementService Integration

**File:** `src/vs/workbench/services/chat/common/chatEntitlementService.ts`

**Google OAuth Flow:**
```typescript
async signIn(options?: { useSocialProvider?: string }) {
  if (options?.useSocialProvider === 'google') {
    // Use Puku auth (bypasses VS Code AuthenticationProvider)
    const session = await this.pukuAuthService.signInWithGoogle();
    const entitlements = { entitlement: ChatEntitlement.Free, ... };
    this.update(entitlements);

    // Notify extension layer (optional)
    await this.commandService.executeCommand('_puku.refreshAuth');

    return { session, entitlements };
  }

  // Fallback: Use standard VS Code authentication
  const providerId = ChatEntitlementRequests.providerId(this.configurationService);
  const session = await this.authenticationService.createSession(providerId, ...);
}
```

**Key Insight:** When using Google OAuth (the intended path), ChatEntitlementService **bypasses VS Code's AuthenticationProvider system entirely** and calls `pukuAuthService.signInWithGoogle()` directly.

### 3. Extension Layer

**Location:** `/Users/sahamed/Desktop/puku-vs-editor/puku-editor/src/chat/src/extension/`

#### PukuAuthContribution (`pukuAuth/vscode-node/pukuAuth.contribution.ts`)

**Purpose:** Registers authentication commands and bridges workbench ↔ extension

**Registered with:** `vscodeNodeContributions` array (line 70 of `contributions.ts`)

**Commands:**

```typescript
// User-facing command
'puku.auth.signIn'
  → Opens https://api.puku.sh/auth/google
  → Waits for OAuth callback
  → Stores session in extension context

// User-facing command
'puku.auth.signOut'
  → Clears local session
  → Shows "Signed out" message

// User-facing command
'puku.auth.status'
  → Shows current auth status
  → Offers "Sign In" or "Sign Out" option

// Internal command (called by workbench)
'_puku.refreshAuth'
  → Refreshes auth state
  → Called when workbench layer auth changes

// Internal command (called by other extensions)
'_puku.getSessionToken'
  → Returns token from extension session OR workbench session
  → Fallback chain:
      1. Extension layer session (_session)
      2. Workbench layer (_puku.workbench.getSessionToken)

// Internal command
'_puku.getUserInfo'
  → Returns user info from extension OR workbench
  → Same fallback chain as getSessionToken
```

**Session Storage:**
- Stored in: `vscode.ExtensionContext.globalState`
- Key: `'puku.auth.sessions'`
- Format: `PukuAuthSession[]` (array of sessions)

**Status Bar:**
- Status bar item created but hidden (line 279)
- Status bar UI handled by VS Code layer (`chatStatus.ts`)

#### PukuAuthProvider (`pukuAuth/vscode-node/pukuAuthProvider.ts`)

**Purpose:** Implements VS Code's `AuthenticationProvider` interface

**Registered:** Line 205 via `vscode.authentication.registerAuthenticationProvider()`
- Provider ID: `'puku'`
- Provider Label: `'Puku'`
- Supports Multiple Accounts: `false`

**Methods:**

```typescript
async getSessions(scopes?: readonly string[]): Promise<AuthenticationSession[]>
```
- Returns currently active Puku sessions
- Loaded from `ExtensionContext.globalState`

```typescript
async createSession(scopes: readonly string[]): Promise<AuthenticationSession>
```
- Opens login URL: `${PUKU_API_ENDPOINT}/auth/vscode?callback=...`
- Waits for URI callback (5 min timeout)
- Fetches user info via `/puku/v1/user`
- Creates and stores session
- Fires `onDidChangeSessions` event

```typescript
async removeSession(sessionId: string): Promise<void>
```
- Removes session from storage
- Fires `onDidChangeSessions` event

**URI Callback Handler:**
- Registered via `vscode.window.registerUriHandler()`
- Handles: `${vscode.env.uriScheme}://Puku.puku-editor/auth-callback?token=...`

**NOTE:** This provider is **optional** and only used if code explicitly calls `vscode.authentication.getSession('puku', ...)`. The main authentication flow uses `PukuAuthService` directly.

#### VsCodePukuAuthService (`pukuIndexing/vscode-node/vscodePukuAuthService.ts`)

**Purpose:** Extension-layer auth service for indexing and API calls

**Key Features:**

```typescript
async getToken(): Promise<PukuToken | undefined>
```
1. Calls `_puku.getSessionToken` command (bridges to workbench)
2. Returns cached token if valid
3. Fetches user info via `_puku.getUserInfo`
4. Creates `PukuToken` with indexing metadata
5. Schedules automatic refresh

```typescript
async signIn(): Promise<void>
```
- Triggers: `_puku.signIn` command (workbench layer)
- Waits 1 second for completion
- Calls `initialize()` to refresh state

**Polling Mechanism:**
- Polls every 2 seconds when `status === Unauthenticated`
- Detects new auth sessions from workbench layer
- Stops polling once authenticated

**Token Format:**
```typescript
interface PukuToken {
  token: string;              // Session token
  expiresAt: number;          // Unix timestamp
  refreshIn: number;          // Seconds until refresh
  username?: string;
  endpoints: {
    api: string;              // https://api.puku.sh
    embeddings: string;       // https://api.puku.sh/v1/embeddings
  };
  indexingEnabled: boolean;   // Always true
  semanticSearchEnabled: boolean; // Always true
}
```

## Authentication Flow Diagram

### Sign-In Flow

```
┌─────────────┐
│    User     │
│  clicks     │
│  "Sign In"  │
└──────┬──────┘
       │
       ├─ VS Code Layer ──────────────────────────┐
       │                                          │
       v                                          │
  ChatEntitlement                                 │
  Service.signIn()                                │
       │                                          │
       v                                          │
  PukuAuthService                                 │
  .signInWithGoogle()                             │
       │                                          │
       v                                          │
  Opens browser:                                  │
  https://api.puku.sh/auth/google                 │
       │                                          │
       ├─ Cloudflare Worker ──────────────────┐   │
       │                                       │   │
       v                                       │   │
  Worker validates                             │   │
  and redirects to                             │   │
  Google OAuth                                 │   │
       │                                       │   │
       v                                       │   │
  User authorizes                              │   │
  with Google                                  │   │
       │                                       │   │
       v                                       │   │
  Google redirects to:                         │   │
  /auth/google/callback                        │   │
       │                                       │   │
       v                                       │   │
  Worker exchanges                             │   │
  code for tokens                              │   │
       │                                       │   │
       v                                       │   │
  Worker creates                               │   │
  session in KV                                │   │
       │                                       │   │
       v                                       │   │
  Worker returns HTML                          │   │
  with puku:// link                            │   │
       │                                       │   │
       └───────────────────────────────────────┘   │
       │                                          │
       v                                          │
  User clicks link                                │
  or copies token                                 │
       │                                          │
       v                                          │
  puku://puku.puku-editor                         │
  /auth/callback?token=xxx                        │
       │                                          │
       v                                          │
  PukuAuthService                                 │
  .handleURL()                                    │
       │                                          │
       v                                          │
  Validates token via                             │
  /auth/session                                   │
       │                                          │
       v                                          │
  Stores in VS Code                               │
  storage                                         │
       │                                          │
       v                                          │
  Fires onDidChangeSession                        │
       │                                          │
       v                                          │
  Notifies extension:                             │
  _puku.refreshAuth                               │
       │                                          │
       └──────────────────────────────────────────┘
       │
       ├─ Extension Layer ────────────────────────┐
       │                                          │
       v                                          │
  VsCodePukuAuthService                           │
  receives refresh                                │
       │                                          │
       v                                          │
  Calls _puku.getSessionToken                     │
       │                                          │
       v                                          │
  Gets token from                                 │
  workbench layer                                 │
       │                                          │
       v                                          │
  Status updates to                               │
  Authenticated                                   │
       │                                          │
       v                                          │
  PukuIndexingService                             │
  can now fetch embeddings                        │
       │                                          │
       └──────────────────────────────────────────┘
       │
       v
  ✅ Authenticated
```

## Error: "Timed out waiting for authentication provider 'puku'"

**Why it occurs:**
1. `product.json` has `provider.default.id = "puku"`
2. ChatEntitlementService tries to call `authenticationService.createSession('puku', ...)`
3. VS Code's AuthenticationService looks for a provider with ID "puku"
4. `PukuAuthProvider` is registered by the extension but takes time to load
5. VS Code waits 5 seconds (line 446 of `authenticationService.ts`)
6. Timeout occurs before extension finishes loading

**Why it's non-blocking:**
- ChatEntitlementService uses `signInWithGoogle()` for actual auth
- This **bypasses** the VS Code AuthenticationProvider system
- The provider is only used as a fallback for other scenarios
- Authentication works correctly despite the error

**Solution (if needed):**
Option 1: Make PukuAuthProvider load earlier (eager instantiation)
Option 2: Increase timeout in authenticationService.ts
Option 3: Change product.json to use "github" as default (not recommended)

**Current Status:** ✅ **Working as intended - error can be ignored**

## Key Commands for Cross-Layer Communication

### Workbench → Extension

```typescript
// Extension listens for these commands
'_puku.extensionRefreshAuth'  // Refresh auth state
'_puku.refreshAuth'            // Legacy refresh command
```

### Extension → Workbench

```typescript
// Extension calls these commands
'_puku.workbench.getSessionToken'  // Get token from workbench
'_puku.workbench.getUserInfo'      // Get user from workbench
'_puku.signIn'                     // Trigger sign-in in workbench
```

### Internal Extension Commands

```typescript
'_puku.getSessionToken'  // Unified token getter (extension + workbench)
'_puku.getUserInfo'      // Unified user info getter
```

## Token Flow for API Calls

### Indexing / Embeddings

```
PukuIndexingService
  ↓
VsCodePukuAuthService.getToken()
  ↓
_puku.getSessionToken command
  ↓
PukuAuthContribution._session OR
_puku.workbench.getSessionToken
  ↓
PukuAuthService.getSessionToken()
  ↓
Session token
  ↓
API Request:
Authorization: Bearer <token>
```

### Chat / Completions

```
ChatEntitlementService
  ↓
PukuAuthService.signInWithGoogle()
  ↓
OAuth flow
  ↓
Session stored in workbench
  ↓
Used for chat API calls
```

## Storage Locations

### Cloudflare Worker (KV)
```
Key: session:${sessionId}
Expiry: 7 days
Scope: Global (api.puku.sh)
```

### VS Code Workbench
```
Key: puku.sessionToken
Scope: APPLICATION
Target: MACHINE
Location: ~/.config/Code/User/globalStorage/
```

```
Key: puku.user
Scope: APPLICATION
Target: MACHINE
Location: ~/.config/Code/User/globalStorage/
```

### Extension
```
Key: puku.auth.sessions
Scope: ExtensionContext.globalState
Location: ~/.vscode/extensions/globalState/
```

## Configuration (product.json)

```json
{
  "provider": {
    "default": {
      "id": "puku",
      "name": "Puku"
    },
    "google": {
      "id": "google",
      "name": "Google"
    }
  }
}
```

**Note:** The "puku" provider ID in product.json triggers the timeout error, but authentication works correctly via `PukuAuthService` regardless.

## Testing Authentication

### Check VS Code Layer Session
```typescript
// In VS Code debug console
await vscode.commands.executeCommand('_puku.workbench.getSessionToken')
await vscode.commands.executeCommand('_puku.workbench.getUserInfo')
```

### Check Extension Layer Session
```typescript
// In extension debug console
await vscode.commands.executeCommand('_puku.getSessionToken')
await vscode.commands.executeCommand('_puku.getUserInfo')
```

### Check Worker Session
```bash
# Get session info
curl -H "Authorization: Bearer <token>" \
  https://api.puku.sh/auth/session

# Check auth status
curl -H "Authorization: Bearer <token>" \
  https://api.puku.sh/auth/status
```

## Security Considerations

1. **Session Token Storage:**
   - Stored in VS Code secure storage (encrypted on disk)
   - Stored in extension globalState (encrypted on disk)
   - Never logged in plaintext

2. **Token Expiry:**
   - Worker sessions: 7 days
   - Extension polls every 2 seconds when unauthenticated
   - Auto-refresh before expiry

3. **OAuth Security:**
   - CSRF protection via state parameter
   - State stored in KV for 10 minutes only
   - Google tokens never exposed to client

4. **API Security:**
   - All API calls require Bearer token
   - Token validated against KV on every request
   - Session can be revoked via /auth/logout

## Future Improvements

1. **Refresh Token Support:**
   - Worker stores Google refresh_token
   - Could implement automatic token refresh
   - Would extend session beyond 7 days

2. **Multi-Account Support:**
   - Currently: `supportsMultipleAccounts: false`
   - Could store multiple sessions
   - UI for account switching

3. **Offline Mode:**
   - Cache embeddings locally
   - Queue API requests when offline
   - Sync when connection restored

4. **Session Sync:**
   - Sync sessions across machines
   - Use Settings Sync API
   - Encrypted session storage

## Troubleshooting

### "Puku: Disabled" in status bar
- **Cause:** No active session or auth service not initialized
- **Fix:** Click status bar → "Sign In" → Complete Google OAuth

### "Timed out waiting for authentication provider"
- **Cause:** Extension loading race condition
- **Impact:** None - authentication works via PukuAuthService
- **Fix:** Can be ignored (error is non-blocking)

### Sessions not persisting
- **Check:** VS Code storage location
- **Check:** Extension globalState
- **Fix:** Clear storage and re-authenticate

### Token validation fails
- **Cause:** Session expired in Worker KV
- **Fix:** Sign out and sign in again
- **Check:** Worker logs for validation errors

---

## Summary

Puku Editor's authentication system is a **three-layered architecture**:

1. **Worker** - Handles OAuth, session storage, token validation
2. **Workbench** - Integrates with VS Code, manages local session
3. **Extension** - Provides auth for features like indexing

The system **bypasses VS Code's AuthenticationProvider** for the main sign-in flow, using a direct integration with Google OAuth via the Cloudflare Worker. This provides:
- ✅ Custom branding (Puku instead of GitHub)
- ✅ Session management in Cloudflare KV
- ✅ Direct control over auth flow
- ✅ No dependency on GitHub or Microsoft
- ✅ Works across multiple VS Code instances

The "Timed out waiting for authentication provider 'puku'" error is **harmless** and occurs due to a timing race between VS Code startup and extension loading. Authentication works correctly regardless of this error.
