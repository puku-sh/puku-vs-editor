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
exports.BasicCodeSearchAuthenticationService = exports.ICodeSearchAuthenticationService = void 0;
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
exports.ICodeSearchAuthenticationService = (0, instantiation_1.createDecorator)('ICodeSearchAuthentication');
let BasicCodeSearchAuthenticationService = class BasicCodeSearchAuthenticationService {
    constructor(_authenticationService) {
        this._authenticationService = _authenticationService;
    }
    async tryAuthenticating(repo) {
        if (repo?.remoteInfo.repoId.type === 'ado') {
            await this._authenticationService.getAdoAccessTokenBase64({ createIfNone: true });
            return;
        }
        await this._authenticationService.getAnyGitHubSession({ createIfNone: true });
    }
    async tryReauthenticating(repo) {
        if (repo?.remoteInfo.repoId.type === 'ado') {
            await this._authenticationService.getAdoAccessTokenBase64({ createIfNone: true });
            return;
        }
        await this._authenticationService.getPermissiveGitHubSession({ createIfNone: true });
    }
    async promptForExpandedLocalIndexing(fileCount) {
        // Can't show prompt here
        return false;
    }
};
exports.BasicCodeSearchAuthenticationService = BasicCodeSearchAuthenticationService;
exports.BasicCodeSearchAuthenticationService = BasicCodeSearchAuthenticationService = __decorate([
    __param(0, authentication_1.IAuthenticationService)
], BasicCodeSearchAuthenticationService);
//# sourceMappingURL=codeSearchRepoAuth.js.map