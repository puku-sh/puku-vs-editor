"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contextItemSchemas_1 = require("../contextItemSchemas");
const assert_1 = __importDefault(require("assert"));
suite('contextItemSchemas', function () {
    test('can filter homogeneous context item by schema', function () {
        const badItem = {
            providerId: 'doesntmatter',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data: ['hello'],
        };
        const goodItem = {
            providerId: 'doesntmatter',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data: [
                { name: 'trait1', value: 'value1', id: '1', type: 'Trait' },
                { name: 'trait2', value: 'value2', id: '2', type: 'Trait' },
            ],
        };
        // Since they are homogeneous, it's either all or nothing.
        assert_1.default.deepStrictEqual((0, contextItemSchemas_1.filterContextItemsByType)([badItem], 'Trait'), []);
        assert_1.default.deepStrictEqual((0, contextItemSchemas_1.filterContextItemsByType)([goodItem], 'Trait'), [goodItem]);
    });
    test('can filter homogeneous context item lists by schema', function () {
        const resolvedContextItems = [
            {
                providerId: 'doesntmatter',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: 10,
                data: ['hello'],
            },
            {
                providerId: 'doesntmatter',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: 10,
                data: [
                    { name: 'trait1', value: 'value1', id: '1', type: 'Trait' },
                    { name: 'trait2', value: 'value2', id: '2', type: 'Trait' },
                ],
            },
        ];
        assert_1.default.deepStrictEqual((0, contextItemSchemas_1.filterContextItemsByType)(resolvedContextItems, 'Trait'), [resolvedContextItems[1]]);
    });
    test('can filter heterogeneous context item schema', function () {
        const data = [
            { name: 'trait1', value: 'value1', id: '1', type: 'Trait' },
            { uri: 'file:///foo', value: 'filevalue1', id: '2', type: 'CodeSnippet' },
        ];
        const mixedContextItem = {
            providerId: 'doesntmatter',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data,
        };
        const filteredTraits = (0, contextItemSchemas_1.filterContextItemsByType)([mixedContextItem], 'Trait');
        assert_1.default.deepStrictEqual(filteredTraits.length, 1);
        assert_1.default.deepStrictEqual(filteredTraits[0].data, [data[0]]);
        const filteredFileSnippets = (0, contextItemSchemas_1.filterContextItemsByType)([mixedContextItem], 'CodeSnippet');
        assert_1.default.deepStrictEqual(filteredFileSnippets.length, 1);
        assert_1.default.deepStrictEqual(filteredFileSnippets[0].data, [data[1]]);
    });
    test('can filter heterogeneous context item list by schema', function () {
        const resolvedContextItems = [
            {
                providerId: 'doesntmatter1',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: 10,
                data: [
                    { name: 'trait1', value: 'value1', id: '1', type: 'Trait' },
                    { uri: 'file:///foo', value: 'filevalue1', id: '2', type: 'CodeSnippet' },
                ],
            },
            {
                providerId: 'doesntmatter2',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: 10,
                data: [{ name: 'trait2', value: 'value2', id: '3', type: 'Trait' }],
            },
        ];
        const filteredTraits = (0, contextItemSchemas_1.filterContextItemsByType)(resolvedContextItems, 'Trait');
        assert_1.default.deepStrictEqual(filteredTraits.length, 2);
        assert_1.default.deepStrictEqual(filteredTraits[0].data, [{ name: 'trait1', value: 'value1', id: '1', type: 'Trait' }]);
        assert_1.default.deepStrictEqual(filteredTraits[1].data, [{ name: 'trait2', value: 'value2', id: '3', type: 'Trait' }]);
    });
    test('validates context items schema', function () {
        const resolvedContextItems = [
            { name: 'trait1', value: 'value1' },
            { uri: 'file:///foo', value: 'filevalue1' },
        ];
        const [validItems, invalidItems] = (0, contextItemSchemas_1.filterSupportedContextItems)(resolvedContextItems);
        assert_1.default.deepStrictEqual(invalidItems, 0);
        assert_1.default.deepStrictEqual(validItems.length, 2);
    });
    test('items can have optional properties', function () {
        const resolvedContextItems = [
            { uri: 'file:///foo', value: 'filevaluewithoptionalprop', optionalProp: 'optional' },
            { uri: 'file:///foo', value: 'filevaluewithoutag' },
        ];
        const [validItems, invalidItems] = (0, contextItemSchemas_1.filterSupportedContextItems)(resolvedContextItems);
        assert_1.default.deepStrictEqual(invalidItems, 0);
        assert_1.default.deepStrictEqual(validItems.length, 2);
        // Keeps all optional properties
        assert_1.default.deepStrictEqual(validItems[0].optionalProp, 'optional');
    });
});
//# sourceMappingURL=contextItemSchemas.test.js.map