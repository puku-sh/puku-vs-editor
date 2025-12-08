"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ServerPoweredInlineEditProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerPoweredInlineEditProvider = exports.SerializedServerResponse = void 0;
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const permutation_1 = require("../../../platform/inlineEdits/common/dataTypes/permutation");
const statelessNextEditProvider_1 = require("../../../platform/inlineEdits/common/statelessNextEditProvider");
const errors_1 = require("../../../util/common/errors");
const result_1 = require("../../../util/common/result");
const assert_1 = require("../../../util/vs/base/common/assert");
const lineEdit_1 = require("../../../util/vs/editor/common/core/edits/lineEdit");
var SerializedServerResponse;
(function (SerializedServerResponse) {
    function isSerializedServerResponse(thing) {
        return !!(thing && typeof thing === 'object' &&
            'edits' in thing && Array.isArray(thing.edits) && thing.edits.every((e) => lineEdit_1.SerializedLineReplacement.is(e)) &&
            'user_prompt' in thing && typeof thing.user_prompt === 'string' &&
            'model_response' in thing && typeof thing.model_response === 'string');
    }
    SerializedServerResponse.isSerializedServerResponse = isSerializedServerResponse;
})(SerializedServerResponse || (exports.SerializedServerResponse = SerializedServerResponse = {}));
let ServerPoweredInlineEditProvider = class ServerPoweredInlineEditProvider {
    static { ServerPoweredInlineEditProvider_1 = this; }
    static { this.ID = 'ServerPoweredInlineEditProvider'; }
    constructor(fetcher) {
        this.fetcher = fetcher;
        this.ID = ServerPoweredInlineEditProvider_1.ID;
        this.dependsOnSelection = true;
    }
    async provideNextEdit(request, pushEdit, logContext, cancellationToken) {
        const telemetryBuilder = new statelessNextEditProvider_1.StatelessNextEditTelemetryBuilder(request);
        const serializedRequest = request.serialize();
        const requestAsJson = JSON.stringify(serializedRequest, null, 2);
        this.logContextRequest(JSON.stringify(requestAsJson), logContext);
        const abortCtrl = new AbortController();
        const fetchDisposable = cancellationToken.onCancellationRequested(() => abortCtrl.abort());
        let r;
        try {
            r = await fetch('http://localhost:8001', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestAsJson,
                signal: abortCtrl.signal,
            });
        }
        catch (e) {
            logContext.setError(e);
            if (e instanceof Error) {
                if (e.message === 'AbortError') {
                    return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterFetchCall'), telemetryBuilder);
                }
                return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.FetchFailure(e), telemetryBuilder);
            }
            return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.FetchFailure((0, errors_1.fromUnknown)(e)), telemetryBuilder);
        }
        finally {
            fetchDisposable.dispose();
        }
        if (r.status === 200) {
            const response = await r.json();
            (0, assert_1.assert)(SerializedServerResponse.isSerializedServerResponse(response), 'Invalid server response format: ' + JSON.stringify(response, null, 2));
            this.spyOnPromptAndResponse(this.fetcher, { user_prompt: response.user_prompt, model_response: response.model_response });
            this.logContextResponse(response, logContext);
            const edits = response.edits.map(e => lineEdit_1.LineReplacement.deserialize(e));
            const sortingPermutation = permutation_1.Permutation.createSortPermutation(edits, (a, b) => a.lineRange.startLineNumber - b.lineRange.startLineNumber);
            const lineEdit = new lineEdit_1.LineEdit(sortingPermutation.apply(edits));
            lineEdit.replacements.forEach(edit => pushEdit(result_1.Result.ok({ edit })));
            pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, undefined)));
            return statelessNextEditProvider_1.StatelessNextEditResult.streaming(telemetryBuilder);
        }
        else {
            const errorPayload = {
                code: r.status,
                message: r.statusText,
                response: await r.text(),
            };
            const errMsg = `Fetch errored: ${JSON.stringify(errorPayload, null, 2)}`;
            const error = new Error(errMsg);
            logContext.setError(error);
            return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.FetchFailure(error), telemetryBuilder);
        }
    }
    spyOnPromptAndResponse(fetcher, { user_prompt, model_response }) {
        // no-op
    }
    logContextRequest(request, logContext) {
        logContext.addLog('<details>');
        logContext.addLog('<summary>Request</summary>');
        logContext.addLog('~~~');
        logContext.addLog(request);
        logContext.addLog('~~~');
        logContext.addLog('</details>');
    }
    logContextResponse(response, logContext) {
        logContext.addLog('<details>');
        logContext.addLog('<summary>Response</summary>');
        logContext.addLog('~~~');
        logContext.addLog(JSON.stringify(response, null, 2));
        logContext.addLog('~~~');
        logContext.addLog('</details>');
    }
};
exports.ServerPoweredInlineEditProvider = ServerPoweredInlineEditProvider;
exports.ServerPoweredInlineEditProvider = ServerPoweredInlineEditProvider = ServerPoweredInlineEditProvider_1 = __decorate([
    __param(0, chatMLFetcher_1.IChatMLFetcher)
], ServerPoweredInlineEditProvider);
//# sourceMappingURL=serverPoweredInlineEditProvider.js.map