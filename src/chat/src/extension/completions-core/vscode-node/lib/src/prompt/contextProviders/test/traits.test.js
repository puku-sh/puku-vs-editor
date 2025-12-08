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
const context_1 = require("../../../test/context");
const contextProviderStatistics_1 = require("../../contextProviderStatistics");
const contextProviderStatistics_2 = require("../../test/contextProviderStatistics");
const traits_1 = require("./../traits");
suite('traitsContextProvider', function () {
    let accessor;
    const resolvedContextItems = [
        {
            providerId: 'testTraitsProvider',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data: [
                // This trait should be the last in the list, since higher importance
                // is closer to the end of the prompt.
                {
                    name: 'trait_from_context_provider1_1',
                    value: 'value_1',
                    importance: 10,
                    id: '1',
                    type: 'Trait',
                },
                {
                    name: 'trait_from_context_provider1_2',
                    value: 'value_2',
                    id: '2',
                    type: 'Trait',
                },
            ],
        },
        {
            providerId: 'testTraitsProvider2',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data: [{ name: 'trait_from_context_provider2_1', value: 'value_3', id: '3', type: 'Trait' }],
        },
    ];
    setup(function () {
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(contextProviderStatistics_1.ICompletionsContextProviderService, new contextProviderStatistics_1.ContextProviderStatistics(() => new contextProviderStatistics_2.TestContextProviderStatistics()));
        accessor = serviceCollection.createTestingAccessor();
    });
    test('can get traits from context text providers and flattens them', function () {
        const traits = (0, traits_1.getTraitsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems);
        assert_1.default.deepStrictEqual(traits.length, 3);
        assert_1.default.deepStrictEqual(traits.map(t => t.name), ['trait_from_context_provider1_2', 'trait_from_context_provider2_1', 'trait_from_context_provider1_1']);
    });
    test('set expectations for contextProviderStatistics', function () {
        (0, traits_1.getTraitsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems);
        const statistics = accessor
            .get(contextProviderStatistics_1.ICompletionsContextProviderService)
            .getStatisticsForCompletion('COMPLETION_ID');
        // Prompt components expectations
        assert_1.default.deepStrictEqual(statistics.expectations.size, 2);
        const traitExpectations = statistics.expectations.get('testTraitsProvider');
        assert_1.default.ok(traitExpectations);
        assert_1.default.deepStrictEqual(traitExpectations, [
            [
                { id: '1', name: 'trait_from_context_provider1_1', value: 'value_1', importance: 10, type: 'Trait' },
                'included',
            ],
            [{ id: '2', name: 'trait_from_context_provider1_2', value: 'value_2', type: 'Trait' }, 'included'],
        ]);
        const traitExpectations2 = statistics.expectations.get('testTraitsProvider2');
        assert_1.default.ok(traitExpectations2);
        assert_1.default.deepStrictEqual(traitExpectations2, [
            [{ id: '3', name: 'trait_from_context_provider2_1', value: 'value_3', type: 'Trait' }, 'included'],
        ]);
    });
});
//# sourceMappingURL=traits.test.js.map