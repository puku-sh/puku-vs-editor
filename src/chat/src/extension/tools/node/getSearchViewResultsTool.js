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
exports.GetSearchViewResultsTool = void 0;
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
let GetSearchViewResultsTool = class GetSearchViewResultsTool {
    static { this.toolName = toolNames_1.ToolName.SearchViewResults; }
    constructor(_commandService) {
        this._commandService = _commandService;
    }
    async invoke(options, token) {
        const results = [];
        try {
            const searchResults = await this._commandService.executeCommand('search.action.getSearchResults');
            if (searchResults) {
                results.push(searchResults);
            }
        }
        catch {
            // no results yet
        }
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(`The following are the results from the search view:\n${results.join('\n')}`)
        ]);
    }
};
exports.GetSearchViewResultsTool = GetSearchViewResultsTool;
exports.GetSearchViewResultsTool = GetSearchViewResultsTool = __decorate([
    __param(0, runCommandExecutionService_1.IRunCommandExecutionService)
], GetSearchViewResultsTool);
toolsRegistry_1.ToolRegistry.registerTool(GetSearchViewResultsTool);
//# sourceMappingURL=getSearchViewResultsTool.js.map