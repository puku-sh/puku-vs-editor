"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pukuRequestTypes_1 = require("../../../api/common/pukuRequestTypes");
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const capiClient_1 = require("../../../endpoint/common/capiClient");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const fetcher_1 = require("../../../test/node/fetcher");
const services_1 = require("../../../test/node/services");
const fetcherService_1 = require("../../common/fetcherService");
const networking_1 = require("../../common/networking");
(0, vitest_1.suite)('Networking test Suite', function () {
    let headerBuffer;
    class StaticFetcherService {
        getUserAgentLibrary() {
            return 'test';
        }
        fetch(url, options) {
            headerBuffer = options.headers;
            return Promise.resolve((0, fetcher_1.createFakeResponse)(200));
        }
        disconnectAll() {
            throw new Error('Method not implemented.');
        }
        makeAbortController() {
            throw new Error('Method not implemented.');
        }
        isAbortError(e) {
            throw new Error('Method not implemented.');
        }
        isInternetDisconnectedError(e) {
            throw new Error('Method not implemented.');
        }
        isFetcherError(e) {
            throw new Error('Method not implemented.');
        }
        getUserMessageForFetcherError(err) {
            throw new Error('Method not implemented.');
        }
    }
    (0, vitest_1.test)('each request contains editor info headers', async function () {
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        testingServiceCollection.define(fetcherService_1.IFetcherService, new StaticFetcherService());
        const accessor = testingServiceCollection.createTestingAccessor();
        await (0, networking_1.postRequest)(accessor.get(fetcherService_1.IFetcherService), accessor.get(telemetry_1.ITelemetryService), accessor.get(capiClient_1.ICAPIClientService), { type: pukuRequestTypes_1.RequestType.Models }, '', '', 'test', 'id');
        assert_1.default.strictEqual(headerBuffer['VScode-SessionId'], 'test-session');
        assert_1.default.strictEqual(headerBuffer['VScode-MachineId'], 'test-machine');
        assert_1.default.strictEqual(headerBuffer['Editor-Version'], `vscode/test-version`);
    });
});
//# sourceMappingURL=networking.spec.js.map