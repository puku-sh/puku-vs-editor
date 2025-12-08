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
var GroqBYOKLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqBYOKLMProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
let GroqBYOKLMProvider = class GroqBYOKLMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { GroqBYOKLMProvider_1 = this; }
    static { this.providerName = 'Groq'; }
    constructor(knownModels, byokStorageService, _fetcherService, _logService, _instantiationService) {
        super(0 /* BYOKAuthType.GlobalApiKey */, GroqBYOKLMProvider_1.providerName, 'https://api.groq.com/openai/v1', knownModels, byokStorageService, _fetcherService, _logService, _instantiationService);
    }
};
exports.GroqBYOKLMProvider = GroqBYOKLMProvider;
exports.GroqBYOKLMProvider = GroqBYOKLMProvider = GroqBYOKLMProvider_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService)
], GroqBYOKLMProvider);
//# sourceMappingURL=groqProvider.js.map