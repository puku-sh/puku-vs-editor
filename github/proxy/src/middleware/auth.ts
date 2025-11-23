import { Request, Response, NextFunction } from 'express';
import { tokenStore } from '../auth/tokenStore.js';

export interface AuthenticatedRequest extends Request {
	authToken?: string;
	userId?: string;
}

/**
 * Authentication middleware for token-based auth (similar to GitHub Copilot)
 * Supports Bearer token authentication
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	// Extract token from Authorization header
	const authHeader = req.headers.authorization;
	
	if (!authHeader) {
		// No auth header - allow request but mark as unauthenticated
		// This allows the proxy to work with or without authentication
		req.authToken = undefined;
		return next();
	}

	// Check for Bearer token format
	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') {
		return res.status(401).json({
			error: {
				message: 'Invalid authorization header format. Expected: Bearer <token>',
				type: 'authentication_error',
			},
		});
	}

	const token = parts[1];
	
	if (!token || token.trim().length === 0) {
		return res.status(401).json({
			error: {
				message: 'Token is required',
				type: 'authentication_error',
			},
		});
	}

	// Validate token
	if (!tokenStore.validateToken(token)) {
		return res.status(401).json({
			error: {
				message: 'Invalid or expired token',
				type: 'authentication_error',
			},
		});
	}

	// Store token in request for use in routes
	req.authToken = token;
	
	// Extract user info from token if available
	const tokenInfo = tokenStore.getTokenInfo(token);
	if (tokenInfo?.userId) {
		req.userId = tokenInfo.userId;
	}
	
	next();
}

/**
 * Optional authentication - allows requests with or without tokens
 * But validates token format if provided
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	
	if (authHeader) {
		const parts = authHeader.split(' ');
		if (parts.length === 2 && parts[0] === 'Bearer') {
			const token = parts[1];
			if (token && tokenStore.validateToken(token)) {
				req.authToken = token;
				const tokenInfo = tokenStore.getTokenInfo(token);
				if (tokenInfo?.userId) {
					req.userId = tokenInfo.userId;
				}
			}
		}
	}
	
	next();
}

/**
 * Required authentication - rejects requests without valid tokens
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	if (!req.authToken) {
		return res.status(401).json({
			error: {
				message: 'Authentication required. Please provide a Bearer token in the Authorization header.',
				type: 'authentication_error',
			},
		});
	}
	
	next();
}

