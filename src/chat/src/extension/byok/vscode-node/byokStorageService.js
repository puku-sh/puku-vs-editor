"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BYOKStorageService = void 0;
class BYOKStorageService {
    constructor(extensionContext) {
        this._extensionContext = extensionContext;
    }
    async getAPIKey(providerName, modelId) {
        // If model-specific key is requested, try to get it first
        if (modelId) {
            const modelKey = await this._extensionContext.secrets.get(`copilot-byok-${providerName}-${modelId}-api-key`);
            if (modelKey) {
                return modelKey;
            }
        }
        // Fall back to provider key if no model-specific key or it was requested directly
        const providerKey = await this._extensionContext.secrets.get(`copilot-byok-${providerName}-api-key`);
        return providerKey;
    }
    async storeAPIKey(providerName, apiKey, authType, modelId) {
        // Store API keys based on the provider's auth type
        if (authType === 2 /* BYOKAuthType.None */) {
            // Don't store keys for None auth type providers
            return;
        }
        else if (authType === 0 /* BYOKAuthType.GlobalApiKey */) {
            // For GlobalApiKey providers, only store at provider level
            await this._extensionContext.secrets.store(`copilot-byok-${providerName}-api-key`, apiKey);
        }
        else if (authType === 1 /* BYOKAuthType.PerModelDeployment */ && modelId) {
            // For PerModelDeployment providers, store per model
            await this._extensionContext.secrets.store(`copilot-byok-${providerName}-${modelId}-api-key`, apiKey);
        }
    }
    async deleteAPIKey(providerName, authType, modelId) {
        // Delete API keys based on the provider's auth type
        if (authType === 2 /* BYOKAuthType.None */) {
            // Nothing to delete for None auth type providers
            return;
        }
        else if (authType === 0 /* BYOKAuthType.GlobalApiKey */) {
            // For GlobalApiKey providers, delete at provider level
            await this._extensionContext.secrets.delete(`copilot-byok-${providerName}-api-key`);
        }
        else if (authType === 1 /* BYOKAuthType.PerModelDeployment */ && modelId) {
            // For PerModelDeployment providers, delete per model
            await this._extensionContext.secrets.delete(`copilot-byok-${providerName}-${modelId}-api-key`);
        }
    }
    async getStoredModelConfigs(providerName) {
        return this._extensionContext.globalState.get(`copilot-byok-${providerName}-models-config`, {});
    }
    async saveModelConfig(modelId, providerName, config, authType) {
        // Save model configuration data
        const configToSave = {
            isCustomModel: config.isCustomModel,
            deploymentUrl: config.deploymentUrl,
            isRegistered: true,
            modelCapabilities: config.modelCapabilities
        };
        const existingConfigs = await this.getStoredModelConfigs(providerName);
        existingConfigs[modelId] = configToSave;
        await this._extensionContext.globalState.update(`copilot-byok-${providerName}-models-config`, existingConfigs);
        await this.storeAPIKey(providerName, config.apiKey, authType, modelId);
    }
    async removeModelConfig(modelId, providerName, isDeletingCustomModel) {
        const existingConfigs = await this.getStoredModelConfigs(providerName);
        const existingConfig = existingConfigs[modelId];
        const isCustomModel = existingConfig?.isCustomModel || false;
        if (existingConfig && (isDeletingCustomModel || !isCustomModel)) {
            delete existingConfigs[modelId];
            await this._extensionContext.globalState.update(`copilot-byok-${providerName}-models-config`, existingConfigs);
            // Remove API key from secrets
            await this._extensionContext.secrets.delete(`copilot-byok-${providerName}-${modelId}-api-key`);
        }
        else {
            existingConfig.isRegistered = false;
            await this._extensionContext.globalState.update(`copilot-byok-${providerName}-models-config`, existingConfigs);
        }
    }
}
exports.BYOKStorageService = BYOKStorageService;
//# sourceMappingURL=byokStorageService.js.map