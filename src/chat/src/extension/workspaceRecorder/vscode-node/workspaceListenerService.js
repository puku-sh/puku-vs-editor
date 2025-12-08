"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacListenerService = void 0;
const vscode_1 = require("vscode");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
class WorkspacListenerService extends lifecycle_1.Disposable {
    constructor() {
        super();
        this._serviceBrand = undefined;
        this._onStructuredData = new event_1.Emitter();
        this.onStructuredData = this._onStructuredData.event;
        this._onHandleChangeReason = new event_1.Emitter();
        this.onHandleChangeReason = this._onHandleChangeReason.event;
        this._register(new StructuredLoggerReceiver('editor.inlineSuggest.logChangeReason.commandId', data => this._handleStructuredLogData(data)));
        this._register(new StructuredLoggerReceiver('editor.inlineSuggest.logFetch.commandId', data => this._handleStructuredLogData(data)));
    }
    _handleStructuredLogData(data) {
        this._onStructuredData.fire(data);
        const d = data;
        if (d.sourceId === 'TextModel.setChangeReason') {
            this._onHandleChangeReason.fire({
                documentUri: d.modelUri.toString(),
                documentVersion: d.modelVersion,
                reason: d.source,
                metadata: d,
            });
        }
    }
}
exports.WorkspacListenerService = WorkspacListenerService;
class StructuredLoggerReceiver extends lifecycle_1.Disposable {
    constructor(key, handler) {
        super();
        const channel = vscode_1.env.getDataChannel('structuredLogger:' + key);
        this._register(channel.onDidReceiveData(e => {
            handler(e.data);
        }));
        const contextKey = 'structuredLogger.enabled:' + key;
        setContextKey(contextKey, true);
        this._register({
            dispose: () => {
                setContextKey(contextKey, undefined);
            }
        });
    }
}
function setContextKey(key, value) {
    vscode_1.commands.executeCommand('setContext', key, value);
}
//# sourceMappingURL=workspaceListenerService.js.map