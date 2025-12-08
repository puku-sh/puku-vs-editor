"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolutionManager = exports.solutionCountTarget = void 0;
exports.panelPositionForDocument = panelPositionForDocument;
exports.trimChoices = trimChoices;
exports.reportSolutions = reportSolutions;
exports.generateSolutionsStream = generateSolutionsStream;
exports.normalizeCompletionText = normalizeCompletionText;
exports.setupPromptAndTelemetry = setupPromptAndTelemetry;
exports.setupCompletionParams = setupCompletionParams;
const uuid_1 = require("../../../../../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const completionState_1 = require("../../../../lib/src/completionState");
const config_1 = require("../../../../lib/src/config");
const featuresService_1 = require("../../../../lib/src/experiments/featuresService");
const configBlockMode_1 = require("../../../../lib/src/ghostText/configBlockMode");
const logger_1 = require("../../../../lib/src/logger");
const config_2 = require("../../../../lib/src/openai/config");
const parseBlock_1 = require("../../../../lib/src/prompt/parseBlock");
const prompt_1 = require("../../../../lib/src/prompt/prompt");
const repository_1 = require("../../../../lib/src/prompt/repository");
const telemetry_1 = require("../../../../lib/src/telemetry");
const textDocument_1 = require("../../../../lib/src/textDocument");
const parse_1 = require("../../../../prompt/src/parse");
exports.solutionCountTarget = 10;
function panelPositionForDocument(document, position) {
    let returnPosition = position;
    const line = document.lineAt(position.line);
    if (!line.isEmptyOrWhitespace) {
        returnPosition = line.range.end;
    }
    return returnPosition;
}
/**
 * Trim trailing whitespace.
 */
async function* trimChoices(choices) {
    for await (const choice of choices) {
        const choiceCopy = { ...choice };
        choiceCopy.completionText = choiceCopy.completionText.trimEnd();
        yield choiceCopy;
    }
}
class SolutionManager {
    constructor(textDocument, startPosition, cancellationToken, solutionCountTarget) {
        this.textDocument = textDocument;
        this.startPosition = startPosition;
        this.cancellationToken = cancellationToken;
        this.solutionCountTarget = solutionCountTarget;
        this.targetPosition = panelPositionForDocument(this.textDocument, this.startPosition);
    }
    get savedTelemetryData() {
        return this._savedTelemetryData;
    }
    set savedTelemetryData(data) {
        this._savedTelemetryData = data;
    }
}
exports.SolutionManager = SolutionManager;
async function reportSolutions(nextSolutionPromise, solutionHandler) {
    const nextSolution = await nextSolutionPromise;
    switch (nextSolution.status) {
        case 'Solution':
            await solutionHandler.onSolution(nextSolution.solution);
            await reportSolutions(nextSolution.next, solutionHandler);
            break;
        case 'FinishedNormally':
            await solutionHandler.onFinishedNormally();
            break;
        case 'FinishedWithError':
            await solutionHandler.onFinishedWithError(nextSolution.error);
            break;
    }
}
async function generateSolutionsStream(cancellationToken, solutions) {
    if (cancellationToken.isCancellationRequested) {
        return { status: 'FinishedWithError', error: 'Cancelled' };
    }
    const nextResult = await solutions.next();
    if (nextResult.done === true) {
        return { status: 'FinishedNormally' };
    }
    return {
        status: 'Solution',
        solution: nextResult.value,
        next: generateSolutionsStream(cancellationToken, solutions),
    };
}
function normalizeCompletionText(text) {
    return text.replace(/\s+/g, '');
}
/**
 * Sets up prompt extraction, telemetry, and handles common error cases.
 * Returns null if an error occurred that should terminate processing.
 */
async function setupPromptAndTelemetry(accessor, solutionManager, source, solutionsLogger, engineName, comparisonRequestId) {
    const position = solutionManager.targetPosition;
    const document = solutionManager.textDocument;
    const repoInfo = (0, repository_1.extractRepoInfoInBackground)(accessor, document.uri);
    // Telemetry setup
    const ourRequestId = (0, uuid_1.generateUuid)();
    const tempTelemetry = telemetry_1.TelemetryData.createAndMarkAsIssued({
        headerRequestId: ourRequestId,
        languageId: document.detectedLanguageId,
        source,
    }, {});
    const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const logTarget = accessor.get(logger_1.ICompletionsLogTargetService);
    // Update telemetry with experiment values
    solutionManager.savedTelemetryData = await featuresService
        .fetchTokenAndUpdateExPValuesAndAssignments({ uri: document.uri, languageId: document.detectedLanguageId }, tempTelemetry);
    // Add in comparison panel specific info
    if (engineName) {
        solutionManager.savedTelemetryData = solutionManager.savedTelemetryData.extendedBy({
            engineName,
        });
    }
    if (comparisonRequestId) {
        solutionManager.savedTelemetryData = solutionManager.savedTelemetryData.extendedBy({
            comparisonRequestId,
        });
    }
    // Extract prompt
    const promptResponse = await instantiationService.invokeFunction(prompt_1.extractPrompt, ourRequestId, (0, completionState_1.createCompletionState)(document, position), solutionManager.savedTelemetryData);
    // Handle prompt extraction errors
    if (promptResponse.type === 'copilotContentExclusion') {
        return { status: 'FinishedNormally' };
    }
    if (promptResponse.type === 'contextTooShort') {
        return { status: 'FinishedWithError', error: 'Context too short' };
    }
    if (promptResponse.type === 'promptCancelled') {
        return { status: 'FinishedWithError', error: 'Prompt cancelled' };
    }
    if (promptResponse.type === 'promptTimeout') {
        return { status: 'FinishedWithError', error: 'Prompt timeout' };
    }
    if (promptResponse.type === 'promptError') {
        return { status: 'FinishedWithError', error: 'Prompt error' };
    }
    const prompt = promptResponse.prompt;
    const trailingWs = promptResponse.trailingWs;
    // Handle trailing whitespace adjustment
    if (trailingWs.length > 0) {
        solutionManager.startPosition = textDocument_1.LocationFactory.position(solutionManager.startPosition.line, solutionManager.startPosition.character - trailingWs.length);
    }
    // Update telemetry with prompt information
    solutionManager.savedTelemetryData = solutionManager.savedTelemetryData.extendedBy({}, {
        ...(0, telemetry_1.telemetrizePromptLength)(prompt),
        solutionCount: solutionManager.solutionCountTarget,
        promptEndPos: document.offsetAt(position),
    });
    solutionsLogger.debug(logTarget, 'prompt:', prompt);
    instantiationService.invokeFunction(telemetry_1.telemetry, 'solution.requested', solutionManager.savedTelemetryData);
    return {
        prompt,
        trailingWs,
        telemetryData: solutionManager.savedTelemetryData,
        repoInfo,
        ourRequestId,
    };
}
/**
 * Sets up block mode, completion parameters, and finished callback.
 */
function setupCompletionParams(accessor, document, position, prompt, solutionManager, telemetryData) {
    // Compute block mode
    const blockMode = accessor.get(configBlockMode_1.ICompletionsBlockModeConfig).forLanguage(document.detectedLanguageId, telemetryData);
    const isSupportedLanguage = (0, parse_1.isSupportedLanguageId)(document.detectedLanguageId);
    const contextIndent = (0, parseBlock_1.contextIndentation)(document, position);
    const extra = {
        language: document.detectedLanguageId,
        next_indent: contextIndent.next ?? 0,
        prompt_tokens: prompt.prefixTokens ?? 0,
        suffix_tokens: prompt.suffixTokens ?? 0,
    };
    const postOptions = {};
    if (blockMode === config_1.BlockMode.Parsing && !isSupportedLanguage) {
        postOptions['stop'] = ['\n\n', '\r\n\r\n'];
    }
    const engineInfo = (0, config_2.getEngineRequestInfo)(accessor, telemetryData);
    let finishedCb;
    switch (blockMode) {
        case config_1.BlockMode.Server:
            // Client knows the block is done when the completion is.
            finishedCb = () => undefined;
            // If requested at the top-level, don't trim at all.
            extra.force_indent = contextIndent.prev ?? -1;
            extra.trim_by_indentation = true;
            break;
        case config_1.BlockMode.ParsingAndServer:
            finishedCb = isSupportedLanguage
                ? (0, parseBlock_1.parsingBlockFinished)(document, solutionManager.startPosition)
                : () => undefined;
            // If requested at the top-level, don't trim at all.
            extra.force_indent = contextIndent.prev ?? -1;
            extra.trim_by_indentation = true;
            break;
        case config_1.BlockMode.Parsing:
        default:
            finishedCb = isSupportedLanguage
                ? (0, parseBlock_1.parsingBlockFinished)(document, solutionManager.startPosition)
                : () => undefined;
            break;
    }
    return {
        extra,
        postOptions,
        finishedCb,
        engineInfo,
    };
}
//# sourceMappingURL=common.js.map