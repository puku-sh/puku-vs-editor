"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OpenAICompatibleTestEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleTestEndpoint = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const tokenizer_1 = require("../../../../util/common/tokenizer");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../../chat/common/chatMLFetcher");
const configurationService_1 = require("../../../configuration/common/configurationService");
const envService_1 = require("../../../env/common/envService");
const logService_1 = require("../../../log/common/logService");
const fetch_1 = require("../../../networking/common/fetch");
const fetcherService_1 = require("../../../networking/common/fetcherService");
const nullExperimentationService_1 = require("../../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const tokenizer_2 = require("../../../tokenizer/node/tokenizer");
const capiClient_1 = require("../../common/capiClient");
const domainService_1 = require("../../common/domainService");
const endpointProvider_1 = require("../../common/endpointProvider");
const chatEndpoint_1 = require("../../node/chatEndpoint");
let OpenAICompatibleTestEndpoint = OpenAICompatibleTestEndpoint_1 = class OpenAICompatibleTestEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(modelConfig, domainService, capiClientService, fetcherService, envService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService) {
        const modelInfo = {
            id: modelConfig.id,
            name: modelConfig.name,
            version: modelConfig.version,
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            capabilities: {
                type: 'chat',
                family: modelConfig.type === 'azureOpenai' ? 'azure' : 'openai',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                supports: {
                    parallel_tool_calls: modelConfig.capabilities.supports.parallel_tool_calls,
                    streaming: modelConfig.capabilities.supports.streaming,
                    tool_calls: modelConfig.capabilities.supports.tool_calls,
                    vision: modelConfig.capabilities.supports.vision,
                    prediction: modelConfig.capabilities.supports.prediction,
                    thinking: modelConfig.capabilities.supports.thinking ?? false
                },
                limits: {
                    max_prompt_tokens: modelConfig.capabilities.limits.max_prompt_tokens,
                    max_output_tokens: modelConfig.capabilities.limits.max_output_tokens,
                    max_context_window_tokens: modelConfig.capabilities.limits.max_context_window_tokens
                }
            },
            supported_endpoints: Array.isArray(modelConfig.supported_endpoints) && modelConfig.supported_endpoints.length > 0
                ? modelConfig.supported_endpoints
                : [endpointProvider_1.ModelSupportedEndpoint.ChatCompletions]
        };
        // configurationService.useResponsesApi should be set to true if ModelSupportedEndpoint.Responses is in modelConfig.supported_endpoints
        if (modelInfo.supported_endpoints?.includes(endpointProvider_1.ModelSupportedEndpoint.Responses)) {
            configurationService.setConfig(configurationService_1.ConfigKey.UseResponsesApi, true);
        }
        super(modelInfo, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService);
        this.modelConfig = modelConfig;
        this.instantiationService = instantiationService;
    }
    get urlOrRequestMetadata() {
        return this.modelConfig.version ? this.modelConfig.url + '?api-version=' + this.modelConfig.version : this.modelConfig.url;
    }
    getExtraHeaders() {
        const headers = {
            "Content-Type": "application/json"
        };
        if (this.modelConfig.auth.useBearerHeader || this.modelConfig.auth.useApiKeyHeader) {
            if (!this.modelConfig.auth.apiKeyEnvName) {
                throw new Error('API key environment variable name is not set in the model configuration');
            }
            const apiKey = process.env[this.modelConfig.auth.apiKeyEnvName];
            if (!apiKey) {
                throw new Error(`API key environment variable ${this.modelConfig.auth.apiKeyEnvName} is not set`);
            }
            if (this.modelConfig.auth.useBearerHeader) {
                headers["Authorization"] = `Bearer ${apiKey}`;
            }
            if (this.modelConfig.auth.useApiKeyHeader) {
                headers["api-key"] = apiKey;
            }
        }
        if (this.modelConfig.overrides.requestHeaders) {
            Object.entries(this.modelConfig.overrides.requestHeaders).forEach(([key, value]) => {
                headers[key] = value;
            });
        }
        return headers;
    }
    createRequestBody(options) {
        if (this.useResponsesApi) {
            // Handle Responses API: customize the body directly
            options.ignoreStatefulMarker = false;
            const body = super.createRequestBody(options);
            body.store = true;
            body.n = undefined;
            body.stream_options = undefined;
            if (!this.modelConfig.capabilities.supports.thinking) {
                body.reasoning = undefined;
            }
            return body;
        }
        const body = super.createRequestBody(options);
        return body;
    }
    interceptBody(body) {
        super.interceptBody(body);
        if (body?.tools?.length === 0) {
            delete body.tools;
        }
        if (body?.messages) {
            body.messages.forEach((message) => {
                if (message.copilot_cache_control) {
                    delete message.copilot_cache_control;
                }
            });
        }
        if (body) {
            if (this.modelConfig.overrides.snippy === null) {
                delete body.snippy;
            }
            else if (this.modelConfig.overrides.snippy) {
                body.snippy = { enabled: this.modelConfig.overrides.snippy };
            }
            if (this.modelConfig.overrides.intent === null) {
                delete body.intent;
            }
            else if (this.modelConfig.overrides.intent) {
                body.intent = this.modelConfig.overrides.intent;
            }
            if (this.modelConfig.overrides.temperature === null) {
                delete body.temperature;
            }
            else if (this.modelConfig.overrides.temperature) {
                body.temperature = this.modelConfig.overrides.temperature;
            }
            if (this.modelConfig.overrides.top_p === null) {
                delete body.top_p;
            }
            else if (this.modelConfig.overrides.top_p) {
                body.top_p = this.modelConfig.overrides.top_p;
            }
            if (this.modelConfig.overrides.max_tokens === null) {
                delete body.max_tokens;
            }
            else if (this.modelConfig.overrides.max_tokens) {
                body.max_tokens = this.modelConfig.overrides.max_tokens;
            }
        }
        if (body?.tools) {
            body.tools = body.tools.map(tool => {
                if ((0, fetch_1.isOpenAiFunctionTool)(tool) && tool.function.parameters === undefined) {
                    tool.function.parameters = { type: "object", properties: {} };
                }
                return tool;
            });
        }
        if (this.modelConfig.type === 'openai') {
            if (body) {
                if (!this.useResponsesApi) {
                    // we need to set this to unsure usage stats are logged
                    body['stream_options'] = { 'include_usage': true };
                }
                // OpenAI requires the model name to be set in the body
                body.model = this.modelConfig.name;
                // Handle messages reformatting if messages exist
                if (body.messages) {
                    const newMessages = body.messages.map((message) => {
                        if (message.role === prompt_tsx_1.OpenAI.ChatRole.System) {
                            return {
                                role: prompt_tsx_1.OpenAI.ChatRole.User,
                                content: message.content,
                            };
                        }
                        else {
                            return message;
                        }
                    });
                    body['messages'] = newMessages;
                }
            }
        }
        if (this.modelConfig.useDeveloperRole && body) {
            const newMessages = body.messages.map((message) => {
                if (message.role === prompt_tsx_1.OpenAI.ChatRole.System) {
                    return { role: 'developer', content: message.content };
                }
                return message;
            });
            Object.keys(body).forEach(key => delete body[key]);
            body.messages = newMessages;
        }
    }
    async acceptChatPolicy() {
        return true;
    }
    cloneWithTokenOverride(_modelMaxPromptTokens) {
        return this.instantiationService.createInstance(OpenAICompatibleTestEndpoint_1, this.modelConfig);
    }
    getCompletionsCallback() {
        return (out, data) => {
            if (data && data.id) {
                out.cot_id = data.id;
                out.cot_summary = Array.isArray(data.text) ? data.text.join('') : data.text;
            }
        };
    }
};
exports.OpenAICompatibleTestEndpoint = OpenAICompatibleTestEndpoint;
exports.OpenAICompatibleTestEndpoint = OpenAICompatibleTestEndpoint = OpenAICompatibleTestEndpoint_1 = __decorate([
    __param(1, domainService_1.IDomainService),
    __param(2, capiClient_1.ICAPIClientService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, envService_1.IEnvService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, authentication_1.IAuthenticationService),
    __param(7, chatMLFetcher_1.IChatMLFetcher),
    __param(8, tokenizer_2.ITokenizerProvider),
    __param(9, instantiation_1.IInstantiationService),
    __param(10, configurationService_1.IConfigurationService),
    __param(11, nullExperimentationService_1.IExperimentationService),
    __param(12, logService_1.ILogService)
], OpenAICompatibleTestEndpoint);
//# sourceMappingURL=openaiCompatibleEndpoint.js.map