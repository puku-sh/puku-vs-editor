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
exports.Delayer = exports.DelaySession = void 0;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
class DelaySession {
    constructor(baseDebounceTime, expectedTotalTime, providerInvocationTime = Date.now()) {
        this.baseDebounceTime = baseDebounceTime;
        this.expectedTotalTime = expectedTotalTime;
        this.providerInvocationTime = providerInvocationTime;
        this.extraDebounce = 0;
    }
    setExtraDebounce(extraDebounce) {
        this.extraDebounce = extraDebounce;
    }
    getDebounceTime() {
        const expectedDebounceTime = this.expectedTotalTime === undefined
            ? this.baseDebounceTime
            : Math.min(this.baseDebounceTime, this.expectedTotalTime);
        const expectedDebounceTimeWithExtras = expectedDebounceTime + this.extraDebounce;
        const timeAlreadySpent = Date.now() - this.providerInvocationTime;
        const actualDebounceTime = Math.max(0, expectedDebounceTimeWithExtras - timeAlreadySpent);
        return actualDebounceTime;
    }
    getArtificialDelay() {
        if (this.expectedTotalTime === undefined) {
            return 0;
        }
        const timeAlreadySpent = Date.now() - this.providerInvocationTime;
        const delay = Math.max(0, this.expectedTotalTime - timeAlreadySpent);
        return delay;
    }
}
exports.DelaySession = DelaySession;
let Delayer = class Delayer {
    constructor(_configurationService, _experimentationService) {
        this._configurationService = _configurationService;
        this._experimentationService = _experimentationService;
        this._recentUserActions = [];
    }
    createDelaySession(requestTime) {
        const baseDebounceTime = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsDebounce, this._experimentationService);
        const backoffDebounceEnabled = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsBackoffDebounceEnabled, this._experimentationService);
        const expectedTotalTime = backoffDebounceEnabled ? this._getExpectedTotalTime(baseDebounceTime) : undefined;
        return new DelaySession(baseDebounceTime, expectedTotalTime, requestTime);
    }
    handleAcceptance() {
        this._recordUserAction('accepted');
    }
    handleRejection() {
        this._recordUserAction('rejected');
    }
    _recordUserAction(kind) {
        this._recentUserActions.push({ time: Date.now(), kind });
        // keep at most 10 user actions
        this._recentUserActions = this._recentUserActions.slice(-10);
    }
    _getExpectedTotalTime(baseDebounceTime) {
        const DEBOUNCE_DECAY_TIME_MS = 10 * 60 * 1000; // 10 minutes
        const MAX_DEBOUNCE_TIME = 3000; // 3 seconds
        const MIN_DEBOUNCE_TIME = 50; // 50 ms
        const REJECTION_WEIGHT = 1.5;
        const ACCEPTANCE_WEIGHT = 0.8;
        const now = Date.now();
        let multiplier = 1;
        // Calculate impact of each action with time decay
        for (const action of this._recentUserActions) {
            const timeSinceAction = now - action.time;
            if (timeSinceAction > DEBOUNCE_DECAY_TIME_MS) {
                continue;
            }
            // Exponential decay: impact decreases as time passes
            const decayFactor = Math.exp(-timeSinceAction / DEBOUNCE_DECAY_TIME_MS);
            const actionWeight = action.kind === 'rejected' ? REJECTION_WEIGHT : ACCEPTANCE_WEIGHT;
            multiplier *= 1 + ((actionWeight - 1) * decayFactor);
        }
        let debounceTime = baseDebounceTime * multiplier;
        // Clamp the debounce time to reasonable bounds
        debounceTime = Math.min(MAX_DEBOUNCE_TIME, Math.max(MIN_DEBOUNCE_TIME, debounceTime));
        return debounceTime;
    }
};
exports.Delayer = Delayer;
exports.Delayer = Delayer = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService)
], Delayer);
//# sourceMappingURL=delayer.js.map