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
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const testHelpers_1 = require("../../../../../prompt/src/test/components/testHelpers");
const traits_1 = require("../../../prompt/components/traits");
const telemetry_1 = require("../../../telemetry");
const context_1 = require("../../../test/context");
const snapshot_1 = require("../../../test/snapshot");
const textDocument_1 = require("../../../test/textDocument");
suite('Traits component', function () {
    let accessor;
    const trait1 = {
        name: 'foo',
        value: 'bar',
        importance: 10,
        id: 'traitid1',
        type: 'Trait',
    };
    const trait2 = {
        name: 'baz',
        value: 'qux',
        importance: 5,
        id: 'traitid2',
        type: 'Trait',
    };
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    });
    test('Renders nothing if there are no traits', async function () {
        try {
            await renderTrait(accessor);
        }
        catch (e) {
            assert.ok(e.message.startsWith('No children found at path segment '));
        }
    });
    test('Renders nothing if the traits array is empty', async function () {
        try {
            await renderTrait(accessor, []);
        }
        catch (e) {
            assert.ok(e.message.startsWith('No children found at path segment '));
        }
    });
    test('Renders a single trait', async function () {
        const snapshot = await renderTrait(accessor, [trait1]);
        const traits = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'Traits');
        assert.deepStrictEqual(traits.length, 2);
        assert.deepStrictEqual(traits[0].children?.[0].value, 'Consider this related information:\n');
        assert.deepStrictEqual(traits[1].props?.source, trait1);
        assert.deepStrictEqual(traits[1].children?.[0].value, 'foo: bar');
    });
    test('Renders multiple traits', async function () {
        const snapshot = await renderTrait(accessor, [trait1, trait2]);
        const result = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'Traits');
        // Assert that keys are in the path
        assert.deepStrictEqual((0, testHelpers_1.extractNodesWitPath)(snapshot.snapshot), [
            '$[0].Traits',
            '$[0].Traits[0].f',
            '$[0].Traits[0].f[0].Text',
            '$[0].Traits[0].f[0].Text[0]',
            '$[0].Traits[0].f["traitid1"].Text',
            '$[0].Traits[0].f["traitid1"].Text[0]',
            '$[0].Traits[0].f["traitid2"].Text',
            '$[0].Traits[0].f["traitid2"].Text[0]',
        ]);
        assert.deepStrictEqual(result.length, 3);
        const traits = (0, snapshot_1.querySnapshot)(snapshot.snapshot, 'Traits');
        assert.deepStrictEqual(traits.length, 3);
        assert.deepStrictEqual(traits[0].children?.[0].value, 'Consider this related information:\n');
        assert.deepStrictEqual(traits[1].props?.source, trait1);
        assert.deepStrictEqual(traits[1].children?.[0].value, 'foo: bar');
        assert.deepStrictEqual(traits[2].props?.source, trait2);
        assert.deepStrictEqual(traits[2].children?.[0].value, 'baz: qux');
    });
});
async function renderTrait(accessor, traits) {
    const document = (0, textDocument_1.createTextDocument)('file:///foo.ts', 'typescript', 0, (0, ts_dedent_1.default) `
		const a = 1;
		function f|
		const b = 2;
	`);
    const position = document.positionAt(document.getText().indexOf('|'));
    const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(traits_1.Traits, {}));
    const pipe = virtualPrompt.createPipe();
    const completionRequestData = {
        document,
        position,
        telemetryData: telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(),
        cancellationToken: new vscode_languageserver_protocol_1.CancellationTokenSource().token,
        maxPromptTokens: 1000,
        data: undefined,
        traits,
    };
    await pipe.pump(completionRequestData);
    return virtualPrompt.snapshot();
}
//# sourceMappingURL=traits.test.js.map