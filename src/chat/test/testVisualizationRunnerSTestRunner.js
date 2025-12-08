"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const rendererVisualization_1 = require("../src/extension/inlineChat/node/rendererVisualization");
require("../src/extension/intents/node/allIntents");
const simulationTestContext_1 = require("../src/platform/simulationTestContext/common/simulationTestContext");
const nullTestProvider_1 = require("../src/platform/testing/common/nullTestProvider");
const testProvider_1 = require("../src/platform/testing/common/testProvider");
const chatMLCache_1 = require("./base/chatMLCache");
const salts_1 = require("./base/salts");
const simulationContext_1 = require("./base/simulationContext");
const spyingChatMLFetcher_1 = require("./base/spyingChatMLFetcher");
const stest_1 = require("./base/stest");
const jsonOutputPrinter_1 = require("./jsonOutputPrinter");
const g = globalThis;
async function run(fullPath, testFullName) {
    stest_1.SimulationTestsRegistry.allowTestReregistration();
    rendererVisualization_1.VisualizationTestRun.startRun();
    require(fullPath);
    const tests = stest_1.SimulationTestsRegistry.getAllTests();
    const test = tests.find(t => t.fullName === testFullName);
    if (!test) {
        console.error('Test not found', testFullName);
        return;
    }
    const currentTestRunInfo = {
        test,
        testRunNumber: 0,
        fetchRequestCollector: new spyingChatMLFetcher_1.FetchRequestCollector(),
        isInRealExtensionHost: false,
    };
    const simulationServicesOptions = {
        chatModelThrottlingTaskLaunchers: (0, simulationContext_1.createSimulationChatModelThrottlingTaskLaunchers)(false),
        createChatMLCache: (info) => new chatMLCache_1.ChatMLSQLiteCache(salts_1.TestingCacheSalts.requestCacheSalt, info),
        isNoFetchModeEnabled: false,
        languageModelCacheMode: simulationContext_1.CacheMode.Default,
        resourcesCacheMode: simulationContext_1.CacheMode.Default,
        disabledTools: new Set(),
        swebenchPrompt: false,
        summarizeHistory: true,
        useExperimentalCodeSearchService: false,
        configs: undefined,
    };
    const testingServiceCollection = await (0, simulationContext_1.createSimulationAccessor)({ chatModel: test.model, embeddingType: test.embeddingType }, simulationServicesOptions, currentTestRunInfo);
    testingServiceCollection.define(jsonOutputPrinter_1.IJSONOutputPrinter, {
        print(obj) {
            console.log(obj);
        },
        _serviceBrand: undefined,
    });
    testingServiceCollection.define(testProvider_1.ITestProvider, new nullTestProvider_1.NullTestProvider());
    testingServiceCollection.define(stest_1.ISimulationTestRuntime, new stest_1.SimulationTestRuntime('./', './.simulation/visualization-out', 1));
    testingServiceCollection.define(simulationTestContext_1.ISimulationTestContext, new simulationTestContext_1.NulSimulationTestContext());
    try {
        const startTime = Date.now();
        g.$$debugValueEditor_properties = [];
        await test?.run(testingServiceCollection);
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log('> Test finished (' + duration + 'ms).');
    }
    catch (e) {
        console.error('Test failed:', e);
    }
    finally {
        testingServiceCollection.dispose();
    }
}
console.log('> Playground runner ready.');
//# sourceMappingURL=testVisualizationRunnerSTestRunner.js.map