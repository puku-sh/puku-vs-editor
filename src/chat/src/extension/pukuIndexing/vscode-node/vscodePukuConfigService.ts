/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  VS Code-specific implementation of Puku Configuration Service
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuConfigService, PukuConfigService, DEFAULT_PUKU_CONFIG, PukuConfig } from '../common/pukuConfig';

const PUKU_API_ENDPOINT = 'https://api.puku.sh';
const CONFIG_ENDPOINT = `${PUKU_API_ENDPOINT}/v1/config`;

/**
 * VS Code-specific implementation of PukuConfigService
 * Fetches configuration from Puku backend API with authentication
 */
export class VsCodePukuConfigService extends PukuConfigService implements IPukuConfigService {
	declare readonly _serviceBrand: undefined;

	constructor() {
		super(CONFIG_ENDPOINT);
	}

	/**
	 * Get session token from VS Code workbench's Puku auth service
	 */
	private async _getSessionToken(): Promise<string | undefined> {
		try {
			const result = await vscode.commands.executeCommand<{ token: string } | undefined>('_puku.getSessionToken');
			return result?.token;
		} catch (error) {
			console.error('[VsCodePukuConfigService] Error getting session token:', error);
			return undefined;
		}
	}

	protected override async _fetchConfig(): Promise<void> {
		try {
			// Get authentication token
			const token = await this._getSessionToken();
			if (!token) {
				console.warn('[PukuConfig] No authentication token available, using defaults');
				this._config = DEFAULT_PUKU_CONFIG;
				return;
			}

			const response = await fetch(this._configEndpoint, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				console.warn(`[PukuConfig] Failed to fetch config (${response.status}), using defaults`);
				this._config = DEFAULT_PUKU_CONFIG;
				return;
			}

			const data = await response.json();
			this._config = data as PukuConfig;
			this._onDidChangeConfig.fire(this._config);
			console.log('[PukuConfig] Configuration loaded from server:', this._config);
		} catch (error) {
			console.error('[PukuConfig] Error fetching config:', error);
			this._config = DEFAULT_PUKU_CONFIG;
		}
	}
}
