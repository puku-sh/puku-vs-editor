"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchSolutions = launchSolutions;
exports.runSolutions = runSolutions;
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const iterableHelpers_1 = require("../../../../lib/src/helpers/iterableHelpers");
const logger_1 = require("../../../../lib/src/logger");
const fetch_1 = require("../../../../lib/src/openai/fetch");
const progress_1 = require("../../../../lib/src/progress");
const parseBlock_1 = require("../../../../lib/src/prompt/parseBlock");
const prompt_1 = require("../../../../lib/src/prompt/prompt");
const suggestions_1 = require("../../../../lib/src/suggestions/suggestions");
const textDocument_1 = require("../../../../lib/src/textDocument");
const common_1 = require("../panelShared/common");
const solutionsLogger = new logger_1.Logger('solutions');
/**
 * Given an `ISolutionManager` with the context of a specific "Open Copilot" request,
 * initiate the generation of a stream of solutions for that request.
 */
async function launchSolutions(accessor, solutionManager) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const fetcherService = accessor.get(fetch_1.ICompletionsOpenAIFetcherService);
    const logTarget = accessor.get(logger_1.ICompletionsLogTargetService);
    const position = solutionManager.targetPosition;
    const document = solutionManager.textDocument;
    // Setup prompt and telemetry using shared function
    const promptSetup = await (0, common_1.setupPromptAndTelemetry)(accessor, solutionManager, 'open copilot', solutionsLogger);
    if ('status' in promptSetup) {
        // This is a SolutionsStream indicating an error occurred
        return promptSetup;
    }
    const { prompt, trailingWs, telemetryData, repoInfo, ourRequestId } = promptSetup;
    // Setup completion parameters using shared function
    const { extra, postOptions, finishedCb, engineInfo } = instantiationService.invokeFunction(common_1.setupCompletionParams, document, position, prompt, solutionManager, telemetryData);
    const cancellationToken = solutionManager.cancellationToken;
    const completionParams = {
        prompt,
        languageId: document.detectedLanguageId,
        repoInfo,
        ourRequestId,
        engineModelId: engineInfo.modelId,
        count: solutionManager.solutionCountTarget,
        uiKind: fetch_1.CopilotUiKind.Panel,
        postOptions,
        headers: engineInfo.headers,
        extra,
    };
    const res = await fetcherService.fetchAndStreamCompletions(completionParams, telemetryData.extendedBy(), finishedCb, cancellationToken);
    if (res.type === 'failed' || res.type === 'canceled') {
        return { status: 'FinishedWithError', error: `${res.type}: ${res.reason}` };
    }
    let choices = res.choices;
    choices = (0, common_1.trimChoices)(choices);
    choices = (0, iterableHelpers_1.asyncIterableMapFilter)(choices, choice => instantiationService.invokeFunction(suggestions_1.postProcessChoiceInContext, document, position, choice, false, solutionsLogger));
    const solutions = (0, iterableHelpers_1.asyncIterableMapFilter)(choices, async (apiChoice) => {
        let display = apiChoice.completionText;
        solutionsLogger.info(logTarget, `Open Copilot completion: [${apiChoice.completionText}]`);
        // For completions that can happen in any location in the middle of the code we try to find the existing code
        // that should be displayed in the OpenCopilot panel so the code is nicely formatted/highlighted.
        // This is not needed for implement unknown function quick fix, as it will be
        // always "complete" standalone function in the location suggested by TS' extension.
        const displayStartPos = (await (0, parseBlock_1.getNodeStartUtil)(document, position, apiChoice.completionText)) ??
            textDocument_1.LocationFactory.position(position.line, 0);
        const [displayBefore] = (0, prompt_1.trimLastLine)(document.getText(textDocument_1.LocationFactory.range(displayStartPos, position)));
        display = displayBefore + display;
        let completionText = apiChoice.completionText;
        if (trailingWs.length > 0 && completionText.startsWith(trailingWs)) {
            completionText = completionText.substring(trailingWs.length);
        }
        const meanLogProb = apiChoice.meanLogProb;
        const meanProb = meanLogProb !== undefined ? Math.exp(meanLogProb) : 0;
        const solutionTelemetryData = telemetryData.extendedBy({
            choiceIndex: apiChoice.choiceIndex.toString(),
        });
        const solution = {
            completionText,
            insertText: display,
            range: textDocument_1.LocationFactory.range(displayStartPos, position),
            meanProb: meanProb,
            meanLogProb: meanLogProb || 0,
            requestId: apiChoice.requestId,
            choiceIndex: apiChoice.choiceIndex,
            telemetryData: solutionTelemetryData,
            copilotAnnotations: apiChoice.copilotAnnotations,
        };
        return solution;
    });
    // deliberately not awaiting so that we can return quickly
    const solutionsStream = (0, common_1.generateSolutionsStream)(cancellationToken, solutions[Symbol.asyncIterator]());
    return solutionsStream;
}
async function runSolutions(accessor, solutionManager, solutionHandler) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const statusReporter = accessor.get(progress_1.ICompletionsStatusReporter);
    return statusReporter.withProgress(async () => {
        const nextSolution = instantiationService.invokeFunction(launchSolutions, solutionManager);
        return await (0, common_1.reportSolutions)(nextSolution, solutionHandler);
    });
}
//# sourceMappingURL=panel.js.map