/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuAuthService } from '../../../extension/pukuIndexing/common/pukuAuth';
import { CopilotToken, ExtendedTokenInfo } from '../common/copilotToken';
import { ICopilotTokenManager } from '../common/copilotTokenManager';
import { ILogService } from '../../log/common/logService';

/**
 * Error thrown when Puku authentication is required but user is not signed in.
 * This matches the pattern of GitHubLoginFailed error from VSCodeCopilotTokenManager.
 */
export class PukuLoginRequired extends Error {
	constructor() {
		super('PukuLoginRequired');
		this.name = 'PukuLoginRequired';
	}
}

/**
 * Puku Token Manager - implements ICopilotTokenManager using Puku authentication
 * instead of GitHub Copilot authentication. This allows the chat system to work
 * with Puku tokens seamlessly.
 */
export class PukuTokenManager extends Disposable implements ICopilotTokenManager {
	readonly _serviceBrand: undefined;

	// Token managers need a refresh event, but Puku tokens are long-lived (7 days)
	// so we just provide an empty event
	readonly onDidCopilotTokenRefresh = Event.None;

	constructor(
		@ILogService private readonly _logService: ILogService,
		@IPukuAuthService private readonly _pukuAuthService: IPukuAuthService
	) {
		super();
		this._logService.info('[PukuTokenManager] Initialized - using Puku authentication instead of GitHub Copilot');
	}

	async getCopilotToken(force?: boolean): Promise<CopilotToken> {
		this._logService.debug(`[PukuTokenManager] Getting Puku token (force: ${force})...`);

		// Get Puku token from Puku auth service
		const pukuToken = await this._pukuAuthService.getToken();

		if (!pukuToken) {
			this._logService.debug('[PukuTokenManager] No Puku token available - will trigger sign-in on first chat use');
			// Throw PukuLoginRequired error - matches GitHubLoginFailed pattern
			// The chat entitlement service will catch this and trigger sign-in flow
			throw new PukuLoginRequired();
		}

		// Check token expiration with 5-minute buffer (following reference implementation pattern)
		const nowSeconds = Math.floor(Date.now() / 1000);
		const expirationBuffer = 60 * 5; // 5 minutes
		const isExpiringSoon = pukuToken.expiresAt - expirationBuffer < nowSeconds;

		if (isExpiringSoon) {
			this._logService.info('[PukuTokenManager] Puku token expiring within 5 minutes, user should re-authenticate');
			// For now, we'll still use the token but log the warning
			// TODO: Implement token refresh mechanism in IPukuAuthService
		}

		this._logService.debug('[PukuTokenManager] Got Puku token successfully');

		// Convert Puku token to CopilotToken format expected by the system
		// This allows the rest of the codebase to work without modification
		const extendedTokenInfo: ExtendedTokenInfo = {
			token: pukuToken.token,
			expires_at: pukuToken.expiresAt,
			refresh_in: pukuToken.refreshIn,
			username: pukuToken.username || 'puku-user',
			copilot_plan: 'business', // Puku is always business-tier
			isVscodeTeamMember: false,
		};

		return new CopilotToken(extendedTokenInfo);
	}

	resetCopilotToken(httpError?: number): void {
		// For Puku, we don't need to reset tokens on HTTP errors
		// The token is managed by the Puku auth service
		this._logService.debug(`[PukuTokenManager] Reset token requested (HTTP ${httpError}) - Puku tokens are managed by auth service`);
	}
}
