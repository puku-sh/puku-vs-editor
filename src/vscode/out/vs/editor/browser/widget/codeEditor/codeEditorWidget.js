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
var CodeEditorWidget_1;
import '../../services/markerDecorations.js';
import * as dom from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, createEventDeliveryQueue } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import './editor.css';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { EditorConfiguration } from '../../config/editorConfiguration.js';
import { TabFocus } from '../../config/tabFocus.js';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { View } from '../../view.js';
import { DOMLineBreaksComputerFactory } from '../../view/domLineBreaksComputer.js';
import { ViewUserInputEvents } from '../../view/viewUserInputEvents.js';
import { CodeEditorContributions } from './codeEditorContributions.js';
import { filterFontDecorations, filterValidationDecorations } from '../../../common/config/editorOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { editorUnnecessaryCodeOpacity } from '../../../common/core/editorColorRegistry.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { WordOperations } from '../../../common/cursor/cursorWordOperations.js';
import { InternalEditorAction } from '../../../common/editorAction.js';
import * as editorCommon from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { editorErrorForeground, editorHintForeground, editorInfoForeground, editorWarningForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { TextModelEditSource, EditSources } from '../../../common/textModelEditSource.js';
import { isObject } from '../../../../base/common/types.js';
let CodeEditorWidget = class CodeEditorWidget extends Disposable {
    static { CodeEditorWidget_1 = this; }
    static { this.dropIntoEditorDecorationOptions = ModelDecorationOptions.register({
        description: 'workbench-dnd-target',
        className: 'dnd-target'
    }); }
    //#endregion
    get isSimpleWidget() {
        return this._configuration.isSimpleWidget;
    }
    get contextMenuId() {
        return this._configuration.contextMenuId;
    }
    get contextKeyService() { return this._contextKeyService; }
    constructor(domElement, _options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        //#region Eventing
        this._deliveryQueue = createEventDeliveryQueue();
        this._contributions = this._register(new CodeEditorContributions());
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeModelContent = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelContent = this._onDidChangeModelContent.event;
        this._onDidChangeModelLanguage = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguage = this._onDidChangeModelLanguage.event;
        this._onDidChangeModelLanguageConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguageConfiguration = this._onDidChangeModelLanguageConfiguration.event;
        this._onDidChangeModelOptions = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelOptions = this._onDidChangeModelOptions.event;
        this._onDidChangeModelDecorations = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelDecorations = this._onDidChangeModelDecorations.event;
        this._onDidChangeLineHeight = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeLineHeight = this._onDidChangeLineHeight.event;
        this._onDidChangeFont = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeFont = this._onDidChangeFont.event;
        this._onDidChangeModelTokens = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelTokens = this._onDidChangeModelTokens.event;
        this._onDidChangeConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeCursorPosition = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorPosition = this._onDidChangeCursorPosition.event;
        this._onDidChangeCursorSelection = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorSelection = this._onDidChangeCursorSelection.event;
        this._onDidAttemptReadOnlyEdit = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidAttemptReadOnlyEdit = this._onDidAttemptReadOnlyEdit.event;
        this._onDidLayoutChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidLayoutChange = this._onDidLayoutChange.event;
        this._editorTextFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorText = this._editorTextFocus.onDidChangeToTrue;
        this.onDidBlurEditorText = this._editorTextFocus.onDidChangeToFalse;
        this._editorWidgetFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorWidget = this._editorWidgetFocus.onDidChangeToTrue;
        this.onDidBlurEditorWidget = this._editorWidgetFocus.onDidChangeToFalse;
        this._onWillType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onWillType = this._onWillType.event;
        this._onDidType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidType = this._onDidType.event;
        this._onDidCompositionStart = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionStart = this._onDidCompositionStart.event;
        this._onDidCompositionEnd = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionEnd = this._onDidCompositionEnd.event;
        this._onDidPaste = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidPaste = this._onDidPaste.event;
        this._onMouseUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDown = this._onMouseDown.event;
        this._onMouseDrag = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrag = this._onMouseDrag.event;
        this._onMouseDrop = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrop = this._onMouseDrop.event;
        this._onMouseDropCanceled = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDropCanceled = this._onMouseDropCanceled.event;
        this._onDropIntoEditor = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDropIntoEditor = this._onDropIntoEditor.event;
        this._onContextMenu = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onContextMenu = this._onContextMenu.event;
        this._onMouseMove = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseMove = this._onMouseMove.event;
        this._onMouseLeave = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseLeave = this._onMouseLeave.event;
        this._onMouseWheel = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseWheel = this._onMouseWheel.event;
        this._onKeyUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyUp = this._onKeyUp.event;
        this._onKeyDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyDown = this._onKeyDown.event;
        this._onDidContentSizeChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._onDidScrollChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidScrollChange = this._onDidScrollChange.event;
        this._onDidChangeViewZones = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeViewZones = this._onDidChangeViewZones.event;
        this._onDidChangeHiddenAreas = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeHiddenAreas = this._onDidChangeHiddenAreas.event;
        this._updateCounter = 0;
        this._onWillTriggerEditorOperationEvent = this._register(new Emitter());
        this.onWillTriggerEditorOperationEvent = this._onWillTriggerEditorOperationEvent.event;
        this._onBeginUpdate = this._register(new Emitter());
        this.onBeginUpdate = this._onBeginUpdate.event;
        this._onEndUpdate = this._register(new Emitter());
        this.onEndUpdate = this._onEndUpdate.event;
        this._onBeforeExecuteEdit = this._register(new Emitter());
        this.onBeforeExecuteEdit = this._onBeforeExecuteEdit.event;
        this._actions = new Map();
        this._bannerDomNode = null;
        this._dropIntoEditorDecorations = this.createDecorationsCollection();
        this.inComposition = false;
        codeEditorService.willCreateCodeEditor();
        const options = { ..._options };
        this._domElement = domElement;
        this._overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        delete options.overflowWidgetsDomNode;
        this._id = (++EDITOR_ID);
        this._decorationTypeKeysToIds = {};
        this._decorationTypeSubtypes = {};
        this._telemetryData = codeEditorWidgetOptions.telemetryData;
        this._configuration = this._register(this._createConfiguration(codeEditorWidgetOptions.isSimpleWidget || false, codeEditorWidgetOptions.contextMenuId ?? (codeEditorWidgetOptions.isSimpleWidget ? MenuId.SimpleEditorContext : MenuId.EditorContext), options, accessibilityService));
        this._register(this._configuration.onDidChange((e) => {
            this._onDidChangeConfiguration.fire(e);
            const options = this._configuration.options;
            if (e.hasChanged(165 /* EditorOption.layoutInfo */)) {
                const layoutInfo = options.get(165 /* EditorOption.layoutInfo */);
                this._onDidLayoutChange.fire(layoutInfo);
            }
        }));
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domElement));
        if (codeEditorWidgetOptions.contextKeyValues) {
            for (const [key, value] of Object.entries(codeEditorWidgetOptions.contextKeyValues)) {
                this._contextKeyService.createKey(key, value);
            }
        }
        this._notificationService = notificationService;
        this._codeEditorService = codeEditorService;
        this._commandService = commandService;
        this._themeService = themeService;
        this._register(new EditorContextKeysManager(this, this._contextKeyService));
        this._register(new EditorModeContext(this, this._contextKeyService, languageFeaturesService));
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._modelData = null;
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._glyphMarginWidgets = {};
        let contributions;
        if (Array.isArray(codeEditorWidgetOptions.contributions)) {
            contributions = codeEditorWidgetOptions.contributions;
        }
        else {
            contributions = EditorExtensionsRegistry.getEditorContributions();
        }
        this._contributions.initialize(this, contributions, this._instantiationService);
        for (const action of EditorExtensionsRegistry.getEditorActions()) {
            if (this._actions.has(action.id)) {
                onUnexpectedError(new Error(`Cannot have two actions with the same id ${action.id}`));
                continue;
            }
            const internalAction = new InternalEditorAction(action.id, action.label, action.alias, action.metadata, action.precondition ?? undefined, (args) => {
                return this._instantiationService.invokeFunction((accessor) => {
                    return Promise.resolve(action.runEditorCommand(accessor, this, args));
                });
            }, this._contextKeyService);
            this._actions.set(internalAction.id, internalAction);
        }
        const isDropIntoEnabled = () => {
            return !this._configuration.options.get(104 /* EditorOption.readOnly */)
                && this._configuration.options.get(43 /* EditorOption.dropIntoEditor */).enabled;
        };
        this._register(new dom.DragAndDropObserver(this._domElement, {
            onDragOver: e => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this.showDropIndicatorAt(target.position);
                }
            },
            onDrop: async (e) => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                this.removeDropIndicator();
                if (!e.dataTransfer) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this._onDropIntoEditor.fire({ position: target.position, event: e });
                }
            },
            onDragLeave: () => {
                this.removeDropIndicator();
            },
            onDragEnd: () => {
                this.removeDropIndicator();
            },
        }));
        this._codeEditorService.addCodeEditor(this);
    }
    writeScreenReaderContent(reason) {
        this._modelData?.view.writeScreenReaderContent(reason);
    }
    _createConfiguration(isSimpleWidget, contextMenuId, options, accessibilityService) {
        return new EditorConfiguration(isSimpleWidget, contextMenuId, options, this._domElement, accessibilityService);
    }
    getId() {
        return this.getEditorType() + ':' + this._id;
    }
    getEditorType() {
        return editorCommon.EditorType.ICodeEditor;
    }
    dispose() {
        this._codeEditorService.removeCodeEditor(this);
        this._actions.clear();
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._removeDecorationTypes();
        this._postDetachModelCleanup(this._detachModel());
        this._onDidDispose.fire();
        super.dispose();
    }
    invokeWithinContext(fn) {
        return this._instantiationService.invokeFunction(fn);
    }
    updateOptions(newOptions) {
        this._configuration.updateOptions(newOptions || {});
    }
    getOptions() {
        return this._configuration.options;
    }
    getOption(id) {
        return this._configuration.options.get(id);
    }
    getRawOptions() {
        return this._configuration.getRawOptions();
    }
    getOverflowWidgetsDomNode() {
        return this._overflowWidgetsDomNode;
    }
    getConfiguredWordAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return WordOperations.getWordAtPosition(this._modelData.model, this._configuration.options.get(148 /* EditorOption.wordSeparators */), this._configuration.options.get(147 /* EditorOption.wordSegmenterLocales */), position);
    }
    getValue(options = null) {
        if (!this._modelData) {
            return '';
        }
        const preserveBOM = (options && options.preserveBOM) ? true : false;
        let eolPreference = 0 /* EndOfLinePreference.TextDefined */;
        if (options && options.lineEnding && options.lineEnding === '\n') {
            eolPreference = 1 /* EndOfLinePreference.LF */;
        }
        else if (options && options.lineEnding && options.lineEnding === '\r\n') {
            eolPreference = 2 /* EndOfLinePreference.CRLF */;
        }
        return this._modelData.model.getValue(eolPreference, preserveBOM);
    }
    setValue(newValue) {
        try {
            this._beginUpdate();
            if (!this._modelData) {
                return;
            }
            this._modelData.model.setValue(newValue);
        }
        finally {
            this._endUpdate();
        }
    }
    getModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model;
    }
    setModel(_model = null) {
        try {
            this._beginUpdate();
            const model = _model;
            if (this._modelData === null && model === null) {
                // Current model is the new model
                return;
            }
            if (this._modelData && this._modelData.model === model) {
                // Current model is the new model
                return;
            }
            const e = {
                oldModelUrl: this._modelData?.model.uri || null,
                newModelUrl: model?.uri || null
            };
            this._onWillChangeModel.fire(e);
            const hasTextFocus = this.hasTextFocus();
            const detachedModel = this._detachModel();
            this._attachModel(model);
            if (this.hasModel()) {
                // we have a new model (with a new view)!
                if (hasTextFocus) {
                    this.focus();
                }
            }
            else {
                // we have no model (and no view) anymore
                // make sure the outside world knows we are not focused
                this._editorTextFocus.setValue(false);
                this._editorWidgetFocus.setValue(false);
            }
            this._removeDecorationTypes();
            this._onDidChangeModel.fire(e);
            this._postDetachModelCleanup(detachedModel);
            this._contributionsDisposable = this._contributions.onAfterModelAttached();
        }
        finally {
            this._endUpdate();
        }
    }
    _removeDecorationTypes() {
        this._decorationTypeKeysToIds = {};
        if (this._decorationTypeSubtypes) {
            for (const decorationType in this._decorationTypeSubtypes) {
                const subTypes = this._decorationTypeSubtypes[decorationType];
                for (const subType in subTypes) {
                    this._removeDecorationType(decorationType + '-' + subType);
                }
            }
            this._decorationTypeSubtypes = {};
        }
    }
    getVisibleRanges() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRanges();
    }
    getVisibleRangesPlusViewportAboveBelow() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRangesPlusViewportAboveBelow();
    }
    getWhitespaces() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.viewLayout.getWhitespaces();
    }
    static _getVerticalOffsetAfterPosition(modelData, modelLineNumber, modelColumn, includeViewZones) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetAfterLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getTopForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, 1, includeViewZones);
    }
    getTopForPosition(lineNumber, column) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, column, false);
    }
    static _getVerticalOffsetForPosition(modelData, modelLineNumber, modelColumn, includeViewZones = false) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getBottomForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetAfterPosition(this._modelData, lineNumber, Number.MAX_SAFE_INTEGER, includeViewZones);
    }
    getLineHeightForPosition(position) {
        if (!this._modelData) {
            return -1;
        }
        const viewModel = this._modelData.viewModel;
        const coordinatesConverter = viewModel.coordinatesConverter;
        const pos = Position.lift(position);
        if (coordinatesConverter.modelPositionIsVisible(pos)) {
            const viewPosition = coordinatesConverter.convertModelPositionToViewPosition(pos);
            return viewModel.viewLayout.getLineHeightForLineNumber(viewPosition.lineNumber);
        }
        return 0;
    }
    setHiddenAreas(ranges, source, forceUpdate) {
        this._modelData?.viewModel.setHiddenAreas(ranges.map(r => Range.lift(r)), source, forceUpdate);
    }
    getVisibleColumnFromPosition(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.visibleColumnFromColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize) + 1;
    }
    getStatusbarColumn(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.toStatusbarColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize);
    }
    getPosition() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getPosition();
    }
    setPosition(position, source = 'api') {
        if (!this._modelData) {
            return;
        }
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.setSelections(source, [{
                selectionStartLineNumber: position.lineNumber,
                selectionStartColumn: position.column,
                positionLineNumber: position.lineNumber,
                positionColumn: position.column
            }]);
    }
    _sendRevealRange(modelRange, verticalType, revealHorizontal, scrollType) {
        if (!this._modelData) {
            return;
        }
        if (!Range.isIRange(modelRange)) {
            throw new Error('Invalid arguments');
        }
        const validatedModelRange = this._modelData.model.validateRange(modelRange);
        const viewRange = this._modelData.viewModel.coordinatesConverter.convertModelRangeToViewRange(validatedModelRange);
        this._modelData.viewModel.revealRange('api', revealHorizontal, viewRange, verticalType, scrollType);
    }
    revealAllCursors(revealHorizontal, minimalReveal) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.revealAllCursors('api', revealHorizontal, minimalReveal);
    }
    revealLine(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLine(lineNumber, revealType, scrollType) {
        if (typeof lineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(lineNumber, 1, lineNumber, 1), revealType, false, scrollType);
    }
    revealPosition(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 0 /* VerticalRevealType.Simple */, true, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    _revealPosition(position, verticalType, revealHorizontal, scrollType) {
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column), verticalType, revealHorizontal, scrollType);
    }
    getSelection() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelection();
    }
    getSelections() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelections();
    }
    setSelection(something, source = 'api') {
        const isSelection = Selection.isISelection(something);
        const isRange = Range.isIRange(something);
        if (!isSelection && !isRange) {
            throw new Error('Invalid arguments');
        }
        if (isSelection) {
            this._setSelectionImpl(something, source);
        }
        else if (isRange) {
            // act as if it was an IRange
            const selection = {
                selectionStartLineNumber: something.startLineNumber,
                selectionStartColumn: something.startColumn,
                positionLineNumber: something.endLineNumber,
                positionColumn: something.endColumn
            };
            this._setSelectionImpl(selection, source);
        }
    }
    _setSelectionImpl(sel, source) {
        if (!this._modelData) {
            return;
        }
        const selection = new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
        this._modelData.viewModel.setSelections(source, [selection]);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLines(startLineNumber, endLineNumber, verticalType, scrollType) {
        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(startLineNumber, 1, endLineNumber, 1), verticalType, false, scrollType);
    }
    revealRange(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._revealRange(range, revealVerticalInCenter ? 1 /* VerticalRevealType.Center */ : 0 /* VerticalRevealType.Simple */, revealHorizontal, scrollType);
    }
    revealRangeInCenter(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 6 /* VerticalRevealType.NearTopIfOutsideViewport */, true, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 3 /* VerticalRevealType.Top */, true, scrollType);
    }
    _revealRange(range, verticalType, revealHorizontal, scrollType) {
        if (!Range.isIRange(range)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(Range.lift(range), verticalType, revealHorizontal, scrollType);
    }
    setSelections(ranges, source = 'api', reason = 0 /* CursorChangeReason.NotSet */) {
        if (!this._modelData) {
            return;
        }
        if (!ranges || ranges.length === 0) {
            throw new Error('Invalid arguments');
        }
        for (let i = 0, len = ranges.length; i < len; i++) {
            if (!Selection.isISelection(ranges[i])) {
                throw new Error('Invalid arguments');
            }
        }
        this._modelData.viewModel.setSelections(source, ranges, reason);
    }
    getContentWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentWidth();
    }
    getScrollWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollWidth();
    }
    getScrollLeft() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollLeft();
    }
    getContentHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentHeight();
    }
    getScrollHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollHeight();
    }
    getScrollTop() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollTop();
    }
    setScrollLeft(newScrollLeft, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollLeft !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollLeft: newScrollLeft
        }, scrollType);
    }
    setScrollTop(newScrollTop, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollTop !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollTop: newScrollTop
        }, scrollType);
    }
    setScrollPosition(position, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.viewLayout.setScrollPosition(position, scrollType);
    }
    hasPendingScrollAnimation() {
        if (!this._modelData) {
            return false;
        }
        return this._modelData.viewModel.viewLayout.hasPendingScrollAnimation();
    }
    saveViewState() {
        if (!this._modelData) {
            return null;
        }
        const contributionsState = this._contributions.saveViewState();
        const cursorState = this._modelData.viewModel.saveCursorState();
        const viewState = this._modelData.viewModel.saveState();
        return {
            cursorState: cursorState,
            viewState: viewState,
            contributionsState: contributionsState
        };
    }
    restoreViewState(s) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        const codeEditorState = s;
        if (codeEditorState && codeEditorState.cursorState && codeEditorState.viewState) {
            const cursorState = codeEditorState.cursorState;
            if (Array.isArray(cursorState)) {
                if (cursorState.length > 0) {
                    this._modelData.viewModel.restoreCursorState(cursorState);
                }
            }
            else {
                // Backwards compatibility
                this._modelData.viewModel.restoreCursorState([cursorState]);
            }
            this._contributions.restoreViewState(codeEditorState.contributionsState || {});
            const reducedState = this._modelData.viewModel.reduceRestoreState(codeEditorState.viewState);
            this._modelData.view.restoreState(reducedState);
        }
    }
    handleInitialized() {
        this._getViewModel()?.visibleLinesStabilized();
    }
    onVisible() {
        this._modelData?.view.refreshFocusState();
    }
    onHide() {
        this._modelData?.view.refreshFocusState();
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    getActions() {
        return Array.from(this._actions.values());
    }
    getSupportedActions() {
        let result = this.getActions();
        result = result.filter(action => action.isSupported());
        return result;
    }
    getAction(id) {
        return this._actions.get(id) || null;
    }
    trigger(source, handlerId, payload) {
        payload = payload || {};
        try {
            this._onWillTriggerEditorOperationEvent.fire({ source: source, handlerId: handlerId, payload: payload });
            this._beginUpdate();
            switch (handlerId) {
                case "compositionStart" /* editorCommon.Handler.CompositionStart */:
                    this._startComposition();
                    return;
                case "compositionEnd" /* editorCommon.Handler.CompositionEnd */:
                    this._endComposition(source);
                    return;
                case "type" /* editorCommon.Handler.Type */: {
                    const args = payload;
                    this._type(source, args.text || '');
                    return;
                }
                case "replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replaceCharCnt || 0, 0, 0);
                    return;
                }
                case "compositionType" /* editorCommon.Handler.CompositionType */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replacePrevCharCnt || 0, args.replaceNextCharCnt || 0, args.positionDelta || 0);
                    return;
                }
                case "paste" /* editorCommon.Handler.Paste */: {
                    const args = payload;
                    this._paste(source, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, args.mode || null, args.clipboardEvent);
                    return;
                }
                case "cut" /* editorCommon.Handler.Cut */:
                    this._cut(source);
                    return;
            }
            const action = this.getAction(handlerId);
            if (action) {
                Promise.resolve(action.run(payload)).then(undefined, onUnexpectedError);
                return;
            }
            if (!this._modelData) {
                return;
            }
            if (this._triggerEditorCommand(source, handlerId, payload)) {
                return;
            }
            this._triggerCommand(handlerId, payload);
        }
        finally {
            this._endUpdate();
        }
    }
    _triggerCommand(handlerId, payload) {
        this._commandService.executeCommand(handlerId, payload);
    }
    _startComposition() {
        if (!this._modelData) {
            return;
        }
        this.inComposition = true;
        this._modelData.viewModel.startComposition();
        this._onDidCompositionStart.fire();
    }
    _endComposition(source) {
        if (!this._modelData) {
            return;
        }
        this.inComposition = false;
        this._modelData.viewModel.endComposition(source);
        this._onDidCompositionEnd.fire();
    }
    _type(source, text) {
        if (!this._modelData || text.length === 0) {
            return;
        }
        if (source === 'keyboard') {
            this._onWillType.fire(text);
        }
        this._modelData.viewModel.type(text, source);
        if (source === 'keyboard') {
            this._onDidType.fire(text);
        }
    }
    _compositionType(source, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source);
    }
    _paste(source, text, pasteOnNewLine, multicursorText, mode, clipboardEvent) {
        if (!this._modelData) {
            return;
        }
        const viewModel = this._modelData.viewModel;
        const startPosition = viewModel.getSelection().getStartPosition();
        viewModel.paste(text, pasteOnNewLine, multicursorText, source);
        const endPosition = viewModel.getSelection().getStartPosition();
        if (source === 'keyboard') {
            this._onDidPaste.fire({
                clipboardEvent,
                range: new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column),
                languageId: mode
            });
        }
    }
    _cut(source) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.cut(source);
    }
    _triggerEditorCommand(source, handlerId, payload) {
        const command = EditorExtensionsRegistry.getEditorCommand(handlerId);
        if (command) {
            payload = payload || {};
            if (isObject(payload)) {
                payload.source = source;
            }
            this._instantiationService.invokeFunction((accessor) => {
                Promise.resolve(command.runEditorCommand(accessor, this, payload)).then(undefined, onUnexpectedError);
            });
            return true;
        }
        return false;
    }
    _getViewModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel;
    }
    pushUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(104 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.pushStackElement();
        return true;
    }
    popUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(104 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.popStackElement();
        return true;
    }
    edit(edit, reason) {
        return this.executeEdits(reason, edit.replacements.map(e => ({ range: e.range, text: e.text })), undefined);
    }
    executeEdits(source, edits, endCursorState) {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(104 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        let cursorStateComputer;
        if (!endCursorState) {
            cursorStateComputer = () => null;
        }
        else if (Array.isArray(endCursorState)) {
            cursorStateComputer = () => endCursorState;
        }
        else {
            cursorStateComputer = endCursorState;
        }
        let sourceStr;
        let reason;
        if (source instanceof TextModelEditSource) {
            reason = source;
            sourceStr = source.metadata.source;
        }
        else {
            reason = EditSources.unknown({ name: sourceStr });
            sourceStr = source;
        }
        this._onBeforeExecuteEdit.fire({ source: sourceStr ?? undefined });
        this._modelData.viewModel.executeEdits(sourceStr, edits, cursorStateComputer, reason);
        return true;
    }
    executeCommand(source, command) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommand(command, source);
    }
    executeCommands(source, commands) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommands(commands, source);
    }
    createDecorationsCollection(decorations) {
        return new EditorDecorationsCollection(this, decorations);
    }
    changeDecorations(callback) {
        if (!this._modelData) {
            // callback will not be called
            return null;
        }
        return this._modelData.model.changeDecorations(callback, this._id);
    }
    getLineDecorations(lineNumber) {
        if (!this._modelData) {
            return null;
        }
        const options = this._configuration.options;
        return this._modelData.model.getLineDecorations(lineNumber, this._id, filterValidationDecorations(options), filterFontDecorations(options));
    }
    getDecorationsInRange(range) {
        if (!this._modelData) {
            return null;
        }
        const options = this._configuration.options;
        return this._modelData.model.getDecorationsInRange(range, this._id, filterValidationDecorations(options), filterFontDecorations(options));
    }
    getFontSizeAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getFontSizeAtPosition(position);
    }
    /**
     * @deprecated
     */
    deltaDecorations(oldDecorations, newDecorations) {
        if (!this._modelData) {
            return [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            return oldDecorations;
        }
        return this._modelData.model.deltaDecorations(oldDecorations, newDecorations, this._id);
    }
    removeDecorations(decorationIds) {
        if (!this._modelData || decorationIds.length === 0) {
            return;
        }
        this._modelData.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    setDecorationsByType(description, decorationTypeKey, decorationOptions) {
        const newDecorationsSubTypes = {};
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        this._decorationTypeSubtypes[decorationTypeKey] = newDecorationsSubTypes;
        const newModelDecorations = [];
        for (const decorationOption of decorationOptions) {
            let typeKey = decorationTypeKey;
            if (decorationOption.renderOptions) {
                // identify custom render options by a hash code over all keys and values
                // For custom render options register a decoration type if necessary
                const subType = hash(decorationOption.renderOptions).toString(16);
                // The fact that `decorationTypeKey` appears in the typeKey has no influence
                // it is just a mechanism to get predictable and unique keys (repeatable for the same options and unique across clients)
                typeKey = decorationTypeKey + '-' + subType;
                if (!oldDecorationsSubTypes[subType] && !newDecorationsSubTypes[subType]) {
                    // decoration type did not exist before, register new one
                    this._registerDecorationType(description, typeKey, decorationOption.renderOptions, decorationTypeKey);
                }
                newDecorationsSubTypes[subType] = true;
            }
            const opts = this._resolveDecorationOptions(typeKey, !!decorationOption.hoverMessage);
            if (decorationOption.hoverMessage) {
                opts.hoverMessage = decorationOption.hoverMessage;
            }
            newModelDecorations.push({ range: decorationOption.range, options: opts });
        }
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        for (const subType in oldDecorationsSubTypes) {
            if (!newDecorationsSubTypes[subType]) {
                this._removeDecorationType(decorationTypeKey + '-' + subType);
            }
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
        return this._decorationTypeKeysToIds[decorationTypeKey] || [];
    }
    setDecorationsByTypeFast(decorationTypeKey, ranges) {
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        for (const subType in oldDecorationsSubTypes) {
            this._removeDecorationType(decorationTypeKey + '-' + subType);
        }
        this._decorationTypeSubtypes[decorationTypeKey] = {};
        const opts = ModelDecorationOptions.createDynamic(this._resolveDecorationOptions(decorationTypeKey, false));
        const newModelDecorations = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            newModelDecorations[i] = { range: ranges[i], options: opts };
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
    }
    removeDecorationsByType(decorationTypeKey) {
        // remove decorations for type and sub type
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey];
        if (oldDecorationsIds) {
            this.changeDecorations(accessor => accessor.deltaDecorations(oldDecorationsIds, []));
        }
        if (this._decorationTypeKeysToIds.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeKeysToIds[decorationTypeKey];
        }
        if (this._decorationTypeSubtypes.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeSubtypes[decorationTypeKey];
        }
    }
    getLayoutInfo() {
        const options = this._configuration.options;
        const layoutInfo = options.get(165 /* EditorOption.layoutInfo */);
        return layoutInfo;
    }
    createOverviewRuler(cssClassName) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.createOverviewRuler(cssClassName);
    }
    getContainerDomNode() {
        return this._domElement;
    }
    getDomNode() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.domNode.domNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    layout(dimension, postponeRendering = false) {
        this._configuration.observeContainer(dimension);
        if (!postponeRendering) {
            this.render();
        }
    }
    focus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.focus();
    }
    hasTextFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isFocused();
    }
    hasWidgetFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isWidgetFocused();
    }
    addContentWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._contentWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a content widget with the same id:' + widget.getId());
        }
        this._contentWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addContentWidget(widgetData);
        }
    }
    layoutContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutContentWidget(widgetData);
            }
        }
    }
    removeContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            delete this._contentWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeContentWidget(widgetData);
            }
        }
    }
    addOverlayWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._overlayWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting an overlay widget with the same id.');
        }
        this._overlayWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addOverlayWidget(widgetData);
        }
    }
    layoutOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutOverlayWidget(widgetData);
            }
        }
    }
    removeOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            delete this._overlayWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeOverlayWidget(widgetData);
            }
        }
    }
    addGlyphMarginWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._glyphMarginWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a glyph margin widget with the same id.');
        }
        this._glyphMarginWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addGlyphMarginWidget(widgetData);
        }
    }
    layoutGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutGlyphMarginWidget(widgetData);
            }
        }
    }
    removeGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            delete this._glyphMarginWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeGlyphMarginWidget(widgetData);
            }
        }
    }
    changeViewZones(callback) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.change(callback);
    }
    getTargetAtClientPoint(clientX, clientY) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.getTargetAtClientPoint(clientX, clientY);
    }
    getScrolledVisiblePosition(rawPosition) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const options = this._configuration.options;
        const layoutInfo = options.get(165 /* EditorOption.layoutInfo */);
        const top = CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, position.lineNumber, position.column) - this.getScrollTop();
        const left = this._modelData.view.getOffsetForColumn(position.lineNumber, position.column) + layoutInfo.glyphMarginWidth + layoutInfo.lineNumbersWidth + layoutInfo.decorationsWidth - this.getScrollLeft();
        const height = this.getLineHeightForPosition(position);
        return {
            top: top,
            left: left,
            height
        };
    }
    getOffsetForColumn(lineNumber, column) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return -1;
        }
        return this._modelData.view.getOffsetForColumn(lineNumber, column);
    }
    render(forceRedraw = false) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.viewModel.batchEvents(() => {
            this._modelData.view.render(true, forceRedraw);
        });
    }
    setAriaOptions(options) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.setAriaOptions(options);
    }
    applyFontInfo(target) {
        applyFontInfo(target, this._configuration.options.get(59 /* EditorOption.fontInfo */));
    }
    setBanner(domNode, domNodeHeight) {
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        this._bannerDomNode = domNode;
        this._configuration.setReservedHeight(domNode ? domNodeHeight : 0);
        if (this._bannerDomNode) {
            this._domElement.prepend(this._bannerDomNode);
        }
    }
    _attachModel(model) {
        if (!model) {
            this._modelData = null;
            return;
        }
        const listenersToRemove = [];
        this._domElement.setAttribute('data-mode-id', model.getLanguageId());
        this._configuration.setIsDominatedByLongLines(model.isDominatedByLongLines());
        this._configuration.setModelLineCount(model.getLineCount());
        const attachedView = model.onBeforeAttached();
        const viewModel = new ViewModel(this._id, this._configuration, model, DOMLineBreaksComputerFactory.create(dom.getWindow(this._domElement)), MonospaceLineBreaksComputerFactory.create(this._configuration.options), (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(this._domElement), callback), this.languageConfigurationService, this._themeService, attachedView, {
            batchChanges: (cb) => {
                try {
                    this._beginUpdate();
                    return cb();
                }
                finally {
                    this._endUpdate();
                }
            },
        });
        // Someone might destroy the model from under the editor, so prevent any exceptions by setting a null model
        listenersToRemove.push(model.onWillDispose(() => this.setModel(null)));
        listenersToRemove.push(viewModel.onEvent((e) => {
            switch (e.kind) {
                case 0 /* OutgoingViewModelEventKind.ContentSizeChanged */:
                    this._onDidContentSizeChange.fire(e);
                    break;
                case 1 /* OutgoingViewModelEventKind.FocusChanged */:
                    this._editorTextFocus.setValue(e.hasFocus);
                    break;
                case 2 /* OutgoingViewModelEventKind.WidgetFocusChanged */:
                    this._editorWidgetFocus.setValue(e.hasFocus);
                    break;
                case 3 /* OutgoingViewModelEventKind.ScrollChanged */:
                    this._onDidScrollChange.fire(e);
                    break;
                case 4 /* OutgoingViewModelEventKind.ViewZonesChanged */:
                    this._onDidChangeViewZones.fire();
                    break;
                case 5 /* OutgoingViewModelEventKind.HiddenAreasChanged */:
                    this._onDidChangeHiddenAreas.fire();
                    break;
                case 6 /* OutgoingViewModelEventKind.ReadOnlyEditAttempt */:
                    this._onDidAttemptReadOnlyEdit.fire();
                    break;
                case 7 /* OutgoingViewModelEventKind.CursorStateChanged */: {
                    if (e.reachedMaxCursorCount) {
                        const multiCursorLimit = this.getOption(89 /* EditorOption.multiCursorLimit */);
                        const message = nls.localize('cursors.maximum', "The number of cursors has been limited to {0}. Consider using [find and replace](https://code.visualstudio.com/docs/editor/codebasics#_find-and-replace) for larger changes or increase the editor multi cursor limit setting.", multiCursorLimit);
                        this._notificationService.prompt(Severity.Warning, message, [
                            {
                                label: 'Find and Replace',
                                run: () => {
                                    this._commandService.executeCommand('editor.action.startFindReplaceAction');
                                }
                            },
                            {
                                label: nls.localize('goToSetting', 'Increase Multi Cursor Limit'),
                                run: () => {
                                    this._commandService.executeCommand('workbench.action.openSettings2', {
                                        query: 'editor.multiCursorLimit'
                                    });
                                }
                            }
                        ]);
                    }
                    const positions = [];
                    for (let i = 0, len = e.selections.length; i < len; i++) {
                        positions[i] = e.selections[i].getPosition();
                    }
                    const e1 = {
                        position: positions[0],
                        secondaryPositions: positions.slice(1),
                        reason: e.reason,
                        source: e.source
                    };
                    this._onDidChangeCursorPosition.fire(e1);
                    const e2 = {
                        selection: e.selections[0],
                        secondarySelections: e.selections.slice(1),
                        modelVersionId: e.modelVersionId,
                        oldSelections: e.oldSelections,
                        oldModelVersionId: e.oldModelVersionId,
                        source: e.source,
                        reason: e.reason
                    };
                    this._onDidChangeCursorSelection.fire(e2);
                    break;
                }
                case 8 /* OutgoingViewModelEventKind.ModelDecorationsChanged */:
                    this._onDidChangeModelDecorations.fire(e.event);
                    break;
                case 9 /* OutgoingViewModelEventKind.ModelLanguageChanged */:
                    this._domElement.setAttribute('data-mode-id', model.getLanguageId());
                    this._onDidChangeModelLanguage.fire(e.event);
                    break;
                case 10 /* OutgoingViewModelEventKind.ModelLanguageConfigurationChanged */:
                    this._onDidChangeModelLanguageConfiguration.fire(e.event);
                    break;
                case 11 /* OutgoingViewModelEventKind.ModelContentChanged */:
                    this._onDidChangeModelContent.fire(e.event);
                    break;
                case 12 /* OutgoingViewModelEventKind.ModelOptionsChanged */:
                    this._onDidChangeModelOptions.fire(e.event);
                    break;
                case 13 /* OutgoingViewModelEventKind.ModelTokensChanged */:
                    this._onDidChangeModelTokens.fire(e.event);
                    break;
                case 14 /* OutgoingViewModelEventKind.ModelLineHeightChanged */:
                    this._onDidChangeLineHeight.fire(e.event);
                    break;
                case 15 /* OutgoingViewModelEventKind.ModelFontChangedEvent */:
                    this._onDidChangeFont.fire(e.event);
                    break;
            }
        }));
        const [view, hasRealView] = this._createView(viewModel);
        if (hasRealView) {
            this._domElement.appendChild(view.domNode.domNode);
            let keys = Object.keys(this._contentWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addContentWidget(this._contentWidgets[widgetId]);
            }
            keys = Object.keys(this._overlayWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addOverlayWidget(this._overlayWidgets[widgetId]);
            }
            keys = Object.keys(this._glyphMarginWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addGlyphMarginWidget(this._glyphMarginWidgets[widgetId]);
            }
            view.render(false, true);
            view.domNode.domNode.setAttribute('data-uri', model.uri.toString());
        }
        this._modelData = new ModelData(model, viewModel, view, hasRealView, listenersToRemove, attachedView);
    }
    _createView(viewModel) {
        let commandDelegate;
        if (this.isSimpleWidget) {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    this._paste('keyboard', text, pasteOnNewLine, multicursorText, mode);
                },
                type: (text) => {
                    this._type('keyboard', text);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    this._compositionType('keyboard', text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
                },
                startComposition: () => {
                    this._startComposition();
                },
                endComposition: () => {
                    this._endComposition('keyboard');
                },
                cut: () => {
                    this._cut('keyboard');
                }
            };
        }
        else {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    const payload = { text, pasteOnNewLine, multicursorText, mode };
                    this._commandService.executeCommand("paste" /* editorCommon.Handler.Paste */, payload);
                },
                type: (text) => {
                    const payload = { text };
                    this._commandService.executeCommand("type" /* editorCommon.Handler.Type */, payload);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    // Try if possible to go through the existing `replacePreviousChar` command
                    if (replaceNextCharCnt || positionDelta) {
                        // must be handled through the new command
                        const payload = { text, replacePrevCharCnt, replaceNextCharCnt, positionDelta };
                        this._commandService.executeCommand("compositionType" /* editorCommon.Handler.CompositionType */, payload);
                    }
                    else {
                        const payload = { text, replaceCharCnt: replacePrevCharCnt };
                        this._commandService.executeCommand("replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */, payload);
                    }
                },
                startComposition: () => {
                    this._commandService.executeCommand("compositionStart" /* editorCommon.Handler.CompositionStart */, {});
                },
                endComposition: () => {
                    this._commandService.executeCommand("compositionEnd" /* editorCommon.Handler.CompositionEnd */, {});
                },
                cut: () => {
                    this._commandService.executeCommand("cut" /* editorCommon.Handler.Cut */, {});
                }
            };
        }
        const viewUserInputEvents = new ViewUserInputEvents(viewModel.coordinatesConverter);
        viewUserInputEvents.onKeyDown = (e) => this._onKeyDown.fire(e);
        viewUserInputEvents.onKeyUp = (e) => this._onKeyUp.fire(e);
        viewUserInputEvents.onContextMenu = (e) => this._onContextMenu.fire(e);
        viewUserInputEvents.onMouseMove = (e) => this._onMouseMove.fire(e);
        viewUserInputEvents.onMouseLeave = (e) => this._onMouseLeave.fire(e);
        viewUserInputEvents.onMouseDown = (e) => this._onMouseDown.fire(e);
        viewUserInputEvents.onMouseUp = (e) => this._onMouseUp.fire(e);
        viewUserInputEvents.onMouseDrag = (e) => this._onMouseDrag.fire(e);
        viewUserInputEvents.onMouseDrop = (e) => this._onMouseDrop.fire(e);
        viewUserInputEvents.onMouseDropCanceled = (e) => this._onMouseDropCanceled.fire(e);
        viewUserInputEvents.onMouseWheel = (e) => this._onMouseWheel.fire(e);
        const view = new View(this._domElement, this.getId(), commandDelegate, this._configuration, this._themeService.getColorTheme(), viewModel, viewUserInputEvents, this._overflowWidgetsDomNode, this._instantiationService);
        return [view, true];
    }
    _postDetachModelCleanup(detachedModel) {
        detachedModel?.removeAllDecorationsWithOwnerId(this._id);
    }
    _detachModel() {
        this._contributionsDisposable?.dispose();
        this._contributionsDisposable = undefined;
        if (!this._modelData) {
            return null;
        }
        const model = this._modelData.model;
        const removeDomNode = this._modelData.hasRealView ? this._modelData.view.domNode.domNode : null;
        this._modelData.dispose();
        this._modelData = null;
        this._domElement.removeAttribute('data-mode-id');
        if (removeDomNode && this._domElement.contains(removeDomNode)) {
            removeDomNode.remove();
        }
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        return model;
    }
    _registerDecorationType(description, key, options, parentTypeKey) {
        this._codeEditorService.registerDecorationType(description, key, options, parentTypeKey, this);
    }
    _removeDecorationType(key) {
        this._codeEditorService.removeDecorationType(key);
    }
    _resolveDecorationOptions(typeKey, writable) {
        return this._codeEditorService.resolveDecorationOptions(typeKey, writable);
    }
    getTelemetryData() {
        return this._telemetryData;
    }
    hasModel() {
        return (this._modelData !== null);
    }
    showDropIndicatorAt(position) {
        const newDecorations = [{
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: CodeEditorWidget_1.dropIntoEditorDecorationOptions
            }];
        this._dropIntoEditorDecorations.set(newDecorations);
        this.revealPosition(position, 1 /* editorCommon.ScrollType.Immediate */);
    }
    removeDropIndicator() {
        this._dropIntoEditorDecorations.clear();
    }
    setContextValue(key, value) {
        this._contextKeyService.createKey(key, value);
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._onBeginUpdate.fire();
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._onEndUpdate.fire();
        }
    }
};
CodeEditorWidget = CodeEditorWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ICodeEditorService),
    __param(5, ICommandService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], CodeEditorWidget);
export { CodeEditorWidget };
let EDITOR_ID = 0;
class ModelData {
    constructor(model, viewModel, view, hasRealView, listenersToRemove, attachedView) {
        this.model = model;
        this.viewModel = viewModel;
        this.view = view;
        this.hasRealView = hasRealView;
        this.listenersToRemove = listenersToRemove;
        this.attachedView = attachedView;
    }
    dispose() {
        dispose(this.listenersToRemove);
        this.model.onBeforeDetached(this.attachedView);
        if (this.hasRealView) {
            this.view.dispose();
        }
        this.viewModel.dispose();
    }
}
var BooleanEventValue;
(function (BooleanEventValue) {
    BooleanEventValue[BooleanEventValue["NotSet"] = 0] = "NotSet";
    BooleanEventValue[BooleanEventValue["False"] = 1] = "False";
    BooleanEventValue[BooleanEventValue["True"] = 2] = "True";
})(BooleanEventValue || (BooleanEventValue = {}));
export class BooleanEventEmitter extends Disposable {
    constructor(_emitterOptions) {
        super();
        this._emitterOptions = _emitterOptions;
        this._onDidChangeToTrue = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToTrue = this._onDidChangeToTrue.event;
        this._onDidChangeToFalse = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToFalse = this._onDidChangeToFalse.event;
        this._value = 0 /* BooleanEventValue.NotSet */;
    }
    setValue(_value) {
        const value = (_value ? 2 /* BooleanEventValue.True */ : 1 /* BooleanEventValue.False */);
        if (this._value === value) {
            return;
        }
        this._value = value;
        if (this._value === 2 /* BooleanEventValue.True */) {
            this._onDidChangeToTrue.fire();
        }
        else if (this._value === 1 /* BooleanEventValue.False */) {
            this._onDidChangeToFalse.fire();
        }
    }
}
/**
 * A regular event emitter that also makes sure contributions are instantiated if necessary
 */
class InteractionEmitter extends Emitter {
    constructor(_contributions, deliveryQueue) {
        super({ deliveryQueue });
        this._contributions = _contributions;
    }
    fire(event) {
        this._contributions.onBeforeInteractionEvent();
        super.fire(event);
    }
}
class EditorContextKeysManager extends Disposable {
    constructor(editor, contextKeyService) {
        super();
        this._editor = editor;
        contextKeyService.createKey('editorId', editor.getId());
        this._editorSimpleInput = EditorContextKeys.editorSimpleInput.bindTo(contextKeyService);
        this._editorFocus = EditorContextKeys.focus.bindTo(contextKeyService);
        this._textInputFocus = EditorContextKeys.textInputFocus.bindTo(contextKeyService);
        this._editorTextFocus = EditorContextKeys.editorTextFocus.bindTo(contextKeyService);
        this._tabMovesFocus = EditorContextKeys.tabMovesFocus.bindTo(contextKeyService);
        this._editorReadonly = EditorContextKeys.readOnly.bindTo(contextKeyService);
        this._inDiffEditor = EditorContextKeys.inDiffEditor.bindTo(contextKeyService);
        this._editorColumnSelection = EditorContextKeys.columnSelection.bindTo(contextKeyService);
        this._hasMultipleSelections = EditorContextKeys.hasMultipleSelections.bindTo(contextKeyService);
        this._hasNonEmptySelection = EditorContextKeys.hasNonEmptySelection.bindTo(contextKeyService);
        this._canUndo = EditorContextKeys.canUndo.bindTo(contextKeyService);
        this._canRedo = EditorContextKeys.canRedo.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromConfig()));
        this._register(this._editor.onDidChangeCursorSelection(() => this._updateFromSelection()));
        this._register(this._editor.onDidFocusEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidFocusEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidChangeModel(() => this._updateFromModel()));
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromModel()));
        this._register(TabFocus.onDidChangeTabFocus((tabFocusMode) => this._tabMovesFocus.set(tabFocusMode)));
        this._updateFromConfig();
        this._updateFromSelection();
        this._updateFromFocus();
        this._updateFromModel();
        this._editorSimpleInput.set(this._editor.isSimpleWidget);
    }
    _updateFromConfig() {
        const options = this._editor.getOptions();
        this._tabMovesFocus.set(options.get(164 /* EditorOption.tabFocusMode */) || TabFocus.getTabFocusMode());
        this._editorReadonly.set(options.get(104 /* EditorOption.readOnly */));
        this._inDiffEditor.set(options.get(70 /* EditorOption.inDiffEditor */));
        this._editorColumnSelection.set(options.get(28 /* EditorOption.columnSelection */));
    }
    _updateFromSelection() {
        const selections = this._editor.getSelections();
        if (!selections) {
            this._hasMultipleSelections.reset();
            this._hasNonEmptySelection.reset();
        }
        else {
            this._hasMultipleSelections.set(selections.length > 1);
            this._hasNonEmptySelection.set(selections.some(s => !s.isEmpty()));
        }
    }
    _updateFromFocus() {
        this._editorFocus.set(this._editor.hasWidgetFocus() && !this._editor.isSimpleWidget);
        this._editorTextFocus.set(this._editor.hasTextFocus() && !this._editor.isSimpleWidget);
        this._textInputFocus.set(this._editor.hasTextFocus());
    }
    _updateFromModel() {
        const model = this._editor.getModel();
        this._canUndo.set(Boolean(model && model.canUndo()));
        this._canRedo.set(Boolean(model && model.canRedo()));
    }
}
export class EditorModeContext extends Disposable {
    constructor(_editor, _contextKeyService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._languageFeaturesService = _languageFeaturesService;
        this._langId = EditorContextKeys.languageId.bindTo(_contextKeyService);
        this._hasCompletionItemProvider = EditorContextKeys.hasCompletionItemProvider.bindTo(_contextKeyService);
        this._hasCodeActionsProvider = EditorContextKeys.hasCodeActionsProvider.bindTo(_contextKeyService);
        this._hasCodeLensProvider = EditorContextKeys.hasCodeLensProvider.bindTo(_contextKeyService);
        this._hasDefinitionProvider = EditorContextKeys.hasDefinitionProvider.bindTo(_contextKeyService);
        this._hasDeclarationProvider = EditorContextKeys.hasDeclarationProvider.bindTo(_contextKeyService);
        this._hasImplementationProvider = EditorContextKeys.hasImplementationProvider.bindTo(_contextKeyService);
        this._hasTypeDefinitionProvider = EditorContextKeys.hasTypeDefinitionProvider.bindTo(_contextKeyService);
        this._hasHoverProvider = EditorContextKeys.hasHoverProvider.bindTo(_contextKeyService);
        this._hasDocumentHighlightProvider = EditorContextKeys.hasDocumentHighlightProvider.bindTo(_contextKeyService);
        this._hasDocumentSymbolProvider = EditorContextKeys.hasDocumentSymbolProvider.bindTo(_contextKeyService);
        this._hasReferenceProvider = EditorContextKeys.hasReferenceProvider.bindTo(_contextKeyService);
        this._hasRenameProvider = EditorContextKeys.hasRenameProvider.bindTo(_contextKeyService);
        this._hasSignatureHelpProvider = EditorContextKeys.hasSignatureHelpProvider.bindTo(_contextKeyService);
        this._hasInlayHintsProvider = EditorContextKeys.hasInlayHintsProvider.bindTo(_contextKeyService);
        this._hasDocumentFormattingProvider = EditorContextKeys.hasDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasDocumentSelectionFormattingProvider = EditorContextKeys.hasDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentFormattingProvider = EditorContextKeys.hasMultipleDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentSelectionFormattingProvider = EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._isInEmbeddedEditor = EditorContextKeys.isInEmbeddedEditor.bindTo(_contextKeyService);
        const update = () => this._update();
        // update when model/mode changes
        this._register(_editor.onDidChangeModel(update));
        this._register(_editor.onDidChangeModelLanguage(update));
        // update when registries change
        this._register(_languageFeaturesService.completionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeActionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeLensProvider.onDidChange(update));
        this._register(_languageFeaturesService.definitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.declarationProvider.onDidChange(update));
        this._register(_languageFeaturesService.implementationProvider.onDidChange(update));
        this._register(_languageFeaturesService.typeDefinitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.hoverProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentHighlightProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentSymbolProvider.onDidChange(update));
        this._register(_languageFeaturesService.referenceProvider.onDidChange(update));
        this._register(_languageFeaturesService.renameProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.signatureHelpProvider.onDidChange(update));
        this._register(_languageFeaturesService.inlayHintsProvider.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    reset() {
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.reset();
            this._hasCompletionItemProvider.reset();
            this._hasCodeActionsProvider.reset();
            this._hasCodeLensProvider.reset();
            this._hasDefinitionProvider.reset();
            this._hasDeclarationProvider.reset();
            this._hasImplementationProvider.reset();
            this._hasTypeDefinitionProvider.reset();
            this._hasHoverProvider.reset();
            this._hasDocumentHighlightProvider.reset();
            this._hasDocumentSymbolProvider.reset();
            this._hasReferenceProvider.reset();
            this._hasRenameProvider.reset();
            this._hasDocumentFormattingProvider.reset();
            this._hasDocumentSelectionFormattingProvider.reset();
            this._hasSignatureHelpProvider.reset();
            this._isInEmbeddedEditor.reset();
        });
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            this.reset();
            return;
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.set(model.getLanguageId());
            this._hasCompletionItemProvider.set(this._languageFeaturesService.completionProvider.has(model));
            this._hasCodeActionsProvider.set(this._languageFeaturesService.codeActionProvider.has(model));
            this._hasCodeLensProvider.set(this._languageFeaturesService.codeLensProvider.has(model));
            this._hasDefinitionProvider.set(this._languageFeaturesService.definitionProvider.has(model));
            this._hasDeclarationProvider.set(this._languageFeaturesService.declarationProvider.has(model));
            this._hasImplementationProvider.set(this._languageFeaturesService.implementationProvider.has(model));
            this._hasTypeDefinitionProvider.set(this._languageFeaturesService.typeDefinitionProvider.has(model));
            this._hasHoverProvider.set(this._languageFeaturesService.hoverProvider.has(model));
            this._hasDocumentHighlightProvider.set(this._languageFeaturesService.documentHighlightProvider.has(model));
            this._hasDocumentSymbolProvider.set(this._languageFeaturesService.documentSymbolProvider.has(model));
            this._hasReferenceProvider.set(this._languageFeaturesService.referenceProvider.has(model));
            this._hasRenameProvider.set(this._languageFeaturesService.renameProvider.has(model));
            this._hasSignatureHelpProvider.set(this._languageFeaturesService.signatureHelpProvider.has(model));
            this._hasInlayHintsProvider.set(this._languageFeaturesService.inlayHintsProvider.has(model));
            this._hasDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.has(model) || this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasMultipleDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.all(model).length + this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._hasMultipleDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._isInEmbeddedEditor.set(model.uri.scheme === Schemas.walkThroughSnippet || model.uri.scheme === Schemas.vscodeChatCodeBlock);
        });
    }
}
class EditorDecorationsCollection {
    get length() {
        return this._decorationIds.length;
    }
    constructor(_editor, decorations) {
        this._editor = _editor;
        this._decorationIds = [];
        this._isChangingDecorations = false;
        if (Array.isArray(decorations) && decorations.length > 0) {
            this.set(decorations);
        }
    }
    onDidChange(listener, thisArgs, disposables) {
        return this._editor.onDidChangeModelDecorations((e) => {
            if (this._isChangingDecorations) {
                return;
            }
            listener.call(thisArgs, e);
        }, disposables);
    }
    getRange(index) {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (index >= this._decorationIds.length) {
            return null;
        }
        return this._editor.getModel().getDecorationRange(this._decorationIds[index]);
    }
    getRanges() {
        if (!this._editor.hasModel()) {
            return [];
        }
        const model = this._editor.getModel();
        const result = [];
        for (const decorationId of this._decorationIds) {
            const range = model.getDecorationRange(decorationId);
            if (range) {
                result.push(range);
            }
        }
        return result;
    }
    has(decoration) {
        return this._decorationIds.includes(decoration.id);
    }
    clear() {
        if (this._decorationIds.length === 0) {
            // nothing to do
            return;
        }
        this.set([]);
    }
    set(newDecorations) {
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                this._decorationIds = accessor.deltaDecorations(this._decorationIds, newDecorations);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return this._decorationIds;
    }
    append(newDecorations) {
        let newDecorationIds = [];
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                newDecorationIds = accessor.deltaDecorations([], newDecorations);
                this._decorationIds = this._decorationIds.concat(newDecorationIds);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return newDecorationIds;
    }
}
const squigglyStart = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'><g fill='`);
const squigglyEnd = encodeURIComponent(`'><polygon points='5.5,0 2.5,3 1.1,3 4.1,0'/><polygon points='4,0 6,2 6,0.6 5.4,0'/><polygon points='0,2 1,3 2.4,3 0,0.6'/></g></svg>`);
function getSquigglySVGData(color) {
    return squigglyStart + encodeURIComponent(color.toString()) + squigglyEnd;
}
const dotdotdotStart = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" height="3" width="12"><g fill="`);
const dotdotdotEnd = encodeURIComponent(`"><circle cx="1" cy="1" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="9" cy="1" r="1"/></g></svg>`);
function getDotDotDotSVGData(color) {
    return dotdotdotStart + encodeURIComponent(color.toString()) + dotdotdotEnd;
}
registerThemingParticipant((theme, collector) => {
    const errorForeground = theme.getColor(editorErrorForeground);
    if (errorForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-error" /* ClassName.EditorErrorDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-error-decoration: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}"); }`);
    }
    const warningForeground = theme.getColor(editorWarningForeground);
    if (warningForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-warning" /* ClassName.EditorWarningDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-warning-decoration: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}"); }`);
    }
    const infoForeground = theme.getColor(editorInfoForeground);
    if (infoForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-info" /* ClassName.EditorInfoDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-info-decoration: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}"); }`);
    }
    const hintForeground = theme.getColor(editorHintForeground);
    if (hintForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-hint" /* ClassName.EditorHintDecoration */} { background: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}") no-repeat bottom left; }`);
        collector.addRule(`:root { --monaco-editor-hint-decoration: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}"); }`);
    }
    const unnecessaryForeground = theme.getColor(editorUnnecessaryCodeOpacity);
    if (unnecessaryForeground) {
        collector.addRule(`.monaco-editor.showUnused .${"squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */} { opacity: ${unnecessaryForeground.rgba.a}; }`);
        collector.addRule(`:root { --monaco-editor-unnecessary-decoration-opacity: ${unnecessaryForeground.rgba.a}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yL2NvZGVFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8scUNBQXFDLENBQUM7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUl2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUE2Qyx3QkFBd0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFnQyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxjQUFjLENBQUM7QUFDdEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBOEIsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBa0UsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxN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