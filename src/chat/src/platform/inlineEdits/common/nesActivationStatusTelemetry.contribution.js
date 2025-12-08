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
exports.NesActivationTelemetryContribution = void 0;
const configurationService_1 = require("../../configuration/common/configurationService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
let NesActivationTelemetryContribution = class NesActivationTelemetryContribution {
    constructor(_telemetryService, _configurationService, _expService) {
        const completionsConfigValue = _configurationService.getConfig(configurationService_1.ConfigKey.Enable);
        const isCompletionsEnabled = '*' in completionsConfigValue ? completionsConfigValue['*'] : true /* matches ghost-text Copilot extensions behavior */;
        const isCompletionsUserConfigured = _configurationService.isConfigured(configurationService_1.ConfigKey.Enable);
        const isNesEnabled = _configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.InlineEditsEnabled, _expService);
        const isNesUserConfigured = _configurationService.isConfigured(configurationService_1.ConfigKey.InlineEditsEnabled);
        /* __GDPR__
            "nesStatusOnActivation" : {
                "owner": "ulugbekna",
                "comment": "To identify if NES was enabled by the user when extension is activated",
                "isCompletionsEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether ghost-text completions was effectively enabled", "isMeasurement": true },
                "isCompletionsUserConfigured": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether ghost-text completions was configured by the user", "isMeasurement": true },
                "isNesEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether NES was effectively enabled (e.g., by nes-by-default exp)", "isMeasurement": true },
                "isNesUserConfigured": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the Inline Edits feature is configured by the user", "isMeasurement": true }
            }
        */
        _telemetryService.sendMSFTTelemetryEvent('nesStatusOnActivation', {}, {
            isCompletionsEnabled: toNumber(isCompletionsEnabled),
            isCompletionsUserConfigured: toNumber(isCompletionsUserConfigured),
            isNesEnabled: toNumber(isNesEnabled),
            isNesUserConfigured: toNumber(isNesUserConfigured),
        });
    }
};
exports.NesActivationTelemetryContribution = NesActivationTelemetryContribution;
exports.NesActivationTelemetryContribution = NesActivationTelemetryContribution = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, nullExperimentationService_1.IExperimentationService)
], NesActivationTelemetryContribution);
function toNumber(v) {
    return v ? 1 : 0;
}
//# sourceMappingURL=nesActivationStatusTelemetry.contribution.js.map