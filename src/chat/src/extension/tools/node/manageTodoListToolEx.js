"use strict";
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
const logService_1 = require("../../../platform/log/common/logService");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
/**
 * A thin wrapper tool to provide custom behavior on top of the internal manage_todo_list tool.
 * This allows the extension to override the tool definition based on the model or other factors.
 */
let ManageTodoListToolExtension = class ManageTodoListToolExtension {
    static { this.toolName = toolNames_1.ToolName.CoreManageTodoList; }
    constructor(_logService) {
        this._logService = _logService;
    }
    alternativeDefinition(originTool, chatEndpoint) {
        // specialize the tool definition for gpt-5 to reduce the frequency
        const model = chatEndpoint?.model;
        if (model === 'gpt-5-codex') {
            return {
                ...originTool,
                description: originTool.description?.replace('VERY frequently ', ''),
            };
        }
        return originTool;
    }
};
ManageTodoListToolExtension = __decorate([
    __param(0, logService_1.ILogService)
], ManageTodoListToolExtension);
toolsRegistry_1.ToolRegistry.registerToolExtension(ManageTodoListToolExtension);
//# sourceMappingURL=manageTodoListToolEx.js.map