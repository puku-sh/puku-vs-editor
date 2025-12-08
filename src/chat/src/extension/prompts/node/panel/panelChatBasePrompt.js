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
exports.PanelChatBasePrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const envService_1 = require("../../../../platform/env/common/envService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const toolNames_1 = require("../../../tools/common/toolNames");
const capabilities_1 = require("../base/capabilities");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("./chatVariables");
const codeBlockFormattingRules_1 = require("./codeBlockFormattingRules");
const conversationHistory_1 = require("./conversationHistory");
const customInstructions_1 = require("./customInstructions");
const projectLabels_1 = require("./projectLabels");
const workspaceFoldersHint_1 = require("./workspace/workspaceFoldersHint");
let PanelChatBasePrompt = class PanelChatBasePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, envService, experimentationService, _configurationService) {
        super(props);
        this.envService = envService;
        this.experimentationService = experimentationService;
        this._configurationService = _configurationService;
    }
    async render(state, sizing) {
        const { query, history, chatVariables, } = this.props.promptContext;
        const useProjectLabels = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsChat, this.experimentationService);
        const operatingSystem = this.envService.OS;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(capabilities_1.Capabilities, { location: commonTypes_1.ChatLocation.Panel }),
                vscpp(workspaceFoldersHint_1.WorkspaceFoldersHint, { flexGrow: 1, priority: 800 }),
                !this.envService.isSimulation() && vscpp(vscppf, null,
                    vscpp("br", null),
                    "The current date is ",
                    new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
                    ".")),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 1, historyPriority: 700, passPriority: true, history: history, currentTurnVars: chatVariables },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "Use Markdown formatting in your answers.",
                    vscpp("br", null),
                    vscpp(codeBlockFormattingRules_1.CodeBlockFormattingRules, null),
                    "For code blocks use four backticks to start and end.",
                    vscpp("br", null),
                    "Avoid wrapping the whole response in triple backticks.",
                    vscpp("br", null),
                    "The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.",
                    vscpp("br", null),
                    "The user is working on a ",
                    operatingSystem,
                    " machine. Please respond with system specific commands if applicable.",
                    vscpp("br", null),
                    "The active document is the source code the user is looking at right now.",
                    vscpp("br", null),
                    "You can only give one reply for each conversation turn.",
                    vscpp("br", null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    this.props.promptContext.tools?.toolReferences.find((tool) => tool.name === toolNames_1.ToolName.Codebase)
                        ? vscpp(tag_1.Tag, { name: 'codebaseToolInstructions' },
                            "1. Consider how to answer the user's prompt based on the provided information. Always assume that the user is asking about the code in their workspace instead of asking a general programming question. Prefer using variables, functions, types, and classes from the workspace over those from the standard library.",
                            vscpp("br", null),
                            "2. Generate a response that clearly and accurately answers the user's question. In your response, add fully qualified links for referenced symbols (example: [`namespace.VariableName`](path/to/file.ts)) and links for files (example: [path/to/file](path/to/file.ts)) so that the user can open them. If you do not have enough information to answer the question, respond with \"I'm sorry, I can't answer that question with what I currently know about your workspace\".")
                        : undefined)),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 2 },
                useProjectLabels && vscpp(projectLabels_1.ProjectLabels, { flexGrow: 1, priority: 600 }),
                vscpp(customInstructions_1.CustomInstructions, { flexGrow: 1, priority: 750, languageId: undefined, chatVariables: chatVariables }),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext }),
                vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 3, flexReserve: '/3', priority: 900, chatVariables: chatVariables, query: query, includeFilepath: true }))));
    }
};
exports.PanelChatBasePrompt = PanelChatBasePrompt;
exports.PanelChatBasePrompt = PanelChatBasePrompt = __decorate([
    __param(1, envService_1.IEnvService),
    __param(2, nullExperimentationService_1.IExperimentationService),
    __param(3, configurationService_1.IConfigurationService)
], PanelChatBasePrompt);
//# sourceMappingURL=panelChatBasePrompt.js.map