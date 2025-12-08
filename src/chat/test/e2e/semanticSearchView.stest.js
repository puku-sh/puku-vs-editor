"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const path = __importStar(require("path"));
const semanticSearchTextSearchProvider_1 = require("../../src/extension/workspaceSemanticSearch/node/semanticSearchTextSearchProvider");
const conversationOptions_1 = require("../../src/platform/chat/common/conversationOptions");
const simulationWorkspace_1 = require("../../src/platform/test/node/simulationWorkspace");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(0, stest_1.ssuite)({ title: 'semanticSearchView', location: 'panel' }, (inputPath) => {
    // No default cases checked in at the moment
    if (!inputPath) {
        return;
    }
    if (inputPath.endsWith('tests')) {
        inputPath = path.join(inputPath, 'semantic-search-view');
    }
    const scenariosFolder = inputPath;
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(scenariosFolder);
    for (const scenario of scenarios) {
        for (const testCase of scenario) {
            (0, stest_1.stest)({ description: "Semantic search view: " + testCase.question }, async (testingServiceCollection) => {
                const workspaceState = testCase.getState ? testCase.getState() : undefined;
                testingServiceCollection.define(conversationOptions_1.IConversationOptions, (0, scenarioTest_1.fetchConversationOptions)());
                const simulationWorkspace = new simulationWorkspace_1.SimulationWorkspace();
                simulationWorkspace.setupServices(testingServiceCollection);
                simulationWorkspace.resetFromDeserializedWorkspaceState(workspaceState);
                const accessor = testingServiceCollection.createTestingAccessor();
                const question = testCase.question;
                const instantiationService = accessor.get(instantiation_1.IInstantiationService);
                const provider = instantiationService.createInstance(semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider);
                const results = [];
                await provider.provideAITextSearchResults(question, {
                    folderOptions: [],
                    maxResults: 1000,
                    previewOptions: {
                        matchLines: 100,
                        charsPerLine: 100
                    },
                    maxFileSize: undefined,
                    surroundingContext: 0
                }, {
                    report: (value) => {
                        results.push(value);
                    }
                }, cancellation_1.CancellationToken.None);
                if (testCase.json.keywords) {
                    for (const r of results) {
                        const matched = testCase.json.keywords.some((keyword) => r.previewText.includes(keyword));
                        if (matched) {
                            return { success: true };
                        }
                    }
                }
                assert_1.default.fail('No keywords found in results');
            });
        }
    }
});
//# sourceMappingURL=semanticSearchView.stest.js.map