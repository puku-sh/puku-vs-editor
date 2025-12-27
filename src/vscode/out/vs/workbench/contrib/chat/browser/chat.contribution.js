/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { timeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { PolicyCategory } from '../../../../base/common/policy.js';
import { registerEditorFeature } from '../../../../editor/common/editorFeatures.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { mcpAccessConfig, mcpAutoStartConfig, mcpGalleryServiceEnablementConfig, mcpGalleryServiceUrlConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import product from '../../../../platform/product/common/product.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { AssistedTypes } from '../../mcp/browser/mcpCommandsAddConfiguration.js';
import { allDiscoverySources, discoverySourceSettingsLabel, mcpDiscoverySection, mcpServerSamplingSection } from '../../mcp/common/mcpConfiguration.js';
import { ChatAgentNameService, ChatAgentService, IChatAgentNameService, IChatAgentService } from '../common/chatAgents.js';
import { CodeMapperService, ICodeMapperService } from '../common/chatCodeMapperService.js';
import '../common/chatColors.js';
import { IChatEditingService } from '../common/chatEditingService.js';
import { IChatLayoutService } from '../common/chatLayoutService.js';
import { ChatModeService, IChatModeService } from '../common/chatModes.js';
import { ChatResponseResourceFileSystemProvider } from '../common/chatResponseResourceFileSystemProvider.js';
import { IChatService } from '../common/chatService.js';
import { ChatService } from '../common/chatServiceImpl.js';
import { IChatSessionsService } from '../common/chatSessionsService.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { ChatTodoListService, IChatTodoListService } from '../common/chatTodoListService.js';
import { ChatTransferService, IChatTransferService } from '../common/chatTransferService.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService } from '../common/ignoredFiles.js';
import { ILanguageModelsService, LanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelStatsService, LanguageModelStatsService } from '../common/languageModelStats.js';
import { ILanguageModelToolsConfirmationService } from '../common/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { ChatPromptFilesExtensionPointHandler } from '../common/promptSyntax/chatPromptFilesContribution.js';
import { PromptsConfig } from '../common/promptSyntax/config/config.js';
import { INSTRUCTIONS_DEFAULT_SOURCE_FOLDER, INSTRUCTION_FILE_EXTENSION, LEGACY_MODE_DEFAULT_SOURCE_FOLDER, LEGACY_MODE_FILE_EXTENSION, PROMPT_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION } from '../common/promptSyntax/config/promptFileLocations.js';
import { PromptLanguageFeaturesProvider } from '../common/promptSyntax/promptFileContributions.js';
import { AGENT_DOCUMENTATION_URL, INSTRUCTIONS_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL } from '../common/promptSyntax/promptTypes.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
import { PromptsService } from '../common/promptSyntax/service/promptsServiceImpl.js';
import { LanguageModelToolsExtensionPointHandler } from '../common/tools/languageModelToolsContribution.js';
import { BuiltinToolsContribution } from '../common/tools/tools.js';
import { IVoiceChatService, VoiceChatService } from '../common/voiceChatService.js';
import { registerChatAccessibilityActions } from './actions/chatAccessibilityActions.js';
import { AgentChatAccessibilityHelp, EditsChatAccessibilityHelp, PanelChatAccessibilityHelp, QuickChatAccessibilityHelp } from './actions/chatAccessibilityHelp.js';
import { ACTION_ID_NEW_CHAT, CopilotTitleBarMenuRendering, registerChatActions } from './actions/chatActions.js';
import { CodeBlockActionRendering, registerChatCodeBlockActions, registerChatCodeCompareBlockActions } from './actions/chatCodeblockActions.js';
import { ChatContextContributions } from './actions/chatContext.js';
import { registerChatContextActions } from './actions/chatContextActions.js';
import { registerChatCopyActions } from './actions/chatCopyActions.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { ChatSubmitAction, registerChatExecuteActions } from './actions/chatExecuteActions.js';
import { registerChatFileTreeActions } from './actions/chatFileTreeActions.js';
import { ChatGettingStartedContribution } from './actions/chatGettingStarted.js';
import { registerChatExportActions } from './actions/chatImportExport.js';
import { registerLanguageModelActions } from './actions/chatLanguageModelActions.js';
import { registerMoveActions } from './actions/chatMoveActions.js';
import { registerNewChatActions } from './actions/chatNewActions.js';
import { registerChatPromptNavigationActions } from './actions/chatPromptNavigationActions.js';
import { registerQuickChatActions } from './actions/chatQuickInputActions.js';
import { ChatSessionsGettingStartedAction, DeleteChatSessionAction, OpenChatSessionInNewEditorGroupAction, OpenChatSessionInNewWindowAction, OpenChatSessionInSidebarAction, RenameChatSessionAction, ToggleAgentSessionsViewLocationAction, ToggleChatSessionsDescriptionDisplayAction } from './actions/chatSessionActions.js';
import { registerChatTitleActions } from './actions/chatTitleActions.js';
import { registerChatElicitationActions } from './actions/chatElicitationActions.js';
import { registerChatToolActions } from './actions/chatToolActions.js';
import { ChatTransferContribution } from './actions/chatTransfer.js';
import './agentSessions/agentSessionsView.js';
import { IChatAccessibilityService, IChatCodeBlockContextProviderService, IChatWidgetService, IQuickChatService } from './chat.js';
import { ChatAccessibilityService } from './chatAccessibilityService.js';
import './chatAttachmentModel.js';
import { ChatAttachmentResolveService, IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
import { ChatMarkdownAnchorService, IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import { ChatContextPickService, IChatContextPickService } from './chatContextPickService.js';
import { ChatInputBoxContentProvider } from './chatEdinputInputContentProvider.js';
import { ChatEditingEditorAccessibility } from './chatEditing/chatEditingEditorAccessibility.js';
import { registerChatEditorActions } from './chatEditing/chatEditingEditorActions.js';
import { ChatEditingEditorContextKeys } from './chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditingEditorOverlay } from './chatEditing/chatEditingEditorOverlay.js';
import { ChatEditingService } from './chatEditing/chatEditingServiceImpl.js';
import { ChatEditingNotebookFileSystemProviderContrib } from './chatEditing/notebook/chatEditingNotebookFileSystemProvider.js';
import { SimpleBrowserOverlay } from './chatEditing/simpleBrowserEditorOverlay.js';
import { ChatEditor } from './chatEditor.js';
import { ChatEditorInput, ChatEditorInputSerializer } from './chatEditorInput.js';
import { ChatLayoutService } from './chatLayoutService.js';
import './chatManagement/chatManagement.contribution.js';
import { agentSlashCommandToMarkdown, agentToMarkdown } from './chatMarkdownDecorationsRenderer.js';
import { ChatOutputRendererService, IChatOutputRendererService } from './chatOutputItemRenderer.js';
import { ChatCompatibilityNotifier, ChatExtensionPointHandler } from './chatParticipant.contribution.js';
import { ChatPasteProvidersFeature } from './chatPasteProviders.js';
import { QuickChatService } from './chatQuick.js';
import { ChatResponseAccessibleView } from './chatResponseAccessibleView.js';
import { ChatTerminalOutputAccessibleView } from './chatTerminalOutputAccessibleView.js';
import { LocalChatSessionsProvider } from './chatSessions/localChatSessionsProvider.js';
import { ChatSessionsView, ChatSessionsViewContrib } from './chatSessions/view/chatSessionsView.js';
import { ChatSetupContribution, ChatTeardownContribution } from './chatSetup.js';
import { ChatStatusBarEntry } from './chatStatus.js';
import { ChatVariablesService } from './chatVariables.js';
import { IPukuAuthService } from '../../../services/chat/common/pukuAuthService.js';
import { ChatWidget } from './chatWidget.js';
import { ChatCodeBlockContextProviderService } from './codeBlockContextProviderService.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';
import { ChatImplicitContextContribution } from './contrib/chatImplicitContext.js';
import './contrib/chatInputCompletions.js';
import './contrib/chatInputEditorContrib.js';
import './contrib/chatInputEditorHover.js';
import { ChatRelatedFilesContribution } from './contrib/chatInputRelatedFilesContrib.js';
import { LanguageModelToolsConfirmationService } from './languageModelToolsConfirmationService.js';
import { LanguageModelToolsService, globalAutoApproveDescription } from './languageModelToolsService.js';
import './promptSyntax/promptCodingAgentActionContribution.js';
import './promptSyntax/promptToolsCodeLensProvider.js';
import { PromptUrlHandler } from './promptSyntax/promptUrlHandler.js';
import { ConfigureToolSets, UserToolSetsContributions } from './tools/toolSetsContribution.js';
import { ChatViewsWelcomeHandler } from './viewsWelcome/chatViewsWelcomeHandler.js';
import { ChatWidgetService } from './chatWidgetService.js';
const toolReferenceNameEnumValues = [];
const toolReferenceNameEnumDescriptions = [];
// Register configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'chatSidebar',
    title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
    type: 'object',
    properties: {
        'chat.fontSize': {
            type: 'number',
            description: nls.localize('chat.fontSize', "Controls the font size in pixels in chat messages."),
            default: 13,
            minimum: 6,
            maximum: 100
        },
        'chat.fontFamily': {
            type: 'string',
            description: nls.localize('chat.fontFamily', "Controls the font family in chat messages."),
            default: 'default'
        },
        'chat.editor.fontSize': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.fontSize', "Controls the font size in pixels in chat codeblocks."),
            default: isMacintosh ? 12 : 14,
        },
        'chat.editor.fontFamily': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontFamily', "Controls the font family in chat codeblocks."),
            default: 'default'
        },
        'chat.editor.fontWeight': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontWeight', "Controls the font weight in chat codeblocks."),
            default: 'default'
        },
        'chat.editor.wordWrap': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.wordWrap', "Controls whether lines should wrap in chat codeblocks."),
            default: 'off',
            enum: ['on', 'off']
        },
        'chat.editor.lineHeight': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.lineHeight', "Controls the line height in pixels in chat codeblocks. Use 0 to compute the line height from the font size."),
            default: 0
        },
        'chat.commandCenter.enabled': {
            type: 'boolean',
            markdownDescription: nls.localize('chat.commandCenter.enabled', "Controls whether the command center shows a menu for actions to control chat (requires {0}).", '`#window.commandCenter#`'),
            default: true
        },
        'chat.implicitContext.enabled': {
            type: 'object',
            description: nls.localize('chat.implicitContext.enabled.1', "Enables automatically using the active editor as chat context for specified chat locations."),
            additionalProperties: {
                type: 'string',
                enum: ['never', 'first', 'always'],
                description: nls.localize('chat.implicitContext.value', "The value for the implicit context."),
                enumDescriptions: [
                    nls.localize('chat.implicitContext.value.never', "Implicit context is never enabled."),
                    nls.localize('chat.implicitContext.value.first', "Implicit context is enabled for the first interaction."),
                    nls.localize('chat.implicitContext.value.always', "Implicit context is always enabled.")
                ]
            },
            default: {
                'panel': 'always',
            }
        },
        'chat.implicitContext.suggestedContext': {
            type: 'boolean',
            markdownDescription: nls.localize('chat.implicitContext.suggestedContext', "Controls whether the new implicit context flow is shown. In Ask and Edit modes, the context will automatically be included. When using an agent, context will be suggested as an attachment. Selections are always included as context."),
            default: true,
        },
        'chat.editing.autoAcceptDelay': {
            type: 'number',
            markdownDescription: nls.localize('chat.editing.autoAcceptDelay', "Delay after which changes made by chat are automatically accepted. Values are in seconds, `0` means disabled and `100` seconds is the maximum."),
            default: 0,
            minimum: 0,
            maximum: 100
        },
        'chat.editing.confirmEditRequestRemoval': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRemoval', "Whether to show a confirmation before removing a request and its associated edits."),
            default: true,
        },
        'chat.editing.confirmEditRequestRetry': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRetry', "Whether to show a confirmation before retrying a request and its associated edits."),
            default: true,
        },
        'chat.experimental.detectParticipant.enabled': {
            type: 'boolean',
            deprecationMessage: nls.localize('chat.experimental.detectParticipant.enabled.deprecated', "This setting is deprecated. Please use `chat.detectParticipant.enabled` instead."),
            description: nls.localize('chat.experimental.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
            default: null
        },
        'chat.detectParticipant.enabled': {
            type: 'boolean',
            description: nls.localize('chat.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
            default: true
        },
        'chat.renderRelatedFiles': {
            type: 'boolean',
            description: nls.localize('chat.renderRelatedFiles', "Controls whether related files should be rendered in the chat input."),
            default: false
        },
        'chat.notifyWindowOnConfirmation': {
            type: 'boolean',
            description: nls.localize('chat.notifyWindowOnConfirmation', "Controls whether a chat session should present the user with an OS notification when a confirmation is needed while the window is not in focus. This includes a window badge as well as notification toast."),
            default: true,
        },
        [ChatConfiguration.GlobalAutoApprove]: {
            default: false,
            markdownDescription: globalAutoApproveDescription.value,
            type: 'boolean',
            scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
            tags: ['experimental'],
            policy: {
                name: 'ChatToolsAutoApprove',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                value: (account) => account.chat_preview_features_enabled === false ? false : undefined,
                localization: {
                    description: {
                        key: 'autoApprove2.description',
                        value: nls.localize('autoApprove2.description', 'Global auto approve also known as "YOLO mode" disables manual approval completely for all tools in all workspaces, allowing the agent to act fully autonomously. This is extremely dangerous and is *never* recommended, even containerized environments like Codespaces and Dev Containers have user keys forwarded into the container that could be compromised.\n\nThis feature disables critical security protections and makes it much easier for an attacker to compromise the machine.')
                    }
                },
            }
        },
        [ChatConfiguration.AutoApproveEdits]: {
            default: {
                '**/*': true,
                '**/.vscode/*.json': false,
                '**/.git/**': false,
                '**/{package.json,package-lock.json,server.xml,build.rs,web.config,.gitattributes,.env}': false,
                '**/*.{code-workspace,csproj,fsproj,vbproj,vcxproj,proj,targets,props}': false,
            },
            markdownDescription: nls.localize('chat.tools.autoApprove.edits', "Controls whether edits made by chat are automatically approved. The default is to approve all edits except those made to certain files which have the potential to cause immediate unintended side-effects, such as `**/.vscode/*.json`.\n\nSet to `true` to automatically approve edits to matching files, `false` to always require explicit approval. The last pattern matching a given file will determine whether the edit is automatically approved."),
            type: 'object',
            additionalProperties: {
                type: 'boolean',
            }
        },
        [ChatConfiguration.AutoApprovedUrls]: {
            default: {},
            markdownDescription: nls.localize('chat.tools.fetchPage.approvedUrls', "Controls which URLs are automatically approved when requested by chat tools. Keys are URL patterns and values can be `true` to approve both requests and responses, `false` to deny, or an object with `approveRequest` and `approveResponse` properties for granular control.\n\nExamples:\n- `\"https://example.com\": true` - Approve all requests to example.com\n- `\"https://*.example.com\": true` - Approve all requests to any subdomain of example.com\n- `\"https://example.com/api/*\": { \"approveRequest\": true, \"approveResponse\": false }` - Approve requests but not responses for example.com/api paths"),
            type: 'object',
            additionalProperties: {
                oneOf: [
                    { type: 'boolean' },
                    {
                        type: 'object',
                        properties: {
                            approveRequest: { type: 'boolean' },
                            approveResponse: { type: 'boolean' }
                        }
                    }
                ]
            }
        },
        [ChatConfiguration.EligibleForAutoApproval]: {
            default: {},
            markdownDescription: nls.localize('chat.tools.eligibleForAutoApproval', 'Controls which tools are eligible for automatic approval. Tools set to \'false\' will always present a confirmation and will never offer the option to auto-approve. The default behavior (or setting a tool to \'true\') may result in the tool offering auto-approval options.'),
            type: 'object',
            propertyNames: {
                enum: toolReferenceNameEnumValues,
                enumDescriptions: toolReferenceNameEnumDescriptions,
            },
            additionalProperties: {
                type: 'boolean',
            },
            tags: ['experimental'],
            examples: [
                {
                    'fetch': false,
                    'runTests': false
                }
            ],
            policy: {
                name: 'ChatToolsEligibleForAutoApproval',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.107',
                localization: {
                    description: {
                        key: 'chat.tools.eligibleForAutoApproval',
                        value: nls.localize('chat.tools.eligibleForAutoApproval', 'Controls which tools are eligible for automatic approval. Tools set to \'false\' will always present a confirmation and will never offer the option to auto-approve. The default behavior (or setting a tool to \'true\') may result in the tool offering auto-approval options.')
                    }
                },
            }
        },
        'chat.sendElementsToChat.enabled': {
            default: true,
            description: nls.localize('chat.sendElementsToChat.enabled', "Controls whether elements can be sent to chat from the Simple Browser."),
            type: 'boolean',
            tags: ['preview']
        },
        'chat.sendElementsToChat.attachCSS': {
            default: true,
            markdownDescription: nls.localize('chat.sendElementsToChat.attachCSS', "Controls whether CSS of the selected element will be added to the chat. {0} must be enabled.", '`#chat.sendElementsToChat.enabled#`'),
            type: 'boolean',
            tags: ['preview']
        },
        'chat.sendElementsToChat.attachImages': {
            default: true,
            markdownDescription: nls.localize('chat.sendElementsToChat.attachImages', "Controls whether a screenshot of the selected element will be added to the chat. {0} must be enabled.", '`#chat.sendElementsToChat.enabled#`'),
            type: 'boolean',
            tags: ['experimental']
        },
        'chat.undoRequests.restoreInput': {
            default: true,
            markdownDescription: nls.localize('chat.undoRequests.restoreInput', "Controls whether the input of the chat should be restored when an undo request is made. The input will be filled with the text of the request that was restored."),
            type: 'boolean',
        },
        'chat.editRequests': {
            markdownDescription: nls.localize('chat.editRequests', "Enables editing of requests in the chat. This allows you to change the request content and resubmit it to the model."),
            type: 'string',
            enum: ['inline', 'hover', 'input', 'none'],
            default: 'inline',
        },
        [ChatConfiguration.EmptyStateHistoryEnabled]: {
            type: 'boolean',
            default: product.quality === 'insiders',
            description: nls.localize('chat.emptyState.history.enabled', "Show recent chat history on the empty chat state."),
            tags: ['preview']
        },
        [ChatConfiguration.NotifyWindowOnResponseReceived]: {
            type: 'boolean',
            default: true,
            description: nls.localize('chat.notifyWindowOnResponseReceived', "Controls whether a chat session should present the user with an OS notification when a response is received while the window is not in focus. This includes a window badge as well as notification toast."),
        },
        'chat.checkpoints.enabled': {
            type: 'boolean',
            default: true,
            description: nls.localize('chat.checkpoints.enabled', "Enables checkpoints in chat. Checkpoints allow you to restore the chat to a previous state."),
        },
        'chat.checkpoints.showFileChanges': {
            type: 'boolean',
            description: nls.localize('chat.checkpoints.showFileChanges', "Controls whether to show chat checkpoint file changes."),
            default: false
        },
        [mcpAccessConfig]: {
            type: 'string',
            description: nls.localize('chat.mcp.access', "Controls access to installed Model Context Protocol servers."),
            enum: [
                "none" /* McpAccessValue.None */,
                "registry" /* McpAccessValue.Registry */,
                "all" /* McpAccessValue.All */
            ],
            enumDescriptions: [
                nls.localize('chat.mcp.access.none', "No access to MCP servers."),
                nls.localize('chat.mcp.access.registry', "Allows access to MCP servers installed from the registry that VS Code is connected to."),
                nls.localize('chat.mcp.access.any', "Allow access to any installed MCP server.")
            ],
            default: "all" /* McpAccessValue.All */,
            policy: {
                name: 'ChatMCP',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                value: (account) => {
                    if (account.mcp === false) {
                        return "none" /* McpAccessValue.None */;
                    }
                    if (account.mcpAccess === 'registry_only') {
                        return "registry" /* McpAccessValue.Registry */;
                    }
                    return undefined;
                },
                localization: {
                    description: {
                        key: 'chat.mcp.access',
                        value: nls.localize('chat.mcp.access', "Controls access to installed Model Context Protocol servers.")
                    },
                    enumDescriptions: [
                        {
                            key: 'chat.mcp.access.none', value: nls.localize('chat.mcp.access.none', "No access to MCP servers."),
                        },
                        {
                            key: 'chat.mcp.access.registry', value: nls.localize('chat.mcp.access.registry', "Allows access to MCP servers installed from the registry that VS Code is connected to."),
                        },
                        {
                            key: 'chat.mcp.access.any', value: nls.localize('chat.mcp.access.any', "Allow access to any installed MCP server.")
                        }
                    ]
                },
            }
        },
        [mcpAutoStartConfig]: {
            type: 'string',
            description: nls.localize('chat.mcp.autostart', "Controls whether MCP servers should be automatically started when the chat messages are submitted."),
            default: "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */,
            enum: [
                "never" /* McpAutoStartValue.Never */,
                "onlyNew" /* McpAutoStartValue.OnlyNew */,
                "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */
            ],
            enumDescriptions: [
                nls.localize('chat.mcp.autostart.never', "Never automatically start MCP servers."),
                nls.localize('chat.mcp.autostart.onlyNew', "Only automatically start new MCP servers that have never been run."),
                nls.localize('chat.mcp.autostart.newAndOutdated', "Automatically start new and outdated MCP servers that are not yet running.")
            ],
            tags: ['experimental'],
        },
        [mcpServerSamplingSection]: {
            type: 'object',
            description: nls.localize('chat.mcp.serverSampling', "Configures which models are exposed to MCP servers for sampling (making model requests in the background). This setting can be edited in a graphical way under the `{0}` command.", 'MCP: ' + nls.localize('mcp.list', 'List Servers')),
            scope: 5 /* ConfigurationScope.RESOURCE */,
            additionalProperties: {
                type: 'object',
                properties: {
                    allowedDuringChat: {
                        type: 'boolean',
                        description: nls.localize('chat.mcp.serverSampling.allowedDuringChat', "Whether this server is make sampling requests during its tool calls in a chat session."),
                        default: true,
                    },
                    allowedOutsideChat: {
                        type: 'boolean',
                        description: nls.localize('chat.mcp.serverSampling.allowedOutsideChat', "Whether this server is allowed to make sampling requests outside of a chat session."),
                        default: false,
                    },
                    allowedModels: {
                        type: 'array',
                        items: {
                            type: 'string',
                            description: nls.localize('chat.mcp.serverSampling.model', "A model the MCP server has access to."),
                        },
                    }
                }
            },
        },
        [AssistedTypes[4 /* AddConfigurationType.NuGetPackage */].enabledConfigKey]: {
            type: 'boolean',
            description: nls.localize('chat.mcp.assisted.nuget.enabled.description', "Enables NuGet packages for AI-assisted MCP server installation. Used to install MCP servers by name from the central registry for .NET packages (NuGet.org)."),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'startup'
            }
        },
        [ChatConfiguration.Edits2Enabled]: {
            type: 'boolean',
            description: nls.localize('chat.edits2Enabled', "Enable the new Edits mode that is based on tool-calling. When this is enabled, models that don't support tool-calling are unavailable for Edits mode."),
            default: false,
        },
        [ChatConfiguration.ExtensionToolsEnabled]: {
            type: 'boolean',
            description: nls.localize('chat.extensionToolsEnabled', "Enable using tools contributed by third-party extensions."),
            default: true,
            policy: {
                name: 'ChatAgentExtensionTools',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                localization: {
                    description: {
                        key: 'chat.extensionToolsEnabled',
                        value: nls.localize('chat.extensionToolsEnabled', "Enable using tools contributed by third-party extensions.")
                    }
                },
            }
        },
        [ChatConfiguration.AgentEnabled]: {
            type: 'boolean',
            description: nls.localize('chat.agent.enabled.description', "Enable agent mode for chat. When this is enabled, agent mode can be activated via the dropdown in the view."),
            default: true,
            policy: {
                name: 'ChatAgentMode',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.99',
                value: (account) => account.chat_agent_enabled === false ? false : undefined,
                localization: {
                    description: {
                        key: 'chat.agent.enabled.description',
                        value: nls.localize('chat.agent.enabled.description', "Enable agent mode for chat. When this is enabled, agent mode can be activated via the dropdown in the view."),
                    }
                }
            }
        },
        [ChatConfiguration.EnableMath]: {
            type: 'boolean',
            description: nls.localize('chat.mathEnabled.description', "Enable math rendering in chat responses using KaTeX."),
            default: true,
            tags: ['preview'],
        },
        [ChatConfiguration.ShowCodeBlockProgressAnimation]: {
            type: 'boolean',
            description: nls.localize('chat.codeBlock.showProgressAnimation.description', "When applying edits, show a progress animation in the code block pill. If disabled, shows the progress percentage instead."),
            default: true,
            tags: ['experimental'],
        },
        [ChatConfiguration.AgentSessionsViewLocation]: {
            type: 'string',
            enum: ['disabled', 'view', 'single-view'],
            description: nls.localize('chat.sessionsViewLocation.description', "Controls where to show the agent sessions menu."),
            default: 'view',
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [mcpDiscoverySection]: {
            type: 'object',
            properties: Object.fromEntries(allDiscoverySources.map(k => [k, { type: 'boolean', description: discoverySourceSettingsLabel[k] }])),
            additionalProperties: false,
            default: Object.fromEntries(allDiscoverySources.map(k => [k, false])),
            markdownDescription: nls.localize('mcp.discovery.enabled', "Configures discovery of Model Context Protocol servers from configuration from various other applications."),
        },
        [mcpGalleryServiceEnablementConfig]: {
            type: 'boolean',
            default: false,
            tags: ['preview'],
            description: nls.localize('chat.mcp.gallery.enabled', "Enables the default Marketplace for Model Context Protocol (MCP) servers."),
            included: product.quality === 'stable'
        },
        [mcpGalleryServiceUrlConfig]: {
            type: 'string',
            description: nls.localize('mcp.gallery.serviceUrl', "Configure the MCP Gallery service URL to connect to"),
            default: '',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices', 'advanced'],
            included: false,
            policy: {
                name: 'McpGalleryServiceUrl',
                category: PolicyCategory.InteractiveSession,
                minimumVersion: '1.101',
                value: (account) => account.mcpRegistryUrl,
                localization: {
                    description: {
                        key: 'mcp.gallery.serviceUrl',
                        value: nls.localize('mcp.gallery.serviceUrl', "Configure the MCP Gallery service URL to connect to"),
                    }
                }
            },
        },
        [PromptsConfig.INSTRUCTIONS_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize('chat.instructions.config.locations.title', "Instructions File Locations"),
            markdownDescription: nls.localize('chat.instructions.config.locations.description', "Specify location(s) of instructions files (`*{0}`) that can be attached in Chat sessions. [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", INSTRUCTION_FILE_EXTENSION, INSTRUCTIONS_DOCUMENTATION_URL),
            default: {
                [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            restricted: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/instructions': true,
                },
            ],
        },
        [PromptsConfig.PROMPT_LOCATIONS_KEY]: {
            type: 'object',
            title: nls.localize('chat.reusablePrompts.config.locations.title', "Prompt File Locations"),
            markdownDescription: nls.localize('chat.reusablePrompts.config.locations.description', "Specify location(s) of reusable prompt files (`*{0}`) that can be run in Chat sessions. [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", PROMPT_FILE_EXTENSION, PROMPT_DOCUMENTATION_URL),
            default: {
                [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/prompts': true,
                },
            ],
        },
        [PromptsConfig.MODE_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize('chat.mode.config.locations.title', "Mode File Locations"),
            markdownDescription: nls.localize('chat.mode.config.locations.description', "Specify location(s) of custom chat mode files (`*{0}`). [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", LEGACY_MODE_FILE_EXTENSION, AGENT_DOCUMENTATION_URL),
            default: {
                [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true,
            },
            deprecationMessage: nls.localize('chat.mode.config.locations.deprecated', "This setting is deprecated and will be removed in future releases. Chat modes are now called custom agents and are located in `.github/agents`"),
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/chatmodes': true,
                },
            ],
        },
        [PromptsConfig.USE_AGENT_MD]: {
            type: 'boolean',
            title: nls.localize('chat.useAgentMd.title', "Use AGENTS.MD file"),
            markdownDescription: nls.localize('chat.useAgentMd.description', "Controls whether instructions from `AGENTS.MD` file found in a workspace roots are attached to all chat requests."),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_NESTED_AGENT_MD]: {
            type: 'boolean',
            title: nls.localize('chat.useNestedAgentMd.title', "Use nested AGENTS.MD files"),
            markdownDescription: nls.localize('chat.useNestedAgentMd.description', "Controls whether instructions from nested `AGENTS.MD` files found in the workspace are listed in all chat requests. The language model can load these skills on-demand if the `read` tool is available."),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.USE_CLAUDE_SKILLS]: {
            type: 'boolean',
            title: nls.localize('chat.useClaudeSkills.title', "Use Claude skills"),
            markdownDescription: nls.localize('chat.useClaudeSkills.description', "Controls whether Claude skills found in the workspace and user home directories under `.claude/skills` are listed in all chat requests. The language model can load these skills on-demand if the `read` tool is available."),
            default: false,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions']
        },
        [PromptsConfig.PROMPT_FILES_SUGGEST_KEY]: {
            type: 'object',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            title: nls.localize('chat.promptFilesRecommendations.title', "Prompt File Recommendations"),
            markdownDescription: nls.localize('chat.promptFilesRecommendations.description', "Configure which prompt files to recommend in the chat welcome view. Each key is a prompt file name, and the value can be `true` to always recommend, `false` to never recommend, or a [when clause](https://aka.ms/vscode-when-clause) expression like `resourceExtname == .js` or `resourceLangId == markdown`."),
            default: {},
            additionalProperties: {
                oneOf: [
                    { type: 'boolean' },
                    { type: 'string' }
                ]
            },
            tags: ['prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    'plan': true,
                    'a11y-audit': 'resourceExtname == .html',
                    'document': 'resourceLangId == markdown'
                }
            ],
        },
        [ChatConfiguration.TodosShowWidget]: {
            type: 'boolean',
            default: true,
            description: nls.localize('chat.tools.todos.showWidget', "Controls whether to show the todo list widget above the chat input. When enabled, the widget displays todo items created by the agent and updates as progress is made."),
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.todoListTool.writeOnly': {
            type: 'boolean',
            default: false,
            description: nls.localize('chat.todoListTool.writeOnly', "When enabled, the todo tool operates in write-only mode, requiring the agent to remember todos in context."),
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.todoListTool.descriptionField': {
            type: 'boolean',
            default: true,
            description: nls.localize('chat.todoListTool.descriptionField', "When enabled, todo items include detailed descriptions for implementation context. This provides more information but uses additional tokens and may slow down responses."),
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.ThinkingStyle]: {
            type: 'string',
            default: 'fixedScrolling',
            enum: ['collapsed', 'collapsedPreview', 'fixedScrolling'],
            enumDescriptions: [
                nls.localize('chat.agent.thinkingMode.collapsed', "Thinking parts will be collapsed by default."),
                nls.localize('chat.agent.thinkingMode.collapsedPreview', "Thinking parts will be expanded first, then collapse once we reach a part that is not thinking."),
                nls.localize('chat.agent.thinkingMode.fixedScrolling', "Show thinking in a fixed-height streaming panel that auto-scrolls; click header to expand to full height."),
            ],
            description: nls.localize('chat.agent.thinkingStyle', "Controls how thinking is rendered."),
            tags: ['experimental'],
        },
        'chat.agent.thinking.collapsedTools': {
            type: 'string',
            default: 'readOnly',
            enum: ['none', 'all', 'readOnly'],
            enumDescriptions: [
                nls.localize('chat.agent.thinking.collapsedTools.none', "No tool calls are added into the collapsible thinking section."),
                nls.localize('chat.agent.thinking.collapsedTools.all', "All tool calls are added into the collapsible thinking section."),
                nls.localize('chat.agent.thinking.collapsedTools.readOnly', "Only read-only tool calls are added into the collapsible thinking section."),
            ],
            markdownDescription: nls.localize('chat.agent.thinking.collapsedTools', "When enabled, tool calls are added into the collapsible thinking section according to the selected mode."),
            tags: ['experimental'],
        },
        'chat.disableAIFeatures': {
            type: 'boolean',
            description: nls.localize('chat.disableAIFeatures', "Disable and hide built-in AI features provided by Puku AI, including chat and inline suggestions."),
            default: false,
            scope: 4 /* ConfigurationScope.WINDOW */
        },
        [ChatConfiguration.ShowAgentSessionsViewDescription]: {
            type: 'boolean',
            description: nls.localize('chat.showAgentSessionsViewDescription', "Controls whether session descriptions are displayed on a second row in the Chat Sessions view."),
            default: true,
        },
        'chat.allowAnonymousAccess': {
            type: 'boolean',
            description: nls.localize('chat.allowAnonymousAccess', "Controls whether anonymous access is allowed in chat."),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.hideNewButtonInAgentSessionsView': {
            type: 'boolean',
            description: nls.localize('chat.hideNewButtonInAgentSessionsView', "Controls whether the new session button is hidden in the Agent Sessions view."),
            default: false,
            tags: ['preview']
        },
        'chat.signInWithAlternateScopes': {
            type: 'boolean',
            description: nls.localize('chat.signInWithAlternateScopes', "Controls whether sign-in with alternate scopes is used."),
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        'chat.extensionUnification.enabled': {
            type: 'boolean',
            description: nls.localize('chat.extensionUnification.enabled', "Enables the unification of Puku AI extensions. When enabled, all Puku AI functionality is served from the Puku AI Chat extension. When disabled, the Puku AI and Puku AI Chat extensions operate independently."),
            default: true,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [ChatConfiguration.SubagentToolCustomAgents]: {
            type: 'boolean',
            description: nls.localize('chat.subagentTool.customAgents', "Whether the runSubagent tool is able to use custom agents. When enabled, the tool can take the name of a custom agent, but it must be given the exact name of the agent."),
            default: false,
            tags: ['experimental'],
        }
    }
});
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatEditor, ChatEditorInput.EditorID, nls.localize('chat', "Chat")), [
    new SyncDescriptor(ChatEditorInput)
]);
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'chat.experimental.detectParticipant.enabled',
        migrateFn: (value, _accessor) => ([
            ['chat.experimental.detectParticipant.enabled', { value: undefined }],
            ['chat.detectParticipant.enabled', { value: value !== false }]
        ])
    },
    {
        key: mcpDiscoverySection,
        migrateFn: (value) => {
            if (typeof value === 'boolean') {
                return { value: Object.fromEntries(allDiscoverySources.map(k => [k, value])) };
            }
            return { value };
        }
    },
]);
let ChatResolverContribution = class ChatResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatResolver'; }
    constructor(chatSessionsService, editorResolverService, instantiationService) {
        super();
        this.editorResolverService = editorResolverService;
        this.instantiationService = instantiationService;
        this._editorRegistrations = this._register(new DisposableMap());
        this._registerEditor(Schemas.vscodeChatEditor);
        this._registerEditor(Schemas.vscodeLocalChatSession);
        this._register(chatSessionsService.onDidChangeContentProviderSchemes((e) => {
            for (const scheme of e.added) {
                this._registerEditor(scheme);
            }
            for (const scheme of e.removed) {
                this._editorRegistrations.deleteAndDispose(scheme);
            }
        }));
        for (const scheme of chatSessionsService.getContentProviderSchemes()) {
            this._registerEditor(scheme);
        }
    }
    _registerEditor(scheme) {
        this._editorRegistrations.set(scheme, this.editorResolverService.registerEditor(`${scheme}:**/**`, {
            id: ChatEditorInput.EditorID,
            label: nls.localize('chat', "Chat"),
            priority: RegisteredEditorPriority.builtin
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === scheme,
        }, {
            createEditorInput: ({ resource, options }) => {
                return {
                    editor: this.instantiationService.createInstance(ChatEditorInput, resource, options),
                    options
                };
            }
        }));
    }
};
ChatResolverContribution = __decorate([
    __param(0, IChatSessionsService),
    __param(1, IEditorResolverService),
    __param(2, IInstantiationService)
], ChatResolverContribution);
let ChatAgentSettingContribution = class ChatAgentSettingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentSetting'; }
    constructor(experimentService, entitlementService) {
        super();
        this.experimentService = experimentService;
        this.entitlementService = entitlementService;
        this.registerMaxRequestsSetting();
    }
    registerMaxRequestsSetting() {
        let lastNode;
        const registerMaxRequestsSetting = () => {
            const treatmentId = this.entitlementService.entitlement === ChatEntitlement.Free ?
                'chatAgentMaxRequestsFree' :
                'chatAgentMaxRequestsPro';
            this.experimentService.getTreatment(treatmentId).then(value => {
                const defaultValue = value ?? (this.entitlementService.entitlement === ChatEntitlement.Free ? 25 : 25);
                const node = {
                    id: 'chatSidebar',
                    title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
                    type: 'object',
                    properties: {
                        'chat.agent.maxRequests': {
                            type: 'number',
                            markdownDescription: nls.localize('chat.agent.maxRequests', "The maximum number of requests to allow per-turn when using an agent. When the limit is reached, will ask to confirm to continue."),
                            default: defaultValue,
                        },
                    }
                };
                configurationRegistry.updateConfigurations({ remove: lastNode ? [lastNode] : [], add: [node] });
                lastNode = node;
            });
        };
        this._register(Event.runAndSubscribe(Event.debounce(this.entitlementService.onDidChangeEntitlement, () => { }, 1000), () => registerMaxRequestsSetting()));
    }
};
ChatAgentSettingContribution = __decorate([
    __param(0, IWorkbenchAssignmentService),
    __param(1, IChatEntitlementService)
], ChatAgentSettingContribution);
let ToolReferenceNamesContribution = class ToolReferenceNamesContribution extends Disposable {
    static { this.ID = 'workbench.contrib.toolReferenceNames'; }
    constructor(_languageModelToolsService) {
        super();
        this._languageModelToolsService = _languageModelToolsService;
        this._updateToolReferenceNames();
        this._register(this._languageModelToolsService.onDidChangeTools(() => this._updateToolReferenceNames()));
    }
    _updateToolReferenceNames() {
        const tools = Array.from(this._languageModelToolsService.getTools())
            .filter((tool) => typeof tool.toolReferenceName === 'string')
            .sort((a, b) => a.toolReferenceName.localeCompare(b.toolReferenceName));
        toolReferenceNameEnumValues.length = 0;
        toolReferenceNameEnumDescriptions.length = 0;
        for (const tool of tools) {
            toolReferenceNameEnumValues.push(tool.toolReferenceName);
            toolReferenceNameEnumDescriptions.push(nls.localize('chat.toolReferenceName.description', "{0} - {1}", tool.toolReferenceName, tool.userDescription || tool.displayName));
        }
        configurationRegistry.notifyConfigurationSchemaUpdated({
            id: 'chatSidebar',
            properties: {
                [ChatConfiguration.EligibleForAutoApproval]: {}
            }
        });
    }
};
ToolReferenceNamesContribution = __decorate([
    __param(0, ILanguageModelToolsService)
], ToolReferenceNamesContribution);
/**
 * Puku Auth Initialization Contribution
 * Initializes the Puku authentication service to restore existing sessions
 */
let PukuAuthInitContribution = class PukuAuthInitContribution extends Disposable {
    static { this.ID = 'workbench.contrib.pukuAuthInit'; }
    constructor(pukuAuthService) {
        super();
        this.pukuAuthService = pukuAuthService;
        // Initialize Puku auth service to restore session from storage
        this.pukuAuthService.initialize();
    }
};
PukuAuthInitContribution = __decorate([
    __param(0, IPukuAuthService)
], PukuAuthInitContribution);
AccessibleViewRegistry.register(new ChatTerminalOutputAccessibleView());
AccessibleViewRegistry.register(new ChatResponseAccessibleView());
AccessibleViewRegistry.register(new PanelChatAccessibilityHelp());
AccessibleViewRegistry.register(new QuickChatAccessibilityHelp());
AccessibleViewRegistry.register(new EditsChatAccessibilityHelp());
AccessibleViewRegistry.register(new AgentChatAccessibilityHelp());
registerEditorFeature(ChatInputBoxContentProvider);
let ChatSlashStaticSlashCommandsContribution = class ChatSlashStaticSlashCommandsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSlashStaticSlashCommands'; }
    constructor(slashCommandService, commandService, chatAgentService, chatWidgetService, instantiationService) {
        super();
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'clear',
            detail: nls.localize('clear', "Start a new chat"),
            sortText: 'z2_clear',
            executeImmediately: true,
            locations: [ChatAgentLocation.Chat]
        }, async () => {
            commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'help',
            detail: '',
            sortText: 'z1_help',
            executeImmediately: true,
            locations: [ChatAgentLocation.Chat],
            modes: [ChatModeKind.Ask]
        }, async (prompt, progress) => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat);
            const agents = chatAgentService.getAgents();
            // Report prefix
            if (defaultAgent?.metadata.helpTextPrefix) {
                if (isMarkdownString(defaultAgent.metadata.helpTextPrefix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPrefix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPrefix), kind: 'markdownContent' });
                }
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
            }
            // Report agent list
            const agentText = (await Promise.all(agents
                .filter(a => !a.isDefault && !a.isCore)
                .filter(a => a.locations.includes(ChatAgentLocation.Chat))
                .map(async (a) => {
                const description = a.description ? `- ${a.description}` : '';
                const agentMarkdown = instantiationService.invokeFunction(accessor => agentToMarkdown(a, true, accessor));
                const agentLine = `- ${agentMarkdown} ${description}`;
                const commandText = a.slashCommands.map(c => {
                    const description = c.description ? `- ${c.description}` : '';
                    return `\t* ${agentSlashCommandToMarkdown(a, c)} ${description}`;
                }).join('\n');
                return (agentLine + '\n' + commandText).trim();
            }))).join('\n');
            progress.report({ content: new MarkdownString(agentText, { isTrusted: { enabledCommands: [ChatSubmitAction.ID] } }), kind: 'markdownContent' });
            // Report help text ending
            if (defaultAgent?.metadata.helpTextPostfix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextPostfix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPostfix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPostfix), kind: 'markdownContent' });
                }
            }
            // Without this, the response will be done before it renders and so it will not stream. This ensures that if the response starts
            // rendering during the next 200ms, then it will be streamed. Once it starts streaming, the whole response streams even after
            // it has received all response data has been received.
            await timeout(200);
        }));
    }
};
ChatSlashStaticSlashCommandsContribution = __decorate([
    __param(0, IChatSlashCommandService),
    __param(1, ICommandService),
    __param(2, IChatAgentService),
    __param(3, IChatWidgetService),
    __param(4, IInstantiationService)
], ChatSlashStaticSlashCommandsContribution);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatEditorInput.TypeID, ChatEditorInputSerializer);
registerWorkbenchContribution2(ChatResolverContribution.ID, ChatResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatSlashStaticSlashCommandsContribution.ID, ChatSlashStaticSlashCommandsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatExtensionPointHandler.ID, ChatExtensionPointHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(LanguageModelToolsExtensionPointHandler.ID, LanguageModelToolsExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatPromptFilesExtensionPointHandler.ID, ChatPromptFilesExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatCompatibilityNotifier.ID, ChatCompatibilityNotifier, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(CopilotTitleBarMenuRendering.ID, CopilotTitleBarMenuRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(CodeBlockActionRendering.ID, CodeBlockActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatImplicitContextContribution.ID, ChatImplicitContextContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatRelatedFilesContribution.ID, ChatRelatedFilesContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatViewsWelcomeHandler.ID, ChatViewsWelcomeHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatGettingStartedContribution.ID, ChatGettingStartedContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatSetupContribution.ID, ChatSetupContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatTeardownContribution.ID, ChatTeardownContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(PukuAuthInitContribution.ID, PukuAuthInitContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatStatusBarEntry.ID, ChatStatusBarEntry, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(BuiltinToolsContribution.ID, BuiltinToolsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatAgentSettingContribution.ID, ChatAgentSettingContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ToolReferenceNamesContribution.ID, ToolReferenceNamesContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorAccessibility.ID, ChatEditingEditorAccessibility, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorOverlay.ID, ChatEditingEditorOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(SimpleBrowserOverlay.ID, SimpleBrowserOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorContextKeys.ID, ChatEditingEditorContextKeys, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatTransferContribution.ID, ChatTransferContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatContextContributions.ID, ChatContextContributions, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatResponseResourceFileSystemProvider.ID, ChatResponseResourceFileSystemProvider, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(PromptUrlHandler.ID, PromptUrlHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(LocalChatSessionsProvider.ID, LocalChatSessionsProvider, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatSessionsViewContrib.ID, ChatSessionsViewContrib, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatSessionsView.ID, ChatSessionsView, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatEditingNotebookFileSystemProviderContrib.ID, ChatEditingNotebookFileSystemProviderContrib, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(UserToolSetsContributions.ID, UserToolSetsContributions, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(PromptLanguageFeaturesProvider.ID, PromptLanguageFeaturesProvider, 4 /* WorkbenchPhase.Eventually */);
registerChatActions();
registerChatAccessibilityActions();
registerChatCopyActions();
registerChatCodeBlockActions();
registerChatCodeCompareBlockActions();
registerChatFileTreeActions();
registerChatPromptNavigationActions();
registerChatTitleActions();
registerChatExecuteActions();
registerQuickChatActions();
registerChatExportActions();
registerMoveActions();
registerNewChatActions();
registerChatContextActions();
registerChatDeveloperActions();
registerChatEditorActions();
registerChatElicitationActions();
registerChatToolActions();
registerLanguageModelActions();
registerEditorFeature(ChatPasteProvidersFeature);
registerSingleton(IChatTransferService, ChatTransferService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatService, ChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetService, ChatWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(IQuickChatService, QuickChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAccessibilityService, ChatAccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetHistoryService, ChatWidgetHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelsService, LanguageModelsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelStatsService, LanguageModelStatsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatSlashCommandService, ChatSlashCommandService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentService, ChatAgentService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentNameService, ChatAgentNameService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatVariablesService, ChatVariablesService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsService, LanguageModelToolsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsConfirmationService, LanguageModelToolsConfirmationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IVoiceChatService, VoiceChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatCodeBlockContextProviderService, ChatCodeBlockContextProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICodeMapperService, CodeMapperService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEditingService, ChatEditingService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatMarkdownAnchorService, ChatMarkdownAnchorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPromptsService, PromptsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatContextPickService, ChatContextPickService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatModeService, ChatModeService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAttachmentResolveService, ChatAttachmentResolveService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatTodoListService, ChatTodoListService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatOutputRendererService, ChatOutputRendererService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatLayoutService, ChatLayoutService, 1 /* InstantiationType.Delayed */);
registerAction2(ConfigureToolSets);
registerAction2(RenameChatSessionAction);
registerAction2(DeleteChatSessionAction);
registerAction2(OpenChatSessionInNewWindowAction);
registerAction2(OpenChatSessionInNewEditorGroupAction);
registerAction2(OpenChatSessionInSidebarAction);
registerAction2(ToggleChatSessionsDescriptionDisplayAction);
registerAction2(ChatSessionsGettingStartedAction);
registerAction2(ToggleAgentSessionsViewLocationAction);
ChatWidget.CONTRIBS.push(ChatDynamicVariableModel);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBa0UsTUFBTSxvRUFBb0UsQ0FBQztBQUMzTCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFB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