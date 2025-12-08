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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFetchFetcher = void 0;
const undici = __importStar(require("undici"));
const baseFetchFetcher_1 = require("./baseFetchFetcher");
const lazy_1 = require("../../../util/vs/base/common/lazy");
class NodeFetchFetcher extends baseFetchFetcher_1.BaseFetchFetcher {
    constructor(envService, userAgentLibraryUpdate) {
        super(getFetch(), envService, userAgentLibraryUpdate);
    }
    getUserAgentLibrary() {
        return 'node-fetch';
    }
    isInternetDisconnectedError(_e) {
        return false;
    }
    isFetcherError(e) {
        const code = e?.code || e?.cause?.code;
        return code && ['EADDRINUSE', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EPIPE', 'ETIMEDOUT'].includes(code);
    }
}
exports.NodeFetchFetcher = NodeFetchFetcher;
function getFetch() {
    const fetch = globalThis.__vscodePatchedFetch || globalThis.fetch;
    return function (input, init) {
        return fetch(input, { dispatcher: agent.value, ...init });
    };
}
// Cache agent to reuse connections.
const agent = new lazy_1.Lazy(() => new undici.Agent({ allowH2: true }));
//# sourceMappingURL=nodeFetchFetcher.js.map