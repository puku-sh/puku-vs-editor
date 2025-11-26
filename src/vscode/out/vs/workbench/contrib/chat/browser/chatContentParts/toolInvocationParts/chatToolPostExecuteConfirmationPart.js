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
import * as dom from '../../../../../../base/browser/dom.js';
import { Separator } from '../../../../../../base/common/actions.js';
import { getExtensionForMimeType } from '../../../../../../base/common/mime.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatResponseResource } from '../../../common/chatModel.js';
import { ILanguageModelToolsConfirmationService } from '../../../common/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService, stringifyPromptTsxPart } from '../../../common/languageModelToolsService.js';
import { AcceptToolPostConfirmationActionId, SkipToolPostConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatToolOutputContentSubPart } from '../chatToolOutputContentSubPart.js';
import { AbstractToolConfirmationSubPart } from './abstractToolConfirmationSubPart.js';
let ChatToolPostExecuteConfirmationPart = class ChatToolPostExecuteConfirmationPart extends AbstractToolConfirmationSubPart {
    get codeblocks() {
        return this._codeblocks;
    }
    constructor(toolInvocation, context, instantiationService, keybindingService, modelService, languageService, contextKeyService, chatWidgetService, languageModelToolsService, confirmationService) {
        super(toolInvocation, context, instantiationService, keybindingService, contextKeyService, chatWidgetService, languageModelToolsService);
        this.modelService = modelService;
        this.languageService = languageService;
        this.confirmationService = confirmationService;
        this._codeblocks = [];
        const subtitle = toolInvocation.pastTenseMessage || toolInvocation.invocationMessage;
        this.render({
            allowActionId: AcceptToolPostConfirmationActionId,
            skipActionId: SkipToolPostConfirmationActionId,
            allowLabel: localize('allow', "Allow"),
            skipLabel: localize('skip.post', 'Skip Results'),
            partType: 'chatToolPostConfirmation',
            subtitle: typeof subtitle === 'string' ? subtitle : subtitle?.value,
        });
    }
    createContentElement() {
        if (this.toolInvocation.kind !== 'toolInvocation') {
            throw new Error('post-approval not supported for serialized data');
        }
        const state = this.toolInvocation.state.get();
        if (state.type !== 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
            throw new Error('Tool invocation is not waiting for post-approval');
        }
        return this.createResultsDisplay(this.toolInvocation, state.contentForModel);
    }
    getTitle() {
        return localize('approveToolResult', "Approve Tool Result");
    }
    additionalPrimaryActions() {
        const actions = super.additionalPrimaryActions();
        // Get actions from confirmation service
        const confirmActions = this.confirmationService.getPostConfirmActions({
            toolId: this.toolInvocation.toolId,
            source: this.toolInvocation.source,
            parameters: this.toolInvocation.parameters
        });
        for (const action of confirmActions) {
            if (action.divider) {
                actions.push(new Separator());
            }
            actions.push({
                label: action.label,
                tooltip: action.detail,
                data: async () => {
                    const shouldConfirm = await action.select();
                    if (shouldConfirm) {
                        this.confirmWith(this.toolInvocation, { type: 4 /* ToolConfirmKind.UserAction */ });
                    }
                }
            });
        }
        return actions;
    }
    createResultsDisplay(toolInvocation, contentForModel) {
        const container = dom.$('.tool-postconfirm-display');
        if (!contentForModel || contentForModel.length === 0) {
            container.textContent = localize('noResults', 'No results to display');
            return container;
        }
        const parts = [];
        for (const [i, part] of contentForModel.entries()) {
            if (part.kind === 'text') {
                // Display text parts
                const model = this._register(this.modelService.createModel(part.value, this.languageService.createById('plaintext'), undefined, true));
                parts.push({
                    kind: 'code',
                    textModel: model,
                    languageId: model.getLanguageId(),
                    options: {
                        hideToolbar: true,
                        reserveWidth: 19,
                        maxHeightInLines: 13,
                        verticalPadding: 5,
                        editorOptions: { wordWrap: 'on', readOnly: true }
                    },
                    codeBlockInfo: {
                        codeBlockIndex: i,
                        codemapperUri: undefined,
                        elementId: this.context.element.id,
                        focus: () => { },
                        ownerMarkdownPartId: this.codeblocksPartId,
                        uri: model.uri,
                        chatSessionResource: this.context.element.sessionResource,
                        uriPromise: Promise.resolve(model.uri)
                    }
                });
            }
            else if (part.kind === 'promptTsx') {
                // Display TSX parts as JSON-stringified
                const stringified = stringifyPromptTsxPart(part);
                const model = this._register(this.modelService.createModel(stringified, this.languageService.createById('json'), undefined, true));
                parts.push({
                    kind: 'code',
                    textModel: model,
                    languageId: model.getLanguageId(),
                    options: {
                        hideToolbar: true,
                        reserveWidth: 19,
                        maxHeightInLines: 13,
                        verticalPadding: 5,
                        editorOptions: { wordWrap: 'on', readOnly: true }
                    },
                    codeBlockInfo: {
                        codeBlockIndex: i,
                        codemapperUri: undefined,
                        elementId: this.context.element.id,
                        focus: () => { },
                        ownerMarkdownPartId: this.codeblocksPartId,
                        uri: model.uri,
                        chatSessionResource: this.context.element.sessionResource,
                        uriPromise: Promise.resolve(model.uri)
                    }
                });
            }
            else if (part.kind === 'data') {
                // Display data parts
                const mimeType = part.value.mimeType;
                const data = part.value.data;
                // Check if it's an image
                if (mimeType?.startsWith('image/')) {
                    const permalinkBasename = getExtensionForMimeType(mimeType) ? `image${getExtensionForMimeType(mimeType)}` : 'image.bin';
                    const permalinkUri = ChatResponseResource.createUri(this.context.element.sessionId, toolInvocation.toolCallId, i, permalinkBasename);
                    parts.push({ kind: 'data', value: data.buffer, mimeType, uri: permalinkUri, audience: part.audience });
                }
                else {
                    // Try to display as UTF-8 text, otherwise base64
                    const decoder = new TextDecoder('utf-8', { fatal: true });
                    try {
                        const text = decoder.decode(data.buffer);
                        const model = this._register(this.modelService.createModel(text, this.languageService.createById('plaintext'), undefined, true));
                        parts.push({
                            kind: 'code',
                            textModel: model,
                            languageId: model.getLanguageId(),
                            options: {
                                hideToolbar: true,
                                reserveWidth: 19,
                                maxHeightInLines: 13,
                                verticalPadding: 5,
                                editorOptions: { wordWrap: 'on', readOnly: true }
                            },
                            codeBlockInfo: {
                                codeBlockIndex: i,
                                codemapperUri: undefined,
                                elementId: this.context.element.id,
                                focus: () => { },
                                ownerMarkdownPartId: this.codeblocksPartId,
                                uri: model.uri,
                                chatSessionResource: this.context.element.sessionResource,
                                uriPromise: Promise.resolve(model.uri)
                            }
                        });
                    }
                    catch {
                        // Not valid UTF-8, show base64
                        const base64 = data.toString();
                        const model = this._register(this.modelService.createModel(base64, this.languageService.createById('plaintext'), undefined, true));
                        parts.push({
                            kind: 'code',
                            textModel: model,
                            languageId: model.getLanguageId(),
                            options: {
                                hideToolbar: true,
                                reserveWidth: 19,
                                maxHeightInLines: 13,
                                verticalPadding: 5,
                                editorOptions: { wordWrap: 'on', readOnly: true }
                            },
                            codeBlockInfo: {
                                codeBlockIndex: i,
                                codemapperUri: undefined,
                                elementId: this.context.element.id,
                                focus: () => { },
                                ownerMarkdownPartId: this.codeblocksPartId,
                                uri: model.uri,
                                chatSessionResource: this.context.element.sessionResource,
                                uriPromise: Promise.resolve(model.uri)
                            }
                        });
                    }
                }
            }
        }
        if (parts.length > 0) {
            const outputSubPart = this._register(this.instantiationService.createInstance(ChatToolOutputContentSubPart, this.context, parts));
            this._codeblocks.push(...outputSubPart.codeblocks);
            this._register(outputSubPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            outputSubPart.domNode.classList.add('tool-postconfirm-display');
            return outputSubPart.domNode;
        }
        container.textContent = localize('noDisplayableResults', 'No displayable results');
        return container;
    }
};
ChatToolPostExecuteConfirmationPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IKeybindingService),
    __param(4, IModelService),
    __param(5, ILanguageService),
    __param(6, IContextKeyService),
    __param(7, IChatWidgetService),
    __param(8, ILanguageModelToolsService),
    __param(9, ILanguageModelToolsConfirmationService)
], ChatToolPostExecuteConfirmationPart);
export { ChatToolPostExecuteConfirmationPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xQb3N0RXhlY3V0ZUNvbmZpcm1hdGlvblBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRUb29sUG9zdEV4ZWN1dGVDb25maXJtYXRpb25QYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDbEgsT0FBTyxFQUFFLDBCQUEwQixFQUFzRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RMLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxnQ0FBZ0MsRUFBRSxN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