"use strict";
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
exports.PukuAIContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pukuaiProvider_1 = require("./pukuaiProvider");
const pukuDiagnosticsProvider_1 = require("./pukuDiagnosticsProvider");
const pukuDiagnosticsNextEditProvider_1 = require("./providers/pukuDiagnosticsNextEditProvider");
const pukuFimProvider_1 = require("./providers/pukuFimProvider");
const pukuUnifiedInlineProvider_1 = require("./pukuUnifiedInlineProvider");
let PukuAIContribution = class PukuAIContribution extends lifecycle_1.Disposable {
    constructor(_fetcherService, _logService, _configurationService, _instantiationService, extensionContext) {
        super();
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this.id = 'pukuai-contribution';
        this._providerRegistered = false;
        this._inlineProviderRegistered = false;
        console.log('Puku AI: PukuAIContribution constructor called');
        this._logService.info('Puku AI: PukuAIContribution constructor called');
        // Register Puku AI provider if endpoint is configured
        this._registerProvider();
        // Re-register on configuration change
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(configurationService_1.ConfigKey.PukuAIEndpoint.fullyQualifiedId)) {
                this._registerProvider();
            }
        }));
    }
    async _registerProvider() {
        // Get endpoint - always try to register if endpoint is set
        const endpoint = this._configurationService.getConfig(configurationService_1.ConfigKey.PukuAIEndpoint);
        console.log(`Puku AI: _registerProvider called, endpoint=${endpoint}`);
        this._logService.info(`Puku AI: _registerProvider called, endpoint=${endpoint}`);
        if (this._providerRegistered) {
            this._logService.info('Puku AI: Provider already registered');
            console.log('Puku AI: Provider already registered');
            return;
        }
        if (!endpoint) {
            console.log('Puku AI: No endpoint configured, skipping registration');
            this._logService.info('Puku AI: No endpoint configured, skipping registration');
            return;
        }
        try {
            // Check if this is a Puku AI proxy
            // Check if the endpoint is reachable
            const versionUrl = `${endpoint}/api/version`; // Standard Ollama/Proxy version check
            console.log(`Puku AI: Checking version at ${versionUrl}`);
            this._logService.info(`Puku AI: Checking version at ${versionUrl}`);
            const response = await this._fetcherService.fetch(versionUrl, { method: 'GET' });
            console.log(`Puku AI: Version response status: ${response.status}`);
            this._logService.info(`Puku AI: Version response status: ${response.status}`);
            if (!response.ok) {
                console.log(`Puku AI: Endpoint not reachable or not an Ollama-compatible proxy (status ${response.status})`);
                this._logService.warn(`Puku AI: Endpoint not reachable or not an Ollama-compatible proxy (status ${response.status})`);
                return;
            }
            console.log('Puku AI: Detected compatible proxy, registering provider');
            this._logService.info('Puku AI: Detected compatible proxy, registering provider');
            const provider = this._instantiationService.createInstance(pukuaiProvider_1.PukuAILanguageModelProvider, endpoint);
            // Register as 'pukuai' vendor - our own vendor identity
            const vendorName = 'pukuai';
            console.log(`Puku AI: Registering as '${vendorName}' vendor`);
            this._logService.info(`Puku AI: Registering as '${vendorName}' vendor`);
            this._register(vscode_1.lm.registerLanguageModelChatProvider(vendorName, provider));
            this._providerRegistered = true;
            console.log('Puku AI: Provider registered successfully');
            this._logService.info('Puku AI: Provider registered successfully');
            // Also register inline completion provider
            this._registerInlineCompletionProvider(endpoint);
        }
        catch (error) {
            console.error(`Puku AI: Failed to register provider: ${error}`);
            this._logService.error(`Puku AI: Failed to register provider`, error);
        }
    }
    /**
     * Register unified inline completion provider (FIM + Diagnostics)
     * Following Copilot's architecture with single provider + internal coordination
     */
    _registerInlineCompletionProvider(endpoint) {
        if (this._inlineProviderRegistered) {
            console.log('Puku AI: Inline completion provider already registered');
            return;
        }
        console.log('Puku AI: Registering unified inline completion provider');
        this._logService.info('Puku AI: Registering unified inline completion provider');
        // Create FIM provider (racing provider)
        const fimProvider = this._instantiationService.createInstance(pukuFimProvider_1.PukuFimProvider, endpoint);
        // Create diagnostics next edit provider (racing provider)
        const diagnosticsNextEditProvider = this._instantiationService.createInstance(pukuDiagnosticsNextEditProvider_1.PukuDiagnosticsNextEditProvider);
        // Create diagnostics provider (CodeActionProvider) - delegates to next edit provider
        const diagnosticsProvider = this._instantiationService.createInstance(pukuDiagnosticsProvider_1.PukuDiagnosticsProvider, diagnosticsNextEditProvider);
        // Create unified provider that coordinates between them
        const unifiedProvider = this._instantiationService.createInstance(pukuUnifiedInlineProvider_1.PukuUnifiedInlineProvider, fimProvider, diagnosticsNextEditProvider, this._logService, this._instantiationService);
        // Register for all file types - let Codestral Mamba handle any language
        const selector = [
            { scheme: 'file' },
            { scheme: 'untitled' }
        ];
        // Use vscode.languages directly to ensure correct API
        // Try both proposed and standard API
        try {
            console.log('Puku AI: About to register unified provider with vscode.languages');
            const disposable = vscode.languages.registerInlineCompletionItemProvider(selector, unifiedProvider, {
                debounceDelayMs: 0,
                groupId: 'puku' // Must match the exclude in completionsCoreContribution to disable Copilot FIM
            });
            this._register(disposable);
            console.log('Puku AI: Registered with proposed API metadata');
        }
        catch (e) {
            // Fallback to standard API without metadata
            console.log('Puku AI: Proposed API failed, trying standard API:', e);
            try {
                const disposable = vscode.languages.registerInlineCompletionItemProvider(selector, unifiedProvider);
                this._register(disposable);
                console.log('Puku AI: Registered with standard API');
            }
            catch (e2) {
                console.error('Puku AI: Failed to register unified inline completion provider:', e2);
            }
        }
        // Register diagnostics provider as CodeActionProvider (lightbulb menu 💡)
        // This provides import fixes and other refactorings like Copilot/TypeScript
        console.log('Puku AI: Registering diagnostics provider as CodeActionProvider');
        this._logService.info('Puku AI: Registering diagnostics provider as CodeActionProvider');
        const codeActionDisposable = vscode.languages.registerCodeActionsProvider(selector, diagnosticsProvider, {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
        });
        this._register(codeActionDisposable);
        console.log('Puku AI: CodeActionProvider registered successfully');
        this._inlineProviderRegistered = true;
        console.log('Puku AI: Unified inline completion provider registered successfully');
        this._logService.info('Puku AI: Unified inline completion provider registered successfully');
        // Register command to apply import fixes
        this._register(vscode.commands.registerCommand('puku.applyImportFix', async (fix) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            console.log('[PukuAI] Applying import fix:', fix.label);
            // Apply the import at the top of the file
            const success = await editor.edit(editBuilder => {
                editBuilder.replace(fix.range, fix.newText);
            });
            if (success) {
                console.log('[PukuAI] ✅ Import fix applied successfully');
            }
            else {
                console.log('[PukuAI] ❌ Failed to apply import fix');
            }
        }));
        // Register toggle command for diagnostics
        this._register(vscode.commands.registerCommand('puku.toggleDiagnostics', () => {
            const config = vscode.workspace.getConfiguration('puku.diagnostics');
            const enabled = config.get('autoFix', true);
            config.update('autoFix', !enabled, true);
            diagnosticsProvider.setEnabled(!enabled);
            vscode.window.showInformationMessage(`Puku diagnostics ${!enabled ? 'enabled' : 'disabled'}`);
        }));
    }
};
exports.PukuAIContribution = PukuAIContribution;
exports.PukuAIContribution = PukuAIContribution = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, logService_1.ILogService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, extensionContext_1.IVSCodeExtensionContext)
], PukuAIContribution);
//# sourceMappingURL=pukuaiContribution.js.map