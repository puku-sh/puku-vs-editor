"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacySafetyRules = exports.Gpt5SafetyRule = exports.SafetyRules = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
class SafetyRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "Follow Microsoft content policies.",
            vscpp("br", null),
            "Avoid content that violates copyrights.",
            vscpp("br", null),
            "If you are asked to generate content that is harmful, hateful, racist, sexist, lewd, or violent, only respond with \"Sorry, I can't assist with that.\"",
            vscpp("br", null),
            "Keep your answers short and impersonal.",
            vscpp("br", null)));
    }
}
exports.SafetyRules = SafetyRules;
class Gpt5SafetyRule extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "Follow Microsoft content policies.",
            vscpp("br", null),
            "Avoid content that violates copyrights.",
            vscpp("br", null),
            "If you are asked to generate content that is harmful, hateful, racist, sexist, lewd, or violent, only respond with \"Sorry, I can't assist with that.\"",
            vscpp("br", null)));
    }
}
exports.Gpt5SafetyRule = Gpt5SafetyRule;
class LegacySafetyRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "Follow Microsoft content policies.",
            vscpp("br", null),
            "Avoid content that violates copyrights.",
            vscpp("br", null),
            "If you are asked to generate content that is harmful, hateful, racist, sexist, lewd, violent, or completely irrelevant to software engineering, only respond with \"Sorry, I can't assist with that.\"",
            vscpp("br", null),
            "Keep your answers short and impersonal.",
            vscpp("br", null)));
    }
}
exports.LegacySafetyRules = LegacySafetyRules;
//# sourceMappingURL=safetyRules.js.map