"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithFallbacks = fetchWithFallbacks;
const stream_1 = require("stream");
const fetcherService_1 = require("../common/fetcherService");
const configurationService_1 = require("../../configuration/common/configurationService");
const fetcherConfigKeys = {
    'electron-fetch': configurationService_1.ConfigKey.Shared.DebugUseElectronFetcher,
    'node-fetch': configurationService_1.ConfigKey.Shared.DebugUseNodeFetchFetcher,
    'node-http': configurationService_1.ConfigKey.Shared.DebugUseNodeFetcher,
};
async function fetchWithFallbacks(availableFetchers, url, options, knownBadFetchers, configurationService, logService) {
    if (options.retryFallbacks && availableFetchers.length > 1) {
        let firstResult;
        const updatedKnownBadFetchers = new Set();
        for (const fetcher of availableFetchers) {
            const result = await tryFetch(fetcher, url, options, logService);
            if (fetcher === availableFetchers[0]) {
                firstResult = result;
            }
            if (!result.ok) {
                updatedKnownBadFetchers.add(fetcher.getUserAgentLibrary());
                continue;
            }
            if (fetcher !== availableFetchers[0]) {
                const retry = await tryFetch(availableFetchers[0], url, options, logService);
                if (retry.ok) {
                    return { response: retry.response };
                }
                logService.info(`FetcherService: using ${fetcher.getUserAgentLibrary()} from now on`);
                const updatedFetchers = availableFetchers.slice();
                updatedFetchers.splice(updatedFetchers.indexOf(fetcher), 1);
                updatedFetchers.unshift(fetcher);
                return { response: result.response, updatedFetchers, updatedKnownBadFetchers };
            }
            return { response: result.response };
        }
        if ('response' in firstResult) {
            return { response: firstResult.response };
        }
        throw firstResult.err;
    }
    let fetcher = availableFetchers[0];
    if (options.useFetcher) {
        if (knownBadFetchers.has(options.useFetcher)) {
            logService.trace(`FetcherService: not using requested fetcher ${options.useFetcher} as it is known to be failing, using ${fetcher.getUserAgentLibrary()} instead.`);
        }
        else {
            const configKey = fetcherConfigKeys[options.useFetcher];
            if (configKey && configurationService.inspectConfig(configKey)?.globalValue === false) {
                logService.trace(`FetcherService: not using requested fetcher ${options.useFetcher} as it is disabled in user settings, using ${fetcher.getUserAgentLibrary()} instead.`);
            }
            else {
                const requestedFetcher = availableFetchers.find(f => f.getUserAgentLibrary() === options.useFetcher);
                if (requestedFetcher) {
                    fetcher = requestedFetcher;
                    logService.trace(`FetcherService: using ${options.useFetcher} as requested.`);
                }
                else {
                    logService.info(`FetcherService: could not find requested fetcher ${options.useFetcher}, using ${fetcher.getUserAgentLibrary()} instead.`);
                }
            }
        }
    }
    return { response: await fetcher.fetch(url, options) };
}
async function tryFetch(fetcher, url, options, logService) {
    try {
        const response = await fetcher.fetch(url, options);
        if (!response.ok) {
            logService.info(`FetcherService: ${fetcher.getUserAgentLibrary()} failed with status: ${response.status} ${response.statusText}`);
            return { ok: false, response };
        }
        if (!options.expectJSON) {
            logService.debug(`FetcherService: ${fetcher.getUserAgentLibrary()} succeeded (not JSON)`);
            return { ok: response.ok, response };
        }
        const text = await response.text();
        try {
            const json = JSON.parse(text); // Verify JSON
            logService.debug(`FetcherService: ${fetcher.getUserAgentLibrary()} succeeded (JSON)`);
            return { ok: true, response: new fetcherService_1.Response(response.status, response.statusText, response.headers, async () => text, async () => json, async () => stream_1.Readable.from([text])) };
        }
        catch (err) {
            logService.info(`FetcherService: ${fetcher.getUserAgentLibrary()} failed to parse JSON: ${err.message}`);
            return { ok: false, err, response: new fetcherService_1.Response(response.status, response.statusText, response.headers, async () => text, async () => { throw err; }, async () => stream_1.Readable.from([text])) };
        }
    }
    catch (err) {
        logService.info(`FetcherService: ${fetcher.getUserAgentLibrary()} failed with error: ${err.message}`);
        return { ok: false, err };
    }
}
//# sourceMappingURL=fetcherFallback.js.map