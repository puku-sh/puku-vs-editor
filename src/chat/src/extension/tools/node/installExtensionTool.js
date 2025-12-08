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
const l10n = __importStar(require("@vscode/l10n"));
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const envService_1 = require("../../../platform/env/common/envService");
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const async_1 = require("../../../util/vs/base/common/async");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const toolsService_1 = require("../common/toolsService");
let InstallExtensionTool = class InstallExtensionTool {
    static { this.toolName = toolNames_1.ToolName.InstallExtension; }
    constructor(_commandService, _extensionsService, envService, toolsService) {
        this._commandService = _commandService;
        this._extensionsService = _extensionsService;
        this.envService = envService;
        this.toolsService = toolsService;
    }
    async invoke(options, token) {
        const extensionId = options.input.id;
        const existingExtension = this._extensionsService.getExtension(extensionId);
        if (existingExtension) {
            return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`${options.input.name} extension is already installed`)]);
        }
        const insiders = this.envService.getEditorInfo().version.includes('insider');
        const args = [extensionId, { enable: true, installPreReleaseVersion: insiders ? true : false }];
        const exe = this._commandService.executeCommand('workbench.extensions.installExtension', ...args);
        try {
            await this.waitForExtensionInstall(exe, extensionId);
            return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`Installed ${options.input.name} extension successfully`)]);
        }
        catch (error) {
            return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`Failed to install ${options.input.name} extension.`)]);
        }
    }
    async waitForExtensionInstall(prom, extensionId) {
        await prom;
        let extension;
        const maxTime = 2_000;
        const stopWatch = new stopwatch_1.StopWatch();
        do {
            extension = this._extensionsService.getExtension(extensionId);
            if (extension) {
                // If extension contributes any tools, then wait for the tools to be registered.
                const languageModelTools = extension.packageJSON.contributes?.languageModelTools;
                if (languageModelTools && Array.isArray(languageModelTools) && languageModelTools.length) {
                    if (languageModelTools.every((tool) => this.toolsService.getTool(tool.name))) {
                        return;
                    }
                }
                else {
                    return;
                }
            }
            await (0, async_1.timeout)(100);
        } while (stopWatch.elapsed() < maxTime);
        if (!extension) {
            throw new Error(`Failed to install extension ${extensionId}.`);
        }
    }
    async prepareInvocation(options, token) {
        const extensionId = options.input.id;
        if (!extensionId) {
            throw new Error('No extension ID provided');
        }
        const existingExtension = this._extensionsService.getExtension(extensionId);
        if (existingExtension) {
            return {
                invocationMessage: l10n.t `${options.input.name} extension is already installed`
            };
        }
        const query = encodeURIComponent(JSON.stringify([[extensionId]]));
        const markdownString = new vscodeTypes_1.MarkdownString(l10n.t(`Copilot will install the extension [{0}](command:workbench.extensions.action.showExtensionsWithIds?{1}) and its dependencies.`, options.input.name, query));
        markdownString.isTrusted = { enabledCommands: ['workbench.extensions.action.showExtensionsWithIds'] };
        return {
            invocationMessage: l10n.t `Installing extension \`${options.input.name}\``,
            confirmationMessages: {
                title: l10n.t `Install Extension \`${options.input.name}\`?`,
                message: markdownString,
            },
        };
    }
};
InstallExtensionTool = __decorate([
    __param(0, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(1, extensionsService_1.IExtensionsService),
    __param(2, envService_1.IEnvService),
    __param(3, toolsService_1.IToolsService)
], InstallExtensionTool);
toolsRegistry_1.ToolRegistry.registerTool(InstallExtensionTool);
//# sourceMappingURL=installExtensionTool.js.map