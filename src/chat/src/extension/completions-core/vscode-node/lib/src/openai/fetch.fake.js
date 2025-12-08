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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorReturningFetcher = exports.SyntheticCompletions = void 0;
exports.fakeAPIChoice = fakeAPIChoice;
exports.fakeAPIChoiceFromCompletion = fakeAPIChoiceFromCompletion;
exports.fakeAPIChoices = fakeAPIChoices;
const authentication_1 = require("../../../../../../platform/authentication/common/authentication");
const uuid_1 = require("../../../../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const tokenization_1 = require("../../../prompt/src/tokenization");
const copilotTokenManager_1 = require("../auth/copilotTokenManager");
const logger_1 = require("../logger");
const progress_1 = require("../progress");
const telemetry_1 = require("../telemetry");
const runtimeMode_1 = require("../util/runtimeMode");
const fetch_1 = require("./fetch");
/**
 * This module supports fake implementations of the completions returned by OpenAI, as well
 * as injecting synthetic completions that would be hard to trigger directly but are useful
 * for thoroughly testing the code that post-processes completions.
 *
 */
function fakeAPIChoice(headerRequestId, choiceIndex, completionText, telemetryData = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting()) {
    const tokenizer = (0, tokenization_1.getTokenizer)();
    return {
        completionText: completionText,
        meanLogProb: 0.5,
        meanAlternativeLogProb: 0.5,
        numTokens: -1,
        choiceIndex,
        requestId: {
            headerRequestId,
            serverExperiments: 'dummy',
            deploymentId: 'dummy',
        },
        telemetryData,
        // This slightly convoluted way of getting the tokens as a string array is an
        // alternative to exporting a way to do it directly from the tokenizer module.
        tokens: tokenizer
            .tokenize(completionText)
            .map(token => tokenizer.detokenize([token]))
            .concat(),
        blockFinished: false,
        clientCompletionId: (0, uuid_1.generateUuid)(),
        finishReason: 'stop',
    };
}
function fakeAPIChoiceFromCompletion(completion) {
    return fakeAPIChoice((0, uuid_1.generateUuid)(), 0, completion);
}
async function* fakeAPIChoices(postOptions, finishedCb, completions, telemetryData) {
    const fakeHeaderRequestId = (0, uuid_1.generateUuid)();
    let choiceIndex = 0;
    for (let completion of completions) {
        let stopOffset = -1;
        if (postOptions?.stop !== undefined) {
            for (const stopToken of postOptions.stop) {
                const thisStopOffset = completion.indexOf(stopToken);
                if (thisStopOffset !== -1 && (stopOffset === -1 || thisStopOffset < stopOffset)) {
                    stopOffset = thisStopOffset;
                }
            }
        }
        if (stopOffset !== -1) {
            completion = completion.substring(0, stopOffset);
        }
        // This logic for using the finishedCb mirrors what happens in the live streamChoices function,
        // but it doesn't try to stop reading the completion early as there's no point.
        const finishOffset = asNumericOffset(await finishedCb(completion, { text: completion }));
        if (finishOffset !== undefined) {
            completion = completion.substring(0, finishOffset);
        }
        const choice = fakeAPIChoice(fakeHeaderRequestId, choiceIndex++, completion, telemetryData);
        choice.blockFinished = finishOffset === undefined ? false : true;
        yield choice;
    }
}
function asNumericOffset(result) {
    if (typeof result === 'number' || result === undefined) {
        return result;
    }
    return result.finishOffset;
}
function fakeResponse(completions, finishedCb, postOptions, telemetryData) {
    const choices = (0, fetch_1.postProcessChoices)(fakeAPIChoices(postOptions, finishedCb, completions, telemetryData));
    return Promise.resolve({ type: 'success', choices, getProcessingTime: () => 0 });
}
let SyntheticCompletions = class SyntheticCompletions extends fetch_1.OpenAIFetcher {
    constructor(_completions, copilotTokenManager) {
        super();
        this._completions = _completions;
        this.copilotTokenManager = copilotTokenManager;
        this._wasCalled = false;
    }
    async fetchAndStreamCompletions(params, baseTelemetryData, finishedCb, cancel, teletryProperties) {
        // check we have a valid token - ignore the result
        void this.copilotTokenManager.getToken();
        if (cancel?.isCancellationRequested) {
            return { type: 'canceled', reason: 'canceled during test' };
        }
        if (!this._wasCalled) {
            this._wasCalled = true;
            return fakeResponse(this._completions, finishedCb, params.postOptions, baseTelemetryData);
        }
        else {
            // In indentation mode, if the preview completion isn't enough to finish the completion,
            // a second call will be made with the first prompt+preview completion as the prompt.
            // As we've already returned everything we have, the second completion should be empty.
            const emptyCompletions = this._completions.map(completion => '');
            return fakeResponse(emptyCompletions, finishedCb, params.postOptions, baseTelemetryData);
        }
    }
};
exports.SyntheticCompletions = SyntheticCompletions;
exports.SyntheticCompletions = SyntheticCompletions = __decorate([
    __param(1, copilotTokenManager_1.ICompletionsCopilotTokenManager)
], SyntheticCompletions);
let ErrorReturningFetcher = class ErrorReturningFetcher extends fetch_1.LiveOpenAIFetcher {
    constructor(instantiationService, runtimeModeService, logTargetService, copilotTokenManager, statusReporter, authenticationService) {
        super(instantiationService, runtimeModeService, logTargetService, copilotTokenManager, statusReporter, authenticationService);
        this.response = 'not-sent';
    }
    setResponse(response) {
        this.response = response;
    }
    fetchWithParameters(endpoint, params, _copilotToken, telemetryData, cancel) {
        const response = this.response;
        this.response = 'not-sent';
        return Promise.resolve(response);
    }
};
exports.ErrorReturningFetcher = ErrorReturningFetcher;
exports.ErrorReturningFetcher = ErrorReturningFetcher = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, runtimeMode_1.ICompletionsRuntimeModeService),
    __param(2, logger_1.ICompletionsLogTargetService),
    __param(3, copilotTokenManager_1.ICompletionsCopilotTokenManager),
    __param(4, progress_1.ICompletionsStatusReporter),
    __param(5, authentication_1.IAuthenticationService)
], ErrorReturningFetcher);
//# sourceMappingURL=fetch.fake.js.map