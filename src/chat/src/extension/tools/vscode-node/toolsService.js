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
exports.ToolsService = void 0;
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../platform/log/common/logService");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolsService_1 = require("../common/toolsService");
let ToolsService = class ToolsService extends toolsService_1.BaseToolsService {
    get tools() {
        if ((0, arrays_1.equals)(this._contributedToolCache.input, vscode.lm.tools)) {
            return this._contributedToolCache.output;
        }
        const input = [...vscode.lm.tools];
        const contributedTools = [...input]
            .sort((a, b) => {
            // Sort builtin tools to the top
            const aIsBuiltin = a.name.startsWith('vscode_') || a.name.startsWith('copilot_');
            const bIsBuiltin = b.name.startsWith('vscode_') || b.name.startsWith('copilot_');
            if (aIsBuiltin && bIsBuiltin) {
                return a.name.localeCompare(b.name);
            }
            else if (!aIsBuiltin && !bIsBuiltin) {
                return a.name.localeCompare(b.name);
            }
            return aIsBuiltin ? -1 : 1;
        })
            .map(tool => {
            const owned = this._copilotTools.value.get((0, toolNames_1.getToolName)(tool.name));
            return owned?.alternativeDefinition?.(tool) ?? tool;
        });
        const result = contributedTools.map(tool => {
            return {
                ...tool,
                name: (0, toolNames_1.getToolName)(tool.name),
                description: (0, toolNames_1.mapContributedToolNamesInString)(tool.description),
                inputSchema: tool.inputSchema && (0, toolNames_1.mapContributedToolNamesInSchema)(tool.inputSchema),
            };
        });
        this._contributedToolCache.input = input;
        this._contributedToolCache.output = result;
        return result;
    }
    get copilotTools() {
        return this._copilotTools.value;
    }
    constructor(instantiationService, logService) {
        super(logService);
        this._contributedToolCache = { input: [], output: [] };
        this._copilotTools = new lazy_1.Lazy(() => new Map(toolsRegistry_1.ToolRegistry.getTools().map(t => [t.toolName, instantiationService.createInstance(t)])));
        this._toolExtensions = new lazy_1.Lazy(() => new Map(toolsRegistry_1.ToolRegistry.getToolExtensions().map(t => [t.toolName, instantiationService.createInstance(t)])));
    }
    invokeTool(name, options, token) {
        this._onWillInvokeTool.fire({ toolName: name });
        return vscode.lm.invokeTool((0, toolNames_1.getContributedToolName)(name), options, token);
    }
    getCopilotTool(name) {
        const tool = this._copilotTools.value.get(name);
        return tool;
    }
    getTool(name) {
        return this.tools.find(tool => tool.name === name);
    }
    getToolByToolReferenceName(name) {
        // Can't actually implement this in prod, name is not exposed
        throw new Error('This method for tests only');
    }
    getEnabledTools(request, endpoint, filter) {
        const toolMap = new Map(this.tools.map(t => [t.name, t]));
        return this.tools
            .map(tool => {
            // Apply model-specific alternative if available via alternativeDefinition
            const owned = this._copilotTools.value.get((0, toolNames_1.getToolName)(tool.name));
            let resultTool = tool;
            if (owned?.alternativeDefinition) {
                resultTool = owned.alternativeDefinition(resultTool, endpoint);
            }
            const extension = this._toolExtensions.value.get((0, toolNames_1.getToolName)(tool.name));
            if (extension?.alternativeDefinition) {
                resultTool = extension.alternativeDefinition(resultTool, endpoint);
            }
            return resultTool;
        })
            .filter(tool => {
            // 0. Check if the tool was disabled via the tool picker. If so, it must be disabled here
            const toolPickerSelection = request.tools.get((0, toolNames_1.getContributedToolName)(tool.name));
            if (toolPickerSelection === false) {
                return false;
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
            // 3. If this tool is neither enabled nor disabled, then consumer didn't have opportunity to enable/disable it.
            // This can happen when a tool is added during another tool call (e.g. installExt tool installs an extension that contributes tools).
            if (toolPickerSelection === undefined && tool.tags.includes('extension_installed_by_tool')) {
                return true;
            }
            // Tool was enabled via tool picker
            if (toolPickerSelection === true) {
                return true;
            }
            return false;
        });
    }
};
exports.ToolsService = ToolsService;
exports.ToolsService = ToolsService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService)
], ToolsService);
//# sourceMappingURL=toolsService.js.map