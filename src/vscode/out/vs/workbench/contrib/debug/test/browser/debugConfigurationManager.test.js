/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ConfigurationManager } from '../../browser/debugConfigurationManager.js';
import { DebugConfigurationProviderTriggerKind } from '../../common/debug.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { TestQuickInputService } from '../../../../test/browser/workbenchTestServices.js';
import { TestHistoryService, TestContextService, TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('debugConfigurationManager', () => {
    const configurationProviderType = 'custom-type';
    let _debugConfigurationManager;
    let disposables;
    const adapterManager = {
        getDebugAdapterDescriptor(session, config) {
            return Promise.resolve(undefined);
        },
        activateDebuggers(activationEvent, debugType) {
            return Promise.resolve();
        },
        get onDidDebuggersExtPointRead() {
            return Event.None;
        }
    };
    const preferencesService = {
        userSettingsResource: URI.file('/tmp/settings.json')
    };
    const configurationService = new TestConfigurationService();
    setup(() => {
        disposables = new DisposableStore();
        const fileService = disposables.add(new FileService(new NullLogService()));
        const instantiationService = disposables.add(new TestInstantiationService(new ServiceCollection([IPreferencesService, preferencesService], [IConfigurationService, configurationService])));
        _debugConfigurationManager = new ConfigurationManager(adapterManager, new TestContextService(), configurationService, new TestQuickInputService(), instantiationService, new TestStorageService(), new TestExtensionService(), new TestHistoryService(), new UriIdentityService(fileService), disposables.add(new ContextKeyService(configurationService)), new NullLogService());
    });
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    test('resolves configuration based on type', async () => {
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        // eslint-disable-next-line local/code-no-any-casts
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    test('resolves configuration from second provider if type changes', async () => {
        const secondProviderType = 'second-provider';
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    type: secondProviderType
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: secondProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, secondProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        assert.strictEqual(resultConfig.type, secondProviderType);
        // eslint-disable-next-line local/code-no-any-casts
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    teardown(() => disposables.clear());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnQ29uZmlndXJhdGlvbk1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsb0JBQW9CLEVB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