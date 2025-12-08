"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const sinon_1 = __importDefault(require("sinon"));
const vscode_1 = require("vscode");
const descriptors_1 = require("../../../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const model_1 = require("../../../lib/src/openai/model");
const modelPicker_1 = require("./../modelPicker");
const context_1 = require("./context");
suite('ModelPickerManager unit tests', function () {
    let accessor;
    let modelPicker;
    let availableModelsManager;
    let sandbox;
    // Couple of fake models to use in our tests.
    const fakeModels = [
        {
            modelId: 'model-a',
            label: 'Model A',
            type: 'model',
            alwaysShow: true,
            preview: false,
            tokenizer: 'o200k_base',
        },
        {
            modelId: 'model-b',
            label: 'Model B',
            type: 'model',
            alwaysShow: true,
            preview: false,
            tokenizer: 'cl100k_base',
        },
    ];
    setup(function () {
        sandbox = sinon_1.default.createSandbox();
        // Create our test context, and stub the AvailableModelsManager to return our fake models.
        const serviceCollection = (0, context_1.createExtensionTestingContext)();
        serviceCollection.define(model_1.ICompletionsModelManagerService, new descriptors_1.SyncDescriptor(model_1.AvailableModelsManager, [true]));
        accessor = serviceCollection.createTestingAccessor();
        availableModelsManager = accessor.get(model_1.ICompletionsModelManagerService);
        sandbox.stub(availableModelsManager, 'getGenericCompletionModels').returns(fakeModels);
        modelPicker = accessor.get(instantiation_1.IInstantiationService).createInstance(modelPicker_1.ModelPickerManager);
    });
    teardown(async function () {
        // Make sure to close any open quick pick dialogs after each test.
        await vscode_1.commands.executeCommand('workbench.action.closeQuickOpen');
        sandbox.restore();
    });
    test('showModelPicker returns correct items', function () {
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        modelPicker = instantiationService.createInstance(modelPicker_1.ModelPickerManager);
        const quickPick = modelPicker.showModelPicker();
        // Check that we have the correct number of items
        // The items should include the two fake models, a separator, and a learn more item.
        (0, assert_1.default)(quickPick.items.length === 4, quickPick.items.length.toString());
        assert_1.default.strictEqual(quickPick.items[0].modelId, 'model-a');
        assert_1.default.strictEqual(quickPick.items[1].modelId, 'model-b');
        assert_1.default.strictEqual(quickPick.items[2].type, 'separator');
        assert_1.default.strictEqual(quickPick.items[3].type, 'learn-more');
    });
    test('selecting a model updates user selection', async function () {
        // Stub out setting model
        const setModelStub = sandbox.stub(modelPicker, 'setUserSelectedCompletionModel').resolves();
        const quickPick = modelPicker.showModelPicker();
        const secondItem = quickPick.items[1];
        (0, assert_1.default)(secondItem !== undefined, 'model picker should have a model-b second item.');
        // Fake selecting the second item
        quickPick.activeItems = [secondItem];
        await modelPicker.handleModelSelection(quickPick);
        // Test that we updated the user configuration with the selected model
        (0, assert_1.default)(setModelStub.calledOnce, 'setUserSelectedCompletionModel should be called once');
        assert_1.default.strictEqual(setModelStub.firstCall.args[0], secondItem.modelId);
    });
    test('selecting the learn more link tries to open the learn more url', async function () {
        // Stub openExternal
        const openUrlStub = sandbox.stub(vscode_1.env, 'openExternal').resolves();
        const quickPick = modelPicker.showModelPicker();
        const learnMoreItem = quickPick.items[3];
        (0, assert_1.default)(learnMoreItem !== undefined, 'model picker should have a learn more item.');
        // Fake selecting the learn more item
        quickPick.activeItems = [learnMoreItem];
        await modelPicker.handleModelSelection(quickPick);
        // Test that we opened the learn more URL
        (0, assert_1.default)(openUrlStub.calledOnce, 'openUrl should be called once');
        assert_1.default.strictEqual(openUrlStub.firstCall.args[0].toString(), 'https://aka.ms/CopilotCompletionsModelPickerLearnMore');
    });
});
//# sourceMappingURL=modelPicker.test.js.map