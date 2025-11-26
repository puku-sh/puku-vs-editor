/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const INativeBrowserElementsService = createDecorator('nativeBrowserElementsService');
export var BrowserType;
(function (BrowserType) {
    BrowserType["SimpleBrowser"] = "simpleBrowser";
    BrowserType["LiveServer"] = "liveServer";
})(BrowserType || (BrowserType = {}));
//# sourceMappingURL=browserElements.js.map