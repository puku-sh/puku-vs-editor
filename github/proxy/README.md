# Copilot Proxy

Express-based proxy server that bridges VS Code Copilot extensions with Z.AI's GLM models.

## Features

- ✅ Ollama API compatible endpoints
- ✅ OpenAI-compatible chat completions (`/v1/chat/completions`)
- ✅ OpenAI-compatible text completions (`/v1/completions`) with FIM support
- ✅ Supports GLM-4.6, GLM-4.5, GLM-4.5-Air models
- ✅ Tool calling support (GLM-4.6, GLM-4.5)
- ✅ Vision support (GLM-4.6)
- ✅ Streaming responses

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your Z.AI API key:
   ```
   ZAI_API_KEY=your_api_key_here
   ```

3. **Run the proxy:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

The server will start on `http://127.0.0.1:11434` by default.

## Usage with Puku Editor

1. **Configure VS Code settings:**

   Add to `.vscode/settings.json` or user settings:
   ```json
   {
     "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
   }
   ```

2. **Select Ollama provider:**
   - Open Copilot Chat panel
   - Click on the current model name
   - Click "Manage Models..."
   - Select "Ollama" from the list of providers
   - Choose your preferred GLM model

## Available Models

- **GLM-4.6** - Flagship model with tool calling and vision support
- **GLM-4.5** - Balanced performance model with tool calling
- **GLM-4.5-Air** - Lightweight, faster model

## API Endpoints

### Ollama Compatible
- `GET /api/version` - Get Ollama version
- `GET /api/tags` - List available models
- `POST /api/show` - Show model details
- `POST /api/pull` - Pull a model (no-op)

### OpenAI Compatible
- `POST /v1/chat/completions` - Chat completions (for Chat panel)
- `POST /v1/completions` - Text completions (for inline suggestions/FIM)

### Health
- `GET /health` - Health check endpoint

## FIM (Fill-In-Middle) Support

The `/v1/completions` endpoint supports FIM for inline code completions:

**Without suffix** (simple continuation):
```json
{
  "prompt": "def hello():",
  "suffix": "",
  "max_tokens": 50
}
```

**With suffix** (fill-in-middle):
```json
{
  "prompt": "def fibonacci(n):",
  "suffix": "\n    return result",
  "max_tokens": 200
}
```

## Environment Variables

- `ZAI_API_KEY` - Your Z.AI API key (required)
- `ZAI_API_URL` - Z.AI API base URL (default: `https://open.bigmodel.cn/api/paas/v4`)
- `PORT` - Server port (default: `11434`)
- `HOST` - Server host (default: `127.0.0.1`)

## License

MIT
