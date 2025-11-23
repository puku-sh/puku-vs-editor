/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { ChatMessage, ProxyChatRequest, ProxyStreamChunk, ProxyTool, PukuChatModel } from '../common/types';

/**
 * Default proxy endpoint
 */
const DEFAULT_PROXY_ENDPOINT = 'http://127.0.0.1:11434';

/**
 * Puku Proxy Client
 *
 * Communicates with the Puku Proxy server for:
 * - Chat completions (streaming and non-streaming)
 * - Model information
 * - Health checks
 */
export class PukuProxyClient {
	private readonly _endpoint: string;

	constructor(endpoint?: string) {
		this._endpoint = endpoint || DEFAULT_PROXY_ENDPOINT;
	}

	/**
	 * Check if the proxy is available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const response = await fetch(`${this._endpoint}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Get available models from the proxy
	 */
	async getModels(): Promise<Array<{ id: string; name: string }>> {
		try {
			const response = await fetch(`${this._endpoint}/api/tags`);
			if (!response.ok) {
				return [];
			}
			const data = await response.json() as { models?: Array<{ name: string }> };
			return data.models?.map((m) => ({
				id: m.name,
				name: m.name,
			})) || [];
		} catch {
			return [];
		}
	}

	/**
	 * Send a chat completion request (non-streaming)
	 */
	async chatComplete(
		messages: ChatMessage[],
		options: {
			model?: PukuChatModel;
			temperature?: number;
			maxTokens?: number;
			tools?: ProxyTool[];
		} = {}
	): Promise<{
		content: string;
		model: string;
		usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
		toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
	}> {
		const request: ProxyChatRequest = {
			model: options.model || 'GLM-4.6',
			messages,
			temperature: options.temperature,
			max_tokens: options.maxTokens,
			stream: false,
			tools: options.tools,
		};

		const response = await fetch(`${this._endpoint}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Proxy request failed: ${response.status} - ${error}`);
		}

		interface ChatCompletionResponse {
			model?: string;
			choices?: Array<{
				message?: {
					content?: string;
					tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
				};
			}>;
			usage?: {
				prompt_tokens: number;
				completion_tokens: number;
				total_tokens: number;
			};
		}
		const data = await response.json() as ChatCompletionResponse;
		const choice = data.choices?.[0];

		return {
			content: choice?.message?.content || '',
			model: data.model || options.model || 'GLM-4.6',
			usage: data.usage ? {
				promptTokens: data.usage.prompt_tokens,
				completionTokens: data.usage.completion_tokens,
				totalTokens: data.usage.total_tokens,
			} : undefined,
			toolCalls: choice?.message?.tool_calls,
		};
	}

	/**
	 * Send a streaming chat completion request
	 */
	async *chatStream(
		messages: ChatMessage[],
		options: {
			model?: PukuChatModel;
			temperature?: number;
			maxTokens?: number;
			tools?: ProxyTool[];
		} = {},
		token?: { isCancellationRequested: boolean }
	): AsyncIterable<ProxyStreamChunk> {
		const request: ProxyChatRequest = {
			model: options.model || 'GLM-4.6',
			messages,
			temperature: options.temperature,
			max_tokens: options.maxTokens,
			stream: true,
			tools: options.tools,
		};

		const response = await fetch(`${this._endpoint}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Proxy request failed: ${response.status} - ${error}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No response body');
		}

		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				if (token?.isCancellationRequested) {
					break;
				}

				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });

				// Process complete SSE lines
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep incomplete line in buffer

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || !trimmed.startsWith('data: ')) {
						continue;
					}

					const data = trimmed.slice(6); // Remove 'data: ' prefix
					if (data === '[DONE]') {
						return;
					}

					try {
						const chunk = JSON.parse(data) as ProxyStreamChunk;
						yield chunk;
					} catch {
						// Skip malformed JSON
						console.warn('[PukuProxyClient] Failed to parse chunk:', data);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * Get the proxy endpoint
	 */
	get endpoint(): string {
		return this._endpoint;
	}
}

/**
 * Create a default proxy client instance
 */
export function createProxyClient(endpoint?: string): PukuProxyClient {
	return new PukuProxyClient(endpoint);
}
