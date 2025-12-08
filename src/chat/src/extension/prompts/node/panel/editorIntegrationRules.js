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
exports.MathIntegrationRules = exports.EditorIntegrationRules = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
class EditorIntegrationRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "Use Markdown formatting in your answers.",
            vscpp("br", null),
            "Make sure to include the programming language name at the start of the Markdown code blocks.",
            vscpp("br", null),
            "Avoid wrapping the whole response in triple backticks.",
            vscpp("br", null),
            vscpp(MathIntegrationRules, null),
            "The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.",
            vscpp("br", null),
            "The active document is the source code the user is looking at right now.",
            vscpp("br", null),
            "You can only give one reply for each conversation turn.",
            vscpp("br", null)));
    }
}
exports.EditorIntegrationRules = EditorIntegrationRules;
let MathIntegrationRules = class MathIntegrationRules extends prompt_tsx_1.PromptElement {
    constructor(props, configService) {
        super(props);
        this.configService = configService;
    }
    render() {
        const mathEnabled = this.configService.getNonExtensionConfig('chat.math.enabled');
        if (mathEnabled) {
            return (vscpp(vscppf, null,
                "Use KaTeX for math equations in your answers.",
                vscpp("br", null),
                "Wrap inline math equations in $.",
                vscpp("br", null),
                "Wrap more complex blocks of math equations in $$.",
                vscpp("br", null)));
        }
    }
};
exports.MathIntegrationRules = MathIntegrationRules;
exports.MathIntegrationRules = MathIntegrationRules = __decorate([
    __param(1, configurationService_1.IConfigurationService)
], MathIntegrationRules);
//# sourceMappingURL=editorIntegrationRules.js.map