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
exports.ReviewIntent = exports.reviewLocalChangesMessage = exports.reviewIntentPromptSnippet = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const logService_1 = require("../../../platform/log/common/logService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const linkifiedText_1 = require("../../linkify/common/linkifiedText");
const feedbackGenerator_1 = require("../../prompt/node/feedbackGenerator");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const currentChange_1 = require("../../prompts/node/feedback/currentChange");
const provideFeedback_1 = require("../../prompts/node/feedback/provideFeedback");
exports.reviewIntentPromptSnippet = 'Review the currently selected code.';
exports.reviewLocalChangesMessage = l10n.t('local changes');
let ReviewIntentInvocation = class ReviewIntentInvocation extends promptRenderer_1.RendererIntentInvocation {
    constructor(intent, location, endpoint, documentContext, instantiationService, workspaceService, tabsAndEditorsService, logService, gitExtensionService) {
        super(intent, location, endpoint);
        this.documentContext = documentContext;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.logService = logService;
        this.gitExtensionService = gitExtensionService;
        this.linkification = {
            additionaLinkifiers: [{ create: () => new LineLinkifier(this.documentContext.document.uri) }]
        };
    }
    async createRenderer({ history, query, chatVariables }, endpoint, progress, token) {
        const input = [];
        if (query === exports.reviewLocalChangesMessage) {
            const changes = await currentChange_1.CurrentChange.getCurrentChanges(this.gitExtensionService, 'workingTree');
            const documentsAndChanges = await Promise.all(changes.map(async (change) => {
                const document = await this.workspaceService.openTextDocumentAndSnapshot(change.uri);
                return {
                    document,
                    relativeDocumentPath: path.relative(change.repository.rootUri.fsPath, change.uri.fsPath),
                    change,
                };
            }));
            documentsAndChanges.map(i => input.push(i));
        }
        else {
            const editor = this.tabsAndEditorsService.activeTextEditor;
            if (editor) {
                input.push({
                    document: textDocumentSnapshot_1.TextDocumentSnapshot.create(editor.document),
                    relativeDocumentPath: path.basename(editor.document.uri.fsPath),
                    selection: editor.selection,
                });
            }
        }
        return promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, provideFeedback_1.ProvideFeedbackPrompt, {
            query,
            history,
            chatVariables,
            input,
            logService: this.logService,
        });
    }
    async buildPrompt(context, progress, token) {
        if (context.query === '') {
            context = { ...context, query: exports.reviewIntentPromptSnippet };
        }
        return super.buildPrompt(context, progress, token);
    }
};
ReviewIntentInvocation = __decorate([
    __param(4, instantiation_1.IInstantiationService),
    __param(5, workspaceService_1.IWorkspaceService),
    __param(6, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(7, logService_1.ILogService),
    __param(8, gitExtensionService_1.IGitExtensionService)
], ReviewIntentInvocation);
class InlineReviewIntentInvocation extends ReviewIntentInvocation {
    processResponse(context, inputStream, outputStream, token) {
        const replyInterpreter = this.instantiationService.createInstance(ReviewReplyInterpreter, this.documentContext);
        return replyInterpreter.processResponse(context, inputStream, outputStream, token);
    }
}
let ReviewIntent = class ReviewIntent {
    static { this.ID = "review" /* Intent.Review */; }
    constructor(instantiationService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.id = "review" /* Intent.Review */;
        this.locations = [commonTypes_1.ChatLocation.Panel, commonTypes_1.ChatLocation.Editor];
        this.description = l10n.t('Review the selected code in your active editor');
    }
    async invoke(invocationContext) {
        const documentContext = invocationContext.documentContext;
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        if (location === commonTypes_1.ChatLocation.Editor) {
            return this.instantiationService.createInstance(InlineReviewIntentInvocation, this, location, endpoint, documentContext);
        }
        return this.instantiationService.createInstance(ReviewIntentInvocation, this, location, endpoint, documentContext);
    }
};
exports.ReviewIntent = ReviewIntent;
exports.ReviewIntent = ReviewIntent = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider)
], ReviewIntent);
class LineLinkifier {
    constructor(file) {
        this.file = file;
    }
    async linkify(newText, context, token) {
        const parsedResponse = (0, feedbackGenerator_1.parseFeedbackResponse)(newText);
        if (!parsedResponse.length) {
            return;
        }
        let remaining = 0;
        const parts = [];
        for (const match of parsedResponse) {
            parts.push(newText.substring(remaining, match.linkOffset));
            parts.push(new linkifiedText_1.LinkifyLocationAnchor(this.file.with({ fragment: String(match.from + 1) }), newText.substring(match.linkOffset, match.linkOffset + match.linkLength)));
            remaining = match.linkOffset + match.linkLength;
        }
        parts.push(newText.substring(remaining));
        return { parts };
    }
}
let ReviewReplyInterpreter = class ReviewReplyInterpreter {
    constructor(documentContext, reviewService) {
        this.documentContext = documentContext;
        this.reviewService = reviewService;
        this.updating = false;
        this.text = '';
        this.comments = [];
    }
    async processResponse(context, inputStream, outputStream, token) {
        const request = {
            source: 'vscodeCopilotChat',
            promptCount: 1,
            messageId: (0, uuid_1.generateUuid)(), // TODO: Use from request?
            inputType: 'selection',
            inputRanges: [
                {
                    uri: this.documentContext.document.uri,
                    ranges: [this.documentContext.selection]
                }
            ],
        };
        for await (const part of inputStream) {
            this.text += part.delta.text;
            if (!this.updating) {
                this.updating = true;
                const content = new vscodeTypes_1.MarkdownString(l10n.t({
                    message: 'Reviewing your code...\n',
                    comment: "{Locked='](command:workbench.panel.markers.view.focus)'}",
                }));
                content.isTrusted = {
                    enabledCommands: ['workbench.panel.markers.view.focus']
                };
                outputStream.markdown(content);
            }
            const comments = (0, feedbackGenerator_1.parseReviewComments)(request, [
                {
                    document: this.documentContext.document,
                    relativeDocumentPath: path.basename(this.documentContext.document.uri.fsPath),
                    selection: this.documentContext.selection
                }
            ], this.text, true);
            if (comments.length > this.comments.length) {
                this.reviewService.addReviewComments(comments.slice(this.comments.length));
                this.comments = comments;
            }
        }
        const comments = (0, feedbackGenerator_1.parseReviewComments)(request, [
            {
                document: this.documentContext.document,
                relativeDocumentPath: path.basename(this.documentContext.document.uri.fsPath),
                selection: this.documentContext.selection
            }
        ], this.text, false); // parse all
        if (comments.length > this.comments.length) {
            this.reviewService.addReviewComments(comments.slice(this.comments.length));
            this.comments = comments;
        }
        outputStream.markdown(l10n.t('Reviewed your code and generated {0} suggestions.', comments.length));
    }
};
ReviewReplyInterpreter = __decorate([
    __param(1, reviewService_1.IReviewService)
], ReviewReplyInterpreter);
//# sourceMappingURL=reviewIntent.js.map