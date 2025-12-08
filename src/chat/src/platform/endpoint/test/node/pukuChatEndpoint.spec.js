"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../configuration/common/configurationService");
const pukuChatEndpoint_1 = require("../../node/pukuChatEndpoint");
// Mock implementations
const createMockServices = () => ({
    fetcherService: {},
    domainService: {},
    capiClientService: {},
    envService: {},
    telemetryService: {},
    authService: {},
    chatMLFetcher: {},
    tokenizerProvider: {},
    instantiationService: {},
    configurationService: {
        getExperimentBasedConfig: () => false,
        getConfig: (key) => {
            if (key === configurationService_1.ConfigKey.PukuAIEndpoint) {
                return 'http://puku.ai/v1';
            }
            return undefined;
        }
    },
    expService: {},
    logService: {}
});
(0, vitest_1.describe)('PukuChatEndpoint', () => {
    let mockServices;
    (0, vitest_1.beforeEach)(() => {
        mockServices = createMockServices();
    });
    (0, vitest_1.it)('should use configured endpoint URL', () => {
        const endpoint = new pukuChatEndpoint_1.PukuChatEndpoint(mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
        (0, vitest_1.expect)(endpoint.urlOrRequestMetadata).toBe('http://puku.ai/v1/chat/completions');
    });
});
//# sourceMappingURL=pukuChatEndpoint.spec.js.map