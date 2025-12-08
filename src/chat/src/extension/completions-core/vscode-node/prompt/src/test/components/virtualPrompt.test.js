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
const jsx_runtime_1 = require("../../../jsx-runtime/jsx-runtime");
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/** @jsxRuntime automatic */
/** @jsxImportSource ../../../jsx-runtime */
const components_1 = require("../../components/components");
const virtualPrompt_1 = require("../../components/virtualPrompt");
const assert = __importStar(require("assert"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
suite('Virtual prompt', function () {
    test('The virtual prompt should return a snapshot tree of a prompt', function () {
        const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is text" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is more text" })] }));
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
        const { snapshot } = virtualPrompt.snapshot();
        const nodeNames = getNodeNames(snapshot);
        const expected = {
            name: 'f',
            children: [
                {
                    name: 'Text',
                    children: [
                        {
                            name: 'string',
                            children: [],
                        },
                    ],
                },
                {
                    name: 'Text',
                    children: [
                        {
                            name: 'string',
                            children: [],
                        },
                    ],
                },
            ],
        };
        assert.deepStrictEqual(nodeNames, expected);
    });
    test('The virtual prompt should return an updated snapshot if the inner state changed', function () {
        let outerSetCount;
        let renderCount = 0;
        const MyTestComponent = (props, context) => {
            const [count, setCount] = context.useState(0);
            outerSetCount = setCount;
            renderCount++;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is my component ", count] });
        };
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(MyTestComponent, {}));
        const { snapshot: snapshotOne } = virtualPrompt.snapshot();
        outerSetCount(1);
        const { snapshot: snapshotTwo } = virtualPrompt.snapshot();
        assert.strictEqual(renderCount, 2);
        assert.notDeepStrictEqual(snapshotOne, snapshotTwo);
    });
    test('Should cancel while snapshotting', function () {
        let shouldCancel = false;
        let outerCancelCount;
        const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
        const CancellingComponent = (props, context) => {
            const [_, setCount] = context.useState(0);
            outerCancelCount = setCount;
            // Cancel on second rendering
            if (shouldCancel) {
                cts.cancel();
            }
            shouldCancel = true;
            return (0, jsx_runtime_1.jsx)(components_1.Text, { children: "CancellingComponent" });
        };
        const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(CancellingComponent, {}) }));
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
        outerCancelCount(1);
        const result = virtualPrompt.snapshot(cts.token);
        assert.deepStrictEqual(result, { snapshot: undefined, status: 'cancelled' });
    });
    test('Should return an error if there was an error during snapshot', function () {
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(undefined);
        const result = virtualPrompt.snapshot();
        assert.deepStrictEqual(result.snapshot, undefined);
        assert.deepStrictEqual(result.status, 'error');
        assert.deepStrictEqual(result.error?.message, 'No tree to reconcile, make sure to pass a valid prompt');
    });
    test('Should return an error if there was an error during reconciliation', function () {
        let outerSetCount;
        let created = false;
        const MyTestComponent = (props, context) => {
            const [count, setCount] = context.useState(0);
            if (created) {
                throw new Error('Component was recreated');
            }
            created = true;
            outerSetCount = setCount;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is my component ", count] });
        };
        const prompt = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(MyTestComponent, {}) }));
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(prompt);
        outerSetCount(1);
        const result = virtualPrompt.snapshot();
        assert.deepStrictEqual(result.snapshot, undefined);
        assert.deepStrictEqual(result.status, 'error');
        assert.deepStrictEqual(result.error?.message, 'Component was recreated');
    });
    test('Should create a pipe', function () {
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: "test" }));
        const pipe = virtualPrompt.createPipe();
        assert.ok(pipe);
    });
});
function getNodeNames(node) {
    return {
        name: node.name,
        children: node.children?.map(getNodeNames) ?? [],
    };
}
//# sourceMappingURL=virtualPrompt.test.js.map