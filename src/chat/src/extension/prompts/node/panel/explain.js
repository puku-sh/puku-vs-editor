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
exports.ExplainPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const languageFeaturesService_1 = require("../../../../platform/languages/common/languageFeaturesService");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const chatVariables_1 = require("./chatVariables");
const codeBlockFormattingRules_1 = require("./codeBlockFormattingRules");
const conversationHistory_1 = require("./conversationHistory");
const currentSelection_1 = require("./currentSelection");
const customInstructions_1 = require("./customInstructions");
const editorIntegrationRules_1 = require("./editorIntegrationRules");
const projectLabels_1 = require("./projectLabels");
const symbolAtCursor_1 = require("./symbolAtCursor");
const symbolDefinitions_1 = require("./symbolDefinitions");
let ExplainPrompt = class ExplainPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, languageService) {
        super(props);
        this.languageService = languageService;
    }
    async prepare() {
        let explainingDiagnostic = false;
        const { document, selection } = this.props;
        if (document?.uri && selection) {
            const severeDiagnostics = this.languageService.getDiagnostics(document.uri);
            const diagnosticsInSelection = severeDiagnostics.filter(d => !!d.range.intersection(selection));
            const filteredDiagnostics = diagnosticsInSelection.filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning);
            explainingDiagnostic = filteredDiagnostics.length > 0;
        }
        return { explainingDiagnostic };
    }
    render(state, sizing) {
        let { query, history, chatVariables, } = this.props.promptContext;
        chatVariables = chatVariables.filter(v => !v.reference.id.startsWith('vscode.implicit'));
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a world-class coding tutor. Your code explanations perfectly balance high-level concepts and granular details. Your approach ensures that students not only understand how to write code, but also grasp the underlying principles that guide effective programming.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: this.props.isInlineChat, historyPriority: 600, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    "Think step by step:",
                    vscpp("br", null),
                    "1. Examine the provided code selection and any other context like user question, related errors, project details, class definitions, etc.",
                    vscpp("br", null),
                    "2. If you are unsure about the code, concepts, or the user's question, ask clarifying questions.",
                    vscpp("br", null),
                    "3. If the user provided a specific question or error, answer it based on the selected code and additional provided context. Otherwise focus on explaining the selected code.",
                    vscpp("br", null),
                    "4. Provide suggestions if you see opportunities to improve code readability, performance, etc.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Focus on being clear, helpful, and thorough without assuming extensive prior knowledge.",
                    vscpp("br", null),
                    "Use developer-friendly terms and analogies in your explanations.",
                    vscpp("br", null),
                    "Identify 'gotchas' or less obvious parts of the code that might trip up someone new.",
                    vscpp("br", null),
                    "Provide clear and relevant examples aligned with any provided context.",
                    vscpp("br", null),
                    "Use Markdown formatting in your answers.",
                    vscpp("br", null),
                    vscpp(codeBlockFormattingRules_1.CodeBlockFormattingRules, null))),
            vscpp(projectLabels_1.ProjectLabels, { priority: 700, embeddedInsideUserMessage: false }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 750 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: chatVariables })),
            vscpp(currentSelection_1.CurrentSelection, { document: this.props.document, range: this.props.selection, priority: 900 }),
            vscpp(symbolDefinitions_1.SymbolDefinitions, { document: this.props.document, range: this.props.selection, priority: 800, embeddedInsideUserMessage: false }),
            !state.explainingDiagnostic && vscpp(symbolAtCursor_1.SymbolAtCursor, { document: this.props.document, selection: this.props.selection, priority: 800 }),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false })));
    }
};
exports.ExplainPrompt = ExplainPrompt;
exports.ExplainPrompt = ExplainPrompt = __decorate([
    __param(1, languageFeaturesService_1.ILanguageFeaturesService)
], ExplainPrompt);
//# sourceMappingURL=explain.js.map