"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewOutputChannelLogTarget = exports.OutputChannelName = exports.outputChannel = void 0;
const vscode_1 = require("vscode");
exports.OutputChannelName = 'GitHub Copilot Chat';
class NewOutputChannelLogTarget {
    constructor(extensionContext) {
        this._outputChannel = vscode_1.window.createOutputChannel(exports.OutputChannelName, { log: true });
        exports.outputChannel = this._outputChannel;
        extensionContext.subscriptions.push(this._outputChannel);
    }
    logIt(level, metadataStr, ...extra) {
        switch (level) {
            case vscode_1.LogLevel.Trace:
                this._outputChannel.trace(metadataStr);
                break;
            case vscode_1.LogLevel.Debug:
                this._outputChannel.debug(metadataStr);
                break;
            case vscode_1.LogLevel.Info:
                this._outputChannel.info(metadataStr);
                break;
            case vscode_1.LogLevel.Warning:
                this._outputChannel.warn(metadataStr);
                break;
            case vscode_1.LogLevel.Error:
                this._outputChannel.error(metadataStr);
                break;
        }
    }
    show(preserveFocus) {
        this._outputChannel.show(preserveFocus);
    }
}
exports.NewOutputChannelLogTarget = NewOutputChannelLogTarget;
//# sourceMappingURL=outputChannelLogTarget.js.map