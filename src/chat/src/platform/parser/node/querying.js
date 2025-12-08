"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQueries = runQueries;
const arrays_1 = require("../../../util/vs/base/common/arrays");
class LanguageQueryCache {
    constructor(language) {
        this.language = language;
        this.map = new Map();
    }
    getQuery(query) {
        if (!this.map.has(query)) {
            this.map.set(query, this.language.query(query));
        }
        return this.map.get(query);
    }
}
class QueryCache {
    constructor() {
        this.map = new Map();
    }
    static { this.INSTANCE = new QueryCache(); }
    getQuery(language, query) {
        if (!this.map.has(language)) {
            this.map.set(language, new LanguageQueryCache(language));
        }
        return this.map.get(language).getQuery(query);
    }
}
function runQueries(queries, root) {
    const matches = [];
    for (const query of queries) {
        const compiledQuery = QueryCache.INSTANCE.getQuery(root.tree.getLanguage(), query);
        const queryMatches = compiledQuery.matches(root);
        (0, arrays_1.pushMany)(matches, queryMatches);
    }
    return matches;
}
//# sourceMappingURL=querying.js.map