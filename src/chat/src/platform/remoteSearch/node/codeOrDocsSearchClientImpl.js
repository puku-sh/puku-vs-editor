"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocsSearchClient = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const crypto_1 = require("../../../util/common/crypto");
const tokenizer_1 = require("../../../util/common/tokenizer");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const authentication_1 = require("../../authentication/common/authentication");
const capiClient_1 = require("../../endpoint/common/capiClient");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const telemetry_1 = require("../../telemetry/common/telemetry");
const codeOrDocsSearchErrors_1 = require("../common/codeOrDocsSearchErrors");
const utils_1 = require("../common/utils");
class UnknownHttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 100;
const DEFAULT_SIMILARITY = 0.766;
let DocsSearchClient = class DocsSearchClient {
    constructor(_capiClientService, _telemetryService, _authenticationService, _fetcherService, _logService) {
        this._capiClientService = _capiClientService;
        this._telemetryService = _telemetryService;
        this._authenticationService = _authenticationService;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this.slug = 'docs';
    }
    async search(query, scopingQuery, options = {}, token) {
        // Code search requires at least one repo specified
        if (Array.isArray(scopingQuery.repo) && !scopingQuery.repo.length) {
            throw new Error('No repos specified');
        }
        let result;
        try {
            result = await this.postRequestWithRetry(query, scopingQuery, options, token ?? cancellation_1.CancellationToken.None);
        }
        catch (error) {
            if (!(0, errors_1.isCancellationError)(error)) {
                this._telemetryService.sendGHTelemetryException(error, `${this.slug} search failed`);
            }
            throw error;
        }
        const errors = result.errors?.map(codeOrDocsSearchErrors_1.constructSearchRepoError) ?? [];
        // If we're in single repo mode, we will throw errors. If not, we're return a similar shape
        if (!Array.isArray(scopingQuery.repo)) {
            if (errors.length) {
                // TODO: Can this happen?
                if (errors.length > 1) {
                    throw new AggregateError(errors);
                }
                else {
                    throw errors[0];
                }
            }
            return result.results;
        }
        // Multi-repo
        return {
            results: result.results,
            errors
        };
    }
    async postRequestWithRetry(query, scopingQuery, options, token) {
        const authToken = (await this._authenticationService.getPermissiveGitHubSession({ silent: true }))?.accessToken ?? (await this._authenticationService.getAnyGitHubSession({ silent: true }))?.accessToken;
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        const MAX_RETRIES = 3;
        let retryCount = 0;
        const errorMessages = new Set;
        let error;
        while (retryCount < MAX_RETRIES) {
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
            try {
                try {
                    const result = await this.postCodeOrDocsSearchRequest({ type: pukuRequestTypes_1.RequestType.SearchSkill, slug: this.slug }, authToken, query, scopingQuery, options, token);
                    return result;
                }
                catch (e) {
                    if (e instanceof UnknownHttpError) {
                        throw e;
                    }
                    error = e;
                    break;
                }
            }
            catch (error) {
                retryCount++;
                const waitTime = 100;
                errorMessages.add(`Error fetching ${this.slug} search. ${error.message ?? error}`);
                this._logService.warn(`[repo:${scopingQuery.repo}] Error fetching ${this.slug} search. Error: ${error.message ?? error}. Retrying in ${retryCount}ms. Query: ${query}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        if (retryCount >= MAX_RETRIES) {
            this._logService.warn(`[repo:${scopingQuery.repo}] Max Retry Error thrown while querying '${query}'`);
            error = (0, codeOrDocsSearchErrors_1.constructSearchError)({
                error: "ERROR_TYPE_MAX_RETRIES_EXCEEDED" /* SearchErrorType.maxRetriesExceeded */,
                message: `${this.slug} search timed out after ${MAX_RETRIES} retries. ${Array.from(errorMessages).join('\n')}`
            });
        }
        throw error;
    }
    async postCodeOrDocsSearchRequest(requestMetadata, authToken, query, scopingQuery, options, cancellationToken) {
        const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
        const similarity = options.similarity ?? DEFAULT_SIMILARITY;
        const endpointInfo = {
            urlOrRequestMetadata: requestMetadata,
            tokenizer: tokenizer_1.TokenizerType.O200K,
            acquireTokenizer() {
                throw new Error('Method not implemented.');
            },
            family: 'Code Or Doc Search',
            name: 'Code Or Doc Search',
            version: '2023-12-12-preview',
            modelMaxPromptTokens: 0,
            getExtraHeaders() {
                const headers = {
                    // needed for errors to be in the right format
                    // TODO: should this be the default of postRequest?
                    Accept: 'application/json',
                    'X-GitHub-Api-Version': '2023-12-12-preview',
                };
                return headers;
            },
        };
        const response = await (0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, endpointInfo, authToken ?? '', await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), 'codesearch', (0, uuid_1.generateUuid)(), {
            query,
            scopingQuery: (0, utils_1.formatScopingQuery)(scopingQuery),
            similarity,
            limit
        }, undefined, cancellationToken);
        const text = await response.text();
        if (response.status === 404 || (response.status === 400 && text.includes('unknown integration'))) {
            // If the endpoint is not available for this user it will return 404.
            this._logService.debug(`${this.slug} search endpoint not available for this user.`);
            const error = (0, codeOrDocsSearchErrors_1.constructSearchError)({
                error: "ERROR_TYPE_NO_ACCESS_TO_ENDPOINT" /* SearchErrorType.noAccessToEndpoint */,
                message: `${this.slug}: ${text}`
            });
            throw error;
        }
        let result;
        try {
            // handle 500s specifically (like blackbird queries)
            result = JSON.parse(text);
        }
        catch (e) {
            // try again in the 500 case
            throw new UnknownHttpError(response.status, text);
        }
        return result;
    }
};
exports.DocsSearchClient = DocsSearchClient;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeOrDocsSearchClientImpl::search')
], DocsSearchClient.prototype, "search", null);
exports.DocsSearchClient = DocsSearchClient = __decorate([
    __param(0, capiClient_1.ICAPIClientService),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, logService_1.ILogService)
], DocsSearchClient);
//# sourceMappingURL=codeOrDocsSearchClientImpl.js.map