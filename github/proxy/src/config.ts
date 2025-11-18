import dotenv from 'dotenv';

dotenv.config();

export const config = {
	zai: {
		apiKey: process.env.ZAI_API_KEY || '',
		apiUrl: process.env.ZAI_API_URL || 'https://open.bigmodel.cn/api/paas/v4',
	},
	server: {
		port: parseInt(process.env.PORT || '11434', 10),
		host: process.env.HOST || '127.0.0.1',
	},
	models: [
		{
			name: 'GLM-4.6',
			id: 'glm-4-plus',
			capabilities: {
				tools: true,
				vision: true,
				contextLength: 128000,
			},
		},
		{
			name: 'GLM-4.5',
			id: 'glm-4-0520',
			capabilities: {
				tools: true,
				vision: false,
				contextLength: 128000,
			},
		},
		{
			name: 'GLM-4.5-Air',
			id: 'glm-4-air',
			capabilities: {
				tools: false,
				vision: false,
				contextLength: 128000,
			},
		},
	],
};
