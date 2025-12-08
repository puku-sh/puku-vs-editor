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
exports.CustomInstructionPromptReference = exports.CustomInstructions = void 0;
exports.getCustomInstructionTelemetry = getCustomInstructionTelemetry;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const customInstructionsService_1 = require("../../../../platform/customInstructions/common/customInstructionsService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const types_1 = require("../../../../util/common/types");
const map_1 = require("../../../../util/vs/base/common/map");
const types_2 = require("../../../../util/vs/base/common/types");
const chatVariablesCollection_1 = require("../../../prompt/common/chatVariablesCollection");
const tag_1 = require("../base/tag");
let CustomInstructions = class CustomInstructions extends prompt_tsx_1.PromptElement {
    constructor(props, customInstructionsService, promptPathRepresentationService) {
        super(props);
        this.customInstructionsService = customInstructionsService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async render(state, sizing) {
        const { includeCodeGenerationInstructions, includeTestGenerationInstructions, includeCodeFeedbackInstructions, includeCommitMessageGenerationInstructions, includePullRequestDescriptionGenerationInstructions, customIntroduction } = this.props;
        const includeSystemMessageConflictWarning = this.props.includeSystemMessageConflictWarning ?? true;
        const chunks = [];
        if (includeCodeGenerationInstructions !== false) {
            const instructionFiles = new map_1.ResourceSet(await this.customInstructionsService.getAgentInstructions());
            if (this.props.chatVariables) {
                for (const variable of this.props.chatVariables) {
                    if ((0, chatVariablesCollection_1.isPromptInstruction)(variable)) {
                        if ((0, types_2.isString)(variable.value)) {
                            chunks.push(vscpp(prompt_tsx_1.TextChunk, null, variable.value));
                        }
                        else if ((0, types_1.isUri)(variable.value)) {
                            instructionFiles.add(variable.value);
                        }
                    }
                }
            }
            for (const instructionFile of instructionFiles) {
                const chunk = await this.createElementFromURI(instructionFile);
                if (chunk) {
                    chunks.push(chunk);
                }
            }
        }
        const customInstructions = [];
        if (includeCodeGenerationInstructions !== false) {
            customInstructions.push(...await this.customInstructionsService.fetchInstructionsFromSetting(configurationService_1.ConfigKey.CodeGenerationInstructions));
        }
        if (includeTestGenerationInstructions) {
            customInstructions.push(...await this.customInstructionsService.fetchInstructionsFromSetting(configurationService_1.ConfigKey.TestGenerationInstructions));
        }
        if (includeCodeFeedbackInstructions) {
            customInstructions.push(...await this.customInstructionsService.fetchInstructionsFromSetting(configurationService_1.ConfigKey.CodeFeedbackInstructions));
        }
        if (includeCommitMessageGenerationInstructions) {
            customInstructions.push(...await this.customInstructionsService.fetchInstructionsFromSetting(configurationService_1.ConfigKey.CommitMessageGenerationInstructions));
        }
        if (includePullRequestDescriptionGenerationInstructions) {
            customInstructions.push(...await this.customInstructionsService.fetchInstructionsFromSetting(configurationService_1.ConfigKey.PullRequestDescriptionGenerationInstructions));
        }
        for (const instruction of customInstructions) {
            const chunk = this.createInstructionElement(instruction);
            if (chunk) {
                chunks.push(chunk);
            }
        }
        if (chunks.length === 0) {
            return undefined;
        }
        const introduction = customIntroduction ?? 'When generating code, please follow these user provided coding instructions.';
        const systemMessageConflictWarning = includeSystemMessageConflictWarning && ' You can ignore an instruction if it contradicts a system message.';
        return (vscpp(vscppf, null,
            introduction,
            systemMessageConflictWarning,
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: 'instructions' }, ...chunks)));
    }
    async createElementFromURI(uri) {
        const instructions = await this.customInstructionsService.fetchInstructionsFromFile(uri);
        if (instructions) {
            return vscpp(tag_1.Tag, { name: 'attachment', attrs: { filePath: this.promptPathRepresentationService.getFilePath(uri) } },
                vscpp("references", { value: [new CustomInstructionPromptReference(instructions, instructions.content.map(instruction => instruction.instruction))] }),
                instructions.content.map(instruction => vscpp(prompt_tsx_1.TextChunk, null, instruction.instruction)));
        }
        return undefined;
    }
    createInstructionElement(instructions) {
        const lines = [];
        for (const entry of instructions.content) {
            if (entry.languageId) {
                if (entry.languageId === this.props.languageId) {
                    lines.push(`For ${entry.languageId} code: ${entry.instruction}`);
                }
            }
            else {
                lines.push(entry.instruction);
            }
        }
        if (lines.length === 0) {
            return undefined;
        }
        return (vscpp(vscppf, null,
            vscpp("references", { value: [new CustomInstructionPromptReference(instructions, lines)] }),
            vscpp(vscppf, null, lines.map(line => vscpp(prompt_tsx_1.TextChunk, null, line)))));
    }
};
exports.CustomInstructions = CustomInstructions;
exports.CustomInstructions = CustomInstructions = __decorate([
    __param(1, customInstructionsService_1.ICustomInstructionsService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], CustomInstructions);
class CustomInstructionPromptReference extends prompt_tsx_1.PromptReference {
    constructor(instructions, usedInstructions) {
        super(instructions.reference);
        this.instructions = instructions;
        this.usedInstructions = usedInstructions;
    }
}
exports.CustomInstructionPromptReference = CustomInstructionPromptReference;
function getCustomInstructionTelemetry(references) {
    let codeGenInstructionsCount = 0;
    let codeGenInstructionsFilteredCount = 0;
    let codeGenInstructionsLength = 0;
    let codeGenInstructionFileCount = 0;
    let codeGenInstructionSettingsCount = 0;
    for (const reference of references) {
        if (reference instanceof CustomInstructionPromptReference) {
            codeGenInstructionsCount += reference.usedInstructions.length;
            codeGenInstructionsLength += reference.usedInstructions.reduce((acc, instruction) => acc + instruction.length, 0);
            codeGenInstructionsFilteredCount += Math.max(reference.instructions.content.length - reference.usedInstructions.length, 0);
            if (reference.instructions.kind === customInstructionsService_1.CustomInstructionsKind.File) {
                codeGenInstructionFileCount++;
            }
            else {
                codeGenInstructionSettingsCount += reference.usedInstructions.length;
            }
        }
    }
    return { codeGenInstructionsCount, codeGenInstructionsLength, codeGenInstructionsFilteredCount, codeGenInstructionFileCount, codeGenInstructionSettingsCount };
}
//# sourceMappingURL=customInstructions.js.map