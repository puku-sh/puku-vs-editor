"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONFile = void 0;
exports.readFileTextOrUndefined = readFileTextOrUndefined;
exports.tryParseJson = tryParseJson;
const promises_1 = require("fs/promises");
const async_1 = require("../common/async");
const objects_1 = require("../vs/base/common/objects");
class JSONFile {
    static async readOrCreate(filePath, initialValue, indent = 4) {
        let data = initialValue;
        const result = await readFileTextOrUndefined(filePath);
        if (result !== undefined) {
            const parsed = tryParseJson(result);
            if (parsed !== undefined) {
                data = parsed;
            }
        }
        return new JSONFile(filePath, data, indent);
    }
    get value() { return (0, objects_1.deepClone)(this._value); }
    constructor(filePath, initialValue, indent = 4) {
        this.filePath = filePath;
        this.indent = indent;
        this._writeQueue = new async_1.TaskQueue();
        this._value = initialValue;
    }
    async setValue(value) {
        this._value = value;
        this._writeQueue.clearPending();
        await this._writeQueue.scheduleSkipIfCleared(() => this._write());
    }
    async _write() {
        await (0, promises_1.writeFile)(this.filePath, JSON.stringify(this._value, null, this.indent), { encoding: 'utf8' });
    }
}
exports.JSONFile = JSONFile;
async function readFileTextOrUndefined(filePath) {
    try {
        return await (0, promises_1.readFile)(filePath, 'utf8');
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return undefined;
        }
        throw e;
    }
}
function tryParseJson(str) {
    try {
        return JSON.parse(str);
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            console.error(e);
            return undefined;
        }
        throw e;
    }
}
//# sourceMappingURL=jsonFile.js.map