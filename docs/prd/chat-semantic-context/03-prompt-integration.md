# Prompt Integration - PRD

## Component Overview
**Purpose**: Integrate `SemanticContext` component into existing chat prompts
**Priority**: P0 (MVP - Week 1)
**Dependencies**: `SemanticContext`, `PanelChatBasePrompt`
**Files Modified**: `src/chat/src/extension/prompts/node/panel/panelChatBasePrompt.tsx`

---

## Problem
Need to inject `SemanticContext` component into existing `PanelChatBasePrompt` without breaking existing functionality.

**Requirements:**
- Non-breaking change
- Can be enabled/disabled via configuration
- Proper TSX priority ordering
- Works with existing prompt components

---

## Requirements

### FR-1: Configuration-Gated Integration (P0)
Only include semantic context when enabled in settings.

**Setting**: `puku.chat.semanticContext.enabled` (default: `true`)

**Behavior:**
- If `true`: Include `<SemanticContext>` in prompt
- If `false`: Skip component (backwards compatible)

### FR-2: Priority Positioning (P0)
Position `SemanticContext` at correct priority in prompt hierarchy.

**Current Prompt Structure:**
```tsx
<SystemMessage priority={1000}>...</SystemMessage>
<HistoryWithInstructions historyPriority={700}>
    <InstructionMessage priority={1000}>...</InstructionMessage>
</HistoryWithInstructions>
<UserMessage flexGrow={2}>
    <ProjectLabels priority={600} />                    // Experiment-gated
    <CustomInstructions priority={750} />               // User instructions
    <!-- NEW: SemanticContext priority={850} -->        // Auto context
    <ChatToolReferences priority={899} />               // Tool refs
    <ChatVariablesAndQuery priority={900} />            // User query + vars
</UserMessage>
```

**Rationale:**
- Priority 850 places context **after custom instructions** but **before tool references**
- Higher priority than user query (900) so context is included first
- Lower priority than system/instructions (1000) so rules take precedence

### FR-3: Pass Configuration to Component (P0)
Pass user settings to `SemanticContext` component.

**Settings to pass:**
- `maxChunks`: From `puku.chat.semanticContext.maxChunks` (default: 5)
- `minScore`: From `puku.chat.semanticContext.minSimilarity` (default: 0.7)

---

## Implementation

### Modified File: panelChatBasePrompt.tsx

```tsx
import { SemanticContext } from './semanticContext';

export class PanelChatBasePrompt extends PromptElement<PanelChatBasePromptProps> {
    constructor(
        props: PanelChatBasePromptProps,
        @IEnvService private readonly envService: IEnvService,
        @IExperimentationService private readonly experimentationService: IExperimentationService,
        @IConfigurationService private readonly _configurationService: IConfigurationService,
    ) {
        super(props);
    }

    async render(state: void, sizing: PromptSizing) {
        const { query, history, chatVariables } = this.props.promptContext;

        // Existing flags
        const useProjectLabels = this._configurationService.getExperimentBasedConfig(
            ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsChat,
            this.experimentationService
        );

        // NEW: Check if semantic context is enabled
        const semanticContextEnabled = this._configurationService.getConfig(
            ConfigKey.Chat.SemanticContextEnabled,
            true
        );

        const operatingSystem = this.envService.OS;

        return (
            <>
                <SystemMessage priority={1000}>
                    You are an AI programming assistant.<br />
                    <CopilotIdentityRules />
                    <SafetyRules />
                    <Capabilities location={ChatLocation.Panel} />
                    <WorkspaceFoldersHint flexGrow={1} priority={800} />
                    {!this.envService.isSimulation() && (
                        <><br />The current date is {new Date().toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}.</>
                    )}
                </SystemMessage>

                <HistoryWithInstructions
                    flexGrow={1}
                    historyPriority={700}
                    passPriority
                    history={history}
                    currentTurnVars={chatVariables}
                >
                    <InstructionMessage priority={1000}>
                        Use Markdown formatting in your answers.<br />
                        <CodeBlockFormattingRules />
                        For code blocks use four backticks to start and end.<br />
                        Avoid wrapping the whole response in triple backticks.<br />
                        The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.<br />
                        The user is working on a {operatingSystem} machine. Please respond with system specific commands if applicable.<br />
                        The active document is the source code the user is looking at right now.<br />
                        You can only give one reply for each conversation turn.<br />
                        <ResponseTranslationRules />
                        <br />
                        {this.props.promptContext.tools?.toolReferences.find((tool) => tool.name === ToolName.Codebase)
                            ? <Tag name='codebaseToolInstructions'>
                                1. Consider how to answer the user's prompt based on the provided information. Always assume that the user is asking about the code in their workspace instead of asking a general programming question. Prefer using variables, functions, types, and classes from the workspace over those from the standard library.<br />
                                2. Generate a response that clearly and accurately answers the user's question. In your response, add fully qualified links for referenced symbols (example: [`namespace.VariableName`](path/to/file.ts)) and links for files (example: [path/to/file](path/to/file.ts)) so that the user can open them. If you do not have enough information to answer the question, respond with "I'm sorry, I can't answer that question with what I currently know about your workspace".
                            </Tag>
                            : undefined}
                    </InstructionMessage>
                </HistoryWithInstructions>

                <UserMessage flexGrow={2}>
                    {useProjectLabels && <ProjectLabels flexGrow={1} priority={600} />}

                    <CustomInstructions
                        flexGrow={1}
                        priority={750}
                        languageId={undefined}
                        chatVariables={chatVariables}
                    />

                    {/* NEW: Automatic Semantic Context */}
                    {semanticContextEnabled && (
                        <SemanticContext
                            flexGrow={2}
                            priority={850}
                            promptContext={this.props.promptContext}
                            maxChunks={this._configurationService.getConfig(
                                ConfigKey.Chat.SemanticContextMaxChunks,
                                5
                            )}
                            minScore={this._configurationService.getConfig(
                                ConfigKey.Chat.SemanticContextMinSimilarity,
                                0.7
                            )}
                        />
                    )}

                    <ChatToolReferences
                        priority={899}
                        flexGrow={2}
                        promptContext={this.props.promptContext}
                    />

                    <ChatVariablesAndQuery
                        flexGrow={3}
                        flexReserve='/3'
                        priority={900}
                        chatVariables={chatVariables}
                        query={query}
                        includeFilepath={true}
                    />
                </UserMessage>
            </>
        );
    }
}
```

### Configuration Keys

Add to `src/platform/configuration/common/configurationService.ts`:

```typescript
export namespace ConfigKey {
    export namespace Chat {
        export const SemanticContextEnabled = 'puku.chat.semanticContext.enabled';
        export const SemanticContextMaxChunks = 'puku.chat.semanticContext.maxChunks';
        export const SemanticContextMinSimilarity = 'puku.chat.semanticContext.minSimilarity';
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Config | Expected Behavior |
|-----------|--------|-------------------|
| Enabled with defaults | `enabled: true` | `<SemanticContext>` included |
| Disabled | `enabled: false` | `<SemanticContext>` NOT included |
| Custom maxChunks | `maxChunks: 10` | Passed to component |
| Custom minScore | `minSimilarity: 0.8` | Passed to component |

### Integration Tests

| Test Case | Expected Result |
|-----------|----------------|
| Chat with context enabled | Context appears in prompt |
| Chat with context disabled | Context NOT in prompt |
| Existing chat features work | No breaking changes |
| Priority ordering correct | Context after custom instructions |

---

## Backwards Compatibility

**Guarantees:**
- ✅ Existing chat functionality unchanged
- ✅ Can be disabled via configuration
- ✅ No breaking changes to prompt structure
- ✅ Graceful degradation if indexing unavailable

**Migration:**
- No migration needed
- Feature is opt-in via default `enabled: true` setting
- Users can disable if not desired

---

## Success Criteria
- [ ] `SemanticContext` component integrated into `PanelChatBasePrompt`
- [ ] Controlled by `puku.chat.semanticContext.enabled` setting
- [ ] Priority set to 850 (correct ordering)
- [ ] Configuration values passed correctly
- [ ] No breaking changes to existing chat
- [ ] Unit tests pass
- [ ] Integration tests pass

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Add import for `SemanticContext` component
- [ ] Add configuration check (`semanticContextEnabled`)
- [ ] Add conditional rendering in TSX
- [ ] Pass configuration values (`maxChunks`, `minScore`)
- [ ] Add configuration keys to `ConfigKey.Chat`
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with context enabled
- [ ] Test with context disabled
- [ ] Verify no breaking changes

---

## Example Prompt Output

**With Semantic Context Enabled:**
```
System:
You are an AI programming assistant.
[...safety rules, capabilities...]

Instructions:
Use Markdown formatting in your answers.
[...formatting rules...]

User Message:
[Custom Instructions if any]

## Relevant Code Context
**File**: `src/auth/login.ts` (lines 42-68) - function: `login`
```typescript
export async function login(...) { ... }
```

[Tool References if any]

User Query: How does authentication work?
```

**With Semantic Context Disabled:**
```
System:
You are an AI programming assistant.
[...safety rules, capabilities...]

Instructions:
Use Markdown formatting in your answers.
[...formatting rules...]

User Message:
[Custom Instructions if any]
[Tool References if any]
User Query: How does authentication work?
```

---

## Related Documents
- `02-context-formatter.md` - Context formatting (dependency)
- `00-overview.md` - Component overview
- `../../architecture/chat-semantic-context/integration-points.md` - Integration architecture

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 2-3 hours
**Owner**: TBD
