/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Stub implementation - GitHub authentication upgrade removed
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';

export const IAuthenticationChatUpgradeService = createServiceIdentifier<IAuthenticationChatUpgradeService>('IAuthenticationChatUpgradeService');

export interface IAuthenticationChatUpgradeService {
	readonly _serviceBrand: undefined;

	/**
	 * Check if should request permissive session upgrade
	 */
	shouldRequestPermissiveSessionUpgrade(): Promise<boolean>;

	/**
	 * Show permissive session modal
	 */
	showPermissiveSessionModal(force?: boolean): Promise<boolean>;
}

/**
 * Stub implementation - GitHub authentication upgrade functionality removed
 * All methods return false/no-op since GitHub auth is disabled
 */
export class AuthenticationChatUpgradeService implements IAuthenticationChatUpgradeService {
	declare readonly _serviceBrand: undefined;

	async shouldRequestPermissiveSessionUpgrade(): Promise<boolean> {
		// GitHub auth upgrade removed - always return false
		return false;
	}

	async showPermissiveSessionModal(_force?: boolean): Promise<boolean> {
		// GitHub auth upgrade removed - always return false
		return false;
	}
}
