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
                md = localize('chat.autoapprove.setting', 'Auto approved by {0}', createMarkdownCommandLink({ title: '`' + reason.id + '`', id: 'workbench.action.openSettings', arguments: [reason.id] }, false));
                break;
            case 3 /* ToolConfirmKind.LmServicePerTool */:
                md = reason.scope === 'session'
                    ? localize('chat.autoapprove.lmServicePerTool.session', 'Auto approved for this session')
                    : reason.scope === 'workspace'
                        ? localize('chat.autoapprove.lmServicePerTool.workspace', 'Auto approved for this workspace')
                        : localize('chat.autoapprove.lmServicePerTool.profile', 'Auto approved for this profile');
                md += ' (' + createMarkdownCommandLink({ title: localize('edit', 'Edit'), id: 'workbench.action.chat.editToolApproval', arguments: [reason.scope] }) + ')';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0T3V0cHV0TWFya2Rvd25Qcm9ncmVzc1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRJbnB1dE91dHB1dE1hcmtkb3duUHJvZ3Jlc3NQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBbUIseUJBQXlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDMUgsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FB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