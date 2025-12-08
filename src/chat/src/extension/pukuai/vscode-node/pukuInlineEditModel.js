"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Unified inline edit model - coordinates between diagnostics and FIM providers
 *  Now uses IPukuNextEditProvider racing architecture (Copilot-style)
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
exports.PukuInlineEditModel = void 0;
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../platform/log/common/logService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
/**
 * Model that coordinates between FIM and diagnostics providers
 * Uses Copilot's racing architecture with IPukuNextEditProvider
 */
let PukuInlineEditModel = class PukuInlineEditModel extends lifecycle_1.Disposable {
    constructor(fimProvider, diagnosticsProvider, logService) {
        super();
        this.fimProvider = fimProvider;
        this.diagnosticsProvider = diagnosticsProvider;
        this.logService = logService;
        this._lastShownResult = null;
        console.log('[PukuInlineEditModel] Model constructor called with racing providers');
        this.logService.info('[PukuInlineEditModel] Model initialized with racing providers');
    }
    /**
     * Get completion by racing FIM and diagnostics providers
     * Uses Copilot's racing strategy: FIM starts immediately, diagnostics with delay
     *
     * Based on Copilot's approach in inlineCompletionProvider.ts:181-224
     */
    async getCompletion(document, position, context, token) {
        console.log('[PukuInlineEditModel] ⚡ getCompletion called (racing mode)');
        this.logService.info('[PukuInlineEditModel] getCompletion called (racing mode)');
        if (token.isCancellationRequested) {
            console.log('[PukuInlineEditModel] Token already cancelled');
            return null;
        }
        // Create DocumentId for provider interface
        const docId = { document, position };
        // Create cancellation tokens for coordination
        const diagnosticsCts = new vscode.CancellationTokenSource(token);
        const fimCts = new vscode.CancellationTokenSource(); // Independent token - FIM continues even if cancelled
        try {
            // Start FIM immediately (fast path with speculative cache)
            const fimPromise = this.fimProvider.getNextEdit(docId, context, fimCts.token);
            // Start diagnostics with delay (Copilot pattern - give FIM priority)
            // Diagnostics uses runUntilNextEdit() with 200ms delay
            const diagnosticsPromise = this.diagnosticsProvider
                ? this.diagnosticsProvider.runUntilNextEdit?.(docId, context, 200, diagnosticsCts.token) ||
                    this.diagnosticsProvider.getNextEdit(docId, context, diagnosticsCts.token)
                : Promise.resolve(null);
            // Use raceAndAll pattern from Copilot
            const { first, all } = this.raceAndAll([fimPromise, diagnosticsPromise]);
            // Wait for first result
            let [fimResult, diagnosticsResult] = await first;
            const hasFim = fimResult !== null && fimResult !== undefined;
            const hasDiagnostics = diagnosticsResult !== null && diagnosticsResult !== undefined;
            // If neither has result, give diagnostics 1 second more (Copilot's approach)
            const shouldGiveMoreTimeToDiagnostics = !hasFim && !hasDiagnostics && this.diagnosticsProvider;
            if (shouldGiveMoreTimeToDiagnostics) {
                this.logService.info('[PukuInlineEditModel] Giving diagnostics 1 second more...');
                // Set timeout to cancel after 1 second
                this.timeout(1000).then(() => diagnosticsCts.cancel());
                // Wait for all results
                [fimResult, diagnosticsResult] = await all;
            }
            // Cancel ongoing requests (but FIM will complete anyway due to independent token)
            diagnosticsCts.cancel();
            // Don't cancel FIM - let it complete and cache the result
            // fimCts.cancel();
            // Track lifecycle events
            let winningResult = null;
            let losingResult = null;
            // Priority logic: FIM > Diagnostics (Copilot's approach)
            if (fimResult) {
                this.logService.info('[PukuInlineEditModel] ✅ Using FIM result (won race)');
                winningResult = fimResult;
                losingResult = diagnosticsResult;
            }
            else if (diagnosticsResult) {
                this.logService.info('[PukuInlineEditModel] ✅ Using diagnostics result (FIM returned null)');
                winningResult = diagnosticsResult;
                losingResult = fimResult; // Should be null
            }
            // Handle ignored results (losing provider)
            if (losingResult) {
                console.log('[PukuInlineEditModel] Handling ignored result from losing provider');
                if (losingResult.type === 'fim') {
                    this.fimProvider.handleIgnored(docId, losingResult, winningResult || undefined);
                }
                else if (losingResult.type === 'diagnostics' && this.diagnosticsProvider) {
                    this.diagnosticsProvider.handleIgnored(docId, losingResult, winningResult || undefined);
                }
            }
            // Track shown result for acceptance/rejection handling
            this._lastShownResult = winningResult;
            // Call handleShown for winning provider
            if (winningResult) {
                console.log(`[PukuInlineEditModel] Calling handleShown for ${winningResult.type} provider`);
                if (winningResult.type === 'fim') {
                    this.fimProvider.handleShown(winningResult);
                }
                else if (winningResult.type === 'diagnostics' && this.diagnosticsProvider) {
                    this.diagnosticsProvider.handleShown(winningResult);
                }
            }
            // Convert to backwards-compatible format
            if (fimResult) {
                return {
                    type: 'fim',
                    completion: fimResult.completion,
                    requestId: fimResult.requestId
                };
            }
            if (diagnosticsResult) {
                return diagnosticsResult;
            }
            this.logService.info('[PukuInlineEditModel] No results from either provider');
            return null;
        }
        catch (error) {
            this.logService.error('[PukuInlineEditModel] Error getting completion:', error);
            return null;
        }
        finally {
            // Cleanup
            diagnosticsCts.dispose();
            fimCts.dispose();
        }
    }
    /**
     * Handle when user accepts a completion (TAB)
     */
    handleAcceptance(document, position) {
        if (!this._lastShownResult) {
            return;
        }
        const docId = { document, position };
        console.log(`[PukuInlineEditModel] ✅ Handling acceptance for ${this._lastShownResult.type} provider`);
        if (this._lastShownResult.type === 'fim') {
            this.fimProvider.handleAcceptance(docId, this._lastShownResult);
        }
        else if (this._lastShownResult.type === 'diagnostics' && this.diagnosticsProvider) {
            this.diagnosticsProvider.handleAcceptance(docId, this._lastShownResult);
        }
        this._lastShownResult = null;
    }
    /**
     * Handle when user rejects a completion (ESC or typing)
     */
    handleRejection(document, position) {
        if (!this._lastShownResult) {
            return;
        }
        const docId = { document, position };
        console.log(`[PukuInlineEditModel] ❌ Handling rejection for ${this._lastShownResult.type} provider`);
        if (this._lastShownResult.type === 'fim') {
            this.fimProvider.handleRejection(docId, this._lastShownResult);
        }
        else if (this._lastShownResult.type === 'diagnostics' && this.diagnosticsProvider) {
            this.diagnosticsProvider.handleRejection(docId, this._lastShownResult);
        }
        this._lastShownResult = null;
    }
    /**
     * Race promises and get both first and all results
     * Based on Copilot's raceAndAll utility
     */
    raceAndAll(promises) {
        return {
            first: Promise.race(promises.map((p, i) => p.then(result => {
                const results = new Array(promises.length);
                results[i] = result;
                return results;
            }))),
            all: Promise.all(promises)
        };
    }
    /**
     * Timeout utility
     */
    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    dispose() {
        super.dispose();
        this.logService.info('[PukuInlineEditModel] Model disposed');
    }
};
exports.PukuInlineEditModel = PukuInlineEditModel;
exports.PukuInlineEditModel = PukuInlineEditModel = __decorate([
    __param(2, logService_1.ILogService)
], PukuInlineEditModel);
//# sourceMappingURL=pukuInlineEditModel.js.map