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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("node:assert"));
const sinon_1 = __importDefault(require("sinon"));
const uuid_1 = require("../../../../../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const src_1 = require("../../../../types/src");
const featuresService_1 = require("../../experiments/featuresService");
const fetch_fake_1 = require("../../openai/fetch.fake");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const async_1 = require("../../util/async");
const ghostText_1 = require("../ghostText");
const asyncCompletions_1 = require("./../asyncCompletions");
const telemetry_2 = require("./../telemetry");
suite('AsyncCompletionManager', function () {
    let accessor;
    let manager;
    let clock;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        manager = accessor.get(instantiation_1.IInstantiationService).createInstance(asyncCompletions_1.AsyncCompletionManager);
        clock = sinon_1.default.useFakeTimers();
    });
    teardown(function () {
        clock.restore();
    });
    suite('shouldWaitForAsyncCompletions', function () {
        test('is false when there are no requests', function () {
            const prefix = 'func main() {\n';
            const prompt = createPrompt(prefix, '}\n');
            const shouldQueue = manager.shouldWaitForAsyncCompletions(prefix, prompt);
            assert.strictEqual(shouldQueue, false);
        });
        test('is false when there are no matching requests', async function () {
            void manager.queueCompletionRequest('0', 'import (', createPrompt(), CTS(), pendingResult()); // Prefix doesn't match
            void manager.queueCompletionRequest('1', 'func main() {\n', createPrompt('', '\t'), CTS(), pendingResult()); // Suffix doesn't match
            await manager.queueCompletionRequest('2', 'package ', createPrompt(), CTS(), fakeResult('main')); // Prefix doesn't match completed
            await manager.queueCompletionRequest('3', 'func ', createPrompt(), CTS(), fakeResult('test')); // Completion doesn't match prefix
            void manager.queueCompletionRequest('4', 'func ', createPrompt(), CTS(), pendingResult()); // Partial completion doesn't match prefix
            manager.updateCompletion('4', 'func test');
            assert.strictEqual(manager.shouldWaitForAsyncCompletions('func main() {\n', createPrompt()), false);
        });
        test('is true when there is a matching pending request', function () {
            const prefix = 'func main() {\n';
            const prompt = createPrompt(prefix, '}\n');
            void manager.queueCompletionRequest('0', prefix, prompt, CTS(), pendingResult());
            assert.strictEqual(manager.shouldWaitForAsyncCompletions(prefix, prompt), true);
        });
        test('is true when there is a matching completed request', async function () {
            const prefix = 'func main() {\n';
            const prompt = createPrompt(prefix, '}\n');
            const promise = fakeResult('\tfmt.Println("Hello, world!")');
            await manager.queueCompletionRequest('0', prefix, prompt, CTS(), promise);
            assert.strictEqual(manager.shouldWaitForAsyncCompletions(prefix, prompt), true);
        });
        test('is true when there is a completed request with a prefixing prompt and matching completion', async function () {
            const earlierPrefix = 'func main() {\n';
            const earlierPrompt = createPrompt(earlierPrefix, '}\n');
            const promise = fakeResult('\tfmt.Println("Hello, world!")');
            await manager.queueCompletionRequest('0', earlierPrefix, earlierPrompt, CTS(), promise);
            const prefix = 'func main() {\n\tfmt.';
            const prompt = createPrompt(prefix, '}\n');
            assert.strictEqual(manager.shouldWaitForAsyncCompletions(prefix, prompt), true);
        });
        test('is true when there is a pending request with a prefixing prompt and matching partial result', function () {
            const earlierPrefix = 'func main() {\n';
            const earlierPrompt = createPrompt(earlierPrefix, '}\n');
            void manager.queueCompletionRequest('0', earlierPrefix, earlierPrompt, CTS(), pendingResult());
            manager.updateCompletion('0', '\tfmt.Println');
            const prefix = 'func main() {\n\tfmt.';
            const prompt = createPrompt(prefix, '}\n');
            assert.strictEqual(manager.shouldWaitForAsyncCompletions(prefix, prompt), true);
        });
    });
    suite('getFirstMatchingRequest', function () {
        test('returns undefined when there are no matching choices', async function () {
            void manager.queueCompletionRequest('0', 'import (', createPrompt(), CTS(), pendingResult()); // Prefix doesn't match
            void manager.queueCompletionRequest('1', 'func main() {\n', createPrompt('', '\t'), CTS(), pendingResult()); // Suffix doesn't match
            void manager.queueCompletionRequest('2', 'func ', createPrompt(), CTS(), fakeResult('test')); // Completion doesn't match prefix
            const choice = await manager.getFirstMatchingRequest('3', 'func main() {\n', createPrompt(), false);
            assert.strictEqual(choice, undefined);
        });
        test('does not return an empty choice', async function () {
            void manager.queueCompletionRequest('0', 'func ', createPrompt(), CTS(), fakeResult('main() {\n'));
            const choice = await manager.getFirstMatchingRequest('1', 'func mai(){ \n', createPrompt(), false);
            assert.strictEqual(choice, undefined);
        });
        test('returns the first resolved choice that matches', async function () {
            void manager.queueCompletionRequest('0', 'func ', createPrompt(), CTS(), fakeResult('main() {\n', r => (0, async_1.delay)(1, r)));
            void manager.queueCompletionRequest('1', 'func ', createPrompt(), CTS(), fakeResult('main() {\n\terr :=', r => (0, async_1.delay)(2000, r)));
            void manager.queueCompletionRequest('2', 'func ', createPrompt(), CTS(), fakeResult('main() {\n\tfmt.Println', r => (0, async_1.delay)(20, r)));
            const choicePromise = manager.getFirstMatchingRequest('3', 'func main() {\n', createPrompt(), false);
            await clock.runAllAsync();
            const choice = await choicePromise;
            assert.ok(choice);
            assert.strictEqual(choice[0].completionText, '\tfmt.Println');
            assert.strictEqual(choice[0].telemetryData.measurements.foundOffset, 9);
        });
    });
    suite('getFirstMatchingRequestWithTimeout', function () {
        test('returns result before timeout', async function () {
            void manager.queueCompletionRequest('0', 'fmt.', createPrompt(), CTS(), fakeResult('Println("Hi")', r => (0, async_1.delay)(1, r)));
            const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
            featuresService.asyncCompletionsTimeout = () => 1000;
            const choicePromise = manager.getFirstMatchingRequestWithTimeout('1', 'fmt.', createPrompt(), false, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
            await clock.runAllAsync();
            const choice = await choicePromise;
            assert.ok(choice);
            assert.strictEqual(choice[0].completionText, 'Println("Hi")');
        });
        test('returns undefined after timeout', async function () {
            void manager.queueCompletionRequest('0', 'fmt.', createPrompt(), CTS(), fakeResult('Println("Hello")', r => (0, async_1.delay)(2000, r)));
            const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
            featuresService.asyncCompletionsTimeout = () => 10;
            const choicePromise = manager.getFirstMatchingRequestWithTimeout('1', 'fmt.', createPrompt(), false, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
            await clock.runAllAsync();
            const choice = await choicePromise;
            assert.strictEqual(choice, undefined);
        });
        test('does not timeout if timeout is set to -1', async function () {
            void manager.queueCompletionRequest('0', 'fmt.', createPrompt(), CTS(), fakeResult('Println("Hi")', r => (0, async_1.delay)(100, r)));
            const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
            featuresService.asyncCompletionsTimeout = () => -1;
            const choicePromise = manager.getFirstMatchingRequestWithTimeout('1', 'fmt.', createPrompt(), false, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
            await clock.runAllAsync();
            const choice = await choicePromise;
            assert.ok(choice);
            assert.strictEqual(choice[0].completionText, 'Println("Hi")');
        });
    });
    suite('cancels', function () {
        test('pending requests that are no longer candidates for the most recent', function () {
            const firstToken = CTS();
            const secondToken = CTS();
            void manager.queueCompletionRequest('0', 'import (', createPrompt(), firstToken, pendingResult()); // Prefix doesn't match
            void manager.queueCompletionRequest('1', 'func ', createPrompt(), secondToken, pendingResult());
            manager.updateCompletion('1', 'test()'); // Partial completion doesn't match prefix
            void manager.getFirstMatchingRequest('2', 'func main() {\n', createPrompt(), false);
            assert.strictEqual(firstToken.token.isCancellationRequested, true);
            assert.strictEqual(secondToken.token.isCancellationRequested, true);
        });
        test('pending request after updating to no longer match', function () {
            const cts = CTS();
            void manager.queueCompletionRequest('1', 'func ', createPrompt(), cts, pendingResult());
            void manager.getFirstMatchingRequest('2', 'func main() {\n', createPrompt(), false);
            manager.updateCompletion('1', 'test()');
            assert.strictEqual(cts.token.isCancellationRequested, true);
        });
        test('only requests that do not match the most recent request', function () {
            const cts = CTS();
            void manager.queueCompletionRequest('1', 'func ', createPrompt(), cts, pendingResult());
            void manager.getFirstMatchingRequest('2', 'func main', createPrompt(), false);
            void manager.getFirstMatchingRequest('3', 'func test', createPrompt(), false);
            manager.updateCompletion('1', 'test()');
            assert.strictEqual(cts.token.isCancellationRequested, false);
        });
        test('only requests that do not match the most recent request excluding speculative requests', function () {
            const cts = CTS();
            void manager.queueCompletionRequest('1', 'func ', createPrompt(), cts, pendingResult());
            void manager.getFirstMatchingRequest('2', 'func main', createPrompt(), false);
            void manager.getFirstMatchingRequest('3', 'func test', createPrompt(), false);
            void manager.getFirstMatchingRequest('4', 'func main() {\nvar i;', createPrompt(), true);
            manager.updateCompletion('1', 'test()');
            assert.strictEqual(cts.token.isCancellationRequested, false);
        });
        test('all requests that do not match the most recent request', function () {
            const firstCTS = CTS();
            const secondCTS = CTS();
            const thirdCTS = CTS();
            void manager.queueCompletionRequest('0', 'func ', createPrompt(), firstCTS, pendingResult());
            void manager.queueCompletionRequest('1', 'func mai', createPrompt(), secondCTS, pendingResult());
            void manager.getFirstMatchingRequest('2', 'func main', createPrompt(), false);
            manager.updateCompletion('0', 'main');
            void manager.queueCompletionRequest('3', 'func t', createPrompt(), thirdCTS, pendingResult());
            void manager.getFirstMatchingRequest('4', 'func test', createPrompt(), false);
            manager.updateCompletion('3', 'rigger');
            assert.strictEqual(firstCTS.token.isCancellationRequested, true);
            assert.strictEqual(secondCTS.token.isCancellationRequested, true);
            assert.strictEqual(thirdCTS.token.isCancellationRequested, true);
        });
    });
});
function createPrompt(prefix = '', suffix = '') {
    return { prefix, suffix, isFimEnabled: true };
}
function fakeResult(completionText, resolver = (r) => Promise.resolve(r)) {
    const telemetryBlob = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
    return resolver({
        type: 'success',
        value: [(0, fetch_fake_1.fakeAPIChoice)((0, uuid_1.generateUuid)(), 0, completionText), new Promise(() => { })],
        telemetryData: (0, telemetry_2.mkBasicResultTelemetry)(telemetryBlob),
        telemetryBlob,
        resultType: ghostText_1.ResultType.Async,
    });
}
function pendingResult() {
    return new Promise(() => { });
}
function CTS() {
    return new src_1.CancellationTokenSource();
}
//# sourceMappingURL=asyncCompletions.test.js.map