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
const sinon_1 = __importDefault(require("sinon"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const descriptors_1 = require("../../../../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const networking_1 = require("../../networking");
const fetch_1 = require("../../openai/fetch");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const fetcher_1 = require("../../test/fetcher");
const streamedCompletionSplitter_1 = require("../streamedCompletionSplitter");
suite('StreamedCompletionSplitter', function () {
    function setupSplitter(fetcher, docPrefix = 'function example(arg) {\n', languageId = 'javascript') {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(networking_1.ICompletionsFetcherService, fetcher);
        serviceCollection.define(fetch_1.ICompletionsOpenAIFetcherService, new descriptors_1.SyncDescriptor(fetch_1.LiveOpenAIFetcher)); // gets results from static fetcher
        const accessor = serviceCollection.createTestingAccessor();
        const fetcherService = accessor.get(fetch_1.ICompletionsOpenAIFetcherService);
        const telemetry = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        const params = {
            prompt: {
                prefix: docPrefix,
                suffix: '',
                isFimEnabled: false,
                promptElementRanges: [],
            },
            languageId: languageId,
            repoInfo: undefined,
            ourRequestId: 'test-request-id',
            engineModelId: 'test-model-id',
            count: 1,
            uiKind: fetch_1.CopilotUiKind.GhostText,
            extra: {},
        };
        const cacheFunction = sinon_1.default.stub();
        const splitter = accessor.get(instantiation_1.IInstantiationService).createInstance(streamedCompletionSplitter_1.StreamedCompletionSplitter, docPrefix, languageId, true, 7, cacheFunction);
        const fetchAndStreamCompletions = async function () {
            return await fetcherService.fetchAndStreamCompletions(params, telemetry, splitter.getFinishedCallback());
        };
        return { splitter, cacheFunction, fetchAndStreamCompletions };
    }
    async function readChoices(result) {
        const choices = [];
        for await (const choice of result.choices) {
            choices.push(choice);
        }
        return choices;
    }
    test('yields the first line of the completion', async function () {
        const { fetchAndStreamCompletions } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)((0, ts_dedent_1.default) `
					const result = [];
					for (let i = 0; i < arg; i++) {
						result.push(i);
					}
					return result.join(', ');
				`)));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        const completions = await readChoices(result);
        assert_1.default.strictEqual(completions.length, 1);
        assert_1.default.strictEqual(completions[0].completionText, 'const result = [];');
    });
    test('caches the remaining sections of the completion', async function () {
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)((0, ts_dedent_1.default) `
					const result = [];
					for (let i = 0; i < arg; i++) {
						result.push(i);
					}
					return result.join(', ');
				`)));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledTwice(cacheFunction);
        sinon_1.default.assert.calledWith(cacheFunction, 'const result = [];', sinon_1.default.match({
            completionText: '\nfor (let i = 0; i < arg; i++) {\n\tresult.push(i);\n}',
        }));
        sinon_1.default.assert.calledWith(cacheFunction, 'const result = [];\nfor (let i = 0; i < arg; i++) {\n\tresult.push(i);\n}', sinon_1.default.match({ completionText: "\nreturn result.join(', ');" }));
    });
    test('trims trailing whitespace from cached completions', async function () {
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('// one\n\n// two  ')));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledWith(cacheFunction, '// one', sinon_1.default.match({ completionText: '\n\n// two' }));
    });
    test('allows single line completions that begin with a newline', async function () {
        const { fetchAndStreamCompletions } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('\n// one\n// two')));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        const completions = await readChoices(result);
        assert_1.default.strictEqual(completions.length, 1);
        assert_1.default.strictEqual(completions[0].completionText, '\n// one');
    });
    test('allows single line completions that begin with a CRLF pair', async function () {
        const { fetchAndStreamCompletions } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)('\r\n// one\r\n// two')));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        const completions = await readChoices(result);
        assert_1.default.strictEqual(completions.length, 1);
        assert_1.default.strictEqual(completions[0].completionText, '\r\n// one');
    });
    test('sets generatedChoiceIndex on cached completions', async function () {
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)((0, ts_dedent_1.default) `
					const result = [];
					for (let i = 0; i < arg; i++) {
						result.push(i);
					}
					return result.join(', ');
				`)));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({ generatedChoiceIndex: 1 }));
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({ generatedChoiceIndex: 2 }));
    });
    test('adjusts start_offset in any annotations present in cached split choices', async function () {
        const parts = ['x=1;', '\n\ny=2;', '\n\nz=3;\n'];
        const completion = parts.join('');
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)(completion, { annotations: (0, fetcher_1.fakeCodeReference)(-1, completion.length + 1) })));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledTwice(cacheFunction);
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({
            copilotAnnotations: sinon_1.default.match({
                ip_code_citations: [sinon_1.default.match({ start_offset: -parts[0].length - 1 })],
            }),
        }));
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({
            copilotAnnotations: sinon_1.default.match({
                ip_code_citations: [sinon_1.default.match({ start_offset: -parts[0].length - parts[1].length - 1 })],
            }),
        }));
    });
    test('adjusts stop_offset in any annotations present in cached split choices', async function () {
        const parts = ['x=1;', '\n\ny=2;', '\n\nz=3;'];
        const completion = parts.join('');
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)(completion, { annotations: (0, fetcher_1.fakeCodeReference)(-1, completion.length + 1) })));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledTwice(cacheFunction);
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({
            copilotAnnotations: sinon_1.default.match({
                ip_code_citations: [sinon_1.default.match({ stop_offset: parts[1].length })],
            }),
        }));
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({
            copilotAnnotations: sinon_1.default.match({
                ip_code_citations: [sinon_1.default.match({ stop_offset: parts[2].length + 1 })],
            }),
        }));
    });
    test('omits any annotation from split choices where start_offset does not intersect the choice', async function () {
        const parts = ['x=1;', '\n\ny=2;', '\n\nz=3;\n'];
        const completion = parts.join('');
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)(completion, {
            annotations: (0, fetcher_1.fakeCodeReference)(parts[0].length + parts[1].length + 3, completion.length + 1),
        })));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledTwice(cacheFunction);
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({ copilotAnnotations: undefined }));
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({
            copilotAnnotations: sinon_1.default.match({
                ip_code_citations: [sinon_1.default.match({ start_offset: 3 })],
            }),
        }));
    });
    test('omits any annotation from split choices where stop_offset does not intersect the choice', async function () {
        const parts = ['x=1;', '\n\ny=2;', '\n\nz=3;\n'];
        const completion = parts.join('');
        const { fetchAndStreamCompletions, cacheFunction } = setupSplitter(new fetcher_1.StaticFetcher(() => (0, fetcher_1.createFakeCompletionResponse)(completion, { annotations: (0, fetcher_1.fakeCodeReference)(-1, parts[0].length + 3) })));
        const result = await fetchAndStreamCompletions();
        assert_1.default.strictEqual(result.type, 'success');
        await readChoices(result);
        sinon_1.default.assert.calledTwice(cacheFunction);
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({
            copilotAnnotations: sinon_1.default.match({
                ip_code_citations: [sinon_1.default.match({ stop_offset: 3 })],
            }),
        }));
        sinon_1.default.assert.calledWith(cacheFunction, sinon_1.default.match.string, sinon_1.default.match({ copilotAnnotations: undefined }));
    });
});
//# sourceMappingURL=streamedCompletionSplitter.test.js.map