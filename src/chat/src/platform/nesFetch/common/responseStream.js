"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseStream = void 0;
const result_1 = require("../../../util/common/result");
const async_1 = require("../../../util/vs/base/common/async");
const objects_1 = require("../../../util/vs/base/common/objects");
const types_1 = require("../../../util/vs/base/common/types");
class ResponseStream {
    constructor(stream) {
        const tokensDeferredPromise = new async_1.DeferredPromise();
        this.aggregatedStream = tokensDeferredPromise.p;
        this.response = this.aggregatedStream.then((completions) => {
            if (completions.isError()) {
                return completions;
            }
            try {
                return result_1.Result.ok(ResponseStream.aggregateCompletionsStream(completions.val));
            }
            catch (err) {
                return result_1.Result.error(err);
            }
        });
        this.stream = new async_1.AsyncIterableObject(async (emitter) => {
            const completions = [];
            let error;
            try {
                for await (const completion of stream) {
                    completions.push(completion);
                    emitter.emitOne(completion);
                }
            }
            catch (e) {
                if (e instanceof Error) {
                    error = e;
                }
                else {
                    error = new Error((0, objects_1.safeStringify)(e));
                }
                emitter.reject(e);
            }
            finally {
                tokensDeferredPromise.complete(error ? result_1.Result.error(error) : result_1.Result.ok(completions));
            }
        });
    }
    static aggregateCompletionsStream(stream) {
        let text = '';
        let finishReason = null;
        let aggregatedLogsProbs = null;
        let aggregatedUsage = undefined;
        for (const completion of stream) {
            const choice = completion.choices[0]; // TODO@ulugbekna: we only support choice.index=0
            text += choice.text ?? '';
            if (choice.logprobs) {
                if (aggregatedLogsProbs === null) {
                    aggregatedLogsProbs = {
                        tokens: [...choice.logprobs.tokens],
                        token_logprobs: [...choice.logprobs.token_logprobs],
                        text_offset: [...choice.logprobs.text_offset],
                        top_logprobs: [...choice.logprobs.top_logprobs],
                    };
                }
                else {
                    aggregatedLogsProbs.tokens.push(...choice.logprobs.tokens);
                    aggregatedLogsProbs.token_logprobs.push(...choice.logprobs.token_logprobs);
                    aggregatedLogsProbs.text_offset.push(...choice.logprobs.text_offset);
                    aggregatedLogsProbs.top_logprobs.push(...choice.logprobs.top_logprobs);
                }
            }
            if (completion.usage) {
                if (aggregatedUsage === undefined) {
                    aggregatedUsage = {
                        completion_tokens: completion.usage.completion_tokens,
                        prompt_tokens: completion.usage.prompt_tokens,
                        total_tokens: completion.usage.total_tokens,
                        completion_tokens_details: {
                            audio_tokens: completion.usage.completion_tokens_details.audio_tokens,
                            reasoning_tokens: completion.usage.completion_tokens_details.reasoning_tokens,
                        },
                        prompt_tokens_details: {
                            audio_tokens: completion.usage.prompt_tokens_details.audio_tokens,
                            reasoning_tokens: completion.usage.prompt_tokens_details.reasoning_tokens,
                        }
                    };
                }
                else {
                    aggregatedUsage.completion_tokens += completion.usage.completion_tokens;
                    aggregatedUsage.prompt_tokens += completion.usage.prompt_tokens;
                    aggregatedUsage.total_tokens += completion.usage.total_tokens;
                    aggregatedUsage.completion_tokens_details.audio_tokens += completion.usage.completion_tokens_details.audio_tokens;
                    aggregatedUsage.completion_tokens_details.reasoning_tokens += completion.usage.completion_tokens_details.reasoning_tokens;
                    aggregatedUsage.prompt_tokens_details.audio_tokens += completion.usage.prompt_tokens_details.audio_tokens;
                    aggregatedUsage.prompt_tokens_details.reasoning_tokens += completion.usage.prompt_tokens_details.reasoning_tokens;
                }
            }
            if (choice.finish_reason) {
                (0, types_1.assertType)(finishReason === null, 'cannot already have finishReason if just seeing choice.finish_reason');
                finishReason = choice.finish_reason;
            }
        }
        if (stream.length === 0) {
            throw new Error(`Response is empty!`);
        }
        const completion = stream[0];
        const choice = {
            index: 0,
            finish_reason: finishReason,
            logprobs: aggregatedLogsProbs,
            text,
        };
        const aggregatedCompletion = {
            choices: [choice],
            system_fingerprint: completion.system_fingerprint,
            object: completion.object,
            usage: aggregatedUsage,
        };
        return aggregatedCompletion;
    }
}
exports.ResponseStream = ResponseStream;
//# sourceMappingURL=responseStream.js.map