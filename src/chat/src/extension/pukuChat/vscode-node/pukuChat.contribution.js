"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
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
exports.PukuChatContribution = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pukuChatParticipant_1 = require("./pukuChatParticipant");
/**
 * Puku Chat Contribution
 *
 * Registers the Puku Chat participant which uses:
 * - Same ChatParticipantRequestHandler as Copilot (full code mapping, tools)
 * - Puku Indexing for workspace context
 * - Puku Proxy for GLM model inference
 */
let PukuChatContribution = class PukuChatContribution extends lifecycle_1.Disposable {
    static { this.ID = 'pukuChat.contribution'; }
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        // Register chat participant
        this._register(this._instantiationService.createInstance(pukuChatParticipant_1.PukuChatParticipant));
        // Register commands
        this._registerCommands();
        console.log('[PukuChat.contribution] Puku Chat contribution initialized');
    }
    _registerCommands() {
        // Command to open Puku Chat
        this._register(vscode.commands.registerCommand('puku.openChat', async () => {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: '@puku ',
            });
        }));
        // Command to ask about selected code
        this._register(vscode.commands.registerCommand('puku.askAboutSelection', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.selection.isEmpty) {
                vscode.window.showWarningMessage('Please select some code first');
                return;
            }
            const selectedText = editor.document.getText(editor.selection);
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: `@puku Explain this code:\n\`\`\`\n${selectedText}\n\`\`\``,
            });
        }));
    }
};
exports.PukuChatContribution = PukuChatContribution;
exports.PukuChatContribution = PukuChatContribution = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], PukuChatContribution);
//# sourceMappingURL=pukuChat.contribution.js.map