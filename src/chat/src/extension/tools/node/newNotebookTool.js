"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewNotebookToolPromptContent = exports.NewNotebookToolPrompt = exports.NewNotebookTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const notebooks_1 = require("../../../util/common/notebooks");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const chatVariables_1 = require("../../prompts/node/panel/chatVariables");
const customInstructions_1 = require("../../prompts/node/panel/customInstructions");
const editCodePrompt_1 = require("../../prompts/node/panel/editCodePrompt");
const newNotebook_1 = require("../../prompts/node/panel/newNotebook");
const notebookEditCodePrompt_1 = require("../../prompts/node/panel/notebookEditCodePrompt");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
let NewNotebookTool = class NewNotebookTool {
    // Make sure this matches the name in the ToolName enum and package.json
    static { this.toolName = toolNames_1.ToolName.CreateNewJupyterNotebook; }
    constructor(instantiationService, endpointProvider, telemetryService) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.telemetryService = telemetryService;
    }
    async invoke(options, token) {
        if (!this._input?.stream) {
            this.sendTelemetry('noStream', options);
            throw new Error('No output stream found');
        }
        const disposables = new lifecycle_1.DisposableStore();
        let failed = false;
        let outcome = 'failedToCreatePlanningEndpoint';
        try {
            // Get the endpoint
            const planningEndpoint = await this.endpointProvider.getChatEndpoint(options.model || 'gpt-4.1');
            const originalCreateNotebookQuery = `Create notebook: ${this._input?.query ?? options.input.query}`;
            const mockContext = {
                query: originalCreateNotebookQuery,
                history: this._input?.history ?? options.input.history,
                chatVariables: this._input?.chatVariables ?? new chatVariablesCollection_1.ChatVariablesCollection([]),
            };
            this._input?.stream?.progress(l10n.t("Planning ..."));
            // planning outline stage
            outcome = 'failedToRenderPlanningPrompt';
            const { messages: planningMessages } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, planningEndpoint, newNotebook_1.NewNotebookPlanningPrompt, {
                promptContext: mockContext,
                endpoint: planningEndpoint
            });
            outcome = 'failedToMakePlanningRequest';
            const planningResponse = await planningEndpoint.makeChatRequest2({
                debugName: 'notebookPlanning',
                messages: planningMessages,
                finishedCb: undefined,
                location: vscodeTypes_1.ChatLocation.Panel,
                enableRetryOnFilter: true
            }, token);
            if (planningResponse.type !== commonTypes_1.ChatFetchResponseType.Success) {
                this.sendTelemetry('planningFailed', options);
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart('Planning stage did not return a success code.')
                ]);
            }
            // parse outline, pass to newnotebook command
            const outline = (0, notebooks_1.extractNotebookOutline)(planningResponse.value);
            if (!outline) {
                this.sendTelemetry('noOutline', options);
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart('Outline was not found in planning stage response.')
                ]);
            }
            // Return message to Model asking it to create the notebook using existing tools.
            outcome = 'failedToRenderNewNotebookPrompt';
            return new vscodeTypes_1.ExtendedLanguageModelToolResult([
                new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, NewNotebookToolPromptContent, {
                    outline: outline,
                    promptContext: mockContext,
                    originalCreateNotebookQuery,
                    availableTools: this._input.tools?.availableTools,
                }, 
                // If we are not called with tokenization options, have _some_ fake tokenizer
                // otherwise we end up returning the entire document
                options.tokenizationOptions ?? {
                    tokenBudget: 1000,
                    countTokens: (t) => Promise.resolve(t.length * 3 / 4)
                }, token))
            ]);
        }
        catch (error) {
            failed = true;
            this.sendTelemetry(outcome, options);
            throw error;
        }
        finally {
            if (!failed) {
                this.sendTelemetry('success', options);
            }
            disposables.dispose();
        }
    }
    async resolveInput(input, promptContext, mode) {
        this._input = promptContext;
        return input;
    }
    async sendTelemetry(outcome, options) {
        const model = options.model && (await this.endpointProvider.getChatEndpoint(options.model)).model;
        /* __GDPR__
            "newNotebookTool.outcome" : {
                "owner": "donjayamanne",
                "comment": "Tracks the outcome of new notebook tool",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the tool call." },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook (this measure is used to identify notebook related telemetry)." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('newNotebookTool.outcome', { requestId: options.chatRequestId, outcome, model }, { isNotebook: 1 });
    }
};
exports.NewNotebookTool = NewNotebookTool;
exports.NewNotebookTool = NewNotebookTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, telemetry_1.ITelemetryService)
], NewNotebookTool);
class NewNotebookToolPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(NewNotebookToolPromptContent, { outline: this.props.outline, promptContext: this.props.promptContext, originalCreateNotebookQuery: this.props.originalCreateNotebookQuery, availableTools: this.props.availableTools }))));
    }
}
exports.NewNotebookToolPrompt = NewNotebookToolPrompt;
class NewNotebookToolPromptContent extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const hasEditNotebookTool = this.props.availableTools?.some(t => t.name === toolNames_1.ToolName.EditNotebook);
        const hasEditTools = this.props.availableTools?.some(t => t.name === toolNames_1.ToolName.EditFile) && hasEditNotebookTool;
        const hasCreateTool = !hasEditTools && this.props.availableTools?.some(t => t.name === toolNames_1.ToolName.CreateFile) && hasEditNotebookTool;
        return (vscpp(vscppf, null,
            vscpp(notebookEditCodePrompt_1.NotebookXmlFormatPrompt, { tsExampleFilePath: '/Users/someone/proj01/example.ipynb' }),
            vscpp(editCodePrompt_1.NewFilesLocationHint, null),
            vscpp(customInstructions_1.CustomInstructions, { flexGrow: 6, priority: 750, languageId: undefined, chatVariables: this.props.promptContext.chatVariables }),
            vscpp(chatVariables_1.ChatToolReferences, { flexGrow: 4, priority: 898, promptContext: this.props.promptContext }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 3, priority: 898, chatVariables: this.props.promptContext.chatVariables, query: this.props.originalCreateNotebookQuery }),
            hasEditTools && vscpp(vscppf, null,
                "Use the `",
                `${toolNames_1.ToolName.EditFile}`,
                "` tool to first create an empty notebook file with the file path,",
                vscpp("br", null),
                "And then use the `",
                `${toolNames_1.ToolName.EditNotebook}`,
                "` tool to generate the notebook of the notebook by editing the empty notebook.",
                vscpp("br", null)),
            hasCreateTool && vscpp(vscppf, null,
                "Use the `",
                `${toolNames_1.ToolName.CreateFile}`,
                "` tool to first create an empty notebook file with the file path,",
                vscpp("br", null),
                "And then use the `",
                `${toolNames_1.ToolName.EditNotebook}`,
                "` tool to generate the notebook of the notebook by editing the empty notebook.",
                vscpp("br", null)),
            "You must follow the new file location hint when generating the notebook.",
            vscpp("br", null),
            "You MUST use the following outline when generating the notebook:",
            vscpp("br", null),
            "Outline Description: ",
            this.props.outline.description,
            vscpp("br", null),
            this.props.outline.sections.map((section, i) => (vscpp(vscppf, null,
                "\u00A0",
                i + 1,
                ". Section: ",
                section.title,
                vscpp("br", null),
                "\u00A0Content ",
                section.content,
                vscpp("br", null))))));
    }
}
exports.NewNotebookToolPromptContent = NewNotebookToolPromptContent;
// Register the tool
toolsRegistry_1.ToolRegistry.registerTool(NewNotebookTool);
//# sourceMappingURL=newNotebookTool.js.map