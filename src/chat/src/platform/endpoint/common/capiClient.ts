/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CAPIClient } from '../../api/common/pukuApiClient';
import { RequestMetadata, RequestType } from '../../api/common/pukuRequestTypes';
import { createServiceIdentifier } from '../../../util/common/services';
import { IEnvService } from '../../env/common/envService';
import { IFetcherService } from '../../networking/common/fetcherService';
import { LICENSE_AGREEMENT } from './licenseAgreement';
import { ConfigKey, IConfigurationService } from '../../configuration/common/configurationService';

/**
 * Interface for CAPI client service
 */
export interface ICAPIClientService extends CAPIClient {
	readonly _serviceBrand: undefined;
}

export abstract class BaseCAPIClientService extends CAPIClient implements ICAPIClientService {
	readonly _serviceBrand: undefined;

	constructor(
		hmac: string | undefined,
		forceDevMode: boolean,
		fetcherService: IFetcherService,
		envService: IEnvService,
		protected readonly configurationService: IConfigurationService
	) {
		super({
			machineId: envService.machineId,
			sessionId: envService.sessionId,
			vscodeVersion: envService.vscodeVersion,
			buildType: envService.getBuildType(),
			name: envService.getName(),
			version: envService.getVersion(),
		}, LICENSE_AGREEMENT, fetcherService, hmac, forceDevMode);
	}

	/**
	 * Override to use configurable Puku AI endpoint for NES requests
	 */
	protected override _getUrlForRequest(metadata: RequestMetadata): string {
		// Handle NES-specific requests with configurable endpoint
		if (metadata.type === RequestType.ProxyChatCompletions || metadata.type === RequestType.ProxyCompletions) {
			const baseEndpoint = this.configurationService.getConfig(ConfigKey.PukuAIEndpoint);
			// Ensure consistent URL format
			const normalizedEndpoint = baseEndpoint.replace(/\/$/, '');
			return `${normalizedEndpoint}/v1/nes/edits`;
		}
		// Fall back to base implementation for all other request types
		return super._getUrlForRequest(metadata);
	}
}
export const ICAPIClientService = createServiceIdentifier<ICAPIClientService>('ICAPIClientService');
