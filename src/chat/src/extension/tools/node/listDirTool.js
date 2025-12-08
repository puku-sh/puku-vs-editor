"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../platform/filesystem/common/fileTypes");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const resources_1 = require("../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("../common/toolUtils");
const toolUtils_2 = require("./toolUtils");
let ListDirTool = class ListDirTool {
    static { this.toolName = toolNames_1.ToolName.ListDirectory; }
    constructor(fsService, instantiationService, workspaceService, promptPathRepresentationService) {
        this.fsService = fsService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async invoke(options, token) {
        const uri = (0, toolUtils_2.resolveToolInputPath)(options.input.path, this.promptPathRepresentationService);
        const relativeToWorkspace = this.workspaceService.getWorkspaceFolder((0, resources_1.normalizePath)(uri));
        if (!relativeToWorkspace) {
            throw new Error(`Directory ${options.input.path} is outside of the workspace and can't be read`);
        }
        (0, toolUtils_2.checkCancellation)(token);
        const contents = await this.fsService.readDirectory(uri);
        (0, toolUtils_2.checkCancellation)(token);
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, ListDirResult, { results: contents }, options.tokenizationOptions, token))
        ]);
    }
    prepareInvocation(options, token) {
        const uri = (0, toolUtils_2.resolveToolInputPath)(options.input.path, this.promptPathRepresentationService);
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Reading ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
            pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Read ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
        };
    }
};
ListDirTool = __decorate([
    __param(0, fileSystemService_1.IFileSystemService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, promptPathRepresentationService_1.IPromptPathRepresentationService)
], ListDirTool);
toolsRegistry_1.ToolRegistry.registerTool(ListDirTool);
class ListDirResult extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        if (this.props.results.length === 0) {
            return vscpp(vscppf, null, "Folder is empty");
        }
        return vscpp(vscppf, null, this.props.results.map(([name, type]) => vscpp(prompt_tsx_1.TextChunk, null,
            name,
            type === fileTypes_1.FileType.Directory ? '/' : '')));
    }
}
//# sourceMappingURL=listDirTool.js.map