"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefault = setDefault;
function setDefault(map, key, defaultValue) {
    let value = map.get(key);
    if (value === undefined) {
        value = defaultValue(key);
        map.set(key, value);
    }
    return value;
}
//# sourceMappingURL=map.js.map