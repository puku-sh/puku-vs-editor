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
exports.ThrottlingCodeOrDocsSearchClient = void 0;
const async_1 = require("../../src/util/vs/base/common/async");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
let ThrottlingCodeOrDocsSearchClient = class ThrottlingCodeOrDocsSearchClient {
    constructor(descriptor, instantiationService) {
        this.searchClient = instantiationService.createInstance(descriptor);
        this._throttler = new async_1.ThrottledWorker({
            maxBufferedWork: undefined, // We want to hold as many requests as possible
            maxWorkChunkSize: 1,
            waitThrottleDelayBetweenWorkUnits: true,
            throttleDelay: 1000
        }, async (tasks) => {
            for (const task of tasks) {
                await task();
            }
        });
    }
    search(query, scopingQuery, options = {}, cancellationToken) {
        return new Promise((resolve, reject) => {
            this._throttler.work([async () => {
                    try {
                        if (Array.isArray(scopingQuery.repo)) {
                            const result = await this.searchClient.search(query, scopingQuery, options, cancellationToken);
                            resolve(result);
                        }
                        else {
                            const result = await this.searchClient.search(query, scopingQuery, options, cancellationToken);
                            resolve(result);
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                }]);
        });
    }
};
exports.ThrottlingCodeOrDocsSearchClient = ThrottlingCodeOrDocsSearchClient;
exports.ThrottlingCodeOrDocsSearchClient = ThrottlingCodeOrDocsSearchClient = __decorate([
    __param(1, instantiation_1.IInstantiationService)
], ThrottlingCodeOrDocsSearchClient);
//# sourceMappingURL=throttlingCodeOrDocsSearchClient.js.map