/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

/**
 * Puku authentication token
 */
export interface PukuToken {
	readonly token: string;
	readonly expiresAt: number;
	readonly refreshIn: number;
	readonly endpoints: {
		api: string;
		embeddings: string;
	};
	readonly indexingEnabled: boolean;
	readonly semanticSearchEnabled: boolean;
}

/**
 * Puku user info
 */
export interface PukuUser {
	readonly id: string;
	readonly name: string;
	readonly email: string;
}

/**
 * Authentication status
 */
export enum PukuAuthStatus {
	Unknown = 'unknown',
	Authenticated = 'authenticated',
	Unauthenticated = 'unauthenticated',
	Error = 'error',
}

export const IPukuAuthService = createServiceIdentifier<IPukuAuthService>('IPukuAuthService');

export interface IPukuAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when authentication status changes
	 */
	readonly onDidChangeAuthStatus: Event<PukuAuthStatus>;

	/**
	 * Current authentication status
	 */
	readonly status: PukuAuthStatus;

	/**
	 * Current token (if authenticated)
	 */
	readonly token: PukuToken | undefined;

	/**
	 * Current user (if authenticated)
	 */
	readonly user: PukuUser | undefined;

	/**
	 * Get or refresh the auth token
	 */
	getToken(): Promise<PukuToken | undefined>;

	/**
	 * Get user info
	 */
	getUser(): Promise<PukuUser | undefined>;

	/**
	 * Check if authenticated and ready for indexing
	 */
	isReady(): boolean;

	/**
	 * Initialize authentication
	 */
	initialize(): Promise<void>;

	/**
	 * Sign out / clear token
	 */
	signOut(): void;
}

/**
 * Puku Auth Service - manages authentication with Puku API
 */
export class PukuAuthService extends Disposable implements IPukuAuthService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAuthStatus = this._register(new Emitter<PukuAuthStatus>());
	readonly onDidChangeAuthStatus = this._onDidChangeAuthStatus.event;

	private _status: PukuAuthStatus = PukuAuthStatus.Unknown;
	private _token: PukuToken | undefined;
	private _user: PukuUser | undefined;
	private _refreshTimeout: ReturnType<typeof setTimeout> | undefined;

	private readonly _pukuEndpoint: string;

	constructor(pukuEndpoint: string) {
		super();
		this._pukuEndpoint = pukuEndpoint;
	}

	get status(): PukuAuthStatus {
		return this._status;
	}

	get token(): PukuToken | undefined {
		return this._token;
	}

	get user(): PukuUser | undefined {
		return this._user;
	}

	isReady(): boolean {
		return this._status === PukuAuthStatus.Authenticated && !!this._token?.indexingEnabled;
	}

	async initialize(): Promise<void> {
		try {
			const token = await this.getToken();
			if (token) {
				await this.getUser();
				this._setStatus(PukuAuthStatus.Authenticated);
			} else {
				this._setStatus(PukuAuthStatus.Unauthenticated);
			}
		} catch (error) {
			console.error('[PukuAuth] Initialization failed:', error);
			this._setStatus(PukuAuthStatus.Error);
		}
	}

	async getToken(): Promise<PukuToken | undefined> {
		// Return cached token if still valid
		if (this._token && this._token.expiresAt > Date.now() / 1000) {
			return this._token;
		}

		try {
			const response = await fetch(`${this._pukuEndpoint}/puku/v1/token`);
			if (!response.ok) {
				console.error('[PukuAuth] Failed to get token:', response.status);
				return undefined;
			}

			const data = await response.json();
			this._token = {
				token: data.token,
				expiresAt: data.expires_at,
				refreshIn: data.refresh_in,
				endpoints: data.endpoints,
				indexingEnabled: data.indexing_enabled ?? true,
				semanticSearchEnabled: data.semantic_search_enabled ?? true,
			};

			// Schedule token refresh
			this._scheduleTokenRefresh();

			return this._token;
		} catch (error) {
			console.error('[PukuAuth] Error fetching token:', error);
			return undefined;
		}
	}

	async getUser(): Promise<PukuUser | undefined> {
		if (this._user) {
			return this._user;
		}

		try {
			const response = await fetch(`${this._pukuEndpoint}/puku/v1/user`);
			if (!response.ok) {
				return undefined;
			}

			const data = await response.json();
			this._user = {
				id: data.id,
				name: data.name,
				email: data.email,
			};

			return this._user;
		} catch (error) {
			console.error('[PukuAuth] Error fetching user:', error);
			return undefined;
		}
	}

	signOut(): void {
		this._token = undefined;
		this._user = undefined;
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = undefined;
		}
		this._setStatus(PukuAuthStatus.Unauthenticated);
	}

	private _setStatus(status: PukuAuthStatus): void {
		if (this._status !== status) {
			this._status = status;
			this._onDidChangeAuthStatus.fire(status);
		}
	}

	private _scheduleTokenRefresh(): void {
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
		}

		if (this._token) {
			const refreshMs = (this._token.refreshIn - 60) * 1000; // Refresh 60 seconds before expiry
			this._refreshTimeout = setTimeout(() => {
				this._token = undefined;
				this.getToken().catch(console.error);
			}, Math.max(refreshMs, 60000));
		}
	}

	override dispose(): void {
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
		}
		super.dispose();
	}
}
