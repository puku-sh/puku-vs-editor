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
exports.ReviewSession = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const customInstructionsService_1 = require("../../../platform/customInstructions/common/customInstructionsService");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const envService_1 = require("../../../platform/env/common/envService");
const fileTypes_1 = require("../../../platform/filesystem/common/fileTypes");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const scopeSelection_1 = require("../../../platform/scopeSelection/common/scopeSelection");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const feedbackGenerator_1 = require("../../prompt/node/feedbackGenerator");
const currentChange_1 = require("../../prompts/node/feedback/currentChange");
const githubReviewAgent_1 = require("./githubReviewAgent");
let ReviewSession = class ReviewSession {
    constructor(scopeSelector, instantiationService, reviewService, authService, logService, gitExtensionService, domainService, capiClientService, fetcherService, envService, ignoreService, tabsAndEditorsService, workspaceService, commandService, notificationService, customInstructionsService) {
        this.scopeSelector = scopeSelector;
        this.instantiationService = instantiationService;
        this.reviewService = reviewService;
        this.authService = authService;
        this.logService = logService;
        this.gitExtensionService = gitExtensionService;
        this.domainService = domainService;
        this.capiClientService = capiClientService;
        this.fetcherService = fetcherService;
        this.envService = envService;
        this.ignoreService = ignoreService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.workspaceService = workspaceService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.customInstructionsService = customInstructionsService;
    }
    async review(group, progressLocation, cancellationToken) {
        return doReview(this.scopeSelector, this.instantiationService, this.reviewService, this.authService, this.logService, this.gitExtensionService, this.capiClientService, this.domainService, this.fetcherService, this.envService, this.ignoreService, this.tabsAndEditorsService, this.workspaceService, this.commandService, this.notificationService, this.customInstructionsService, group, progressLocation, cancellationToken);
    }
};
exports.ReviewSession = ReviewSession;
exports.ReviewSession = ReviewSession = __decorate([
    __param(0, scopeSelection_1.IScopeSelector),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, reviewService_1.IReviewService),
    __param(3, authentication_1.IAuthenticationService),
    __param(4, logService_1.ILogService),
    __param(5, gitExtensionService_1.IGitExtensionService),
    __param(6, domainService_1.IDomainService),
    __param(7, capiClient_1.ICAPIClientService),
    __param(8, fetcherService_1.IFetcherService),
    __param(9, envService_1.IEnvService),
    __param(10, ignoreService_1.IIgnoreService),
    __param(11, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(12, workspaceService_1.IWorkspaceService),
    __param(13, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(14, notificationService_1.INotificationService),
    __param(15, customInstructionsService_1.ICustomInstructionsService)
], ReviewSession);
function combineCancellationTokens(token1, token2) {
    const combinedSource = new cancellation_1.CancellationTokenSource();
    const subscription1 = token1.onCancellationRequested(() => {
        combinedSource.cancel();
        cleanup();
    });
    const subscription2 = token2.onCancellationRequested(() => {
        combinedSource.cancel();
        cleanup();
    });
    function cleanup() {
        subscription1.dispose();
        subscription2.dispose();
    }
    return combinedSource.token;
}
let inProgress;
async function doReview(scopeSelector, instantiationService, reviewService, authService, logService, gitExtensionService, capiClientService, domainService, fetcherService, envService, ignoreService, tabsAndEditorsService, workspaceService, commandService, notificationService, customInstructionsService, group, progressLocation, cancellationToken) {
    if (authService.copilotToken?.isNoAuthUser) {
        // Review requires a logged in user, so best we can do is prompt them to sign in
        await notificationService.showQuotaExceededDialog({ isNoAuthUser: true });
        return undefined;
    }
    const editor = tabsAndEditorsService.activeTextEditor;
    let selection = editor?.selection;
    if (group === 'selection') {
        if (!editor) {
            return;
        }
        if (!selection || selection.isEmpty) {
            try {
                const rangeOfEnclosingSymbol = await scopeSelector.selectEnclosingScope(editor, { reason: vscodeTypes_1.l10n.t('Select an enclosing range to review'), includeBlocks: true });
                if (!rangeOfEnclosingSymbol) {
                    return;
                }
                selection = rangeOfEnclosingSymbol;
            }
            catch (err) {
                if ((0, errors_1.isCancellationError)(err)) {
                    return;
                }
            }
        }
    }
    const title = group === 'selection' ? vscodeTypes_1.l10n.t('Reviewing selected code in {0}...', path.posix.basename(editor.document.uri.path))
        : group === 'index' ? vscodeTypes_1.l10n.t('Reviewing staged changes...')
            : group === 'workingTree' ? vscodeTypes_1.l10n.t('Reviewing unstaged changes...')
                : group === 'all' ? vscodeTypes_1.l10n.t('Reviewing uncommitted changes...')
                    : 'repositoryRoot' in group ? vscodeTypes_1.l10n.t('Reviewing changes...')
                        : group.group === 'index' ? vscodeTypes_1.l10n.t('Reviewing staged changes in {0}...', path.posix.basename(group.file.path))
                            : vscodeTypes_1.l10n.t('Reviewing unstaged changes in {0}...', path.posix.basename(group.file.path));
    return notificationService.withProgress({
        location: progressLocation,
        title,
        cancellable: true,
    }, async (_progress, progressToken) => {
        if (inProgress) {
            inProgress.cancel();
        }
        const tokenSource = inProgress = new cancellation_1.CancellationTokenSource(cancellationToken ? combineCancellationTokens(cancellationToken, progressToken) : progressToken);
        reviewService.removeReviewComments(reviewService.getReviewComments());
        const progress = {
            report: comments => {
                if (!tokenSource.token.isCancellationRequested) {
                    reviewService.addReviewComments(comments);
                }
            }
        };
        let result;
        try {
            const copilotToken = await authService.getCopilotToken();
            const canUseGitHubAgent = copilotToken.isCopilotCodeReviewEnabled;
            result = canUseGitHubAgent ? await (0, githubReviewAgent_1.githubReview)(logService, gitExtensionService, authService, capiClientService, domainService, fetcherService, envService, ignoreService, workspaceService, customInstructionsService, group, editor, progress, tokenSource.token) : await review(instantiationService, gitExtensionService, workspaceService, typeof group === 'object' && 'group' in group ? group.group : group, editor, progress, tokenSource.token);
        }
        catch (err) {
            logService.error(err, 'Error during code review');
            result = { type: 'error', reason: err.message, severity: err.severity };
        }
        finally {
            if (tokenSource === inProgress) {
                inProgress = undefined;
            }
            tokenSource.dispose();
        }
        if (tokenSource.token.isCancellationRequested) {
            return { type: 'cancelled' };
        }
        if (result.type === 'error') {
            const showLog = vscodeTypes_1.l10n.t('Show Log');
            const res = await (result.severity === 'info' ?
                notificationService.showInformationMessage(result.reason, { modal: true }) :
                notificationService.showInformationMessage(vscodeTypes_1.l10n.t('Code review generation failed.'), { modal: true, detail: result.reason }, showLog));
            if (res === showLog) {
                logService.show();
            }
        }
        else if (result.type === 'success' && result.comments.length === 0) {
            if (result.excludedComments?.length) {
                const show = vscodeTypes_1.l10n.t('Show Skipped');
                const res = await notificationService.showInformationMessage(vscodeTypes_1.l10n.t('Reviewing your code did not provide any feedback.'), { modal: true, detail: vscodeTypes_1.l10n.t('{0} comments were skipped due to low confidence.', result.excludedComments.length) }, show);
                if (res === show) {
                    reviewService.addReviewComments(result.excludedComments);
                }
            }
            else {
                await notificationService.showInformationMessage(vscodeTypes_1.l10n.t('Reviewing your code did not provide any feedback.'), { modal: true, detail: result.reason || vscodeTypes_1.l10n.t('Copilot only keeps its highest confidence comments to reduce noise and keep you focused.') });
            }
        }
        return result;
    });
}
async function review(instantiationService, gitExtensionService, workspaceService, group, editor, progress, cancellationToken) {
    const feedbackGenerator = instantiationService.createInstance(feedbackGenerator_1.FeedbackGenerator);
    const input = [];
    if (group === 'index' || group === 'workingTree' || group === 'all') {
        const changes = await currentChange_1.CurrentChange.getCurrentChanges(gitExtensionService, group);
        const documentsAndChanges = await Promise.all(changes.map(async (change) => {
            try {
                const document = await workspaceService.openTextDocument(change.uri);
                return {
                    document: textDocumentSnapshot_1.TextDocumentSnapshot.create(document),
                    relativeDocumentPath: path.relative(change.repository.rootUri.fsPath, change.uri.fsPath),
                    change,
                };
            }
            catch (err) {
                try {
                    if ((await workspaceService.fs.stat(change.uri)).type === fileTypes_1.FileType.File) {
                        throw err;
                    }
                    return undefined;
                }
                catch (inner) {
                    if (inner.code === 'FileNotFound') {
                        return undefined;
                    }
                    throw err;
                }
            }
        }));
        documentsAndChanges.map(i => {
            if (i) {
                input.push(i);
            }
        });
    }
    else if (group === 'selection') {
        input.push({
            document: textDocumentSnapshot_1.TextDocumentSnapshot.create(editor.document),
            relativeDocumentPath: path.basename(editor.document.uri.fsPath),
            selection: editor.selection,
        });
    }
    else {
        for (const patch of group.patches) {
            const uri = uri_1.URI.parse(patch.fileUri);
            input.push({
                document: textDocumentSnapshot_1.TextDocumentSnapshot.create(await workspaceService.openTextDocument(uri)),
                relativeDocumentPath: path.relative(group.repositoryRoot, uri.fsPath),
                change: await currentChange_1.CurrentChange.getChanges(gitExtensionService, uri_1.URI.file(group.repositoryRoot), uri, patch.patch)
            });
        }
    }
    return feedbackGenerator.generateComments(input, cancellationToken, progress);
}
//# sourceMappingURL=doReview.js.map