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
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { count } from '../../../../../../base/common/strings.js';
import { isEmptyObject } from '../../../../../../base/common/types.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { ElementSizeObserver } from '../../../../../../editor/browser/config/elementSizeObserver.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { createToolInputUri, createToolSchemaUri, ILanguageModelToolsService } from '../../../common/languageModelToolsService.js';
import { ILanguageModelToolsConfirmationService } from '../../../common/languageModelToolsConfirmationService.js';
import { AcceptToolConfirmationActionId, SkipToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { renderFileWidgets } from '../../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from '../chatMarkdownAnchorService.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { AbstractToolConfirmationSubPart } from './abstractToolConfirmationSubPart.js';
const SHOW_MORE_MESSAGE_HEIGHT_TRIGGER = 45;
let ToolConfirmationSubPart = class ToolConfirmationSubPart extends AbstractToolConfirmationSubPart {
    get codeblocks() {
        return this.markdownParts.flatMap(part => part.codeblocks);
    }
    constructor(toolInvocation, context, renderer, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, keybindingService, modelService, languageService, contextKeyService, chatWidgetService, commandService, markerService, languageModelToolsService, chatMarkdownAnchorService, confirmationService) {
        if (!toolInvocation.confirmationMessages?.title) {
            throw new Error('Confirmation messages are missing');
        }
        super(toolInvocation, context, instantiationService, keybindingService, contextKeyService, chatWidgetService, languageModelToolsService);
        this.renderer = renderer;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.modelService = modelService;
        this.languageService = languageService;
        this.commandService = commandService;
        this.markerService = markerService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this.confirmationService = confirmationService;
        this.markdownParts = [];
        this.render({
            allowActionId: AcceptToolConfirmationActionId,
            skipActionId: SkipToolConfirmationActionId,
            allowLabel: toolInvocation.confirmationMessages.confirmResults ? localize('allowReview', "Allow and Review") : localize('allow', "Allow"),
            skipLabel: localize('skip.detail', 'Proceed without running this tool'),
            partType: 'chatToolConfirmation',
            subtitle: typeof toolInvocation.originMessage === 'string' ? toolInvocation.originMessage : toolInvocation.originMessage?.value,
        });
        // Tag for sub-agent styling
        if (toolInvocation.fromSubAgent) {
            context.container.classList.add('from-sub-agent');
        }
    }
    additionalPrimaryActions() {
        const actions = super.additionalPrimaryActions();
        if (this.toolInvocation.confirmationMessages?.allowAutoConfirm !== false) {
            // Get actions from confirmation service
            const confirmActions = this.confirmationService.getPreConfirmActions({
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
        }
        if (this.toolInvocation.confirmationMessages?.confirmResults) {
            actions.unshift({
                label: localize('allowSkip', 'Allow and Skip Reviewing Result'),
                data: () => {
                    this.toolInvocation.confirmationMessages.confirmResults = undefined;
                    this.confirmWith(this.toolInvocation, { type: 4 /* ToolConfirmKind.UserAction */ });
                }
            }, new Separator());
        }
        return actions;
    }
    createContentElement() {
        const { message, disclaimer } = this.toolInvocation.confirmationMessages;
        const toolInvocation = this.toolInvocation;
        if (typeof message === 'string' && !disclaimer) {
            return message;
        }
        else {
            const codeBlockRenderOptions = {
                hideToolbar: true,
                reserveWidth: 19,
                verticalPadding: 5,
                editorOptions: {
                    tabFocusMode: true,
                    ariaLabel: this.getTitle(),
                },
            };
            const elements = dom.h('div', [
                dom.h('.message@messageContainer', [
                    dom.h('.message-wrapper@message'),
                    dom.h('.see-more@showMore', [
                        dom.h('a', [localize('showMore', "Show More")])
                    ]),
                ]),
                dom.h('.editor@editor'),
                dom.h('.disclaimer@disclaimer'),
            ]);
            if (toolInvocation.toolSpecificData?.kind === 'input' && toolInvocation.toolSpecificData.rawInput && !isEmptyObject(toolInvocation.toolSpecificData.rawInput)) {
                const titleEl = document.createElement('h3');
                titleEl.textContent = localize('chat.input', "Input");
                elements.editor.appendChild(titleEl);
                const inputData = toolInvocation.toolSpecificData;
                const codeBlockRenderOptions = {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'off',
                        readOnly: false,
                        ariaLabel: this.getTitle(),
                    }
                };
                const langId = this.languageService.getLanguageIdByLanguageName('json');
                const rawJsonInput = JSON.stringify(inputData.rawInput ?? {}, null, 1);
                const canSeeMore = count(rawJsonInput, '\n') > 2; // if more than one key:value
                const model = this._register(this.modelService.createModel(
                // View a single JSON line by default until they 'see more'
                rawJsonInput.replace(/\n */g, ' '), this.languageService.createById(langId), createToolInputUri(toolInvocation.toolCallId), true));
                const markerOwner = generateUuid();
                const schemaUri = createToolSchemaUri(toolInvocation.toolId);
                const validator = new RunOnceScheduler(async () => {
                    const newMarker = [];
                    const result = await this.commandService.executeCommand('json.validate', schemaUri, model.getValue());
                    for (const item of result ?? []) {
                        if (item.range && item.message) {
                            newMarker.push({
                                severity: item.severity === 'Error' ? MarkerSeverity.Error : MarkerSeverity.Warning,
                                message: item.message,
                                startLineNumber: item.range[0].line + 1,
                                startColumn: item.range[0].character + 1,
                                endLineNumber: item.range[1].line + 1,
                                endColumn: item.range[1].character + 1,
                                code: item.code ? String(item.code) : undefined
                            });
                        }
                    }
                    this.markerService.changeOne(markerOwner, model.uri, newMarker);
                }, 500);
                validator.schedule();
                this._register(model.onDidChangeContent(() => validator.schedule()));
                this._register(toDisposable(() => this.markerService.remove(markerOwner, [model.uri])));
                this._register(validator);
                const editor = this._register(this.editorPool.get());
                editor.object.render({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codeBlockPartIndex: 0,
                    element: this.context.element,
                    languageId: langId ?? 'json',
                    renderOptions: codeBlockRenderOptions,
                    textModel: Promise.resolve(model),
                    chatSessionResource: this.context.element.sessionResource
                }, this.currentWidthDelegate());
                this.codeblocks.push({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codemapperUri: undefined,
                    elementId: this.context.element.id,
                    focus: () => editor.object.focus(),
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    uriPromise: Promise.resolve(model.uri),
                    chatSessionResource: this.context.element.sessionResource
                });
                this._register(editor.object.onDidChangeContentHeight(() => {
                    editor.object.layout(this.currentWidthDelegate());
                    this._onDidChangeHeight.fire();
                }));
                this._register(model.onDidChangeContent(e => {
                    try {
                        inputData.rawInput = JSON.parse(model.getValue());
                    }
                    catch {
                        // ignore
                    }
                }));
                elements.editor.append(editor.object.element);
                if (canSeeMore) {
                    const seeMore = dom.h('div.see-more', [dom.h('a@link')]);
                    seeMore.link.textContent = localize('seeMore', "See more");
                    this._register(dom.addDisposableGenericMouseDownListener(seeMore.link, () => {
                        try {
                            const parsed = JSON.parse(model.getValue());
                            model.setValue(JSON.stringify(parsed, null, 2));
                            editor.object.editor.updateOptions({ tabFocusMode: false });
                            editor.object.editor.updateOptions({ wordWrap: 'on' });
                        }
                        catch {
                            // ignored
                        }
                        seeMore.root.remove();
                    }));
                    elements.editor.append(seeMore.root);
                }
            }
            const mdPart = this._makeMarkdownPart(elements.message, message, codeBlockRenderOptions);
            const messageSeeMoreObserver = this._register(new ElementSizeObserver(mdPart.domNode, undefined));
            const updateSeeMoreDisplayed = () => {
                const show = messageSeeMoreObserver.getHeight() > SHOW_MORE_MESSAGE_HEIGHT_TRIGGER;
                if (elements.messageContainer.classList.contains('can-see-more') !== show) {
                    elements.messageContainer.classList.toggle('can-see-more', show);
                    this._onDidChangeHeight.fire();
                }
            };
            this._register(dom.addDisposableListener(elements.showMore, 'click', () => {
                elements.messageContainer.classList.toggle('can-see-more', false);
                this._onDidChangeHeight.fire();
                messageSeeMoreObserver.dispose();
            }));
            this._register(messageSeeMoreObserver.onDidChange(updateSeeMoreDisplayed));
            messageSeeMoreObserver.startObserving();
            if (disclaimer) {
                this._makeMarkdownPart(elements.disclaimer, disclaimer, codeBlockRenderOptions);
            }
            else {
                elements.disclaimer.remove();
            }
            return elements.root;
        }
    }
    getTitle() {
        const { title } = this.toolInvocation.confirmationMessages;
        return typeof title === 'string' ? title : title.value;
    }
    _makeMarkdownPart(container, message, codeBlockRenderOptions) {
        const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, {
            kind: 'markdownContent',
            content: typeof message === 'string' ? new MarkdownString().appendMarkdown(message) : message
        }, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, undefined, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        renderFileWidgets(part.domNode, this.instantiationService, this.chatMarkdownAnchorService, this._store);
        container.append(part.domNode);
        this._register(part.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        return part;
    }
};
ToolConfirmationSubPart = __decorate([
    __param(7, IInstantiationService),
    __param(8, IKeybindingService),
    __param(9, IModelService),
    __param(10, ILanguageService),
    __param(11, IContextKeyService),
    __param(12, IChatWidgetService),
    __param(13, ICommandService),
    __param(14, IMarkerService),
    __param(15, ILanguageModelToolsService),
    __param(16, IChatMarkdownAnchorService),
    __param(17, ILanguageModelToolsConfirmationService)
], ToolConfirmationSubPart);
export { ToolConfirmationSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xDb25maXJtYXRpb25TdWJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvdG9vbEludm9jYXRpb25QYXJ0cy9jaGF0VG9vbENvbmZpcm1hdGlvblN1YlBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDckcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERB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