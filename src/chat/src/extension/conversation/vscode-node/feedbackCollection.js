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
exports.startFeedbackCollection = startFeedbackCollection;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const logService_1 = require("../../../platform/log/common/logService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const feedbackGenerator_1 = require("../../prompt/node/feedbackGenerator");
const currentChange_1 = require("../../prompts/node/feedback/currentChange");
const maxRequests = 10;
const maxRequestsInterval = 5 * 60 * 1000;
const requestDelay = 10 * 1000;
let requestTimes = [];
function startFeedbackCollection(accessor) {
    const configurationService = accessor.get(configurationService_1.IConfigurationService);
    const reviewService = accessor.get(reviewService_1.IReviewService);
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const logService = accessor.get(logService_1.ILogService);
    const disposables = new lifecycle_1.DisposableStore();
    const enabled = configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.FeedbackOnChange);
    if (!enabled) {
        return disposables;
    }
    const collection = reviewService.getDiagnosticCollection();
    const feedbackGenerator = instantiationService.createInstance(feedbackGenerator_1.FeedbackGenerator);
    disposables.add(vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.document.uri.scheme === 'file' && event.contentChanges.length && event.document === vscode.window.activeTextEditor?.document) {
            try {
                logService.warn('Document changed, delaying diagnostics request');
                const version = event.document.version;
                await new Promise(resolve => setTimeout(resolve, requestDelay));
                if (version !== event.document.version) {
                    logService.warn('Skipping diagnostics request because the document has changed');
                    return;
                }
                const now = Date.now();
                const before = now - maxRequestsInterval;
                requestTimes = requestTimes.filter(t => t > before);
                if (requestTimes.length >= maxRequests) {
                    logService.warn('Max requests reached, skipping diagnostics request');
                    return;
                }
                requestTimes.push(now);
                logService.trace('Requesting diagnostics');
                const selection = vscode.window.activeTextEditor?.selection;
                // TODO: Use all changes in the current document.
                const change = await instantiationService.invokeFunction(currentChange_1.CurrentChange.getCurrentChange, event.document, selection.start);
                if (!change) {
                    logService.trace('No change found in the current document at the current position.');
                    return [];
                }
                const result = await feedbackGenerator.generateComments([
                    {
                        document: textDocumentSnapshot_1.TextDocumentSnapshot.create(event.document),
                        relativeDocumentPath: path.basename(event.document.uri.fsPath),
                        change,
                        selection
                    }
                ], new vscode.CancellationTokenSource().token);
                if (result.type === 'success') {
                    const diagnostics = result.comments.map(comment => new vscode.Diagnostic(comment.range, typeof comment.body === 'string' ? comment.body : comment.body.value, vscode.DiagnosticSeverity.Information));
                    collection.set(event.document.uri, diagnostics);
                }
            }
            catch (err) {
                logService.error(err, 'Error generating diagnostics');
            }
        }
    }));
    disposables.add(vscode.workspace.onDidCloseTextDocument(doc => {
        collection.set(doc.uri, undefined);
    }));
    return disposables;
}
//# sourceMappingURL=feedbackCollection.js.map