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

		// Puku Editor: Skip token update if BYOK mode is enabled (overrideProxyUrl is set)
		const overrideProxyUrl = this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrl)
			|| this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrlLegacy);

		if (!overrideProxyUrl) {
			// Only fetch token if not in BYOK mode
			this.updateCachedToken();
			this._register(this.authenticationService.onDidAuthenticationChange(() => this.updateCachedToken()));
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
		// Puku Editor: In BYOK mode, return a dummy token instead of fetching from GitHub
		const overrideProxyUrl = this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrl)
			|| this.configProvider.getOptionalConfig<string>(ConfigKey.DebugOverrideProxyUrlLegacy);

		if (overrideProxyUrl) {
			// BYOK mode: Return dummy token with all required methods
			this._token = createDummyToken();
			return this._token;
		}

		// Normal Copilot mode: Fetch real token
		this._token = await this.authenticationService.getCopilotToken();
		return this._token;
	}

	resetToken(httpError?: number): void {
		this.authenticationService.resetCopilotToken();
	}

	getLastToken(): Omit<CopilotToken, "token"> | undefined {
		return this.authenticationService.copilotToken;
	}
}
