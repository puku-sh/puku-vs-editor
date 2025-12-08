"use strict";
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
const jsx_runtime_1 = require("../../../../../prompt/jsx-runtime//jsx-runtime");
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/** @jsxRuntime automatic */
/** @jsxImportSource ../../../../../prompt/jsx-runtime/ */
const assert = __importStar(require("assert"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const components_1 = require("../../../../../prompt/src/components/components");
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const tokenization_1 = require("../../../../../prompt/src/tokenization");
const completionsContext_1 = require("../../../prompt/components/completionsContext");
const currentFile_1 = require("../../../prompt/components/currentFile");
const splitContextPromptRenderer_1 = require("../../../prompt/components/splitContextPromptRenderer");
const completionsPrompt_1 = require("../../../test/completionsPrompt");
const context_1 = require("../../../test/context");
const textDocument_1 = require("../../../test/textDocument");
const MyNestedComponent = () => {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.5, children: "This goes first" }), (0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.6, children: "This goes last" })] }));
};
const AnotherComponent = (props) => {
    return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is a number ", props.number ?? 0] });
};
const renderingOptions = {
    promptTokenLimit: 70,
    suffixPercent: 20,
    delimiter: '\n',
    tokenizer: tokenization_1.TokenizerName.o200k,
    languageId: 'typescript',
};
const fullExpectedPrefixWithoutContext = 'const a = 1;\nfunction f';
const fullExpectedContext = [
    'This is a number 1\nThis goes first\nThis goes last\nThis is a number 2\nRaw text\nAnother raw text',
];
const fullExpectedSuffix = 'const b = 2;\nconst c = 3;';
for (const lineEnding of ['\n', '\r\n']) {
    const fileUri = 'file:///path/basename.ts';
    const source = `const a = 1;${lineEnding}function f|${lineEnding}const b = 2;${lineEnding}const c = 3;`;
    const textDocument = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, source);
    const position = textDocument.positionAt(textDocument.getText().indexOf('|'));
    suite(`Split context prompt renderer (line ending: ${JSON.stringify(lineEnding)})`, function () {
        let accessor;
        let renderer;
        let snapshot;
        setup(async function () {
            accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
            renderer = new splitContextPromptRenderer_1.SplitContextPromptRenderer();
            const vPrompt = new virtualPrompt_1.VirtualPrompt(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(AnotherComponent, { number: 1 }), (0, jsx_runtime_1.jsx)(MyNestedComponent, {}), (0, jsx_runtime_1.jsx)(AnotherComponent, { number: 2 }), (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Raw text" }) }), (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Another raw text" }) })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] })));
            const pipe = vPrompt.createPipe();
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocument, position));
            ({ snapshot } = vPrompt.snapshot());
        });
        test('renders prefix, context and suffix based on completions doc position', function () {
            const prompt = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(prompt.status, 'ok');
            assert.deepStrictEqual(prompt.prefix, fullExpectedPrefixWithoutContext);
            assert.deepStrictEqual(prompt.prefixTokens, 37);
            assert.deepStrictEqual(prompt.suffix, fullExpectedSuffix);
            assert.deepStrictEqual(prompt.suffixTokens, 12);
            assert.deepStrictEqual(prompt.context, fullExpectedContext);
        });
        test('single context without comments', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is context" }) }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            assert.deepStrictEqual(rendered.context, ['This is context']);
            assert.deepStrictEqual(rendered.prefix, '');
        });
        test('multiple context without comments', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is more context" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            assert.deepStrictEqual(rendered.context, ['This is context\nThis is more context']);
            assert.deepStrictEqual(rendered.prefix, '');
        });
        test('multiple context blocks without comments', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is more context" })] }), (0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is other context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is extra context" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            assert.deepStrictEqual(rendered.context, [
                'This is context\nThis is more context',
                'This is other context\nThis is extra context',
            ]);
            assert.deepStrictEqual(rendered.prefix, '');
        });
        test('multiple types of context blocks without comments', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is more context" })] }), (0, jsx_runtime_1.jsxs)(completionsContext_1.AdditionalCompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is other context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is extra context" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            assert.deepStrictEqual(rendered.context, [
                'This is context\nThis is more context',
                'This is other context\nThis is extra context',
            ]);
            assert.deepStrictEqual(rendered.prefix, '');
        });
        test('multiple types of context blocks that are not adjacent', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is more context" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}), (0, jsx_runtime_1.jsxs)(completionsContext_1.AdditionalCompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is other context" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is extra context" })] })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            assert.deepStrictEqual(rendered.context, [
                'This is context\nThis is more context',
                'This is other context\nThis is extra context',
            ]);
            assert.deepStrictEqual(rendered.prefix, '');
        });
        test('uses configured tokenizer', function () {
            const prompt = renderer.render(snapshot, {
                ...renderingOptions,
                tokenizer: tokenization_1.TokenizerName.cl100k,
            });
            assert.deepStrictEqual(prompt.status, 'ok');
            assert.deepStrictEqual(prompt.prefixTokens, 37);
            assert.deepStrictEqual(prompt.suffixTokens, 12);
        });
        test('computes metadata with stable updateDataTimeMs tolerance', function () {
            const prompt1 = renderer.render(snapshot, renderingOptions);
            const prompt2 = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(prompt1.status, 'ok');
            assert.deepStrictEqual(prompt2.status, 'ok');
            const metadata1 = prompt1.metadata;
            const metadata2 = prompt2.metadata;
            assert.deepStrictEqual(metadata1.renderId, 0);
            assert.deepStrictEqual(metadata2.renderId, 1);
            assert.ok(metadata1.renderTimeMs > 0);
            assert.ok(metadata1.elisionTimeMs > 0);
            const expectedComponents = [
                {
                    componentPath: '$.f[1].CurrentFile',
                },
                {
                    componentPath: '$.f[0].CompletionsContext[0].AnotherComponent[0].Text[0]',
                    expectedTokens: 7,
                    actualTokens: 7,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[1].MyNestedComponent[0].f[0].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[1].MyNestedComponent[0].f[1].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[2].AnotherComponent[0].Text[0]',
                    expectedTokens: 7,
                    actualTokens: 7,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[3].f[0].Text[0]',
                    expectedTokens: 3,
                    actualTokens: 3,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[4].f[0].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[1].CurrentFile[0].f[0].BeforeCursor[0].Text[0]',
                    expectedTokens: 8,
                    actualTokens: 8,
                },
                {
                    componentPath: '$.f[1].CurrentFile[0].f[1].AfterCursor[0].Text[0]',
                    expectedTokens: 12,
                    actualTokens: 12,
                },
            ];
            expectedComponents.forEach(expected => {
                const actual = metadata1.componentStatistics.find(s => s.componentPath === expected.componentPath);
                assert.ok(actual, `Component ${expected.componentPath} not found`);
                assert.strictEqual(actual.expectedTokens, expected.expectedTokens);
                assert.strictEqual(actual.actualTokens, expected.actualTokens);
                // Instead of a fixed number, just ensure updateDataTimeMs is a non-negative number.
                if (actual.updateDataTimeMs) {
                    assert.ok(typeof actual.updateDataTimeMs === 'number' && actual.updateDataTimeMs >= 0, `Expected updateDataTimeMs for ${expected.componentPath} to be a non-negative number`);
                }
            });
        });
        test('computes usage statistics ignoring updateDataTimeMs field', function () {
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            const metadata = rendered.metadata;
            // Make updateDataTimeMs a constant value to ensure it doesn't affect the test.
            const actualStatsFiltered = metadata.componentStatistics.map(stats => {
                if (stats.updateDataTimeMs) {
                    stats.updateDataTimeMs = 42;
                }
                return stats;
            });
            const expectedStatsFiltered = [
                {
                    componentPath: '$.f[1].CurrentFile',
                    updateDataTimeMs: 42,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[0].AnotherComponent[0].Text[0]',
                    expectedTokens: 7,
                    actualTokens: 7,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[1].MyNestedComponent[0].f[0].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[1].MyNestedComponent[0].f[1].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[2].AnotherComponent[0].Text[0]',
                    expectedTokens: 7,
                    actualTokens: 7,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[3].f[0].Text[0]',
                    expectedTokens: 3,
                    actualTokens: 3,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[4].f[0].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[1].CurrentFile[0].f[0].BeforeCursor[0].Text[0]',
                    expectedTokens: 8,
                    actualTokens: 8,
                },
                {
                    componentPath: '$.f[1].CurrentFile[0].f[1].AfterCursor[0].Text[0]',
                    expectedTokens: 12,
                    actualTokens: 12,
                },
            ];
            assert.deepStrictEqual(actualStatsFiltered, expectedStatsFiltered);
        });
        test('propagates source via statistics', function () {
            const trait = {
                name: 'trait',
                value: 'value',
                id: 'traitid',
                type: 'Trait',
            };
            const codeSnippet = {
                uri: 'file://foo.ts',
                value: 'value',
                id: 'traitid',
                type: 'CodeSnippet',
            };
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { source: trait, children: "This is a trait" }), (0, jsx_runtime_1.jsx)(components_1.Chunk, { source: codeSnippet, children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is a code snippet" }) })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.ok(renderedPrompt.metadata.componentStatistics.find(s => s.source === trait));
            assert.ok(renderedPrompt.metadata.componentStatistics.find(s => s.source === codeSnippet));
        });
        test('elides prefix', function () {
            const prompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 5,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(prompt.status, 'ok');
            assert.deepStrictEqual(prompt.prefix, 'function f');
            assert.deepStrictEqual(prompt.suffix, '');
        });
        test('elides context', function () {
            const prompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 30,
                suffixPercent: 0,
            }, undefined);
            assert.deepStrictEqual(prompt.status, 'ok');
            assert.deepStrictEqual(prompt.prefix, fullExpectedPrefixWithoutContext);
            assert.deepStrictEqual(prompt.context, [
                'This is a number 1\nThis is a number 2\nRaw text\nAnother raw text',
            ]);
            assert.deepStrictEqual(prompt.suffix, '');
        });
        test('elides suffix (from the end!)', function () {
            const prompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 30,
                suffixPercent: 10,
            });
            assert.deepStrictEqual(prompt.status, 'ok');
            assert.deepStrictEqual(prompt.suffix, 'const b =');
        });
        test('elides context and suffix partially', function () {
            // Use tighter token limits to force partial elision on both sides.
            const prompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 20,
                suffixPercent: 10,
            });
            // We don't have the exact expected strings, but we verify that both context and suffix
            // have been elided compared to the full expectations.
            assert.strictEqual(prompt.status, 'ok');
            // The elided prefix should be shorter than the full expected one.
            assert.ok(prompt.context[0].length < fullExpectedContext[0].length, 'Expected context to be elided');
            // The elided suffix should also be shorter than the full expected suffix, if any elision took place.
            if (fullExpectedSuffix.length > 0) {
                assert.ok(prompt.suffix.length < fullExpectedSuffix.length, 'Expected suffix to be elided');
            }
        });
        test('generates prompt metadata', function () {
            const rendered = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(rendered.status, 'ok');
            const metadata = rendered.metadata;
            assert.ok(metadata.renderId === 0);
            assert.ok(metadata.elisionTimeMs > 0);
            assert.ok(metadata.renderTimeMs > 0);
            assert.ok(metadata.updateDataTimeMs > 0);
            assert.deepStrictEqual(metadata.tokenizer, tokenization_1.TokenizerName.o200k);
        });
        test('computes usage statistics after elision', function () {
            const rendered = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 40,
                suffixPercent: 10,
            });
            assert.deepStrictEqual(rendered.status, 'ok');
            const metadata = rendered.metadata;
            const actualStatsFiltered = metadata.componentStatistics.map(stats => {
                if (stats.updateDataTimeMs) {
                    stats.updateDataTimeMs = 42;
                }
                return stats;
            });
            assert.deepStrictEqual(metadata.componentStatistics.reduce((acc, stats) => acc + (stats.actualTokens ?? 0), 0), 33);
            assert.deepStrictEqual(actualStatsFiltered, [
                {
                    componentPath: '$.f[1].CurrentFile',
                    updateDataTimeMs: 42,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[0].AnotherComponent[0].Text[0]',
                    expectedTokens: 7,
                    actualTokens: 7,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[1].MyNestedComponent[0].f[0].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 0,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[1].MyNestedComponent[0].f[1].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 0,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[2].AnotherComponent[0].Text[0]',
                    expectedTokens: 7,
                    actualTokens: 7,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[3].f[0].Text[0]',
                    expectedTokens: 3,
                    actualTokens: 3,
                },
                {
                    componentPath: '$.f[0].CompletionsContext[4].f[0].Text[0]',
                    expectedTokens: 4,
                    actualTokens: 4,
                },
                {
                    componentPath: '$.f[1].CurrentFile[0].f[0].BeforeCursor[0].Text[0]',
                    expectedTokens: 8,
                    actualTokens: 8,
                },
                {
                    componentPath: '$.f[1].CurrentFile[0].f[1].AfterCursor[0].Text[0]',
                    expectedTokens: 12,
                    actualTokens: 4,
                },
            ]);
        });
        function createStringWithNLines(n, baseText) {
            let result = '';
            for (let i = 1; i <= n; i++) {
                result += `${baseText}${i}\n`;
            }
            return result;
        }
        test('uses cached suffix if similar enough', async function () {
            const firstSuffix = createStringWithNLines(15, 'a') + createStringWithNLines(10, 'b');
            const secondSuffix = createStringWithNLines(15, 'a') + createStringWithNLines(10, 'c');
            const renderOptionsWithSuffix = {
                ...renderingOptions,
                promptTokenLimit: 205,
                suffixPercent: 50,
            };
            const textDocumentWithFirstSuffix = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, 'function f|\n' + firstSuffix);
            const position = textDocumentWithFirstSuffix.positionAt(textDocumentWithFirstSuffix.getText().indexOf('|'));
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocumentWithFirstSuffix, position));
            // Snapshot caches the suffix
            virtualPrompt.snapshot();
            // The position is the same, since the start of the document doesn't change
            const textDocumentWithSecondSuffix = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 1, 'function f|\n' + secondSuffix);
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocumentWithSecondSuffix, position));
            const { snapshot: snapshotWithDefaultThreshold } = virtualPrompt.snapshot();
            // the first suffix is used, since they are similar enough
            const renderedWithDefaultThreshold = renderer.render(snapshotWithDefaultThreshold, renderOptionsWithSuffix);
            assert.deepStrictEqual(renderedWithDefaultThreshold.status, 'ok');
            assert.deepStrictEqual(renderedWithDefaultThreshold.suffix, firstSuffix);
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocumentWithSecondSuffix, position, undefined, undefined, undefined, 3));
            const { snapshot: snapshotWithLowerThreshold } = virtualPrompt.snapshot();
            // The second suffix is used, since the matching threshold is lower
            const renderedWithLowerThreshold = renderer.render(snapshotWithLowerThreshold, renderOptionsWithSuffix);
            assert.deepStrictEqual(renderedWithLowerThreshold.status, 'ok');
            assert.deepStrictEqual(renderedWithLowerThreshold.suffix, secondSuffix);
        });
        test('does not use cached suffix if not similar enough', async function () {
            const firstSuffix = createStringWithNLines(15, 'a') + createStringWithNLines(10, 'b');
            const secondSuffix = createStringWithNLines(3, 'a') + createStringWithNLines(22, 'c');
            const renderOptionsWithSuffix = {
                ...renderingOptions,
                promptTokenLimit: 205,
                suffixPercent: 50,
            };
            const textDocumentWithFirstSuffix = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, 'function f|\n' + firstSuffix);
            const position = textDocumentWithFirstSuffix.positionAt(textDocumentWithFirstSuffix.getText().indexOf('|'));
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocumentWithFirstSuffix, position));
            // Snapshot caches the suffix
            virtualPrompt.snapshot();
            // The position is the same, since the start of the document doesn't change
            const textDocumentWithSecondSuffix = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 1, 'function f|\n' + secondSuffix);
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocumentWithSecondSuffix, position));
            const { snapshot } = virtualPrompt.snapshot();
            // the second suffix is used, since they are not similar enough
            const rendered = renderer.render(snapshot, renderOptionsWithSuffix);
            assert.deepStrictEqual(rendered.status, 'ok');
            assert.deepStrictEqual(rendered.suffix, secondSuffix);
        });
        test('suffix can be empty', async function () {
            const textDocumentWithoutSuffix = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, 'function f|');
            const position = textDocumentWithoutSuffix.positionAt(textDocumentWithoutSuffix.getText().indexOf('|'));
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocumentWithoutSuffix, position));
            const { snapshot } = virtualPrompt.snapshot();
            const promptWithoutSuffix = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(promptWithoutSuffix.status, 'ok');
            assert.deepStrictEqual(promptWithoutSuffix.suffix, '');
            assert.deepStrictEqual(promptWithoutSuffix.prefix, 'function f');
        });
        test('prefix can be empty', async function () {
            const emptyTextDocument = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, '|\nconst b = 2;');
            const position = emptyTextDocument.positionAt(emptyTextDocument.getText().indexOf('|'));
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, emptyTextDocument, position));
            const { snapshot } = virtualPrompt.snapshot();
            const emptyPrompt = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(emptyPrompt.status, 'ok');
            assert.deepStrictEqual(emptyPrompt.prefix, '');
            assert.deepStrictEqual(emptyPrompt.suffix, 'const b = 2;');
        });
        test('prefix and suffix can be empty', async function () {
            const emptyTextDocument = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, '');
            const position = emptyTextDocument.positionAt(0);
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, emptyTextDocument, position));
            const { snapshot } = virtualPrompt.snapshot();
            const emptyPrompt = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(emptyPrompt.status, 'ok');
            assert.deepStrictEqual(emptyPrompt.prefix, '');
            assert.deepStrictEqual(emptyPrompt.suffix, '');
        });
        test('cancels rendering when token has been cancelled', function () {
            const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
            cts.cancel();
            const prompt = renderer.render(snapshot, renderingOptions, cts.token);
            assert.deepStrictEqual(prompt.status, 'cancelled');
        });
        test('throws error when tree does not contain completions document component', function () {
            const promptCompletionsDocument = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Whatever" }) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(promptCompletionsDocument);
            const { snapshot } = virtualPrompt.snapshot();
            const prompt = renderer.render(snapshot, renderingOptions);
            assert.strictEqual(prompt.status, 'error');
            assert.strictEqual(prompt.error.message, `Node of type ${currentFile_1.BeforeCursor.name} not found`);
        });
        test('renders empty prefix and suffix if no data is sent', function () {
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const emptyPrompt = renderer.render(snapshot, renderingOptions);
            assert.deepStrictEqual(emptyPrompt.status, 'ok');
            assert.deepStrictEqual(emptyPrompt.prefix, '');
            assert.deepStrictEqual(emptyPrompt.suffix, '');
        });
        test('does not re-render if no data matching the expected structure is sent', async function () {
            const textDocument = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, "import * from './foo.ts'\n|\nfunction f");
            const position = textDocument.positionAt(textDocument.getText().indexOf('|'));
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            // First render
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocument, position));
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, renderingOptions);
            // Second render
            const { snapshot: snapshotTwo } = virtualPrompt.snapshot();
            const renderedPromptTwo = renderer.render(snapshotTwo, renderingOptions);
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPromptTwo.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.prefix, "import * from './foo.ts'\n");
            assert.deepStrictEqual(renderedPrompt.prefix, renderedPromptTwo.prefix);
            assert.deepStrictEqual(renderedPrompt.suffix, 'function f');
            assert.deepStrictEqual(renderedPrompt.suffix, renderedPromptTwo.suffix);
            assert.deepStrictEqual(renderedPrompt.prefixTokens, renderedPromptTwo.prefixTokens);
            assert.deepStrictEqual(renderedPrompt.suffixTokens, renderedPromptTwo.suffixTokens);
        });
        test('re-renders if new data matching the expected structure is sent', async function () {
            const textDocument = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 0, "import * from './foo.ts'\n|\nfunction f");
            const position = textDocument.positionAt(textDocument.getText().indexOf('|'));
            const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}) }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const pipe = virtualPrompt.createPipe();
            // First render
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocument, position));
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, renderingOptions);
            // Second render
            const updatedTextDocument = (0, textDocument_1.createTextDocument)(fileUri, 'typescript', 1, // Notice version change
            "import * from './bar.ts'\n|\nfunction g");
            const updatedPosition = updatedTextDocument.positionAt(updatedTextDocument.getText().indexOf('|'));
            await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, updatedTextDocument, updatedPosition));
            const { snapshot: snapshotTwo } = virtualPrompt.snapshot();
            const renderedPromptTwo = renderer.render(snapshotTwo, renderingOptions);
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPromptTwo.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.prefix, "import * from './foo.ts'\n");
            assert.deepStrictEqual(renderedPromptTwo.prefix, "import * from './bar.ts'\n");
            assert.deepStrictEqual(renderedPrompt.suffix, 'function f');
            assert.deepStrictEqual(renderedPromptTwo.suffix, 'function g');
        });
        test('Elides Chunk completely', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.5, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Outside Text" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, { weight: 0.9 })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 10,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.context, ['Outside Text']);
            assert.deepStrictEqual(renderedPrompt.suffix, '');
        });
        test('Elides Chunk completely while respecting lower weights', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.5, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 2" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, { weight: 0.9 })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 16,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.context, ['Outside Text 1\nOutside Text 2']);
            assert.deepStrictEqual(renderedPrompt.suffix, '');
        });
        test('Elides Chunk completely in case of exceeding the limit even with higher weight', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.5, children: "Outside Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.7, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.8, children: "Outside Text 2" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, { weight: 0.9 })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 14,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.context, ['Outside Text 1\nOutside Text 2']);
            assert.deepStrictEqual(renderedPrompt.suffix, '');
        });
        test('Prefers higher weighted Chunk over lower weighted separate components', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.8, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 2" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, { weight: 0.9 })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 14,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.context, ['Chunk Text 1\nChunk Text 2']);
            assert.deepStrictEqual(renderedPrompt.suffix, '');
        });
        test('If a nested chunk is elided first, the outer chunks is kept', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.5, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.5, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Nested Chunk Text 1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Nested Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 2" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, { weight: 0.9 })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 30,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.context, [
                'Outside Text 1\nChunk Text 1\nChunk Text 2\nOutside Text 2',
            ]);
            assert.deepStrictEqual(renderedPrompt.suffix, '');
        });
        test('If the outer chunk is elided first, the inner chunk is also elided', function () {
            const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(completionsContext_1.CompletionsContext, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { weight: 0.5, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.5, children: "Chunk Text 1" }), (0, jsx_runtime_1.jsxs)(components_1.Chunk, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Nested Chunk Text 1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Nested Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Chunk Text 2" })] }), (0, jsx_runtime_1.jsx)(components_1.Text, { weight: 0.7, children: "Outside Text 2" })] }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, { weight: 0.9 })] }));
            const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
            const { snapshot } = virtualPrompt.snapshot();
            const renderedPrompt = renderer.render(snapshot, {
                ...renderingOptions,
                promptTokenLimit: 30,
                suffixPercent: 0,
            });
            assert.deepStrictEqual(renderedPrompt.status, 'ok');
            assert.deepStrictEqual(renderedPrompt.context, ['Outside Text 1\nOutside Text 2']);
            assert.deepStrictEqual(renderedPrompt.suffix, '');
        });
    });
}
//# sourceMappingURL=splitContextPromptRenderer.test.js.map