"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Puku AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPIClient = void 0;
const pukuRequestTypes_1 = require("./pukuRequestTypes");
/**
 * Domain service for managing API endpoints
 */
class DomainService {
    constructor() {
        this._capiUrl = 'https://api.githubcopilot.com';
        this._telemetryUrl = 'https://copilot-telemetry.githubusercontent.com';
        this._dotcomUrl = 'https://api.github.com';
        this._proxyUrl = 'https://copilot-proxy.githubusercontent.com';
        this._originTrackerUrl = 'https://origin-tracker.githubusercontent.com';
    }
    updateDomains(copilotToken, enterpriseUrlConfig) {
        const result = {
            capiUrlChanged: false,
            telemetryUrlChanged: false,
            dotcomUrlChanged: false,
            proxyUrlChanged: false
        };
        if (copilotToken?.endpoints) {
            if (copilotToken.endpoints.api && copilotToken.endpoints.api !== this._capiUrl) {
                this._capiUrl = copilotToken.endpoints.api;
                result.capiUrlChanged = true;
            }
            if (copilotToken.endpoints.telemetry && copilotToken.endpoints.telemetry !== this._telemetryUrl) {
                this._telemetryUrl = copilotToken.endpoints.telemetry;
                result.telemetryUrlChanged = true;
            }
            if (copilotToken.endpoints.proxy && copilotToken.endpoints.proxy !== this._proxyUrl) {
                this._proxyUrl = copilotToken.endpoints.proxy;
                result.proxyUrlChanged = true;
            }
            if (copilotToken.endpoints['origin-tracker']) {
                this._originTrackerUrl = copilotToken.endpoints['origin-tracker'];
            }
        }
        // Enterprise URL override
        if (enterpriseUrlConfig) {
            const normalizedUrl = enterpriseUrlConfig.replace(/\/$/, '');
            if (normalizedUrl !== this._dotcomUrl) {
                this._dotcomUrl = normalizedUrl;
                result.dotcomUrlChanged = true;
            }
        }
        return result;
    }
    get capiUrl() { return this._capiUrl; }
    get telemetryUrl() { return this._telemetryUrl; }
    get dotcomUrl() { return this._dotcomUrl; }
    get proxyUrl() { return this._proxyUrl; }
    get originTrackerUrl() { return this._originTrackerUrl; }
}
/**
 * CAPIClient - replaces @vscode/copilot-api CAPIClient
 *
 * This is a drop-in replacement that maintains the same interface
 * but can be extended to support multiple backends (Puku AI, Ollama, etc.)
 */
class CAPIClient {
    constructor(_extensionInfo, _license, _fetcherService, _hmacSecret, _forceDevIntegration) {
        this._extensionInfo = _extensionInfo;
        this._license = _license;
        this._fetcherService = _fetcherService;
        this._hmacSecret = _hmacSecret;
        this._forceDevIntegration = _forceDevIntegration;
        this._copilotSku = '';
        this._licenseCheckSucceeded = false;
        this._domainService = new DomainService();
    }
    updateDomains(copilotToken, enterpriseUrlConfig) {
        if (copilotToken?.sku) {
            this._copilotSku = copilotToken.sku;
        }
        return this._domainService.updateDomains(copilotToken, enterpriseUrlConfig);
    }
    async makeRequest(request, requestMetadata) {
        const url = this._getUrlForRequest(requestMetadata);
        const headers = this._mixinHeaders(request.headers ?? {}, requestMetadata);
        const options = {
            ...request,
            headers
        };
        if (!this._fetcherService) {
            throw new Error('FetcherService not provided');
        }
        return this._fetcherService.fetch(url, options);
    }
    _getUrlForRequest(metadata) {
        const baseUrl = this._domainService.capiUrl;
        const proxyUrl = this._domainService.proxyUrl;
        switch (metadata.type) {
            case pukuRequestTypes_1.RequestType.CopilotToken:
                return `${this._domainService.dotcomUrl}/copilot_internal/v2/token`;
            case pukuRequestTypes_1.RequestType.CopilotNLToken:
                return `${this._domainService.dotcomUrl}/copilot_internal/v2/token`;
            case pukuRequestTypes_1.RequestType.CopilotUserInfo:
                return `${this._domainService.dotcomUrl}/copilot_internal/user`;
            case pukuRequestTypes_1.RequestType.ChatCompletions:
                return `${baseUrl}/chat/completions`;
            case pukuRequestTypes_1.RequestType.ChatResponses:
                return `${baseUrl}/chat/responses`;
            case pukuRequestTypes_1.RequestType.ProxyChatCompletions:
            case pukuRequestTypes_1.RequestType.ProxyCompletions:
                return `${proxyUrl}/v1/engines/copilot-codex/completions`;
            case pukuRequestTypes_1.RequestType.Models:
            case pukuRequestTypes_1.RequestType.AutoModels:
                return `${baseUrl}/models`;
            case pukuRequestTypes_1.RequestType.ModelPolicy:
                return `${baseUrl}/models/${metadata.modelId}/policy`;
            case pukuRequestTypes_1.RequestType.ListModel:
                return `${baseUrl}/models/${metadata.modelId}`;
            case pukuRequestTypes_1.RequestType.CAPIEmbeddings:
                return `${baseUrl}/embeddings`;
            case pukuRequestTypes_1.RequestType.DotcomEmbeddings:
                return `${this._domainService.dotcomUrl}/embeddings`;
            case pukuRequestTypes_1.RequestType.EmbeddingsIndex:
                return `${baseUrl}/embeddings/index`;
            case pukuRequestTypes_1.RequestType.EmbeddingsCodeSearch:
                return `${baseUrl}/embeddings/search`;
            case pukuRequestTypes_1.RequestType.EmbeddingsModels:
                return `${baseUrl}/embeddings/models`;
            case pukuRequestTypes_1.RequestType.Chunks:
                return `${baseUrl}/chunks`;
            case pukuRequestTypes_1.RequestType.ContentExclusion:
                return this._prepareContentExclusionUrl(metadata.repos);
            case pukuRequestTypes_1.RequestType.ChatAttachmentUpload:
                return `${baseUrl}/chat/attachments`;
            case pukuRequestTypes_1.RequestType.RemoteAgent:
                return `${baseUrl}/agents`;
            case pukuRequestTypes_1.RequestType.RemoteAgentChat:
                const slug = metadata.slug;
                return slug ? `${baseUrl}/agents/${slug}/chat` : `${baseUrl}/agents/chat`;
            case pukuRequestTypes_1.RequestType.ListSkills:
                return `${baseUrl}/skills`;
            case pukuRequestTypes_1.RequestType.SearchSkill:
                return `${baseUrl}/skills/${metadata.slug}/search`;
            case pukuRequestTypes_1.RequestType.SnippyMatch:
                return this.snippyMatchPath;
            case pukuRequestTypes_1.RequestType.SnippyFilesForMatch:
                return this.snippyFilesForMatchPath;
            case pukuRequestTypes_1.RequestType.CodeReviewAgent:
                return `${baseUrl}/code-review`;
            case pukuRequestTypes_1.RequestType.CodingGuidelines:
                return `${baseUrl}/coding-guidelines`;
            case pukuRequestTypes_1.RequestType.Telemetry:
                return this._domainService.telemetryUrl;
            default:
                return baseUrl;
        }
    }
    _prepareContentExclusionUrl(repos) {
        const url = new URL(`${this._domainService.capiUrl}/content_exclusion`);
        for (const repo of repos) {
            url.searchParams.append('repos', repo);
        }
        return url.toString();
    }
    _mixinHeaders(headers, metadata) {
        const result = { ...headers };
        // Add integration ID unless suppressed
        if (!result['X-Integration-Id']) {
            result['X-Integration-Id'] = `vscode/${this._extensionInfo.vscodeVersion}`;
        }
        // Add extension info
        result['Editor-Version'] = `vscode/${this._extensionInfo.vscodeVersion}`;
        result['Editor-Plugin-Version'] = `${this._extensionInfo.name}/${this._extensionInfo.version}`;
        result['X-Request-Id'] = this._generateRequestId();
        // Add machine/session IDs
        result['X-Machine-Id'] = this._extensionInfo.machineId;
        result['X-Session-Id'] = this._extensionInfo.sessionId;
        // Add HMAC if available
        if (this._hmacSecret) {
            result['X-HMAC'] = this._hmacSecret;
        }
        return result;
    }
    _generateRequestId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    get copilotTelemetryURL() {
        return this._domainService.telemetryUrl;
    }
    get dotcomAPIURL() {
        return this._domainService.dotcomUrl;
    }
    get capiPingURL() {
        return `${this._domainService.capiUrl}/ping`;
    }
    get proxyBaseURL() {
        return this._domainService.proxyUrl;
    }
    get originTrackerURL() {
        return this._domainService.originTrackerUrl;
    }
    get snippyMatchPath() {
        return `${this._domainService.capiUrl}/snippy/match`;
    }
    get snippyFilesForMatchPath() {
        return `${this._domainService.capiUrl}/snippy/files`;
    }
}
exports.CAPIClient = CAPIClient;
//# sourceMappingURL=pukuApiClient.js.map