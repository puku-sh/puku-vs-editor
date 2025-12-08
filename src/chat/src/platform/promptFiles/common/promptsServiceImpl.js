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
exports.PromptsServiceImpl = void 0;
const errors_1 = require("../../../util/vs/base/common/errors");
const promptFileParser_1 = require("../../../util/vs/workbench/contrib/chat/common/promptSyntax/promptFileParser");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
let PromptsServiceImpl = class PromptsServiceImpl {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async parseFile(uri, token) {
        const fileContent = await this.fileService.readFile(uri);
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        const text = new TextDecoder().decode(fileContent);
        return new promptFileParser_1.PromptFileParser().parse(uri, text);
    }
};
exports.PromptsServiceImpl = PromptsServiceImpl;
exports.PromptsServiceImpl = PromptsServiceImpl = __decorate([
    __param(0, fileSystemService_1.IFileSystemService)
], PromptsServiceImpl);
//# sourceMappingURL=promptsServiceImpl.js.map