import { Router } from 'express';
import { config } from '../config.js';
import type { OllamaModel, OllamaShowResponse } from '../types.js';

const router = Router();

// GET /api/version - Ollama version endpoint
router.get('/api/version', (req, res) => {
	res.json({ version: '0.6.4' });
});

// GET /api/vendor - Vendor identification endpoint
router.get('/api/vendor', (req, res) => {
	res.json({
		vendor: 'pukuai',
		name: 'Puku AI',
		description: 'AI-powered code editor with Z.AI GLM models',
		version: '1.0.0'
	});
});

// GET /api/tags - List available models
router.get('/api/tags', (req, res) => {
	const models: OllamaModel[] = config.models.map((model) => ({
		name: model.name,
		model: model.name,
		modified_at: new Date().toISOString(),
		size: 4800000000, // ~4.8GB
		digest: 'sha256:' + Buffer.from(model.id).toString('hex').padEnd(64, '0'),
		details: {
			parent_model: '',
			format: 'gguf',
			family: 'glm',
			families: ['glm'],
			parameter_size: '9B',
			quantization_level: 'Q4_0',
		},
	}));

	res.json({ models });
});

// POST /api/show - Show model details
router.post('/api/show', (req, res) => {
	const { name } = req.body;
	const model = config.models.find((m) => m.name === name);

	if (!model) {
		return res.status(404).json({ error: 'model not found' });
	}

	const response: OllamaShowResponse = {
		modelfile: `# Modelfile for ${model.name}\nFROM ${model.id}\n`,
		parameters: 'stop [DONE]\nstop <|endoftext|>\nstop <|im_end|>',
		template: '{{ .System }}\n{{ .Prompt }}',
		details: {
			parent_model: '',
			format: 'gguf',
			family: 'glm',
			families: ['glm'],
			parameter_size: '9B',
			quantization_level: 'Q4_0',
		},
		model_info: {
			'general.architecture': 'glm',
			'general.basename': model.name,
			'general.parameter_count': 9000000000,
			'glm.context_length': model.capabilities.contextLength,
			'glm.embedding_length': 4096,
			'glm.block_count': 40,
			'glm.feed_forward_length': 13696,
			'glm.attention.head_count': 32,
			'glm.attention.head_count_kv': 2,
			'tokenizer.ggml.model': 'gpt2',
			'tokenizer.ggml.tokens': [],
		},
		capabilities: model.capabilities.tools || model.capabilities.vision ?
			[
				...(model.capabilities.tools ? ['tools'] : []),
				...(model.capabilities.vision ? ['vision'] : [])
			] : [],
	};

	res.json(response);
});

// POST /api/pull - Simulate model pull
router.post('/api/pull', (req, res) => {
	const { name } = req.body;
	const model = config.models.find((m) => m.name === name);

	if (!model) {
		return res.status(404).json({ error: 'model not found' });
	}

	// Send immediate success
	res.json({ status: 'success' });
});

export default router;
