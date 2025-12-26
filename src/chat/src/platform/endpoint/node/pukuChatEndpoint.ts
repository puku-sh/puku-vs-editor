/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryService } from '../../../platform/telemetry/common/telemetry';
import { TokenizerType } from '../../../util/common/tokenizer';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IAuthenticationService } from '../../authentication/common/authentication';
import { IChatMLFetcher } from '../../chat/common/chatMLFetcher';
import { ConfigKey, IConfigurationService } from '../../configuration/common/configurationService';
import { ILogService } from '../../log/common/logService';
import { IFetcherService } from '../../networking/common/fetcherService';
import { IExperimentationService } from '../../telemetry/common/nullExperimentationService';
import { ITokenizerProvider } from '../../tokenizer/node/tokenizer';
import { ICAPIClientService } from '../common/capiClient';
import { IDomainService } from '../common/domainService';
import { IChatModelInformation } from '../common/endpointProvider';
import { ChatEndpoint } from './chatEndpoint';
import { IPukuAuthService } from '../../../extension/pukuIndexing/common/pukuAuth';
import { ISemanticResultsService } from '../common/semanticResultsService';
import { ICreateEndpointBodyOptions, IEndpointBody } from '../../networking/common/networking';

export class PukuChatEndpoint extends ChatEndpoint {

	_serviceBrand: undefined;
	private _pukuToken: string | undefined;

	constructor(
		@IDomainService domainService: IDomainService,
		@ICAPIClientService capiClientService: ICAPIClientService,
		@IFetcherService fetcherService: IFetcherService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IAuthenticationService authService: IAuthenticationService,
		@IChatMLFetcher chatMLFetcher: IChatMLFetcher,
		@ITokenizerProvider tokenizerProvider: ITokenizerProvider,
		@IInstantiationService instantiationService: IInstantiationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExperimentationService experimentService: IExperimentationService,
		@ILogService logService: ILogService,
		@IPukuAuthService private readonly _pukuAuthService: IPukuAuthService,
		@ISemanticResultsService private readonly _semanticResultsService: ISemanticResultsService
	) {
		const modelId = configurationService.getConfig(ConfigKey.PukuAIModel) || 'puku-ai';
		console.log(`[PukuChatEndpoint] Using model ID: ${modelId}`);
		const modelInfo: IChatModelInformation = {
			id: modelId,
			name: 'Puku AI',
			version: '1.0.0',
			model_picker_enabled: true,
			is_chat_default: true,
			is_chat_fallback: false,
			capabilities: {
				type: 'chat',
				family: 'puku',
				tokenizer: TokenizerType.O200K,
				supports: {
					streaming: true,
					tool_calls: true,  // GLM-4.6 supports tool calling
					vision: true,      // GLM-4.6 supports vision
				},
				limits: {
					// GLM-4.6 has 128K context window
					max_prompt_tokens: 100000,
					max_output_tokens: 16000,
					max_context_window_tokens: 128000,
				}
			},
			requestHeaders: {}
		};

		super(
			modelInfo,
			domainService,
			capiClientService,
			fetcherService,
			telemetryService,
			authService,
			chatMLFetcher,
			tokenizerProvider,
			instantiationService,
			configurationService,
			experimentService,
			logService
		);

		// Fetch Puku auth token asynchronously
		this._initializeAuth();
	}

	private async _initializeAuth(): Promise<void> {
		try {
			const pukuAuth = await this._pukuAuthService.getToken();
			this._pukuToken = pukuAuth?.token;
			console.log(`[PukuChatEndpoint] Auth initialized - token: ${this._pukuToken ? 'EXISTS (length: ' + this._pukuToken.length + ')' : 'NONE'}`);
		} catch (error) {
			console.error(`[PukuChatEndpoint] Failed to get auth token:`, error);
		}
	}

	public override getExtraHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json"
		};

		if (this._pukuToken) {
			console.log(`[PukuChatEndpoint] Adding Authorization header`);
			headers['Authorization'] = `Bearer ${this._pukuToken}`;
		} else {
			console.log(`[PukuChatEndpoint] No auth token available - request may fail`);
		}

		return headers;
	}

	override get urlOrRequestMetadata() {
		const baseEndpoint = this._configurationService.getConfig(ConfigKey.PukuAIEndpoint);

		// Check if we have semantic results to send
		const hasSemanticResults = this._semanticResultsService.hasResults();

		// Use v2 API only if we have semantic results for reranking
		let url;
		if (hasSemanticResults) {
			// Use v2 for reranking support
			if (baseEndpoint.endsWith('/v2/chat/completions')) {
				url = baseEndpoint;
			} else if (baseEndpoint.endsWith('/v2')) {
				url = `${baseEndpoint}/chat/completions`;
			} else if (baseEndpoint.endsWith('/v1/chat/completions')) {
				url = baseEndpoint.replace('/v1/', '/v2/');
			} else if (baseEndpoint.endsWith('/v1')) {
				url = baseEndpoint.replace('/v1', '/v2') + '/chat/completions';
			} else {
				url = `${baseEndpoint}/v2/chat/completions`;
			}
			console.log(`[PukuChatEndpoint] Using v2 API for reranking: ${url}`);
		} else {
			// Use v1 for standard requests
			if (baseEndpoint.endsWith('/v1/chat/completions')) {
				url = baseEndpoint;
			} else if (baseEndpoint.endsWith('/v1')) {
				url = `${baseEndpoint}/chat/completions`;
			} else {
				url = `${baseEndpoint}/v1/chat/completions`;
			}
			console.log(`[PukuChatEndpoint] Using v1 API: ${url}`);
		}

		return url;
	}

	override createRequestBody(options: ICreateEndpointBodyOptions): IEndpointBody {
		// Call parent to create base request body
		const body = super.createRequestBody(options);

		// Add semantic search results if available
		const semanticResults = this._semanticResultsService.consumeResults();
		if (semanticResults && semanticResults.length > 0) {
			console.log(`[PukuChatEndpoint] Adding ${semanticResults.length} semantic results to request`);
			(body as any).semantic_results = semanticResults;
			(body as any).rerank = true;
		}

		return body;
	}
}
