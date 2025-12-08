"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveTerminalBuffer = getActiveTerminalBuffer;
exports.getBufferForTerminal = getBufferForTerminal;
exports.getLastCommandForTerminal = getLastCommandForTerminal;
exports.getActiveTerminalLastCommand = getActiveTerminalLastCommand;
exports.getActiveTerminalSelection = getActiveTerminalSelection;
exports.getActiveTerminalShellType = getActiveTerminalShellType;
exports.installTerminalBufferListeners = installTerminalBufferListeners;
const vscode_1 = require("vscode");
const path_1 = require("../../../util/vs/base/common/path");
const process_1 = require("../../../util/vs/base/common/process");
const strings_1 = require("../../../util/vs/base/common/strings");
const terminalBuffers = new Map();
const terminalCommands = new Map();
function getActiveTerminalBuffer() {
    const activeTerminal = vscode_1.window.activeTerminal;
    if (activeTerminal === undefined) {
        return '';
    }
    return terminalBuffers.get(activeTerminal)?.join('') || '';
}
function getBufferForTerminal(terminal, maxChars = 16000) {
    if (!terminal) {
        return '';
    }
    const buffer = terminalBuffers.get(terminal);
    if (!buffer) {
        return '';
    }
    const joined = buffer.join('');
    const start = Math.max(0, joined.length - maxChars);
    return joined.slice(start);
}
function getLastCommandForTerminal(terminal) {
    return terminalCommands.get(terminal)?.at(-1);
}
function getActiveTerminalLastCommand() {
    const activeTerminal = vscode_1.window.activeTerminal;
    if (activeTerminal === undefined) {
        return undefined;
    }
    return terminalCommands.get(activeTerminal)?.at(-1);
}
function getActiveTerminalSelection() {
    try {
        return vscode_1.window.activeTerminal?.selection ?? '';
    }
    catch {
        // In case the API isn't available
        return '';
    }
}
let lastDetectedShellType;
function getActiveTerminalShellType() {
    const activeTerminal = vscode_1.window.activeTerminal;
    // Prefer the state object as it's the most reliable
    if (activeTerminal?.state.shell) {
        return activeTerminal.state.shell;
    }
    if (activeTerminal && 'shellPath' in activeTerminal.creationOptions) {
        const shellPath = activeTerminal.creationOptions.shellPath;
        if (shellPath) {
            let candidateShellType;
            const shellFile = (0, path_1.basename)(shellPath);
            // Detect git bash specially as it depends on the .exe
            if (shellFile === 'bash.exe') {
                candidateShellType = 'Git Bash';
            }
            else {
                const shellFileWithoutExtension = shellFile.replace(/\..+/, '');
                switch (shellFileWithoutExtension) {
                    case 'pwsh':
                    case 'powershell':
                        candidateShellType = 'powershell';
                        break;
                    case '':
                        break;
                    default:
                        candidateShellType = shellFileWithoutExtension;
                }
            }
            if (candidateShellType) {
                lastDetectedShellType = candidateShellType;
                return candidateShellType;
            }
        }
    }
    // Fall back to the last detected shell type if it exists
    if (lastDetectedShellType) {
        return lastDetectedShellType;
    }
    // Fall back to bash or PowerShell, this uses the front end OS so it could give the wrong shell
    // when remoting from Windows into non-Windows or vice versa.
    return process_1.platform === 'win32' ? 'powershell' : 'bash';
}
function appendLimitedWindow(target, data) {
    target.push(data);
    if (target.length > 40) {
        // 40 data events should capture a minimum of about twice the typical visible area
        target.shift();
    }
}
function installTerminalBufferListeners() {
    return [
        vscode_1.window.onDidChangeTerminalState(t => {
            if (vscode_1.window.activeTerminal && t.processId === vscode_1.window.activeTerminal.processId) {
                const newShellType = t.state.shell;
                if (newShellType && newShellType !== lastDetectedShellType) {
                    lastDetectedShellType = newShellType;
                }
            }
        }),
        vscode_1.window.onDidWriteTerminalData(e => {
            let dataBuffer = terminalBuffers.get(e.terminal);
            if (!dataBuffer) {
                dataBuffer = [];
                terminalBuffers.set(e.terminal, dataBuffer);
            }
            appendLimitedWindow(dataBuffer, (0, strings_1.removeAnsiEscapeCodes)(e.data));
        }),
        vscode_1.window.onDidExecuteTerminalCommand(e => {
            let commands = terminalCommands.get(e.terminal);
            if (!commands) {
                commands = [];
                terminalCommands.set(e.terminal, commands);
            }
            appendLimitedWindow(commands, e);
        }),
        vscode_1.window.onDidCloseTerminal(e => {
            terminalBuffers.delete(e);
        })
    ];
}
//# sourceMappingURL=terminalBufferListener.js.map