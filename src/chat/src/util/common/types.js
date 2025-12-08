"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUri = isUri;
exports.isLocation = isLocation;
exports.toLocation = toLocation;
exports.isSymbolInformation = isSymbolInformation;
const vscodeTypes_1 = require("../../vscodeTypes");
const uri_1 = require("../vs/base/common/uri");
function isUri(thing) {
    // This check works for URIs from vscode, but doesn't help with type narrowing on its own, so this function exists.
    return uri_1.URI.isUri(thing);
}
function isLocation(obj) {
    return obj && typeof obj === 'object' && 'uri' in obj && 'range' in obj;
}
function toLocation(obj) {
    if (isLocation(obj) && Array.isArray(obj.range) && obj.range.length === 2) {
        // HACK: prompt-tsx returns serialized ranges/positions that need to be converted back into real objects
        const start = obj.range[0];
        const end = obj.range[1];
        return new vscodeTypes_1.Location(obj.uri, new vscodeTypes_1.Range(new vscodeTypes_1.Position(start.line, start.character), new vscodeTypes_1.Position(end.line, end.character)));
    }
    else if (isLocation(obj) && obj.range instanceof vscodeTypes_1.Range) {
        return obj;
    }
    return undefined;
}
function isSymbolInformation(obj) {
    return obj && typeof obj === 'object' && 'name' in obj && 'containerName' in obj;
}
//# sourceMappingURL=types.js.map