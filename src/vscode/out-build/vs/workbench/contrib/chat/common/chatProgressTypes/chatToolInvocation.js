/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { encodeBase64 } from '../../../../../base/common/buffer.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { IChatToolInvocation } from '../chatService.js';
import { isToolResultOutputDetails } from '../languageModelToolsService.js';
export class ChatToolInvocation {
    get state() {
        return this._state;
    }
    constructor(preparedInvocation, toolData, toolCallId, fromSubAgent, parameters) {
        this.toolCallId = toolCallId;
        this.kind = 'toolInvocation';
        this._progress = observableValue(this, { progress: 0 });
        const defaultMessage = localize(6419, null, `"${toolData.displayName}"`);
        const invocationMessage = preparedInvocation?.invocationMessage ?? defaultMessage;
        this.invocationMessage = invocationMessage;
        this.pastTenseMessage = preparedInvocation?.pastTenseMessage;
        this.originMessage = preparedInvocation?.originMessage;
        this.confirmationMessages = preparedInvocation?.confirmationMessages;
        this.presentation = preparedInvocation?.presentation;
        this.toolSpecificData = preparedInvocation?.toolSpecificData;
        this.toolId = toolData.id;
        this.source = toolData.source;
        this.fromSubAgent = fromSubAgent;
        this.parameters = parameters;
        if (!this.confirmationMessages?.title) {
            this._state = observableValue(this, { type: 1 /* IChatToolInvocation.StateKind.Executing */, confirmed: { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ }, progress: this._progress });
        }
        else {
            this._state = observableValue(this, {
                type: 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */,
                confirm: reason => {
                    if (reason.type === 0 /* ToolConfirmKind.Denied */ || reason.type === 5 /* ToolConfirmKind.Skipped */) {
                        this._state.set({ type: 4 /* IChatToolInvocation.StateKind.Cancelled */, reason: reason.type }, undefined);
                    }
                    else {
                        this._state.set({ type: 1 /* IChatToolInvocation.StateKind.Executing */, confirmed: reason, progress: this._progress }, undefined);
                    }
                }
            });
        }
    }
    _setCompleted(result, postConfirmed) {
        if (postConfirmed && (postConfirmed.type === 0 /* ToolConfirmKind.Denied */ || postConfirmed.type === 5 /* ToolConfirmKind.Skipped */)) {
            this._state.set({ type: 4 /* IChatToolInvocation.StateKind.Cancelled */, reason: postConfirmed.type }, undefined);
            return;
        }
        this._state.set({
            type: 3 /* IChatToolInvocation.StateKind.Completed */,
            confirmed: IChatToolInvocation.executionConfirmedOrDenied(this) || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
            resultDetails: result?.toolResultDetails,
            postConfirmed,
            contentForModel: result?.content || [],
        }, undefined);
    }
    didExecuteTool(result, final) {
        if (result?.toolResultMessage) {
            this.pastTenseMessage = result.toolResultMessage;
        }
        else if (this._progress.get().message) {
            this.pastTenseMessage = this._progress.get().message;
        }
        if (this.confirmationMessages?.confirmResults && !result?.toolResultError && result?.confirmResults !== false && !final) {
            this._state.set({
                type: 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */,
                confirmed: IChatToolInvocation.executionConfirmedOrDenied(this) || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ },
                resultDetails: result?.toolResultDetails,
                contentForModel: result?.content || [],
                confirm: reason => this._setCompleted(result, reason),
            }, undefined);
        }
        else {
            this._setCompleted(result);
        }
        return this._state.get();
    }
    acceptProgress(step) {
        const prev = this._progress.get();
        this._progress.set({
            progress: step.progress || prev.progress || 0,
            message: step.message,
        }, undefined);
    }
    toJSON() {
        // persist the serialized call as 'skipped' if we were waiting for postapproval
        const waitingForPostApproval = this.state.get().type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */;
        const details = waitingForPostApproval ? undefined : IChatToolInvocation.resultDetails(this);
        return {
            kind: 'toolInvocationSerialized',
            presentation: this.presentation,
            invocationMessage: this.invocationMessage,
            pastTenseMessage: this.pastTenseMessage,
            originMessage: this.originMessage,
            isConfirmed: waitingForPostApproval ? { type: 5 /* ToolConfirmKind.Skipped */ } : IChatToolInvocation.executionConfirmedOrDenied(this),
            isComplete: true,
            source: this.source,
            resultDetails: isToolResultOutputDetails(details)
                ? { output: { type: 'data', mimeType: details.output.mimeType, base64Data: encodeBase64(details.output.value) } }
                : details,
            toolSpecificData: this.toolSpecificData,
            toolCallId: this.toolCallId,
            toolId: this.toolId,
            fromSubAgent: this.fromSubAgent,
        };
    }
}
//# sourceMappingURL=chatToolInvocation.js.map