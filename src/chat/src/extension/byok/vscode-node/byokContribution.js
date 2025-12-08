"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BYOKContrib = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const azureProvider_1 = require("./azureProvider");
const byokStorageService_1 = require("./byokStorageService");
const customOAIModelConfigurator_1 = require("./customOAIModelConfigurator");
const customOAIProvider_1 = require("./customOAIProvider");
let BYOKContrib = class BYOKContrib extends lifecycle_1.Disposable {
    constructor(_fetcherService, _logService, _configurationService, _capiClientService, extensionContext, authService, _instantiationService) {
        super();
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._capiClientService = _capiClientService;
        this._instantiationService = _instantiationService;
        this.id = 'byok-contribution';
        this._providers = new Map();
        this._byokProvidersRegistered = false;
        this._logService.info('BYOK: BYOKContrib constructor called');
        console.log('BYOK: BYOKContrib constructor called');
        this._register(vscode_1.commands.registerCommand('puku.chat.manageBYOK', async (vendor) => {
            const provider = this._providers.get(vendor);
            // Show quick pick for Azure and CustomOAI providers
            if (provider && (vendor === azureProvider_1.AzureBYOKModelProvider.providerName.toLowerCase() || vendor === customOAIProvider_1.CustomOAIBYOKModelProvider.providerName.toLowerCase())) {
                const configurator = new customOAIModelConfigurator_1.CustomOAIModelConfigurator(this._configurationService, vendor, provider);
                await configurator.configureModelOrUpdateAPIKey();
            }
            else if (provider) {
                // For all other providers, directly go to API key management
                await provider.updateAPIKey();
            }
        }));
        this._register(vscode_1.commands.registerCommand('puku.chat.manageBYOKAPIKey', async (vendor, envVarName, action, modelId) => {
            const provider = this._providers.get(vendor);
            if (!provider) {
                this._logService.error(`BYOK: Provider ${vendor} not found`);
                return;
            }
            try {
                if (provider.updateAPIKeyViaCmd) {
                    await provider.updateAPIKeyViaCmd(envVarName, action ?? 'update', modelId);
                }
                else {
                    this._logService.error(`BYOK: Provider ${vendor} does not support API key management via command`);
                }
            }
            catch (error) {
                this._logService.error(`BYOK: Failed to ${action || 'update'} API key for provider ${vendor}${modelId ? ` and model ${modelId}` : ''}`, error);
                throw error;
            }
        }));
        this._byokStorageService = new byokStorageService_1.BYOKStorageService(extensionContext);
        this._logService.info('BYOK: Calling initial _authChange');
        console.log('BYOK: Calling initial _authChange');
        this._authChange(authService, this._instantiationService);
        this._register(authService.onDidAuthenticationChange(() => {
            this._logService.info('BYOK: Auth changed, calling _authChange');
            console.log('BYOK: Auth changed, calling _authChange');
            this._authChange(authService, this._instantiationService);
        }));
    }
    async _authChange(authService, instantiationService) {
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
                }
                catch (e) {
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
                    this._store.add(vscode_1.lm.registerLanguageModelChatProvider(vendorName, provider));
                }
                this._logService.info(`BYOK: Registered ${this._providers.size} provider(s)`);
                console.log(`BYOK: Registered ${this._providers.size} provider(s)`);
            }
        }
    }
    async fetchKnownModelList(fetcherService) {
        const data = await (await fetcherService.fetch('https://main.vscode-cdn.net/extensions/copilotChat.json', { method: "GET" })).json();
        let knownModels;
        if (data.version !== 1) {
            this._logService.warn('BYOK: Copilot Chat known models list is not in the expected format. Defaulting to empty list.');
            knownModels = {};
        }
        else {
            knownModels = data.modelInfo;
        }
        this._logService.info('BYOK: Copilot Chat known models list fetched successfully.');
        return knownModels;
    }
};
exports.BYOKContrib = BYOKContrib;
exports.BYOKContrib = BYOKContrib = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, logService_1.ILogService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, capiClient_1.ICAPIClientService),
    __param(4, extensionContext_1.IVSCodeExtensionContext),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, instantiation_1.IInstantiationService)
], BYOKContrib);
//# sourceMappingURL=byokContribution.js.map