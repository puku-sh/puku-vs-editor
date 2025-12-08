"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Allow importing vscode here. eslint does not let us exclude this path: https://github.com/import-js/eslint-plugin-import/issues/2800
/* eslint-disable import/no-restricted-paths */
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
exports.SimulationExtHostToolsService = void 0;
const toolNames_1 = require("../../../src/extension/tools/common/toolNames");
const toolsService_1 = require("../../../src/extension/tools/common/toolsService");
const testToolsService_1 = require("../../../src/extension/tools/node/test/testToolsService");
const tools_1 = require("../../../src/extension/tools/vscode-node/tools");
const toolsService_2 = require("../../../src/extension/tools/vscode-node/toolsService");
const packagejson_1 = require("../../../src/platform/env/common/packagejson");
const logService_1 = require("../../../src/platform/log/common/logService");
const async_1 = require("../../../src/util/vs/base/common/async");
const errors_1 = require("../../../src/util/vs/base/common/errors");
const iterator_1 = require("../../../src/util/vs/base/common/iterator");
const observableInternal_1 = require("../../../src/util/vs/base/common/observableInternal");
const instantiation_1 = require("../../../src/util/vs/platform/instantiation/common/instantiation");
const simulationLogger_1 = require("../../simulationLogger");
let SimulationExtHostToolsService = class SimulationExtHostToolsService extends toolsService_1.BaseToolsService {
    get onWillInvokeTool() {
        return this._inner.onWillInvokeTool;
    }
    get tools() {
        this.ensureToolsRegistered();
        return [
            ...this._inner.tools.filter(t => !this._disabledTools.has(t.name) && !this._overrides.has(t.name)),
            ...iterator_1.Iterable.map(this._overrides.values(), i => i.info),
        ];
    }
    get copilotTools() {
        const r = new Map([
            ...this._inner.copilotTools,
            ...iterator_1.Iterable.map(this._overrides, ([k, v]) => [k, v.tool]),
        ]);
        for (const name of this._disabledTools) {
            r.delete(name);
        }
        return r;
    }
    constructor(_disabledTools, logService, instantiationService) {
        super(logService);
        this._disabledTools = _disabledTools;
        this._overrides = new Map();
        this._inner = instantiationService.createInstance(toolsService_2.ToolsService);
        // register the contribution so that our tools are on vscode.lm.tools
        setImmediate(() => this.ensureToolsRegistered());
    }
    ensureToolsRegistered() {
        this._lmToolRegistration ??= new tools_1.ToolsContribution(this, {}, { threshold: (0, observableInternal_1.observableValue)(this, 128) }, {});
    }
    getCopilotTool(name) {
        return this._disabledTools.has(name) ? undefined : (this._overrides.get(name)?.tool || this._inner.getCopilotTool(name));
    }
    async invokeTool(name, options, token) {
        simulationLogger_1.logger.debug('SimulationExtHostToolsService.invokeTool', name, JSON.stringify(options.input));
        const start = Date.now();
        let err;
        try {
            const toolName = (0, toolNames_1.getToolName)(name);
            const tool = this._overrides.get(toolName)?.tool;
            if (tool) {
                this._onWillInvokeTool.fire({ toolName });
                const result = await tool.invoke(options, token);
                if (!result) {
                    throw new errors_1.CancellationError();
                }
                return result;
            }
            const r = await (0, async_1.raceTimeout)(Promise.resolve(this._inner.invokeTool(name, options, token)), 60_000);
            if (!r) {
                throw new Error(`Tool call timed out after 60 seconds`);
            }
            return r;
        }
        catch (e) {
            err = e;
            throw e;
        }
        finally {
            simulationLogger_1.logger.debug(`SimulationExtHostToolsService.invokeTool ${name} done in ${Date.now() - start}ms` + (err ? ` with error: ${err.message}` : ''));
        }
    }
    getTool(name) {
        return this._disabledTools.has(name) ? undefined : (this._overrides.get(name)?.info || this._inner.getTool(name));
    }
    getToolByToolReferenceName(toolReferenceName) {
        const contributedTool = packagejson_1.packageJson.contributes.languageModelTools.find(tool => tool.toolReferenceName === toolReferenceName && tool.canBeReferencedInPrompt);
        if (contributedTool) {
            return {
                name: contributedTool.name,
                description: contributedTool.modelDescription,
                inputSchema: contributedTool.inputSchema,
                source: undefined,
                tags: []
            };
        }
        return undefined;
    }
    getEnabledTools(request, endpoint, filter) {
        const packageJsonTools = (0, testToolsService_1.getPackagejsonToolsForTest)();
        return this.tools
            .map(tool => {
            // Apply model-specific alternative if available via alternativeDefinition
            const owned = this.copilotTools.get((0, toolNames_1.getToolName)(tool.name));
            if (owned?.alternativeDefinition) {
                const alternative = owned.alternativeDefinition(tool, endpoint);
                if (alternative) {
                    return alternative;
                }
            }
            return tool;
        })
            .filter(tool => filter?.(tool) ?? (!this._disabledTools.has((0, toolNames_1.getToolName)(tool.name)) && packageJsonTools.has(tool.name)));
    }
    addTestToolOverride(info, tool) {
        if (!this._disabledTools.has(info.name)) {
            this._overrides.set(info.name, { tool, info });
        }
    }
};
exports.SimulationExtHostToolsService = SimulationExtHostToolsService;
exports.SimulationExtHostToolsService = SimulationExtHostToolsService = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, instantiation_1.IInstantiationService)
], SimulationExtHostToolsService);
//# sourceMappingURL=simulationExtHostToolsService.js.map