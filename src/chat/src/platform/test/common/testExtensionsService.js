"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestExtensionsService = void 0;
const event_1 = require("../../../util/vs/base/common/event");
class TestExtensionsService {
    addExtension(extension) {
        this._extensions.set(extension.id, extension);
    }
    constructor(extensions = []) {
        this._extensions = new Map();
        this.onDidChange = event_1.Event.None;
        for (const extension of extensions) {
            this._extensions.set(extension.id, extension);
        }
    }
    getExtension(extensionId, includeDifferentExtensionHosts) {
        return this._extensions.get(extensionId);
    }
    get allAcrossExtensionHosts() {
        return Array.from(this._extensions.values());
    }
    get all() {
        return this.allAcrossExtensionHosts;
    }
}
exports.TestExtensionsService = TestExtensionsService;
//# sourceMappingURL=testExtensionsService.js.map