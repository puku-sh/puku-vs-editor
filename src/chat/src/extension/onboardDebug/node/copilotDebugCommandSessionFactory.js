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
exports.CopilotDebugCommandSessionFactory = void 0;
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const uri_1 = require("../../../util/vs/base/common/uri");
const launchConfigService_1 = require("../common/launchConfigService");
const commandToConfigConverter_1 = require("./commandToConfigConverter");
const STORAGE_KEY = 'copilot-chat.terminalToDebugging.configs';
const LRU_SIZE = 30;
// Just some random strings that will lead to defined return results if found in the arguments.
const testsStatuses = {
    '73687c45-cancelled': {
        kind: 3 /* StartResultKind.Cancelled */,
    },
    '73687c45-extension': {
        kind: 2 /* StartResultKind.NeedExtension */,
        debugType: 'node',
    },
    '73687c45-noconfig': {
        kind: 0 /* StartResultKind.NoConfig */,
        text: 'No config generated',
    },
    '73687c45-ok': {
        kind: 1 /* StartResultKind.Ok */,
        folder: undefined,
        config: { type: 'node', name: 'Generated Node Launch', request: 'launch', program: '${workspaceFolder}/app.js' },
    }
};
let CopilotDebugCommandSessionFactory = class CopilotDebugCommandSessionFactory {
    constructor(interactor, telemetry, context, commandToConfig, extensionsService, workspaceService, launchConfigService) {
        this.interactor = interactor;
        this.telemetry = telemetry;
        this.context = context;
        this.commandToConfig = commandToConfig;
        this.extensionsService = extensionsService;
        this.workspaceService = workspaceService;
        this.launchConfigService = launchConfigService;
    }
    async start({ args, cwd, forceNew, printOnly, save }, token) {
        /* __GDPR__
        "onboardDebug.commandExecuted" : {
            "owner": "connor4312",
            "comment": "Reports usages of the copilot-debug command",
            "binary": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Binary executed with the command" }
        }
        */
        this.telemetry.sendMSFTTelemetryEvent('onboardDebug.commandExecuted', {
            binary: args[0],
        });
        for (const [key, prebaked] of Object.entries(testsStatuses)) {
            if (args.includes(key)) {
                return prebaked;
            }
        }
        let record = this.tryMatchExistingConfig(cwd, args);
        if (!record || forceNew) {
            this.interactor.isGenerating();
            const result = await this.commandToConfig.convert(cwd, args, token);
            if (!result.ok) {
                return { kind: 0 /* StartResultKind.NoConfig */, text: result.text };
            }
            record = {
                args,
                cwd,
                folder: result.workspaceFolder,
                inputs: [],
                config: result.config,
            };
            /* __GDPR__
            "onboardDebug.configGenerated" : {
                "owner": "connor4312",
                "comment": "Reports a generated config for the copilot-debug command",
                "binary": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Binary executed with the command" },
                "debugType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Debug type generated" }
            }
            */
            this.telemetry.sendMSFTTelemetryEvent('onboardDebug.configGenerated', {
                binary: args[0],
                debugType: record.config.configurations[0].type,
            });
        }
        const config = record.config.configurations[0];
        const folder = record.folder && this.workspaceService.getWorkspaceFolder(uri_1.URI.revive(record.folder));
        if (!printOnly && record.config.tasks?.length) {
            if (!(await this.interactor.ensureTask(folder, record.config.tasks[0]))) {
                if (!save) { // if just saving, still let the user save even if they don't want the task
                    return { kind: 3 /* StartResultKind.Cancelled */ };
                }
            }
        }
        if (printOnly || save) {
            this.saveConfigInLRU(record);
            if (save) {
                await this.save(record.config, folder);
            }
            return { kind: 1 /* StartResultKind.Ok */, folder, config };
        }
        if (!this.hasMatchingExtension(config)) {
            return { kind: 2 /* StartResultKind.NeedExtension */, debugType: config.type };
        }
        const postInput = await this.launchConfigService.resolveConfigurationInputs(record.config, new Map(record.inputs), this.interactor);
        if (!postInput) {
            return { kind: 3 /* StartResultKind.Cancelled */ };
        }
        // inputs are saved to use as defaults in the next run
        record.inputs = [...postInput.inputs];
        this.saveConfigInLRU(record);
        return {
            kind: 1 /* StartResultKind.Ok */,
            folder,
            config: postInput.config,
        };
    }
    async save(launchConfig, folder) {
        await this.launchConfigService.add(folder, launchConfig);
        if (folder) {
            await this.launchConfigService.show(folder, launchConfig.configurations[0].name);
        }
    }
    hasMatchingExtension(config) {
        for (const extension of this.extensionsService.allAcrossExtensionHosts) {
            const debuggers = extension.packageJSON?.contributes?.debuggers;
            if (Array.isArray(debuggers) && debuggers.some(d => d && d.type === config.type)) {
                return true;
            }
        }
        return false;
    }
    tryMatchExistingConfig(cwd, args) {
        const stored = this.readStoredConfigs();
        const exact = stored.findIndex(c => c.cwd === cwd && (0, arrays_1.equals)(c.args, args));
        if (exact !== -1) {
            return stored[exact];
        }
        // could possibly do more advanced things here like reusing an existing config if only one arg was different
        return undefined;
    }
    readStoredConfigs() {
        return this.context.workspaceState.get(STORAGE_KEY, []);
    }
    saveConfigInLRU(add) {
        const configs = this.readStoredConfigs().slice();
        const idx = configs.indexOf(add);
        if (idx >= 1) {
            configs.splice(idx, 1);
        }
        configs.unshift(add);
        while (configs.length > LRU_SIZE) {
            configs.pop();
        }
        this.context.workspaceState.update(STORAGE_KEY, configs);
    }
};
exports.CopilotDebugCommandSessionFactory = CopilotDebugCommandSessionFactory;
exports.CopilotDebugCommandSessionFactory = CopilotDebugCommandSessionFactory = __decorate([
    __param(1, telemetry_1.ITelemetryService),
    __param(2, extensionContext_1.IVSCodeExtensionContext),
    __param(3, commandToConfigConverter_1.IDebugCommandToConfigConverter),
    __param(4, extensionsService_1.IExtensionsService),
    __param(5, workspaceService_1.IWorkspaceService),
    __param(6, launchConfigService_1.ILaunchConfigService)
], CopilotDebugCommandSessionFactory);
//# sourceMappingURL=copilotDebugCommandSessionFactory.js.map