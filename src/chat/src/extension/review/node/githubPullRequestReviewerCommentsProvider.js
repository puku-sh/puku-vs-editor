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
exports.GitHubPullRequestReviewerCommentsProvider = void 0;
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const doReview_1 = require("./doReview");
let GitHubPullRequestReviewerCommentsProvider = class GitHubPullRequestReviewerCommentsProvider {
    constructor(instantiationService, interactionService) {
        this.instantiationService = instantiationService;
        this.interactionService = interactionService;
    }
    async provideReviewerComments(context, token) {
        this.interactionService.startInteraction();
        const reviewSession = this.instantiationService.createInstance(doReview_1.ReviewSession);
        const reviewResult = await reviewSession.review(context, notificationService_1.ProgressLocation.Notification, token);
        const files = [];
        if (reviewResult?.type === 'success') {
            for (const comment of reviewResult.comments) {
                files.push(comment.uri);
            }
        }
        const succeeded = reviewResult?.type === 'success';
        return { files, succeeded };
    }
};
exports.GitHubPullRequestReviewerCommentsProvider = GitHubPullRequestReviewerCommentsProvider;
exports.GitHubPullRequestReviewerCommentsProvider = GitHubPullRequestReviewerCommentsProvider = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, interactionService_1.IInteractionService)
], GitHubPullRequestReviewerCommentsProvider);
//# sourceMappingURL=githubPullRequestReviewerCommentsProvider.js.map