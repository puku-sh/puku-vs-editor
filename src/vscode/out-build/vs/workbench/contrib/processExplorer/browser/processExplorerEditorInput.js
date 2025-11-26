/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
const processExplorerEditorIcon = registerIcon('process-explorer-editor-label-icon', Codicon.serverProcess, localize(11137, null));
export class ProcessExplorerEditorInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = ProcessExplorerEditorInput.RESOURCE;
    }
    static { this.ID = 'workbench.editor.processExplorer'; }
    static { this.RESOURCE = URI.from({
        scheme: 'process-explorer',
        path: 'default'
    }); }
    static get instance() {
        if (!ProcessExplorerEditorInput._instance || ProcessExplorerEditorInput._instance.isDisposed()) {
            ProcessExplorerEditorInput._instance = new ProcessExplorerEditorInput();
        }
        return ProcessExplorerEditorInput._instance;
    }
    get typeId() { return ProcessExplorerEditorInput.ID; }
    get editorId() { return ProcessExplorerEditorInput.ID; }
    get capabilities() { return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */; }
    getName() {
        return localize(11138, null);
    }
    getIcon() {
        return processExplorerEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof ProcessExplorerEditorInput;
    }
}
//# sourceMappingURL=processExplorerEditorInput.js.map