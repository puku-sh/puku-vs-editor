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
var NotebookContribution_1;
import { Schemas } from '../../../../base/common/network.js';
import { Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { toFormattedString } from '../../../../base/common/jsonFormatter.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { NotebookEditor } from './notebookEditor.js';
import { NotebookEditorInput } from '../common/notebookEditorInput.js';
import { INotebookService } from '../common/notebookService.js';
import { NotebookService } from './services/notebookServiceImpl.js';
import { CellKind, CellUri, NotebookWorkingCopyTypeIdentifier, NotebookSetting, NotebookCellsChangeType, NotebookMetadataUri } from '../common/notebookCommon.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { INotebookEditorModelResolverService } from '../common/notebookEditorModelResolverService.js';
import { NotebookDiffEditorInput } from '../common/notebookDiffEditorInput.js';
import { NotebookTextDiffEditor } from './diff/notebookDiffEditor.js';
import { INotebookEditorWorkerService } from '../common/services/notebookWorkerService.js';
import { NotebookEditorWorkerServiceImpl } from './services/notebookWorkerServiceImpl.js';
import { INotebookCellStatusBarService } from '../common/notebookCellStatusBarService.js';
import { NotebookCellStatusBarService } from './services/notebookCellStatusBarServiceImpl.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { NotebookEditorWidgetService } from './services/notebookEditorServiceImpl.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Event } from '../../../../base/common/event.js';
import { getFormattedOutputJSON, getStreamOutputData } from './diff/diffElementViewModel.js';
import { NotebookModelResolverServiceImpl } from '../common/notebookEditorModelResolverServiceImpl.js';
import { INotebookKernelHistoryService, INotebookKernelService } from '../common/notebookKernelService.js';
import { NotebookKernelService } from './services/notebookKernelServiceImpl.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkingCopyEditorService } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { NotebookRendererMessagingService } from './services/notebookRendererMessagingServiceImpl.js';
import { INotebookRendererMessagingService } from '../common/notebookRendererMessagingService.js';
import { INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory } from './viewModel/notebookOutlineDataSourceFactory.js';
// Editor Controller
import './controller/coreActions.js';
import './controller/insertCellActions.js';
import './controller/executeActions.js';
import './controller/sectionActions.js';
import './controller/layoutActions.js';
import './controller/editActions.js';
import './controller/cellOutputActions.js';
import './controller/apiActions.js';
import './controller/foldingController.js';
import './controller/chat/notebook.chat.contribution.js';
import './controller/variablesActions.js';
// Editor Contribution
import './contrib/editorHint/emptyCellEditorHint.js';
import './contrib/clipboard/notebookClipboard.js';
import './contrib/find/notebookFind.js';
import './contrib/format/formatting.js';
import './contrib/saveParticipants/saveParticipants.js';
import './contrib/gettingStarted/notebookGettingStarted.js';
import './contrib/layout/layoutActions.js';
import './contrib/marker/markerProvider.js';
import './contrib/navigation/arrow.js';
import './contrib/outline/notebookOutline.js';
import './contrib/profile/notebookProfile.js';
import './contrib/cellStatusBar/statusBarProviders.js';
import './contrib/cellStatusBar/contributedStatusBarItemController.js';
import './contrib/cellStatusBar/executionStatusBarItemController.js';
import './contrib/editorStatusBar/editorStatusBar.js';
import './contrib/undoRedo/notebookUndoRedo.js';
import './contrib/cellCommands/cellCommands.js';
import './contrib/viewportWarmup/viewportWarmup.js';
import './contrib/troubleshoot/layout.js';
import './contrib/debug/notebookBreakpoints.js';
import './contrib/debug/notebookCellPausing.js';
import './contrib/debug/notebookDebugDecorations.js';
import './contrib/execute/executionEditorProgress.js';
import './contrib/kernelDetection/notebookKernelDetection.js';
import './contrib/cellDiagnostics/cellDiagnostics.js';
import './contrib/multicursor/notebookMulticursor.js';
import './contrib/multicursor/notebookSelectionHighlight.js';
import './contrib/notebookVariables/notebookInlineVariables.js';
// Diff Editor Contribution
import './diff/notebookDiffActions.js';
// Services
import { editorOptionsRegistry } from '../../../../editor/common/config/editorOptions.js';
import { NotebookExecutionStateService } from './services/notebookExecutionStateServiceImpl.js';
import { NotebookExecutionService } from './services/notebookExecutionServiceImpl.js';
import { INotebookExecutionService } from '../common/notebookExecutionService.js';
import { INotebookKeymapService } from '../common/notebookKeymapService.js';
import { NotebookKeymapService } from './services/notebookKeymapServiceImpl.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { INotebookExecutionStateService } from '../common/notebookExecutionStateService.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { COMMENTEDITOR_DECORATION_KEY } from '../../comments/browser/commentReply.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { NotebookKernelHistoryService } from './services/notebookKernelHistoryServiceImpl.js';
import { INotebookLoggingService } from '../common/notebookLoggingService.js';
import { NotebookLoggingService } from './services/notebookLoggingServiceImpl.js';
import product from '../../../../platform/product/common/product.js';
import { NotebookVariables } from './contrib/notebookVariables/notebookVariables.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { NotebookAccessibilityHelp } from './notebookAccessibilityHelp.js';
import { NotebookAccessibleView } from './notebookAccessibleView.js';
import { DefaultFormatter } from '../../format/browser/formatActionsMultiple.js';
import { NotebookMultiTextDiffEditor } from './diff/notebookMultiDiffEditor.js';
import { NotebookMultiDiffEditorInput } from './diff/notebookMultiDiffEditorInput.js';
import { getFormattedMetadataJSON } from '../common/model/notebookCellTextModel.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory } from './viewModel/notebookOutlineEntryFactory.js';
import { getFormattedNotebookMetadataJSON } from '../common/model/notebookMetadataTextModel.js';
import { NotebookOutputEditor } from './outputEditor/notebookOutputEditor.js';
import { NotebookOutputEditorInput } from './outputEditor/notebookOutputEditorInput.js';
/*--------------------------------------------------------------------------------------------- */
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookEditor, NotebookEditor.ID, 'Notebook Editor'), [
    new SyncDescriptor(NotebookEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookTextDiffEditor, NotebookTextDiffEditor.ID, 'Notebook Diff Editor'), [
    new SyncDescriptor(NotebookDiffEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookOutputEditor, NotebookOutputEditor.ID, 'Notebook Output Editor'), [
    new SyncDescriptor(NotebookOutputEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookMultiTextDiffEditor, NotebookMultiTextDiffEditor.ID, 'Notebook Diff Editor'), [
    new SyncDescriptor(NotebookMultiDiffEditorInput)
]);
let NotebookDiffEditorSerializer = class NotebookDiffEditorSerializer {
    constructor(_configurationService) {
        this._configurationService = _configurationService;
    }
    canSerialize() {
        return true;
    }
    serialize(input) {
        assertType(input instanceof NotebookDiffEditorInput);
        return JSON.stringify({
            resource: input.resource,
            originalResource: input.original.resource,
            name: input.getName(),
            originalName: input.original.getName(),
            textDiffName: input.getName(),
            viewType: input.viewType,
        });
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, originalResource, name, viewType } = data;
        if (!data || !URI.isUri(resource) || !URI.isUri(originalResource) || typeof name !== 'string' || typeof viewType !== 'string') {
            return undefined;
        }
        if (this._configurationService.getValue('notebook.experimental.enableNewDiffEditor')) {
            return NotebookMultiDiffEditorInput.create(instantiationService, resource, name, undefined, originalResource, viewType);
        }
        else {
            return NotebookDiffEditorInput.create(instantiationService, resource, name, undefined, originalResource, viewType);
        }
    }
    static canResolveBackup(editorInput, backupResource) {
        return false;
    }
};
NotebookDiffEditorSerializer = __decorate([
    __param(0, IConfigurationService)
], NotebookDiffEditorSerializer);
class NotebookEditorSerializer {
    canSerialize(input) {
        return input.typeId === NotebookEditorInput.ID;
    }
    serialize(input) {
        assertType(input instanceof NotebookEditorInput);
        const data = {
            resource: input.resource,
            preferredResource: input.preferredResource,
            viewType: input.viewType,
            options: input.options
        };
        return JSON.stringify(data);
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, preferredResource, viewType, options } = data;
        if (!data || !URI.isUri(resource) || typeof viewType !== 'string') {
            return undefined;
        }
        const input = NotebookEditorInput.getOrCreate(instantiationService, resource, preferredResource, viewType, options);
        return input;
    }
}
class NotebookOutputEditorSerializer {
    canSerialize(input) {
        return input.typeId === NotebookOutputEditorInput.ID;
    }
    serialize(input) {
        assertType(input instanceof NotebookOutputEditorInput);
        const data = input.getSerializedData(); // in case of cell movement etc get latest indices
        if (!data) {
            return undefined;
        }
        return JSON.stringify(data);
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const input = instantiationService.createInstance(NotebookOutputEditorInput, data.notebookUri, data.cellIndex, undefined, data.outputIndex);
        return input;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookEditorInput.ID, NotebookEditorSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookDiffEditorInput.ID, NotebookDiffEditorSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookOutputEditorInput.ID, NotebookOutputEditorSerializer);
let NotebookContribution = class NotebookContribution extends Disposable {
    static { NotebookContribution_1 = this; }
    static { this.ID = 'workbench.contrib.notebook'; }
    constructor(undoRedoService, configurationService, codeEditorService) {
        super();
        this.codeEditorService = codeEditorService;
        this.updateCellUndoRedoComparisonKey(configurationService, undoRedoService);
        // Watch for changes to undoRedoPerCell setting
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.undoRedoPerCell)) {
                this.updateCellUndoRedoComparisonKey(configurationService, undoRedoService);
            }
        }));
        // register comment decoration
        this.codeEditorService.registerDecorationType('comment-controller', COMMENTEDITOR_DECORATION_KEY, {});
    }
    // Add or remove the cell undo redo comparison key based on the user setting
    updateCellUndoRedoComparisonKey(configurationService, undoRedoService) {
        const undoRedoPerCell = configurationService.getValue(NotebookSetting.undoRedoPerCell);
        if (!undoRedoPerCell) {
            // Add comparison key to map cell => main document
            if (!this._uriComparisonKeyComputer) {
                this._uriComparisonKeyComputer = undoRedoService.registerUriComparisonKeyComputer(CellUri.scheme, {
                    getComparisonKey: (uri) => {
                        if (undoRedoPerCell) {
                            return uri.toString();
                        }
                        return NotebookContribution_1._getCellUndoRedoComparisonKey(uri);
                    }
                });
            }
        }
        else {
            // Dispose comparison key
            this._uriComparisonKeyComputer?.dispose();
            this._uriComparisonKeyComputer = undefined;
        }
    }
    static _getCellUndoRedoComparisonKey(uri) {
        const data = CellUri.parse(uri);
        if (!data) {
            return uri.toString();
        }
        return data.notebook.toString();
    }
    dispose() {
        super.dispose();
        this._uriComparisonKeyComputer?.dispose();
    }
};
NotebookContribution = NotebookContribution_1 = __decorate([
    __param(0, IUndoRedoService),
    __param(1, IConfigurationService),
    __param(2, ICodeEditorService)
], NotebookContribution);
export { NotebookContribution };
let CellContentProvider = class CellContentProvider {
    static { this.ID = 'workbench.contrib.cellContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._registration = textModelService.registerTextModelContentProvider(CellUri.scheme, this);
    }
    dispose() {
        this._registration.dispose();
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parse(resource);
        // const data = parseCellUri(resource);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        let result = null;
        if (!ref.object.isResolved()) {
            return null;
        }
        for (const cell of ref.object.notebook.cells) {
            if (cell.uri.toString() === resource.toString()) {
                const bufferFactory = {
                    create: (defaultEOL) => {
                        return { textBuffer: cell.textBuffer, disposable: Disposable.None };
                    },
                    getFirstLineText: (limit) => {
                        return cell.textBuffer.getLineContent(1).substring(0, limit);
                    }
                };
                const languageId = this._languageService.getLanguageIdByLanguageName(cell.language);
                const languageSelection = languageId ? this._languageService.createById(languageId) : (cell.cellKind === CellKind.Markup ? this._languageService.createById('markdown') : this._languageService.createByFilepathOrFirstLine(resource, cell.textBuffer.getLineContent(1)));
                result = this._modelService.createModel(bufferFactory, languageSelection, resource);
                break;
            }
        }
        if (!result) {
            ref.dispose();
            return null;
        }
        const once = Event.any(result.onWillDispose, ref.object.notebook.onWillDispose)(() => {
            once.dispose();
            ref.dispose();
        });
        return result;
    }
};
CellContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, INotebookEditorModelResolverService)
], CellContentProvider);
let CellInfoContentProvider = class CellInfoContentProvider {
    static { this.ID = 'workbench.contrib.cellInfoContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _labelService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._labelService = _labelService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._disposables = [];
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellMetadata, {
            provideTextContent: this.provideMetadataTextContent.bind(this)
        }));
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellOutput, {
            provideTextContent: this.provideOutputTextContent.bind(this)
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookCellMetadata,
            formatting: {
                label: '${path} (metadata)',
                separator: '/'
            }
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookCellOutput,
            formatting: {
                label: '${path} (output)',
                separator: '/'
            }
        }));
    }
    dispose() {
        dispose(this._disposables);
    }
    async provideMetadataTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellPropertyUri(resource, Schemas.vscodeNotebookCellMetadata);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        let result = null;
        const mode = this._languageService.createById('json');
        const disposables = new DisposableStore();
        for (const cell of ref.object.notebook.cells) {
            if (cell.handle === data.handle) {
                const cellIndex = ref.object.notebook.cells.indexOf(cell);
                const metadataSource = getFormattedMetadataJSON(ref.object.notebook.transientOptions.transientCellMetadata, cell.metadata, cell.language, true);
                result = this._modelService.createModel(metadataSource, mode, resource);
                this._disposables.push(disposables.add(ref.object.notebook.onDidChangeContent(e => {
                    if (result && e.rawEvents.some(event => (event.kind === NotebookCellsChangeType.ChangeCellMetadata || event.kind === NotebookCellsChangeType.ChangeCellLanguage) && event.index === cellIndex)) {
                        const value = getFormattedMetadataJSON(ref.object.notebook.transientOptions.transientCellMetadata, cell.metadata, cell.language, true);
                        if (result.getValue() !== value) {
                            result.setValue(value);
                        }
                    }
                })));
                break;
            }
        }
        if (!result) {
            ref.dispose();
            return null;
        }
        const once = result.onWillDispose(() => {
            disposables.dispose();
            once.dispose();
            ref.dispose();
        });
        return result;
    }
    parseStreamOutput(op) {
        if (!op) {
            return;
        }
        const streamOutputData = getStreamOutputData(op.outputs);
        if (streamOutputData) {
            return {
                content: streamOutputData,
                mode: this._languageService.createById(PLAINTEXT_LANGUAGE_ID)
            };
        }
        return;
    }
    _getResult(data, cell) {
        let result = undefined;
        const mode = this._languageService.createById('json');
        const op = cell.outputs.find(op => op.outputId === data.outputId || op.alternativeOutputId === data.outputId);
        const streamOutputData = this.parseStreamOutput(op);
        if (streamOutputData) {
            result = streamOutputData;
            return result;
        }
        const obj = cell.outputs.map(output => ({
            metadata: output.metadata,
            outputItems: output.outputs.map(opit => ({
                mimeType: opit.mime,
                data: opit.data.toString()
            }))
        }));
        const outputSource = toFormattedString(obj, {});
        result = {
            content: outputSource,
            mode
        };
        return result;
    }
    async provideOutputsTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellPropertyUri(resource, Schemas.vscodeNotebookCellOutput);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        const cell = ref.object.notebook.cells.find(cell => cell.handle === data.handle);
        if (!cell) {
            ref.dispose();
            return null;
        }
        const mode = this._languageService.createById('json');
        const model = this._modelService.createModel(getFormattedOutputJSON(cell.outputs || []), mode, resource, true);
        const cellModelListener = Event.any(cell.onDidChangeOutputs ?? Event.None, cell.onDidChangeOutputItems ?? Event.None)(() => {
            model.setValue(getFormattedOutputJSON(cell.outputs || []));
        });
        const once = model.onWillDispose(() => {
            once.dispose();
            cellModelListener.dispose();
            ref.dispose();
        });
        return model;
    }
    async provideOutputTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellOutputUri(resource);
        if (!data) {
            return this.provideOutputsTextContent(resource);
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        const cell = ref.object.notebook.cells.find(cell => !!cell.outputs.find(op => op.outputId === data.outputId || op.alternativeOutputId === data.outputId));
        if (!cell) {
            ref.dispose();
            return null;
        }
        const result = this._getResult(data, cell);
        if (!result) {
            ref.dispose();
            return null;
        }
        const model = this._modelService.createModel(result.content, result.mode, resource);
        const cellModelListener = Event.any(cell.onDidChangeOutputs ?? Event.None, cell.onDidChangeOutputItems ?? Event.None)(() => {
            const newResult = this._getResult(data, cell);
            if (!newResult) {
                return;
            }
            model.setValue(newResult.content);
            model.setLanguage(newResult.mode.languageId);
        });
        const once = model.onWillDispose(() => {
            once.dispose();
            cellModelListener.dispose();
            ref.dispose();
        });
        return model;
    }
};
CellInfoContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, ILabelService),
    __param(4, INotebookEditorModelResolverService)
], CellInfoContentProvider);
let NotebookMetadataContentProvider = class NotebookMetadataContentProvider {
    static { this.ID = 'workbench.contrib.notebookMetadataContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _labelService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._labelService = _labelService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._disposables = [];
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookMetadata, {
            provideTextContent: this.provideMetadataTextContent.bind(this)
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookMetadata,
            formatting: {
                label: '${path} (metadata)',
                separator: '/'
            }
        }));
    }
    dispose() {
        dispose(this._disposables);
    }
    async provideMetadataTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = NotebookMetadataUri.parse(resource);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data);
        let result = null;
        const mode = this._languageService.createById('json');
        const disposables = new DisposableStore();
        const metadataSource = getFormattedNotebookMetadataJSON(ref.object.notebook.transientOptions.transientDocumentMetadata, ref.object.notebook.metadata);
        result = this._modelService.createModel(metadataSource, mode, resource);
        if (!result) {
            ref.dispose();
            return null;
        }
        this._disposables.push(disposables.add(ref.object.notebook.onDidChangeContent(e => {
            if (result && e.rawEvents.some(event => (event.kind === NotebookCellsChangeType.ChangeCellContent || event.kind === NotebookCellsChangeType.ChangeDocumentMetadata || event.kind === NotebookCellsChangeType.ModelChange))) {
                const value = getFormattedNotebookMetadataJSON(ref.object.notebook.transientOptions.transientDocumentMetadata, ref.object.notebook.metadata);
                if (result.getValue() !== value) {
                    result.setValue(value);
                }
            }
        })));
        const once = result.onWillDispose(() => {
            disposables.dispose();
            once.dispose();
            ref.dispose();
        });
        return result;
    }
};
NotebookMetadataContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, ILabelService),
    __param(4, INotebookEditorModelResolverService)
], NotebookMetadataContentProvider);
class RegisterSchemasContribution extends Disposable {
    static { this.ID = 'workbench.contrib.registerCellSchemas'; }
    constructor() {
        super();
        this.registerMetadataSchemas();
    }
    registerMetadataSchemas() {
        const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
        const metadataSchema = {
            properties: {
                ['language']: {
                    type: 'string',
                    description: 'The language for the cell'
                }
            },
            // patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        jsonRegistry.registerSchema('vscode://schemas/notebook/cellmetadata', metadataSchema);
    }
}
let NotebookEditorManager = class NotebookEditorManager {
    static { this.ID = 'workbench.contrib.notebookEditorManager'; }
    constructor(_editorService, _notebookEditorModelService, editorGroups) {
        this._editorService = _editorService;
        this._notebookEditorModelService = _notebookEditorModelService;
        this._disposables = new DisposableStore();
        this._disposables.add(Event.debounce(this._notebookEditorModelService.onDidChangeDirty, (last, current) => !last ? [current] : [...last, current], 100)(this._openMissingDirtyNotebookEditors, this));
        // CLOSE editors when we are about to open conflicting notebooks
        this._disposables.add(_notebookEditorModelService.onWillFailWithConflict(e => {
            for (const group of editorGroups.groups) {
                const conflictInputs = group.editors.filter(input => input instanceof NotebookEditorInput && input.viewType !== e.viewType && isEqual(input.resource, e.resource));
                const p = group.closeEditors(conflictInputs);
                e.waitUntil(p);
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    _openMissingDirtyNotebookEditors(models) {
        const result = [];
        for (const model of models) {
            if (model.isDirty() && !this._editorService.isOpened({ resource: model.resource, typeId: NotebookEditorInput.ID, editorId: model.viewType }) && extname(model.resource) !== '.interactive') {
                result.push({
                    resource: model.resource,
                    options: { inactive: true, preserveFocus: true, pinned: true, override: model.viewType }
                });
            }
        }
        if (result.length > 0) {
            this._editorService.openEditors(result);
        }
    }
};
NotebookEditorManager = __decorate([
    __param(0, IEditorService),
    __param(1, INotebookEditorModelResolverService),
    __param(2, IEditorGroupsService)
], NotebookEditorManager);
let SimpleNotebookWorkingCopyEditorHandler = class SimpleNotebookWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.simpleNotebookWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _extensionService, _notebookService) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyEditorService = _workingCopyEditorService;
        this._extensionService = _extensionService;
        this._notebookService = _notebookService;
        this._installHandler();
    }
    async handles(workingCopy) {
        const viewType = this.handlesSync(workingCopy);
        if (!viewType) {
            return false;
        }
        return this._notebookService.canResolve(viewType);
    }
    handlesSync(workingCopy) {
        const viewType = this._getViewType(workingCopy);
        if (!viewType || viewType === 'interactive') {
            return undefined;
        }
        return viewType;
    }
    isOpen(workingCopy, editor) {
        if (!this.handlesSync(workingCopy)) {
            return false;
        }
        return editor instanceof NotebookEditorInput && editor.viewType === this._getViewType(workingCopy) && isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return NotebookEditorInput.getOrCreate(this._instantiationService, workingCopy.resource, undefined, this._getViewType(workingCopy));
    }
    async _installHandler() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        this._register(this._workingCopyEditorService.registerHandler(this));
    }
    _getViewType(workingCopy) {
        const notebookType = NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId);
        if (notebookType && notebookType.viewType === notebookType.notebookType) {
            return notebookType?.viewType;
        }
        return undefined;
    }
};
SimpleNotebookWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService),
    __param(3, INotebookService)
], SimpleNotebookWorkingCopyEditorHandler);
let NotebookLanguageSelectorScoreRefine = class NotebookLanguageSelectorScoreRefine {
    static { this.ID = 'workbench.contrib.notebookLanguageSelectorScoreRefine'; }
    constructor(_notebookService, languageFeaturesService) {
        this._notebookService = _notebookService;
        languageFeaturesService.setNotebookTypeResolver(this._getNotebookInfo.bind(this));
    }
    _getNotebookInfo(uri) {
        const cellUri = CellUri.parse(uri);
        if (!cellUri) {
            return undefined;
        }
        const notebook = this._notebookService.getNotebookTextModel(cellUri.notebook);
        if (!notebook) {
            return undefined;
        }
        return {
            uri: notebook.uri,
            type: notebook.viewType
        };
    }
};
NotebookLanguageSelectorScoreRefine = __decorate([
    __param(0, INotebookService),
    __param(1, ILanguageFeaturesService)
], NotebookLanguageSelectorScoreRefine);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(NotebookContribution.ID, NotebookContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(CellContentProvider.ID, CellContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(CellInfoContentProvider.ID, CellInfoContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(NotebookMetadataContentProvider.ID, NotebookMetadataContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(RegisterSchemasContribution.ID, RegisterSchemasContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(NotebookEditorManager.ID, NotebookEditorManager, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(NotebookLanguageSelectorScoreRefine.ID, NotebookLanguageSelectorScoreRefine, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(SimpleNotebookWorkingCopyEditorHandler.ID, SimpleNotebookWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookVariables, 4 /* LifecyclePhase.Eventually */);
AccessibleViewRegistry.register(new NotebookAccessibleView());
AccessibleViewRegistry.register(new NotebookAccessibilityHelp());
registerSingleton(INotebookService, NotebookService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorWorkerService, NotebookEditorWorkerServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorModelResolverService, NotebookModelResolverServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookCellStatusBarService, NotebookCellStatusBarService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorService, NotebookEditorWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKernelService, NotebookKernelService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKernelHistoryService, NotebookKernelHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookExecutionService, NotebookExecutionService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookExecutionStateService, NotebookExecutionStateService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookRendererMessagingService, NotebookRendererMessagingService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKeymapService, NotebookKeymapService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookLoggingService, NotebookLoggingService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookOutlineEntryFactory, NotebookOutlineEntryFactory, 1 /* InstantiationType.Delayed */);
const schemas = {};
function isConfigurationPropertySchema(x) {
    return (typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined');
}
for (const editorOption of editorOptionsRegistry) {
    const schema = editorOption.schema;
    if (schema) {
        if (isConfigurationPropertySchema(schema)) {
            schemas[`editor.${editorOption.name}`] = schema;
        }
        else {
            for (const key in schema) {
                if (Object.hasOwnProperty.call(schema, key)) {
                    schemas[key] = schema[key];
                }
            }
        }
    }
}
const editorOptionsCustomizationSchema = {
    description: nls.localize(10391, null),
    default: {},
    allOf: [
        {
            properties: schemas,
        }
        // , {
        // 	patternProperties: {
        // 		'^\\[.*\\]$': {
        // 			type: 'object',
        // 			default: {},
        // 			properties: schemas
        // 		}
        // 	}
        // }
    ],
    tags: ['notebookLayout']
};
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'notebook',
    order: 100,
    title: nls.localize(10392, null),
    type: 'object',
    properties: {
        [NotebookSetting.displayOrder]: {
            description: nls.localize(10393, null),
            type: 'array',
            items: {
                type: 'string'
            },
            default: []
        },
        [NotebookSetting.cellToolbarLocation]: {
            description: nls.localize(10394, null),
            type: 'object',
            additionalProperties: {
                markdownDescription: nls.localize(10395, null),
                type: 'string',
                enum: ['left', 'right', 'hidden']
            },
            default: {
                'default': 'right'
            },
            tags: ['notebookLayout']
        },
        [NotebookSetting.showCellStatusBar]: {
            description: nls.localize(10396, null),
            type: 'string',
            enum: ['hidden', 'visible', 'visibleAfterExecute'],
            enumDescriptions: [
                nls.localize(10397, null),
                nls.localize(10398, null),
                nls.localize(10399, null)
            ],
            default: 'visible',
            tags: ['notebookLayout']
        },
        [NotebookSetting.cellExecutionTimeVerbosity]: {
            description: nls.localize(10400, null),
            type: 'string',
            enum: ['default', 'verbose'],
            enumDescriptions: [
                nls.localize(10401, null),
                nls.localize(10402, null)
            ],
            default: 'default',
            tags: ['notebookLayout']
        },
        [NotebookSetting.textDiffEditorPreview]: {
            description: nls.localize(10403, null),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.diffOverviewRuler]: {
            description: nls.localize(10404, null),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout']
        },
        [NotebookSetting.cellToolbarVisibility]: {
            markdownDescription: nls.localize(10405, null),
            type: 'string',
            enum: ['hover', 'click'],
            default: 'click',
            tags: ['notebookLayout']
        },
        [NotebookSetting.undoRedoPerCell]: {
            description: nls.localize(10406, null),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.compactView]: {
            description: nls.localize(10407, null),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.focusIndicator]: {
            description: nls.localize(10408, null),
            type: 'string',
            enum: ['border', 'gutter'],
            default: 'gutter',
            tags: ['notebookLayout']
        },
        [NotebookSetting.insertToolbarLocation]: {
            description: nls.localize(10409, null),
            type: 'string',
            enum: ['betweenCells', 'notebookToolbar', 'both', 'hidden'],
            enumDescriptions: [
                nls.localize(10410, null),
                nls.localize(10411, null),
                nls.localize(10412, null),
                nls.localize(10413, null),
            ],
            default: 'both',
            tags: ['notebookLayout']
        },
        [NotebookSetting.globalToolbar]: {
            description: nls.localize(10414, null),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.stickyScrollEnabled]: {
            description: nls.localize(10415, null),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout']
        },
        [NotebookSetting.stickyScrollMode]: {
            description: nls.localize(10416, null),
            type: 'string',
            enum: ['flat', 'indented'],
            enumDescriptions: [
                nls.localize(10417, null),
                nls.localize(10418, null),
            ],
            default: 'indented',
            tags: ['notebookLayout']
        },
        [NotebookSetting.consolidatedOutputButton]: {
            description: nls.localize(10419, null),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        // [NotebookSetting.openOutputInPreviewEditor]: {
        // 	description: nls.localize('notebook.output.openInPreviewEditor.description', "Controls whether or not the action to open a cell output in a preview editor is enabled. This action can be used via the cell output menu."),
        // 	type: 'boolean',
        // 	default: false,
        // 	tags: ['preview']
        // },
        [NotebookSetting.showFoldingControls]: {
            description: nls.localize(10420, null),
            type: 'string',
            enum: ['always', 'never', 'mouseover'],
            enumDescriptions: [
                nls.localize(10421, null),
                nls.localize(10422, null),
                nls.localize(10423, null),
            ],
            default: 'mouseover',
            tags: ['notebookLayout']
        },
        [NotebookSetting.dragAndDropEnabled]: {
            description: nls.localize(10424, null),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout']
        },
        [NotebookSetting.consolidatedRunButton]: {
            description: nls.localize(10425, null),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout']
        },
        [NotebookSetting.globalToolbarShowLabel]: {
            description: nls.localize(10426, null),
            type: 'string',
            enum: ['always', 'never', 'dynamic'],
            default: 'always',
            tags: ['notebookLayout']
        },
        [NotebookSetting.textOutputLineLimit]: {
            markdownDescription: nls.localize(10427, null, '`#notebook.output.scrolling#`'),
            type: 'number',
            default: 30,
            tags: ['notebookLayout', 'notebookOutputLayout'],
            minimum: 1,
        },
        [NotebookSetting.LinkifyOutputFilePaths]: {
            description: nls.localize(10428, null),
            type: 'boolean',
            default: true,
            tags: ['notebookOutputLayout']
        },
        [NotebookSetting.minimalErrorRendering]: {
            description: nls.localize(10429, null),
            type: 'boolean',
            default: false,
            tags: ['notebookOutputLayout']
        },
        [NotebookSetting.markupFontSize]: {
            markdownDescription: nls.localize(10430, null, '`0`', '`#editor.fontSize#`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout']
        },
        [NotebookSetting.markdownLineHeight]: {
            markdownDescription: nls.localize(10431, null, '`0`', '`normal`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout']
        },
        [NotebookSetting.cellEditorOptionsCustomizations]: editorOptionsCustomizationSchema,
        [NotebookSetting.interactiveWindowCollapseCodeCells]: {
            markdownDescription: nls.localize(10432, null),
            type: 'string',
            enum: ['always', 'never', 'fromEditor'],
            default: 'fromEditor'
        },
        [NotebookSetting.outputLineHeight]: {
            markdownDescription: nls.localize(10433, null),
            type: 'number',
            default: 0,
            tags: ['notebookLayout', 'notebookOutputLayout']
        },
        [NotebookSetting.outputFontSize]: {
            markdownDescription: nls.localize(10434, null, '`#editor.fontSize#`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout', 'notebookOutputLayout']
        },
        [NotebookSetting.outputFontFamily]: {
            markdownDescription: nls.localize(10435, null, '`#editor.fontFamily#`'),
            type: 'string',
            tags: ['notebookLayout', 'notebookOutputLayout']
        },
        [NotebookSetting.outputScrolling]: {
            markdownDescription: nls.localize(10436, null),
            type: 'boolean',
            tags: ['notebookLayout', 'notebookOutputLayout'],
            default: typeof product.quality === 'string' && product.quality !== 'stable' // only enable as default in insiders
        },
        [NotebookSetting.outputWordWrap]: {
            markdownDescription: nls.localize(10437, null),
            type: 'boolean',
            tags: ['notebookLayout', 'notebookOutputLayout'],
            default: false
        },
        [NotebookSetting.defaultFormatter]: {
            description: nls.localize(10438, null),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFormatter.extensionIds,
            enumItemLabels: DefaultFormatter.extensionItemLabels,
            markdownEnumDescriptions: DefaultFormatter.extensionDescriptions
        },
        [NotebookSetting.formatOnSave]: {
            markdownDescription: nls.localize(10439, null, '`#files.autoSave#`'),
            type: 'boolean',
            tags: ['notebookLayout'],
            default: false
        },
        [NotebookSetting.insertFinalNewline]: {
            markdownDescription: nls.localize(10440, null),
            type: 'boolean',
            tags: ['notebookLayout'],
            default: false
        },
        [NotebookSetting.formatOnCellExecution]: {
            markdownDescription: nls.localize(10441, null),
            type: 'boolean',
            default: false
        },
        [NotebookSetting.confirmDeleteRunningCell]: {
            markdownDescription: nls.localize(10442, null),
            type: 'boolean',
            default: true
        },
        [NotebookSetting.findFilters]: {
            markdownDescription: nls.localize(10443, null),
            type: 'object',
            properties: {
                markupSource: {
                    type: 'boolean',
                    default: true
                },
                markupPreview: {
                    type: 'boolean',
                    default: true
                },
                codeSource: {
                    type: 'boolean',
                    default: true
                },
                codeOutput: {
                    type: 'boolean',
                    default: true
                }
            },
            default: {
                markupSource: true,
                markupPreview: true,
                codeSource: true,
                codeOutput: true
            },
            tags: ['notebookLayout']
        },
        [NotebookSetting.remoteSaving]: {
            markdownDescription: nls.localize(10444, null),
            type: 'boolean',
            default: typeof product.quality === 'string' && product.quality !== 'stable', // only enable as default in insiders
            tags: ['experimental']
        },
        [NotebookSetting.scrollToRevealCell]: {
            markdownDescription: nls.localize(10445, null, 'notebook.cell.executeAndSelectBelow'),
            type: 'string',
            enum: ['fullCell', 'firstLine', 'none'],
            markdownEnumDescriptions: [
                nls.localize(10446, null),
                nls.localize(10447, null),
                nls.localize(10448, null),
            ],
            default: 'fullCell'
        },
        [NotebookSetting.cellGenerate]: {
            markdownDescription: nls.localize(10449, null),
            type: 'boolean',
            default: true
        },
        [NotebookSetting.notebookVariablesView]: {
            markdownDescription: nls.localize(10450, null),
            type: 'boolean',
            default: false
        },
        [NotebookSetting.notebookInlineValues]: {
            markdownDescription: nls.localize(10451, null),
            type: 'string',
            enum: ['on', 'auto', 'off'],
            enumDescriptions: [
                nls.localize(10452, null),
                nls.localize(10453, null),
                nls.localize(10454, null),
            ],
            default: 'off'
        },
        [NotebookSetting.cellFailureDiagnostics]: {
            markdownDescription: nls.localize(10455, null),
            type: 'boolean',
            default: true
        },
        [NotebookSetting.outputBackupSizeLimit]: {
            markdownDescription: nls.localize(10456, null),
            type: 'number',
            default: 10000
        },
        [NotebookSetting.multiCursor]: {
            markdownDescription: nls.localize(10457, null),
            type: 'boolean',
            default: false
        },
        [NotebookSetting.markupFontFamily]: {
            markdownDescription: nls.localize(10458, null),
            type: 'string',
            default: '',
            tags: ['notebookLayout']
        }
    }
});
//# sourceMappingURL=notebook.contribution.js.map