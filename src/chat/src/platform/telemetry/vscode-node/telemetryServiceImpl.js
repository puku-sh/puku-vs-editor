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
exports.TelemetryService = void 0;
const copilotTokenStore_1 = require("../../authentication/common/copilotTokenStore");
const configurationService_1 = require("../../configuration/common/configurationService");
const capiClient_1 = require("../../endpoint/common/capiClient");
const domainService_1 = require("../../endpoint/common/domainService");
const envService_1 = require("../../env/common/envService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const baseTelemetryService_1 = require("../common/baseTelemetryService");
const telemetry_1 = require("../common/telemetry");
const githubTelemetrySender_1 = require("./githubTelemetrySender");
const microsoftTelemetrySender_1 = require("./microsoftTelemetrySender");
let TelemetryService = class TelemetryService extends baseTelemetryService_1.BaseTelemetryService {
    constructor(extensionName, internalMSFTAIKey, internalLargeEventMSFTAIKey, externalMSFTAIKey, externalGHAIKey, estrictedGHAIKey, configService, tokenStore, capiClientService, envService, telemetryUserConfig, domainService, fetcherService) {
        const customFetcher = async (url, init) => {
            return fetcherService.fetch(url, {
                method: init?.method,
                headers: init?.headers,
                body: init?.body
            });
        };
        const microsoftTelemetrySender = new microsoftTelemetrySender_1.MicrosoftTelemetrySender(internalMSFTAIKey, internalLargeEventMSFTAIKey, externalMSFTAIKey, tokenStore, customFetcher);
        const ghTelemetrySender = new githubTelemetrySender_1.GitHubTelemetrySender(configService, envService, telemetryUserConfig, domainService, capiClientService, extensionName, externalGHAIKey, estrictedGHAIKey, tokenStore);
        super(tokenStore, microsoftTelemetrySender, ghTelemetrySender);
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = __decorate([
    __param(6, configurationService_1.IConfigurationService),
    __param(7, copilotTokenStore_1.ICopilotTokenStore),
    __param(8, capiClient_1.ICAPIClientService),
    __param(9, envService_1.IEnvService),
    __param(10, telemetry_1.ITelemetryUserConfig),
    __param(11, domainService_1.IDomainService),
    __param(12, fetcherService_1.IFetcherService)
], TelemetryService);
//# sourceMappingURL=telemetryServiceImpl.js.map