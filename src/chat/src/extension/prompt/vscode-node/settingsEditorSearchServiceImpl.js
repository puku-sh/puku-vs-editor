"use strict";
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
exports.SettingsEditorSearchServiceImpl = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const embeddingsComputer_1 = require("../../../platform/embeddings/common/embeddingsComputer");
const vscodeIndex_1 = require("../../../platform/embeddings/common/vscodeIndex");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const settingsEditorSearchResultsSelector_1 = require("../node/settingsEditorSearchResultsSelector");
let SettingsEditorSearchServiceImpl = class SettingsEditorSearchServiceImpl {
    constructor(authenticationService, endpointProvider, embeddingIndex, embeddingsComputer, instantiationService) {
        this.authenticationService = authenticationService;
        this.endpointProvider = endpointProvider;
        this.embeddingIndex = embeddingIndex;
        this.embeddingsComputer = embeddingsComputer;
        this.instantiationService = instantiationService;
    }
    async provideSettingsSearchResults(query, options, progress, token) {
        if (!query || options.limit <= 0) {
            return;
        }
        const canceledBundle = {
            query,
            kind: vscode_1.SettingsSearchResultKind.CANCELED,
            settings: []
        };
        let embeddingResult;
        try {
            embeddingResult = await this.embeddingsComputer.computeEmbeddings(embeddingsComputer_1.EmbeddingType.text3small_512, [query], {}, new telemetryCorrelationId_1.TelemetryCorrelationId('SettingsEditorSearchServiceImpl::provideSettingsSearchResults'), token);
        }
        catch {
            if (token.isCancellationRequested) {
                progress.report(canceledBundle);
                return;
            }
            progress.report({
                query,
                kind: vscode_1.SettingsSearchResultKind.EMBEDDED,
                settings: []
            });
            if (!options.embeddingsOnly) {
                progress.report({
                    query,
                    kind: vscode_1.SettingsSearchResultKind.LLM_RANKED,
                    settings: []
                });
            }
            return;
        }
        if (token.isCancellationRequested) {
            progress.report(canceledBundle);
            return;
        }
        await this.embeddingIndex.loadIndexes();
        const embeddingSettings = this.embeddingIndex.settingsIndex.nClosestValues(embeddingResult.values[0], 25);
        if (token.isCancellationRequested) {
            progress.report(canceledBundle);
            return;
        }
        progress.report({
            query,
            kind: vscode_1.SettingsSearchResultKind.EMBEDDED,
            settings: embeddingSettings.map(setting => setting.key)
        });
        if (options.embeddingsOnly) {
            return;
        }
        const copilotToken = await this.authenticationService.getCopilotToken();
        if (embeddingSettings.length === 0 || copilotToken.isFreeUser || copilotToken.isNoAuthUser) {
            progress.report({
                query,
                kind: vscode_1.SettingsSearchResultKind.LLM_RANKED,
                settings: []
            });
            return;
        }
        const endpointName = 'copilot-base';
        const endpoint = await this.endpointProvider.getChatEndpoint(endpointName);
        const generator = this.instantiationService.createInstance(settingsEditorSearchResultsSelector_1.SettingsEditorSearchResultsSelector);
        const llmSearchSuggestions = await generator.selectTopSearchResults(endpoint, query, embeddingSettings, token);
        if (token.isCancellationRequested) {
            progress.report(canceledBundle);
            return;
        }
        progress.report({
            query,
            kind: vscode_1.SettingsSearchResultKind.LLM_RANKED,
            settings: llmSearchSuggestions
        });
    }
};
exports.SettingsEditorSearchServiceImpl = SettingsEditorSearchServiceImpl;
exports.SettingsEditorSearchServiceImpl = SettingsEditorSearchServiceImpl = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, vscodeIndex_1.ICombinedEmbeddingIndex),
    __param(3, embeddingsComputer_1.IEmbeddingsComputer),
    __param(4, instantiation_1.IInstantiationService)
], SettingsEditorSearchServiceImpl);
//# sourceMappingURL=settingsEditorSearchServiceImpl.js.map