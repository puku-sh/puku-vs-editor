/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from '../../api/common/pukuRequestTypes';
import { TokenizerType } from '../../../util/common/tokenizer';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { CHAT_MODEL } from '../../configuration/common/configurationService';
import { IChatModelInformation } from '../common/endpointProvider';
import { ChatEndpoint } from './chatEndpoint';

export function createProxyXtabEndpoint(
	instaService: IInstantiationService,
	overriddenModelName: string | undefined,
) {
	const defaultInfo: IChatModelInformation = {
		id: overriddenModelName ?? 'puku-nes-codestral',
		urlOrRequestMetadata: { type: RequestType.ProxyChatCompletions },
		name: 'puku-nes',
		model_picker_enabled: false,
		is_chat_default: false,
		is_chat_fallback: false,
		version: '1.0',
		capabilities: {
			type: 'chat',
			family: 'puku-nes',
			tokenizer: TokenizerType.O200K,
			limits: {
				max_prompt_tokens: 12285,
				max_output_tokens: 4096,
			},
			supports: {
				streaming: true,
				parallel_tool_calls: false,
				tool_calls: false,
				vision: false,
				prediction: true,
			}
		}
	};
	return instaService.createInstance(ChatEndpoint, defaultInfo);
}
