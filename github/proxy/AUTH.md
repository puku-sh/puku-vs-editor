# Proxy Authentication

The proxy now supports token-based authentication similar to GitHub Copilot.

## Configuration

Set these environment variables to configure authentication:

```bash
# Enable authentication (default: false)
AUTH_ENABLED=true

# Require authentication for all endpoints (default: false)
AUTH_REQUIRED=true

# Set a default token (optional, for testing)
PROXY_DEFAULT_TOKEN=your-default-token-here
```

## Usage

### Making Authenticated Requests

Include a Bearer token in the Authorization header:

```bash
curl -X POST http://localhost:11434/v1/embeddings \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"input": "hello world", "model": "voyageai/voyage-code-3"}'
```

### Token Management API

#### Register a Token
```bash
POST /api/tokens/register
Content-Type: application/json

{
  "token": "your-token-here",
  "userId": "user123",  # optional
  "metadata": {          # optional
    "name": "My Token"
  }
}
```

#### List All Tokens (requires auth)
```bash
GET /api/tokens
Authorization: Bearer your-admin-token
```

#### Validate a Token (requires auth)
```bash
GET /api/tokens/validate
Authorization: Bearer token-to-validate
```

#### Revoke a Token (requires auth)
```bash
DELETE /api/tokens/:token
Authorization: Bearer your-admin-token
```

## Authentication Modes

1. **Optional Auth (Default)**: Requests work with or without tokens
2. **Required Auth**: Set `AUTH_REQUIRED=true` to require tokens for all endpoints
3. **Disabled**: Set `AUTH_ENABLED=false` to disable authentication entirely

## Integration with VS Code Extension

The extension can send tokens in requests:

```typescript
const response = await fetch('http://localhost:11434/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

