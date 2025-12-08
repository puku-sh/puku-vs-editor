"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const Sinon = __importStar(require("sinon"));
const copilotTokenManager_1 = require("../../auth/copilotTokenManager");
const config_1 = require("../../config");
const networking_1 = require("../../networking");
const connectionState_1 = require("../../snippy/connectionState");
const errorCreator_1 = require("../../snippy/errorCreator");
const Network = __importStar(require("../../snippy/network"));
const context_1 = require("../../test/context");
const fetcher_1 = require("../../test/fetcher");
const testEndpoints = {
    '400': {
        status: 400,
        response: { code: 'invalid_argument', msg: 'source too short' },
        expected: {
            reason: errorCreator_1.ErrorReasons.BadArguments,
            msg: 'source too short',
        },
    },
    '401': {
        status: 401,
        response: { error: 'unauthorized' },
        expected: {
            reason: errorCreator_1.ErrorReasons.Unauthorized,
            msg: errorCreator_1.ErrorMessages[errorCreator_1.ErrorReasons.Unauthorized],
        },
    },
    '402': {
        status: 402,
        response: { code: 'payment required', msg: '' },
        expected: {
            reason: errorCreator_1.ErrorReasons.Unknown,
            msg: 'unknown error',
        },
    },
    '404': {
        status: 404,
        response: { code: 'bad_route', msg: 'no handler for path' },
        expected: {
            reason: errorCreator_1.ErrorReasons.NotFound,
            msg: 'no handler for path',
        },
    },
    '429': {
        status: 429,
        response: { code: 'rate_limited', msg: 'rate limit' },
        expected: {
            reason: errorCreator_1.ErrorReasons.RateLimit,
            msg: errorCreator_1.ErrorMessages[errorCreator_1.ErrorReasons.RateLimit],
        },
    },
    '500': {
        status: 500,
        response: { error: 'Internal error' },
        expected: {
            reason: errorCreator_1.ErrorReasons.InternalError,
            msg: errorCreator_1.ErrorMessages[errorCreator_1.ErrorReasons.InternalError],
        },
    },
    '503': {
        status: 503,
        response: { error: 'Network error' },
        expected: {
            reason: errorCreator_1.ErrorReasons.InternalError,
            msg: errorCreator_1.ErrorMessages[errorCreator_1.ErrorReasons.InternalError],
        },
    },
};
class SnippyFetcher extends fetcher_1.FakeFetcher {
    constructor() {
        super();
    }
    fetch(url) {
        const endpoint = url.split('/').pop();
        const testCase = testEndpoints[endpoint] || testEndpoints['404'];
        return Promise.resolve((0, fetcher_1.createFakeJsonResponse)(testCase.status, testCase.response));
    }
}
suite('snippy network primitive', function () {
    let accessor;
    let originalConfigProvider;
    setup(function () {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(networking_1.ICompletionsFetcherService, new SnippyFetcher());
        accessor = serviceCollection.createTestingAccessor();
        originalConfigProvider = accessor.get(config_1.ICompletionsConfigProvider);
    });
    teardown(function () {
        connectionState_1.ConnectionState.setConnected();
        originalConfigProvider.clearOverrides();
    });
    suite('error handling', function () {
        test.skip('should return a 401 error object when token is invalid', async function () {
            //setStaticSessionTokenManager(ctx, undefined);
            const tokenManager = accessor.get(copilotTokenManager_1.ICompletionsCopilotTokenManager);
            tokenManager.resetToken();
            const response = await Network.call(accessor, '', { method: 'GET' });
            assert.strictEqual(response.kind, 'failure');
            assert.strictEqual(response.code, 401);
            assert.strictEqual(response.reason, errorCreator_1.ErrorReasons.Unauthorized);
            assert.strictEqual(response.msg, errorCreator_1.ErrorMessages[errorCreator_1.ErrorReasons.Unauthorized]);
        });
        test('should return a 600 error object when connection is retrying', async function () {
            connectionState_1.ConnectionState.setRetrying();
            const response = await Network.call(accessor, '', { method: 'GET' });
            assert.strictEqual(response.kind, 'failure');
            assert.strictEqual(response.code, 600);
            assert.strictEqual(response.reason, errorCreator_1.ErrorReasons.ConnectionError);
            assert.strictEqual(response.msg, 'Attempting to reconnect to the public code matching service.');
        });
        test('should return a 601 error object when connection is offline', async function () {
            connectionState_1.ConnectionState.setDisconnected();
            const response = await Network.call(accessor, '', { method: 'GET' });
            assert.strictEqual(response.kind, 'failure');
            assert.strictEqual(response.code, 601);
            assert.strictEqual(response.reason, errorCreator_1.ErrorReasons.ConnectionError);
            assert.strictEqual(response.msg, 'The public code matching service is offline.');
        });
        test('should return the expect payload for various error codes', async function () {
            const testCases = Object.entries(testEndpoints);
            // Internal errors put CodeQuote into retry mode, so we need to stub that behavior out.
            const stub = Sinon.stub(connectionState_1.ConnectionState, 'enableRetry').callsFake(() => { });
            for (const [endpoint, data] of testCases) {
                const response = await Network.call(accessor, endpoint, { method: 'GET' });
                assert.strictEqual(response.kind, 'failure');
                assert.strictEqual(response.code, data.status);
                assert.strictEqual(response.reason, data.expected.reason);
                assert.strictEqual(response.msg, data.expected.msg);
            }
            stub.restore();
        });
    });
    suite('`call` behavior', function () {
        const sandbox = Sinon.createSandbox();
        let networkStub;
        setup(function () {
            networkStub = Sinon.stub(accessor.get(networking_1.ICompletionsFetcherService), 'fetch');
            networkStub.returns(Promise.resolve((0, fetcher_1.createFakeJsonResponse)(200, '{}')));
        });
        teardown(function () {
            sandbox.restore();
        });
        test('uses alternative endpoint when specified', async function () {
            const overrides = new Map();
            const domainOverride = 'https://fake.net.biz/';
            overrides.set(config_1.ConfigKey.DebugSnippyOverrideUrl, domainOverride);
            originalConfigProvider.setOverrides(overrides);
            await Network.call(accessor, '', { method: 'GET' });
            assert.ok(networkStub.getCall(0).args[0].startsWith(domainOverride));
        });
        test('uses the correct snippy twirp endpoint', async function () {
            await Network.call(accessor, 'endpoint/snippy', { method: 'GET' });
            const url = networkStub.getCall(0).args[0];
            assert.ok(url.includes('endpoint/snippy'));
        });
        test('supplies editor information to snippy', async function () {
            await Network.call(accessor, '', { method: 'GET' });
            const headers = networkStub.getCall(0).args[1].headers ?? {};
            const headerKeys = Object.keys(headers);
            assert.ok(headerKeys.includes('Editor-Version'));
            assert.ok(headerKeys.includes('Editor-Plugin-Version'));
        });
    });
});
//# sourceMappingURL=network.test.js.map