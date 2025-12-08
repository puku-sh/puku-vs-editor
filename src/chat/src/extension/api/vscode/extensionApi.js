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
exports.CopilotExtensionApi = void 0;
const vscode_1 = require("vscode");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const scopeSelection_1 = require("../../../platform/scopeSelection/common/scopeSelection");
const vscodeContextProviderApi_1 = require("./vscodeContextProviderApi");
let CopilotExtensionApi = class CopilotExtensionApi {
    static { this.version = 1; }
    constructor(_scopeSelector, _languageContextProviderService) {
        this._scopeSelector = _scopeSelector;
        this._languageContextProviderService = _languageContextProviderService;
    }
    async selectScope(editor, options) {
        editor ??= vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        return this._scopeSelector.selectEnclosingScope(editor, options);
    }
    getContextProviderAPI(_version) {
        return new vscodeContextProviderApi_1.VSCodeContextProviderApiV1(this._languageContextProviderService);
    }
};
exports.CopilotExtensionApi = CopilotExtensionApi;
exports.CopilotExtensionApi = CopilotExtensionApi = __decorate([
    __param(0, scopeSelection_1.IScopeSelector),
    __param(1, languageContextProviderService_1.ILanguageContextProviderService)
], CopilotExtensionApi);
//# sourceMappingURL=extensionApi.js.map