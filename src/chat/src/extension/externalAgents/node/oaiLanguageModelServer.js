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
exports.OpenAILanguageModelServer = void 0;
const http = __importStar(require("http"));
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const responsesApi_1 = require("../../../platform/endpoint/node/responsesApi");
const logService_1 = require("../../../platform/log/common/logService");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const sseParser_1 = require("../../../util/vs/base/common/sseParser");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
/**
 * HTTP server that provides an OpenAI Responses API compatible endpoint.
 * Acts as a pure pass-through proxy to the underlying model endpoint.
 */
let OpenAILanguageModelServer = class OpenAILanguageModelServer extends lifecycle_1.Disposable {
    constructor(logService, endpointProvider, instantiationService) {
        super();
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.config = {
            port: 0, // Will be set to random available port
            nonce: 'vscode-lm-' + (0, uuid_1.generateUuid)()
        };
        this.server = this.createServer();
        this._register((0, lifecycle_1.toDisposable)(() => this.stop()));
    }
    createServer() {
        return http.createServer(async (req, res) => {
            this.trace(`Received request: ${req.method} ${req.url}`);
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            // It sends //responses if OPENAI_BASE_URL ends in /
            if (req.method === 'POST' && (req.url === '/v1/responses' || req.url === '/responses' || req.url === '//responses')) {
                await this.handleResponsesRequest(req, res);
                return;
            }
            if (req.method === 'GET' && req.url === '/') {
                res.writeHead(200);
                res.end('Hello from LanguageModelServer');
                return;
            }
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        });
    }
    async handleResponsesRequest(req, res) {
        try {
            const body = await this.readRequestBody(req);
            if (!(await this.isAuthTokenValid(req))) {
                this.error('Invalid auth key');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid authentication' }));
                return;
            }
            await this.handleAuthedResponsesRequest(body, req.headers, res);
        }
        catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            }));
        }
        return;
    }
    /**
     * Verify nonce
     */
    async isAuthTokenValid(req) {
        const authHeader = req.headers.authorization;
        const bearerSpace = 'Bearer ';
        const authKey = authHeader?.startsWith(bearerSpace) ? authHeader.substring(bearerSpace.length) : undefined;
        return authKey === this.config.nonce;
    }
    async readRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', reject);
        });
    }
    async handleAuthedResponsesRequest(bodyString, headers, res) {
        // Create cancellation token for the request
        const tokenSource = new cancellation_1.CancellationTokenSource();
        try {
            const requestBody = JSON.parse(bodyString);
            if (Array.isArray(requestBody.tools)) {
                requestBody.tools = requestBody.tools.filter(tool => {
                    if (typeof tool?.type === 'string' && tool.type.startsWith('web_search')) {
                        this.warn(`Filtering out unsupported tool type: ${JSON.stringify(tool)}`);
                        return false;
                    }
                    return true;
                });
            }
            const lastMessage = requestBody.input?.at(-1);
            const isUserInitiatedMessage = typeof lastMessage === 'string' ||
                lastMessage?.type === 'message' && lastMessage.role === 'user';
            const endpoints = await this.endpointProvider.getAllChatEndpoints();
            if (endpoints.length === 0) {
                this.error('No language models available');
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No language models available' }));
                return;
            }
            const selectedEndpoint = this.selectEndpoint(endpoints, requestBody.model);
            if (!selectedEndpoint) {
                this.error('No model found matching criteria');
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'No model found matching criteria'
                }));
                return;
            }
            // Set up streaming response
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
            // Handle client disconnect
            let requestComplete = false;
            res.on('close', () => {
                if (!requestComplete) {
                    this.info('Client disconnected before request complete');
                }
                tokenSource.cancel();
            });
            const endpointRequestBody = requestBody;
            const streamingEndpoint = this.instantiationService.createInstance(StreamingPassThroughEndpoint, selectedEndpoint, res, endpointRequestBody, headers, 'vscode_codex');
            let messagesForLogging = [];
            try {
                // Don't fail based on any assumptions about the shape of the request
                messagesForLogging = Array.isArray(requestBody.input) ?
                    (0, responsesApi_1.responseApiInputToRawMessagesForLogging)(requestBody) :
                    [];
            }
            catch (e) {
                this.exception(e, `Failed to parse messages for logging`);
            }
            await streamingEndpoint.makeChatRequest2({
                debugName: 'oaiLMServer',
                messages: messagesForLogging,
                finishedCb: async () => undefined,
                location: commonTypes_1.ChatLocation.ResponsesProxy,
                userInitiatedRequest: isUserInitiatedMessage
            }, tokenSource.token);
            requestComplete = true;
            res.end();
        }
        catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Failed to process chat request',
                details: error instanceof Error ? error.message : String(error)
            }));
        }
        finally {
            tokenSource.dispose();
        }
    }
    selectEndpoint(endpoints, requestedModel) {
        if (requestedModel) {
            // Try to find exact match first
            const selectedEndpoint = endpoints.find(e => e.family === requestedModel);
            return selectedEndpoint;
        }
        // Use first available model if no criteria specified
        return endpoints[0];
    }
    async start() {
        if (this.config.port !== 0) {
            // Already started
            return;
        }
        return new Promise((resolve, reject) => {
            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server.address();
                if (address && typeof address === 'object') {
                    this.config = {
                        ...this.config,
                        port: address.port
                    };
                    this.info(`Language Model Server started on http://localhost:${this.config.port}`);
                    resolve();
                    return;
                }
                reject(new Error('Failed to start server'));
            });
        });
    }
    stop() {
        this.server.close();
    }
    getConfig() {
        return { ...this.config };
    }
    info(message) {
        const messageWithClassName = `[OpenAILanguageModelServer] ${message}`;
        this.logService.info(messageWithClassName);
    }
    error(message) {
        const messageWithClassName = `[OpenAILanguageModelServer] ${message}`;
        this.logService.error(messageWithClassName);
    }
    exception(err, message) {
        this.logService.error(err, message);
    }
    trace(message) {
        const messageWithClassName = `[OpenAILanguageModelServer] ${message}`;
        this.logService.trace(messageWithClassName);
    }
    warn(message) {
        const messageWithClassName = `[OpenAILanguageModelServer] ${message}`;
        this.logService.warn(messageWithClassName);
    }
};
exports.OpenAILanguageModelServer = OpenAILanguageModelServer;
exports.OpenAILanguageModelServer = OpenAILanguageModelServer = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, instantiation_1.IInstantiationService)
], OpenAILanguageModelServer);
let StreamingPassThroughEndpoint = class StreamingPassThroughEndpoint {
    constructor(base, responseStream, requestBody, requestHeaders, userAgentPrefix, chatMLFetcher, instantiationService) {
        this.base = base;
        this.responseStream = responseStream;
        this.requestBody = requestBody;
        this.requestHeaders = requestHeaders;
        this.userAgentPrefix = userAgentPrefix;
        this.chatMLFetcher = chatMLFetcher;
        this.instantiationService = instantiationService;
    }
    get urlOrRequestMetadata() {
        return this.base.urlOrRequestMetadata;
    }
    getExtraHeaders() {
        const headers = this.base.getExtraHeaders?.() ?? {};
        if (this.requestHeaders['user-agent']) {
            headers['User-Agent'] = this.getUserAgent(this.requestHeaders['user-agent']);
        }
        return headers;
    }
    getEndpointFetchOptions() {
        return {
            suppressIntegrationId: true
        };
    }
    getUserAgent(incomingUserAgent) {
        const slashIndex = incomingUserAgent.indexOf('/');
        if (slashIndex === -1) {
            return `${this.userAgentPrefix}/${incomingUserAgent}`;
        }
        return `${this.userAgentPrefix}${incomingUserAgent.substring(slashIndex)}`;
    }
    interceptBody(body) {
        this.base.interceptBody?.(body);
    }
    acquireTokenizer() {
        return this.base.acquireTokenizer();
    }
    get modelMaxPromptTokens() {
        return this.base.modelMaxPromptTokens;
    }
    get maxOutputTokens() {
        return this.base.maxOutputTokens;
    }
    get model() {
        return this.base.model;
    }
    get name() {
        return this.base.name;
    }
    get version() {
        return this.base.version;
    }
    get family() {
        return this.base.family;
    }
    get tokenizer() {
        return this.base.tokenizer;
    }
    get showInModelPicker() {
        return this.base.showInModelPicker;
    }
    get isPremium() {
        return this.base.isPremium;
    }
    get degradationReason() {
        return this.base.degradationReason;
    }
    get multiplier() {
        return this.base.multiplier;
    }
    get restrictedToSkus() {
        return this.base.restrictedToSkus;
    }
    get isDefault() {
        return this.base.isDefault;
    }
    get isFallback() {
        return this.base.isFallback;
    }
    get customModel() {
        return this.base.customModel;
    }
    get isExtensionContributed() {
        return this.base.isExtensionContributed;
    }
    get apiType() {
        return this.base.apiType;
    }
    get supportsThinkingContentInHistory() {
        return this.base.supportsThinkingContentInHistory;
    }
    get supportsToolCalls() {
        return this.base.supportsToolCalls;
    }
    get supportsVision() {
        return this.base.supportsVision;
    }
    get supportsPrediction() {
        return this.base.supportsPrediction;
    }
    get supportedEditTools() {
        return this.base.supportedEditTools;
    }
    get policy() {
        return this.base.policy;
    }
    async processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        const body = (await response.body());
        return new async_1.AsyncIterableObject(async (feed) => {
            // We parse the stream just to return a correct ChatCompletion for logging the response and token usage details.
            const requestId = response.headers.get('X-Request-ID') ?? (0, uuid_1.generateUuid)();
            const ghRequestId = response.headers.get('x-github-request-id') ?? '';
            const processor = this.instantiationService.createInstance(responsesApi_1.OpenAIResponsesProcessor, telemetryData, requestId, ghRequestId);
            const parser = new sseParser_1.SSEParser((ev) => {
                try {
                    logService.trace(`[StreamingPassThroughEndpoint] SSE: ${ev.data}`);
                    const completion = processor.push({ type: ev.type, ...JSON.parse(ev.data) }, finishCallback);
                    if (completion) {
                        feed.emitOne(completion);
                    }
                }
                catch (e) {
                    feed.reject(e);
                }
            });
            try {
                for await (const chunk of body) {
                    if (cancellationToken?.isCancellationRequested) {
                        break;
                    }
                    this.responseStream.write(chunk);
                    parser.feed(chunk);
                }
            }
            finally {
                if (!body.destroyed) {
                    body.destroy();
                }
            }
        });
    }
    acceptChatPolicy() {
        return this.base.acceptChatPolicy();
    }
    makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest) {
        throw new Error('not implemented');
    }
    makeChatRequest2(options, token) {
        return this.chatMLFetcher.fetchOne({
            requestOptions: {},
            ...options,
            endpoint: this,
        }, token);
    }
    createRequestBody(options) {
        return this.requestBody;
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        throw new Error('not implemented');
    }
};
StreamingPassThroughEndpoint = __decorate([
    __param(5, chatMLFetcher_1.IChatMLFetcher),
    __param(6, instantiation_1.IInstantiationService)
], StreamingPassThroughEndpoint);
//# sourceMappingURL=oaiLanguageModelServer.js.map