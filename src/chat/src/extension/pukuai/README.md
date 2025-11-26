# Puku AI Provider

Puku AI is a language model provider for Puku Editor that connects to Z.AI's GLM models through a local proxy.

## Features

- Chat completions with GLM-4.6, GLM-4.5, GLM-4.5-Air
- Streaming responses
- Tool calling support for Agent mode
- Vision support (GLM-4.6)

## Configuration

Set the Puku AI endpoint in VS Code settings:

```json
{
  "github.copilot.pukuai.endpoint": "http://localhost:11434"
}
```

## Proxy Requirements

The proxy must implement:
- `/api/vendor` - Return `{"vendor": "pukuai"}`
- `/api/tags` - List available models
- `/api/show` - Get model details
- `/v1/chat/completions` - OpenAI-compatible chat endpoint

## Tool Calling Tests

### Test 1: Weather Function
```bash
curl -s -X POST 'http://127.0.0.1:11434/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "puku-ai",
    "messages": [{"role": "user", "content": "Get the current weather in Tokyo"}],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string", "description": "City name"},
              "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
          }
        }
      }
    ],
    "stream": false
  }'
```

**Response:**
```json
{
  "choices": [{
    "finish_reason": "tool_calls",
    "message": {
      "content": "\nI'll get the current weather information for Tokyo.\n",
      "role": "assistant",
      "tool_calls": [{
        "function": {
          "arguments": "{\"location\":\"Tokyo\"}",
          "name": "get_weather"
        },
        "id": "call_-8144122310409730186",
        "type": "function"
      }]
    }
  }]
}
```

### Test 2: Semantic Search
```bash
curl -s -X POST 'http://127.0.0.1:11434/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "puku-ai",
    "messages": [{"role": "user", "content": "Search for files containing the word hello"}],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "semantic_search",
          "description": "Search for code or text in the workspace",
          "parameters": {
            "type": "object",
            "properties": {
              "query": {"type": "string", "description": "Search query"}
            },
            "required": ["query"]
          }
        }
      }
    ],
    "stream": false
  }'
```

**Response:**
```json
{
  "choices": [{
    "finish_reason": "tool_calls",
    "message": {
      "content": "\nI'll search for files containing the word \"hello\" in the workspace.\n",
      "role": "assistant",
      "tool_calls": [{
        "function": {
          "arguments": "{\"query\":\"hello\"}",
          "name": "semantic_search"
        },
        "id": "call_-8149045820401814426",
        "type": "function"
      }]
    }
  }]
}
```

### Test 3: Multiple Tools (Read/Write File)
```bash
curl -s -X POST 'http://127.0.0.1:11434/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "puku-ai",
    "messages": [{"role": "user", "content": "Read the file package.json and create a new file called hello.py"}],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "read_file",
          "description": "Read contents of a file",
          "parameters": {
            "type": "object",
            "properties": {
              "path": {"type": "string", "description": "File path"}
            },
            "required": ["path"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "write_file",
          "description": "Write content to a file",
          "parameters": {
            "type": "object",
            "properties": {
              "path": {"type": "string", "description": "File path"},
              "content": {"type": "string", "description": "File content"}
            },
            "required": ["path", "content"]
          }
        }
      }
    ],
    "stream": false
  }'
```

**Response:**
```json
{
  "choices": [{
    "finish_reason": "tool_calls",
    "message": {
      "content": "\nI'll help you read the package.json file and then create a hello.py file.\n",
      "role": "assistant",
      "tool_calls": [{
        "function": {
          "arguments": "{\"path\":\"package.json\"}",
          "name": "read_file"
        },
        "id": "call_-8144121417056469314",
        "type": "function"
      }]
    }
  }]
}
```

## Streaming Test

```bash
curl -s -X POST 'http://127.0.0.1:11434/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "puku-ai",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": true
  }'
```

## Files

- `pukuaiProvider.ts` - Language model provider implementation
- `pukuaiContribution.ts` - Extension contribution that registers the provider
