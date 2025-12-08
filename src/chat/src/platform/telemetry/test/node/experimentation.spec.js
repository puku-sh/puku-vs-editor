"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const copilotToken_1 = require("../../../authentication/common/copilotToken");
const copilotTokenStore_1 = require("../../../authentication/common/copilotTokenStore");
const configurationService_1 = require("../../../configuration/common/configurationService");
const extensionContext_1 = require("../../../extContext/common/extensionContext");
const logService_1 = require("../../../log/common/logService");
const services_1 = require("../../../test/node/services");
const baseExperimentationService_1 = require("../../node/baseExperimentationService");
function toExpectedTreatment(name, org, sku) {
    return `${name}.${org}.${sku}`;
}
let TestExperimentationService = class TestExperimentationService extends baseExperimentationService_1.BaseExperimentationService {
    constructor(extensionContext, tokenStore, configurationService, logService) {
        const delegateFn = (globalState, userInfoStore) => {
            return new MockTASExperimentationService(userInfoStore);
        };
        super(delegateFn, extensionContext, tokenStore, configurationService, logService);
        this._mockTasService = this._delegate;
    }
    get mockTasService() {
        if (!this._mockTasService) {
            throw new Error('Mock TAS service not initialized');
        }
        return this._mockTasService;
    }
};
TestExperimentationService = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, copilotTokenStore_1.ICopilotTokenStore),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, logService_1.ILogService)
], TestExperimentationService);
class MockTASExperimentationService {
    constructor(userInfoStore) {
        this.userInfoStore = userInfoStore;
        this._initialized = false;
        this._fetchedTreatments = false;
        this.refreshCallCount = 0;
        this.treatmentRequests = [];
    }
    get initializePromise() {
        if (this._initializePromise) {
            return this._initializePromise;
        }
        // Resolve after 100ms to simulate async initialization
        this._initializePromise = new Promise((resolve) => {
            setTimeout(() => {
                this._initialized = true;
                resolve();
            }, 100);
        });
        return this._initializePromise;
    }
    get initialFetch() {
        if (this._initialFetch) {
            return this._initialFetch;
        }
        // Resolve after 100ms to simulate async fetch
        this._initialFetch = new Promise((resolve) => {
            setTimeout(() => {
                this._fetchedTreatments = true;
                resolve();
            }, 100);
        });
        return this._initialFetch;
    }
    isFlightEnabled(flight) {
        throw new Error('Method not implemented.');
    }
    isCachedFlightEnabled(flight) {
        throw new Error('Method not implemented.');
    }
    isFlightEnabledAsync(flight) {
        throw new Error('Method not implemented.');
    }
    getTreatmentVariable(configId, name) {
        if (!this._initialized) {
            return undefined;
        }
        if (!this._fetchedTreatments) {
            return undefined;
        }
        const org = this.userInfoStore.internalOrg;
        const sku = this.userInfoStore.sku;
        // Track requests for testing
        this.treatmentRequests.push({ configId, name, org, sku });
        return toExpectedTreatment(name, org, sku);
    }
    getTreatmentVariableAsync(configId, name, checkCache) {
        // Track refresh calls
        if (configId === 'vscode' && name === 'refresh') {
            this.refreshCallCount++;
        }
        return Promise.resolve(this.getTreatmentVariable(configId, name));
    }
    // Test helper methods
    reset() {
        this.refreshCallCount = 0;
        this.treatmentRequests = [];
    }
}
(0, vitest_1.describe)('ExP Service Tests', () => {
    let accessor;
    let expService;
    let copilotTokenService;
    let extensionContext;
    const GitHubProToken = new copilotToken_1.CopilotToken({ token: 'token-gh-pro', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, sku: 'pro', copilot_plan: 'unknown', organization_list: ['4535c7beffc844b46bb1ed4aa04d759a'] });
    const GitHubAndMicrosoftEnterpriseToken = new copilotToken_1.CopilotToken({ token: 'token-gh-msft-enterprise', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, sku: 'enterprise', copilot_plan: 'unknown', organization_list: ['4535c7beffc844b46bb1ed4aa04d759a', 'a5db0bcaae94032fe715fb34a5e4bce2'] });
    const MicrosoftEnterpriseToken = new copilotToken_1.CopilotToken({ token: 'token-msft-enterprise', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, sku: 'enterprise', copilot_plan: 'unknown', organization_list: ['a5db0bcaae94032fe715fb34a5e4bce2'] });
    const NoOrgFreeToken = new copilotToken_1.CopilotToken({ token: 'token-no-org-free', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, chat_enabled: true, sku: 'free', copilot_plan: 'unknown' });
    (0, vitest_1.beforeAll)(() => {
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
        copilotTokenService = accessor.get(copilotTokenStore_1.ICopilotTokenStore);
        expService = accessor.get(instantiation_1.IInstantiationService).createInstance(TestExperimentationService);
    });
    (0, vitest_1.beforeEach)(() => {
        // Reset the mock service before each test
        expService.mockTasService.reset();
        // Clear any existing tokens
        copilotTokenService.copilotToken = undefined;
    });
    const GetNewTreatmentsChangedPromise = () => {
        return new Promise((resolve) => {
            expService.onDidTreatmentsChange((event) => {
                resolve(event);
            });
        });
    };
    (0, vitest_1.it)('should return treatments based on copilot token', async () => {
        await expService.hasTreatments();
        let expectedTreatment = toExpectedTreatment('a', undefined, undefined);
        let treatment = expService.getTreatmentVariable('a');
        (0, vitest_1.expect)(treatment).toBe(expectedTreatment);
        let treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        // Sign in as GitHub with Pro SKU
        copilotTokenService.copilotToken = GitHubProToken;
        await treatmentsChangePromise;
        expectedTreatment = toExpectedTreatment('a', 'github', 'pro');
        treatment = expService.getTreatmentVariable('a');
        (0, vitest_1.expect)(treatment).toBe(expectedTreatment);
        treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        // Sign in as GitHub and Microsoft with Enterprise SKU
        copilotTokenService.copilotToken = GitHubAndMicrosoftEnterpriseToken;
        await treatmentsChangePromise;
        expectedTreatment = toExpectedTreatment('a', 'github', 'enterprise');
        treatment = expService.getTreatmentVariable('a');
        (0, vitest_1.expect)(treatment).toBe(expectedTreatment);
        treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        // Sign in as Microsoft with Enterprise SKU
        copilotTokenService.copilotToken = MicrosoftEnterpriseToken;
        await treatmentsChangePromise;
        expectedTreatment = toExpectedTreatment('a', 'microsoft', 'enterprise');
        treatment = expService.getTreatmentVariable('a');
        (0, vitest_1.expect)(treatment).toBe(expectedTreatment);
        treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        // Sign in as NoOrg with Free SKU
        copilotTokenService.copilotToken = NoOrgFreeToken;
        await treatmentsChangePromise;
        expectedTreatment = toExpectedTreatment('a', undefined, 'free');
        treatment = expService.getTreatmentVariable('a');
        (0, vitest_1.expect)(treatment).toBe(expectedTreatment);
        treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        // Sign out
        copilotTokenService.copilotToken = undefined;
        await treatmentsChangePromise;
        expectedTreatment = toExpectedTreatment('a', undefined, undefined);
        treatment = expService.getTreatmentVariable('a');
        (0, vitest_1.expect)(treatment).toBe(expectedTreatment);
    });
    (0, vitest_1.it)('should trigger treatments refresh when user info changes', async () => {
        await expService.hasTreatments();
        // Reset mock to track refresh calls
        expService.mockTasService.reset();
        // Change token should trigger refresh
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = GitHubProToken;
        await treatmentsChangePromise;
        // Verify refresh was called
        (0, vitest_1.expect)(expService.mockTasService.refreshCallCount).toBe(1);
    });
    (0, vitest_1.it)('should handle cached user info on initialization', async () => {
        // Simulate cached values in global state
        await extensionContext.globalState.update(baseExperimentationService_1.UserInfoStore.INTERNAL_ORG_STORAGE_KEY, 'github');
        await extensionContext.globalState.update(baseExperimentationService_1.UserInfoStore.SKU_STORAGE_KEY, 'pro');
        // Create new service instance to test initialization
        const newExpService = accessor.get(instantiation_1.IInstantiationService).createInstance(TestExperimentationService);
        await newExpService.hasTreatments();
        // Should use cached values initially
        const treatment = newExpService.getTreatmentVariable('test');
        (0, vitest_1.expect)(treatment).toBe(toExpectedTreatment('test', 'github', 'pro'));
        // Clean up
        await extensionContext.globalState.update(baseExperimentationService_1.UserInfoStore.INTERNAL_ORG_STORAGE_KEY, undefined);
        await extensionContext.globalState.update(baseExperimentationService_1.UserInfoStore.SKU_STORAGE_KEY, undefined);
    });
    (0, vitest_1.it)('should handle multiple treatment variables', async () => {
        await expService.hasTreatments();
        // Set up promise BEFORE token change
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = GitHubProToken;
        await treatmentsChangePromise;
        // Test string treatment
        const stringTreatment = expService.getTreatmentVariable('stringVar');
        (0, vitest_1.expect)(stringTreatment).toBe(toExpectedTreatment('stringVar', 'github', 'pro'));
        // Test different config and variable names
        const anotherTreatment = expService.getTreatmentVariable('featureFlag');
        (0, vitest_1.expect)(anotherTreatment).toBe(toExpectedTreatment('featureFlag', 'github', 'pro'));
        // Verify all requests were tracked
        const requests = expService.mockTasService.treatmentRequests;
        (0, vitest_1.expect)(requests.some(r => r.name === 'stringVar')).toBe(true);
        (0, vitest_1.expect)(requests.some(r => r.name === 'featureFlag')).toBe(true);
    });
    (0, vitest_1.it)('should not fire events when relevant user info does not change', async () => {
        await expService.hasTreatments();
        // Set initial token with promise BEFORE token change
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = GitHubProToken;
        await treatmentsChangePromise;
        // Reset mock
        expService.mockTasService.reset();
        let eventFired = false;
        const eventHandler = () => { eventFired = true; };
        expService.onDidTreatmentsChange(eventHandler);
        // We need a separate token just to make sure we get passed the copilot token change guard
        const newGitHubProToken = new copilotToken_1.CopilotToken({
            token: 'github-test', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false,
            chat_enabled: true, sku: 'pro', copilot_plan: 'unknown',
            organization_list: ['4535c7beffc844b46bb1ed4aa04d759a']
        });
        copilotTokenService.copilotToken = newGitHubProToken; // Same token
        // Wait a bit to see if event fires
        await new Promise(resolve => setTimeout(resolve, 50));
        // Event should not have fired since user info didn't change
        (0, vitest_1.expect)(eventFired).toBe(false);
        (0, vitest_1.expect)(expService.mockTasService.refreshCallCount).toBe(0);
    });
    (0, vitest_1.it)('should detect GitHub organization correctly', async () => {
        await expService.hasTreatments();
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = GitHubProToken;
        await treatmentsChangePromise;
        const treatment = expService.getTreatmentVariable('orgTest');
        (0, vitest_1.expect)(treatment).toBe(toExpectedTreatment('orgTest', 'github', 'pro'));
    });
    (0, vitest_1.it)('should detect GitHub and Microsoft organization correctly', async () => {
        await expService.hasTreatments();
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = GitHubAndMicrosoftEnterpriseToken;
        await treatmentsChangePromise;
        const treatment = expService.getTreatmentVariable('orgTest');
        (0, vitest_1.expect)(treatment).toBe(toExpectedTreatment('orgTest', 'github', 'enterprise'));
    });
    (0, vitest_1.it)('should detect Microsoft organization correctly', async () => {
        await expService.hasTreatments();
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = MicrosoftEnterpriseToken;
        await treatmentsChangePromise;
        const treatment = expService.getTreatmentVariable('orgTest');
        (0, vitest_1.expect)(treatment).toBe(toExpectedTreatment('orgTest', 'microsoft', 'enterprise'));
    });
    (0, vitest_1.it)('should handle no organization correctly', async () => {
        await expService.hasTreatments();
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = NoOrgFreeToken;
        await treatmentsChangePromise;
        const treatment = expService.getTreatmentVariable('orgTest');
        (0, vitest_1.expect)(treatment).toBe(toExpectedTreatment('orgTest', undefined, 'free'));
    });
    (0, vitest_1.it)('should return undefined before initialization completes', async () => {
        // Create a fresh service that hasn't been initialized yet
        const newExpService = accessor.get(instantiation_1.IInstantiationService).createInstance(TestExperimentationService);
        // Should return undefined before initialization
        const treatmentBeforeInit = newExpService.getTreatmentVariable('test');
        (0, vitest_1.expect)(treatmentBeforeInit).toBeUndefined();
        // Initialize and verify it works
        await newExpService.hasTreatments();
        const treatmentAfterInit = newExpService.getTreatmentVariable('test');
        (0, vitest_1.expect)(treatmentAfterInit).toBeDefined();
    });
    (0, vitest_1.it)('should persist user info to global state', async () => {
        await expService.hasTreatments();
        // Clear any existing cached values
        await extensionContext.globalState.update(baseExperimentationService_1.UserInfoStore.INTERNAL_ORG_STORAGE_KEY, undefined);
        await extensionContext.globalState.update(baseExperimentationService_1.UserInfoStore.SKU_STORAGE_KEY, undefined);
        // Set a token and wait for update
        const treatmentsChangePromise = GetNewTreatmentsChangedPromise();
        copilotTokenService.copilotToken = GitHubProToken;
        await treatmentsChangePromise;
        // Verify values were cached in global state
        const cachedOrg = extensionContext.globalState.get(baseExperimentationService_1.UserInfoStore.INTERNAL_ORG_STORAGE_KEY);
        const cachedSku = extensionContext.globalState.get(baseExperimentationService_1.UserInfoStore.SKU_STORAGE_KEY);
        (0, vitest_1.expect)(cachedOrg).toBe('github');
        (0, vitest_1.expect)(cachedSku).toBe('pro');
    });
    (0, vitest_1.it)('should only include previously queried treatments in change events', async () => {
        await expService.hasTreatments();
        // Query one treatment before sign-in
        const queriedTreatment = expService.getTreatmentVariable('queriedTreatment');
        (0, vitest_1.expect)(queriedTreatment).toBe(toExpectedTreatment('queriedTreatment', undefined, undefined));
        // Don't query another treatment (notQueriedTreatment)
        // Set up promise for treatment changes
        let treatmentChangePromise = GetNewTreatmentsChangedPromise();
        // Sign in - this should trigger treatment changes
        copilotTokenService.copilotToken = GitHubProToken;
        let treatmentChangeEvent = await treatmentChangePromise;
        // Verify only the previously queried treatment is in the affected list
        (0, vitest_1.expect)(treatmentChangeEvent).toBeDefined();
        (0, vitest_1.expect)(treatmentChangeEvent.affectedTreatmentVariables).toContain('queriedTreatment');
        (0, vitest_1.expect)(treatmentChangeEvent.affectedTreatmentVariables).not.toContain('notQueriedTreatment');
        // Now query the treatment that wasn't queried before to verify it has the new value
        const notQueriedTreatment = expService.getTreatmentVariable('notQueriedTreatment');
        (0, vitest_1.expect)(notQueriedTreatment).toBe(toExpectedTreatment('notQueriedTreatment', 'github', 'pro'));
        // And verify the previously queried treatment has the updated value
        const updatedQueriedTreatment = expService.getTreatmentVariable('queriedTreatment');
        (0, vitest_1.expect)(updatedQueriedTreatment).toBe(toExpectedTreatment('queriedTreatment', 'github', 'pro'));
        // Set up promise for treatment changes
        treatmentChangePromise = GetNewTreatmentsChangedPromise();
        // Sign out - this should trigger another treatment change event
        copilotTokenService.copilotToken = undefined;
        treatmentChangeEvent = await treatmentChangePromise;
        // Verify both queried treatments are in the affected list now
        (0, vitest_1.expect)(treatmentChangeEvent).toBeDefined();
        (0, vitest_1.expect)(treatmentChangeEvent.affectedTreatmentVariables).toContain('queriedTreatment');
        (0, vitest_1.expect)(treatmentChangeEvent.affectedTreatmentVariables).toContain('notQueriedTreatment');
        // Verify both treatments have the signed-out value
        const signedOutQueriedTreatment = expService.getTreatmentVariable('queriedTreatment');
        (0, vitest_1.expect)(signedOutQueriedTreatment).toBe(toExpectedTreatment('queriedTreatment', undefined, undefined));
        const signedOutNotQueriedTreatment = expService.getTreatmentVariable('notQueriedTreatment');
        (0, vitest_1.expect)(signedOutNotQueriedTreatment).toBe(toExpectedTreatment('notQueriedTreatment', undefined, undefined));
    });
});
//# sourceMappingURL=experimentation.spec.js.map