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
var DocInfoTool_1;
Object.defineProperty(exports, "__esModule", { value: true });
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const types_1 = require("../../../util/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
let DocInfoTool = class DocInfoTool {
    static { DocInfoTool_1 = this; }
    static { this.toolName = toolNames_1.ToolName.DocInfo; }
    static { this._docTypeNames = new Map([
        ['typescript', 'TSDoc comment'],
        ['typescriptreact', 'TSDoc comment'],
        ['javascript', 'JSDoc comment'],
        ['javascriptreact', 'JSDoc comment'],
        ['python', 'docstring'],
    ]); }
    constructor(workspaceService, _promptPathRepresentationService) {
        this.workspaceService = workspaceService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async invoke(options, token) {
        const docNames = new Set();
        for (const filePath of options.input.filePaths) {
            const uri = this._promptPathRepresentationService.resolveFilePath(filePath);
            if (!uri) {
                continue;
            }
            const doc = await this.workspaceService.openTextDocumentAndSnapshot(uri);
            const docName = DocInfoTool_1._docTypeNames.get(doc.languageId) || 'documentation comment';
            docNames.add(docName);
        }
        (0, toolUtils_1.checkCancellation)(token);
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(`Please generate ${Array.from(docNames).join(', ')} for the respective files. ONLY add documentation and do not change the code.`)
        ]);
    }
    async prepareInvocation(options, token) {
        return {
            presentation: 'hidden',
        };
    }
    async provideInput(promptContext) {
        const seen = new Set();
        const filePaths = [];
        const ranges = [];
        function addPath(path, range) {
            if (!seen.has(path)) {
                seen.add(path);
                filePaths.push(path);
                ranges.push(range && [range.start.line, range.start.character, range.end.line, range.end.character]);
            }
        }
        for (const ref of promptContext.chatVariables) {
            if (uri_1.URI.isUri(ref.value)) {
                addPath(this._promptPathRepresentationService.getFilePath(ref.value), undefined);
            }
            else if ((0, types_1.isLocation)(ref.value)) {
                addPath(this._promptPathRepresentationService.getFilePath(ref.value.uri), ref.value.range);
            }
        }
        if (promptContext.workingSet) {
            for (const file of promptContext.workingSet) {
                addPath(this._promptPathRepresentationService.getFilePath(file.document.uri), file.range);
            }
        }
        if (!filePaths.length) {
            // no context variables or working set
        }
        return {
            filePaths,
        };
    }
};
DocInfoTool = DocInfoTool_1 = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], DocInfoTool);
toolsRegistry_1.ToolRegistry.registerTool(DocInfoTool);
//# sourceMappingURL=docTool.js.map