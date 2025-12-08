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
var SetupTestsIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupTestsIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const packagejson_1 = require("../../../platform/env/common/packagejson");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const setupTestsFrameworkQueryInvocation_1 = require("./testIntent/setupTestsFrameworkQueryInvocation");
const setupTestsInvocation_1 = require("./testIntent/setupTestsInvocation");
let SetupTestsIntent = class SetupTestsIntent {
    static { SetupTestsIntent_1 = this; }
    static { this.ID = "setupTests" /* Intent.SetupTests */; }
    constructor(endpointProvider, instantiationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.id = SetupTestsIntent_1.ID;
        this.locations = [commonTypes_1.ChatLocation.Panel];
        this.description = l10n.t('Set up Tests');
        this.isListedCapability = false;
        this.commandInfo = {
            allowsEmptyArgs: true,
            defaultEnablement: packagejson_1.isPreRelease,
        };
    }
    async invoke(invocationContext) {
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        let prompt = invocationContext.request.prompt;
        if (invocationContext.request.acceptedConfirmationData) {
            // todo@connor4312: VS Code currently creates a prompt like `${choice}: "${Confirmation Message}"`
            // and so we parse the choice back out of three
            // note: intentionally not localized as this is used as a prompt instruction:
            prompt = `set up tests in my workspace using \`${prompt.split(':')[0]}\``;
        }
        if (!prompt) {
            return this.instantiationService.createInstance(setupTestsFrameworkQueryInvocation_1.SetupTestsFrameworkQueryInvocation, this, endpoint, invocationContext.location, invocationContext.documentContext);
        }
        return Promise.resolve(this.instantiationService.createInstance(setupTestsInvocation_1.SetupTestsInvocation, this, endpoint, invocationContext.location, prompt));
    }
};
exports.SetupTestsIntent = SetupTestsIntent;
exports.SetupTestsIntent = SetupTestsIntent = SetupTestsIntent_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], SetupTestsIntent);
//# sourceMappingURL=setupTests.js.map