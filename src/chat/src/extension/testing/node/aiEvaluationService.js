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
exports.EvaluationPrompt = exports.AIEvaluationService = exports.IAIEvaluationService = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptRenderer_1 = require("../../../extension/prompts/node/base/promptRenderer");
const tag_1 = require("../../../extension/prompts/node/base/tag");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const services_1 = require("../../../util/common/services");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
exports.IAIEvaluationService = (0, services_1.createServiceIdentifier)('IAIEvaluationService');
let AIEvaluationService = class AIEvaluationService {
    constructor(endpointProvider, instantiationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
    }
    async evaluate(response, criteria, token) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, EvaluationPrompt, {
            response, criteria
        });
        const prompt = await promptRenderer.render();
        const fetchResult = await endpoint.makeChatRequest('testEvaluation', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other);
        if (fetchResult.type === 'success') {
            return this.parseReply(fetchResult.value);
        }
        throw new Error('Failed to evaluate response');
    }
    parseReply(reply) {
        const lines = reply.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('PASS')) {
                return {};
            }
            else if (line.startsWith('FAIL')) {
                return { errorMessage: line.substring(5).trim() };
            }
        }
        throw new Error('Failed to evaluate input, no PASS or FAIL line found');
    }
};
exports.AIEvaluationService = AIEvaluationService;
exports.AIEvaluationService = AIEvaluationService = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], AIEvaluationService);
class EvaluationPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1001 },
                "You are a world class examiner and must decide whether a response fulfills a given criteria",
                vscpp("br", null),
                vscpp("br", null),
                "Think step by step:",
                vscpp("br", null),
                "1. Examine the provided response and criteria.",
                vscpp("br", null),
                "2. Evaluate whether the response addresses the criteria adequately.",
                vscpp("br", null),
                "3. If the evaluation is negative, end your reply with a line that starts with 'FAIL', followed by a single sentence explaining why.",
                vscpp("br", null),
                "4. If the evaluation is positive, end your reply with a line that starts with 'PASS, followed by a single sentence explaining why.",
                vscpp("br", null),
                "5. Do not add any additional feedback or comments after the line with 'FAIL' or 'PASS'",
                vscpp("br", null),
                vscpp("br", null),
                "Focus on being clear, helpful, and thorough.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1 },
                vscpp(tag_1.Tag, { name: 'response', priority: 100 }, this.props.response),
                vscpp(tag_1.Tag, { name: 'criteria', priority: 100 }, this.props.criteria),
                "Please reply with your evaluation of whether the response meets the criteria. Finish your reply with a line that starts with \"PASS\" or \"FAIL\" followed by a single sentence that explains why. Do not add any additional feedback or comments after the line with \"FAIL\" or \"PASS\".")));
    }
}
exports.EvaluationPrompt = EvaluationPrompt;
//# sourceMappingURL=aiEvaluationService.js.map