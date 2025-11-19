import dotenv from 'dotenv';

dotenv.config();

export const config = {
	zai: {
		apiKey: process.env.ZAI_API_KEY || '',
		apiUrl: process.env.ZAI_API_URL || 'https://api.z.ai/api/coding/paas/v4',
	},
	server: {
		port: parseInt(process.env.PORT || '11434', 10),
		host: process.env.HOST || '127.0.0.1',
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
		{
			name: 'GLM-4.6',
			id: 'GLM-4.6',
			capabilities: {
				tools: true,
				vision: true,
				contextLength: 128000,
			},
		},
		{
			name: 'GLM-4.5',
			id: 'GLM-4.5',
			capabilities: {
				tools: true,
				vision: false,
				contextLength: 128000,
			},
		},
		{
			name: 'GLM-4.5-Air',
			id: 'GLM-4.5-Air',
			capabilities: {
				tools: false,
				vision: false,
				contextLength: 128000,
			},
		},
	],
};
