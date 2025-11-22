import { Router } from 'express';
import { OpenRouterClient } from '../openrouter-client.js';
import type { EmbeddingRequest } from '../types.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const openRouterClient = new OpenRouterClient();

// POST /v1/embeddings - Embeddings endpoint compatible with OpenAI API
router.post('/v1/embeddings', async (req: AuthenticatedRequest, res) => {
	try {
		const request: EmbeddingRequest = req.body;
		
		// Log authentication status
		if (req.authToken) {
			console.log(`[Embeddings Request] Authenticated request from user: ${req.userId || 'unknown'}`);
		} else {
			console.log(`[Embeddings Request] Unauthenticated request (token optional)`);
		}

		// Validate request
		if (!request.input) {
			return res.status(400).json({
				error: {
					message: 'input is required',
					type: 'invalid_request_error',
				},
			});
		}

		// Use Codestral Embed as default for code embeddings (optimized for code retrieval)
		// Available models: mistralai/codestral-embed-2505, openai/text-embedding-3-small, qwen/qwen3-embedding-8b
		const model = request.model || 'mistralai/codestral-embed-2505';
		const dimensions = request.dimensions; // Let the model use its native dimensions

		// Log request details
		const inputType = Array.isArray(request.input) ? 'array' : 'string';
		const inputLength = Array.isArray(request.input)
			? request.input.length
			: request.input.length;
		console.log(`[Embeddings Request] Model: ${model}, Dimensions: ${dimensions}`);
		console.log(`[Embeddings Request] Input type: ${inputType}, Length: ${inputLength}`);

		// Forward to OpenRouter with default model and dimensions
		const response = await openRouterClient.createEmbedding({
			...request,
			model,
			dimensions,
		});
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

