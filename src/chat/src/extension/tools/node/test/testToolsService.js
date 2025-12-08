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
var TestToolsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopTestToolsService = exports.TestToolsService = void 0;
exports.getPackagejsonToolsForTest = getPackagejsonToolsForTest;
const packagejson_1 = require("../../../../platform/env/common/packagejson");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../../platform/log/common/logService");
const errors_1 = require("../../../../util/vs/base/common/errors");
const iterator_1 = require("../../../../util/vs/base/common/iterator");
const lazy_1 = require("../../../../util/vs/base/common/lazy");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const toolNames_1 = require("../../common/toolNames");
const toolsRegistry_1 = require("../../common/toolsRegistry");
const toolsService_1 = require("../../common/toolsService");
let TestToolsService = class TestToolsService extends toolsService_1.BaseToolsService {
    static { TestToolsService_1 = this; }
    static { this.ExcludedTools = [
        toolNames_1.ToolName.GetScmChanges,
        toolNames_1.ToolName.UpdateUserPreferences,
        toolNames_1.ToolName.Usages
    ]; }
    static { this.ContainerOnlyTools = [
        toolNames_1.ToolName.CoreRunInTerminal,
        toolNames_1.ToolName.CoreGetTerminalOutput
    ]; }
    get tools() {
        return Array.from(this._tools.values()).map(tool => {
            const owned = this._copilotTools.get((0, toolNames_1.getToolName)(tool.name));
            return owned?.value.alternativeDefinition?.(tool) ?? tool;
        });
    }
    get copilotTools() {
        return new Map(iterator_1.Iterable.map(this._copilotTools.entries(), ([name, tool]) => [name, tool.value]));
    }
    constructor(disabledTools, instantiationService, logService) {
        super(logService);
        this._tools = new Map();
        const filteredTools = this.getFilteredTools(disabledTools);
        this._copilotTools = new Map(filteredTools
            .map(t => [t.toolName, new lazy_1.Lazy(() => instantiationService.createInstance(t))]));
        for (const tool of filteredTools) {
            if (TestToolsService_1.ExcludedTools.includes(tool.toolName)) {
                continue;
            }
            const contributedName = (0, toolNames_1.getContributedToolName)(tool.toolName);
            const contributedTool = packagejson_1.packageJson.contributes.languageModelTools.find(contributedTool => contributedTool.name === contributedName);
            if (!contributedTool) {
                throw new Error(`Tool ${contributedName} is not in package.json`);
            }
            if (tool.toolName === toolNames_1.ToolName.GetErrors) {
                // Some tests don't have ILanguageDiagnosticsService configured. Hacky, not sure how else to handle this
                try {
                    instantiationService.invokeFunction(acc => acc.get(languageDiagnosticsService_1.ILanguageDiagnosticsService));
                }
                catch (e) {
                    continue;
                }
            }
            const info = {
                name: tool.toolName,
                description: (0, toolNames_1.mapContributedToolNamesInString)(contributedTool.modelDescription),
                source: undefined,
                inputSchema: contributedTool.inputSchema && (0, toolNames_1.mapContributedToolNamesInSchema)(contributedTool.inputSchema),
                tags: contributedTool.tags ?? []
            };
            this._tools.set(info.name, info);
        }
    }
    getFilteredTools(disabledTools) {
        // Checking in a quick fix- needs a better check
        const isSwebenchContainer = process.env.HOME === '/root';
        const filteredTools = toolsRegistry_1.ToolRegistry.getTools()
            .filter(t => !disabledTools.has(t.toolName))
            .filter(t => !TestToolsService_1.ExcludedTools.includes(t.toolName))
            .filter(t => isSwebenchContainer || !TestToolsService_1.ContainerOnlyTools.includes(t.toolName));
        return filteredTools;
    }
    async invokeTool(name, options, token) {
        name = (0, toolNames_1.getToolName)(name);
        const tool = this._copilotTools.get(name)?.value;
        if (tool) {
            this._onWillInvokeTool.fire({ toolName: name });
            const result = await tool.invoke(options, token);
            if (!result) {
                throw new errors_1.CancellationError();
            }
            return result;
        }
        throw new Error('unknown tool: ' + name);
    }
    getCopilotTool(name) {
        const tool = this._copilotTools.get(name)?.value;
        return tool;
    }
    getTool(name) {
        const tool = this._tools.get(name);
        return tool;
    }
    getToolByToolReferenceName(toolReferenceName) {
        const contributedTool = packagejson_1.packageJson.contributes.languageModelTools.find(tool => tool.toolReferenceName === toolReferenceName && tool.canBeReferencedInPrompt);
        if (contributedTool) {
            return {
                name: contributedTool.name,
                description: contributedTool.modelDescription,
                inputSchema: contributedTool.inputSchema,
                tags: [],
                source: undefined,
            };
        }
        return undefined;
    }
    getEnabledTools(request, endpoint, filter) {
        const toolMap = new Map(this.tools.map(t => [t.name, t]));
        const packageJsonTools = getPackagejsonToolsForTest();
        return this.tools
            .map(tool => {
            // Apply model-specific alternative if available via alternativeDefinition
            const owned = this._copilotTools.get((0, toolNames_1.getToolName)(tool.name));
            if (owned?.value?.alternativeDefinition) {
                const alternative = owned.value.alternativeDefinition(tool, endpoint);
                if (alternative) {
                    return alternative;
                }
            }
            return tool;
        })
            .filter(tool => {
            // 0. Check if the tool was enabled or disabled via the tool picker
            const toolPickerSelection = request.tools.get((0, toolNames_1.getContributedToolName)(tool.name));
            if (typeof toolPickerSelection === 'boolean') {
                return toolPickerSelection;
            }
            // 1. Check for what the consumer wants explicitly
            const explicit = filter?.(tool);
            if (explicit !== undefined) {
                return explicit;
            }
            // 2. Check if the request's tools explicitly asked for this tool to be enabled
            for (const ref of request.toolReferences) {
                const usedTool = toolMap.get(ref.name);
                if (usedTool?.tags.includes(`enable_other_tool_${tool.name}`)) {
                    return true;
                }
            }
            return packageJsonTools.has(tool.name);
        });
    }
    addTestToolOverride(info, tool) {
        this._tools.set(info.name, info);
        this._copilotTools.set(info.name, new lazy_1.Lazy(() => tool));
    }
};
exports.TestToolsService = TestToolsService;
exports.TestToolsService = TestToolsService = TestToolsService_1 = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService)
], TestToolsService);
let NoopTestToolsService = class NoopTestToolsService extends TestToolsService {
    constructor(instantiationService, logService) {
        super(new Set(), instantiationService, logService);
    }
    invokeTool(name, options, token) {
        throw new Error('NoopTestToolsService does not support invoking tools');
    }
    getFilteredTools(_disabledTools) {
        return toolsRegistry_1.ToolRegistry.getTools();
    }
};
exports.NoopTestToolsService = NoopTestToolsService;
exports.NoopTestToolsService = NoopTestToolsService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService)
], NoopTestToolsService);
function getPackagejsonToolsForTest() {
    // Simulate what vscode would do- enable all tools that would be in the picker (tools in a toolset or with canBeReferencedInPrompt)
    const toolsetReferenceNames = new Set(packagejson_1.packageJson.contributes.languageModelToolSets
        .flatMap(toolset => toolset.tools));
    const tools = new Set(packagejson_1.packageJson.contributes.languageModelTools
        .filter(tool => (tool.canBeReferencedInPrompt || toolsetReferenceNames.has(tool.toolReferenceName)))
        .map(tool => (0, toolNames_1.getToolName)(tool.name)));
    // Add core tools that should be enabled for the agent.
    // Normally, vscode is in control of deciding which tools are enabled for a chat request, but in the simulator, the extension has to decide this.
    // Since it can't get info like `canBeReferencedInPrompt` from the extension API, we have to hardcode tool names here.
    tools.add(toolNames_1.ToolName.CoreRunInTerminal);
    tools.add(toolNames_1.ToolName.CoreGetTerminalOutput);
    tools.add(toolNames_1.ToolName.CoreTerminalLastCommand);
    tools.add(toolNames_1.ToolName.CoreTerminalSelection);
    tools.add(toolNames_1.ToolName.CoreCreateAndRunTask);
    tools.add(toolNames_1.ToolName.CoreGetTaskOutput);
    tools.add(toolNames_1.ToolName.CoreRunTask);
    tools.add(toolNames_1.ToolName.CoreRunTest);
    tools.add(toolNames_1.ToolName.CoreManageTodoList);
    return tools;
}
//# sourceMappingURL=testToolsService.js.map