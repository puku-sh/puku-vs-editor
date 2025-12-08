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
var GitHubPullRequestTitleAndDescriptionGenerator_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubPullRequestTitleAndDescriptionGenerator = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const types_1 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const pullRequestDescriptionPrompt_1 = require("../../prompts/node/github/pullRequestDescriptionPrompt");
let GitHubPullRequestTitleAndDescriptionGenerator = GitHubPullRequestTitleAndDescriptionGenerator_1 = class GitHubPullRequestTitleAndDescriptionGenerator {
    constructor(logService, options, ignoreService, endpointProvider, instantiationService, notificationService, authService) {
        this.logService = logService;
        this.options = options;
        this.ignoreService = ignoreService;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.authService = authService;
        this.disposables = new lifecycle_1.DisposableStore();
        this.lastContext = { commitMessages: [], patches: [] };
        this.logService.info('[githubTitleAndDescriptionProvider] Initializing GitHub PR title and description provider provider.');
    }
    dispose() {
        this.disposables.dispose();
    }
    isRegenerate(commitMessages, patches) {
        if (commitMessages.length !== this.lastContext.commitMessages.length || patches.length !== this.lastContext.patches.length) {
            return false;
        }
        for (let i = 0; i < commitMessages.length; i++) {
            if (commitMessages[i] !== this.lastContext.commitMessages[i]) {
                return false;
            }
        }
        for (let i = 0; i < patches.length; i++) {
            if (patches[i] !== this.lastContext.patches[i]) {
                return false;
            }
        }
        return true;
    }
    async excludePatches(allPatches) {
        const patches = [];
        for (const patch of allPatches) {
            if (patch.fileUri && await this.ignoreService.isCopilotIgnored(uri_1.URI.parse(patch.fileUri))) {
                continue;
            }
            if (patch.previousFileUri && patch.previousFileUri !== patch.fileUri && await this.ignoreService.isCopilotIgnored(uri_1.URI.parse(patch.previousFileUri))) {
                continue;
            }
            patches.push(patch.patch);
        }
        return patches;
    }
    async provideTitleAndDescription(context, token) {
        const commitMessages = context.commitMessages;
        const allPatches = (0, types_1.isStringArray)(context.patches) ? context.patches.map(patch => ({ patch })) : context.patches;
        const patches = await this.excludePatches(allPatches);
        const issues = context.issues;
        const template = context.template;
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const charLimit = Math.floor((endpoint.modelMaxPromptTokens * 4) / 3);
        const prompt = await this.createPRTitleAndDescriptionPrompt(commitMessages, patches, issues, template, charLimit);
        const fetchResult = await endpoint
            .makeChatRequest('githubPullRequestTitleAndDescriptionGenerator', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Other, undefined, {
            temperature: this.isRegenerate(commitMessages, patches) ? this.options.temperature + 0.1 : this.options.temperature,
        });
        this.lastContext = { commitMessages, patches };
        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.QuotaExceeded || (fetchResult.type === commonTypes_1.ChatFetchResponseType.RateLimited && this.authService.copilotToken?.isNoAuthUser)) {
            await this.notificationService.showQuotaExceededDialog({ isNoAuthUser: this.authService.copilotToken?.isNoAuthUser ?? false });
        }
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return undefined;
        }
        return GitHubPullRequestTitleAndDescriptionGenerator_1.parseFetchResult(fetchResult.value, !!template);
    }
    static parseFetchResult(value, hasTemplate = false, retry = true) {
        value = value.trim();
        let workingValue = value;
        let delimiter = '+++';
        const firstIndexOfDelimiter = workingValue.indexOf(delimiter);
        if (firstIndexOfDelimiter === -1) {
            return undefined;
        }
        // adjust delimter as the model sometimes adds more +s
        while (workingValue.charAt(firstIndexOfDelimiter + delimiter.length) === '+') {
            delimiter += '+';
        }
        const lastIndexOfDelimiter = workingValue.lastIndexOf(delimiter);
        workingValue = workingValue.substring(firstIndexOfDelimiter + delimiter.length, lastIndexOfDelimiter > firstIndexOfDelimiter + delimiter.length ? lastIndexOfDelimiter : undefined).trim().replace(/\++?(\n)\++/, delimiter);
        const splitOnPlus = workingValue.split(delimiter).filter(s => s.trim().length > 0);
        let splitOnLines;
        if (splitOnPlus.length === 1) {
            // If there's only one line, split on newlines as the model has left out some +++ delimiters
            splitOnLines = splitOnPlus[0].split('\n');
        }
        else if (splitOnPlus.length > 1) {
            if (hasTemplate) {
                // When using a template, keep description whitespace as-is.
                splitOnLines = splitOnPlus;
            }
            else {
                const descriptionLines = splitOnPlus.slice(1).map(line => line.split('\n')).flat().filter(s => s.trim().length > 0);
                splitOnLines = [splitOnPlus[0], ...descriptionLines];
            }
        }
        else {
            return undefined;
        }
        let title;
        let description;
        if (splitOnLines.length === 1) {
            title = splitOnLines[0].trim();
            if (retry && value.includes('\n') && (value.split(delimiter).length === 3)) {
                return this.parseFetchResult(value + delimiter, hasTemplate, false);
            }
        }
        else if (splitOnLines.length > 1) {
            title = splitOnLines[0].trim();
            description = '';
            const descriptionLines = splitOnLines.slice(1);
            // The description can be kind of self referential. Clean it up.
            for (const line of descriptionLines) {
                if (line.includes('commit message')) {
                    continue;
                }
                description += `${line.trim()}\n\n`;
            }
        }
        if (title) {
            title = title.replace(/Title\:\s/, '').trim();
            title = title.replace(/^\"(?<title>.+)\"$/, (_match, title) => title);
            if (description && !hasTemplate) {
                description = description.replace(/Description\:\s/, '').trim();
            }
            return { title, description };
        }
    }
    async createPRTitleAndDescriptionPrompt(commitMessages, patches, issues, template, charLimit) {
        // Reserve 20% of the character limit for the safety rules and instructions
        const availableChars = charLimit - Math.floor(charLimit * 0.2);
        // Remove diffs if needed (shortest diffs first)
        let totalChars = patches.join('\n\n').length;
        if (totalChars > availableChars) {
            // Sort diffs by length
            patches.sort((a, b) => a.length - b.length);
            // Remove diff(s) until we are under the character limit
            while (totalChars > availableChars && patches.length > 0) {
                const lastPatch = patches.pop();
                totalChars -= lastPatch.length;
            }
        }
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, pullRequestDescriptionPrompt_1.GitHubPullRequestPrompt, { commitMessages, issues, patches, template });
        return promptRenderer.render(undefined, undefined);
    }
};
exports.GitHubPullRequestTitleAndDescriptionGenerator = GitHubPullRequestTitleAndDescriptionGenerator;
exports.GitHubPullRequestTitleAndDescriptionGenerator = GitHubPullRequestTitleAndDescriptionGenerator = GitHubPullRequestTitleAndDescriptionGenerator_1 = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, conversationOptions_1.IConversationOptions),
    __param(2, ignoreService_1.IIgnoreService),
    __param(3, endpointProvider_1.IEndpointProvider),
    __param(4, instantiation_1.IInstantiationService),
    __param(5, notificationService_1.INotificationService),
    __param(6, authentication_1.IAuthenticationService)
], GitHubPullRequestTitleAndDescriptionGenerator);
//# sourceMappingURL=githubPullRequestTitleAndDescriptionGenerator.js.map