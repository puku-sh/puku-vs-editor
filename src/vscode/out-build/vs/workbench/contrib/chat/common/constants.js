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
//# sourceMappingURL=constants.js.map