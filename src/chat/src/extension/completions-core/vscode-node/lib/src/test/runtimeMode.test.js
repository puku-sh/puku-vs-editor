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
const runtimeMode_1 = require("../util/runtimeMode");
suite('RuntimeMode', function () {
    suite('environment variable precedence', function () {
        test('looks for a GH_COPILOT_ variable', function () {
            const runtime = runtimeMode_1.RuntimeMode.fromEnvironment(false, [], { GH_COPILOT_DEBUG: '1' });
            assert_1.default.strictEqual(runtime.flags.debug, true);
        });
        test('looks for a GITHUB_COPILOT_ variable', function () {
            const runtime = runtimeMode_1.RuntimeMode.fromEnvironment(false, [], { GITHUB_COPILOT_DEBUG: '1' });
            assert_1.default.strictEqual(runtime.flags.debug, true);
        });
        test('gives precedence to GH_COPILOT_ variable if both are set', function () {
            const runtime = runtimeMode_1.RuntimeMode.fromEnvironment(false, [], {
                GH_COPILOT_DEBUG: '0',
                GITHUB_COPILOT_DEBUG: '1',
            });
            assert_1.default.strictEqual(runtime.flags.debug, false);
        });
    });
    [true, false].forEach(inTest => {
        test(`isRunningInTest is set to ${inTest}`, function () {
            assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(inTest).isRunningInTest(), inTest);
        });
    });
    test('shouldFailForDebugPurposes is enabled by isRunningInTest', function () {
        assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(true).shouldFailForDebugPurposes(), true);
    });
    suite('isVerboseLoggingEnabled', function () {
        [
            'GH_COPILOT_DEBUG',
            'GITHUB_COPILOT_DEBUG',
            'GH_COPILOT_VERBOSE',
            'GITHUB_COPILOT_VERBOSE',
            'COPILOT_AGENT_VERBOSE',
        ].forEach(key => {
            ['1', 'true', 'TRUE'].forEach(value => {
                test(`is enabled by ${key}=${value}`, function () {
                    assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(false, [], { [key]: value }).isVerboseLoggingEnabled(), true);
                });
            });
        });
        test('is enabled by --debug flag', function () {
            assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(false, ['--debug'], {}).isVerboseLoggingEnabled(), true);
        });
        test('is disabled by default', function () {
            assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(false, [], {}).isVerboseLoggingEnabled(), false);
        });
    });
    suite('isDebugEnabled', function () {
        ['GH_COPILOT_DEBUG', 'GITHUB_COPILOT_DEBUG'].forEach(key => {
            ['1', 'true', 'TRUE'].forEach(value => {
                test(`is enabled by ${key}=${value}`, function () {
                    assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(false, [], { [key]: value }).isDebugEnabled(), true);
                });
            });
        });
        test('is enabled by --debug flag', function () {
            assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(false, ['--debug'], {}).isDebugEnabled(), true);
        });
        test('is disabled by default', function () {
            assert_1.default.strictEqual(runtimeMode_1.RuntimeMode.fromEnvironment(false, [], {}).isDebugEnabled(), false);
        });
    });
});
//# sourceMappingURL=runtimeMode.test.js.map