"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const logService_1 = require("../../../log/common/logService");
const openai_1 = require("../../../networking/common/openai");
const stream_1 = require("../../../networking/node/stream");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const fetcher_1 = require("../../../test/node/fetcher");
const services_1 = require("../../../test/node/services");
const thinking_1 = require("../../../thinking/common/thinking");
async function getAll(iter) {
    const result = [];
    for await (const item of iter) {
        result.push(item);
    }
    return result;
}
const createSpyingFinishedCb = () => {
    const collection = [];
    return {
        collection,
        finishedCb: async (text, index, delta) => {
            collection.push({
                text,
                index,
                delta,
            });
            return undefined;
        }
    };
};
(0, vitest_1.suite)('SSEProcessor', () => {
    let telemetryService;
    let logService;
    (0, vitest_1.beforeAll)(() => {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        telemetryService = accessor.get(telemetry_1.ITelemetryService);
        logService = accessor.get(logService_1.ILogService);
    });
    function assertSimplifiedResultsEqual(actual, splifiedExpected) {
        const simplifiedActual = Object.fromEntries(actual.map(c => [
            c.index,
            {
                finishReason: c.reason,
                chunks: c.solution.text,
            },
        ]));
        vitest_1.assert.deepStrictEqual(simplifiedActual, splifiedExpected);
    }
    (0, vitest_1.test)('empty response yields no results', async function () {
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(''));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {});
    });
    (0, vitest_1.test)('done response yields no results', async function () {
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)('data: [DONE]\n'));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {});
    });
    (0, vitest_1.test)('broken JSON response is skipped', async function () {
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)('data: {\n'));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {});
    });
    (0, vitest_1.test)('empty JSON response is skipped', async function () {
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)('data: {}\n'));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {});
    });
    (0, vitest_1.test)('1 text token response yields 1 result', async function () {
        const response = `data: {"choices":[{"text":"foo","index":0,"finish_reason":"stop"}]}
data: [DONE]
`;
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo'],
            },
        });
    });
    (0, vitest_1.test)('1 delta token response yields 1 result', async function () {
        const response = `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":"stop"}]}
data: [DONE]
`;
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo'],
            },
        });
    });
    (0, vitest_1.test)('response with text and without finish_reason yields "DONE" result', async function () {
        // This is not an expected case, since the OpenAI API should always
        // include a finish_reason, but we handle it anyway.
        const response = `data: {"choices":[{"text":"foo","index":0,"finish_reason":null}]}
data: [DONE]
`;
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientDone,
                chunks: ['foo'],
            },
        });
    });
    (0, vitest_1.test)('response with delta and without finish_reason yields "DONE" result', async function () {
        // This is not an expected case, since the OpenAI API should always
        // include a finish_reason, but we handle it anyway.
        const response = [
            `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":null}]}\n`,
            `data: [DONE]\n`
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientDone,
                chunks: ['foo'],
            },
        });
    });
    (0, vitest_1.test)('response with text and without finish_reason or "[DONE]" yields "Iteration Done" result', async function () {
        // This is not an expected case, since the OpenAI API should always
        // include a finish_reason, but we handle it anyway.
        const response = `data: {"choices":[{"text":"foo","index":0,"finish_reason":null}]}\n`;
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientIterationDone,
                chunks: ['foo'],
            },
        });
    });
    (0, vitest_1.test)('response with delta and without finish_reason or "[DONE]" yields "Iteration Done" result', async function () {
        // This is not an expected case, since the OpenAI API should always
        // include a finish_reason, but we handle it anyway.
        const response = `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":null}]}\n`;
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientIterationDone,
                chunks: ['foo'],
            },
        });
    });
    (0, vitest_1.test)('2 token text response with 1 index yields 1 result', async function () {
        const response = [
            `data: {"choices":[{"text":"foo","index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"bar","index":0,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo', 'bar'],
            },
        });
    });
    (0, vitest_1.test)('2 token delta response with 1 index yields 1 result', async function () {
        const response = [
            `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"delta":{"content":"bar"},"index":0,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo', 'bar'],
            },
        });
    });
    (0, vitest_1.test)('2 text token response with 2 indexes yields 2 results', async function () {
        const response = [
            `data: {"choices":[{"text":"foo","index":0,"finish_reason":"stop"}]}\n`,
            `data: {"choices":[{"text":"bar","index":1,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 2, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo'],
            },
            1: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['bar'],
            },
        });
    });
    (0, vitest_1.test)('2 delta token response with 2 indexes yields 2 results', async function () {
        const response = [
            `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":"stop"}]}\n`,
            `data: {"choices":[{"delta":{"content":"bar"},"index":1,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 2, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo'],
            },
            1: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['bar'],
            },
        });
    });
    (0, vitest_1.test)('text completions that finish with "content_filter" are returned', async function () {
        const response = [
            `data: {"choices":[{"text":"foo","index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"bar","index":0,"finish_reason":"content_filter"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ContentFilter,
                chunks: ['foo', 'bar'],
            },
        });
    });
    (0, vitest_1.test)('delta completions that finish with "content_filter" are returned, when drop completion reasons are empty', async function () {
        const response = [
            `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"delta":{"content":"bar"},"index":0,"finish_reason":"content_filter"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ContentFilter,
                chunks: ['foo', 'bar'],
            },
        });
    });
    (0, vitest_1.test)('n=1 text completion is truncated with finishedCb', async function () {
        const response = [
            `data: {"choices":[{"text":"foo\\n","index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"bar","index":0,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE(async () => 0));
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientTrimmed,
                chunks: ['foo\n'],
            },
        });
    });
    (0, vitest_1.test)('n=1 delta completion is truncated with finishedCb', async function () {
        const response = [
            `data: { "choices": [{ "delta": { "content": "foo\\n" }, "index": 0, "finish_reason": null }] }\n`,
            `data: { "choices": [{ "delta": { "content": "bar" }, "index": 0, "finish_reason": "stop" }] }\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE(async () => 0));
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientTrimmed,
                chunks: ['foo\n'],
            },
        });
    });
    (0, vitest_1.test)('n=2 text completion is truncated with finishedCb', async function () {
        const response = [
            `data: {"choices":[{"text":"foo\\n","index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"baz\\n","index":1,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"bar","index":0,"finish_reason":"stop"}]}\n`,
            `data: {"choices":[{"text":"quux","index":1,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 2, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE(async () => 0));
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientTrimmed,
                chunks: ['foo\n'],
            },
            1: {
                finishReason: openai_1.FinishedCompletionReason.ClientTrimmed,
                chunks: ['baz\n'],
            },
        });
    });
    (0, vitest_1.test)('n=2 delta completion is truncated with finishedCb', async function () {
        const response = [
            `data: {"choices":[{"delta":{"content":"foo\\n"},"index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"delta":{"content":"baz\\n"},"index":1,"finish_reason":null}]}\n`,
            `data: {"choices":[{"delta":{"content":"bar"},"index":0,"finish_reason":"stop"}]}\n`,
            `data: {"choices":[{"delta":{"content":"quux"},"index":1,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 2, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE(async () => 0));
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.ClientTrimmed,
                chunks: ['foo\n'],
            },
            1: {
                finishReason: openai_1.FinishedCompletionReason.ClientTrimmed,
                chunks: ['baz\n'],
            },
        });
    });
    (0, vitest_1.test)('issue #3331: finishedCb is invoked even without newline', async function () {
        const response = [
            `data: {"choices":[{"delta":{"content":"foo"},"index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"delta":{"content":"baz"},"index":1,"finish_reason":null}]}\n`,
            `data: {"choices":[{"delta":{"content":"bar"},"index":0,"finish_reason":"stop"}]}\n`,
            `data: {"choices":[{"delta":{"content":"quux"},"index":1,"finish_reason":"stop"}]}\n`,
            `data: [DONE]\n`
        ];
        let callCount = 0;
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 2, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE(async () => {
            callCount++;
            return undefined;
        }));
        vitest_1.assert.deepStrictEqual(callCount, 4);
        assertSimplifiedResultsEqual(results, {
            0: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['foo', 'bar'],
            },
            1: {
                finishReason: openai_1.FinishedCompletionReason.Stop,
                chunks: ['baz', 'quux'],
            },
        });
    });
    (0, vitest_1.test)('usage should be properly reported for text completions', async function () {
        const response = [
            `data: {"choices":[{"text":"foo","index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"bar","index":0,"finish_reason":"stop"}],"usage":{"completion_tokens":2,"prompt_tokens":358,"total_tokens":360}}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        vitest_1.assert.ok(results[0].usage);
        vitest_1.assert.strictEqual(results[0]?.usage?.completion_tokens, 2);
        vitest_1.assert.strictEqual(results[0]?.usage?.prompt_tokens, 358);
        vitest_1.assert.strictEqual(results[0]?.usage?.total_tokens, 360);
    });
    (0, vitest_1.test)('gracefully handle cancellation - do not emit completion without its usage', async function () {
        const response = [
            { shouldCancelStream: false, chunk: 'data: {"choices":[{"content_filter_results":{"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"hello"},"finish_reason":null,"index":0,"logprobs":null}],"created":1749821284,"id":"chatcmpl-BhyjslTwN48eOEj3LT3jsieMDRgRl","model":"gpt-4o-mini-2024-07-18","object":"chat.completion.chunk","system_fingerprint":"fp_57db37749c","usage":null}\n' },
            { shouldCancelStream: false, chunk: 'data: {"choices":[{"content_filter_results":{"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"world"},"finish_reason":null,"index":0,"logprobs":null}],"created":1749821284,"id":"chatcmpl-BhyjslTwN48eOEj3LT3jsieMDRgRl","model":"gpt-4o-mini-2024-07-18","object":"chat.completion.chunk","system_fingerprint":"fp_57db37749c","usage":null}\n' },
            { shouldCancelStream: true, chunk: 'data: {"choices":[{"content_filter_results":{},"delta":{},"finish_reason":"stop","index":0,"logprobs":null}],"created":1749821284,"id":"chatcmpl-BhyjslTwN48eOEj3LT3jsieMDRgRl","model":"gpt-4o-mini-2024-07-18","object":"chat.completion.chunk","system_fingerprint":"fp_57db37749c","usage":null}\n' },
            { shouldCancelStream: false, chunk: 'data: {"choices":[],"created":1749821284,"id":"chatcmpl-BhyjslTwN48eOEj3LT3jsieMDRgRl","model":"gpt-4o-mini-2024-07-18","object":"chat.completion.chunk","system_fingerprint":"fp_57db37749c","usage":{"completion_tokens":93,"completion_tokens_details":{"accepted_prediction_tokens":89,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"prompt_tokens":965,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":1058}}\n' },
            { shouldCancelStream: true, chunk: 'data: [DONE]\n' },
        ];
        const cts = new cancellation_1.CancellationTokenSource();
        const responseStream = (0, fetcher_1.createFakeStreamResponse)(response, cts);
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, responseStream, cts.token);
        const results = await getAll(processor.processSSE());
        (0, vitest_1.expect)(results).toMatchInlineSnapshot(`[]`);
    });
    (0, vitest_1.test)('usage as a separate chunk should propery be reported for text completions', async function () {
        const response = [
            `data: {"choices":[{"text":"foo","index":0,"finish_reason":null}]}\n`,
            `data: {"choices":[{"text":"bar","index":0,"finish_reason":"stop"}]}\n`,
            `data: {"choices": [], "usage":{"completion_tokens":2,"prompt_tokens":358,"total_tokens":360}}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        const results = await getAll(processor.processSSE());
        vitest_1.assert.ok(results[0].usage);
        vitest_1.assert.strictEqual(results[0]?.usage?.completion_tokens, 2);
        vitest_1.assert.strictEqual(results[0]?.usage?.prompt_tokens, 358);
        vitest_1.assert.strictEqual(results[0]?.usage?.total_tokens, 360);
    });
    (0, vitest_1.test)('stream containing cot_summary and cot_id', async function () {
        const response = [
            `data: {"choices":[],"created":0,"id":"","model":"","object":"","prompt_filter_results":[{"prompt_index":0,"content_filter_results":{"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}}}]}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"cot_summary":" "},"index":0}],"created":1751057335,"id":"","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"cot_summary":"Analy"},"index":0}],"created":1751057335,"id":"","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"cot_summary":"zing"},"index":0}],"created":1751057335,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"content":null,"refusal":null,"role":"assistant","tool_calls":[{"function":{"arguments":"","name":"read_file"},"id":"call_bNK0HIaqlEFyZK6wEz8bXDXJ","index":0,"type":"function"}]},"finish_reason":null,"index":0,"logprobs":null}],"created":1751242659,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"tool_calls":[{"function":{"arguments":"arg-part1"},"index":0}]},"finish_reason":null,"index":0,"logprobs":null}],"created":1751057334,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"tool_calls":[{"function":{"arguments":"arg-part2"},"index":0}]},"finish_reason":null,"index":0,"logprobs":null}],"created":1751057334,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{},"finish_reason":"tool_calls","index":0,"logprobs":null}],"created":1751057334,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"cot_id":"cot_a3074ac0-a8e8-4a55-bb5b-65cbb1648dcf"},"index":0}],"created":1751050807,"id":"","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        let thinkingText = undefined;
        let thinkingId = undefined;
        let metadata = undefined;
        await getAll(processor.processSSE((text, index, delta) => {
            if (delta.thinking && !(0, thinking_1.isEncryptedThinkingDelta)(delta.thinking)) {
                if (delta.thinking.text) {
                    if (thinkingText === undefined) {
                        thinkingText = '';
                    }
                    thinkingText += Array.isArray(delta.thinking.text) ? delta.thinking.text.join('') : delta.thinking.text;
                }
                if (delta.thinking.id) {
                    thinkingId = delta.thinking.id;
                }
                if (delta.thinking.metadata) {
                    metadata = delta.thinking.metadata;
                }
            }
            return Promise.resolve(undefined);
        }));
        (0, vitest_1.expect)(thinkingText).toBeDefined();
        (0, vitest_1.expect)(thinkingText).toBe(' Analyzing');
        (0, vitest_1.expect)(thinkingId).toBe('cot_a3074ac0-a8e8-4a55-bb5b-65cbb1648dcf');
        (0, vitest_1.expect)(metadata).toEqual({ toolId: 'call_bNK0HIaqlEFyZK6wEz8bXDXJ' });
    });
    (0, vitest_1.test)('stream containing only cot_id', async function () {
        const response = [
            `data: {"choices":[],"created":0,"id":"","model":"","object":"","prompt_filter_results":[{"prompt_index":0,"content_filter_results":{"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}}}]}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"content":null,"refusal":null,"role":"assistant","tool_calls":[{"function":{"arguments":"","name":"read_file"},"id":"call_bNK0HIaqlEFyZK6wEz8bXDXJ","index":0,"type":"function"}]},"finish_reason":null,"index":0,"logprobs":null}],"created":1751242659,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"tool_calls":[{"function":{"arguments":"arg-part1"},"index":0}]},"finish_reason":null,"index":0,"logprobs":null}],"created":1751057334,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"tool_calls":[{"function":{"arguments":"arg-part2"},"index":0}]},"finish_reason":null,"index":0,"logprobs":null}],"created":1751057334,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{},"finish_reason":"tool_calls","index":0,"logprobs":null}],"created":1751057334,"id":"chatcmpl-BnAIAsJndIJEfDlso8pzFD55XYEbc","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: {"choices":[{"content_filter_results":{},"delta":{"cot_id":"cot_a3074ac0-a8e8-4a55-bb5b-65cbb1648dcf"},"index":0}],"created":1751050807,"id":"","model":"","object":"chat.completion.chunk","system_fingerprint":"fp_ef29a3520f","usage":null}\n`,
            `data: [DONE]\n`,
        ];
        const processor = await stream_1.SSEProcessor.create(logService, telemetryService, 1, (0, fetcher_1.createFakeStreamResponse)(response));
        let thinkingText = undefined;
        let thinkingId = undefined;
        let metadata = undefined;
        await getAll(processor.processSSE((text, index, delta) => {
            if (delta.thinking && !(0, thinking_1.isEncryptedThinkingDelta)(delta.thinking)) {
                if (delta.thinking.text) {
                    if (thinkingText === undefined) {
                        thinkingText = '';
                    }
                    thinkingText += Array.isArray(delta.thinking.text) ? delta.thinking.text.join('') : delta.thinking.text;
                }
                if (delta.thinking.id) {
                    thinkingId = delta.thinking.id;
                }
                if (delta.thinking.metadata) {
                    metadata = delta.thinking.metadata;
                }
            }
            return Promise.resolve(undefined);
        }));
        (0, vitest_1.expect)(thinkingText).toBeUndefined();
        (0, vitest_1.expect)(thinkingId).toBe('cot_a3074ac0-a8e8-4a55-bb5b-65cbb1648dcf');
        (0, vitest_1.expect)(metadata).toBeUndefined();
    });
    (0, vitest_1.suite)('real world snapshots', () => {
        async function processResponse(response, expectedNumChoices = 1) {
            const { collection, finishedCb } = createSpyingFinishedCb();
            const processor = await stream_1.SSEProcessor.create(logService, telemetryService, expectedNumChoices, (0, fetcher_1.createFakeStreamResponse)(response));
            const results = await getAll(processor.processSSE(finishedCb));
            return { collection, results };
        }
        (0, vitest_1.test)('panel chat - plain text assistant reply', async () => {
            const response = [
                `data: {"choices":[],"created":0,"id":"","prompt_filter_results":[{"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"prompt_index":0}]}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"","role":"assistant"}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"Hello","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"!","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" How","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" can","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" I","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" assist","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" you","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" with","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" your","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" programming","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2257,"start_offset":2257,"end_offset":2312},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" needs","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2312,"start_offset":2262,"end_offset":2319},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" today","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":2312,"start_offset":2262,"end_offset":2319},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"?","role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: {"choices":[{"finish_reason":"stop","index":0,"content_filter_offsets":{"check_offset":2312,"start_offset":2262,"end_offset":2319},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":null,"role":null}}],"created":1717764806,"id":"chatcmpl-9XTNuRVy7pKFgXL5VsZKe5wfpiWQU"}\n`,
                `data: [DONE]\n`,
            ];
            const { collection, results } = await processResponse(response);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
        (0, vitest_1.test)('n > 1 - intent detector', async () => {
            const response = [
                `data: {"choices":[],"created":0,"id":"","prompt_filter_results":[{"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"prompt_index":0}]}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"","role":"assistant"}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"generate","role":null}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"finish_reason":"stop","index":0,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":null,"role":null}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"index":1,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"","role":"assistant"}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"index":1,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"generate","role":null}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"finish_reason":"stop","index":1,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":null,"role":null}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"index":2,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"","role":"assistant"}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"index":2,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"generate","role":null}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: {"choices":[{"finish_reason":"stop","index":2,"content_filter_offsets":{"check_offset":1811,"start_offset":1811,"end_offset":1819},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":null,"role":null}}],"created":1717766967,"id":"chatcmpl-9XTwlPjQvCcybmQxvS39Ouj4EEG89"}\n`,
                `data: [DONE]\n`,
            ];
            const { collection, results } = await processResponse(response, 3);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
        (0, vitest_1.test)('single function call', async function () {
            const response = [
                `data: {"choices":[],"created":0,"id":"","prompt_filter_results":[{"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"prompt_index":0}]}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":"assistant","function_call":{"arguments":"","name":"get_current_weather"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":"{\\n"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":" "}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":" \\""}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":"location"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":"\\":"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":" \\""}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":"Z"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":"\\"\\n"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":null,"function_call":{"arguments":"}"}}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: {"choices":[{"finish_reason":"function_call","index":0,"delta":{"content":null,"role":null}}],"created":1717591770,"id":"chatcmpl-9WkN0MexQZVb1yEgTn8jqMX24oHej"}\n`,
                `data: [DONE]\n`
            ];
            const { collection, results } = await processResponse(response);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
        (0, vitest_1.test)('single tool call', async function () {
            const response = [
                `data: {"choices":[],"created":0,"id":"","prompt_filter_results":[{"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"prompt_index":0}]}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"role":"assistant","tool_calls":[{"function":{"arguments":"","name":"copilot_searchCodebase"},"id":"call_ZQkSp6hzLvcGcH2L2CmaBkXM","index":0,"type":"function"}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"{\\""},"index":0}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"query"},"index":0}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\":\\""},"index":0}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"linked"},"index":0}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"list"},"index":0}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"}"},"index":0}]}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{"finish_reason":"tool_calls","index":0,"delta":{"content":null}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","usage":{"completion_tokens":0,"prompt_tokens":218,"total_tokens":218},"model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: [DONE]\n`,
            ];
            const { collection, results } = await processResponse(response);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
        (0, vitest_1.test)('single tool call with annotations attached', async function () {
            const response = [
                `data: {"choices":[],"created":0,"id":"","prompt_filter_results":[{"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"prompt_index":0}]}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"","name":"insert_edit_into_file"},"id":"call_YEMsUraDh71gogljRLa7vyGP","index":0,"type":"function"}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"{\\""},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"file"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"Path"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\":"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"/"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"tmp"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"/"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"astro"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"/src"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"/pages"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"/l"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"ists"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"/["},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"id"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"]/"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"index"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"."},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"astro"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\",\\""},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"code"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\":\\""},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"<"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"Url"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"List"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" />"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\",\\""},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"ex"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"planation"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\":\\""},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"Integr"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"ate"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" the"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" Url"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"List"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" component"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" into"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" the"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" list"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" view"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" page"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" to"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" display"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" and"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" manage"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":" URLs"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":".\\""},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "delta":{"content":null,"tool_calls":[{"function":{"arguments":"}"},"index":0}],"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: {"choices":[{ "index": 0, "finish_reason":"tool_calls","delta":{"content":null,"annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]},"copilot_annotations":{"CodeVulnerability":[{"id":0,"start_offset":20930,"end_offset":20930,"details":{"type":"general"},"citations":{}}]}}}],"created":1725925767,"id":"chatcmpl-A5iQJExrRR9lZjObeHBzjesQ5HvT1","usage":{"completion_tokens":0,"prompt_tokens":218,"total_tokens":218},"model":"gpt-4o-2024-05-13","system_fingerprint":"fp_80a1bad4c7"}\n`,
                `data: [DONE]\n`,
            ];
            const { collection, results } = await processResponse(response);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
        (0, vitest_1.test)('multiple tool calls', async function () {
            const response = [
                `data: {"choices":[{"index":0,"delta":{"content":"I","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":"'ll make two changes:","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":"\\n1. Ad","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":"d a multiply function to test","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":".js\\n2.","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":" Modify server.js","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":" to return a random","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":" dad joke from a","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"content_filter_offsets":{"check_offset":0,"start_offset":0,"end_offset":132},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"0"},"self_harm":{"filtered":false,"severity":"0"},"sexual":{"filtered":false,"severity":"0"},"violence":{"filtered":false,"severity":"0"}},"delta":{"content":" small collection","role":"assistant"}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"name":"edit_file"},"id":"tooluse_448k6WHnTpS28K0Bd1bhgA","index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"{\\"filePath"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\":\\"/Users"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"/roblou/"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"code/de"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"bugtest/"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"te"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"st.js"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\","},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"explanati"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"on\\":\\"Addi"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ng mu"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ltipl"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"y function\\""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":",\\"code\\""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":":\\"// ..."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"existing cod"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"e."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"..\\\\n\\nfu"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"nctio"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"n mult"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"iply(a, b)"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" {\\\\n    re"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"turn a * b;"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\\\\\"}"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"name":"edit_file"},"id":"tooluse_2SRF2HShTXOoLdGrjWuGiw","index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"filePath\\""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":":\\"/Use"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"rs/roblou/c"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ode/de"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"bugtest/serv"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"er.js"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\","},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"explana"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"tion\\":\\""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"Addin"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"g dad jok"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"es functi"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"onality\\""},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":",\\"code\\": "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"const ht"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"tp = requ"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ire('http'"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":");\\\\"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"n\\\\"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"nconst"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" dadJokes ="},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" [\\\\n "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"   'Why don\\\\"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\\\'t eggs "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"tel"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"l jokes? Th"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ey"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\\\'d c"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ra"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ck up!',"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\\\n    'W"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ha"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"t d"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"o you call"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" a "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"fak"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"e noo"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"dle? A"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"n im"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"pasta!',\\\\n"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"    '"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"Why di"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"d the"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" s"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"carecrow w"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"in "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"an award"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"? Beca"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"use"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" he was "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"outstandi"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ng in his f"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ield!'\\\\n]"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":";\\\\n\\\\nconst "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"server ="},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" http.creat"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"eS"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"erver("},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"(req, r"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"es) =\u003e"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" {\\\\n    c"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"onsol"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"e.log(\`"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c - 7de2 - 485b - 87cd - 6ff61c58407e","model":"claude - 3.5 - sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\${r"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c - 7de2 - 485b - 87cd - 6ff61c58407e","model":"claude - 3.5 - sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"eq."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"method"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"} \${r"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c - 7de2 - 485b - 87cd - 6ff61c58407e","model":"claude - 3.5 - sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"eq.url}\`"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c - 7de2 - 485b - 87cd - 6ff61c58407e","model":"claude - 3.5 - sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":");\\\\n    c"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"onst random"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"Joke"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":" = dadJok"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"es[Math."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"floo"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"r(Math."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"random() * d"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"adJokes.len"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"gth)];\\\\n    "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"res.statu"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"sCode = 2"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"00;\\\\n    "},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"res"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":".setH"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ea"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"de"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"r("},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"'Content"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"-Type', 'tex"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"t/plai"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"n')"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":";\\\\"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"n    res."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"end("},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\`\${ r"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c - 7de2- 485b - 87cd - 6ff61c58407e","model":"claude - 3.5 - sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"andom"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"Jo"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"ke}\\\\\\n\`); \\\\"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c - 7de2 - 485b - 87cd - 6ff61c58407e","model":"claude - 3.5 - sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"n})"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":";\\\\n\\\\n"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"// .."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":".ex"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"isting code"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"..."},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"index":0,"delta":{"content":null,"tool_calls":[{"function":{"arguments":"\\"}"},"index":0,"type":"function"}]}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","model":"claude-3.5-sonnet"}\n`,
                `data: {"choices":[{"finish_reason":"tool_calls","index":0,"delta":{"content":null}}],"created":1741911507,"id":"ba49856c-7de2-485b-87cd-6ff61c58407e","usage":{"completion_tokens":170,"prompt_tokens":2128,"total_tokens":2298},"model":"claude-3.5-sonnet"}\n`,
                `data: [DONE]`,
            ];
            const { collection, results } = await processResponse(response);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
        (0, vitest_1.test)('stream from @github (bing-search skill)', async function () {
            const response = [
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"","name":"bing-search"},"role":"assistant"},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"{\\n"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" "},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" \\""},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"query"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"\\":"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" \\""},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"current"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" LTS"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" version"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" of"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":" Node"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":".js"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"\"\\n"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"function_call":{"arguments":"}"},"role":null},"index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":null,"role":null},"finish_reason":"function_call","index":0}],"created":1717665636,"id":"chatcmpl-9X3aOY9DtjweQLHsmnLgzQYg36KpW"}\n`,
                `data: {"choices":[{"delta":{"content":"[{\\"type\\":\\"github.web-search\\",\\"data\\":{\\"query\\":\\"current LTS version of Node.js\\",\\"results\\":[{\\"title\\":\\"Node.js — Node v20.9.0 (LTS)\\",\\"excerpt\\":\\"2023-10-24, Version 20.9.0 'Iron' (LTS), @richardlau Notable Changes. This release marks the transition of Node.js 20.x into Long Term Support (LTS) with the codename 'Iron'. The 20.x release line now moves into \\\\"Active LTS\\\\" and will remain so until October 2024. After that time, it will move into \\\\"Maintenance\\\\" until end of life in April 2026.\\",\\"url\\":\\"https://nodejs.org/en/blog/release/v20.9.0\\"}],\\"type\\":\\"web-search\\"},\\"id\\":\\"web-search: current LTS version of Node.js\\",\\"metadata\\":{\\"display_name\\":\\"web-search: current LTS version of Node.js\\",\\"display_icon\\":\\"\\"}}]","name":"bing-search","role":"function"},"index":0}],"copilot_references":[{"type":"github.web-search","data":{"query":"current LTS version of Node.js","results":[{"title":"Node.js — Node v20.9.0 (LTS)","excerpt":"2023-10-24, Version 20.9.0 'Iron' (LTS), @richardlau Notable Changes. This release marks the transition of Node.js 20.x into Long Term Support (LTS) with the codename 'Iron'. The 20.x release line now moves into \\"Active LTS\\" and will remain so until October 2024. After that time, it will move into \\"Maintenance\\" until end of life in April 2026.","url":"https://nodejs.org/en/blog/release/v20.9.0"}],"type":"web-search"},"id":"web-search: current LTS version of Node.js","metadata":{"display_name":"web-search: current LTS version of Node.js","display_icon":""}}],"id":null}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"","role":"assistant"},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"The","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" current","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" LTS","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" version","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" of","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" Node","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".js","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" is","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" ","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"20","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"9","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"0","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":",","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" cod","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2897,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"en","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"amed","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" '","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"Iron","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"'.","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" This","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" version","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" transition","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"ed","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" into","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" Long","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":2950,"start_offset":2847},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" Term","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" Support","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" (","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"L","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"TS","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":")","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" on","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" ","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"202","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"3","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"-","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"10","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"-","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"24","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" and","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" will","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" remain","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" in","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" \\"","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3005,"start_offset":2900},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"Active","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" LTS","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"\\"","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" until","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" October","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" ","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"202","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"4","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" After","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" that","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":",","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" it","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" will","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3055,"start_offset":2955},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" move","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" into","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" \\"","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"Maintenance","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"\\"","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" until","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" its","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" end","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" of","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" life","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" in","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3105,"start_offset":3005},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" April","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" ","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"202","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"6","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" Here","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" is","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" the","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" official","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" [","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"Node","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".js","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" release","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":" note","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3156,"start_offset":3055},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"](","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"https","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"://","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"node","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"js","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".org","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"/en","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"/blog","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"/release","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"/v","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"20","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"9","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":".","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":"0","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":").","role":null},"index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: {"choices":[{"content_filter_offsets":{"check_offset":2846,"end_offset":3200,"start_offset":2846},"content_filter_results":{"error":{"code":"","message":""},"hate":{"filtered":false,"severity":"safe"},"self_harm":{"filtered":false,"severity":"safe"},"sexual":{"filtered":false,"severity":"safe"},"violence":{"filtered":false,"severity":"safe"}},"delta":{"content":null,"role":null},"finish_reason":"stop","index":0}],"created":1717665639,"id":"chatcmpl-9X3aRdsbP7uuiG9OUVdrm0eYD66rp"}\n`,
                `data: [DONE]\n`,
            ];
            const { collection, results } = await processResponse(response, 2);
            (0, vitest_1.expect)(JSON.stringify(collection, null, '\t')).toMatchSnapshot('finishedCallback chunks');
            (0, vitest_1.expect)(JSON.stringify(results, null, '\t')).toMatchSnapshot('completion results');
        });
    });
});
//# sourceMappingURL=stream.sseProcessor.spec.js.map