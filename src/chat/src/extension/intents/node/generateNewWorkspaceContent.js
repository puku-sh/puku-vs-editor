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
exports.FileContentsGenerator = exports.ProjectSpecificationGenerator = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const newWorkspaceContents_1 = require("../../prompts/node/panel/newWorkspace/newWorkspaceContents");
let NewWorkspaceContentGenerator = class NewWorkspaceContentGenerator {
    constructor(promptType, endpointProvider, instantiationService) {
        this.promptType = promptType;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
    }
    async generate(promptArgs, token) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, this.promptType, promptArgs);
        const prompt = await promptRenderer.render();
        const fetchResult = await endpoint
            .makeChatRequest('newWorkspaceContentGenerator', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other, undefined, undefined);
        return fetchResult.type === commonTypes_1.ChatFetchResponseType.Success ?
            (promptArgs.filePath ? this.parseContents(promptArgs.filePath, fetchResult.value) : fetchResult.value) :
            '';
    }
};
NewWorkspaceContentGenerator = __decorate([
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, instantiation_1.IInstantiationService)
], NewWorkspaceContentGenerator);
let ProjectSpecificationGenerator = class ProjectSpecificationGenerator extends NewWorkspaceContentGenerator {
    constructor(endpointProvider, instantiationService) {
        super(newWorkspaceContents_1.ProjectSpecificationPrompt, endpointProvider, instantiationService);
    }
    parseContents(chatResponse, filePath) {
        throw new Error('Method not implemented.');
    }
};
exports.ProjectSpecificationGenerator = ProjectSpecificationGenerator;
exports.ProjectSpecificationGenerator = ProjectSpecificationGenerator = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], ProjectSpecificationGenerator);
let FileContentsGenerator = class FileContentsGenerator extends NewWorkspaceContentGenerator {
    constructor(endpointProvider, instantiationService) {
        super(newWorkspaceContents_1.FileContentsPrompt, endpointProvider, instantiationService);
    }
    parseContents(filePath, chatResponse) {
        function safeParse(str, regex) {
            try {
                const match = regex.exec(str.trim());
                if (match && match.length > 2) {
                    return match[2];
                }
            }
            catch (ex) {
                console.error(ex);
            }
            return str;
        }
        if (filePath.endsWith('.md')) {
            // If returned as a markdown codeblock, strip the codeblock markers
            const fromCodeblock = safeParse(chatResponse, /^```([a-zA-Z]+)?\s*([\s\S]+?)\s*```$/);
            // If returned as bare text, remove any text before the first header
            const [preamble, ...withoutPreamble] = fromCodeblock.split('#');
            if (preamble.length) {
                return ['', ...withoutPreamble].join('#');
            }
            return fromCodeblock;
        }
        else {
            return safeParse(chatResponse, /```([^\n]+)?\s*\n([\s\S]+?)\s*```/g);
        }
    }
};
exports.FileContentsGenerator = FileContentsGenerator;
exports.FileContentsGenerator = FileContentsGenerator = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], FileContentsGenerator);
//# sourceMappingURL=generateNewWorkspaceContent.js.map