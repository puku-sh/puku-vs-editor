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
exports.TerminalServiceImpl = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const vscode_1 = require("vscode");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const extensionContext_1 = require("../../extContext/common/extensionContext");
const terminalBufferListener_1 = require("./terminalBufferListener");
let TerminalServiceImpl = class TerminalServiceImpl extends lifecycle_1.Disposable {
    constructor(context) {
        super();
        this.context = context;
        this.pathContributions = new Map();
        // This used to be setup in the past for Copilot CLI auth in terminals.
        // It was only ever shipped in the VSCode insiders and never got into stable.
        // So this is only required for users who had insiders installed before it was removed.
        // Safe to remove this after a few months or so (https://github.com/microsoft/vscode/issues/275692).
        this.context.environmentVariableCollection.delete('GH_TOKEN');
        for (const l of (0, terminalBufferListener_1.installTerminalBufferListeners)()) {
            this._register(l);
        }
    }
    get terminals() {
        return vscode_1.window.terminals;
    }
    get onDidChangeTerminalShellIntegration() {
        return vscode_1.window.onDidChangeTerminalShellIntegration;
    }
    get onDidEndTerminalShellExecution() {
        return vscode_1.window.onDidEndTerminalShellExecution;
    }
    get onDidCloseTerminal() {
        return vscode_1.window.onDidCloseTerminal;
    }
    get onDidWriteTerminalData() {
        return vscode_1.window.onDidWriteTerminalData;
    }
    createTerminal(name, shellPath, shellArgs) {
        const terminal = vscode_1.window.createTerminal(name, shellPath, shellArgs);
        return terminal;
    }
    getBufferForTerminal(terminal, maxChars) {
        return (0, terminalBufferListener_1.getBufferForTerminal)(terminal, maxChars);
    }
    async getBufferWithPid(pid, maxChars) {
        let terminal;
        for (const t of this.terminals) {
            const tPid = await t.processId;
            if (tPid === pid) {
                terminal = t;
                break;
            }
        }
        if (terminal) {
            return this.getBufferForTerminal(terminal, maxChars);
        }
        return '';
    }
    getLastCommandForTerminal(terminal) {
        return (0, terminalBufferListener_1.getLastCommandForTerminal)(terminal);
    }
    get terminalBuffer() {
        return (0, terminalBufferListener_1.getActiveTerminalBuffer)();
    }
    get terminalLastCommand() {
        return (0, terminalBufferListener_1.getActiveTerminalLastCommand)();
    }
    get terminalSelection() {
        return (0, terminalBufferListener_1.getActiveTerminalSelection)();
    }
    get terminalShellType() {
        return (0, terminalBufferListener_1.getActiveTerminalShellType)();
    }
    contributePath(contributor, pathLocation, description, prepend = false) {
        this.pathContributions.set(contributor, { path: pathLocation, description, prepend });
        this.updateEnvironmentPath();
    }
    removePathContribution(contributor) {
        this.pathContributions.delete(contributor);
        this.updateEnvironmentPath();
    }
    updateEnvironmentPath() {
        const pathVariable = 'PATH';
        // Clear existing PATH modification
        this.context.environmentVariableCollection.delete(pathVariable);
        if (this.pathContributions.size === 0) {
            return;
        }
        // Build combined description
        const allDescriptions = (0, arrays_1.coalesce)(Array.from(this.pathContributions.values())
            .map(c => c.description && typeof c.description === 'string' ? c.description : undefined)
            .filter(d => d));
        let descriptions = '';
        if (allDescriptions.length === 1) {
            descriptions = allDescriptions[0];
        }
        else if (allDescriptions.length > 1) {
            descriptions = `${allDescriptions.slice(0, -1).join(', ')} ${l10n.t('and')} ${allDescriptions[allDescriptions.length - 1]}`;
        }
        const allCommands = (0, arrays_1.coalesce)(Array.from(this.pathContributions.values())
            .map(c => (c.description && typeof c.description !== 'string') ? `\`${c.description.command}\`` : undefined)
            .filter(d => d));
        let commandsDescription = '';
        if (allCommands.length === 1) {
            commandsDescription = l10n.t('Enables use of {0} command in the terminal', allCommands[0]);
        }
        else if (allCommands.length > 1) {
            const commands = `${allCommands.slice(0, -1).join(', ')} ${l10n.t('and')} ${allCommands[allCommands.length - 1]}`;
            commandsDescription = l10n.t('Enables use of {0} commands in the terminal', commands);
        }
        const description = [descriptions, commandsDescription].filter(d => d).join(' and ');
        this.context.environmentVariableCollection.description = description || 'Enables additional commands in the terminal.';
        // Build combined path from all contributions
        // Since we cannot mix and match append/prepend, if there are any prepend paths, then prepend everything.
        const allPaths = Array.from(this.pathContributions.values()).map(c => c.path);
        if (Array.from(this.pathContributions.values()).some(c => c.prepend)) {
            const pathVariableChange = allPaths.join(path.delimiter) + path.delimiter;
            this.context.environmentVariableCollection.prepend(pathVariable, pathVariableChange);
        }
        else {
            const pathVariableChange = path.delimiter + allPaths.join(path.delimiter);
            this.context.environmentVariableCollection.append(pathVariable, pathVariableChange);
        }
    }
};
exports.TerminalServiceImpl = TerminalServiceImpl;
exports.TerminalServiceImpl = TerminalServiceImpl = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext)
], TerminalServiceImpl);
//# sourceMappingURL=terminalServiceImpl.js.map