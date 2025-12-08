"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockIgnoreService = void 0;
class MockIgnoreService {
    constructor() {
        this.isEnabled = true;
        this.isRegexExclusionsEnabled = true;
        this._alwaysIgnore = false;
        this.setBlockList = [];
    }
    dispose() { }
    init() {
        this._alwaysIgnore = true;
        this.setBlockList = [];
        return Promise.resolve();
    }
    isCopilotIgnored(file, token) {
        if (this._alwaysIgnore) {
            return Promise.resolve(true);
        }
        if (this.setBlockList.includes(file.toString())) {
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    asMinimatchPattern() {
        return Promise.resolve(undefined);
    }
    setAlwaysIgnore() {
        this._alwaysIgnore = true;
    }
    setBlockListUris(uris) {
        this.setBlockList = uris;
    }
}
exports.MockIgnoreService = MockIgnoreService;
//# sourceMappingURL=testContentExclusion.js.map