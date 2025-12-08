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
exports.ReviewServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const authentication_1 = require("../../authentication/common/authentication");
const configurationService_1 = require("../../configuration/common/configurationService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const gitExtensionService_1 = require("../../git/common/gitExtensionService");
const reviewDiffContextKey = 'puku.chat.reviewDiff.enabled';
const reviewDiffReposContextKey = 'puku.chat.reviewDiff.enabledRootUris';
const numberOfReviewCommentsKey = 'puku.chat.review.numberOfComments';
let ReviewServiceImpl = class ReviewServiceImpl {
    constructor(_configurationService, _authenticationService, _contextService, _gitExtensionService) {
        this._configurationService = _configurationService;
        this._authenticationService = _authenticationService;
        this._contextService = _contextService;
        this._gitExtensionService = _gitExtensionService;
        this._disposables = new lifecycle_1.DisposableStore();
        this._repositoryDisposables = new lifecycle_1.DisposableStore();
        this._commentController = vscode.comments.createCommentController('github-copilot-review', 'Code Review');
        this._comments = [];
        this._disposables.add(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(configurationService_1.ConfigKey.CodeFeedback.fullyQualifiedId)) {
                vscode.commands.executeCommand('setContext', configurationService_1.ConfigKey.CodeFeedback.fullyQualifiedId, this.isCodeFeedbackEnabled());
            }
            if (e.affectsConfiguration('puku.advanced') || e.affectsConfiguration('puku.advanced.review.intent')) {
                vscode.commands.executeCommand('setContext', configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent.fullyQualifiedId, this.isIntentEnabled());
            }
        }));
        this._disposables.add(this._authenticationService.onDidAuthenticationChange(() => {
            vscode.commands.executeCommand('setContext', reviewDiffContextKey, this.isReviewDiffEnabled());
        }));
        this._disposables.add(this._repositoryDisposables);
        this._disposables.add(this._gitExtensionService.onDidChange(() => {
            this.updateRepositoryListeners();
        }));
        this.updateRepositoryListeners();
        this.updateContextValues();
        vscode.commands.executeCommand('setContext', numberOfReviewCommentsKey, 0);
    }
    updateRepositoryListeners() {
        this._repositoryDisposables.clear();
        const api = this._gitExtensionService.getExtensionApi();
        if (api) {
            this._repositoryDisposables.add(api.onDidOpenRepository(() => {
                this.updateRepositoryListeners();
            }));
            this._repositoryDisposables.add(api.onDidCloseRepository(() => {
                this.updateRepositoryListeners();
            }));
            api.repositories.forEach(repo => {
                this._repositoryDisposables.add(repo.state.onDidChange(() => {
                    this.updateReviewDiffReposContext();
                }));
            });
        }
        this.updateReviewDiffReposContext();
    }
    updateReviewDiffReposContext() {
        const reviewDiffRepos = this.getRepositoriesWithUncommitedChanges();
        const reviewDiffReposString = reviewDiffRepos.map(uri => uri.toString()).sort().join(',');
        if (reviewDiffReposString !== this._reviewDiffReposString) {
            this._reviewDiffReposString = reviewDiffReposString;
            vscode.commands.executeCommand('setContext', reviewDiffReposContextKey, reviewDiffRepos);
        }
    }
    getRepositoriesWithUncommitedChanges() {
        const r = this._gitExtensionService.getExtensionApi()?.repositories
            .filter(({ state }) => state.workingTreeChanges.length || state.indexChanges.length || state.untrackedChanges.length || state.mergeChanges.length)
            .map(repo => repo.rootUri) || [];
        return r;
    }
    updateContextValues() {
        vscode.commands.executeCommand('setContext', configurationService_1.ConfigKey.CodeFeedback.fullyQualifiedId, this.isCodeFeedbackEnabled());
        vscode.commands.executeCommand('setContext', reviewDiffContextKey, this.isReviewDiffEnabled());
        vscode.commands.executeCommand('setContext', configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent.fullyQualifiedId, this.isIntentEnabled());
    }
    isCodeFeedbackEnabled() {
        const inspect = this._configurationService.inspectConfig(configurationService_1.ConfigKey.CodeFeedback);
        return inspect?.workspaceFolderValue ?? inspect?.workspaceValue ?? inspect?.globalValue ?? this._configurationService.getDefaultValue(configurationService_1.ConfigKey.CodeFeedback);
    }
    isReviewDiffEnabled() {
        return this._configurationService.getConfig(configurationService_1.ConfigKey.ReviewAgent) && this._authenticationService.copilotToken?.isCopilotCodeReviewEnabled || false;
    }
    isIntentEnabled() {
        return this._configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent);
    }
    getDiagnosticCollection() {
        return this._diagnosticCollection || this._disposables.add(this._diagnosticCollection = vscode.languages.createDiagnosticCollection('puku.chat.review'));
    }
    getReviewComments() {
        return this._comments.map(({ comment }) => comment);
    }
    addReviewComments(comments) {
        for (const comment of comments) {
            const thread = this._commentController.createCommentThread(comment.uri, comment.range, this.createUIComments(comment));
            thread.contextValue = 'hasNoSuggestion';
            thread.canReply = false;
            if (!this._comments.find(c => c.comment.uri.toString() === comment.uri.toString())) {
                thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
            }
            this._comments.push({ comment, thread });
            this.updateThreadLabels();
            if (this._comments.length === 1) {
                vscode.commands.executeCommand('puku.chat.review.next');
                this._monitorActiveThread = setInterval(() => {
                    const raw = this._commentController.activeCommentThread;
                    const active = raw && this._comments.find(c => c.thread.label === raw.label)?.thread; // https://github.com/microsoft/vscode/issues/223025
                    if (active !== this._activeThread) {
                        this._activeThread = active;
                        if (active) {
                            vscode.commands.executeCommand('puku.chat.review.current', active);
                        }
                    }
                }, 500);
            }
        }
        vscode.commands.executeCommand('setContext', numberOfReviewCommentsKey, this._comments.length);
    }
    updateReviewComment(comment) {
        const thread = this.findCommentThread(comment);
        if (!thread) {
            return;
        }
        thread.comments = this.createUIComments(comment);
    }
    createUIComments(comment) {
        const appendText = ''; // `\n\n(Type ${comment.kind}, severity ${comment.severity}.)`;
        const change = comment.suggestion
            ? 'edits' in comment.suggestion
                ? comment.suggestion.edits.length
                    ? `\n\n***\n${vscode_1.l10n.t('Suggested change:')}${comment.suggestion.edits.map(e => `\n\`\`\`diff\n${diff(e)}\n\`\`\``).join('')}\n***`
                    : `\n\n${vscode_1.l10n.t('No change found to suggest.')}`
                : `\n\n${vscode_1.l10n.t('Looking up change to suggest...')}`
            : '';
        const comments = [
            {
                body: typeof comment.body === 'string' ? `${comment.body}${change}${appendText}` : new vscode.MarkdownString(`${comment.body.value}${change}${appendText}`),
                mode: vscode.CommentMode.Preview,
                author: {
                    name: vscode_1.l10n.t('Code Review'),
                    iconPath: uri_1.URI.joinPath(this._contextService.extensionUri, 'assets', 'copilot.png'),
                },
            }
        ];
        return comments;
    }
    collapseReviewComment(comment) {
        const internalComment = this._comments.find(c => c.comment === comment);
        if (!internalComment) {
            return;
        }
        const oldThread = internalComment.thread;
        oldThread.dispose();
        const newThread = this._commentController.createCommentThread(comment.uri, comment.range, oldThread.comments);
        newThread.contextValue = oldThread.contextValue;
        newThread.canReply = false;
        newThread.label = oldThread.label;
        internalComment.thread = newThread;
    }
    removeReviewComments(comments) {
        for (const comment of comments) {
            const index = this._comments.findIndex(c => c.comment === comment);
            if (index !== -1) {
                this._comments[index].thread.dispose();
                this._comments.splice(index, 1);
            }
        }
        this.updateThreadLabels();
        if (this._comments.length === 0 && this._monitorActiveThread) {
            clearInterval(this._monitorActiveThread);
            this._monitorActiveThread = undefined;
        }
        vscode.commands.executeCommand('setContext', numberOfReviewCommentsKey, this._comments.length);
    }
    updateThreadLabels() {
        this._comments.forEach((comment, i) => {
            comment.thread.label = vscode_1.l10n.t('Comment {0} of {1}', i + 1, this._comments.length);
        });
    }
    findReviewComment(threadOrComment) {
        const internalComment = this._comments.find(c => c.thread === threadOrComment || c.thread.comments[0] === threadOrComment);
        return internalComment?.comment;
    }
    findCommentThread(comment) {
        const internalComment = this._comments.find(c => c.comment === comment);
        return internalComment?.thread;
    }
    dispose() {
        this._disposables.dispose();
    }
};
exports.ReviewServiceImpl = ReviewServiceImpl;
exports.ReviewServiceImpl = ReviewServiceImpl = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, extensionContext_1.IVSCodeExtensionContext),
    __param(3, gitExtensionService_1.IGitExtensionService)
], ReviewServiceImpl);
function diff(change) {
    const oldText = change.oldText.split(/\r?\n/);
    const newText = change.newText.split(/\r?\n/);
    while (oldText.length && newText.length && oldText[0] === newText[0]) {
        oldText.shift();
        newText.shift();
    }
    while (oldText.length && newText.length && oldText[oldText.length - 1] === newText[newText.length - 1]) {
        oldText.pop();
        newText.pop();
    }
    return `${oldText.map(line => `- ${line}`).join('\n')}
${newText.map(line => `+ ${line}`).join('\n')}`;
}
//# sourceMappingURL=reviewServiceImpl.js.map