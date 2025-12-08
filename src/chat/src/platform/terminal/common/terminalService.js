"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullTerminalService = exports.ITerminalService = void 0;
exports.isTerminalService = isTerminalService;
exports.isNullTerminalService = isNullTerminalService;
const services_1 = require("../../../util/common/services");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
exports.ITerminalService = (0, services_1.createServiceIdentifier)('ITerminalService');
class NullTerminalService extends lifecycle_1.Disposable {
    constructor() {
        super(...arguments);
        this._onDidWriteTerminalData = this._register(new event_1.Emitter());
        this.onDidWriteTerminalData = this._onDidWriteTerminalData.event;
        this._onDidChangeTerminalShellIntegration = this._register(new event_1.Emitter());
        this.onDidChangeTerminalShellIntegration = this._onDidChangeTerminalShellIntegration.event;
        this._onDidEndTerminalShellExecution = this._register(new event_1.Emitter());
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
        this._onDidCloseTerminal = this._register(new event_1.Emitter());
        this.onDidCloseTerminal = this._onDidCloseTerminal.event;
    }
    static { this.Instance = new NullTerminalService(); }
    get terminalBuffer() {
        return '';
    }
    get terminalLastCommand() {
        return undefined;
    }
    get terminalSelection() {
        return '';
    }
    get terminalShellType() {
        return '';
    }
    async getCwdForSession(sessionId) {
        return Promise.resolve(undefined);
    }
    async getCopilotTerminals(sessionId) {
        return Promise.resolve([]);
    }
    getTerminalsWithSessionInfo() {
        throw new Error('Method not implemented.');
    }
    getToolTerminalForSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    async associateTerminalWithSession(terminal, sessionId, shellIntegrationquality) {
        Promise.resolve();
    }
    createTerminal(name, shellPath, shellArgs) {
        return {};
    }
    get terminals() {
        return [];
    }
    getBufferForTerminal(terminal, maxLines) {
        return '';
    }
    getBufferWithPid(pid, maxChars) {
        return Promise.resolve('');
    }
    getLastCommandForTerminal(terminal) {
        return undefined;
    }
    contributePath(contributor, pathLocation, description, prepend) {
        // No-op for null service
    }
    removePathContribution(contributor) {
        // No-op for null service
    }
}
exports.NullTerminalService = NullTerminalService;
function isTerminalService(thing) {
    return thing && typeof thing.createTerminal === 'function';
}
function isNullTerminalService(thing) {
    return thing && typeof thing.createTerminal === 'function' && thing.createTerminal() === undefined;
}
//# sourceMappingURL=terminalService.js.map