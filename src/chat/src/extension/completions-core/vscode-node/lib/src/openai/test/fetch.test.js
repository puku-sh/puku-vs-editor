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
const Sinon = __importStar(require("sinon"));
const uuid_1 = require("../../../../../../../util/vs/base/common/uuid");
const descriptors_1 = require("../../../../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const src_1 = require("../../../../types/src");
const copilotTokenManager_1 = require("../../auth/copilotTokenManager");
const networking_1 = require("../../networking");
const progress_1 = require("../../progress");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const fetcher_1 = require("../../test/fetcher");
const telemetry_2 = require("../../test/telemetry");
const fetch_1 = require("../fetch");
const fetch_fake_1 = require("../fetch.fake");
suite('"Fetch" unit tests', function () {
    let accessor;
    let serviceCollection;
    let resetSpy;
    setup(function () {
        serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(fetch_1.ICompletionsOpenAIFetcherService, new descriptors_1.SyncDescriptor(fetch_fake_1.ErrorReturningFetcher));
        accessor = serviceCollection.createTestingAccessor();
        resetSpy = Sinon.spy(accessor.get(copilotTokenManager_1.ICompletionsCopilotTokenManager), 'resetToken');
    });
    test('Empty/whitespace completions are stripped', async function () {
        const fetcher = new fetch_fake_1.SyntheticCompletions(['', ' ', '\n'], accessor.get(copilotTokenManager_1.ICompletionsCopilotTokenManager));
        const params = {
            prompt: {
                prefix: '',
                suffix: '',
                isFimEnabled: false,
            },
            languageId: '',
            repoInfo: undefined,
            engineModelId: '',
            count: 1,
            uiKind: fetch_1.CopilotUiKind.GhostText,
            ourRequestId: (0, uuid_1.generateUuid)(),
            extra: {},
        };
        const cancellationToken = new src_1.CancellationTokenSource().token;
        const res = await fetcher.fetchAndStreamCompletions(params, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), () => undefined, cancellationToken);
        assert.deepStrictEqual(res.type, 'success');
        // keep the type checker happy
        if (res.type !== 'success') {
            throw new Error("internal error: res.type is not 'success'");
        }
        const stream = res.choices;
        const results = [];
        for await (const result of stream) {
            results.push(result);
        }
        assert.strictEqual(results.length, 0);
    });
    test('If in the split context experiment, send the context field as part of the request', async function () {
        const networkFetcher = new OptionsRecorderFetcher(() => (0, fetcher_1.createFakeStreamResponse)('data: [DONE]\n'));
        const params = {
            prompt: {
                context: ['# Language: Python'],
                prefix: 'prefix without context',
                suffix: '\ndef sum(a, b):\n    return a + b',
                isFimEnabled: true,
            },
            languageId: 'python',
            repoInfo: undefined,
            engineModelId: 'copilot-codex',
            count: 1,
            uiKind: fetch_1.CopilotUiKind.GhostText,
            postOptions: {},
            ourRequestId: (0, uuid_1.generateUuid)(),
            extra: {},
        };
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(networking_1.ICompletionsFetcherService, networkFetcher);
        const accessor = serviceCollectionClone.createTestingAccessor();
        const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        telemetryWithExp.filtersAndExp.exp.variables.copilotenablepromptcontextproxyfield = true;
        const openAIFetcher = accessor.get(instantiation_1.IInstantiationService).createInstance(fetch_1.LiveOpenAIFetcher);
        await openAIFetcher.fetchAndStreamCompletions(params, telemetryWithExp, () => undefined);
        const options = networkFetcher.options;
        const json = options?.json;
        assert.strictEqual(json?.prompt, params.prompt.prefix);
        const extra = json?.extra;
        assert.strictEqual(extra?.context, params.prompt.context);
    });
    test('properly handles 466 (client outdated) responses from proxy', async function () {
        const statusReporter = new TestStatusReporter();
        const result = await assertResponseWithStatus(466, statusReporter);
        assert.deepStrictEqual(result, { type: 'failed', reason: 'client not supported: response-text' });
        assert.deepStrictEqual(statusReporter.kind, 'Error');
        assert.deepStrictEqual(statusReporter.message, 'response-text');
        assert.deepStrictEqual(statusReporter.eventCount, 1);
    });
    test('has fallback for unknown http response codes from proxy', async function () {
        const statusReporter = new TestStatusReporter();
        const result = await assertResponseWithStatus(518, statusReporter);
        assert.deepStrictEqual(result, { type: 'failed', reason: 'unhandled status from server: 518 response-text' });
        assert.deepStrictEqual(statusReporter.kind, 'Warning');
        assert.deepStrictEqual(statusReporter.message, 'Last response was a 518 error');
    });
    test('calls out possible proxy for 4xx requests without x-github-request-id', async function () {
        const statusReporter = new TestStatusReporter();
        const result = await assertResponseWithStatus(418, statusReporter, { 'x-github-request-id': '' });
        assert.deepStrictEqual(result, { type: 'failed', reason: 'unhandled status from server: 418 response-text' });
        assert.deepStrictEqual(statusReporter.kind, 'Warning');
        assert.deepStrictEqual(statusReporter.message, 'Last response was a 418 error and does not appear to originate from GitHub. Is a proxy or firewall intercepting this request? https://gh.io/copilot-firewall');
    });
    test('HTTP `Unauthorized` invalidates token', async function () {
        const result = await assertResponseWithContext(accessor, 401);
        assert.deepStrictEqual(result, { type: 'failed', reason: 'token expired or invalid: 401' });
        assert.ok(resetSpy.calledOnce, 'resetToken should have been called once');
    });
    test('HTTP `Forbidden` invalidates token', async function () {
        const result = await assertResponseWithContext(accessor, 403);
        assert.deepStrictEqual(result, { type: 'failed', reason: 'token expired or invalid: 403' });
        assert.ok(resetSpy.calledOnce, 'resetToken should have been called once');
    });
    test('HTTP `Too many requests` enforces rate limiting locally', async function () {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(fetch_1.ICompletionsOpenAIFetcherService, new descriptors_1.SyncDescriptor(fetch_fake_1.ErrorReturningFetcher));
        const accessor = serviceCollection.createTestingAccessor();
        const result = await assertResponseWithContext(accessor, 429);
        const fetcherService = accessor.get(fetch_1.ICompletionsOpenAIFetcherService);
        assert.deepStrictEqual(result, { type: 'failed', reason: 'rate limited' });
        const limited = await fetcherService.fetchAndStreamCompletions({}, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), () => Promise.reject(new Error()), new src_1.CancellationTokenSource().token);
        assert.deepStrictEqual(limited, { type: 'canceled', reason: 'rate limited' });
    });
    test.skip('properly handles 402 (free plan exhausted) responses from proxy', async function () {
        const fetcherService = accessor.get(fetch_1.ICompletionsOpenAIFetcherService);
        const tokenManager = accessor.get(copilotTokenManager_1.ICompletionsCopilotTokenManager);
        await tokenManager.primeToken(); // Trigger initial status
        const statusReporter = new TestStatusReporter();
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(progress_1.ICompletionsStatusReporter, statusReporter);
        const accessorClone = serviceCollectionClone.createTestingAccessor();
        const result = await assertResponseWithContext(accessorClone, 402);
        assert.deepStrictEqual(result, { type: 'failed', reason: 'monthly free code completions exhausted' });
        assert.deepStrictEqual(statusReporter.kind, 'Error');
        assert.match(statusReporter.message, /limit/);
        assert.deepStrictEqual(statusReporter.eventCount, 1);
        assert.deepStrictEqual(statusReporter.command, fetch_1.CMDQuotaExceeded);
        const exhausted = await fetcherService.fetchAndStreamCompletions(fakeCompletionParams(), telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), () => Promise.reject(new Error()), new src_1.CancellationTokenSource().token);
        assert.deepStrictEqual(exhausted, { type: 'canceled', reason: 'monthly free code completions exhausted' });
        tokenManager.resetToken();
        await tokenManager.getToken();
        const refreshed = await assertResponseWithContext(accessorClone, 429);
        assert.deepStrictEqual(refreshed, { type: 'failed', reason: 'rate limited' });
        assert.deepStrictEqual(statusReporter.kind, 'Error');
    });
    test('additional headers are included in the request', async function () {
        const networkFetcher = new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeStreamResponse)('data: [DONE]\n'));
        const params = {
            prompt: {
                prefix: '',
                suffix: '',
                isFimEnabled: false,
            },
            languageId: '',
            repoInfo: undefined,
            engineModelId: 'copilot-codex',
            count: 1,
            uiKind: fetch_1.CopilotUiKind.GhostText,
            ourRequestId: (0, uuid_1.generateUuid)(),
            headers: { Host: 'bla' },
            extra: {},
        };
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(networking_1.ICompletionsFetcherService, networkFetcher);
        const accessor = serviceCollectionClone.createTestingAccessor();
        const openAIFetcher = accessor.get(instantiation_1.IInstantiationService).createInstance(fetch_1.LiveOpenAIFetcher);
        await openAIFetcher.fetchAndStreamCompletions(params, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), () => undefined);
        assert.strictEqual(networkFetcher.headerBuffer['Host'], 'bla');
    });
});
suite('Telemetry sent on fetch', function () {
    let accessor;
    setup(function () {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(networking_1.ICompletionsFetcherService, new OptionsRecorderFetcher(() => (0, fetcher_1.createFakeStreamResponse)('data: [DONE]\n')));
        accessor = serviceCollection.createTestingAccessor();
    });
    test('sanitizeRequestOptionTelemetry properly excludes top-level keys', function () {
        const request = {
            prompt: 'prompt prefix',
            suffix: 'prompt suffix',
            stream: true,
            count: 1,
            extra: {
                language: 'python',
            },
        };
        const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        (0, fetch_1.sanitizeRequestOptionTelemetry)(request, telemetryWithExp, ['prompt', 'suffix']);
        assert.deepStrictEqual(telemetryWithExp.properties, {
            'request.option.stream': 'true',
            'request.option.count': '1',
            'request.option.extra': '{"language":"python"}',
        });
    });
    test('sanitizeRequestOptionTelemetry properly excludes `extra` keys', function () {
        const request = {
            prompt: 'prefix without context',
            suffix: 'prompt suffix',
            stream: true,
            count: 1,
            extra: {
                language: 'python',
                context: ['# Language: Python'],
            },
        };
        const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        (0, fetch_1.sanitizeRequestOptionTelemetry)(request, telemetryWithExp, ['prompt', 'suffix'], ['context']);
        assert.deepStrictEqual(telemetryWithExp.properties, {
            'request.option.stream': 'true',
            'request.option.count': '1',
            'request.option.extra': '{"language":"python"}',
        });
    });
    test('If context is provided while in the split context experiment, only send it in restricted telemetry events', async function () {
        const params = {
            prompt: {
                context: ['# Language: Python'],
                prefix: 'prefix without context',
                suffix: '\ndef sum(a, b):\n    return a + b',
                isFimEnabled: true,
            },
            languageId: 'python',
            repoInfo: undefined,
            engineModelId: 'copilot-codex',
            count: 1,
            uiKind: fetch_1.CopilotUiKind.GhostText,
            postOptions: {},
            ourRequestId: (0, uuid_1.generateUuid)(),
            extra: {},
        };
        const openAIFetcher = accessor.get(instantiation_1.IInstantiationService).createInstance(fetch_1.LiveOpenAIFetcher);
        const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        telemetryWithExp.filtersAndExp.exp.variables.copilotenablepromptcontextproxyfield = true;
        const { reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, async () => {
            await openAIFetcher.fetchAndStreamCompletions(params, telemetryWithExp, () => undefined);
        });
        const standardEvents = reporter.events;
        const hasContext = standardEvents.some(event => event.properties['request_option_extra']?.includes('context'));
        assert.strictEqual(hasContext, false, 'Standard telemetry event should not include context');
        // todo@dbaeumer we need to understand what our restricted telemetry story is.
        // const restrictedEvents = enhancedReporter.events;
        // const hasRestrictedContext = restrictedEvents.some(event =>
        //     event.properties['request_option_extra']?.includes('context')
        // );
        // assert.strictEqual(hasRestrictedContext, true, 'Restricted telemetry event should include context');
    });
    test('If context is provided, include it in `engine.prompt` telemetry events', function () { });
});
class TestStatusReporter extends progress_1.StatusReporter {
    constructor() {
        super(...arguments);
        this.eventCount = 0;
        this.kind = 'Normal';
        this.message = '';
    }
    didChange(event) {
        this.eventCount++;
        this.kind = event.kind;
        this.message = event.message || '';
        this.command = event.command?.command;
    }
}
async function assertResponseWithStatus(statusCode, statusReporter, headers) {
    const serviceCollection = (0, context_1.createLibTestingContext)();
    serviceCollection.define(progress_1.ICompletionsStatusReporter, statusReporter);
    const accessor = serviceCollection.createTestingAccessor();
    const copilotTokenManager = accessor.get(copilotTokenManager_1.ICompletionsCopilotTokenManager);
    await copilotTokenManager.primeToken(); // Trigger initial status
    return assertResponseWithContext(accessor, statusCode, headers);
}
async function assertResponseWithContext(accessor, statusCode, headers) {
    const response = (0, fetcher_1.createFakeResponse)(statusCode, 'response-text', headers);
    const fetcher = accessor.getIfExists(fetch_1.ICompletionsOpenAIFetcherService) ?? accessor.get(instantiation_1.IInstantiationService).createInstance(fetch_fake_1.ErrorReturningFetcher);
    fetcher.setResponse(response);
    const completionParams = fakeCompletionParams();
    const result = await fetcher.fetchAndStreamCompletions(completionParams, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), () => Promise.reject(new Error()), new src_1.CancellationTokenSource().token);
    return result;
}
function fakeCompletionParams() {
    return {
        prompt: {
            prefix: 'xxx',
            suffix: '',
            isFimEnabled: false,
        },
        languageId: '',
        repoInfo: undefined,
        ourRequestId: (0, uuid_1.generateUuid)(),
        engineModelId: 'foo/bar',
        count: 1,
        uiKind: fetch_1.CopilotUiKind.GhostText,
        postOptions: {},
        extra: {},
    };
}
class OptionsRecorderFetcher extends fetcher_1.StaticFetcher {
    fetch(url, options) {
        this.options = options;
        return super.fetch(url, options);
    }
}
//# sourceMappingURL=fetch.test.js.map