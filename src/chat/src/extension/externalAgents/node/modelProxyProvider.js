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
exports.LanguageModelProxyProvider = void 0;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const oaiLanguageModelServer_1 = require("./oaiLanguageModelServer");
let LanguageModelProxyProvider = class LanguageModelProxyProvider {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    async provideModelProxy(forExtensionId, token) {
        const server = this.instantiationService.createInstance(oaiLanguageModelServer_1.OpenAILanguageModelServer);
        await server.start();
        return new OpenAILanguageModelProxy(server);
    }
};
exports.LanguageModelProxyProvider = LanguageModelProxyProvider;
exports.LanguageModelProxyProvider = LanguageModelProxyProvider = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], LanguageModelProxyProvider);
class OpenAILanguageModelProxy extends lifecycle_1.Disposable {
    constructor(runningServer) {
        super();
        this._register(runningServer);
        const config = runningServer.getConfig();
        this.uri = uri_1.URI.parse(`http://localhost:${config.port}`);
        this.key = config.nonce;
    }
}
//# sourceMappingURL=modelProxyProvider.js.map