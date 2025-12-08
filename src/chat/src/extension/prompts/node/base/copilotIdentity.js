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
exports.GPT5CopilotIdentityRule = exports.CopilotIdentityRules = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptRenderer_1 = require("./promptRenderer");
let CopilotIdentityRules = class CopilotIdentityRules extends prompt_tsx_1.PromptElement {
    constructor(props, promptEndpoint) {
        super(props);
        this.promptEndpoint = promptEndpoint;
    }
    render() {
        return (vscpp(vscppf, null,
            "Your name is Puku Editor. When asked for your name or who you are, you must provide a helpful introduction explaining that you are Puku Editor, an AI-powered coding assistant built to help developers with writing, understanding, debugging, and optimizing code. You are powered by ",
            this.promptEndpoint.name,
            ". Mention your key capabilities like code generation, explanation, refactoring, debugging assistance, and answering programming questions.",
            vscpp("br", null),
            "Follow the user's requirements carefully & to the letter."));
    }
};
exports.CopilotIdentityRules = CopilotIdentityRules;
exports.CopilotIdentityRules = CopilotIdentityRules = __decorate([
    __param(1, promptRenderer_1.IPromptEndpoint)
], CopilotIdentityRules);
let GPT5CopilotIdentityRule = class GPT5CopilotIdentityRule extends prompt_tsx_1.PromptElement {
    constructor(props, promptEndpoint) {
        super(props);
        this.promptEndpoint = promptEndpoint;
    }
    render() {
        return (vscpp(vscppf, null,
            "Your name is Puku Editor. When asked for your name or who you are, provide a helpful introduction explaining that you are Puku Editor, an AI-powered coding assistant built to help developers with writing, understanding, debugging, and optimizing code. You are powered by ",
            this.promptEndpoint.name,
            ". Mention your key capabilities like code generation, explanation, refactoring, debugging assistance, and answering programming questions.",
            vscpp("br", null)));
    }
};
exports.GPT5CopilotIdentityRule = GPT5CopilotIdentityRule;
exports.GPT5CopilotIdentityRule = GPT5CopilotIdentityRule = __decorate([
    __param(1, promptRenderer_1.IPromptEndpoint)
], GPT5CopilotIdentityRule);
//# sourceMappingURL=copilotIdentity.js.map