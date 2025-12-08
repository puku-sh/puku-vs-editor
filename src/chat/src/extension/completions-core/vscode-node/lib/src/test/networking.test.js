"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
const assert = __importStar(require("assert"));
const networking_1 = require("../networking");
const context_1 = require("./context");
const fetcher_1 = require("./fetcher");
suite('Networking test Suite', function () {
    let accessor;
    let fetcher;
    setup(function () {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        fetcher = new fetcher_1.StaticFetcher();
        serviceCollection.define(networking_1.ICompletionsFetcherService, fetcher);
        accessor = serviceCollection.createTestingAccessor();
    });
    test('each request contains editor info headers', async function () {
        await (0, networking_1.postRequest)(accessor, 'http://localhost:8080/', '', undefined, 'id');
        assert.strictEqual(fetcher.headerBuffer['VScode-SessionId'], 'test-session');
        assert.strictEqual(fetcher.headerBuffer['VScode-MachineId'], 'test-machine');
        assert.strictEqual(fetcher.headerBuffer['Editor-Version'], 'lib-tests-editor/1');
        assert.strictEqual(fetcher.headerBuffer['Editor-Plugin-Version'], 'lib-tests-plugin/2');
        assert.match(fetcher.headerBuffer['Copilot-Language-Server-Version'], /^\d+\.\d+\./);
    });
    test('additional headers can be specified per-request', async function () {
        await (0, networking_1.postRequest)(accessor, 'http://localhost:8080/', '', undefined, 'id', undefined, undefined, {
            'X-Custom-Model': 'disable',
        });
        assert.strictEqual(fetcher.headerBuffer['X-Custom-Model'], 'disable');
    });
    suite('JSON Parsing', function () {
        async function getJsonError(json, headers) {
            try {
                await (0, fetcher_1.createFakeJsonResponse)(200, json, headers).json();
            }
            catch (e) {
                if (e instanceof Error) {
                    return e;
                }
                throw e;
            }
        }
        test('parses valid JSON', async function () {
            assert.deepStrictEqual(await (0, fetcher_1.createFakeJsonResponse)(200, '{"a":"b"}').json(), { a: 'b' });
        });
        test('throws an error for an unexpected content type', async function () {
            const error = (await getJsonError('<!doctype>', { 'content-type': 'text/html' }));
            assert.ok(error instanceof SyntaxError);
            assert.deepStrictEqual(error.name, 'SyntaxError');
        });
        test('throws an error for truncated JSON', async function () {
            for (const json of ['{', '{"', '{"a"', '{"a":', '{"a":1', '{"a":1,']) {
                const error = (await getJsonError(json));
                assert.ok(error instanceof SyntaxError);
                assert.deepStrictEqual(error.name, 'SyntaxError');
            }
            const error = (await getJsonError('{', { 'content-length': '2' }));
            assert.ok(error instanceof SyntaxError);
            assert.deepStrictEqual(error.name, 'SyntaxError');
        });
        test('throws an error for any other parse failure', async function () {
            const error = await getJsonError('&');
            assert.ok(error instanceof SyntaxError);
        });
    });
});
//# sourceMappingURL=networking.test.js.map