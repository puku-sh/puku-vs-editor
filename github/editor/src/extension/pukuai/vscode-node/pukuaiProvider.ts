/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *--------------------------------------------------------------------------------------------*/
import { IChatModelInformation } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKAuthType, BYOKKnownModels, BYOKModelCapabilities } from '../../byok/common/byokProvider';
import { BaseOpenAICompatibleLMProvider } from '../../byok/vscode-node/baseOpenAICompatibleProvider';
import { IBYOKStorageService } from '../../byok/vscode-node/byokStorageService';

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

export class PukuAILanguageModelProvider extends BaseOpenAICompatibleLMProvider {
	public static readonly providerName = 'Puku AI';
	private _modelCache = new Map<string, IChatModelInformation>();

	constructor(
		private readonly _pukuBaseUrl: string,
		byokStorageService: IBYOKStorageService,
		@IFetcherService _fetcherService: IFetcherService,
		@ILogService _logService: ILogService,
		@IInstantiationService _instantiationService: IInstantiationService,
	) {
		super(
			BYOKAuthType.None,
			PukuAILanguageModelProvider.providerName,
			`${_pukuBaseUrl}/v1`,
			undefined,
			byokStorageService,
			_fetcherService,
			_logService,
			_instantiationService,
		);
		console.log(`Puku AI Provider: Initialized with endpoint ${_pukuBaseUrl}`);
	}

	protected override async getAllModels(): Promise<BYOKKnownModels> {
		this._logService.info(`Puku AI: getAllModels called for endpoint ${this._pukuBaseUrl}`);
		console.log(`Puku AI: getAllModels called for endpoint ${this._pukuBaseUrl}`);
		try {
			const response = await this._fetcherService.fetch(`${this._pukuBaseUrl}/api/tags`, { method: 'GET' });
			const models = (await response.json()).models;
			this._logService.info(`Puku AI: Fetched ${models.length} models from ${this._pukuBaseUrl}/api/tags`);
			console.log(`Puku AI: Fetched ${models.length} models`);

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
			console.log(`Puku AI: Returning ${Object.keys(knownModels).length} models:`, Object.keys(knownModels));
			return knownModels;
		} catch (e) {
			this._logService.error(`Puku AI: Failed to fetch models: ${e}`);
			console.error(`Puku AI: Failed to fetch models: ${e}`);
			throw new Error('Failed to fetch models from Puku AI proxy. Please ensure the proxy is running.');
		}
	}

	private async _getPukuAIModelInformation(modelId: string): Promise<PukuAIModelInfoAPIResponse> {
		const response = await this._fetcherService.fetch(`${this._pukuBaseUrl}/api/show`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ model: modelId })
		});
		return response.json() as unknown as PukuAIModelInfoAPIResponse;
	}

	override async getModelInfo(modelId: string, apiKey: string, modelCapabilities?: BYOKModelCapabilities): Promise<IChatModelInformation> {
		if (this._modelCache.has(modelId)) {
			return this._modelCache.get(modelId)!;
		}
		if (!modelCapabilities) {
			const modelInfo = await this._getPukuAIModelInformation(modelId);

			// Handle cases where model_info might be undefined or missing fields
			let contextWindow = 128000;
			let modelName = modelId;

			if (modelInfo.model_info) {
				const architecture = modelInfo.model_info['general.architecture'] || 'glm';
				contextWindow = modelInfo.model_info[`${architecture}.context_length`] ?? 128000;
				modelName = modelInfo.model_info['general.basename'] || modelId;
			}

			const outputTokens = 8192;
			modelCapabilities = {
				name: modelName,
				maxOutputTokens: outputTokens,
				maxInputTokens: contextWindow - outputTokens,
				vision: modelInfo.capabilities?.includes("vision") ?? false,
				toolCalling: modelInfo.capabilities?.includes("tools") ?? false
			};
		}
		return super.getModelInfo(modelId, apiKey, modelCapabilities);
	}
}
