"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const uuid_1 = require("../../../../../../../util/vs/base/common/uuid");
const descriptors_1 = require("../../../../../../../util/vs/platform/instantiation/common/descriptors");
const tokenization_1 = require("../../../../prompt/src/tokenization");
const completionState_1 = require("../../completionState");
const config_1 = require("../../config");
const networking_1 = require("../../networking");
const fetch_1 = require("../../openai/fetch");
const fetch_fake_1 = require("../../openai/fetch.fake");
const prompt_1 = require("../../prompt/prompt");
const prompt_2 = require("../../prompt/test/prompt");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const fetcher_1 = require("../../test/fetcher");
const telemetry_2 = require("../../test/telemetry");
const textDocument_1 = require("../../test/textDocument");
const textDocument_2 = require("../../textDocument");
const async_1 = require("../../util/async");
const asyncCompletions_1 = require("../asyncCompletions");
const completionsCache_1 = require("../completionsCache");
const current_1 = require("../current");
const ghostText_1 = require("../ghostText");
const telemetry_3 = require("../telemetry");
// Unit tests for ghostText that do not require network connectivity. For other
// tests, see lib/e2e/src/ghostText.test.ts.
suite('Isolated GhostText tests', function () {
    function getPrefix(completionState) {
        return (0, prompt_1.trimLastLine)(completionState.textDocument.getText(textDocument_2.LocationFactory.range(textDocument_2.LocationFactory.position(0, 0), completionState.position)))[0];
    }
    function setupCompletion(fetcher, docText = 'import "fmt"\n\nfunc fizzbuzz(n int) {\n\n}\n', position = textDocument_2.LocationFactory.position(3, 0), languageId = 'go', token) {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(networking_1.ICompletionsFetcherService, fetcher);
        serviceCollection.define(fetch_1.ICompletionsOpenAIFetcherService, new descriptors_1.SyncDescriptor(fetch_1.LiveOpenAIFetcher)); // gets results from static fetcher
        const accessor = serviceCollection.createTestingAccessor();
        const doc = (0, textDocument_1.createTextDocument)('file:///fizzbuzz.go', languageId, 1, docText);
        const state = (0, completionState_1.createCompletionState)(doc, position);
        const prefix = getPrefix(state);
        // Setup closures with the state as default
        function requestGhostText(completionState = state) {
            return (0, ghostText_1.getGhostText)(accessor, completionState, token);
        }
        async function requestPrompt(completionState = state) {
            const telemExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            const result = await (0, prompt_1.extractPrompt)(accessor, 'COMPLETION_ID', completionState, telemExp);
            return result.prompt;
        }
        // Note, that we return a copy of the state to avoid side effects
        return {
            accessor,
            doc,
            position,
            prefix,
            state: (0, completionState_1.createCompletionState)(doc, position),
            requestGhostText,
            requestPrompt,
        };
    }
    function addToCache(accessor, prefix, suffix, completion) {
        let choice;
        if (typeof completion === 'string') {
            choice = (0, fetch_fake_1.fakeAPIChoiceFromCompletion)(completion);
        }
        else {
            choice = completion;
        }
        const cache = accessor.get(completionsCache_1.ICompletionsCacheService);
        cache.append(prefix, suffix, choice);
    }
    async function acceptAndRequestNextCompletion(accessor, origDoc, origPosition, completion) {
        const doc = (0, textDocument_1.createTextDocument)(origDoc.uri, origDoc.clientLanguageId, origDoc.version + 1, origDoc.getText(textDocument_2.LocationFactory.range(textDocument_2.LocationFactory.position(0, 0), origPosition)) +
            completion.completionText +
            origDoc.getText(textDocument_2.LocationFactory.range(origPosition, origDoc.positionAt(origDoc.getText().length))));
        const position = doc.positionAt(doc.offsetAt(origPosition) + completion.completionText.length);
        const result = await (0, prompt_2.getGhostTextInternal)(accessor, doc, position);
        return { doc, position, result };
    }
    suiteSetup(async function () {
        await tokenization_1.initializeTokenizers;
    });
    test('returns annotations in the result', async function () {
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('\tfor i := 1; i<= n; i++ {\n', {
            annotations: (0, fetcher_1.fakeCodeReference)(-18, 26, 'NOASSERTION', 'https://github.com/github/example'),
        })));
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.deepStrictEqual(responseWithTelemetry.value[0][0].copilotAnnotations?.ip_code_citations, [
            {
                id: 5,
                start_offset: -18,
                stop_offset: 26,
                details: { citations: [{ url: 'https://github.com/github/example', license: 'NOASSERTION' }] },
            },
        ]);
    });
    test('returns cached completion', async function () {
        const { accessor, requestGhostText, prefix, requestPrompt } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const completionText = '\tfor i := 1; i<= n; i++ {';
        const { suffix } = await requestPrompt();
        addToCache(accessor, prefix, suffix, completionText);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].completion.completionText, completionText);
        assert_1.default.strictEqual(responseWithTelemetry.value[1], ghostText_1.ResultType.Cache, 'result type should be cache');
    });
    test('returns empty response when cached completion is filtered by post-processing', async function () {
        const completionText = '\tvar i int';
        const { accessor, requestGhostText, prefix, requestPrompt } = setupCompletion(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)(completionText)));
        const { suffix } = await requestPrompt();
        addToCache(accessor, prefix, suffix, '}'); // Completion matches next line of document
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'empty');
        assert_1.default.strictEqual(responseWithTelemetry.reason, 'cached results empty after post-processing');
    });
    test('returns typing as suggested', async function () {
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const { suffix } = await requestPrompt();
        addToCache(accessor, prefix, suffix, '\tfor i := 1; i<= n; i++ {');
        await requestGhostText();
        const secondText = 'import "fmt"\n\nfunc fizzbuzz(n int) {\n\tfor\n}\n';
        const second = (0, completionState_1.createCompletionState)((0, textDocument_1.createTextDocument)('file:///fizzbuzz.go', 'go', 1, secondText), textDocument_2.LocationFactory.position(3, 4));
        const responseWithTelemetry = await requestGhostText(second);
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].completion.completionText, ' i := 1; i<= n; i++ {');
        assert_1.default.strictEqual(responseWithTelemetry.value[1], ghostText_1.ResultType.TypingAsSuggested, 'result type should be typing as suggested');
    });
    test('returns multiline typing as suggested when typing into single line context', async function () {
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const currentGhostText = accessor.get(current_1.ICompletionsCurrentGhostText);
        currentGhostText.hasAcceptedCurrentCompletion = () => true;
        const { suffix } = await requestPrompt();
        const completionText = '\tfmt.Println("hi")\n\tfmt.Print("hello")';
        addToCache(accessor, prefix, suffix, completionText);
        const firstRes = await requestGhostText();
        assert_1.default.strictEqual(firstRes.type, 'success');
        assert_1.default.strictEqual(firstRes.value[0][0].completion.completionText, completionText);
        // Request a second completion typing into a non-multiline context:
        // the addition of `\tfmt.` to the current line changes the completion
        // context (via the `isEmptyBlockStart` computed in prompt/) from
        // multiline to single line.
        const secondText = 'import "fmt"\n\nfunc fizzbuzz(n int) {\n\tfmt.\n}\n';
        const second = (0, completionState_1.createCompletionState)((0, textDocument_1.createTextDocument)('file:///fizzbuzz.go', 'go', 1, secondText), textDocument_2.LocationFactory.position(3, 9));
        const secondRes = await requestGhostText(second);
        assert_1.default.strictEqual(secondRes.type, 'success');
        assert_1.default.strictEqual(secondRes.value[0][0].completion.completionText, 'Println("hi")\n\tfmt.Print("hello")');
        assert_1.default.strictEqual(secondRes.value[1], ghostText_1.ResultType.TypingAsSuggested);
    });
    test('trims multiline async completion into single line context', async function () {
        const { accessor, doc, position, requestGhostText, requestPrompt } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const asyncManager = accessor.get(asyncCompletions_1.ICompletionsAsyncManagerService);
        const prompt = await requestPrompt();
        const [prefix] = (0, prompt_1.trimLastLine)(doc.getText(textDocument_2.LocationFactory.range(textDocument_2.LocationFactory.position(0, 0), position)));
        const response = fakeResult('\tfmt.Println("hi")\n\tfmt.Print("hello")');
        void asyncManager.queueCompletionRequest('0', prefix, prompt, new vscode_languageserver_protocol_1.CancellationTokenSource(), response);
        // Request a single completion by typing into a non-multiline context:
        // the addition of `\tfmt.` to the current line changes the completion
        // context (via the `isEmptyBlockStart` computed in prompt/) from
        // multiline to single line.
        const secondText = 'import "fmt"\n\nfunc fizzbuzz(n int) {\n\tfmt.\n}\n';
        const second = (0, completionState_1.createCompletionState)((0, textDocument_1.createTextDocument)('file:///fizzbuzz.go', 'go', 1, secondText), textDocument_2.LocationFactory.position(3, 9));
        const secondRes = await requestGhostText(second);
        assert_1.default.strictEqual(secondRes.type, 'success');
        assert_1.default.strictEqual(secondRes.value[0][0].completion.completionText, 'Println("hi")');
        assert_1.default.strictEqual(secondRes.value[1], ghostText_1.ResultType.Async);
    });
    test('returns cached single-line completion that starts with newline', async function () {
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.NoFetchFetcher(), 'import "fmt"\n\nfunc fizzbuzz(n int) {\n\ti := 0\n}\n', textDocument_2.LocationFactory.position(3, '\ti := 0'.length));
        const { suffix } = await requestPrompt();
        const completionText = '\n\tj := 0';
        addToCache(accessor, prefix, suffix, completionText);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].completion.completionText, completionText);
        assert_1.default.strictEqual(responseWithTelemetry.value[1], ghostText_1.ResultType.Cache, 'result type should be cache');
    });
    test('returns prefixed cached completion', async function () {
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const { suffix } = await requestPrompt();
        const earlierPrefix = prefix.substring(0, prefix.length - 3);
        const remainingPrefix = prefix.substring(prefix.length - 3);
        const completionText = '\tfor i := 1; i<= n; i++ {';
        addToCache(accessor, earlierPrefix, suffix, remainingPrefix + completionText);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].completion.completionText, completionText);
        assert_1.default.strictEqual(responseWithTelemetry.value[1], ghostText_1.ResultType.Cache, 'result type should be cache');
        assert_1.default.strictEqual(responseWithTelemetry.telemetryBlob.measurements.foundOffset, 3);
    });
    test('does not return cached completion when exhausted', async function () {
        const networkCompletionText = '\tfor i := 1; i<= n; i++ {';
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.StaticFetcher(() => {
            return (0, fetcher_1.createFakeCompletionResponse)(networkCompletionText);
        }));
        const { suffix } = await requestPrompt();
        const earlierPrefix = prefix.substring(0, prefix.length - 3);
        const remainingPrefix = prefix.substring(prefix.length - 3);
        addToCache(accessor, earlierPrefix, suffix, remainingPrefix);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].completion.completionText, networkCompletionText);
        assert_1.default.strictEqual(responseWithTelemetry.value[1], ghostText_1.ResultType.Async, 'result type should be async');
    });
    test('Multiline requests return multiple completions on second invocation', async function () {
        const firstCompletionText = '\tfirstVar := 1\n';
        const secondCompletionText = '\tfirstVar := 2\t';
        const completions = [firstCompletionText, secondCompletionText];
        let serverSentResponse = false;
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher((url, options) => {
            if (serverSentResponse) {
                throw new Error('Unexpected second request');
            }
            serverSentResponse = true;
            return (0, fetcher_1.createFakeCompletionResponse)(completions);
        }));
        // Get the completion from the server, do the processing of the responses
        // this is a multiline request, so it'll request multiple completions, but whatever our cycling specification, it'll not _wait_ for those, c.f isCyclingRequest in getGhostTextStrategy.
        const firstResponse = await requestGhostText();
        assert_1.default.strictEqual(firstResponse.type, 'success');
        assert_1.default.strictEqual(firstResponse.value[0].length, 1);
        assert_1.default.strictEqual(firstResponse.value[0][0].completion.completionText, firstCompletionText.trimEnd());
        // therefore, request the same prompt again, this time with cycling specified, to get all completions from the cache
        const secondResponse = await requestGhostText();
        assert_1.default.strictEqual(secondResponse.type, 'success');
        // two completion results returned
        assert_1.default.strictEqual(secondResponse.value[0].length, 2);
        // the second one is the second completion, but with whitespace trimmed
        assert_1.default.strictEqual(secondResponse.value[0][0].completion.completionText, firstCompletionText.trimEnd());
        assert_1.default.strictEqual(secondResponse.value[0][1].completion.completionText, secondCompletionText.trimEnd());
    });
    test('Responses with duplicate content (modulo whitespace) are deduplicated', async function () {
        const firstCompletionText = '\tfirstVar := 1\n';
        const secondCompletionText = '\tfirstVar := 1\t';
        const completions = [firstCompletionText, secondCompletionText];
        let serverSentResponse = false;
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher((url, options) => {
            if (serverSentResponse) {
                throw new Error('Unexpected second request');
            }
            serverSentResponse = true;
            return (0, fetcher_1.createFakeCompletionResponse)(completions);
        }));
        // Get the completion from the server, do the processing of the responses
        // this is a multiline request, so it'll request multiple completions, but whatever our cycling specification, it'll not _wait_ for those, c.f isCyclingRequest in getGhostTextStrategy.
        const firstResponse = await requestGhostText();
        assert_1.default.strictEqual(firstResponse.type, 'success');
        assert_1.default.strictEqual(firstResponse.value[0].length, 1);
        assert_1.default.strictEqual(firstResponse.value[0][0].completion.completionText, firstCompletionText.trimEnd());
        // therefore, request the same prompt again, this time with cycling specified, to get all completions from the cache
        const secondResponse = await requestGhostText();
        assert_1.default.strictEqual(secondResponse.type, 'success');
        // still only one completion result returned
        assert_1.default.strictEqual(secondResponse.value[0].length, 1);
        assert_1.default.strictEqual(secondResponse.value[0][0].completion.completionText, firstCompletionText.trimEnd());
    });
    test('adds prompt metadata to telemetry', async function () {
        const networkCompletionText = '\tfor i := 1; i<= n; i++ {';
        const { accessor, requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => {
            return (0, fetcher_1.createFakeCompletionResponse)(networkCompletionText);
        }));
        const { result, reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, async () => {
            return await requestGhostText();
        });
        // The returned object (used for all other telemetry events) does not have the prompt metadata
        assert_1.default.deepStrictEqual(result.type, 'success');
        assert_1.default.ok(!result.telemetryBlob.properties.promptMetadata);
        // Only the issued event has it
        const issuedTelemetry = reporter.eventByName('ghostText.issued');
        assert_1.default.ok(issuedTelemetry.properties.promptMetadata);
        // Double check that the other events don't have it
        const events = reporter.events.filter(e => e.name !== 'ghostText.issued');
        assert_1.default.ok(events.length > 0);
        for (const event of events) {
            assert_1.default.ok(!event.properties.promptMetadata);
        }
    });
    test('cache hits use issuedTime in telemetry from current request, not cache', async function () {
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const { suffix } = await requestPrompt();
        const completionText = '\tfor i := 1; i<= n; i++ {';
        const choice = (0, fetch_fake_1.fakeAPIChoiceFromCompletion)(completionText);
        choice.telemetryData.issuedTime -= 100;
        addToCache(accessor, prefix, suffix, completionText);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].telemetry.issuedTime, responseWithTelemetry.telemetryBlob.issuedTime);
    });
    test('sends ghostText.issued telemetry event', async function () {
        const networkCompletionText = '\tfor i := 1; i<= n; i++ {';
        const { accessor, requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => {
            return (0, fetcher_1.createFakeCompletionResponse)(networkCompletionText);
        }));
        const { result, reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, async () => {
            return await requestGhostText();
        });
        assert_1.default.strictEqual(result.type, 'success');
        const issuedTelemetry = reporter.eventByName('ghostText.issued');
        [
            'languageId',
            'beforeCursorWhitespace',
            'afterCursorWhitespace',
            'neighborSource',
            'gitRepoInformation',
            'engineName',
            'isMultiline',
            'blockMode',
            'isCycling',
        ].forEach(prop => {
            assert_1.default.strictEqual(typeof issuedTelemetry.properties[prop], 'string', `Expected telemetry property ${prop}`);
        });
        [
            'promptCharLen',
            'promptSuffixCharLen',
            'promptEndPos',
            'documentLength',
            'documentLineCount',
            'promptComputeTimeMs',
        ].forEach(prop => {
            assert_1.default.strictEqual(typeof issuedTelemetry.measurements[prop], 'number', `Expected telemetry measurement ${prop}`);
        });
    });
    test('excludes ghostText.issued-specific propeties in returned telemetry', async function () {
        const networkCompletionText = '\tfor i := 1; i<= n; i++ {';
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => {
            return (0, fetcher_1.createFakeCompletionResponse)(networkCompletionText);
        }));
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        [
            'beforeCursorWhitespace',
            'afterCursorWhitespace',
            'promptChoices',
            'promptBackground',
            'neighborSource',
            'blockMode',
        ].forEach(prop => {
            assert_1.default.strictEqual(responseWithTelemetry.value[0][0].telemetry.properties[prop], undefined, `Did not expect telemetry property ${prop}`);
            assert_1.default.strictEqual(responseWithTelemetry.telemetryBlob.properties[prop], undefined, `Did not expect telemetry property ${prop}`);
        });
        ['promptCharLen', 'promptSuffixCharLen', 'promptCharLen', 'promptEndPos', 'promptComputeTimeMs'].forEach(prop => {
            assert_1.default.strictEqual(responseWithTelemetry.value[0][0].telemetry.measurements[prop], undefined, `Did not expect telemetry measurement ${prop}`);
            assert_1.default.strictEqual(responseWithTelemetry.telemetryBlob.measurements[prop], undefined, `Did not expect telemetry measurement ${prop}`);
        });
    });
    test('includes document information in returned telemetry', async function () {
        const networkCompletionText = '\tfor i := 1; i<= n; i++ {';
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => {
            return (0, fetcher_1.createFakeCompletionResponse)(networkCompletionText);
        }));
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        ['languageId', 'gitRepoInformation', 'engineName', 'isMultiline', 'isCycling'].forEach(prop => {
            assert_1.default.strictEqual(typeof responseWithTelemetry.value[0][0].telemetry.properties[prop], 'string', `Expected telemetry property ${prop}`);
            assert_1.default.strictEqual(typeof responseWithTelemetry.telemetryBlob.properties[prop], 'string', `Expected telemetry property ${prop}`);
        });
    });
    test('updates transient document information in telemetry of cached choices', async function () {
        const { accessor, requestGhostText, requestPrompt, prefix } = setupCompletion(new fetcher_1.NoFetchFetcher());
        const { suffix } = await requestPrompt();
        const completionText = '\tfor i := 1; i<= n; i++ {';
        addToCache(accessor, prefix, suffix, completionText);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        ['documentLength', 'documentLineCount'].forEach(prop => {
            assert_1.default.strictEqual(typeof responseWithTelemetry.telemetryBlob.measurements[prop], 'number', `Expected telemetry measurement ${prop}`);
            assert_1.default.strictEqual(responseWithTelemetry.value[0][0].telemetry.measurements[prop], responseWithTelemetry.telemetryBlob.measurements[prop], `Expected telemetry measurement ${prop} to be ${responseWithTelemetry.telemetryBlob.measurements[prop]}`);
        });
    });
    test('cancels if token is canceled', async function () {
        const tokenSource = new vscode_languageserver_protocol_1.CancellationTokenSource();
        const deferredResponse = new async_1.Deferred();
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => deferredResponse.promise), undefined, undefined, undefined, tokenSource.token);
        const requestPromise = requestGhostText();
        tokenSource.cancel();
        deferredResponse.resolve((0, fetcher_1.createFakeCompletionResponse)('var i int'));
        const result = await requestPromise;
        assert_1.default.strictEqual(result.type, 'abortedBeforeIssued');
        assert_1.default.strictEqual(result.reason, 'cancelled before extractPrompt');
    });
    test('cancels if a newer completion request is made', async function () {
        const firstResponseDeferred = new async_1.Deferred();
        const secondResponseDeferred = new async_1.Deferred();
        const deferreds = [firstResponseDeferred, secondResponseDeferred];
        const { requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => deferreds.shift().promise));
        const firstResponsePromise = requestGhostText();
        const secondResponsePromise = requestGhostText();
        firstResponseDeferred.resolve((0, fetcher_1.createFakeCompletionResponse)('var i int'));
        secondResponseDeferred.resolve((0, fetcher_1.createFakeCompletionResponse)('var j int'));
        const firstResponse = await firstResponsePromise;
        const secondResponse = await secondResponsePromise;
        assert_1.default.strictEqual(firstResponse.type, 'abortedBeforeIssued');
        assert_1.default.strictEqual(firstResponse.reason, 'cancelled before extractPrompt');
        assert_1.default.strictEqual(secondResponse.type, 'success');
    });
    test('can close an unclosed brace (when using progressive reveal)', async function () {
        const { accessor, requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('    }\n')), (0, ts_dedent_1.default) `
				function hello(n: number) {
					for (let i = 1; i<= n; i++) {
						console.log("hello")

				}
			`, textDocument_2.LocationFactory.position(3, 0), 'typescript');
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.AlwaysRequestMultiline, true);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 1);
        assert_1.default.strictEqual(responseWithTelemetry.value[0][0].completion.completionText, '    }');
    });
    test('filters out a duplicate brace (when using progressive reveal)', async function () {
        const { accessor, requestGhostText } = setupCompletion(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('}\n')), (0, ts_dedent_1.default) `
				function hello(n: number) {
					for (let i = 1; i<= n; i++) {
						console.log("hello")
					}

				}
			`, textDocument_2.LocationFactory.position(4, 0), 'typescript');
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.AlwaysRequestMultiline, true);
        const responseWithTelemetry = await requestGhostText();
        assert_1.default.strictEqual(responseWithTelemetry.type, 'success');
        assert_1.default.strictEqual(responseWithTelemetry.value[0].length, 0);
    });
    test('progressive reveal uses a speculative request for multiline completions and caches further completions', async function () {
        const raw = (0, ts_dedent_1.default) `
				switch {
				case n%3 == 0:
					output += "Fizz"
					fallthrough
				case n%5 == 0:
					output += "Buzz"
				default:
					output = fmt.Sprintf("%d", n)
				}
				fmt.Println(output)
			`;
        const lines = raw.split('\n').map(line => `    ${line}`);
        const multilineCompletion = lines.join('\n');
        const { accessor, doc, position, state } = setupCompletion(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)(multilineCompletion)));
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        const currentGhostText = accessor.get(current_1.ICompletionsCurrentGhostText);
        configProvider.setConfig(config_1.ConfigKey.AlwaysRequestMultiline, true);
        currentGhostText.hasAcceptedCurrentCompletion = () => true;
        const response = await (0, ghostText_1.getGhostText)(accessor, state, undefined, { isSpeculative: true });
        assert_1.default.strictEqual(response.type, 'success');
        assert_1.default.strictEqual(response.value[0].length, 1);
        assert_1.default.strictEqual(response.value[0][0].completion.completionText, lines.slice(0, 9).join('\n'));
        const { result } = await acceptAndRequestNextCompletion(accessor, doc, position, response.value[0][0].completion);
        assert_1.default.strictEqual(result.type, 'success');
        assert_1.default.strictEqual(result.value[0].length, 1);
        assert_1.default.strictEqual(result.value[0][0].completion.completionText, '\n' + lines.slice(9).join('\n'));
        assert_1.default.strictEqual(result.resultType, ghostText_1.ResultType.Cache);
    });
});
function fakeResult(completionText) {
    const telemetryBlob = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
    return Promise.resolve({
        type: 'success',
        value: [(0, fetch_fake_1.fakeAPIChoice)((0, uuid_1.generateUuid)(), 0, completionText), Promise.resolve()],
        telemetryData: (0, telemetry_3.mkBasicResultTelemetry)(telemetryBlob),
        telemetryBlob,
        resultType: ghostText_1.ResultType.Async,
    });
}
//# sourceMappingURL=ghostText.test.js.map