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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/** @jsxRuntime automatic */
/** @jsxImportSource ../../../../../prompt/jsx-runtime/ */
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const instantiation_1 = require("../../../../../../../../util/vs/platform/instantiation/common/instantiation");
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const tokenization_1 = require("../../../../../prompt/src/tokenization");
const similarFiles_1 = require("../../../prompt/components/similarFiles");
const neighborFiles_1 = require("../../../prompt/similarFiles/neighborFiles");
const completionsPrompt_1 = require("../../../test/completionsPrompt");
const context_1 = require("../../../test/context");
const snapshot_1 = require("../../../test/snapshot");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
suite('Similar Files', function () {
    let accessor;
    setup(async function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        neighborFiles_1.NeighborSource.reset();
        await tokenization_1.initializeTokenizers;
    });
    test('Empty render without similar file', async function () {
        const doc = document('untitled:', 'typescript', 'const a = 23;');
        const snapshot = await createSnapshot(accessor, doc, []);
        const snapshotNode = (0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles');
        assert.deepStrictEqual(snapshotNode, []);
    });
    test('Renders single similar file', async function () {
        const doc = document('file:///foo.ts', 'typescript', '//sum\nconst result = |');
        const similarFile = document('file:///calculator.ts', 'typescript', 'export function sum(a: number, b: number) { return a + b; }');
        const snapshot = await createSnapshot(accessor, doc, [similarFile]);
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles.f[0].SimilarFile.Chunk[0].Text'), 'Compare this snippet from calculator.ts:');
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles.f[0].SimilarFile.Chunk[1].Text'), 'export function sum(a: number, b: number) { return a + b; }');
    });
    test('Renders multiple similar files', async function () {
        const doc = document('file:///foo.ts', 'typescript', '//sum and multiply\nconst result = |');
        const similar1 = document('file:///sum.ts', 'typescript', 'export function sum(a: number, b: number) { return a + b; }');
        const similar2 = document('file:///multiply.ts', 'typescript', 'export function multiply(a: number, b: number) { return a * b; }');
        const snapshot = await createSnapshot(accessor, doc, [similar1, similar2]);
        const similarFileNodes = (0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles');
        assert.deepStrictEqual(similarFileNodes.length, 2);
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles.f[0].SimilarFile.Chunk[0].Text'), 'Compare this snippet from sum.ts:');
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles.f[0].SimilarFile.Chunk[1].Text'), 'export function sum(a: number, b: number) { return a + b; }');
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles.f[1].SimilarFile.Chunk[0].Text'), 'Compare this snippet from multiply.ts:');
        assert.deepStrictEqual((0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles.f[1].SimilarFile.Chunk[1].Text'), 'export function multiply(a: number, b: number) { return a * b; }');
    });
    test('Similar files can be turned off', async function () {
        const doc = document('file:///foo.ts', 'typescript', '//sum\nconst result = |');
        const similarFile = document('file:///calculator.ts', 'typescript', 'export function sum(a: number, b: number) { return a + b; }');
        const snapshot = await createSnapshot(accessor, doc, [similarFile], undefined, undefined, true);
        const similarFiles = (0, snapshot_1.querySnapshot)(snapshot, 'SimilarFiles');
        assert.deepStrictEqual(similarFiles, []);
    });
    async function createSnapshot(accessor, doc, neighbors, codeSnippets, traits, turnOffSimilarFiles) {
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const tdms = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        neighbors.forEach(n => tdms.setTextDocument(n.uri, n.detectedLanguageId, n.getText()));
        const position = doc.positionAt(doc.getText().indexOf('|'));
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(similarFiles_1.SimilarFiles, { tdms: tdms, instantiationService: instantiationService }));
        const pipe = virtualPrompt.createPipe();
        await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, doc, position, codeSnippets, traits, turnOffSimilarFiles));
        return virtualPrompt.snapshot().snapshot;
    }
    function document(uri, languageId, text) {
        return (0, textDocument_1.createTextDocument)(uri, languageId, 0, (0, ts_dedent_1.default) `${text}`);
    }
});
//# sourceMappingURL=similarFiles.test.js.map