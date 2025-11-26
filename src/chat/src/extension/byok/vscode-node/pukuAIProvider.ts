/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageModelChatInformation } from 'vscode';
import { IChatModelInformation, ModelSupportedEndpoint } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKAuthType, BYOKKnownModels, BYOKModelCapabilities } from '../common/byokProvider';
import { PukuAIEndpoint } from '../../pukuai/node/pukuaiEndpoint';
import { BaseOpenAICompatibleLMProvider } from './baseOpenAICompatibleProvider';
import { IBYOKStorageService } from './byokStorageService';

interface PukuAIModelInfoAPIResponse {
	template: string;
	capabilities: string[];
	details: { family: string };
	model_info: {
		"general.basename": string;
		"general.architecture": string;
		[other: string]: any;
	};
}

interface PukuAIVersionResponse {
	version: string;
}

// Minimum supported version
const MINIMUM_PUKUAI_VERSION = '0.6.4';

export class PukuAILMProvider extends BaseOpenAICompatibleLMProvider {
	public static readonly providerName = 'Puku AI';
	private _modelCache = new Map<string, IChatModelInformation>();

	constructor(
		private readonly _pukuAIBaseUrl: string,
		byokStorageService: IBYOKStorageService,
		@IFetcherService _fetcherService: IFetcherService,
		@ILogService _logService: ILogService,
		@IInstantiationService _instantiationService: IInstantiationService,
	) {
		super(
			BYOKAuthType.None,
			PukuAILMProvider.providerName,
			`${_pukuAIBaseUrl}/v1`,
			undefined,
			byokStorageService,
			_fetcherService,
			_logService,
			_instantiationService,
		);
	}

	protected override async getAllModels(): Promise<BYOKKnownModels> {
		this._logService.info(`Puku AI: getAllModels called for endpoint ${this._pukuAIBaseUrl}`);
		try {
			// Check server version before proceeding
			await this._checkPukuAIVersion();

			const response = await this._fetcherService.fetch(`${this._pukuAIBaseUrl}/api/tags`, { method: 'GET' });
			const models = (await response.json()).models;
			this._logService.info(`Puku AI: Fetched ${models.length} models from ${this._pukuAIBaseUrl}/api/tags`);

			const knownModels: BYOKKnownModels = {};
			for (const model of models) {
				this._logService.info(`Puku AI: Processing model ${model.model}`);
				const modelInfo = await this.getModelInfo(model.model, '', undefined);
				this._modelCache.set(model.model, modelInfo);
				knownModels[model.model] = {
					maxInputTokens: modelInfo.capabilities.limits?.max_prompt_tokens ?? 4096,
					maxOutputTokens: modelInfo.capabilities.limits?.max_output_tokens ?? 4096,
					name: modelInfo.name,
					toolCalling: !!modelInfo.capabilities.supports.tool_calls,
					vision: !!modelInfo.capabilities.supports.vision
				};
				this._logService.info(`Puku AI: Model ${model.model} registered: toolCalling=${knownModels[model.model].toolCalling}, vision=${knownModels[model.model].vision}`);
			}
			this._logService.info(`Puku AI: Returning ${Object.keys(knownModels).length} models`);
			return knownModels;
		} catch (e) {
			// Check if this is our version check error and preserve it
			if (e instanceof Error && e.message.includes('Puku AI server version')) {
				this._logService.error(`Puku AI: Version check failed: ${e.message}`);
				throw e;
			}
			this._logService.error(`Puku AI: Failed to fetch models: ${e}`);
			throw new Error('Failed to fetch models from Puku AI. Please ensure Puku AI proxy is running. Configure the endpoint in settings if needed.');
		}
	}


	/**
	 * Compare version strings to check if current version meets minimum requirements
	 * @param currentVersion Current server version
	 * @returns true if version is supported, false otherwise
	 */
	private _isVersionSupported(currentVersion: string): boolean {
		// Simple version comparison: split by dots and compare numerically
		const currentParts = currentVersion.split('.').map(n => parseInt(n, 10));
		const minimumParts = MINIMUM_PUKUAI_VERSION.split('.').map(n => parseInt(n, 10));

		for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
			const current = currentParts[i] || 0;
			const minimum = minimumParts[i] || 0;

			if (current > minimum) {
				return true;
			}
			if (current < minimum) {
				return false;
			}
		}

		return true; // versions are equal
	}

	private async _getPukuAIModelInformation(modelId: string): Promise<PukuAIModelInfoAPIResponse> {
		const response = await this._fetcherService.fetch(`${this._pukuAIBaseUrl}/api/show`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name: modelId })
		});
		return response.json() as unknown as PukuAIModelInfoAPIResponse;
	}

	override async getModelInfo(modelId: string, apiKey: string, modelCapabilities?: BYOKModelCapabilities): Promise<IChatModelInformation> {
		if (this._modelCache.has(modelId)) {
			return this._modelCache.get(modelId)!;
		}
		if (!modelCapabilities) {
			const modelInfo = await this._getPukuAIModelInformation(modelId);
			const contextWindow = modelInfo.model_info[`${modelInfo.model_info['general.architecture']}.context_length`] ?? 128000;
			const outputTokens = contextWindow < 4096 ? Math.floor(contextWindow / 2) : 8192;
			modelCapabilities = {
				name: modelInfo.model_info['general.basename'] || modelId,
				maxOutputTokens: outputTokens,
				maxInputTokens: contextWindow - outputTokens,
				vision: modelInfo.capabilities.includes("vision"),
				toolCalling: modelInfo.capabilities.includes("tools")
			};
		}
		return super.getModelInfo(modelId, apiKey, modelCapabilities);
	}

	/**
	 * Override to use PukuAIEndpoint which properly preserves tools
	 */
	protected async getEndpointImpl(model: LanguageModelChatInformation): Promise<PukuAIEndpoint> {
		const modelInfo: IChatModelInformation = await this.getModelInfo(model.id, '');
		const url = modelInfo.supported_endpoints?.includes(ModelSupportedEndpoint.Responses) ?
			`${this._pukuAIBaseUrl}/v1/responses` :
			`${this._pukuAIBaseUrl}/v1/chat/completions`;
		return this._instantiationService.createInstance(PukuAIEndpoint, modelInfo, '', url);
	}

	/**
	 * Check if the connected Puku AI server version meets the minimum requirements
	 * @throws Error if version is below minimum or version check fails
	 */
	private async _checkPukuAIVersion(): Promise<void> {
		try {
			const response = await this._fetcherService.fetch(`${this._pukuAIBaseUrl}/api/version`, { method: 'GET' });
			const versionInfo = await response.json() as PukuAIVersionResponse;

			if (!this._isVersionSupported(versionInfo.version)) {
				throw new Error(
					`Puku AI server version ${versionInfo.version} is not supported. ` +
					`Please upgrade to version ${MINIMUM_PUKUAI_VERSION} or higher.`
				);
			}
		} catch (e) {
			if (e instanceof Error && e.message.includes('Puku AI server version')) {
				// Re-throw our custom version error
				throw e;
			}
			// If version endpoint fails
			throw new Error(
				`Unable to verify Puku AI server version. Please ensure you have Puku AI proxy version ${MINIMUM_PUKUAI_VERSION} or higher running.`
			);
		}
	}
}
