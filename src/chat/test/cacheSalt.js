"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHUNKING_ENDPOINT_CACHE_SALT = exports.NOTEBOOK_CELL_VALID_CACHE_SALT = exports.PYTHON_EXECUTES_WITHOUT_ERRORS = exports.PYTHON_VALID_SYNTAX_CACHE_SALT = exports.TS_SERVER_DIAGNOSTICS_PROVIDER_CACHE_SALT = exports.CLANG_DIAGNOSTICS_PROVIDER_CACHE_SALT = exports.CACHING_DIAGNOSTICS_PROVIDER_CACHE_SALT = exports.CODE_SEARCH_CACHE_SALT = exports.OPENAI_FETCHER_CACHE_SALT = exports.CHAT_ML_CACHE_SALT = void 0;
// These values are used as input for computing sha256 hashes for caching.
// Bump them to regenerate new cache entries or when the cache object shape changes.
/**
 * Used for all ChatML requests (all models).
 */
exports.CHAT_ML_CACHE_SALT = '2024-07-04T07:37:00Z';
/**
 * Used for all NES requests.
 */
exports.OPENAI_FETCHER_CACHE_SALT = new class {
    constructor() {
        this._cacheSaltByUrl = Object.freeze({
            // Other endpoints
            'DEFAULT': '2024-09-25T11:25:00Z',
        });
    }
    getByUrl(url) {
        if (url in this._cacheSaltByUrl) {
            return this._cacheSaltByUrl[url];
        }
        else {
            return this._cacheSaltByUrl['DEFAULT'];
        }
    }
};
/**
 * Used for all Code Search requests.
 */
exports.CODE_SEARCH_CACHE_SALT = '';
/**
 * Used for all diagnostics providers.
 */
exports.CACHING_DIAGNOSTICS_PROVIDER_CACHE_SALT = 4;
/**
 * Used by the clang diagnostics provider.
 */
exports.CLANG_DIAGNOSTICS_PROVIDER_CACHE_SALT = 5;
/**
 * Used by the TS diagnostics provider.
 */
exports.TS_SERVER_DIAGNOSTICS_PROVIDER_CACHE_SALT = 5;
/**
 * Used by `isValidPythonFile`.
 */
exports.PYTHON_VALID_SYNTAX_CACHE_SALT = 2;
/**
 * Used by `canExecutePythonCodeWithoutErrors`.
 */
exports.PYTHON_EXECUTES_WITHOUT_ERRORS = 2;
/**
 * Used by `isValidNotebookCell`.
 */
exports.NOTEBOOK_CELL_VALID_CACHE_SALT = 1;
/**
 * Used for all Chunking Endpoint requests.
 */
exports.CHUNKING_ENDPOINT_CACHE_SALT = '';
//# sourceMappingURL=cacheSalt.js.map