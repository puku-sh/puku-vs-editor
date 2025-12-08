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
const sinon_1 = __importDefault(require("sinon"));
const descriptors_1 = require("../../../../../../util/vs/platform/instantiation/common/descriptors");
const ghostText_1 = require("../ghostText/ghostText");
const telemetry_1 = require("../ghostText/telemetry");
const inlineCompletion_1 = require("../inlineCompletion");
const networking_1 = require("../networking");
const fetch_1 = require("../openai/fetch");
const textDocument_1 = require("../textDocument");
const async_1 = require("../util/async");
const context_1 = require("./context");
const fetcher_1 = require("./fetcher");
const telemetry_2 = require("./telemetry");
const textDocument_2 = require("./textDocument");
suite('getInlineCompletions()', function () {
    function setupCompletion(fetcher, docText = 'function example() {\n\n}', position = textDocument_1.LocationFactory.position(1, 0), languageId = 'typescript') {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        const doc = (0, textDocument_2.createTextDocument)('file:///example.ts', languageId, 1, docText);
        serviceCollection.define(networking_1.ICompletionsFetcherService, fetcher);
        serviceCollection.define(fetch_1.ICompletionsOpenAIFetcherService, new descriptors_1.SyncDescriptor(fetch_1.LiveOpenAIFetcher)); // gets results from static fetcher
        const accessor = serviceCollection.createTestingAccessor();
        // Setup closures with the state as default
        function requestInlineCompletions(textDoc = doc, pos = position) {
            return (0, inlineCompletion_1.getInlineCompletions)(accessor, textDoc, pos);
        }
        return {
            accessor,
            doc,
            position,
            requestInlineCompletions,
        };
    }
    test('Sends a speculative request when shown', async function () {
        const firstCompletionText = '\tconst firstVar = 1;';
        const secondCompletionText = '\tconst secondVar = 2;';
        const completionsDeferred = new async_1.Deferred();
        const networkResponse = sinon_1.default.stub().returns((0, fetcher_1.createFakeCompletionResponse)('// not expected!'));
        networkResponse.onFirstCall().returns((0, fetcher_1.createFakeCompletionResponse)(firstCompletionText));
        networkResponse.onSecondCall().callsFake((_url, opts) => {
            completionsDeferred.resolve(opts.json);
            return (0, fetcher_1.createFakeCompletionResponse)(secondCompletionText);
        });
        const { accessor, doc, position, requestInlineCompletions } = setupCompletion(new fetcher_1.StaticFetcher(networkResponse));
        const { reporter, result } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, async () => {
            const firstResponse = await requestInlineCompletions();
            assert_1.default.strictEqual(firstResponse?.length, 1);
            assert_1.default.strictEqual(firstResponse[0].insertText, firstCompletionText);
            (0, telemetry_1.telemetryShown)(accessor, 'ghostText', firstResponse[0]);
            // We're expecting 2 completion requests: one we explicitly requested, and a follow-up speculative request in the background.
            return await completionsDeferred.promise;
        });
        const expectedPrefix = doc.getText({ start: { line: 0, character: 0 }, end: position }) + firstCompletionText;
        assert_1.default.ok(result.prompt.endsWith(expectedPrefix), 'Expect first completion in second request');
        const issuedTelemetry = reporter.eventsMatching(event => event.name === 'ghostText.issued');
        assert_1.default.strictEqual(issuedTelemetry.length, 2, `Expected 2 issued events, got ${issuedTelemetry.length}`);
        const speculativeTelemetry = reporter.eventsMatching(event => event.name === 'ghostText.issued' && event.properties['reason'] === 'speculative');
        assert_1.default.ok(speculativeTelemetry.length === 1, 'Expected one speculative request');
    });
    test('speculative requests apply completions the same as the editor and CLS', async function () {
        const firstCompletion = '    const firstVar = 1;';
        const secondCompletion = '\n    const secondVar = 2;';
        const completionsDeferred = new async_1.Deferred();
        const networkResponse = sinon_1.default.stub().returns((0, fetcher_1.createFakeCompletionResponse)('// not expected!'));
        networkResponse.onFirstCall().returns((0, fetcher_1.createFakeCompletionResponse)(firstCompletion));
        networkResponse.onSecondCall().callsFake(() => {
            completionsDeferred.resolve();
            return (0, fetcher_1.createFakeCompletionResponse)(secondCompletion);
        });
        const { accessor, doc, position, requestInlineCompletions } = setupCompletion(new fetcher_1.StaticFetcher(networkResponse), 'function example() {\n    \n}\n', textDocument_1.LocationFactory.position(1, 4));
        const response = await requestInlineCompletions();
        assert_1.default.strictEqual(response?.length, 1);
        assert_1.default.strictEqual(response[0].insertText, firstCompletion);
        assert_1.default.deepStrictEqual(response[0].range, textDocument_1.LocationFactory.range(textDocument_1.LocationFactory.position(1, 0), position));
        (0, telemetry_1.telemetryShown)(accessor, 'ghostText', response[0]);
        await completionsDeferred.promise; // Wait for speculative request to be sent
        const docv2 = (0, textDocument_2.createTextDocument)(doc.uri, doc.clientLanguageId, doc.version + 1, `function example() {\n${firstCompletion}\n}\n`);
        const position2 = textDocument_1.LocationFactory.position(1, firstCompletion.length);
        const response2 = await requestInlineCompletions(docv2, position2);
        assert_1.default.strictEqual(response2?.length, 1);
        assert_1.default.strictEqual(response2[0].insertText, firstCompletion + secondCompletion);
        assert_1.default.deepStrictEqual(response2[0].range, textDocument_1.LocationFactory.range(textDocument_1.LocationFactory.position(1, 0), textDocument_1.LocationFactory.position(1, firstCompletion.length)));
        assert_1.default.strictEqual(response2[0].resultType, ghostText_1.ResultType.Cache);
        assert_1.default.strictEqual(networkResponse.callCount, 2);
    });
    test('does not send a speculative request if empty', async function () {
        const { accessor, requestInlineCompletions } = setupCompletion(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('')));
        const { reporter, result } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, () => {
            return requestInlineCompletions();
        });
        assert_1.default.strictEqual(result, undefined);
        const issuedTelemetry = reporter.eventsMatching(event => event.name === 'ghostText.issued');
        assert_1.default.strictEqual(issuedTelemetry.length, 1, `Expected 1 issued events, got ${issuedTelemetry.length}`);
        const speculativeTelemetry = reporter.eventsMatching(event => event.name === 'ghostText.issued' && event.properties['reason'] === 'speculative');
        assert_1.default.ok(speculativeTelemetry.length === 0, 'Expected no speculative request');
    });
    test('telemetryShown triggers speculative request only when shown', async function () {
        const firstCompletionText = '\tconst firstVar = 1;';
        const secondCompletionText = '\tconst secondVar = 2;';
        const completionsDeferred = new async_1.Deferred();
        const networkResponse = sinon_1.default.stub().returns((0, fetcher_1.createFakeCompletionResponse)('// not expected!'));
        networkResponse.onFirstCall().returns((0, fetcher_1.createFakeCompletionResponse)(firstCompletionText));
        networkResponse.onSecondCall().callsFake((_url, opts) => {
            completionsDeferred.resolve(opts.json);
            return (0, fetcher_1.createFakeCompletionResponse)(secondCompletionText);
        });
        const { accessor, requestInlineCompletions } = setupCompletion(new fetcher_1.StaticFetcher(networkResponse));
        const { reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, async () => {
            const firstResponse = await requestInlineCompletions();
            assert_1.default.strictEqual(firstResponse?.length, 1);
            assert_1.default.strictEqual(firstResponse[0].insertText, firstCompletionText);
            // Verify speculative request is not made before shown
            await (0, async_1.delay)(50);
            assert_1.default.strictEqual(networkResponse.callCount, 1, 'Expected only the initial network call');
            // Call telemetryShown to trigger speculative request
            (0, telemetry_1.telemetryShown)(accessor, 'ghostText', firstResponse[0]);
            // Wait for speculative request to complete
            return await completionsDeferred.promise;
        });
        assert_1.default.strictEqual(networkResponse.callCount, 2, 'Expected 2 network calls (original + speculative)');
        const shownTelemetry = reporter.eventsMatching(event => event.name === 'ghostText.shown');
        assert_1.default.strictEqual(shownTelemetry.length, 1, 'Expected one shown telemetry event');
        const speculativeTelemetry = reporter.eventsMatching(event => event.name === 'ghostText.issued' && event.properties['reason'] === 'speculative');
        assert_1.default.ok(speculativeTelemetry.length === 1, 'Expected one speculative request');
    });
});
//# sourceMappingURL=inlineCompletion.test.js.map