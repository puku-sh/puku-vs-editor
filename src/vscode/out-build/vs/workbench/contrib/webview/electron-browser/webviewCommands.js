/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
export class OpenWebviewDeveloperToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.webview.openDeveloperTools',
            title: nls.localize2(14296, "Open Webview Developer Tools"),
            category: Categories.Developer,
            metadata: {
                description: nls.localize(14294, null)
            },
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        // eslint-disable-next-line no-restricted-syntax
        const iframeWebviewElements = getActiveWindow().document.querySelectorAll('iframe.webview.ready');
        if (iframeWebviewElements.length) {
            console.info(nls.localize(14295, null));
            nativeHostService.openDevTools();
        }
    }
}
//# sourceMappingURL=webviewCommands.js.map