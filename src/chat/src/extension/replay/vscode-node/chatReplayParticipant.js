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
exports.ChatReplayParticipant = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatReplayResponses_1 = require("../../replay/common/chatReplayResponses");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
let ChatReplayParticipant = class ChatReplayParticipant {
    constructor(workspaceService, toolsService) {
        this.workspaceService = workspaceService;
        this.toolsService = toolsService;
    }
    async handleRequest(request, context, response, token) {
        const replay = chatReplayResponses_1.ChatReplayResponses.getInstance();
        let res = await (0, async_1.raceCancellation)(replay.getResponse(), token);
        while (res && res !== 'finished') {
            // Stop processing if cancelled
            await (0, async_1.raceCancellation)(this.processStep(res, replay, response, request.toolInvocationToken), token);
            res = await (0, async_1.raceCancellation)(replay.getResponse(), token);
        }
        if (token.isCancellationRequested) {
            replay.cancelReplay();
        }
        return {};
    }
    async processStep(step, replay, stream, toolToken) {
        switch (step.kind) {
            case 'userQuery':
                stream.markdown(`\n\n---\n\n## User Query:\n\n${step.query}\n\n`);
                stream.markdown(`## Response:\n\n---\n`);
                break;
            case 'request':
                stream.markdown(`\n\n${step.result}`);
                break;
            case 'toolCall':
                {
                    replay.setToolResult(step.id, step.results);
                    const result = await this.toolsService.invokeTool(toolNames_1.ToolName.ToolReplay, {
                        toolInvocationToken: toolToken,
                        input: {
                            toolCallId: step.id,
                            toolName: step.toolName,
                            toolCallArgs: step.args
                        }
                    }, cancellation_1.CancellationToken.None);
                    if (result.content.length === 0) {
                        stream.markdown(l10n.t('No result from tool'));
                    }
                    if (step.edits) {
                        await Promise.all(step.edits.map(edit => this.makeEdit(edit, stream)));
                    }
                    break;
                }
        }
    }
    async makeEdit(edits, stream) {
        let uri;
        if (!edits.path.startsWith('/') && !edits.path.match(/^[a-zA-Z]:/)) {
            // Relative path - join with first workspace folder
            const workspaceFolders = this.workspaceService.getWorkspaceFolders();
            if (workspaceFolders.length > 0) {
                uri = vscodeTypes_1.Uri.joinPath(workspaceFolders[0], edits.path);
            }
            else {
                throw new Error('No workspace folder available to resolve relative path: ' + edits.path);
            }
        }
        else {
            // Absolute path
            uri = vscodeTypes_1.Uri.file(edits.path);
        }
        await this.ensureFileExists(uri);
        stream.markdown('\n```\n');
        stream.codeblockUri(uri, true);
        await Promise.all(edits.edits.replacements.map(r => this.performReplacement(uri, r, stream)));
        stream.textEdit(uri, true);
        stream.markdown('\n' + '```\n');
    }
    async ensureFileExists(uri) {
        try {
            await this.workspaceService.fs.stat(uri);
            return; // Exists
        }
        catch {
            // Create parent directory and empty file
            const parent = vscodeTypes_1.Uri.joinPath(uri, '..');
            await this.workspaceService.fs.createDirectory(parent);
            await this.workspaceService.fs.writeFile(uri, new Uint8Array());
        }
    }
    async performReplacement(uri, replacement, stream) {
        const doc = await this.workspaceService.openTextDocument(uri);
        const workspaceEdit = new vscodeTypes_1.WorkspaceEdit();
        const range = new vscodeTypes_1.Range(doc.positionAt(replacement.replaceRange.start), doc.positionAt(replacement.replaceRange.endExclusive));
        workspaceEdit.replace(uri, range, replacement.newText);
        for (const textEdit of workspaceEdit.entries()) {
            const edits = Array.isArray(textEdit[1]) ? textEdit[1] : [textEdit[1]];
            for (const textEdit of edits) {
                stream.textEdit(uri, textEdit);
            }
        }
    }
};
exports.ChatReplayParticipant = ChatReplayParticipant;
exports.ChatReplayParticipant = ChatReplayParticipant = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, toolsService_1.IToolsService)
], ChatReplayParticipant);
//# sourceMappingURL=chatReplayParticipant.js.map