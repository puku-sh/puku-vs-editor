import { config } from './config.js';
import { EmbeddingRequest, EmbeddingResponse } from './types.js';

export class OpenRouterClient {
	private apiKey: string;
	private apiUrl: string;

	constructor() {
		this.apiKey = config.openrouter.apiKey;
		this.apiUrl = config.openrouter.apiUrl;

		if (!this.apiKey) {
			throw new Error('OPENROUTER_API_KEY is required');
		}
	}

	async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
		const response = await fetch(`${this.apiUrl}/embeddings`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
				'HTTP-Referer': 'https://github.com/puku-editor',
				'X-Title': 'Puku Editor',
				'User-Agent': 'Puku-Editor/1.0',
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} ${error}`);
		}

		return response.json() as Promise<EmbeddingResponse>;
	}
}

