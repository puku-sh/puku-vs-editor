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
exports.SnippyFetchService = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const errors_1 = require("../../../util/vs/base/common/errors");
const authentication_1 = require("../../authentication/common/authentication");
const capiClient_1 = require("../../endpoint/common/capiClient");
const fetcherService_1 = require("../../networking/common/fetcherService");
const types = __importStar(require("./snippyTypes"));
let SnippyFetchService = class SnippyFetchService {
    constructor(fetcherService, capiClientService, authService) {
        this.fetcherService = fetcherService;
        this.capiClientService = capiClientService;
        this.authService = authService;
    }
    async fetchMatch(source, cancellationToken) {
        const body = {
            source
        };
        return this.fetch({ type: pukuRequestTypes_1.RequestType.SnippyMatch }, body, types.MatchResponse.to, cancellationToken);
    }
    async fetchFilesForMatch(cursor, cancellationToken) {
        const body = {
            cursor,
        };
        return this.fetch({ type: pukuRequestTypes_1.RequestType.SnippyFilesForMatch }, body, types.FileMatchResponse.to, cancellationToken);
    }
    /**
     * @throws {CancellationError} if the request is cancelled
     * @throws {Error} if the request fails
     */
    async fetch(requestMetadata, requestBody, processResponse, cancellationToken) {
        const abortController = this.fetcherService.makeAbortController();
        const disposable = cancellationToken.onCancellationRequested(() => {
            abortController.abort();
        });
        const signal = abortController.signal;
        const headers = await this.getHeaders();
        const options = {
            method: 'POST',
            headers,
            json: requestBody,
            signal,
        };
        let fetchResponse;
        try {
            fetchResponse = await this.capiClientService.makeRequest(options, requestMetadata);
        }
        catch (e) {
            if (this.fetcherService.isAbortError(e)) {
                throw new errors_1.CancellationError();
            }
            throw e;
        }
        finally {
            disposable.dispose();
        }
        if (fetchResponse.status !== 200) {
            throw new Error(`Failed with status ${fetchResponse.status} and body: ${await fetchResponse.text()}`);
        }
        const responseBody = await fetchResponse.json();
        return processResponse(responseBody);
    }
    async getHeaders() {
        const token = (await this.authService.getCopilotToken()).token;
        return {
            authorization: `Bearer ${token}`
        };
    }
};
exports.SnippyFetchService = SnippyFetchService;
exports.SnippyFetchService = SnippyFetchService = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, authentication_1.IAuthenticationService)
], SnippyFetchService);
//# sourceMappingURL=snippyFetcher.js.map