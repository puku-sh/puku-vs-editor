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
exports.FetcherService = void 0;
exports.getShadowedConfig = getShadowedConfig;
const configurationService_1 = require("../../configuration/common/configurationService");
const envService_1 = require("../../env/common/envService");
const logService_1 = require("../../log/common/logService");
const fetcherFallback_1 = require("../node/fetcherFallback");
const nodeFetcher_1 = require("../node/nodeFetcher");
const nodeFetchFetcher_1 = require("../node/nodeFetchFetcher");
const electronFetcher_1 = require("./electronFetcher");
let FetcherService = class FetcherService {
    constructor(fetcher, _logService, _envService, _configurationService) {
        this._logService = _logService;
        this._envService = _envService;
        this._configurationService = _configurationService;
        this._knownBadFetchers = new Set();
        this._availableFetchers = fetcher ? [fetcher] : undefined;
    }
    setExperimentationService(experimentationService) {
        this._experimentationService = experimentationService;
    }
    _getAvailableFetchers() {
        if (!this._availableFetchers) {
            if (!this._experimentationService) {
                this._logService.info('FetcherService: Experimentation service not available yet, using default fetcher configuration.');
            }
            else {
                this._logService.debug('FetcherService: Using experimentation service to determine fetcher configuration.');
            }
            this._availableFetchers = this._getFetchers(this._configurationService, this._experimentationService, this._envService);
        }
        return this._availableFetchers;
    }
    _getFetchers(configurationService, experimentationService, envService) {
        const useElectronFetcher = getShadowedConfig(configurationService, experimentationService, configurationService_1.ConfigKey.Shared.DebugUseElectronFetcher, configurationService_1.ConfigKey.Internal.DebugExpUseElectronFetcher);
        const electronFetcher = electronFetcher_1.ElectronFetcher.create(envService);
        const useNodeFetcher = !(useElectronFetcher && electronFetcher) && getShadowedConfig(configurationService, experimentationService, configurationService_1.ConfigKey.Shared.DebugUseNodeFetcher, configurationService_1.ConfigKey.Internal.DebugExpUseNodeFetcher); // Node https wins over Node fetch. (historical order)
        const useNodeFetchFetcher = !(useElectronFetcher && electronFetcher) && !useNodeFetcher && getShadowedConfig(configurationService, experimentationService, configurationService_1.ConfigKey.Shared.DebugUseNodeFetchFetcher, configurationService_1.ConfigKey.Internal.DebugExpUseNodeFetchFetcher);
        const fetchers = [];
        if (electronFetcher) {
            fetchers.push(electronFetcher);
        }
        if (useElectronFetcher) {
            if (electronFetcher) {
                this._logService.info(`Using the Electron fetcher.`);
            }
            else {
                this._logService.info(`Can't use the Electron fetcher in this environment.`);
            }
        }
        // Node fetch preferred over Node https in fallbacks. (HTTP2 support)
        const nodeFetchFetcher = new nodeFetchFetcher_1.NodeFetchFetcher(envService);
        if (useNodeFetchFetcher) {
            this._logService.info(`Using the Node fetch fetcher.`);
            fetchers.unshift(nodeFetchFetcher);
        }
        else {
            fetchers.push(nodeFetchFetcher);
        }
        const nodeFetcher = new nodeFetcher_1.NodeFetcher(envService);
        if (useNodeFetcher || (!(useElectronFetcher && electronFetcher) && !useNodeFetchFetcher)) { // Node https used when none is configured. (historical)
            this._logService.info(`Using the Node fetcher.`);
            fetchers.unshift(nodeFetcher);
        }
        else {
            fetchers.push(nodeFetcher);
        }
        return fetchers;
    }
    getUserAgentLibrary() {
        return this._getAvailableFetchers()[0].getUserAgentLibrary();
    }
    async fetch(url, options) {
        const { response: res, updatedFetchers, updatedKnownBadFetchers } = await (0, fetcherFallback_1.fetchWithFallbacks)(this._getAvailableFetchers(), url, options, this._knownBadFetchers, this._configurationService, this._logService);
        if (updatedFetchers) {
            this._availableFetchers = updatedFetchers;
        }
        if (updatedKnownBadFetchers) {
            this._knownBadFetchers = updatedKnownBadFetchers;
        }
        return res;
    }
    disconnectAll() {
        return this._getAvailableFetchers()[0].disconnectAll();
    }
    makeAbortController() {
        return this._getAvailableFetchers()[0].makeAbortController();
    }
    isAbortError(e) {
        return this._getAvailableFetchers()[0].isAbortError(e);
    }
    isInternetDisconnectedError(e) {
        return this._getAvailableFetchers()[0].isInternetDisconnectedError(e);
    }
    isFetcherError(e) {
        return this._getAvailableFetchers()[0].isFetcherError(e);
    }
    getUserMessageForFetcherError(err) {
        return this._getAvailableFetchers()[0].getUserMessageForFetcherError(err);
    }
};
exports.FetcherService = FetcherService;
exports.FetcherService = FetcherService = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, envService_1.IEnvService),
    __param(3, configurationService_1.IConfigurationService)
], FetcherService);
function getShadowedConfig(configurationService, experimentationService, configKey, expKey) {
    if (!experimentationService) {
        return configurationService.getConfig(configKey);
    }
    const inspect = configurationService.inspectConfig(configKey);
    if (inspect?.globalValue !== undefined) {
        return inspect.globalValue;
    }
    const expValue = configurationService.getExperimentBasedConfig(expKey, experimentationService);
    if (expValue !== undefined) {
        return expValue;
    }
    return configurationService.getConfig(configKey);
}
//# sourceMappingURL=fetcherServiceImpl.js.map