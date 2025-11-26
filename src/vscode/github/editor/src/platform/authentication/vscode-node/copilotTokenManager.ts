/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { TaskSingler } from '../../../util/common/taskSingler';
import { ConfigKey, IConfigurationService } from '../../configuration/common/configurationService';
import { ICAPIClientService } from '../../endpoint/common/capiClient';
import { IDomainService } from '../../endpoint/common/domainService';
import { IEnvService } from '../../env/common/envService';
import { BaseOctoKitService } from '../../github/common/githubService';
import { ILogService } from '../../log/common/logService';
import { IFetcherService } from '../../networking/common/fetcherService';
import { ITelemetryService } from '../../telemetry/common/telemetry';
import { CopilotToken, ExtendedTokenInfo, TokenErrorNotificationId, TokenInfoOrError } from '../common/copilotToken';
import { nowSeconds } from '../common/copilotTokenManager';
import { BaseCopilotTokenManager } from '../node/copilotTokenManager';

//Flag if we've shown message about broken oauth token.
let shown401Message = false;

export class NotSignedUpError extends Error { }
export class SubscriptionExpiredError extends Error { }
export class ContactSupportError extends Error { }
export class EnterpriseManagedError extends Error { }
export class ChatDisabledError extends Error { }

export class VSCodeCopilotTokenManager extends BaseCopilotTokenManager {
	private _taskSingler = new TaskSingler<TokenInfoOrError>();

	constructor(
		@ILogService logService: ILogService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IDomainService domainService: IDomainService,
		@ICAPIClientService capiClientService: ICAPIClientService,
		@IFetcherService fetcherService: IFetcherService,
		@IEnvService envService: IEnvService,
		@IConfigurationService protected readonly configurationService: IConfigurationService
	) {
		super(new BaseOctoKitService(capiClientService, fetcherService, logService, telemetryService), logService, telemetryService, domainService, capiClientService, fetcherService, envService);
	}

	async getCopilotToken(force?: boolean): Promise<CopilotToken> {
		if (!this.copilotToken || this.copilotToken.expires_at - (60 * 5 /* 5min */) < nowSeconds() || force) {
			try {
				this._logService.debug(`Getting CopilotToken (force: ${force})...`);
				this.copilotToken = await this._authShowWarnings();
				this._logService.debug(`Got CopilotToken (force: ${force}).`);
			} catch (e) {
				this._logService.debug(`Getting CopilotToken (force: ${force}) threw error: ${e}`);
				this.copilotToken = undefined;
				throw e;
			}
		}
		return new CopilotToken(this.copilotToken);
	}

	private async _auth(): Promise<TokenInfoOrError> {
		// Puku Editor: Always fetch token from proxy when Puku AI endpoint is configured
		const pukuAIEndpoint = this.configurationService.getConfig(ConfigKey.PukuAIEndpoint);
		if (pukuAIEndpoint) {
			this._logService.info(`[PukuTokenManager] Puku AI endpoint configured, fetching token from proxy`);
			try {
				const tokenUrl = `${pukuAIEndpoint}/api/tokens/issue`;
				const response = await this._fetcherService.fetch(tokenUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						userId: 'puku-user',
						metadata: {
							source: 'puku-editor',
							version: this._envService.getVersion(),
						},
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					this._logService.error(`[PukuTokenManager] Failed to fetch token from proxy: ${response.status} ${errorText}`);
					return { 
						kind: 'failure', 
						reason: 'FailedToGetToken',
						message: `Proxy returned ${response.status}: ${errorText}`
					};
				}

				const tokenData = await response.json() as {
					token: string;
					expires_at: number;
					refresh_in: number;
					userId?: string;
				};

				if (!tokenData.token) {
					this._logService.error(`[PukuTokenManager] Proxy returned invalid token data`);
					return { 
						kind: 'failure', 
						reason: 'FailedToGetToken',
						message: 'Token missing in proxy response'
					};
				}

				// Convert expires_at from milliseconds to seconds if needed
				const expiresAt = tokenData.expires_at > 10000000000 
					? Math.floor(tokenData.expires_at / 1000) 
					: tokenData.expires_at;

				this._logService.info(`[PukuTokenManager] Successfully fetched token from proxy, expires at ${new Date(expiresAt * 1000).toISOString()}`);
				return {
					kind: 'success',
					token: tokenData.token,
					expires_at: expiresAt,
					refresh_in: tokenData.refresh_in,
					username: tokenData.userId || 'puku-user',
					copilot_plan: 'individual',
					isVscodeTeamMember: false,
					chat_enabled: true,
					organization_list: [],
					individual: true,
					endpoints: {
						'api': pukuAIEndpoint,
						'telemetry': '',
						'proxy': pukuAIEndpoint,
					},
				};
			} catch (error) {
				this._logService.error(`[PukuTokenManager] Error fetching token from proxy:`, error);
				return { 
					kind: 'failure', 
					reason: 'FailedToGetToken',
					message: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		}

		// If no Puku AI endpoint is configured, return error (no fallback to GitHub)
		this._logService.warn('[PukuTokenManager] No Puku AI endpoint configured');
		return { 
			kind: 'failure', 
			reason: 'FailedToGetToken',
			message: 'Puku AI endpoint must be configured'
		};
	}

	private async _authShowWarnings(): Promise<ExtendedTokenInfo> {
		const tokenResult = await this._taskSingler.getOrCreate('auth', () => this._auth());

		if (tokenResult.kind === 'failure' && tokenResult.reason === 'NotAuthorized') {
			const message = tokenResult.message;
			switch (tokenResult.notification_id) {
				case TokenErrorNotificationId.NotSignedUp:
				case TokenErrorNotificationId.NoCopilotAccess:
					throw new NotSignedUpError(message ?? 'User not authorized');
				case TokenErrorNotificationId.SubscriptionEnded:
					throw new SubscriptionExpiredError(message);
				case TokenErrorNotificationId.EnterPriseManagedUserAccount:
					throw new EnterpriseManagedError(message);
				case TokenErrorNotificationId.ServerError:
				case TokenErrorNotificationId.FeatureFlagBlocked:
				case TokenErrorNotificationId.SpammyUser:
				case TokenErrorNotificationId.SnippyNotConfigured:
					throw new ContactSupportError(message);
			}
		}
		if (tokenResult.kind === 'failure' && tokenResult.reason === 'HTTP401') {
			const message =
				'Your GitHub token is invalid. Please sign out from your GitHub account using the VS Code accounts menu and try again.';
			if (!shown401Message) {
				shown401Message = true;
				window.showWarningMessage(message);
			}
			throw Error(message);
		}

		if (tokenResult.kind === 'failure' && tokenResult.reason === 'GitHubLoginFailed') {
			throw Error('GitHubLoginFailed');
		}

		if (tokenResult.kind === 'failure' && tokenResult.reason === 'RateLimited') {
			throw Error("Your account has exceeded GitHub's API rate limit. Please try again later.");
		}

		if (tokenResult.kind === 'failure') {
			throw Error('Failed to get copilot token');
		}

		if (tokenResult.kind === 'success' && tokenResult.chat_enabled === false) {
			throw new ChatDisabledError('Copilot Chat is disabled');
		}

		return tokenResult;
	}
}
