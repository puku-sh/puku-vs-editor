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
