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
exports.CopilotSuggestionsPanel = void 0;
const extensionContext_1 = require("../../../../../../platform/extContext/common/extensionContext");
const baseSuggestionsPanel_1 = require("../panelShared/baseSuggestionsPanel");
const panelConfig_1 = require("./panelConfig");
let CopilotSuggestionsPanel = class CopilotSuggestionsPanel extends baseSuggestionsPanel_1.BaseSuggestionsPanel {
    constructor(webviewPanel, document, suggestionsPanelManager, contextService) {
        super(webviewPanel, document, suggestionsPanelManager, panelConfig_1.copilotPanelConfig, contextService);
    }
    renderSolutionContent(item, baseContent) {
        // Copilot panel just returns the base content without modifications
        return baseContent;
    }
    createSolutionsMessage(content, percentage) {
        return {
            command: 'solutionsUpdated',
            solutions: content,
            percentage,
        };
    }
    async handleCustomMessage(message) {
        switch (message.command) {
            case 'acceptSolution': {
                const solution = this.items()[message.solutionIndex];
                await this.acceptSolution(solution, true);
                return Promise.resolve(true);
            }
            default:
                return Promise.resolve(false);
        }
    }
};
exports.CopilotSuggestionsPanel = CopilotSuggestionsPanel;
exports.CopilotSuggestionsPanel = CopilotSuggestionsPanel = __decorate([
    __param(3, extensionContext_1.IVSCodeExtensionContext)
], CopilotSuggestionsPanel);
//# sourceMappingURL=copilotSuggestionsPanel.js.map