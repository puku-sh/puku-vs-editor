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
exports.UserQueryParser = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../../platform/log/common/logService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
let UserQueryParser = class UserQueryParser {
    constructor(endpointProvider, instantiationService, logService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.logService = logService;
    }
    async parse(query) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, Prompt, { query });
        const renderResult = await promptRenderer.render();
        const r = await endpoint.makeChatRequest('testGenParseUserQuery', renderResult.messages, undefined, cancellation_1.CancellationToken.None, commonTypes_1.ChatLocation.Other);
        return r.type === 'success' ? this.processResponse(r.value) : null;
    }
    processResponse(response) {
        // remove first (1-based) and last lines of response if they're backticks (```)
        const lines = response.split(/\r\n|\r|\n/).filter(s => s !== '');
        if (lines.at(0) !== '```') {
            lines.splice(0, 1);
            if (lines.at(-1) === '```') {
                lines.splice(lines.length - 1, 1);
            }
            response = lines.join('\n');
        }
        let parsedJson;
        try {
            parsedJson = JSON.parse(response);
        }
        catch (e) {
            this.logService.error(`Failed to parse user query response\nResponse:\n${response}\nError:\n${e}`);
            return null;
        }
        return this.isParsedUserQuery(parsedJson) ? parsedJson : null;
    }
    isParsedUserQuery(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        const parsedUserQuery = obj;
        if (parsedUserQuery.fileToTest !== undefined && typeof parsedUserQuery.fileToTest !== 'string') {
            return false;
        }
        if (parsedUserQuery.symbolsToTest !== undefined) {
            if (!Array.isArray(parsedUserQuery.symbolsToTest)) {
                return false;
            }
            for (const symbol of parsedUserQuery.symbolsToTest) {
                if (typeof symbol !== 'string') {
                    return false;
                }
            }
        }
        return true;
    }
};
exports.UserQueryParser = UserQueryParser;
exports.UserQueryParser = UserQueryParser = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService)
], UserQueryParser);
class Prompt extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render(state, sizing) {
        const { query } = this.props;
        const format = `
You are a helpful assistant that parses user queries.
The user is a software developer that is asking an AI programming assistant to generate tests.
Your job is to parse the user query into a JSON object of the following shape:

\`\`\`typescript
{
	/**
	 * File reference to test.
	 */
	fileToTest?: string;
	/**
	 * Symbols in {fileToTest} to generate tests for.
	 * Can be undefined if cannot be identified from user query.
	 */
	symbolsToTest?: string[];
}
\`\`\`

You must return a JSON object of the given shape.
`;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null, format),
            vscpp(prompt_tsx_1.UserMessage, null,
                "User query: ",
                query,
                vscpp("br", null),
                "Parsed query:",
                vscpp("br", null))));
    }
}
//# sourceMappingURL=userQueryParser.js.map