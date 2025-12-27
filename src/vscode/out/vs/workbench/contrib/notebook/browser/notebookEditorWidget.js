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
import './media/notebook.css';
import './media/notebookCellChat.css';
import './media/notebookCellEditorHint.css';
import './media/notebookCellInsertToolbar.css';
import './media/notebookCellStatusBar.css';
import './media/notebookCellTitleToolbar.css';
import './media/notebookFocusIndicator.css';
import './media/notebookToolbar.css';
import './media/notebookDnd.css';
import './media/notebookFolding.css';
import './media/notebookCellOutput.css';
import './media/notebookEditorStickyScroll.css';
import './media/notebookKernelActionViewItem.css';
import './media/notebookOutline.css';
import './media/notebookChatEditController.css';
import './media/notebookChatEditorOverlay.css';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { SequencerByKey } from '../../../../base/common/async.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { FontMeasurements } from '../../../../editor/browser/config/fontMeasurements.js';
import { createBareFontInfoFromRawSettings } from '../../../../editor/common/config/fontInfoFromSettings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { registerZIndex, ZIndex } from '../../../../platform/layout/browser/zIndexRegistry.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { contrastBorder, errorForeground, focusBorder, foreground, listInactiveSelectionBackground, registerColor, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_PANE_BACKGROUND, PANEL_BORDER, SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { debugIconStartForeground } from '../../debug/browser/debugColors.js';
import { CellEditState, CellFocusMode, CellRevealRangeType, ScrollToRevealBehavior } from './notebookBrowser.js';
import { NotebookEditorExtensionsRegistry } from './notebookEditorExtensions.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { notebookDebug } from './notebookLogger.js';
import { NotebookLayoutChangedEvent } from './notebookViewEvents.js';
import { CellContextKeyManager } from './view/cellParts/cellContextKeys.js';
import { CellDragAndDropController } from './view/cellParts/cellDnd.js';
import { ListViewInfoAccessor, NotebookCellList, NOTEBOOK_WEBVIEW_BOUNDARY } from './view/notebookCellList.js';
import { BackLayerWebView } from './view/renderers/backLayerWebView.js';
import { CodeCellRenderer, MarkupCellRenderer, NotebookCellListDelegate } from './view/renderers/cellRenderer.js';
import { CodeCellViewModel, outputDisplayLimit } from './viewModel/codeCellViewModel.js';
import { NotebookEventDispatcher } from './viewModel/eventDispatcher.js';
import { MarkupCellViewModel } from './viewModel/markupCellViewModel.js';
import { NotebookViewModel } from './viewModel/notebookViewModelImpl.js';
import { ViewContext } from './viewModel/viewContext.js';
import { NotebookEditorWorkbenchToolbar } from './viewParts/notebookEditorToolbar.js';
import { NotebookEditorContextKeys } from './viewParts/notebookEditorWidgetContextKeys.js';
import { NotebookOverviewRuler } from './viewParts/notebookOverviewRuler.js';
import { ListTopCellToolbar } from './viewParts/notebookTopCellToolbar.js';
import { CellKind, NotebookFindScopeType, RENDERER_NOT_AVAILABLE, SelectionStateType } from '../common/notebookCommon.js';
import { NOTEBOOK_CURSOR_NAVIGATION_MODE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED, NOTEBOOK_OUTPUT_INPUT_FOCUSED } from '../common/notebookContextKeys.js';
import { INotebookExecutionService } from '../common/notebookExecutionService.js';
import { INotebookKernelService } from '../common/notebookKernelService.js';
import { NotebookOptions, OutputInnerContainerTopPadding } from './notebookOptions.js';
import { cellRangesToIndexes } from '../common/notebookRange.js';
import { INotebookRendererMessagingService } from '../common/notebookRendererMessagingService.js';
import { INotebookService } from '../common/notebookService.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { BaseCellEditorOptions } from './viewModel/cellEditorOptions.js';
import { FloatingEditorClickMenu } from '../../../browser/codeeditor.js';
import { CellFindMatchModel } from './contrib/find/findModel.js';
import { INotebookLoggingService } from '../common/notebookLoggingService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { NotebookStickyScroll } from './viewParts/notebookEditorStickyScroll.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { PreventDefaultContextMenuItemsContextKeyName } from '../../webview/browser/webview.contribution.js';
import { NotebookAccessibilityProvider } from './notebookAccessibilityProvider.js';
import { NotebookHorizontalTracker } from './viewParts/notebookHorizontalTracker.js';
import { NotebookCellEditorPool } from './view/notebookCellEditorPool.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { NotebookCellLayoutManager } from './notebookCellLayoutManager.js';
import { FloatingEditorToolbar } from '../../../../editor/contrib/floatingMenu/browser/floatingMenu.js';
const $ = DOM.$;
export function getDefaultNotebookCreationOptions() {
    // We inlined the id to avoid loading comment contrib in tests
    const skipContributions = [
        'editor.contrib.review',
        FloatingEditorClickMenu.ID,
        FloatingEditorToolbar.ID,
        'editor.contrib.dirtydiff',
        'editor.contrib.testingOutputPeek',
        'editor.contrib.testingDecorations',
        'store.contrib.stickyScrollController',
        'editor.contrib.findController',
        'editor.contrib.emptyTextEditorHint'
    ];
    const contributions = EditorExtensionsRegistry.getEditorContributions().filter(c => skipContributions.indexOf(c.id) === -1);
    return {
        menuIds: {
            notebookToolbar: MenuId.NotebookToolbar,
            cellTitleToolbar: MenuId.NotebookCellTitle,
            cellDeleteToolbar: MenuId.NotebookCellDelete,
            cellInsertToolbar: MenuId.NotebookCellBetween,
            cellTopInsertToolbar: MenuId.NotebookCellListTop,
            cellExecuteToolbar: MenuId.NotebookCellExecute,
            cellExecutePrimary: MenuId.NotebookCellExecutePrimary,
        },
        cellEditorContributions: contributions
    };
}
let NotebookEditorWidget = class NotebookEditorWidget extends Disposable {
    get isVisible() {
        return this._isVisible;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    set viewModel(newModel) {
        this._onWillChangeModel.fire(this._notebookViewModel?.notebookDocument);
        this._notebookViewModel = newModel;
        this._onDidChangeModel.fire(newModel?.notebookDocument);
    }
    get viewModel() {
        return this._notebookViewModel;
    }
    get textModel() {
        return this._notebookViewModel?.notebookDocument;
    }
    get isReadOnly() {
        return this._notebookViewModel?.options.isReadOnly ?? false;
    }
    get activeCodeEditor() {
        if (this._isDisposed) {
            return;
        }
        const [focused] = this._list.getFocusedElements();
        return this._renderedEditors.get(focused);
    }
    get activeCellAndCodeEditor() {
        if (this._isDisposed) {
            return;
        }
        const [focused] = this._list.getFocusedElements();
        const editor = this._renderedEditors.get(focused);
        if (!editor) {
            return;
        }
        return [focused, editor];
    }
    get codeEditors() {
        return [...this._renderedEditors];
    }
    get visibleRanges() {
        return this._list ? (this._list.visibleRanges || []) : [];
    }
    get notebookOptions() {
        return this._notebookOptions;
    }
    constructor(creationOptions, dimension, instantiationService, editorGroupsService, notebookRendererMessaging, notebookEditorService, notebookKernelService, _notebookService, configurationService, contextKeyService, layoutService, contextMenuService, telemetryService, notebookExecutionService, editorProgressService, logService) {
        super();
        this.creationOptions = creationOptions;
        this.notebookRendererMessaging = notebookRendererMessaging;
        this.notebookEditorService = notebookEditorService;
        this.notebookKernelService = notebookKernelService;
        this._notebookService = _notebookService;
        this.configurationService = configurationService;
        this.layoutService = layoutService;
        this.contextMenuService = contextMenuService;
        this.telemetryService = telemetryService;
        this.notebookExecutionService = notebookExecutionService;
        this.editorProgressService = editorProgressService;
        this.logService = logService;
        //#region Eventing
        this._onDidChangeCellState = this._register(new Emitter());
        this.onDidChangeCellState = this._onDidChangeCellState.event;
        this._onDidChangeViewCells = this._register(new Emitter());
        this.onDidChangeViewCells = this._onDidChangeViewCells.event;
        this._onWillChangeModel = this._register(new Emitter());
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter());
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidAttachViewModel = this._register(new Emitter());
        this.onDidAttachViewModel = this._onDidAttachViewModel.event;
        this._onDidChangeOptions = this._register(new Emitter());
        this.onDidChangeOptions = this._onDidChangeOptions.event;
        this._onDidChangeDecorations = this._register(new Emitter());
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._onDidChangeActiveCell = this._register(new Emitter());
        this.onDidChangeActiveCell = this._onDidChangeActiveCell.event;
        this._onDidChangeFocus = this._register(new Emitter());
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeVisibleRanges = this._register(new Emitter());
        this.onDidChangeVisibleRanges = this._onDidChangeVisibleRanges.event;
        this._onDidFocusEmitter = this._register(new Emitter());
        this.onDidFocusWidget = this._onDidFocusEmitter.event;
        this._onDidBlurEmitter = this._register(new Emitter());
        this.onDidBlurWidget = this._onDidBlurEmitter.event;
        this._onDidChangeActiveEditor = this._register(new Emitter());
        this.onDidChangeActiveEditor = this._onDidChangeActiveEditor.event;
        this._onDidChangeActiveKernel = this._register(new Emitter());
        this.onDidChangeActiveKernel = this._onDidChangeActiveKernel.event;
        this._onMouseUp = this._register(new Emitter());
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new Emitter());
        this.onMouseDown = this._onMouseDown.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._onDidRenderOutput = this._register(new Emitter());
        this.onDidRenderOutput = this._onDidRenderOutput.event;
        this._onDidRemoveOutput = this._register(new Emitter());
        this.onDidRemoveOutput = this._onDidRemoveOutput.event;
        this._onDidResizeOutputEmitter = this._register(new Emitter());
        this.onDidResizeOutput = this._onDidResizeOutputEmitter.event;
        this._webview = null;
        this._webviewResolvePromise = null;
        this._webviewTransparentCover = null;
        this._listDelegate = null;
        this._dndController = null;
        this._listTopCellToolbar = null;
        this._renderedEditors = new Map();
        this._localStore = this._register(new DisposableStore());
        this._localCellStateListeners = [];
        this._shadowElementViewInfo = null;
        this._contributions = new Map();
        this._insetModifyQueueByOutputId = new SequencerByKey();
        this._cellContextKeyManager = null;
        this._uuid = generateUuid();
        this._webviewFocused = false;
        this._isVisible = false;
        this._isDisposed = false;
        this._baseCellEditorOptions = new Map();
        this._debugFlag = false;
        this._backgroundMarkdownRenderRunning = false;
        this._lastCellWithEditorFocus = null;
        this._pendingOutputHeightAcks = new Map();
        this._dimension = dimension;
        this.isReplHistory = creationOptions.isReplHistory ?? false;
        this._readOnly = creationOptions.isReadOnly ?? false;
        this._overlayContainer = document.createElement('div');
        this.scopedContextKeyService = this._register(contextKeyService.createScoped(this._overlayContainer));
        this.instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this._notebookOptions = creationOptions.options ??
            this.instantiationService.createInstance(NotebookOptions, this.creationOptions?.codeWindow ?? mainWindow, this._readOnly, undefined);
        this._register(this._notebookOptions);
        const eventDispatcher = this._register(new NotebookEventDispatcher());
        this._viewContext = new ViewContext(this._notebookOptions, eventDispatcher, language => this.getBaseCellEditorOptions(language));
        this._register(this._viewContext.eventDispatcher.onDidChangeLayout(() => {
            this._onDidChangeLayout.fire();
        }));
        this._register(this._viewContext.eventDispatcher.onDidChangeCellState(e => {
            this._onDidChangeCellState.fire(e);
        }));
        this._register(_notebookService.onDidChangeOutputRenderers(() => {
            this._updateOutputRenderers();
        }));
        this._register(this.instantiationService.createInstance(NotebookEditorContextKeys, this));
        this._register(notebookKernelService.onDidChangeSelectedNotebooks(e => {
            if (isEqual(e.notebook, this.viewModel?.uri)) {
                this._loadKernelPreloads();
                this._onDidChangeActiveKernel.fire();
            }
        }));
        this._scrollBeyondLastLine = this.configurationService.getValue('editor.scrollBeyondLastLine');
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.scrollBeyondLastLine')) {
                this._scrollBeyondLastLine = this.configurationService.getValue('editor.scrollBeyondLastLine');
                if (this._dimension && this._isVisible) {
                    this.layout(this._dimension);
                }
            }
        }));
        this._register(this._notebookOptions.onDidChangeOptions(e => {
            if (e.cellStatusBarVisibility || e.cellToolbarLocation || e.cellToolbarInteraction) {
                this._updateForNotebookConfiguration();
            }
            if (e.fontFamily) {
                this._generateFontInfo();
            }
            if (e.compactView
                || e.focusIndicator
                || e.insertToolbarPosition
                || e.cellToolbarLocation
                || e.dragAndDropEnabled
                || e.fontSize
                || e.markupFontSize
                || e.markdownLineHeight
                || e.fontFamily
                || e.insertToolbarAlignment
                || e.outputFontSize
                || e.outputLineHeight
                || e.outputFontFamily
                || e.outputWordWrap
                || e.outputScrolling
                || e.outputLinkifyFilePaths
                || e.minimalError) {
                this._styleElement?.remove();
                this._createLayoutStyles();
                this._webview?.updateOptions({
                    ...this.notebookOptions.computeWebviewOptions(),
                    fontFamily: this._generateFontFamily()
                });
            }
            if (this._dimension && this._isVisible) {
                this.layout(this._dimension);
            }
        }));
        const container = creationOptions.codeWindow ? this.layoutService.getContainer(creationOptions.codeWindow) : this.layoutService.mainContainer;
        this._register(editorGroupsService.getPart(container).onDidScroll(e => {
            if (!this._shadowElement || !this._isVisible) {
                return;
            }
            this.updateShadowElement(this._shadowElement, this._dimension);
            this.layoutContainerOverShadowElement(this._dimension, this._position);
        }));
        this.notebookEditorService.addNotebookEditor(this);
        const id = generateUuid();
        this._overlayContainer.id = `notebook-${id}`;
        this._overlayContainer.className = 'notebookOverlay';
        this._overlayContainer.classList.add('notebook-editor');
        this._overlayContainer.inert = true;
        this._overlayContainer.style.visibility = 'hidden';
        container.appendChild(this._overlayContainer);
        this._createBody(this._overlayContainer);
        this._generateFontInfo();
        this._isVisible = true;
        this._editorFocus = NOTEBOOK_EDITOR_FOCUSED.bindTo(this.scopedContextKeyService);
        this._outputFocus = NOTEBOOK_OUTPUT_FOCUSED.bindTo(this.scopedContextKeyService);
        this._outputInputFocus = NOTEBOOK_OUTPUT_INPUT_FOCUSED.bindTo(this.scopedContextKeyService);
        this._editorEditable = NOTEBOOK_EDITOR_EDITABLE.bindTo(this.scopedContextKeyService);
        this._cursorNavMode = NOTEBOOK_CURSOR_NAVIGATION_MODE.bindTo(this.scopedContextKeyService);
        // Never display the native cut/copy context menu items in notebooks
        new RawContextKey(PreventDefaultContextMenuItemsContextKeyName, false).bindTo(this.scopedContextKeyService).set(true);
        this._editorEditable.set(!creationOptions.isReadOnly);
        let contributions;
        if (Array.isArray(this.creationOptions.contributions)) {
            contributions = this.creationOptions.contributions;
        }
        else {
            contributions = NotebookEditorExtensionsRegistry.getEditorContributions();
        }
        for (const desc of contributions) {
            let contribution;
            try {
                contribution = this.instantiationService.createInstance(desc.ctor, this);
            }
            catch (err) {
                onUnexpectedError(err);
            }
            if (contribution) {
                if (!this._contributions.has(desc.id)) {
                    this._contributions.set(desc.id, contribution);
                }
                else {
                    contribution.dispose();
                    throw new Error(`DUPLICATE notebook editor contribution: '${desc.id}'`);
                }
            }
        }
        this._updateForNotebookConfiguration();
    }
    _debug(...args) {
        if (!this._debugFlag) {
            return;
        }
        notebookDebug(...args);
    }
    /**
     * EditorId
     */
    getId() {
        return this._uuid;
    }
    getViewModel() {
        return this.viewModel;
    }
    getLength() {
        return this.viewModel?.length ?? 0;
    }
    getSelections() {
        return this.viewModel?.getSelections() ?? [{ start: 0, end: 0 }];
    }
    setSelections(selections) {
        if (!this.viewModel) {
            return;
        }
        const focus = this.viewModel.getFocus();
        this.viewModel.updateSelectionsState({
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections
        });
    }
    getFocus() {
        return this.viewModel?.getFocus() ?? { start: 0, end: 0 };
    }
    setFocus(focus) {
        if (!this.viewModel) {
            return;
        }
        const selections = this.viewModel.getSelections();
        this.viewModel.updateSelectionsState({
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections
        });
    }
    getSelectionViewModels() {
        if (!this.viewModel) {
            return [];
        }
        const cellsSet = new Set();
        return this.viewModel.getSelections().map(range => this.viewModel.viewCells.slice(range.start, range.end)).reduce((a, b) => {
            b.forEach(cell => {
                if (!cellsSet.has(cell.handle)) {
                    cellsSet.add(cell.handle);
                    a.push(cell);
                }
            });
            return a;
        }, []);
    }
    hasModel() {
        return !!this._notebookViewModel;
    }
    showProgress() {
        this._currentProgress = this.editorProgressService.show(true);
    }
    hideProgress() {
        if (this._currentProgress) {
            this._currentProgress.done();
            this._currentProgress = undefined;
        }
    }
    //#region Editor Core
    getBaseCellEditorOptions(language) {
        const existingOptions = this._baseCellEditorOptions.get(language);
        if (existingOptions) {
            return existingOptions;
        }
        else {
            const options = new BaseCellEditorOptions(this, this.notebookOptions, this.configurationService, language);
            this._baseCellEditorOptions.set(language, options);
            return options;
        }
    }
    _updateForNotebookConfiguration() {
        if (!this._overlayContainer) {
            return;
        }
        this._overlayContainer.classList.remove('cell-title-toolbar-left');
        this._overlayContainer.classList.remove('cell-title-toolbar-right');
        this._overlayContainer.classList.remove('cell-title-toolbar-hidden');
        const cellToolbarLocation = this._notebookOptions.computeCellToolbarLocation(this.viewModel?.viewType);
        this._overlayContainer.classList.add(`cell-title-toolbar-${cellToolbarLocation}`);
        const cellToolbarInteraction = this._notebookOptions.getDisplayOptions().cellToolbarInteraction;
        let cellToolbarInteractionState = 'hover';
        this._overlayContainer.classList.remove('cell-toolbar-hover');
        this._overlayContainer.classList.remove('cell-toolbar-click');
        if (cellToolbarInteraction === 'hover' || cellToolbarInteraction === 'click') {
            cellToolbarInteractionState = cellToolbarInteraction;
        }
        this._overlayContainer.classList.add(`cell-toolbar-${cellToolbarInteractionState}`);
    }
    _generateFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        const targetWindow = DOM.getWindow(this.getDomNode());
        this._fontInfo = FontMeasurements.readFontInfo(targetWindow, createBareFontInfoFromRawSettings(editorOptions, PixelRatio.getInstance(targetWindow).value));
    }
    _createBody(parent) {
        this._notebookTopToolbarContainer = document.createElement('div');
        this._notebookTopToolbarContainer.classList.add('notebook-toolbar-container');
        this._notebookTopToolbarContainer.style.display = 'none';
        DOM.append(parent, this._notebookTopToolbarContainer);
        this._notebookStickyScrollContainer = document.createElement('div');
        this._notebookStickyScrollContainer.classList.add('notebook-sticky-scroll-container');
        DOM.append(parent, this._notebookStickyScrollContainer);
        this._body = document.createElement('div');
        DOM.append(parent, this._body);
        this._body.classList.add('cell-list-container');
        this._createLayoutStyles();
        this._createCellList();
        this._notebookOverviewRulerContainer = document.createElement('div');
        this._notebookOverviewRulerContainer.classList.add('notebook-overview-ruler-container');
        this._list.scrollableElement.appendChild(this._notebookOverviewRulerContainer);
        this._registerNotebookOverviewRuler();
        this._register(this.instantiationService.createInstance(NotebookHorizontalTracker, this, this._list.scrollableElement));
        this._overflowContainer = document.createElement('div');
        this._overflowContainer.classList.add('notebook-overflow-widget-container', 'monaco-editor');
        DOM.append(parent, this._overflowContainer);
    }
    _generateFontFamily() {
        return this._fontInfo?.fontFamily ?? `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`;
    }
    _createLayoutStyles() {
        this._styleElement = domStylesheets.createStyleSheet(this._body);
        const { cellRightMargin, cellTopMargin, cellRunGutter, cellBottomMargin, codeCellLeftMargin, markdownCellGutter, markdownCellLeftMargin, markdownCellBottomMargin, markdownCellTopMargin, collapsedIndicatorHeight, focusIndicator, insertToolbarPosition, outputFontSize, focusIndicatorLeftMargin, focusIndicatorGap } = this._notebookOptions.getLayoutConfiguration();
        const { insertToolbarAlignment, compactView, fontSize } = this._notebookOptions.getDisplayOptions();
        const getCellEditorContainerLeftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
        const { bottomToolbarGap, bottomToolbarHeight } = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
        const styleSheets = [];
        if (!this._fontInfo) {
            this._generateFontInfo();
        }
        const fontFamily = this._generateFontFamily();
        styleSheets.push(`
		.notebook-editor {
			--notebook-cell-output-font-size: ${outputFontSize}px;
			--notebook-cell-input-preview-font-size: ${fontSize}px;
			--notebook-cell-input-preview-font-family: ${fontFamily};
		}
		`);
        if (compactView) {
            styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row div.cell.code { margin-left: ${getCellEditorContainerLeftMargin}px; }`);
        }
        else {
            styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row div.cell.code { margin-left: ${codeCellLeftMargin}px; }`);
        }
        // focus indicator
        if (focusIndicator === 'border') {
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-top:before,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-bottom:before,
			.monaco-workbench .notebookOverlay .monaco-list .markdown-cell-row .cell-inner-container:before,
			.monaco-workbench .notebookOverlay .monaco-list .markdown-cell-row .cell-inner-container:after {
				content: "";
				position: absolute;
				width: 100%;
				height: 1px;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left:before,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-right:before {
				content: "";
				position: absolute;
				width: 1px;
				height: 100%;
				z-index: 10;
			}

			/* top border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-top:before {
				border-top: 1px solid transparent;
			}

			/* left border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left:before {
				border-left: 1px solid transparent;
			}

			/* bottom border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-bottom:before {
				border-bottom: 1px solid transparent;
			}

			/* right border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-right:before {
				border-right: 1px solid transparent;
			}
			`);
            // left and right border margins
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.code-cell-row.focused .cell-focus-indicator-left:before,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.code-cell-row.focused .cell-focus-indicator-right:before,
			.monaco-workbench .notebookOverlay .monaco-list.selection-multiple .monaco-list-row.code-cell-row.selected .cell-focus-indicator-left:before,
			.monaco-workbench .notebookOverlay .monaco-list.selection-multiple .monaco-list-row.code-cell-row.selected .cell-focus-indicator-right:before {
				top: -${cellTopMargin}px; height: calc(100% + ${cellTopMargin + cellBottomMargin}px)
			}`);
        }
        else {
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left .codeOutput-focus-indicator {
				border-left: 3px solid transparent;
				border-radius: 4px;
				width: 0px;
				margin-left: ${focusIndicatorLeftMargin}px;
				border-color: var(--vscode-notebook-inactiveFocusedCellBorder) !important;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.focused .cell-focus-indicator-left .codeOutput-focus-indicator-container,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-output-hover .cell-focus-indicator-left .codeOutput-focus-indicator-container,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .markdown-cell-hover .cell-focus-indicator-left .codeOutput-focus-indicator-container,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row:hover .cell-focus-indicator-left .codeOutput-focus-indicator-container {
				display: block;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left .codeOutput-focus-indicator-container:hover .codeOutput-focus-indicator {
				border-left: 5px solid transparent;
				margin-left: ${focusIndicatorLeftMargin - 1}px;
			}
			`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.focused .cell-inner-container.cell-output-focus .cell-focus-indicator-left .codeOutput-focus-indicator,
			.monaco-workbench .notebookOverlay .monaco-list:focus-within .monaco-list-row.focused .cell-inner-container .cell-focus-indicator-left .codeOutput-focus-indicator {
				border-color: var(--vscode-notebook-focusedCellBorder) !important;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-inner-container .cell-focus-indicator-left .output-focus-indicator {
				margin-top: ${focusIndicatorGap}px;
			}
			`);
        }
        // between cell insert toolbar
        if (insertToolbarPosition === 'betweenCells' || insertToolbarPosition === 'both') {
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container { display: flex; }`);
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .cell-list-top-cell-toolbar-container { display: flex; }`);
        }
        else {
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container { display: none; }`);
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .cell-list-top-cell-toolbar-container { display: none; }`);
        }
        if (insertToolbarAlignment === 'left') {
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .action-item:first-child,
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .action-item:first-child, .monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container .action-item:first-child {
				margin-right: 0px !important;
			}`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .monaco-toolbar .action-label,
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .monaco-toolbar .action-label, .monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container .monaco-toolbar .action-label {
				padding: 0px !important;
				justify-content: center;
				border-radius: 4px;
			}`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container,
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container, .monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container {
				align-items: flex-start;
				justify-content: left;
				margin: 0 16px 0 ${8 + codeCellLeftMargin}px;
			}`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container,
			.notebookOverlay .cell-bottom-toolbar-container .action-item {
				border: 0px;
			}`);
        }
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .code-cell-row div.cell.code { margin-left: ${getCellEditorContainerLeftMargin}px; }`);
        // Chat Edit, deleted Cell Overlay
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .code-cell-row div.cell.code { margin-left: ${getCellEditorContainerLeftMargin}px; }`);
        // Chat Edit, deleted Cell Overlay
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .code-cell-row div.cell { margin-right: ${cellRightMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row div.cell { margin-right: ${cellRightMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row > .cell-inner-container { padding-top: ${cellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row > .cell-inner-container { padding-bottom: ${markdownCellBottomMargin}px; padding-top: ${markdownCellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row > .cell-inner-container.webview-backed-markdown-cell { padding: 0; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row > .webview-backed-markdown-cell.markdown-cell-edit-mode .cell.code { padding-bottom: ${markdownCellBottomMargin}px; padding-top: ${markdownCellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .output { margin: 0px ${cellRightMargin}px 0px ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .output { width: calc(100% - ${getCellEditorContainerLeftMargin + cellRightMargin}px); }`);
        // comment
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-comment-container { left: ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-comment-container { width: calc(100% - ${getCellEditorContainerLeftMargin + cellRightMargin}px); }`);
        // output collapse button
        styleSheets.push(`.monaco-workbench .notebookOverlay .output .output-collapse-container .expandButton { left: -${cellRunGutter}px; }`);
        styleSheets.push(`.monaco-workbench .notebookOverlay .output .output-collapse-container .expandButton {
			position: absolute;
			width: ${cellRunGutter}px;
			padding: 6px 0px;
		}`);
        // show more container
        styleSheets.push(`.notebookOverlay .output-show-more-container { margin: 0px ${cellRightMargin}px 0px ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .output-show-more-container { width: calc(100% - ${getCellEditorContainerLeftMargin + cellRightMargin}px); }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row div.cell.markdown { padding-left: ${cellRunGutter}px; }`);
        styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container .notebook-folding-indicator { left: ${(markdownCellGutter - 20) / 2 + markdownCellLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay > .cell-list-container .notebook-folded-hint { left: ${markdownCellGutter + markdownCellLeftMargin + 8}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row :not(.webview-backed-markdown-cell) .cell-focus-indicator-top { height: ${cellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-side { bottom: ${bottomToolbarGap}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row.code-cell-row .cell-focus-indicator-left { width: ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row.markdown-cell-row .cell-focus-indicator-left { width: ${codeCellLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator.cell-focus-indicator-right { width: ${cellRightMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-bottom { height: ${cellBottomMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-shadow-container-bottom { top: ${cellBottomMargin}px; }`);
        styleSheets.push(`
			.notebookOverlay .monaco-list.selection-multiple .monaco-list-row:has(+ .monaco-list-row.selected) .cell-focus-indicator-bottom {
				height: ${bottomToolbarGap + cellBottomMargin}px;
			}
		`);
        styleSheets.push(`
			.notebookOverlay .monaco-list .monaco-list-row.code-cell-row.nb-multiCellHighlight:has(+ .monaco-list-row.nb-multiCellHighlight) .cell-focus-indicator-bottom {
				height: ${bottomToolbarGap + cellBottomMargin}px;
				background-color: var(--vscode-notebook-symbolHighlightBackground) !important;
			}

			.notebookOverlay .monaco-list .monaco-list-row.markdown-cell-row.nb-multiCellHighlight:has(+ .monaco-list-row.nb-multiCellHighlight) .cell-focus-indicator-bottom {
				height: ${bottomToolbarGap + cellBottomMargin - 6}px;
				background-color: var(--vscode-notebook-symbolHighlightBackground) !important;
			}
		`);
        styleSheets.push(`
			.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .input-collapse-container .cell-collapse-preview {
				line-height: ${collapsedIndicatorHeight}px;
			}

			.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .input-collapse-container .cell-collapse-preview .monaco-tokenized-source {
				max-height: ${collapsedIndicatorHeight}px;
			}
		`);
        styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container .monaco-toolbar { height: ${bottomToolbarHeight}px }`);
        styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .cell-list-top-cell-toolbar-container .monaco-toolbar { height: ${bottomToolbarHeight}px }`);
        // cell toolbar
        styleSheets.push(`.monaco-workbench .notebookOverlay.cell-title-toolbar-right > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-title-toolbar {
			right: ${cellRightMargin + 26}px;
		}
		.monaco-workbench .notebookOverlay.cell-title-toolbar-left > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-title-toolbar {
			left: ${getCellEditorContainerLeftMargin + 16}px;
		}
		.monaco-workbench .notebookOverlay.cell-title-toolbar-hidden > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-title-toolbar {
			display: none;
		}`);
        // cell output innert container
        styleSheets.push(`
		.monaco-workbench .notebookOverlay .output > div.foreground.output-inner-container {
			padding: ${OutputInnerContainerTopPadding}px 8px;
		}
		.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .output-collapse-container {
			padding: ${OutputInnerContainerTopPadding}px 8px;
		}
		`);
        // chat
        styleSheets.push(`
		.monaco-workbench .notebookOverlay .cell-chat-part {
			margin: 0 ${cellRightMargin}px 6px 4px;
		}
		`);
        this._styleElement.textContent = styleSheets.join('\n');
    }
    _createCellList() {
        this._body.classList.add('cell-list-container');
        this._dndController = this._register(new CellDragAndDropController(this, this._body));
        const getScopedContextKeyService = (container) => this._list.contextKeyService.createScoped(container);
        this._editorPool = this._register(this.instantiationService.createInstance(NotebookCellEditorPool, this, getScopedContextKeyService));
        const renderers = [
            this.instantiationService.createInstance(CodeCellRenderer, this, this._renderedEditors, this._editorPool, this._dndController, getScopedContextKeyService),
            this.instantiationService.createInstance(MarkupCellRenderer, this, this._dndController, this._renderedEditors, getScopedContextKeyService),
        ];
        renderers.forEach(renderer => {
            this._register(renderer);
        });
        this._listDelegate = this.instantiationService.createInstance(NotebookCellListDelegate, DOM.getWindow(this.getDomNode()));
        this._register(this._listDelegate);
        const accessibilityProvider = this.instantiationService.createInstance(NotebookAccessibilityProvider, () => this.viewModel, this.isReplHistory);
        this._register(accessibilityProvider);
        this._list = this.instantiationService.createInstance(NotebookCellList, 'NotebookCellList', this._body, this._viewContext.notebookOptions, this._listDelegate, renderers, this.scopedContextKeyService, {
            setRowLineHeight: false,
            setRowHeight: false,
            supportDynamicHeights: true,
            horizontalScrolling: false,
            keyboardSupport: false,
            mouseSupport: true,
            multipleSelectionSupport: true,
            selectionNavigation: true,
            typeNavigationEnabled: true,
            paddingTop: 0,
            paddingBottom: 0,
            transformOptimization: false, //(isMacintosh && isNative) || getTitleBarStyle(this.configurationService, this.environmentService) === 'native',
            initialSize: this._dimension,
            styleController: (_suffix) => { return this._list; },
            overrideStyles: {
                listBackground: notebookEditorBackground,
                listActiveSelectionBackground: notebookEditorBackground,
                listActiveSelectionForeground: foreground,
                listFocusAndSelectionBackground: notebookEditorBackground,
                listFocusAndSelectionForeground: foreground,
                listFocusBackground: notebookEditorBackground,
                listFocusForeground: foreground,
                listHoverForeground: foreground,
                listHoverBackground: notebookEditorBackground,
                listHoverOutline: focusBorder,
                listFocusOutline: focusBorder,
                listInactiveSelectionBackground: notebookEditorBackground,
                listInactiveSelectionForeground: foreground,
                listInactiveFocusBackground: notebookEditorBackground,
                listInactiveFocusOutline: notebookEditorBackground,
            },
            accessibilityProvider
        });
        this._cellLayoutManager = new NotebookCellLayoutManager(this, this._list, this.logService);
        this._dndController.setList(this._list);
        // create Webview
        this._register(this._list);
        this._listViewInfoAccessor = new ListViewInfoAccessor(this._list);
        this._register(this._listViewInfoAccessor);
        this._register(combinedDisposable(...renderers));
        // top cell toolbar
        this._listTopCellToolbar = this._register(this.instantiationService.createInstance(ListTopCellToolbar, this, this.notebookOptions));
        // transparent cover
        this._webviewTransparentCover = DOM.append(this._list.rowsContainer, $('.webview-cover'));
        this._webviewTransparentCover.style.display = 'none';
        this._register(DOM.addStandardDisposableGenericMouseDownListener(this._overlayContainer, (e) => {
            if (e.target.classList.contains('slider') && this._webviewTransparentCover) {
                this._webviewTransparentCover.style.display = 'block';
            }
        }));
        this._register(DOM.addStandardDisposableGenericMouseUpListener(this._overlayContainer, () => {
            if (this._webviewTransparentCover) {
                // no matter when
                this._webviewTransparentCover.style.display = 'none';
            }
        }));
        this._register(this._list.onMouseDown(e => {
            if (e.element) {
                this._onMouseDown.fire({ event: e.browserEvent, target: e.element });
            }
        }));
        this._register(this._list.onMouseUp(e => {
            if (e.element) {
                this._onMouseUp.fire({ event: e.browserEvent, target: e.element });
            }
        }));
        this._register(this._list.onDidChangeFocus(_e => {
            this._onDidChangeActiveEditor.fire(this);
            this._onDidChangeActiveCell.fire();
            this._onDidChangeFocus.fire();
            this._cursorNavMode.set(false);
        }));
        this._register(this._list.onContextMenu(e => {
            this.showListContextMenu(e);
        }));
        this._register(this._list.onDidChangeVisibleRanges(() => {
            this._onDidChangeVisibleRanges.fire();
        }));
        this._register(this._list.onDidScroll((e) => {
            if (e.scrollTop !== e.oldScrollTop) {
                this._onDidScroll.fire();
                this.clearActiveCellWidgets();
            }
            if (e.scrollTop === e.oldScrollTop && e.scrollHeightChanged) {
                this._onDidChangeLayout.fire();
            }
        }));
        this._focusTracker = this._register(DOM.trackFocus(this.getDomNode()));
        this._register(this._focusTracker.onDidBlur(() => {
            this._editorFocus.set(false);
            this.viewModel?.setEditorFocus(false);
            this._onDidBlurEmitter.fire();
        }));
        this._register(this._focusTracker.onDidFocus(() => {
            this._editorFocus.set(true);
            this.viewModel?.setEditorFocus(true);
            this._onDidFocusEmitter.fire();
        }));
        this._registerNotebookActionsToolbar();
        this._registerNotebookStickyScroll();
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(accessibilityProvider.verbositySettingId)) {
                this._list.ariaLabel = accessibilityProvider?.getWidgetAriaLabel();
            }
        }));
    }
    showListContextMenu(e) {
        this.contextMenuService.showContextMenu({
            menuId: MenuId.NotebookCellTitle,
            menuActionOptions: {
                shouldForwardArgs: true
            },
            contextKeyService: this.scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => {
                return {
                    from: 'cellContainer'
                };
            }
        });
    }
    _registerNotebookOverviewRuler() {
        this._notebookOverviewRuler = this._register(this.instantiationService.createInstance(NotebookOverviewRuler, this, this._notebookOverviewRulerContainer));
    }
    _registerNotebookActionsToolbar() {
        this._notebookTopToolbar = this._register(this.instantiationService.createInstance(NotebookEditorWorkbenchToolbar, this, this.scopedContextKeyService, this._notebookOptions, this._notebookTopToolbarContainer));
        this._register(this._notebookTopToolbar.onDidChangeVisibility(() => {
            if (this._dimension && this._isVisible) {
                this.layout(this._dimension);
            }
        }));
    }
    _registerNotebookStickyScroll() {
        this._notebookStickyScroll = this._register(this.instantiationService.createInstance(NotebookStickyScroll, this._notebookStickyScrollContainer, this, this._list, (sizeDelta) => {
            if (this.isDisposed) {
                return;
            }
            if (this._dimension && this._isVisible) {
                if (sizeDelta > 0) { // delta > 0 ==> sticky is growing, cell list shrinking
                    this.layout(this._dimension);
                    this.setScrollTop(this.scrollTop + sizeDelta);
                }
                else if (sizeDelta < 0) { // delta < 0 ==> sticky is shrinking, cell list growing
                    this.setScrollTop(this.scrollTop + sizeDelta);
                    this.layout(this._dimension);
                }
            }
            this._onDidScroll.fire();
        }));
    }
    _updateOutputRenderers() {
        if (!this.viewModel || !this._webview) {
            return;
        }
        this._webview.updateOutputRenderers();
        this.viewModel.viewCells.forEach(cell => {
            cell.outputsViewModels.forEach(output => {
                if (output.pickedMimeType?.rendererId === RENDERER_NOT_AVAILABLE) {
                    output.resetRenderer();
                }
            });
        });
    }
    getDomNode() {
        return this._overlayContainer;
    }
    getOverflowContainerDomNode() {
        return this._overflowContainer;
    }
    getInnerWebview() {
        return this._webview?.webview;
    }
    setEditorProgressService(editorProgressService) {
        this.editorProgressService = editorProgressService;
    }
    setParentContextKeyService(parentContextKeyService) {
        this.scopedContextKeyService.updateParent(parentContextKeyService);
    }
    async setModel(textModel, viewState, perf, viewType) {
        if (this.viewModel === undefined || !this.viewModel.equal(textModel)) {
            const oldBottomToolbarDimensions = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
            this._detachModel();
            await this._attachModel(textModel, viewType ?? textModel.viewType, viewState, perf);
            const newBottomToolbarDimensions = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
            if (oldBottomToolbarDimensions.bottomToolbarGap !== newBottomToolbarDimensions.bottomToolbarGap
                || oldBottomToolbarDimensions.bottomToolbarHeight !== newBottomToolbarDimensions.bottomToolbarHeight) {
                this._styleElement?.remove();
                this._createLayoutStyles();
                this._webview?.updateOptions({
                    ...this.notebookOptions.computeWebviewOptions(),
                    fontFamily: this._generateFontFamily()
                });
            }
            this.telemetryService.publicLog2('notebook/editorOpened', {
                scheme: textModel.uri.scheme,
                ext: extname(textModel.uri),
                viewType: textModel.viewType,
                isRepl: this.isReplHistory
            });
        }
        else {
            this.restoreListViewState(viewState);
        }
        this._restoreSelectedKernel(viewState);
        // load preloads for matching kernel
        this._loadKernelPreloads();
        // clear state
        this._dndController?.clearGlobalDragState();
        this._localStore.add(this._list.onDidChangeFocus(() => {
            this.updateContextKeysOnFocusChange();
        }));
        this.updateContextKeysOnFocusChange();
        // render markdown top down on idle
        this._backgroundMarkdownRendering();
    }
    _backgroundMarkdownRendering() {
        if (this._backgroundMarkdownRenderRunning) {
            return;
        }
        this._backgroundMarkdownRenderRunning = true;
        DOM.runWhenWindowIdle(DOM.getWindow(this.getDomNode()), (deadline) => {
            this._backgroundMarkdownRenderingWithDeadline(deadline);
        });
    }
    _backgroundMarkdownRenderingWithDeadline(deadline) {
        const endTime = Date.now() + deadline.timeRemaining();
        const execute = () => {
            try {
                this._backgroundMarkdownRenderRunning = true;
                if (this._isDisposed) {
                    return;
                }
                if (!this.viewModel) {
                    return;
                }
                const firstMarkupCell = this.viewModel.viewCells.find(cell => cell.cellKind === CellKind.Markup && !this._webview?.markupPreviewMapping.has(cell.id) && !this.cellIsHidden(cell));
                if (!firstMarkupCell) {
                    return;
                }
                this.createMarkupPreview(firstMarkupCell);
            }
            finally {
                this._backgroundMarkdownRenderRunning = false;
            }
            if (Date.now() < endTime) {
                setTimeout0(execute);
            }
            else {
                this._backgroundMarkdownRendering();
            }
        };
        execute();
    }
    updateContextKeysOnFocusChange() {
        if (!this.viewModel) {
            return;
        }
        const focused = this._list.getFocusedElements()[0];
        if (focused) {
            if (!this._cellContextKeyManager) {
                this._cellContextKeyManager = this._localStore.add(this.instantiationService.createInstance(CellContextKeyManager, this, focused));
            }
            this._cellContextKeyManager.updateForElement(focused);
        }
    }
    async setOptions(options) {
        if (options?.isReadOnly !== undefined) {
            this._readOnly = options?.isReadOnly;
        }
        if (!this.viewModel) {
            return;
        }
        this.viewModel.updateOptions({ isReadOnly: this._readOnly });
        this.notebookOptions.updateOptions(this._readOnly);
        // reveal cell if editor options tell to do so
        const cellOptions = options?.cellOptions ?? this._parseIndexedCellOptions(options);
        if (cellOptions) {
            const cell = this.viewModel.viewCells.find(cell => cell.uri.toString() === cellOptions.resource.toString());
            if (cell) {
                this.focusElement(cell);
                const selection = cellOptions.options?.selection;
                if (selection) {
                    cell.updateEditState(CellEditState.Editing, 'setOptions');
                    cell.focusMode = CellFocusMode.Editor;
                    await this.revealRangeInCenterIfOutsideViewportAsync(cell, new Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber || selection.startLineNumber, selection.endColumn || selection.startColumn));
                }
                else {
                    this._list.revealCell(cell, options?.cellRevealType ?? 4 /* CellRevealType.CenterIfOutsideViewport */);
                }
                const editor = this._renderedEditors.get(cell);
                if (editor) {
                    if (cellOptions.options?.selection) {
                        const { selection } = cellOptions.options;
                        const editorSelection = new Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber || selection.startLineNumber, selection.endColumn || selection.startColumn);
                        editor.setSelection(editorSelection);
                        editor.revealPositionInCenterIfOutsideViewport({
                            lineNumber: selection.startLineNumber,
                            column: selection.startColumn
                        });
                        await this.revealRangeInCenterIfOutsideViewportAsync(cell, editorSelection);
                    }
                    if (!cellOptions.options?.preserveFocus) {
                        editor.focus();
                    }
                }
            }
        }
        // select cells if options tell to do so
        // todo@rebornix https://github.com/microsoft/vscode/issues/118108 support selections not just focus
        // todo@rebornix support multipe selections
        if (options?.cellSelections) {
            const focusCellIndex = options.cellSelections[0].start;
            const focusedCell = this.viewModel.cellAt(focusCellIndex);
            if (focusedCell) {
                this.viewModel.updateSelectionsState({
                    kind: SelectionStateType.Index,
                    focus: { start: focusCellIndex, end: focusCellIndex + 1 },
                    selections: options.cellSelections
                });
                this.revealInCenterIfOutsideViewport(focusedCell);
            }
        }
        this._updateForOptions();
        this._onDidChangeOptions.fire();
    }
    _parseIndexedCellOptions(options) {
        if (options?.indexedCellOptions) {
            // convert index based selections
            const cell = this.cellAt(options.indexedCellOptions.index);
            if (cell) {
                return {
                    resource: cell.uri,
                    options: {
                        selection: options.indexedCellOptions.selection,
                        preserveFocus: false
                    }
                };
            }
        }
        return undefined;
    }
    _detachModel() {
        this._localStore.clear();
        dispose(this._localCellStateListeners);
        this._list.detachViewModel();
        this.viewModel?.dispose();
        // avoid event
        this.viewModel = undefined;
        this._webview?.dispose();
        this._webview?.element.remove();
        this._webview = null;
        this._list.clear();
    }
    _updateForOptions() {
        if (!this.viewModel) {
            return;
        }
        this._editorEditable.set(!this.viewModel.options.isReadOnly);
        this._overflowContainer.classList.toggle('notebook-editor-editable', !this.viewModel.options.isReadOnly);
        this.getDomNode().classList.toggle('notebook-editor-editable', !this.viewModel.options.isReadOnly);
    }
    async _resolveWebview() {
        if (!this.textModel) {
            return null;
        }
        if (this._webviewResolvePromise) {
            return this._webviewResolvePromise;
        }
        if (!this._webview) {
            this._ensureWebview(this.getId(), this.textModel.viewType, this.textModel.uri);
        }
        this._webviewResolvePromise = (async () => {
            if (!this._webview) {
                throw new Error('Notebook output webview object is not created successfully.');
            }
            await this._webview.createWebview(this.creationOptions.codeWindow ?? mainWindow);
            if (!this._webview.webview) {
                throw new Error('Notebook output webview element was not created successfully.');
            }
            this._localStore.add(this._webview.webview.onDidBlur(() => {
                this._outputFocus.set(false);
                this._webviewFocused = false;
                this.updateEditorFocus();
                this.updateCellFocusMode();
            }));
            this._localStore.add(this._webview.webview.onDidFocus(() => {
                this._outputFocus.set(true);
                this.updateEditorFocus();
                this._webviewFocused = true;
            }));
            this._localStore.add(this._webview.onMessage(e => {
                this._onDidReceiveMessage.fire(e);
            }));
            return this._webview;
        })();
        return this._webviewResolvePromise;
    }
    _ensureWebview(id, viewType, resource) {
        if (this._webview) {
            return;
        }
        const that = this;
        this._webview = this.instantiationService.createInstance(BackLayerWebView, {
            get creationOptions() { return that.creationOptions; },
            setScrollTop(scrollTop) { that._list.scrollTop = scrollTop; },
            triggerScroll(event) { that._list.triggerScrollFromMouseWheelEvent(event); },
            getCellByInfo: that.getCellByInfo.bind(that),
            getCellById: that._getCellById.bind(that),
            toggleNotebookCellSelection: that._toggleNotebookCellSelection.bind(that),
            focusNotebookCell: that.focusNotebookCell.bind(that),
            focusNextNotebookCell: that.focusNextNotebookCell.bind(that),
            updateOutputHeight: that._updateOutputHeight.bind(that),
            scheduleOutputHeightAck: that._scheduleOutputHeightAck.bind(that),
            updateMarkupCellHeight: that._updateMarkupCellHeight.bind(that),
            setMarkupCellEditState: that._setMarkupCellEditState.bind(that),
            didStartDragMarkupCell: that._didStartDragMarkupCell.bind(that),
            didDragMarkupCell: that._didDragMarkupCell.bind(that),
            didDropMarkupCell: that._didDropMarkupCell.bind(that),
            didEndDragMarkupCell: that._didEndDragMarkupCell.bind(that),
            didResizeOutput: that._didResizeOutput.bind(that),
            updatePerformanceMetadata: that._updatePerformanceMetadata.bind(that),
            didFocusOutputInputChange: that._didFocusOutputInputChange.bind(that),
        }, id, viewType, resource, {
            ...this._notebookOptions.computeWebviewOptions(),
            fontFamily: this._generateFontFamily()
        }, this.notebookRendererMessaging.getScoped(this._uuid));
        this._webview.element.style.width = '100%';
        // attach the webview container to the DOM tree first
        this._list.attachWebview(this._webview.element);
    }
    async _attachModel(textModel, viewType, viewState, perf) {
        this._ensureWebview(this.getId(), textModel.viewType, textModel.uri);
        this.viewModel = this.instantiationService.createInstance(NotebookViewModel, viewType, textModel, this._viewContext, this.getLayoutInfo(), { isReadOnly: this._readOnly });
        this._viewContext.eventDispatcher.emit([new NotebookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo())]);
        this.notebookOptions.updateOptions(this._readOnly);
        this._updateForOptions();
        this._updateForNotebookConfiguration();
        // restore view states, including contributions
        {
            // restore view state
            this.viewModel.restoreEditorViewState(viewState);
            // contribution state restore
            const contributionsState = viewState?.contributionsState || {};
            for (const [id, contribution] of this._contributions) {
                if (typeof contribution.restoreViewState === 'function') {
                    contribution.restoreViewState(contributionsState[id]);
                }
            }
        }
        this._localStore.add(this.viewModel.onDidChangeViewCells(e => {
            this._onDidChangeViewCells.fire(e);
        }));
        this._localStore.add(this.viewModel.onDidChangeSelection(() => {
            this._onDidChangeSelection.fire();
            this.updateSelectedMarkdownPreviews();
        }));
        this._localStore.add(this._list.onWillScroll(e => {
            if (this._webview?.isResolved()) {
                this._webviewTransparentCover.style.transform = `translateY(${e.scrollTop})`;
            }
        }));
        let hasPendingChangeContentHeight = false;
        this._localStore.add(this._list.onDidChangeContentHeight(() => {
            if (hasPendingChangeContentHeight) {
                return;
            }
            hasPendingChangeContentHeight = true;
            this._localStore.add(DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), () => {
                hasPendingChangeContentHeight = false;
                this._updateScrollHeight();
            }, 100));
        }));
        this._localStore.add(this._list.onDidRemoveOutputs(outputs => {
            outputs.forEach(output => this.removeInset(output));
        }));
        this._localStore.add(this._list.onDidHideOutputs(outputs => {
            outputs.forEach(output => this.hideInset(output));
        }));
        this._localStore.add(this._list.onDidRemoveCellsFromView(cells => {
            const hiddenCells = [];
            const deletedCells = [];
            for (const cell of cells) {
                if (cell.cellKind === CellKind.Markup) {
                    const mdCell = cell;
                    if (this.viewModel?.viewCells.find(cell => cell.handle === mdCell.handle)) {
                        // Cell has been folded but is still in model
                        hiddenCells.push(mdCell);
                    }
                    else {
                        // Cell was deleted
                        deletedCells.push(mdCell);
                    }
                }
            }
            this.hideMarkupPreviews(hiddenCells);
            this.deleteMarkupPreviews(deletedCells);
        }));
        // init rendering
        await this._warmupWithMarkdownRenderer(this.viewModel, viewState, perf);
        perf?.mark('customMarkdownLoaded');
        // model attached
        this._localCellStateListeners = this.viewModel.viewCells.map(cell => this._bindCellListener(cell));
        this._lastCellWithEditorFocus = this.viewModel.viewCells.find(viewCell => this.getActiveCell() === viewCell && viewCell.focusMode === CellFocusMode.Editor) ?? null;
        this._localStore.add(this.viewModel.onDidChangeViewCells((e) => {
            if (this._isDisposed) {
                return;
            }
            // update cell listener
            [...e.splices].reverse().forEach(splice => {
                const [start, deleted, newCells] = splice;
                const deletedCells = this._localCellStateListeners.splice(start, deleted, ...newCells.map(cell => this._bindCellListener(cell)));
                dispose(deletedCells);
            });
            if (e.splices.some(s => s[2].some(cell => cell.cellKind === CellKind.Markup))) {
                this._backgroundMarkdownRendering();
            }
        }));
        if (this._dimension) {
            this._list.layout(this.getBodyHeight(this._dimension.height), this._dimension.width);
        }
        else {
            this._list.layout();
        }
        this._dndController?.clearGlobalDragState();
        // restore list state at last, it must be after list layout
        this.restoreListViewState(viewState);
    }
    _bindCellListener(cell) {
        const store = new DisposableStore();
        store.add(cell.onDidChangeLayout(e => {
            // e.totalHeight will be false it's not changed
            if (e.totalHeight || e.outerWidth) {
                this.layoutNotebookCell(cell, cell.layoutInfo.totalHeight, e.context);
            }
        }));
        if (cell.cellKind === CellKind.Code) {
            store.add(cell.onDidRemoveOutputs((outputs) => {
                outputs.forEach(output => this.removeInset(output));
            }));
        }
        store.add(cell.onDidChangeState(e => {
            if (e.inputCollapsedChanged && cell.isInputCollapsed && cell.cellKind === CellKind.Markup) {
                this.hideMarkupPreviews([cell]);
            }
            if (e.outputCollapsedChanged && cell.isOutputCollapsed && cell.cellKind === CellKind.Code) {
                cell.outputsViewModels.forEach(output => this.hideInset(output));
            }
            if (e.focusModeChanged) {
                this._validateCellFocusMode(cell);
            }
        }));
        store.add(cell.onCellDecorationsChanged(e => {
            e.added.forEach(options => {
                if (options.className) {
                    this.deltaCellContainerClassNames(cell.id, [options.className], [], cell.cellKind);
                }
                if (options.outputClassName) {
                    this.deltaCellContainerClassNames(cell.id, [options.outputClassName], [], cell.cellKind);
                }
            });
            e.removed.forEach(options => {
                if (options.className) {
                    this.deltaCellContainerClassNames(cell.id, [], [options.className], cell.cellKind);
                }
                if (options.outputClassName) {
                    this.deltaCellContainerClassNames(cell.id, [], [options.outputClassName], cell.cellKind);
                }
            });
        }));
        return store;
    }
    _validateCellFocusMode(cell) {
        if (cell.focusMode !== CellFocusMode.Editor) {
            return;
        }
        if (this._lastCellWithEditorFocus && this._lastCellWithEditorFocus !== cell) {
            this._lastCellWithEditorFocus.focusMode = CellFocusMode.Container;
        }
        this._lastCellWithEditorFocus = cell;
    }
    async _warmupWithMarkdownRenderer(viewModel, viewState, perf) {
        this.logService.debug('NotebookEditorWidget', 'warmup ' + this.viewModel?.uri.toString());
        await this._resolveWebview();
        perf?.mark('webviewCommLoaded');
        this.logService.debug('NotebookEditorWidget', 'warmup - webview resolved');
        // make sure that the webview is not visible otherwise users will see pre-rendered markdown cells in wrong position as the list view doesn't have a correct `top` offset yet
        this._webview.element.style.visibility = 'hidden';
        // warm up can take around 200ms to load markdown libraries, etc.
        await this._warmupViewportMarkdownCells(viewModel, viewState);
        this.logService.debug('NotebookEditorWidget', 'warmup - viewport warmed up');
        // todo@rebornix @mjbvz, is this too complicated?
        /* now the webview is ready, and requests to render markdown are fast enough
         * we can start rendering the list view
         * render
         *   - markdown cell -> request to webview to (10ms, basically just latency between UI and iframe)
         *   - code cell -> render in place
         */
        this._list.layout(0, 0);
        this._list.attachViewModel(viewModel);
        // now the list widget has a correct contentHeight/scrollHeight
        // setting scrollTop will work properly
        // after setting scroll top, the list view will update `top` of the scrollable element, e.g. `top: -584px`
        this._list.scrollTop = viewState?.scrollPosition?.top ?? 0;
        this._debug('finish initial viewport warmup and view state restore.');
        this._webview.element.style.visibility = 'visible';
        this.logService.debug('NotebookEditorWidget', 'warmup - list view model attached, set to visible');
        this._onDidAttachViewModel.fire();
    }
    async _warmupViewportMarkdownCells(viewModel, viewState) {
        if (viewState && viewState.cellTotalHeights) {
            const totalHeightCache = viewState.cellTotalHeights;
            const scrollTop = viewState.scrollPosition?.top ?? 0;
            const scrollBottom = scrollTop + Math.max(this._dimension?.height ?? 0, 1080);
            let offset = 0;
            const requests = [];
            for (let i = 0; i < viewModel.length; i++) {
                const cell = viewModel.cellAt(i);
                const cellHeight = totalHeightCache[i] ?? 0;
                if (offset + cellHeight < scrollTop) {
                    offset += cellHeight;
                    continue;
                }
                if (cell.cellKind === CellKind.Markup) {
                    requests.push([cell, offset]);
                }
                offset += cellHeight;
                if (offset > scrollBottom) {
                    break;
                }
            }
            await this._webview.initializeMarkup(requests.map(([model, offset]) => this.createMarkupCellInitialization(model, offset)));
        }
        else {
            const initRequests = viewModel.viewCells
                .filter(cell => cell.cellKind === CellKind.Markup)
                .slice(0, 5)
                .map(cell => this.createMarkupCellInitialization(cell, -10000));
            await this._webview.initializeMarkup(initRequests);
            // no cached view state so we are rendering the first viewport
            // after above async call, we already get init height for markdown cells, we can update their offset
            let offset = 0;
            const offsetUpdateRequests = [];
            const scrollBottom = Math.max(this._dimension?.height ?? 0, 1080);
            for (const cell of viewModel.viewCells) {
                if (cell.cellKind === CellKind.Markup) {
                    offsetUpdateRequests.push({ id: cell.id, top: offset });
                }
                offset += cell.getHeight(this.getLayoutInfo().fontInfo.lineHeight);
                if (offset > scrollBottom) {
                    break;
                }
            }
            this._webview?.updateScrollTops([], offsetUpdateRequests);
        }
    }
    createMarkupCellInitialization(model, offset) {
        return ({
            mime: model.mime,
            cellId: model.id,
            cellHandle: model.handle,
            content: model.getText(),
            offset: offset,
            visible: false,
            metadata: model.metadata,
        });
    }
    restoreListViewState(viewState) {
        if (!this.viewModel) {
            return;
        }
        if (viewState?.scrollPosition !== undefined) {
            this._list.scrollTop = viewState.scrollPosition.top;
            this._list.scrollLeft = viewState.scrollPosition.left;
        }
        else {
            this._list.scrollTop = 0;
            this._list.scrollLeft = 0;
        }
        const focusIdx = typeof viewState?.focus === 'number' ? viewState.focus : 0;
        if (focusIdx < this.viewModel.length) {
            const element = this.viewModel.cellAt(focusIdx);
            if (element) {
                this.viewModel?.updateSelectionsState({
                    kind: SelectionStateType.Handle,
                    primary: element.handle,
                    selections: [element.handle]
                });
            }
        }
        else if (this._list.length > 0) {
            this.viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }]
            });
        }
        if (viewState?.editorFocused) {
            const cell = this.viewModel.cellAt(focusIdx);
            if (cell) {
                cell.focusMode = CellFocusMode.Editor;
            }
        }
    }
    _restoreSelectedKernel(viewState) {
        if (viewState?.selectedKernelId && this.textModel) {
            const matching = this.notebookKernelService.getMatchingKernel(this.textModel);
            const kernel = matching.all.find(k => k.id === viewState.selectedKernelId);
            // Selected kernel may have already been picked prior to the view state loading
            // If so, don't overwrite it with the saved kernel.
            if (kernel && !matching.selected) {
                this.notebookKernelService.selectKernelForNotebook(kernel, this.textModel);
            }
        }
    }
    getEditorViewState() {
        const state = this.viewModel?.getEditorViewState();
        if (!state) {
            return {
                editingCells: {},
                cellLineNumberStates: {},
                editorViewStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            };
        }
        if (this._list) {
            state.scrollPosition = { left: this._list.scrollLeft, top: this._list.scrollTop };
            const cellHeights = {};
            for (let i = 0; i < this.viewModel.length; i++) {
                const elm = this.viewModel.cellAt(i);
                cellHeights[i] = elm.layoutInfo.totalHeight;
            }
            state.cellTotalHeights = cellHeights;
            if (this.viewModel) {
                const focusRange = this.viewModel.getFocus();
                const element = this.viewModel.cellAt(focusRange.start);
                if (element) {
                    const itemDOM = this._list.domElementOfElement(element);
                    const editorFocused = element.getEditState() === CellEditState.Editing && !!(itemDOM && itemDOM.ownerDocument.activeElement && itemDOM.contains(itemDOM.ownerDocument.activeElement));
                    state.editorFocused = editorFocused;
                    state.focus = focusRange.start;
                }
            }
        }
        // Save contribution view states
        const contributionsState = {};
        for (const [id, contribution] of this._contributions) {
            if (typeof contribution.saveViewState === 'function') {
                contributionsState[id] = contribution.saveViewState();
            }
        }
        state.contributionsState = contributionsState;
        if (this.textModel?.uri.scheme === Schemas.untitled) {
            state.selectedKernelId = this.activeKernel?.id;
        }
        return state;
    }
    _allowScrollBeyondLastLine() {
        return this._scrollBeyondLastLine && !this.isReplHistory;
    }
    getBodyHeight(dimensionHeight) {
        return Math.max(dimensionHeight - (this._notebookTopToolbar?.useGlobalToolbar ? /** Toolbar height */ 26 : 0), 0);
    }
    layout(dimension, shadowElement, position) {
        if (!shadowElement && this._shadowElementViewInfo === null) {
            this._dimension = dimension;
            this._position = position;
            return;
        }
        if (dimension.width <= 0 || dimension.height <= 0) {
            this.onWillHide();
            return;
        }
        const whenContainerStylesLoaded = this.layoutService.whenContainerStylesLoaded(DOM.getWindow(this.getDomNode()));
        if (whenContainerStylesLoaded) {
            // In floating windows, we need to ensure that the
            // container is ready for us to compute certain
            // layout related properties.
            whenContainerStylesLoaded.then(() => this.layoutNotebook(dimension, shadowElement, position));
        }
        else {
            this.layoutNotebook(dimension, shadowElement, position);
        }
    }
    layoutNotebook(dimension, shadowElement, position) {
        if (shadowElement) {
            this.updateShadowElement(shadowElement, dimension, position);
        }
        if (this._shadowElementViewInfo && this._shadowElementViewInfo.width <= 0 && this._shadowElementViewInfo.height <= 0) {
            this.onWillHide();
            return;
        }
        this._dimension = dimension;
        this._position = position;
        const newBodyHeight = this.getBodyHeight(dimension.height) - this.getLayoutInfo().stickyHeight;
        DOM.size(this._body, dimension.width, newBodyHeight);
        const newCellListHeight = newBodyHeight;
        if (this._list.getRenderHeight() < newCellListHeight) {
            // the new dimension is larger than the list viewport, update its additional height first, otherwise the list view will move down a bit (as the `scrollBottom` will move down)
            this._list.updateOptions({ paddingBottom: this._allowScrollBeyondLastLine() ? Math.max(0, (newCellListHeight - 50)) : 0, paddingTop: 0 });
            this._list.layout(newCellListHeight, dimension.width);
        }
        else {
            // the new dimension is smaller than the list viewport, if we update the additional height, the `scrollBottom` will move up, which moves the whole list view upwards a bit. So we run a layout first.
            this._list.layout(newCellListHeight, dimension.width);
            this._list.updateOptions({ paddingBottom: this._allowScrollBeyondLastLine() ? Math.max(0, (newCellListHeight - 50)) : 0, paddingTop: 0 });
        }
        this._overlayContainer.inert = false;
        this._overlayContainer.style.visibility = 'visible';
        this._overlayContainer.style.display = 'block';
        this._overlayContainer.style.position = 'absolute';
        this._overlayContainer.style.overflow = 'hidden';
        this.layoutContainerOverShadowElement(dimension, position);
        if (this._webviewTransparentCover) {
            this._webviewTransparentCover.style.height = `${dimension.height}px`;
            this._webviewTransparentCover.style.width = `${dimension.width}px`;
        }
        this._notebookTopToolbar.layout(this._dimension);
        this._notebookOverviewRuler.layout();
        this._viewContext?.eventDispatcher.emit([new NotebookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo())]);
    }
    updateShadowElement(shadowElement, dimension, position) {
        this._shadowElement = shadowElement;
        if (dimension && position) {
            this._shadowElementViewInfo = {
                height: dimension.height,
                width: dimension.width,
                top: position.top,
                left: position.left,
            };
        }
        else {
            // We have to recompute position and size ourselves (which is slow)
            const containerRect = shadowElement.getBoundingClientRect();
            this._shadowElementViewInfo = {
                height: containerRect.height,
                width: containerRect.width,
                top: containerRect.top,
                left: containerRect.left
            };
        }
    }
    layoutContainerOverShadowElement(dimension, position) {
        if (dimension && position) {
            this._overlayContainer.style.top = `${position.top}px`;
            this._overlayContainer.style.left = `${position.left}px`;
            this._overlayContainer.style.width = `${dimension.width}px`;
            this._overlayContainer.style.height = `${dimension.height}px`;
            return;
        }
        if (!this._shadowElementViewInfo) {
            return;
        }
        const elementContainerRect = this._overlayContainer.parentElement?.getBoundingClientRect();
        this._overlayContainer.style.top = `${this._shadowElementViewInfo.top - (elementContainerRect?.top || 0)}px`;
        this._overlayContainer.style.left = `${this._shadowElementViewInfo.left - (elementContainerRect?.left || 0)}px`;
        this._overlayContainer.style.width = `${dimension ? dimension.width : this._shadowElementViewInfo.width}px`;
        this._overlayContainer.style.height = `${dimension ? dimension.height : this._shadowElementViewInfo.height}px`;
    }
    //#endregion
    //#region Focus tracker
    focus() {
        this._isVisible = true;
        this._editorFocus.set(true);
        if (this._webviewFocused) {
            this._webview?.focusWebview();
        }
        else {
            if (this.viewModel) {
                const focusRange = this.viewModel.getFocus();
                const element = this.viewModel.cellAt(focusRange.start);
                // The notebook editor doesn't have focus yet
                if (!this.hasEditorFocus()) {
                    this.focusContainer();
                    // trigger editor to update as FocusTracker might not emit focus change event
                    this.updateEditorFocus();
                }
                if (element && element.focusMode === CellFocusMode.Editor) {
                    element.updateEditState(CellEditState.Editing, 'editorWidget.focus');
                    element.focusMode = CellFocusMode.Editor;
                    this.focusEditor(element);
                    return;
                }
            }
            this._list.domFocus();
        }
        if (this._currentProgress) {
            // The editor forces progress to hide when switching editors. So if progress should be visible, force it to show when the editor is focused.
            this.showProgress();
        }
    }
    onShow() {
        this._isVisible = true;
    }
    focusEditor(activeElement) {
        for (const [element, editor] of this._renderedEditors.entries()) {
            if (element === activeElement) {
                editor.focus();
                return;
            }
        }
    }
    focusContainer(clearSelection = false) {
        if (this._webviewFocused) {
            this._webview?.focusWebview();
        }
        else {
            this._list.focusContainer(clearSelection);
        }
    }
    selectOutputContent(cell) {
        this._webview?.selectOutputContents(cell);
    }
    selectInputContents(cell) {
        this._webview?.selectInputContents(cell);
    }
    onWillHide() {
        this._isVisible = false;
        this._editorFocus.set(false);
        this._overlayContainer.inert = true;
        this._overlayContainer.style.visibility = 'hidden';
        this._overlayContainer.style.left = '-50000px';
        this._notebookTopToolbarContainer.style.display = 'none';
        this.clearActiveCellWidgets();
    }
    clearActiveCellWidgets() {
        this._renderedEditors.forEach((editor, cell) => {
            if (this.getActiveCell() === cell && editor) {
                SuggestController.get(editor)?.cancelSuggestWidget();
                DropIntoEditorController.get(editor)?.clearWidgets();
                CopyPasteController.get(editor)?.clearWidgets();
            }
        });
        this._renderedEditors.forEach((editor, cell) => {
            const controller = InlineCompletionsController.get(editor);
            if (controller?.model.get()?.inlineEditState.get()) {
                editor.render(true);
            }
        });
    }
    editorHasDomFocus() {
        return DOM.isAncestorOfActiveElement(this.getDomNode());
    }
    updateEditorFocus() {
        // Note - focus going to the webview will fire 'blur', but the webview element will be
        // a descendent of the notebook editor root.
        this._focusTracker.refreshState();
        const focused = this.editorHasDomFocus();
        this._editorFocus.set(focused);
        this.viewModel?.setEditorFocus(focused);
    }
    updateCellFocusMode() {
        const activeCell = this.getActiveCell();
        if (activeCell?.focusMode === CellFocusMode.Output && !this._webviewFocused) {
            // output previously has focus, but now it's blurred.
            activeCell.focusMode = CellFocusMode.Container;
        }
    }
    hasEditorFocus() {
        // _editorFocus is driven by the FocusTracker, which is only guaranteed to _eventually_ fire blur.
        // If we need to know whether we have focus at this instant, we need to check the DOM manually.
        this.updateEditorFocus();
        return this.editorHasDomFocus();
    }
    hasWebviewFocus() {
        return this._webviewFocused;
    }
    hasOutputTextSelection() {
        if (!this.hasEditorFocus()) {
            return false;
        }
        const windowSelection = DOM.getWindow(this.getDomNode()).getSelection();
        if (windowSelection?.rangeCount !== 1) {
            return false;
        }
        const activeSelection = windowSelection.getRangeAt(0);
        if (activeSelection.startContainer === activeSelection.endContainer && activeSelection.endOffset - activeSelection.startOffset === 0) {
            return false;
        }
        let container = activeSelection.commonAncestorContainer;
        if (!this._body.contains(container)) {
            return false;
        }
        while (container
            &&
                container !== this._body) {
            if (container.classList && container.classList.contains('output')) {
                return true;
            }
            container = container.parentNode;
        }
        return false;
    }
    _didFocusOutputInputChange(hasFocus) {
        this._outputInputFocus.set(hasFocus);
    }
    //#endregion
    //#region Editor Features
    focusElement(cell) {
        this.viewModel?.updateSelectionsState({
            kind: SelectionStateType.Handle,
            primary: cell.handle,
            selections: [cell.handle]
        });
    }
    get scrollTop() {
        return this._list.scrollTop;
    }
    get scrollBottom() {
        return this._list.scrollTop + this._list.getRenderHeight();
    }
    getAbsoluteTopOfElement(cell) {
        return this._list.getCellViewScrollTop(cell);
    }
    getAbsoluteBottomOfElement(cell) {
        return this._list.getCellViewScrollBottom(cell);
    }
    getHeightOfElement(cell) {
        return this._list.elementHeight(cell);
    }
    scrollToBottom() {
        this._list.scrollToBottom();
    }
    setScrollTop(scrollTop) {
        this._list.scrollTop = scrollTop;
    }
    revealCellRangeInView(range) {
        return this._list.revealCells(range);
    }
    revealInView(cell) {
        return this._list.revealCell(cell, 1 /* CellRevealType.Default */);
    }
    revealInViewAtTop(cell) {
        this._list.revealCell(cell, 2 /* CellRevealType.Top */);
    }
    revealInCenter(cell) {
        this._list.revealCell(cell, 3 /* CellRevealType.Center */);
    }
    async revealInCenterIfOutsideViewport(cell) {
        await this._list.revealCell(cell, 4 /* CellRevealType.CenterIfOutsideViewport */);
    }
    async revealFirstLineIfOutsideViewport(cell) {
        await this._list.revealCell(cell, 6 /* CellRevealType.FirstLineIfOutsideViewport */);
    }
    async revealLineInViewAsync(cell, line) {
        return this._list.revealRangeInCell(cell, new Range(line, 1, line, 1), CellRevealRangeType.Default);
    }
    async revealLineInCenterAsync(cell, line) {
        return this._list.revealRangeInCell(cell, new Range(line, 1, line, 1), CellRevealRangeType.Center);
    }
    async revealLineInCenterIfOutsideViewportAsync(cell, line) {
        return this._list.revealRangeInCell(cell, new Range(line, 1, line, 1), CellRevealRangeType.CenterIfOutsideViewport);
    }
    async revealRangeInViewAsync(cell, range) {
        return this._list.revealRangeInCell(cell, range, CellRevealRangeType.Default);
    }
    async revealRangeInCenterAsync(cell, range) {
        return this._list.revealRangeInCell(cell, range, CellRevealRangeType.Center);
    }
    async revealRangeInCenterIfOutsideViewportAsync(cell, range) {
        return this._list.revealRangeInCell(cell, range, CellRevealRangeType.CenterIfOutsideViewport);
    }
    revealCellOffsetInCenter(cell, offset) {
        return this._list.revealCellOffsetInCenter(cell, offset);
    }
    revealOffsetInCenterIfOutsideViewport(offset) {
        return this._list.revealOffsetInCenterIfOutsideViewport(offset);
    }
    getViewIndexByModelIndex(index) {
        if (!this._listViewInfoAccessor) {
            return -1;
        }
        const cell = this.viewModel?.viewCells[index];
        if (!cell) {
            return -1;
        }
        return this._listViewInfoAccessor.getViewIndex(cell);
    }
    getViewHeight(cell) {
        if (!this._listViewInfoAccessor) {
            return -1;
        }
        return this._listViewInfoAccessor.getViewHeight(cell);
    }
    getCellRangeFromViewRange(startIndex, endIndex) {
        return this._listViewInfoAccessor.getCellRangeFromViewRange(startIndex, endIndex);
    }
    getCellsInRange(range) {
        return this._listViewInfoAccessor.getCellsInRange(range);
    }
    setCellEditorSelection(cell, range) {
        this._list.setCellEditorSelection(cell, range);
    }
    setHiddenAreas(_ranges) {
        return this._list.setHiddenAreas(_ranges, true);
    }
    getVisibleRangesPlusViewportAboveAndBelow() {
        return this._listViewInfoAccessor.getVisibleRangesPlusViewportAboveAndBelow();
    }
    //#endregion
    //#region Decorations
    deltaCellDecorations(oldDecorations, newDecorations) {
        const ret = this.viewModel?.deltaCellDecorations(oldDecorations, newDecorations) || [];
        this._onDidChangeDecorations.fire();
        return ret;
    }
    deltaCellContainerClassNames(cellId, added, removed, cellkind) {
        if (cellkind === CellKind.Markup) {
            this._webview?.deltaMarkupPreviewClassNames(cellId, added, removed);
        }
        else {
            this._webview?.deltaCellOutputContainerClassNames(cellId, added, removed);
        }
    }
    changeModelDecorations(callback) {
        return this.viewModel?.changeModelDecorations(callback) || null;
    }
    //#endregion
    //#region View Zones
    changeViewZones(callback) {
        this._list.changeViewZones(callback);
        this._onDidChangeLayout.fire();
    }
    getViewZoneLayoutInfo(id) {
        return this._list.getViewZoneLayoutInfo(id);
    }
    //#endregion
    //#region Overlay
    changeCellOverlays(callback) {
        this._list.changeCellOverlays(callback);
    }
    //#endregion
    //#region Kernel/Execution
    async _loadKernelPreloads() {
        if (!this.hasModel()) {
            return;
        }
        const { selected } = this.notebookKernelService.getMatchingKernel(this.textModel);
        if (!this._webview?.isResolved()) {
            await this._resolveWebview();
        }
        this._webview?.updateKernelPreloads(selected);
    }
    get activeKernel() {
        return this.textModel && this.notebookKernelService.getSelectedOrSuggestedKernel(this.textModel);
    }
    async cancelNotebookCells(cells) {
        if (!this.viewModel || !this.hasModel()) {
            return;
        }
        if (!cells) {
            cells = this.viewModel.viewCells;
        }
        return this.notebookExecutionService.cancelNotebookCellHandles(this.textModel, Array.from(cells).map(cell => cell.handle));
    }
    async executeNotebookCells(cells) {
        if (!this.viewModel || !this.hasModel()) {
            this.logService.info('notebookEditorWidget', 'No NotebookViewModel, cannot execute cells');
            return;
        }
        if (!cells) {
            cells = this.viewModel.viewCells;
        }
        return this.notebookExecutionService.executeNotebookCells(this.textModel, Array.from(cells).map(c => c.model), this.scopedContextKeyService);
    }
    //#endregion
    async layoutNotebookCell(cell, height, context) {
        return this._cellLayoutManager?.layoutNotebookCell(cell, height);
    }
    getActiveCell() {
        const elements = this._list.getFocusedElements();
        if (elements && elements.length) {
            return elements[0];
        }
        return undefined;
    }
    _toggleNotebookCellSelection(selectedCell, selectFromPrevious) {
        const currentSelections = this._list.getSelectedElements();
        const isSelected = currentSelections.includes(selectedCell);
        const previousSelection = selectFromPrevious ? currentSelections[currentSelections.length - 1] ?? selectedCell : selectedCell;
        const selectedIndex = this._list.getViewIndex(selectedCell);
        const previousIndex = this._list.getViewIndex(previousSelection);
        const cellsInSelectionRange = this.getCellsInViewRange(selectedIndex, previousIndex);
        if (isSelected) {
            // Deselect
            this._list.selectElements(currentSelections.filter(current => !cellsInSelectionRange.includes(current)));
        }
        else {
            // Add to selection
            this.focusElement(selectedCell);
            this._list.selectElements([...currentSelections.filter(current => !cellsInSelectionRange.includes(current)), ...cellsInSelectionRange]);
        }
    }
    getCellsInViewRange(fromInclusive, toInclusive) {
        const selectedCellsInRange = [];
        for (let index = 0; index < this._list.length; ++index) {
            const cell = this._list.element(index);
            if (cell) {
                if ((index >= fromInclusive && index <= toInclusive) || (index >= toInclusive && index <= fromInclusive)) {
                    selectedCellsInRange.push(cell);
                }
            }
        }
        return selectedCellsInRange;
    }
    async focusNotebookCell(cell, focusItem, options) {
        if (this._isDisposed) {
            return;
        }
        cell.focusedOutputId = undefined;
        if (focusItem === 'editor') {
            cell.isInputCollapsed = false;
            this.focusElement(cell);
            this._list.focusView();
            cell.updateEditState(CellEditState.Editing, 'focusNotebookCell');
            cell.focusMode = CellFocusMode.Editor;
            if (!options?.skipReveal) {
                if (typeof options?.focusEditorLine === 'number') {
                    this._cursorNavMode.set(true);
                    await this.revealLineInViewAsync(cell, options.focusEditorLine);
                    const editor = this._renderedEditors.get(cell);
                    const focusEditorLine = options.focusEditorLine;
                    editor?.setSelection({
                        startLineNumber: focusEditorLine,
                        startColumn: 1,
                        endLineNumber: focusEditorLine,
                        endColumn: 1
                    });
                }
                else {
                    const selectionsStartPosition = cell.getSelectionsStartPosition();
                    if (selectionsStartPosition?.length) {
                        const firstSelectionPosition = selectionsStartPosition[0];
                        await this.revealRangeInViewAsync(cell, Range.fromPositions(firstSelectionPosition, firstSelectionPosition));
                    }
                    else {
                        await this.revealInView(cell);
                    }
                }
            }
        }
        else if (focusItem === 'output') {
            this.focusElement(cell);
            if (!this.hasEditorFocus()) {
                this._list.focusView();
            }
            if (!this._webview) {
                return;
            }
            const firstOutputId = cell.outputsViewModels.find(o => o.model.alternativeOutputId)?.model.alternativeOutputId;
            const focusElementId = options?.outputId ?? firstOutputId ?? cell.id;
            this._webview.focusOutput(focusElementId, options?.altOutputId, options?.outputWebviewFocused || this._webviewFocused);
            cell.updateEditState(CellEditState.Preview, 'focusNotebookCell');
            cell.focusMode = CellFocusMode.Output;
            cell.focusedOutputId = options?.outputId;
            this._outputFocus.set(true);
            if (!options?.skipReveal) {
                this.revealInCenterIfOutsideViewport(cell);
            }
        }
        else {
            // focus container
            const itemDOM = this._list.domElementOfElement(cell);
            if (itemDOM && itemDOM.ownerDocument.activeElement && itemDOM.contains(itemDOM.ownerDocument.activeElement)) {
                itemDOM.ownerDocument.activeElement.blur();
            }
            this._webview?.blurOutput();
            cell.updateEditState(CellEditState.Preview, 'focusNotebookCell');
            cell.focusMode = CellFocusMode.Container;
            this.focusElement(cell);
            if (!options?.skipReveal) {
                if (typeof options?.focusEditorLine === 'number') {
                    this._cursorNavMode.set(true);
                    await this.revealInView(cell);
                }
                else if (options?.revealBehavior === ScrollToRevealBehavior.firstLine) {
                    await this.revealFirstLineIfOutsideViewport(cell);
                }
                else if (options?.revealBehavior === ScrollToRevealBehavior.fullCell) {
                    await this.revealInView(cell);
                }
                else {
                    await this.revealInCenterIfOutsideViewport(cell);
                }
            }
            this._list.focusView();
            this.updateEditorFocus();
        }
    }
    async focusNextNotebookCell(cell, focusItem) {
        const idx = this.viewModel?.getCellIndex(cell);
        if (typeof idx !== 'number') {
            return;
        }
        const newCell = this.viewModel?.cellAt(idx + 1);
        if (!newCell) {
            return;
        }
        await this.focusNotebookCell(newCell, focusItem);
    }
    //#endregion
    //#region Find
    async _warmupCell(viewCell) {
        if (viewCell.isOutputCollapsed) {
            return;
        }
        const outputs = viewCell.outputsViewModels;
        for (const output of outputs.slice(0, outputDisplayLimit)) {
            const [mimeTypes, pick] = output.resolveMimeTypes(this.textModel, undefined);
            if (!mimeTypes.find(mimeType => mimeType.isTrusted) || mimeTypes.length === 0) {
                continue;
            }
            const pickedMimeTypeRenderer = mimeTypes[pick];
            if (!pickedMimeTypeRenderer) {
                return;
            }
            const renderer = this._notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
            if (!renderer) {
                return;
            }
            const result = { type: 1 /* RenderOutputType.Extension */, renderer, source: output, mimeType: pickedMimeTypeRenderer.mimeType };
            const inset = this._webview?.insetMapping.get(result.source);
            if (!inset || !inset.initialized) {
                const p = new Promise(resolve => {
                    this._register(Event.any(this.onDidRenderOutput, this.onDidRemoveOutput)(e => {
                        if (e.model === result.source.model) {
                            resolve();
                        }
                    }));
                });
                this.createOutput(viewCell, result, 0, false);
                await p;
            }
            else {
                // request to update its visibility
                this.createOutput(viewCell, result, 0, false);
            }
            return;
        }
    }
    async _warmupAll(includeOutput) {
        if (!this.hasModel() || !this.viewModel) {
            return;
        }
        const cells = this.viewModel.viewCells;
        const requests = [];
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].cellKind === CellKind.Markup && !this._webview.markupPreviewMapping.has(cells[i].id)) {
                requests.push(this.createMarkupPreview(cells[i]));
            }
        }
        if (includeOutput && this._list) {
            for (let i = 0; i < this._list.length; i++) {
                const cell = this._list.element(i);
                if (cell?.cellKind === CellKind.Code) {
                    requests.push(this._warmupCell(cell));
                }
            }
        }
        return Promise.all(requests);
    }
    async _warmupSelection(includeOutput, selectedCellRanges) {
        if (!this.hasModel() || !this.viewModel) {
            return;
        }
        const cells = this.viewModel.viewCells;
        const requests = [];
        for (const range of selectedCellRanges) {
            for (let i = range.start; i < range.end; i++) {
                if (cells[i].cellKind === CellKind.Markup && !this._webview.markupPreviewMapping.has(cells[i].id)) {
                    requests.push(this.createMarkupPreview(cells[i]));
                }
            }
        }
        if (includeOutput && this._list) {
            for (const range of selectedCellRanges) {
                for (let i = range.start; i < range.end; i++) {
                    const cell = this._list.element(i);
                    if (cell?.cellKind === CellKind.Code) {
                        requests.push(this._warmupCell(cell));
                    }
                }
            }
        }
        return Promise.all(requests);
    }
    async find(query, options, token, skipWarmup = false, shouldGetSearchPreviewInfo = false, ownerID) {
        if (!this._notebookViewModel) {
            return [];
        }
        if (!ownerID) {
            ownerID = this.getId();
        }
        const findMatches = this._notebookViewModel.find(query, options).filter(match => match.length > 0);
        if ((!options.includeMarkupPreview && !options.includeOutput) || options.findScope?.findScopeType === NotebookFindScopeType.Text) {
            this._webview?.findStop(ownerID);
            return findMatches;
        }
        // search in webview enabled
        const matchMap = {};
        findMatches.forEach(match => {
            matchMap[match.cell.id] = match;
        });
        if (this._webview) {
            // request all or some outputs to be rendered
            // measure perf
            const start = Date.now();
            if (options.findScope && options.findScope.findScopeType === NotebookFindScopeType.Cells && options.findScope.selectedCellRanges) {
                await this._warmupSelection(!!options.includeOutput, options.findScope.selectedCellRanges);
            }
            else {
                await this._warmupAll(!!options.includeOutput);
            }
            const end = Date.now();
            this.logService.debug('Find', `Warmup time: ${end - start}ms`);
            if (token.isCancellationRequested) {
                return [];
            }
            let findIds = [];
            if (options.findScope && options.findScope.findScopeType === NotebookFindScopeType.Cells && options.findScope.selectedCellRanges) {
                const selectedIndexes = cellRangesToIndexes(options.findScope.selectedCellRanges);
                findIds = selectedIndexes.map(index => this._notebookViewModel?.viewCells[index].id ?? '');
            }
            const webviewMatches = await this._webview.find(query, { caseSensitive: options.caseSensitive, wholeWord: options.wholeWord, includeMarkup: !!options.includeMarkupPreview, includeOutput: !!options.includeOutput, shouldGetSearchPreviewInfo, ownerID, findIds: findIds });
            if (token.isCancellationRequested) {
                return [];
            }
            // attach webview matches to model find matches
            webviewMatches.forEach(match => {
                const cell = this._notebookViewModel.viewCells.find(cell => cell.id === match.cellId);
                if (!cell) {
                    return;
                }
                if (match.type === 'preview') {
                    // markup preview
                    if (cell.getEditState() === CellEditState.Preview && !options.includeMarkupPreview) {
                        return;
                    }
                    if (cell.getEditState() === CellEditState.Editing && options.includeMarkupInput) {
                        return;
                    }
                }
                else {
                    if (!options.includeOutput) {
                        // skip outputs if not included
                        return;
                    }
                }
                const exisitingMatch = matchMap[match.cellId];
                if (exisitingMatch) {
                    exisitingMatch.webviewMatches.push(match);
                }
                else {
                    matchMap[match.cellId] = new CellFindMatchModel(this._notebookViewModel.viewCells.find(cell => cell.id === match.cellId), this._notebookViewModel.viewCells.findIndex(cell => cell.id === match.cellId), [], [match]);
                }
            });
        }
        const ret = [];
        this._notebookViewModel.viewCells.forEach((cell, index) => {
            if (matchMap[cell.id]) {
                ret.push(new CellFindMatchModel(cell, index, matchMap[cell.id].contentMatches, matchMap[cell.id].webviewMatches));
            }
        });
        return ret;
    }
    async findHighlightCurrent(matchIndex, ownerID) {
        if (!this._webview) {
            return 0;
        }
        return this._webview?.findHighlightCurrent(matchIndex, ownerID ?? this.getId());
    }
    async findUnHighlightCurrent(matchIndex, ownerID) {
        if (!this._webview) {
            return;
        }
        return this._webview?.findUnHighlightCurrent(matchIndex, ownerID ?? this.getId());
    }
    findStop(ownerID) {
        this._webview?.findStop(ownerID ?? this.getId());
    }
    //#endregion
    //#region MISC
    getLayoutInfo() {
        if (!this._list) {
            throw new Error('Editor is not initalized successfully');
        }
        if (!this._fontInfo) {
            this._generateFontInfo();
        }
        let listViewOffset = 0;
        if (this._dimension) {
            listViewOffset = (this._notebookTopToolbar?.useGlobalToolbar ? /** Toolbar height */ 26 : 0) + (this._notebookStickyScroll?.getCurrentStickyHeight() ?? 0);
        }
        return {
            width: this._dimension?.width ?? 0,
            height: this._dimension?.height ?? 0,
            scrollHeight: this._list?.getScrollHeight() ?? 0,
            fontInfo: this._fontInfo,
            stickyHeight: this._notebookStickyScroll?.getCurrentStickyHeight() ?? 0,
            listViewOffsetTop: listViewOffset
        };
    }
    async createMarkupPreview(cell) {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        if (!this._webview || !this._list.webviewElement) {
            return;
        }
        if (!this.viewModel || !this._list.viewModel) {
            return;
        }
        if (this.viewModel.getCellIndex(cell) === -1) {
            return;
        }
        if (this.cellIsHidden(cell)) {
            return;
        }
        const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
        const top = !!webviewTop ? (0 - webviewTop) : 0;
        const cellTop = this._list.getCellViewScrollTop(cell);
        await this._webview.showMarkupPreview({
            mime: cell.mime,
            cellHandle: cell.handle,
            cellId: cell.id,
            content: cell.getText(),
            offset: cellTop + top,
            visible: true,
            metadata: cell.metadata,
        });
    }
    cellIsHidden(cell) {
        const modelIndex = this.viewModel.getCellIndex(cell);
        const foldedRanges = this.viewModel.getHiddenRanges();
        return foldedRanges.some(range => modelIndex >= range.start && modelIndex <= range.end);
    }
    async unhideMarkupPreviews(cells) {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        await this._webview?.unhideMarkupPreviews(cells.map(cell => cell.id));
    }
    async hideMarkupPreviews(cells) {
        if (!this._webview || !cells.length) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        await this._webview?.hideMarkupPreviews(cells.map(cell => cell.id));
    }
    async deleteMarkupPreviews(cells) {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        await this._webview?.deleteMarkupPreviews(cells.map(cell => cell.id));
    }
    async updateSelectedMarkdownPreviews() {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        const selectedCells = this.getSelectionViewModels().map(cell => cell.id);
        // Only show selection when there is more than 1 cell selected
        await this._webview?.updateMarkupPreviewSelections(selectedCells.length > 1 ? selectedCells : []);
    }
    async createOutput(cell, output, offset, createWhenIdle) {
        this._insetModifyQueueByOutputId.queue(output.source.model.outputId, async () => {
            if (this._isDisposed || !this._webview) {
                return;
            }
            if (!this._webview.isResolved()) {
                await this._resolveWebview();
            }
            if (!this._webview) {
                return;
            }
            if (!this._list.webviewElement) {
                return;
            }
            if (output.type === 1 /* RenderOutputType.Extension */) {
                this.notebookRendererMessaging.prepare(output.renderer.id);
            }
            const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
            const top = !!webviewTop ? (0 - webviewTop) : 0;
            const cellTop = this._list.getCellViewScrollTop(cell) + top;
            const existingOutput = this._webview.insetMapping.get(output.source);
            if (!existingOutput
                || (!existingOutput.renderer && output.type === 1 /* RenderOutputType.Extension */)) {
                if (createWhenIdle) {
                    this._webview.requestCreateOutputWhenWebviewIdle({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri, executionId: cell.internalMetadata.executionId }, output, cellTop, offset);
                }
                else {
                    this._webview.createOutput({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri, executionId: cell.internalMetadata.executionId }, output, cellTop, offset);
                }
            }
            else if (existingOutput.renderer
                && output.type === 1 /* RenderOutputType.Extension */
                && existingOutput.renderer.id !== output.renderer.id) {
                // switch mimetype
                this._webview.removeInsets([output.source]);
                this._webview.createOutput({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri }, output, cellTop, offset);
            }
            else if (existingOutput.versionId !== output.source.model.versionId) {
                this._webview.updateOutput({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri, executionId: cell.internalMetadata.executionId }, output, cellTop, offset);
            }
            else {
                const outputIndex = cell.outputsViewModels.indexOf(output.source);
                const outputOffset = cell.getOutputOffset(outputIndex);
                this._webview.updateScrollTops([{
                        cell,
                        output: output.source,
                        cellTop,
                        outputOffset,
                        forceDisplay: !cell.isOutputCollapsed,
                    }], []);
            }
        });
    }
    async updateOutput(cell, output, offset) {
        this._insetModifyQueueByOutputId.queue(output.source.model.outputId, async () => {
            if (this._isDisposed || !this._webview || cell.isOutputCollapsed) {
                return;
            }
            if (!this._webview.isResolved()) {
                await this._resolveWebview();
            }
            if (!this._webview || !this._list.webviewElement) {
                return;
            }
            if (!this._webview.insetMapping.has(output.source)) {
                return this.createOutput(cell, output, offset, false);
            }
            if (output.type === 1 /* RenderOutputType.Extension */) {
                this.notebookRendererMessaging.prepare(output.renderer.id);
            }
            const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
            const top = !!webviewTop ? (0 - webviewTop) : 0;
            const cellTop = this._list.getCellViewScrollTop(cell) + top;
            this._webview.updateOutput({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri }, output, cellTop, offset);
        });
    }
    async copyOutputImage(cellOutput) {
        this._webview?.copyImage(cellOutput);
    }
    removeInset(output) {
        this._insetModifyQueueByOutputId.queue(output.model.outputId, async () => {
            if (this._isDisposed || !this._webview) {
                return;
            }
            if (this._webview?.isResolved()) {
                this._webview.removeInsets([output]);
            }
            this._onDidRemoveOutput.fire(output);
        });
    }
    hideInset(output) {
        this._insetModifyQueueByOutputId.queue(output.model.outputId, async () => {
            if (this._isDisposed || !this._webview) {
                return;
            }
            if (this._webview?.isResolved()) {
                this._webview.hideInset(output);
            }
        });
    }
    //#region --- webview IPC ----
    postMessage(message) {
        if (this._webview?.isResolved()) {
            this._webview.postKernelMessage(message);
        }
    }
    //#endregion
    addClassName(className) {
        this._overlayContainer.classList.add(className);
    }
    removeClassName(className) {
        this._overlayContainer.classList.remove(className);
    }
    cellAt(index) {
        return this.viewModel?.cellAt(index);
    }
    getCellByInfo(cellInfo) {
        const { cellHandle } = cellInfo;
        return this.viewModel?.viewCells.find(vc => vc.handle === cellHandle);
    }
    getCellByHandle(handle) {
        return this.viewModel?.getCellByHandle(handle);
    }
    getCellIndex(cell) {
        return this.viewModel?.getCellIndexByHandle(cell.handle);
    }
    getNextVisibleCellIndex(index) {
        return this.viewModel?.getNextVisibleCellIndex(index);
    }
    getPreviousVisibleCellIndex(index) {
        return this.viewModel?.getPreviousVisibleCellIndex(index);
    }
    _updateScrollHeight() {
        if (this._isDisposed || !this._webview?.isResolved()) {
            return;
        }
        if (!this._list.webviewElement) {
            return;
        }
        const scrollHeight = this._list.scrollHeight;
        this._webview.element.style.height = `${scrollHeight + NOTEBOOK_WEBVIEW_BOUNDARY * 2}px`;
        const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
        const top = !!webviewTop ? (0 - webviewTop) : 0;
        const updateItems = [];
        const removedItems = [];
        this._webview?.insetMapping.forEach((value, key) => {
            const cell = this.viewModel?.getCellByHandle(value.cellInfo.cellHandle);
            if (!cell || !(cell instanceof CodeCellViewModel)) {
                return;
            }
            this.viewModel?.viewCells.find(cell => cell.handle === value.cellInfo.cellHandle);
            const viewIndex = this._list.getViewIndex(cell);
            if (viewIndex === undefined) {
                return;
            }
            if (cell.outputsViewModels.indexOf(key) < 0) {
                // output is already gone
                removedItems.push(key);
            }
            const cellTop = this._list.getCellViewScrollTop(cell);
            const outputIndex = cell.outputsViewModels.indexOf(key);
            const outputOffset = cell.getOutputOffset(outputIndex);
            updateItems.push({
                cell,
                output: key,
                cellTop: cellTop + top,
                outputOffset,
                forceDisplay: false,
            });
        });
        this._webview.removeInsets(removedItems);
        const markdownUpdateItems = [];
        for (const cellId of this._webview.markupPreviewMapping.keys()) {
            const cell = this.viewModel?.viewCells.find(cell => cell.id === cellId);
            if (cell) {
                const cellTop = this._list.getCellViewScrollTop(cell);
                // markdownUpdateItems.push({ id: cellId, top: cellTop });
                markdownUpdateItems.push({ id: cellId, top: cellTop + top });
            }
        }
        if (markdownUpdateItems.length || updateItems.length) {
            this._debug('_list.onDidChangeContentHeight/markdown', markdownUpdateItems);
            this._webview?.updateScrollTops(updateItems, markdownUpdateItems);
        }
    }
    //#endregion
    //#region BacklayerWebview delegate
    _updateOutputHeight(cellInfo, output, outputHeight, isInit, source) {
        const cell = this.viewModel?.viewCells.find(vc => vc.handle === cellInfo.cellHandle);
        if (cell && cell instanceof CodeCellViewModel) {
            const outputIndex = cell.outputsViewModels.indexOf(output);
            if (outputIndex > -1) {
                this._debug('update cell output', cell.handle, outputHeight);
                cell.updateOutputHeight(outputIndex, outputHeight, source);
                this.layoutNotebookCell(cell, cell.layoutInfo.totalHeight);
                if (isInit) {
                    this._onDidRenderOutput.fire(output);
                }
            }
            else {
                this._debug('tried to update cell output that does not exist');
            }
        }
    }
    _scheduleOutputHeightAck(cellInfo, outputId, height) {
        const wasEmpty = this._pendingOutputHeightAcks.size === 0;
        this._pendingOutputHeightAcks.set(outputId, { cellId: cellInfo.cellId, outputId, height });
        if (wasEmpty) {
            DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), () => {
                this._debug('ack height');
                this._updateScrollHeight();
                this._webview?.ackHeight([...this._pendingOutputHeightAcks.values()]);
                this._pendingOutputHeightAcks.clear();
            }, -1); // -1 priority because this depends on calls to layoutNotebookCell, and that may be called multiple times before this runs
        }
    }
    _getCellById(cellId) {
        return this.viewModel?.viewCells.find(vc => vc.id === cellId);
    }
    _updateMarkupCellHeight(cellId, height, isInit) {
        const cell = this._getCellById(cellId);
        if (cell && cell instanceof MarkupCellViewModel) {
            const { bottomToolbarGap } = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
            this._debug('updateMarkdownCellHeight', cell.handle, height + bottomToolbarGap, isInit);
            cell.renderedMarkdownHeight = height;
        }
    }
    _setMarkupCellEditState(cellId, editState) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            this.revealInView(cell);
            cell.updateEditState(editState, 'setMarkdownCellEditState');
        }
    }
    _didStartDragMarkupCell(cellId, event) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            const webviewOffset = this._list.webviewElement ? -parseInt(this._list.webviewElement.domNode.style.top, 10) : 0;
            this._dndController?.startExplicitDrag(cell, event.dragOffsetY - webviewOffset);
        }
    }
    _didDragMarkupCell(cellId, event) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            const webviewOffset = this._list.webviewElement ? -parseInt(this._list.webviewElement.domNode.style.top, 10) : 0;
            this._dndController?.explicitDrag(cell, event.dragOffsetY - webviewOffset);
        }
    }
    _didDropMarkupCell(cellId, event) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            const webviewOffset = this._list.webviewElement ? -parseInt(this._list.webviewElement.domNode.style.top, 10) : 0;
            event.dragOffsetY -= webviewOffset;
            this._dndController?.explicitDrop(cell, event);
        }
    }
    _didEndDragMarkupCell(cellId) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            this._dndController?.endExplicitDrag(cell);
        }
    }
    _didResizeOutput(cellId) {
        const cell = this._getCellById(cellId);
        if (cell) {
            this._onDidResizeOutputEmitter.fire(cell);
        }
    }
    _updatePerformanceMetadata(cellId, executionId, duration, rendererId) {
        if (!this.hasModel()) {
            return;
        }
        const cell = this._getCellById(cellId);
        const cellIndex = !cell ? undefined : this.getCellIndex(cell);
        if (cell?.internalMetadata.executionId === executionId && cellIndex !== undefined) {
            const renderDurationMap = cell.internalMetadata.renderDuration || {};
            renderDurationMap[rendererId] = (renderDurationMap[rendererId] ?? 0) + duration;
            this.textModel.applyEdits([
                {
                    editType: 9 /* CellEditType.PartialInternalMetadata */,
                    index: cellIndex,
                    internalMetadata: {
                        executionId: executionId,
                        renderDuration: renderDurationMap
                    }
                }
            ], true, undefined, () => undefined, undefined, false);
        }
    }
    //#endregion
    //#region Editor Contributions
    getContribution(id) {
        return (this._contributions.get(id) || null);
    }
    //#endregion
    dispose() {
        this._isDisposed = true;
        // dispose webview first
        this._webview?.dispose();
        this._webview = null;
        this.notebookEditorService.removeNotebookEditor(this);
        dispose(this._contributions.values());
        this._contributions.clear();
        this._localStore.clear();
        dispose(this._localCellStateListeners);
        this._list.dispose();
        this._cellLayoutManager?.dispose();
        this._listTopCellToolbar?.dispose();
        this._overlayContainer.remove();
        this.viewModel?.dispose();
        this._renderedEditors.clear();
        this._baseCellEditorOptions.forEach(v => v.dispose());
        this._baseCellEditorOptions.clear();
        this._notebookOverviewRulerContainer.remove();
        super.dispose();
        // unref
        this._webview = null;
        this._webviewResolvePromise = null;
        this._webviewTransparentCover = null;
        this._dndController = null;
        this._listTopCellToolbar = null;
        this._notebookViewModel = undefined;
        this._cellContextKeyManager = null;
        this._notebookTopToolbar = null;
        this._list = null;
        this._listViewInfoAccessor = null;
        this._listDelegate = null;
    }
    toJSON() {
        return {
            notebookUri: this.viewModel?.uri,
        };
    }
};
NotebookEditorWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IEditorGroupsService),
    __param(4, INotebookRendererMessagingService),
    __param(5, INotebookEditorService),
    __param(6, INotebookKernelService),
    __param(7, INotebookService),
    __param(8, IConfigurationService),
    __param(9, IContextKeyService),
    __param(10, ILayoutService),
    __param(11, IContextMenuService),
    __param(12, ITelemetryService),
    __param(13, INotebookExecutionService),
    __param(14, IEditorProgressService),
    __param(15, INotebookLoggingService)
], NotebookEditorWidget);
export { NotebookEditorWidget };
registerZIndex(ZIndex.Base, 5, 'notebook-progress-bar');
registerZIndex(ZIndex.Base, 10, 'notebook-list-insertion-indicator');
registerZIndex(ZIndex.Base, 20, 'notebook-cell-editor-outline');
registerZIndex(ZIndex.Base, 25, 'notebook-scrollbar');
registerZIndex(ZIndex.Base, 26, 'notebook-cell-status');
registerZIndex(ZIndex.Base, 26, 'notebook-folding-indicator');
registerZIndex(ZIndex.Base, 27, 'notebook-output');
registerZIndex(ZIndex.Base, 28, 'notebook-cell-bottom-toolbar-container');
registerZIndex(ZIndex.Base, 29, 'notebook-run-button-container');
registerZIndex(ZIndex.Base, 29, 'notebook-input-collapse-condicon');
registerZIndex(ZIndex.Base, 30, 'notebook-cell-output-toolbar');
registerZIndex(ZIndex.Sash, 1, 'notebook-cell-expand-part-button');
registerZIndex(ZIndex.Sash, 2, 'notebook-cell-toolbar');
registerZIndex(ZIndex.Sash, 3, 'notebook-cell-toolbar-dropdown-active');
export const notebookCellBorder = registerColor('notebook.cellBorderColor', {
    dark: transparent(listInactiveSelectionBackground, 1),
    light: transparent(listInactiveSelectionBackground, 1),
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER
}, nls.localize('notebook.cellBorderColor', "The border color for notebook cells."));
export const focusedEditorBorderColor = registerColor('notebook.focusedEditorBorder', focusBorder, nls.localize('notebook.focusedEditorBorder', "The color of the notebook cell editor border."));
export const cellStatusIconSuccess = registerColor('notebookStatusSuccessIcon.foreground', debugIconStartForeground, nls.localize('notebookStatusSuccessIcon.foreground', "The error icon color of notebook cells in the cell status bar."));
export const runningCellRulerDecorationColor = registerColor('notebookEditorOverviewRuler.runningCellForeground', debugIconStartForeground, nls.localize('notebookEditorOverviewRuler.runningCellForeground', "The color of the running cell decoration in the notebook editor overview ruler."));
export const cellStatusIconError = registerColor('notebookStatusErrorIcon.foreground', errorForeground, nls.localize('notebookStatusErrorIcon.foreground', "The error icon color of notebook cells in the cell status bar."));
export const cellStatusIconRunning = registerColor('notebookStatusRunningIcon.foreground', foreground, nls.localize('notebookStatusRunningIcon.foreground', "The running icon color of notebook cells in the cell status bar."));
export const notebookOutputContainerBorderColor = registerColor('notebook.outputContainerBorderColor', null, nls.localize('notebook.outputContainerBorderColor', "The border color of the notebook output container."));
export const notebookOutputContainerColor = registerColor('notebook.outputContainerBackgroundColor', null, nls.localize('notebook.outputContainerBackgroundColor', "The color of the notebook output container background."));
// TODO@rebornix currently also used for toolbar border, if we keep all of this, pick a generic name
export const CELL_TOOLBAR_SEPERATOR = registerColor('notebook.cellToolbarSeparator', {
    dark: Color.fromHex('#808080').transparent(0.35),
    light: Color.fromHex('#808080').transparent(0.35),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, nls.localize('notebook.cellToolbarSeparator', "The color of the separator in the cell bottom toolbar"));
export const focusedCellBackground = registerColor('notebook.focusedCellBackground', null, nls.localize('focusedCellBackground', "The background color of a cell when the cell is focused."));
export const selectedCellBackground = registerColor('notebook.selectedCellBackground', {
    dark: listInactiveSelectionBackground,
    light: listInactiveSelectionBackground,
    hcDark: null,
    hcLight: null
}, nls.localize('selectedCellBackground', "The background color of a cell when the cell is selected."));
export const cellHoverBackground = registerColor('notebook.cellHoverBackground', {
    dark: transparent(focusedCellBackground, .5),
    light: transparent(focusedCellBackground, .7),
    hcDark: null,
    hcLight: null
}, nls.localize('notebook.cellHoverBackground', "The background color of a cell when the cell is hovered."));
export const selectedCellBorder = registerColor('notebook.selectedCellBorder', {
    dark: notebookCellBorder,
    light: notebookCellBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, nls.localize('notebook.selectedCellBorder', "The color of the cell's top and bottom border when the cell is selected but not focused."));
export const inactiveSelectedCellBorder = registerColor('notebook.inactiveSelectedCellBorder', {
    dark: null,
    light: null,
    hcDark: focusBorder,
    hcLight: focusBorder
}, nls.localize('notebook.inactiveSelectedCellBorder', "The color of the cell's borders when multiple cells are selected."));
export const focusedCellBorder = registerColor('notebook.focusedCellBorder', focusBorder, nls.localize('notebook.focusedCellBorder', "The color of the cell's focus indicator borders when the cell is focused."));
export const inactiveFocusedCellBorder = registerColor('notebook.inactiveFocusedCellBorder', notebookCellBorder, nls.localize('notebook.inactiveFocusedCellBorder', "The color of the cell's top and bottom border when a cell is focused while the primary focus is outside of the editor."));
export const cellStatusBarItemHover = registerColor('notebook.cellStatusBarItemHoverBackground', {
    light: new Color(new RGBA(0, 0, 0, 0.08)),
    dark: new Color(new RGBA(255, 255, 255, 0.15)),
    hcDark: new Color(new RGBA(255, 255, 255, 0.15)),
    hcLight: new Color(new RGBA(0, 0, 0, 0.08)),
}, nls.localize('notebook.cellStatusBarItemHoverBackground', "The background color of notebook cell status bar items."));
export const cellInsertionIndicator = registerColor('notebook.cellInsertionIndicator', focusBorder, nls.localize('notebook.cellInsertionIndicator', "The color of the notebook cell insertion indicator."));
export const listScrollbarSliderBackground = registerColor('notebookScrollbarSlider.background', scrollbarSliderBackground, nls.localize('notebookScrollbarSliderBackground', "Notebook scrollbar slider background color."));
export const listScrollbarSliderHoverBackground = registerColor('notebookScrollbarSlider.hoverBackground', scrollbarSliderHoverBackground, nls.localize('notebookScrollbarSliderHoverBackground', "Notebook scrollbar slider background color when hovering."));
export const listScrollbarSliderActiveBackground = registerColor('notebookScrollbarSlider.activeBackground', scrollbarSliderActiveBackground, nls.localize('notebookScrollbarSliderActiveBackground', "Notebook scrollbar slider background color when clicked on."));
export const cellSymbolHighlight = registerColor('notebook.symbolHighlightBackground', {
    dark: Color.fromHex('#ffffff0b'),
    light: Color.fromHex('#fdff0033'),
    hcDark: null,
    hcLight: null
}, nls.localize('notebook.symbolHighlightBackground', "Background color of highlighted cell"));
export const cellEditorBackground = registerColor('notebook.cellEditorBackground', {
    light: SIDE_BAR_BACKGROUND,
    dark: SIDE_BAR_BACKGROUND,
    hcDark: null,
    hcLight: null
}, nls.localize('notebook.cellEditorBackground', "Cell editor background color."));
const notebookEditorBackground = registerColor('notebook.editorBackground', {
    light: EDITOR_PANE_BACKGROUND,
    dark: EDITOR_PANE_BACKGROUND,
    hcDark: null,
    hcLight: null
}, nls.localize('notebook.editorBackground', "Notebook background color."));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rRWRpdG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sc0JBQXNCLENBQUM7QUFDOUIsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLHdDQUF3QyxDQUFDO0FBQ2hELE9BQU8sMENBQTBDLENBQUM7QUFDbEQsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLHdDQUF3QyxDQUFDO0FBQ2hELE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFDO0FBRzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFF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