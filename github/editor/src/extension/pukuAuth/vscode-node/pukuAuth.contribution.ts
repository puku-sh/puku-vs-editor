/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku Authentication Contribution - Registers auth commands and UI
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IExtensionContribution } from '../../common/contributions';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';

/**
 * Puku Authentication Contribution
 * Registers sign-in/sign-out commands and status bar item
 */
export class PukuAuthContribution extends Disposable implements IExtensionContribution {
	public readonly id = 'puku-auth-contribution';

	private _statusBarItem: vscode.StatusBarItem;

	constructor(
		@ILogService private readonly _logService: ILogService,
		@IPukuAuthService private readonly _pukuAuthService: IPukuAuthService,
	) {
		super();
		this._logService.info('PukuAuthContribution: Initializing');

		// Create status bar item
		this._statusBarItem = vscode.window.createStatusBarItem(
			'puku.auth.status',
			vscode.StatusBarAlignment.Right,
			100
		);
		this._register(this._statusBarItem);

		// Register commands
		this._registerCommands();

		// Initialize auth service and update status bar
		this._initializeAuth();

		// Listen for auth changes
		this._register(this._pukuAuthService.onDidChangeAuthStatus(() => {
			this._updateStatusBar();
		}));
	}

	private async _initializeAuth(): Promise<void> {
		await this._pukuAuthService.initialize();
		this._updateStatusBar();
	}

	private _registerCommands(): void {
		// Sign in command
		this._register(vscode.commands.registerCommand('puku.auth.signIn', async () => {
			this._logService.info('PukuAuthContribution: Sign in command triggered');
			await this._pukuAuthService.signIn();
		}));

		// Sign out command
		this._register(vscode.commands.registerCommand('puku.auth.signOut', async () => {
			this._logService.info('PukuAuthContribution: Sign out command triggered');
			await this._pukuAuthService.signOut();
		}));

		// Status command (shows account info)
		this._register(vscode.commands.registerCommand('puku.auth.status', async () => {
			const user = this._pukuAuthService.user;
			if (user) {
				const choice = await vscode.window.showInformationMessage(
					`Signed in as ${user.name} (${user.email})`,
					'Sign Out'
				);
				if (choice === 'Sign Out') {
					await this._pukuAuthService.signOut();
				}
			} else {
				const choice = await vscode.window.showInformationMessage(
					'Not signed in to Puku',
					'Sign In'
				);
				if (choice === 'Sign In') {
					await this._pukuAuthService.signIn();
				}
			}
		}));
	}

	private _updateStatusBar(): void {
		// Status bar is now handled by VS Code layer (chatStatus.ts)
		// Extension auth UI is disabled to avoid duplicate sign-in buttons
		this._statusBarItem.hide();
	}
}
