"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nullTelemetryService_1 = require("../../../../platform/telemetry/common/nullTelemetryService");
const extensionContext_1 = require("../../../../platform/test/node/extensionContext");
const editToolLearningService_1 = require("../../common/editToolLearningService");
const toolNames_1 = require("../../common/toolNames");
(0, vitest_1.describe)('EditToolLearningService', () => {
    let service;
    let mockContext;
    let mockEndpointProvider;
    // Helper to create mock language model
    const createMockModel = (id = 'test-model') => ({
        id,
        name: 'Test Model',
        vendor: 'test-vendor',
        family: 'test-family',
        version: '1.0',
        maxInputTokens: 4000,
        capabilities: {
            supportsToolCalling: true,
            supportsImageToText: false,
        },
        countTokens: vitest_1.vi.fn(),
        sendRequest: vitest_1.vi.fn(),
    });
    // Helper to create mock endpoint
    const createMockEndpoint = (isExtensionContributed, family = 'test-family', model) => ({
        family,
        model: model.id,
        maxOutputTokens: 1000,
        supportsToolCalls: true,
        supportsVision: false,
        supportsPrediction: false,
        showInModelPicker: true,
        isDefault: false,
        isFallback: false,
        isExtensionContributed,
        policy: 'enabled',
        urlOrRequestMetadata: 'test-url',
        modelMaxPromptTokens: 4000,
        name: model.id,
        version: '1.0',
        tokenizer: 'gpt',
        acceptChatPolicy: vitest_1.vi.fn().mockResolvedValue(true),
        processResponseFromChatEndpoint: vitest_1.vi.fn(),
        acquireTokenizer: vitest_1.vi.fn(),
        createChatCompletionRequest: vitest_1.vi.fn(),
    });
    // Helper to simulate multiple edits for a tool
    const simulateEdits = async (model, tool, successes, failures) => {
        for (let i = 0; i < successes; i++) {
            await service.didMakeEdit(model, tool, true);
        }
        for (let i = 0; i < failures; i++) {
            await service.didMakeEdit(model, tool, false);
        }
    };
    (0, vitest_1.beforeEach)(() => {
        mockEndpointProvider = {
            getChatEndpoint: vitest_1.vi.fn(),
        };
        mockContext = new extensionContext_1.MockExtensionContext();
        // Set up proper spies for global state methods
        mockContext.globalState.get = vitest_1.vi.fn().mockReturnValue(undefined);
        mockContext.globalState.update = vitest_1.vi.fn().mockResolvedValue(undefined);
        service = new editToolLearningService_1.EditToolLearningService(mockContext, mockEndpointProvider, new nullTelemetryService_1.NullTelemetryService());
    });
    (0, vitest_1.describe)('getPreferredEditTool', () => {
        (0, vitest_1.it)('should return undefined for non-extension-contributed models', async () => {
            const model = createMockModel();
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(false, undefined, model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toBeUndefined();
        });
        (0, vitest_1.it)('should return ApplyPatch for GPT family models', async () => {
            const model = createMockModel('gpt-4');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'gpt', model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ApplyPatch]);
        });
        (0, vitest_1.it)('should return ApplyPatch for OpenAI family models', async () => {
            const model = createMockModel('openai-gpt-3.5');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'openai', model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ApplyPatch]);
        });
        (0, vitest_1.it)('should return ReplaceString tools for Sonnet family models', async () => {
            const model = createMockModel('claude-3-sonnet');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'claude', model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString]);
        });
        (0, vitest_1.it)('should return initial state tools for unknown extension-contributed models', async () => {
            const model = createMockModel();
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'unknown-model', model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.EditFile, toolNames_1.ToolName.ReplaceString]);
        });
    });
    (0, vitest_1.describe)('didMakeEdit', () => {
        (0, vitest_1.it)('should not record edits for non-extension-contributed models', async () => {
            const model = createMockModel();
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(false, undefined, model));
            await service.didMakeEdit(model, toolNames_1.ToolName.ReplaceString, true);
            // Should not have saved anything to storage
            (0, vitest_1.expect)(mockContext.globalState.get).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should not record edits for hardcoded preference models', async () => {
            const model = createMockModel('gpt-4');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'gpt', model));
            await service.didMakeEdit(model, toolNames_1.ToolName.ApplyPatch, true);
            // Should not have saved anything to storage since GPT models have hardcoded preferences
            (0, vitest_1.expect)(mockContext.globalState.update).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should record edits for extension-contributed models without hardcoded preferences', async () => {
            const model = createMockModel('custom-model');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'custom-family', model));
            await service.didMakeEdit(model, toolNames_1.ToolName.ReplaceString, true);
            (0, vitest_1.expect)(mockContext.globalState.update).toHaveBeenCalledWith('editToolLearning_cache', vitest_1.expect.objectContaining({
                entries: vitest_1.expect.arrayContaining([
                    vitest_1.expect.arrayContaining(['custom-model', vitest_1.expect.any(Object)])
                ])
            }));
        });
    });
    (0, vitest_1.describe)('state transitions', () => {
        let model;
        (0, vitest_1.beforeEach)(() => {
            model = createMockModel('learning-model');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'learning-family', model));
        });
        (0, vitest_1.it)('should transition from Initial to ReplaceStringMaybeMulti on successful ReplaceString usage', async () => {
            // Simulate enough successful ReplaceString edits
            const successfulEdits = Math.ceil(66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */);
            await simulateEdits(model, toolNames_1.ToolName.ReplaceString, successfulEdits, 0);
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString]);
        });
        (0, vitest_1.it)('should transition from Initial to EditFileOnly on failed ReplaceString usage', async () => {
            // Simulate enough failed ReplaceString edits to fall below failure threshold
            const totalEdits = Math.ceil(66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */);
            const failedEdits = Math.ceil(totalEdits * (1 - 0.3 /* LearningConfig.SR_FAILURE_THRESHOLD */ + 0.1));
            const successfulEdits = totalEdits - failedEdits;
            await simulateEdits(model, toolNames_1.ToolName.ReplaceString, successfulEdits, failedEdits);
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.EditFile]);
        });
        (0, vitest_1.it)('should transition from Initial to ReplaceStringForced when EditFile is overused', async () => {
            // Simulate excessive EditFile usage
            await simulateEdits(model, toolNames_1.ToolName.EditFile, 100 /* LearningConfig.WINDOW_SIZE */, 0);
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ReplaceString]);
        });
        (0, vitest_1.it)('should transition from ReplaceStringMaybeMulti to ReplaceStringWithMulti on successful MultiReplaceString usage', async () => {
            // First, get to ReplaceStringMaybeMulti state
            const successfulReplaceEdits = Math.ceil(66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */);
            await simulateEdits(model, toolNames_1.ToolName.ReplaceString, successfulReplaceEdits, 0);
            // Then, simulate successful MultiReplaceString usage
            const successfulMultiEdits = Math.ceil(66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */);
            await simulateEdits(model, toolNames_1.ToolName.MultiReplaceString, successfulMultiEdits, 0);
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString]);
        });
        (0, vitest_1.it)('should transition from ReplaceStringMaybeMulti to ReplaceStringOnly on failed MultiReplaceString usage', async () => {
            // First, get to ReplaceStringMaybeMulti state
            const successfulReplaceEdits = Math.ceil(66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */);
            await simulateEdits(model, toolNames_1.ToolName.ReplaceString, successfulReplaceEdits, 0);
            // Verify we're in ReplaceStringMaybeMulti state
            let result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString]);
            // Then, simulate failed MultiReplaceString usage to get below MULTISR_FAILURE_THRESHOLD (0.4)
            const totalMultiEdits = Math.ceil(66.66666666666666 /* LearningConfig.MIN_SAMPLE_SIZE */);
            // We want success rate to be below 0.4, so let's use 0.3 (30% success rate)
            const successfulMultiEdits = Math.floor(totalMultiEdits * 0.3);
            const failedMultiEdits = totalMultiEdits - successfulMultiEdits;
            await simulateEdits(model, toolNames_1.ToolName.MultiReplaceString, successfulMultiEdits, failedMultiEdits);
            result = await service.getPreferredEditTool(model);
            // Should transition to ReplaceStringOnly state which only allows ReplaceString
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.ReplaceString]);
        });
    });
    (0, vitest_1.describe)('cache persistence', () => {
        (0, vitest_1.it)('should persist learning data across service instances', async () => {
            const model = createMockModel('persistent-model');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'persistent-family', model));
            // Record some edits
            await simulateEdits(model, toolNames_1.ToolName.ReplaceString, 10, 5);
            // Create a new service instance with the same context
            const newService = new editToolLearningService_1.EditToolLearningService(mockContext, mockEndpointProvider, new nullTelemetryService_1.NullTelemetryService());
            // The new service should have access to the persisted data
            const result = await newService.getPreferredEditTool(model);
            // Should still be in initial state since we haven't reached MIN_SAMPLE_SIZE
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.EditFile, toolNames_1.ToolName.ReplaceString]);
        });
        (0, vitest_1.it)('should handle empty storage gracefully', async () => {
            // Ensure no stored data (already set up in beforeEach)
            const model = createMockModel('new-model');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'new-family', model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.EditFile, toolNames_1.ToolName.ReplaceString]);
        });
    });
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('should handle models with no recorded data', async () => {
            const model = createMockModel('never-used-model');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'never-used-family', model));
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toEqual([toolNames_1.ToolName.EditFile, toolNames_1.ToolName.ReplaceString]);
        });
        (0, vitest_1.it)('should handle concurrent edits correctly', async () => {
            const model = createMockModel('concurrent-model');
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValue(createMockEndpoint(true, 'concurrent-family', model));
            // Simulate concurrent edits
            const promises = [
                service.didMakeEdit(model, toolNames_1.ToolName.ReplaceString, true),
                service.didMakeEdit(model, toolNames_1.ToolName.ReplaceString, false),
                service.didMakeEdit(model, toolNames_1.ToolName.EditFile, true),
            ];
            await Promise.all(promises);
            // Should not throw and should have recorded all edits
            const result = await service.getPreferredEditTool(model);
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.it)('should respect LRU cache size limits', async () => {
            // Create more models than cache size
            const modelsToCreate = 50 /* LearningConfig.CACHE_SIZE */ + 5;
            const models = Array.from({ length: modelsToCreate }, (_, i) => createMockModel(`model-${i}`));
            // Record edits for all models
            for (const model of models) {
                vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValueOnce(createMockEndpoint(true, 'test-family', model));
                await service.didMakeEdit(model, toolNames_1.ToolName.ReplaceString, true);
            }
            // All operations should complete without error
            // The LRU cache should handle the overflow gracefully
            const lastModel = models[models.length - 1];
            vitest_1.vi.mocked(mockEndpointProvider.getChatEndpoint).mockResolvedValueOnce(createMockEndpoint(true, 'test-family', lastModel));
            const result = await service.getPreferredEditTool(lastModel);
            (0, vitest_1.expect)(result).toBeDefined();
        });
    });
});
//# sourceMappingURL=editToolLearningService.spec.js.map