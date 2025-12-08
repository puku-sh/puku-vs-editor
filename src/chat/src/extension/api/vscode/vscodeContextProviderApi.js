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
exports.VSCodeContextProviderApiV1 = void 0;
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
let VSCodeContextProviderApiV1 = class VSCodeContextProviderApiV1 {
    constructor(contextProviderService) {
        this.contextProviderService = contextProviderService;
    }
    registerContextProvider(provider) {
        return this.contextProviderService.registerContextProvider(provider);
    }
};
exports.VSCodeContextProviderApiV1 = VSCodeContextProviderApiV1;
exports.VSCodeContextProviderApiV1 = VSCodeContextProviderApiV1 = __decorate([
    __param(0, languageContextProviderService_1.ILanguageContextProviderService)
], VSCodeContextProviderApiV1);
//# sourceMappingURL=vscodeContextProviderApi.js.map