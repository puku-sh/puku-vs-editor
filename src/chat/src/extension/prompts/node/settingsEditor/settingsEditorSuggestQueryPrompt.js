"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsEditorSuggestQueryPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscodeIndex_1 = require("../../../../platform/embeddings/common/vscodeIndex");
const instructionMessage_1 = require("../base/instructionMessage");
const tag_1 = require("../base/tag");
class SettingsEditorSuggestQueryPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "You are a Visual Studio Code assistant. Your job is to assist users in using Visual Studio Code by returning settings that answer their question.",
                vscpp("br", null),
                vscpp(instructionMessage_1.InstructionMessage, null,
                    "Additional Rules",
                    vscpp("br", null),
                    "If a setting references another setting, you must respond with both the original and the referenced settings.",
                    vscpp("br", null),
                    "Return up to two settings from the list that the user is most likely to be looking for.",
                    vscpp("br", null),
                    "If you believe the context given to you is incorrect or not relevant you may ignore it.",
                    vscpp("br", null),
                    "List each setting on a new line.",
                    vscpp("br", null),
                    "Only list the setting names. Do not list anything else.",
                    vscpp("br", null),
                    "Do not indent the lines.",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, null,
                "Below is a list of information we found which might be relevant to the question. For view related commands \"Toggle\" often means Show or Hide. A setting may reference another setting, that will appear as \\`#setting.id#\\`, you must return the referenced setting as well. You may use this context to help you formulate your response, but are not required to.",
                vscpp("br", null),
                this.props.settings.length > 0 && vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'settings' },
                        "Here are some possible settings:",
                        vscpp("br", null),
                        this.props.settings.map(c => vscpp(prompt_tsx_1.TextChunk, null, (0, vscodeIndex_1.settingItemToContext)(c))))),
                "What are some settings for \"",
                this.props.query,
                "\"?")));
    }
}
exports.SettingsEditorSuggestQueryPrompt = SettingsEditorSuggestQueryPrompt;
//# sourceMappingURL=settingsEditorSuggestQueryPrompt.js.map