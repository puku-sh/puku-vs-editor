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
exports.GitHubPullRequestProviders = void 0;
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const logService_1 = require("../../../platform/log/common/logService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const githubPullRequestTitleAndDescriptionGenerator_1 = require("../../prompt/node/githubPullRequestTitleAndDescriptionGenerator");
const githubPullRequestReviewerCommentsProvider_1 = require("../../review/node/githubPullRequestReviewerCommentsProvider");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
let GitHubPullRequestProviders = class GitHubPullRequestProviders {
    constructor(logService, instantiationService, reviewService, extensionService, _configurationService) {
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.reviewService = reviewService;
        this.extensionService = extensionService;
        this._configurationService = _configurationService;
        this.disposables = new lifecycle_1.DisposableStore();
        this.initializeGitHubPRExtensionApi();
    }
    dispose() {
        this.disposables.dispose();
    }
    getExtension() {
        return this.extensionService.getExtension('github.vscode-pull-request-github');
    }
    initializeGitHubPRExtensionApi() {
        let githubPRExtension = this.getExtension();
        const initialize = async () => {
            if (githubPRExtension) {
                const extension = await githubPRExtension.activate();
                this.logService.info('Successfully activated the GitHub.vscode-pull-request-github extension.');
                this.gitHubExtensionApi = extension;
                this.registerTitleAndDescriptionProvider();
                this.registerReviewerCommentsProvider();
            }
        };
        if (githubPRExtension) {
            initialize();
        }
        else {
            this.logService.info('GitHub.vscode-pull-request-github extension is not yet activated.');
            const listener = this.extensionService.onDidChange(() => {
                githubPRExtension = this.getExtension();
                if (githubPRExtension) {
                    initialize();
                    listener.dispose();
                }
            });
            this.disposables.add(listener);
        }
        this.disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(configurationService_1.ConfigKey.ReviewAgent.fullyQualifiedId)) {
                this.registerReviewerCommentsProvider();
            }
        }));
    }
    async registerTitleAndDescriptionProvider() {
        if (!this.gitHubExtensionApi) {
            return;
        }
        try {
            if (!this.titleAndDescriptionProvider) {
                this.titleAndDescriptionProvider = this.disposables.add(this.instantiationService.createInstance(githubPullRequestTitleAndDescriptionGenerator_1.GitHubPullRequestTitleAndDescriptionGenerator));
            }
            // This string "Puku AI" needs to be in here. It's how we an tell which provider to use in the PR extension.
            this.disposables.add(this.gitHubExtensionApi.registerTitleAndDescriptionProvider(vscodeTypes_1.l10n.t('Generate with Copilot'), this.titleAndDescriptionProvider));
            this.logService.info('Successfully registered GitHub PR title and description provider.');
        }
        catch (e) {
            // Catch errors in case there's a breaking API change.
        }
    }
    async registerReviewerCommentsProvider() {
        if (!this.gitHubExtensionApi) {
            return;
        }
        if (!this.reviewService.isReviewDiffEnabled()) {
            if (this.reviewerCommentsRegistration) {
                this.disposables.delete(this.reviewerCommentsRegistration);
                this.reviewerCommentsRegistration = undefined;
            }
            return;
        }
        if (this.reviewerCommentsRegistration) {
            return;
        }
        try {
            if (!this.reviewerCommentsProvider) {
                this.reviewerCommentsProvider = this.instantiationService.createInstance(githubPullRequestReviewerCommentsProvider_1.GitHubPullRequestReviewerCommentsProvider);
            }
            this.reviewerCommentsRegistration = this.gitHubExtensionApi.registerReviewerCommentsProvider(vscodeTypes_1.l10n.t('Copilot'), this.reviewerCommentsProvider);
            this.disposables.add(this.reviewerCommentsRegistration);
            this.logService.info('Successfully registered GitHub PR reviewer comments provider.');
        }
        catch (e) {
            // Catch errors in case there's a breaking API change.
        }
    }
    async getRepositoryDescription(uri) {
        try {
            // Wait for gitHubExtensionApi to be initialized if not already
            if (!this.gitHubExtensionApi) {
                // Try to get and activate the extension if possible
                const githubPRExtension = this.getExtension();
                if (githubPRExtension) {
                    const extension = await githubPRExtension.activate();
                    this.gitHubExtensionApi = extension;
                }
                else {
                    this.logService.warn('GitHub.vscode-pull-request-github extension API is not available.');
                    return undefined;
                }
            }
            if (!this.gitHubExtensionApi.getRepositoryDescription) {
                return undefined;
            }
            return await this.gitHubExtensionApi.getRepositoryDescription(uri);
        }
        catch (error) {
            this.logService.error('Failed to get repository description from GitHub.vscode-pull-request-github extension.', error);
            return undefined;
        }
    }
};
exports.GitHubPullRequestProviders = GitHubPullRequestProviders;
exports.GitHubPullRequestProviders = GitHubPullRequestProviders = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, reviewService_1.IReviewService),
    __param(3, extensionsService_1.IExtensionsService),
    __param(4, configurationService_1.IConfigurationService)
], GitHubPullRequestProviders);
//# sourceMappingURL=githubPullRequestProviders.js.map