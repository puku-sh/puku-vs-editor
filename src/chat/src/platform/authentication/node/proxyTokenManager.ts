/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from '../../configuration/common/configurationService';
import { ConfigKey } from '../../configuration/common/configurationService';
import { ILogService } from '../../log/common/logService';
import { IFetcherService } from '../../networking/common/fetcherService';
import { ITelemetryService } from '../../telemetry/common/telemetry';
import { BaseCopilotTokenManager, ExtendedTokenInfo, TokenInfoOrError } from './copilotTokenManager';
import { CopilotToken } from '../common/copilotToken';

/**
 * Token manager that fetches tokens from the Puku AI proxy
 */
export class ProxyTokenManager extends BaseCopilotTokenManager {
	private copilotToken: ExtendedTokenInfo | undefined;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
	) {
		super();
	}

	async getCopilotToken(force?: boolean): Promise<CopilotToken> {
		if (!this.copilotToken || this.copilotToken.expires_at < Date.now() / 1000 - 300 || force) {
			const tokenResult = await this.fetchTokenFromProxy();
			if (tokenResult.kind === 'failure') {
				throw new Error(`Failed to get token from proxy: ${tokenResult.reason}`);
			}
			this.copilotToken = { ...tokenResult };
		}
		return new CopilotToken(this.copilotToken);
	}

	private async fetchTokenFromProxy(): Promise<TokenInfoOrError> {
		try {
			const endpoint = this._configurationService.getConfig(ConfigKey.PukuAIEndpoint);
			if (!endpoint) {
				return { kind: 'failure', reason: 'NoProxyEndpoint' };
			}

			const tokenUrl = `${endpoint}/api/tokens/issue`;
			this._logService.info(`[ProxyTokenManager] Fetching token from ${tokenUrl}`);

			const response = await this._fetcherService.fetch(tokenUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: 'puku-user',
					metadata: {
						source: 'vscode-extension',
					},
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				this._logService.error(`[ProxyTokenManager] Token fetch failed: ${response.status} ${errorText}`);
				return { kind: 'failure', reason: 'HTTPError', message: errorText };
			}

			const tokenData = await response.json() as {
				token: string;
				expires_at: number;
				refresh_in: number;
				userId?: string;
				metadata?: Record<string, any>;
			};

			if (!tokenData.token) {
				return { kind: 'failure', reason: 'NoTokenInResponse' };
			}

			// Convert expires_at from milliseconds to seconds if needed
			const expiresAt = tokenData.expires_at > 10000000000 
				? Math.floor(tokenData.expires_at / 1000) 
				: tokenData.expires_at;

			const extendedInfo: ExtendedTokenInfo = {
				token: tokenData.token,
				expires_at: expiresAt,
				refresh_in: tokenData.refresh_in,
				username: tokenData.userId || 'puku-user',
				copilot_plan: 'individual',
				isVscodeTeamMember: false,
				chat_enabled: true,
			};

			this._logService.info(`[ProxyTokenManager] Successfully fetched token, expires at ${new Date(expiresAt * 1000).toISOString()}`);
			return { kind: 'success', ...extendedInfo };
		} catch (error) {
			this._logService.error(`[ProxyTokenManager] Error fetching token:`, error);
			return { 
				kind: 'failure', 
				reason: 'NetworkError',
				message: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	async checkCopilotToken(): Promise<{ status: 'OK' } | TokenInfoOrError> {
		if (!this.copilotToken || this.copilotToken.expires_at < Date.now() / 1000) {
			const tokenResult = await this.fetchTokenFromProxy();
			if (tokenResult.kind === 'failure') {
				return tokenResult;
			}
			this.copilotToken = { ...tokenResult };
		}
		return { status: 'OK' };
	}
}

