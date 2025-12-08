"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronFetcher = void 0;
const baseFetchFetcher_1 = require("../node/baseFetchFetcher");
class ElectronFetcher extends baseFetchFetcher_1.BaseFetchFetcher {
    static create(envService, userAgentLibraryUpdate) {
        const net = loadNetModule();
        if (!net) {
            return null;
        }
        return new ElectronFetcher(net.fetch, envService, userAgentLibraryUpdate);
    }
    getUserAgentLibrary() {
        return 'electron-fetch';
    }
    isInternetDisconnectedError(e) {
        return ['net::ERR_INTERNET_DISCONNECTED', 'net::ERR_NETWORK_IO_SUSPENDED'].includes(e?.message);
    }
    isFetcherError(e) {
        return e && e.message && e.message.startsWith('net::');
    }
}
exports.ElectronFetcher = ElectronFetcher;
function loadNetModule() {
    try {
        return require('electron').net;
    }
    catch (err) { }
    return undefined;
}
//# sourceMappingURL=electronFetcher.js.map