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
var ResourceContextKey_1;
import { DisposableStore } from '../../base/common/lifecycle.js';
import { localize } from '../../nls.js';
import { IContextKeyService, RawContextKey } from '../../platform/contextkey/common/contextkey.js';
import { basename, dirname, extname, isEqual } from '../../base/common/resources.js';
import { ILanguageService } from '../../editor/common/languages/language.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IModelService } from '../../editor/common/services/model.js';
import { Schemas } from '../../base/common/network.js';
import { DEFAULT_EDITOR_ASSOCIATION } from './editor.js';
import { DiffEditorInput } from './editor/diffEditorInput.js';
//#region < --- Workbench --- >
export const WorkbenchStateContext = new RawContextKey('workbenchState', undefined, { type: 'string', description: localize(4380, null) });
export const WorkspaceFolderCountContext = new RawContextKey('workspaceFolderCount', 0, localize(4381, null));
export const OpenFolderWorkspaceSupportContext = new RawContextKey('openFolderWorkspaceSupport', true, true);
export const EnterMultiRootWorkspaceSupportContext = new RawContextKey('enterMultiRootWorkspaceSupport', true, true);
export const EmptyWorkspaceSupportContext = new RawContextKey('emptyWorkspaceSupport', true, true);
export const DirtyWorkingCopiesContext = new RawContextKey('dirtyWorkingCopies', false, localize(4382, null));
export const RemoteNameContext = new RawContextKey('remoteName', '', localize(4383, null));
export const VirtualWorkspaceContext = new RawContextKey('virtualWorkspace', '', localize(4384, null));
export const TemporaryWorkspaceContext = new RawContextKey('temporaryWorkspace', false, localize(4385, null));
export const HasWebFileSystemAccess = new RawContextKey('hasWebFileSystemAccess', false, true); // Support for FileSystemAccess web APIs (https://wicg.github.io/file-system-access)
export const EmbedderIdentifierContext = new RawContextKey('embedderIdentifier', undefined, localize(4386, null));
export const InAutomationContext = new RawContextKey('inAutomation', false, localize(4387, null));
//#endregion
//#region < --- Window --- >
export const IsMainWindowFullscreenContext = new RawContextKey('isFullscreen', false, localize(4388, null));
export const IsAuxiliaryWindowFocusedContext = new RawContextKey('isAuxiliaryWindowFocusedContext', false, localize(4389, null));
export const IsWindowAlwaysOnTopContext = new RawContextKey('isWindowAlwaysOnTop', false, localize(4390, null));
export const IsAuxiliaryWindowContext = new RawContextKey('isAuxiliaryWindow', false, localize(4391, null));
//#endregion
//#region < --- Editor --- >
// Editor State Context Keys
export const ActiveEditorDirtyContext = new RawContextKey('activeEditorIsDirty', false, localize(4392, null));
export const ActiveEditorPinnedContext = new RawContextKey('activeEditorIsNotPreview', false, localize(4393, null));
export const ActiveEditorFirstInGroupContext = new RawContextKey('activeEditorIsFirstInGroup', false, localize(4394, null));
export const ActiveEditorLastInGroupContext = new RawContextKey('activeEditorIsLastInGroup', false, localize(4395, null));
export const ActiveEditorStickyContext = new RawContextKey('activeEditorIsPinned', false, localize(4396, null));
export const ActiveEditorReadonlyContext = new RawContextKey('activeEditorIsReadonly', false, localize(4397, null));
export const ActiveCompareEditorCanSwapContext = new RawContextKey('activeCompareEditorCanSwap', false, localize(4398, null));
export const ActiveEditorCanToggleReadonlyContext = new RawContextKey('activeEditorCanToggleReadonly', true, localize(4399, null));
export const ActiveEditorCanRevertContext = new RawContextKey('activeEditorCanRevert', false, localize(4400, null));
export const ActiveEditorCanSplitInGroupContext = new RawContextKey('activeEditorCanSplitInGroup', true);
// Editor Kind Context Keys
export const ActiveEditorContext = new RawContextKey('activeEditor', null, { type: 'string', description: localize(4401, null) });
export const ActiveEditorAvailableEditorIdsContext = new RawContextKey('activeEditorAvailableEditorIds', '', localize(4402, null));
export const TextCompareEditorVisibleContext = new RawContextKey('textCompareEditorVisible', false, localize(4403, null));
export const TextCompareEditorActiveContext = new RawContextKey('textCompareEditorActive', false, localize(4404, null));
export const SideBySideEditorActiveContext = new RawContextKey('sideBySideEditorActive', false, localize(4405, null));
// Editor Group Context Keys
export const EditorGroupEditorsCountContext = new RawContextKey('groupEditorsCount', 0, localize(4406, null));
export const ActiveEditorGroupEmptyContext = new RawContextKey('activeEditorGroupEmpty', false, localize(4407, null));
export const ActiveEditorGroupIndexContext = new RawContextKey('activeEditorGroupIndex', 0, localize(4408, null));
export const ActiveEditorGroupLastContext = new RawContextKey('activeEditorGroupLast', false, localize(4409, null));
export const ActiveEditorGroupLockedContext = new RawContextKey('activeEditorGroupLocked', false, localize(4410, null));
export const MultipleEditorGroupsContext = new RawContextKey('multipleEditorGroups', false, localize(4411, null));
export const SingleEditorGroupsContext = MultipleEditorGroupsContext.toNegated();
export const MultipleEditorsSelectedInGroupContext = new RawContextKey('multipleEditorsSelectedInGroup', false, localize(4412, null));
export const TwoEditorsSelectedInGroupContext = new RawContextKey('twoEditorsSelectedInGroup', false, localize(4413, null));
export const SelectedEditorsInGroupFileOrUntitledResourceContextKey = new RawContextKey('SelectedEditorsInGroupFileOrUntitledResourceContextKey', true, localize(4414, null));
// Editor Part Context Keys
export const EditorPartMultipleEditorGroupsContext = new RawContextKey('editorPartMultipleEditorGroups', false, localize(4415, null));
export const EditorPartSingleEditorGroupsContext = EditorPartMultipleEditorGroupsContext.toNegated();
export const EditorPartMaximizedEditorGroupContext = new RawContextKey('editorPartMaximizedEditorGroup', false, localize(4416, null));
// Editor Layout Context Keys
export const EditorsVisibleContext = new RawContextKey('editorIsOpen', false, localize(4417, null));
export const InEditorZenModeContext = new RawContextKey('inZenMode', false, localize(4418, null));
export const IsMainEditorCenteredLayoutContext = new RawContextKey('isCenteredLayout', false, localize(4419, null));
export const SplitEditorsVertically = new RawContextKey('splitEditorsVertically', false, localize(4420, null));
export const MainEditorAreaVisibleContext = new RawContextKey('mainEditorAreaVisible', true, localize(4421, null));
export const EditorTabsVisibleContext = new RawContextKey('editorTabsVisible', true, localize(4422, null));
//#endregion
//#region < --- Side Bar --- >
export const SideBarVisibleContext = new RawContextKey('sideBarVisible', false, localize(4423, null));
export const SidebarFocusContext = new RawContextKey('sideBarFocus', false, localize(4424, null));
export const ActiveViewletContext = new RawContextKey('activeViewlet', '', localize(4425, null));
//#endregion
//#region < --- Status Bar --- >
export const StatusBarFocused = new RawContextKey('statusBarFocused', false, localize(4426, null));
//#endregion
//#region < --- Title Bar --- >
export const TitleBarStyleContext = new RawContextKey('titleBarStyle', 'custom', localize(4427, null));
export const TitleBarVisibleContext = new RawContextKey('titleBarVisible', false, localize(4428, null));
export const IsCompactTitleBarContext = new RawContextKey('isCompactTitleBar', false, localize(4429, null));
//#endregion
//#region < --- Banner --- >
export const BannerFocused = new RawContextKey('bannerFocused', false, localize(4430, null));
//#endregion
//#region < --- Notifications --- >
export const NotificationFocusedContext = new RawContextKey('notificationFocus', true, localize(4431, null));
export const NotificationsCenterVisibleContext = new RawContextKey('notificationCenterVisible', false, localize(4432, null));
export const NotificationsToastsVisibleContext = new RawContextKey('notificationToastsVisible', false, localize(4433, null));
//#endregion
//#region < --- Auxiliary Bar --- >
export const ActiveAuxiliaryContext = new RawContextKey('activeAuxiliary', '', localize(4434, null));
export const AuxiliaryBarFocusContext = new RawContextKey('auxiliaryBarFocus', false, localize(4435, null));
export const AuxiliaryBarVisibleContext = new RawContextKey('auxiliaryBarVisible', false, localize(4436, null));
export const AuxiliaryBarMaximizedContext = new RawContextKey('auxiliaryBarMaximized', false, localize(4437, null));
//#endregion
//#region < --- Panel --- >
export const ActivePanelContext = new RawContextKey('activePanel', '', localize(4438, null));
export const PanelFocusContext = new RawContextKey('panelFocus', false, localize(4439, null));
export const PanelPositionContext = new RawContextKey('panelPosition', 'bottom', localize(4440, null));
export const PanelAlignmentContext = new RawContextKey('panelAlignment', 'center', localize(4441, null));
export const PanelVisibleContext = new RawContextKey('panelVisible', false, localize(4442, null));
export const PanelMaximizedContext = new RawContextKey('panelMaximized', false, localize(4443, null));
//#endregion
//#region < --- Views --- >
export const FocusedViewContext = new RawContextKey('focusedView', '', localize(4444, null));
export function getVisbileViewContextKey(viewId) { return `view.${viewId}.visible`; }
//#endregion
//#region < --- Resources --- >
let ResourceContextKey = class ResourceContextKey {
    static { ResourceContextKey_1 = this; }
    // NOTE: DO NOT CHANGE THE DEFAULT VALUE TO ANYTHING BUT
    // UNDEFINED! IT IS IMPORTANT THAT DEFAULTS ARE INHERITED
    // FROM THE PARENT CONTEXT AND ONLY UNDEFINED DOES THIS
    static { this.Scheme = new RawContextKey('resourceScheme', undefined, { type: 'string', description: localize(4445, null) }); }
    static { this.Filename = new RawContextKey('resourceFilename', undefined, { type: 'string', description: localize(4446, null) }); }
    static { this.Dirname = new RawContextKey('resourceDirname', undefined, { type: 'string', description: localize(4447, null) }); }
    static { this.Path = new RawContextKey('resourcePath', undefined, { type: 'string', description: localize(4448, null) }); }
    static { this.LangId = new RawContextKey('resourceLangId', undefined, { type: 'string', description: localize(4449, null) }); }
    static { this.Resource = new RawContextKey('resource', undefined, { type: 'URI', description: localize(4450, null) }); }
    static { this.Extension = new RawContextKey('resourceExtname', undefined, { type: 'string', description: localize(4451, null) }); }
    static { this.HasResource = new RawContextKey('resourceSet', undefined, { type: 'boolean', description: localize(4452, null) }); }
    static { this.IsFileSystemResource = new RawContextKey('isFileSystemResource', undefined, { type: 'boolean', description: localize(4453, null) }); }
    constructor(_contextKeyService, _fileService, _languageService, _modelService) {
        this._contextKeyService = _contextKeyService;
        this._fileService = _fileService;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._disposables = new DisposableStore();
        this._schemeKey = ResourceContextKey_1.Scheme.bindTo(this._contextKeyService);
        this._filenameKey = ResourceContextKey_1.Filename.bindTo(this._contextKeyService);
        this._dirnameKey = ResourceContextKey_1.Dirname.bindTo(this._contextKeyService);
        this._pathKey = ResourceContextKey_1.Path.bindTo(this._contextKeyService);
        this._langIdKey = ResourceContextKey_1.LangId.bindTo(this._contextKeyService);
        this._resourceKey = ResourceContextKey_1.Resource.bindTo(this._contextKeyService);
        this._extensionKey = ResourceContextKey_1.Extension.bindTo(this._contextKeyService);
        this._hasResource = ResourceContextKey_1.HasResource.bindTo(this._contextKeyService);
        this._isFileSystemResource = ResourceContextKey_1.IsFileSystemResource.bindTo(this._contextKeyService);
        this._disposables.add(_fileService.onDidChangeFileSystemProviderRegistrations(() => {
            const resource = this.get();
            this._isFileSystemResource.set(Boolean(resource && _fileService.hasProvider(resource)));
        }));
        this._disposables.add(_modelService.onModelAdded(model => {
            if (isEqual(model.uri, this.get())) {
                this._setLangId();
            }
        }));
        this._disposables.add(_modelService.onModelLanguageChanged(e => {
            if (isEqual(e.model.uri, this.get())) {
                this._setLangId();
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    _setLangId() {
        const value = this.get();
        if (!value) {
            this._langIdKey.set(null);
            return;
        }
        const langId = this._modelService.getModel(value)?.getLanguageId() ?? this._languageService.guessLanguageIdByFilepathOrFirstLine(value);
        this._langIdKey.set(langId);
    }
    set(value) {
        value = value ?? undefined;
        if (isEqual(this._value, value)) {
            return;
        }
        this._value = value;
        this._contextKeyService.bufferChangeEvents(() => {
            this._resourceKey.set(value ? value.toString() : null);
            this._schemeKey.set(value ? value.scheme : null);
            this._filenameKey.set(value ? basename(value) : null);
            this._dirnameKey.set(value ? this.uriToPath(dirname(value)) : null);
            this._pathKey.set(value ? this.uriToPath(value) : null);
            this._setLangId();
            this._extensionKey.set(value ? extname(value) : null);
            this._hasResource.set(Boolean(value));
            this._isFileSystemResource.set(value ? this._fileService.hasProvider(value) : false);
        });
    }
    uriToPath(uri) {
        if (uri.scheme === Schemas.file) {
            return uri.fsPath;
        }
        return uri.path;
    }
    reset() {
        this._value = undefined;
        this._contextKeyService.bufferChangeEvents(() => {
            this._resourceKey.reset();
            this._schemeKey.reset();
            this._filenameKey.reset();
            this._dirnameKey.reset();
            this._pathKey.reset();
            this._langIdKey.reset();
            this._extensionKey.reset();
            this._hasResource.reset();
            this._isFileSystemResource.reset();
        });
    }
    get() {
        return this._value;
    }
};
ResourceContextKey = ResourceContextKey_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IFileService),
    __param(2, ILanguageService),
    __param(3, IModelService)
], ResourceContextKey);
export { ResourceContextKey };
//#endregion
export function applyAvailableEditorIds(contextKey, editor, editorResolverService) {
    if (!editor) {
        contextKey.set('');
        return;
    }
    const editors = getAvailableEditorIds(editor, editorResolverService);
    contextKey.set(editors.join(','));
}
function getAvailableEditorIds(editor, editorResolverService) {
    // Non text editor untitled files cannot be easily serialized between
    // extensions so instead we disable this context key to prevent common
    // commands that act on the active editor.
    if (editor.resource?.scheme === Schemas.untitled && editor.editorId !== DEFAULT_EDITOR_ASSOCIATION.id) {
        return [];
    }
    // Diff editors. The original and modified resources of a diff editor
    // *should* be the same, but calculate the set intersection just to be safe.
    if (editor instanceof DiffEditorInput) {
        const original = getAvailableEditorIds(editor.original, editorResolverService);
        const modified = new Set(getAvailableEditorIds(editor.modified, editorResolverService));
        return original.filter(editor => modified.has(editor));
    }
    // Normal editors.
    if (editor.resource) {
        return editorResolverService.getEditors(editor.resource).map(editor => editor.id);
    }
    return [];
}
//# sourceMappingURL=contextkeys.js.map