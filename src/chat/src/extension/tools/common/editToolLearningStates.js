"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDIT_TOOL_LEARNING_STATES = void 0;
const toolNames_1 = require("./toolNames");
// Top-level helper functions
function getSuccessRate(successBitset, totalAttempts) {
    if (totalAttempts === 0) {
        return 0;
    }
    const actualBits = Math.min(totalAttempts, 100 /* LearningConfig.WINDOW_SIZE */);
    let successCount = 0;
    for (let i = 0; i < actualBits; i++) {
        if ((successBitset >> BigInt(i)) & 1n) {
            successCount++;
        }
    }
    return successCount / actualBits;
}
function sampleSize(data, tool) {
    return Math.min(data.tools[tool]?.attempts || 0, 100 /* LearningConfig.WINDOW_SIZE */);
}
function successRate(data, tool) {
    const toolData = data.tools[tool];
    if (!toolData) {
        return 0;
    }
    return getSuccessRate(toolData.successBitset, toolData.attempts);
}
exports.EDIT_TOOL_LEARNING_STATES = {
    [0 /* State.Initial */]: {
        allowedTools: [toolNames_1.ToolName.EditFile, toolNames_1.ToolName.ReplaceString],
        transitions: {
            [2 /* State.ReplaceStringMaybeMulti */]: d => sampleSize(d, toolNames_1.ToolName.ReplaceString) > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ &&
                successRate(d, toolNames_1.ToolName.ReplaceString) > 0.8 /* LearningConfig.SR_SUCCESS_THRESHOLD */,
            [3 /* State.EditFileOnly */]: d => sampleSize(d, toolNames_1.ToolName.ReplaceString) > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ &&
                successRate(d, toolNames_1.ToolName.ReplaceString) < 0.3 /* LearningConfig.SR_FAILURE_THRESHOLD */,
            [1 /* State.ReplaceStringForced */]: d => {
                // Models are instructed to prefer replace_string to insert_edit. If
                // this model is not doing that (more than 70% of edits are insert_edit),
                // force it to so we can get more data.
                const editFileAttempts = sampleSize(d, toolNames_1.ToolName.EditFile);
                const replaceStringAttempts = sampleSize(d, toolNames_1.ToolName.ReplaceString);
                return editFileAttempts > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ && editFileAttempts / (editFileAttempts + replaceStringAttempts) > 0.7;
            },
        },
    },
    [1 /* State.ReplaceStringForced */]: {
        allowedTools: [toolNames_1.ToolName.ReplaceString],
        transitions: {
            [2 /* State.ReplaceStringMaybeMulti */]: d => sampleSize(d, toolNames_1.ToolName.ReplaceString) > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ &&
                successRate(d, toolNames_1.ToolName.ReplaceString) > 0.8 /* LearningConfig.SR_SUCCESS_THRESHOLD */,
            [3 /* State.EditFileOnly */]: d => sampleSize(d, toolNames_1.ToolName.ReplaceString) > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ &&
                successRate(d, toolNames_1.ToolName.ReplaceString) < 0.3 /* LearningConfig.SR_FAILURE_THRESHOLD */,
        },
    },
    [2 /* State.ReplaceStringMaybeMulti */]: {
        allowedTools: [toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString],
        transitions: {
            [5 /* State.ReplaceStringWithMulti */]: d => sampleSize(d, toolNames_1.ToolName.MultiReplaceString) > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ &&
                successRate(d, toolNames_1.ToolName.MultiReplaceString) > 0.7 /* LearningConfig.MULTISR_SUCCESS_THRESHOLD */,
            [4 /* State.ReplaceStringOnly */]: d => sampleSize(d, toolNames_1.ToolName.MultiReplaceString) > 66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */ &&
                successRate(d, toolNames_1.ToolName.MultiReplaceString) < 0.4 /* LearningConfig.MULTISR_FAILURE_THRESHOLD */,
        },
    },
    // Terminal states have no transitions
    [3 /* State.EditFileOnly */]: {
        allowedTools: [toolNames_1.ToolName.EditFile],
    },
    [4 /* State.ReplaceStringOnly */]: {
        allowedTools: [toolNames_1.ToolName.ReplaceString],
    },
    [5 /* State.ReplaceStringWithMulti */]: {
        allowedTools: [toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString],
    },
};
//# sourceMappingURL=editToolLearningStates.js.map