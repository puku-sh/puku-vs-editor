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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const docIntent_1 = require("../../src/extension/intents/node/docIntent");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const outcomeValidators_1 = require("../simulation/outcomeValidators");
const stestUtil_1 = require("../simulation/stestUtil");
const slashDoc_util_1 = require("./slashDoc.util");
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/doc${suffix}`, language: 'cpp', location: 'inline' }, () => {
        (0, stest_1.stest)({ description: 'doc comment for C++', language: 'cpp', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('cpp/basic/main.cpp'),
                ],
                queries: [
                    {
                        file: 'main.cpp',
                        selection: [4, 7],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // no duplication of declaration
                            (0, stestUtil_1.assertOccursOnce)(fileContents, 'template<template<typename U, typename V, typename... Args> class ObjectType =');
                            // no block bodies with a single comment
                            assert.strictEqual(Array.from(fileContents.matchAll(/\/\/ \.\.\./g)).length, 0, 'no // ...');
                            assert.strictEqual(Array.from(fileContents.matchAll(/implementation/g)).length, 0);
                            // assert it contains doc comments above
                            const fileLines = fileContents.split('\n');
                            (0, slashDoc_util_1.assertDocLines)(fileLines, 'template<template<typename U, typename V, typename... Args> class ObjectType =');
                            (0, stestUtil_1.assertOccursOnce)(fileContents, 'template<template<typename U, typename V, typename... Args> class ObjectType =');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'doc comment for template', language: 'cpp', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('cpp/headers/json_fwd.hpp'),
                ],
                queries: [
                    {
                        file: 'json_fwd.hpp',
                        selection: [37, 0, 50, 0],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            // Assert we get back a single inline edit that does not remove any existing text from the file.
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert.strictEqual(outcome.appliedEdits.length, 1, `expected 1 edit`);
                            assert.strictEqual(outcome.appliedEdits[0].length, 0, `expected 0 length`);
                            assert.strictEqual(outcome.appliedEdits[0].range.start.line, 36, `excpected comment at line 36`);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['template class', 'BooleanType']);
                            (0, stestUtil_1.assertSomeStrings)(outcome.fileContents, ['JSON structure', 'JSON object']);
                            (0, stestUtil_1.assertSomeStrings)(outcome.fileContents, ['Defaults to bool', 'defaults to bool']);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'doc comment for macro', language: 'cpp', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('cpp/headers/abi_macros.hpp'),
                ],
                queries: [
                    {
                        file: 'abi_macros.hpp',
                        selection: [59, 0, 61, 0],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            // Assert we get back a single inline edit that does not remove any existing text from the file.
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert.strictEqual(outcome.appliedEdits.length, 1, `expected 1 edit`);
                            assert.strictEqual(outcome.appliedEdits[0].length, 0, `expected 0 length`);
                            assert.strictEqual(outcome.appliedEdits[0].range.start.line, 58, `excpected comment at line 58`);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['version', 'major', 'minor', 'patch']);
                        },
                    },
                ],
            });
        });
    });
});
//# sourceMappingURL=slashDoc.cpp.stest.js.map