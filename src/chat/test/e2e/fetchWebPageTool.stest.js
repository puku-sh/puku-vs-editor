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
const path_1 = __importDefault(require("path"));
const toolNames_1 = require("../../src/extension/tools/common/toolNames");
const promptContextModel_1 = require("../../src/platform/test/node/promptContextModel");
const stest_1 = require("../base/stest");
const toolSimTest_1 = require("./toolSimTest");
const tools_stest_1 = require("./tools.stest");
stest_1.ssuite.optional(tools_stest_1.shouldSkipAgentTests, { title: 'fetchWebPageTool', subtitle: 'toolCalling', location: 'panel' }, () => {
    const scenarioFolder = path_1.default.join(__dirname, '..', 'test/scenarios/test-tools');
    const getState = () => (0, promptContextModel_1.deserializeWorkbenchState)(scenarioFolder, path_1.default.join(scenarioFolder, 'tools.state.json'));
    (0, stest_1.stest)('proper URL validation and query handling', (0, toolSimTest_1.generateToolTestRunner)({
        question: 'fetch information about React hooks from https://react.dev/reference/react',
        scenarioFolderPath: '',
        getState,
        expectedToolCalls: toolNames_1.ToolName.FetchWebPage,
        tools: {
            [toolNames_1.ToolName.FetchWebPage]: true,
            [toolNames_1.ToolName.FindFiles]: true,
            [toolNames_1.ToolName.FindTextInFiles]: true,
            [toolNames_1.ToolName.ReadFile]: true,
            [toolNames_1.ToolName.EditFile]: true,
            [toolNames_1.ToolName.Codebase]: true,
            [toolNames_1.ToolName.ListDirectory]: true,
            [toolNames_1.ToolName.SearchWorkspaceSymbols]: true,
        },
    }, {
        allowParallelToolCalls: false,
        toolCallValidators: {
            [toolNames_1.ToolName.FetchWebPage]: async (toolCalls) => {
                assert_1.default.strictEqual(toolCalls.length, 1, 'should make exactly one fetch webpage tool call');
                const input = toolCalls[0].input;
                // Should have exactly 1 URL
                assert_1.default.ok(Array.isArray(input.urls), 'urls should be an array');
                assert_1.default.strictEqual(input.urls.length, 1, 'should have exactly 1 URL');
                // Should be the exact URL from the question
                const expectedUrl = 'https://react.dev/reference/react';
                assert_1.default.strictEqual(input.urls[0], expectedUrl, `should have the exact URL: ${expectedUrl}`);
                // Validate query parameter if present
                if (input.query !== undefined) {
                    assert_1.default.ok(typeof input.query === 'string', 'query should be a string if provided');
                    assert_1.default.ok(input.query.length > 0, 'query should not be empty if provided');
                }
            }
        }
    }));
    (0, stest_1.stest)('multiple URLs handling', (0, toolSimTest_1.generateToolTestRunner)({
        question: 'get content from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function about async/await',
        scenarioFolderPath: '',
        getState,
        expectedToolCalls: toolNames_1.ToolName.FetchWebPage,
        tools: {
            [toolNames_1.ToolName.FetchWebPage]: true,
            [toolNames_1.ToolName.FindFiles]: true,
            [toolNames_1.ToolName.FindTextInFiles]: true,
            [toolNames_1.ToolName.ReadFile]: true,
            [toolNames_1.ToolName.EditFile]: true,
            [toolNames_1.ToolName.Codebase]: true,
            [toolNames_1.ToolName.ListDirectory]: true,
            [toolNames_1.ToolName.SearchWorkspaceSymbols]: true,
        },
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.FetchWebPage]: (toolCalls) => {
                const expectedTypescriptUrl = 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html';
                const expectedMdnUrl = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function';
                const expectedUrls = [expectedTypescriptUrl, expectedMdnUrl];
                // Allow either 1 tool call with 2 URLs or 2 tool calls with 1 URL each
                assert_1.default.ok(toolCalls.length === 1 || toolCalls.length === 2, 'should make either 1 or 2 fetch webpage tool calls');
                if (toolCalls.length === 1) {
                    // Single tool call with multiple URLs
                    const input = toolCalls[0].input;
                    // Should have exactly 2 URLs
                    assert_1.default.ok(Array.isArray(input.urls), 'urls should be an array');
                    assert_1.default.strictEqual(input.urls.length, 2, 'should have exactly 2 URLs');
                    // Check that both expected URLs are present
                    assert_1.default.ok(input.urls.includes(expectedTypescriptUrl), `should include the TypeScript URL: ${expectedTypescriptUrl}`);
                    assert_1.default.ok(input.urls.includes(expectedMdnUrl), `should include the MDN URL: ${expectedMdnUrl}`);
                    // Verify no unexpected URLs
                    input.urls.forEach(url => {
                        assert_1.default.ok(expectedUrls.includes(url), `unexpected URL found: ${url}`);
                    });
                }
                else {
                    // Multiple parallel tool calls with one URL each
                    const allUrls = [];
                    toolCalls.forEach(toolCall => {
                        const input = toolCall.input;
                        assert_1.default.ok(Array.isArray(input.urls), 'urls should be an array');
                        assert_1.default.strictEqual(input.urls.length, 1, 'each tool call should have exactly 1 URL');
                        allUrls.push(input.urls[0]);
                    });
                    // Check that both expected URLs are present across all tool calls
                    assert_1.default.ok(allUrls.includes(expectedTypescriptUrl), `should include the TypeScript URL: ${expectedTypescriptUrl}`);
                    assert_1.default.ok(allUrls.includes(expectedMdnUrl), `should include the MDN URL: ${expectedMdnUrl}`);
                    // Verify no unexpected URLs
                    allUrls.forEach(url => {
                        assert_1.default.ok(expectedUrls.includes(url), `unexpected URL found: ${url}`);
                    });
                }
                // Check query parameter for any tool call that has it
                toolCalls.forEach(toolCall => {
                    const input = toolCall.input;
                    if (input.query) {
                        assert_1.default.ok(input.query.toLowerCase().includes('async') || input.query.toLowerCase().includes('await'), 'query should relate to async/await when specifically requested');
                    }
                });
            }
        }
    }));
    (0, stest_1.stest)('query parameter extraction', (0, toolSimTest_1.generateToolTestRunner)({
        question: 'find specific information about error handling patterns from https://nodejs.org/en/docs/guides/error-handling/',
        scenarioFolderPath: '',
        getState,
        expectedToolCalls: toolNames_1.ToolName.FetchWebPage,
        tools: {
            [toolNames_1.ToolName.FetchWebPage]: true,
            [toolNames_1.ToolName.FindFiles]: true,
            [toolNames_1.ToolName.FindTextInFiles]: true,
            [toolNames_1.ToolName.ReadFile]: true,
            [toolNames_1.ToolName.EditFile]: true,
            [toolNames_1.ToolName.Codebase]: true,
            [toolNames_1.ToolName.ListDirectory]: true,
            [toolNames_1.ToolName.SearchWorkspaceSymbols]: true,
        },
    }, {
        allowParallelToolCalls: false,
        toolCallValidators: {
            [toolNames_1.ToolName.FetchWebPage]: async (toolCalls) => {
                assert_1.default.strictEqual(toolCalls.length, 1, 'should make exactly one fetch webpage tool call');
                const input = toolCalls[0].input;
                // Should have exactly 1 URL
                assert_1.default.ok(Array.isArray(input.urls), 'urls should be an array');
                assert_1.default.strictEqual(input.urls.length, 1, 'should have exactly 1 URL');
                // Should be the exact URL from the question
                const expectedUrl = 'https://nodejs.org/en/docs/guides/error-handling/';
                assert_1.default.strictEqual(input.urls[0], expectedUrl, `should have the exact URL: ${expectedUrl}`);
                // Should extract meaningful query when user asks for specific information
                assert_1.default.ok(input.query !== undefined, 'should include a query when user asks for specific information');
                assert_1.default.ok(typeof input.query === 'string', 'query should be a string');
                assert_1.default.ok(input.query.length > 0, 'query should not be empty');
                // Query should relate to error handling since that's what was requested
                const queryLower = input.query.toLowerCase();
                assert_1.default.ok(queryLower.includes('error') || queryLower.includes('handling') || queryLower.includes('pattern'), 'query should relate to error handling patterns when specifically requested');
            }
        }
    }));
    (0, stest_1.stest)('multiple URLs boundary test with 6 URLs', (0, toolSimTest_1.generateToolTestRunner)({
        question: 'gather information from these documentation sources: https://react.dev/learn/hooks-overview, https://vuejs.org/guide/essentials/reactivity-fundamentals.html, https://angular.io/guide/component-interaction, https://svelte.dev/docs/introduction, https://solid-js.com/guides/getting-started, and https://lit.dev/docs/ about component state management',
        scenarioFolderPath: '',
        getState,
        expectedToolCalls: toolNames_1.ToolName.FetchWebPage,
        tools: {
            [toolNames_1.ToolName.FetchWebPage]: true,
            [toolNames_1.ToolName.FindFiles]: true,
            [toolNames_1.ToolName.FindTextInFiles]: true,
            [toolNames_1.ToolName.ReadFile]: true,
            [toolNames_1.ToolName.EditFile]: true,
            [toolNames_1.ToolName.Codebase]: true,
            [toolNames_1.ToolName.ListDirectory]: true,
            [toolNames_1.ToolName.SearchWorkspaceSymbols]: true,
        },
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.FetchWebPage]: (toolCalls) => {
                const expectedUrls = [
                    'https://react.dev/learn/hooks-overview',
                    'https://vuejs.org/guide/essentials/reactivity-fundamentals.html',
                    'https://angular.io/guide/component-interaction',
                    'https://svelte.dev/docs/introduction',
                    'https://solid-js.com/guides/getting-started',
                    'https://lit.dev/docs/'
                ];
                // Allow anywhere from 1 to 6 tool calls
                assert_1.default.ok(toolCalls.length >= 1 && toolCalls.length <= 6, `should make between 1 and 6 fetch webpage tool calls, but got ${toolCalls.length}`);
                // Collect all URLs from all tool calls
                const allUrls = [];
                let totalUrlCount = 0;
                toolCalls.forEach((toolCall, index) => {
                    const input = toolCall.input;
                    assert_1.default.ok(Array.isArray(input.urls), `tool call ${index + 1}: urls should be an array`);
                    assert_1.default.ok(input.urls.length >= 1, `tool call ${index + 1}: should have at least 1 URL`);
                    totalUrlCount += input.urls.length;
                    allUrls.push(...input.urls);
                });
                // Should have exactly 6 URLs total across all tool calls
                assert_1.default.strictEqual(totalUrlCount, 6, 'should have exactly 6 URLs total across all tool calls');
                assert_1.default.strictEqual(allUrls.length, 6, 'collected URLs array should have exactly 6 URLs');
                // Check that all expected URLs are present
                expectedUrls.forEach(expectedUrl => {
                    assert_1.default.ok(allUrls.includes(expectedUrl), `should include the URL: ${expectedUrl}`);
                });
                // Verify no unexpected URLs
                allUrls.forEach(url => {
                    assert_1.default.ok(expectedUrls.includes(url), `unexpected URL found: ${url}`);
                });
                // Verify no duplicate URLs
                const uniqueUrls = new Set(allUrls);
                assert_1.default.strictEqual(uniqueUrls.size, 6, 'should not have duplicate URLs');
                // Check query parameter for any tool call that has it
                toolCalls.forEach((toolCall, index) => {
                    const input = toolCall.input;
                    assert_1.default.ok(input.query, `tool call ${index + 1}: query should be defined if provided`);
                });
            }
        }
    }));
});
//# sourceMappingURL=fetchWebPageTool.stest.js.map