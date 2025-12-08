"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFixContext = generateFixContext;
exports.findDiagnosticForSelectionAndPrompt = findDiagnosticForSelectionAndPrompt;
exports.findFixRangeOfInterest = findFixRangeOfInterest;
const parserService_1 = require("../../../../platform/parser/node/parserService");
const codeContextRegion_1 = require("../../../inlineChat/node/codeContextRegion");
const inlineChatSelection_1 = require("./inlineChatSelection");
function generateFixContext(endpoint, documentContext, range, rangeOfInterest) {
    // Number of tokens the endpoint can handle, 4 chars per token, we consume one 3rd
    const charLimit = (endpoint.modelMaxPromptTokens * 4) / 3;
    const tracker = new codeContextRegion_1.CodeContextTracker(charLimit);
    const document = documentContext.document;
    const language = documentContext.language;
    const rangeInfo = new codeContextRegion_1.CodeContextRegion(tracker, document, language);
    const aboveInfo = new codeContextRegion_1.CodeContextRegion(tracker, document, language);
    const belowInfo = new codeContextRegion_1.CodeContextRegion(tracker, document, language);
    const finish = () => {
        aboveInfo.trim();
        rangeInfo.trim();
        belowInfo.trim();
        return { contextInfo: { language, above: aboveInfo, range: rangeInfo, below: belowInfo }, tracker };
    };
    const continueExecution = processFixSelection(rangeInfo, range, rangeOfInterest);
    if (!continueExecution) {
        return finish();
    }
    const constraints = {
        aboveLineIndex: rangeOfInterest.start.line - 1,
        belowLineIndex: rangeOfInterest.end.line + 1,
        minimumLineIndex: 0,
        maximumLineIndex: document.lineCount - 1
    };
    (0, inlineChatSelection_1.processCodeAroundSelection)(constraints, aboveInfo, belowInfo);
    return finish();
}
/**
 * Returns the range of the selection to use in the user context when running /fix
 * @param range the code context region to process, where to store the selection information
 * @param diagnosticsRange the range spanning the diagnostics
 * @diagnosticsRangeOfInterest range around this spanning range which is permitted for editing
 * @returns a boolean indicating whether to continue code execution
 */
function processFixSelection(range, diagnosticsRange, diagnosticsRangeOfInterest) {
    const diagnosticsRangeMidLine = Math.floor((diagnosticsRange.start.line + diagnosticsRange.end.line) / 2);
    const maximumRadius = Math.max(diagnosticsRangeMidLine - diagnosticsRangeOfInterest.start.line, diagnosticsRangeOfInterest.end.line - diagnosticsRangeMidLine);
    range.appendLine(diagnosticsRangeMidLine);
    for (let radius = 1; radius <= maximumRadius; radius++) {
        const beforeMidLine = diagnosticsRangeMidLine - radius;
        const afterMidLine = diagnosticsRangeMidLine + radius;
        if (beforeMidLine >= diagnosticsRangeOfInterest.start.line) {
            if (!range.prependLine(beforeMidLine)) {
                return false;
            }
        }
        if (afterMidLine <= diagnosticsRangeOfInterest.end.line) {
            if (!range.appendLine(afterMidLine)) {
                return false;
            }
        }
    }
    return true;
}
/**
 * This function finds the diagnostics at the given selection and filtered by the actual prompt
 */
function findDiagnosticForSelectionAndPrompt(diagnosticService, resource, selection, prompt) {
    const diagnostics = diagnosticService.getDiagnostics(resource).filter(d => !!d.range.intersection(selection));
    if (prompt) {
        const diagnosticsForPrompt = diagnostics.filter(d => prompt.includes(d.message));
        if (diagnosticsForPrompt.length > 0) {
            return diagnosticsForPrompt;
        }
    }
    return diagnostics;
}
/**
 * This function finds the range of interest for the input range for the /fix command
 * @param maximumNumberOfLines the maximum number of lines in the range of interest
 */
async function findFixRangeOfInterest(treeSitterAST, range, maximumNumberOfLines) {
    const treeSitterRange = (0, parserService_1.vscodeToTreeSitterRange)(range);
    const maxNumberOfAdditionalLinesInRangeOfInterest = Math.max(maximumNumberOfLines, range.end.line - range.start.line + maximumNumberOfLines);
    const treeSitterRangeOfInterest = await treeSitterAST.getFixSelectionOfInterest(treeSitterRange, maxNumberOfAdditionalLinesInRangeOfInterest);
    return (0, parserService_1.treeSitterToVSCodeRange)(treeSitterRangeOfInterest);
}
//# sourceMappingURL=fixSelection.js.map