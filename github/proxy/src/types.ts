export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatCompletionRequest {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	stream?: boolean;
	tools?: any[];
}

export interface CompletionRequest {
	model?: string;
	prompt: string;
	suffix?: string;
	max_tokens?: number;
	temperature?: number;
	top_p?: number;
	stream?: boolean;
}

export interface ZAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ZAIChatRequest {
	model: string;
	messages: ZAIMessage[];
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	stream?: boolean;
	tools?: any[];
}

export interface ZAIChatResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string;
			tool_calls?: any[];
		};
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface OllamaModel {
	name: string;
	model: string;
	modified_at: string;
	size: number;
	digest: string;
	details: {
		parent_model: string;
		format: string;
		family: string;
		families: string[];
		parameter_size: string;
		quantization_level: string;
	};
}

export interface OllamaShowResponse {
	modelfile: string;
	parameters: string;
	template: string;
	details: {
		parent_model: string;
		format: string;
		family: string;
		families: string[];
		parameter_size: string;
		quantization_level: string;
	};
	model_info: {
		[key: string]: any;
	};
	capabilities?: string[];
}

export interface EmbeddingRequest {
	model: string;
	input: string | string[];
	encoding_format?: 'float' | 'base64';
	dimensions?: number;
	user?: string;
}

export interface EmbeddingResponse {
	object: string;
	data: Array<{
		object: string;
		embedding: number[];
		index: number;
	}>;
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
}
