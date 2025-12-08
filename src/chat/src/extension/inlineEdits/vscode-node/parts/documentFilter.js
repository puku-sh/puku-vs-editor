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
exports.DocumentFilter = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const notebooks_1 = require("../../../../util/common/notebooks");
const observableInternal_1 = require("../../../../util/vs/base/common/observableInternal");
let DocumentFilter = class DocumentFilter {
    constructor(_ignoreService, _configurationService) {
        this._ignoreService = _ignoreService;
        this._configurationService = _configurationService;
        this._enabledLanguages = (0, observableInternal_1.derived)(this, (reader) => {
            const enabledLanguages = this._enabledLanguagesObs.read(reader);
            const enabledLanguagesMap = new Map(Object.entries(enabledLanguages));
            if (!enabledLanguagesMap.has('*')) {
                enabledLanguagesMap.set('*', false);
            }
            return enabledLanguagesMap;
        });
        this._enabledLanguagesObs = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Enable);
        this._ignoreCompletionsDisablement = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsIgnoreCompletionsDisablement);
    }
    async isTrackingEnabled(document) {
        // this should filter out documents coming from output pane, git fs, etc.
        if (!['file', 'untitled'].includes(document.uri.scheme) && !(0, notebooks_1.isNotebookCellOrNotebookChatInput)(document.uri)) {
            return false;
        }
        if (isTextDocument(document) && !this._isGhostTextEnabled(document.languageId)) {
            return false;
        }
        if (await this._ignoreService.isCopilotIgnored(document.uri)) {
            return false;
        }
        return true;
    }
    _isGhostTextEnabled(languageId) {
        const enabledLanguages = this._enabledLanguages.get();
        return enabledLanguages.get(languageId) ?? (enabledLanguages.get('*') ||
            this._ignoreCompletionsDisablement.get() // respect if there's per-language setting but allow overriding global one
        );
    }
};
exports.DocumentFilter = DocumentFilter;
exports.DocumentFilter = DocumentFilter = __decorate([
    __param(0, ignoreService_1.IIgnoreService),
    __param(1, configurationService_1.IConfigurationService)
], DocumentFilter);
function isTextDocument(doc) {
    const notebook = doc;
    return !notebook.notebookType;
}
//# sourceMappingURL=documentFilter.js.map