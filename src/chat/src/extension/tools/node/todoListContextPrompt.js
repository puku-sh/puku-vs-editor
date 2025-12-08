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
exports.TodoListContextPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const todoListContextProvider_1 = require("../../prompt/node/todoListContextProvider");
const tag_1 = require("../../prompts/node/base/tag");
/**
 * A wrapper prompt element that provides todo list context
 */
let TodoListContextPrompt = class TodoListContextPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, todoListContextProvider) {
        super(props);
        this.todoListContextProvider = todoListContextProvider;
    }
    async render() {
        const sessionId = this.props.sessionId;
        if (!sessionId) {
            return null;
        }
        const todoContext = await this.todoListContextProvider.getCurrentTodoContext(sessionId);
        if (!todoContext) {
            return null;
        }
        return (vscpp(tag_1.Tag, { name: "todoList" }, todoContext));
    }
};
exports.TodoListContextPrompt = TodoListContextPrompt;
exports.TodoListContextPrompt = TodoListContextPrompt = __decorate([
    __param(1, todoListContextProvider_1.ITodoListContextProvider)
], TodoListContextPrompt);
//# sourceMappingURL=todoListContextPrompt.js.map