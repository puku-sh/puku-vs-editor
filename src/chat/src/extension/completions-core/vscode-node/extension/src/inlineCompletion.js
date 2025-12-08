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
exports.CopilotInlineCompletionItemProvider = void 0;
exports.exception = exception;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const completionsTelemetryServiceBridge_1 = require("../../bridge/src/completionsTelemetryServiceBridge");
const constants_1 = require("../../lib/src/constants");
const defaultHandlers_1 = require("../../lib/src/defaultHandlers");
const logger_1 = require("../../lib/src/logger");
const telemetry_1 = require("../../lib/src/telemetry");
const async_1 = require("../../lib/src/util/async");
const config_1 = require("./config");
const copilotCompletionFeedbackTracker_1 = require("./copilotCompletionFeedbackTracker");
const extensionStatus_1 = require("./extensionStatus");
const ghostText_1 = require("./ghostText/ghostText");
const config_2 = require("../../lib/src/config");
const logger = new logger_1.Logger('inlineCompletionItemProvider');
function quickSuggestionsDisabled() {
    const qs = vscode_1.workspace.getConfiguration('editor.quickSuggestions');
    return qs.get('other') !== 'on' && qs.get('comments') !== 'on' && qs.get('strings') !== 'on';
}
function exception(accessor, error, origin, logger) {
    if (error instanceof Error && error.name === 'Canceled') {
        // these are VS Code cancellations
        return;
    }
    if (error instanceof Error && error.name === 'CodeExpectedError') {
        // expected errors from VS Code
        return;
    }
    const telemetryService = accessor.get(completionsTelemetryServiceBridge_1.ICompletionsTelemetryService);
    telemetryService.sendGHTelemetryException(error, 'codeUnification.completions.exception');
    (0, defaultHandlers_1.handleException)(accessor, error, origin, logger);
}
/** @public */
let CopilotInlineCompletionItemProvider = class CopilotInlineCompletionItemProvider extends lifecycle_1.Disposable {
    constructor(instantiationService, telemetryService, extensionStatusService) {
        super();
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.extensionStatusService = extensionStatusService;
        this.pendingRequests = new Set();
        this.copilotCompletionFeedbackTracker = this._register(this.instantiationService.createInstance(copilotCompletionFeedbackTracker_1.CopilotCompletionFeedbackTracker));
        this.ghostTextProvider = this.instantiationService.createInstance(ghostText_1.GhostTextProvider);
    }
    async waitForPendingRequests() {
        while (this.pendingRequests.size > 0) {
            await Promise.all(this.pendingRequests);
        }
    }
    get delegate() {
        return this.ghostTextProvider;
    }
    async provideInlineCompletionItems(doc, position, context, token) {
        console.log('[CopilotInlineCompletionItemProvider] provideInlineCompletionItems called', {
            fileName: doc.fileName,
            position: position.line + ':' + position.character,
            triggerKind: context.triggerKind
        });
        this.instantiationService.invokeFunction(telemetry_1.telemetry, 'codeUnification.completions.invoked', telemetry_1.TelemetryData.createAndMarkAsIssued({
            languageId: doc.languageId,
            lineCount: String(doc.lineCount),
            currentLine: String(position.line),
            isCycling: String(context.triggerKind === vscode_1.InlineCompletionTriggerKind.Invoke),
            completionsActive: String(context.selectedCompletionInfo !== undefined),
        }));
        try {
            return await this._provideInlineCompletionItems(doc, position, context, token);
        }
        catch (e) {
            console.error('[CopilotInlineCompletionItemProvider] Error:', e);
            this.telemetryService.sendGHTelemetryException(e, 'codeUnification.completions.exception');
        }
        finally {
            this.instantiationService.invokeFunction(telemetry_1.telemetry, 'codeUnification.completions.returned', telemetry_1.TelemetryData.createAndMarkAsIssued());
        }
    }
    async _provideInlineCompletionItems(doc, position, context, token) {
        const pendingRequestDeferred = new async_1.Deferred();
        this.pendingRequests.add(pendingRequestDeferred.promise);
        if (context.triggerKind === vscode_1.InlineCompletionTriggerKind.Automatic) {
            if (!this.instantiationService.invokeFunction(config_1.isCompletionEnabledForDocument, doc)) {
                return;
            }
            if (this.extensionStatusService.kind === 'Error') {
                return;
            }
        }
        const copilotConfig = vscode_1.workspace.getConfiguration(constants_1.CopilotConfigPrefix);
        // Constraining the generated inline completion to match selectedCompletionInfo sandbags Copilot pretty hard, as
        // typically it's just the first entry in the list alphabetically.  But if we generate a result that doesn't
        // match it, VS Code won't show it to the user unless the completion dropdown is dismissed. Historically we've
        // chosen to favor completion quality, but this option allows opting into or out of generating a completion that
        // VS Code will actually show.
        if (!copilotConfig.get('respectSelectedCompletionInfo', quickSuggestionsDisabled() || config_2.BuildInfo.isPreRelease())) {
            context = { ...context, selectedCompletionInfo: undefined };
        }
        try {
            let items = await this.delegate.provideInlineCompletionItems(doc, position, context, token);
            // Release CompletionItemProvider after returning
            setTimeout(() => {
                this.pendingRequests.delete(pendingRequestDeferred.promise);
                pendingRequestDeferred.resolve(undefined);
            });
            if (!items) {
                return undefined;
            }
            // If the language client provides a list of items, we want to add the send feedback command to it.
            if (Array.isArray(items)) {
                items = { items };
            }
            return {
                ...items,
                commands: [copilotCompletionFeedbackTracker_1.sendCompletionFeedbackCommand],
            };
        }
        catch (e) {
            this.instantiationService.invokeFunction(exception, e, '.provideInlineCompletionItems', logger);
        }
    }
    handleDidShowCompletionItem(item, updatedInsertText) {
        try {
            this.copilotCompletionFeedbackTracker.trackItem(item);
            return this.delegate.handleDidShowCompletionItem?.(item, updatedInsertText);
        }
        catch (e) {
            this.instantiationService.invokeFunction(exception, e, '.provideInlineCompletionItems', logger);
        }
    }
    handleDidPartiallyAcceptCompletionItem(item, acceptedLengthOrInfo) {
        try {
            return this.delegate.handleDidPartiallyAcceptCompletionItem?.(item, acceptedLengthOrInfo);
        }
        catch (e) {
            this.instantiationService.invokeFunction(exception, e, '.provideInlineCompletionItems', logger);
        }
    }
    handleEndOfLifetime(completionItem, reason) {
        try {
            return this.delegate.handleEndOfLifetime?.(completionItem, reason);
        }
        catch (e) {
            this.instantiationService.invokeFunction(exception, e, '.handleEndOfLifetime', logger);
        }
    }
};
exports.CopilotInlineCompletionItemProvider = CopilotInlineCompletionItemProvider;
exports.CopilotInlineCompletionItemProvider = CopilotInlineCompletionItemProvider = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, completionsTelemetryServiceBridge_1.ICompletionsTelemetryService),
    __param(2, extensionStatus_1.ICompletionsExtensionStatus)
], CopilotInlineCompletionItemProvider);
//# sourceMappingURL=inlineCompletion.js.map