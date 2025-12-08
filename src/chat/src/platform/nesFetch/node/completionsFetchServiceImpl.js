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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionsFetchService = void 0;
const stream_1 = require("stream");
const stream_consumers = __importStar(require("stream/consumers"));
const result_1 = require("../../../util/common/result");
const async_1 = require("../../../util/vs/base/common/async");
const objects_1 = require("../../../util/vs/base/common/objects");
const authentication_1 = require("../../authentication/common/authentication");
const fetcherService_1 = require("../../networking/common/fetcherService");
const responseStream_1 = require("../common/responseStream");
const streamTransformer_1 = require("./streamTransformer");
let CompletionsFetchService = class CompletionsFetchService {
    constructor(authService, fetcherService) {
        this.authService = authService;
        this.fetcherService = fetcherService;
    }
    async fetch(url, secretKey, params, requestId, ct, headerOverrides) {
        if (ct.isCancellationRequested) {
            return result_1.Result.error({ kind: 'cancelled' });
        }
        const options = {
            requestId,
            headers: this.getHeaders(requestId, secretKey, headerOverrides),
            body: {
                ...params,
                stream: true,
            }
        };
        const fetchResponse = await this._fetchFromUrl(url, options, ct);
        if (fetchResponse.isError()) {
            return fetchResponse;
        }
        if (fetchResponse.val.status === 200) {
            const jsonlStream = (0, streamTransformer_1.streamToLines)(fetchResponse.val.body);
            const completionsStream = (0, streamTransformer_1.jsonlStreamToCompletions)(jsonlStream);
            const completions = completionsStream.map(completion => {
                return {
                    ...completion,
                    choices: completion.choices.filter(choice => choice.index === 0),
                };
            }).filter(c => {
                return c.choices.length > 0;
            }); // we only support `n=1`, so we only get choice.index = 0
            const response = new responseStream_1.ResponseStream(completions);
            return result_1.Result.ok(response);
        }
        else {
            const body = await stream_consumers.text(fetchResponse.val.body);
            if (body.match(/This model's maximum context length is /)) {
                return result_1.Result.error({ kind: 'context-window-exceeded', message: body });
            }
            if (body.match(/Access denied due to invalid subscription key or wrong API endpoint/) || fetchResponse.val.status === 401 || fetchResponse.val.status === 403) {
                return result_1.Result.error({ kind: 'invalid-api-key', message: body });
            }
            if (body.match(/exceeded call rate limit/)) {
                return result_1.Result.error({ kind: 'exceeded-rate-limit', message: body });
            }
            const error = {
                kind: 'not-200-status',
                status: fetchResponse.val.status,
                statusText: fetchResponse.val.statusText,
            };
            return result_1.Result.error(error);
        }
    }
    async _fetchFromUrl(url, options, ct) {
        const fetchAbortCtl = this.fetcherService.makeAbortController();
        const onCancellationDisposable = ct.onCancellationRequested(() => {
            fetchAbortCtl.abort();
        });
        try {
            const response = await this.fetcherService.fetch(url, {
                headers: options.headers,
                json: options.body,
                signal: fetchAbortCtl.signal,
                method: 'POST',
            });
            if (response.status === 200 && this.authService.copilotToken?.isFreeUser && this.authService.copilotToken?.isChatQuotaExceeded) {
                this.authService.resetCopilotToken();
            }
            if (response.status !== 200) {
                if (response.status === 402) {
                    // When we receive a 402, we have exceed the free tier quota
                    // This is stored on the token so let's refresh it
                    this.authService.resetCopilotToken(response.status);
                    return result_1.Result.error({ kind: 'quota-exceeded' });
                }
                const error = {
                    kind: 'not-200-status',
                    status: response.status,
                    statusText: response.statusText,
                };
                return result_1.Result.error(error);
            }
            const responseBody = await response.body();
            const body = (responseBody instanceof stream_1.Readable
                ? responseBody
                : (responseBody
                    ? new stream_1.Readable().wrap(responseBody)
                    : new stream_1.Readable()));
            body.setEncoding('utf8');
            const responseStream = new async_1.AsyncIterableObject(async (emitter) => {
                try {
                    for await (const str of body) {
                        emitter.emitOne(str);
                    }
                }
                catch (err) {
                    if (!(err instanceof Error)) {
                        throw new Error((0, objects_1.safeStringify)(err));
                    }
                    if (this.fetcherService.isAbortError(err) || err.name === 'AbortError') {
                        // stream aborted - ignore
                    }
                    else if (err.message === 'ERR_HTTP2_STREAM_ERROR' ||
                        err.code === 'ERR_HTTP2_STREAM_ERROR') {
                        // stream closed - ignore
                    }
                    else {
                        throw err;
                    }
                }
                finally {
                    onCancellationDisposable.dispose();
                }
            });
            return result_1.Result.ok({
                status: response.status,
                statusText: response.statusText,
                headers: headersObjectToKv(response.headers),
                body: responseStream,
            });
        }
        catch (reason) { // TODO: replace with unknown with proper error handling
            onCancellationDisposable.dispose();
            if (reason instanceof Error && reason.message === 'This operation was aborted') {
                return result_1.Result.error({ kind: 'cancelled', errorMessage: reason.message });
            }
            if (reason.code === 'ECONNRESET' ||
                reason.code === 'ETIMEDOUT' ||
                reason.code === 'ERR_HTTP2_INVALID_SESSION' ||
                reason.message === 'ERR_HTTP2_GOAWAY_SESSION' ||
                reason.code === '429') {
                return result_1.Result.error({ kind: 'model_overloaded', errorMessage: reason.message });
            }
            else {
                return result_1.Result.error({ kind: 'model_error', errorMessage: reason.message });
            }
        }
    }
    getHeaders(requestId, secretKey, headerOverrides = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'x-policy-id': 'nil',
            Authorization: 'Bearer ' + secretKey,
            'X-Request-Id': requestId,
            'X-GitHub-Api-Version': '2025-04-01',
            ...headerOverrides,
        };
        return headers;
    }
};
exports.CompletionsFetchService = CompletionsFetchService;
exports.CompletionsFetchService = CompletionsFetchService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, fetcherService_1.IFetcherService)
], CompletionsFetchService);
function headersObjectToKv(headers) {
    const result = {};
    for (const [name, value] of headers) {
        result[name] = value;
    }
    return result;
}
//# sourceMappingURL=completionsFetchServiceImpl.js.map