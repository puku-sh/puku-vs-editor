"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugSessionLoggingFactory = void 0;
exports.getMostRecentDebugOutput = getMostRecentDebugOutput;
exports.installDebugOutputListeners = installDebugOutputListeners;
const vscode_1 = require("vscode");
const debugOutput = [];
function getMostRecentDebugOutput() {
    return debugOutput.join('\n');
}
function appendLimitedWindow(target, data) {
    target.push(removeAnsiEscapeCodes(data));
    if (target.length > 40) {
        // 40 lines should capture ~twice the visible area
        target.shift();
    }
}
class DebugSessionTracker {
    constructor(session) {
        this.session = session;
    }
    onWillStartSession() { }
    onWillReceiveMessage(message) { }
    onDidSendMessage(message) {
        if (vscode_1.debug.activeDebugSession !== this.session) {
            return;
        }
        const output = this.extractOutput(message);
        if (output) {
            appendLimitedWindow(debugOutput, output);
        }
    }
    extractOutput(message) {
        if (message.event === 'output' && (message.body.category === 'stdout' || message.body.category === 'stderr')) {
            return message.body.output;
        }
        return undefined;
    }
    onWillStopSession() { }
    onError(error) { }
    onExit(code, signal) { }
}
// taken from https://github.com/microsoft/vscode/blob/499fb52ae8c985485e6503669f3711ee0d6f31dc/src/vs/base/common/strings.ts#L731
function removeAnsiEscapeCodes(str) {
    const CSI_SEQUENCE = /(:?\x1b\[|\x9B)[=?>!]?[\d;:]*["$#'* ]?[a-zA-Z@^`{}|~]/g;
    if (str) {
        str = str.replace(CSI_SEQUENCE, '');
    }
    return str;
}
function installDebugOutputListeners() {
    const debugAdapter = vscode_1.debug.registerDebugAdapterTrackerFactory('*', new DebugSessionLoggingFactory());
    return [debugAdapter];
}
class DebugSessionLoggingFactory {
    createDebugAdapterTracker(session) {
        return new DebugSessionTracker(session);
    }
}
exports.DebugSessionLoggingFactory = DebugSessionLoggingFactory;
//# sourceMappingURL=debugOutputListener.js.map