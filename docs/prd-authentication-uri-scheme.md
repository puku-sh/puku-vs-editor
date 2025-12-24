# PRD: Puku Editor Authentication with URI Scheme Callback

## Document Information

| Field | Value |
|-------|-------|
| **Title** | Puku Editor Authentication with URI Scheme Callback |
| **Version** | 1.1 |
| **Status** | Implemented |
| **Date** | 2025-12-24 |
| **Author** | Puku Editor Team |

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-12-24 | Added CSRF protection (state parameter), workspace settings auto-creation, single-instance mechanism documentation |
| 1.0 | 2025-12-24 | Initial PRD with URI scheme architecture and Linux development setup |

---

## 1. Executive Summary

This document describes the authentication flow for Puku Editor using custom URI scheme callbacks (`puku://`). This mechanism allows the browser to redirect back to the editor after OAuth authentication completes, passing the authentication token securely.

### Key Problems Solved

1. **Linux URI Scheme Registration**: On Linux, custom URI schemes require a `.desktop` file to be registered with the OS. In development mode, this registration doesn't happen automatically, causing authentication callbacks to fail.

2. **Single-Instance Behavior**: When the browser redirects to `puku://`, the OS needs to either send the callback to the running instance or start a new one.

3. **Post-Authentication Setup**: After successful login, workspace settings need to be configured automatically with the user's token.

### Solution

- Created `setup-dev-url-handler.sh` script that installs the necessary `.desktop` file to handle `puku://` URIs on Linux during development
- Implemented CSRF protection using state parameter
- Added automatic `.vscode/settings.json` creation in workspace folders after authentication
- VS Code's built-in IPC mechanism handles single-instance behavior automatically

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │   Browser    │         │     OS       │         │ Puku Editor  │         │
│  │              │         │  URI Handler  │         │              │         │
│  │  ┌────────┐  │         │  ┌────────┐  │         │  ┌────────┐  │         │
│  │  │ Google │  │         │  │ .desk- │  │         │  │ Extension│  │         │
│  │  │  OAuth │  │         │  │  top   │  │         │  │   API   │  │         │
│  │  └────┬───┘  │         │  └────┬───┘  │         │  └────┬───┘  │         │
│  └───────┼──────┘         └───────┼──────┘         └───────┼──────┘         │
│          │                        │                        │                │
│          │ 1. Login URL           │                        │                │
│          │────────────────────────────────────────────────>│                │
│          │                        │                        │                │
│          │ 2. User authenticates  │                        │                │
│          │    with Google         │                        │                │
│          │                        │                        │                │
│          │ 3. Backend redirect    │                        │                │
│          │    puku://callback     │                        │                │
│          │────────────────────────>│                        │                │
│          │                        │                        │                │
│          │                        │ 4. xdg-open            │                │
│          │                        │    puku://callback ────>│                │
│          │                        │                        │                │
│          │                        │                        │ 5. URI Handler  │
│          │                        │                        │    extracts     │
│          │                        │                        │    token        │
│          │                        │                        │                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 URI Scheme Format

The callback URI follows this format:

```
puku://GitHub.puku-editor/callback?token=<jwt_token>
```

| Component | Value | Description |
|-----------|-------|-------------|
| **Scheme** | `puku` | Custom URI scheme registered with OS |
| **Authority** | `GitHub.puku-editor` | Extension ID (from package.json) |
| **Path** | `/callback` | Route that triggers URI handler |
| **Query** | `token=...` | JWT authentication token |

---

## 3. Data Flow

### 3.1 Complete Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Extension as Puku Extension
    participant Browser as Web Browser
    participant Backend as Puku Backend
    participant OS as OS URI Handler

    Note over User,OS: Phase 1: Initiation
    User->>Extension: Click "Sign In"
    Extension->>Extension: Generate state (random 32-char)
    Extension->>Extension: Generate callback URI<br/>puku://GitHub.puku-editor/callback
    Extension->>Browser: openExternal(<br/>https://api.puku.sh/auth/google?<br/>callback=...&state=...)

    Note over User,OS: Phase 2: User Authentication
    Browser->>Backend: GET /auth/google?callback=...&state=...
    Backend->>Backend: Store state in KV (expires 10min)
    Backend->>Browser: Google OAuth page
    User->>Browser: Sign in with Google
    Browser->>Backend: OAuth code + state
    Backend->>Backend: Verify state, verify code
    Backend->>Backend: Generate session (JWT)

    Note over User,OS: Phase 3: Callback Redirect
    Backend->>Browser: 302 Redirect to<br/>puku://GitHub.puku-editor/callback?token=xxx
    Browser->>OS: xdg-open(puku://...)
    OS->>OS: Check .desktop file for<br/>x-scheme-handler/puku
    OS->>OS: Check if Puku Editor is running<br/>(via IPC socket)
    alt Instance Running
        OS->>Extension: Send URI via IPC<br/>(no new instance)
    else No Instance
        OS->>Extension: launch.sh --open-url puku://...<br/>(start new instance)
    end

    Note over User,OS: Phase 4: Token Extraction & Setup
    Extension->>Extension: URI handler receives callback
    Extension->>Extension: Parse token from query string
    Extension->>Backend: GET /puku/v1/user<br/>Authorization: Bearer <token>
    Backend->>Extension: User info (id, name, email)
    Extension->>Extension: Create session in globalState
    Extension->>Extension: Create .vscode/settings.json<br/>in each workspace folder

    Note over User,OS: Phase 5: Completion
    Extension->>User: Show "Signed in as {name}"
```

### 3.2 Flow Steps (Detailed)

| Step | Component | Action | Data |
|------|-----------|--------|------|
| 1 | Extension | User clicks "Sign In" | `puku.auth.signIn` command |
| 2 | Extension | Generate CSRF state | Random 32-character hex string |
| 3 | Extension | Generate callback URI | `puku://GitHub.puku-editor/callback` |
| 4 | Extension | Open browser | `https://api.puku.sh/auth/google?callback=...&state=...` |
| 5 | Backend | Store state in KV | Expiry: 10 minutes |
| 6 | Browser | Show Google OAuth page | Google OAuth UI |
| 7 | User | Authenticate with Google | Google credentials |
| 8 | Backend | Verify state + OAuth, generate JWT | Session token |
| 9 | Backend | Redirect to callback URI | `puku://GitHub.puku-editor/callback?token=xxx` |
| 10 | Browser | Call OS URI handler | `xdg-open(puku://...)` |
| 11 | OS | Check if Puku Editor running | Via IPC socket |
| 12 | OS | Send URI to instance or start new | Single-instance mechanism |
| 13 | Extension | URI handler extracts token | JWT from query string |
| 14 | Extension | Fetch user info | `/puku/v1/user` with Bearer token |
| 15 | Extension | Create session | Store in `globalState` |
| 16 | Extension | Create `.vscode/settings.json` | In each workspace folder |
| 17 | Extension | Update UI | Show sign-in confirmation |

---

## 4. Platform-Specific Behavior

### 4.1 URI Scheme Registration

| Platform | Registration Method | Development Support | Production Support |
|----------|-------------------|---------------------|-------------------|
| **Windows** | `app.setAsDefaultProtocolClient()` | ✅ Automatic | ✅ Automatic |
| **macOS** | `app.setAsDefaultProtocolClient()` | ✅ Automatic | ✅ Automatic |
| **Linux** | `.desktop` file + `MimeType` entry | ❌ Requires manual setup | ✅ Automatic (via .deb) |

### 4.2 Linux Development Setup

#### The Problem

On Linux, VS Code doesn't use `app.setAsDefaultProtocolClient()` for custom URI schemes. Instead, it relies on a `.desktop` file that declares the MIME type handler:

```ini
MimeType=x-scheme-handler/puku;
```

In development mode (running `./scripts/code.sh` or `./launch.sh`), this `.desktop` file is not installed, so the OS doesn't know how to handle `puku://` URIs.

#### The Solution

Created `setup-dev-url-handler.sh` that:

1. Creates `~/.local/share/applications/puku-url-handler.desktop`
2. Registers the MIME type `x-scheme-handler/puku`
3. Updates the desktop database with `update-desktop-database`
4. Sets the default handler with `xdg-mime`

### 4.3 Single-Instance Mechanism

**How it works:**

VS Code uses a platform-specific IPC (Inter-Process Communication) mechanism to ensure single-instance behavior:

| Platform | IPC Mechanism | Location |
|----------|--------------|----------|
| **Windows** | Named Pipe | `\\.\pipe\{hash}-{version}-main-sock` |
| **macOS** | Unix Socket | `/tmp/vscode-ipc-{random}.sock` |
| **Linux** | Unix Socket | `$XDG_RUNTIME_DIR/vscode-ipc-{hash}-{version}-main.sock` |

**The Flow:**

1. **First instance starts**: Creates IPC socket at `{userDataPath}/main.sock`
2. **Second instance starts**:
   - Tries to create the same socket
   - Gets `EADDRINUSE` error (socket already exists)
   - Connects as client to the existing socket
   - Sends command-line arguments (including `--open-url` URIs)
   - Exits immediately
3. **First instance receives**: URI handler processes the callback

**Development Mode:**

The IPC socket path is based on:
- `userDataPath` (hashed to 8 characters)
- `productService.version`
- Type (`main`, `extension-host`, etc.)

In development, this ensures all dev builds share the same socket, enabling single-instance behavior.

### 4.4 Desktop File Template

```ini
[Desktop Entry]
Name=Puku Editor - URL Handler
Comment=Code Editing. Redefined.
GenericName=Text Editor
Exec=/path/to/repo/launch.sh --open-url %u
Icon=/path/to/repo/src/vscode/resources/linux/code.png
Type=Application
NoDisplay=true
StartupNotify=true
Categories=Utility;TextEditor;Development;IDE;
MimeType=x-scheme-handler/puku;
Keywords=vscode;puku;
```

Key entries:
- **`Exec`**: Contains `%u` placeholder for the URI
- **`MimeType`**: `x-scheme-handler/puku` tells OS this app handles `puku://` URIs
- **`NoDisplay=true`**: Hides from application launcher

---

## 5. Implementation Details

### 5.1 Sign-In Flow with State Parameter

**File**: `src/chat/src/extension/pukuAuth/vscode-node/pukuAuth.contribution.ts`

```typescript
// Sign in command
this._register(vscode.commands.registerCommand('puku.auth.signIn', async () => {
	// Generate callback URI for redirect
	const callbackUri = await vscode.env.asExternalUri(
		vscode.Uri.parse(`${vscode.env.uriScheme}://GitHub.puku-editor/callback`)
	);

	// Generate state parameter for CSRF protection
	const state = this._generateState();
	this._pendingState = state;

	// Use Google OAuth endpoint with callback URL
	const loginUrl = `${PUKU_API_ENDPOINT}/auth/google?callback=${encodeURIComponent(callbackUri.toString())}&state=${state}`;

	// Open browser
	await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

	// Wait for OAuth callback
	const token = await this._waitForAuthCallback();

	// Fetch user info
	const userInfo = await this._getUserInfo(token);

	// Create session
	this._session = {
		id: userInfo.id,
		accessToken: token,
		account: {
			id: userInfo.id,
			label: userInfo.name || userInfo.email
		},
		scopes: []
	};

	// Create .vscode/settings.json in workspace folders
	await this._createWorkspaceSettings(token);
}));
```

### 5.2 CSRF State Generation

```typescript
/**
 * Generate a random state parameter for CSRF protection
 */
private _generateState(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
```

### 5.3 URI Handler Registration

**File**: `src/chat/src/extension/pukuAuth/vscode-node/pukuAuth.contribution.ts`

```typescript
// Register URI handler for OAuth callbacks (once, globally)
this._register(vscode.window.registerUriHandler({
	handleUri: (uri: vscode.Uri) => {
		this._logService.info(`PukuAuthContribution: Received auth callback: ${uri.toString()}`);

		// Parse token from query string
		const query = new URLSearchParams(uri.query);
		const token = query.get('token');

		// Resolve pending auth callback if any
		if (this._pendingAuthCallback) {
			this._pendingAuthCallback(token ?? undefined);
			this._pendingAuthCallback = undefined;
		}
	}
}));
```

### 5.4 Workspace Settings Creation

```typescript
/**
 * Create .vscode/settings.json in workspace folders with the token
 */
private async _createWorkspaceSettings(token: string): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		this._logService.info('No workspace folders open, skipping settings.json creation');
		return;
	}

	for (const folder of workspaceFolders) {
		const vscodeUri = vscode.Uri.joinPath(folder.uri, '.vscode', 'settings.json');

		// Check if settings.json already exists
		try {
			await vscode.workspace.fs.stat(vscodeUri);

			// Read existing settings
			const existingData = await vscode.workspace.fs.readFile(vscodeUri);
			const existingSettings = JSON.parse(Buffer.from(existingData).toString('utf-8'));

			// Merge with new settings
			const updatedSettings = {
				...existingSettings,
				'files.autoSave': 'afterDelay',
				'puku.embeddings.token': token
			};

			// Write updated settings
			await vscode.workspace.fs.writeFile(vscodeUri, Buffer.from(JSON.stringify(updatedSettings, null, '\t'), 'utf-8'));
		} catch (error) {
			// File doesn't exist, create it
			const vscodeDirUri = vscode.Uri.joinPath(folder.uri, '.vscode');
			await vscode.workspace.fs.createDirectory(vscodeDirUri).catch(() => {});

			// Create settings.json
			const settings = {
				'files.autoSave': 'afterDelay',
				'puku.embeddings.token': token
			};
			const content = JSON.stringify(settings, null, '\t');
			await vscode.workspace.fs.writeFile(vscodeUri, Buffer.from(content, 'utf-8'));
		}
	}
}
```

### 5.5 Callback URI Generation

**File**: `src/chat/src/extension/pukuAuth/vscode-node/pukuAuthProvider.ts`

```typescript
const callbackUri = await vscode.env.asExternalUri(
	vscode.Uri.parse(`${vscode.env.uriScheme}://GitHub.puku-editor/callback`)
);
```

The `asExternalUri()` function:
- Converts `vscode.env.uriScheme` to the actual URI scheme
- In production: `puku://`
- In development (before fix): `code-oss-dev://`
- After `product.overrides.json` fix: `puku://`

### 5.3 Product Overrides

**File**: `src/vscode/product.overrides.json`

```json
{
	"urlProtocol": "puku",
	"applicationName": "puku",
	"nameShort": "Puku",
	"nameLong": "Puku Editor",
	"dataFolderName": ".puku"
}
```

This file is loaded by VS Code's bootstrap process when `VSCODE_DEV=1` to override the default product configuration.

---

## 6. Files Modified

### 6.1 Created Files

| File | Purpose |
|------|---------|
| `setup-dev-url-handler.sh` | Installs `.desktop` file for Linux URI handler |
| `src/vscode/product.overrides.json` | Overrides URI scheme in development mode |

### 6.2 Modified Files

| File | Changes |
|------|---------|
| `launch.sh` | Added `--open-url` argument parsing and forwarding |
| `Makefile` | Added `setup-url-handler` and `uninstall-url-handler` targets |

### 6.3 Key Extension Files

| File | Purpose |
|------|---------|
| `pukuAuth.contribution.ts` | Registers URI handler and sign-in command |
| `pukuAuthProvider.ts` | VS Code authentication provider implementation |

---

## 7. Installation & Usage

### 7.1 First-Time Setup (Linux)

```bash
# From repository root
./setup-dev-url-handler.sh

# Or via Makefile
make setup-url-handler
```

Output:
```
✓ Created desktop file: /home/poridhi/.local/share/applications/puku-url-handler.desktop
✓ Updated desktop database
✓ Registered puku:// URL handler
```

### 7.2 Uninstallation

```bash
./setup-dev-url-handler.sh uninstall

# Or via Makefile
make uninstall-url-handler
```

### 7.3 Testing the Handler

```bash
# Terminal 1: Launch the editor
./launch.sh

# Terminal 2: Test URI handler
xdg-open "puku://test?token=abc123"
```

Expected result: The running editor instance should receive the URI (visible in logs).

---

## 8. Troubleshooting

### 8.1 URI Callback Not Received

**Symptoms**:
- Browser redirects to `puku://...` but nothing happens
- Editor logs show no callback received

**Diagnosis**:

```bash
# Check if handler is registered
xdg-mime query default x-scheme-handler/puku
# Expected output: puku-url-handler.desktop

# Check desktop file exists
cat ~/.local/share/applications/puku-url-handler.desktop

# Test manually
xdg-open "puku://test"
```

**Solutions**:

1. **Reinstall handler**: `./setup-dev-url-handler.sh`
2. **Check editor is running**: URI callbacks require a running instance
3. **Check logs**: Look for "PukuAuthContribution: Received auth callback"

### 8.2 Wrong URI Scheme

**Symptoms**:
- Callback URI shows `code-oss-dev://` instead of `puku://`
- Bottom-left corner shows "code-oss-dev" instead of "puku"

**Diagnosis**:

```bash
# Check product overrides
cat src/vscode/product.overrides.json

# Check if VSCODE_DEV is set
echo $VSCODE_DEV
```

**Solutions**:

1. Ensure `src/vscode/product.overrides.json` exists
2. Rebuild VS Code: `make build-vs`
3. Restart editor

### 8.3 Desktop File Not Working

**Symptoms**:
- `xdg-open puku://test` opens wrong application
- OS doesn't recognize the URI scheme

**Diagnosis**:

```bash
# Update desktop database
update-desktop-database ~/.local/share/applications

# Verify MIME type registration
grep -r "x-scheme-handler/puku" ~/.local/share/applications
```

**Solutions**:

1. Run: `update-desktop-database ~/.local/share/applications`
2. Reinstall handler: `./setup-dev-url-handler.sh`
3. Log out and back in (desktop cache may need refresh)

---

## 9. Security Considerations

### 9.1 Token Handling

| Aspect | Implementation | Notes |
|--------|---------------|-------|
| **Token storage** | VS Code `globalState` | Encrypted at rest by VS Code |
| **Token transmission** | HTTPS + URI query parameter | Visible in browser history |
| **Token expiry** | 7 days (configurable) | Refresh logic implemented |
| **Token validation** | Backend `/puku/v1/user` endpoint | Validates token before creating session |

### 9.2 CSRF Protection

**Implementation**: State parameter pattern

1. **Frontend**: Generates random 32-character hex string
2. **Backend**: Stores state in KV with 10-minute expiry
3. **Callback**: Backend verifies state matches before issuing token

```typescript
// Frontend generates state
const state = this._generateState(); // e.g., "a1b2c3d4e5f6..."
const loginUrl = `${API}/auth/google?callback=${callbackUri}&state=${state}`;

// Backend verifies state (in /auth/google/callback)
const storedState = await env.SESSIONS.get(`state:${state}`);
if (!storedState) {
	return c.json({ error: 'Invalid state parameter' }, 400);
}
```

### 9.3 URI Security

| Risk | Mitigation |
|------|-----------|
| **Token in browser history** | Use short-lived tokens, consider alternative flows |
| **URI interception** | TLS for backend, HTTPS for OAuth |
| **CSRF attacks** | ✅ State parameter implemented |
| **Malicious callback** | Validate token before creating session |
| **Phishing** | Display callback URL in logs for debugging |

### 9.4 Recommendations

1. ✅ **CSRF Protection**: State parameter implemented
2. **Future**: Implement PKCE (Proof Key for Code Exchange)
3. **Development**: Keep token expiry short for testing
4. **Logging**: Don't log full tokens in production
5. **Workspace Settings**: Token stored in `.vscode/settings.json` - consider using secrets API for sensitive data

---

## 10. References

- [VS Code Authentication API](https://code.visualstudio.com/api/extension-guides/authentication)
- [VS Code URI Handlers](https://www.eliostruyf.com/callback-extension-vscode/)
- [Electron Protocol Handling](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [XDG Desktop Entry Specification](https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html)
- [Linux URI Schemes](https://askubuntu.com/questions/670933/registering-a-custom-uri-scheme-on-ubuntu-for-chrome)

---

## 11. Appendix

### 11.1 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VSCODE_DEV` | Enable development mode | `1` |
| `VSCODE_CLI` | Enable CLI mode | `1` |

### 11.2 Makefile Targets

| Target | Description |
|--------|-------------|
| `setup-url-handler` | Install puku:// URL handler |
| `uninstall-url-handler` | Remove puku:// URL handler |
| `launch` | Launch development build |
| `quick` | Kill existing and launch |

### 11.3 Log Messages

| Message | Component | Meaning |
|---------|-----------|---------|
| `PukuAuthContribution: Received auth callback` | Extension | URI handler was triggered |
| `[PukuAuthProvider] Opening login URL` | Provider | Starting OAuth flow |
| `ElectronURLListener: registering protocol handler` | VS Code | URI scheme registered (macOS/Windows only) |

### 11.4 URL Examples

```
# Login URL (opened in browser)
https://api.puku.sh/auth/google?callback=puku%3A%2F%2FGitHub.puku-editor%2Fcallback&state=a1b2c3d4e5f67890...

# Callback URL (redirect from backend)
puku://GitHub.puku-editor/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# User info endpoint
https://api.puku.sh/puku/v1/user
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 11.5 Workspace Settings File

After successful authentication, the extension creates/updates `.vscode/settings.json` in each workspace folder:

```json
{
	"files.autoSave": "afterDelay",
	"puku.embeddings.token": "your-session-token-here"
}
```

**Behavior**:
- If `.vscode/settings.json` exists: Merges with existing settings
- If not exists: Creates new file with only Puku settings
- Runs in all workspace folders (multi-root workspaces supported)

**Note**: The token is stored in plain text in the workspace settings. For production, consider using VS Code's `secrets` API or encrypted storage.

---

**End of Document**
