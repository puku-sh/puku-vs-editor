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
exports.TodoListContextProvider = exports.ITodoListContextProvider = void 0;
const services_1 = require("../../../util/common/services");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
exports.ITodoListContextProvider = (0, services_1.createServiceIdentifier)('ITodoListContextProvider');
let TodoListContextProvider = class TodoListContextProvider {
    constructor(toolsService) {
        this.toolsService = toolsService;
    }
    async getCurrentTodoContext(sessionId) {
        try {
            const result = await this.toolsService.invokeTool(toolNames_1.ToolName.CoreManageTodoList, {
                input: { operation: 'read', chatSessionId: sessionId }
            }, cancellation_1.CancellationToken.None);
            if (!result || !result.content) {
                return undefined;
            }
            const todoList = result.content
                .filter((part) => part instanceof vscodeTypes_1.LanguageModelTextPart)
                .map(part => part.value)
                .join('\n');
            if (!todoList.trim() || todoList === 'No todo list found.') {
                return undefined;
            }
            return todoList;
        }
        catch (error) {
            return undefined;
        }
    }
};
exports.TodoListContextProvider = TodoListContextProvider;
exports.TodoListContextProvider = TodoListContextProvider = __decorate([
    __param(0, toolsService_1.IToolsService)
], TodoListContextProvider);
//# sourceMappingURL=todoListContextProvider.js.map