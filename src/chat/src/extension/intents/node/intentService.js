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
exports.IntentService = exports.IIntentService = void 0;
const services_1 = require("../../../util/common/services");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const intentRegistry_1 = require("../../prompt/node/intentRegistry");
exports.IIntentService = (0, services_1.createServiceIdentifier)('IIntentService');
let IntentService = class IntentService {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this._intents = null;
    }
    _getOrCreateIntents() {
        if (!this._intents) {
            this._intents = intentRegistry_1.IntentRegistry.getIntents().map(d => this._instantiationService.createInstance(d));
        }
        return this._intents;
    }
    get unknownIntent() {
        const intents = this._getOrCreateIntents();
        const result = intents.find(i => i.id === "unknown" /* Intent.Unknown */);
        if (!result) {
            throw new Error(`Unknown intent not found`);
        }
        return result;
    }
    getIntents(location) {
        const intents = this._getOrCreateIntents();
        return intents.filter(i => i.locations.includes(location));
    }
    getIntent(id, location) {
        return this.getIntents(location).find(i => i.id === id);
    }
};
exports.IntentService = IntentService;
exports.IntentService = IntentService = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], IntentService);
//# sourceMappingURL=intentService.js.map