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
exports.InlineChat2Prompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const endpointTypes_1 = require("../../../../platform/endpoint/common/endpointTypes");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const chatVariablesCollection_1 = require("../../../prompt/common/chatVariablesCollection");
const intents_1 = require("../../../prompt/common/intents");
const copilotIdentity_1 = require("../base/copilotIdentity");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("../panel/chatVariables");
const editCodePrompt_1 = require("../panel/editCodePrompt");
let InlineChat2Prompt = class InlineChat2Prompt extends prompt_tsx_1.PromptElement {
    constructor(props, _promptPathRepresentationService) {
        super(props);
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    render(state, sizing) {
        const workingSet = [{
                document: textDocumentSnapshot_1.TextDocumentSnapshot.create(this.props.data.document),
                isMarkedReadonly: false,
                state: intents_1.WorkingSetEntryState.Initial,
                range: this.props.data.selection
            }];
        const variables = new chatVariablesCollection_1.ChatVariablesCollection(this.props.request.references);
        const filepath = this._promptPathRepresentationService.getFilePath(this.props.data.document.uri);
        // TODO@jrieken: if the selection is empty and if the line with the selection is empty we could hint to add code and
        // generally with empty selections we could allow the model to be a bit more creative
        // TODO@jrieken APPLY_PATCH_INSTRUCTIONS
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(tag_1.Tag, { name: 'instructions' },
                    "You are an AI coding assistant that is used for quick, inline code changes. Changes are scoped to a single file or to some selected code in that file. The filepath is `",
                    filepath,
                    "` and that is the ONLY file you are editing. There is a tool to make these code changes.",
                    vscpp("br", null),
                    "The user is interested in code changes grounded in the user's prompt. So, focus on replying with tool calls, avoid wordy explanations, and do not ask back for clarifications.",
                    vscpp("br", null),
                    "Do not make code changes that are not directly and logically related to the user's prompt, instead invoke the ",
                    this.props.exitToolName,
                    " tool which can handle this.",
                    vscpp("br", null)),
                vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType })),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(editCodePrompt_1.WorkingSet, { flexGrow: 1, priority: 950, workingSet: workingSet }),
                vscpp(chatVariables_1.ChatVariables, { flexGrow: 3, priority: 898, chatVariables: variables, useFixCookbook: true }),
                vscpp(tag_1.Tag, { name: 'reminder' },
                    "If there is a user selection, focus on it, and try to make changes to the selected code and its context.",
                    vscpp("br", null),
                    "If there is no user selection, make changes or write new code anywhere in the file.",
                    vscpp("br", null),
                    "Do not make code changes that are not directly and logically related to the user's prompt.",
                    vscpp("br", null),
                    "ONLY change the `",
                    filepath,
                    "` file and NO other file."),
                vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType })),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(tag_1.Tag, { name: 'prompt' },
                    vscpp(chatVariables_1.UserQuery, { flexGrow: 7, priority: 900, chatVariables: variables, query: this.props.request.prompt })),
                vscpp("cacheBreakpoint", { type: endpointTypes_1.CacheType }))));
    }
};
exports.InlineChat2Prompt = InlineChat2Prompt;
exports.InlineChat2Prompt = InlineChat2Prompt = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], InlineChat2Prompt);
//# sourceMappingURL=inlineChat2Prompt.js.map