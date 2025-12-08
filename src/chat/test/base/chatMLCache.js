"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMLSQLiteCache = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const cache_1 = require("./cache");
class ChatMLSQLiteCache extends cache_1.SQLiteSlottedCache {
    constructor(salt, info) {
        super('request', salt, info);
    }
}
exports.ChatMLSQLiteCache = ChatMLSQLiteCache;
//# sourceMappingURL=chatMLCache.js.map