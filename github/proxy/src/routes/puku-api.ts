import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Puku AI API endpoints
 * These endpoints provide the embedding models and auth flow for Puku Editor's
 * workspace indexing and semantic search functionality.
 */

// GET /puku/v1/models - Returns available embedding models for indexing
// Note: Model details are internal - users just see "puku-embeddings"
router.get('/puku/v1/models', (req: Request, res: Response) => {
	console.log('[Puku API] GET /puku/v1/models - Returning embedding models');

	// Return a simple model name - hide underlying provider details from users
	res.json({
		models: [
			{
				id: 'puku-embeddings', // User-facing name (internal: mistralai/codestral-embed-2505)
				active: true,
				dimensions: 1024,
			},
		],
	});
});

// GET /puku/v1/token - Returns a Puku auth token for embedding requests
router.get('/puku/v1/token', (req: Request, res: Response) => {
	console.log('[Puku API] GET /puku/v1/token - Returning auth token');

	const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

	res.json({
		token: 'puku-auth-token',
		expires_at: expiresAt,
		refresh_in: 1800,
		endpoints: {
			api: 'http://localhost:11434',
			// Use Puku embeddings endpoint - it auto-injects the model
			embeddings: 'http://localhost:11434/puku/v1/embeddings',
		},
		// Feature flags for Puku Editor
		indexing_enabled: true,
		semantic_search_enabled: true,
	});
});

// Default embedding model (kept internal - users don't see this)
const DEFAULT_EMBEDDING_MODEL = 'mistralai/codestral-embed-2505';

// POST /puku/v1/embeddings - Proxy to main embeddings endpoint
// Automatically injects the default embedding model - frontend doesn't need to specify
router.post('/puku/v1/embeddings', async (req: Request, res: Response) => {
	console.log('[Puku API] POST /puku/v1/embeddings - Computing embeddings');

	try {
		// Auto-inject the default model - hide model details from users
		const body = {
			...req.body,
			model: DEFAULT_EMBEDDING_MODEL, // Always use our default model
		};

		const response = await fetch('http://localhost:11434/v1/embeddings', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		const data = await response.json();
		res.status(response.status).json(data);
	} catch (error) {
		console.error('[Puku API] Embeddings proxy error:', error);
		res.status(500).json({
			error: {
				message: 'Failed to compute embeddings',
				type: 'server_error',
			},
		});
	}
});

// GET /puku/v1/user - Puku user info
router.get('/puku/v1/user', (req: Request, res: Response) => {
	console.log('[Puku API] GET /puku/v1/user - Returning user info');

	res.json({
		id: 'puku-local-user',
		name: 'Puku Editor User',
		email: 'puku@localhost',
	});
});

// GET /puku/v1/status - Index status endpoint
router.get('/puku/v1/status', (req: Request, res: Response) => {
	console.log('[Puku API] GET /puku/v1/status - Returning service status');

	res.json({
		status: 'ready',
		embeddings_available: true,
		indexing_available: true,
		model: 'codestral-embed-2505',
		dimensions: 1024,
	});
});

export default router;
