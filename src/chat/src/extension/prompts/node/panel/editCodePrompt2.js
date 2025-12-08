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
exports.EditCodePrompt2 = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const types_1 = require("../../../../util/common/types");
const toolNames_1 = require("../../../tools/common/toolNames");
const toolsService_1 = require("../../../tools/common/toolsService");
const agentPrompt_1 = require("../agent/agentPrompt");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("./chatVariables");
const codeBlockFormattingRules_1 = require("./codeBlockFormattingRules");
const conversationHistory_1 = require("./conversationHistory");
const customInstructions_1 = require("./customInstructions");
const editCodePrompt_1 = require("./editCodePrompt");
const notebookEditCodePrompt_1 = require("./notebookEditCodePrompt");
const projectLabels_1 = require("./projectLabels");
const toolCalling_1 = require("./toolCalling");
let EditCodePrompt2 = class EditCodePrompt2 extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, toolsService) {
        super(props);
        this.configurationService = configurationService;
        this.toolsService = toolsService;
    }
    async render(state, sizing) {
        const instructionsAfterHistory = (0, chatModelCapabilities_1.modelPrefersInstructionsAfterHistory)(this.props.endpoint.family);
        const hasFilesInWorkingSet = this.props.promptContext.chatVariables.find(variable => (0, types_1.isUri)(variable.value) || (0, types_1.isLocation)(variable.value)) !== undefined;
        const userGoalInstructions = vscpp(vscppf, null, hasFilesInWorkingSet
            ? vscpp(vscppf, null, "The user has a request for modifying one or more files.")
            : vscpp(vscppf, null,
                "If the user asks a question, then answer it.",
                vscpp("br", null),
                "If you need to change existing files and it's not clear which files should be changed, then refuse and answer with \"Please add the files to be modified to the working set",
                (this.configurationService.getConfig(configurationService_1.ConfigKey.CodeSearchAgentEnabled) || this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.CodeSearchAgentEnabled)) ? ", or use `#codebase` in your request to automatically discover working set files." : "",
                "\".",
                vscpp("br", null),
                "The only exception is if you need to create new files. In that case, follow the following instructions."));
        const hasReplaceStringTool = this.toolsService.getTool(toolNames_1.ToolName.ReplaceString) !== undefined;
        const instructions = vscpp(instructionMessage_1.InstructionMessage, { priority: 900 },
            vscpp(tag_1.Tag, { name: "instructions" },
                "You are a highly sophisticated automated coding agent with expert-level knowledge across many different programming languages and frameworks.",
                vscpp("br", null),
                "You are capable of making complex code edits across multiple files, and you can also create new files.",
                vscpp("br", null),
                "You have a tool that you can use to edit and create files.",
                vscpp("br", null),
                userGoalInstructions,
                vscpp("br", null),
                "For each file, first give a very short summary of what needs to be changed, then use the tool to edit the file. If you want to edit multiple files, you can use the tool multiple times in a response to edit multiple files simultaneously. This is faster than editing files one by one.",
                vscpp("br", null),
                "Describe the changes you'll make BEFORE editing the files. But never write out a codeblock with the changes, only pass them to the tool.",
                vscpp("br", null),
                "NEVER print out a codeblock with file changes unless the user asked for it. Use the ",
                toolNames_1.ToolName.EditFile,
                hasReplaceStringTool && vscpp(vscppf, null,
                    " or ",
                    toolNames_1.ToolName.ReplaceString),
                " tool instead.",
                vscpp("br", null),
                "Do not summarize the changes after making the edits.",
                vscpp("br", null),
                "When describing your changes to the user, keep your descriptions very concise and to the point, and do not repeat anything that you previously described."),
            vscpp(tag_1.Tag, { name: 'toolUseInstructions' },
                "When using a tool, follow the json schema very carefully and make sure to include ALL required properties.",
                vscpp("br", null),
                "Always output valid JSON when using a tool.",
                vscpp("br", null),
                "If a tool exists to do a task, use the tool instead of asking the user to manually take an action.",
                vscpp("br", null),
                "If you say that you will take an action, then go ahead and use the tool to do it. No need to ask permission.",
                vscpp("br", null),
                "Never use multi_tool_use.parallel or any tool that does not exist. Use tools using the proper procedure, DO NOT write out a json codeblock with the tool inputs.",
                vscpp("br", null),
                "NEVER say the name of a tool to a user. For example, instead of saying that you'll use the ",
                toolNames_1.ToolName.EditFile,
                " tool, say \"I'll edit the project.js file\".",
                vscpp("br", null),
                "The ",
                toolNames_1.ToolName.CreateNewJupyterNotebook,
                " tool generates a new Jupyter Notebook (.ipynb) in VS Code. Jupyter Notebooks are interactive documents commonly used for data exploration, analysis, visualization, and combining code with narrative text. This tool should only be called when the user explicitly requests to create a new Jupyter Notebook.",
                vscpp("br", null)),
            vscpp(tag_1.Tag, { name: 'editFileInstructions' },
                hasReplaceStringTool ?
                    vscpp(vscppf, null,
                        "Use the ",
                        toolNames_1.ToolName.ReplaceString,
                        " tool to replace a string in a file, but only if you are sure that the string is unique enough to not cause any issues. You can use this tool multiple times per file.",
                        vscpp("br", null),
                        "Use the ",
                        toolNames_1.ToolName.EditFile,
                        " tool to insert code into a file.",
                        vscpp("br", null),
                        "When editing files, group your changes by file.",
                        vscpp("br", null),
                        "NEVER show the changes to the user, just call the tool, and the edits will be applied and shown to the user.",
                        vscpp("br", null),
                        "NEVER print a codeblock that represents a change to a file, use ",
                        toolNames_1.ToolName.EditFile,
                        " or ",
                        toolNames_1.ToolName.ReplaceString,
                        " instead.",
                        vscpp("br", null),
                        "For each file, give a short description of what needs to be changed, then use the ",
                        toolNames_1.ToolName.ReplaceString,
                        " or ",
                        toolNames_1.ToolName.EditFile,
                        " tools. You can use any tool multiple times in a response, and you can keep writing text after using a tool.",
                        vscpp("br", null)) :
                    vscpp(vscppf, null,
                        "Use the ",
                        toolNames_1.ToolName.EditFile,
                        " tool to edit files. When editing files, group your changes by file.",
                        vscpp("br", null),
                        "NEVER show the changes to the user, just call the tool, and the edits will be applied and shown to the user.",
                        vscpp("br", null),
                        "NEVER print a codeblock that represents a change to a file, use ",
                        toolNames_1.ToolName.EditFile,
                        " instead.",
                        vscpp("br", null),
                        "For each file, give a short description of what needs to be changed, then use the ",
                        toolNames_1.ToolName.EditFile,
                        " tool. You can use any tool multiple times in a response, and you can keep writing text after using a tool.",
                        vscpp("br", null)),
                "The ",
                toolNames_1.ToolName.EditFile,
                " tool is very smart and can understand how to apply your edits to their files, you just need to provide minimal hints.",
                vscpp("br", null),
                "Avoid repeating existing code, instead use comments to represent regions of unchanged code. The tool prefers that you are as concise as possible. For example:",
                vscpp("br", null)
            // {EXISTING_CODE_MARKER}<br />
            ,
                "// ",
                codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
                vscpp("br", null),
                "changed code",
                vscpp("br", null)
            // {EXISTING_CODE_MARKER}<br />
            ,
                "// ",
                codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
                vscpp("br", null),
                "changed code",
                vscpp("br", null)
            // {EXISTING_CODE_MARKER}<br />
            ,
                "// ",
                codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
                vscpp("br", null),
                vscpp("br", null),
                "Here is an example of how you should format an edit to an existing Person class when using ",
                toolNames_1.ToolName.EditFile,
                ":",
                vscpp("br", null),
                [
                    `class Person {`,
                    `	// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`,
                    `	age: number;`,
                    `	// ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER}`,
                    `	getAge() {`,
                    `		return this.age;`,
                    `	}`,
                    `}`
                ].join('\n')),
            vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
            "Here is an example of how you should reply to edit the file example.ts. Notice that the response is very short and to the point:",
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: "example" },
                "I will add a new property 'age' and a new method 'getAge' to the class Person.",
                vscpp("br", null),
                "(Then you use ",
                toolNames_1.ToolName.EditFile,
                " in the proper format.)"));
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            instructionsAfterHistory ? undefined : instructions,
            vscpp(conversationHistory_1.ConversationHistoryWithTools, { flexGrow: 1, priority: 700, promptContext: this.props.promptContext }),
            instructionsAfterHistory ? instructions : undefined,
            vscpp(EditCode2UserMessage, { flexGrow: 2, priority: 900, promptContext: this.props.promptContext, endpoint: this.props.endpoint, location: this.props.location }),
            vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 3, promptContext: this.props.promptContext, toolCallRounds: this.props.promptContext.toolCallRounds, toolCallResults: this.props.promptContext.toolCallResults })));
    }
};
exports.EditCodePrompt2 = EditCodePrompt2;
exports.EditCodePrompt2 = EditCodePrompt2 = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, toolsService_1.IToolsService)
], EditCodePrompt2);
let EditCode2UserMessage = class EditCode2UserMessage extends prompt_tsx_1.PromptElement {
    constructor(props, experimentationService, _configurationService) {
        super(props);
        this.experimentationService = experimentationService;
        this._configurationService = _configurationService;
    }
    async render(state, sizing) {
        const { query, chatVariables } = this.props.promptContext;
        const useProjectLabels = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsChat, this.experimentationService);
        const hasReplaceStringTool = !!this.props.promptContext.tools?.availableTools.find(tool => tool.name === toolNames_1.ToolName.ReplaceString);
        const hasEditFileTool = !!this.props.promptContext.tools?.availableTools.find(tool => tool.name === toolNames_1.ToolName.EditFile);
        const hasMultiReplaceStringTool = !!this.props.promptContext.tools?.availableTools.find(tool => tool.name === toolNames_1.ToolName.MultiReplaceString);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null,
                useProjectLabels && vscpp(projectLabels_1.ProjectLabels, { flexGrow: 1, priority: 600 }),
                vscpp(customInstructions_1.CustomInstructions, { flexGrow: 6, priority: 750, languageId: undefined, chatVariables: chatVariables }),
                vscpp(notebookEditCodePrompt_1.NotebookFormat, { flexGrow: 5, priority: 810, chatVariables: chatVariables, query: query }),
                vscpp(chatVariables_1.ChatToolReferences, { flexGrow: 4, priority: 898, promptContext: this.props.promptContext, documentContext: this.props.documentContext }),
                vscpp(chatVariables_1.ChatVariables, { flexGrow: 3, priority: 898, chatVariables: chatVariables }),
                vscpp(tag_1.Tag, { name: 'reminder' },
                    (0, agentPrompt_1.getEditingReminder)(hasEditFileTool, hasReplaceStringTool, (0, chatModelCapabilities_1.modelNeedsStrongReplaceStringHint)(this.props.endpoint), hasMultiReplaceStringTool),
                    vscpp(notebookEditCodePrompt_1.NotebookReminderInstructions, { chatVariables: chatVariables, query: query }),
                    vscpp(editCodePrompt_1.NewFilesLocationHint, null)),
                vscpp(tag_1.Tag, { name: 'prompt' },
                    vscpp(chatVariables_1.UserQuery, { flexGrow: 7, priority: 900, chatVariables: chatVariables, query: query })))));
    }
};
EditCode2UserMessage = __decorate([
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, configurationService_1.IConfigurationService)
], EditCode2UserMessage);
//# sourceMappingURL=editCodePrompt2.js.map