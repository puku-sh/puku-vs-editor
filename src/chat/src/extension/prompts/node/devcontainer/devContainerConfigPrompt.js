"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevContainerConfigPrompt = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const safetyRules_1 = require("../base/safetyRules");
class DevContainerConfigPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                vscpp(DevContainerConfigSystemRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(DevContainerConfigUserMessage, { templates: this.props.templates, features: this.props.features, filenames: this.props.filenames }))));
    }
}
exports.DevContainerConfigPrompt = DevContainerConfigPrompt;
class DevContainerConfigSystemRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "You are an AI programming assistant.",
            vscpp("br", null),
            "You are helping a software developer to configure a Dev Container by picking a configuration template and features."));
    }
}
class DevContainerConfigUserMessage extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "This is a partial list of workspace files:",
            vscpp("br", null),
            this.props.filenames.map(f => `- ${f}\n`).join(''),
            vscpp("br", null),
            "Based on the workspace files, please suggest the best template from the list of templates below.",
            vscpp("br", null),
            "First identify the relevant files ignoring common files, then pick the best template and reply with the best template's id.",
            vscpp("br", null),
            "This is the list of available templates:",
            vscpp("br", null),
            this.props.templates.map(t => `- ${t.id}: ${t.name || t.id}: ${t.description || t.name || t.id}\n`).join(''),
            vscpp("br", null),
            "Also based on the workspace files, please suggest all relevant features from the list of features below.",
            vscpp("br", null),
            "First identify the relevant files ignoring common files, then pick all relevant features and reply with the relevant features' ids.",
            vscpp("br", null),
            "This is the list of available features:",
            vscpp("br", null),
            this.props.features.map(f => `- ${f.id}: ${f.name || f.id}: ${f.description || f.name || f.id}\n`).join(''),
            vscpp("br", null)));
    }
}
//# sourceMappingURL=devContainerConfigPrompt.js.map