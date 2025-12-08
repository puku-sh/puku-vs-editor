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
exports.VscodePrompt = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const vscodeIndex_1 = require("../../../../platform/embeddings/common/vscodeIndex");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../../platform/env/common/envService");
const logService_1 = require("../../../../platform/log/common/logService");
const releaseNotesService_1 = require("../../../../platform/releaseNotes/common/releaseNotesService");
const progress_1 = require("../../../../util/common/progress");
const vscodeVersion_1 = require("../../../../util/common/vscodeVersion");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolNames_1 = require("../../../tools/common/toolNames");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const promptRenderer_1 = require("../base/promptRenderer");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("./chatVariables");
const conversationHistory_1 = require("./conversationHistory");
const toolCalling_1 = require("./toolCalling");
const unsafeElements_1 = require("./unsafeElements");
let VscodePrompt = class VscodePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, logService, embeddingsComputer, endPointProvider, combinedEmbeddingIndex, envService, instantiationService, releaseNotesService) {
        super(props);
        this.logService = logService;
        this.embeddingsComputer = embeddingsComputer;
        this.endPointProvider = endPointProvider;
        this.combinedEmbeddingIndex = combinedEmbeddingIndex;
        this.envService = envService;
        this.instantiationService = instantiationService;
        this.releaseNotesService = releaseNotesService;
    }
    async prepare(sizing, progress, token) {
        if (!this.props.promptContext.query) {
            return { settings: [], commands: [], query: '' };
        }
        progress?.report(new vscodeTypes_1.ChatResponseProgressPart(l10n.t('Refining question to improve search accuracy.')));
        let userQuery = this.props.promptContext.query;
        const endpoint = await this.endPointProvider.getChatEndpoint('copilot-fast');
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, VscodeMetaPrompt, this.props.promptContext);
        const { messages } = await renderer.render();
        if (token.isCancellationRequested) {
            return { settings: [], commands: [], query: userQuery };
        }
        this.logService.debug('[VSCode Prompt] Asking the model to update the user question.');
        const fetchResult = await endpoint.makeChatRequest('vscodePrompt', messages, async (_) => void 0, token, commonTypes_1.ChatLocation.Panel, undefined, {
            temperature: 0,
        });
        if (token.isCancellationRequested) {
            return { settings: [], commands: [], query: userQuery };
        }
        let fetchReleaseNotes = false;
        let shouldIncludeDocsSearch = false;
        let extensionSearch = false;
        let vscodeApiSearch = false;
        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Success) {
            userQuery = parseMetaPromptResponse(this.props.promptContext.query, fetchResult.value);
            shouldIncludeDocsSearch = fetchResult.value.includes("Other Question");
            fetchReleaseNotes = fetchResult.value.includes('release_notes');
            extensionSearch = fetchResult.value.includes('vscode_extensions');
            vscodeApiSearch = fetchResult.value.includes('vscode_api');
        }
        else {
            this.logService.error(`[VSCode Prompt] Failed to refine the question: ${fetchResult.requestId}`);
        }
        const currentSanitized = (0, vscodeVersion_1.sanitizeVSCodeVersion)(this.envService.getEditorInfo().version); // major.minor
        if (fetchReleaseNotes) {
            // Determine which versions to fetch based on meta response
            const rnMatch = fetchResult.type === commonTypes_1.ChatFetchResponseType.Success ? fetchResult.value.match(/release_notes(?:@(?<spec>[A-Za-z0-9._-]+))?/i) : undefined;
            const spec = rnMatch?.groups?.['spec']?.toLowerCase();
            let versionsToFetch;
            if (spec === 'last3') {
                versionsToFetch = getLastNMinorVersions(currentSanitized, 3);
            }
            else {
                versionsToFetch = [currentSanitized];
            }
            const notes = await Promise.all(versionsToFetch.map(async (ver) => {
                const text = await this.releaseNotesService.fetchReleaseNotesForVersion(ver);
                return text ? { version: ver, notes: text } : undefined;
            }));
            const filtered = notes.filter((n) => !!n);
            return { settings: [], commands: [], releaseNotes: filtered, query: this.props.promptContext.query, currentVersion: currentSanitized };
        }
        if (extensionSearch || vscodeApiSearch) {
            return { settings: [], commands: [], query: this.props.promptContext.query };
        }
        if (token.isCancellationRequested) {
            return { settings: [], commands: [], query: userQuery };
        }
        const embeddingResult = await this.embeddingsComputer.computeEmbeddings(embeddingsComputer_1.EmbeddingType.text3small_512, [userQuery], {}, undefined);
        if (token.isCancellationRequested) {
            return { settings: [], commands: [], query: userQuery };
        }
        const nClosestValuesPromise = progress
            ? (0, progress_1.reportProgressOnSlowPromise)(progress, new vscodeTypes_1.ChatResponseProgressPart(l10n.t("Searching command and setting index....")), this.combinedEmbeddingIndex.nClosestValues(embeddingResult.values[0], shouldIncludeDocsSearch ? 5 : 25), 500)
            : this.combinedEmbeddingIndex.nClosestValues(embeddingResult.values[0], shouldIncludeDocsSearch ? 5 : 25);
        const results = await Promise.allSettled([
            nClosestValuesPromise,
        ]);
        const embeddingResults = results[0].status === 'fulfilled' ? results[0].value : { commands: [], settings: [] };
        return { settings: embeddingResults.settings, commands: embeddingResults.commands, query: userQuery, currentVersion: currentSanitized };
    }
    render(state) {
        const operatingSystem = this.envService.OS;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a Visual Studio Code assistant. Your job is to assist users in using Visual Studio Code by providing knowledge to accomplish their task. This knowledge should focus on settings, commands, keybindings but also includes documentation. ",
                vscpp("br", null),
                state.query.length < 1 && vscpp(vscppf, null,
                    "If the user does not include a question, respond with: I am your Visual Studio Code assistant. I can help you with settings, commands, keybindings, extensions, and documentation. Ask me anything about using or configuring Visual Studio Code.",
                    vscpp("br", null)),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(instructionMessage_1.InstructionMessage, null,
                    "Additional Rules",
                    vscpp("br", null),
                    "If a command or setting references another command or setting, you must respond with both the original and the referenced commands or settings.",
                    vscpp("br", null),
                    "Prefer a setting over a command if the user's request can be achieved by a setting change.",
                    vscpp("br", null),
                    "If answering with a keybinding, please still include the command bound to the keybinding.",
                    vscpp("br", null),
                    "If a keybinding contains a backtick you must escape it. For example the keybinding Ctrl + backtick would be written as ``ctrl + ` ``",
                    vscpp("br", null),
                    "If you believe the context given to you is incorrect or not relevant you may ignore it.",
                    vscpp("br", null),
                    "Always respond with a numbered list of steps to be taken to achieve the desired outcome if multiple steps are necessary.",
                    vscpp("br", null),
                    "If an extension might help the user, you may suggest a search query for the extension marketplace. You must also include the command **Search marketplace** (`workbench.extensions.search`) with args set to the suggested query in the commands section at the end of your response. The query can also contain the tags \"@popular\", \"@recommended\", or \"@featured\" to filter the results.",
                    vscpp("br", null),
                    "The user is working on a ",
                    operatingSystem,
                    " machine. Please respond with system specific commands if applicable.",
                    vscpp("br", null),
                    "If a command or setting is not a valid answer, but it still relates to Visual Studio Code, please still respond.",
                    vscpp("br", null),
                    "If the question is about release notes, you must also include the command **Show release notes** (`update.showCurrentReleaseNotes`) in the commands section at the end of your response.",
                    vscpp("br", null),
                    "If the response includes a command, only reference the command description in the description. Do not include the actual command in the description.",
                    vscpp("br", null),
                    "All responses for settings and commands code blocks must strictly adhere to the template shown below:",
                    vscpp("br", null),
                    vscpp(tag_1.Tag, { name: 'responseTemplate' },
                        vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
{
	"type": "array",
	"items": {
	"type": "object",
	"properties": {
	  "type": {
		"type": "string",
		"enum": ["command", "setting"]
	  },
	  "details": {
		"type": "object",
		"properties": {
		  "key": { "type": "string" },
		  "value": { "type": "string" }
		},
		"required": ["key"]
	  }
	},
	"required": ["type", "details"],
	"additionalProperties": false
	}
}
								`, languageId: 'json' }),
                        vscpp("br", null),
                        "where the `type` is either `setting`, `command`.",
                        vscpp("br", null),
                        "- `setting` is used for responding with a setting to set.",
                        vscpp("br", null),
                        "- `command` is used for responding with a command to execute",
                        vscpp("br", null),
                        "where the `details` is an optional object that contains the setting/command objects.",
                        vscpp("br", null),
                        "- `key` is the setting | command value to use .",
                        vscpp("br", null),
                        "- `value` is the setting value in case of a setting.",
                        vscpp("br", null),
                        "- `value` is the optional arguments to the command in case of a command.",
                        vscpp("br", null)),
                    vscpp(tag_1.Tag, { name: 'examples' },
                        "Below you will find a set of examples of what you should respond with. Please follow these examples as closely as possible.",
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'singleSettingExample' },
                            "Question: How do I disable telemetry?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "Use the **telemetry.telemetryLevel** setting to disable telemetry.",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
[
	{
		"type": "setting",
		"details": {
			"key": "telemetry.telemetryLevel",
			"value": "off"
		}
	}
]
										`, languageId: 'json' })),
                        vscpp(tag_1.Tag, { name: 'singleCommandExample' },
                            "Question: How do I open a specific walkthrough?",
                            vscpp("br", null),
                            "Use the **Welcome: Open Walkthrough...** command to open walkthroughs.",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
[
	{
		"type": "command",
		"details": {
			"key": "workbench.action.openWalkthrough",
		}
	}
]
										`, languageId: 'json' })),
                        vscpp(tag_1.Tag, { name: 'multipleSettingsExample' },
                            "If you are referencing multiple settings, first describe each setting and then include all settings in a single JSON markdown code block, as shown in the template below:",
                            vscpp("br", null),
                            "Question: How can I change the font size in all areas of Visual Studio Code, including the editor, terminal?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "The **editor.fontsize** setting adjusts the font size within the editor.",
                            vscpp("br", null),
                            "The **terminal.integrated.fontSize** setting changes the font size in the integrated terminal.",
                            vscpp("br", null),
                            "This **window.zoomLevel** setting controls the zoom level of the entire Visual Studio Code interface.",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
[
	{
		"type": "setting",
		"details": {
			"key": "editor.fontSize",
			"value": "18"
		}
	},
	{
		"type": "setting",
		"details": {
			"key": "terminal.integrated.fontSize",
			"value": "14"
		}
	},
	{
		"type": "setting",
		"details": {
			"key": "window.zoomLevel",
			"value": "1"
		}
	}
]
										`, languageId: 'json' })),
                        vscpp(tag_1.Tag, { name: 'multipleCommandsExample' },
                            "If you are referencing multiple commands, do not combine all the commands into the same JSON markdown code block.",
                            vscpp("br", null),
                            "Instead, describe each command and include the JSON markdown code block in a numbered list, as shown in the template below:",
                            vscpp("br", null),
                            "Question: How can I setup a python virtual environment in Visual Studio Code?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "Use the **Python: Create Environment** command to create a new python environment.",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
[
	{
		"type": "command",
		"details": {
			"key": "python.createEnvironment"
		}
	}
]
									`, languageId: 'json' }),
                            "Select the environment type (Venv or Conda) from the list.",
                            vscpp("br", null),
                            "If creating a Venv environment, select the interpreter to use as a base for the new virtual environment.",
                            vscpp("br", null),
                            "Wait for the environment creation process to complete. A notification will show the progress.",
                            vscpp("br", null),
                            "Ensure your new environment is selected by using the **Python: Select Interpreter** command.",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
[
	{
		"type": "command",
		"details": {
			"key": "python.setInterpreter"
		}
	}
]
									`, languageId: 'json' })),
                        vscpp(tag_1.Tag, { name: 'noSuchCommandExample' },
                            "Question: How do I move the terminal to a new window?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "There is no such command.",
                            vscpp("br", null)),
                        vscpp(tag_1.Tag, { name: 'invalidQuestionExample' },
                            "Question: How do I bake a potato?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "Sorry this question isn't related to Visual Studio Code.",
                            vscpp("br", null)),
                        vscpp(tag_1.Tag, { name: 'marketplaceSearchExample' },
                            "Question: How do I add PHP support?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "You can use the **Search marketplace** command to search for extensions that add PHP support.",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
[
	{
		"type": "command",
		"details": {
			"key": "workbench.extensions.search",
			"value": "php"
		}
	}
]
										`, languageId: 'json' }),
                            vscpp("br", null))),
                    vscpp(tag_1.Tag, { name: 'extensionSearchResponseRules' },
                        "If you referene any extensions, you must respond with with the identifiers as a comma seperated string inside ```vscode-extensions code block. ",
                        vscpp("br", null),
                        "Do not describe the extension. Simply return the response in the format shown above.",
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'extensionResponseExample' },
                            "Question: What are some popular python extensions?",
                            vscpp("br", null),
                            "Response:",
                            vscpp("br", null),
                            "Here are some popular python extensions.",
                            vscpp("br", null),
                            vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `
ms-python.python,ms-python.vscode-pylance
								`, languageId: 'vscode-extensions' }))),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null))),
            vscpp(conversationHistory_1.ConversationHistoryWithTools, { flexGrow: 1, priority: 700, promptContext: this.props.promptContext }),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 800 },
                "Use the examples above to help you formulate your response and follow the examples as closely as possible. Below is a list of information we found which might be relevant to the question. For view related commands \"Toggle\" often means Show or Hide. A setting may reference another setting, that will appear as \\`#setting.id#\\`, you must return the referenced setting as well. You may use this context to help you formulate your response, but are not required to.",
                vscpp("br", null),
                state.commands.length > 0 && vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'command' },
                        "Here are some possible commands:",
                        vscpp("br", null),
                        state.commands.map(c => vscpp(prompt_tsx_1.TextChunk, null,
                            "- ",
                            c.label,
                            " (\"",
                            c.key,
                            "\") (Keybinding: \"",
                            c.keybinding,
                            "\")")))),
                state.settings.length > 0 && vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'settings' },
                        "Here are some possible settings:",
                        vscpp("br", null),
                        state.settings.map(c => vscpp(prompt_tsx_1.TextChunk, null, (0, vscodeIndex_1.settingItemToContext)(c))))),
                state.currentVersion && vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'currentVSCodeVersion' },
                        "Current VS Code version (major.minor): ",
                        state.currentVersion),
                    vscpp("br", null)),
                state.releaseNotes && state.releaseNotes.length > 0 && vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: 'releaseNotes' },
                        "Below are release notes which might be relevant to the question. ",
                        vscpp("br", null),
                        state.releaseNotes.map(rn => vscpp(vscppf, null,
                            vscpp(prompt_tsx_1.TextChunk, null,
                                "Version ",
                                rn.version,
                                ":"),
                            vscpp("br", null),
                            vscpp(prompt_tsx_1.TextChunk, null, rn.notes))))),
                vscpp(tag_1.Tag, { name: 'vscodeAPIToolUseInstructions' },
                    "Always call the tool ",
                    toolNames_1.ToolName.VSCodeAPI,
                    " to get documented references and examples when before responding to questions about VS Code Extension Development.",
                    vscpp("br", null)),
                vscpp(tag_1.Tag, { name: 'searchExtensionToolUseInstructions' },
                    "Always call the tool 'vscode_searchExtensions_internal' to first search for extensions in the VS Code Marketplace before responding about extensions.",
                    vscpp("br", null)),
                vscpp(tag_1.Tag, { name: 'vscodeCmdToolUseInstructions' },
                    "Call the tool ",
                    toolNames_1.ToolName.RunVscodeCmd,
                    " to run commands in Visual Studio Code, only use as part of a new workspace creation process. ",
                    vscpp("br", null),
                    "You must use the command name as the `name` field and the command ID as the `commandId` field in the tool call input with any arguments for the command in a `map` array.",
                    vscpp("br", null),
                    "For example, to run the command `workbench.action.openWith`, you would use the following input:",
                    vscpp("br", null),
                    vscpp(unsafeElements_1.UnsafeCodeBlock, { code: `{
						"name": "workbench.action.openWith",
						"commandId": "workbench.action.openWith",
						"args": ["file:///path/to/file.txt", "default"]
					}
					` }))),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 850, flexGrow: 2, promptContext: { ...this.props.promptContext, query: state.query }, embeddedInsideUserMessage: false }),
            vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, toolCallRounds: this.props.promptContext.toolCallRounds, toolCallResults: this.props.promptContext.toolCallResults }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: this.props.promptContext.chatVariables, query: this.props.promptContext.query, embeddedInsideUserMessage: false })));
    }
};
exports.VscodePrompt = VscodePrompt;
exports.VscodePrompt = VscodePrompt = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, embeddingsComputer_1.IEmbeddingsComputer),
    __param(3, endpointProvider_1.IEndpointProvider),
    __param(4, vscodeIndex_1.ICombinedEmbeddingIndex),
    __param(5, envService_1.IEnvService),
    __param(6, instantiation_1.IInstantiationService),
    __param(7, releaseNotesService_1.IReleaseNotesService)
], VscodePrompt);
class VscodeMetaPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a Visual Studio Code assistant who helps the user create well-formed and unambiguous queries about their Visual Studio Code development environment.",
                vscpp("br", null),
                "Specifically, you help users rewrite questions about how to use Visual Studio Code's Commands and Settings."),
            vscpp(conversationHistory_1.HistoryWithInstructions, { historyPriority: 500, passPriority: true, history: this.props.history || [] },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "Evaluate the question to determine the user's intent. ",
                    vscpp("br", null),
                    "Determine if the user's question is about the editor, terminal, activity bar, side bar, status bar, panel or other parts of Visual Studio Code's workbench and include those keyword in the rewrite.",
                    vscpp("br", null),
                    "Determine if the user is asking about Visual Studio Code's Commands and/or Settings and explicitly include those keywords during the rewrite. ",
                    vscpp("br", null),
                    "If the question does not clearly indicate whether it pertains to a command or setting, categorize it as an \u2018Other Question\u2019 ",
                    vscpp("br", null),
                    "If the user is asking about Visual Studio Code Release Notes, respond using this exact protocol and do not rephrase the question: ",
                    vscpp("br", null),
                    "- Respond with only one of the following: `release_notes@latest` or `release_notes@last3`.",
                    vscpp("br", null),
                    "- If the user does not specify a timeframe, respond with: `release_notes@latest`.",
                    vscpp("br", null),
                    "- If the request is vague about a timeframe (e.g., \"recent changes\"), respond with: `release_notes@last3` to consider the last three versions (major.minor).",
                    vscpp("br", null),
                    "- If the user asks to find or locate a specific change/feature in the release notes, respond with: `release_notes@last3` to search across the last three versions (major.minor).",
                    vscpp("br", null),
                    "If the user is asking about Extensions available in Visual Studio Code, simply respond with \"vscode_extensions\"",
                    vscpp("br", null),
                    "If the user is asking about Visual Studio Code API or Visual Studio Code Extension Development, simply respond with \"vscode_api\"",
                    vscpp("br", null),
                    "Remove any references to \"What\" or \"How\" and instead rewrite the question as a description of the command or setting that the user is trying to find. ",
                    vscpp("br", null),
                    "Respond in Markdown. Under a `# Question` header, output a rephrased version of the user's question that resolves all pronouns and ambiguous words like 'this' to the specific nouns they stand for.",
                    vscpp("br", null),
                    "If it is not clear what the user is asking for or if the question appears to be unrelated to Visual Studio Code, do not try to rephrase the question and simply return the original question. ",
                    vscpp("br", null),
                    "DO NOT ask the user for additional information or clarification.",
                    vscpp("br", null),
                    "DO NOT answer the user's question directly.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Additional Rules",
                    vscpp("br", null),
                    vscpp("br", null),
                    "2. If the question contains pronouns such as 'it' or 'that', try to understand what the pronoun refers to by looking at the rest of the question and the conversation history.",
                    vscpp("br", null),
                    "3. If the question contains an ambiguous word such as 'this', try to understand what 'this' refers to by looking at the rest of the question and the conversation history.",
                    vscpp("br", null),
                    "4. After a `# Question` header, output a precise version of the question that resolves all pronouns and ambiguous words like 'this' to the specific nouns they stand for. Be sure to preserve the exact meaning of the question.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Examples",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: opne cmmand palete",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Command to open command palette",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: How do I change change font size in the editor?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Command or setting to change the font size in the editor",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: What is the setting to move editor and pin it",
                    vscpp("br", null),
                    "Assistant: ",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Settings to move and pin editor",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: latest released features",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "release_notes@latest",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: What are the recent changes?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "release_notes@last3",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: set up python",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Other Question",
                    vscpp("br", null),
                    "Set up python development in Visual Studio Code",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: Show me popular extensions",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "vscode_extensions",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: How do I contribute a command to my extension?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "vscode_api",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 }, this.props.query));
    }
}
function parseMetaPromptResponse(originalQuestion, response) {
    const match = response.match(/#+\s*(Question|Other Question)\n(?<question>.+)/si);
    if (!match?.groups) {
        return originalQuestion.trim();
    }
    return match.groups['question'].trim();
}
function getLastNMinorVersions(current, n) {
    const m = /^(\d+)\.(\d+)$/.exec(current);
    if (!m) {
        return [current];
    }
    const major = parseInt(m[1], 10);
    let minor = parseInt(m[2], 10);
    const out = [];
    for (let i = 0; i < n && minor >= 0; i++, minor--) {
        out.push(`${major}.${minor}`);
    }
    return out;
}
//# sourceMappingURL=vscode.js.map