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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VsCodeCodeSearchAuthenticationService = void 0;
const l10n_1 = require("@vscode/l10n");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../authentication/common/authentication");
let VsCodeCodeSearchAuthenticationService = class VsCodeCodeSearchAuthenticationService {
    constructor(_authService, _authUpgradeService) {
        this._authService = _authService;
        this._authUpgradeService = _authUpgradeService;
    }
    async tryAuthenticating(repo) {
        const fetchUrl = repo?.remoteInfo.fetchUrl;
        const signInButton = {
            title: (0, l10n_1.t) `Sign In`,
        };
        const cancelButton = {
            title: (0, l10n_1.t) `Cancel`,
            isCloseAffordance: true
        };
        if (repo?.remoteInfo.repoId.type === 'ado') {
            const result = await vscode.window.showWarningMessage((0, l10n_1.t) `Sign in to use remote index`, {
                modal: true,
                detail: fetchUrl
                    ? (0, l10n_1.t) `Sign in to Azure DevOps to use remote workspace index for: ${fetchUrl.toString()}`
                    : (0, l10n_1.t) `Sign in to Azure DevOps to use remote workspace index for a repo in this workspace`
            }, signInButton, cancelButton);
            if (result === signInButton) {
                await this._authService.getAdoAccessTokenBase64({ createIfNone: true });
                return;
            }
        }
        else {
            const result = await vscode.window.showWarningMessage((0, l10n_1.t) `Sign in to use remote index`, {
                modal: true,
                detail: fetchUrl
                    ? (0, l10n_1.t) `Sign in to GitHub to use remote workspace index for: ${fetchUrl.toString()}`
                    : (0, l10n_1.t) `Sign in to GitHub to use remote workspace index for a repo in this workspace`
            }, signInButton, cancelButton);
            if (result === signInButton) {
                await this._authService.getAnyGitHubSession({ createIfNone: true });
                return;
            }
        }
    }
    async tryReauthenticating(repo) {
        const fetchUrl = repo?.remoteInfo.fetchUrl;
        const signInButton = {
            title: (0, l10n_1.t) `Sign In`,
        };
        const cancelButton = {
            title: (0, l10n_1.t) `Cancel`,
            isCloseAffordance: true
        };
        if (repo?.remoteInfo.repoId.type === 'ado') {
            const result = await vscode.window.showWarningMessage((0, l10n_1.t) `Reauthenticate to use remote workspace index`, {
                modal: true,
                detail: fetchUrl
                    ? (0, l10n_1.t) `Sign in to Azure DevOps again to use remote workspace index for: ${fetchUrl}`
                    : (0, l10n_1.t) `Sign in to Azure DevOps again to use remote workspace index for a repo in this workspace`
            }, signInButton, cancelButton);
            if (result === signInButton) {
                await this._authService.getAdoAccessTokenBase64({ createIfNone: true });
                return;
            }
        }
        else {
            const result = await vscode.window.showWarningMessage((0, l10n_1.t) `Reauthenticate to use remote workspace index`, {
                modal: true,
                detail: fetchUrl
                    ? (0, l10n_1.t) `Sign in to GitHub again to use remote workspace index for: ${fetchUrl}`
                    : (0, l10n_1.t) `Sign in to GitHub again to use remote workspace index for a repo in this workspace`
            }, signInButton, cancelButton);
            if (result === signInButton) {
                await this._authUpgradeService.showPermissiveSessionModal();
                return;
            }
        }
    }
    async promptForExpandedLocalIndexing(fileCount) {
        const confirmButton = {
            title: (0, l10n_1.t) `Enable`,
        };
        const cancelButton = {
            title: (0, l10n_1.t) `Cancel`,
            isCloseAffordance: true
        };
        const result = await vscode.window.showWarningMessage((0, l10n_1.t) `Build local index for this workspace?`, {
            modal: true,
            detail: (0, l10n_1.t) `This workspace contains ${fileCount} files. Building a local index may take a while but will improve search performance.`,
        }, confirmButton, cancelButton);
        return result === confirmButton;
    }
};
exports.VsCodeCodeSearchAuthenticationService = VsCodeCodeSearchAuthenticationService;
exports.VsCodeCodeSearchAuthenticationService = VsCodeCodeSearchAuthenticationService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, authenticationUpgrade_1.IAuthenticationChatUpgradeService)
], VsCodeCodeSearchAuthenticationService);
//# sourceMappingURL=codeSearchRepoAuth.js.map