"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchServiceImpl = void 0;
const glob_1 = require("../../../util/common/glob");
const ignoreService_1 = require("../../ignore/common/ignoreService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const baseSearchServiceImpl_1 = require("../vscode/baseSearchServiceImpl");
let SearchServiceImpl = class SearchServiceImpl extends baseSearchServiceImpl_1.BaseSearchServiceImpl {
    constructor(_ignoreService, _logService) {
        super();
        this._ignoreService = _ignoreService;
        this._logService = _logService;
    }
    async findFilesWithDefaultExcludes(include, maxResults, token) {
        const copilotIgnoreExclude = await this._ignoreService.asMinimatchPattern();
        const results = await this._findFilesWithDefaultExcludesAndExcludes(include, copilotIgnoreExclude, maxResults, token);
        if (!this._ignoreService.isRegexExclusionsEnabled || !results) {
            return results;
        }
        else if (Array.isArray(results)) {
            return await (0, ignoreService_1.filterIngoredResources)(this._ignoreService, results);
        }
        else {
            return await this._ignoreService.isCopilotIgnored(results) ? undefined : results;
        }
    }
    async findFiles(filePattern, options, token) {
        const copilotIgnoreExclude = await this._ignoreService.asMinimatchPattern();
        if (options?.exclude) {
            options = { ...options, exclude: copilotIgnoreExclude ? options.exclude.map(e => (0, glob_1.combineGlob)(e, copilotIgnoreExclude)) : options.exclude };
        }
        else {
            options = { ...options, exclude: copilotIgnoreExclude ? [copilotIgnoreExclude] : options?.exclude };
        }
        const results = await super.findFiles(filePattern, options, token);
        if (!this._ignoreService.isRegexExclusionsEnabled) {
            return results;
        }
        else {
            return await (0, ignoreService_1.filterIngoredResources)(this._ignoreService, results);
        }
    }
    async findTextInFiles(query, options, progress, token) {
        const jobs = [];
        const ignoreSupportedProgress = {
            report: async (value) => {
                jobs.push((async () => {
                    if (await this._ignoreService.isCopilotIgnored(value.uri)) {
                        return;
                    }
                    else {
                        progress.report(value);
                    }
                })());
            }
        };
        const result = await super.findTextInFiles(query, options, ignoreSupportedProgress, token);
        await Promise.all(jobs);
        return result;
    }
};
exports.SearchServiceImpl = SearchServiceImpl;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'SearchServiceImpl::findFiles')
], SearchServiceImpl.prototype, "findFiles", null);
exports.SearchServiceImpl = SearchServiceImpl = __decorate([
    __param(0, ignoreService_1.IIgnoreService),
    __param(1, logService_1.ILogService)
], SearchServiceImpl);
//# sourceMappingURL=searchServiceImpl.js.map