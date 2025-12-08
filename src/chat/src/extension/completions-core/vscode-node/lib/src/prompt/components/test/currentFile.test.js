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
const currentFile_1 = require("../../../prompt/components/currentFile");
const completionsPrompt_1 = require("../../../test/completionsPrompt");
const context_1 = require("../../../test/context");
const snapshot_1 = require("../../../test/snapshot");
const textDocument_1 = require("../../../test/textDocument");
suite('Completions Prompt Renderer', function () {
    let accessor;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    });
    test('uses full before cursor if within limit', async function () {
        const snapshot = await createSnapshot(1000);
        const value = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CurrentFile[0].f[0].BeforeCursor[0].Text');
        assert.deepStrictEqual(value, 'const a = 1;\nfunction f');
    });
    test('trims before cursor if exceeding limit', async function () {
        const snapshot = await createSnapshot(2);
        const value = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CurrentFile[0].f[0].BeforeCursor[0].Text');
        assert.deepStrictEqual(value, 'nction f');
    });
    test('uses full after cursor if within limit', async function () {
        const snapshot = await createSnapshot(1000);
        const value = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CurrentFile[0].f[1].AfterCursor[0].Text');
        assert.deepStrictEqual(value, 'const b = 2;');
    });
    test('trims after cursor if exceeding limit', async function () {
        const snapshot = await createSnapshot(2);
        const value = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'CurrentFile[0].f[1].AfterCursor[0].Text');
        assert.deepStrictEqual(value, 'const ');
    });
    const createSnapshot = async (maxPromptTokens) => {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, (0, ts_dedent_1.default) `
				const a = 1;
				function f|
				const b = 2;
			`);
        const position = textDocument.positionAt(textDocument.getText().indexOf('|'));
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {}));
        const pipe = virtualPrompt.createPipe();
        const data = (0, completionsPrompt_1.createCompletionRequestData)(accessor, textDocument, position, undefined, undefined, false, undefined, maxPromptTokens);
        await pipe.pump(data);
        return virtualPrompt.snapshot();
    };
});
//# sourceMappingURL=currentFile.test.js.map