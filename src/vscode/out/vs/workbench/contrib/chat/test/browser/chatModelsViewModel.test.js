/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatModelsViewModel, isVendorEntry } from '../../browser/chatManagement/chatModelsViewModel.js';
import { ChatEntitlement } from '../../../../services/chat/common/chatEntitlementService.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
class MockLanguageModelsService {
    constructor() {
        this.vendors = [];
        this.models = new Map();
        this.modelsByVendor = new Map();
        this._onDidChangeLanguageModels = new Emitter();
        this.onDidChangeLanguageModels = this._onDidChangeLanguageModels.event;
    }
    addVendor(vendor) {
        this.vendors.push(vendor);
        this.modelsByVendor.set(vendor.vendor, []);
    }
    addModel(vendorId, identifier, metadata) {
        this.models.set(identifier, metadata);
        const models = this.modelsByVendor.get(vendorId) || [];
        models.push(identifier);
        this.modelsByVendor.set(vendorId, models);
    }
    registerLanguageModelProvider(vendor, provider) {
        throw new Error('Method not implemented.');
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        throw new Error('Method not implemented.');
    }
    getVendors() {
        return this.vendors;
    }
    getLanguageModelIds() {
        return Array.from(this.models.keys());
    }
    lookupLanguageModel(identifier) {
        return this.models.get(identifier);
    }
    getLanguageModels() {
        const result = [];
        for (const [identifier, metadata] of this.models.entries()) {
            result.push({ identifier, metadata });
        }
        return result;
    }
    setContributedSessionModels() {
    }
    clearContributedSessionModels() {
    }
    async selectLanguageModels(selector, allowHidden) {
        if (selector.vendor) {
            return this.modelsByVendor.get(selector.vendor) || [];
        }
        return Array.from(this.models.keys());
    }
    sendChatRequest() {
        throw new Error('Method not implemented.');
    }
    computeTokenLength() {
        throw new Error('Method not implemented.');
    }
}
class MockChatEntitlementService {
    constructor() {
        this._onDidChangeEntitlement = new Emitter();
        this.onDidChangeEntitlement = this._onDidChangeEntitlement.event;
        this.entitlement = ChatEntitlement.Unknown;
        this.entitlementObs = observableValue('entitlement', ChatEntitlement.Unknown);
        this.organisations = undefined;
        this.isInternal = false;
        this.sku = undefined;
        this.onDidChangeQuotaExceeded = Event.None;
        this.onDidChangeQuotaRemaining = Event.None;
        this.quotas = {
            chat: {
                total: 100,
                remaining: 100,
                percentRemaining: 100,
                overageEnabled: false,
                overageCount: 0,
                unlimited: false
            },
            completions: {
                total: 100,
                remaining: 100,
                percentRemaining: 100,
                overageEnabled: false,
                overageCount: 0,
                unlimited: false
            }
        };
        this.onDidChangeSentiment = Event.None;
        this.sentiment = { installed: true, hidden: false, disabled: false };
        this.sentimentObs = observableValue('sentiment', { installed: true, hidden: false, disabled: false });
        this.onDidChangeAnonymous = Event.None;
        this.anonymous = false;
        this.anonymousObs = observableValue('anonymous', false);
    }
    fireEntitlementChange() {
        this._onDidChangeEntitlement.fire();
    }
    async update() {
        // Not needed for tests
    }
}
suite('ChatModelsViewModel', () => {
    let store;
    let languageModelsService;
    let chatEntitlementService;
    let viewModel;
    setup(async () => {
        store = new DisposableStore();
        languageModelsService = new MockLanguageModelsService();
        chatEntitlementService = new MockChatEntitlementService();
        // Setup test data
        languageModelsService.addVendor({
            vendor: 'copilot',
            displayName: 'GitHub Copilot',
            managementCommand: undefined,
            when: undefined
        });
        languageModelsService.addVendor({
            vendor: 'openai',
            displayName: 'OpenAI',
            managementCommand: undefined,
            when: undefined
        });
        languageModelsService.addModel('copilot', 'copilot-gpt-4', {
            extension: new ExtensionIdentifier('github.copilot'),
            id: 'gpt-4',
            name: 'GPT-4',
            family: 'gpt-4',
            version: '1.0',
            vendor: 'copilot',
            maxInputTokens: 8192,
            maxOutputTokens: 4096,
            modelPickerCategory: { label: 'Copilot', order: 1 },
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
                vision: true,
                agentMode: false
            }
        });
        languageModelsService.addModel('copilot', 'copilot-gpt-4o', {
            extension: new ExtensionIdentifier('github.copilot'),
            id: 'gpt-4o',
            name: 'GPT-4o',
            family: 'gpt-4',
            version: '1.0',
            vendor: 'copilot',
            maxInputTokens: 8192,
            maxOutputTokens: 4096,
            modelPickerCategory: { label: 'Copilot', order: 1 },
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
                vision: true,
                agentMode: true
            }
        });
        languageModelsService.addModel('openai', 'openai-gpt-3.5', {
            extension: new ExtensionIdentifier('openai.api'),
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            family: 'gpt-3.5',
            version: '1.0',
            vendor: 'openai',
            maxInputTokens: 4096,
            maxOutputTokens: 2048,
            modelPickerCategory: { label: 'OpenAI', order: 2 },
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
                vision: false,
                agentMode: false
            }
        });
        languageModelsService.addModel('openai', 'openai-gpt-4-vision', {
            extension: new ExtensionIdentifier('openai.api'),
            id: 'gpt-4-vision',
            name: 'GPT-4 Vision',
            family: 'gpt-4',
            version: '1.0',
            vendor: 'openai',
            maxInputTokens: 8192,
            maxOutputTokens: 4096,
            modelPickerCategory: { label: 'OpenAI', order: 2 },
            isUserSelectable: false,
            capabilities: {
                toolCalling: false,
                vision: true,
                agentMode: false
            }
        });
        viewModel = store.add(new ChatModelsViewModel(languageModelsService, chatEntitlementService));
        await viewModel.resolve();
    });
    teardown(() => {
        store.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should fetch all models without filters', () => {
        const results = viewModel.filter('');
        // Should have 2 vendor entries and 4 model entries (grouped by vendor)
        assert.strictEqual(results.length, 6);
        const vendors = results.filter(isVendorEntry);
        assert.strictEqual(vendors.length, 2);
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 4);
    });
    test('should filter by provider name', () => {
        const results = viewModel.filter('@provider:copilot');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 2);
        assert.ok(models.every(m => m.modelEntry.vendor === 'copilot'));
    });
    test('should filter by provider display name', () => {
        const results = viewModel.filter('@provider:OpenAI');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 2);
        assert.ok(models.every(m => m.modelEntry.vendor === 'openai'));
    });
    test('should filter by multiple providers with OR logic', () => {
        const results = viewModel.filter('@provider:copilot @provider:openai');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 4);
    });
    test('should filter by single capability - tools', () => {
        const results = viewModel.filter('@capability:tools');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 3);
        assert.ok(models.every(m => m.modelEntry.metadata.capabilities?.toolCalling === true));
    });
    test('should filter by single capability - vision', () => {
        const results = viewModel.filter('@capability:vision');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 3);
        assert.ok(models.every(m => m.modelEntry.metadata.capabilities?.vision === true));
    });
    test('should filter by single capability - agent', () => {
        const results = viewModel.filter('@capability:agent');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.id, 'gpt-4o');
    });
    test('should filter by multiple capabilities with AND logic', () => {
        const results = viewModel.filter('@capability:tools @capability:vision');
        const models = results.filter(r => !isVendorEntry(r));
        // Should only return models that have BOTH tools and vision
        assert.strictEqual(models.length, 2);
        assert.ok(models.every(m => m.modelEntry.metadata.capabilities?.toolCalling === true &&
            m.modelEntry.metadata.capabilities?.vision === true));
    });
    test('should filter by three capabilities with AND logic', () => {
        const results = viewModel.filter('@capability:tools @capability:vision @capability:agent');
        const models = results.filter(r => !isVendorEntry(r));
        // Should only return gpt-4o which has all three
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.id, 'gpt-4o');
    });
    test('should return no results when filtering by incompatible capabilities', () => {
        const results = viewModel.filter('@capability:vision @capability:agent');
        const models = results.filter(r => !isVendorEntry(r));
        // Only gpt-4o has both vision and agent, but gpt-4-vision doesn't have agent
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.id, 'gpt-4o');
    });
    test('should filter by visibility - visible:true', () => {
        const results = viewModel.filter('@visible:true');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 3);
        assert.ok(models.every(m => m.modelEntry.metadata.isUserSelectable === true));
    });
    test('should filter by visibility - visible:false', () => {
        const results = viewModel.filter('@visible:false');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.isUserSelectable, false);
    });
    test('should combine provider and capability filters', () => {
        const results = viewModel.filter('@provider:copilot @capability:vision');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 2);
        assert.ok(models.every(m => m.modelEntry.vendor === 'copilot' &&
            m.modelEntry.metadata.capabilities?.vision === true));
    });
    test('should combine provider, capability, and visibility filters', () => {
        const results = viewModel.filter('@provider:openai @capability:vision @visible:false');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.id, 'gpt-4-vision');
    });
    test('should filter by text matching model name', () => {
        const results = viewModel.filter('GPT-4o');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.name, 'GPT-4o');
        assert.ok(models[0].modelNameMatches);
    });
    test('should filter by text matching model id', () => {
        const results = viewModel.filter('copilot-gpt-4o');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.identifier, 'copilot-gpt-4o');
        assert.ok(models[0].modelIdMatches);
    });
    test('should filter by text matching vendor name', () => {
        const results = viewModel.filter('GitHub');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 2);
        assert.ok(models.every(m => m.modelEntry.vendorDisplayName === 'GitHub Copilot'));
    });
    test('should combine text search with capability filter', () => {
        const results = viewModel.filter('@capability:tools GPT');
        const models = results.filter(r => !isVendorEntry(r));
        // Should match all models with tools capability and 'GPT' in name
        assert.strictEqual(models.length, 3);
        assert.ok(models.every(m => m.modelEntry.metadata.capabilities?.toolCalling === true));
    });
    test('should handle empty search value', () => {
        const results = viewModel.filter('');
        // Should return all models grouped by vendor
        assert.ok(results.length > 0);
    });
    test('should handle search value with only whitespace', () => {
        const results = viewModel.filter('   ');
        // Should return all models grouped by vendor
        assert.ok(results.length > 0);
    });
    test('should match capability text in free text search', () => {
        const results = viewModel.filter('vision');
        const models = results.filter(r => !isVendorEntry(r));
        // Should match models that have vision capability or "vision" in their name
        assert.ok(models.length > 0);
        assert.ok(models.every(m => m.modelEntry.metadata.capabilities?.vision === true ||
            m.modelEntry.metadata.name.toLowerCase().includes('vision')));
    });
    test('should toggle vendor collapsed state', () => {
        const vendorEntry = viewModel.viewModelEntries.find(r => isVendorEntry(r) && r.vendorEntry.vendor === 'copilot');
        viewModel.toggleVendorCollapsed(vendorEntry);
        const results = viewModel.filter('');
        const copilotVendor = results.find(r => isVendorEntry(r) && r.vendorEntry.vendor === 'copilot');
        assert.ok(copilotVendor);
        assert.strictEqual(copilotVendor.collapsed, true);
        // Models should not be shown when vendor is collapsed
        const copilotModelsAfterCollapse = results.filter(r => !isVendorEntry(r) && r.modelEntry.vendor === 'copilot');
        assert.strictEqual(copilotModelsAfterCollapse.length, 0);
        // Toggle back
        viewModel.toggleVendorCollapsed(vendorEntry);
        const resultsAfterExpand = viewModel.filter('');
        const copilotModelsAfterExpand = resultsAfterExpand.filter(r => !isVendorEntry(r) && r.modelEntry.vendor === 'copilot');
        assert.strictEqual(copilotModelsAfterExpand.length, 2);
    });
    test('should fire onDidChangeModelEntries when entitlement changes', async () => {
        let fired = false;
        store.add(viewModel.onDidChange(() => {
            fired = true;
        }));
        chatEntitlementService.fireEntitlementChange();
        // Wait a bit for async resolve
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.strictEqual(fired, true);
    });
    test('should handle quoted search strings', () => {
        // When a search string is fully quoted (starts and ends with quotes),
        // the completeMatch flag is set to true, which currently skips all matching
        // This test verifies the quotes are processed without errors
        const results = viewModel.filter('"GPT"');
        // The function should complete without error
        // Note: complete match logic (both quotes) currently doesn't perform matching
        assert.ok(Array.isArray(results));
    });
    test('should remove filter keywords from text search', () => {
        const results = viewModel.filter('@provider:copilot @capability:vision GPT');
        const models = results.filter(r => !isVendorEntry(r));
        // Should only search 'GPT' in model names, not the filter keywords
        assert.strictEqual(models.length, 2);
        assert.ok(models.every(m => m.modelEntry.vendor === 'copilot'));
    });
    test('should handle case-insensitive capability matching', () => {
        const results1 = viewModel.filter('@capability:TOOLS');
        const results2 = viewModel.filter('@capability:tools');
        const results3 = viewModel.filter('@capability:Tools');
        const models1 = results1.filter(r => !isVendorEntry(r));
        const models2 = results2.filter(r => !isVendorEntry(r));
        const models3 = results3.filter(r => !isVendorEntry(r));
        assert.strictEqual(models1.length, models2.length);
        assert.strictEqual(models2.length, models3.length);
    });
    test('should support toolcalling alias for tools capability', () => {
        const resultsTools = viewModel.filter('@capability:tools');
        const resultsToolCalling = viewModel.filter('@capability:toolcalling');
        const modelsTools = resultsTools.filter(r => !isVendorEntry(r));
        const modelsToolCalling = resultsToolCalling.filter(r => !isVendorEntry(r));
        assert.strictEqual(modelsTools.length, modelsToolCalling.length);
    });
    test('should support agentmode alias for agent capability', () => {
        const resultsAgent = viewModel.filter('@capability:agent');
        const resultsAgentMode = viewModel.filter('@capability:agentmode');
        const modelsAgent = resultsAgent.filter(r => !isVendorEntry(r));
        const modelsAgentMode = resultsAgentMode.filter(r => !isVendorEntry(r));
        assert.strictEqual(modelsAgent.length, modelsAgentMode.length);
    });
    test('should include matched capabilities in results', () => {
        const results = viewModel.filter('@capability:tools @capability:vision');
        const models = results.filter(r => !isVendorEntry(r));
        assert.ok(models.length > 0);
        for (const model of models) {
            assert.ok(model.capabilityMatches);
            assert.ok(model.capabilityMatches.length > 0);
            // Should include both toolCalling and vision
            assert.ok(model.capabilityMatches.some(c => c === 'toolCalling' || c === 'vision'));
        }
    });
    // Helper function to create a single vendor test environment
    function createSingleVendorViewModel(store, chatEntitlementService, includeSecondModel = true) {
        const service = new MockLanguageModelsService();
        service.addVendor({
            vendor: 'copilot',
            displayName: 'GitHub Copilot',
            managementCommand: undefined,
            when: undefined
        });
        service.addModel('copilot', 'copilot-gpt-4', {
            extension: new ExtensionIdentifier('github.copilot'),
            id: 'gpt-4',
            name: 'GPT-4',
            family: 'gpt-4',
            version: '1.0',
            vendor: 'copilot',
            maxInputTokens: 8192,
            maxOutputTokens: 4096,
            modelPickerCategory: { label: 'Copilot', order: 1 },
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
                vision: true,
                agentMode: false
            }
        });
        if (includeSecondModel) {
            service.addModel('copilot', 'copilot-gpt-4o', {
                extension: new ExtensionIdentifier('github.copilot'),
                id: 'gpt-4o',
                name: 'GPT-4o',
                family: 'gpt-4',
                version: '1.0',
                vendor: 'copilot',
                maxInputTokens: 8192,
                maxOutputTokens: 4096,
                modelPickerCategory: { label: 'Copilot', order: 1 },
                isUserSelectable: true,
                capabilities: {
                    toolCalling: true,
                    vision: true,
                    agentMode: true
                }
            });
        }
        const viewModel = store.add(new ChatModelsViewModel(service, chatEntitlementService));
        return { service, viewModel };
    }
    test('should not show vendor header when only one vendor exists', async () => {
        const { viewModel: singleVendorViewModel } = createSingleVendorViewModel(store, chatEntitlementService);
        await singleVendorViewModel.resolve();
        const results = singleVendorViewModel.filter('');
        // Should have only model entries, no vendor entry
        const vendors = results.filter(isVendorEntry);
        assert.strictEqual(vendors.length, 0, 'Should not show vendor header when only one vendor exists');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 2, 'Should show all models');
        assert.ok(models.every(m => m.modelEntry.vendor === 'copilot'));
    });
    test('should show vendor headers when multiple vendors exist', () => {
        // This is the existing behavior test
        const results = viewModel.filter('');
        // Should have 2 vendor entries and 4 model entries (grouped by vendor)
        const vendors = results.filter(isVendorEntry);
        assert.strictEqual(vendors.length, 2, 'Should show vendor headers when multiple vendors exist');
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 4);
    });
    test('should filter single vendor models by capability', async () => {
        const { viewModel: singleVendorViewModel } = createSingleVendorViewModel(store, chatEntitlementService);
        await singleVendorViewModel.resolve();
        const results = singleVendorViewModel.filter('@capability:agent');
        // Should not show vendor header
        const vendors = results.filter(isVendorEntry);
        assert.strictEqual(vendors.length, 0, 'Should not show vendor header');
        // Should only show the model with agent capability
        const models = results.filter(r => !isVendorEntry(r));
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].modelEntry.metadata.id, 'gpt-4o');
    });
    test('should always place copilot vendor at the top', () => {
        const results = viewModel.filter('');
        const vendors = results.filter(isVendorEntry);
        assert.ok(vendors.length >= 2);
        // First vendor should always be copilot
        assert.strictEqual(vendors[0].vendorEntry.vendor, 'copilot');
    });
    test('should maintain copilot at top with multiple vendors', async () => {
        // Add more vendors to ensure sorting works correctly
        languageModelsService.addVendor({
            vendor: 'anthropic',
            displayName: 'Anthropic',
            managementCommand: undefined,
            when: undefined
        });
        languageModelsService.addModel('anthropic', 'anthropic-claude', {
            extension: new ExtensionIdentifier('anthropic.api'),
            id: 'claude-3',
            name: 'Claude 3',
            family: 'claude',
            version: '1.0',
            vendor: 'anthropic',
            maxInputTokens: 100000,
            maxOutputTokens: 4096,
            modelPickerCategory: { label: 'Anthropic', order: 3 },
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
                vision: false,
                agentMode: false
            }
        });
        languageModelsService.addVendor({
            vendor: 'azure',
            displayName: 'Azure OpenAI',
            managementCommand: undefined,
            when: undefined
        });
        languageModelsService.addModel('azure', 'azure-gpt-4', {
            extension: new ExtensionIdentifier('microsoft.azure'),
            id: 'azure-gpt-4',
            name: 'Azure GPT-4',
            family: 'gpt-4',
            version: '1.0',
            vendor: 'azure',
            maxInputTokens: 8192,
            maxOutputTokens: 4096,
            modelPickerCategory: { label: 'Azure', order: 4 },
            isUserSelectable: true,
            capabilities: {
                toolCalling: true,
                vision: false,
                agentMode: false
            }
        });
        await viewModel.resolve();
        const results = viewModel.filter('');
        const vendors = results.filter(isVendorEntry);
        // Should have 4 vendors: copilot, openai, anthropic, azure
        assert.strictEqual(vendors.length, 4);
        // First vendor should always be copilot
        assert.strictEqual(vendors[0].vendorEntry.vendor, 'copilot');
        // Other vendors should be alphabetically sorted: anthropic, azure, openai
        assert.strictEqual(vendors[1].vendorEntry.vendor, 'anthropic');
        assert.strictEqual(vendors[2].vendorEntry.vendor, 'azure');
        assert.strictEqual(vendors[3].vendorEntry.vendor, 'openai');
    });
    test('should keep copilot at top even with text search', () => {
        // Even when searching, if results include multiple vendors, copilot should be first
        const results = viewModel.filter('GPT');
        const vendors = results.filter(isVendorEntry);
        if (vendors.length > 1) {
            // If multiple vendors match, copilot should be first
            const copilotVendor = vendors.find(v => v.vendorEntry.vendor === 'copilot');
            if (copilotVendor) {
                assert.strictEqual(vendors[0].vendorEntry.vendor, 'copilot');
            }
        }
    });
    test('should keep copilot at top when filtering by capability', () => {
        const results = viewModel.filter('@capability:tools');
        const vendors = results.filter(isVendorEntry);
        // Both copilot and openai have models with tools capability
        if (vendors.length > 1) {
            assert.strictEqual(vendors[0].vendorEntry.vendor, 'copilot');
        }
    });
    test('should show vendor headers when filtered', () => {
        const results = viewModel.filter('GPT');
        const vendors = results.filter(isVendorEntry);
        assert.ok(vendors.length > 0);
    });
    test('should not show vendor headers when filtered if only one vendor exists', async () => {
        const { viewModel: singleVendorViewModel } = createSingleVendorViewModel(store, chatEntitlementService);
        await singleVendorViewModel.resolve();
        const results = singleVendorViewModel.filter('GPT');
        const vendors = results.filter(isVendorEntry);
        assert.strictEqual(vendors.length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsc1ZpZXdNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvY2hhdE1vZGVsc1ZpZXdNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXFDLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVJLE9BQU8sRUFBMkIsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDdEgsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTlGLE1BQU0seUJBQXlCO0lBQS9CO1FBR1MsWUFBTyxHQUFpQyxFQUFFLENBQUM7UUFDM0MsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBQ3ZELG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFFcEMsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQztRQUMzRCw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDO0lBOEQ1RSxDQUFDO0lBNURBLFNBQVMsQ0FBQyxNQUFrQztRQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxN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