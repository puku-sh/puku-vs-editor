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
var QuickFixesProvider_1, RefactorsProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefactorsProvider = exports.QuickFixesProvider = void 0;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const arrays_1 = require("../../../util/common/arrays");
const imageUtils_1 = require("../../../util/common/imageUtils");
const async_1 = require("../../../util/vs/base/common/async");
const path = __importStar(require("../../../util/vs/base/common/path"));
const vscodeTypes_1 = require("../../../vscodeTypes");
const workspaceIntent_1 = require("../../intents/node/workspaceIntent");
class AICodeAction extends vscode.CodeAction {
    constructor() {
        super(...arguments);
        this.isAI = true;
    }
}
let QuickFixesProvider = class QuickFixesProvider {
    static { QuickFixesProvider_1 = this; }
    constructor(configurationService, ignoreService, reviewService) {
        this.configurationService = configurationService;
        this.ignoreService = ignoreService;
        this.reviewService = reviewService;
    }
    static { this.fixKind = vscode.CodeActionKind.QuickFix.append('copilot'); }
    static { this.explainKind = vscode.CodeActionKind.QuickFix.append('explain').append('copilot'); }
    static { this.reviewKind = vscode.CodeActionKind.RefactorRewrite.append('review').append('copilot'); }
    static { this.providedCodeActionKinds = [
        this.fixKind,
        this.explainKind,
        this.reviewKind,
    ]; }
    static getWarningOrErrorDiagnostics(diagnostics) {
        return diagnostics.filter(d => d.severity <= vscode.DiagnosticSeverity.Warning);
    }
    static getDiagnosticsAsText(diagnostics) {
        return diagnostics.map(d => d.message).join(', ');
    }
    async provideCodeActions(doc, range, context, cancellationToken) {
        const copilotCodeActionsEnabled = this.configurationService.getConfig(configurationService_1.ConfigKey.EnableCodeActions);
        if (!copilotCodeActionsEnabled) {
            return;
        }
        if (await this.ignoreService.isCopilotIgnored(doc.uri)) {
            return;
        }
        if (cancellationToken.isCancellationRequested) {
            return;
        }
        const codeActions = [];
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
            return codeActions;
        }
        const altTextQuickFixes = this.provideAltTextQuickFix(doc, range);
        if (altTextQuickFixes) {
            altTextQuickFixes.command = {
                title: altTextQuickFixes.title,
                command: 'puku.chat.generateAltText',
                arguments: [
                    {
                        type: altTextQuickFixes.type,
                        resolvedImagePath: altTextQuickFixes.resolvedImagePath,
                        isUrl: altTextQuickFixes.isUrl,
                    }
                ],
            };
            codeActions.push(altTextQuickFixes);
        }
        if (this.reviewService.isCodeFeedbackEnabled() && !activeTextEditor.selection.isEmpty) {
            const reviewAction = new AICodeAction(vscode.l10n.t('Review'), QuickFixesProvider_1.reviewKind);
            reviewAction.command = {
                title: reviewAction.title,
                command: 'puku.chat.review',
            };
            codeActions.push(reviewAction);
        }
        const severeDiagnostics = QuickFixesProvider_1.getWarningOrErrorDiagnostics(context.diagnostics);
        if (severeDiagnostics.length === 0) {
            return codeActions;
        }
        const initialRange = severeDiagnostics.map(d => d.range).reduce((a, b) => a.union(b));
        const initialSelection = new vscode.Selection(initialRange.start, initialRange.end);
        const diagnostics = QuickFixesProvider_1.getDiagnosticsAsText(severeDiagnostics);
        const fixAction = new AICodeAction(vscode.l10n.t('Fix'), QuickFixesProvider_1.fixKind);
        fixAction.diagnostics = severeDiagnostics;
        fixAction.command = {
            title: fixAction.title,
            command: 'vscode.editorChat.start',
            arguments: [
                {
                    autoSend: true,
                    message: `/fix ${diagnostics}`,
                    position: initialRange.start,
                    initialSelection: initialSelection,
                    initialRange: initialRange
                },
            ],
        };
        const explainAction = new AICodeAction(vscode.l10n.t('Explain'), QuickFixesProvider_1.explainKind);
        explainAction.diagnostics = severeDiagnostics;
        const query = `@${workspaceIntent_1.workspaceIntentId} /${"explain" /* Intent.Explain */} ${diagnostics}`;
        explainAction.command = {
            title: explainAction.title,
            command: 'puku.chat.explain',
            arguments: [query],
        };
        codeActions.push(fixAction, explainAction);
        return codeActions;
    }
    provideAltTextQuickFix(document, range) {
        const currentLine = document.lineAt(range.start.line).text;
        const generateImagePath = (0, imageUtils_1.extractImageAttributes)(currentLine);
        const refineImagePath = (0, imageUtils_1.extractImageAttributes)(currentLine, true);
        if (!generateImagePath && !refineImagePath) {
            return;
        }
        if (generateImagePath) {
            const isUrl = this.isValidUrl(generateImagePath);
            const resolvedImagePath = isUrl ? generateImagePath : path.resolve(path.dirname(document.uri.fsPath), generateImagePath);
            return {
                title: vscode.l10n.t('Generate alt text'),
                kind: vscode.CodeActionKind.QuickFix,
                resolvedImagePath,
                type: 'generate',
                isUrl,
                isAI: true,
            };
        }
        else if (refineImagePath) {
            const isUrl = this.isValidUrl(refineImagePath);
            const resolvedImagePath = isUrl ? refineImagePath : path.resolve(path.dirname(document.uri.fsPath), refineImagePath);
            return {
                title: vscode.l10n.t('Refine alt text'),
                kind: vscode.CodeActionKind.QuickFix,
                resolvedImagePath,
                type: 'refine',
                isUrl,
                isAI: true,
            };
        }
    }
    isValidUrl(imagePath) {
        try {
            new URL(imagePath);
            return true;
        }
        catch (e) {
            return false;
        }
    }
};
exports.QuickFixesProvider = QuickFixesProvider;
exports.QuickFixesProvider = QuickFixesProvider = QuickFixesProvider_1 = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, reviewService_1.IReviewService)
], QuickFixesProvider);
let RefactorsProvider = class RefactorsProvider {
    static { RefactorsProvider_1 = this; }
    static { this.MAX_FILE_SIZE = 1024 * 1024; } // 1 MB
    static { this.generateOrModifyKind = vscode.CodeActionKind.RefactorRewrite.append('copilot'); }
    static { this.generateDocsKind = vscode.CodeActionKind.RefactorRewrite.append('generateDocs').append('copilot'); }
    static { this.generateTestsKind = vscode.CodeActionKind.RefactorRewrite.append('generateTests').append('copilot'); }
    static { this.providedCodeActionKinds = [
        this.generateOrModifyKind,
        this.generateDocsKind,
        this.generateTestsKind,
    ]; }
    constructor(logger, configurationService, ignoreService, parserService, telemetryService) {
        this.logger = logger;
        this.configurationService = configurationService;
        this.ignoreService = ignoreService;
        this.parserService = parserService;
        this.telemetryService = telemetryService;
    }
    async provideCodeActions(doc, range, _ctx, cancellationToken) {
        const copilotCodeActionsEnabled = this.configurationService.getConfig(configurationService_1.ConfigKey.EnableCodeActions);
        if (!copilotCodeActionsEnabled) {
            return;
        }
        if (await this.ignoreService.isCopilotIgnored(doc.uri)) {
            return;
        }
        if (cancellationToken.isCancellationRequested) {
            return;
        }
        const codeActions = await (0, async_1.raceCancellation)(Promise.allSettled([
            this.provideGenerateUsingCopilotCodeAction(doc, range),
            this.provideDocGenCodeAction(doc, range, cancellationToken),
            this.provideTestGenCodeAction(doc, range, cancellationToken),
        ]), cancellationToken);
        return codeActions === undefined ? undefined : (0, arrays_1.filterMap)(codeActions, r => (r.status === 'fulfilled' && r.value !== undefined) ? r.value : undefined);
    }
    /**
     * Provides code action `Generate using Copilot` or `Modify using Copilot`.
     * - `Generate using Copilot` is shown when the selection is empty and the line of the selection contains only white-space characters or tabs.
     * - `Modify using Copilot` is shown when the selection is not empty and the selection does not contain only white-space characters or tabs.
     */
    provideGenerateUsingCopilotCodeAction(doc, range) {
        let codeActionTitle;
        if (range.isEmpty) {
            const textAtLine = doc.lineAt(range.start.line).text;
            if (range.end.character === textAtLine.length && /^\s*$/g.test(textAtLine)) {
                codeActionTitle = vscode.l10n.t('Generate');
            }
        }
        else {
            const textInSelection = doc.getText(range);
            if (!/^\s*$/g.test(textInSelection)) {
                codeActionTitle = vscode.l10n.t('Modify');
            }
        }
        if (codeActionTitle === undefined) {
            return undefined;
        }
        const codeAction = new AICodeAction(codeActionTitle, RefactorsProvider_1.generateOrModifyKind);
        codeAction.command = {
            title: codeAction.title,
            command: 'vscode.editorChat.start',
            arguments: [
                {
                    position: range.start,
                    initialSelection: new vscode.Selection(range.start, range.end),
                    initialRange: range
                },
            ],
        };
        return codeAction;
    }
    /**
     * Provides code action `Document using Copilot: '${documentableNode.identifier}'` if:
     * - the document languageId is supported by tree-sitter parsers we have
     * - the range is on an identifier AND the identifier is a child of a documentable node
     *
     * The code action invokes the inline chat, expanding the inline chat's "wholeRange" (blue region)
     * to the whole documentable node.
     */
    async provideDocGenCodeAction(doc, range, cancellationToken) {
        if (doc.getText().length > RefactorsProvider_1.MAX_FILE_SIZE) {
            return;
        }
        const offsetRange = {
            startIndex: doc.offsetAt(range.start),
            endIndex: doc.offsetAt(range.end)
        };
        const treeSitterAST = this.parserService.getTreeSitterAST(doc);
        if (treeSitterAST === undefined) {
            return;
        }
        let documentableNode;
        try {
            documentableNode = await treeSitterAST.getDocumentableNodeIfOnIdentifier(offsetRange);
        }
        catch (e) {
            this.logger.error(e, 'RefactorsProvider: getDocumentableNodeIfOnIdentifier failed');
            this.telemetryService.sendGHTelemetryException(e, 'RefactorsProvider: getDocumentableNodeIfOnIdentifier failed');
        }
        if (documentableNode === undefined || cancellationToken.isCancellationRequested) {
            return undefined;
        }
        const title = vscode.l10n.t('Generate Docs');
        const codeAction = new AICodeAction(title, RefactorsProvider_1.generateDocsKind);
        // to expand the inline chat to the whole documentable node
        const initialRange = documentableNode.nodeRange === undefined
            ? undefined
            : new vscodeTypes_1.Range(doc.positionAt(documentableNode.nodeRange.startIndex), doc.positionAt(documentableNode.nodeRange.endIndex));
        codeAction.command = {
            title,
            command: 'vscode.editorChat.start',
            arguments: [
                {
                    autoSend: true,
                    message: `/doc`,
                    initialRange,
                },
            ],
        };
        return codeAction;
    }
    async provideTestGenCodeAction(doc, range, cancellationToken) {
        if (doc.getText().length > RefactorsProvider_1.MAX_FILE_SIZE) {
            return;
        }
        const offsetRange = {
            startIndex: doc.offsetAt(range.start),
            endIndex: doc.offsetAt(range.end),
        };
        const treeSitterAST = this.parserService.getTreeSitterAST(doc);
        if (treeSitterAST === undefined) {
            return;
        }
        let testableNode = null;
        try {
            testableNode = await treeSitterAST.getTestableNode(offsetRange);
        }
        catch (e) {
            this.logger.error(e, 'RefactorsProvider: getTestableNode failed');
            this.telemetryService.sendGHTelemetryException(e, 'RefactorsProvider: getTestableNode failed');
        }
        if (!testableNode || cancellationToken.isCancellationRequested) {
            return undefined;
        }
        const identifierRange = new vscodeTypes_1.Range(doc.positionAt(testableNode.identifier.range.startIndex), doc.positionAt(testableNode.identifier.range.endIndex));
        if (!identifierRange.contains(range)) {
            return undefined;
        }
        const title = vscode.l10n.t('Generate Tests');
        const codeAction = new AICodeAction(title, RefactorsProvider_1.generateTestsKind);
        codeAction.command = {
            title,
            command: 'puku.chat.generateTests',
        };
        return codeAction;
    }
};
exports.RefactorsProvider = RefactorsProvider;
exports.RefactorsProvider = RefactorsProvider = RefactorsProvider_1 = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, ignoreService_1.IIgnoreService),
    __param(3, parserService_1.IParserService),
    __param(4, telemetry_1.ITelemetryService)
], RefactorsProvider);
//# sourceMappingURL=inlineChatCodeActions.js.map