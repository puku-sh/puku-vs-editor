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
exports.lastCommandMatchResult = void 0;
exports.setLastCommandMatchResult = setLastCommandMatchResult;
exports.generateTerminalFixes = generateTerminalFixes;
const l10n = __importStar(require("@vscode/l10n"));
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../util/common/markdown");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const path_1 = require("../../../util/vs/base/common/path");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const terminalQuickFix_1 = require("../../prompts/node/panel/terminalQuickFix");
function relevanceToString(relevance) {
    switch (relevance) {
        case 3 /* CommandRelevance.High */: return l10n.t('high relevance');
        case 2 /* CommandRelevance.Medium */: return l10n.t('medium relevance');
        case 1 /* CommandRelevance.Low */: return l10n.t('low relevance');
    }
}
function parseRelevance(relevance) {
    switch (relevance) {
        case 'high': return 3 /* CommandRelevance.High */;
        case 'medium': return 2 /* CommandRelevance.Medium */;
        case 'low': return 1 /* CommandRelevance.Low */;
    }
}
function setLastCommandMatchResult(value) { exports.lastCommandMatchResult = value; }
async function generateTerminalFixes(instantiationService) {
    const commandMatchResult = exports.lastCommandMatchResult;
    if (!commandMatchResult) {
        return;
    }
    const picksPromise = new Promise(r => {
        instantiationService.createInstance(TerminalQuickFixGenerator).generateTerminalQuickFix(commandMatchResult, cancellation_1.CancellationToken.None).then(fixes => {
            const picks = (fixes ?? []).sort((a, b) => b.relevance - a.relevance).map(e => ({
                label: e.command,
                description: e.description,
                suggestion: e
            }));
            let currentRelevance;
            for (let i = 0; i < picks.length; i++) {
                const pick = picks[i];
                const lastPick = picks.at(i - 1);
                if ('suggestion' in pick &&
                    (!currentRelevance ||
                        (i > 0 && 'suggestion' in lastPick && pick.suggestion.relevance !== lastPick.suggestion.relevance))) {
                    currentRelevance = pick.suggestion.relevance;
                    picks.splice(i++, 0, { label: relevanceToString(currentRelevance), kind: vscode.QuickPickItemKind.Separator });
                }
            }
            r(picks);
        });
    });
    picksPromise.then(picks => {
        if (picks.length === 0) {
            vscode.window.showInformationMessage('No fixes found');
        }
    });
    const pick = vscode.window.createQuickPick();
    pick.canSelectMany = false;
    // Setup loading state
    const generatingString = l10n.t('Generating');
    pick.placeholder = generatingString;
    pick.busy = true;
    let dots = 0;
    const dotTimer = new async_1.IntervalTimer();
    dotTimer.cancelAndSet(() => {
        dots++;
        if (dots > 3) {
            dots = 0;
        }
        pick.placeholder = generatingString + '.'.repeat(dots);
    }, 250);
    pick.show();
    pick.items = await picksPromise;
    // Clear loading state
    dotTimer.cancel();
    pick.placeholder = '';
    pick.busy = false;
    await new Promise(r => pick.onDidAccept(() => r()));
    const item = pick.activeItems[0];
    if (item && 'suggestion' in item) {
        const shouldExecute = !item.suggestion.command.match(/{.+}/);
        vscode.window.activeTerminal?.sendText(item.suggestion.command, shouldExecute);
    }
    pick.dispose();
}
let TerminalQuickFixGenerator = class TerminalQuickFixGenerator {
    constructor(_endpointProvider, _instantiationService, _logService, _workspaceService) {
        this._endpointProvider = _endpointProvider;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._workspaceService = _workspaceService;
    }
    async generateTerminalQuickFix(commandMatchResult, token) {
        const unverifiedContextUris = await this._generateTerminalQuickFixFileContext(commandMatchResult, token);
        if (!unverifiedContextUris || token.isCancellationRequested) {
            return;
        }
        const verifiedContextUris = [];
        const verifiedContextDirectoryUris = [];
        const nonExistentContextUris = [];
        for (const uri of unverifiedContextUris) {
            try {
                const exists = await vscode.workspace.fs.stat(uri);
                // This does not support binary files
                if (exists.type === vscode.FileType.File || exists.type === vscode.FileType.SymbolicLink) {
                    verifiedContextUris.push(uri);
                }
                else if (exists.type === vscode.FileType.Directory) {
                    verifiedContextDirectoryUris.push(uri);
                }
                else {
                    nonExistentContextUris.push(uri);
                }
            }
            catch {
                nonExistentContextUris.push(uri);
            }
        }
        const endpoint = await this._endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this._instantiationService, endpoint, terminalQuickFix_1.TerminalQuickFixPrompt, {
            commandLine: commandMatchResult.commandLine,
            output: [],
            verifiedContextUris,
            verifiedContextDirectoryUris,
            nonExistentContextUris,
        });
        const prompt = await promptRenderer.render(undefined, undefined);
        const fetchResult = await endpoint.makeChatRequest('terminalQuickFixGenerator', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other);
        this._logService.info('Terminal QuickFix FetchResult ' + fetchResult);
        if (token.isCancellationRequested) {
            return;
        }
        if (fetchResult.type !== 'success') {
            throw new Error(vscode.l10n.t('Encountered an error while determining terminal quick fixes: {0}', fetchResult.type));
        }
        this._logService.debug('generalTerminalQuickFix fetchResult.value ' + fetchResult.value);
        // Parse result json
        const parsedResults = [];
        try {
            // The result may come in a md fenced code block
            const codeblocks = (0, markdown_1.extractCodeBlocks)(fetchResult.value);
            const json = JSON.parse(codeblocks.length > 0 ? codeblocks[0].code : fetchResult.value);
            if (json && Array.isArray(json)) {
                for (const entry of json) {
                    if (typeof entry === 'object' && entry) {
                        const command = 'command' in entry && typeof entry.command === 'string' ? entry.command : undefined;
                        const description = 'description' in entry && typeof entry.description === 'string' ? entry.description : undefined;
                        const relevance = 'relevance' in entry && typeof entry.relevance === 'string' && (entry.relevance === 'low' || entry.relevance === 'medium' || entry.relevance === 'high') ? entry.relevance : undefined;
                        if (command && description && relevance) {
                            parsedResults.push({
                                command,
                                description,
                                relevance: parseRelevance(relevance)
                            });
                        }
                    }
                }
            }
        }
        catch (e) {
            this._logService.error('Error parsing terminal quick fix results: ' + e);
        }
        return parsedResults;
    }
    async _generateTerminalQuickFixFileContext(commandMatchResult, token) {
        const endpoint = await this._endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this._instantiationService, endpoint, terminalQuickFix_1.TerminalQuickFixFileContextPrompt, {
            commandLine: commandMatchResult.commandLine,
            output: [],
        });
        const prompt = await promptRenderer.render(undefined, undefined);
        this._logService.debug('_generalTerminalQuickFixFileContext prompt.messages: ' + prompt.messages);
        const fetchResult = await endpoint.makeChatRequest('terminalQuickFixGenerator', prompt.messages, async (_) => void 0, token, commonTypes_1.ChatLocation.Other);
        this._logService.info('Terminal Quick Fix Fetch Result: ' + fetchResult);
        if (token.isCancellationRequested) {
            return;
        }
        if (fetchResult.type !== 'success') {
            throw new Error(vscode.l10n.t('Encountered an error while fetching quick fix file context: {0}', fetchResult.type));
        }
        this._logService.debug('_generalTerminalQuickFixFileContext fetchResult.value' + fetchResult.value);
        // Parse result json
        const parsedResults = [];
        try {
            const json = JSON.parse(fetchResult.value);
            if (json && Array.isArray(json)) {
                for (const entry of json) {
                    if (typeof entry === 'object' && entry) {
                        const fileName = 'fileName' in entry && typeof entry.fileName === 'string' ? entry.fileName : undefined;
                        if (fileName) {
                            parsedResults.push({ fileName });
                        }
                    }
                }
            }
        }
        catch {
            // no-op
        }
        const uris = [];
        const requestedFiles = new Set();
        const folders = this._workspaceService.getWorkspaceFolders();
        const tryAddFileVariables = async (file) => {
            for (const rootFolder of folders) {
                const uri = uri_1.URI.joinPath(rootFolder, file);
                if (requestedFiles.has(uri.toString())) {
                    return;
                }
                requestedFiles.add(uri.toString());
                // Do not stat here as the follow up wants to know whether it exists
                uris.push(uri);
            }
        };
        for (const { fileName } of parsedResults) {
            if (fileName.endsWith(".exe") || (fileName.includes("/bin/") && !fileName.endsWith("activate"))) {
                continue;
            }
            if ((0, path_1.isAbsolute)(fileName)) {
                uris.push(vscode_1.Uri.file(fileName));
            }
            else {
                await tryAddFileVariables(fileName);
            }
        }
        return uris;
    }
};
TerminalQuickFixGenerator = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService),
    __param(3, workspaceService_1.IWorkspaceService)
], TerminalQuickFixGenerator);
//# sourceMappingURL=terminalFixGenerator.js.map