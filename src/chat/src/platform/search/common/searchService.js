"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractSearchService = exports.ISearchService = void 0;
const services_1 = require("../../../util/common/services");
const vscodeTypes_1 = require("../../../vscodeTypes");
exports.ISearchService = (0, services_1.createServiceIdentifier)('ISearchService');
class AbstractSearchService {
    async findFilesWithDefaultExcludes(include, maxResults, token) {
        return this._findFilesWithDefaultExcludesAndExcludes(include, undefined, maxResults, token);
    }
    async findFilesWithExcludes(include, exclude, maxResults, token) {
        return this._findFilesWithDefaultExcludesAndExcludes(include, exclude, maxResults, token);
    }
    async _findFilesWithDefaultExcludesAndExcludes(include, exclude, maxResults, token) {
        const options = {
            maxResults,
            exclude: exclude ? [exclude] : undefined,
            useExcludeSettings: vscodeTypes_1.ExcludeSettingOptions.SearchAndFilesExclude,
        };
        const results = await this.findFiles(include, options, token);
        if (maxResults === 1) {
            return results[0];
        }
        else {
            return results;
        }
    }
}
exports.AbstractSearchService = AbstractSearchService;
//# sourceMappingURL=searchService.js.map