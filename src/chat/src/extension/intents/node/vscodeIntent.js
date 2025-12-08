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
var VscodeIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VscodeIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const workbenchService_1 = require("../../../platform/workbench/common/workbenchService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeContext_1 = require("../../context/node/resolvers/vscodeContext");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const vscode_1 = require("../../prompts/node/panel/vscode");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
let VSCodeIntentInvocation = class VSCodeIntentInvocation extends promptRenderer_1.RendererIntentInvocation {
    constructor(intent, location, endpoint, request, instantiationService, workbenchService, toolsService) {
        super(intent, location, endpoint);
        this.request = request;
        this.instantiationService = instantiationService;
        this.workbenchService = workbenchService;
        this.toolsService = toolsService;
        this.linkification = { disable: true };
    }
    async createRenderer(promptContext, endpoint, progress, token) {
        return promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, vscode_1.VscodePrompt, {
            endpoint,
            promptContext
        });
    }
    processResponse(context, inputStream, outputStream, token) {
        const responseProcessor = new VSCodeResponseProcessor(this.workbenchService);
        return responseProcessor.processResponse(context, inputStream, outputStream, token);
    }
    getAvailableTools() {
        return this.toolsService.getEnabledTools(this.request, this.endpoint, tool => tool.name === 'vscode_searchExtensions_internal' ||
            tool.name === toolNames_1.ToolName.VSCodeAPI);
    }
};
VSCodeIntentInvocation = __decorate([
    __param(4, instantiation_1.IInstantiationService),
    __param(5, workbenchService_1.IWorkbenchService),
    __param(6, toolsService_1.IToolsService)
], VSCodeIntentInvocation);
class VSCodeResponseProcessor {
    constructor(workbenchService) {
        this.workbenchService = workbenchService;
        this.stagedTextToApply = '';
        this._incodeblock = false;
    }
    async processResponse(context, inputStream, outputStream, token) {
        for await (const { delta } of inputStream) {
            if (token.isCancellationRequested) {
                return;
            }
            await this.applyDelta(delta.text, outputStream);
        }
    }
    /**
     * Parses a raw Markdown string containing a code block and either extracts settings and commands to show as buttons for the user, or shows the code block.
     * @param codeBlock Markdown string containing a single code block surrounded by "```"
     */
    // textDelta is a string with a single Markdown code block (wrapped by ```). It might or might not be of json type.
    async processNonReporting(codeBlock, progress) {
        const parsedCommands = await (0, vscodeContext_1.parseSettingsAndCommands)(this.workbenchService, codeBlock);
        if (parsedCommands.length === 0) {
            // Show code block
            progress.markdown('\n' + codeBlock + '\n');
        }
        else {
            // Show buttons for commands to run (which can include commands to change settings)
            for (const parsedCommand of parsedCommands) {
                if (parsedCommand.commandToRun) {
                    progress.button(parsedCommand.commandToRun);
                }
            }
        }
    }
    async applyDelta(textDelta, progress) {
        textDelta = this.stagedTextToApply + textDelta;
        this.stagedTextToApply = '';
        const codeblockStart = textDelta.indexOf('```');
        if (this._incodeblock) {
            const codeblockEnd = textDelta.indexOf('```');
            if (codeblockEnd === -1) {
                this.stagedTextToApply = textDelta;
            }
            else {
                this._incodeblock = false;
                const codeBlock = '```' + textDelta.substring(0, codeblockEnd) + '```';
                await this.processNonReporting(codeBlock, progress);
                // Output any text that comes after the code block
                progress.markdown(textDelta.substring(codeblockEnd + 3));
            }
        }
        else if (codeblockStart !== -1) {
            this._incodeblock = true;
            const codeblockEnd = textDelta.indexOf('```', codeblockStart + 3);
            if (codeblockEnd !== -1) {
                this._incodeblock = false;
                // Output any text that comes before the code block
                progress.markdown(textDelta.substring(0, codeblockStart));
                // Process the codeblock
                const codeBlock = '```' + textDelta.substring(codeblockStart + 3, codeblockEnd) + '```';
                await this.processNonReporting(codeBlock, progress);
                // Output any text that comes after the code block
                progress.markdown(textDelta.substring(codeblockEnd + 3));
            }
            else {
                this.stagedTextToApply = textDelta.substring(codeblockStart + 3);
                // Output any text that comes before the code block
                const textToReport = textDelta.substring(0, codeblockStart);
                if (textToReport) {
                    progress.markdown(textToReport);
                }
            }
        }
        else {
            // We have no stop word or partial, so apply the text to the progress and turn
            progress.markdown(textDelta);
        }
    }
}
let VscodeIntent = class VscodeIntent {
    static { VscodeIntent_1 = this; }
    static { this.ID = "vscode" /* Intent.VSCode */; }
    constructor(instantiationService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.id = VscodeIntent_1.ID;
        this.locations = [commonTypes_1.ChatLocation.Panel];
        this.description = l10n.t('Ask questions about VS Code');
        this.commandInfo = {
            allowsEmptyArgs: true,
        };
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return this.instantiationService.createInstance(VSCodeIntentInvocation, this, location, endpoint, invocationContext.request);
    }
};
exports.VscodeIntent = VscodeIntent;
exports.VscodeIntent = VscodeIntent = VscodeIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider)
], VscodeIntent);
//# sourceMappingURL=vscodeIntent.js.map