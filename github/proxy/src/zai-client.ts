import { config } from './config.js';
import { ZAIChatRequest, ZAIChatResponse } from './types.js';

export class ZAIClient {
	private apiKey: string;
	private apiUrl: string;

	constructor() {
		this.apiKey = config.zai.apiKey;
		this.apiUrl = config.zai.apiUrl;

		if (!this.apiKey) {
			throw new Error('ZAI_API_KEY is required');
		}
	}

	async chatCompletion(request: ZAIChatRequest): Promise<ZAIChatResponse> {
		const response = await fetch(`${this.apiUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Z.AI API error: ${response.status} ${error}`);
		}

		return response.json() as Promise<ZAIChatResponse>;
	}

	async chatCompletionStream(request: ZAIChatRequest): Promise<ReadableStream> {
		const response = await fetch(`${this.apiUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({ ...request, stream: true }),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Z.AI API error: ${response.status} ${error}`);
		}

		if (!response.body) {
			throw new Error('Response body is null');
		}

		return response.body;
	}
}

// OpenRouter client for FIM completions - uses better models for code completion
export class OpenRouterClient {
	private apiKey: string;
	private apiUrl: string;
	// FIM model from config
	public readonly fimModel: string;

	constructor() {
		this.apiKey = config.openrouter.apiKey;
		this.apiUrl = config.openrouter.apiUrl;
		this.fimModel = config.fimModel.model;

		if (!this.apiKey) {
			console.warn('OPENROUTER_API_KEY not set, FIM completions may not work');
		}
		console.log(`[OpenRouter] FIM model configured: ${this.fimModel}`);
	}

	async chatCompletion(request: ZAIChatRequest): Promise<ZAIChatResponse> {
		const response = await fetch(`${this.apiUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
				'HTTP-Referer': 'https://puku.sh',
				'X-Title': 'Puku Editor',
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} ${error}`);
		}

		return response.json() as Promise<ZAIChatResponse>;
	}

	async chatCompletionStream(request: ZAIChatRequest): Promise<ReadableStream> {
		const response = await fetch(`${this.apiUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
				'HTTP-Referer': 'https://puku.sh',
				'X-Title': 'Puku Editor',
			},
			body: JSON.stringify({ ...request, stream: true }),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} ${error}`);
		}

		if (!response.body) {
			throw new Error('Response body is null');
		}

		return response.body;
	}

	// Native FIM completion using /v1/completions endpoint
	async fimCompletion(request: {
		prompt: string;
		suffix?: string;
		max_tokens?: number;
		temperature?: number;
		stop?: string[];
	}): Promise<{ text: string; finish_reason: string }> {
		const response = await fetch(`${this.apiUrl}/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
				'HTTP-Referer': 'https://puku.sh',
				'X-Title': 'Puku Editor',
			},
			body: JSON.stringify({
				model: this.fimModel,
				prompt: request.prompt,
				suffix: request.suffix,
				max_tokens: request.max_tokens ?? 100,
				temperature: request.temperature ?? 0.1,
				stop: request.stop,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter FIM error: ${response.status} ${error}`);
		}

		const data = await response.json();
		return {
			text: data.choices?.[0]?.text || '',
			finish_reason: data.choices?.[0]?.finish_reason || 'stop',
		};
	}

	// Streaming FIM completion
	async fimCompletionStream(request: {
		prompt: string;
		suffix?: string;
		max_tokens?: number;
		temperature?: number;
		stop?: string[];
	}): Promise<ReadableStream> {
		const response = await fetch(`${this.apiUrl}/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
				'HTTP-Referer': 'https://puku.sh',
				'X-Title': 'Puku Editor',
			},
			body: JSON.stringify({
				model: this.fimModel,
				prompt: request.prompt,
				suffix: request.suffix,
				max_tokens: request.max_tokens ?? 100,
				temperature: request.temperature ?? 0.1,
				stop: request.stop,
				stream: true,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter FIM stream error: ${response.status} ${error}`);
		}

		if (!response.body) {
			throw new Error('Response body is null');
		}

		return response.body;
	}
}
