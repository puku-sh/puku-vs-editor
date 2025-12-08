"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullWorkspaceFileIndex = void 0;
const event_1 = require("../../../util/vs/base/common/event");
class NullWorkspaceFileIndex {
    constructor() {
        this._fileCount = 0;
        this.onDidCreateFiles = event_1.Event.None;
        this.onDidChangeFiles = event_1.Event.None;
        this.onDidDeleteFiles = event_1.Event.None;
    }
    get fileCount() {
        return this._fileCount;
    }
    set fileCount(value) {
        this._fileCount = value;
    }
    async initialize() {
        return;
    }
    values(_globPatterns) {
        return [];
    }
    get(_resource) {
        return undefined;
    }
    async tryLoad(_file) {
        return undefined;
    }
    async tryRead(_file) {
        return undefined;
    }
    async shouldIndexWorkspaceFile(_resource, _token) {
        return false;
    }
    dispose() {
        return;
    }
}
exports.NullWorkspaceFileIndex = NullWorkspaceFileIndex;
//# sourceMappingURL=nullWorkspaceFileIndex.js.map