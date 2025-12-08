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
exports.NodeFetcherService = void 0;
const envService_1 = require("../../../env/common/envService");
const nodeFetchFetcher_1 = require("../nodeFetchFetcher");
let NodeFetcherService = class NodeFetcherService {
    constructor(_envService) {
        this._envService = _envService;
        this._fetcher = new nodeFetchFetcher_1.NodeFetchFetcher(this._envService);
    }
    getUserAgentLibrary() {
        return this._fetcher.getUserAgentLibrary();
    }
    fetch(url, options) {
        return this._fetcher.fetch(url, options);
    }
    disconnectAll() {
        return this._fetcher.disconnectAll();
    }
    makeAbortController() {
        return this._fetcher.makeAbortController();
    }
    isAbortError(e) {
        return this._fetcher.isAbortError(e);
    }
    isInternetDisconnectedError(e) {
        return this._fetcher.isInternetDisconnectedError(e);
    }
    isFetcherError(e) {
        return this._fetcher.isFetcherError(e);
    }
    getUserMessageForFetcherError(err) {
        return this._fetcher.getUserMessageForFetcherError(err);
    }
};
exports.NodeFetcherService = NodeFetcherService;
exports.NodeFetcherService = NodeFetcherService = __decorate([
    __param(0, envService_1.IEnvService)
], NodeFetcherService);
//# sourceMappingURL=nodeFetcherService.js.map