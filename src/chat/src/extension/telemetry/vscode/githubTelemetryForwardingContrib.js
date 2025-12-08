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
exports.GithubTelemetryForwardingContrib = void 0;
const vscode_1 = require("vscode");
const gitService_1 = require("../../../platform/git/common/gitService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
let GithubTelemetryForwardingContrib = class GithubTelemetryForwardingContrib extends lifecycle_1.Disposable {
    constructor(_telemetryService, _gitService) {
        super();
        this._telemetryService = _telemetryService;
        this._gitService = _gitService;
        const channel = vscode_1.env.getDataChannel('editTelemetry');
        this._register(channel.onDidReceiveData((args) => {
            const r = this._gitService.activeRepository.get();
            const id = r ? (0, gitService_1.getGitHubRepoInfoFromContext)(r)?.id : undefined;
            const data = translateToGithubProperties(args.data.data, id);
            const { properties, measurements } = dataToPropsAndMeasurements(data);
            this._telemetryService.sendGHTelemetryEvent('vscode.' + args.data.eventName, properties, measurements);
        }));
    }
};
exports.GithubTelemetryForwardingContrib = GithubTelemetryForwardingContrib;
exports.GithubTelemetryForwardingContrib = GithubTelemetryForwardingContrib = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, gitService_1.IGitService)
], GithubTelemetryForwardingContrib);
function translateToGithubProperties(data, githubRepo) {
    if (githubRepo) {
        data['githubOrg'] = githubRepo.org;
        data['githubRepo'] = githubRepo.repo;
    }
    return data;
}
function dataToPropsAndMeasurements(data) {
    const properties = {};
    const measurements = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
            measurements[key] = value;
        }
        else if (typeof value === 'boolean') {
            measurements[key] = value ? 1 : 0;
        }
        else {
            properties[key] = value;
        }
    }
    return { properties, measurements };
}
//# sourceMappingURL=githubTelemetryForwardingContrib.js.map