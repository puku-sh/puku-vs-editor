"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPromptInternal = extractPromptInternal;
exports.getGhostTextInternal = getGhostTextInternal;
const completionState_1 = require("../../completionState");
const ghostText_1 = require("../../ghostText/ghostText");
const contextProviderBridge_1 = require("../components/contextProviderBridge");
const prompt_1 = require("../prompt");
async function extractPromptInternal(accessor, completionId, textDocument, position, telemetryWithExp, promptOpts = {}) {
    const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
    const contextProviderBridge = accessor.get(contextProviderBridge_1.ICompletionsContextProviderBridgeService);
    contextProviderBridge.schedule(completionState, completionId, 'opId', telemetryWithExp);
    return (0, prompt_1.extractPrompt)(accessor, completionId, completionState, telemetryWithExp, undefined, promptOpts);
}
async function getGhostTextInternal(accessor, textDocument, position, token) {
    return (0, ghostText_1.getGhostText)(accessor, (0, completionState_1.createCompletionState)(textDocument, position), token, { opportunityId: 'opId' });
}
//# sourceMappingURL=prompt.js.map