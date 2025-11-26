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
var ChatInputOutputMarkdownProgressPart_1;
import { ProgressBar } from '../../../../../../base/browser/ui/progressbar/progressbar.js';
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { createMarkdownCommandLink, MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { getExtensionForMimeType } from '../../../../../../base/common/mime.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { basename } from '../../../../../../base/common/resources.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatResponseResource } from '../../../common/chatModel.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { ChatCollapsibleInputOutputContentPart } from '../chatToolInputOutputContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatInputOutputMarkdownProgressPart = class ChatInputOutputMarkdownProgressPart extends BaseChatToolInvocationSubPart {
    static { ChatInputOutputMarkdownProgressPart_1 = this; }
    /** Remembers expanded tool parts on re-render */
    static { this._expandedByDefault = new WeakMap(); }
    get codeblocks() {
        return this._codeblocks;
    }
    constructor(toolInvocation, context, codeBlockStartIndex, message, subtitle, input, output, isError, instantiationService, modelService, languageService) {
        super(toolInvocation);
        this._codeblocks = [];
        let codeBlockIndex = codeBlockStartIndex;
        const toCodePart = (data) => {
            const model = this._register(modelService.createModel(data, languageService.createById('json'), undefined, true));
            return {
                kind: 'code',
                textModel: model,
                languageId: model.getLanguageId(),
                options: {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'on'
                    }
                },
                codeBlockInfo: {
                    codeBlockIndex: codeBlockIndex++,
                    codemapperUri: undefined,
                    elementId: context.element.id,
                    focus: () => { },
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    chatSessionResource: context.element.sessionResource,
                    uriPromise: Promise.resolve(model.uri)
                }
            };
        };
        let processedOutput = output;
        if (typeof output === 'string') { // back compat with older stored versions
            processedOutput = [{ type: 'embed', value: output, isText: true }];
        }
        const collapsibleListPart = this._register(instantiationService.createInstance(ChatCollapsibleInputOutputContentPart, message, subtitle, this.getAutoApproveMessageContent(), context, toCodePart(input), processedOutput && {
            parts: processedOutput.map((o, i) => {
                const permalinkBasename = o.type === 'ref' || o.uri
                    ? basename(o.uri)
                    : o.mimeType && getExtensionForMimeType(o.mimeType)
                        ? `file${getExtensionForMimeType(o.mimeType)}`
                        : 'file' + (o.isText ? '.txt' : '.bin');
                if (o.type === 'ref') {
                    return { kind: 'data', uri: o.uri, mimeType: o.mimeType };
                }
                else if (o.isText && !o.asResource) {
                    return toCodePart(o.value);
                }
                else {
                    let decoded;
                    try {
                        if (!o.isText) {
                            decoded = decodeBase64(o.value).buffer;
                        }
                    }
                    catch {
                        // ignored
                    }
                    // Fall back to text if it's not valid base64
                    const permalinkUri = ChatResponseResource.createUri(context.element.sessionId, toolInvocation.toolCallId, i, permalinkBasename);
                    return { kind: 'data', value: decoded || new TextEncoder().encode(o.value), mimeType: o.mimeType, uri: permalinkUri, audience: o.audience };
                }
            }),
        }, isError, ChatInputOutputMarkdownProgressPart_1._expandedByDefault.get(toolInvocation) ?? false));
        this._codeblocks.push(...collapsibleListPart.codeblocks);
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => ChatInputOutputMarkdownProgressPart_1._expandedByDefault.set(toolInvocation, collapsibleListPart.expanded)));
        const progressObservable = toolInvocation.kind === 'toolInvocation' ? toolInvocation.state.map((s, r) => s.type === 1 /* IChatToolInvocation.StateKind.Executing */ ? s.progress.read(r) : undefined) : undefined;
        const progressBar = new Lazy(() => this._register(new ProgressBar(collapsibleListPart.domNode)));
        if (progressObservable) {
            this._register(autorun(reader => {
                const progress = progressObservable?.read(reader);
                if (progress?.message) {
                    collapsibleListPart.title = progress.message;
                }
                if (progress?.progress && !IChatToolInvocation.isComplete(toolInvocation, reader)) {
                    progressBar.value.setWorked(progress.progress * 100);
                }
            }));
        }
        this.domNode = collapsibleListPart.domNode;
    }
    getAutoApproveMessageContent() {
        const reason = IChatToolInvocation.executionConfirmedOrDenied(this.toolInvocation);
        if (!reason || typeof reason === 'boolean') {
            return;
        }
        let md;
        switch (reason.type) {
            case 2 /* ToolConfirmKind.Setting */:
                md = localize(5610, null, createMarkdownCommandLink({ title: '`' + reason.id + '`', id: 'workbench.action.openSettings', arguments: [reason.id] }, false));
                break;
            case 3 /* ToolConfirmKind.LmServicePerTool */:
                md = reason.scope === 'session'
                    ? localize(5611, null)
                    : reason.scope === 'workspace'
                        ? localize(5612, null)
                        : localize(5613, null);
                md += ' (' + createMarkdownCommandLink({ title: localize(5614, null), id: 'workbench.action.chat.editToolApproval', arguments: [reason.scope] }) + ')';
                break;
            case 4 /* ToolConfirmKind.UserAction */:
            case 0 /* ToolConfirmKind.Denied */:
            case 1 /* ToolConfirmKind.ConfirmationNotNeeded */:
            default:
                return;
        }
        return new MarkdownString(md, { isTrusted: true });
    }
};
ChatInputOutputMarkdownProgressPart = ChatInputOutputMarkdownProgressPart_1 = __decorate([
    __param(8, IInstantiationService),
    __param(9, IModelService),
    __param(10, ILanguageService)
], ChatInputOutputMarkdownProgressPart);
export { ChatInputOutputMarkdownProgressPart };
//# sourceMappingURL=chatInputOutputMarkdownProgressPart.js.map