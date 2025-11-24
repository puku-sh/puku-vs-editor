import dotenv from 'dotenv';

dotenv.config();

export const config = {
	zai: {
		apiKey: process.env.ZAI_API_KEY || '',
		apiUrl: process.env.ZAI_API_URL || 'https://api.z.ai/api/coding/paas/v4',
	},
	openrouter: {
		apiKey: process.env.OPENROUTER_API_KEY || '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',
		apiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1',
	},
	server: {
		port: parseInt(process.env.PORT || '11434', 10),
		host: process.env.HOST || '127.0.0.1',
	},
	auth: {
		// Enable/disable authentication requirement
		enabled: process.env.AUTH_ENABLED === 'true',
		// Require authentication for all endpoints (if enabled)
		requireAuth: process.env.AUTH_REQUIRED === 'true',
		// Default token (optional, for testing)
		defaultToken: process.env.PROXY_DEFAULT_TOKEN,
	},
	models: [
		{
			name: 'puku-ai',
			id: 'GLM-4.6',
			capabilities: {
				tools: true,
				vision: true,
				contextLength: 128000,
			},
		},
		{
			name: 'puku-ai-air',
			id: 'GLM-4.5-Air',
			capabilities: {
				tools: false,
				vision: false,
				contextLength: 128000,
			},
		},
	],
	// FIM model configuration - uses Codestral via OpenRouter (supports native FIM)
	fimModel: {
		provider: 'openrouter',
		model: 'mistralai/codestral-2501',
	},
};
