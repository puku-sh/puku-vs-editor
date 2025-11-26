# Puku Chat System with Semantic Indexing

## Overview

Create a new Puku Chat system that uses our custom semantic indexing (`IPukuIndexingService`) for workspace context, replacing Copilot's `IWorkspaceChunkSearchService`. This gives us full control over the RAG (Retrieval-Augmented Generation) pipeline.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COPILOT CHAT FLOW (Current)                      │
├─────────────────────────────────────────────────────────────────────┤
│  User Query                                                          │
│       ↓                                                              │
│  ChatAgents.getChatParticipantHandler()                             │
│       ↓                                                              │
│  ChatParticipantRequestHandler                                       │
│       ↓                                                              │
│  Intent Resolution (Intent.Unknown, Intent.Workspace, etc.)         │
│       ↓                                                              │
│  Prompt Building (TSX-based prompts)                                │
│       ├── WorkspaceContext (uses IWorkspaceChunkSearchService) ❌    │
│       ├── EditorContext                                              │
│       └── ConversationHistory                                        │
│       ↓                                                              │
│  Copilot/GitHub API → Response                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PUKU CHAT FLOW (New)                             │
├─────────────────────────────────────────────────────────────────────┤
│  User Query                                                          │
│       ↓                                                              │
│  PukuChatParticipant (@puku)                                        │
│       ↓                                                              │
│  PukuChatHandler                                                     │
│       ↓                                                              │
│  Puku Prompt Building                                                │
│       ├── PukuWorkspaceContext (uses IPukuIndexingService) ✅        │
│       ├── EditorContext (reuse existing)                            │
│       └── ConversationHistory                                        │
│       ↓                                                              │
│  Puku Proxy (localhost:11434) → GLM-4.6 → Response                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Create Puku Chat Service Interface
**File:** `src/extension/pukuChat/common/pukuChatService.ts`

```typescript
export interface IPukuChatService {
  readonly _serviceBrand: undefined;

  // Send a chat message with workspace context
  chat(
    query: string,
    options: PukuChatOptions
  ): AsyncIterable<PukuChatChunk>;

  // Get relevant workspace context for a query
  getWorkspaceContext(query: string, limit?: number): Promise<PukuContextChunk[]>;
}

export interface PukuChatOptions {
  model?: 'GLM-4.6' | 'GLM-4.5' | 'GLM-4.5-Air';
  temperature?: number;
  maxTokens?: number;
  includeWorkspaceContext?: boolean;
  editorContext?: EditorContext;
  history?: ChatMessage[];
}

export interface PukuContextChunk {
  uri: vscode.Uri;
  content: string;
  score: number;
  lineStart: number;
  lineEnd: number;
}
```

#### 1.2 Implement Puku Chat Service
**File:** `src/extension/pukuChat/node/pukuChatService.ts`

Key responsibilities:
- Query `IPukuIndexingService` for relevant context
- Build prompts with context
- Stream responses from proxy
- Handle tool calls (future)

```typescript
export class PukuChatService implements IPukuChatService {
  constructor(
    @IPukuIndexingService private readonly indexingService: IPukuIndexingService,
    @IPukuAuthService private readonly authService: IPukuAuthService,
  ) {}

  async *chat(query: string, options: PukuChatOptions): AsyncIterable<PukuChatChunk> {
    // 1. Get workspace context from our indexing
    const context = options.includeWorkspaceContext !== false
      ? await this.getWorkspaceContext(query)
      : [];

    // 2. Build messages with context
    const messages = this.buildMessages(query, context, options);

    // 3. Stream from proxy
    yield* this.streamFromProxy(messages, options);
  }

  async getWorkspaceContext(query: string, limit = 10): Promise<PukuContextChunk[]> {
    if (this.indexingService.status !== PukuIndexingStatus.Ready) {
      return [];
    }
    return this.indexingService.search(query, limit);
  }
}
```

### Phase 2: Chat Participant

#### 2.1 Create Puku Chat Participant
**File:** `src/extension/pukuChat/vscode-node/pukuChatParticipant.ts`

```typescript
export class PukuChatParticipant extends Disposable {
  static readonly ID = 'puku.chat';
  static readonly NAME = 'puku';

  private _participant: vscode.ChatParticipant;

  constructor(
    @IInstantiationService private readonly instantiationService: IInstantiationService,
    @IPukuChatService private readonly chatService: IPukuChatService,
  ) {
    super();
    this._participant = this.register();
  }

  private register(): vscode.ChatParticipant {
    const participant = vscode.chat.createChatParticipant(
      PukuChatParticipant.ID,
      this.handleRequest.bind(this)
    );

    participant.iconPath = new vscode.ThemeIcon('sparkle');
    participant.followupProvider = this.createFollowupProvider();

    return participant;
  }

  private async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    // Build context from history
    const history = this.buildHistory(context.history);

    // Get editor context
    const editorContext = this.getEditorContext();

    // Stream response
    for await (const chunk of this.chatService.chat(request.prompt, {
      history,
      editorContext,
      includeWorkspaceContext: true,
    })) {
      if (token.isCancellationRequested) break;

      if (chunk.type === 'content') {
        stream.markdown(chunk.content);
      } else if (chunk.type === 'reference') {
        stream.reference(chunk.reference);
      }
    }

    return {};
  }
}
```

#### 2.2 Register in package.json
```json
{
  "chatParticipants": [
    {
      "id": "puku.chat",
      "name": "puku",
      "fullName": "Puku AI",
      "description": "AI assistant powered by Puku semantic indexing",
      "isSticky": true,
      "commands": [
        {
          "name": "search",
          "description": "Search the codebase semantically"
        },
        {
          "name": "explain",
          "description": "Explain code in the workspace"
        }
      ]
    }
  ]
}
```

### Phase 3: Prompt System

#### 3.1 Create Puku Prompt Components
**File:** `src/extension/pukuChat/prompts/pukuSystemPrompt.tsx`

```tsx
export class PukuSystemPrompt extends PromptElement<PukuSystemPromptProps> {
  render(): PromptPiece {
    return (
      <SystemMessage priority={1000}>
        You are Puku AI, an intelligent coding assistant. You have access to
        the user's workspace through semantic search.

        When answering questions:
        - Reference specific files and line numbers when relevant
        - Explain your reasoning step by step
        - Suggest improvements when appropriate

        <PukuSafetyRules />
      </SystemMessage>
    );
  }
}
```

#### 3.2 Create Puku Workspace Context Component
**File:** `src/extension/pukuChat/prompts/pukuWorkspaceContext.tsx`

```tsx
export class PukuWorkspaceContext extends PromptElement<PukuWorkspaceContextProps> {
  async prepare(): Promise<PukuWorkspaceContextState> {
    const { indexingService, query } = this.props;

    // Search using our Puku indexing
    const results = await indexingService.search(query, 10);

    return { results };
  }

  render(state: PukuWorkspaceContextState): PromptPiece {
    if (state.results.length === 0) {
      return <></>;
    }

    return (
      <UserMessage priority={500}>
        Here are relevant code snippets from the workspace:

        {state.results.map((result, i) => (
          <TextChunk priority={500 - i * 10}>
            File: {result.uri.fsPath} (lines {result.lineStart}-{result.lineEnd})
            Score: {(result.score * 100).toFixed(1)}%
            ```
            {result.content}
            ```
          </TextChunk>
        ))}
      </UserMessage>
    );
  }
}
```

### Phase 4: Integration

#### 4.1 Service Registration
**File:** `src/extension/extension/vscode-node/services.ts`

```typescript
// Add to existing services
registerSingleton(IPukuChatService, PukuChatService);
```

#### 4.2 Contribution Registration
**File:** `src/extension/pukuChat/vscode-node/pukuChat.contribution.ts`

```typescript
export class PukuChatContribution extends Disposable {
  static readonly ID = 'pukuChat.contribution';

  constructor(
    @IInstantiationService instantiationService: IInstantiationService,
  ) {
    super();

    // Register chat participant
    this._register(instantiationService.createInstance(PukuChatParticipant));

    // Register commands
    this._registerCommands();
  }
}
```

### Phase 5: Advanced Features (Future)

#### 5.1 Tool Calling Support
```typescript
// Define Puku-specific tools
const pukuTools = [
  {
    name: 'puku_search',
    description: 'Search the codebase semantically',
    parameters: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results' },
    },
  },
  {
    name: 'puku_read_file',
    description: 'Read a file from the workspace',
    parameters: {
      path: { type: 'string', description: 'File path' },
    },
  },
];
```

#### 5.2 Streaming with References
- Show file references as they're retrieved
- Progressive context loading
- Caching frequently accessed context

## File Structure

```
src/extension/pukuChat/
├── common/
│   ├── pukuChatService.ts      # Interface definitions
│   └── types.ts                 # Shared types
├── node/
│   ├── pukuChatService.ts      # Main chat service implementation
│   └── pukuProxyClient.ts      # Proxy communication
├── prompts/
│   ├── pukuSystemPrompt.tsx    # System prompt
│   ├── pukuWorkspaceContext.tsx # Workspace context component
│   └── pukuChatPrompt.tsx      # Main chat prompt
└── vscode-node/
    ├── pukuChatParticipant.ts  # VS Code chat participant
    └── pukuChat.contribution.ts # Registration
```

## Testing Strategy

### Unit Tests
- `pukuChatService.spec.ts` - Test context retrieval and message building
- `pukuWorkspaceContext.spec.ts` - Test prompt rendering

### Integration Tests
- Test full chat flow with mock proxy
- Test context relevance with sample codebases

### Manual Testing
1. Start proxy: `cd github/proxy && npm run dev`
2. Build extension: `npm run compile`
3. Launch with Code-OSS: `./scripts/code.sh --extensionDevelopmentPath=...`
4. Open chat panel, type `@puku How does the indexing work?`
5. Verify:
   - Relevant code snippets are included
   - Response references actual files
   - Streaming works correctly

## Migration Path

1. **Phase 1**: Add `@puku` participant alongside existing `@workspace`
2. **Phase 2**: Test and refine context quality
3. **Phase 3**: Optionally make `@puku` the default for Puku AI users
4. **Phase 4**: Add tool calling and advanced features

## Dependencies

- `IPukuIndexingService` - Already implemented
- `IPukuAuthService` - Already implemented
- Puku Proxy - Running on localhost:11434
- VS Code Chat API - `vscode.chat.createChatParticipant`

## Success Metrics

1. **Context Relevance**: Top-5 retrieved chunks contain relevant code >80% of the time
2. **Response Quality**: Responses reference specific files/lines when appropriate
3. **Performance**: Context retrieval < 500ms, full response starts < 2s
4. **User Adoption**: Users prefer `@puku` over `@workspace` for code questions

## Timeline

- **Week 1**: Core infrastructure (IPukuChatService, proxy client)
- **Week 2**: Chat participant and prompt system
- **Week 3**: Testing and refinement
- **Week 4**: Advanced features (tool calling, streaming improvements)

## Open Questions

1. Should we support both `@puku` and `@workspace` simultaneously?
2. How to handle cases when indexing is not ready?
3. Should we implement conversation memory/summarization?
4. How to handle multi-file edits suggested by the chat?
