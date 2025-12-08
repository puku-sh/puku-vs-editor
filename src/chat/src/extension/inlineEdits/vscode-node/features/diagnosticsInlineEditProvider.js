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
exports.DiagnosticsNextEditProvider = exports.DiagnosticsNextEditResult = void 0;
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../../platform/log/common/logService");
const errors = __importStar(require("../../../../util/common/errors"));
const tracing_1 = require("../../../../util/common/tracing");
const async_1 = require("../../../../util/vs/base/common/async");
const errors_1 = require("../../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const nextEditProviderTelemetry_1 = require("../../node/nextEditProviderTelemetry");
const diagnosticsCompletions_1 = require("./diagnosticsBasedCompletions/diagnosticsCompletions");
const diagnosticsCompletionProcessor_1 = require("./diagnosticsCompletionProcessor");
class DiagnosticsNextEditResult {
    constructor(requestId, result) {
        this.requestId = requestId;
        this.result = result;
    }
}
exports.DiagnosticsNextEditResult = DiagnosticsNextEditResult;
let DiagnosticsNextEditProvider = class DiagnosticsNextEditProvider extends lifecycle_1.Disposable {
    get lastRejectionTime() {
        return this._lastRejectionTime;
    }
    get lastTriggerTime() {
        return this._lastTriggerTime;
    }
    constructor(workspace, git, instantiationService, logService) {
        super();
        this.ID = 'DiagnosticsNextEditProvider';
        this._lastRejectionTime = 0;
        this._lastTriggerTime = 0;
        this._lastAcceptedItem = undefined;
        this._tracer = (0, tracing_1.createTracer)(['NES', 'DiagnosticsNextEditProvider'], (s) => logService.trace(s));
        this._diagnosticsCompletionHandler = this._register(instantiationService.createInstance(diagnosticsCompletionProcessor_1.DiagnosticsCompletionProcessor, workspace, git));
    }
    async getNextEdit(docId, context, logContext, cancellationToken, tb) {
        this._lastTriggerTime = Date.now();
        if (cancellationToken.isCancellationRequested) {
            this._tracer.trace('cancellationRequested before started');
            return new DiagnosticsNextEditResult(logContext.requestId, undefined);
        }
        let diagnosticEditResult = this._diagnosticsCompletionHandler.getCurrentState(docId);
        if (!diagnosticEditResult.item) {
            diagnosticEditResult = await this._diagnosticsCompletionHandler.getNextUpdatedState(docId, cancellationToken);
        }
        return this._createNextEditResult(diagnosticEditResult, logContext, tb);
    }
    async runUntilNextEdit(docId, context, logContext, delayStart, cancellationToken, tb) {
        try {
            await (0, async_1.timeout)(delayStart);
            if (cancellationToken.isCancellationRequested) {
                this._tracer.trace('cancellationRequested before started');
                return new DiagnosticsNextEditResult(logContext.requestId, undefined);
            }
            // Check if the last computed edit is still valid
            let completionResult = this._diagnosticsCompletionHandler.getCurrentState(docId);
            let telemetry = new nextEditProviderTelemetry_1.DiagnosticsTelemetryBuilder();
            let diagnosticEditResult = this._createNextEditResult(completionResult, logContext, telemetry);
            // If the last computed edit is not valid, wait until the state is updated or the operation is cancelled
            while (!diagnosticEditResult.result && !cancellationToken.isCancellationRequested) {
                completionResult = await this._diagnosticsCompletionHandler.getNextUpdatedState(docId, cancellationToken);
                telemetry = new nextEditProviderTelemetry_1.DiagnosticsTelemetryBuilder();
                diagnosticEditResult = this._createNextEditResult(completionResult, logContext, telemetry);
            }
            telemetry.populate(tb);
            // TODO: Better incorporate diagnostics logging
            if (completionResult.logContext) {
                completionResult.logContext.getLogs().forEach(log => logContext.addLog(log));
            }
            return diagnosticEditResult;
        }
        catch (error) {
            const errorMessage = `Error occurred while waiting for diagnostic edit: ${errors.toString(errors.fromUnknown(error))}`;
            logContext.addLog(errorMessage);
            this._tracer.trace(errorMessage);
            return new DiagnosticsNextEditResult(logContext.requestId, undefined);
        }
    }
    _createNextEditResult(diagnosticEditResult, logContext, tb) {
        const { item, telemetry } = diagnosticEditResult;
        // Diagnostics might not have updated yet since accepting a diagnostics based NES
        if (item && this._hasRecentlyBeenAccepted(item)) {
            tb.addDroppedReason(`${item.type}:recently-accepted`);
            this._tracer.trace('recently accepted');
            return new DiagnosticsNextEditResult(logContext.requestId, undefined);
        }
        telemetry.droppedReasons.forEach(reason => tb.addDroppedReason(reason));
        tb.setDiagnosticRunTelemetry(telemetry);
        if (!item) {
            this._tracer.trace('no diagnostic edit result');
            return new DiagnosticsNextEditResult(logContext.requestId, undefined);
        }
        tb.setType(item.type);
        logContext.setDiagnosticsResult(item.getRootedLineEdit());
        this._tracer.trace(`created next edit result`);
        return new DiagnosticsNextEditResult(logContext.requestId, {
            edit: item.toOffsetEdit(),
            displayLocation: item.nextEditDisplayLocation,
            item
        });
    }
    handleShown(suggestion) { }
    handleAcceptance(docId, suggestion) {
        const completionResult = suggestion.result;
        if (!completionResult) {
            throw new errors_1.BugIndicatingError('Completion result is undefined when accepted');
        }
        this._lastAcceptedItem = { item: completionResult.item, time: Date.now() };
        this._diagnosticsCompletionHandler.handleEndOfLifetime(completionResult.item, { kind: vscode.InlineCompletionEndOfLifeReasonKind.Accepted });
    }
    _hasRecentlyBeenAccepted(item) {
        if (!this._lastAcceptedItem) {
            return false;
        }
        if (Date.now() - this._lastAcceptedItem.time >= 1000) {
            return false;
        }
        return item.diagnostic.equals(this._lastAcceptedItem.item.diagnostic) || diagnosticsCompletions_1.DiagnosticCompletionItem.equals(this._lastAcceptedItem.item, item);
    }
    handleRejection(docId, suggestion) {
        this._lastRejectionTime = Date.now();
        const completionResult = suggestion.result;
        if (!completionResult) {
            throw new errors_1.BugIndicatingError('Completion result is undefined when rejected');
        }
        this._diagnosticsCompletionHandler.handleEndOfLifetime(completionResult.item, { kind: vscode.InlineCompletionEndOfLifeReasonKind.Rejected });
    }
    handleIgnored(docId, suggestion, supersededBy) {
        const completionResult = suggestion.result;
        if (!completionResult) {
            throw new errors_1.BugIndicatingError('Completion result is undefined when accepted');
        }
        const supersededByItem = supersededBy instanceof DiagnosticsNextEditResult ? supersededBy?.result?.item : undefined;
        this._diagnosticsCompletionHandler.handleEndOfLifetime(completionResult.item, {
            kind: vscode.InlineCompletionEndOfLifeReasonKind.Ignored,
            supersededBy: supersededByItem,
            userTypingDisagreed: false /* TODO: Adopt this*/
        });
    }
};
exports.DiagnosticsNextEditProvider = DiagnosticsNextEditProvider;
exports.DiagnosticsNextEditProvider = DiagnosticsNextEditProvider = __decorate([
    __param(2, instantiation_1.IInstantiationService),
    __param(3, logService_1.ILogService)
], DiagnosticsNextEditProvider);
//# sourceMappingURL=diagnosticsInlineEditProvider.js.map