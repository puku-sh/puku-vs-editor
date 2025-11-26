/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku AI Endpoint - Handles tool calling properly for Puku AI models
 *--------------------------------------------------------------------------------------------*/
import type { CancellationToken } from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { IChatMLFetcher } from '../../../platform/chat/common/chatMLFetcher';
import { ChatFetchResponseType, ChatResponse } from '../../../platform/chat/common/commonTypes';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ICAPIClientService } from '../../../platform/endpoint/common/capiClient';
import { IDomainService } from '../../../platform/endpoint/common/domainService';
import { IChatModelInformation } from '../../../platform/endpoint/common/endpointProvider';
import { ChatEndpoint } from '../../../platform/endpoint/node/chatEndpoint';
import { ILogService } from '../../../platform/log/common/logService';
import { isOpenAiFunctionTool } from '../../../platform/networking/common/fetch';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { createCapiRequestBody, IChatEndpoint, ICreateEndpointBodyOptions, IEndpointBody, IMakeChatRequestOptions } from '../../../platform/networking/common/networking';
import { RawMessageConversionCallback } from '../../../platform/networking/common/openai';
import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry';
import { ITokenizerProvider } from '../../../platform/tokenizer/node/tokenizer';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';

function hydratePukuAIErrorMessages(response: ChatResponse): ChatResponse {
	if (response.type === ChatFetchResponseType.Failed && response.streamError) {
		return {
			type: response.type,
			requestId: response.requestId,
			serverRequestId: response.serverRequestId,
			reason: JSON.stringify(response.streamError),
		};
	} else if (response.type === ChatFetchResponseType.RateLimited) {
		return {
			type: response.type,
			requestId: response.requestId,
			serverRequestId: response.serverRequestId,
			reason: response.capiError ? 'Rate limit exceeded\n\n' + JSON.stringify(response.capiError) : 'Rate limit exceeded',
			rateLimitKey: '',
			retryAfter: undefined,
			capiError: response.capiError
		};
	}
	return response;
}

/**
 * Puku AI Endpoint - A dedicated endpoint for Puku AI models that properly handles tool calling.
 * This endpoint does NOT inherit tool deletion logic from the parent class.
 */
export class PukuAIEndpoint extends ChatEndpoint {
	constructor(
		_modelMetadata: IChatModelInformation,
		protected readonly _apiKey: string,
		protected readonly _modelUrl: string,
		@IFetcherService fetcherService: IFetcherService,
		@IDomainService domainService: IDomainService,
		@ICAPIClientService capiClientService: ICAPIClientService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IAuthenticationService authService: IAuthenticationService,
		@IChatMLFetcher chatMLFetcher: IChatMLFetcher,
		@ITokenizerProvider tokenizerProvider: ITokenizerProvider,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExperimentationService expService: IExperimentationService,
		@ILogService protected logService: ILogService
	) {
		super(
			_modelMetadata,
			domainService,
			capiClientService,
			fetcherService,
			telemetryService,
			authService,
			chatMLFetcher,
			tokenizerProvider,
			instantiationService,
			configurationService,
			expService,
			logService
		);
	}

	override createRequestBody(options: ICreateEndpointBodyOptions): IEndpointBody {
		const callback: RawMessageConversionCallback = (out, data) => {
			if (data && data.id) {
				out.cot_id = data.id;
				out.cot_summary = Array.isArray(data.text) ? data.text.join('') : data.text;
			}
		};
		const body = createCapiRequestBody(options, this.model, callback);
		return body;
	}

	override interceptBody(body: IEndpointBody | undefined): void {
		// Puku AI: Do NOT call super.interceptBody() as it deletes tools based on supportsToolCalls
		// which is not set correctly for Puku AI models. Handle body interception here instead.

		// Handle streaming support
		if (body && !this.modelMetadata.capabilities.supports.streaming) {
			body.stream = false;
		}

		// Remove empty tools array
		if (body?.tools?.length === 0) {
			delete body.tools;
		}

		// Ensure tool parameters are properly formatted for OpenAI API
		if (body?.tools) {
			body.tools = body.tools.map(tool => {
				if (isOpenAiFunctionTool(tool) && tool.function.parameters === undefined) {
					tool.function.parameters = { type: "object", properties: {} };
				}
				return tool;
			});
		}

		if (body) {
			// Handle thinking models
			if (this.modelMetadata.capabilities.supports.thinking) {
				delete body.temperature;
				body['max_completion_tokens'] = body.max_tokens;
				delete body.max_tokens;
			}
			// Remove max_tokens - defaults to maximum for Puku AI
			delete body.max_tokens;
			// Add stream options for usage tracking
			if (body.stream) {
				body['stream_options'] = { 'include_usage': true };
			}
		}
	}

	override get urlOrRequestMetadata(): string {
		return this._modelUrl;
	}

	public override getExtraHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json"
		};
		console.log(`[PukuAIEndpoint] getExtraHeaders - apiKey: ${this._apiKey ? 'EXISTS (length: ' + this._apiKey.length + ')' : 'EMPTY/UNDEFINED'}`);
		if (this._apiKey) {
			console.log(`[PukuAIEndpoint] Adding Authorization header with Bearer token`);
			headers['Authorization'] = `Bearer ${this._apiKey}`;
		} else {
			console.log(`[PukuAIEndpoint] No Authorization header - anonymous access`);
		}
		console.log(`[PukuAIEndpoint] Headers:`, JSON.stringify(headers, null, 2));
		return headers;
	}

	override async acceptChatPolicy(): Promise<boolean> {
		return true;
	}

	override cloneWithTokenOverride(modelMaxPromptTokens: number): IChatEndpoint {
		const newModelInfo = { ...this.modelMetadata, maxInputTokens: modelMaxPromptTokens };
		return this.instantiationService.createInstance(PukuAIEndpoint, newModelInfo, this._apiKey, this._modelUrl);
	}

	public override async makeChatRequest2(options: IMakeChatRequestOptions, token: CancellationToken): Promise<ChatResponse> {
		const modifiedOptions: IMakeChatRequestOptions = { ...options, ignoreStatefulMarker: false };
		let response = await super.makeChatRequest2(modifiedOptions, token);
		if (response.type === ChatFetchResponseType.InvalidStatefulMarker) {
			response = await this._makeChatRequest2({ ...options, ignoreStatefulMarker: true }, token);
		}
		return hydratePukuAIErrorMessages(response);
	}
}
