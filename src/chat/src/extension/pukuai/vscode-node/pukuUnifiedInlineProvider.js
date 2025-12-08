"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Unified inline completion provider - coordinates diagnostics and FIM (Racing Architecture)
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
exports.PukuUnifiedInlineProvider = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const pukuInlineEditModel_1 = require("./pukuInlineEditModel");
/**
 * Unified provider that coordinates between diagnostics and FIM providers
 * Now uses Copilot-style racing architecture with IPukuNextEditProvider
 *
 * Architecture:
 * - Single provider registered with VS Code
 * - Internal model coordinates racing between FIM and diagnostics
 * - FIM starts immediately, diagnostics with delay (Copilot pattern)
 * - Priority: FIM > Diagnostics (first wins)
 */
class PukuUnifiedInlineProvider extends lifecycle_1.Disposable {
    constructor(fimProvider, diagnosticsProvider, logService, instantiationService) {
        super();
        this.fimProvider = fimProvider;
        this.diagnosticsProvider = diagnosticsProvider;
        this.logService = logService;
        this.instantiationService = instantiationService;
        console.log('[PukuUnifiedProvider] Constructor called (racing architecture)');
        this.logService.info('[PukuUnifiedProvider] Constructor called (racing architecture)');
        // Create coordinating model with racing providers
        // Don't pass logService - it's injected by instantiationService
        this.model = this._register(this.instantiationService.createInstance(pukuInlineEditModel_1.PukuInlineEditModel, fimProvider, diagnosticsProvider));
        console.log('[PukuUnifiedProvider] Provider initialized with racing model');
        this.logService.info('[PukuUnifiedProvider] Provider initialized with racing model');
    }
    async provideInlineCompletionItems(document, position, context, token) {
        console.log('[PukuUnifiedProvider] provideInlineCompletionItems called', {
            file: document.fileName,
            line: position.line,
            char: position.character
        });
        this.logService.info('[PukuUnifiedProvider] provideInlineCompletionItems called');
        if (token.isCancellationRequested) {
            return null;
        }
        // Get completion from model (coordinates diagnostics + FIM)
        console.log('[PukuUnifiedProvider] ⚡ Calling model.getCompletion()...');
        this.logService.info('[PukuUnifiedProvider] Calling model.getCompletion()');
        const result = await this.model.getCompletion(document, position, context, token);
        console.log('[PukuUnifiedProvider] ⚡ Model returned:', result?.type ?? 'null');
        this.logService.info('[PukuUnifiedProvider] Model returned:', result?.type ?? 'null');
        if (!result) {
            this.logService.info('[PukuUnifiedProvider] No result from model');
            return null;
        }
        // Handle diagnostics result
        if (result.type === 'diagnostics') {
            const fix = result.fix;
            console.log('[PukuUnifiedProvider] Diagnostics fix details:', {
                range: `[${fix.range.start.line},${fix.range.start.character} -> ${fix.range.end.line},${fix.range.end.character}]`,
                newText: fix.newText.substring(0, 100),
                label: fix.label,
                cursorLine: position.line
            });
            this.logService.info('[PukuUnifiedProvider] Returning diagnostics fix');
            // IMPORTANT: For inline edits to be accepted with TAB, the range MUST match cursor position
            // But we want to insert at fix.range (top of file). Solution: use a workaround.
            // Check if this is an import fix (range at line 0, cursor elsewhere)
            const isImportFix = fix.range.start.line === 0 && position.line > 0;
            if (isImportFix) {
                // For import fixes: Show at top of file (line 0)
                // Even though cursor is elsewhere, VS Code can still show this
                console.log('[PukuUnifiedProvider] Import fix - showing at top of file');
                console.log('[PukuUnifiedProvider] Creating import completion item:', {
                    insertText: fix.newText,
                    range: `[${fix.range.start.line},${fix.range.start.character} -> ${fix.range.end.line},${fix.range.end.character}]`,
                    cursorDistance: Math.abs(fix.range.start.line - position.line)
                });
                const item = {
                    insertText: fix.newText,
                    range: fix.range, // Line 0 - top of file
                };
                console.log('[PukuUnifiedProvider] ✅ Returning import completion item to VS Code with forward stability');
                // Return InlineCompletionList with enableForwardStability (Issue #55)
                return {
                    items: [item],
                    enableForwardStability: true
                };
            }
            else {
                // For non-import fixes: Use isInlineEdit for proper diff view
                const item = {
                    insertText: fix.newText,
                    range: fix.range,
                    isInlineEdit: true,
                    displayLocation: {
                        range: new vscode.Range(fix.range.end, fix.range.end),
                        label: fix.label,
                        kind: vscode.InlineCompletionDisplayLocationKind.Code
                    }
                };
                // Return InlineCompletionList with enableForwardStability (Issue #55)
                return {
                    items: [item],
                    enableForwardStability: true
                };
            }
        }
        // Handle FIM result
        if (result.type === 'fim') {
            this.logService.info('[PukuUnifiedProvider] Returning FIM completion with forward stability');
            // Return InlineCompletionList with enableForwardStability (Issue #55)
            return {
                items: [result.completion],
                enableForwardStability: true
            };
        }
        return null;
    }
    dispose() {
        super.dispose();
        this.logService.info('[PukuUnifiedProvider] Provider disposed');
    }
}
exports.PukuUnifiedInlineProvider = PukuUnifiedInlineProvider;
//# sourceMappingURL=pukuUnifiedInlineProvider.js.map