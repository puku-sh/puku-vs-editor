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
exports.ResponseTranslationRules = exports.validLocales = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const envService_1 = require("../../../../platform/env/common/envService");
exports.validLocales = [
    "auto",
    "en",
    "fr",
    "it",
    "de",
    "es",
    "ru",
    "zh-CN",
    "zh-TW",
    "ja",
    "ko",
    "cs",
    "pt-br",
    "tr",
    "pl"
];
let ResponseTranslationRules = class ResponseTranslationRules extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, envService) {
        super(props);
        this.configurationService = configurationService;
        this.envService = envService;
    }
    render() {
        const languageOverride = this.configurationService.getConfig(configurationService_1.ConfigKey.LocaleOverride); // Locale overrides must be for one of our supported languages
        if (!exports.validLocales.find((locale) => languageOverride === locale)) {
            return undefined;
        }
        const languageConfiguration = languageOverride !== 'auto' ? languageOverride : this.envService.language; // No need to further validate VS Code's configured locale
        if (languageConfiguration === 'en') {
            return undefined;
        }
        return (vscpp(vscppf, null,
            "Respond in the following locale: ",
            languageConfiguration));
    }
};
exports.ResponseTranslationRules = ResponseTranslationRules;
exports.ResponseTranslationRules = ResponseTranslationRules = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, envService_1.IEnvService)
], ResponseTranslationRules);
//# sourceMappingURL=responseTranslationRules.js.map