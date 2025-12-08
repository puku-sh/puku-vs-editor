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
exports.NewFilesLocationHint = exports.WorkingSet = exports.EditCodeUserMessage = exports.EditCodeReadonlyInstructions = exports.EditCodePrompt = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../../util/common/markdown");
const types_1 = require("../../../../util/common/types");
const map_1 = require("../../../../util/vs/base/common/map");
const network_1 = require("../../../../util/vs/base/common/network");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const editCodeStep_1 = require("../../../intents/node/editCodeStep");
const intents_1 = require("../../../prompt/common/intents");
const common_1 = require("../base/common");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const summarizeDocumentHelpers_1 = require("../inline/summarizedDocument/summarizeDocumentHelpers");
const chatVariables_1 = require("./chatVariables");
const codeBlockFormattingRules_1 = require("./codeBlockFormattingRules");
const customInstructions_1 = require("./customInstructions");
const fileVariable_1 = require("./fileVariable");
const notebookEditCodePrompt_1 = require("./notebookEditCodePrompt");
const projectLabels_1 = require("./projectLabels");
const safeElements_1 = require("./safeElements");
const toolCalling_1 = require("./toolCalling");
let EditCodePrompt = class EditCodePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, promptPathRepresentationService) {
        super(props);
        this.configurationService = configurationService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async render(state, sizing) {
        const tsExampleFilePath = '/Users/someone/proj01/example.ts';
        const instructionsAfterHistory = (0, chatModelCapabilities_1.modelPrefersInstructionsAfterHistory)(this.props.endpoint.family);
        const hasFilesInWorkingSet = this.props.promptContext.workingSet.length > 0;
        const instructions = vscpp(instructionMessage_1.InstructionMessage, { priority: 900 },
            hasFilesInWorkingSet
                ? vscpp(vscppf, null,
                    "The user has a request for modifying one or more files.",
                    vscpp("br", null))
                : vscpp(vscppf, null,
                    "If the user asks a question, then answer it.",
                    vscpp("br", null),
                    "If you need to change existing files and it's not clear which files should be changed, then refuse and answer with \"Please add the files to be modified to the working set",
                    (this.configurationService.getConfig(configurationService_1.ConfigKey.CodeSearchAgentEnabled) || this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.CodeSearchAgentEnabled)) ? ", or use `#codebase` in your request to automatically discover working set files." : "",
                    "\".",
                    vscpp("br", null),
                    "The only exception is if you need to create new files. In that case, follow the following instructions.",
                    vscpp("br", null)),
            "1. Please come up with a solution that you first describe step-by-step.",
            vscpp("br", null),
            "2. Group your changes by file. Use the file path as the header.",
            vscpp("br", null),
            "3. For each file, give a short summary of what needs to be changed followed by a code block that contains the code changes.",
            vscpp("br", null),
            "4. The code block should start with four backticks followed by the language.",
            vscpp("br", null),
            "5. On the first line of the code block add a comment containing the filepath. This includes Markdown code blocks.",
            vscpp("br", null),
            "6. Use a single code block per file that needs to be modified, even if there are multiple changes for a file.",
            vscpp("br", null),
            "7. The user is very smart and can understand how to merge your code blocks into their files, you just need to provide minimal hints.",
            vscpp("br", null),
            "8. Avoid repeating existing code, instead use comments to represent regions of unchanged code. The user prefers that you are as concise as possible. For example: ",
            vscpp("br", null),
            vscpp(safeElements_1.ExampleCodeBlock, { languageId: "languageId", examplePath: '/path/to/file', includeFilepath: true, minNumberOfBackticks: 4, code: [
                    `// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`,
                    `{ changed code }`,
                    `// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`,
                    `{ changed code }`,
                    `// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`
                ].join('\n') }),
            vscpp("br", null),
            vscpp("br", null),
            vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
            "Here is an example of how you should format a code block belonging to the file example.ts in your response:",
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: "example" },
                "### ",
                this.promptPathRepresentationService.getExampleFilePath(tsExampleFilePath),
                vscpp("br", null),
                vscpp("br", null),
                "Add a new property 'age' and a new method 'getAge' to the class Person.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(safeElements_1.ExampleCodeBlock, { languageId: "typescript", examplePath: tsExampleFilePath, includeFilepath: true, minNumberOfBackticks: 4, code: [
                        `class Person {`,
                        `	// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`,
                        `	age: number;`,
                        `	// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`,
                        `	getAge() {`,
                        `		return this.age;`,
                        `	}`,
                        `}`,
                    ].join('\n') }),
                vscpp("br", null)));
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            instructionsAfterHistory ? undefined : instructions,
            vscpp(EditCodeConversationHistory, { flexGrow: 1, priority: 700, workingSet: this.props.promptContext.workingSet, history: this.props.promptContext.history, promptInstructions: this.props.promptContext.promptInstructions, chatVariables: this.props.promptContext.chatVariables }),
            instructionsAfterHistory ? instructions : undefined,
            vscpp(EditCodeUserMessage, { flexGrow: 2, priority: 900, ...this.props }),
            vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 3, promptContext: this.props.promptContext, toolCallRounds: this.props.promptContext.toolCallRounds, toolCallResults: this.props.promptContext.toolCallResults })));
    }
};
exports.EditCodePrompt = EditCodePrompt;
exports.EditCodePrompt = EditCodePrompt = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], EditCodePrompt);
let EditCodeReadonlyInstructions = class EditCodeReadonlyInstructions extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        const { readonlyUris } = this;
        if (!readonlyUris.length) {
            return vscpp(vscppf, null);
        }
        return vscpp(prompt_tsx_1.TextChunk, null,
            '<fileRestrictions>',
            vscpp("br", null),
            "The following files are readonly. Making edits to any of these file paths is FORBIDDEN. If you cannot accomplish the task without editing the files, briefly explain why, but NEVER edit any of these files:",
            vscpp("br", null),
            readonlyUris.map(uri => `\t- ${this.promptPathRepresentationService.getFilePath(uri)}`).join('\n'),
            vscpp("br", null),
            '</fileRestrictions>');
    }
    /**
     * List of {@link Uri}s for all `readonly` variables, if any.
     */
    get readonlyUris() {
        // get list of URIs for readonly variables inside the working set
        const readonlyUris = [];
        for (const entry of this.props.workingSet) {
            if (entry.isMarkedReadonly) {
                readonlyUris.push(entry.document.uri);
            }
        }
        for (const variable of this.props.chatVariables) {
            if (variable.isMarkedReadonly) {
                if ((0, types_1.isUri)(variable.value)) {
                    readonlyUris.push(variable.value);
                }
                else if ((0, types_1.isLocation)(variable.value)) {
                    readonlyUris.push(variable.value.uri);
                }
            }
        }
        return readonlyUris;
    }
};
exports.EditCodeReadonlyInstructions = EditCodeReadonlyInstructions;
exports.EditCodeReadonlyInstructions = EditCodeReadonlyInstructions = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], EditCodeReadonlyInstructions);
let EditCodeConversationHistory = class EditCodeConversationHistory extends prompt_tsx_1.PromptElement {
    constructor(props, _promptPathRepresentationService) {
        super(props);
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async render(state, sizing) {
        // Here we will keep track of which [file,version] pairs that are already in the prompt
        const includedFilesAtVersions = new map_1.ResourceMap();
        // Populate with the current state
        for (const entry of this.props.workingSet) {
            includedFilesAtVersions.set(entry.document.uri, [entry.document.version]);
        }
        // Ditto for prompt instruction files
        const includedPromptInstructions = new map_1.ResourceMap();
        for (const promptInstruction of this.props.promptInstructions) {
            includedPromptInstructions.set(promptInstruction.uri, [promptInstruction.version]);
        }
        const history = [];
        for (const turn of this.props.history) {
            const editCodeStep = editCodeStep_1.PreviousEditCodeStep.fromTurn(turn);
            if (editCodeStep) {
                history.push(this._renderUserMessageWithoutFiles(editCodeStep, includedFilesAtVersions, includedPromptInstructions));
                history.push(this._renderAssistantMessageWithoutFileTags(editCodeStep.response));
            }
        }
        return (vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority, descending: false }, history));
    }
    _renderAssistantMessageWithoutFileTags(message) {
        message = message.replace(/<\/?file>/g, '');
        return (vscpp(prompt_tsx_1.AssistantMessage, null, message));
    }
    _renderUserMessageWithoutFiles(editCodeStep, includedFilesAtVersion, includedPromptInstructions) {
        const filesToRemove = [];
        for (const entry of editCodeStep.workingSet) {
            const versions = includedFilesAtVersion.get(entry.document.uri) ?? [];
            const isAlreadyIncluded = versions.some(version => version === entry.document.version);
            if (isAlreadyIncluded) {
                filesToRemove.push(entry.document.uri);
            }
            else {
                versions.push(entry.document.version);
                includedFilesAtVersion.set(entry.document.uri, versions);
            }
        }
        const promptInstructionsToRemove = [];
        for (const entry of editCodeStep.promptInstructions) {
            const versions = includedPromptInstructions.get(entry.document.uri) ?? [];
            const isAlreadyIncluded = versions.some(version => version === entry.document.version);
            if (isAlreadyIncluded) {
                promptInstructionsToRemove.push(entry.document.uri);
            }
        }
        let userMessage = this._removePromptInstructionsFromPastUserMessage(editCodeStep.request, promptInstructionsToRemove);
        userMessage = this._removeFilesFromPastUserMessage(userMessage, filesToRemove);
        userMessage = this._removeReminders(userMessage);
        return (vscpp(prompt_tsx_1.UserMessage, null, userMessage));
    }
    _removePromptInstructionsFromPastUserMessage(userMessage, shouldRemove) {
        const interestingFilePaths = shouldRemove.map(uri => this._promptPathRepresentationService.getFilePath(uri));
        return userMessage.replace(/<instructions>[\s\S]*?<\/instructions>/g, (match) => {
            if (interestingFilePaths.some(path => match.includes(path))) {
                return '';
            }
            return match;
        });
    }
    _removeFilesFromPastUserMessage(userMessage, shouldRemove) {
        const interestingFilePaths = shouldRemove.map(uri => `${markdown_1.filepathCodeBlockMarker} ${this._promptPathRepresentationService.getFilePath(uri)}`);
        return userMessage.replace(/<file(-selection)?>[\s\S]*?<\/file(-selection)?>/g, (match) => {
            if (interestingFilePaths.some(path => match.includes(path))) {
                return '';
            }
            return match;
        });
    }
    _removeReminders(userMessage) {
        return userMessage.replace(/^<reminder>[\s\S]*?^<\/reminder>/gm, (match) => {
            return '';
        });
    }
};
EditCodeConversationHistory = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], EditCodeConversationHistory);
let EditCodeUserMessage = class EditCodeUserMessage extends prompt_tsx_1.PromptElement {
    constructor(props, experimentationService, _configurationService) {
        super(props);
        this.experimentationService = experimentationService;
        this._configurationService = _configurationService;
    }
    async render(state, sizing) {
        const { query, chatVariables, workingSet } = this.props.promptContext;
        const useProjectLabels = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsChat, this.experimentationService);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null,
                useProjectLabels && vscpp(projectLabels_1.ProjectLabels, { flexGrow: 1, priority: 600 }),
                vscpp(customInstructions_1.CustomInstructions, { flexGrow: 6, priority: 750, languageId: undefined, chatVariables: chatVariables }),
                vscpp(notebookEditCodePrompt_1.NotebookFormat, { flexGrow: 5, priority: 810, chatVariables: workingSet, query: query }),
                vscpp(chatVariables_1.ChatToolReferences, { flexGrow: 4, priority: 898, promptContext: this.props.promptContext, documentContext: this.props.documentContext }),
                vscpp(chatVariables_1.ChatVariables, { flexGrow: 3, priority: 898, chatVariables: chatVariables }),
                vscpp(WorkingSet, { flexGrow: 3, flexReserve: sizing.tokenBudget * 0.8, priority: 810, workingSet: workingSet }),
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'reminder', flexGrow: 2, priority: 899 },
                    "Avoid repeating existing code, instead use a line comment with `",
                    codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
                    "` to represent regions of unchanged code.",
                    vscpp("br", null),
                    "The code block for each file being edited must start with a comment containing the filepath. This includes Markdown code blocks.",
                    vscpp("br", null),
                    "For existing files, make sure the filepath exactly matches the filepath of the original file.",
                    vscpp("br", null),
                    vscpp(notebookEditCodePrompt_1.NotebookReminderInstructions, { chatVariables: chatVariables, query: query }),
                    vscpp(NewFilesLocationHint, null)),
                query && vscpp(tag_1.Tag, { name: 'prompt' },
                    vscpp(chatVariables_1.UserQuery, { flexGrow: 7, priority: 900, chatVariables: chatVariables, query: query })),
                vscpp(EditCodeReadonlyInstructions, { chatVariables: chatVariables, workingSet: workingSet }))));
    }
};
exports.EditCodeUserMessage = EditCodeUserMessage;
exports.EditCodeUserMessage = EditCodeUserMessage = __decorate([
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, configurationService_1.IConfigurationService)
], EditCodeUserMessage);
class WorkingSet extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { workingSet } = this.props;
        return (workingSet.length ?
            vscpp(vscppf, null,
                "The user has provided the following files as input. Always make changes to these files unless the user asks to create a new file.",
                vscpp("br", null),
                "Untitled files are files that are not yet named. Make changes to them like regular files.",
                vscpp("br", null),
                workingSet.map((entry, index) => ((0, intents_1.isTextDocumentWorkingSetEntry)(entry) ?
                    vscpp(TextDocumentWorkingSetEntry, { entry: entry, flexGrow: index }) :
                    vscpp(NotebookWorkingSetEntry, { entry: entry, flexGrow: index })))) :
            vscpp(vscppf, null));
    }
}
exports.WorkingSet = WorkingSet;
let NewFilesLocationHint = class NewFilesLocationHint extends prompt_tsx_1.PromptElement {
    constructor(props, _workspaceService, _promptPathRepresentationService) {
        super(props);
        this._workspaceService = _workspaceService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    render(state, sizing) {
        const workspaceFolders = this._workspaceService.getWorkspaceFolders();
        if (workspaceFolders.length === 1) {
            return vscpp(vscppf, null,
                "When suggesting to create new files, pick a location inside `",
                this._promptPathRepresentationService.getFilePath(workspaceFolders[0]),
                "`.");
        }
        else if (workspaceFolders.length > 0) {
            return vscpp(vscppf, null,
                "When suggesting to create new files, pick a location inside one of these root folders: ",
                workspaceFolders.map(f => `${this._promptPathRepresentationService.getFilePath(f)}`).join(', '),
                ".");
        }
        else {
            const untitledRoot = vscodeTypes_1.Uri.from({ scheme: network_1.Schemas.untitled, authority: 'untitled' });
            return vscpp(vscppf, null,
                "When suggesting to create new files, pick a location inside `",
                this._promptPathRepresentationService.getFilePath(untitledRoot),
                "`.");
        }
    }
};
exports.NewFilesLocationHint = NewFilesLocationHint;
exports.NewFilesLocationHint = NewFilesLocationHint = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], NewFilesLocationHint);
let TextDocumentWorkingSetEntry = class TextDocumentWorkingSetEntry extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, instantiationService) {
        super(props);
        this._ignoreService = _ignoreService;
        this.instantiationService = instantiationService;
    }
    async render(state, sizing) {
        const { document, range: selection, state: workingSetEntryState } = this.props.entry;
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        const s = this.instantiationService.createInstance(summarizeDocumentHelpers_1.DocumentSummarizer);
        const summarized = await s.summarizeDocument(document, undefined, selection, sizing.tokenBudget, {
            costFnOverride: fileVariable_1.fileVariableCostFn,
        });
        const promptReferenceOptions = !summarized.isOriginal
            ? { status: { description: l10n.t('Part of this file was not sent to the model due to context window limitations. Try attaching specific selections from your file instead.'), kind: 2 } }
            : undefined;
        let userActionStateFragment = '';
        if (workingSetEntryState === intents_1.WorkingSetEntryState.Accepted) {
            userActionStateFragment = 'I applied your suggestions for this file and accepted them. Here is the updated file:';
        }
        else if (workingSetEntryState === intents_1.WorkingSetEntryState.Rejected) {
            userActionStateFragment = 'I considered your suggestions for this file but rejected them. Here is the file:';
        }
        else if (workingSetEntryState === intents_1.WorkingSetEntryState.Undecided) {
            userActionStateFragment = 'I applied your suggestions for this file but haven\'t decided yet if I accept or reject them. Here is the updated file:';
        }
        return (vscpp(common_1.CompositeElement, { priority: this.props.priority },
            vscpp(prompt_tsx_1.Chunk, { priority: 2 },
                vscpp(tag_1.Tag, { name: "file" },
                    userActionStateFragment && vscpp(vscppf, null,
                        vscpp("br", null),
                        "<status>",
                        userActionStateFragment,
                        "</status>",
                        vscpp("br", null)),
                    vscpp(safeElements_1.CodeBlock, { includeFilepath: true, languageId: document.languageId, uri: document.uri, references: [new prompt_tsx_1.PromptReference(document.uri, undefined, promptReferenceOptions)], code: summarized.text }))),
            !!selection && vscpp(FileSelection, { document: document, selection: selection, priority: 1 })));
    }
};
TextDocumentWorkingSetEntry = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService)
], TextDocumentWorkingSetEntry);
let NotebookWorkingSetEntry = class NotebookWorkingSetEntry extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, instantiationService) {
        super(props);
        this._ignoreService = _ignoreService;
        this.instantiationService = instantiationService;
    }
    async render(state, sizing) {
        const { document, range: selection, state: workingSetEntryState } = this.props.entry;
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        // TODO@rebornix ensure notebook is open
        const s = this.instantiationService.createInstance(summarizeDocumentHelpers_1.NotebookDocumentSummarizer);
        const summarized = await s.summarizeDocument(document, undefined, selection, sizing.tokenBudget, {
            costFnOverride: fileVariable_1.fileVariableCostFn,
        });
        const promptReferenceOptions = !summarized.isOriginal
            ? { status: { description: l10n.t('Part of this file was not sent to the model due to context window limitations. Try attaching specific selections from your file instead.'), kind: 2 } }
            : undefined;
        let userActionStateFragment = '';
        if (workingSetEntryState === intents_1.WorkingSetEntryState.Accepted) {
            userActionStateFragment = 'I applied your suggestions for this file and accepted them. Here is the updated file:';
        }
        else if (workingSetEntryState === intents_1.WorkingSetEntryState.Rejected) {
            userActionStateFragment = 'I considered your suggestions for this file but rejected them. Here is the file:';
        }
        else if (workingSetEntryState === intents_1.WorkingSetEntryState.Undecided) {
            userActionStateFragment = 'I applied your suggestions for this file but haven\'t decided yet if I accept or reject them. Here is the updated file:';
        }
        // Kernel variables are useful only if we're in inline chat mode.
        // This is the logic we used to have with inline chat for notebooks.
        return (vscpp(common_1.CompositeElement, { priority: this.props.priority },
            vscpp(prompt_tsx_1.Chunk, { priority: 2 },
                "This is a notebook file: ",
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: "file" },
                    userActionStateFragment && vscpp(vscppf, null,
                        vscpp("br", null),
                        "<status>",
                        userActionStateFragment,
                        "</status>",
                        vscpp("br", null)),
                    vscpp(safeElements_1.CodeBlock, { includeFilepath: true, languageId: document.languageId, uri: document.uri, references: [new prompt_tsx_1.PromptReference(document.uri, undefined, promptReferenceOptions)], code: summarized.text }))),
            !!selection && vscpp(FileSelection, { document: document, selection: selection, priority: 1 })));
    }
};
NotebookWorkingSetEntry = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService)
], NotebookWorkingSetEntry);
let FileSelection = class FileSelection extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService) {
        super(props);
        this._ignoreService = _ignoreService;
    }
    async render(state, sizing) {
        const { document, selection } = this.props;
        if (!document || !selection) {
            return undefined;
        }
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        if (document.lineCount >= 4) {
            const selectionLines = [];
            const charactersInSelectionLines = () => selectionLines.reduce((acc, line) => acc + line.length, 0);
            let selectionStartLine = Math.min(document.lineCount - 1, Math.max(0, selection.start.line));
            let selectionEndLine = Math.min(document.lineCount - 1, selection.end.line);
            if (selectionEndLine > selectionStartLine && selection.end.character === 0) {
                selectionEndLine--;
            }
            if (selectionStartLine < selectionEndLine && selection.start.character === document.lineAt(selectionStartLine).text.length) {
                selectionStartLine++;
            }
            for (let i = selectionStartLine; i <= selectionEndLine; i++) {
                const line = document.lineAt(i);
                selectionLines.push(line.text);
            }
            // render at least 4 lines as selected
            let above = selectionStartLine - 1;
            let below = selectionEndLine + 1;
            while (selectionLines.length < 4 && charactersInSelectionLines() < 10) {
                if (above >= 0) {
                    selectionLines.unshift(document.lineAt(above).text);
                    above--;
                }
                if (below < document.lineCount) {
                    selectionLines.push(document.lineAt(below).text);
                    below++;
                }
            }
            // TODO@tags: adopt tags here once <Tag> fixes whitespace problems
            return (vscpp(prompt_tsx_1.Chunk, null,
                "<file-selection>",
                vscpp(safeElements_1.CodeBlock, { includeFilepath: true, languageId: document.languageId, uri: document.uri, references: [new prompt_tsx_1.PromptReference(document.uri, undefined)], code: selectionLines.join('\n'), shouldTrim: false }),
                vscpp("br", null),
                "</file-selection>"));
        }
        else {
            return undefined;
        }
    }
};
FileSelection = __decorate([
    __param(1, ignoreService_1.IIgnoreService)
], FileSelection);
//# sourceMappingURL=editCodePrompt.js.map