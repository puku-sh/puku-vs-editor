"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Diagnostics-based code fix provider (Delegates to PukuDiagnosticsNextEditProvider)
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
exports.PukuDiagnosticsProvider = void 0;
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../platform/log/common/logService");
const pukuAuth_1 = require("../../pukuIndexing/common/pukuAuth");
const pukuConfig_1 = require("../../pukuIndexing/common/pukuConfig");
const pukuIndexingService_1 = require("../../pukuIndexing/node/pukuIndexingService");
/**
 * Provides diagnostic fixes via CodeActionProvider (lightbulb menu 💡)
 * Delegates to PukuDiagnosticsNextEditProvider for fix generation
 *
 * Architecture:
 * - Implements IPukuDiagnosticsProvider: getDiagnosticsFix() for backwards compatibility
 * - Implements CodeActionProvider: provideCodeActions() for lightbulb menu (💡)
 * - Delegates all fix generation to PukuDiagnosticsNextEditProvider
 *
 * Note: Does NOT implement InlineCompletionItemProvider (handled by PukuUnifiedInlineProvider)
 */
let PukuDiagnosticsProvider = class PukuDiagnosticsProvider {
    constructor(_nextEditProvider, _authService, _configService, _indexingService, _logService) {
        this._nextEditProvider = _nextEditProvider;
        this._authService = _authService;
        this._configService = _configService;
        this._indexingService = _indexingService;
        this._logService = _logService;
        this._disposables = [];
        this._logService.info('[PukuDiagnostics] Provider initialized (delegating to NextEditProvider)');
    }
    /**
     * Public API for unified provider - implements IPukuDiagnosticsProvider
     * Delegates to PukuDiagnosticsNextEditProvider
     */
    async getDiagnosticsFix(document, position, context, token) {
        console.log('[PukuDiagnostics] getDiagnosticsFix called (delegating to NextEditProvider)');
        // Create DocumentId for next edit provider
        const docId = { document, position };
        // Delegate to next edit provider
        return await this._nextEditProvider.getNextEdit(docId, context, token);
    }
    // Note: provideInlineCompletionItems() removed - handled by PukuUnifiedInlineProvider
    // All inline completion requests go through: UnifiedProvider → Racing Model → NextEditProvider
    /**
     * Provide code actions for diagnostics (lightbulb menu 💡)
     * Delegates to NextEditProvider for fix generation
     */
    async provideCodeActions(document, range, context, token) {
        // Only provide code actions if there are diagnostics
        if (context.diagnostics.length === 0) {
            return undefined;
        }
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            // Only handle errors and warnings
            if (diagnostic.severity > vscode.DiagnosticSeverity.Warning) {
                continue;
            }
            // Create DocumentId for next edit provider
            const position = diagnostic.range.start;
            const docId = { document, position };
            // Delegate to next edit provider for fix generation
            const result = await this._nextEditProvider.getNextEdit(docId, { triggerKind: vscode.InlineCompletionTriggerKind.Automatic, selectedCompletionInfo: undefined }, token);
            if (!result) {
                continue;
            }
            const fix = result.fix;
            // Create code action
            const action = new vscode.CodeAction(fix.label.replace('TAB to ', ''), // Remove TAB instruction for lightbulb
            vscode.CodeActionKind.QuickFix);
            // Apply the fix
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, fix.range, fix.newText);
            action.edit = edit;
            action.diagnostics = [diagnostic];
            action.isPreferred = true; // Mark as preferred quick fix
            actions.push(action);
        }
        return actions.length > 0 ? actions : undefined;
    }
    /**
     * Enable/disable the provider
     */
    setEnabled(enabled) {
        this._nextEditProvider.setEnabled(enabled);
        this._logService.info(`[PukuDiagnostics] Provider ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Cleanup
     */
    dispose() {
        this._disposables.forEach(d => d.dispose());
        this._nextEditProvider.dispose();
        this._logService.info('[PukuDiagnostics] Provider disposed');
    }
};
exports.PukuDiagnosticsProvider = PukuDiagnosticsProvider;
exports.PukuDiagnosticsProvider = PukuDiagnosticsProvider = __decorate([
    __param(1, pukuAuth_1.IPukuAuthService),
    __param(2, pukuConfig_1.IPukuConfigService),
    __param(3, pukuIndexingService_1.IPukuIndexingService),
    __param(4, logService_1.ILogService)
], PukuDiagnosticsProvider);
//# sourceMappingURL=pukuDiagnosticsProvider.js.map