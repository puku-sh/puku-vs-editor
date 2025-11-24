/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku AI Language Model Provider
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken, LanguageModelChatInformation, LanguageModelChatMessage, LanguageModelChatMessage2, LanguageModelResponsePart2, Progress, ProvideLanguageModelChatResponseOptions } from 'vscode';
import { IChatModelInformation, ModelSupportedEndpoint } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { TokenizerType } from '../../../util/common/tokenizer';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { CopilotLanguageModelWrapper } from '../../conversation/vscode-node/languageModelAccess';
import { BYOKModelProvider } from '../../byok/common/byokProvider';
import { PukuAIEndpoint } from '../node/pukuaiEndpoint';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';

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

interface PukuAIKnownModel {
	name: string;
	maxInputTokens: number;
	maxOutputTokens: number;
	toolCalling: boolean;
	vision: boolean;
}

/**
 * Puku AI Language Model Provider - Provides GLM models through the Puku AI proxy
 */
export class PukuAILanguageModelProvider implements BYOKModelProvider<LanguageModelChatInformation> {
	public static readonly providerName = 'Puku AI';
	public readonly authType = 2; // BYOKAuthType.None

	private readonly _lmWrapper: CopilotLanguageModelWrapper;
	private _modelCache = new Map<string, IChatModelInformation>();
	private _knownModels = new Map<string, PukuAIKnownModel>();

	constructor(
		private readonly _pukuBaseUrl: string,
		@IFetcherService protected readonly _fetcherService: IFetcherService,
		@ILogService protected readonly _logService: ILogService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IPukuAuthService private readonly _pukuAuthService: IPukuAuthService,
	) {
		this._lmWrapper = this._instantiationService.createInstance(CopilotLanguageModelWrapper);
		console.log(`Puku AI Provider: Initialized with endpoint ${_pukuBaseUrl}`);
	}

	async provideLanguageModelChatInformation(options: { silent: boolean }, token: CancellationToken): Promise<LanguageModelChatInformation[]> {
		this._logService.info(`Puku AI: provideLanguageModelChatInformation called, silent=${options.silent}`);
		console.log(`Puku AI: provideLanguageModelChatInformation called, silent=${options.silent}`);

		try {
			const allModels = await this._getAllModels();
			this._logService.info(`Puku AI: getAllModels returned ${allModels.size} models`);
			console.log(`Puku AI: getAllModels returned ${allModels.size} models:`, Array.from(allModels.keys()));

			const apiInfo = this._modelsToAPIInfo(allModels);
			this._logService.info(`Puku AI: Returning ${apiInfo.length} models to chat`);
			console.log(`Puku AI: Returning ${apiInfo.length} models to chat:`, apiInfo);
			return apiInfo;
		} catch (e) {
			this._logService.error(e, `Error fetching available Puku AI models`);
			console.error(`Puku AI: Error in provideLanguageModelChatInformation:`, e);
			return [];
		}
	}

	async provideLanguageModelChatResponse(
		model: LanguageModelChatInformation,
		messages: Array<LanguageModelChatMessage | LanguageModelChatMessage2>,
		options: ProvideLanguageModelChatResponseOptions,
		progress: Progress<LanguageModelResponsePart2>,
		token: CancellationToken
	): Promise<void> {
		this._logService.info(`[PukuAIProvider] provideLanguageModelChatResponse called for model ${model.id}`);
		console.log(`[PukuAIProvider] provideLanguageModelChatResponse called for model ${model.id}`);
		console.log(`[PukuAIProvider] Message count: ${messages.length}`);
		console.log(`[PukuAIProvider] Tools count: ${options.tools?.length ?? 0}`);
		if (options.tools && options.tools.length > 0) {
			console.log(`[PukuAIProvider] Tool names: ${options.tools.map(t => t.name).join(', ')}`);
		}

		try {
			const pukuAIEndpoint = await this._getEndpoint(model);
			this._logService.info(`[PukuAIProvider] Created endpoint for ${model.id}: ${pukuAIEndpoint.constructor.name}`);
			console.log(`[PukuAIProvider] Created endpoint for ${model.id}: ${pukuAIEndpoint.constructor.name}, URL: ${pukuAIEndpoint.urlOrRequestMetadata}`);
			return this._lmWrapper.provideLanguageModelResponse(pukuAIEndpoint, messages, options, options.requestInitiator, progress, token);
		} catch (e) {
			this._logService.error(`[PukuAIProvider] Error in provideLanguageModelChatResponse: ${e}`);
			console.error(`[PukuAIProvider] Error in provideLanguageModelChatResponse:`, e);
			throw e;
		}
	}

	async provideTokenCount(model: LanguageModelChatInformation, text: string | LanguageModelChatMessage | LanguageModelChatMessage2, token: CancellationToken): Promise<number> {
		const pukuAIEndpoint = await this._getEndpoint(model);
		return this._lmWrapper.provideTokenCount(pukuAIEndpoint, text);
	}

	async updateAPIKey(): Promise<void> {
		// Puku AI doesn't require API keys
	}

	async updateAPIKeyViaCmd(envVarName: string, action: 'update' | 'remove' = 'update', modelId?: string): Promise<void> {
		// Puku AI doesn't require API keys
	}

	private async _getEndpoint(model: LanguageModelChatInformation): Promise<PukuAIEndpoint> {
		this._logService.info(`[PukuAIProvider] _getEndpoint called for model ${model.id}`);
		const modelInfo = await this._getModelInfo(model.id);
		const url = modelInfo.supported_endpoints?.includes(ModelSupportedEndpoint.Responses) ?
			`${this._pukuBaseUrl}/v1/responses` :
			`${this._pukuBaseUrl}/v1/chat/completions`;

		// Puku AI: Get real Puku authentication token
		this._logService.info('[PukuAIProvider] Calling _pukuAuthService.getToken()...');
		const pukuToken = await this._pukuAuthService.getToken();
		this._logService.info(`[PukuAIProvider] Got token result: ${pukuToken ? 'YES (length: ' + pukuToken.token.length + ')' : 'NO'}`);

		if (!pukuToken) {
			this._logService.warn('[PukuAIProvider] No Puku token available - triggering sign-in');
			// Throw error to match GitHub Copilot pattern - this will trigger sign-in flow
			const error = new Error('PukuLoginRequired');
			error.name = 'PukuLoginRequired';
			throw error;
		}

		this._logService.info(`[PukuAIProvider] Creating endpoint with token for URL: ${url}`);
		return this._instantiationService.createInstance(PukuAIEndpoint, modelInfo, pukuToken.token, url);
	}

	private async _getAllModels(): Promise<Map<string, PukuAIKnownModel>> {
		this._logService.info(`Puku AI: getAllModels called for endpoint ${this._pukuBaseUrl}`);
		console.log(`Puku AI: getAllModels called for endpoint ${this._pukuBaseUrl}`);

		try {
			const response = await this._fetcherService.fetch(`${this._pukuBaseUrl}/api/tags`, { method: 'GET' });
			const data = await response.json();
			const models = data.models;
			this._logService.info(`Puku AI: Fetched ${models.length} models from ${this._pukuBaseUrl}/api/tags`);
			console.log(`Puku AI: Fetched ${models.length} models`);

			const knownModels = new Map<string, PukuAIKnownModel>();
			for (const model of models) {
				this._logService.info(`Puku AI: Processing model ${model.model}`);
				const modelInfo = await this._getModelInfo(model.model);
				this._modelCache.set(model.model, modelInfo);

				const knownModel: PukuAIKnownModel = {
					name: modelInfo.name,
					maxInputTokens: modelInfo.capabilities.limits?.max_prompt_tokens ?? 4096,
					maxOutputTokens: modelInfo.capabilities.limits?.max_output_tokens ?? 4096,
					toolCalling: !!modelInfo.capabilities.supports.tool_calls,
					vision: !!modelInfo.capabilities.supports.vision
				};
				knownModels.set(model.model, knownModel);
				this._knownModels.set(model.model, knownModel);

				this._logService.info(`Puku AI: Model ${model.model} registered: toolCalling=${knownModel.toolCalling}, vision=${knownModel.vision}`);
			}

			this._logService.info(`Puku AI: Returning ${knownModels.size} models`);
			console.log(`Puku AI: Returning ${knownModels.size} models:`, Array.from(knownModels.keys()));
			return knownModels;
		} catch (e) {
			this._logService.error(`Puku AI: Failed to fetch models: ${e}`);
			console.error(`Puku AI: Failed to fetch models: ${e}`);
			throw new Error('Failed to fetch models from Puku AI. Please check your connection to api.puku.sh.');
		}
	}

	private async _getModelInfo(modelId: string): Promise<IChatModelInformation> {
		if (this._modelCache.has(modelId)) {
			return this._modelCache.get(modelId)!;
		}

		const modelApiInfo = await this._getPukuAIModelInformation(modelId);
		console.log(`Puku AI: Model info for ${modelId}:`, JSON.stringify(modelApiInfo, null, 2));

		// Handle cases where model_info might be undefined or missing fields
		let contextWindow = 128000;
		let modelName = modelId;

		if (modelApiInfo.model_info) {
			const architecture = modelApiInfo.model_info['general.architecture'] || 'puku';
			contextWindow = modelApiInfo.model_info[`${architecture}.context_length`] ?? 128000;
			modelName = modelApiInfo.model_info['general.basename'] || modelId;
		}

		const outputTokens = 8192;
		const toolCalling = modelApiInfo.capabilities?.supports?.tools ?? false;
		const vision = modelApiInfo.capabilities?.supports?.vision ?? false;
		console.log(`Puku AI: ${modelId} capabilities:`, modelApiInfo.capabilities);
		console.log(`Puku AI: ${modelId} parsed - toolCalling: ${toolCalling}, vision: ${vision}`);

		const modelInfo: IChatModelInformation = {
			id: modelId,
			name: modelName,
			version: '1.0.0',
			capabilities: {
				type: 'chat',
				family: modelId,
				supports: {
					streaming: true,
					tool_calls: toolCalling,
					vision: vision,
					thinking: false
				},
				tokenizer: TokenizerType.O200K,
				limits: {
					max_context_window_tokens: contextWindow,
					max_prompt_tokens: contextWindow - outputTokens,
					max_output_tokens: outputTokens
				}
			},
			is_chat_default: false,
			is_chat_fallback: false,
			model_picker_enabled: true
		};

		this._modelCache.set(modelId, modelInfo);
		return modelInfo;
	}

	private async _getPukuAIModelInformation(modelId: string): Promise<PukuAIModelInfoAPIResponse> {
		const response = await this._fetcherService.fetch(`${this._pukuBaseUrl}/api/show`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name: modelId })
		});
		return response.json() as unknown as PukuAIModelInfoAPIResponse;
	}

	private _modelsToAPIInfo(models: Map<string, PukuAIKnownModel>): LanguageModelChatInformation[] {
		const result: LanguageModelChatInformation[] = [];
		let index = 0;

		for (const [id, capabilities] of models) {
			const modelInfo = {
				id,
				name: capabilities.name,
				version: '1.0.0',
				maxOutputTokens: capabilities.maxOutputTokens,
				maxInputTokens: capabilities.maxInputTokens,
				detail: PukuAILanguageModelProvider.providerName,
				family: PukuAILanguageModelProvider.providerName,
				tooltip: `${capabilities.name} is contributed via the ${PukuAILanguageModelProvider.providerName} provider.`,
				isUserSelectable: true,
				isDefault: index === 0,
				category: { label: 'Puku AI', order: 0 },
				capabilities: {
					toolCalling: capabilities.toolCalling,
					imageInput: capabilities.vision
				},
			};
			console.log(`Puku AI: Model ${id} - toolCalling: ${capabilities.toolCalling}, vision: ${capabilities.vision}`);
			result.push(modelInfo);
			index++;
		}

		return result;
	}
}
