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
exports.ClaudeSessionUri = exports.ClaudeChatSessionItemProvider = void 0;
const vscode = __importStar(require("vscode"));
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const claudeCodeSessionService_1 = require("../../agents/claude/node/claudeCodeSessionService");
/**
 * Chat session item provider for Claude Code.
 * Reads sessions from ~/.claude/projects/<folder-slug>/, where each file name is a session id (GUID).
 */
let ClaudeChatSessionItemProvider = class ClaudeChatSessionItemProvider extends lifecycle_1.Disposable {
    static { this.claudeSessionType = 'claude-code'; }
    constructor(claudeCodeSessionService) {
        super();
        this.claudeCodeSessionService = claudeCodeSessionService;
        this._onDidChangeChatSessionItems = this._register(new event_1.Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._onDidCommitChatSessionItem = this._register(new event_1.Emitter());
        this.onDidCommitChatSessionItem = this._onDidCommitChatSessionItem.event;
    }
    refresh() {
        this._onDidChangeChatSessionItems.fire();
    }
    swap(original, modified) {
        this._onDidCommitChatSessionItem.fire({ original, modified });
    }
    async provideChatSessionItems(token) {
        const sessions = await this.claudeCodeSessionService.getAllSessions(token);
        const diskSessions = sessions.map(session => ({
            resource: ClaudeSessionUri.forSessionId(session.id),
            label: session.label,
            tooltip: `Claude Code session: ${session.label}`,
            timing: {
                startTime: session.timestamp.getTime()
            },
            iconPath: new vscode.ThemeIcon('star-add')
        }));
        return diskSessions;
    }
};
exports.ClaudeChatSessionItemProvider = ClaudeChatSessionItemProvider;
exports.ClaudeChatSessionItemProvider = ClaudeChatSessionItemProvider = __decorate([
    __param(0, claudeCodeSessionService_1.IClaudeCodeSessionService)
], ClaudeChatSessionItemProvider);
var ClaudeSessionUri;
(function (ClaudeSessionUri) {
    function forSessionId(sessionId) {
        return vscode.Uri.from({ scheme: ClaudeChatSessionItemProvider.claudeSessionType, path: '/' + sessionId });
    }
    ClaudeSessionUri.forSessionId = forSessionId;
    function getId(resource) {
        if (resource.scheme !== ClaudeChatSessionItemProvider.claudeSessionType) {
            throw new Error('Invalid resource scheme for Claude Code session');
        }
        return resource.path.slice(1);
    }
    ClaudeSessionUri.getId = getId;
})(ClaudeSessionUri || (exports.ClaudeSessionUri = ClaudeSessionUri = {}));
//# sourceMappingURL=claudeChatSessionItemProvider.js.map