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

		// Enhance messages for GLM model compatibility
		// Note: We don't modify existing system messages as they contain important Copilot prompts
		let messages = request.messages;

		// Add identity system message at the beginning if messages exist
		const hasSystemMessage = messages.some(m => m.role === 'system');
		if (!hasSystemMessage) {
			messages = [
				{
					role: 'system' as const,
					content: `You are a highly capable AI coding assistant. You help users with software development tasks including writing, debugging, explaining, and optimizing code.

Key guidelines:
- Provide detailed, helpful, and accurate responses
- When explaining code, be thorough but clear
- Include code examples when appropriate
- Explain your reasoning when solving problems
- Be conversational and professional
- When asked "who are you", describe yourself as an AI coding assistant built into this code editor`
				},
				...messages
			];
		}

		// Convert to Z.AI format
		const zaiRequest = {
			model: modelId,
			messages: messages,
			temperature: request.temperature,
			top_p: request.top_p,
			max_tokens: request.max_tokens,
			stream: request.stream || false,
			tools: request.tools,
		};

		// Debug: Log the first system message
		const systemMsg = messages.find(m => m.role === 'system');
		if (systemMsg) {
			console.log(`[DEBUG] System message length: ${systemMsg.content.length} chars`);
			console.log(`[DEBUG] System message preview: ${systemMsg.content.substring(0, 200)}...`);
		}
		console.log(`[DEBUG] Total messages: ${messages.length}, Model: ${modelId}, Stream: ${request.stream}`);

		if (request.stream) {
			// Streaming response
			res.setHeader('Content-Type', 'text/event-stream');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');

			const stream = await zaiClient.chatCompletionStream(zaiRequest);
			const reader = stream.getReader();
			const decoder = new TextDecoder();

			try {
				let buffer = '';
				let totalContent = '';
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					// Process complete SSE events
					const lines = buffer.split('\n');
					buffer = lines.pop() || ''; // Keep incomplete line in buffer

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6).trim();
							if (data === '[DONE]') {
								console.log(`[DEBUG] Stream complete. Total content received: ${totalContent.length} chars`);
								console.log(`[DEBUG] Content preview: ${totalContent.substring(0, 200)}...`);
								res.write('data: [DONE]\n\n');
								continue;
							}

							try {
								const parsed = JSON.parse(data);
								const choice = parsed.choices?.[0];

								if (choice?.delta) {
									// Filter out reasoning_content, keep everything else
									const { reasoning_content, ...filteredDelta } = choice.delta;

									// Track content for debugging
									if (filteredDelta.content) {
										totalContent += filteredDelta.content;
									}

									// Always forward the chunk if it has any delta content
									// This ensures the stream doesn't appear empty during reasoning
									const filtered = {
										...parsed,
										choices: [{
											...choice,
											delta: filteredDelta
										}]
									};
									res.write(`data: ${JSON.stringify(filtered)}\n\n`);
								} else if (choice) {
									// Forward non-delta choices (e.g., finish_reason)
									res.write(`data: ${JSON.stringify(parsed)}\n\n`);
								}
							} catch {
								// Skip invalid JSON
							}
						} else if (line.trim()) {
							// Forward non-data lines as-is
							res.write(line + '\n');
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

		// Convert FIM request to chat format with improved prompting for GLM models
		let prompt: string;
		if (request.suffix && request.suffix.trim()) {
			// FIM with suffix - provide clear context about what comes before and after
			prompt = `Complete the missing code. You are given code before and after the cursor position.

CODE BEFORE CURSOR:
\`\`\`
${request.prompt}
\`\`\`

CODE AFTER CURSOR:
\`\`\`
${request.suffix}
\`\`\`

Write ONLY the code that belongs between these two sections. Do not repeat the before/after code. Do not add explanations. Output only the completion code.`;
		} else {
			// Simple completion - continue the code naturally
			prompt = `Continue this code naturally. Complete the next logical lines.

EXISTING CODE:
\`\`\`
${request.prompt}
\`\`\`

Write ONLY the next lines of code that continue from where it left off. Do not repeat existing code. Do not add explanations or markdown. Output only the completion code.`;
		}

		const zaiRequest = {
			model: modelId,
			messages: [
				{
					role: 'system' as const,
					content: 'You are an expert code completion assistant. Generate only the missing code, nothing else. Never include markdown formatting, explanations, or comments. Just raw code.',
				},
				{
					role: 'user' as const,
					content: prompt,
				},
			],
			temperature: request.temperature ?? 0.3,
			top_p: request.top_p ?? 0.95,
			max_tokens: request.max_tokens ?? 500,
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
