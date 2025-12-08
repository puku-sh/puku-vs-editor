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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatReplaySessionProvider = void 0;
const fs = __importStar(require("node:fs"));
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const replayParser_1 = require("../node/replayParser");
class ChatReplaySessionProvider extends lifecycle_1.Disposable {
    constructor() {
        super();
        this._onDidChangeChatSessionItems = this._register(new vscode_1.EventEmitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this.onDidCommitChatSessionItem = this._register(new vscode_1.EventEmitter()).event;
    }
    provideChatSessionItems(token) {
        return [];
    }
    provideChatSessionContent(resource, token) {
        const logFile = resource.with({ scheme: 'file' });
        const content = fs.readFileSync(logFile.fsPath, 'utf8');
        const chatSteps = (0, replayParser_1.parseReplay)(content);
        return {
            history: this.convertStepsToHistory(chatSteps),
            requestHandler: undefined
        };
    }
    convertStepsToHistory(chatSteps) {
        const history = [];
        let lastQuery = '';
        for (const step of chatSteps) {
            if (step.kind === 'userQuery') {
                if (step.query !== lastQuery) {
                    lastQuery = step.query;
                    history.push(this.createRequestTurn(step));
                }
            }
            else if (step.kind === 'request' && step.result) {
                history.push(new vscode_1.ChatResponseTurn2([new vscode_1.ChatResponseMarkdownPart(step.result)], {}, 'copilot'));
            }
            else if (step.kind === 'toolCall') {
                history.push(new vscode_1.ChatResponseTurn2([new vscode_1.ChatToolInvocationPart(step.toolName, '', false)], {}, 'copilot'));
            }
        }
        return history;
    }
    createRequestTurn(step) {
        return new vscode_1.ChatRequestTurn2(step.query, undefined, [], 'copilot', [], undefined);
    }
    fireSessionsChanged() {
        this._onDidChangeChatSessionItems.fire();
    }
}
exports.ChatReplaySessionProvider = ChatReplaySessionProvider;
//# sourceMappingURL=chatReplaySessionProvider.js.map