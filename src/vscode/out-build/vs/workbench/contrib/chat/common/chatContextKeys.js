/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
import { ChatEntitlementContextKeys } from '../../../services/chat/common/chatEntitlementService.js';
import { ChatConfiguration, ChatModeKind } from './constants.js';
export var ChatContextKeys;
(function (ChatContextKeys) {
    ChatContextKeys.responseVote = new RawContextKey('chatSessionResponseVote', '', { type: 'string', description: localize(6359, null) });
    ChatContextKeys.responseDetectedAgentCommand = new RawContextKey('chatSessionResponseDetectedAgentOrCommand', false, { type: 'boolean', description: localize(6360, null) });
    ChatContextKeys.responseSupportsIssueReporting = new RawContextKey('chatResponseSupportsIssueReporting', false, { type: 'boolean', description: localize(6361, null) });
    ChatContextKeys.responseIsFiltered = new RawContextKey('chatSessionResponseFiltered', false, { type: 'boolean', description: localize(6362, null) });
    ChatContextKeys.responseHasError = new RawContextKey('chatSessionResponseError', false, { type: 'boolean', description: localize(6363, null) });
    ChatContextKeys.requestInProgress = new RawContextKey('chatSessionRequestInProgress', false, { type: 'boolean', description: localize(6364, null) });
    ChatContextKeys.currentlyEditing = new RawContextKey('chatSessionCurrentlyEditing', false, { type: 'boolean', description: localize(6365, null) });
    ChatContextKeys.currentlyEditingInput = new RawContextKey('chatSessionCurrentlyEditingInput', false, { type: 'boolean', description: localize(6366, null) });
    ChatContextKeys.isResponse = new RawContextKey('chatResponse', false, { type: 'boolean', description: localize(6367, null) });
    ChatContextKeys.isRequest = new RawContextKey('chatRequest', false, { type: 'boolean', description: localize(6368, null) });
    ChatContextKeys.itemId = new RawContextKey('chatItemId', '', { type: 'string', description: localize(6369, null) });
    ChatContextKeys.lastItemId = new RawContextKey('chatLastItemId', [], { type: 'string', description: localize(6370, null) });
    ChatContextKeys.editApplied = new RawContextKey('chatEditApplied', false, { type: 'boolean', description: localize(6371, null) });
    ChatContextKeys.inputHasText = new RawContextKey('chatInputHasText', false, { type: 'boolean', description: localize(6372, null) });
    ChatContextKeys.inputHasFocus = new RawContextKey('chatInputHasFocus', false, { type: 'boolean', description: localize(6373, null) });
    ChatContextKeys.inChatInput = new RawContextKey('inChatInput', false, { type: 'boolean', description: localize(6374, null) });
    ChatContextKeys.inChatSession = new RawContextKey('inChat', false, { type: 'boolean', description: localize(6375, null) });
    ChatContextKeys.inChatEditor = new RawContextKey('inChatEditor', false, { type: 'boolean', description: localize(6376, null) });
    ChatContextKeys.inChatTerminalToolOutput = new RawContextKey('inChatTerminalToolOutput', false, { type: 'boolean', description: localize(6377, null) });
    ChatContextKeys.chatModeKind = new RawContextKey('chatAgentKind', ChatModeKind.Ask, { type: 'string', description: localize(6378, null) });
    ChatContextKeys.chatToolCount = new RawContextKey('chatToolCount', 0, { type: 'number', description: localize(6379, null) });
    ChatContextKeys.chatToolGroupingThreshold = new RawContextKey('chat.toolGroupingThreshold', 0, { type: 'number', description: localize(6380, null) });
    ChatContextKeys.supported = ContextKeyExpr.or(IsWebContext.negate(), RemoteNameContext.notEqualsTo(''), ContextKeyExpr.has('config.chat.experimental.serverlessWebEnabled'));
    ChatContextKeys.enabled = new RawContextKey('chatIsEnabled', false, { type: 'boolean', description: localize(6381, null) });
    /**
     * True when the chat widget is locked to the coding agent session.
     */
    ChatContextKeys.lockedToCodingAgent = new RawContextKey('lockedToCodingAgent', false, { type: 'boolean', description: localize(6382, null) });
    ChatContextKeys.agentSupportsAttachments = new RawContextKey('agentSupportsAttachments', false, { type: 'boolean', description: localize(6383, null) });
    ChatContextKeys.withinEditSessionDiff = new RawContextKey('withinEditSessionDiff', false, { type: 'boolean', description: localize(6384, null) });
    ChatContextKeys.filePartOfEditSession = new RawContextKey('filePartOfEditSession', false, { type: 'boolean', description: localize(6385, null) });
    ChatContextKeys.extensionParticipantRegistered = new RawContextKey('chatPanelExtensionParticipantRegistered', false, { type: 'boolean', description: localize(6386, null) });
    ChatContextKeys.panelParticipantRegistered = new RawContextKey('chatPanelParticipantRegistered', false, { type: 'boolean', description: localize(6387, null) });
    ChatContextKeys.chatEditingCanUndo = new RawContextKey('chatEditingCanUndo', false, { type: 'boolean', description: localize(6388, null) });
    ChatContextKeys.chatEditingCanRedo = new RawContextKey('chatEditingCanRedo', false, { type: 'boolean', description: localize(6389, null) });
    ChatContextKeys.languageModelsAreUserSelectable = new RawContextKey('chatModelsAreUserSelectable', false, { type: 'boolean', description: localize(6390, null) });
    ChatContextKeys.chatSessionHasModels = new RawContextKey('chatSessionHasModels', false, { type: 'boolean', description: localize(6391, null) });
    ChatContextKeys.extensionInvalid = new RawContextKey('chatExtensionInvalid', false, { type: 'boolean', description: localize(6392, null) });
    ChatContextKeys.inputCursorAtTop = new RawContextKey('chatCursorAtTop', false);
    ChatContextKeys.inputHasAgent = new RawContextKey('chatInputHasAgent', false);
    ChatContextKeys.location = new RawContextKey('chatLocation', undefined);
    ChatContextKeys.inQuickChat = new RawContextKey('quickChatHasFocus', false, { type: 'boolean', description: localize(6393, null) });
    ChatContextKeys.hasFileAttachments = new RawContextKey('chatHasFileAttachments', false, { type: 'boolean', description: localize(6394, null) });
    ChatContextKeys.remoteJobCreating = new RawContextKey('chatRemoteJobCreating', false, { type: 'boolean', description: localize(6395, null) });
    ChatContextKeys.hasRemoteCodingAgent = new RawContextKey('hasRemoteCodingAgent', false, localize(6396, null));
    ChatContextKeys.enableRemoteCodingAgentPromptFileOverlay = new RawContextKey('enableRemoteCodingAgentPromptFileOverlay', false, localize(6397, null));
    /** Used by the extension to skip the quit confirmation when #new wants to open a new folder */
    ChatContextKeys.skipChatRequestInProgressMessage = new RawContextKey('chatSkipRequestInProgressMessage', false, { type: 'boolean', description: localize(6398, null) });
    // Re-exported from chat entitlement service
    ChatContextKeys.Setup = ChatEntitlementContextKeys.Setup;
    ChatContextKeys.Entitlement = ChatEntitlementContextKeys.Entitlement;
    ChatContextKeys.chatQuotaExceeded = ChatEntitlementContextKeys.chatQuotaExceeded;
    ChatContextKeys.completionsQuotaExceeded = ChatEntitlementContextKeys.completionsQuotaExceeded;
    ChatContextKeys.Editing = {
        hasToolConfirmation: new RawContextKey('chatHasToolConfirmation', false, { type: 'boolean', description: localize(6399, null) }),
        hasElicitationRequest: new RawContextKey('chatHasElicitationRequest', false, { type: 'boolean', description: localize(6400, null) }),
    };
    ChatContextKeys.Tools = {
        toolsCount: new RawContextKey('toolsCount', 0, { type: 'number', description: localize(6401, null) })
    };
    ChatContextKeys.Modes = {
        hasCustomChatModes: new RawContextKey('chatHasCustomAgents', false, { type: 'boolean', description: localize(6402, null) }),
    };
    ChatContextKeys.panelLocation = new RawContextKey('chatPanelLocation', undefined, { type: 'number', description: localize(6403, null) });
    ChatContextKeys.inEmptyStateWithHistoryEnabled = new RawContextKey('chatInEmptyStateWithHistoryEnabled', false, { type: 'boolean', description: localize(6404, null) });
    ChatContextKeys.sessionType = new RawContextKey('chatSessionType', '', { type: 'string', description: localize(6405, null) });
    ChatContextKeys.isArchivedItem = new RawContextKey('chatIsArchivedItem', false, { type: 'boolean', description: localize(6406, null) });
    ChatContextKeys.isActiveSession = new RawContextKey('chatIsActiveSession', false, { type: 'boolean', description: localize(6407, null) });
    ChatContextKeys.isKatexMathElement = new RawContextKey('chatIsKatexMathElement', false, { type: 'boolean', description: localize(6408, null) });
})(ChatContextKeys || (ChatContextKeys = {}));
export var ChatContextKeyExprs;
(function (ChatContextKeyExprs) {
    ChatContextKeyExprs.inEditingMode = ContextKeyExpr.or(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Edit), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent));
    /**
     * Context expression that indicates when the welcome/setup view should be shown
     */
    ChatContextKeyExprs.chatSetupTriggerContext = ContextKeyExpr.or(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp);
    ChatContextKeyExprs.agentViewWhen = ContextKeyExpr.and(ChatEntitlementContextKeys.Setup.hidden.negate(), ChatEntitlementContextKeys.Setup.disabled.negate(), ContextKeyExpr.equals(`config.${ChatConfiguration.AgentSessionsViewLocation}`, 'view'));
})(ChatContextKeyExprs || (ChatContextKeyExprs = {}));
//# sourceMappingURL=chatContextKeys.js.map