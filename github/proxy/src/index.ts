import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import ollamaRoutes from './routes/ollama.js';
import completionsRoutes from './routes/completions.js';
import embeddingsRoutes from './routes/embeddings.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for large tool payloads

// Request logging
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
	next();
});

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use(ollamaRoutes);
app.use(completionsRoutes);
app.use(embeddingsRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error('Server error:', err);
	res.status(500).json({
		error: {
			message: err.message || 'Internal server error',
			type: 'server_error',
		},
	});
});

// Start server
const { host, port } = config.server;
app.listen(port, host, () => {
	console.log(`\n🚀 Copilot Proxy Server started`);
	console.log(`📍 Listening on http://${host}:${port}`);
	console.log(`\n📋 Available models:`);
	config.models.forEach((model) => {
		console.log(`   - ${model.name} (${model.id})`);
		console.log(`     Tools: ${model.capabilities.tools}, Vision: ${model.capabilities.vision}, Context: ${model.capabilities.contextLength}`);
	});
	console.log(`\n✨ Ready to proxy requests to Z.AI`);
	console.log(`\nEndpoints:`);
	console.log(`   - GET  /health`);
	console.log(`   - GET  /api/version`);
	console.log(`   - GET  /api/tags`);
	console.log(`   - POST /api/show`);
	console.log(`   - POST /api/pull`);
	console.log(`   - POST /v1/chat/completions`);
	console.log(`   - POST /v1/completions`);
	console.log(`   - POST /v1/embeddings`);
	console.log();
});
