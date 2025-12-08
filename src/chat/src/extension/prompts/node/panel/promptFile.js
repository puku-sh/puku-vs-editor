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
exports.PromptFile = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../../platform/log/common/logService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const uri_1 = require("../../../../util/vs/base/common/uri");
const promptVariablesService_1 = require("../../../prompt/node/promptVariablesService");
const tag_1 = require("../base/tag");
const fileVariable_1 = require("./fileVariable");
let PromptFile = class PromptFile extends prompt_tsx_1.PromptElement {
    constructor(props, fileSystemService, promptVariablesService, logService, promptPathRepresentationService, ignoreService) {
        super(props);
        this.fileSystemService = fileSystemService;
        this.promptVariablesService = promptVariablesService;
        this.logService = logService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.ignoreService = ignoreService;
    }
    async render(state, sizing) {
        const variable = this.props.variable.reference;
        const uri = variable.value;
        if (!uri_1.URI.isUri(uri)) {
            this.logService.debug(`Prompt file variable does not have a URI value: ${variable.value}`);
            return undefined;
        }
        if (await this.ignoreService.isCopilotIgnored(uri)) {
            return vscpp("ignoredFiles", { value: [uri] });
        }
        const content = await this.getBodyContent(uri, variable.toolReferences);
        const attrs = {};
        attrs.id = variable.name;
        if (this.props.filePathMode === fileVariable_1.FilePathMode.AsAttribute) {
            attrs.filePath = this.promptPathRepresentationService.getFilePath(uri);
        }
        return vscpp(tag_1.Tag, { name: 'attachment', attrs: attrs },
            !this.props.omitReferences && vscpp("references", { value: [new prompt_tsx_1.PromptReference({ variableName: variable.name, value: uri }, undefined)] }),
            "Prompt instructions file:",
            vscpp("br", null),
            content);
    }
    async getBodyContent(fileUri, toolReferences) {
        try {
            const fileContents = await this.fileSystemService.readFile(fileUri);
            let content = new TextDecoder().decode(fileContents);
            if (toolReferences && toolReferences.length > 0) {
                content = await this.promptVariablesService.resolveToolReferencesInPrompt(content, toolReferences);
            }
            let bodyOffset = 0;
            if (content.match(/^---[\s\r\n]/)) {
                // find the start of the body
                const match = content.slice(3).match(/[\r\n]---[\s\r\n]*/);
                if (match) {
                    bodyOffset = match.index + match[0].length;
                }
            }
            return content.substring(bodyOffset);
        }
        catch (e) {
            this.logService.debug(`Prompt file not found: ${fileUri.toString()}`);
            return undefined;
        }
    }
};
exports.PromptFile = PromptFile;
exports.PromptFile = PromptFile = __decorate([
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, promptVariablesService_1.IPromptVariablesService),
    __param(3, logService_1.ILogService),
    __param(4, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(5, ignoreService_1.IIgnoreService)
], PromptFile);
//# sourceMappingURL=promptFile.js.map