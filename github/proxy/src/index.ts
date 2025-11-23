import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { optionalAuth } from './middleware/auth.js';
import ollamaRoutes from './routes/ollama.js';
import completionsRoutes from './routes/completions.js';
import embeddingsRoutes from './routes/embeddings.js';
import tokensRoutes from './routes/tokens.js';
import pukuApiRoutes from './routes/puku-api.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for large tool payloads
app.use(optionalAuth); // Optional authentication - validates tokens if provided

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
app.use(tokensRoutes);
app.use(pukuApiRoutes);

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
	console.log(`   - POST /v1/chat/completions (Auth: Optional)`);
	console.log(`   - POST /v1/completions (Auth: Optional)`);
	console.log(`   - POST /v1/embeddings (Auth: Optional)`);
	console.log(`   - POST /api/tokens/issue (Issue new token)`);
	console.log(`   - POST /api/tokens/register (Register token)`);
	console.log(`   - GET  /api/tokens (Auth: Required)`);
	console.log(`   - GET  /api/tokens/validate (Auth: Required)`);
	console.log(`   - DELETE /api/tokens/:token (Auth: Required)`);
	console.log(`   - GET  /puku/v1/models (Puku embedding models)`);
	console.log(`   - GET  /puku/v1/token (Puku auth token)`);
	console.log(`   - POST /puku/v1/embeddings (Puku embeddings)`);
	console.log(`   - GET  /puku/v1/status (Puku indexing status)`);
	console.log(`\n💡 Authentication: Bearer token in Authorization header`);
	console.log(`   Example: Authorization: Bearer your-token-here`);
	console.log();
});
