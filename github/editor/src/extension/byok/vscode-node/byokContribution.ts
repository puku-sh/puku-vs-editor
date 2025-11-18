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
import { OllamaLMProvider } from './ollamaProvider';
import { OAIBYOKLMProvider } from './openAIProvider';
import { OpenRouterLMProvider } from './openRouterProvider';
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
		this._register(commands.registerCommand('github.copilot.chat.manageBYOK', async (vendor: string) => {
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

		this._register(commands.registerCommand('github.copilot.chat.manageBYOKAPIKey', async (vendor: string, envVarName: string, action?: 'update' | 'remove', modelId?: string) => {
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
		// Puku Editor: Register Ollama provider if endpoint is configured, regardless of GitHub auth
		const ollamaEndpoint = this._configurationService.getConfig(ConfigKey.OllamaEndpoint);
		const shouldRegisterByok = ollamaEndpoint || (authService.copilotToken && isBYOKEnabled(authService.copilotToken, this._capiClientService));

		this._logService.info(`BYOK: _authChange called. ollamaEndpoint=${ollamaEndpoint}, shouldRegisterByok=${shouldRegisterByok}, already registered=${this._byokProvidersRegistered}`);
		console.log(`BYOK: _authChange called. ollamaEndpoint=${ollamaEndpoint}, shouldRegisterByok=${shouldRegisterByok}, already registered=${this._byokProvidersRegistered}`);

		if (shouldRegisterByok && !this._byokProvidersRegistered) {
			this._byokProvidersRegistered = true;
			// Puku Editor: Only register Ollama provider for GLM models
			const ollamaProvider = instantiationService.createInstance(OllamaLMProvider, ollamaEndpoint || 'http://localhost:11434', this._byokStorageService);

			// Puku Editor: Query vendor API to determine which vendor name to use
			// Default behavior: Use "copilot" when no GitHub auth, "ollama" otherwise
			const hasGitHubAuth = authService.copilotToken && !authService.copilotToken.isNoAuthUser;
			let vendorName = (ollamaEndpoint && !hasGitHubAuth) ? 'copilot' : OllamaLMProvider.providerName.toLowerCase();

			// Try to get vendor info from the Ollama endpoint's /api/vendor endpoint
			if (ollamaEndpoint) {
				try {
					const vendorUrl = `${ollamaEndpoint}/api/vendor`;
					this._logService.info(`BYOK: Fetching vendor info from ${vendorUrl}`);
					console.log(`BYOK: Fetching vendor info from ${vendorUrl}`);

					const response = await this._fetcherService.fetch(vendorUrl, { method: 'GET' });
					if (response.ok) {
						const vendorInfo = await response.json();
						if (vendorInfo.vendor) {
							vendorName = vendorInfo.vendor;
							this._logService.info(`BYOK: Using vendor name '${vendorName}' from proxy vendor API`);
							console.log(`BYOK: Using vendor name '${vendorName}' from proxy vendor API. Full info:`, vendorInfo);
						}
					}
				} catch (e) {
					this._logService.warn(`BYOK: Failed to fetch vendor info, using default vendor name: ${e}`);
					console.log(`BYOK: Failed to fetch vendor info, using default vendor name '${vendorName}'`);
				}
			}

			this._logService.info(`BYOK: Creating Ollama provider with vendor name '${vendorName}' for endpoint ${ollamaEndpoint || 'http://localhost:11434'}`);
			console.log(`BYOK: Creating Ollama provider with vendor name '${vendorName}' for endpoint ${ollamaEndpoint || 'http://localhost:11434'}`);
			this._providers.set(vendorName, ollamaProvider);

			for (const [vendorName, provider] of this._providers) {
				this._logService.info(`BYOK: Registering language model provider with vendor '${vendorName}'`);
				console.log(`BYOK: Registering language model provider with vendor '${vendorName}'`);
				this._store.add(lm.registerLanguageModelChatProvider(vendorName, provider));
			}
			this._logService.info(`BYOK: Registered ${this._providers.size} provider(s)`);
			console.log(`BYOK: Registered ${this._providers.size} provider(s)`);
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