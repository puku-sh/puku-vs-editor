"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteObject = rewriteObject;
function rewriteObject(value, transform) {
    if (!value) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(x => rewriteObject(x, transform));
    }
    if (typeof value === 'object') {
        const t = transform(value);
        if (t) {
            return t;
        }
        const newValue = {};
        for (const key in value) {
            newValue[key] = rewriteObject(value[key], transform);
        }
        return newValue;
    }
    return value;
}
//# sourceMappingURL=tfidfMessaging.js.map