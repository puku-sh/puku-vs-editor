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
exports.SimpleBrowserTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
let SimpleBrowserTool = class SimpleBrowserTool {
    static { this.toolName = toolNames_1.ToolName.SimpleBrowser; }
    constructor(commandService) {
        this.commandService = commandService;
        this._alreadyApprovedDomains = new map_1.ResourceSet();
    }
    async invoke(options, token) {
        const uri = uri_1.URI.parse(options.input.url);
        this._alreadyApprovedDomains.add(uri);
        this.commandService.executeCommand('simpleBrowser.show', options.input.url);
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(l10n.t('Simple Browser opened at {0}', options.input.url))
        ]);
    }
    async resolveInput(input, promptContext) {
        return input;
    }
    prepareInvocation(options, token) {
        const uri = uri_1.URI.parse(options.input.url);
        if (uri.scheme !== network_1.Schemas.http && uri.scheme !== network_1.Schemas.https) {
            throw new Error(l10n.t('Invalid URL scheme. Only HTTP and HTTPS are supported.'));
        }
        const urlsNeedingConfirmation = !this._alreadyApprovedDomains.has(uri);
        let confirmationMessages;
        if (urlsNeedingConfirmation) {
            confirmationMessages = { title: l10n.t `Open untrusted web page?`, message: new vscodeTypes_1.MarkdownString(l10n.t `${options.input.url}`) };
        }
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Opening Simple Browser at ${options.input.url}`),
            pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Opened Simple Browser at ${options.input.url}`),
            confirmationMessages
        };
    }
};
exports.SimpleBrowserTool = SimpleBrowserTool;
exports.SimpleBrowserTool = SimpleBrowserTool = __decorate([
    __param(0, runCommandExecutionService_1.IRunCommandExecutionService)
], SimpleBrowserTool);
toolsRegistry_1.ToolRegistry.registerTool(SimpleBrowserTool);
//# sourceMappingURL=simpleBrowserTool.js.map