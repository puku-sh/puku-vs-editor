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
exports.DebugCommandToConfigConverter = exports.IDebugCommandToConfigConverter = void 0;
exports.getPathRelativeToWorkspaceFolder = getPathRelativeToWorkspaceFolder;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const services_1 = require("../../../util/common/services");
const path_1 = require("../../../util/vs/base/common/path");
const strings_1 = require("../../../util/vs/base/common/strings");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const startDebugging_1 = require("../../prompts/node/panel/startDebugging");
const parseLaunchConfigFromResponse_1 = require("./parseLaunchConfigFromResponse");
exports.IDebugCommandToConfigConverter = (0, services_1.createServiceIdentifier)('IDebugCommandToConfigConverter');
let DebugCommandToConfigConverter = class DebugCommandToConfigConverter {
    constructor(endpointProvider, instantiationService, workspace, telemetry, extensionsService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.workspace = workspace;
        this.telemetry = telemetry;
        this.extensionsService = extensionsService;
    }
    /**
     * Converts a command run in the given working directory to a VS Code
     * launch config.
     */
    async convert(cwd, args, token) {
        const relCwd = getPathRelativeToWorkspaceFolder(cwd, this.workspace);
        const endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, startDebugging_1.StartDebuggingPrompt, {
            input: {
                type: 1 /* StartDebuggingType.CommandLine */,
                relativeCwd: relCwd?.path,
                absoluteCwd: cwd,
                args,
            },
            history: [],
        });
        const prompt = await promptRenderer.render(undefined, token);
        const fetchResult = await endpoint.makeChatRequest('debugCommandToConfig', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return { ok: false, config: undefined, text: fetchResult.reason, workspaceFolder: relCwd?.folder };
        }
        const config = (0, parseLaunchConfigFromResponse_1.parseLaunchConfigFromResponse)(fetchResult.value, this.extensionsService);
        /* __GDPR__
        "onboardDebug.configGenerated" : {
            "owner": "connor4312",
            "comment": "Reports usages of the copilot-debug command",
            "configGenerated": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether a config was generated", "isMeasurement": true },
            "configType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "command": "launch.json config type generated, if any" }
        }
        */
        this.telemetry.sendMSFTTelemetryEvent('onboardDebug.configGenerated', {
            configType: config?.configurations[0].type,
        }, {
            ok: config ? 1 : 0,
        });
        return {
            ok: true,
            config,
            text: fetchResult.value,
            workspaceFolder: relCwd?.folder
        };
    }
};
exports.DebugCommandToConfigConverter = DebugCommandToConfigConverter;
exports.DebugCommandToConfigConverter = DebugCommandToConfigConverter = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, extensionsService_1.IExtensionsService)
], DebugCommandToConfigConverter);
function getPathRelativeToWorkspaceFolder(path, workspace) {
    let closest;
    for (const folder of workspace.getWorkspaceFolders()) {
        const rel = (0, path_1.relative)(folder.fsPath, path);
        const distance = (0, path_1.isAbsolute)(rel) ? Infinity : (0, strings_1.count)(rel, '..');
        if (!closest || distance < closest.distance || (distance === closest.distance && rel.length < closest.rel.length)) {
            closest = { rel: (0, path_1.join)('${workspaceFolder}', rel).replaceAll('\\', '/'), distance, folder };
        }
    }
    return closest && { folder: closest.folder, path: closest.rel };
}
//# sourceMappingURL=commandToConfigConverter.js.map