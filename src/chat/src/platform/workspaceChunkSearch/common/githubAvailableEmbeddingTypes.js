"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.MockGithubAvailableEmbeddingTypesService = exports.GithubAvailableEmbeddingTypesService = exports.IGithubAvailableEmbeddingTypesService = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const crypto_1 = require("../../../util/common/crypto");
const result_1 = require("../../../util/common/result");
const services_1 = require("../../../util/common/services");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const process_1 = require("../../../util/vs/base/common/process");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const authentication_1 = require("../../authentication/common/authentication");
const chunkingEndpointClientImpl_1 = require("../../chunking/common/chunkingEndpointClientImpl");
const configurationService_1 = require("../../configuration/common/configurationService");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const capiClient_1 = require("../../endpoint/common/capiClient");
const envService_1 = require("../../env/common/envService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
exports.IGithubAvailableEmbeddingTypesService = (0, services_1.createServiceIdentifier)('IGithubAvailableEmbeddingTypesService');
let GithubAvailableEmbeddingTypesService = class GithubAvailableEmbeddingTypesService {
    constructor(_logService, _authService, _telemetryService, _capiClientService, _envService, _fetcherService, _configurationService, _experimentationService) {
        this._logService = _logService;
        this._authService = _authService;
        this._telemetryService = _telemetryService;
        this._capiClientService = _capiClientService;
        this._envService = _envService;
        this._fetcherService = _fetcherService;
        this._configurationService = _configurationService;
        this._experimentationService = _experimentationService;
        this._cached = this._authService.getAnyGitHubSession({ silent: true }).then(session => {
            if (!session) {
                return result_1.Result.error({ type: 'noSession' });
            }
            return this.doGetAvailableTypes(session.accessToken);
        });
    }
    async getAllAvailableTypes(silent) {
        if (this._cached) {
            const oldCached = this._cached;
            try {
                const cachedResult = await this._cached;
                if (cachedResult.isOk()) {
                    return cachedResult;
                }
            }
            catch {
                // noop
            }
            if (this._cached === oldCached) {
                this._cached = undefined;
            }
        }
        this._cached ??= (async () => {
            const anySession = await this._authService.getAnyGitHubSession({ silent });
            if (!anySession) {
                return result_1.Result.error({ type: 'noSession' });
            }
            const initialResult = await this.doGetAvailableTypes(anySession.accessToken);
            if (initialResult.isOk()) {
                return initialResult;
            }
            const permissiveSession = await this._authService.getPermissiveGitHubSession({ silent, createIfNone: !silent ? true : undefined });
            if (!permissiveSession) {
                return initialResult;
            }
            return this.doGetAvailableTypes(permissiveSession.accessToken);
        })();
        return this._cached;
    }
    async doGetAvailableTypes(token) {
        let response;
        try {
            response = await (0, networking_1.getRequest)(this._fetcherService, this._telemetryService, this._capiClientService, { type: pukuRequestTypes_1.RequestType.EmbeddingsModels }, token, await (0, crypto_1.createRequestHMAC)(process_1.env.HMAC_SECRET), 'copilot-panel', (0, uuid_1.generateUuid)(), undefined, (0, chunkingEndpointClientImpl_1.getGithubMetadataHeaders)(new telemetryCorrelationId_1.CallTracker(), this._envService));
        }
        catch (e) {
            this._logService.error('Error fetching available embedding types', e);
            return result_1.Result.error({
                type: 'requestFailed',
                error: e
            });
        }
        if (!response.ok) {
            /* __GDPR__
                "githubAvailableEmbeddingTypes.getAvailableTypes.error" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed githubAvailableEmbeddingTypes calls",
                    "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getAvailableTypes.error', {}, {
                statusCode: response.status,
            });
            // Also treat 404s as unauthorized since this typically indicates that the user is anonymous
            if (response.status === 401 || response.status === 404) {
                return result_1.Result.error({ type: 'unauthorized', status: response.status });
            }
            return result_1.Result.error({
                type: 'badResponse',
                status: response.status
            });
        }
        const jsonResponse = await response.json();
        const primary = [];
        const deprecated = [];
        for (const model of jsonResponse.models) {
            const resolvedType = new embeddingsComputer_1.EmbeddingType(model.id);
            if (model.active === false) {
                deprecated.push(resolvedType);
            }
            else {
                primary.push(resolvedType);
            }
        }
        /* __GDPR__
            "githubAvailableEmbeddingTypes.getAvailableTypes.success" : {
                "owner": "mjbvz",
                "comment": "Information about successful githubAvailableEmbeddingTypes calls",
                "primaryEmbeddingTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "List of primary embedding types" },
                "deprecatedEmbeddingTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "List of deprecated embedding types" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getAvailableTypes.success', {
            primaryEmbeddingTypes: primary.map(type => type.id).join(','),
            deprecatedEmbeddingTypes: deprecated.map(type => type.id).join(','),
        });
        return result_1.Result.ok({ primary, deprecated });
    }
    async getPreferredType(silent) {
        const result = await this.getAllAvailableTypes(silent);
        if (!result.isOk()) {
            this._logService.info(`GithubAvailableEmbeddingTypesManager: Could not find any available embedding types. Error: ${result.err.type}`);
            /* __GDPR__
                "githubAvailableEmbeddingTypes.getPreferredType.error" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed githubAvailableEmbeddingTypes calls",
                    "error": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The reason why the request failed" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getPreferredType.error', {
                error: result.err.type,
            });
            return undefined;
        }
        const all = result.val;
        this._logService.info(`GithubAvailableEmbeddingTypesManager: Got embeddings. Primary: ${all.primary.join(',')}. Deprecated: ${all.deprecated.join(',')}`);
        const preference = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspacePreferredEmbeddingsModel, this._experimentationService);
        if (preference) {
            const preferred = [...all.primary, ...all.deprecated].find(type => type.id === preference);
            if (preferred) {
                return preferred;
            }
        }
        return all.primary.at(0) ?? all.deprecated.at(0);
    }
};
exports.GithubAvailableEmbeddingTypesService = GithubAvailableEmbeddingTypesService;
exports.GithubAvailableEmbeddingTypesService = GithubAvailableEmbeddingTypesService = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, capiClient_1.ICAPIClientService),
    __param(4, envService_1.IEnvService),
    __param(5, fetcherService_1.IFetcherService),
    __param(6, configurationService_1.IConfigurationService),
    __param(7, nullExperimentationService_1.IExperimentationService)
], GithubAvailableEmbeddingTypesService);
class MockGithubAvailableEmbeddingTypesService {
    async getPreferredType(_silent) {
        return embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary;
    }
}
exports.MockGithubAvailableEmbeddingTypesService = MockGithubAvailableEmbeddingTypesService;
//# sourceMappingURL=githubAvailableEmbeddingTypes.js.map