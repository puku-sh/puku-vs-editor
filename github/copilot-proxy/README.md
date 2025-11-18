# Copilot Proxy - Ollama-Compatible Z.AI GLM Proxy

FastAPI-based Ollama-compatible proxy for Z.AI GLM models with support for inline completions (FIM) and chat.

This proxy enables Puku Editor (and other Ollama-compatible clients) to use Z.AI's GLM models (GLM-4.6, GLM-4.5, GLM-4.5-Air) for both chat completions and inline code suggestions without requiring GitHub Copilot authentication.

## Features

- **Ollama API Compatibility**: Implements Ollama API endpoints (`/api/version`, `/api/tags`, `/api/show`, `/api/vendor`)
- **FIM Completions**: Fill-In-Middle inline code completions for ghost text suggestions (`/v1/engines/{model}/completions`)
- **Chat Completions**: OpenAI-compatible chat endpoint (`/v1/chat/completions`)
- **Model Support**:
  - GLM-4.6 (flagship model with tool calling and vision support)
  - GLM-4.5 (balanced performance with tool calling)
  - GLM-4.5-Air (lightweight, faster with tool calling)
- **Smart Completion Formatting**: Strips leading newlines from completions for better inline rendering
- **Streaming Support**: Efficient streaming responses for both chat and completions

## Installation

### Prerequisites

- Python >= 3.10, <= 3.12
- [uv](https://github.com/astral-sh/uv) package manager
- Z.AI API key

### Install with uv

```bash
git clone https://github.com/jjleng/copilot-proxy.git
cd copilot-proxy

# Install dependencies
uv sync

# Set your Z.AI API key
export ZAI_API_KEY="your-api-key-here"

# Start the proxy
uv run copilot-proxy start --host 127.0.0.1 --port 11434
```

The proxy will start on `http://127.0.0.1:11434`.

## Usage with Puku Editor

1. **Configure Puku Editor** to use the proxy:

   Add to your VS Code `settings.json`:

   ```json
   {
     "github.copilot.advanced.debug.overrideProxyUrl": "http://localhost:11434",
     "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
   }
   ```

2. **Start the proxy** (if not already running):

   ```bash
   export ZAI_API_KEY="your-api-key-here"
   uv run copilot-proxy start
   ```

3. **Use in Puku Editor**:
   - **Inline completions**: Type code and see ghost text suggestions appear inline
   - **Chat**: Open Copilot Chat panel, select Ollama provider, choose a GLM model

## API Endpoints

### Ollama API

- `GET /api/version` - Returns Ollama version (0.6.4 for compatibility)
- `GET /api/vendor` - Returns vendor information
- `GET /api/tags` - Lists available GLM models
- `POST /api/show` - Shows detailed model information including capabilities

### Completions

- `POST /v1/completions` - GitHub Copilot-style FIM completions
- `POST /v1/engines/{model}/completions` - Model-specific completions endpoint

Request format:
```json
{
  "prompt": "def fibonacci(n):",
  "suffix": "\n    return result",
  "max_tokens": 200,
  "temperature": 0.2,
  "stream": true
}
```

### Chat

- `POST /v1/chat/completions` - OpenAI-compatible chat completions

Request format:
```json
{
  "model": "GLM-4.6",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}
```

## Configuration

The proxy can be configured via command-line options:

```bash
uv run copilot-proxy start --help

Options:
  --host TEXT     Host address to bind to (default: 127.0.0.1)
  --port INTEGER  Port number (default: 11434)
  --help         Show this message and exit
```

Environment variables:
- `ZAI_API_KEY` - Your Z.AI API key (required)

## Development

```bash
# Install dev dependencies
uv sync --dev

# Run with auto-reload
uv run uvicorn copilot_proxy.app:app --reload --host 127.0.0.1 --port 11434

# Format code
uv run black copilot_proxy/

# Type checking
uv run mypy copilot_proxy/
```

## Architecture

The proxy implements a FastAPI application that:

1. **Translates Ollama API calls** to Z.AI GLM API format
2. **Converts FIM completion requests** to chat format with specialized prompts
3. **Streams responses** back in the expected format (SSE for completions, OpenAI format for chat)
4. **Handles model capabilities** detection for VS Code integration (tools, vision support)

## License

MIT

## Credits

Originally based on [copilot-proxy](https://github.com/jjleng/copilot-proxy) by jjleng.

Converted to FastAPI with Ollama compatibility and FIM support for Puku Editor integration.
