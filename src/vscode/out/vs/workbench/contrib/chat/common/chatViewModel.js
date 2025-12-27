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
import { Emitter } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { annotateVulnerabilitiesInText } from './annotations.js';
import { getFullyQualifiedId, IChatAgentNameService } from './chatAgents.js';
import { countWords } from './chatWordCounter.js';
import { Codicon } from '../../../../base/common/codicons.js';
export function isRequestVM(item) {
    return !!item && typeof item === 'object' && 'message' in item;
}
export function isResponseVM(item) {
    return !!item && typeof item.setVote !== 'undefined';
}
export function isChatTreeItem(item) {
    return isRequestVM(item) || isResponseVM(item);
}
export function assertIsResponseVM(item) {
    if (!isResponseVM(item)) {
        throw new Error('Expected item to be IChatResponseViewModel');
    }
}
let ChatViewModel = class ChatViewModel extends Disposable {
    get inputPlaceholder() {
        return this._inputPlaceholder;
    }
    get model() {
        return this._model;
    }
    setInputPlaceholder(text) {
        this._inputPlaceholder = text;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    resetInputPlaceholder() {
        this._inputPlaceholder = undefined;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    get sessionResource() {
        return this._model.sessionResource;
    }
    constructor(_model, codeBlockModelCollection, instantiationService) {
        super();
        this._model = _model;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.instantiationService = instantiationService;
        this._onDidDisposeModel = this._register(new Emitter());
        this.onDidDisposeModel = this._onDidDisposeModel.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._items = [];
        this._inputPlaceholder = undefined;
        this._editing = undefined;
        _model.getRequests().forEach((request, i) => {
            const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, request);
            this._items.push(requestModel);
            this.updateCodeBlockTextModels(requestModel);
            if (request.response) {
                this.onAddResponse(request.response);
            }
        });
        this._register(_model.onDidDispose(() => this._onDidDisposeModel.fire()));
        this._register(_model.onDidChange(e => {
            if (e.kind === 'addRequest') {
                const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, e.request);
                this._items.push(requestModel);
                this.updateCodeBlockTextModels(requestModel);
                if (e.request.response) {
                    this.onAddResponse(e.request.response);
                }
            }
            else if (e.kind === 'addResponse') {
                this.onAddResponse(e.response);
            }
            else if (e.kind === 'removeRequest') {
                const requestIdx = this._items.findIndex(item => isRequestVM(item) && item.id === e.requestId);
                if (requestIdx >= 0) {
                    this._items.splice(requestIdx, 1);
                }
                const responseIdx = e.responseId && this._items.findIndex(item => isResponseVM(item) && item.id === e.responseId);
                if (typeof responseIdx === 'number' && responseIdx >= 0) {
                    const items = this._items.splice(responseIdx, 1);
                    const item = items[0];
                    if (item instanceof ChatResponseViewModel) {
                        item.dispose();
                    }
                }
            }
            const modelEventToVmEvent = e.kind === 'addRequest' ? { kind: 'addRequest' }
                : e.kind === 'initialize' ? { kind: 'initialize' }
                    : e.kind === 'setHidden' ? { kind: 'setHidden' }
                        : null;
            this._onDidChange.fire(modelEventToVmEvent);
        }));
    }
    onAddResponse(responseModel) {
        const response = this.instantiationService.createInstance(ChatResponseViewModel, responseModel, this);
        this._register(response.onDidChange(() => {
            if (response.isComplete) {
                this.updateCodeBlockTextModels(response);
            }
            return this._onDidChange.fire(null);
        }));
        this._items.push(response);
        this.updateCodeBlockTextModels(response);
    }
    getItems() {
        return this._items.filter((item) => !item.shouldBeRemovedOnSend || item.shouldBeRemovedOnSend.afterUndoStop);
    }
    get editing() {
        return this._editing;
    }
    setEditing(editing) {
        if (this.editing && editing && this.editing.id === editing.id) {
            return; // already editing this request
        }
        this._editing = editing;
    }
    dispose() {
        super.dispose();
        dispose(this._items.filter((item) => item instanceof ChatResponseViewModel));
    }
    updateCodeBlockTextModels(model) {
        let content;
        if (isRequestVM(model)) {
            content = model.messageText;
        }
        else {
            content = annotateVulnerabilitiesInText(model.response.value).map(x => x.content.value).join('');
        }
        let codeBlockIndex = 0;
        marked.walkTokens(marked.lexer(content), token => {
            if (token.type === 'code') {
                const lang = token.lang || '';
                const text = token.text;
                this.codeBlockModelCollection.update(this._model.sessionResource, model, codeBlockIndex++, { text, languageId: lang, isComplete: true });
            }
        });
    }
};
ChatViewModel = __decorate([
    __param(2, IInstantiationService)
], ChatViewModel);
export { ChatViewModel };
export class ChatRequestViewModel {
    get id() {
        return this._model.id;
    }
    get dataId() {
        return this.id + `_${hash(this.variables)}_${hash(this.isComplete)}`;
    }
    /** @deprecated */
    get sessionId() {
        return this._model.session.sessionId;
    }
    get sessionResource() {
        return this._model.session.sessionResource;
    }
    get username() {
        return 'User';
    }
    get avatarIcon() {
        return Codicon.account;
    }
    get message() {
        return this._model.message;
    }
    get messageText() {
        return this.message.text;
    }
    get attempt() {
        return this._model.attempt;
    }
    get variables() {
        return this._model.variableData.variables;
    }
    get contentReferences() {
        return this._model.response?.contentReferences;
    }
    get confirmation() {
        return this._model.confirmation;
    }
    get isComplete() {
        return this._model.response?.isComplete ?? false;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get shouldBeBlocked() {
        return this._model.shouldBeBlocked;
    }
    get slashCommand() {
        return this._model.response?.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.response?.agentOrSlashCommandDetected ?? false;
    }
    get modelId() {
        return this._model.modelId;
    }
    constructor(_model) {
        this._model = _model;
    }
}
let ChatResponseViewModel = class ChatResponseViewModel extends Disposable {
    get model() {
        return this._model;
    }
    get id() {
        return this._model.id;
    }
    get dataId() {
        return this._model.id +
            `_${this._modelChangeCount}` +
            (this.isLast ? '_last' : '');
    }
    /** @deprecated */
    get sessionId() {
        return this._model.session.sessionId;
    }
    get sessionResource() {
        return this._model.session.sessionResource;
    }
    get username() {
        if (this.agent) {
            const isAllowed = this.chatAgentNameService.getAgentNameRestriction(this.agent);
            if (isAllowed) {
                return this.agent.fullName || this.agent.name;
            }
            else {
                return getFullyQualifiedId(this.agent);
            }
        }
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIcon;
    }
    get agent() {
        return this._model.agent;
    }
    get slashCommand() {
        return this._model.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.agentOrSlashCommandDetected;
    }
    get response() {
        return this._model.response;
    }
    get usedContext() {
        return this._model.usedContext;
    }
    get contentReferences() {
        return this._model.contentReferences;
    }
    get codeCitations() {
        return this._model.codeCitations;
    }
    get progressMessages() {
        return this._model.progressMessages;
    }
    get isComplete() {
        return this._model.isComplete;
    }
    get isCanceled() {
        return this._model.isCanceled;
    }
    get shouldBeBlocked() {
        return this._model.shouldBeBlocked;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get replyFollowups() {
        return this._model.followups?.filter((f) => f.kind === 'reply');
    }
    get result() {
        return this._model.result;
    }
    get errorDetails() {
        return this.result?.errorDetails;
    }
    get vote() {
        return this._model.vote;
    }
    get voteDownReason() {
        return this._model.voteDownReason;
    }
    get requestId() {
        return this._model.requestId;
    }
    get isStale() {
        return this._model.isStale;
    }
    get isLast() {
        return this.session.getItems().at(-1) === this;
    }
    get usedReferencesExpanded() {
        if (typeof this._usedReferencesExpanded === 'boolean') {
            return this._usedReferencesExpanded;
        }
        return undefined;
    }
    set usedReferencesExpanded(v) {
        this._usedReferencesExpanded = v;
    }
    get vulnerabilitiesListExpanded() {
        return this._vulnerabilitiesListExpanded;
    }
    set vulnerabilitiesListExpanded(v) {
        this._vulnerabilitiesListExpanded = v;
    }
    get contentUpdateTimings() {
        return this._contentUpdateTimings;
    }
    constructor(_model, session, logService, chatAgentNameService) {
        super();
        this._model = _model;
        this.session = session;
        this.logService = logService;
        this.chatAgentNameService = chatAgentNameService;
        this._modelChangeCount = 0;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.renderData = undefined;
        this._vulnerabilitiesListExpanded = false;
        this._contentUpdateTimings = undefined;
        if (!_model.isComplete) {
            this._contentUpdateTimings = {
                totalTime: 0,
                lastUpdateTime: Date.now(),
                impliedWordLoadRate: 0,
                lastWordCount: 0,
            };
        }
        this._register(_model.onDidChange(() => {
            // This is set when the response is loading, but the model can change later for other reasons
            if (this._contentUpdateTimings) {
                const now = Date.now();
                const wordCount = countWords(_model.entireResponse.getMarkdown());
                if (wordCount === this._contentUpdateTimings.lastWordCount) {
                    this.trace('onDidChange', `Update- no new words`);
                }
                else {
                    if (this._contentUpdateTimings.lastWordCount === 0) {
                        this._contentUpdateTimings.lastUpdateTime = now;
                    }
                    const timeDiff = Math.min(now - this._contentUpdateTimings.lastUpdateTime, 500);
                    const newTotalTime = Math.max(this._contentUpdateTimings.totalTime + timeDiff, 250);
                    const impliedWordLoadRate = wordCount / (newTotalTime / 1000);
                    this.trace('onDidChange', `Update- got ${wordCount} words over last ${newTotalTime}ms = ${impliedWordLoadRate} words/s`);
                    this._contentUpdateTimings = {
                        totalTime: this._contentUpdateTimings.totalTime !== 0 || this.response.value.some(v => v.kind === 'markdownContent') ?
                            newTotalTime :
                            this._contentUpdateTimings.totalTime,
                        lastUpdateTime: now,
                        impliedWordLoadRate,
                        lastWordCount: wordCount
                    };
                }
            }
            // new data -> new id, new content to render
            this._modelChangeCount++;
            this._onDidChange.fire();
        }));
    }
    trace(tag, message) {
        this.logService.trace(`ChatResponseViewModel#${tag}: ${message}`);
    }
    setVote(vote) {
        this._modelChangeCount++;
        this._model.setVote(vote);
    }
    setVoteDownReason(reason) {
        this._modelChangeCount++;
        this._model.setVoteDownReason(reason);
    }
    setEditApplied(edit, editCount) {
        this._modelChangeCount++;
        this._model.setEditApplied(edit, editCount);
    }
};
ChatResponseViewModel = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentNameService)
], ChatResponseViewModel);
export { ChatResponseViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUM7QUFHbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBcUMscUJBQXFCLEVBQW9CLE1BQU0saUJBQWlCLENBQUM7QUFLbEksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRWxELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxNQUFNLFVBQVUsV0FBVyxDQUFDLElBQWE7SUFDeEMsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDO0FBQ2hFLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLElBQWE7SUFDekMsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLE9BQVEsSUFBK0IsQ0FBQyxPQUFPLEtBQUssV0FBVyxDQUFDO0FB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