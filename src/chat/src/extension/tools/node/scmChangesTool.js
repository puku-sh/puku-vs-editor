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
const gitDiffService_1 = require("../../../platform/git/common/gitDiffService");
const gitService_1 = require("../../../platform/git/common/gitService");
const logService_1 = require("../../../platform/log/common/logService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const gitChanges_1 = require("../../prompts/node/git/gitChanges");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("../common/toolUtils");
const toolUtils_2 = require("./toolUtils");
let GetScmChangesTool = class GetScmChangesTool {
    static { this.toolName = toolNames_1.ToolName.GetScmChanges; }
    constructor(instantiationService, gitService, gitDiffService, logService, promptPathRepresentationService) {
        this.instantiationService = instantiationService;
        this.gitService = gitService;
        this.gitDiffService = gitDiffService;
        this.logService = logService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async invoke(options, token) {
        (0, toolUtils_2.checkCancellation)(token);
        await this.gitService.initialize();
        this.logService.trace(`[GetScmChangesTool][invoke] Options: ${JSON.stringify(options)}`);
        const diffs = [];
        const changedFiles = [];
        const uri = options.input.repositoryPath
            ? this.promptPathRepresentationService.resolveFilePath(options.input.repositoryPath)
            : undefined;
        let repository = uri ? await this.gitService.getRepository(uri) : undefined;
        repository = repository ?? this.gitService.activeRepository.get();
        if (!repository) {
            this.logService.warn(`[GetScmChangesTool][invoke] Unable to resolve the repository using repositoryPath: ${options.input.repositoryPath}`);
            this.logService.warn(`[GetScmChangesTool][invoke] Unable to resolve the active repository: ${this.gitService.activeRepository.get()?.rootUri.toString()}`);
            return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart('The workspace does not contain a git repository')]);
        }
        this.logService.trace(`[GetScmChangesTool][invoke] Uri: ${uri?.toString()}`);
        this.logService.trace(`[GetScmChangesTool][invoke] Repository: ${repository.rootUri.toString()}`);
        const changes = repository?.changes;
        if (changes) {
            try {
                if (options.input.sourceControlState) {
                    for (const state of options.input.sourceControlState) {
                        switch (state) {
                            case 'staged':
                                changedFiles.push(...changes.indexChanges);
                                break;
                            case 'unstaged':
                                changedFiles.push(...changes.workingTree, ...changes.untrackedChanges);
                                break;
                            case 'merge-conflicts':
                                changedFiles.push(...changes.mergeChanges);
                                break;
                        }
                    }
                }
                else {
                    changedFiles.push(...changes.workingTree, ...changes.indexChanges, ...changes.mergeChanges, ...changes.untrackedChanges);
                }
                diffs.push(...await this.gitDiffService.getChangeDiffs(repository.rootUri, changedFiles));
            }
            catch { }
        }
        else {
            this.logService.warn(`[GetScmChangesTool][invoke] Unable to retrieve changes because there is no active repository`);
        }
        (0, toolUtils_2.checkCancellation)(token);
        return new vscodeTypes_1.LanguageModelToolResult([diffs.length
                ? new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, gitChanges_1.GitChanges, { diffs }, options.tokenizationOptions, token))
                : new vscodeTypes_1.LanguageModelTextPart('No changed files found')]);
    }
    prepareInvocation(options, token) {
        (0, toolUtils_2.checkCancellation)(token);
        const uri = options.input.repositoryPath
            ? this.promptPathRepresentationService.resolveFilePath(options.input.repositoryPath)
            : undefined;
        this.logService.trace(`[GetScmChangesTool][prepareInvocation] Options: ${JSON.stringify(options)}`);
        this.logService.trace(`[GetScmChangesTool][prepareInvocation] Uri: ${uri?.toString()}`);
        return uri
            ? {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Reading changed files in ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
                pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Read changed files in ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
            }
            : {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Reading changed files in the active git repository`),
                pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Read changed files in the active git repository`),
            };
    }
    async provideInput() {
        await this.gitService.initialize();
        this.logService.trace(`[GetScmChangesTool][provideInput] Active repository: ${this.gitService.activeRepository.get()?.rootUri.toString()}`);
        return Promise.resolve({
            repositoryPath: this.gitService.activeRepository.get()?.rootUri.toString(),
            sourceControlState: ['unstaged', 'staged'],
        });
    }
};
GetScmChangesTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, gitService_1.IGitService),
    __param(2, gitDiffService_1.IGitDiffService),
    __param(3, logService_1.ILogService),
    __param(4, promptPathRepresentationService_1.IPromptPathRepresentationService)
], GetScmChangesTool);
toolsRegistry_1.ToolRegistry.registerTool(GetScmChangesTool);
//# sourceMappingURL=scmChangesTool.js.map