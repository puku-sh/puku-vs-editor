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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("../../../../../prompt/jsx-runtime//jsx-runtime");
const codeSnippets_1 = require("../codeSnippets");
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const testHelpers_1 = require("../../../../../prompt/src/test/components/testHelpers");
const telemetry_1 = require("../../../telemetry");
const context_1 = require("../../../test/context");
const snapshot_1 = require("../../../test/snapshot");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
suite('Code Snippets Component', function () {
    let accessor;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    });
    test('Renders nothing if there are no code snippets', async function () {
        try {
            const snapshot = await renderCodeSnippets(accessor);
            (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets');
        }
        catch (e) {
            assert.ok(e.message.startsWith('No children found at path segment '));
        }
    });
    test('Renders nothing if the code snippets array is empty', async function () {
        try {
            const snapshot = await renderCodeSnippets(accessor, []);
            (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets');
        }
        catch (e) {
            assert.ok(e.message.startsWith('No children found at path segment '));
        }
    });
    test('Renders a single code snippet', async function () {
        const codeSnippets = [
            {
                uri: 'file:///path/something.ts',
                value: (0, ts_dedent_1.default) `
					function foo() {
						return 1;
					}
				`,
                id: '1',
                type: 'CodeSnippet',
            },
        ];
        const snapshot = await renderCodeSnippets(accessor, codeSnippets);
        const chunks = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[*]');
        assert.deepStrictEqual(chunks.length, 1);
        const chunk = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[0].Chunk[*]');
        assert.deepStrictEqual(chunk.length, 2);
        assert.deepStrictEqual(chunk[1].props?.key, '1');
        assert.deepStrictEqual(chunk[1].props?.source, codeSnippets[0]);
        // Assert content
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[0].Chunk[0].Text'), 'Compare this snippet from something.ts:');
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[0].Chunk["1"].Text'), 'function foo() {\n\treturn 1;\n}');
    });
    test('Renders snippet from subfolder', async function () {
        const codeSnippets = [
            {
                uri: 'file:///c%3A/root/same.ts',
                value: (0, ts_dedent_1.default) `
					function bar() {
						return 1;
					}
				`,
                id: '1',
                type: 'CodeSnippet',
            },
            {
                uri: 'file:///c%3A/root/subfolder/something.ts',
                value: (0, ts_dedent_1.default) `
					function foo() {
						return 1;
					}
				`,
                id: '2',
                type: 'CodeSnippet',
            },
        ];
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: 'file:///c:/root' }]);
        const snapshot = await renderCodeSnippets(accessor, codeSnippets);
        const chunks = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[*]');
        assert.deepStrictEqual(chunks.length, 2);
        const firstChunk = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[0].Chunk[*]');
        assert.deepStrictEqual(firstChunk.length, 2);
        assert.deepStrictEqual(firstChunk[0].children?.[0].value, 'Compare this snippet from subfolder/something.ts:');
        assert.deepStrictEqual(firstChunk[1].props?.key, '2');
        assert.deepStrictEqual(firstChunk[1].props?.source, codeSnippets[1]);
        const secondChunk = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[1].Chunk[*]');
        assert.deepStrictEqual(secondChunk.length, 2);
        assert.deepStrictEqual(secondChunk[0].children?.[0].value, 'Compare this snippet from same.ts:');
        assert.deepStrictEqual(secondChunk[1].props?.key, '1');
        assert.deepStrictEqual(secondChunk[1].props?.source, codeSnippets[0]);
    });
    test('Renders multiple code snippets', async function () {
        const codeSnippets = [
            {
                uri: 'file:///something.ts',
                value: (0, ts_dedent_1.default) `
					function foo() {
						return 1;
					}
				`,
                id: '1',
                type: 'CodeSnippet',
            },
            {
                uri: 'file:///somethingElse.ts',
                value: (0, ts_dedent_1.default) `
					function bar() {
						return 'two';
					}
				`,
                id: '2',
                type: 'CodeSnippet',
            },
        ];
        const snapshot = await renderCodeSnippets(accessor, codeSnippets);
        const snippets = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[*]');
        assert.deepStrictEqual(snippets.length, 2);
        const firstChunk = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[0].Chunk[*]');
        assert.deepStrictEqual(firstChunk[0].children?.[0].value, 'Compare this snippet from somethingElse.ts:');
        assert.deepStrictEqual(firstChunk[1].props?.key, '2');
        assert.deepStrictEqual(firstChunk[1].props?.source, codeSnippets[1]);
        const secondChunk = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[1].Chunk[*]');
        assert.deepStrictEqual(secondChunk[0].children?.[0].value, 'Compare this snippet from something.ts:');
        assert.deepStrictEqual(secondChunk[1].props?.key, '1');
        assert.deepStrictEqual(secondChunk[1].props?.source, codeSnippets[0]);
    });
    test('Merges together snippets with the same URI', async function () {
        const codeSnippets = [
            {
                uri: 'file:///something.ts',
                value: (0, ts_dedent_1.default) `
					function foo() {
						return 1;
					}
				`,
                id: '1',
                type: 'CodeSnippet',
            },
            {
                uri: 'file:///something.ts',
                value: (0, ts_dedent_1.default) `
					function bar() {
						return 'two';
					}
				`,
                id: '2',
                type: 'CodeSnippet',
            },
        ];
        const snapshot = await renderCodeSnippets(accessor, codeSnippets);
        const result = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[*]');
        assert.deepStrictEqual(result.length, 1);
        const chunk = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[0].Chunk[*]');
        assert.deepStrictEqual(chunk.length, 4);
        assert.deepStrictEqual(chunk[0].children?.[0].value, 'Compare these snippets from something.ts:');
        assert.deepStrictEqual(chunk[1].props?.key, '1');
        assert.deepStrictEqual(chunk[1].props?.source, codeSnippets[0]);
        assert.deepStrictEqual(chunk[2].children?.[0].value, '---');
        assert.deepStrictEqual(chunk[3].props?.key, '2');
        assert.deepStrictEqual(chunk[3].props?.source, codeSnippets[1]);
    });
    test('Sorts snippets by ascending score of importance', async function () {
        const codeSnippets = [
            {
                uri: 'file:///something.ts',
                value: (0, ts_dedent_1.default) `
					function foo() {
						return 1;
					}
				`,
                importance: 10,
                id: '1',
                type: 'CodeSnippet',
            },
            {
                uri: 'file:///something.ts',
                value: (0, ts_dedent_1.default) `
					function bar() {
						return 'two';
					}
				`,
                importance: 5,
                id: '2',
                type: 'CodeSnippet',
            },
            {
                uri: 'file:///somethingElse.ts',
                value: (0, ts_dedent_1.default) `
					function baz() {
						return 'three';
					}
				`,
                importance: 7,
                id: '3',
                type: 'CodeSnippet',
            },
        ];
        const snapshot = await renderCodeSnippets(accessor, codeSnippets);
        const result = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CodeSnippets[*]');
        assert.deepStrictEqual(result.length, 2);
        assert.deepStrictEqual((0, testHelpers_1.extractNodesWitPath)(snapshot.snapshot), [
            '$[0].CodeSnippets',
            '$[0].CodeSnippets[0].Chunk',
            '$[0].CodeSnippets[0].Chunk[0].Text',
            '$[0].CodeSnippets[0].Chunk[0].Text[0]',
            '$[0].CodeSnippets[0].Chunk["3"].Text',
            '$[0].CodeSnippets[0].Chunk["3"].Text[0]',
            '$[0].CodeSnippets[1].Chunk',
            '$[0].CodeSnippets[1].Chunk[0].Text',
            '$[0].CodeSnippets[1].Chunk[0].Text[0]',
            '$[0].CodeSnippets[1].Chunk["1"].Text',
            '$[0].CodeSnippets[1].Chunk["1"].Text[0]',
            '$[0].CodeSnippets[1].Chunk[2].Text',
            '$[0].CodeSnippets[1].Chunk[2].Text[0]',
            '$[0].CodeSnippets[1].Chunk["2"].Text',
            '$[0].CodeSnippets[1].Chunk["2"].Text[0]',
        ]);
    });
});
async function renderCodeSnippets(accessor, codeSnippets) {
    const document = (0, textDocument_1.createTextDocument)('file:///path/foo.ts', 'typescript', 0, (0, ts_dedent_1.default) `
		const a = 1;
		function f|
		const b = 2;
	`);
    const position = document.positionAt(document.getText().indexOf('|'));
    const tdms = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
    const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(codeSnippets_1.CodeSnippets, { tdms: tdms }));
    const pipe = virtualPrompt.createPipe();
    const completionRequestData = {
        document,
        position,
        telemetryData: telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(),
        cancellationToken: new vscode_languageserver_protocol_1.CancellationTokenSource().token,
        maxPromptTokens: 1000,
        data: undefined,
        codeSnippets,
    };
    await pipe.pump(completionRequestData);
    return virtualPrompt.snapshot();
}
//# sourceMappingURL=codeSnippets.test.js.map