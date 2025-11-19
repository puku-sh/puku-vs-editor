/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { beforeEach, describe, expect, it } from 'vitest';
import { IInstantiationService } from '../../../../util/vs/platform/instantiation/common/instantiation';
import { IAuthenticationService } from '../../../authentication/common/authentication';
import { IChatMLFetcher } from '../../../chat/common/chatMLFetcher';
import { ConfigKey, IConfigurationService } from '../../../configuration/common/configurationService';
import { ICAPIClientService } from '../../../endpoint/common/capiClient';
import { IDomainService } from '../../../endpoint/common/domainService';
import { IEnvService } from '../../../env/common/envService';
import { ILogService } from '../../../log/common/logService';
import { IFetcherService } from '../../../networking/common/fetcherService';
import { IExperimentationService } from '../../../telemetry/common/nullExperimentationService';
import { ITelemetryService } from '../../../telemetry/common/telemetry';
import { ITokenizerProvider } from '../../../tokenizer/node/tokenizer';
import { PukuChatEndpoint } from '../../node/pukuChatEndpoint';

// Mock implementations
const createMockServices = () => ({
    fetcherService: {} as IFetcherService,
    domainService: {} as IDomainService,
    capiClientService: {} as ICAPIClientService,
    envService: {} as IEnvService,
    telemetryService: {} as ITelemetryService,
    authService: {} as IAuthenticationService,
    chatMLFetcher: {} as IChatMLFetcher,
    tokenizerProvider: {} as ITokenizerProvider,
    instantiationService: {} as IInstantiationService,
    configurationService: {
        getExperimentBasedConfig: () => false,
        getConfig: (key: any) => {
            if (key === ConfigKey.PukuAIEndpoint) {
                return 'http://puku.ai/v1';
            }
            return undefined;
        }
    } as unknown as IConfigurationService,
    expService: {} as IExperimentationService,
    logService: {} as ILogService
});

describe('PukuChatEndpoint', () => {
    let mockServices: ReturnType<typeof createMockServices>;

    beforeEach(() => {
        mockServices = createMockServices();
    });

    it('should use configured endpoint URL', () => {
        const endpoint = new PukuChatEndpoint(
            mockServices.domainService,
            mockServices.capiClientService,
            mockServices.fetcherService,
            mockServices.telemetryService,
            mockServices.authService,
            mockServices.chatMLFetcher,
            mockServices.tokenizerProvider,
            mockServices.instantiationService,
            mockServices.configurationService,
            mockServices.expService,
            mockServices.logService
        );

        expect(endpoint.urlOrRequestMetadata).toBe('http://puku.ai/v1');
    });
});
