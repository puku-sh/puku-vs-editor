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
exports.LanguageToolsProvider = exports.ILanguageToolsProvider = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const services_1 = require("../../../util/common/services");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
// Extracts the "yam" from "- yam" or "yam" or "* yam" 🍠
const LIST_RE = /\s*(?:. )?([a-z0-9_-]+)\s*/;
exports.ILanguageToolsProvider = (0, services_1.createServiceIdentifier)('ILanguageToolsProvider');
let LanguageToolsProvider = class LanguageToolsProvider {
    constructor(endpointProvider, instantiationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
    }
    async getToolsForLanguages(languages, token) {
        const endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, ToolLanguagesPrompt, { languages });
        const prompt = await promptRenderer.render(undefined, token);
        const fetchResult = await endpoint.makeChatRequest('debugCommandIdentifier', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return { ok: false, commands: [] };
        }
        return {
            ok: true,
            commands: fetchResult.value
                .split('\n')
                .map(s => LIST_RE.exec(s)?.[1])
                .filter((s) => !!s),
        };
    }
};
exports.LanguageToolsProvider = LanguageToolsProvider;
exports.LanguageToolsProvider = LanguageToolsProvider = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], LanguageToolsProvider);
class ToolLanguagesPrompt extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 10 },
                "You are an AI programming assistant that is specialized for usage of command-line tools developers use to build software.",
                vscpp("br", null),
                "I'm working on software in the given following languages. Please list the names of common command-line tools I might use to build and test my software.",
                vscpp("br", null),
                "Do NOT list tools that don't run my code, such as those used only for linting. For example, if I ask for JavaScript, the list should include tools like node, npx, and mocha, but not eslint.",
                vscpp("br", null),
                "Be thorough! Try to give a list of *at least* 10 such tools.",
                vscpp("br", null),
                "Print these tools out as a list, separated by commas. Do NOT print any additional explanation or context.",
                vscpp("br", null),
                vscpp(prompt_tsx_1.TextChunk, { priority: 8 },
                    "# Example",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    "- python",
                    vscpp("br", null),
                    "- rust",
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    "- python",
                    vscpp("br", null),
                    "- pip",
                    vscpp("br", null),
                    "- cargo",
                    vscpp("br", null),
                    "- rustc",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 9 },
                vscpp(prompt_tsx_1.TextChunk, { breakOnWhitespace: true, flexGrow: 1 },
                    "The languages I'm working in are:",
                    vscpp("br", null),
                    this.props.languages.join('\n -')))));
    }
}
//# sourceMappingURL=languageToolsProvider.js.map