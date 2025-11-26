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
var TextFileContentProvider_1;
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { InputFocusedContextKey } from '../../../../platform/contextkey/common/contextkeys.js';
import { Event } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
/**
 * Explorer viewlet id.
 */
export const VIEWLET_ID = 'workbench.view.explorer';
/**
 * Explorer file view id.
 */
export const VIEW_ID = 'workbench.explorer.fileView';
/**
 * Context Keys to use with keybindings for the Explorer and Open Editors view
 */
export const ExplorerViewletVisibleContext = new RawContextKey('explorerViewletVisible', true, { type: 'boolean', description: localize(8990, null) });
export const FoldersViewVisibleContext = new RawContextKey('foldersViewVisible', true, { type: 'boolean', description: localize(8991, null) });
export const ExplorerFolderContext = new RawContextKey('explorerResourceIsFolder', false, { type: 'boolean', description: localize(8992, null) });
export const ExplorerResourceReadonlyContext = new RawContextKey('explorerResourceReadonly', false, { type: 'boolean', description: localize(8993, null) });
export const ExplorerResourceWritableContext = ExplorerResourceReadonlyContext.toNegated();
export const ExplorerResourceParentReadOnlyContext = new RawContextKey('explorerResourceParentReadonly', false, { type: 'boolean', description: localize(8994, null) });
/**
 * Comma separated list of editor ids that can be used for the selected explorer resource.
 */
export const ExplorerResourceAvailableEditorIdsContext = new RawContextKey('explorerResourceAvailableEditorIds', '');
export const ExplorerRootContext = new RawContextKey('explorerResourceIsRoot', false, { type: 'boolean', description: localize(8995, null) });
export const ExplorerResourceCut = new RawContextKey('explorerResourceCut', false, { type: 'boolean', description: localize(8996, null) });
export const ExplorerResourceMoveableToTrash = new RawContextKey('explorerResourceMoveableToTrash', false, { type: 'boolean', description: localize(8997, null) });
export const FilesExplorerFocusedContext = new RawContextKey('filesExplorerFocus', true, { type: 'boolean', description: localize(8998, null) });
export const OpenEditorsFocusedContext = new RawContextKey('openEditorsFocus', true, { type: 'boolean', description: localize(8999, null) });
export const ExplorerFocusedContext = new RawContextKey('explorerViewletFocus', true, { type: 'boolean', description: localize(9000, null) });
export const ExplorerFindProviderActive = new RawContextKey('explorerFindProviderActive', false, { type: 'boolean', description: localize(9001, null) });
// compressed nodes
export const ExplorerCompressedFocusContext = new RawContextKey('explorerViewletCompressedFocus', true, { type: 'boolean', description: localize(9002, null) });
export const ExplorerCompressedFirstFocusContext = new RawContextKey('explorerViewletCompressedFirstFocus', true, { type: 'boolean', description: localize(9003, null) });
export const ExplorerCompressedLastFocusContext = new RawContextKey('explorerViewletCompressedLastFocus', true, { type: 'boolean', description: localize(9004, null) });
export const ViewHasSomeCollapsibleRootItemContext = new RawContextKey('viewHasSomeCollapsibleItem', false, { type: 'boolean', description: localize(9005, null) });
export const FilesExplorerFocusCondition = ContextKeyExpr.and(FoldersViewVisibleContext, FilesExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
export const ExplorerFocusCondition = ContextKeyExpr.and(FoldersViewVisibleContext, ExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
/**
 * Text file editor id.
 */
export const TEXT_FILE_EDITOR_ID = 'workbench.editors.files.textFileEditor';
/**
 * File editor input id.
 */
export const FILE_EDITOR_INPUT_ID = 'workbench.editors.files.fileEditorInput';
/**
 * Binary file editor id.
 */
export const BINARY_FILE_EDITOR_ID = 'workbench.editors.files.binaryFileEditor';
/**
 * Language identifier for binary files opened as text.
 */
export const BINARY_TEXT_FILE_MODE = 'code-text-binary';
export var SortOrder;
(function (SortOrder) {
    SortOrder["Default"] = "default";
    SortOrder["Mixed"] = "mixed";
    SortOrder["FilesFirst"] = "filesFirst";
    SortOrder["Type"] = "type";
    SortOrder["Modified"] = "modified";
    SortOrder["FoldersNestsFiles"] = "foldersNestsFiles";
})(SortOrder || (SortOrder = {}));
export var UndoConfirmLevel;
(function (UndoConfirmLevel) {
    UndoConfirmLevel["Verbose"] = "verbose";
    UndoConfirmLevel["Default"] = "default";
    UndoConfirmLevel["Light"] = "light";
})(UndoConfirmLevel || (UndoConfirmLevel = {}));
export var LexicographicOptions;
(function (LexicographicOptions) {
    LexicographicOptions["Default"] = "default";
    LexicographicOptions["Upper"] = "upper";
    LexicographicOptions["Lower"] = "lower";
    LexicographicOptions["Unicode"] = "unicode";
})(LexicographicOptions || (LexicographicOptions = {}));
let TextFileContentProvider = TextFileContentProvider_1 = class TextFileContentProvider extends Disposable {
    constructor(textFileService, fileService, languageService, modelService) {
        super();
        this.textFileService = textFileService;
        this.fileService = fileService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.fileWatcherDisposable = this._register(new MutableDisposable());
    }
    static async open(resource, scheme, label, editorService, options) {
        await editorService.openEditor({
            original: { resource: TextFileContentProvider_1.resourceToTextFile(scheme, resource) },
            modified: { resource },
            label,
            options
        });
    }
    static resourceToTextFile(scheme, resource) {
        return resource.with({ scheme, query: JSON.stringify({ scheme: resource.scheme, query: resource.query }) });
    }
    static textFileToResource(resource) {
        const { scheme, query } = JSON.parse(resource.query);
        return resource.with({ scheme, query });
    }
    async provideTextContent(resource) {
        if (!resource.query) {
            // We require the URI to use the `query` to transport the original scheme and query
            // as done by `resourceToTextFile`
            return null;
        }
        const savedFileResource = TextFileContentProvider_1.textFileToResource(resource);
        // Make sure our text file is resolved up to date
        const codeEditorModel = await this.resolveEditorModel(resource);
        // Make sure to keep contents up to date when it changes
        if (!this.fileWatcherDisposable.value) {
            const disposables = new DisposableStore();
            this.fileWatcherDisposable.value = disposables;
            disposables.add(this.fileService.onDidFilesChange(changes => {
                if (changes.contains(savedFileResource, 0 /* FileChangeType.UPDATED */)) {
                    this.resolveEditorModel(resource, false /* do not create if missing */); // update model when resource changes
                }
            }));
            if (codeEditorModel) {
                disposables.add(Event.once(codeEditorModel.onWillDispose)(() => this.fileWatcherDisposable.clear()));
            }
        }
        return codeEditorModel;
    }
    async resolveEditorModel(resource, createAsNeeded = true) {
        const savedFileResource = TextFileContentProvider_1.textFileToResource(resource);
        const content = await this.textFileService.readStream(savedFileResource);
        let codeEditorModel = this.modelService.getModel(resource);
        if (codeEditorModel) {
            this.modelService.updateModel(codeEditorModel, content.value);
        }
        else if (createAsNeeded) {
            const textFileModel = this.modelService.getModel(savedFileResource);
            let languageSelector;
            if (textFileModel) {
                languageSelector = this.languageService.createById(textFileModel.getLanguageId());
            }
            else {
                languageSelector = this.languageService.createByFilepathOrFirstLine(savedFileResource);
            }
            codeEditorModel = this.modelService.createModel(content.value, languageSelector, resource);
        }
        return codeEditorModel;
    }
};
TextFileContentProvider = TextFileContentProvider_1 = __decorate([
    __param(0, ITextFileService),
    __param(1, IFileService),
    __param(2, ILanguageService),
    __param(3, IModelService)
], TextFileContentProvider);
export { TextFileContentProvider };
export class OpenEditor {
    static { this.COUNTER = 0; }
    constructor(_editor, _group) {
        this._editor = _editor;
        this._group = _group;
        this.id = OpenEditor.COUNTER++;
    }
    get editor() {
        return this._editor;
    }
    get group() {
        return this._group;
    }
    get groupId() {
        return this._group.id;
    }
    getId() {
        return `openeditor:${this.groupId}:${this.id}`;
    }
    isPreview() {
        return !this._group.isPinned(this.editor);
    }
    isSticky() {
        return this._group.isSticky(this.editor);
    }
    getResource() {
        return EditorResourceAccessor.getOriginalUri(this.editor, { supportSideBySide: SideBySideEditor.PRIMARY });
    }
}
//# sourceMappingURL=files.js.map