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
exports.BaseSuggestionsPanelManager = void 0;
const vscode_1 = require("vscode");
const extensionContext_1 = require("../../../../../../platform/extContext/common/extensionContext");
const lifecycle_1 = require("../../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const uri_1 = require("../../../lib/src/util/uri");
const telemetry_1 = require("../telemetry");
let BaseSuggestionsPanelManager = class BaseSuggestionsPanelManager {
    constructor(config, _instantiationService, _extensionContext) {
        this.config = config;
        this._instantiationService = _instantiationService;
        this._extensionContext = _extensionContext;
        this._panelCount = 0;
    }
    renderPanel(document, position, wrapped) {
        const title = `${this.config.panelTitle} for ${(0, uri_1.basename)(document.uri.toString()) || document.uri.toString()}`;
        const panel = vscode_1.window.createWebviewPanel(this.config.webviewId, title, vscode_1.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [vscode_1.Uri.joinPath(this._extensionContext.extensionUri, 'dist')],
            retainContextWhenHidden: true,
        });
        const suggestionPanel = this.createSuggestionsPanel(panel, document, this);
        // Listen for the panel disposal event to clear our reference
        suggestionPanel.onDidDispose(() => {
            if (this.activeWebviewPanel === suggestionPanel) {
                this.activeWebviewPanel = undefined;
            }
        });
        void this.createListDocument(wrapped, position, suggestionPanel).runQuery();
        this.activeWebviewPanel = suggestionPanel;
        this._panelCount = this._panelCount + 1;
        return suggestionPanel;
    }
    registerCommands() {
        const disposableStore = new lifecycle_1.DisposableStore();
        disposableStore.add(this._instantiationService.invokeFunction(telemetry_1.registerCommandWrapper, this.config.commands.accept, () => {
            return this.activeWebviewPanel?.acceptFocusedSolution();
        }));
        disposableStore.add(this._instantiationService.invokeFunction(telemetry_1.registerCommandWrapper, this.config.commands.navigatePrevious, () => {
            return this.activeWebviewPanel?.postMessage({
                command: 'navigatePreviousSolution',
            });
        }));
        disposableStore.add(this._instantiationService.invokeFunction(telemetry_1.registerCommandWrapper, this.config.commands.navigateNext, () => {
            return this.activeWebviewPanel?.postMessage({
                command: 'navigateNextSolution',
            });
        }));
        return disposableStore;
    }
    decrementPanelCount() {
        this._panelCount = this._panelCount - 1;
        if (this._panelCount === 0) {
            void vscode_1.commands.executeCommand('setContext', this.config.contextVariable, false);
        }
    }
};
exports.BaseSuggestionsPanelManager = BaseSuggestionsPanelManager;
exports.BaseSuggestionsPanelManager = BaseSuggestionsPanelManager = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, extensionContext_1.IVSCodeExtensionContext)
], BaseSuggestionsPanelManager);
//# sourceMappingURL=baseSuggestionsPanelManager.js.map