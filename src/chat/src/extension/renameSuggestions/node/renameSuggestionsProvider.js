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
var RenameSuggestionsProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameSuggestionsProvider = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const simulationTestContext_1 = require("../../../platform/simulationTestContext/common/simulationTestContext");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const namingConvention_1 = require("../common/namingConvention");
const renameSuggestionsPrompt_1 = require("./renameSuggestionsPrompt");
var ProvideCallCancellationReason;
(function (ProvideCallCancellationReason) {
    ProvideCallCancellationReason["None"] = "";
    ProvideCallCancellationReason["AfterEnablementCheck"] = "afterEnablementCheck";
    ProvideCallCancellationReason["AfterRunParametersFetch"] = "afterRunParametersFetch";
    ProvideCallCancellationReason["AfterPromptCompute"] = "afterPromptCompute";
    ProvideCallCancellationReason["AfterDelay"] = "afterDelay";
    ProvideCallCancellationReason["AfterFetchStarted"] = "afterFetchStarted";
})(ProvideCallCancellationReason || (ProvideCallCancellationReason = {}));
let RenameSuggestionsProvider = RenameSuggestionsProvider_1 = class RenameSuggestionsProvider {
    constructor(_instaService, _ignoreService, _telemetryService, _configurationService, _endpointProvider, _simulationTestContext, _authService, _notificationService, _interactionService) {
        this._instaService = _instaService;
        this._ignoreService = _ignoreService;
        this._telemetryService = _telemetryService;
        this._configurationService = _configurationService;
        this._endpointProvider = _endpointProvider;
        this._simulationTestContext = _simulationTestContext;
        this._authService = _authService;
        this._notificationService = _notificationService;
        this._interactionService = _interactionService;
        this.supportsAutomaticTriggerKind = Promise.resolve(this.isEnabled(vscodeTypes_1.NewSymbolNameTriggerKind.Automatic));
    }
    isEnabled(triggerKind) {
        if (triggerKind === vscodeTypes_1.NewSymbolNameTriggerKind.Invoke) {
            return true;
        }
        else if (this._authService.copilotToken?.isFreeUser || this._authService.copilotToken?.isNoAuthUser) {
            return false;
        }
        else {
            return this._configurationService.getConfig(configurationService_1.ConfigKey.AutomaticRenameSuggestions);
        }
    }
    /**
     * @throws {Error} with `message = 'CopilotFeatureUnavailableOrDisabled' if the feature is not available
     * @throws {Error} with `message = 'CopilotIgnoredDocument' if the document is Copilot-ignored
     */
    async provideNewSymbolNames(_document, range, triggerKind, token) {
        const document = textDocumentSnapshot_1.TextDocumentSnapshot.create(_document);
        let cancellationReason = ProvideCallCancellationReason.None;
        const beforeDelaySW = new stopwatch_1.StopWatch();
        // @ulugbekna: capture the symbol name that is being renamed before an await to avoid document being changed under us
        const currentSymbolName = document.getText(range);
        if (!this.isEnabled(triggerKind)) {
            throw new Error('CopilotFeatureUnavailableOrDisabled');
        }
        if (await this._ignoreService.isCopilotIgnored(document.uri)) {
            throw new Error('CopilotIgnoredDocument');
        }
        const languageId = document.languageId;
        let expectedDelayBeforeFetch;
        let timeElapsedBeforeDelay;
        if (token.isCancellationRequested) {
            cancellationReason = ProvideCallCancellationReason.AfterEnablementCheck;
        }
        else {
            const endpoint = await this._endpointProvider.getChatEndpoint('copilot-fast');
            expectedDelayBeforeFetch = this.delayBeforeFetchMs;
            if (token.isCancellationRequested) {
                cancellationReason = ProvideCallCancellationReason.AfterRunParametersFetch;
            }
            else {
                const sw = new stopwatch_1.StopWatch(false);
                sw.reset();
                const promptRenderResult = await this._computePrompt(document, range, endpoint, token);
                const promptConstructionTime = sw.elapsed();
                if (token.isCancellationRequested) {
                    cancellationReason = ProvideCallCancellationReason.AfterPromptCompute;
                }
                else {
                    timeElapsedBeforeDelay = beforeDelaySW.elapsed();
                    let actualDelayBeforeFetch;
                    if (triggerKind === vscodeTypes_1.NewSymbolNameTriggerKind.Automatic) {
                        actualDelayBeforeFetch = expectedDelayBeforeFetch ? Math.max(0, expectedDelayBeforeFetch - timeElapsedBeforeDelay) : undefined;
                        if (actualDelayBeforeFetch !== undefined && actualDelayBeforeFetch > 0) {
                            await new Promise(resolve => setTimeout(resolve, actualDelayBeforeFetch));
                        }
                    }
                    if (token.isCancellationRequested) {
                        cancellationReason = ProvideCallCancellationReason.AfterDelay;
                    }
                    else {
                        sw.reset();
                        this._interactionService.startInteraction();
                        const fetchResult = await endpoint.makeChatRequest('renameSuggestionsProvider', promptRenderResult.messages, undefined, // TODO@ulugbekna: should we terminate on `]` (closing for JSON array that we expect to receive from the model)
                        token, commonTypes_1.ChatLocation.Other, undefined, {
                            top_p: undefined,
                            temperature: undefined
                        }, true);
                        const fetchTime = sw.elapsed();
                        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.QuotaExceeded || (fetchResult.type === commonTypes_1.ChatFetchResponseType.RateLimited && this._authService.copilotToken?.isNoAuthUser)) {
                            await this._notificationService.showQuotaExceededDialog({ isNoAuthUser: this._authService.copilotToken?.isNoAuthUser ?? false });
                        }
                        if (token.isCancellationRequested) {
                            cancellationReason = ProvideCallCancellationReason.AfterFetchStarted;
                        }
                        switch (fetchResult.type) {
                            case commonTypes_1.ChatFetchResponseType.Success: {
                                const reply = fetchResult.value;
                                const { replyFormat, symbolNames, redundantCharCount: responseUnusedCharCount } = RenameSuggestionsProvider_1.parseResponse(reply);
                                if (replyFormat === 'unknown') {
                                    this._sendInternalTelemetry({ languageId, reply });
                                }
                                this._sendPublicTelemetry({
                                    triggerKind,
                                    languageId,
                                    cancellationReason,
                                    fetchResultType: fetchResult.type,
                                    promptConstructionTime,
                                    promptTokenCount: promptRenderResult.tokenCount,
                                    expectedDelayBeforeFetch,
                                    actualDelayBeforeFetch,
                                    timeElapsedBeforeDelay,
                                    successResponseCharCount: reply.length,
                                    responseUnusedCharCount,
                                    fetchTime,
                                    replyFormat,
                                    symbolNamesCount: symbolNames.length,
                                });
                                const processedSymbolNames = RenameSuggestionsProvider_1.preprocessSymbolNames({ currentSymbolName, newSymbolNames: symbolNames, languageId });
                                return processedSymbolNames.map(symbolName => new vscodeTypes_1.NewSymbolName(symbolName, [vscodeTypes_1.NewSymbolNameTag.AIGenerated]));
                            }
                            default: {
                                this._sendPublicTelemetry({
                                    triggerKind,
                                    languageId,
                                    cancellationReason,
                                    fetchResultType: fetchResult.type,
                                    promptConstructionTime,
                                    promptTokenCount: promptRenderResult.tokenCount,
                                    expectedDelayBeforeFetch,
                                    actualDelayBeforeFetch,
                                    timeElapsedBeforeDelay,
                                    fetchTime,
                                });
                                return null;
                            }
                        }
                    }
                }
            }
        }
        this._sendPublicTelemetry({
            triggerKind,
            languageId,
            cancellationReason,
            expectedDelayBeforeFetch,
            timeElapsedBeforeDelay,
        });
        return null;
    }
    /**
     * The delay before fetching from the model.
     */
    get delayBeforeFetchMs() {
        if (this._simulationTestContext.isInSimulationTests) {
            return 0;
        }
        else {
            const DELAY_BEFORE_FETCH = 250 /* milliseconds */;
            return DELAY_BEFORE_FETCH;
        }
    }
    // @ulugbekna: notes:
    // - FIXME: currently, we fail with very large definitions such as big classes or functions -- we need summarization by category, e.g., remove method implementations if we're renaming a class
    // - idea: include hover info (i.e., usually type info & corresponding document) of the symbol being renamed in the prompt
    // - idea: include usages of the symbol being renamed in the prompt
    // - idea: include peer symbols (e.g., other methods in the same class) in the prompt for copilot to see conventions in the code
    _computePrompt(document, range, chatEndpoint, token) {
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this._instaService, chatEndpoint, renameSuggestionsPrompt_1.RenameSuggestionsPrompt, {
            document,
            range
        });
        return promptRenderer.render(undefined, token);
    }
    static preprocessSymbolNames({ currentSymbolName, newSymbolNames, languageId }) {
        const currentNameConvention = (0, namingConvention_1.guessNamingConvention)(currentSymbolName);
        let targetNamingConvention;
        switch (currentNameConvention) {
            case namingConvention_1.NamingConvention.LowerCase:
                if (languageId === 'python') {
                    targetNamingConvention = namingConvention_1.NamingConvention.SnakeCase;
                }
                else {
                    targetNamingConvention = namingConvention_1.NamingConvention.CamelCase;
                }
                break;
            case namingConvention_1.NamingConvention.Uppercase:
            case namingConvention_1.NamingConvention.CamelCase:
            case namingConvention_1.NamingConvention.PascalCase:
            case namingConvention_1.NamingConvention.SnakeCase:
            case namingConvention_1.NamingConvention.ScreamingSnakeCase:
            case namingConvention_1.NamingConvention.CapitalSnakeCase:
            case namingConvention_1.NamingConvention.KebabCase:
            case namingConvention_1.NamingConvention.Capitalized:
            case namingConvention_1.NamingConvention.Unknown:
                targetNamingConvention = currentNameConvention;
                break;
            default: {
                const _exhaustiveCheck = currentNameConvention;
                return _exhaustiveCheck;
            }
        }
        if (targetNamingConvention === namingConvention_1.NamingConvention.Unknown) {
            return newSymbolNames;
        }
        return newSymbolNames.map(newSymbolName => (0, namingConvention_1.enforceNamingConvention)(newSymbolName, targetNamingConvention));
    }
    static parseResponse(reply) {
        const parsedAsJSONStringArray = RenameSuggestionsProvider_1._parseReplyAsJSONStringArray(reply);
        if (parsedAsJSONStringArray !== undefined) {
            return parsedAsJSONStringArray;
        }
        const parsedAsList = RenameSuggestionsProvider_1._parseReplyAsList(reply);
        if (parsedAsList !== undefined) {
            return parsedAsList;
        }
        return { replyFormat: 'unknown', symbolNames: [], redundantCharCount: reply.length };
    }
    /** try extracting from JSON string array */
    static _parseReplyAsJSONStringArray(reply) {
        const jsonArrayRe = /\[.*?\]/gs; // `s` regex flag allows matching newlines using `.`
        const matches = [...reply.matchAll(jsonArrayRe)];
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            try {
                const parsedJSONArray = JSON.parse(match[0]);
                if (Array.isArray(parsedJSONArray)) {
                    const symbolNames = parsedJSONArray.filter(v => typeof v === 'string');
                    if (symbolNames.length > 0) {
                        const replyFormat = i === 0 ? 'jsonStringArray' : 'multiJsonStringArray';
                        const redundantCharCount = reply.length - match[0].length;
                        return { replyFormat, redundantCharCount, symbolNames: symbolNames.map(s => s.trim()) };
                    }
                }
            }
            catch (error) {
            }
        }
    }
    static _parseReplyAsList(reply) {
        // try extracting from an ordered or unordered list
        const listLineRe = /(?:\d+[\.|\)]|[\*\-])\s*(.*)/g;
        const matches = reply.matchAll(listLineRe);
        const symbolNames = [];
        for (const match of matches) {
            let symbolName = match[1].trim();
            const punctuation = ['\'', '"', '`'];
            if (punctuation.includes(symbolName[0])) {
                symbolName = symbolName.slice(1);
            }
            if (punctuation.includes(symbolName[symbolName.length - 1])) {
                symbolName = symbolName.slice(0, -1);
            }
            if (symbolName) {
                symbolNames.push(symbolName);
            }
        }
        if (symbolNames.length === 0) {
            return;
        }
        const redundantCharCount = reply.length - symbolNames.reduce((acc, name) => acc + name.length, 0);
        return { replyFormat: 'list', redundantCharCount, symbolNames };
    }
    _sendPublicTelemetry({ triggerKind, languageId, cancellationReason, fetchResultType, timeElapsedBeforeDelay, promptConstructionTime, promptTokenCount, expectedDelayBeforeFetch, actualDelayBeforeFetch, successResponseCharCount, responseUnusedCharCount, fetchTime, replyFormat, symbolNamesCount }) {
        /* __GDPR__
            "provideRenameSuggestions" : {
                "owner": "ulugbekna",
                "comment": "Telemetry for rename suggestions provided",
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language ID of the document." },
                "cancellationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Specify when exactly during the provider call the cancellation happened. Empty string if the cancellation didn't happen." },
                "fetchResultType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Result of a fetch to endpoint" },
                "replyFormat": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Puku AI reply format: 'jsonStringArray' | 'multiJsonStringArray' | 'list' | 'unknown'" },
                "triggerKind": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Rename suggestion trigger kind - 'automatic' | 'manual'" },
                "promptConstructionTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time it took to construct the prompt", "isMeasurement": true },
                "timeElapsedBeforeDelay": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time elapsed before delay starts", "isMeasurement": true },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Token count of the prompt", "isMeasurement": true },
                "expectedDelayBeforeFetch": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Expected delay before fetch dictated by the experiment 'renameSuggestionsDelayBeforeFetch'", "isMeasurement": true },
                "actualDelayBeforeFetch": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Actual delay before fetch computed as 'expectedDelay - promptComputationTime'", "isMeasurement": true },
                "successResponseCharCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Character count in model response (for response.type == 'success')", "isMeasurement": true },
                "responseUnusedCharCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Character count in model response that was unused, e.g., rename explanations, response format overhead", "isMeasurement": true },
                "fetchTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time it took to fetch from endpoint", "isMeasurement": true },
                "symbolNamesCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of suggested names", "isMeasurement": true }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('provideRenameSuggestions', {
            languageId,
            cancellationReason,
            fetchResultType,
            replyFormat,
            triggerKind: triggerKind === vscodeTypes_1.NewSymbolNameTriggerKind.Automatic ? 'automatic' : 'manual',
        }, {
            promptConstructionTime,
            promptTokenCount,
            expectedDelayBeforeFetch,
            actualDelayBeforeFetch,
            timeElapsedBeforeFetch: timeElapsedBeforeDelay,
            fetchTime,
            successResponseCharCount,
            responseUnusedCharCount,
            symbolNamesCount,
        });
    }
    _sendInternalTelemetry({ languageId, reply }) {
        this._telemetryService.sendMSFTTelemetryEvent('provideRenameSuggestionsIncorrectFormatResponse', {
            languageId,
            reply
        });
    }
    static _determinePrefix(name) {
        const prefix = name.match(/^([\\.\\$\\_]+)/)?.[0];
        return prefix;
    }
};
exports.RenameSuggestionsProvider = RenameSuggestionsProvider;
exports.RenameSuggestionsProvider = RenameSuggestionsProvider = RenameSuggestionsProvider_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, simulationTestContext_1.ISimulationTestContext),
    __param(6, authentication_1.IAuthenticationService),
    __param(7, notificationService_1.INotificationService),
    __param(8, interactionService_1.IInteractionService)
], RenameSuggestionsProvider);
//# sourceMappingURL=renameSuggestionsProvider.js.map