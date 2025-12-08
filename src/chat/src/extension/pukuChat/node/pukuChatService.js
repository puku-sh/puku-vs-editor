"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
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
exports.PukuChatService = void 0;
const vscode = __importStar(require("vscode"));
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const pukuIndexingService_1 = require("../../pukuIndexing/node/pukuIndexingService");
const pukuChatService_1 = require("../common/pukuChatService");
const pukuProxyClient_1 = require("./pukuProxyClient");
/**
 * System prompt for Puku Chat
 */
const PUKU_SYSTEM_PROMPT = `You are Puku AI, an intelligent coding assistant. You help users understand and write code.

IMPORTANT INSTRUCTIONS:
1. DO NOT repeat or echo the code snippets provided as context - the user can already see them as references
2. DO NOT use function calls or tools - respond only with text and markdown
3. When referencing code, just mention the file name and line numbers briefly
4. Be concise and direct in your responses
5. If you need to show new code, use markdown code blocks

When answering:
- Answer the user's question directly
- Reference files by name (e.g., "In pukuChatService.ts:45") without quoting the full code
- Only show code when writing NEW code or making specific changes
- Keep responses focused and helpful`;
/**
 * Puku Chat Service Implementation
 *
 * Integrates:
 * - IPukuIndexingService for workspace semantic search
 * - PukuProxyClient for GLM model inference
 */
let PukuChatService = class PukuChatService extends lifecycle_1.Disposable {
    constructor(_indexingService) {
        super();
        this._indexingService = _indexingService;
        this._onDidChangeStatus = this._register(new event_1.Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._status = pukuChatService_1.PukuChatStatus.Uninitialized;
        // Get proxy endpoint from config or use default
        const config = vscode.workspace.getConfiguration('puku');
        const endpoint = config.get('proxyEndpoint') || 'http://127.0.0.1:11434';
        this._proxyClient = new pukuProxyClient_1.PukuProxyClient(endpoint);
    }
    get status() {
        return this._status;
    }
    async initialize() {
        try {
            // Check if proxy is available
            const proxyAvailable = await this._proxyClient.isAvailable();
            if (!proxyAvailable) {
                console.warn('[PukuChatService] Proxy not available at', this._proxyClient.endpoint);
                this._setStatus(pukuChatService_1.PukuChatStatus.Error);
                return;
            }
            console.log('[PukuChatService] Proxy connected at', this._proxyClient.endpoint);
            this._setStatus(pukuChatService_1.PukuChatStatus.Ready);
        }
        catch (error) {
            console.error('[PukuChatService] Initialization failed:', error);
            this._setStatus(pukuChatService_1.PukuChatStatus.Error);
        }
    }
    isReady() {
        return this._status === pukuChatService_1.PukuChatStatus.Ready;
    }
    isIndexingReady() {
        return this._indexingService.status === pukuIndexingService_1.PukuIndexingStatus.Ready;
    }
    getIndexingStats() {
        const files = this._indexingService.getIndexedFiles();
        return {
            fileCount: files.length,
            chunkCount: files.reduce((sum, f) => sum + f.chunks, 0),
            status: this._indexingService.status,
        };
    }
    async getWorkspaceContext(query, limit = 10) {
        if (!this.isIndexingReady()) {
            console.log('[PukuChatService] Indexing not ready, skipping context retrieval');
            return [];
        }
        try {
            const results = await this._indexingService.search(query, limit);
            return results.map(r => ({
                uri: r.uri,
                content: r.content,
                score: r.score,
                lineStart: r.lineStart,
                lineEnd: r.lineEnd,
            }));
        }
        catch (error) {
            console.error('[PukuChatService] Context retrieval failed:', error);
            return [];
        }
    }
    async *chat(query, options = {}, token) {
        if (!this.isReady()) {
            yield { type: 'error', error: 'Chat service not ready' };
            return;
        }
        this._setStatus(pukuChatService_1.PukuChatStatus.Busy);
        try {
            // 1. Get workspace context if enabled
            let contextChunks = [];
            if (options.includeWorkspaceContext !== false) {
                contextChunks = await this.getWorkspaceContext(query, options.maxContextChunks || 10);
                console.log(`[PukuChatService] Retrieved ${contextChunks.length} context chunks`);
                // Yield references for context chunks
                for (const chunk of contextChunks) {
                    yield {
                        type: 'reference',
                        reference: new vscode.Location(chunk.uri, new vscode.Range(chunk.lineStart - 1, 0, chunk.lineEnd - 1, 0)),
                    };
                }
            }
            // 2. Build messages
            const messages = this._buildMessages(query, contextChunks, options);
            // 3. Stream response from proxy
            for await (const chunk of this._proxyClient.chatStream(messages, {
                model: options.model,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
            }, token)) {
                if (token?.isCancellationRequested) {
                    break;
                }
                const choice = chunk.choices?.[0];
                if (choice?.delta?.content) {
                    yield { type: 'content', content: choice.delta.content };
                }
                if (choice?.delta?.tool_calls) {
                    for (const tc of choice.delta.tool_calls) {
                        if (tc.function?.name) {
                            yield {
                                type: 'tool_call',
                                toolCall: {
                                    id: tc.id || '',
                                    type: 'function',
                                    function: {
                                        name: tc.function.name,
                                        arguments: tc.function.arguments || '',
                                    },
                                },
                            };
                        }
                    }
                }
            }
            yield { type: 'done' };
        }
        catch (error) {
            console.error('[PukuChatService] Chat failed:', error);
            yield { type: 'error', error: String(error) };
        }
        finally {
            this._setStatus(pukuChatService_1.PukuChatStatus.Ready);
        }
    }
    async chatComplete(query, options = {}) {
        if (!this.isReady()) {
            throw new Error('Chat service not ready');
        }
        this._setStatus(pukuChatService_1.PukuChatStatus.Busy);
        try {
            // 1. Get workspace context if enabled
            let contextChunks = [];
            if (options.includeWorkspaceContext !== false) {
                contextChunks = await this.getWorkspaceContext(query, options.maxContextChunks || 10);
            }
            // 2. Build messages
            const messages = this._buildMessages(query, contextChunks, options);
            // 3. Get complete response from proxy
            const result = await this._proxyClient.chatComplete(messages, {
                model: options.model,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
            });
            return {
                content: result.content,
                model: result.model,
                usage: result.usage,
                toolCalls: result.toolCalls?.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: tc.function,
                })),
            };
        }
        finally {
            this._setStatus(pukuChatService_1.PukuChatStatus.Ready);
        }
    }
    /**
     * Build chat messages with context
     */
    _buildMessages(query, contextChunks, options) {
        const messages = [];
        // System prompt
        messages.push({
            role: 'system',
            content: PUKU_SYSTEM_PROMPT,
        });
        // Add conversation history
        if (options.history) {
            messages.push(...options.history);
        }
        // Build user message with context
        let userContent = '';
        // Add workspace context (compact format - model should NOT repeat this)
        if (contextChunks.length > 0) {
            userContent += '<workspace_context>\n';
            for (const chunk of contextChunks) {
                const relativePath = vscode.workspace.asRelativePath(chunk.uri);
                // Truncate content to avoid overwhelming the context
                const truncatedContent = chunk.content.length > 500
                    ? chunk.content.substring(0, 500) + '\n... (truncated)'
                    : chunk.content;
                userContent += `[${relativePath}:${chunk.lineStart}-${chunk.lineEnd}]\n${truncatedContent}\n\n`;
            }
            userContent += '</workspace_context>\n\n';
        }
        // Add editor context
        if (options.editorContext?.selection?.text) {
            const ctx = options.editorContext;
            const selection = ctx.selection;
            userContent += 'Currently selected code:\n';
            userContent += `**${ctx.uri ? vscode.workspace.asRelativePath(ctx.uri) : 'Unknown file'}** `;
            userContent += `(lines ${selection.startLine}-${selection.endLine}):\n`;
            userContent += '```\n' + selection.text + '\n```\n\n';
        }
        // Add user query
        userContent += `User question: ${query}`;
        messages.push({
            role: 'user',
            content: userContent,
        });
        return messages;
    }
    _setStatus(status) {
        if (this._status !== status) {
            this._status = status;
            this._onDidChangeStatus.fire(status);
        }
    }
};
exports.PukuChatService = PukuChatService;
exports.PukuChatService = PukuChatService = __decorate([
    __param(0, pukuIndexingService_1.IPukuIndexingService)
], PukuChatService);
//# sourceMappingURL=pukuChatService.js.map