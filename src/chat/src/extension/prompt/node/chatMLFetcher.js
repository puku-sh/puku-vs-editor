"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMLFetcherImpl = exports.AbstractChatMLFetcher = void 0;
exports.createTelemetryData = createTelemetryData;
exports.locationToIntent = locationToIntent;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const chatQuotaService_1 = require("../../../platform/chat/common/chatQuotaService");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const autoChatEndpoint_1 = require("../../../platform/endpoint/node/autoChatEndpoint");
const logService_1 = require("../../../platform/log/common/logService");
const fetch_1 = require("../../../platform/networking/common/fetch");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const networking_1 = require("../../../platform/networking/common/networking");
const openai_1 = require("../../../platform/networking/common/openai");
const chatStream_1 = require("../../../platform/networking/node/chatStream");
const stream_1 = require("../../../platform/networking/node/stream");
const fetch_2 = require("../../../platform/openai/node/fetch");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const telemetryData_1 = require("../../../platform/telemetry/common/telemetryData");
const anomalyDetection_1 = require("../../../util/common/anomalyDetection");
const crypto_1 = require("../../../util/common/crypto");
const errorsUtil = __importStar(require("../../../util/common/errors"));
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const openAIEndpoint_1 = require("../../byok/node/openAIEndpoint");
const constants_1 = require("../../common/constants");
const chatMLFetcherTelemetry_1 = require("./chatMLFetcherTelemetry");
const strings_1 = require("../../../util/vs/base/common/strings");
class AbstractChatMLFetcher {
    constructor(options) {
        this.options = options;
        this._onDidMakeChatMLRequest = new event_1.Emitter();
        this.onDidMakeChatMLRequest = this._onDidMakeChatMLRequest.event;
    }
    preparePostOptions(requestOptions) {
        return {
            temperature: this.options.temperature,
            top_p: this.options.topP,
            // we disallow `stream=false` because we don't support non-streamed response
            ...requestOptions,
            stream: true
        };
    }
    async fetchOne(opts, token) {
        const resp = await this.fetchMany({
            ...opts,
            requestOptions: { ...opts.requestOptions, n: 1 }
        }, token);
        if (resp.type === commonTypes_1.ChatFetchResponseType.Success) {
            return { ...resp, value: resp.value[0] };
        }
        return resp;
    }
}
exports.AbstractChatMLFetcher = AbstractChatMLFetcher;
let ChatMLFetcherImpl = class ChatMLFetcherImpl extends AbstractChatMLFetcher {
    constructor(_fetcherService, _telemetryService, _requestLogger, _logService, _authenticationService, _interactionService, _chatQuotaService, _capiClientService, options) {
        super(options);
        this._fetcherService = _fetcherService;
        this._telemetryService = _telemetryService;
        this._requestLogger = _requestLogger;
        this._logService = _logService;
        this._authenticationService = _authenticationService;
        this._interactionService = _interactionService;
        this._chatQuotaService = _chatQuotaService;
        this._capiClientService = _capiClientService;
    }
    /**
     * Note: the returned array of strings may be less than `n` (e.g., in case there were errors during streaming)
     */
    async fetchMany(opts, token) {
        let { debugName, endpoint: chatEndpoint, finishedCb, location, messages, requestOptions, source, telemetryProperties, userInitiatedRequest } = opts;
        if (!telemetryProperties) {
            telemetryProperties = {};
        }
        if (!telemetryProperties.messageSource) {
            telemetryProperties.messageSource = debugName;
        }
        // TODO @lramos15 telemetry should not drive request ids
        const ourRequestId = telemetryProperties.requestId ?? telemetryProperties.messageId ?? (0, uuid_1.generateUuid)();
        const maxResponseTokens = chatEndpoint.maxOutputTokens;
        if (!requestOptions?.prediction) {
            requestOptions = { max_tokens: maxResponseTokens, ...requestOptions };
        }
        // Avoid sending a prediction with no content as this will yield a 400 Bad Request
        if (!requestOptions.prediction?.content) {
            delete requestOptions['prediction'];
        }
        const postOptions = this.preparePostOptions(requestOptions);
        console.log(`ChatMLFetcher: postOptions.tools count: ${postOptions.tools?.length ?? 0}`);
        const requestBody = chatEndpoint.createRequestBody({
            ...opts,
            requestId: ourRequestId,
            postOptions
        });
        console.log(`ChatMLFetcher: requestBody.tools count: ${requestBody.tools?.length ?? 0}`);
        if (requestBody.tools && requestBody.tools.length > 0) {
            console.log(`ChatMLFetcher: requestBody tool names: ${requestBody.tools.map((t) => t.function?.name || t.name).join(', ')}`);
        }
        const baseTelemetry = telemetryData_1.TelemetryData.createAndMarkAsIssued({
            ...telemetryProperties,
            baseModel: chatEndpoint.model,
            uiKind: commonTypes_1.ChatLocation.toString(location)
        });
        const pendingLoggedChatRequest = this._requestLogger.logChatRequest(debugName, chatEndpoint, {
            messages: opts.messages,
            model: chatEndpoint.model,
            ourRequestId,
            location: opts.location,
            body: requestBody,
            ignoreStatefulMarker: opts.ignoreStatefulMarker
        });
        let tokenCount = -1;
        const streamRecorder = new chatMLFetcher_1.FetchStreamRecorder(finishedCb);
        const enableRetryOnError = opts.enableRetryOnError ?? opts.enableRetryOnFilter;
        try {
            let response;
            const payloadValidationResult = isValidChatPayload(opts.messages, postOptions);
            if (!payloadValidationResult.isValid) {
                response = {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: undefined,
                    failKind: fetch_2.ChatFailKind.ValidationFailed,
                    reason: payloadValidationResult.reason,
                };
            }
            else {
                response = await this._fetchAndStreamChat(chatEndpoint, requestBody, baseTelemetry, streamRecorder.callback, requestOptions.secretKey, opts.location, ourRequestId, postOptions.n, token, userInitiatedRequest, telemetryProperties, opts.useFetcher);
                tokenCount = await chatEndpoint.acquireTokenizer().countMessagesTokens(messages);
                const extensionId = source?.extensionId ?? constants_1.EXTENSION_ID;
                this._onDidMakeChatMLRequest.fire({
                    messages,
                    model: chatEndpoint.model,
                    source: { extensionId },
                    tokenCount
                });
            }
            const timeToFirstToken = Date.now() - baseTelemetry.issuedTime;
            pendingLoggedChatRequest?.markTimeToFirstToken(timeToFirstToken);
            switch (response.type) {
                case fetch_2.FetchResponseKind.Success: {
                    const result = await this.processSuccessfulResponse(response, messages, requestBody, ourRequestId, maxResponseTokens, tokenCount, timeToFirstToken, streamRecorder, baseTelemetry, chatEndpoint, userInitiatedRequest);
                    // Handle FilteredRetry case with augmented messages
                    if (result.type === commonTypes_1.ChatFetchResponseType.FilteredRetry) {
                        if (opts.enableRetryOnFilter) {
                            streamRecorder.callback('', 0, { text: '', retryReason: result.category });
                            const filteredContent = result.value[0];
                            if (filteredContent) {
                                const retryMessage = (result.category === openai_1.FilterReason.Copyright) ?
                                    `The previous response (copied below) was filtered due to being too similar to existing public code. Please suggest something similar in function that does not match public code. Here's the previous response: ${filteredContent}\n\n` :
                                    `The previous response (copied below) was filtered due to triggering our content safety filters, which looks for hateful, self-harm, sexual, or violent content. Please suggest something similar in content that does not trigger these filters. Here's the previous response: ${filteredContent}\n\n`;
                                const augmentedMessages = [
                                    ...messages,
                                    {
                                        role: prompt_tsx_1.Raw.ChatRole.User,
                                        content: (0, globalStringUtils_1.toTextParts)(retryMessage)
                                    }
                                ];
                                // Retry with augmented messages
                                const retryResult = await this.fetchMany({
                                    ...opts,
                                    debugName: 'retry-' + debugName,
                                    messages: augmentedMessages,
                                    finishedCb,
                                    location,
                                    endpoint: chatEndpoint,
                                    source,
                                    requestOptions,
                                    userInitiatedRequest: false, // do not mark the retry as user initiated
                                    telemetryProperties: { ...telemetryProperties, retryAfterFilterCategory: result.category ?? 'uncategorized' },
                                    enableRetryOnFilter: false,
                                    enableRetryOnError,
                                }, token);
                                pendingLoggedChatRequest?.resolve(retryResult, streamRecorder.deltas);
                                if (retryResult.type === commonTypes_1.ChatFetchResponseType.Success) {
                                    return retryResult;
                                }
                            }
                        }
                        return {
                            type: commonTypes_1.ChatFetchResponseType.Filtered,
                            category: result.category,
                            reason: 'Response got filtered.',
                            requestId: result.requestId,
                            serverRequestId: result.serverRequestId
                        };
                    }
                    pendingLoggedChatRequest?.resolve(result, streamRecorder.deltas);
                    return result;
                }
                case fetch_2.FetchResponseKind.Canceled:
                    chatMLFetcherTelemetry_1.ChatMLFetcherTelemetrySender.sendCancellationTelemetry(this._telemetryService, {
                        source: telemetryProperties.messageSource ?? 'unknown',
                        requestId: ourRequestId,
                        model: chatEndpoint.model,
                        apiType: chatEndpoint.apiType,
                        associatedRequestId: telemetryProperties.associatedRequestId,
                        ...(telemetryProperties.retryAfterErrorCategory ? { retryAfterErrorCategory: telemetryProperties.retryAfterErrorCategory } : {}),
                        ...(telemetryProperties.retryAfterFilterCategory ? { retryAfterFilterCategory: telemetryProperties.retryAfterFilterCategory } : {}),
                    }, {
                        totalTokenMax: chatEndpoint.modelMaxPromptTokens ?? -1,
                        promptTokenCount: tokenCount,
                        tokenCountMax: maxResponseTokens,
                        timeToFirstToken,
                        timeToFirstTokenEmitted: (baseTelemetry && streamRecorder.firstTokenEmittedTime) ? streamRecorder.firstTokenEmittedTime - baseTelemetry.issuedTime : -1,
                        timeToCancelled: baseTelemetry ? Date.now() - baseTelemetry.issuedTime : -1,
                        isVisionRequest: this.filterImageMessages(messages) ? 1 : -1,
                        isBYOK: (0, openAIEndpoint_1.isBYOKModel)(chatEndpoint),
                        isAuto: (0, autoChatEndpoint_1.isAutoModel)(chatEndpoint)
                    });
                    pendingLoggedChatRequest?.resolveWithCancelation();
                    return this.processCanceledResponse(response, ourRequestId);
                case fetch_2.FetchResponseKind.Failed: {
                    const processed = this.processFailedResponse(response, ourRequestId);
                    chatMLFetcherTelemetry_1.ChatMLFetcherTelemetrySender.sendResponseErrorTelemetry(this._telemetryService, processed, telemetryProperties, ourRequestId, chatEndpoint, requestBody, tokenCount, maxResponseTokens, timeToFirstToken, this.filterImageMessages(messages));
                    pendingLoggedChatRequest?.resolve(processed);
                    return processed;
                }
            }
        }
        catch (err) {
            const timeToError = Date.now() - baseTelemetry.issuedTime;
            const processed = this.processError(err, ourRequestId);
            if (['darwin', 'linux'].includes(process.platform) && processed.type === commonTypes_1.ChatFetchResponseType.NetworkError && processed.reason.indexOf('net::ERR_NETWORK_CHANGED') !== -1) {
                if (enableRetryOnError) {
                    this._logService.info('Retrying chat request with node-fetch after net::ERR_NETWORK_CHANGED error.');
                    streamRecorder.callback('', 0, { text: '', retryReason: 'network_error' });
                    // Retry with other fetchers
                    const retryResult = await this.fetchMany({
                        ...opts,
                        debugName: 'retry-error-' + debugName,
                        messages,
                        finishedCb,
                        location,
                        endpoint: chatEndpoint,
                        source,
                        requestOptions,
                        userInitiatedRequest: false, // do not mark the retry as user initiated
                        telemetryProperties: { ...telemetryProperties, retryAfterErrorCategory: 'electron-network-changed' },
                        enableRetryOnFilter: opts.enableRetryOnFilter,
                        enableRetryOnError: false,
                        useFetcher: 'node-fetch',
                    }, token);
                    pendingLoggedChatRequest?.resolve(retryResult, streamRecorder.deltas);
                    return retryResult;
                }
            }
            if (processed.type === commonTypes_1.ChatFetchResponseType.Canceled) {
                chatMLFetcherTelemetry_1.ChatMLFetcherTelemetrySender.sendCancellationTelemetry(this._telemetryService, {
                    source: telemetryProperties.messageSource ?? 'unknown',
                    requestId: ourRequestId,
                    model: chatEndpoint.model,
                    apiType: chatEndpoint.apiType,
                    associatedRequestId: telemetryProperties.associatedRequestId
                }, {
                    totalTokenMax: chatEndpoint.modelMaxPromptTokens ?? -1,
                    promptTokenCount: tokenCount,
                    tokenCountMax: maxResponseTokens,
                    timeToFirstToken: undefined,
                    timeToCancelled: timeToError,
                    isVisionRequest: this.filterImageMessages(messages) ? 1 : -1,
                    isBYOK: (0, openAIEndpoint_1.isBYOKModel)(chatEndpoint),
                    isAuto: (0, autoChatEndpoint_1.isAutoModel)(chatEndpoint)
                });
            }
            else {
                chatMLFetcherTelemetry_1.ChatMLFetcherTelemetrySender.sendResponseErrorTelemetry(this._telemetryService, processed, telemetryProperties, ourRequestId, chatEndpoint, requestBody, tokenCount, maxResponseTokens, timeToError, this.filterImageMessages(messages));
            }
            pendingLoggedChatRequest?.resolve(processed);
            return processed;
        }
    }
    async _fetchAndStreamChat(chatEndpointInfo, request, baseTelemetryData, finishedCb, secretKey, location, ourRequestId, nChoices, cancellationToken, userInitiatedRequest, telemetryProperties, useFetcher) {
        if (cancellationToken.isCancellationRequested) {
            return { type: fetch_2.FetchResponseKind.Canceled, reason: 'before fetch request' };
        }
        this._logService.debug(`modelMaxPromptTokens ${chatEndpointInfo.modelMaxPromptTokens}`);
        this._logService.debug(`modelMaxResponseTokens ${request.max_tokens ?? 2048}`);
        this._logService.debug(`chat model ${chatEndpointInfo.model}`);
        // Puku AI: Check if this is a Puku AI endpoint (uses Puku authentication, not Copilot token)
        // Check URL pattern, family, model name, or endpoint name
        const urlString = chatEndpointInfo.urlOrRequestMetadata?.toString() || '';
        const isPukuAI = urlString.includes('api.puku.sh') ||
            chatEndpointInfo.family === 'puku' ||
            chatEndpointInfo.model?.startsWith('GLM-') ||
            chatEndpointInfo.name === 'Puku AI';
        // Puku Editor: Skip getCopilotToken for BYOK models or Puku AI
        if (!secretKey && (0, openAIEndpoint_1.isBYOKModel)(chatEndpointInfo) !== 1 && !isPukuAI) {
            try {
                secretKey = (await this._authenticationService.getCopilotToken()).token;
            }
            catch (error) {
                // If GitHub/Puku login fails, check if this might be a Puku AI/BYOK endpoint
                if (error instanceof Error && (error.message === 'GitHubLoginFailed' || error.message.includes('GitHubLoginFailed') || error.name === 'PukuLoginRequired')) {
                    // Re-check Puku AI detection in case URL wasn't available before
                    const urlStringRetry = chatEndpointInfo.urlOrRequestMetadata?.toString() || '';
                    const isPukuAIRetry = urlStringRetry.includes('api.puku.sh') ||
                        chatEndpointInfo.family === 'puku' ||
                        chatEndpointInfo.model?.startsWith('GLM-') ||
                        chatEndpointInfo.name === 'Puku AI';
                    if (isPukuAIRetry || (0, openAIEndpoint_1.isBYOKModel)(chatEndpointInfo) === 1) {
                        this._logService.info(`[ChatMLFetcher] GitHub login failed but using Puku AI/BYOK (family: ${chatEndpointInfo.family}, model: ${chatEndpointInfo.model}), continuing with empty token`);
                        secretKey = '';
                    }
                    else {
                        // Re-throw if not Puku AI/BYOK
                        this._logService.error(`[ChatMLFetcher] GitHub login failed and endpoint doesn't appear to be Puku AI/BYOK (family: ${chatEndpointInfo.family}, model: ${chatEndpointInfo.model}, name: ${chatEndpointInfo.name})`);
                        throw error;
                    }
                }
                else {
                    throw error;
                }
            }
        }
        // BYOK models and Puku AI may use empty string for no auth
        if (!secretKey && (0, openAIEndpoint_1.isBYOKModel)(chatEndpointInfo) !== 1 && !isPukuAI) {
            // If no key is set we error (only for non-BYOK and non-Puku AI models)
            const urlOrRequestMetadata = (0, networking_1.stringifyUrlOrRequestMetadata)(chatEndpointInfo.urlOrRequestMetadata);
            this._logService.error(`Failed to send request to ${urlOrRequestMetadata} due to missing key`);
            (0, stream_1.sendCommunicationErrorTelemetry)(this._telemetryService, `Failed to send request to ${urlOrRequestMetadata} due to missing key`);
            return {
                type: fetch_2.FetchResponseKind.Failed,
                modelRequestId: undefined,
                failKind: fetch_2.ChatFailKind.TokenExpiredOrInvalid,
                reason: 'key is missing'
            };
        }
        // For BYOK models and Puku AI, use empty string if no key provided
        secretKey ??= '';
        // Generate unique ID to link input and output messages
        const modelCallId = (0, uuid_1.generateUuid)();
        const response = await this._fetchWithInstrumentation(chatEndpointInfo, ourRequestId, request, secretKey, location, cancellationToken, userInitiatedRequest, { ...telemetryProperties, modelCallId }, useFetcher);
        if (cancellationToken.isCancellationRequested) {
            const body = await response.body();
            try {
                // Destroy the stream so that the server is hopefully notified we don't want any more data
                // and can cancel/forget about the request itself.
                body.destroy();
            }
            catch (e) {
                this._logService.error(e, `Error destroying stream`);
                this._telemetryService.sendGHTelemetryException(e, 'Error destroying stream');
            }
            return { type: fetch_2.FetchResponseKind.Canceled, reason: 'after fetch request' };
        }
        if (response.status === 200 && this._authenticationService.copilotToken?.isFreeUser && this._authenticationService.copilotToken?.isChatQuotaExceeded) {
            this._authenticationService.resetCopilotToken();
        }
        if (response.status !== 200) {
            const telemetryData = createTelemetryData(chatEndpointInfo, location, ourRequestId);
            this._logService.info('Request ID for failed request: ' + ourRequestId);
            return this._handleError(telemetryData, response, ourRequestId);
        }
        // Extend baseTelemetryData with modelCallId for output messages
        const extendedBaseTelemetryData = baseTelemetryData.extendedBy({ modelCallId });
        const chatCompletions = await chatEndpointInfo.processResponseFromChatEndpoint(this._telemetryService, this._logService, response, nChoices ?? /* OpenAI's default */ 1, finishedCb, extendedBaseTelemetryData, cancellationToken);
        // CAPI will return us a Copilot Edits Session Header which is our token to using the speculative decoding endpoint
        // We should store this in the auth service for easy use later
        if (response.headers.get('Copilot-Edits-Session')) {
            this._authenticationService.speculativeDecodingEndpointToken = response.headers.get('Copilot-Edits-Session') ?? undefined;
        }
        this._chatQuotaService.processQuotaHeaders(response.headers);
        return {
            type: fetch_2.FetchResponseKind.Success,
            chatCompletions,
        };
    }
    async _fetchWithInstrumentation(chatEndpoint, ourRequestId, request, secretKey, location, cancellationToken, userInitiatedRequest, telemetryProperties, useFetcher) {
        // If request contains an image, we include this header.
        const additionalHeaders = {
            'X-Interaction-Id': this._interactionService.interactionId,
            'X-Initiator': userInitiatedRequest ? 'user' : 'agent', // Agent = a system request / not the primary user query.
        };
        if (request.messages?.some((m) => Array.isArray(m.content) ? m.content.some(c => 'image_url' in c) : false) && chatEndpoint.supportsVision) {
            additionalHeaders['Copilot-Vision-Request'] = 'true';
        }
        const telemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued({
            endpoint: 'completions',
            engineName: 'chat',
            uiKind: commonTypes_1.ChatLocation.toString(location),
            ...telemetryProperties // This includes the modelCallId from fetchAndStreamChat
        }, {
            maxTokenWindow: chatEndpoint.modelMaxPromptTokens
        });
        for (const [key, value] of Object.entries(request)) {
            if (key === 'messages' || key === 'input') {
                continue;
            } // Skip messages (PII)
            telemetryData.properties[`request.option.${key}`] = JSON.stringify(value) ?? 'undefined';
        }
        // The request ID we are passed in is sent in the request to the proxy, and included in our pre-request telemetry.
        // We hope (but do not rely on) that the model will use the same ID in the response, allowing us to correlate
        // the request and response.
        telemetryData.properties['headerRequestId'] = ourRequestId;
        this._telemetryService.sendGHTelemetryEvent('request.sent', telemetryData.properties, telemetryData.measurements);
        const requestStart = Date.now();
        const intent = locationToIntent(location);
        // Wrap the Promise with success/error callbacks so we can log/measure it
        return (0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, chatEndpoint, secretKey, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), intent, ourRequestId, request, additionalHeaders, cancellationToken, useFetcher).then(response => {
            const apim = response.headers.get('apim-request-id');
            if (apim) {
                this._logService.debug(`APIM request id: ${apim}`);
            }
            const ghRequestId = response.headers.get('x-github-request-id');
            if (ghRequestId) {
                this._logService.debug(`GH request id: ${ghRequestId}`);
            }
            // This ID is hopefully the one the same as ourRequestId, but it is not guaranteed.
            // If they are different then we will override the original one we set in telemetryData above.
            const modelRequestId = (0, fetch_1.getRequestId)(response, undefined);
            telemetryData.extendWithRequestId(modelRequestId);
            // TODO: Add response length (requires parsing)
            const totalTimeMs = Date.now() - requestStart;
            telemetryData.measurements.totalTimeMs = totalTimeMs;
            this._logService.debug(`request.response: [${(0, networking_1.stringifyUrlOrRequestMetadata)(chatEndpoint.urlOrRequestMetadata)}], took ${totalTimeMs} ms`);
            this._telemetryService.sendGHTelemetryEvent('request.response', telemetryData.properties, telemetryData.measurements);
            return response;
        })
            .catch(error => {
            if (this._fetcherService.isAbortError(error)) {
                // If we cancelled a network request, we don't want to log a `request.error`
                throw error;
            }
            const warningTelemetry = telemetryData.extendedBy({ error: 'Network exception' });
            this._telemetryService.sendGHTelemetryEvent('request.shownWarning', warningTelemetry.properties, warningTelemetry.measurements);
            telemetryData.properties.code = String(error.code ?? '');
            telemetryData.properties.errno = String(error.errno ?? '');
            telemetryData.properties.message = String(error.message ?? '');
            telemetryData.properties.type = String(error.type ?? '');
            const totalTimeMs = Date.now() - requestStart;
            telemetryData.measurements.totalTimeMs = totalTimeMs;
            this._logService.debug(`request.response: [${(0, networking_1.stringifyUrlOrRequestMetadata)(chatEndpoint.urlOrRequestMetadata)}] took ${totalTimeMs} ms`);
            this._telemetryService.sendGHTelemetryEvent('request.error', telemetryData.properties, telemetryData.measurements);
            throw error;
        })
            .finally(() => {
            (0, chatStream_1.sendEngineMessagesTelemetry)(this._telemetryService, request.messages ?? [], telemetryData, false, this._logService);
        });
    }
    async _handleError(telemetryData, response, requestId) {
        const modelRequestIdObj = (0, fetch_1.getRequestId)(response, undefined);
        requestId = modelRequestIdObj.headerRequestId || requestId;
        modelRequestIdObj.headerRequestId = requestId;
        telemetryData.properties.error = `Response status was ${response.status}`;
        telemetryData.properties.status = String(response.status);
        this._telemetryService.sendGHTelemetryEvent('request.shownWarning', telemetryData.properties, telemetryData.measurements);
        const text = await response.text();
        let jsonData;
        try {
            jsonData = JSON.parse(text);
            jsonData = jsonData?.error ?? jsonData; // Extract nested error object if it exists
        }
        catch {
            // JSON parsing failed, it's not json content.
        }
        if (400 <= response.status && response.status < 500) {
            if (response.status === 400 && text.includes('off_topic')) {
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.OffTopic,
                    reason: 'filtered as off_topic by intent classifier: message was not programming related',
                };
            }
            if (response.status === 401 && text.includes('authorize_url') && jsonData?.authorize_url) {
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.AgentUnauthorized,
                    reason: response.statusText || response.statusText,
                    data: jsonData
                };
            }
            if (response.status === 400 && jsonData?.code === 'previous_response_not_found') {
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.InvalidPreviousResponseId,
                    reason: jsonData.message || 'Invalid previous response ID',
                    data: jsonData,
                };
            }
            if (response.status === 401 || response.status === 403) {
                // Token has expired or invalid, fetch a new one on next request
                // TODO(drifkin): these actions should probably happen in vsc specific code
                this._authenticationService.resetCopilotToken(response.status);
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.TokenExpiredOrInvalid,
                    reason: jsonData?.message || `token expired or invalid: ${response.status}`,
                };
            }
            if (response.status === 402) {
                // When we receive a 402, we have exceed a quota
                // This is stored on the token so let's refresh it
                this._authenticationService.resetCopilotToken(response.status);
                const retryAfter = response.headers.get('retry-after');
                const convertToDate = (retryAfterString) => {
                    if (!retryAfterString) {
                        return undefined;
                    }
                    // Try treating it as a date
                    const retryAfterDate = new Date(retryAfterString);
                    if (!isNaN(retryAfterDate.getDate())) {
                        return retryAfterDate;
                    }
                    // It is not a date, try treating it as a duration from the current date
                    const retryAfterDuration = parseInt(retryAfterString, 10);
                    if (isNaN(retryAfterDuration)) {
                        return undefined;
                    }
                    return new Date(Date.now() + retryAfterDuration * 1000);
                };
                const retryAfterDate = convertToDate(retryAfter);
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.QuotaExceeded,
                    reason: jsonData?.message ?? 'Free tier quota exceeded',
                    data: {
                        capiError: jsonData,
                        retryAfter: retryAfterDate
                    }
                };
            }
            if (response.status === 404) {
                let errorReason;
                // Check if response body is valid JSON
                if (!jsonData) {
                    errorReason = text;
                }
                else {
                    errorReason = JSON.stringify(jsonData);
                }
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.NotFound,
                    reason: errorReason
                };
            }
            if (response.status === 422) {
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.ContentFilter,
                    reason: 'Filtered by Responsible AI Service'
                };
            }
            if (response.status === 424) {
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.AgentFailedDependency,
                    reason: text
                };
            }
            if (response.status === 429) {
                let rateLimitReason = text;
                rateLimitReason = jsonData?.message ?? jsonData?.code;
                if (text.includes('extension_blocked') && jsonData?.code === 'extension_blocked' && jsonData?.type === 'rate_limit_error') {
                    return {
                        type: fetch_2.FetchResponseKind.Failed,
                        modelRequestId: modelRequestIdObj,
                        failKind: fetch_2.ChatFailKind.ExtensionBlocked,
                        reason: 'Extension blocked',
                        data: {
                            ...jsonData?.message,
                            retryAfter: response.headers.get('retry-after'),
                        }
                    };
                }
                // HTTP 429 Too Many Requests
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.RateLimited,
                    reason: rateLimitReason,
                    data: {
                        retryAfter: response.headers.get('retry-after'),
                        rateLimitKey: response.headers.get('x-ratelimit-exceeded'),
                        capiError: jsonData
                    }
                };
            }
            if (response.status === 466) {
                this._logService.info(text);
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.ClientNotSupported,
                    reason: `client not supported: ${text}`
                };
            }
            if (response.status === 499) {
                this._logService.info('Cancelled by server');
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.ServerCanceled,
                    reason: 'canceled by server'
                };
            }
        }
        else if (500 <= response.status && response.status < 600) {
            if (response.status === 503) {
                return {
                    type: fetch_2.FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: fetch_2.ChatFailKind.RateLimited,
                    reason: 'Upstream provider rate limit hit',
                    data: {
                        retryAfter: null,
                        rateLimitKey: null,
                        capiError: { code: 'upstream_provider_rate_limit', message: text }
                    }
                };
            }
            const reasonNoText = `Server error: ${response.status}`;
            const reason = `${reasonNoText} ${text}`;
            this._logService.error(reason);
            // HTTP 5xx Server Error
            return {
                type: fetch_2.FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: fetch_2.ChatFailKind.ServerError,
                reason: reasonNoText,
            };
        }
        this._logService.error(`Request Failed: ${response.status} ${text}`);
        (0, stream_1.sendCommunicationErrorTelemetry)(this._telemetryService, 'Unhandled status from server: ' + response.status, text);
        return {
            type: fetch_2.FetchResponseKind.Failed,
            modelRequestId: modelRequestIdObj,
            failKind: fetch_2.ChatFailKind.Unknown,
            reason: `Request Failed: ${response.status} ${text}`
        };
    }
    async processSuccessfulResponse(response, messages, requestBody, requestId, maxResponseTokens, promptTokenCount, timeToFirstToken, streamRecorder, baseTelemetry, chatEndpointInfo, userInitiatedRequest) {
        const completions = [];
        for await (const chatCompletion of response.chatCompletions) {
            chatMLFetcherTelemetry_1.ChatMLFetcherTelemetrySender.sendSuccessTelemetry(this._telemetryService, {
                requestId,
                chatCompletion,
                baseTelemetry,
                userInitiatedRequest,
                chatEndpointInfo,
                requestBody,
                maxResponseTokens,
                promptTokenCount,
                timeToFirstToken,
                timeToFirstTokenEmitted: (baseTelemetry && streamRecorder.firstTokenEmittedTime) ? streamRecorder.firstTokenEmittedTime - baseTelemetry.issuedTime : -1,
                hasImageMessages: this.filterImageMessages(messages),
            });
            if (!this.isRepetitive(chatCompletion, baseTelemetry?.properties)) {
                completions.push(chatCompletion);
            }
        }
        const successFinishReasons = new Set([openai_1.FinishedCompletionReason.Stop, openai_1.FinishedCompletionReason.ClientTrimmed, openai_1.FinishedCompletionReason.FunctionCall, openai_1.FinishedCompletionReason.ToolCalls]);
        const successfulCompletions = completions.filter(c => successFinishReasons.has(c.finishReason));
        if (successfulCompletions.length >= 1) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Success,
                resolvedModel: successfulCompletions[0].model,
                usage: successfulCompletions.length === 1 ? successfulCompletions[0].usage : undefined,
                value: successfulCompletions.map(c => (0, globalStringUtils_1.getTextPart)(c.message.content)),
                requestId,
                serverRequestId: successfulCompletions[0].requestId.headerRequestId,
            };
        }
        const result = completions.at(0);
        switch (result?.finishReason) {
            case openai_1.FinishedCompletionReason.ContentFilter:
                return {
                    type: commonTypes_1.ChatFetchResponseType.FilteredRetry,
                    category: result.filterReason ?? openai_1.FilterReason.Copyright,
                    reason: 'Response got filtered.',
                    value: completions.map(c => (0, globalStringUtils_1.getTextPart)(c.message.content)),
                    requestId: requestId,
                    serverRequestId: result.requestId.headerRequestId,
                };
            case openai_1.FinishedCompletionReason.Length:
                return {
                    type: commonTypes_1.ChatFetchResponseType.Length,
                    reason: 'Response too long.',
                    requestId: requestId,
                    serverRequestId: result.requestId.headerRequestId,
                    truncatedValue: (0, globalStringUtils_1.getTextPart)(result.message.content)
                };
            case openai_1.FinishedCompletionReason.ServerError:
                return {
                    type: commonTypes_1.ChatFetchResponseType.Failed,
                    reason: 'Server error. Stream terminated',
                    requestId: requestId,
                    serverRequestId: result.requestId.headerRequestId,
                    streamError: result.error
                };
        }
        return {
            type: commonTypes_1.ChatFetchResponseType.Unknown,
            reason: 'Response contained no choices.',
            requestId: requestId,
            serverRequestId: result?.requestId.headerRequestId,
        };
    }
    filterImageMessages(messages) {
        return messages?.some(m => Array.isArray(m.content) ? m.content.some(c => 'imageUrl' in c) : false);
    }
    isRepetitive(chatCompletion, telemetryProperties) {
        const lineRepetitionStats = (0, anomalyDetection_1.calculateLineRepetitionStats)((0, globalStringUtils_1.getTextPart)(chatCompletion.message.content));
        const hasRepetition = (0, anomalyDetection_1.isRepetitive)(chatCompletion.tokens);
        if (hasRepetition) {
            const telemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued();
            telemetryData.extendWithRequestId(chatCompletion.requestId);
            const extended = telemetryData.extendedBy(telemetryProperties);
            this._telemetryService.sendEnhancedGHTelemetryEvent('conversation.repetition.detected', extended.properties, extended.measurements);
        }
        if (lineRepetitionStats.numberOfRepetitions >= 10) {
            /* __GDPR__
                "conversation.repetition.detected" : {
                    "owner": "lramos15",
                    "comment": "Calculates the number of repetitions in a response. Useful for loop detection",
                    "finishReason": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reason for why a response finished. Helps identify cancellation vs length limits" },
                    "requestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id for this message request." },
                    "lengthOfLine": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Length of the repeating line, in characters." },
                    "numberOfRepetitions": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Number of times the line repeats." },
                    "totalLines": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Number of total lines in the response." }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('conversation.repetition.detected', {
                requestId: chatCompletion.requestId.headerRequestId,
                finishReason: chatCompletion.finishReason,
            }, {
                numberOfRepetitions: lineRepetitionStats.numberOfRepetitions,
                lengthOfLine: lineRepetitionStats.mostRepeatedLine.length,
                totalLines: lineRepetitionStats.totalLines
            });
        }
        return hasRepetition;
    }
    processCanceledResponse(response, requestId) {
        return {
            type: commonTypes_1.ChatFetchResponseType.Canceled,
            reason: response.reason,
            requestId: requestId,
            serverRequestId: undefined,
        };
    }
    processFailedResponse(response, requestId) {
        const serverRequestId = response.modelRequestId?.gitHubRequestId;
        const reason = response.reason;
        if (response.failKind === fetch_2.ChatFailKind.RateLimited) {
            return { type: commonTypes_1.ChatFetchResponseType.RateLimited, reason, requestId, serverRequestId, retryAfter: response.data?.retryAfter, rateLimitKey: (response.data?.rateLimitKey || ''), capiError: response.data?.capiError };
        }
        if (response.failKind === fetch_2.ChatFailKind.QuotaExceeded) {
            return { type: commonTypes_1.ChatFetchResponseType.QuotaExceeded, reason, requestId, serverRequestId, retryAfter: response.data?.retryAfter, capiError: response.data?.capiError };
        }
        if (response.failKind === fetch_2.ChatFailKind.OffTopic) {
            return { type: commonTypes_1.ChatFetchResponseType.OffTopic, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.TokenExpiredOrInvalid || response.failKind === fetch_2.ChatFailKind.ClientNotSupported || reason.includes('Bad request: ')) {
            return { type: commonTypes_1.ChatFetchResponseType.BadRequest, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.ServerError) {
            return { type: commonTypes_1.ChatFetchResponseType.Failed, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.ContentFilter) {
            return { type: commonTypes_1.ChatFetchResponseType.PromptFiltered, reason, category: openai_1.FilterReason.Prompt, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.AgentUnauthorized) {
            return { type: commonTypes_1.ChatFetchResponseType.AgentUnauthorized, reason, authorizationUrl: response.data.authorize_url, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.AgentFailedDependency) {
            return { type: commonTypes_1.ChatFetchResponseType.AgentFailedDependency, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.ExtensionBlocked) {
            const retryAfter = typeof response.data?.retryAfter === 'number' ? response.data.retryAfter : 300;
            return { type: commonTypes_1.ChatFetchResponseType.ExtensionBlocked, reason, requestId, retryAfter, learnMoreLink: response.data?.learnMoreLink ?? '', serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.NotFound) {
            return { type: commonTypes_1.ChatFetchResponseType.NotFound, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_2.ChatFailKind.InvalidPreviousResponseId) {
            return { type: commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker, reason, requestId, serverRequestId };
        }
        return { type: commonTypes_1.ChatFetchResponseType.Failed, reason, requestId, serverRequestId };
    }
    processError(err, requestId) {
        const fetcher = this._fetcherService;
        // If we cancelled a network request, we don't want to log an error
        if (fetcher.isAbortError(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Canceled,
                reason: 'network request aborted',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        if ((0, errors_1.isCancellationError)(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Canceled,
                reason: 'Got a cancellation error',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        if (err && ((err instanceof Error && err.message === 'Premature close') ||
            (typeof err === 'object' && err.code === 'ERR_STREAM_PREMATURE_CLOSE') /* to be extra sure */)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Canceled,
                reason: 'Stream closed prematurely',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        this._logService.error(errorsUtil.fromUnknown(err), `Error on conversation request`);
        console.error('[ChatMLFetcher] Error on conversation request:', err);
        console.error('[ChatMLFetcher] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        this._telemetryService.sendGHTelemetryException(err, 'Error on conversation request');
        const errorDetail = fetcher.getUserMessageForFetcherError(err);
        console.log('[ChatMLFetcher] Error detail from fetcher:', errorDetail);
        const scrubbedErrorDetail = this.scrubErrorDetail(errorDetail);
        if (fetcher.isInternetDisconnectedError(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.NetworkError,
                reason: `It appears you're not connected to the internet, please check your network connection and try again.`,
                reasonDetail: scrubbedErrorDetail,
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        else if (fetcher.isFetcherError(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.NetworkError,
                reason: errorDetail,
                reasonDetail: scrubbedErrorDetail,
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        else {
            return {
                type: commonTypes_1.ChatFetchResponseType.Failed,
                reason: 'Error on conversation request. Check the log for more details.',
                reasonDetail: scrubbedErrorDetail,
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
    }
    scrubErrorDetail(errorDetail) {
        errorDetail = errorDetail.replaceAll(/(logged in as )([^\s]+)/ig, '$1<login>');
        const username = this._authenticationService.copilotToken?.username;
        if (!username) {
            return errorDetail;
        }
        const regex = new RegExp((0, strings_1.escapeRegExpCharacters)(username), 'ig');
        return errorDetail.replaceAll(regex, '<login>');
    }
};
exports.ChatMLFetcherImpl = ChatMLFetcherImpl;
exports.ChatMLFetcherImpl = ChatMLFetcherImpl = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, requestLogger_1.IRequestLogger),
    __param(3, logService_1.ILogService),
    __param(4, authentication_1.IAuthenticationService),
    __param(5, interactionService_1.IInteractionService),
    __param(6, chatQuotaService_1.IChatQuotaService),
    __param(7, capiClient_1.ICAPIClientService),
    __param(8, conversationOptions_1.IConversationOptions)
], ChatMLFetcherImpl);
/**
 * Validates a chat request payload to ensure it is valid
 * @param params The params being sent in the chat request
 * @returns Whether the chat payload is valid
 */
function isValidChatPayload(messages, postOptions) {
    if (messages.length === 0) {
        return { isValid: false, reason: asUnexpected('No messages provided') };
    }
    if (postOptions?.max_tokens && postOptions?.max_tokens < 1) {
        return { isValid: false, reason: asUnexpected('Invalid response token parameter') };
    }
    const functionNamePattern = /^[a-zA-Z0-9_-]+$/;
    if (postOptions?.functions?.some(f => !f.name.match(functionNamePattern)) ||
        postOptions?.function_call?.name && !postOptions.function_call.name.match(functionNamePattern)) {
        return { isValid: false, reason: asUnexpected('Function names must match ^[a-zA-Z0-9_-]+$') };
    }
    if (postOptions?.tools && postOptions.tools.length > configurationService_1.HARD_TOOL_LIMIT) {
        return { isValid: false, reason: `Tool limit exceeded (${postOptions.tools.length}/${configurationService_1.HARD_TOOL_LIMIT}). Click "Configure Tools" in the chat input to disable ${postOptions.tools.length - configurationService_1.HARD_TOOL_LIMIT} tools and retry.` };
    }
    return { isValid: true, reason: '' };
}
function asUnexpected(reason) {
    return `Prompt failed validation with the reason: ${reason}. Please file an issue.`;
}
function createTelemetryData(chatEndpointInfo, location, headerRequestId) {
    return telemetryData_1.TelemetryData.createAndMarkAsIssued({
        endpoint: 'completions',
        engineName: 'chat',
        uiKind: commonTypes_1.ChatLocation.toString(location),
        headerRequestId
    });
}
/**
 * WARNING: The value that is returned from this function drives the disablement of RAI for full-file rewrite requests
 * in Copilot Edits, Copilot Chat, Agent Mode, and Inline Chat.
 * If your chat location generates full-file rewrite requests and you are unsure if changing something here will cause problems, please talk to @roblourens
 */
function locationToIntent(location) {
    switch (location) {
        case commonTypes_1.ChatLocation.Panel:
            return 'conversation-panel';
        case commonTypes_1.ChatLocation.Editor:
            return 'conversation-inline';
        case commonTypes_1.ChatLocation.EditingSession:
            return 'conversation-edits';
        case commonTypes_1.ChatLocation.Notebook:
            return 'conversation-notebook';
        case commonTypes_1.ChatLocation.Terminal:
            return 'conversation-terminal';
        case commonTypes_1.ChatLocation.Other:
            return 'conversation-other';
        case commonTypes_1.ChatLocation.Agent:
            return 'conversation-agent';
        case commonTypes_1.ChatLocation.ResponsesProxy:
            return 'responses-proxy';
    }
}
//# sourceMappingURL=chatMLFetcher.js.map