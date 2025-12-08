"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GenerateCodeIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateCodeIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const genericInlineIntentInvocation_1 = require("../../context/node/resolvers/genericInlineIntentInvocation");
let GenerateCodeIntent = class GenerateCodeIntent {
    static { GenerateCodeIntent_1 = this; }
    static { this.ID = "generate" /* Intent.Generate */; }
    constructor(instantiationService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.id = GenerateCodeIntent_1.ID;
        this.description = l10n.t('Generate new code');
        this.locations = [commonTypes_1.ChatLocation.Editor];
        this.commandInfo = { hiddenFromUser: true };
    }
    async invoke(invocationContext) {
        const { location, documentContext, request } = invocationContext;
        if (!documentContext) {
            throw new Error('Open a file to add code.');
        }
        const endpoint = await this.endpointProvider.getChatEndpoint(request);
        return this.instantiationService.createInstance(genericInlineIntentInvocation_1.GenericInlineIntentInvocation, this, location, endpoint, documentContext, 4 /* EditStrategy.ForceInsertion */);
    }
};
exports.GenerateCodeIntent = GenerateCodeIntent;
exports.GenerateCodeIntent = GenerateCodeIntent = GenerateCodeIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider)
], GenerateCodeIntent);
//# sourceMappingURL=generateCodeIntent.js.map