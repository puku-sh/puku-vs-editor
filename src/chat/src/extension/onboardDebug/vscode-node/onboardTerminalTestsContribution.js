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
exports.OnboardTerminalTestsContribution = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const debuggableCommandIdentifier_1 = require("../node/debuggableCommandIdentifier");
const copilotDebugCommandContribution_1 = require("./copilotDebugCommandContribution");
const PROVIDER_ID = 'copilot-chat.terminalToDebugging';
const PROVIDER_ID2 = 'copilot-chat.terminalToDebuggingSuccess';
let OnboardTerminalTestsContribution = class OnboardTerminalTestsContribution extends lifecycle_1.Disposable {
    constructor(debuggableCommandIdentifier) {
        super();
        this.debuggableCommandIdentifier = debuggableCommandIdentifier;
        /**
         * Execution end events for terminals. This is a hacky back door to get
         * output info into quick fixes.
         */
        this.lastExecutionFor = new Map();
        this._register(vscode.window.registerTerminalQuickFixProvider(PROVIDER_ID, this));
        this._register(vscode.window.registerTerminalQuickFixProvider(PROVIDER_ID2, this));
        this._register(vscode.window.onDidCloseTerminal(e => {
            this.lastExecutionFor.delete(e);
        }));
        this._register(vscode.window.onDidStartTerminalShellExecution(e => {
            this.lastExecutionFor.set(e.terminal, e);
        }));
        this._register(vscode.commands.registerCommand('puku.chat.rerunWithCopilotDebug', () => {
            const terminal = vscode.window.activeTerminal;
            const execution = terminal && this.lastExecutionFor.get(terminal);
            if (!execution) {
                return;
            }
            terminal.sendText(`${copilotDebugCommandContribution_1.COPILOT_DEBUG_COMMAND} ${execution.execution.commandLine.value}`, true);
        }));
    }
    async provideTerminalQuickFixes(commandMatchResult, token) {
        const activeTerminal = vscode.window.activeTerminal?.shellIntegration;
        const cwd = activeTerminal?.cwd;
        if (!await this.debuggableCommandIdentifier.isDebuggable(cwd, commandMatchResult.commandLine, token)) {
            return undefined;
        }
        // todo@connor4312: try to parse stack trace and shell intergation and
        // set a breakpoint on any failure position
        return {
            terminalCommand: `${copilotDebugCommandContribution_1.COPILOT_DEBUG_COMMAND} ${commandMatchResult.commandLine}`,
            shouldExecute: false,
        };
    }
};
exports.OnboardTerminalTestsContribution = OnboardTerminalTestsContribution;
exports.OnboardTerminalTestsContribution = OnboardTerminalTestsContribution = __decorate([
    __param(0, debuggableCommandIdentifier_1.IDebuggableCommandIdentifier)
], OnboardTerminalTestsContribution);
//# sourceMappingURL=onboardTerminalTestsContribution.js.map