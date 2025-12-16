/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { lm, languages } from 'vscode';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IExtensionContribution } from '../../common/contributions';
import { XtabProvider } from '../../xtab/node/xtabProvider';
import { PukuAILanguageModelProvider } from './pukuaiProvider';
import { PukuDiagnosticsProvider } from './pukuDiagnosticsProvider';
import { PukuDiagnosticsNextEditProvider } from './providers/pukuDiagnosticsNextEditProvider';
import { PukuFimProvider } from './providers/pukuFimProvider';
import { PukuNesNextEditProvider } from './providers/pukuNesNextEditProvider';
import { PukuUnifiedInlineProvider } from './pukuUnifiedInlineProvider';
import { PukuAutoTrigger } from './pukuAutoTrigger';

export class PukuAIContribution extends Disposable implements IExtensionContribution {
	public readonly id: string = 'pukuai-contribution';
	private _providerRegistered = false;
	private _inlineProviderRegistered = false;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
	) {
		super();
		console.log('Puku AI: PukuAIContribution constructor called');
		this._logService.info('Puku AI: PukuAIContribution constructor called');

		// Register Puku AI provider if endpoint is configured
		this._registerProvider();

		// Re-register on configuration change
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(ConfigKey.PukuAIEndpoint.fullyQualifiedId)) {
				this._registerProvider();
			}
		}));
	}

	private async _registerProvider() {
		// Get endpoint - always try to register if endpoint is set
		const endpoint = this._configurationService.getConfig(ConfigKey.PukuAIEndpoint);
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

			const provider = this._instantiationService.createInstance(PukuAILanguageModelProvider, endpoint);

			// Register as 'pukuai' vendor - our own vendor identity
			const vendorName = 'pukuai';

			console.log(`Puku AI: Registering as '${vendorName}' vendor`);
			this._logService.info(`Puku AI: Registering as '${vendorName}' vendor`);

			this._register(lm.registerLanguageModelChatProvider(vendorName, provider));

			this._providerRegistered = true;
			console.log('Puku AI: Provider registered successfully');
			this._logService.info('Puku AI: Provider registered successfully');

			// Also register inline completion provider
			this._registerInlineCompletionProvider(endpoint);

		} catch (error) {
			console.error(`Puku AI: Failed to register provider: ${error}`);
			this._logService.error(`Puku AI: Failed to register provider`, error);
		}
	}

	/**
	 * Register unified inline completion provider (FIM + Diagnostics)
	 * Following Copilot's architecture with single provider + internal coordination
	 */
	private _registerInlineCompletionProvider(endpoint: string) {
		if (this._inlineProviderRegistered) {
			console.log('Puku AI: Inline completion provider already registered');
			return;
		}

		console.log('Puku AI: Registering unified inline completion provider');
		this._logService.info('Puku AI: Registering unified inline completion provider');

		// Create FIM provider (racing provider)
		const fimProvider = this._instantiationService.createInstance(
			PukuFimProvider,
			endpoint
		);

		// Create diagnostics next edit provider (racing provider #2)
		const diagnosticsNextEditProvider = this._instantiationService.createInstance(PukuDiagnosticsNextEditProvider);

		// Create NES/Xtab provider (racing provider #3 - refactoring suggestions)
		const xtabProvider = this._instantiationService.createInstance(XtabProvider);
		const nesProvider = this._instantiationService.createInstance(PukuNesNextEditProvider, xtabProvider);

		// Create auto-trigger service (Issue #88 - auto-triggering system)
		// Reference: vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineEditModel.ts:61
		const autoTrigger = this._instantiationService.createInstance(
			PukuAutoTrigger,
			() => {
				// Trigger callback: invoke VS Code's inline suggestion API
				// This causes provideInlineCompletionItems to be called
				// Command reference: src/vscode/src/vs/editor/contrib/inlineCompletions/browser/controller/commands.ts:88
				vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
			}
		);

		// Create diagnostics provider (CodeActionProvider) - delegates to next edit provider
		const diagnosticsProvider = this._instantiationService.createInstance(PukuDiagnosticsProvider, diagnosticsNextEditProvider);

		// Create unified provider that coordinates between them (3-way racing)
		const unifiedProvider = this._instantiationService.createInstance(
			PukuUnifiedInlineProvider,
			fimProvider,
			diagnosticsNextEditProvider,
			nesProvider,
			autoTrigger,
			this._logService,
			this._instantiationService
		);

		// Register auto-trigger as disposable
		this._register(autoTrigger);

		// Register for all file types - let Codestral Mamba handle any language
		const selector: vscode.DocumentSelector = [
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
		} catch (e) {
			// Fallback to standard API without metadata
			console.log('Puku AI: Proposed API failed, trying standard API:', e);
			try {
				const disposable = vscode.languages.registerInlineCompletionItemProvider(selector, unifiedProvider);
				this._register(disposable);
				console.log('Puku AI: Registered with standard API');
			} catch (e2) {
				console.error('Puku AI: Failed to register unified inline completion provider:', e2);
			}
		}

		// Register diagnostics provider as CodeActionProvider (lightbulb menu 💡)
		// This provides import fixes and other refactorings like Copilot/TypeScript
		console.log('Puku AI: Registering diagnostics provider as CodeActionProvider');
		this._logService.info('Puku AI: Registering diagnostics provider as CodeActionProvider');

		const codeActionDisposable = vscode.languages.registerCodeActionsProvider(
			selector,
			diagnosticsProvider,
			{
				providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
			}
		);
		this._register(codeActionDisposable);
		console.log('Puku AI: CodeActionProvider registered successfully');

		this._inlineProviderRegistered = true;
		console.log('Puku AI: Unified inline completion provider registered successfully');
		this._logService.info('Puku AI: Unified inline completion provider registered successfully');

		// Register command to apply import fixes
		this._register(
			vscode.commands.registerCommand('puku.applyImportFix', async (fix: { range: vscode.Range; newText: string; label: string }) => {
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
				} else {
					console.log('[PukuAI] ❌ Failed to apply import fix');
				}
			})
		);

		// Register toggle command for diagnostics
		this._register(
			vscode.commands.registerCommand('puku.toggleDiagnostics', () => {
				const config = vscode.workspace.getConfiguration('puku.diagnostics');
				const enabled = config.get<boolean>('autoFix', true);
				config.update('autoFix', !enabled, true);
				diagnosticsProvider.setEnabled(!enabled);
				vscode.window.showInformationMessage(
					`Puku diagnostics ${!enabled ? 'enabled' : 'disabled'}`
				);
			})
		);
	}
}
