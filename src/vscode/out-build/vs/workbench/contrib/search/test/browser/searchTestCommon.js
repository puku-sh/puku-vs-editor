/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { NotebookEditorWidgetService } from '../../../notebook/browser/services/notebookEditorServiceImpl.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { TestEditorGroupsService, TestEditorService } from '../../../../test/browser/workbenchTestServices.js';
export function createFileUriFromPathFromRoot(path) {
    const rootName = getRootName();
    if (path) {
        return URI.file(`${rootName}${path}`);
    }
    else {
        if (isWindows) {
            return URI.file(`${rootName}/`);
        }
        else {
            return URI.file(rootName);
        }
    }
}
export function getRootName() {
    if (isWindows) {
        return 'c:';
    }
    else {
        return '';
    }
}
export function stubModelService(instantiationService, addDisposable) {
    instantiationService.stub(IThemeService, new TestThemeService());
    const config = new TestConfigurationService();
    config.setUserConfiguration('search', { searchOnType: true });
    instantiationService.stub(IConfigurationService, config);
    const modelService = instantiationService.createInstance(ModelService);
    addDisposable(modelService);
    return modelService;
}
export function stubNotebookEditorService(instantiationService, addDisposable) {
    instantiationService.stub(IEditorGroupsService, new TestEditorGroupsService());
    instantiationService.stub(IContextKeyService, new MockContextKeyService());
    const es = new TestEditorService();
    addDisposable(es);
    instantiationService.stub(IEditorService, es);
    const notebookEditorWidgetService = instantiationService.createInstance(NotebookEditorWidgetService);
    addDisposable(notebookEditorWidgetService);
    return notebookEditorWidgetService;
}
export function addToSearchResult(searchResult, allRaw, searchInstanceID = '') {
    searchResult.add(allRaw, searchInstanceID, false);
}
//# sourceMappingURL=searchTestCommon.js.map