import { config } from '../config.js';

/**
 * Simple token store for managing authentication tokens
 * In production, you might want to use a database or Redis
 */

interface TokenInfo {
	token: string;
	userId?: string;
	createdAt: number;
	lastUsed: number;
	metadata?: Record<string, any>;
}

export class TokenStore {
	private tokens = new Map<string, TokenInfo>();
	private readonly defaultToken: string | undefined;
	private readonly authEnabled: boolean;

	constructor() {
		// Allow setting a default token via environment variable
		this.defaultToken = config.auth.defaultToken;
		this.authEnabled = config.auth.enabled;
	}

	/**
	 * Validate a token
	 */
	validateToken(token: string): boolean {
		// If authentication is disabled, accept any token
		if (!this.authEnabled) {
			return true;
		}

		// If token exists in store, it's valid
		if (this.tokens.has(token)) {
			const tokenInfo = this.tokens.get(token)!;
			tokenInfo.lastUsed = Date.now();
			return true;
		}

		// Check if it matches default token
		if (this.defaultToken && token === this.defaultToken) {
			return true;
		}

		// If auth is enabled but no tokens registered, accept any non-empty token for now
		// In production, you'd want proper validation (JWT, database lookup, etc.)
		if (this.tokens.size === 0 && !this.defaultToken) {
			// No tokens registered yet, accept any token and auto-register it
			if (token.length > 0) {
				this.registerToken(token);
				return true;
			}
		}

		// Token not found and doesn't match default
		return false;
	}

	/**
	 * Register a new token
	 */
	registerToken(token: string, userId?: string, metadata?: Record<string, any>): void {
		this.tokens.set(token, {
			token,
			userId,
			createdAt: Date.now(),
			lastUsed: Date.now(),
			metadata,
		});
	}

	/**
	 * Get token info
	 */
	getTokenInfo(token: string): TokenInfo | undefined {
		return this.tokens.get(token);
	}

	/**
	 * Revoke a token
	 */
	revokeToken(token: string): boolean {
		return this.tokens.delete(token);
	}

	/**
	 * List all tokens (for admin/debugging)
	 */
	listTokens(): TokenInfo[] {
		return Array.from(this.tokens.values());
	}

	/**
	 * Generate a new token
	 */
	generateToken(userId?: string, metadata?: Record<string, any>): string {
		// Generate a random token (in production, use a proper token generation library)
		const token = `puku_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
		this.registerToken(token, userId, metadata);
		return token;
	}
}

export const tokenStore = new TokenStore();

