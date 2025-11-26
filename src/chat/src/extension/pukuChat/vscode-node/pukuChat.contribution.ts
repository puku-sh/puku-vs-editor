/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { PukuChatParticipant } from './pukuChatParticipant';

/**
 * Puku Chat Contribution
 *
 * Registers the Puku Chat participant which uses:
 * - Same ChatParticipantRequestHandler as Copilot (full code mapping, tools)
 * - Puku Indexing for workspace context
 * - Puku Proxy for GLM model inference
 */
export class PukuChatContribution extends Disposable {
	static readonly ID = 'pukuChat.contribution';

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();

		// Register chat participant
		this._register(this._instantiationService.createInstance(PukuChatParticipant));

		// Register commands
		this._registerCommands();

		console.log('[PukuChat.contribution] Puku Chat contribution initialized');
	}

	private _registerCommands(): void {
		// Command to open Puku Chat
		this._register(vscode.commands.registerCommand('puku.openChat', async () => {
			await vscode.commands.executeCommand('workbench.action.chat.open', {
				query: '@puku ',
			});
		}));

		// Command to ask about selected code
		this._register(vscode.commands.registerCommand('puku.askAboutSelection', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.selection.isEmpty) {
				vscode.window.showWarningMessage('Please select some code first');
				return;
			}

			const selectedText = editor.document.getText(editor.selection);
			await vscode.commands.executeCommand('workbench.action.chat.open', {
				query: `@puku Explain this code:\n\`\`\`\n${selectedText}\n\`\`\``,
			});
		}));
	}
}
