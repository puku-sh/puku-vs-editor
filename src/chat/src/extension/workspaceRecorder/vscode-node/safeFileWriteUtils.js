"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlushableSafeJSONLFile = exports.FlushableJSONFile = void 0;
exports.getFileSize = getFileSize;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const jsonFile_1 = require("../../../util/node/jsonFile");
const errors_1 = require("../../../util/vs/base/common/errors");
class FlushableJSONFile {
    static async loadOrCreate(filePath, initialValue) {
        let data = initialValue;
        const result = await (0, jsonFile_1.readFileTextOrUndefined)(filePath);
        if (result !== undefined) {
            const parsed = (0, jsonFile_1.tryParseJson)(result);
            if (parsed !== undefined) {
                data = parsed;
            }
        }
        return new FlushableJSONFile(filePath, data, result !== undefined);
    }
    get value() { return this._value; }
    constructor(filePath, initialValue, _exists = false) {
        this.filePath = filePath;
        this._exists = _exists;
        this._dirty = false;
        this._value = initialValue;
    }
    setValue(value) {
        this._value = value;
        this._dirty = true;
    }
    async flushAsync() {
        if (!this._dirty) {
            return;
        }
        const jsonStr = JSON.stringify(this._value, null, 4);
        const tempFilePath = this.filePath + '.new';
        // TODO test what can go wrong here!
        await (0, promises_1.writeFile)(tempFilePath, jsonStr, { encoding: 'utf8' });
        if (this._exists) {
            await (0, promises_1.unlink)(this.filePath);
        }
        await (0, promises_1.rename)(tempFilePath, this.filePath);
        this._exists = true;
        this._dirty = false;
    }
    flushSync() {
        if (!this._dirty) {
            return;
        }
        const json = JSON.stringify(this._value, null, 4);
        const tempFilePath = this.filePath + '.new';
        // TODO test what can go wrong here!
        (0, fs_1.writeFileSync)(tempFilePath, json, { encoding: 'utf8' });
        if (this._exists) {
            (0, fs_1.unlinkSync)(this.filePath);
        }
        (0, fs_1.renameSync)(tempFilePath, this.filePath);
        this._exists = true;
        this._dirty = false;
    }
}
exports.FlushableJSONFile = FlushableJSONFile;
class FlushableSafeJSONLFile {
    constructor(filePath) {
        this.filePath = filePath;
        this._lock = false;
        this._newEntries = [];
    }
    appendEntry(data) {
        this._newEntries.push(JSON.stringify(data));
    }
    _getTextAndClear() {
        const text = this._newEntries.map(l => '\n' + l).join('');
        this._newEntries.length = 0;
        return text;
    }
    async flushAsync() {
        if (this._newEntries.length === 0) {
            return;
        }
        if (this._lock) {
            throw new errors_1.BugIndicatingError('Locked!');
        }
        this._lock = true;
        try {
            const text = this._getTextAndClear();
            if (text === '') {
                return;
            }
            await (0, promises_1.appendFile)(this.filePath, text, { encoding: 'utf8' });
        }
        finally {
            this._lock = false;
        }
    }
    flushSync() {
        if (this._newEntries.length === 0) {
            return;
        }
        if (this._lock) {
            throw new errors_1.BugIndicatingError('Locked!');
        }
        const text = this._getTextAndClear();
        if (text === '') {
            return;
        }
        (0, fs_1.appendFileSync)(this.filePath, text, { encoding: 'utf8' });
    }
}
exports.FlushableSafeJSONLFile = FlushableSafeJSONLFile;
async function getFileSize(filePath) {
    try {
        const stats = await (0, promises_1.stat)(filePath);
        return stats.size;
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=safeFileWriteUtils.js.map