"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeWorkspace = void 0;
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const codeActionData_1 = require("../../../../platform/inlineEdits/common/dataTypes/codeActionData");
const diagnosticData_1 = require("../../../../platform/inlineEdits/common/dataTypes/diagnosticData");
const documentId_1 = require("../../../../platform/inlineEdits/common/dataTypes/documentId");
const languageId_1 = require("../../../../platform/inlineEdits/common/dataTypes/languageId");
const editReason_1 = require("../../../../platform/inlineEdits/common/editReason");
const observableWorkspace_1 = require("../../../../platform/inlineEdits/common/observableWorkspace");
const alternativeNotebookTextDocument_1 = require("../../../../platform/notebook/common/alternativeNotebookTextDocument");
const helpers_1 = require("../../../../platform/notebook/common/helpers");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../../util/common/languages");
const notebooks_1 = require("../../../../util/common/notebooks");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const async_1 = require("../../../../util/vs/base/common/async");
const collections_1 = require("../../../../util/vs/base/common/collections");
const errors_1 = require("../../../../util/vs/base/common/errors");
const lazy_1 = require("../../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../../util/vs/base/common/map");
const network_1 = require("../../../../util/vs/base/common/network");
const observableInternal_1 = require("../../../../util/vs/base/common/observableInternal");
const types_1 = require("../../../../util/vs/base/common/types");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const translations_1 = require("../utils/translations");
const common_1 = require("./common");
const documentFilter_1 = require("./documentFilter");
const verifyTextDocumentChanges_1 = require("./verifyTextDocumentChanges");
let VSCodeWorkspace = class VSCodeWorkspace extends observableWorkspace_1.ObservableWorkspace {
    get _useAlternativeNotebookFormat() {
        return this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.UseAlternativeNESNotebookFormat, this._experimentationService)
            || this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.UseAlternativeNESNotebookFormat, this._experimentationService);
    }
    constructor(_workspaceService, _instaService, _configurationService, _experimentationService) {
        super();
        this._workspaceService = _workspaceService;
        this._instaService = _instaService;
        this._configurationService = _configurationService;
        this._experimentationService = _experimentationService;
        this._openDocuments = (0, observableInternal_1.observableValue)(this, []);
        this.openDocuments = this._openDocuments;
        this._store = new lifecycle_1.DisposableStore();
        this._filter = this._instaService.createInstance(documentFilter_1.DocumentFilter);
        this._markdownNotebookCells = new lazy_1.Lazy(() => {
            const markdownCellUris = new map_1.ResourceSet();
            vscode_1.workspace.notebookDocuments.forEach(doc => trackMarkdownCells(doc.getCells(), markdownCellUris));
            return markdownCellUris;
        });
        this._obsDocsByDocId = (0, observableInternal_1.derived)(this, reader => {
            const textDocs = this._textDocsWithShouldTrackFlag.read(reader);
            const obsDocs = textDocs.map(d => d.obsDoc.read(reader)).filter(types_1.isDefined);
            const map = new Map(obsDocs.map(d => [d.id, d]));
            const notebookDocs = this._notebookDocsWithShouldTrackFlag.read(reader);
            const obsNotebookDocs = notebookDocs.map(d => d.obsDoc.read(reader)).filter(types_1.isDefined);
            obsNotebookDocs.forEach(d => map.set(d.id, d));
            return map;
        });
        this._vscodeTextDocuments = getObservableTextDocumentList(this._useAlternativeNotebookFormat, this._markdownNotebookCells.value);
        this._textDocsWithShouldTrackFlag = (0, observableInternal_1.mapObservableArrayCached)(this, this._vscodeTextDocuments, (doc, store) => {
            const shouldTrack = (0, observableInternal_1.observableValue)(this, false);
            const updateShouldTrack = () => {
                // @ulugbekna: not sure if invoking `isCopilotIgnored` on every textDocument-edit event is a good idea
                // 	also not sure if we should be enforcing local copilot-ignore rules (vs only remote-exclusion rules)
                this._filter.isTrackingEnabled(doc).then(v => {
                    shouldTrack.set(v, undefined);
                }).catch(e => {
                    (0, errors_1.onUnexpectedError)(e);
                });
            };
            const obsDoc = (0, observableInternal_1.derived)(this, reader => {
                if (!shouldTrack.read(reader)) {
                    return undefined;
                }
                const documentId = documentId_1.DocumentId.create(doc.uri.toString());
                const openedTextEditor = vscode_1.window.visibleTextEditors.find(e => e.document.uri.toString() === doc.uri.toString());
                const document = new VSCodeObservableTextDocument(documentId, (0, common_1.stringValueFromDoc)(doc), doc.version, [], [], languageId_1.LanguageId.create(doc.languageId), [], doc);
                const selections = (0, arrays_1.coalesce)((openedTextEditor?.selections || []).map(s => document.toOffsetRange(doc, s)));
                const visibleRanges = (0, arrays_1.coalesce)((openedTextEditor?.visibleRanges || []).map(r => document.toOffsetRange(doc, r)));
                (0, observableInternal_1.transaction)(tx => {
                    document.selection.set(selections, tx);
                    document.visibleRanges.set(visibleRanges, tx);
                    document.diagnostics.set(this._createTextDocumentDiagnosticData(document), tx);
                });
                return document;
            }).recomputeInitiallyAndOnChange(store);
            updateShouldTrack();
            return {
                doc,
                updateShouldTrack,
                obsDoc,
            };
        });
        this._vscodeNotebookDocuments = this.getNotebookDocuments();
        this._altNotebookDocs = new WeakMap();
        this._notebookDocsWithShouldTrackFlag = (0, observableInternal_1.mapObservableArrayCached)(this, this._vscodeNotebookDocuments, (doc, store) => {
            const shouldTrack = (0, observableInternal_1.observableValue)(this, false);
            const updateShouldTrack = () => {
                // @ulugbekna: not sure if invoking `isCopilotIgnored` on every textDocument-edit event is a good idea
                // 	also not sure if we should be enforcing local copilot-ignore rules (vs only remote-exclusion rules)
                this._filter.isTrackingEnabled(doc).then(v => {
                    shouldTrack.set(v, undefined);
                }).catch(e => {
                    (0, errors_1.onUnexpectedError)(e);
                });
            };
            const obsDoc = (0, observableInternal_1.derived)(this, reader => {
                if (!shouldTrack.read(reader)) {
                    return undefined;
                }
                const altNotebook = this.getAltNotebookDocument(doc);
                const documentId = documentId_1.DocumentId.create(doc.uri.toString());
                const selections = this.getNotebookSelections(doc);
                const visibleRanges = this.getNotebookVisibleRanges(doc);
                const diagnostics = this._createNotebookDiagnosticData(altNotebook);
                const language = (0, languages_1.getLanguage)((0, helpers_1.getDefaultLanguage)(altNotebook.notebook)).languageId;
                const document = new VSCodeObservableNotebookDocument(documentId, (0, common_1.stringValueFromDoc)(altNotebook), doc.version, selections ?? [], visibleRanges ?? [], languageId_1.LanguageId.create(language), diagnostics, doc, altNotebook);
                return document;
            }).recomputeInitiallyAndOnChange(store);
            updateShouldTrack();
            return {
                doc,
                updateShouldTrack,
                obsDoc,
            };
        });
        this._obsDocsWithUpdateIgnored = (0, observableInternal_1.derived)(this, reader => {
            const docs = this._textDocsWithShouldTrackFlag.read(reader);
            const map = new Map(docs.map(d => [d.doc.uri.toString(), d]));
            const notebookDocs = this._notebookDocsWithShouldTrackFlag.read(reader);
            notebookDocs.forEach(d => {
                map.set(d.doc.uri.toString(), d);
                // Markdown cells will be treated as standalone text documents (old behaviour).
                d.doc.getCells().filter(cell => cell.kind === vscode_1.NotebookCellKind.Code).forEach(cell => map.set(cell.document.uri.toString(), d));
            });
            return map;
        });
        const config = this._configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.VerifyTextDocumentChanges, this._experimentationService);
        this._store.add((0, observableInternal_1.autorun)(reader => {
            if (config.read(reader)) {
                reader.store.add(this._instaService.createInstance(verifyTextDocumentChanges_1.VerifyTextDocumentChanges));
            }
        }));
        let lastDocs = new Map();
        this._store.add((0, observableInternal_1.autorun)(reader => {
            // Manually copy over the documents to get the delta
            const curDocs = this._obsDocsByDocId.read(reader);
            const diff = (0, collections_1.diffMaps)(lastDocs, curDocs);
            lastDocs = curDocs;
            this._openDocuments.set([...curDocs.values()], undefined, {
                added: diff.added,
                removed: diff.removed,
            });
        }));
        this._store.add(vscode_1.workspace.onDidChangeTextDocument(e => {
            const doc = this._getDocumentByDocumentAndUpdateShouldTrack(e.document.uri);
            if (!doc) {
                return;
            }
            if (doc instanceof VSCodeObservableTextDocument) {
                const edit = (0, common_1.editFromTextDocumentContentChangeEvents)(e.contentChanges);
                const editWithReason = new observableWorkspace_1.StringEditWithReason(edit.replacements, editReason_1.EditReason.create(e.detailedReason?.metadata));
                (0, observableInternal_1.transaction)(tx => {
                    doc.languageId.set(languageId_1.LanguageId.create(e.document.languageId), tx);
                    doc.value.set((0, common_1.stringValueFromDoc)(e.document), tx, editWithReason);
                    doc.version.set(e.document.version, tx);
                });
            }
            else {
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookCellChangeEdit)(doc.altNotebook, e.document, e.contentChanges);
                doc.altNotebook.applyCellChanges(e.document, e.contentChanges);
                const editWithReason = new observableWorkspace_1.StringEditWithReason(edit.replacements, editReason_1.EditReason.create(e.detailedReason?.metadata));
                (0, observableInternal_1.transaction)(tx => {
                    doc.value.set((0, common_1.stringValueFromDoc)(doc.altNotebook), tx, editWithReason);
                    doc.version.set(doc.notebook.version, tx);
                });
            }
        }));
        if (this._useAlternativeNotebookFormat) {
            this._store.add(vscode_1.workspace.onDidOpenNotebookDocument(e => trackMarkdownCells(e.getCells(), this._markdownNotebookCells.value)));
        }
        this._store.add(vscode_1.workspace.onDidChangeNotebookDocument(e => {
            const doc = this._getDocumentByDocumentAndUpdateShouldTrack(e.notebook.uri);
            if (!doc || !e.contentChanges.length || doc instanceof VSCodeObservableTextDocument) {
                return;
            }
            const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookChangeEdit)(doc.altNotebook, e.contentChanges);
            if (!edit) {
                return;
            }
            doc.altNotebook.applyNotebookChanges(e.contentChanges);
            const editWithReason = new observableWorkspace_1.StringEditWithReason(edit.replacements, editReason_1.EditReason.unknown);
            (0, observableInternal_1.transaction)(tx => {
                doc.value.set((0, common_1.stringValueFromDoc)(doc.altNotebook), tx, editWithReason);
                doc.version.set(doc.notebook.version, tx);
            });
            if (this._useAlternativeNotebookFormat) {
                e.contentChanges.map(c => c.removedCells).flat().forEach(c => {
                    this._markdownNotebookCells.value.delete(c.document.uri);
                });
                trackMarkdownCells(e.contentChanges.map(c => c.addedCells).flat(), this._markdownNotebookCells.value);
            }
        }));
        this._store.add(vscode_1.window.onDidChangeTextEditorSelection(e => {
            const doc = this._getDocumentByDocumentAndUpdateShouldTrack(e.textEditor.document.uri);
            if (!doc) {
                return;
            }
            const selections = doc instanceof VSCodeObservableTextDocument ?
                (0, arrays_1.coalesce)(e.selections.map(s => doc.toOffsetRange(e.textEditor.document, s))) :
                this.getNotebookSelections(doc.notebook, e.textEditor);
            doc.selection.set(selections, undefined);
        }));
        this._store.add(vscode_1.window.onDidChangeTextEditorVisibleRanges(e => {
            const doc = this._getDocumentByDocumentAndUpdateShouldTrack(e.textEditor.document.uri);
            if (!doc) {
                return;
            }
            const visibleRanges = doc instanceof VSCodeObservableTextDocument ?
                (0, arrays_1.coalesce)(e.visibleRanges.map(r => doc.toOffsetRange(e.textEditor.document, r))) :
                this.getNotebookVisibleRanges(doc.notebook);
            doc.visibleRanges.set(visibleRanges, undefined);
        }));
        this._store.add(vscode_1.languages.onDidChangeDiagnostics(e => {
            e.uris.forEach(uri => {
                const document = this._getDocumentByDocumentAndUpdateShouldTrack(uri);
                if (!document) {
                    return;
                }
                const diagnostics = document instanceof VSCodeObservableTextDocument ?
                    this._createTextDocumentDiagnosticData(document) :
                    this._createNotebookDiagnosticData(document.altNotebook);
                document.diagnostics.set(diagnostics, undefined);
            });
        }));
    }
    dispose() {
        this._store.dispose();
    }
    getNotebookDocuments() {
        if (!this._useAlternativeNotebookFormat) {
            return (0, observableInternal_1.observableValue)('', []);
        }
        return getNotebookDocuments();
    }
    getAltNotebookDocument(doc) {
        let altNotebook = this._altNotebookDocs.get(doc);
        if (!altNotebook) {
            altNotebook = (0, alternativeNotebookTextDocument_1.createAlternativeNotebookDocument)(doc, true);
            this._altNotebookDocs.set(doc, altNotebook);
        }
        return altNotebook;
    }
    getNotebookSelections(doc, activeCellEditor) {
        const altNotebook = this.getAltNotebookDocument(doc);
        const visibleTextEditors = new Map(vscode_1.window.visibleTextEditors.map(e => [e.document, e]));
        // As notebooks have multiple cells, and each cell can have its own selection,
        // We should focus on the active cell to determine the cursor position.
        const selectedCellRange = vscode_1.window.activeNotebookEditor?.selection;
        const selectedCell = activeCellEditor ? altNotebook.getCell(activeCellEditor.document) : (selectedCellRange && selectedCellRange.start < doc.cellCount ? doc.cellAt(selectedCellRange.start) : undefined);
        const selectedCellEditor = selectedCell ? visibleTextEditors.get(selectedCell.document) : undefined;
        // We only care about the active cell where cursor is, don't care about multi-cursor.
        // As the edits are to be performed around wher the cursor is.
        return (selectedCellEditor && selectedCell) ? altNotebook.toAltOffsetRange(selectedCell, selectedCellEditor.selections) : [];
    }
    getNotebookVisibleRanges(doc) {
        const altNotebook = this.getAltNotebookDocument(doc);
        const visibleTextEditors = new Map(vscode_1.window.visibleTextEditors.map(e => [e.document, e]));
        const cellTextEditors = (0, arrays_1.coalesce)(doc.getCells().map(cell => visibleTextEditors.has(cell.document) ? [cell, visibleTextEditors.get(cell.document)] : undefined));
        return cellTextEditors.flatMap(e => altNotebook.toAltOffsetRange(e[0], e[1].visibleRanges));
    }
    _getDocumentByDocumentAndUpdateShouldTrack(uri) {
        const internalDoc = this._getInternalDocument(uri);
        if (!internalDoc) {
            return undefined;
        }
        internalDoc.updateShouldTrack();
        return internalDoc.obsDoc.get();
    }
    _getInternalDocument(uri, reader) {
        const document = this._obsDocsWithUpdateIgnored.read(reader).get(uri.toString());
        return document;
    }
    _createTextDocumentDiagnosticData(document) {
        return vscode_1.languages.getDiagnostics(document.textDocument.uri).map(d => this._createDiagnosticData(d, document)).filter(types_1.isDefined);
    }
    _createDiagnosticData(diagnostic, doc) {
        return toDiagnosticData(diagnostic, doc.textDocument.uri, (range) => doc.toOffsetRange(doc.textDocument, range));
    }
    _createNotebookDiagnosticData(altNotebook) {
        return (0, arrays_1.coalesce)(altNotebook.notebook.getCells().flatMap(c => vscode_1.languages.getDiagnostics(c.document.uri).map(d => this._createNotebookCellDiagnosticData(d, altNotebook, c.document))));
    }
    _createNotebookCellDiagnosticData(diagnostic, altNotebook, doc) {
        const cell = altNotebook.getCell(doc);
        if (!cell) {
            return undefined;
        }
        return toDiagnosticData(diagnostic, altNotebook.notebook.uri, range => {
            const offsetRanges = altNotebook.toAltOffsetRange(cell, [range]);
            return offsetRanges.length ? offsetRanges[0] : undefined;
        });
    }
    /**
     * Returns undefined for documents that are not tracked (e.g. filtered out).
    */
    getDocumentByTextDocument(doc, reader) {
        this._store.assertNotDisposed();
        const internalDoc = this._getInternalDocument(doc.uri, reader);
        if (!internalDoc) {
            return undefined;
        }
        return internalDoc.obsDoc.get();
    }
    getWorkspaceRoot(documentId) {
        let uri = documentId.toUri();
        if (uri.scheme === network_1.Schemas.vscodeNotebookCell) {
            const notebook = (0, notebooks_1.findNotebook)(uri, this._workspaceService.notebookDocuments);
            if (notebook) {
                uri = notebook.uri;
            }
        }
        return vscode_1.workspace.getWorkspaceFolder(uri)?.uri;
    }
};
exports.VSCodeWorkspace = VSCodeWorkspace;
exports.VSCodeWorkspace = VSCodeWorkspace = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService)
], VSCodeWorkspace);
class AbstractVSCodeObservableDocument {
    constructor(id, value, versionId, selection, visibleRanges, languageId, diagnostics) {
        this.id = id;
        this.value = (0, observableInternal_1.observableValue)(this, value);
        this.version = (0, observableInternal_1.observableValue)(this, versionId);
        this.selection = (0, observableInternal_1.observableValue)(this, selection);
        this.visibleRanges = (0, observableInternal_1.observableValue)(this, visibleRanges);
        this.languageId = (0, observableInternal_1.observableValue)(this, languageId);
        this.diagnostics = (0, observableInternal_1.observableValue)(this, diagnostics);
    }
}
class VSCodeObservableTextDocument extends AbstractVSCodeObservableDocument {
    constructor(id, value, versionId, selection, visibleRanges, languageId, diagnostics, textDocument) {
        super(id, value, versionId, selection, visibleRanges, languageId, diagnostics);
        this.textDocument = textDocument;
    }
    fromOffsetRange(arg1, range) {
        let textDocument = this.textDocument;
        let offsetRange;
        if (arg1 instanceof offsetRange_1.OffsetRange) {
            offsetRange = arg1;
        }
        else if (range !== undefined) {
            textDocument = arg1;
            offsetRange = range;
        }
        if (textDocument !== this.textDocument) {
            throw new Error('TextDocument does not match the one of this observable document.');
        }
        if (!offsetRange) {
            throw new Error('OffsetRange is not defined.');
        }
        const result = new vscode_1.Range(textDocument.positionAt(offsetRange.start), textDocument.positionAt(offsetRange.endExclusive));
        if (arg1 instanceof offsetRange_1.OffsetRange) {
            return [[this.textDocument, result]];
        }
        else {
            return result;
        }
    }
    toOffsetRange(textDocument, range) {
        return new offsetRange_1.OffsetRange(textDocument.offsetAt(range.start), textDocument.offsetAt(range.end));
    }
    fromRange(arg1, range) {
        if (arg1 instanceof vscode_1.Range) {
            return [[this.textDocument, arg1]];
        }
        else if (range !== undefined) {
            if (arg1 !== this.textDocument) {
                throw new Error('TextDocument does not match the one of this observable document.');
            }
            return range;
        }
        else {
            return undefined;
        }
    }
    toRange(_textDocument, range) {
        return range;
    }
    async getCodeActions(offsetRange, itemResolveCount, token) {
        const range = this.fromOffsetRange(this.textDocument, offsetRange);
        if (!range) {
            return;
        }
        const actions = await (0, async_1.raceTimeout)((0, async_1.raceCancellation)(getQuickFixCodeActions(this.textDocument.uri, range, itemResolveCount), token), 1000);
        return actions?.map(action => toCodeActionData(action, this, range => this.toOffsetRange(this.textDocument, range)));
    }
}
class VSCodeObservableNotebookDocument extends AbstractVSCodeObservableDocument {
    constructor(id, value, versionId, selection, visibleRanges, languageId, diagnostics, notebook, altNotebook) {
        super(id, value, versionId, selection, visibleRanges, languageId, diagnostics);
        this.notebook = notebook;
        this.altNotebook = altNotebook;
    }
    fromOffsetRange(arg1, range) {
        if (arg1 instanceof offsetRange_1.OffsetRange) {
            return this.altNotebook.fromAltOffsetRange(arg1).map(r => [r[0].document, r[1]]);
        }
        else if (range !== undefined) {
            const cell = this.altNotebook.getCell(arg1);
            if (!cell) {
                return undefined;
            }
            const results = this.altNotebook.fromAltOffsetRange(range);
            const found = results.find(r => r[0].document === arg1);
            return found ? found[1] : undefined;
        }
        return undefined;
    }
    fromRange(arg1, range) {
        if (arg1 instanceof vscode_1.Range) {
            return this.altNotebook.fromAltRange(arg1).map(r => [r[0].document, r[1]]);
        }
        else if (range !== undefined) {
            const cell = this.altNotebook.getCell(arg1);
            if (!cell) {
                return undefined;
            }
            const results = this.altNotebook.fromAltRange(range);
            const found = results.find(r => r[0].document === arg1);
            return found ? found[1] : undefined;
        }
    }
    toOffsetRange(textDocument, range) {
        const cell = this.altNotebook.getCell(textDocument);
        if (!cell) {
            return undefined;
        }
        const offsetRanges = this.altNotebook.toAltOffsetRange(cell, [range]);
        return offsetRanges.length ? offsetRanges[0] : undefined;
    }
    toRange(textDocument, range) {
        const cell = this.altNotebook.getCell(textDocument);
        if (!cell) {
            return undefined;
        }
        const ranges = this.altNotebook.toAltRange(cell, [range]);
        return ranges.length > 0 ? ranges[0] : undefined;
    }
    async getCodeActions(offsetRange, itemResolveCount, token) {
        const cellRanges = this.fromOffsetRange(offsetRange);
        if (!cellRanges || cellRanges.length === 0) {
            return;
        }
        return Promise.all(cellRanges.map(async ([cellTextDocument, range]) => {
            const cell = this.altNotebook.getCell(cellTextDocument);
            if (!cell) {
                return undefined;
            }
            const actions = await (0, async_1.raceTimeout)((0, async_1.raceCancellation)(getQuickFixCodeActions(cellTextDocument.uri, range, itemResolveCount), token), 1000);
            return actions?.map(action => toCodeActionData(action, this, (range) => {
                const offsetRanges = this.altNotebook.toAltOffsetRange(cell, [range]);
                return offsetRanges.length ? offsetRanges[0] : undefined;
            }));
        })).then(results => (0, arrays_1.coalesce)(results.flat()));
    }
}
function getObservableTextDocumentList(excludeNotebookCells, markdownCellUris) {
    return (0, observableInternal_1.observableFromEvent)(undefined, e => {
        const d1 = vscode_1.workspace.onDidOpenTextDocument(e);
        const d2 = vscode_1.workspace.onDidCloseTextDocument(e);
        return {
            dispose: () => {
                d1.dispose();
                d2.dispose();
            }
        };
        // If we're meant to exclude notebook cells, we will still include the markdown cells as separate documents.
        // Thats because markdown cells will be treated as standalone text documents in the editor.
    }, () => excludeNotebookCells ? vscode_1.workspace.textDocuments.filter(doc => doc.uri.scheme !== network_1.Schemas.vscodeNotebookCell || markdownCellUris.has(doc.uri)) : vscode_1.workspace.textDocuments);
}
function getNotebookDocuments() {
    return (0, observableInternal_1.observableFromEvent)(undefined, e => {
        const d1 = vscode_1.workspace.onDidOpenNotebookDocument(e);
        const d2 = vscode_1.workspace.onDidCloseNotebookDocument(e);
        return {
            dispose: () => {
                d1.dispose();
                d2.dispose();
            }
        };
    }, () => vscode_1.workspace.notebookDocuments);
}
function trackMarkdownCells(cells, resources) {
    cells.forEach(c => {
        if (c.kind === vscode_1.NotebookCellKind.Markup) {
            resources.add(c.document.uri);
        }
    });
}
function toDiagnosticData(diagnostic, uri, translateRange) {
    if (!diagnostic.source || (diagnostic.severity !== vscode_1.DiagnosticSeverity.Error && diagnostic.severity !== vscode_1.DiagnosticSeverity.Warning)) {
        return undefined;
    }
    const range = translateRange(diagnostic.range);
    if (!range) {
        return undefined;
    }
    return new diagnosticData_1.DiagnosticData(uri, diagnostic.message, diagnostic.severity === vscode_1.DiagnosticSeverity.Error ? 'error' : 'warning', range, diagnostic.code && !(typeof diagnostic.code === 'number') && !(typeof diagnostic.code === 'string') ? diagnostic.code.value : diagnostic.code, diagnostic.source);
}
function toCodeActionData(codeAction, workspaceDocument, translateRange) {
    const uri = workspaceDocument.id.toUri();
    const diagnostics = (0, arrays_1.coalesce)((codeAction.diagnostics || []).map(d => toDiagnosticData(d, uri, translateRange))).concat(getCommandDiagnostics(codeAction, uri, translateRange));
    // remove no-op edits
    let documentEdits = getDocumentEdits(codeAction, workspaceDocument);
    if (documentEdits) {
        const documentContent = workspaceDocument.value.get();
        documentEdits = documentEdits.filter(edit => documentContent.getValueOfRange(edit.range) !== edit.text);
    }
    const codeActionData = new codeActionData_1.CodeActionData(codeAction.title, diagnostics, documentEdits);
    return codeActionData;
}
function getCommandDiagnostics(codeAction, uri, translateRange) {
    const commandArgs = codeAction.command?.arguments || [];
    return (0, arrays_1.coalesce)(commandArgs.map(arg => {
        if (arg && typeof arg === 'object' && 'diagnostic' in arg) {
            const diagnostic = arg.diagnostic;
            // @benibenj Can we not check `diagnostic instanceOf vscode.Diagnostic?
            if (diagnostic && typeof diagnostic === 'object' && 'range' in diagnostic && 'message' in diagnostic && 'severity' in diagnostic) {
                return toDiagnosticData(diagnostic, uri, translateRange);
            }
        }
    }));
}
function getDocumentEdits(codeAction, workspaceDocument) {
    const edit = codeAction.edit;
    if (!edit) {
        return undefined;
    }
    if (workspaceDocument instanceof VSCodeObservableTextDocument) {
        return edit.get(workspaceDocument.id.toUri()).map(e => (0, translations_1.toInternalTextEdit)(e.range, e.newText));
    }
    else if (workspaceDocument instanceof VSCodeObservableNotebookDocument) {
        const edits = (0, arrays_1.coalesce)(workspaceDocument.notebook.getCells().flatMap(cell => edit.get(cell.document.uri).map(e => {
            const range = workspaceDocument.toRange(cell.document, e.range);
            return range ? (0, translations_1.toInternalTextEdit)(range, e.newText) : undefined;
        })));
        return edits.length ? edits : undefined;
    }
}
async function getQuickFixCodeActions(uri, range, itemResolveCount) {
    return (0, async_1.asPromise)(() => vscode_1.commands.executeCommand('vscode.executeCodeActionProvider', uri, range, vscode_1.CodeActionKind.QuickFix.value, itemResolveCount));
}
//# sourceMappingURL=vscodeWorkspace.js.map