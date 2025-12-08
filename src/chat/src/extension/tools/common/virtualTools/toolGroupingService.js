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
exports.ToolGroupingService = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const map_1 = require("../../../../util/vs/base/common/map");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const toolGrouping_1 = require("./toolGrouping");
let ToolGroupingService = class ToolGroupingService {
    constructor(_instantiationService, configurationService, experimentationService) {
        this._instantiationService = _instantiationService;
        this._groups = new map_1.LRUCache(3);
        this.threshold = (0, toolGrouping_1.computeToolGroupingMinThreshold)(experimentationService, configurationService);
    }
    create(sessionId, tools) {
        const existing = this._groups.get(sessionId);
        if (existing) {
            existing.tools = tools;
            return existing;
        }
        const grouping = this._instantiationService.createInstance(toolGrouping_1.ToolGrouping, tools);
        this._groups.set(sessionId, grouping);
        return grouping;
    }
};
exports.ToolGroupingService = ToolGroupingService;
exports.ToolGroupingService = ToolGroupingService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, nullExperimentationService_1.IExperimentationService)
], ToolGroupingService);
//# sourceMappingURL=toolGroupingService.js.map