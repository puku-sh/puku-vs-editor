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
var NotebookEditorIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookEditorIntentInvocation = exports.NotebookEditorIntent = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../platform/env/common/envService");
const logService_1 = require("../../../platform/log/common/logService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const commandService_1 = require("../../commands/node/commandService");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const specialRequestTypes_1 = require("../../prompt/common/specialRequestTypes");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const notebookInlinePrompt_1 = require("../../prompts/node/panel/notebookInlinePrompt");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
const editCodeIntent_1 = require("./editCodeIntent");
const editCodeIntent2_1 = require("./editCodeIntent2");
const getTools = (instaService, request) => instaService.invokeFunction(async (accessor) => {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const endpointProvider = accessor.get(endpointProvider_1.IEndpointProvider);
    const model = await endpointProvider.getChatEndpoint(request);
    const lookForTools = new Set([toolNames_1.ToolName.EditFile]);
    lookForTools.add(toolNames_1.ToolName.EditNotebook);
    lookForTools.add(toolNames_1.ToolName.GetNotebookSummary);
    lookForTools.add(toolNames_1.ToolName.RunNotebookCell);
    lookForTools.add(toolNames_1.ToolName.ReadCellOutput);
    return toolsService.getEnabledTools(request, model, tool => lookForTools.has(tool.name) || tool.tags.includes('notebooks'));
});
let NotebookEditorIntent = class NotebookEditorIntent extends editCodeIntent_1.EditCodeIntent {
    static { NotebookEditorIntent_1 = this; }
    static { this.ID = "notebookEditor" /* Intent.notebookEditor */; }
    constructor(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService) {
        super(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService, { processCodeblocks: false, intentInvocation: NotebookEditorIntentInvocation });
        this.id = NotebookEditorIntent_1.ID;
        this.locations = [commonTypes_1.ChatLocation.Notebook];
    }
    getIntentHandlerOptions(request) {
        return {
            maxToolCallIterations: (0, specialRequestTypes_1.getRequestedToolCallIterationLimit)(request) ?? this.configurationService.getNonExtensionConfig('chat.agent.maxRequests') ?? 15,
            temperature: this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.AgentTemperature) ?? 0,
            overrideRequestLocation: commonTypes_1.ChatLocation.Notebook,
        };
    }
};
exports.NotebookEditorIntent = NotebookEditorIntent;
exports.NotebookEditorIntent = NotebookEditorIntent = NotebookEditorIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, codeMapperService_1.ICodeMapperService),
    __param(5, workspaceService_1.IWorkspaceService)
], NotebookEditorIntent);
let NotebookEditorIntentInvocation = class NotebookEditorIntentInvocation extends editCodeIntent2_1.EditCode2IntentInvocation {
    constructor(intent, location, endpoint, request, intentOptions, tabsAndEditorsService, alternativeNotebookContentService, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService) {
        super(intent, location, endpoint, request, intentOptions, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService, logService);
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.alternativeNotebookContentService = alternativeNotebookContentService;
        this.prompt = notebookInlinePrompt_1.NotebookInlinePrompt;
    }
    async getAvailableTools() {
        return getTools(this.instantiationService, this.request);
    }
    buildPrompt(promptContext, progress, token) {
        const variables = this.createReferencesForActiveEditor() ?? promptContext.chatVariables;
        const { query, commandToolReferences } = this.processSlashCommand(promptContext.query);
        return super.buildPrompt({
            ...promptContext,
            chatVariables: variables,
            query,
            tools: promptContext.tools && {
                ...promptContext.tools,
                toolReferences: this.stableToolReferences.filter((r) => r.name !== toolNames_1.ToolName.Codebase).concat(commandToolReferences),
            },
        }, progress, token);
    }
    createReferencesForActiveEditor() {
        const editor = this.tabsAndEditorsService.activeNotebookEditor;
        if (editor) {
            const cell = editor.notebook.cellAt(editor.selection.start);
            const format = this.alternativeNotebookContentService.getFormat(this.endpoint);
            const altDocument = this.alternativeNotebookContentService.create(format).getAlternativeDocument(editor.notebook);
            const textEditor = this.tabsAndEditorsService.activeTextEditor;
            let selectedText = '';
            if (textEditor) {
                const cellText = textEditor.document.getText();
                const lines = cellText.split('\n');
                const startLine = Math.max(0, textEditor.selection.start.line - 1);
                const endLine = Math.min(lines.length - 1, textEditor.selection.end.line + 1);
                selectedText = lines.slice(startLine, endLine + 1).join('\n');
            }
            const refsForActiveEditor = [
                {
                    id: editor.notebook.uri.toString(),
                    name: 'Active notebook editor: ' + editor.notebook.uri.toString(),
                    value: altDocument.getText()
                }
            ];
            // Add selected text as a separate reference if we have any
            if (selectedText.trim()) {
                const cellID = (0, helpers_1.getCellId)(cell);
                refsForActiveEditor.push({
                    id: `${editor.notebook.uri.toString()}#selection`,
                    name: `Selected text in cell ${cellID} active notebook editor`,
                    value: selectedText
                });
            }
            return new chatVariablesCollection_1.ChatVariablesCollection([...this.request.references, ...refsForActiveEditor]);
        }
    }
    processSlashCommand(query) {
        const commandToolReferences = [];
        const command = this.request.command && this.commandService.getCommand(this.request.command, this.location);
        if (command) {
            if (command.toolEquivalent) {
                commandToolReferences.push({
                    id: `${this.request.command}->${(0, uuid_1.generateUuid)()}`,
                    name: (0, toolNames_1.getToolName)(command.toolEquivalent)
                });
            }
            query = query ? `${command.details}.\n${query}` : command.details;
        }
        return { query, commandToolReferences };
    }
};
exports.NotebookEditorIntentInvocation = NotebookEditorIntentInvocation;
exports.NotebookEditorIntentInvocation = NotebookEditorIntentInvocation = __decorate([
    __param(5, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(6, alternativeContent_1.IAlternativeNotebookContentService),
    __param(7, instantiation_1.IInstantiationService),
    __param(8, codeMapperService_1.ICodeMapperService),
    __param(9, envService_1.IEnvService),
    __param(10, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(11, endpointProvider_1.IEndpointProvider),
    __param(12, workspaceService_1.IWorkspaceService),
    __param(13, toolsService_1.IToolsService),
    __param(14, configurationService_1.IConfigurationService),
    __param(15, editLogService_1.IEditLogService),
    __param(16, commandService_1.ICommandService),
    __param(17, telemetry_1.ITelemetryService),
    __param(18, notebookService_1.INotebookService),
    __param(19, logService_1.ILogService)
], NotebookEditorIntentInvocation);
//# sourceMappingURL=notebookEditorIntent.js.map