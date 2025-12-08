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
exports.LanguageModelServer = exports.ILanguageModelServer = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const http = __importStar(require("http"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const services_1 = require("../../../util/common/services");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const vscodeTypes_1 = require("../../../vscodeTypes");
const anthropicAdapter_1 = require("./adapters/anthropicAdapter");
exports.ILanguageModelServer = (0, services_1.createServiceIdentifier)('ILanguageModelServer');
let LanguageModelServer = class LanguageModelServer {
    constructor(logService, endpointProvider) {
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.config = {
            port: 0, // Will be set to random available port
            nonce: 'vscode-lm-' + (0, uuid_1.generateUuid)()
        };
        this.adapterFactories = new Map();
        this.adapterFactories.set('/v1/messages', new anthropicAdapter_1.AnthropicAdapterFactory());
        this.server = this.createServer();
    }
    createServer() {
        return http.createServer(async (req, res) => {
            this.logService.trace(`Received request: ${req.method} ${req.url}`);
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            if (req.method === 'POST') {
                const adapterFactory = this.getAdapterFactoryForPath(req.url || '');
                if (adapterFactory) {
                    try {
                        // Create new adapter instance for this request
                        const adapter = adapterFactory.createAdapter();
                        const body = await this.readRequestBody(req);
                        // Verify nonce for authentication
                        const authKey = adapter.extractAuthKey(req.headers);
                        if (authKey !== this.config.nonce) {
                            this.logService.trace(`[LanguageModelServer] Invalid auth key`);
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Invalid authentication' }));
                            return;
                        }
                        await this.handleChatRequest(adapter, body, res);
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
    parseUrlPathname(url) {
        try {
            const parsedUrl = new URL(url, 'http://localhost');
            return parsedUrl.pathname;
        }
        catch {
            return url.split('?')[0];
        }
    }
    getAdapterFactoryForPath(url) {
        const pathname = this.parseUrlPathname(url);
        return this.adapterFactories.get(pathname);
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
    async handleChatRequest(adapter, body, res) {
        try {
            const parsedRequest = adapter.parseRequest(body);
            const endpoints = await this.endpointProvider.getAllChatEndpoints();
            if (endpoints.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No language models available' }));
                return;
            }
            const selectedEndpoint = this.selectEndpoint(endpoints, parsedRequest.model);
            if (!selectedEndpoint) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'No model found matching criteria'
                }));
                return;
            }
            // Set up streaming response
            res.writeHead(200, {
                'Content-Type': adapter.getContentType(),
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
            // Create cancellation token for the request
            const tokenSource = new cancellation_1.CancellationTokenSource();
            // Handle client disconnect
            let requestComplete = false;
            res.on('close', () => {
                if (!requestComplete) {
                    this.logService.info(`[LanguageModelServer] Client disconnected before request complete`);
                }
                tokenSource.cancel();
            });
            try {
                // Create streaming context with only essential shared data
                const context = {
                    requestId: `req_${Math.random().toString(36).substr(2, 20)}`,
                    endpoint: {
                        modelId: selectedEndpoint.model,
                        modelMaxPromptTokens: selectedEndpoint.modelMaxPromptTokens
                    }
                };
                // Send initial events if adapter supports them
                if (adapter.generateInitialEvents) {
                    const initialEvents = adapter.generateInitialEvents(context);
                    for (const event of initialEvents) {
                        res.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
                    }
                }
                const userInitiatedRequest = parsedRequest.messages.at(-1)?.role === prompt_tsx_1.Raw.ChatRole.User;
                const fetchResult = await selectedEndpoint.makeChatRequest2({
                    debugName: 'agentLMServer' + (parsedRequest.type ? `-${parsedRequest.type}` : ''),
                    messages: parsedRequest.messages,
                    finishedCb: async (_fullText, _index, delta) => {
                        if (tokenSource.token.isCancellationRequested) {
                            return 0; // stop
                        }
                        // Emit text deltas
                        if (delta.text) {
                            const textData = {
                                type: 'text',
                                content: delta.text
                            };
                            for (const event of adapter.formatStreamResponse(textData, context)) {
                                res.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
                            }
                        }
                        // Emit tool calls if present
                        if (delta.copilotToolCalls && delta.copilotToolCalls.length > 0) {
                            for (const call of delta.copilotToolCalls) {
                                let input = {};
                                try {
                                    input = call.arguments ? JSON.parse(call.arguments) : {};
                                }
                                catch {
                                    input = {};
                                }
                                const toolData = {
                                    type: 'tool_call',
                                    callId: call.id,
                                    name: call.name,
                                    input
                                };
                                for (const event of adapter.formatStreamResponse(toolData, context)) {
                                    res.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
                                }
                            }
                        }
                        return undefined;
                    },
                    location: commonTypes_1.ChatLocation.Agent,
                    requestOptions: parsedRequest.options,
                    userInitiatedRequest,
                    telemetryProperties: {
                        messageSource: `lmServer-${adapter.name}`
                    }
                }, tokenSource.token);
                // Capture usage information if available
                let usage;
                if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Success && fetchResult.usage) {
                    usage = fetchResult.usage;
                }
                requestComplete = true;
                // Send final events
                const finalEvents = adapter.generateFinalEvents(context, usage);
                for (const event of finalEvents) {
                    res.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
                }
                res.end();
            }
            catch (error) {
                requestComplete = true;
                if (error instanceof vscodeTypes_1.LanguageModelError) {
                    res.write(JSON.stringify({
                        error: 'Language model error',
                        code: error.code,
                        message: error.message,
                        cause: error.cause
                    }));
                }
                else {
                    res.write(JSON.stringify({
                        error: 'Request failed',
                        message: error instanceof Error ? error.message : String(error)
                    }));
                }
                res.end();
            }
            finally {
                tokenSource.dispose();
            }
        }
        catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Failed to process chat request',
                details: error instanceof Error ? error.message : String(error)
            }));
        }
    }
    selectEndpoint(endpoints, requestedModel) {
        if (requestedModel) {
            // Handle model mapping
            let mappedModel = requestedModel;
            if (requestedModel.startsWith('claude-3-5-haiku')) {
                mappedModel = 'gpt-4o-mini';
            }
            if (requestedModel.startsWith('claude-sonnet-4')) {
                mappedModel = 'claude-sonnet-4';
            }
            // Try to find exact match first
            let selectedEndpoint = endpoints.find(e => e.family === mappedModel || e.model === mappedModel);
            // If not found, try to find by partial match for Anthropic models
            if (!selectedEndpoint && requestedModel.startsWith('claude-3-5-haiku')) {
                selectedEndpoint = endpoints.find(e => e.model.includes('gpt-4o-mini')) ?? endpoints.find(e => e.model.includes('mini'));
            }
            else if (!selectedEndpoint && requestedModel.startsWith('claude-sonnet-4')) {
                selectedEndpoint = endpoints.find(e => e.model.includes('claude-sonnet-4')) ?? endpoints.find(e => e.model.includes('claude'));
            }
            return selectedEndpoint;
        }
        // Use first available model if no criteria specified
        return endpoints[0];
    }
    async start() {
        return new Promise((resolve) => {
            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server.address();
                if (address && typeof address === 'object') {
                    this.config = {
                        ...this.config,
                        port: address.port
                    };
                    this.logService.trace(`Language Model Server started on http://localhost:${this.config.port}`);
                    resolve();
                }
            });
        });
    }
    stop() {
        this.server.close();
    }
    getConfig() {
        return { ...this.config };
    }
};
exports.LanguageModelServer = LanguageModelServer;
exports.LanguageModelServer = LanguageModelServer = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, endpointProvider_1.IEndpointProvider)
], LanguageModelServer);
//# sourceMappingURL=langModelServer.js.map