/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAuthenticationService } from '../../../../../../platform/authentication/common/authentication';
import { CopilotToken, ExtendedTokenInfo } from '../../../../../../platform/authentication/common/copilotToken';
import { createServiceIdentifier } from '../../../../../../util/common/services';
import { ThrottledDelayer } from '../../../../../../util/vs/base/common/async';
import { Disposable } from '../../../../../../util/vs/base/common/lifecycle';
import { ConfigKey, ICompletionsConfigProvider } from '../config';
export { CopilotToken } from '../../../../../../platform/authentication/common/copilotToken';

/**
 * Create a dummy CopilotToken for BYOK mode (no GitHub authentication required)
 */
function createDummyToken(): CopilotToken {
	const dummyInfo: ExtendedTokenInfo = {
		token: '', // Empty token string
		expires_at: Date.now() + 86400000, // Expires in 24 hours
		refresh_in: 3600, // Refresh in 1 hour
		username: 'byok-user',
		isVscodeTeamMember: false,
		copilot_plan: 'individual',
		endpoints: undefined,
		chat_enabled: true,
		sku: 'no_auth_limited_copilot' // Mark as no-auth user
	};
	return new CopilotToken(dummyInfo);
}

export const ICompletionsCopilotTokenManager = createServiceIdentifier<ICompletionsCopilotTokenManager>('ICompletionsCopilotTokenManager');
export interface ICompletionsCopilotTokenManager {
	readonly _serviceBrand: undefined;
	get token(): CopilotToken | undefined;
	primeToken(): Promise<boolean>;
	getToken(): Promise<CopilotToken>;
	resetToken(httpError?: number): void;
	getLastToken(): Omit<CopilotToken, "token"> | undefined;
}

export class CopilotTokenManagerImpl extends Disposable implements ICompletionsCopilotTokenManager {
	declare _serviceBrand: undefined;
	private tokenRefetcher = new ThrottledDelayer(5_000);
	private _token: CopilotToken | undefined;
	get token() {
		void this.tokenRefetcher.trigger(() => this.updateCachedToken());
		return this._token;
	}

	constructor(
		protected primed = false,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService,
		@ICompletionsConfigProvider private readonly configProvider: ICompletionsConfigProvider
	) {
		super();

		// Puku Editor: Skip token update if BYOK mode or Puku AI is enabled
		const overrideProxyUrl = this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrl)
			|| this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrlLegacy);
		const pukuAIEndpoint = this.configProvider.getOptionalConfig<string>('pukuai.endpoint');
		const isPukuAIConfigured = !!pukuAIEndpoint;

		if (!overrideProxyUrl && !isPukuAIConfigured) {
			// Only fetch token if not in BYOK/Puku AI mode
			// Use catch to handle errors gracefully
			this.updateCachedToken().catch(() => {
				// Silently handle errors - updateCachedToken will create dummy token if needed
			});
			this._register(this.authenticationService.onDidAuthenticationChange(() => {
				this.updateCachedToken().catch(() => {
					// Silently handle errors
				});
			}));
		} else {
			// Initialize with dummy token immediately for BYOK/Puku AI mode
			this._token = createDummyToken();
		}
	}

	/**
	 * Ensure we have a token and that the `StatusReporter` is up to date.
	 */
	primeToken(): Promise<boolean> {
		try {
			return this.getToken().then(
				() => true,
				() => false
			);
		} catch (e) {
			return Promise.resolve(false);
		}
	}

	async getToken(): Promise<CopilotToken> {
		return this.updateCachedToken();
	}

	private async updateCachedToken(): Promise<CopilotToken> {
		// Puku Editor: In BYOK mode or when Puku AI is configured, return a dummy token instead of fetching from GitHub
		const overrideProxyUrl = this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrl)
			|| this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrlLegacy);
		
		// Check if Puku AI endpoint is configured (using string key since completions config uses string keys)
		// If endpoint is set (even if default), assume Puku AI mode
		const pukuAIEndpoint = this.configProvider.getOptionalConfig<string>('pukuai.endpoint');
		const isPukuAIConfigured = !!pukuAIEndpoint;

		if (overrideProxyUrl || isPukuAIConfigured) {
			// BYOK/Puku AI mode: Return dummy token with all required methods
			this._token = createDummyToken();
			return this._token;
		}

		// Normal Copilot mode: Fetch real token
		// Catch GitHubLoginFailed errors gracefully (e.g., when using Puku AI without GitHub auth)
		try {
			this._token = await this.authenticationService.getCopilotToken();
			return this._token;
		} catch (error) {
			// If GitHub login fails and we don't have a token, use dummy token
			// This allows the extension to work with Puku AI without GitHub authentication
			if (error instanceof Error && (error.message === 'GitHubLoginFailed' || error.message.includes('GitHubLoginFailed'))) {
				// Use dummy token if we don't have one yet
				if (!this._token) {
					this._token = createDummyToken();
					return this._token;
				}
				// If we have a token, return it (might be expired but better than nothing)
				return this._token;
			}
			throw error;
		}
	}

	resetToken(httpError?: number): void {
		this.authenticationService.resetCopilotToken();
	}

	getLastToken(): Omit<CopilotToken, "token"> | undefined {
		return this.authenticationService.copilotToken;
	}
}
