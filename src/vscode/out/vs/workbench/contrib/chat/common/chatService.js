/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunSelfDisposable } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export function isIDocumentContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'uri' in obj && obj.uri instanceof URI &&
        'version' in obj && typeof obj.version === 'number' &&
        'ranges' in obj && Array.isArray(obj.ranges) && obj.ranges.every(Range.isIRange));
}
export function isIUsedContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'documents' in obj &&
        Array.isArray(obj.documents) &&
        obj.documents.every(isIDocumentContext));
}
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export var ChatResponseClearToPreviousToolInvocationReason;
(function (ChatResponseClearToPreviousToolInvocationReason) {
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["NoReason"] = 0] = "NoReason";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["FilteredContentRetry"] = 1] = "FilteredContentRetry";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["CopyrightContentRetry"] = 2] = "CopyrightContentRetry";
})(ChatResponseClearToPreviousToolInvocationReason || (ChatResponseClearToPreviousToolInvocationReason = {}));
export var ElicitationState;
(function (ElicitationState) {
    ElicitationState["Pending"] = "pending";
    ElicitationState["Accepted"] = "accepted";
    ElicitationState["Rejected"] = "rejected";
})(ElicitationState || (ElicitationState = {}));
export var ToolConfirmKind;
(function (ToolConfirmKind) {
    ToolConfirmKind[ToolConfirmKind["Denied"] = 0] = "Denied";
    ToolConfirmKind[ToolConfirmKind["ConfirmationNotNeeded"] = 1] = "ConfirmationNotNeeded";
    ToolConfirmKind[ToolConfirmKind["Setting"] = 2] = "Setting";
    ToolConfirmKind[ToolConfirmKind["LmServicePerTool"] = 3] = "LmServicePerTool";
    ToolConfirmKind[ToolConfirmKind["UserAction"] = 4] = "UserAction";
    ToolConfirmKind[ToolConfirmKind["Skipped"] = 5] = "Skipped";
})(ToolConfirmKind || (ToolConfirmKind = {}));
export var IChatToolInvocation;
(function (IChatToolInvocation) {
    let StateKind;
    (function (StateKind) {
        StateKind[StateKind["WaitingForConfirmation"] = 0] = "WaitingForConfirmation";
        StateKind[StateKind["Executing"] = 1] = "Executing";
        StateKind[StateKind["WaitingForPostApproval"] = 2] = "WaitingForPostApproval";
        StateKind[StateKind["Completed"] = 3] = "Completed";
        StateKind[StateKind["Cancelled"] = 4] = "Cancelled";
    })(StateKind = IChatToolInvocation.StateKind || (IChatToolInvocation.StateKind = {}));
    function executionConfirmedOrDenied(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            if (invocation.isConfirmed === undefined || typeof invocation.isConfirmed === 'boolean') {
                return { type: invocation.isConfirmed ? 4 /* ToolConfirmKind.UserAction */ : 0 /* ToolConfirmKind.Denied */ };
            }
            return invocation.isConfirmed;
        }
        const state = invocation.state.read(reader);
        if (state.type === 0 /* StateKind.WaitingForConfirmation */) {
            return undefined; // don't know yet
        }
        if (state.type === 4 /* StateKind.Cancelled */) {
            return { type: state.reason };
        }
        return state.confirmed;
    }
    IChatToolInvocation.executionConfirmedOrDenied = executionConfirmedOrDenied;
    function awaitConfirmation(invocation, token) {
        const reason = executionConfirmedOrDenied(invocation);
        if (reason) {
            return Promise.resolve(reason);
        }
        const store = new DisposableStore();
        return new Promise(resolve => {
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve({ type: 0 /* ToolConfirmKind.Denied */ });
                }));
            }
            store.add(autorun(reader => {
                const reason = executionConfirmedOrDenied(invocation, reader);
                if (reason) {
                    store.dispose();
                    resolve(reason);
                }
            }));
        }).finally(() => {
            store.dispose();
        });
    }
    IChatToolInvocation.awaitConfirmation = awaitConfirmation;
    function postApprovalConfirmedOrDenied(invocation, reader) {
        const state = invocation.state.read(reader);
        if (state.type === 3 /* StateKind.Completed */) {
            return state.postConfirmed || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ };
        }
        if (state.type === 4 /* StateKind.Cancelled */) {
            return { type: state.reason };
        }
        return undefined;
    }
    function confirmWith(invocation, reason) {
        const state = invocation?.state.get();
        if (state?.type === 0 /* StateKind.WaitingForConfirmation */ || state?.type === 2 /* StateKind.WaitingForPostApproval */) {
            state.confirm(reason);
            return true;
        }
        return false;
    }
    IChatToolInvocation.confirmWith = confirmWith;
    function awaitPostConfirmation(invocation, token) {
        const reason = postApprovalConfirmedOrDenied(invocation);
        if (reason) {
            return Promise.resolve(reason);
        }
        const store = new DisposableStore();
        return new Promise(resolve => {
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve({ type: 0 /* ToolConfirmKind.Denied */ });
                }));
            }
            store.add(autorun(reader => {
                const reason = postApprovalConfirmedOrDenied(invocation, reader);
                if (reason) {
                    store.dispose();
                    resolve(reason);
                }
            }));
        }).finally(() => {
            store.dispose();
        });
    }
    IChatToolInvocation.awaitPostConfirmation = awaitPostConfirmation;
    function resultDetails(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return invocation.resultDetails;
        }
        const state = invocation.state.read(reader);
        if (state.type === 3 /* StateKind.Completed */ || state.type === 2 /* StateKind.WaitingForPostApproval */) {
            return state.resultDetails;
        }
        return undefined;
    }
    IChatToolInvocation.resultDetails = resultDetails;
    function isComplete(invocation, reader) {
        if ('isComplete' in invocation) { // serialized
            return true; // always cancelled or complete
        }
        const state = invocation.state.read(reader);
        return state.type === 3 /* StateKind.Completed */ || state.type === 4 /* StateKind.Cancelled */;
    }
    IChatToolInvocation.isComplete = isComplete;
})(IChatToolInvocation || (IChatToolInvocation = {}));
export class ChatMcpServersStarting {
    get isEmpty() {
        const s = this.state.get();
        return !s.working && s.serversRequiringInteraction.length === 0;
    }
    constructor(state) {
        this.state = state;
        this.kind = 'mcpServersStarting';
        this.didStartServerIds = [];
    }
    wait() {
        return new Promise(resolve => {
            autorunSelfDisposable(reader => {
                const s = this.state.read(reader);
                if (!s.working) {
                    reader.dispose();
                    resolve(s);
                }
            });
        });
    }
    toJSON() {
        return { kind: 'mcpServersStarting', didStartServerIds: this.didStartServerIds };
    }
}
export function isChatFollowup(obj) {
    return (!!obj &&
        obj.kind === 'reply' &&
        typeof obj.message === 'string' &&
        typeof obj.agentId === 'string');
}
export var ChatAgentVoteDirection;
(function (ChatAgentVoteDirection) {
    ChatAgentVoteDirection[ChatAgentVoteDirection["Down"] = 0] = "Down";
    ChatAgentVoteDirection[ChatAgentVoteDirection["Up"] = 1] = "Up";
})(ChatAgentVoteDirection || (ChatAgentVoteDirection = {}));
export var ChatAgentVoteDownReason;
(function (ChatAgentVoteDownReason) {
    ChatAgentVoteDownReason["IncorrectCode"] = "incorrectCode";
    ChatAgentVoteDownReason["DidNotFollowInstructions"] = "didNotFollowInstructions";
    ChatAgentVoteDownReason["IncompleteCode"] = "incompleteCode";
    ChatAgentVoteDownReason["MissingContext"] = "missingContext";
    ChatAgentVoteDownReason["PoorlyWrittenOrFormatted"] = "poorlyWrittenOrFormatted";
    ChatAgentVoteDownReason["RefusedAValidRequest"] = "refusedAValidRequest";
    ChatAgentVoteDownReason["OffensiveOrUnsafe"] = "offensiveOrUnsafe";
    ChatAgentVoteDownReason["Other"] = "other";
    ChatAgentVoteDownReason["WillReportIssue"] = "willReportIssue";
})(ChatAgentVoteDownReason || (ChatAgentVoteDownReason = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    // Keyboard shortcut or context menu
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export const IChatService = createDecorator('IChatService');
export const KEYWORD_ACTIVIATION_SETTING_ID = 'accessibility.voice.keywordActivation';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUU3RyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUl4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFtQjdGLE1BQU0sQ0FBTixJQUFZLGNBSVg7QUFKRCxXQUFZLGNBQWM7SUFDekIsbURBQVEsQ0FBQTtJQUNSLHlEQUFXLENBQUE7SUFDWCxxREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUpXLGNBQWMsS0FBZCxjQUFjLFFBSXpCO0FBaUNELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFZO0lBQzlDLE9BQU8sQ0FDTixDQUFDLENBQUMsR0FBRztRQUNMLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsS0FBSyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxZQUFZLEdBQUc7UUFDdEMsU0FBUyxJQUFJLEdBQUcsSUFBSSxPQUFPLEdBQUcsQ0FBQyxPQUFPLEtBQUssUUFBUTtRQUNuRCxRQUFRLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FD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