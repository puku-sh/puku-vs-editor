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
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const marker_1 = require("../../../prompt/components/marker");
const completionsPrompt_1 = require("../../../test/completionsPrompt");
const context_1 = require("../../../test/context");
const snapshot_1 = require("../../../test/snapshot");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
suite('Document Marker', function () {
    let accessor;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    });
    test('creates path with relative path', async function () {
        const marker = await renderMarker(accessor, 'file:///path/basename');
        assert.deepStrictEqual(marker, 'Path: basename');
    });
    test('creates language marker with untitled document', async function () {
        const marker = await renderMarker(accessor, 'untitled:uri');
        assert.deepStrictEqual(marker, 'Language: typescript');
    });
    test('creates language marker with relative path present but type is notebook', async function () {
        const textDocument = (0, textDocument_1.createTextDocument)('vscode-notebook:///mynotebook.ipynb', 'typescript', 0, '');
        accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService).setNotebookDocument(textDocument, new textDocument_1.InMemoryNotebookDocument([]));
        const marker = await renderMarker(accessor, textDocument.uri);
        assert.deepStrictEqual(marker, 'Language: typescript');
    });
    async function renderMarker(accessor, uri) {
        const textDocument = (0, textDocument_1.createTextDocument)(uri, 'typescript', 0, (0, ts_dedent_1.default) `
				const a = 1;
				function f|
				const b = 2;
			`);
        const tdms = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        const position = textDocument.positionAt(textDocument.getText().indexOf('|'));
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(marker_1.DocumentMarker, { tdms: tdms }));
        const pipe = virtualPrompt.createPipe();
        await pipe.pump((0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocument, position));
        const snapshot = virtualPrompt.snapshot();
        return (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'DocumentMarker.*.Text');
    }
});
//# sourceMappingURL=marker.test.js.map