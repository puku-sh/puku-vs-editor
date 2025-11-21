import { Router } from 'express';
import { OpenRouterClient } from '../openrouter-client.js';
import type { EmbeddingRequest } from '../types.js';

const router = Router();
const openRouterClient = new OpenRouterClient();

// POST /v1/embeddings - Embeddings endpoint compatible with OpenAI API
router.post('/v1/embeddings', async (req, res) => {
	try {
		const request: EmbeddingRequest = req.body;

		// Validate request
		if (!request.model) {
			return res.status(400).json({
				error: {
					message: 'model is required',
					type: 'invalid_request_error',
				},
			});
		}

		if (!request.input) {
			return res.status(400).json({
				error: {
					message: 'input is required',
					type: 'invalid_request_error',
				},
			});
		}

		// Log request details
		const inputType = Array.isArray(request.input) ? 'array' : 'string';
		const inputLength = Array.isArray(request.input)
			? request.input.length
			: request.input.length;
		console.log(`[Embeddings Request] Model: ${request.model}`);
		console.log(`[Embeddings Request] Input type: ${inputType}, Length: ${inputLength}`);

		// Forward to OpenRouter
		const response = await openRouterClient.createEmbedding(request);
		res.json(response);
	} catch (error) {
		console.error('Embeddings error:', error);
		res.status(500).json({
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				type: 'server_error',
			},
		});
	}
});

export default router;

