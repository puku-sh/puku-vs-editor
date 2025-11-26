/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource, DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { languageModelChatProviderExtensionPoint, LanguageModelsService } from '../../common/languageModels.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
import { TestChatEntitlementService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { Event } from '../../../../../base/common/event.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
suite('LanguageModels', function () {
    let languageModels;
    const store = new DisposableStore();
    const activationEvents = new Set();
    setup(function () {
        languageModels = new LanguageModelsService(new class extends mock() {
            activateByEvent(name) {
                activationEvents.add(name);
                return Promise.resolve();
            }
        }, new NullLogService(), new TestStorageService(), new MockContextKeyService(), new TestConfigurationService(), new TestChatEntitlementService());
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelChatProviderExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription },
                value: { vendor: 'test-vendor' },
                collector: null
            }, {
                description: { ...nullExtensionDescription },
                value: { vendor: 'actual-vendor' },
                collector: null
            }]);
        store.add(languageModels.registerLanguageModelProvider('test-vendor', {
            onDidChange: Event.None,
            provideLanguageModelChatInfo: async () => {
                const modelMetadata = [
                    {
                        extension: nullExtensionDescription.identifier,
                        name: 'Pretty Name',
                        vendor: 'test-vendor',
                        family: 'test-family',
                        version: 'test-version',
                        modelPickerCategory: undefined,
                        id: 'test-id-1',
                        maxInputTokens: 100,
                        maxOutputTokens: 100,
                    },
                    {
                        extension: nullExtensionDescription.identifier,
                        name: 'Pretty Name',
                        vendor: 'test-vendor',
                        family: 'test2-family',
                        version: 'test2-version',
                        modelPickerCategory: undefined,
                        id: 'test-id-12',
                        maxInputTokens: 100,
                        maxOutputTokens: 100,
                    }
                ];
                const modelMetadataAndIdentifier = modelMetadata.map(m => ({
                    metadata: m,
                    identifier: m.id,
                }));
                return modelMetadataAndIdentifier;
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
    });
    teardown(function () {
        languageModels.dispose();
        activationEvents.clear();
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty selector returns all', async function () {
        const result1 = await languageModels.selectLanguageModels({});
        assert.deepStrictEqual(result1.length, 2);
        assert.deepStrictEqual(result1[0], 'test-id-1');
        assert.deepStrictEqual(result1[1], 'test-id-12');
    });
    test('selector with id works properly', async function () {
        const result1 = await languageModels.selectLanguageModels({ id: 'test-id-1' });
        assert.deepStrictEqual(result1.length, 1);
        assert.deepStrictEqual(result1[0], 'test-id-1');
    });
    test('no warning that a matching model was not found #213716', async function () {
        const result1 = await languageModels.selectLanguageModels({ vendor: 'test-vendor' });
        assert.deepStrictEqual(result1.length, 2);
        const result2 = await languageModels.selectLanguageModels({ vendor: 'test-vendor', family: 'FAKE' });
        assert.deepStrictEqual(result2.length, 0);
    });
    test('sendChatRequest returns a response-stream', async function () {
        store.add(languageModels.registerLanguageModelProvider('actual-vendor', {
            onDidChange: Event.None,
            provideLanguageModelChatInfo: async () => {
                const modelMetadata = [
                    {
                        extension: nullExtensionDescription.identifier,
                        name: 'Pretty Name',
                        vendor: 'actual-vendor',
                        family: 'actual-family',
                        version: 'actual-version',
                        id: 'actual-lm',
                        maxInputTokens: 100,
                        maxOutputTokens: 100,
                        modelPickerCategory: DEFAULT_MODEL_PICKER_CATEGORY,
                    }
                ];
                const modelMetadataAndIdentifier = modelMetadata.map(m => ({
                    metadata: m,
                    identifier: m.id,
                }));
                return modelMetadataAndIdentifier;
            },
            sendChatRequest: async (modelId, messages, _from, _options, token) => {
                // const message = messages.at(-1);
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                (async () => {
                    while (!token.isCancellationRequested) {
                        stream.emitOne({ type: 'text', value: Date.now().toString() });
                        await timeout(10);
                    }
                    defer.complete(undefined);
                })();
                return {
                    stream: stream.asyncIterable,
                    result: defer.p
                };
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
        // Register the extension point for the actual vendor
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelChatProviderExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription },
                value: { vendor: 'actual-vendor' },
                collector: null
            }]);
        const models = await languageModels.selectLanguageModels({ id: 'actual-lm' });
        assert.ok(models.length === 1);
        const first = models[0];
        const cts = new CancellationTokenSource();
        const request = await languageModels.sendChatRequest(first, nullExtensionDescription.identifier, [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: 'hello' }] }], {}, cts.token);
        assert.ok(request);
        cts.dispose(true);
        await request.result;
    });
    test('when clause defaults to true when omitted', async function () {
        const vendors = languageModels.getVendors();
        // Both test-vendor and actual-vendor have no when clause, so they should be visible
        assert.ok(vendors.length >= 2);
        assert.ok(vendors.some(v => v.vendor === 'test-vendor'));
        assert.ok(vendors.some(v => v.vendor === 'actual-vendor'));
    });
});
suite('LanguageModels - When Clause', function () {
    class TestContextKeyService extends MockContextKeyService {
        contextMatchesRules(rules) {
            if (!rules) {
                return true;
            }
            // Simple evaluation based on stored keys
            const keys = rules.keys();
            for (const key of keys) {
                const contextKey = this.getContextKeyValue(key);
                // If the key exists and is truthy, the rule matches
                if (contextKey) {
                    return true;
                }
            }
            return false;
        }
    }
    let languageModelsWithWhen;
    let contextKeyService;
    setup(function () {
        contextKeyService = new TestContextKeyService();
        contextKeyService.createKey('testKey', true);
        languageModelsWithWhen = new LanguageModelsService(new class extends mock() {
            activateByEvent(name) {
                return Promise.resolve();
            }
        }, new NullLogService(), new TestStorageService(), contextKeyService, new TestConfigurationService(), new TestChatEntitlementService());
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelChatProviderExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription },
                value: { vendor: 'visible-vendor', displayName: 'Visible Vendor' },
                collector: null
            }, {
                description: { ...nullExtensionDescription },
                value: { vendor: 'conditional-vendor', displayName: 'Conditional Vendor', when: 'testKey' },
                collector: null
            }, {
                description: { ...nullExtensionDescription },
                value: { vendor: 'hidden-vendor', displayName: 'Hidden Vendor', when: 'falseKey' },
                collector: null
            }]);
    });
    teardown(function () {
        languageModelsWithWhen.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('when clause filters vendors correctly', async function () {
        const vendors = languageModelsWithWhen.getVendors();
        assert.strictEqual(vendors.length, 2);
        assert.ok(vendors.some(v => v.vendor === 'visible-vendor'));
        assert.ok(vendors.some(v => v.vendor === 'conditional-vendor'));
        assert.ok(!vendors.some(v => v.vendor === 'hidden-vendor'));
    });
    test('when clause evaluates to true when context key is true', async function () {
        const vendors = languageModelsWithWhen.getVendors();
        assert.ok(vendors.some(v => v.vendor === 'conditional-vendor'), 'conditional-vendor should be visible when testKey is true');
    });
    test('when clause evaluates to false when context key is false', async function () {
        const vendors = languageModelsWithWhen.getVendors();
        assert.ok(!vendors.some(v => v.vendor === 'hidden-vendor'), 'hidden-vendor should be hidden when falseKey is false');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbGFuZ3VhZ2VNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFtQix1Q0FBdUMsRUFBRSxxQkFBcUIsRUFBbUMsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsSyxPQUFPLEVBQXFCLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFOUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFD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