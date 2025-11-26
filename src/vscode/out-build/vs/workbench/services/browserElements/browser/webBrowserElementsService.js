/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserElementsService } from './browserElementsService.js';
class WebBrowserElementsService {
    constructor() { }
    async getElementData(rect, token) {
        throw new Error('Not implemented');
    }
    startDebugSession(token, browserType) {
        throw new Error('Not implemented');
    }
}
registerSingleton(IBrowserElementsService, WebBrowserElementsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=webBrowserElementsService.js.map