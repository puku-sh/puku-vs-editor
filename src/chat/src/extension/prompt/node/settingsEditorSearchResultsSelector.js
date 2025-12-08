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
var SettingsEditorSearchResultsSelector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsEditorSearchResultsSelector = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const async_1 = require("../../../util/vs/base/common/async");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const settingsEditorSuggestQueryPrompt_1 = require("../../prompts/node/settingsEditor/settingsEditorSuggestQueryPrompt");
let SettingsEditorSearchResultsSelector = class SettingsEditorSearchResultsSelector {
    static { SettingsEditorSearchResultsSelector_1 = this; }
    static { this.DEFAULT_TIMEOUT = 10000; } // 10 seconds
    constructor(instantiationService, interactionService) {
        this.instantiationService = instantiationService;
        this.interactionService = interactionService;
    }
    async selectTopSearchResults(endpoint, query, settings, token) {
        if (token.isCancellationRequested) {
            return [];
        }
        const promptRenderer = promptRenderer_1.PromptRenderer
            .create(this.instantiationService, endpoint, settingsEditorSuggestQueryPrompt_1.SettingsEditorSuggestQueryPrompt, {
            query,
            settings
        });
        const prompt = await promptRenderer.render(undefined, token);
        this.interactionService.startInteraction();
        const fetchResult = await (0, async_1.raceTimeout)(endpoint
            .makeChatRequest('settingsEditorSearchSuggestions', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other, undefined, {
            temperature: 0.1
        }), SettingsEditorSearchResultsSelector_1.DEFAULT_TIMEOUT);
        if (token.isCancellationRequested || fetchResult === undefined || fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return [];
        }
        const rawSuggestions = fetchResult.value;
        return rawSuggestions.split('\n').map(setting => setting.trim());
    }
};
exports.SettingsEditorSearchResultsSelector = SettingsEditorSearchResultsSelector;
exports.SettingsEditorSearchResultsSelector = SettingsEditorSearchResultsSelector = SettingsEditorSearchResultsSelector_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, interactionService_1.IInteractionService)
], SettingsEditorSearchResultsSelector);
//# sourceMappingURL=settingsEditorSearchResultsSelector.js.map