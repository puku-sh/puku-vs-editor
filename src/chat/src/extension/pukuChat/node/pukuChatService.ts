/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuIndexingService, PukuIndexingStatus } from '../../pukuIndexing/node/pukuIndexingService';
import { IPukuChatService, PukuChatStatus } from '../common/pukuChatService';
import {
	ChatMessage,
	PukuChatChunk,
	PukuChatOptions,
	PukuChatResponse,
	PukuContextChunk,
} from '../common/types';
import { PukuProxyClient } from './pukuProxyClient';

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
export class PukuChatService extends Disposable implements IPukuChatService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeStatus = this._register(new Emitter<PukuChatStatus>());
	readonly onDidChangeStatus: Event<PukuChatStatus> = this._onDidChangeStatus.event;

	private _status: PukuChatStatus = PukuChatStatus.Uninitialized;
	private _proxyClient: PukuProxyClient;

	constructor(
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
	) {
		super();

		// Get proxy endpoint from config or use default
		const config = vscode.workspace.getConfiguration('puku');
		const endpoint = config.get<string>('proxyEndpoint') || 'http://127.0.0.1:11434';
		this._proxyClient = new PukuProxyClient(endpoint);
	}

	get status(): PukuChatStatus {
		return this._status;
	}

	async initialize(): Promise<void> {
		try {
			// Check if proxy is available
			const proxyAvailable = await this._proxyClient.isAvailable();
			if (!proxyAvailable) {
				console.warn('[PukuChatService] Proxy not available at', this._proxyClient.endpoint);
				this._setStatus(PukuChatStatus.Error);
				return;
			}

			console.log('[PukuChatService] Proxy connected at', this._proxyClient.endpoint);
			this._setStatus(PukuChatStatus.Ready);
		} catch (error) {
			console.error('[PukuChatService] Initialization failed:', error);
			this._setStatus(PukuChatStatus.Error);
		}
	}

	isReady(): boolean {
		return this._status === PukuChatStatus.Ready;
	}

	isIndexingReady(): boolean {
		return this._indexingService.status === PukuIndexingStatus.Ready;
	}

	getIndexingStats(): { fileCount: number; chunkCount: number; status: string } {
		const files = this._indexingService.getIndexedFiles();
		return {
			fileCount: files.length,
			chunkCount: files.reduce((sum, f) => sum + f.chunks, 0),
			status: this._indexingService.status,
		};
	}

	async getWorkspaceContext(query: string, limit: number = 10): Promise<PukuContextChunk[]> {
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
		} catch (error) {
			console.error('[PukuChatService] Context retrieval failed:', error);
			return [];
		}
	}

	async *chat(
		query: string,
		options: PukuChatOptions = {},
		token?: { isCancellationRequested: boolean }
	): AsyncIterable<PukuChatChunk> {
		if (!this.isReady()) {
			yield { type: 'error', error: 'Chat service not ready' };
			return;
		}

		this._setStatus(PukuChatStatus.Busy);

		try {
			// 1. Get workspace context if enabled
			let contextChunks: PukuContextChunk[] = [];
			if (options.includeWorkspaceContext !== false) {
				contextChunks = await this.getWorkspaceContext(query, options.maxContextChunks || 10);
				console.log(`[PukuChatService] Retrieved ${contextChunks.length} context chunks`);

				// Yield references for context chunks
				for (const chunk of contextChunks) {
					yield {
						type: 'reference',
						reference: new vscode.Location(
							chunk.uri,
							new vscode.Range(chunk.lineStart - 1, 0, chunk.lineEnd - 1, 0)
						),
					};
				}
			}

			// 2. Build messages
			const messages = this._buildMessages(query, contextChunks, options);

			// 3. Stream response from proxy
			for await (const chunk of this._proxyClient.chatStream(
				messages,
				{
					model: options.model,
					temperature: options.temperature,
					maxTokens: options.maxTokens,
				},
				token
			)) {
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
		} catch (error) {
			console.error('[PukuChatService] Chat failed:', error);
			yield { type: 'error', error: String(error) };
		} finally {
			this._setStatus(PukuChatStatus.Ready);
		}
	}

	async chatComplete(query: string, options: PukuChatOptions = {}): Promise<PukuChatResponse> {
		if (!this.isReady()) {
			throw new Error('Chat service not ready');
		}

		this._setStatus(PukuChatStatus.Busy);

		try {
			// 1. Get workspace context if enabled
			let contextChunks: PukuContextChunk[] = [];
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
					type: 'function' as const,
					function: tc.function,
				})),
			};
		} finally {
			this._setStatus(PukuChatStatus.Ready);
		}
	}

	/**
	 * Build chat messages with context
	 */
	private _buildMessages(
		query: string,
		contextChunks: PukuContextChunk[],
		options: PukuChatOptions
	): ChatMessage[] {
		const messages: ChatMessage[] = [];

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
			const selection = ctx.selection!;
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

	private _setStatus(status: PukuChatStatus): void {
		if (this._status !== status) {
			this._status = status;
			this._onDidChangeStatus.fire(status);
		}
	}
}
