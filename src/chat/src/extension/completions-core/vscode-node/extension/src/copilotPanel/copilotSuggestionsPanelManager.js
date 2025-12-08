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
exports.CopilotSuggestionsPanelManager = void 0;
const extensionContext_1 = require("../../../../../../platform/extContext/common/extensionContext");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const common_1 = require("../lib/copilotPanel/common");
const baseSuggestionsPanelManager_1 = require("../panelShared/baseSuggestionsPanelManager");
const copilotListDocument_1 = require("./copilotListDocument");
const copilotSuggestionsPanel_1 = require("./copilotSuggestionsPanel");
const panelConfig_1 = require("./panelConfig");
let CopilotSuggestionsPanelManager = class CopilotSuggestionsPanelManager extends baseSuggestionsPanelManager_1.BaseSuggestionsPanelManager {
    constructor(instantiationService, extensionContext) {
        super(panelConfig_1.copilotPanelConfig, instantiationService, extensionContext);
    }
    createListDocument(wrapped, position, panel) {
        return this._instantiationService.createInstance(copilotListDocument_1.CopilotListDocument, wrapped, position, panel, common_1.solutionCountTarget);
    }
    createSuggestionsPanel(panel, document, manager) {
        return this._instantiationService.createInstance(copilotSuggestionsPanel_1.CopilotSuggestionsPanel, panel, document, manager);
    }
};
exports.CopilotSuggestionsPanelManager = CopilotSuggestionsPanelManager;
exports.CopilotSuggestionsPanelManager = CopilotSuggestionsPanelManager = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, extensionContext_1.IVSCodeExtensionContext)
], CopilotSuggestionsPanelManager);
//# sourceMappingURL=copilotSuggestionsPanelManager.js.map