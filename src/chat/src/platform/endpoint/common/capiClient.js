"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICAPIClientService = exports.BaseCAPIClientService = void 0;
const pukuApiClient_1 = require("../../api/common/pukuApiClient");
const services_1 = require("../../../util/common/services");
const licenseAgreement_1 = require("./licenseAgreement");
class BaseCAPIClientService extends pukuApiClient_1.CAPIClient {
    constructor(hmac, forceDevMode, fetcherService, envService) {
        super({
            machineId: envService.machineId,
            sessionId: envService.sessionId,
            vscodeVersion: envService.vscodeVersion,
            buildType: envService.getBuildType(),
            name: envService.getName(),
            version: envService.getVersion(),
        }, licenseAgreement_1.LICENSE_AGREEMENT, fetcherService, hmac, forceDevMode);
    }
}
exports.BaseCAPIClientService = BaseCAPIClientService;
exports.ICAPIClientService = (0, services_1.createServiceIdentifier)('ICAPIClientService');
//# sourceMappingURL=capiClient.js.map