/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku NES Contribution - Registers NES commands
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IExtensionContribution } from '../../common/contributions';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';

/**
 * Puku NES (Next Edit Suggestions) Contribution
 * Registers commands for NES feature
 */
export class PukuNesContribution extends Disposable implements IExtensionContribution {
	public readonly id = 'puku-nes-contribution';

	constructor(
		@ILogService private readonly _logService: ILogService,
	) {
		super();
		this._logService.info('PukuNesContribution: Initializing');

		// Register Learn More command (Issue #124)
		this._register(
			vscode.commands.registerCommand('puku.nesLearnMore', () => {
				this._logService.info('PukuNesContribution: Opening NES documentation');
				vscode.env.openExternal(
					vscode.Uri.parse('https://code.visualstudio.com/docs/copilot/ai-powered-suggestions#_next-edit-suggestions')
				);
			})
		);

		this._logService.info('PukuNesContribution: Initialized successfully');
	}
}
