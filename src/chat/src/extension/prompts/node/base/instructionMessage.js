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
exports.InstructionMessage = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptRenderer_1 = require("./promptRenderer");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
let InstructionMessage = class InstructionMessage extends prompt_tsx_1.PromptElement {
    constructor(props, promptEndpoint) {
        super(props);
        this.promptEndpoint = promptEndpoint;
    }
    render(_state, sizing) {
        return (0, chatModelCapabilities_1.modelPrefersInstructionsInUserMessage)(this.promptEndpoint.family)
            ? vscpp(prompt_tsx_1.UserMessage, null, this.props.children)
            : vscpp(prompt_tsx_1.SystemMessage, null, this.props.children);
    }
};
exports.InstructionMessage = InstructionMessage;
exports.InstructionMessage = InstructionMessage = __decorate([
    __param(1, promptRenderer_1.IPromptEndpoint)
], InstructionMessage);
//# sourceMappingURL=instructionMessage.js.map