import { Router } from 'express';
import { tokenStore } from '../auth/tokenStore.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/tokens/register - Register a new token
 * Requires admin authentication or can be open for self-registration
 */
router.post('/api/tokens/register', (req: AuthenticatedRequest, res) => {
	try {
		const { token, userId, metadata } = req.body;

		if (!token || typeof token !== 'string' || token.trim().length === 0) {
			return res.status(400).json({
				error: {
					message: 'Token is required and must be a non-empty string',
					type: 'invalid_request_error',
				},
			});
		}

		tokenStore.registerToken(token, userId, metadata);

		res.json({
			success: true,
			message: 'Token registered successfully',
		});
	} catch (error) {
		console.error('Token registration error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

/**
 * DELETE /api/tokens/:token - Revoke a token
 * Requires authentication
 */
router.delete('/api/tokens/:token', requireAuth, (req: AuthenticatedRequest, res) => {
	try {
		const token = req.params.token;

		if (tokenStore.revokeToken(token)) {
			res.json({
				success: true,
				message: 'Token revoked successfully',
			});
		} else {
			res.status(404).json({
				error: {
					message: 'Token not found',
					type: 'not_found_error',
				},
			});
		}
	} catch (error) {
		console.error('Token revocation error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

/**
 * GET /api/tokens - List all tokens (admin only)
 * Requires authentication
 */
router.get('/api/tokens', requireAuth, (req: AuthenticatedRequest, res) => {
	try {
		const tokens = tokenStore.listTokens();
		
		// Don't expose full tokens, just metadata
		const tokenList = tokens.map(t => ({
			userId: t.userId,
			createdAt: t.createdAt,
			lastUsed: t.lastUsed,
			metadata: t.metadata,
			tokenPrefix: t.token.substring(0, 8) + '...', // Only show first 8 chars
		}));

		res.json({
			tokens: tokenList,
			count: tokenList.length,
		});
	} catch (error) {
		console.error('Token list error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

/**
 * POST /api/tokens/issue - Issue a new token
 * Returns a new token that can be used for authentication
 */
router.post('/api/tokens/issue', (req: AuthenticatedRequest, res) => {
	try {
		const { userId, metadata } = req.body;
		
		// Generate a new token
		const token = tokenStore.generateToken(userId, metadata);
		
		res.json({
			token,
			expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
			refresh_in: 3600, // 1 hour
			userId,
			metadata,
		});
	} catch (error) {
		console.error('Token issuance error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

/**
 * GET /api/tokens/validate - Validate a token
 * Returns token info if valid
 */
router.get('/api/tokens/validate', requireAuth, (req: AuthenticatedRequest, res) => {
	try {
		if (!req.authToken) {
			return res.status(401).json({
				valid: false,
				error: 'No token provided',
			});
		}

		const tokenInfo = tokenStore.getTokenInfo(req.authToken);
		
		if (tokenInfo) {
			res.json({
				valid: true,
				userId: tokenInfo.userId,
				createdAt: tokenInfo.createdAt,
				lastUsed: tokenInfo.lastUsed,
			});
		} else {
			res.json({
				valid: true, // Token is valid (might be default token)
				message: 'Token is valid but not registered in store',
			});
		}
	} catch (error) {
		console.error('Token validation error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

export default router;

