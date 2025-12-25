import { Hono } from 'hono';
import type { Env } from '../index';
import { createSubscriptionClient } from '../lib/subscription-client';

export const auth = new Hono<{ Bindings: Env }>();

// Google OAuth configuration
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Generate session ID
function generateSessionId(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// GET /auth/google - Initiate Google OAuth flow
auth.get('/google', async (c) => {
	const env = c.env;
	const url = new URL(c.req.url);
	const redirectUri = `${url.protocol}//${url.host}/auth/google/callback`;

	// Get callback URL from query parameters (passed from Puku Editor)
	const callbackUrl = url.searchParams.get('callback');

	const params = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		prompt: 'consent',
	});

	const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

	// Store callback URL in KV with a unique key (expires in 10 minutes)
	if (env.SESSIONS && callbackUrl) {
		const sessionId = generateSessionId();
		await env.SESSIONS.put(`callback:${sessionId}`, callbackUrl, { expirationTtl: 600 });
		// Include session ID in state parameter so we can retrieve callback URL later
		return c.redirect(`${authUrl}&state=${sessionId}`);
	}

	return c.redirect(authUrl);
});

// GET /auth/google/callback - Google OAuth callback
auth.get('/google/callback', async (c) => {
	const env = c.env;
	const url = new URL(c.req.url);

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	if (error) {
		return c.json({ error: `OAuth error: ${error}` }, 400);
	}

	if (!code) {
		return c.json({ error: 'Missing code parameter' }, 400);
	}

	// Retrieve callback URL if state was provided
	const callbackUrl = (env.SESSIONS && state) ? await env.SESSIONS.get(`callback:${state}`) : null;
	if (state && env.SESSIONS) {
		// Clean up callback URL
		await env.SESSIONS.delete(`callback:${state}`);
	}
	console.log(callbackUrl)

	const redirectUri = `${url.protocol}//${url.host}/auth/google/callback`;

	// Exchange code for tokens
	const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			code: code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri,
		}),
	});

	if (!tokenResponse.ok) {
		const error = await tokenResponse.text();
		return c.json({ error: `Token exchange failed: ${error}` }, 400);
	}

	const tokens = (await tokenResponse.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
		id_token?: string;
	};

	// Get user info
	const userResponse = await fetch(GOOGLE_USERINFO_URL, {
		headers: {
			Authorization: `Bearer ${tokens.access_token}`,
		},
	});

	if (!userResponse.ok) {
		return c.json({ error: 'Failed to get user info' }, 400);
	}

	const userInfo = (await userResponse.json()) as {
		id: string;
		email: string;
		name: string;
		picture: string;
	};

	// Create session
	const sessionId = generateSessionId();
	const sessionData = {
		id: userInfo.id,
		email: userInfo.email,
		name: userInfo.name,
		picture: userInfo.picture,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		createdAt: Date.now(),
	};

	// Create user in subscription service (if doesn't exist)
	try {
		const subscriptionClient = createSubscriptionClient(env);
		await subscriptionClient.createUser({
			id: userInfo.id,
			email: userInfo.email,
			name: userInfo.name,
			picture: userInfo.picture,
		});
		console.log(`[Auth] Created user in subscription service: ${userInfo.email}`);
	} catch (error) {
		// User might already exist, that's okay
		console.log(`[Auth] User creation note (may already exist): ${error}`);
	}

	// Store session in KV (expires in 7 days)
	if (env.SESSIONS) {
		await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionData), {
			expirationTtl: 7 * 24 * 60 * 60,
		});
	}

	// Puku Editor uses puku:// URI scheme (custom VS Code build)
	const finalCallbackUrl = callbackUrl || `puku://GitHub.puku-editor/callback`;
    const pukuUri = `${finalCallbackUrl}?token=${sessionId}&state=${state}`;

    console.log(`[Auth] Redirecting to: ${pukuUri.replace(sessionId, '***').replace(state, '***')}`);


	// Return HTML that shows success and tries to open the editor
	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Puku Editor - Login Successful</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			display: flex;
			justify-content: center;
			align-items: center;
			height: 100vh;
			margin: 0;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
		}
		.container {
			text-align: center;
			padding: 40px;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 16px;
			backdrop-filter: blur(10px);
			max-width: 500px;
		}
		h1 { margin-bottom: 10px; }
		p { opacity: 0.9; margin: 10px 0; }
		.token-box {
			background: rgba(0,0,0,0.3);
			padding: 15px;
			border-radius: 8px;
			margin: 20px 0;
			word-break: break-all;
			font-family: monospace;
			font-size: 12px;
			cursor: pointer;
			transition: background 0.2s;
		}
		.token-box:hover {
			background: rgba(0,0,0,0.4);
		}
		.token-box.copied {
			background: rgba(0,255,0,0.2);
		}
		.buttons {
			display: flex;
			gap: 10px;
			justify-content: center;
			flex-wrap: wrap;
			margin-top: 20px;
		}
		.button {
			display: inline-block;
			padding: 12px 24px;
			background: white;
			color: #667eea;
			border-radius: 8px;
			text-decoration: none;
			font-weight: bold;
			transition: transform 0.2s;
			border: none;
			cursor: pointer;
			font-size: 14px;
		}
		.button:hover {
			transform: scale(1.05);
		}
		.button.secondary {
			background: rgba(255,255,255,0.2);
			color: white;
		}
		.hint {
			font-size: 12px;
			opacity: 0.7;
			margin-top: 15px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>✅ Login Successful!</h1>
		<p>Welcome, <strong>${userInfo.name}</strong>!</p>
		<p>Click the button below to return to Puku Editor:</p>
		<div class="buttons">
			<a href="${pukuUri}" class="button">Open Puku Editor</a>
		</div>
		<p class="hint">If the button doesn't work, copy the token below and paste it in Puku Editor:</p>
		<div class="token-box" onclick="copyToken()" title="Click to copy">
			${sessionId}
		</div>
		<p id="copy-status" style="font-size: 12px; opacity: 0;"></p>
	</div>
	<script>
		function copyToken() {
			navigator.clipboard.writeText('${sessionId}').then(() => {
				document.querySelector('.token-box').classList.add('copied');
				document.getElementById('copy-status').textContent = 'Token copied to clipboard!';
				document.getElementById('copy-status').style.opacity = '1';
				setTimeout(() => {
					document.querySelector('.token-box').classList.remove('copied');
					document.getElementById('copy-status').style.opacity = '0';
				}, 2000);
			});
		}
	</script>
</body>
</html>
`;

	return c.html(html);
});

// GET /auth/session - Validate session and get user info
auth.get('/session', async (c) => {
	const env = c.env;
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing authorization header' }, 401);
	}

	const sessionId = authHeader.replace('Bearer ', '');

	if (!env.SESSIONS) {
		return c.json({ error: 'Sessions not configured' }, 500);
	}

	const sessionData = await env.SESSIONS.get(`session:${sessionId}`);

	if (!sessionData) {
		return c.json({ error: 'Invalid or expired session' }, 401);
	}

	const session = JSON.parse(sessionData);

	return c.json({
		id: session.id,
		email: session.email,
		name: session.name,
		picture: session.picture,
		createdAt: session.createdAt,
	});
});

// POST /auth/logout - Invalidate session
auth.post('/logout', async (c) => {
	const env = c.env;
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing authorization header' }, 401);
	}

	const sessionId = authHeader.replace('Bearer ', '');

	if (env.SESSIONS) {
		await env.SESSIONS.delete(`session:${sessionId}`);
	}

	return c.json({ success: true });
});

// GET /auth/status - Check if user is authenticated
auth.get('/status', async (c) => {
	const env = c.env;
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ authenticated: false });
	}

	const sessionId = authHeader.replace('Bearer ', '');

	if (!env.SESSIONS) {
		return c.json({ authenticated: false });
	}

	const sessionData = await env.SESSIONS.get(`session:${sessionId}`);

	if (!sessionData) {
		return c.json({ authenticated: false });
	}

	const session = JSON.parse(sessionData);

	return c.json({
		authenticated: true,
		user: {
			id: session.id,
			email: session.email,
			name: session.name,
		},
	});
});

// POST /auth/create-user - Manual user creation for testing
auth.post('/create-user', async (c) => {
	try {
		const body = await c.req.json();
		const { id, email, name, picture } = body;

		if (!id || !email || !name) {
			return c.json({ error: 'Missing required fields: id, email, name' }, 400);
		}

		const subscriptionClient = createSubscriptionClient(c.env);
		const result = await subscriptionClient.createUser({
			id,
			email,
			name,
			picture,
		});

		return c.json({ success: true, user: result });
	} catch (error: any) {
		console.error('[Auth] Create user error:', error);
		return c.json({ error: error.message }, 500);
	}
});
