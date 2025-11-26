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
var ChatMarkdownContentPart_1;
import * as dom from '../../../../../base/browser/dom.js';
import { allowedMarkdownHtmlAttributes } from '../../../../../base/browser/markdownRenderer.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunSelfDisposable, derived } from '../../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { EditDeltaInfo } from '../../../../../editor/common/textModelEditSource.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { registerOpenEditorListeners } from '../../../../../platform/editor/browser/editor.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEditorService, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IAiEditTelemetryService } from '../../../editTelemetry/browser/telemetry/aiEditTelemetry/aiEditTelemetryService.js';
import { MarkedKatexSupport } from '../../../markdown/browser/markedKatexSupport.js';
import { extractCodeblockUrisFromText } from '../../common/annotations.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatConfiguration } from '../../common/constants.js';
import { allowedChatMarkdownHtmlTags } from '../chatContentMarkdownRenderer.js';
import { MarkdownDiffBlockPart, parseUnifiedDiff } from '../chatDiffBlockPart.js';
import { ChatMarkdownDecorationsRenderer } from '../chatMarkdownDecorationsRenderer.js';
import { CodeBlockPart, localFileLanguageId, parseLocalFileData } from '../codeBlockPart.js';
import '../media/chatCodeBlockPill.css';
import { ChatExtensionsContentPart } from './chatExtensionsContentPart.js';
import './media/chatMarkdownPart.css';
const $ = dom.$;
let ChatMarkdownContentPart = class ChatMarkdownContentPart extends Disposable {
    static { ChatMarkdownContentPart_1 = this; }
    static { this.ID_POOL = 0; }
    constructor(markdown, context, editorPool, fillInIncompleteTokens = false, codeBlockStartIndex = 0, renderer, markdownRenderOptions, currentWidth, codeBlockModelCollection, rendererOptions, contextKeyService, configurationService, textModelService, instantiationService, aiEditTelemetryService) {
        super();
        this.markdown = markdown;
        this.editorPool = editorPool;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.rendererOptions = rendererOptions;
        this.textModelService = textModelService;
        this.instantiationService = instantiationService;
        this.aiEditTelemetryService = aiEditTelemetryService;
        this.codeblocksPartId = String(++ChatMarkdownContentPart_1.ID_POOL);
        this.allRefs = [];
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.codeblocks = [];
        this.mathLayoutParticipants = new Set();
        const element = context.element;
        const inUndoStop = findLast(context.content, e => e.kind === 'undoStop', context.contentIndex)?.id;
        // We release editors in order so that it's more likely that the same editor will
        // be assigned if this element is re-rendered right away, like it often is during
        // progressive rendering
        const orderedDisposablesList = [];
        // Need to track the index of the codeblock within the response so it can have a unique ID,
        // and within this part to find it within the codeblocks array
        let globalCodeBlockIndexStart = codeBlockStartIndex;
        let thisPartCodeBlockIndexStart = 0;
        this.domNode = $('div.chat-markdown-part');
        if (this.rendererOptions.accessibilityOptions?.statusMessage) {
            this.domNode.ariaLabel = this.rendererOptions.accessibilityOptions.statusMessage;
            if (configurationService.getValue("accessibility.verboseChatProgressUpdates" /* AccessibilityWorkbenchSettingId.VerboseChatProgressUpdates */)) {
                status(this.rendererOptions.accessibilityOptions.statusMessage);
            }
        }
        const enableMath = configurationService.getValue(ChatConfiguration.EnableMath);
        const doRenderMarkdown = () => {
            if (this._store.isDisposed) {
                return;
            }
            // TODO: Move katex support into chatMarkdownRenderer
            const markedExtensions = enableMath
                ? coalesce([MarkedKatexSupport.getExtension(dom.getWindow(context.container), {
                        throwOnError: false
                    })])
                : [];
            // Enables github-flavored-markdown + line breaks with single newlines
            // (which matches typical expectations but isn't "proper" in markdown)
            const markedOpts = {
                gfm: true,
                breaks: true,
            };
            const result = this._register(renderer.render(markdown.content, {
                sanitizerConfig: MarkedKatexSupport.getSanitizerOptions({
                    allowedTags: allowedChatMarkdownHtmlTags,
                    allowedAttributes: allowedMarkdownHtmlAttributes,
                }),
                fillInIncompleteTokens,
                codeBlockRendererSync: (languageId, text, raw) => {
                    const isCodeBlockComplete = !isResponseVM(context.element) || context.element.isComplete || !raw || codeblockHasClosingBackticks(raw);
                    if ((!text || (text.startsWith('<vscode_codeblock_uri') && !text.includes('\n'))) && !isCodeBlockComplete) {
                        const hideEmptyCodeblock = $('div');
                        hideEmptyCodeblock.style.display = 'none';
                        return hideEmptyCodeblock;
                    }
                    if (languageId === 'diff' && raw && this.rendererOptions.allowInlineDiffs) {
                        const match = raw.match(/^```diff:(\w+)/);
                        if (match && isResponseVM(context.element)) {
                            const actualLanguageId = match[1];
                            const codeBlockUri = extractCodeblockUrisFromText(text);
                            const { before, after } = parseUnifiedDiff(codeBlockUri?.textWithoutResult ?? text);
                            const diffData = {
                                element: context.element,
                                codeBlockIndex: globalCodeBlockIndexStart++,
                                languageId: actualLanguageId,
                                beforeContent: before,
                                afterContent: after,
                                codeBlockResource: codeBlockUri?.uri,
                                isReadOnly: true,
                                horizontalPadding: this.rendererOptions.horizontalPadding,
                            };
                            const diffPart = this.instantiationService.createInstance(MarkdownDiffBlockPart, diffData, context.diffEditorPool, context.currentWidth());
                            const ref = {
                                object: diffPart,
                                isStale: () => false,
                                dispose: () => diffPart.dispose()
                            };
                            this.allRefs.push(ref);
                            this._register(diffPart.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
                            orderedDisposablesList.push(ref);
                            return diffPart.element;
                        }
                    }
                    if (languageId === 'vscode-extensions') {
                        const chatExtensions = this._register(instantiationService.createInstance(ChatExtensionsContentPart, { kind: 'extensions', extensions: text.split(',') }));
                        this._register(chatExtensions.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
                        return chatExtensions.domNode;
                    }
                    const globalIndex = globalCodeBlockIndexStart++;
                    const thisPartIndex = thisPartCodeBlockIndexStart++;
                    let textModel;
                    let range;
                    let vulns;
                    let codeblockEntry;
                    if (equalsIgnoreCase(languageId, localFileLanguageId)) {
                        try {
                            const parsedBody = parseLocalFileData(text);
                            range = parsedBody.range && Range.lift(parsedBody.range);
                            textModel = this.textModelService.createModelReference(parsedBody.uri).then(ref => ref.object.textEditorModel);
                        }
                        catch (e) {
                            return $('div');
                        }
                    }
                    else {
                        if (isResponseVM(element) || isRequestVM(element)) {
                            const modelEntry = this.codeBlockModelCollection.getOrCreate(element.sessionResource, element, globalIndex);
                            const fastUpdateModelEntry = this.codeBlockModelCollection.updateSync(element.sessionResource, element, globalIndex, { text, languageId, isComplete: isCodeBlockComplete });
                            vulns = modelEntry.vulns;
                            codeblockEntry = fastUpdateModelEntry;
                            textModel = modelEntry.model;
                        }
                        else {
                            textModel = undefined;
                        }
                    }
                    const hideToolbar = isResponseVM(element) && element.errorDetails?.responseIsFiltered;
                    const renderOptions = {
                        ...this.rendererOptions.codeBlockRenderOptions,
                    };
                    if (hideToolbar !== undefined) {
                        renderOptions.hideToolbar = hideToolbar;
                    }
                    const codeBlockInfo = { languageId, textModel, codeBlockIndex: globalIndex, codeBlockPartIndex: thisPartIndex, element, range, parentContextKeyService: contextKeyService, vulns, codemapperUri: codeblockEntry?.codemapperUri, renderOptions, chatSessionResource: element.sessionResource };
                    if (element.isCompleteAddedRequest || !codeblockEntry?.codemapperUri || !codeblockEntry.isEdit) {
                        const ref = this.renderCodeBlock(codeBlockInfo, text, isCodeBlockComplete, currentWidth);
                        this.allRefs.push(ref);
                        // Attach this after updating text/layout of the editor, so it should only be fired when the size updates later (horizontal scrollbar, wrapping)
                        // not during a renderElement OR a progressive render (when we will be firing this event anyway at the end of the render)
                        this._register(ref.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
                        const ownerMarkdownPartId = this.codeblocksPartId;
                        const info = new class {
                            constructor() {
                                this.ownerMarkdownPartId = ownerMarkdownPartId;
                                this.codeBlockIndex = globalIndex;
                                this.elementId = element.id;
                                this.chatSessionResource = element.sessionResource;
                                this.languageId = languageId;
                                this.editDeltaInfo = EditDeltaInfo.fromText(text);
                                this.codemapperUri = undefined; // will be set async
                                this.uriPromise = textModel?.then(model => model.uri) ?? Promise.resolve(undefined);
                            }
                            get uri() {
                                // here we must do a getter because the ref.object is rendered
                                // async and the uri might be undefined when it's read immediately
                                return ref.object.uri;
                            }
                            focus() {
                                ref.object.focus();
                            }
                        }();
                        this.codeblocks.push(info);
                        orderedDisposablesList.push(ref);
                        return ref.object.element;
                    }
                    else {
                        const requestId = isRequestVM(element) ? element.id : element.requestId;
                        const ref = this.renderCodeBlockPill(element.sessionResource, requestId, inUndoStop, codeBlockInfo.codemapperUri, this.markdown.fromSubagent);
                        if (isResponseVM(codeBlockInfo.element)) {
                            // TODO@joyceerhl: remove this code when we change the codeblockUri API to make the URI available synchronously
                            this.codeBlockModelCollection.update(codeBlockInfo.element.sessionResource, codeBlockInfo.element, codeBlockInfo.codeBlockIndex, { text, languageId: codeBlockInfo.languageId, isComplete: isCodeBlockComplete }).then((e) => {
                                // Update the existing object's codemapperUri
                                this.codeblocks[codeBlockInfo.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                                this._onDidChangeHeight.fire();
                            });
                        }
                        this.allRefs.push(ref);
                        const ownerMarkdownPartId = this.codeblocksPartId;
                        const info = new class {
                            constructor() {
                                this.ownerMarkdownPartId = ownerMarkdownPartId;
                                this.codeBlockIndex = globalIndex;
                                this.elementId = element.id;
                                this.codemapperUri = codeblockEntry?.codemapperUri;
                                this.chatSessionResource = element.sessionResource;
                                this.uriPromise = Promise.resolve(undefined);
                                this.languageId = languageId;
                                this.editDeltaInfo = EditDeltaInfo.fromText(text);
                            }
                            get uri() {
                                return undefined;
                            }
                            focus() {
                                return ref.object.element.focus();
                            }
                        }();
                        this.codeblocks.push(info);
                        orderedDisposablesList.push(ref);
                        return ref.object.element;
                    }
                },
                asyncRenderCallback: () => this._onDidChangeHeight.fire(),
                markedOptions: markedOpts,
                markedExtensions,
                ...markdownRenderOptions,
            }, this.domNode));
            // Ideally this would happen earlier, but we need to parse the markdown.
            if (isResponseVM(element) && !element.model.codeBlockInfos && element.model.isComplete) {
                element.model.initializeCodeBlockInfos(this.codeblocks.map(info => {
                    return {
                        suggestionId: this.aiEditTelemetryService.createSuggestionId({
                            presentation: 'codeBlock',
                            feature: 'sideBarChat',
                            editDeltaInfo: info.editDeltaInfo,
                            languageId: info.languageId,
                            modeId: element.model.request?.modeInfo?.modeId,
                            modelId: element.model.request?.modelId,
                            applyCodeBlockSuggestionId: undefined,
                            source: undefined,
                        })
                    };
                }));
            }
            const markdownDecorationsRenderer = instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
            this._register(markdownDecorationsRenderer.walkTreeAndAnnotateReferenceLinks(markdown, result.element));
            const layoutParticipants = new Lazy(() => {
                const observer = new ResizeObserver(() => this.mathLayoutParticipants.forEach(layout => layout()));
                observer.observe(this.domNode);
                this._register(toDisposable(() => observer.disconnect()));
                return this.mathLayoutParticipants;
            });
            // Make katex blocks horizontally scrollable
            // eslint-disable-next-line no-restricted-syntax
            for (const katexBlock of this.domNode.querySelectorAll('.katex-display')) {
                if (!dom.isHTMLElement(katexBlock)) {
                    continue;
                }
                const scrollable = new DomScrollableElement(katexBlock.cloneNode(true), {
                    vertical: 2 /* ScrollbarVisibility.Hidden */,
                    horizontal: 1 /* ScrollbarVisibility.Auto */,
                });
                orderedDisposablesList.push(scrollable);
                katexBlock.replaceWith(scrollable.getDomNode());
                layoutParticipants.value.add(() => { scrollable.scanDomNode(); });
                scrollable.scanDomNode();
            }
            orderedDisposablesList.reverse().forEach(d => this._register(d));
        };
        if (enableMath && !MarkedKatexSupport.getExtension(dom.getWindow(context.container))) {
            // Need to load async
            MarkedKatexSupport.loadExtension(dom.getWindow(context.container))
                .catch(e => {
                console.error('Failed to load MarkedKatexSupport extension:', e);
            }).finally(() => {
                doRenderMarkdown();
                if (!this._store.isDisposed) {
                    this._onDidChangeHeight.fire();
                }
            });
        }
        else {
            doRenderMarkdown();
        }
    }
    renderCodeBlockPill(sessionResource, requestId, inUndoStop, codemapperUri, fromSubagent) {
        const codeBlock = this.instantiationService.createInstance(CollapsedCodeBlock, sessionResource, requestId, inUndoStop);
        if (codemapperUri) {
            codeBlock.render(codemapperUri, fromSubagent);
        }
        return {
            object: codeBlock,
            isStale: () => false,
            dispose: () => codeBlock.dispose()
        };
    }
    renderCodeBlock(data, text, isComplete, currentWidth) {
        const ref = this.editorPool.get();
        const editorInfo = ref.object;
        if (isResponseVM(data.element)) {
            this.codeBlockModelCollection.update(data.element.sessionResource, data.element, data.codeBlockIndex, { text, languageId: data.languageId, isComplete }).then((e) => {
                // Update the existing object's codemapperUri
                this.codeblocks[data.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                this._onDidChangeHeight.fire();
            });
        }
        editorInfo.render(data, currentWidth).then(() => {
            this._onDidChangeHeight.fire();
        });
        return ref;
    }
    hasSameContent(other) {
        return other.kind === 'markdownContent' && !!(other.content.value === this.markdown.content.value
            || this.codeblocks.at(-1)?.codemapperUri !== undefined && other.content.value.lastIndexOf('```') === this.markdown.content.value.lastIndexOf('```'));
    }
    layout(width) {
        this.allRefs.forEach((ref, index) => {
            if (ref.object instanceof CodeBlockPart) {
                ref.object.layout(width);
            }
            else if (ref.object instanceof MarkdownDiffBlockPart) {
                ref.object.layout(width);
            }
            else if (ref.object instanceof CollapsedCodeBlock) {
                const codeblockModel = this.codeblocks[index];
                if (codeblockModel.codemapperUri && ref.object.uri?.toString() !== codeblockModel.codemapperUri.toString()) {
                    ref.object.render(codeblockModel.codemapperUri);
                }
            }
        });
        this.mathLayoutParticipants.forEach(layout => layout());
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMarkdownContentPart = ChatMarkdownContentPart_1 = __decorate([
    __param(10, IContextKeyService),
    __param(11, IConfigurationService),
    __param(12, ITextModelService),
    __param(13, IInstantiationService),
    __param(14, IAiEditTelemetryService)
], ChatMarkdownContentPart);
export { ChatMarkdownContentPart };
export function codeblockHasClosingBackticks(str) {
    str = str.trim();
    return !!str.match(/\n```+$/);
}
let CollapsedCodeBlock = class CollapsedCodeBlock extends Disposable {
    get uri() { return this._uri; }
    constructor(sessionResource, requestId, inUndoStop, labelService, editorService, modelService, languageService, contextMenuService, contextKeyService, menuService, hoverService, chatService, configurationService) {
        super();
        this.sessionResource = sessionResource;
        this.requestId = requestId;
        this.inUndoStop = inUndoStop;
        this.labelService = labelService;
        this.editorService = editorService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.configurationService = configurationService;
        this.hover = this._register(new MutableDisposable());
        this.progressStore = this._store.add(new DisposableStore());
        this.element = $('div.chat-codeblock-pill-container');
        this.statusIndicatorContainer = $('div.status-indicator-container');
        this.pillElement = $('.chat-codeblock-pill-widget');
        this.pillElement.tabIndex = 0;
        this.pillElement.classList.add('show-file-icons');
        this.pillElement.role = 'button';
        this.element.appendChild(this.statusIndicatorContainer);
        this.element.appendChild(this.pillElement);
        this.registerListeners();
    }
    registerListeners() {
        this._register(registerOpenEditorListeners(this.pillElement, e => this.showDiff(e)));
        this._register(dom.addDisposableListener(this.pillElement, dom.EventType.CONTEXT_MENU, e => {
            const event = new StandardMouseEvent(dom.getWindow(e), e);
            dom.EventHelper.stop(e, true);
            this.contextMenuService.showContextMenu({
                contextKeyService: this.contextKeyService,
                getAnchor: () => event,
                getActions: () => {
                    if (!this.uri) {
                        return [];
                    }
                    const menu = this.menuService.getMenuActions(MenuId.ChatEditingCodeBlockContext, this.contextKeyService, {
                        arg: {
                            sessionResource: this.sessionResource,
                            requestId: this.requestId,
                            uri: this.uri,
                            stopId: this.inUndoStop
                        }
                    });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
    }
    showDiff({ editorOptions: options, openToSide }) {
        if (this.currentDiff) {
            this.editorService.openEditor({
                original: { resource: this.currentDiff.originalURI },
                modified: { resource: this.currentDiff.modifiedURI },
                options
            }, openToSide ? SIDE_GROUP : undefined);
        }
        else if (this.uri) {
            this.editorService.openEditor({ resource: this.uri, options }, openToSide ? SIDE_GROUP : undefined);
        }
    }
    /**
     * @param uri URI of the file on-disk being changed
     * @param isStreaming Whether the edit has completed (at the time of this being rendered)
     */
    render(uri, fromSubagent) {
        this.pillElement.classList.toggle('from-sub-agent', !!fromSubagent);
        this.progressStore.clear();
        this._uri = uri;
        const session = this.chatService.getSession(this.sessionResource);
        const iconText = this.labelService.getUriBasenameLabel(uri);
        const statusIconEl = dom.$('span.status-icon');
        const statusLabelEl = dom.$('span.status-label', {}, '');
        this.statusIndicatorContainer.replaceChildren(statusIconEl, statusLabelEl);
        const iconEl = dom.$('span.icon');
        const iconLabelEl = dom.$('span.icon-label', {}, iconText);
        const labelDetail = dom.$('span.label-detail', {}, '');
        // Create a progress fill element for the animation
        const progressFill = dom.$('span.progress-fill');
        this.pillElement.replaceChildren(progressFill, iconEl, iconLabelEl, labelDetail);
        const tooltipLabel = this.labelService.getUriLabel(uri, { relative: true });
        this.updateTooltip(tooltipLabel);
        const editSession = session?.editingSession;
        if (!editSession) {
            return;
        }
        const diffObservable = derived(reader => {
            const entry = editSession.readEntry(uri, reader);
            return entry && editSession.getEntryDiffBetweenStops(entry.modifiedURI, this.requestId, this.inUndoStop);
        }).map((d, r) => d?.read(r));
        const isStreaming = derived(r => {
            const entry = editSession.readEntry(uri, r);
            const currentlyModified = entry?.isCurrentlyBeingModifiedBy.read(r);
            return !!currentlyModified && currentlyModified.responseModel.requestId === this.requestId && currentlyModified.undoStopId === this.inUndoStop;
        });
        // Set the icon/classes while edits are streaming
        let statusIconClasses = [];
        let pillIconClasses = [];
        this.progressStore.add(autorun(r => {
            statusIconEl.classList.remove(...statusIconClasses);
            iconEl.classList.remove(...pillIconClasses);
            if (isStreaming.read(r)) {
                const codicon = ThemeIcon.modify(Codicon.loading, 'spin');
                statusIconClasses = ThemeIcon.asClassNameArray(codicon);
                statusIconEl.classList.add(...statusIconClasses);
                const entry = editSession.readEntry(uri, r);
                const rwRatio = Math.floor((entry?.rewriteRatio.read(r) || 0) * 100);
                statusLabelEl.textContent = localize(5527, null);
                const showAnimation = this.configurationService.getValue(ChatConfiguration.ShowCodeBlockProgressAnimation);
                if (showAnimation) {
                    progressFill.style.width = `${rwRatio}%`;
                    this.pillElement.classList.add('progress-filling');
                    labelDetail.textContent = '';
                }
                else {
                    progressFill.style.width = '0%';
                    this.pillElement.classList.remove('progress-filling');
                    labelDetail.textContent = rwRatio === 0 || !rwRatio ? localize(5528, null) : localize(5529, null, rwRatio);
                }
            }
            else {
                const statusCodeicon = Codicon.check;
                statusIconClasses = ThemeIcon.asClassNameArray(statusCodeicon);
                statusIconEl.classList.add(...statusIconClasses);
                statusLabelEl.textContent = localize(5530, null);
                const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
                pillIconClasses = getIconClasses(this.modelService, this.languageService, uri, fileKind);
                iconEl.classList.add(...pillIconClasses);
                this.pillElement.classList.remove('progress-filling');
                progressFill.style.width = '0%';
                labelDetail.textContent = '';
            }
        }));
        // Render the +/- diff
        this.progressStore.add(autorunSelfDisposable(r => {
            const changes = diffObservable.read(r);
            if (changes === undefined) {
                return;
            }
            // eslint-disable-next-line no-restricted-syntax
            const labelAdded = this.pillElement.querySelector('.label-added') ?? this.pillElement.appendChild(dom.$('span.label-added'));
            // eslint-disable-next-line no-restricted-syntax
            const labelRemoved = this.pillElement.querySelector('.label-removed') ?? this.pillElement.appendChild(dom.$('span.label-removed'));
            if (changes && !changes?.identical && !changes?.quitEarly) {
                this.currentDiff = changes;
                labelAdded.textContent = `+${changes.added}`;
                labelRemoved.textContent = `-${changes.removed}`;
                const insertionsFragment = changes.added === 1 ? localize(5531, null) : localize(5532, null, changes.added);
                const deletionsFragment = changes.removed === 1 ? localize(5533, null) : localize(5534, null, changes.removed);
                const summary = localize(5535, null, iconText, insertionsFragment, deletionsFragment);
                this.element.ariaLabel = summary;
                // No need to keep updating once we get the diff info
                if (changes.isFinal) {
                    r.dispose();
                }
            }
        }));
    }
    updateTooltip(tooltip) {
        this.tooltip = tooltip;
        if (!this.hover.value) {
            this.hover.value = this.hoverService.setupDelayedHover(this.pillElement, () => ({
                content: this.tooltip,
                style: 1 /* HoverStyle.Pointer */,
                position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                persistence: { hideOnKeyDown: true },
            }));
        }
    }
};
CollapsedCodeBlock = __decorate([
    __param(3, ILabelService),
    __param(4, IEditorService),
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, IContextMenuService),
    __param(8, IContextKeyService),
    __param(9, IMenuService),
    __param(10, IHoverService),
    __param(11, IChatService),
    __param(12, IConfigurationService)
], CollapsedCodeBlock);
export { CollapsedCodeBlock };
//# sourceMappingURL=chatMarkdownContentPart.js.map