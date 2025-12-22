# PRD: API Integration - Overview

**Version:** 1.0
**Status:** Draft
**Last Updated:** December 2024
**Related**: [Main Overview](../01-overview.md)

---

## 1. Overview

Define how Puku inline chat integrates with the Puku AI API for chat completions, including request/response handling, streaming, error recovery, and authentication.

### Goals

- ✅ HTTP client for `/v1/chat/completions` endpoint
- ✅ Streaming support (Server-Sent Events)
- ✅ Authentication with Puku API keys
- ✅ Error handling and retries
- ✅ Rate limiting and quota management
- ✅ Model selection and configuration

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   API INTEGRATION ARCHITECTURE                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. REQUEST LAYER                                            │
│     ┌────────────────────────────────────────────┐          │
│     │ PukuInlineChatHandler                       │          │
│     │ ├─ buildRequest()                           │          │
│     │ ├─ validate()                               │          │
│     │ └─ prepareHeaders()                         │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  2. API CLIENT                                               │
│     ┌────────────────▼───────────────────────────┐          │
│     │ PukuApiClient                               │          │
│     │ ├─ post()                                   │          │
│     │ ├─ stream()                                 │          │
│     │ └─ handleResponse()                         │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  3. AUTHENTICATION                                           │
│     ┌────────────────▼───────────────────────────┐          │
│     │ PukuAuthService                             │          │
│     │ ├─ getApiKey()                              │          │
│     │ ├─ validateKey()                            │          │
│     │ └─ refreshToken()                           │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  4. NETWORK LAYER                                            │
│     ┌────────────────▼───────────────────────────┐          │
│     │ POST /v1/chat/completions                   │          │
│     │ Headers:                                     │          │
│     │   Authorization: Bearer pk_xxx              │          │
│     │   Content-Type: application/json            │          │
│     │ Body: { model, messages, stream, ... }     │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  5. RESPONSE LAYER (SSE Stream)                              │
│     ┌────────────────▼───────────────────────────┐          │
│     │ data: {"choices":[{"delta":{"content":""}}]}│          │
│     │ data: {"choices":[{"delta":{"content":"f"}}]}│          │
│     │ data: {"choices":[{"delta":{"content":"u"}}]}│          │
│     │ data: [DONE]                                 │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  6. STREAM PROCESSOR                                         │
│     ┌────────────────▼───────────────────────────┐          │
│     │ StreamParser                                │          │
│     │ ├─ parseSSE()                               │          │
│     │ ├─ accumulate()                             │          │
│     │ └─ emit()                                   │          │
│     └────────────────┬───────────────────────────┘          │
│                      │                                        │
│  7. ERROR HANDLING                                           │
│     ┌────────────────▼───────────────────────────┐          │
│     │ ErrorHandler                                │          │
│     │ ├─ retry (exponential backoff)             │          │
│     │ ├─ fallback (cache, default)               │          │
│     │ └─ notify (user feedback)                  │          │
│     └────────────────────────────────────────────┘          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Request Flow

### 3.1 Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SUBMITS REQUEST                                      │
│    User types: "add error handling" → Presses Enter        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BUILD REQUEST                                            │
│    {                                                         │
│      model: "glm-4.6",                                      │
│      messages: [                                            │
│        {role: "system", content: "You are..."},            │
│        {role: "user", content: "Fix..."}                   │
│      ],                                                     │
│      stream: true,                                          │
│      temperature: 0.7                                       │
│    }                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTHENTICATION                                           │
│    apiKey = await authService.getApiKey()                  │
│    headers = {                                              │
│      "Authorization": `Bearer ${apiKey}`,                   │
│      "Content-Type": "application/json"                     │
│    }                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SEND HTTP REQUEST                                        │
│    POST https://api.puku.sh/v1/chat/completions            │
│    Status: 200 OK                                           │
│    Content-Type: text/event-stream                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RECEIVE SSE STREAM                                       │
│    data: {"id":"chatcmpl-xxx",...}                         │
│    data: {"choices":[{"delta":{"content":"function"}}]}    │
│    data: {"choices":[{"delta":{"content":" divide"}}]}     │
│    data: [DONE]                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. PARSE & ACCUMULATE                                       │
│    Accumulated: "function divide(a: number, b: number)..."  │
│    Emit chunks to UI in real-time                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. COMPLETE                                                 │
│    Final text: "function divide(a: number, b: number) {..." │
│    Show diff preview                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints

### 4.1 Chat Completions

**Endpoint**: `POST /v1/chat/completions`

**Base URL**: Configurable (default: `https://api.puku.sh`)

**Authentication**: Bearer token (API key)

**Rate Limits**:
- Free tier: 10 requests/minute
- Pro tier: 100 requests/minute
- Enterprise: Unlimited

---

## 5. Request Format

### 5.1 Request Schema

```typescript
interface ChatCompletionRequest {
  model: string;                    // "glm-4.6", "deepseek-chat", etc.
  messages: ChatMessage[];          // Conversation history
  stream?: boolean;                 // Enable streaming (default: false)
  temperature?: number;             // 0-2 (default: 0.7)
  max_tokens?: number;              // Max response tokens
  top_p?: number;                   // 0-1 (default: 1)
  frequency_penalty?: number;       // -2 to 2 (default: 0)
  presence_penalty?: number;        // -2 to 2 (default: 0)
  stop?: string | string[];         // Stop sequences
  user?: string;                    // User identifier
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;                    // Optional name for message
}
```

### 5.2 Example Request

```json
{
  "model": "glm-4.6",
  "messages": [
    {
      "role": "system",
      "content": "You are Puku AI, an AI programming assistant.\nYou are a world class expert in programming, and especially good at TypeScript."
    },
    {
      "role": "user",
      "content": "Fix this code by adding error handling:\n\n```typescript\nfunction divide(a, b) {\n  return a / b;\n}\n```\n\nSimilar patterns in your workspace:\n\n```typescript\n// From: src/utils/math.ts\nfunction safeMod(a: number, b: number): number {\n  if (b === 0) {\n    throw new Error('Modulo by zero');\n  }\n  return a % b;\n}\n```"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 2000,
  "stop": ["```\n\n", "\n\n\n"]
}
```

---

## 6. Response Format

### 6.1 Streaming Response (SSE)

**Content-Type**: `text/event-stream`

**Format**: Server-Sent Events (SSE)

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"```"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"typescript"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"\n"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{"content":"function"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1702000000,"model":"glm-4.6","choices":[{"index":0,"delta":{},"finish_reason":"stop","usage":{"prompt_tokens":256,"completion_tokens":128,"total_tokens":384}}]}

data: [DONE]
```

### 6.2 Response Schema

```typescript
interface ChatCompletionChunk {
  id: string;                       // Unique completion ID
  object: 'chat.completion.chunk';
  created: number;                  // Unix timestamp
  model: string;                    // Model used
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;             // Incremental content
    };
    finish_reason: null | 'stop' | 'length' | 'content_filter';
    usage?: {                       // Only in final chunk
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
}
```

---

## 7. Implementation Details

### 7.1 API Client

```typescript
export class PukuApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authService: IPukuAuthService,
    private readonly fetcherService: IFetcherService,
    private readonly logService: ILogService
  ) {}

  async chatCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    token: vscode.CancellationToken
  ): Promise<ChatCompletionResponse> {
    const apiKey = await this.authService.getApiKey();
    if (!apiKey) {
      throw new Error('No API key configured');
    }

    const url = `${this.baseUrl}/v1/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    this.logService.info(`[PukuApiClient] POST ${url}`);
    this.logService.debug(`[PukuApiClient] Request:`, JSON.stringify(request, null, 2));

    try {
      if (request.stream) {
        return await this.streamingRequest(url, headers, request, onChunk, token);
      } else {
        return await this.regularRequest(url, headers, request, token);
      }
    } catch (error) {
      this.logService.error(`[PukuApiClient] Error:`, error);
      throw this.handleError(error);
    }
  }

  private async streamingRequest(
    url: string,
    headers: Record<string, string>,
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    token: vscode.CancellationToken
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: this.createAbortSignal(token)
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return await this.parseSSEStream(response.body!, onChunk, token);
  }

  private async parseSSEStream(
    stream: ReadableStream,
    onChunk: (chunk: string) => void,
    token: vscode.CancellationToken
  ): Promise<ChatCompletionResponse> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let usage: TokenUsage | undefined;

    try {
      while (true) {
        if (token.isCancellationRequested) {
          reader.cancel();
          throw new CancellationError();
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const chunk: ChatCompletionChunk = JSON.parse(data);
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content);
              }

              if (chunk.choices[0]?.usage) {
                usage = chunk.choices[0].usage;
              }
            } catch (e) {
              this.logService.warn(`[PukuApiClient] Failed to parse chunk:`, data);
            }
          }
        }
      }

      return {
        id: generateUuid(),
        content: fullContent,
        usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: request.model,
        finish_reason: 'stop'
      };
    } finally {
      reader.releaseLock();
    }
  }

  private createAbortSignal(token: vscode.CancellationToken): AbortSignal {
    const controller = new AbortController();
    token.onCancellationRequested(() => controller.abort());
    return controller.signal;
  }

  private handleError(error: any): Error {
    if (error instanceof ApiError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new CancellationError();
    }

    if (error.message?.includes('ECONNREFUSED')) {
      return new NetworkError('Cannot connect to Puku API. Check your internet connection.');
    }

    return new Error(`API request failed: ${error.message}`);
  }
}
```

---

## 8. Error Handling

### 8.1 Error Types

```typescript
class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: string
  ) {
    super(`API Error ${statusCode}: ${body}`);
  }
}

class RateLimitError extends ApiError {
  constructor(
    public readonly retryAfter: number  // seconds
  ) {
    super(429, 'Rate limit exceeded');
  }
}

class AuthenticationError extends ApiError {
  constructor() {
    super(401, 'Invalid API key');
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
  }
}
```

### 8.2 Retry Strategy

```typescript
class RetryHandler {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication errors
        if (error instanceof AuthenticationError) {
          throw error;
        }

        // Don't retry on cancellation
        if (error instanceof CancellationError) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        this.logService.warn(`[RetryHandler] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 9. Performance Optimization

### 9.1 Request Caching

```typescript
class RequestCache {
  private cache = new Map<string, CachedResponse>();
  private readonly TTL = 5 * 60 * 1000;  // 5 minutes

  async getOrFetch(
    request: ChatCompletionRequest,
    fetcher: () => Promise<ChatCompletionResponse>
  ): Promise<ChatCompletionResponse> {
    const key = this.hashRequest(request);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      this.logService.info('[RequestCache] Cache hit');
      return cached.response;
    }

    const response = await fetcher();
    this.cache.set(key, { response, timestamp: Date.now() });
    return response;
  }

  private hashRequest(request: ChatCompletionRequest): string {
    // Hash based on model + messages (ignore stream, temperature)
    const key = {
      model: request.model,
      messages: request.messages
    };
    return JSON.stringify(key);
  }
}
```

### 9.2 Connection Pooling

```typescript
class ConnectionPool {
  private readonly maxConnections = 5;
  private activeConnections = 0;
  private queue: Array<() => void> = [];

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeConnections >= this.maxConnections) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    this.activeConnections++;
    try {
      return await fn();
    } finally {
      this.activeConnections--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
```

---

## 10. Related Documents

- [Request Examples](./02-request-examples.md)
- [Response Parsing](./03-response-parsing.md)
- [Error Handling](./04-error-handling.md)
- [Authentication](./05-authentication.md)
- [Streaming](./06-streaming.md)

---

**Next**: [Request Examples](./02-request-examples.md)
