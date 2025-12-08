"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const copilotToken_1 = require("../../../authentication/common/copilotToken");
const copilotTokenStore_1 = require("../../../authentication/common/copilotTokenStore");
const services_1 = require("../../../test/node/services");
const telemetry_1 = require("../../common/telemetry");
(0, vitest_1.suite)('Telemetry unit tests', function () {
    (0, vitest_1.test)('Can create telemetry user config with values', async function () {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const config = instantiationService.createInstance(telemetry_1.TelemetryUserConfigImpl, 'trackingId', true);
        assert_1.default.strictEqual(config.trackingId, 'trackingId');
        assert_1.default.ok(config.optedIn);
    });
    (0, vitest_1.test)('Telemetry user config has undefined tracking id', async function () {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const config = instantiationService.createInstance(telemetry_1.TelemetryUserConfigImpl, undefined, undefined);
        assert_1.default.strictEqual(config.trackingId, undefined);
    });
    (0, vitest_1.test)('Telemetry user config uses trackingId', async function () {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const config = instantiationService.createInstance(telemetry_1.TelemetryUserConfigImpl, 'trackingId', undefined);
        assert_1.default.strictEqual(config.trackingId, 'trackingId');
    });
    (0, vitest_1.test)('Telemetry user config updates on token change', async function () {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const config = instantiationService.createInstance(telemetry_1.TelemetryUserConfigImpl, undefined, undefined);
        const copilotToken = new copilotToken_1.CopilotToken({
            token: 'tid=0123456789abcdef0123456789abcdef;rt=1;ssc=0;dom=org1.com;ol=org1,org2',
            organization_list: ['org1', 'org2'],
            expires_at: 0,
            refresh_in: 0,
            username: 'fake',
            copilot_plan: 'unknown',
            isVscodeTeamMember: false
        });
        accessor.get(copilotTokenStore_1.ICopilotTokenStore).copilotToken = copilotToken;
        assert_1.default.strictEqual(config.trackingId, '0123456789abcdef0123456789abcdef');
        assert_1.default.strictEqual(config.organizationsList, 'org1,org2');
        assert_1.default.ok(config.optedIn);
    });
    (0, vitest_1.test)('Telemetry user config updates on token change and opts out', async function () {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const config = instantiationService.createInstance(telemetry_1.TelemetryUserConfigImpl, undefined, undefined);
        const copilotToken = new copilotToken_1.CopilotToken({
            token: 'tid=0123456789abcdef0123456789abcdef;rt=0;ssc=0;dom=org1.com;ol=org1,org2',
            expires_at: 0,
            refresh_in: 0,
            username: 'fake',
            isVscodeTeamMember: false,
            copilot_plan: 'unknown'
        });
        accessor.get(copilotTokenStore_1.ICopilotTokenStore).copilotToken = copilotToken;
        assert_1.default.ok(!config.optedIn);
    });
});
//# sourceMappingURL=telemetry2.spec.js.map