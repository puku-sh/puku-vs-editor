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

export class PukuChatEndpoint extends ChatEndpoint {

	_serviceBrand: undefined;

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
		@ILogService logService: ILogService
	) {
		const modelId = configurationService.getConfig(ConfigKey.PukuAIModel) || 'GLM-4.6';
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
	}

	public override getExtraHeaders(): Record<string, string> {
		return {};
	}

	override get urlOrRequestMetadata() {
		const baseEndpoint = this._configurationService.getConfig(ConfigKey.PukuAIEndpoint);
		// Ensure the full chat completions URL is returned
		const endpoint = baseEndpoint.endsWith('/v1/chat/completions')
			? baseEndpoint
			: `${baseEndpoint}/v1/chat/completions`;
		return endpoint;
	}
}
