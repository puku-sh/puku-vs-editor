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
exports.UnsafeCodeBlock = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const markdown_1 = require("../../../../util/common/markdown");
/**
 * !!! WARNING: Do not use this element for text from user's code files, instead use `SafeCodeBlock` from {@link file://./safeElements.tsx} !!!
 */
let UnsafeCodeBlock = class UnsafeCodeBlock extends prompt_tsx_1.PromptElement {
    constructor(props, _promptPathRepresentationService) {
        super(props);
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async render() {
        const filePath = this.props.uri && this.props.includeFilepath ? this._promptPathRepresentationService.getFilePath(this.props.uri) : undefined;
        const code = (0, markdown_1.createFencedCodeBlock)(this.props.languageId ?? '', this.props.code, this.props.shouldTrim ?? true, filePath);
        return vscpp(prompt_tsx_1.TextChunk, null, code);
    }
};
exports.UnsafeCodeBlock = UnsafeCodeBlock;
exports.UnsafeCodeBlock = UnsafeCodeBlock = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], UnsafeCodeBlock);
//# sourceMappingURL=unsafeElements.js.map