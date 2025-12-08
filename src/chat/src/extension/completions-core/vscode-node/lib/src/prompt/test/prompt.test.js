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
const assert = __importStar(require("assert"));
const sinon = __importStar(require("sinon"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const ignoreService_1 = require("../../../../../../../platform/ignore/common/ignoreService");
const prompt_1 = require("../../../../prompt/src/prompt");
const similarFiles_1 = require("../../../../prompt/src/snippetInclusion/similarFiles");
const expConfig_1 = require("../../experiments/expConfig");
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const testContentExclusion_1 = require("../../test/testContentExclusion");
const textDocument_1 = require("../../test/textDocument");
const textDocumentManager_1 = require("../../textDocumentManager");
const completionsPromptRenderer_1 = require("../components/completionsPromptRenderer");
const prompt_2 = require("../prompt");
const prompt_3 = require("./prompt");
suite('Prompt unit tests', function () {
    let accessor;
    let sandbox;
    setup(function () {
        sandbox = sinon.createSandbox();
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(ignoreService_1.IIgnoreService, new testContentExclusion_1.MockIgnoreService());
        accessor = serviceCollection.createTestingAccessor();
    });
    teardown(function () {
        sandbox.restore();
    });
    test('defaults to 8K max prompt length', async function () {
        const content = 'function add()\n';
        const sourceDoc = (0, textDocument_1.createTextDocument)('file:///foo.js', 'javascript', 0, content);
        const cursorPosition = {
            line: 0,
            character: 13,
        };
        const rendererStub = sandbox.stub(completionsPromptRenderer_1.CompletionsPromptRenderer.prototype, 'render').throws('unspecified error');
        const prompt = await (0, prompt_3.extractPromptInternal)(accessor, 'COMPLETION_ID', sourceDoc, cursorPosition, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        assert.deepStrictEqual(prompt, prompt_2._promptError);
        assert.ok(rendererStub.calledOnce, 'should call renderer');
        assert.strictEqual(rendererStub.firstCall.args[1].promptTokenLimit, 8192 - prompt_1.DEFAULT_MAX_COMPLETION_LENGTH, 'should default to 8192 max total tokens, 7692 max prompt tokens');
    });
    test('default EXP prompt options are the same as default PromptOptions object', function () {
        const promptOptionsFromExp = (0, prompt_2.getPromptOptions)(accessor, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), '');
        const defaultPromptOptions = {
            maxPromptLength: prompt_1.DEFAULT_MAX_PROMPT_LENGTH,
            numberOfSnippets: prompt_1.DEFAULT_NUM_SNIPPETS,
            similarFilesOptions: similarFiles_1.defaultSimilarFilesOptions,
            suffixMatchThreshold: prompt_1.DEFAULT_SUFFIX_MATCH_THRESHOLD,
            suffixPercent: prompt_1.DEFAULT_PROMPT_ALLOCATION_PERCENT.suffix,
        };
        assert.deepStrictEqual(promptOptionsFromExp, defaultPromptOptions);
    });
    test('default C++ EXP prompt options use tuned values', function () {
        const promptOptionsFromExp = (0, prompt_2.getPromptOptions)(accessor, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(), 'cpp');
        assert.deepStrictEqual(promptOptionsFromExp.similarFilesOptions, {
            snippetLength: 60,
            threshold: 0.0,
            maxTopSnippets: 16,
            maxCharPerFile: 100000,
            maxNumberOfFiles: 200,
            maxSnippetsPerFile: 4,
            useSubsetMatching: false,
        });
        assert.deepStrictEqual(promptOptionsFromExp.numberOfSnippets, 16);
    });
    test('default Java EXP prompt options are correct', function () {
        const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        const expVars = telemetryWithExp.filtersAndExp.exp.variables;
        Object.assign(expVars, {
            [expConfig_1.ExpTreatmentVariables.UseSubsetMatching]: true,
        });
        const promptOptionsFromExp = (0, prompt_2.getPromptOptions)(accessor, telemetryWithExp, 'java');
        assert.deepStrictEqual(promptOptionsFromExp.similarFilesOptions, {
            snippetLength: 60,
            threshold: 0.0,
            maxTopSnippets: 4,
            maxCharPerFile: 10000,
            maxNumberOfFiles: 20,
            maxSnippetsPerFile: 1,
            useSubsetMatching: true,
        });
        assert.deepStrictEqual(promptOptionsFromExp.numberOfSnippets, 4);
    });
    test('should return without a prompt if the file blocked by repository control', async function () {
        accessor.get(ignoreService_1.IIgnoreService).setAlwaysIgnore();
        const content = 'function add()\n';
        const sourceDoc = (0, textDocument_1.createTextDocument)('file:///foo.js', 'javascript', 0, content);
        const cursorPosition = {
            line: 0,
            character: 13,
        };
        const response = await (0, prompt_3.extractPromptInternal)(accessor, 'COMPLETION_ID', sourceDoc, cursorPosition, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
        assert.ok(response);
        assert.strictEqual(response, prompt_2._copilotContentExclusion);
    });
    test('prompt for ipython notebooks, using only the current cell language as shebang', async function () {
        await assertPromptForCell(accessor, cells[4], (0, ts_dedent_1.default)(`import math

def add(a, b):
    return a + b

def product(c, d):`), ['#!/usr/bin/env python3']);
    });
    test('prompt for ipython notebooks, using only the current cell language for known language', async function () {
        await assertPromptForCell(accessor, cells[5], (0, ts_dedent_1.default)(`def product(c, d):`), ['Language: julia']);
    });
    test('prompt for ipython notebooks, using only the current cell language for unknown language', async function () {
        await assertPromptForCell(accessor, cells[6], (0, ts_dedent_1.default)(`foo bar baz`), ['Language: unknown-great-language']);
    });
    test('exception telemetry', async function () {
        this.skip();
        /* todo@dbaeumer need to understand how we handle exception in chat
        class TestExceptionTextDocumentManager extends TestTextDocumentManager {
            override textDocuments() {
                return Promise.reject(new Error('test error'));
            }
        }
        const tdm = accessor.get(IInstantiationService).createInstance(TestExceptionTextDocumentManager);
        tdm.setTextDocument('file:///a/1.py', 'python', 'import torch');
        ctx.forceSet(TextDocumentManager, tdm);
        NeighborSource.reset();

        const { reporter, enhancedReporter } = await withInMemoryTelemetry(ctx, async ctx => {
            const document = createTextDocument('file:///a/2.py', 'python', 0, 'import torch');
            await extractPromptInternal(
                ctx,
                'COMPLETION_ID',
                document,
                { line: 0, character: 0 },
                TelemetryWithExp.createEmptyConfigForTesting()
            );
        });

        assert.ok(reporter.hasException);
        assert.deepStrictEqual(
            reporter.firstException?.properties?.origin,
            'PromptComponents.CompletionsPromptFactory'
        );
        assert.strictEqual(reporter.exceptions.length, 1);

        assert.ok(enhancedReporter.hasException);
        assert.deepStrictEqual(
            enhancedReporter.firstException?.properties?.origin,
            'PromptComponents.CompletionsPromptFactory'
        );
        assert.strictEqual(enhancedReporter.exceptions.length, 1);
        */
    });
});
async function assertPromptForCell(accessor, sourceCell, expectedPrefix, expectedContext) {
    const notebook = new textDocument_1.InMemoryNotebookDocument(cells);
    const sourceDoc = sourceCell.document;
    accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService).setNotebookDocument(sourceDoc, notebook);
    const cursorPosition = {
        line: 0,
        character: sourceDoc.getText().length,
    };
    const response = await (0, prompt_3.extractPromptInternal)(accessor, 'COMPLETION_ID', sourceDoc, cursorPosition, telemetry_1.TelemetryWithExp.createEmptyConfigForTesting());
    assert.ok(response);
    assert.strictEqual(response.type, 'prompt');
    assert.strictEqual(response.prompt.prefix, expectedPrefix);
    if (expectedContext !== undefined) {
        assert.deepEqual(response.prompt.context, expectedContext);
    }
}
const cells = [
    {
        index: 1,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#1', 'python', 1, 'import math'),
        metadata: {},
        kind: 2,
    },
    {
        index: 2,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#2', 'markdown', 1, 'This is an addition function\nIt is used to add two numbers'),
        metadata: {},
        kind: 1,
    },
    {
        index: 3,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#3', 'python', 2, 'def add(a, b):\n    return a + b'),
        metadata: {},
        kind: 2,
    },
    {
        index: 4,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#4', 'markdown', 2, 'This is a product function\nYou guessed it: it multiplies two numbers'),
        metadata: {},
        kind: 2,
    },
    {
        index: 5,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#5', 'python', 3, 'def product(c, d):'),
        metadata: {},
        kind: 2,
    },
    {
        index: 6,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#6', 'julia', 3, 'def product(c, d):'),
        metadata: {},
        kind: 2,
    },
    {
        index: 7,
        document: (0, textDocument_1.createTextDocument)('file:///test/a.ipynb#7', 'unknown-great-language', 3, 'foo bar baz'),
        metadata: {},
        kind: 2,
    },
];
//# sourceMappingURL=prompt.test.js.map