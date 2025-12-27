/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { IChatSessionsService } from './chatSessionsService.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["Edits2Enabled"] = "chat.edits2.enabled";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
    ChatConfiguration["EditRequests"] = "chat.editRequests";
    ChatConfiguration["GlobalAutoApprove"] = "chat.tools.global.autoApprove";
    ChatConfiguration["AutoApproveEdits"] = "chat.tools.edits.autoApprove";
    ChatConfiguration["AutoApprovedUrls"] = "chat.tools.urls.autoApprove";
    ChatConfiguration["EligibleForAutoApproval"] = "chat.tools.eligibleForAutoApproval";
    ChatConfiguration["EnableMath"] = "chat.math.enabled";
    ChatConfiguration["CheckpointsEnabled"] = "chat.checkpoints.enabled";
    ChatConfiguration["AgentSessionsViewLocation"] = "chat.agentSessionsViewLocation";
    ChatConfiguration["ThinkingStyle"] = "chat.agent.thinkingStyle";
    ChatConfiguration["TodosShowWidget"] = "chat.tools.todos.showWidget";
    ChatConfiguration["ShowAgentSessionsViewDescription"] = "chat.showAgentSessionsViewDescription";
    ChatConfiguration["EmptyStateHistoryEnabled"] = "chat.emptyState.history.enabled";
    ChatConfiguration["NotifyWindowOnResponseReceived"] = "chat.notifyWindowOnResponseReceived";
    ChatConfiguration["SubagentToolCustomAgents"] = "chat.customAgentInSubagent.enabled";
    ChatConfiguration["ShowCodeBlockProgressAnimation"] = "chat.agent.codeBlockProgress";
})(ChatConfiguration || (ChatConfiguration = {}));
/**
 * The "kind" of agents for custom agents.
 */
export var ChatModeKind;
(function (ChatModeKind) {
    ChatModeKind["Ask"] = "ask";
    ChatModeKind["Edit"] = "edit";
    ChatModeKind["Agent"] = "agent";
})(ChatModeKind || (ChatModeKind = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatModeKind.Ask:
        case ChatModeKind.Edit:
        case ChatModeKind.Agent:
            return mode;
        default:
            return undefined;
    }
}
export function isChatMode(mode) {
    return !!validateChatMode(mode);
}
// Thinking display modes for pinned content
export var ThinkingDisplayMode;
(function (ThinkingDisplayMode) {
    ThinkingDisplayMode["Collapsed"] = "collapsed";
    ThinkingDisplayMode["CollapsedPreview"] = "collapsedPreview";
    ThinkingDisplayMode["FixedScrolling"] = "fixedScrolling";
})(ThinkingDisplayMode || (ThinkingDisplayMode = {}));
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    /**
     * This is chat, whether it's in the sidebar, a chat editor, or quick chat.
     * Leaving the values alone as they are in stored data so we don't have to normalize them.
     */
    ChatAgentLocation["Chat"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    /**
     * EditorInline means inline chat in a text editor.
     */
    ChatAgentLocation["EditorInline"] = "editor";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Chat;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.EditorInline;
        }
        return ChatAgentLocation.Chat;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
/**
 * List of file schemes that are always unsupported for use in chat
 */
const chatAlwaysUnsupportedFileSchemes = new Set([
    Schemas.vscodeChatEditor,
    Schemas.walkThrough,
    Schemas.vscodeLocalChatSession,
    Schemas.vscodeSettings,
    Schemas.webviewPanel,
    Schemas.vscodeUserData,
    Schemas.extension,
    'ccreq',
    'openai-codex', // Codex session custom editor scheme
]);
export function isSupportedChatFileScheme(accessor, scheme) {
    const chatService = accessor.get(IChatSessionsService);
    // Exclude schemes we always know are bad
    if (chatAlwaysUnsupportedFileSchemes.has(scheme)) {
        return false;
    }
    // Plus any schemes used by content providers
    if (chatService.getContentProviderSchemes().includes(scheme)) {
        return false;
    }
    // Everything else is supported
    return true;
}
/** @deprecated */
export const LEGACY_AGENT_SESSIONS_VIEW_ID = 'workbench.view.chat.sessions'; // TODO@bpasero clear once settled
export const MANAGE_CHAT_COMMAND_ID = 'workbench.action.chat.manage';
export const ChatEditorTitleMaxLength = 30;
export const CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES = 1000;
export const CONTEXT_MODELS_EDITOR = new RawContextKey('inModelsEditor', false);
export const CONTEXT_MODELS_SEARCH_FOCUS = new RawContextKey('inModelsSearch', false);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsTUFBTSxDQUFOLElBQVksaUJBbUJYO0FBbkJELFdBQVksaUJBQWlCO0lBQzVCLHdEQUFtQyxDQUFBO0lBQ25DLDBEQUFxQyxDQUFBO0lBQ3JDLDBFQUFxRCxDQUFBO0lBQ3JELHVEQUFrQyxDQUFBO0lBQ2xDLHdFQUFtRCxDQUFBO0lBQ25ELHNFQUFpRCxDQUFBO0lBQ2pELHFFQUFnRCxDQUFBO0lBQ2hELG1GQUE4RCxDQUFBO0lBQzlELHFEQUFnQyxDQUFBO0lBQ2hDLG9FQUErQyxDQUFBO0lBQy9DLGlGQUE0RCxDQUFBO0lBQzVELCtEQUEwQyxDQUFBO0lBQzFDLG9FQUErQyxDQUFBO0lBQy9DLCtGQUEwRSxDQUFBO0lBQzFFLGlGQUE0RCxDQUFBO0lBQzVELDJGQUFzRSxDQUFBO0lBQ3RFLG9GQUErRCxDQUFBO0lBQy9ELG9GQUErRCxDQUFBO0FBQ2hFLENBQUMsRUFuQlcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQW1CNUI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFlBSVg7QUFKRCxXQUFZLFlBQVk7SUFDdkIsMkJBQVcsQ0FBQTtJQUNYLDZCQUFhLENBQUE7SUFDYiwrQkFBZSxDQUFBO0FBQ2hCLENBQUMsRUFKVyxZQUFZLEtBQVosWUFBWSxRQUl2QjtBQUVELE1B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