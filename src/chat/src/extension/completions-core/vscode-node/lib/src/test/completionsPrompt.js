"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompletionRequestData = createCompletionRequestData;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const telemetry_1 = require("../telemetry");
function createCompletionRequestData(accessor, doc, position, codeSnippets, traits, turnOffSimilarFiles, suffixMatchThreshold, maxPromptLength) {
    return {
        document: doc,
        position,
        telemetryData: telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(),
        cancellationToken: new vscode_languageserver_protocol_1.CancellationTokenSource().token,
        codeSnippets,
        traits,
        turnOffSimilarFiles,
        suffixMatchThreshold,
        maxPromptTokens: maxPromptLength ?? 1000,
    };
}
//# sourceMappingURL=completionsPrompt.js.map