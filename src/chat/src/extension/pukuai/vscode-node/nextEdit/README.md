# Next Edit Suggestions (NES) Implementation

This directory contains the implementation of Next Edit Suggestions for Puku Editor, following the architecture patterns from VS Code's inline completion system and the vscode-copilot-chat reference.

## Architecture Overview

### Core Components

1. **PukuNesNextEditProvider** (`pukuNesNextEditProvider.ts`)
   - Main NES provider that implements `IPukuNextEditProvider`
   - Provides context-aware suggestions for the next logical edit
   - Integrates with Puku AI backend via `/v1/nes` endpoint
   - Handles context extraction from recent edits and surrounding code

2. **PukuNextEditManager** (`pukuNextEditManager.ts`)
   - Coordinates multiple next edit providers (FIM, NES, Diagnostics)
   - Implements provider racing to get the best suggestion
   - Manages suggestion lifecycle (shown, accepted, rejected, ignored)
   - Handles provider priority and timing

3. **PukuFimNextEditProvider** (`pukuFimNextEditProvider.ts`)
   - Wrapper around existing FIM functionality
   - Enables FIM to participate in provider racing with NES
   - Maintains compatibility with existing inline completion system

4. **PukuEnhancedInlineCompletionProvider** (`pukuInlineEditModel.ts`)
   - Enhanced inline completion provider that integrates NES
   - Coordinates between existing FIM and new NES capabilities
   - Registers VS Code commands for NES functionality

## Features

### Basic NES Features
- ✅ Context-aware next edit suggestions
- ✅ Integration with existing FIM system
- ✅ Provider racing (NES vs FIM vs Diagnostics)
- ✅ Configurable delays and timeouts
- ✅ Accept/reject functionality
- ✅ VS Code commands and keybindings

### Context Extraction
- Recent edit analysis
- Surrounding code context (±10 lines)
- Import detection for multiple languages
- Language-aware prompt generation

### Provider Racing
- NES starts after 500ms delay (configurable)
- FIM starts immediately (no delay)
- Diagnostics starts after 200ms delay
- Priority order: NES > FIM > Diagnostics

## Configuration

Add to VS Code settings:

```json
{
  "puku.nextEditSuggestions.enabled": true,
  "puku.nextEditSuggestions.timeout": 3000,
  "puku.nextEditSuggestions.nesDelay": 500,
  "puku.nextEditSuggestions.diagnosticsDelay": 200
}
```

### Settings Description

- **`puku.nextEditSuggestions.enabled`**: Enable/disable NES
- **`puku.nextEditSuggestions.timeout`**: Request timeout in milliseconds
- **`puku.nextEditSuggestions.nesDelay`**: Delay before NES requests
- **`puku.nextEditSuggestions.diagnosticsDelay`**: Delay for diagnostics

## VS Code Integration

### Commands
- `puku.acceptNextEdit`: Accept current NES suggestion
- `puku.rejectNextEdit`: Reject current NES suggestion

### Extension Manifest
The following are added to `package.json`:

```json
{
  "configuration": [
    {
      "puku.nextEditSuggestions.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable Next Edit Suggestions (NES)"
      }
      // ... other NES settings
    }
  ],
  "commands": [
    {
      "command": "puku.acceptNextEdit",
      "title": "Accept Next Edit Suggestion",
      "category": "Puku AI"
    },
    {
      "command": "puku.rejectNextEdit",
      "title": "Reject Next Edit Suggestion",
      "category": "Puku AI"
    }
  ]
}
```

## Backend API Integration

### NES Endpoint
Add to your Puku AI backend:

```typescript
app.post('/v1/nes', async (req, res) => {
  try {
    const { context, document, prompt } = req.body;

    // Use your AI model to generate next edit suggestion
    const response = await yourAIModel.generate(prompt, {
      maxTokens: 256,
      temperature: 0.1
    });

    res.json({
      suggestion: response.choices[0].text.trim(),
      description: "Next edit suggestion",
      confidence: 0.85
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Usage Examples

### Basic Usage
1. Make an edit in your code
2. Wait for the NES debounce (1.5 seconds default)
3. NES will suggest the next logical edit
4. Press TAB to accept or ESC to reject

### Provider Racing
- Multiple providers race simultaneously
- NES wins if it provides a suggestion quickly
- Falls back to FIM if NES is slow or unavailable
- Diagnostics can provide quick fix suggestions

### Custom Scenarios
- After creating a function: Suggest implementation body
- After adding import: Suggest usage examples
- After variable declaration: Suggest initialization
- After class definition: Suggest common methods

## Testing

### Unit Tests
- `pukuNesNextEditProvider.test.ts`: Core provider tests
- Mock implementations for all dependencies
- Test coverage for all provider methods

### Integration Tests
- Test provider racing with FIM
- Test VS Code command integration
- Test configuration changes

### Manual Testing
1. Enable NES in settings
2. Make code changes
3. Verify suggestions appear
4. Test accept/reject functionality

## Performance Considerations

### Debouncing
- NES uses 1.5s debounce (longer than FIM)
- Prevents excessive API calls
- Allows time for context to stabilize

### Caching
- TODO: Implement result caching
- TODO: Cache based on edit patterns
- TODO: Learn from user acceptance/rejection

### Resource Management
- Request cancellation support
- Proper disposal of event listeners
- Rate limiting considerations

## Future Enhancements

### Advanced Features
- Multi-file NES suggestions
- Cross-tab edit tracking
- Pattern learning from user behavior
- Custom NES rules per project

### Backend Improvements
- Better context analysis
- More sophisticated prompts
- Model fine-tuning for NES
- Real-time collaboration support

### UI Enhancements
- Visual distinction for NES vs FIM
- Jump-to-location indicators
- Suggestion preview tooltips
- Acceptance statistics

## Architecture Patterns

### Service Injection
All services use dependency injection through VS Code's service locator:

```typescript
constructor(
  @IPukuAuthService private readonly authService: IPukuAuthService,
  @IPukuConfigService private readonly configService: IPukuConfigService,
  // ...
)
```

### Observable Programming
Heavy use of VS Code's observable system for reactive updates and event handling.

### Lifecycle Management
Proper disposal of resources using VS Code's `Disposable` pattern.

### Error Handling
Graceful degradation - failures don't break the entire completion system.

## Debugging

### Logging
All components use `ILogService` with appropriate log levels:
- `info`: Important events and configuration
- `debug`: Detailed execution flow
- `error`: Exceptions and failures

### Tracing
TODO: Add structured tracing for performance analysis.

### Development Tips
- Use VS Code's Developer Tools for debugging
- Enable verbose logging in configuration
- Monitor network requests in Network tab
- Use test files for isolated testing

## References

- [VS Code Inline Completions API](https://code.visualstudio.com/api/references/vscode-api#InlineCompletionItemProvider)
- [Next Edit Suggestions Documentation](https://code.visualstudio.com/docs/copilot/ai-powered-suggestions#_next-edit-suggestions)
- [vscode-copilot-chat Reference Implementation](../../../vscode/reference/vscode-copilot-chat/)

## Contributing

When modifying NES implementation:

1. Follow existing code patterns and naming conventions
2. Add appropriate unit tests for new functionality
3. Update documentation for new features
4. Test with multiple languages and scenarios
5. Consider performance impact of changes

## License

This implementation follows the same license as Puku Editor.