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
var TerminalExplainIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalExplainIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../platform/env/common/envService");
const terminalService_1 = require("../../../platform/terminal/common/terminalService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const terminalExplain_1 = require("../../prompts/node/panel/terminalExplain");
let TerminalExplainIntent = class TerminalExplainIntent {
    static { TerminalExplainIntent_1 = this; }
    static { this.ID = "terminalExplain" /* Intent.TerminalExplain */; }
    static { this.intentName = 'explain'; }
    constructor(instantiationService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.id = TerminalExplainIntent_1.ID;
        this.locations = [commonTypes_1.ChatLocation.Panel, commonTypes_1.ChatLocation.Terminal];
        this.description = l10n.t('Explain what just happened in the terminal');
        this.commandInfo = {
            allowsEmptyArgs: true,
            defaultEnablement: true,
            sampleRequest: l10n.t('What did the last command do?')
        };
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return this.instantiationService.createInstance(TerminalExplainIntentInvocation, this, endpoint, location);
    }
};
exports.TerminalExplainIntent = TerminalExplainIntent;
exports.TerminalExplainIntent = TerminalExplainIntent = TerminalExplainIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider)
], TerminalExplainIntent);
let TerminalExplainIntentInvocation = class TerminalExplainIntentInvocation {
    constructor(intent, endpoint, location, instantiationService, envService, terminalService) {
        this.intent = intent;
        this.endpoint = endpoint;
        this.location = location;
        this.instantiationService = instantiationService;
        this.envService = envService;
        this.terminalService = terminalService;
    }
    async buildPrompt(promptContext, progress, token) {
        const osName = this.envService.OS;
        const shellType = this.terminalService.terminalShellType;
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, terminalExplain_1.TerminalExplainPrompt, {
            promptContext,
            osName,
            shellType,
            endpoint: this.endpoint,
        });
        const result = await renderer.render(progress, token);
        return result;
    }
};
TerminalExplainIntentInvocation = __decorate([
    __param(3, instantiation_1.IInstantiationService),
    __param(4, envService_1.IEnvService),
    __param(5, terminalService_1.ITerminalService)
], TerminalExplainIntentInvocation);
//# sourceMappingURL=terminalExplainIntent.js.map