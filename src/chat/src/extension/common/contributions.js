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
exports.ContributionCollection = void 0;
exports.asContributionFactory = asContributionFactory;
const logService_1 = require("../../platform/log/common/logService");
const lifecycle_1 = require("../../util/vs/base/common/lifecycle");
const stopwatch_1 = require("../../util/vs/base/common/stopwatch");
const instantiation_1 = require("../../util/vs/platform/instantiation/common/instantiation");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asContributionFactory(ctor) {
    return {
        create(accessor) {
            const instantiationService = accessor.get(instantiation_1.IInstantiationService);
            return instantiationService.createInstance(ctor);
        }
    };
}
let ContributionCollection = class ContributionCollection extends lifecycle_1.Disposable {
    constructor(contribs, logService, instaService) {
        super();
        this.allActivationBlockers = [];
        for (const contribution of contribs) {
            let instance;
            try {
                instance = instaService.invokeFunction(contribution.create);
                if ((0, lifecycle_1.isDisposable)(instance)) {
                    this._register(instance);
                }
                if (instance?.activationBlocker) {
                    const sw = stopwatch_1.StopWatch.create();
                    const id = instance.id || 'UNKNOWN';
                    this.allActivationBlockers.push(instance.activationBlocker.finally(() => {
                        logService.info(`activationBlocker from '${id}' took for ${Math.round(sw.elapsed())}ms`);
                    }));
                }
            }
            catch (error) {
                logService.error(error, `Error while loading contribution`);
            }
        }
    }
    async waitForActivationBlockers() {
        // WAIT for all activation blockers to complete
        await Promise.allSettled(this.allActivationBlockers);
    }
};
exports.ContributionCollection = ContributionCollection;
exports.ContributionCollection = ContributionCollection = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, instantiation_1.IInstantiationService)
], ContributionCollection);
//# sourceMappingURL=contributions.js.map