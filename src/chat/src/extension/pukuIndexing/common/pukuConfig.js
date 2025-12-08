"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuConfigService = exports.IPukuConfigService = exports.DEFAULT_PUKU_CONFIG = void 0;
const services_1 = require("../../../util/common/services");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
/**
 * Default fallback configuration (used if server is unavailable)
 */
exports.DEFAULT_PUKU_CONFIG = {
    semanticSearch: {
        minLimit: 2,
        maxLimit: 20,
        defaultLimit: 10,
        commentShortLimit: 5,
        commentMediumLimit: 10,
        commentLongLimit: 15,
    },
    endpoints: {
        fim: 'https://api.puku.sh/v1/fim/context',
        summarize: 'https://api.puku.sh/v1/summarize/batch',
        embeddings: 'https://api.puku.sh/v1/embeddings',
    },
    models: {
        fim: 'mistralai/codestral-2501',
        summarization: 'qwen/qwen-2.5-coder-32b-instruct',
        embeddings: 'nomic-ai/nomic-embed-text',
    },
    performance: {
        debounceMs: 200,
        cacheTTL: 300000, // 5 minutes
        maxConcurrentJobs: 5,
        chunksPerJob: 20,
    },
};
exports.IPukuConfigService = (0, services_1.createServiceIdentifier)('IPukuConfigService');
/**
 * Base Puku Config Service - manages configuration from server
 */
class PukuConfigService extends lifecycle_1.Disposable {
    constructor(configEndpoint) {
        super();
        this._onDidChangeConfig = this._register(new event_1.Emitter());
        this.onDidChangeConfig = this._onDidChangeConfig.event;
        this._configEndpoint = configEndpoint;
    }
    get config() {
        return this._config;
    }
    async initialize() {
        await this._fetchConfig();
        this._scheduleRefresh();
    }
    async refresh() {
        await this._fetchConfig();
    }
    getConfig() {
        return this._config || exports.DEFAULT_PUKU_CONFIG;
    }
    async _fetchConfig() {
        try {
            const response = await fetch(this._configEndpoint);
            if (!response.ok) {
                console.warn(`[PukuConfig] Failed to fetch config (${response.status}), using defaults`);
                this._config = exports.DEFAULT_PUKU_CONFIG;
                return;
            }
            const data = await response.json();
            this._config = data;
            this._onDidChangeConfig.fire(this._config);
            console.log('[PukuConfig] Configuration loaded from server:', this._config);
        }
        catch (error) {
            console.error('[PukuConfig] Error fetching config:', error);
            this._config = exports.DEFAULT_PUKU_CONFIG;
        }
    }
    _scheduleRefresh() {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        const ttl = this._config?.performance.cacheTTL || exports.DEFAULT_PUKU_CONFIG.performance.cacheTTL;
        this._refreshTimeout = setTimeout(() => {
            this.refresh().catch(console.error);
            this._scheduleRefresh();
        }, ttl);
    }
    dispose() {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        super.dispose();
    }
}
exports.PukuConfigService = PukuConfigService;
//# sourceMappingURL=pukuConfig.js.map