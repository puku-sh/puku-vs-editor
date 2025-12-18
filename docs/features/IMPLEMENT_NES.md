Implementation Plan: Next Edit Suggestions for Puku Editor

  Overview

  Implement Next Edit Suggestions (NES) based on VS Code's AI-powered suggestions feature, following the vscode-copilot-chat reference
  patterns and integrating with the existing pukuInlineCompletionProvider.

  Phase 1: Current Infrastructure Analysis ✅

  Based on exploration, here's what exists:

  Current State:
  - ✅ Basic IPukuNextEditProvider interface exists (but empty)
  - ✅ VS Code core NES infrastructure in reference
  - ✅ Existing inline completion system to build upon
  - ❌ No actual NES implementation

  Phase 2: Implementation Architecture

  Key Files to Create/Modify:

  src/chat/src/extension/pukuai/vscode-node/
  ├── pukuInlineCompletionProvider.ts (modify existing)
  ├── nextEdit/
  │   ├── pukuNesNextEditProvider.ts (new)
  │   └── nesTelemetry.ts (new)

  Phase 3: Step-by-Step Implementation

  Step 1: Create Core NES Provider

  File: src/chat/src/extension/pukuai/vscode-node/nextEdit/pukuNesNextEditProvider.ts

  import { IStatelessNextEditProvider } from
  '../../../../vscode/reference/vscode-copilot-chat/src/extension/completions-core/vscode-node/lib/src/nextEdit/statelessNextEditProvider';
  import { StatelessNextEditRequest, StatelessNextEditResult, PushEdit } from './interfaces';

  export class PukuNesNextEditProvider implements IStatelessNextEditProvider {
      readonly ID = 'puku-nes';

      constructor(
          @IPukuAuthService private authService: IPukuAuthService,
          @IFetcherService private fetcher: IFetcherService,
          @IPukuConfigService private config: IPukuConfigService,
          @ILogService private logger: ILogService,
      ) {}

      async provideNextEdit(
          request: StatelessNextEditRequest,
          pushEdit: PushEdit,
          logContext: InlineEditRequestLogContext,
          cancellationToken: CancellationToken
      ): Promise<StatelessNextEditResult> {
          // 1. Extract context from recent edit
          const recentEdit = request.getActiveDocument().recentEdit;
          if (!recentEdit) {
              return { noNextEditReason: NoNextEditReason.NoActiveEdit };
          }

          // 2. Build NES prompt with edit context
          const nesContext = await this.buildNesContext(request, recentEdit);

          // 3. Call Puku AI API
          try {
              const response = await this.fetcher.post('/v1/nes', {
                  context: nesContext,
                  document: request.getActiveDocument().text,
                  position: request.getActiveDocument().cursorPosition
              }, cancellationToken);

              // 4. Parse and return suggestions
              return this.parseNesResponse(response.data, pushEdit);

          } catch (error) {
              this.logger.error('NES request failed', error);
              return { noNextEditReason: NoNextEditReason.Error };
          }
      }

      private async buildNesContext(request: StatelessNextEditRequest, recentEdit: RecentEdit): Promise<NesContext> {
          return {
              recentEdit: {
                  before: recentEdit.before,
                  after: recentEdit.after,
                  position: recentEdit.position
              },
              surroundingContext: this.extractSurroundingContext(request.getActiveDocument()),
              language: this.getLanguage(request.getActiveDocument()),
              imports: await this.getImportContext(request.getActiveDocument())
          };
      }
  }

  Step 2: Extend Existing Inline Completion Provider

  Modify: src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts

  export class PukuInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
      constructor(
          // ... existing dependencies
          @IInstantiationService private instantiationService: IInstantiationService,
      ) {
          // Add NES provider
          this.nesProvider = this.instantiationService.createInstance(PukuNesNextEditProvider);
          this.setupNesIntegration();
      }

      private setupNesIntegration(): void {
          // Create InlineEditModel from reference
          this.inlineEditModel = this.instantiationService.createInstance(InlineEditModel, this.nesProvider);

          // Register for edit events
          this.disposables.push(
              this.inlineEditModel.onDidChange(() => this.handleNesChange()),
              vscode.workspace.onDidChangeTextDocument(() => this.handleDocumentChange())
          );
      }

      async provideInlineCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          context: vscode.InlineCompletionContext,
          token: vscode.CancellationToken
      ): Promise<vscode.InlineCompletionList> {
          // Existing FIM logic...

          // Add NES support
          if (this.shouldProvideNes(document, position, context)) {
              const nesItems = await this.getNesSuggestions(document, position, token);
              return {
                  items: [...fimItems, ...nesItems],
                  enableForwardStability: true
              };
          }

          return { items: fimItems, enableForwardStability: true };
      }

      private async getNesSuggestions(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken
      ): Promise<vscode.InlineCompletionItem[]> {
          // Check if NES model has suggestions
          const nesResult = await this.inlineEditModel.provideEdit(document, position, token);

          if (nesResult?.edit) {
              return [{
                  insertText: nesResult.edit.insertText,
                  range: nesResult.edit.range,
                  command: {
                      title: "Accept Next Edit",
                      command: "puku.acceptNextEdit"
                  },
                  // Mark as inline edit
                  isInlineEdit: true,
                  showRange: nesResult.edit.showRange,
                  displayLocation: {
                      label: "Next edit available",
                      position: nesResult.edit.range.start
                  }
              }];
          }

          return [];
      }
  }

  Step 3: Add NES API Integration

  Backend API Integration (in your backend service):

  // Add to your existing Puku AI backend
  app.post('/v1/nes', async (req, res) => {
      try {
          const { context, document, position } = req.body;

          // Build NES prompt
          const prompt = `Given this recent edit in a ${context.language} file:
  Before: ${context.recentEdit.before}
  After: ${context.recentEdit.after}
  Position: ${context.recentEdit.position}

  Context: ${context.surroundingContext}
  Imports: ${context.imports}

  Suggest the next logical edit that would typically follow this change.`;

          const response = await yourAIModel.generate(prompt, {
              maxTokens: 256,
              temperature: 0.1,
              stopSequences: ['```']
          });

          res.json({
              suggestion: response.choices[0].text.trim(),
              confidence: 0.85
          });
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  });

  Step 4: Configuration and Registration

  Modify: src/chat/src/extension/vscode-node/contributions.ts

  // Register NES provider
  registerInstance(IPukuNextEditProvider, PukuNesNextEditProvider);

  // Register inline completion provider with NES support
  registerSingleton(IInstantiationService, CtorDescriptor.bindTyped(PukuInlineCompletionProvider));

  // Register VS Code command for NES acceptance
  vscode.commands.registerCommand('puku.acceptNextEdit', () => {
      // Handle NES acceptance
  });

  Step 5: VS Code Feature Integration

  Add to extension manifest (package.json):

  {
      "capabilities": {
          "inlineCompletions": {
              "addition": true
          }
      },
      "contributes": {
          "configuration": {
              "title": "Puku AI",
              "properties": {
                  "puku.nextEditSuggestions.enabled": {
                      "type": "boolean",
                      "default": true,
                      "description": "Enable Next Edit Suggestions"
                  },
                  "puku.nextEditSuggestions.debounce": {
                      "type": "number",
                      "default": 1000,
                      "description": "Debounce delay for Next Edit Suggestions (ms)"
                  }
              }
          }
      }
  }

  Phase 4: Testing Strategy

  Unit Tests:

  // src/chat/src/test/extension/pukuai/nextEdit/pukuNesNextEditProvider.test.ts
  describe('PukuNesNextEditProvider', () => {
      it('should provide next edit after function definition', async () => {
          // Test NES after creating function
      });

      it('should suggest completing conditional statements', async () => {
          // Test NES after if statements
      });

      it('should handle rejection tracking', async () => {
          // Test learning from user rejections
      });
  });

  Integration Tests:

  // Test with VS Code inline completion API
  // Test integration with existing FIM system
  // Test cross-tab edit tracking

  Phase 5: Key Implementation Notes

  Performance Considerations:

  1. Debouncing: Use longer debounce (1-2s) for NES vs FIM (800ms)
  2. Caching: Cache NES results based on edit patterns
  3. Cancellation: Proper cleanup when user continues typing
  4. Resource Management: Limit concurrent NES requests

  User Experience:

  1. Visual Distinction: Different styling for NES vs FIM suggestions
  2. Clear Labels: "Next edit" indicators and jump-to-location features
  3. Opt-out: Easy way to disable NES temporarily
  4. Telemetry: Track NES acceptance/rejection for improvement

  API Design:

  1. Context-Rich: Include recent edit, surrounding code, imports
  2. Language-Aware: Different prompts for different languages
  3. Error Handling: Graceful fallbacks when NES isn't available
  4. Privacy: Handle sensitive code appropriately

  Phase 6: Rollout Plan

  MVP Features:

  1. Basic NES for common patterns (functions, conditions, loops)
  2. Integration with existing inline completion UI
  3. Configuration options

  Future Enhancements:

  1. Multi-file NES suggestions
  2. Context learning from user patterns
  3. Advanced prompt engineering for better suggestions
  4. Custom NES rules per project/language

  This implementation plan provides a solid foundation for Next Edit Suggestions while maintaining compatibility with the existing Puku
  Editor architecture and following the established patterns from the vscode-copilot-chat reference.