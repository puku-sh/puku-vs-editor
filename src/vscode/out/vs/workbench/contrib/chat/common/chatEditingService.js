/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeHex, encodeHex, VSBuffer } from '../../../../base/common/buffer.js';
import { autorunSelfDisposable } from '../../../../base/common/observable.js';
import { hasKey } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatEditingService = createDecorator('chatEditingService');
export function chatEditingSessionIsReady(session) {
    return new Promise(resolve => {
        autorunSelfDisposable(reader => {
            const state = session.state.read(reader);
            if (state !== 0 /* ChatEditingSessionState.Initial */) {
                reader.dispose();
                resolve();
            }
        });
    });
}
export var ModifiedFileEntryState;
(function (ModifiedFileEntryState) {
    ModifiedFileEntryState[ModifiedFileEntryState["Modified"] = 0] = "Modified";
    ModifiedFileEntryState[ModifiedFileEntryState["Accepted"] = 1] = "Accepted";
    ModifiedFileEntryState[ModifiedFileEntryState["Rejected"] = 2] = "Rejected";
})(ModifiedFileEntryState || (ModifiedFileEntryState = {}));
export var ChatEditingSessionState;
(function (ChatEditingSessionState) {
    ChatEditingSessionState[ChatEditingSessionState["Initial"] = 0] = "Initial";
    ChatEditingSessionState[ChatEditingSessionState["StreamingEdits"] = 1] = "StreamingEdits";
    ChatEditingSessionState[ChatEditingSessionState["Idle"] = 2] = "Idle";
    ChatEditingSessionState[ChatEditingSessionState["Disposed"] = 3] = "Disposed";
})(ChatEditingSessionState || (ChatEditingSessionState = {}));
export const CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME = 'chat-editing-multi-diff-source';
export const chatEditingWidgetFileStateContextKey = new RawContextKey('chatEditingWidgetFileState', undefined, localize('chatEditingWidgetFileState', "The current state of the file in the chat editing widget"));
export const chatEditingAgentSupportsReadonlyReferencesContextKey = new RawContextKey('chatEditingAgentSupportsReadonlyReferences', undefined, localize('chatEditingAgentSupportsReadonlyReferences', "Whether the chat editing agent supports readonly references (temporary)"));
export const decidedChatEditingResourceContextKey = new RawContextKey('decidedChatEditingResource', []);
export const chatEditingResourceContextKey = new RawContextKey('chatEditingResource', undefined);
export const inChatEditingSessionContextKey = new RawContextKey('inChatEditingSession', undefined);
export const hasUndecidedChatEditingResourceContextKey = new RawContextKey('hasUndecidedChatEditingResource', false);
export const hasAppliedChatEditsContextKey = new RawContextKey('hasAppliedChatEdits', false);
export const applyingChatEditsFailedContextKey = new RawContextKey('applyingChatEditsFailed', false);
export const chatEditingMaxFileAssignmentName = 'chatEditingSessionFileLimit';
export const defaultChatEditingMaxFileLimit = 10;
export var ChatEditKind;
(function (ChatEditKind) {
    ChatEditKind[ChatEditKind["Created"] = 0] = "Created";
    ChatEditKind[ChatEditKind["Modified"] = 1] = "Modified";
})(ChatEditKind || (ChatEditKind = {}));
export function isChatEditingActionContext(thing) {
    return typeof thing === 'object' && !!thing && hasKey(thing, { sessionResource: true });
}
export function getMultiDiffSourceUri(session, showPreviousChanges) {
    return URI.from({
        scheme: CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME,
        authority: encodeHex(VSBuffer.fromString(session.chatSessionResource.toString())),
        query: showPreviousChanges ? 'previous' : undefined,
    });
}
export function parseChatMultiDiffUri(uri) {
    const chatSessionResource = URI.parse(decodeHex(uri.authority).toString());
    const showPreviousChanges = uri.query === 'previous';
    return { chatSessionResource, showPreviousChanges };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEVkaXRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSW5GLE9BQU8sRUFBRSxxQkFBcUIsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBS3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTzdGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQTJKOUYsTUFBTSxVQUFVLHlCQUF5QixDQUFDLE9BQTRCO0lBQ3JFLE9BQU8sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7UUFDbEMscUJBQXFCLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDOUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsSUFBSSxLQUFLLDRDQUFvQyxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1FBQ0YsQ0FBQyxDQUFD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