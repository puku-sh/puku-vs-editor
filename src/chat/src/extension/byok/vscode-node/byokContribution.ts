/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commands, LanguageModelChatInformation, lm } from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ICAPIClientService } from '../../../platform/endpoint/common/capiClient';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKKnownModels, BYOKModelProvider, isBYOKEnabled } from '../../byok/common/byokProvider';
import { IExtensionContribution } from '../../common/contributions';
import { AnthropicLMProvider } from './anthropicProvider';
import { AzureBYOKModelProvider } from './azureProvider';
import { BYOKStorageService, IBYOKStorageService } from './byokStorageService';
import { CustomOAIModelConfigurator } from './customOAIModelConfigurator';
import { CustomOAIBYOKModelProvider } from './customOAIProvider';
import { GeminiNativeBYOKLMProvider } from './geminiNativeProvider';
import { GroqBYOKLMProvider } from './groqProvider';
import { OAIBYOKLMProvider } from './openAIProvider';
import { OpenRouterLMProvider } from './openRouterProvider';
import { PukuAILMProvider } from './pukuAIProvider';
import { XAIBYOKLMProvider } from './xAIProvider';

export class BYOKContrib extends Disposable implements IExtensionContribution {
	public readonly id: string = 'byok-contribution';
	private readonly _byokStorageService: IBYOKStorageService;
	private readonly _providers: Map<string, BYOKModelProvider<LanguageModelChatInformation>> = new Map();
	private _byokProvidersRegistered = false;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ICAPIClientService private readonly _capiClientService: ICAPIClientService,
		@IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
		@IAuthenticationService authService: IAuthenticationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();
		this._logService.info('BYOK: BYOKContrib constructor called');
		console.log('BYOK: BYOKContrib constructor called');
		this._register(commands.registerCommand('puku.chat.manageBYOK', async (vendor: string) => {
			const provider = this._providers.get(vendor);

			// Show quick pick for Azure and CustomOAI providers
			if (provider && (vendor === AzureBYOKModelProvider.providerName.toLowerCase() || vendor === CustomOAIBYOKModelProvider.providerName.toLowerCase())) {
				const configurator = new CustomOAIModelConfigurator(this._configurationService, vendor, provider);
				await configurator.configureModelOrUpdateAPIKey();
			} else if (provider) {
				// For all other providers, directly go to API key management
				await provider.updateAPIKey();
			}
		}));

		this._register(commands.registerCommand('puku.chat.manageBYOKAPIKey', async (vendor: string, envVarName: string, action?: 'update' | 'remove', modelId?: string) => {
			const provider = this._providers.get(vendor);
			if (!provider) {
				this._logService.error(`BYOK: Provider ${vendor} not found`);
				return;
			}

			try {
				if (provider.updateAPIKeyViaCmd) {
					await provider.updateAPIKeyViaCmd(envVarName, action ?? 'update', modelId);
				} else {
					this._logService.error(`BYOK: Provider ${vendor} does not support API key management via command`);
				}
			} catch (error) {
				this._logService.error(`BYOK: Failed to ${action || 'update'} API key for provider ${vendor}${modelId ? ` and model ${modelId}` : ''}`, error);
				throw error;
			}
		}));

		this._byokStorageService = new BYOKStorageService(extensionContext);
		this._logService.info('BYOK: Calling initial _authChange');
		console.log('BYOK: Calling initial _authChange');
		this._authChange(authService, this._instantiationService);

		this._register(authService.onDidAuthenticationChange(() => {
			this._logService.info('BYOK: Auth changed, calling _authChange');
			console.log('BYOK: Auth changed, calling _authChange');
			this._authChange(authService, this._instantiationService);
		}));
	}

	private async _authChange(authService: IAuthenticationService, instantiationService: IInstantiationService) {
		// Puku Editor: BYOK disabled - only Puku AI provider is used
		this._logService.info(`BYOK: _authChange called. BYOK disabled, using Puku AI only`);
		console.log(`BYOK: _authChange called. BYOK disabled, using Puku AI only`);

		if (false && !this._byokProvidersRegistered) {
			this._byokProvidersRegistered = true;

			// Puku Editor: Skip BYOK registration for pukuai - PukuAIContribution handles it
			// Only register Ollama provider if it's not a pukuai endpoint
			let vendorName = 'ollama';
			let provider;
			let isPukuAI = false;

			if (ollamaEndpoint) {
				try {
					const vendorUrl = `${ollamaEndpoint}/api/vendor`;
					this._logService.info(`BYOK: Fetching vendor info from ${vendorUrl}`);
					console.log(`BYOK: Fetching vendor info from ${vendorUrl}`);

					const response = await this._fetcherService.fetch(vendorUrl, { method: 'GET' });
					if (response.ok) {
						const vendorInfo = await response.json();
						if (vendorInfo.vendor === 'pukuai') {
							// Puku AI is handled by PukuAIContribution, skip BYOK registration
							isPukuAI = true;
							this._logService.info(`BYOK: Detected Puku AI endpoint, skipping BYOK registration (handled by PukuAIContribution)`);
							console.log(`BYOK: Detected Puku AI endpoint, skipping BYOK registration`);
						}
					}
				} catch (e) {
					this._logService.warn(`BYOK: Failed to fetch vendor info: ${e}`);
					console.log(`BYOK: Failed to fetch vendor info`);
				}
			}

			// Only register if not Puku AI
			if (!isPukuAI) {
				provider = instantiationService.createInstance(OllamaLMProvider, ollamaEndpoint || 'http://localhost:11434', this._byokStorageService);
				const hasGitHubAuth = authService.copilotToken && !authService.copilotToken.isNoAuthUser;
				vendorName = (ollamaEndpoint && !hasGitHubAuth) ? 'copilot' : OllamaLMProvider.providerName.toLowerCase();

				this._logService.info(`BYOK: Creating provider with vendor name '${vendorName}' for endpoint ${ollamaEndpoint || 'http://localhost:11434'}`);
				console.log(`BYOK: Creating provider with vendor name '${vendorName}' for endpoint ${ollamaEndpoint || 'http://localhost:11434'}`);
				this._providers.set(vendorName, provider);

				for (const [vendorName, provider] of this._providers) {
					this._logService.info(`BYOK: Registering language model provider with vendor '${vendorName}'`);
					console.log(`BYOK: Registering language model provider with vendor '${vendorName}'`);
					this._store.add(lm.registerLanguageModelChatProvider(vendorName, provider));
				}
				this._logService.info(`BYOK: Registered ${this._providers.size} provider(s)`);
				console.log(`BYOK: Registered ${this._providers.size} provider(s)`);
			}
		}
	}
	private async fetchKnownModelList(fetcherService: IFetcherService): Promise<Record<string, BYOKKnownModels>> {
		const data = await (await fetcherService.fetch('https://main.vscode-cdn.net/extensions/copilotChat.json', { method: "GET" })).json();
		let knownModels: Record<string, BYOKKnownModels>;
		if (data.version !== 1) {
			this._logService.warn('BYOK: Copilot Chat known models list is not in the expected format. Defaulting to empty list.');
			knownModels = {};
		} else {
			knownModels = data.modelInfo;
		}
		this._logService.info('BYOK: Copilot Chat known models list fetched successfully.');
		return knownModels;
	}
}