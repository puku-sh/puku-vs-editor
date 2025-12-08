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
exports.CascadingPromptFactory = void 0;
const ignoreService_1 = require("../../../../../../../platform/ignore/common/ignoreService");
const uri_1 = require("../../../../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const completionsTelemetryServiceBridge_1 = require("../../../../bridge/src/completionsTelemetryServiceBridge");
const languageMarker_1 = require("../../../../prompt/src/languageMarker");
const tokenization_1 = require("../../../../prompt/src/tokenization");
const featuresService_1 = require("../../experiments/featuresService");
const logger_1 = require("../../logger");
const telemetry_1 = require("../../telemetry");
const contextProviderBridge_1 = require("../components/contextProviderBridge");
const virtualComponent_1 = require("../components/virtualComponent");
const contextProviderRegistry_1 = require("../contextProviderRegistry");
const codeSnippets_1 = require("../contextProviders/codeSnippets");
const traits_1 = require("../contextProviders/traits");
const contextProviderStatistics_1 = require("../contextProviderStatistics");
const prompt_1 = require("../prompt");
// If the space allocated to the suffix is at least this fraction of the estimated suffix cost,
// we will render the suffix before the prefix and use any surplus suffix budget to fill the prefix.
// Otherwise, we render the prefix first and use any surplus prefix budget to fill the suffix.
const SMALL_SUFFIX_THRESHOLD = 0.8;
let CascadingPromptFactory = class CascadingPromptFactory {
    constructor(components, ignoreService, instantiationService, featuresService, completionsTelemetryService, contextProviderBridge, logTargetService, contextProviderStatistics) {
        this.components = components;
        this.ignoreService = ignoreService;
        this.instantiationService = instantiationService;
        this.featuresService = featuresService;
        this.completionsTelemetryService = completionsTelemetryService;
        this.contextProviderBridge = contextProviderBridge;
        this.logTargetService = logTargetService;
        this.contextProviderStatistics = contextProviderStatistics;
        this.renderId = 0;
    }
    async prompt(opts, cancellationToken) {
        try {
            return await this.createPromptUnsafe(opts, cancellationToken);
        }
        catch (e) {
            return this.errorPrompt(e);
        }
    }
    getComponentAllocation(telemetryData) {
        const suffixPercent = this.featuresService.suffixPercent(telemetryData);
        const stableContextPercent = this.featuresService.stableContextPercent(telemetryData);
        const volatileContextPercent = this.featuresService.volatileContextPercent(telemetryData);
        if (suffixPercent < 0 || suffixPercent > 100) {
            throw new Error(`suffixPercent must be between 0 and 100, but was ${suffixPercent}`);
        }
        if (stableContextPercent < 0 || stableContextPercent > 100) {
            throw new Error(`stableContextPercent must be between 0 and 100, but was ${stableContextPercent}`);
        }
        if (volatileContextPercent < 0 || volatileContextPercent > 100) {
            throw new Error(`volatileContextPercent must be between 0 and 100, but was ${volatileContextPercent}`);
        }
        const prefixPercent = 100 - suffixPercent - stableContextPercent - volatileContextPercent;
        if (prefixPercent <= 1 || prefixPercent > 100) {
            throw new Error(`prefixPercent must be between 1 and 100, but was ${prefixPercent}`);
        }
        return {
            prefix: prefixPercent / 100,
            suffix: suffixPercent / 100,
            stableContext: stableContextPercent / 100,
            volatileContext: volatileContextPercent / 100,
        };
    }
    async createPromptUnsafe(opts, cancellationToken) {
        this.renderId++;
        const { completionId, completionState, telemetryData, promptOpts } = opts;
        const failFastPrompt = await this.failFastPrompt(completionState.textDocument, cancellationToken);
        if (failFastPrompt) {
            return failFastPrompt;
        }
        const languageId = completionState.textDocument.detectedLanguageId;
        const start = performance.now();
        let contextItems;
        if (this.instantiationService.invokeFunction(contextProviderRegistry_1.useContextProviderAPI, languageId, telemetryData)) {
            contextItems = await this.resolveContext(completionId, completionState, telemetryData, cancellationToken);
        }
        const updateDataTimeMs = performance.now() - start;
        const renderedComponents = {};
        const aggregatedMetadata = {
            renderId: this.renderId,
            rendererName: 'w',
            tokenizer: promptOpts?.tokenizer ?? tokenization_1.TokenizerName.o200k,
            elisionTimeMs: 0,
            renderTimeMs: 0,
            updateDataTimeMs: updateDataTimeMs,
            componentStatistics: [],
        };
        const { maxPromptLength } = this.instantiationService.invokeFunction(prompt_1.getPromptOptions, telemetryData, languageId);
        const allocation = this.getComponentAllocation(telemetryData);
        const suffixAllocation = allocation.suffix * maxPromptLength;
        const estimatedMaxSuffixCost = this.components.suffix.estimatedCost?.(opts, contextItems);
        let cascadeOrder = ['stableContext', 'volatileContext', 'prefix', 'suffix'];
        if (suffixAllocation > SMALL_SUFFIX_THRESHOLD * (estimatedMaxSuffixCost ?? 0)) {
            cascadeOrder = ['stableContext', 'volatileContext', 'suffix', 'prefix'];
        }
        let surplusBudget = 0;
        // Allocate excess budget in cascade order
        for (const id of cascadeOrder) {
            const componentBudget = surplusBudget + maxPromptLength * allocation[id];
            const rendered = (0, virtualComponent_1.renderWithMetadata)(this.components[id], componentBudget, opts, contextItems);
            surplusBudget = componentBudget - rendered.cost;
            renderedComponents[id] = rendered;
            aggregateMetadata(aggregatedMetadata, rendered.metadata);
        }
        const [prefix, trailingWs] = (0, prompt_1.trimLastLine)(renderedComponents.prefix.text);
        const end = performance.now();
        const contextProvidersTelemetry = this.instantiationService.invokeFunction(contextProviderRegistry_1.useContextProviderAPI, languageId, telemetryData)
            ? this.telemetrizeContext(completionId, aggregatedMetadata.componentStatistics, contextItems?.resolvedContextItems ?? [])
            : [];
        const context = [
            renderedComponents.stableContext.text.trim(),
            renderedComponents.volatileContext.text.trim(),
        ];
        const prefixWithContext = promptOpts?.separateContext
            ? prefix
            : // This should not happen, since we always separate context. If it does happen,
                // the token counts for the prefix will be wrong, since the workspace context
                // will have comment markers.
                (0, languageMarker_1.commentBlockAsSingles)(context.join('\n'), languageId) + '\n\n' + prefix;
        return {
            type: 'prompt',
            prompt: {
                prefix: prefixWithContext,
                prefixTokens: renderedComponents.prefix.cost +
                    renderedComponents.stableContext.cost +
                    renderedComponents.volatileContext.cost,
                suffix: renderedComponents.suffix.text,
                suffixTokens: renderedComponents.suffix.cost,
                context: promptOpts?.separateContext ? context : undefined,
                isFimEnabled: renderedComponents.suffix.text.length > 0,
            },
            computeTimeMs: end - start,
            trailingWs,
            neighborSource: new Map(),
            metadata: aggregatedMetadata,
            contextProvidersTelemetry,
        };
    }
    async resolveContext(completionId, completionState, telemetryData, cancellationToken) {
        const resolvedContextItems = await this.contextProviderBridge.resolution(completionId);
        const { textDocument } = completionState;
        const matchedContextItems = resolvedContextItems.filter(contextProviderRegistry_1.matchContextItems);
        const traits = this.instantiationService.invokeFunction(traits_1.getTraitsFromContextItems, completionId, matchedContextItems);
        void this.instantiationService.invokeFunction(traits_1.ReportTraitsTelemetry, `contextProvider.traits`, traits, textDocument.detectedLanguageId, textDocument.detectedLanguageId, // TextDocumentContext does not have clientLanguageId
        telemetryData);
        const codeSnippets = await this.instantiationService.invokeFunction(codeSnippets_1.getCodeSnippetsFromContextItems, completionId, matchedContextItems, textDocument.detectedLanguageId);
        return { traits, codeSnippets, resolvedContextItems };
    }
    telemetrizeContext(completionId, componentStatistics, resolvedContextItems) {
        const promptMatcher = (0, contextProviderStatistics_1.componentStatisticsToPromptMatcher)(componentStatistics);
        this.contextProviderStatistics.getStatisticsForCompletion(completionId).computeMatch(promptMatcher);
        const contextProvidersTelemetry = (0, contextProviderRegistry_1.telemetrizeContextItems)(this.contextProviderStatistics, completionId, resolvedContextItems);
        // To support generating context provider metrics of completion in COffE.
        logger_1.logger.debug(this.logTargetService, `Context providers telemetry: '${JSON.stringify(contextProvidersTelemetry)}'`);
        return contextProvidersTelemetry;
    }
    async failFastPrompt(textDocument, cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return prompt_1._promptCancelled;
        }
        if (await this.ignoreService.isCopilotIgnored(uri_1.URI.parse(textDocument.uri))) {
            return prompt_1._copilotContentExclusion;
        }
        if (textDocument.getText().length < prompt_1.MIN_PROMPT_CHARS) {
            // Too short context
            return prompt_1._contextTooShort;
        }
    }
    errorPrompt(error) {
        (0, telemetry_1.telemetryException)(this.completionsTelemetryService, error, 'WorkspaceContextPromptFactory');
        return prompt_1._promptError;
    }
};
exports.CascadingPromptFactory = CascadingPromptFactory;
exports.CascadingPromptFactory = CascadingPromptFactory = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, featuresService_1.ICompletionsFeaturesService),
    __param(4, completionsTelemetryServiceBridge_1.ICompletionsTelemetryService),
    __param(5, contextProviderBridge_1.ICompletionsContextProviderBridgeService),
    __param(6, logger_1.ICompletionsLogTargetService),
    __param(7, contextProviderStatistics_1.ICompletionsContextProviderService)
], CascadingPromptFactory);
function aggregateMetadata(aggregated, metadata) {
    aggregated.elisionTimeMs += metadata.elisionTimeMs;
    aggregated.renderTimeMs += metadata.renderTimeMs;
    aggregated.updateDataTimeMs += metadata.updateDataTimeMs;
    aggregated.componentStatistics.push(...metadata.componentStatistics);
}
//# sourceMappingURL=cascadingPromptFactory.js.map