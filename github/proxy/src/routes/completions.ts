import { Router } from 'express';
import { ZAIClient } from '../zai-client.js';
import { config } from '../config.js';
import type { ChatCompletionRequest, CompletionRequest } from '../types.js';

const router = Router();
const zaiClient = new ZAIClient();

// POST /v1/chat/completions - Chat completions endpoint
router.post('/v1/chat/completions', async (req, res) => {
	try {
		const request: ChatCompletionRequest = req.body;

		// Find the model configuration
		const modelConfig = config.models.find((m) => m.name === request.model);
		const modelId = modelConfig?.id || config.models[0].id;

		// Convert to Z.AI format
		const zaiRequest = {
			model: modelId,
			messages: request.messages,
			temperature: request.temperature,
			top_p: request.top_p,
			max_tokens: request.max_tokens,
			stream: request.stream || false,
			tools: request.tools,
		};

		if (request.stream) {
			// Streaming response
			res.setHeader('Content-Type', 'text/event-stream');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');

			const stream = await zaiClient.chatCompletionStream(zaiRequest);
			const reader = stream.getReader();
			const decoder = new TextDecoder();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					res.write(chunk);
				}
				res.end();
			} catch (error) {
				console.error('Streaming error:', error);
				res.end();
			}
		} else {
			// Non-streaming response
			const response = await zaiClient.chatCompletion(zaiRequest);
			res.json(response);
		}
	} catch (error) {
		console.error('Chat completion error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

// POST /v1/completions - FIM (Fill-In-Middle) completions endpoint
router.post('/v1/completions', async (req, res) => {
	try {
		const request: CompletionRequest = req.body;

		// Find the model configuration
		const modelConfig = config.models.find((m) => m.name === request.model);
		const modelId = modelConfig?.id || config.models[0].id;

		// Convert FIM request to chat format
		let prompt: string;
		if (request.suffix && request.suffix.trim()) {
			// FIM with suffix - use markers
			prompt = `You are a code completion assistant. Complete the code between <CODE_BEFORE> and <CODE_AFTER>.

<CODE_BEFORE>
${request.prompt}
<CODE_AFTER>
${request.suffix}

Provide ONLY the code that should go between <CODE_BEFORE> and <CODE_AFTER>. Do not include explanations, markdown formatting, or any other text. Just the code completion.`;
		} else {
			// Simple completion - just continue the code
			prompt = `You are a code completion assistant. Continue the following code naturally:

${request.prompt}

Provide ONLY the code continuation. Do not include explanations, markdown formatting, or any other text. Just the code.`;
		}

		const zaiRequest = {
			model: modelId,
			messages: [
				{
					role: 'user' as const,
					content: prompt,
				},
			],
			temperature: request.temperature ?? 0.2,
			top_p: request.top_p ?? 0.95,
			max_tokens: request.max_tokens ?? 200,
			stream: request.stream || false,
		};

		if (request.stream) {
			// Streaming response - convert to completions format
			res.setHeader('Content-Type', 'text/event-stream');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');

			const stream = await zaiClient.chatCompletionStream(zaiRequest);
			const reader = stream.getReader();
			const decoder = new TextDecoder();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });

					// Parse SSE data and convert chat format to completions format
					const lines = chunk.split('\n');
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') {
								res.write('data: [DONE]\n\n');
								continue;
							}
							try {
								const parsed = JSON.parse(data);
								// Convert chat completion to text completion format
								if (parsed.choices && parsed.choices[0]) {
									const choice = parsed.choices[0];
									const completionChunk = {
										id: parsed.id,
										object: 'text_completion',
										created: parsed.created,
										model: parsed.model,
										choices: [{
											text: choice.delta?.content || '',
											index: 0,
											finish_reason: choice.finish_reason,
										}],
									};
									res.write(`data: ${JSON.stringify(completionChunk)}\n\n`);
								}
							} catch (e) {
								// Skip invalid JSON
							}
						}
					}
				}
				res.end();
			} catch (error) {
				console.error('Streaming error:', error);
				res.end();
			}
		} else {
			// Non-streaming response
			const response = await zaiClient.chatCompletion(zaiRequest);

			// Convert chat completion to text completion format
			const completionResponse = {
				id: response.id,
				object: 'text_completion',
				created: response.created,
				model: response.model,
				choices: response.choices.map((choice) => ({
					text: choice.message.content,
					index: choice.index,
					finish_reason: choice.finish_reason,
				})),
				usage: response.usage,
			};

			res.json(completionResponse);
		}
	} catch (error) {
		console.error('Completion error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

export default router;
