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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInlineChatCommands = registerInlineChatCommands;
const vscode = __importStar(require("vscode"));
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const naiveChunker_1 = require("../../../platform/chunking/node/naiveChunker");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const envService_1 = require("../../../platform/env/common/envService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const scopeSelection_1 = require("../../../platform/scopeSelection/common/scopeSelection");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const markdown_1 = require("../../../util/common/markdown");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const docIntent_1 = require("../../intents/node/docIntent");
const explainIntent_1 = require("../../intents/node/explainIntent");
const workspaceIntent_1 = require("../../intents/node/workspaceIntent");
const testGenAction_1 = require("../../intents/vscode-node/testGenAction");
const chatParticipantRequestHandler_1 = require("../../prompt/node/chatParticipantRequestHandler");
const feedbackGenerator_1 = require("../../prompt/node/feedbackGenerator");
const currentSelection_1 = require("../../prompts/node/panel/currentSelection");
const symbolAtCursor_1 = require("../../prompts/node/panel/symbolAtCursor");
const doReview_1 = require("../../review/node/doReview");
const inlineChatCodeActions_1 = require("./inlineChatCodeActions");
const inlineChatNotebookActions_1 = require("./inlineChatNotebookActions");
function registerInlineChatCommands(accessor) {
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const tabsAndEditorsService = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService);
    const scopeSelector = accessor.get(scopeSelection_1.IScopeSelector);
    const ignoreService = accessor.get(ignoreService_1.IIgnoreService);
    const reviewService = accessor.get(reviewService_1.IReviewService);
    const logService = accessor.get(logService_1.ILogService);
    const telemetryService = accessor.get(telemetry_1.ITelemetryService);
    const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
    const configurationService = accessor.get(configurationService_1.IConfigurationService);
    const parserService = accessor.get(parserService_1.IParserService);
    const disposables = new lifecycle_1.DisposableStore();
    const doExplain = async (arg0, fromPalette) => {
        let message = `@${workspaceIntent_1.workspaceIntentId} /${"explain" /* Intent.Explain */} `;
        let selectedText;
        let activeDocumentUri;
        let explainingDiagnostics = false;
        if (typeof arg0 === 'string' && arg0) {
            message = arg0;
        }
        else {
            // First see whether we are explaining diagnostics
            const emptySelection = currentSelection_1.CurrentSelection.getCurrentSelection(tabsAndEditorsService, true);
            if (emptySelection) {
                const severeDiagnostics = vscode.languages.getDiagnostics(emptySelection.activeDocument.uri);
                const diagnosticsInSelection = severeDiagnostics.filter(d => !!d.range.intersection(emptySelection.range));
                const filteredDiagnostics = inlineChatCodeActions_1.QuickFixesProvider.getWarningOrErrorDiagnostics(diagnosticsInSelection);
                if (filteredDiagnostics.length) {
                    message += inlineChatCodeActions_1.QuickFixesProvider.getDiagnosticsAsText(severeDiagnostics);
                    explainingDiagnostics = true;
                }
            }
            const selection = currentSelection_1.CurrentSelection.getCurrentSelection(tabsAndEditorsService);
            if (!explainingDiagnostics && selection) {
                message += explainIntent_1.explainIntentPromptSnippet;
                selectedText = formatSelection({ languageId: selection.languageId, selectedText: selection.selectedText });
                activeDocumentUri = selection.activeDocument.uri;
            }
            if (!explainingDiagnostics && emptySelection && fromPalette) {
                // Scope selection may further refine the active selection if it was ambiguous
                try {
                    const selectedScope = await symbolAtCursor_1.SymbolAtCursor.getSelectedScope(ignoreService, configurationService, tabsAndEditorsService, scopeSelector, parserService, { document: textDocumentSnapshot_1.TextDocumentSnapshot.create(emptySelection.activeDocument), selection: emptySelection.range });
                    if (selectedScope && selectedScope.symbolAtCursorState && selectedScope.symbolAtCursorState.codeAtCursor) {
                        message += explainIntent_1.explainIntentPromptSnippet;
                        const languageId = selectedScope.symbolAtCursorState.document.languageId ?? '';
                        selectedText = formatSelection({ languageId, selectedText: selectedScope.symbolAtCursorState.codeAtCursor });
                        activeDocumentUri = emptySelection.activeDocument.uri;
                    }
                }
                catch (ex) {
                    if (ex instanceof errors_1.CancellationError) {
                        // If the user invoked Explain This from the palette and chooses not to select a scope, we should not submit the question to chat
                        return;
                    }
                    (0, errors_1.onBugIndicatingError)(ex);
                }
            }
        }
        if (activeDocumentUri && selectedText && !await ignoreService.isCopilotIgnored(activeDocumentUri)) {
            message += selectedText;
        }
        vscode.commands.executeCommand('workbench.action.chat.open', { query: message });
    };
    const doApplyReview = async (commentThread, revealNext = false) => {
        const comment = reviewService.findReviewComment(commentThread);
        if (!comment || !comment.suggestion) {
            return;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.toString() !== comment.document.uri.toString()) {
            return;
        }
        const { edits } = await comment.suggestion;
        activeEditor.edit(editBuilder => {
            edits.forEach(edit => {
                editBuilder.replace(edit.range, edit.newText);
            });
        });
        if (revealNext) {
            goToNextReview(commentThread, +1);
        }
        const totalComments = reviewService.getReviewComments().length;
        reviewService.removeReviewComments([comment]);
        (0, feedbackGenerator_1.sendReviewActionTelemetry)(comment, totalComments, 'applySuggestion', logService, telemetryService, instaService);
    };
    const doContinueInInlineChat = async (commentThread) => {
        const comment = reviewService.findReviewComment(commentThread);
        if (!comment) {
            return;
        }
        const totalComments = reviewService.getReviewComments().length;
        const message = comment.body instanceof vscode.MarkdownString ? comment.body.value : comment.body;
        reviewService.removeReviewComments([comment]);
        await vscode.commands.executeCommand('vscode.editorChat.start', {
            initialRange: commentThread.range,
            message: `/fix ${message}`,
            autoSend: true,
        });
        (0, feedbackGenerator_1.sendReviewActionTelemetry)(comment, totalComments, 'continueInInlineChat', logService, telemetryService, instaService);
    };
    const doContinueInChat = async (thread) => {
        const comment = reviewService.findReviewComment(thread);
        if (!comment) {
            return;
        }
        const totalComments = reviewService.getReviewComments().length;
        const message = comment.body instanceof vscode.MarkdownString ? comment.body.value : comment.body;
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: 'Explain your comment.',
            isPartialQuery: true,
            previousRequests: [
                {
                    request: 'Review my code.',
                    response: `In file \`${path.basename(comment.uri.fsPath)}\` at line ${comment.range.start.line + 1}:

${message}`,
                }
            ]
        });
        (0, feedbackGenerator_1.sendReviewActionTelemetry)(comment, totalComments, 'continueInChat', logService, telemetryService, instaService);
    };
    const doDiscardReview = async (commentThread, revealNext = false) => {
        if (revealNext) {
            goToNextReview(commentThread, +1);
        }
        const reviewComment = reviewService.findReviewComment(commentThread);
        if (reviewComment) {
            const totalComments = reviewService.getReviewComments().length;
            reviewService.removeReviewComments([reviewComment]);
            (0, feedbackGenerator_1.sendReviewActionTelemetry)(reviewComment, totalComments, 'discardComment', logService, telemetryService, instaService);
        }
    };
    const doDiscardAllReview = async () => {
        const comments = reviewService.getReviewComments();
        if (comments.length) {
            reviewService.removeReviewComments(comments);
            (0, feedbackGenerator_1.sendReviewActionTelemetry)(comments, comments.length, 'discardAllComments', logService, telemetryService, instaService);
        }
    };
    const markReviewHelpful = async (comment) => {
        const reviewComment = reviewService.findReviewComment(comment);
        if (reviewComment) {
            const commentThread = reviewService.findCommentThread(reviewComment);
            if (commentThread) {
                commentThread.contextValue = updateContextValue(commentThread.contextValue, 'markedAsHelpful', 'markedAsUnhelpful');
            }
            const totalComments = reviewService.getReviewComments().length;
            (0, feedbackGenerator_1.sendReviewActionTelemetry)(reviewComment, totalComments, 'helpful', logService, telemetryService, instaService);
        }
    };
    const markReviewUnhelpful = async (comment) => {
        const reviewComment = reviewService.findReviewComment(comment);
        if (reviewComment) {
            const commentThread = reviewService.findCommentThread(reviewComment);
            if (commentThread) {
                commentThread.contextValue = updateContextValue(commentThread.contextValue, 'markedAsUnhelpful', 'markedAsHelpful');
            }
            const totalComments = reviewService.getReviewComments().length;
            (0, feedbackGenerator_1.sendReviewActionTelemetry)(reviewComment, totalComments, 'unhelpful', logService, telemetryService, instaService);
        }
    };
    const extensionMode = extensionContext.extensionMode;
    if (typeof extensionMode === 'number' && (extensionMode !== vscode.ExtensionMode.Test || envService_1.isScenarioAutomation)) {
        reviewService.updateContextValues();
    }
    const goToNextReview = (currentThread, direction) => {
        let newComment;
        if (currentThread) {
            const reviewComment = reviewService.findReviewComment(currentThread);
            if (!reviewComment) {
                return;
            }
            const reviewComments = reviewService.getReviewComments();
            const currentIndex = reviewComments.indexOf(reviewComment);
            const newIndex = (currentIndex + direction + reviewComments.length) % reviewComments.length;
            newComment = reviewComments[newIndex];
        }
        else {
            const reviewComments = reviewService.getReviewComments();
            newComment = reviewComments[direction > 0 ? 0 : reviewComments.length - 1];
        }
        const newThread = newComment && reviewService.findCommentThread(newComment);
        if (!newThread) {
            return;
        }
        if (direction !== 0) {
            newThread.reveal();
        }
        instaService.invokeFunction(fetchSuggestion, newThread);
    };
    const doGenerate = () => {
        return vscode.commands.executeCommand('vscode.editorChat.start', { message: '/generate ' });
    };
    const doGenerateDocs = () => {
        return vscode.commands.executeCommand('vscode.editorChat.start', { message: `/${docIntent_1.InlineDocIntent.ID} `, autoSend: true, initialRange: vscode.window.activeTextEditor?.selection });
    };
    const doGenerateTests = (arg) => {
        // @ulugbekna: `puku.chat.generateTests` is invoked from editor context menu, which means
        // 	the first arguments can be a vscode.Uri
        const context = (arg && typeof arg === 'object' &&
            'document' in arg && arg.document && typeof arg.document === 'object' && 'getText' in arg.document &&
            'selection' in arg && arg.selection instanceof vscode.Range)
            ? arg
            : undefined;
        return instaService.createInstance(testGenAction_1.GenerateTests).runCommand(context);
    };
    const doFix = () => {
        const activeDocument = vscode.window.activeTextEditor;
        if (!activeDocument) {
            return;
        }
        const activeSelection = activeDocument.selection;
        const diagnostics = vscode.languages.getDiagnostics(activeDocument.document.uri).filter(diagnostic => {
            return !!activeSelection.intersection(diagnostic.range);
        }).map(d => d.message).join(', ');
        return vscode.commands.executeCommand('vscode.editorChat.start', { message: `/${"fix" /* Intent.Fix */} ${diagnostics}`, autoSend: true, initialRange: vscode.window.activeTextEditor?.selection });
    };
    const doGenerateAltText = async (arg) => {
        if (arg && typeof arg === 'object' && 'isUrl' in arg && 'resolvedImagePath' in arg && typeof arg.resolvedImagePath === 'string' && 'type' in arg) {
            const baseQuery = 'Create an alt text description that is helpful for screen readers and people who are blind or have visual impairment. Never start alt text with "Image of..." or "Picture of...". Please clearly identify the primary subject or subjects of the image. Describe what the subject is doing, if applicable. Please add a short description of the wider environment. If there is text in the image please transcribe and include it. Please describe the emotional tone of the image, if applicable. Do not use single or double quotes in the alt text.';
            const fullQuery = arg.type === 'generate' ? baseQuery : `Refine the existing alt text for clarity and usefulness for screen readers. ${baseQuery}`;
            const uri = arg.isUrl ? uri_1.URI.parse(arg.resolvedImagePath) : uri_1.URI.file(arg.resolvedImagePath);
            return vscode.commands.executeCommand('vscode.editorChat.start', { message: fullQuery, attachments: [uri], autoSend: true, initialRange: vscode.window.activeTextEditor?.selection });
        }
    };
    // register commands
    disposables.add(vscode.commands.registerCommand('puku.chat.explain', doExplain));
    disposables.add(vscode.commands.registerCommand('puku.chat.explain.palette', () => doExplain(undefined, true)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review', () => instaService.createInstance(doReview_1.ReviewSession).review('selection', vscode.ProgressLocation.Notification)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.stagedChanges', () => instaService.createInstance(doReview_1.ReviewSession).review('index', vscode.ProgressLocation.Notification)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.unstagedChanges', () => instaService.createInstance(doReview_1.ReviewSession).review('workingTree', vscode.ProgressLocation.Notification)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.changes', () => instaService.createInstance(doReview_1.ReviewSession).review('all', vscode.ProgressLocation.Notification)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.stagedFileChange', (resource) => {
        return instaService.createInstance(doReview_1.ReviewSession).review({ group: 'index', file: resource.resourceUri }, vscode.ProgressLocation.Notification);
    }));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.unstagedFileChange', (resource) => {
        return instaService.createInstance(doReview_1.ReviewSession).review({ group: 'workingTree', file: resource.resourceUri }, vscode.ProgressLocation.Notification);
    }));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.apply', doApplyReview));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.applyAndNext', (commentThread) => doApplyReview(commentThread, true)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.applyShort', (commentThread) => doApplyReview(commentThread, true)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.continueInInlineChat', doContinueInInlineChat));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.continueInChat', doContinueInChat));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.discard', doDiscardReview));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.discardAndNext', (commentThread) => doDiscardReview(commentThread, true)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.discardShort', (commentThread) => doDiscardReview(commentThread, true)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.discardAll', doDiscardAllReview));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.markHelpful', markReviewHelpful));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.markUnhelpful', markReviewUnhelpful));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.previous', thread => goToNextReview(thread, -1)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.next', thread => goToNextReview(thread, +1)));
    disposables.add(vscode.commands.registerCommand('puku.chat.review.current', thread => goToNextReview(thread, 0)));
    disposables.add(vscode.commands.registerCommand('puku.chat.generate', doGenerate));
    disposables.add(vscode.commands.registerCommand('puku.chat.generateDocs', doGenerateDocs));
    disposables.add(vscode.commands.registerCommand('puku.chat.generateTests', doGenerateTests));
    disposables.add(vscode.commands.registerCommand('puku.chat.fix', doFix));
    disposables.add(vscode.commands.registerCommand('puku.chat.generateAltText', doGenerateAltText));
    // register code actions
    disposables.add(vscode.languages.registerCodeActionsProvider('*', instaService.createInstance(inlineChatCodeActions_1.QuickFixesProvider), {
        providedCodeActionKinds: inlineChatCodeActions_1.QuickFixesProvider.providedCodeActionKinds,
    }));
    disposables.add(vscode.languages.registerCodeActionsProvider('*', instaService.createInstance(inlineChatCodeActions_1.RefactorsProvider), {
        providedCodeActionKinds: inlineChatCodeActions_1.RefactorsProvider.providedCodeActionKinds,
    }));
    disposables.add(vscode.notebooks.registerNotebookCellStatusBarItemProvider('jupyter-notebook', instaService.createInstance(inlineChatNotebookActions_1.NotebookExectionStatusBarItemProvider)));
    return disposables;
}
function fetchSuggestion(accessor, thread) {
    const logService = accessor.get(logService_1.ILogService);
    const reviewService = accessor.get(reviewService_1.IReviewService);
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const comment = reviewService.findReviewComment(thread);
    if (!comment || comment.suggestion || comment.skipSuggestion) {
        if (comment?.suggestion && 'edits' in comment.suggestion && comment.suggestion.edits.length && thread.contextValue?.includes('hasNoSuggestion')) {
            thread.contextValue = updateContextValue(thread.contextValue, 'hasSuggestion', 'hasNoSuggestion');
        }
        return;
    }
    comment.suggestion = (async () => {
        const message = comment.body instanceof vscode.MarkdownString ? comment.body.value : comment.body;
        const document = comment.document;
        const selection = new vscode.Selection(comment.range.start, comment.range.end);
        const command = "fix" /* Intent.Fix */;
        const prompt = message;
        const request = {
            location: vscode.ChatLocation.Editor,
            location2: new vscode.ChatRequestEditorData(document.document, selection, selection),
            command,
            prompt,
            references: [],
            attempt: 0,
            enableCommandDetection: false,
            isParticipantDetected: false,
            toolReferences: [],
            toolInvocationToken: undefined,
            model: null,
            tools: new Map(),
            id: '1',
            sessionId: '1',
        };
        let markdown = '';
        const edits = [];
        const stream = new chatResponseStreamImpl_1.ChatResponseStreamImpl((value) => {
            if (value instanceof vscode.ChatResponseTextEditPart && value.edits.length > 0) {
                edits.push(...value.edits.map(e => ({
                    range: e.range,
                    newText: e.newText,
                    oldText: document.getText(e.range),
                })).filter(e => e.newText !== e.oldText));
            }
            else if (value instanceof vscode.ChatResponseMarkdownPart) {
                markdown += value.value.value;
            }
        }, () => { });
        const requestHandler = instantiationService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], request, stream, cancellation_1.CancellationToken.None, {
            agentId: (0, chatAgents_1.getChatParticipantIdFromName)(chatAgents_1.editorAgentName),
            agentName: chatAgents_1.editorAgentName,
            intentId: request.command,
        }, event_1.Event.None);
        const result = await requestHandler.getResult();
        if (result.errorDetails) {
            throw new Error(result.errorDetails.message);
        }
        const suggestion = { markdown, edits };
        comment.suggestion = suggestion;
        reviewService.updateReviewComment(comment);
        thread.contextValue = edits.length
            ? updateContextValue(thread.contextValue, 'hasSuggestion', 'hasNoSuggestion')
            : updateContextValue(thread.contextValue, 'hasNoSuggestion', 'hasSuggestion');
        return suggestion;
    })()
        .catch(err => {
        logService.error(err, 'Error fetching suggestion');
        comment.suggestion = {
            markdown: `Error fetching suggestion: ${err?.message}`,
            edits: [],
        };
        reviewService.updateReviewComment(comment);
        return comment.suggestion;
    });
    reviewService.updateReviewComment(comment);
}
function updateContextValue(value, add, remove) {
    return (value ? value.split(',') : [])
        .filter(v => v !== add && v !== remove)
        .concat(add)
        .sort()
        .join(',');
}
function formatSelection(selection) {
    const fileContext = selection.fileName ? `From the file: ${path.basename(selection.fileName)}\n` : '';
    const { trimmedLines } = (0, naiveChunker_1.trimCommonLeadingWhitespace)(selection.selectedText.split(/\r?\n/g));
    return `\n\n${fileContext}${(0, markdown_1.createFencedCodeBlock)(selection.languageId, (0, arrays_1.coalesce)(trimmedLines).join('\n'))}\n\n`;
}
//# sourceMappingURL=inlineChatCommands.js.map