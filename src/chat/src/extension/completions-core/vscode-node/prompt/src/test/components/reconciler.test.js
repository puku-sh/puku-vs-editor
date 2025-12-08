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
const reconciler_1 = require("../../components/reconciler");
const assert = __importStar(require("assert"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const testHelpers_1 = require("./testHelpers");
suite('Virtual prompt reconciler', function () {
    test('computes paths for virtual prompt nodes', function () {
        const MyNestedComponent = () => {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Hola" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Adios" })] }));
        };
        const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(MyNestedComponent, {}), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Intermediate" }), (0, jsx_runtime_1.jsx)(MyNestedComponent, {})] }));
        const reconciler = new reconciler_1.VirtualPromptReconciler(prompt);
        const result = reconciler.reconcile();
        const orderedPaths = (0, testHelpers_1.extractNodesWitPath)(result);
        // Assert expected paths
        assert.deepStrictEqual(orderedPaths, [
            '$.f',
            '$.f[0].MyNestedComponent',
            '$.f[0].MyNestedComponent[0].f',
            '$.f[0].MyNestedComponent[0].f[0].Text',
            '$.f[0].MyNestedComponent[0].f[0].Text[0]',
            '$.f[0].MyNestedComponent[0].f[1].Text',
            '$.f[0].MyNestedComponent[0].f[1].Text[0]',
            '$.f[1].Text',
            '$.f[1].Text[0]',
            '$.f[2].MyNestedComponent',
            '$.f[2].MyNestedComponent[0].f',
            '$.f[2].MyNestedComponent[0].f[0].Text',
            '$.f[2].MyNestedComponent[0].f[0].Text[0]',
            '$.f[2].MyNestedComponent[0].f[1].Text',
            '$.f[2].MyNestedComponent[0].f[1].Text[0]',
        ]);
        // Assert uniqueness of paths
        assert.deepStrictEqual([...new Set(orderedPaths)], orderedPaths);
    });
    test('computes paths for virtual prompt nodes with keys', function () {
        const MyNestedComponent = () => {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Hola" }), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Adios" }, 23)] }));
        };
        const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(MyNestedComponent, {}), (0, jsx_runtime_1.jsx)(components_1.Chunk, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Text with key" }, 'key-1') }), (0, jsx_runtime_1.jsx)(MyNestedComponent, {})] }));
        const reconciler = new reconciler_1.VirtualPromptReconciler(prompt);
        const result = reconciler.reconcile();
        const orderedPaths = (0, testHelpers_1.extractNodesWitPath)(result);
        assert.deepStrictEqual(orderedPaths, [
            '$.f',
            '$.f[0].MyNestedComponent',
            '$.f[0].MyNestedComponent[0].f',
            '$.f[0].MyNestedComponent[0].f[0].Text',
            '$.f[0].MyNestedComponent[0].f[0].Text[0]',
            '$.f[0].MyNestedComponent[0].f["23"].Text',
            '$.f[0].MyNestedComponent[0].f["23"].Text[0]',
            '$.f[1].Chunk',
            '$.f[1].Chunk["key-1"].Text',
            '$.f[1].Chunk["key-1"].Text[0]',
            '$.f[2].MyNestedComponent',
            '$.f[2].MyNestedComponent[0].f',
            '$.f[2].MyNestedComponent[0].f[0].Text',
            '$.f[2].MyNestedComponent[0].f[0].Text[0]',
            '$.f[2].MyNestedComponent[0].f["23"].Text',
            '$.f[2].MyNestedComponent[0].f["23"].Text[0]',
        ]);
        // Assert uniqueness of paths
        assert.deepStrictEqual([...new Set(orderedPaths)], orderedPaths);
    });
    test('rejects duplicate keys on same level in initial prompt', function () {
        const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Hola" }, 23), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Adios" }, 23)] }));
        try {
            new reconciler_1.VirtualPromptReconciler(prompt);
            assert.fail('Should have thrown an error');
        }
        catch (e) {
            assert.equal(e.message, 'Duplicate keys found: 23');
        }
    });
    test('rejects multiple duplicate keys on same level in initial prompt', function () {
        const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(components_1.Text, { children: "Hola" }, 23), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Adios" }, 23), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Hola" }, 'aKey'), (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Adios" }, 'aKey')] }));
        try {
            new reconciler_1.VirtualPromptReconciler(prompt);
            assert.fail('Should have thrown an error');
        }
        catch (e) {
            assert.equal(e.message, 'Duplicate keys found: 23, aKey');
        }
    });
    test('rejects duplicate keys on same level during reconciliation', function () {
        let outerSetCount;
        const MyTestComponent = (props, context) => {
            const [count, setCount] = context.useState(1);
            outerSetCount = setCount;
            return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: Array.from({ length: count }).map((_, i) => ((0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["Text ", i] }, 23))) }));
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(MyTestComponent, {}));
        outerSetCount(2);
        try {
            reconciler.reconcile();
            assert.fail('Should have thrown an error');
        }
        catch (e) {
            assert.equal(e.message, 'Duplicate keys found: 23');
        }
    });
    test('accepts same keys on different level', function () {
        const prompt = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Hola" }, 23) }), (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Adios" }, 23) })] }));
        const reconciler = new reconciler_1.VirtualPromptReconciler(prompt);
        const result = reconciler.reconcile();
        const orderedPaths = (0, testHelpers_1.extractNodesWitPath)(result);
        assert.deepStrictEqual(orderedPaths, [
            '$.f',
            '$.f[0].f',
            '$.f[0].f["23"].Text',
            '$.f[0].f["23"].Text[0]',
            '$.f[1].f',
            '$.f[1].f["23"].Text',
            '$.f[1].f["23"].Text[0]',
        ]);
        // Assert uniqueness of paths
        assert.deepStrictEqual([...new Set(orderedPaths)], orderedPaths);
    });
    test('Should re-render if the state of the component changed', function () {
        let outerShouldRenderChildren;
        const MyTestComponent = (props, context) => {
            const [shouldRenderChildren, setShouldRenderChildren] = context.useState(false);
            outerShouldRenderChildren = setShouldRenderChildren;
            if (shouldRenderChildren) {
                return (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is my child" });
            }
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(MyTestComponent, {}));
        const resultOne = reconciler.reconcile();
        assert.deepStrictEqual(resultOne.children?.length, 0);
        outerShouldRenderChildren(true);
        // Should re-render since the state changed
        const resultTwo = reconciler.reconcile();
        assert.deepStrictEqual(resultTwo.children?.length, 1);
    });
    test('Should re-render if the state of a nested component changed', function () {
        let outerSetShouldRenderChildren;
        const MyTestComponent = (props, context) => {
            const [shouldRenderChildren, setShouldRenderChildren] = context.useState(false);
            outerSetShouldRenderChildren = setShouldRenderChildren;
            if (shouldRenderChildren) {
                return (0, jsx_runtime_1.jsx)(components_1.Text, { children: "This is my child" });
            }
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler(((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(MyTestComponent, {}) })));
        const resultOne = reconciler.reconcile();
        assert.deepStrictEqual(resultOne.children?.length, 1);
        assert.deepStrictEqual(resultOne.children[0].children?.length, 0);
        outerSetShouldRenderChildren(true);
        // Should re-render since the state changed
        const resultTwo = reconciler.reconcile();
        assert.deepStrictEqual(resultTwo.children?.length, 1);
        assert.deepStrictEqual(resultTwo.children[0].children?.length, 1);
    });
    test('Should not re-render if the state did not change', function () {
        let created = false;
        const MyTestComponent = (props, context) => {
            const [count, _] = context.useState(0);
            if (created) {
                throw new Error('Component was created more than once');
            }
            created = true;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is my component ", count] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(MyTestComponent, {}));
        try {
            reconciler.reconcile();
            reconciler.reconcile();
        }
        catch (e) {
            assert.fail('Component was created more than once, which should not happen');
        }
    });
    test('Should preserve child state if position and type within parent are the same', function () {
        let outerSetParentState;
        const ParentComponent = (props, context) => {
            const [parentState, setParentState] = context.useState('BEFORE');
            outerSetParentState = setParentState;
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] }), (0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState })] }));
        };
        let childState = 'UNINITIALIZED';
        const ChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childState = childComponentState;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(ParentComponent, {}));
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
        outerSetParentState('AFTER');
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
    });
    test('Should not preserve child state if position and type change and switch back', function () {
        let outerSetParentState;
        const ParentComponent = (props, context) => {
            const [parentState, setParentState] = context.useState('BEFORE');
            outerSetParentState = setParentState;
            if (parentState === 'BEFORE') {
                return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] }), (0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState })] }));
            }
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState }), (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] })] }));
        };
        let childState = 'UNINITIALIZED';
        const ChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childState = childComponentState;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(ParentComponent, {}));
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
        outerSetParentState('AFTER');
        reconciler.reconcile();
        assert.strictEqual(childState, 'AFTER');
        outerSetParentState('BEFORE');
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
    });
    test('Should preserve child state if position changes but key stays the same', function () {
        let outerSetParentState;
        const ParentComponent = (props, context) => {
            const [parentState, setParentState] = context.useState('BEFORE');
            outerSetParentState = setParentState;
            if (parentState === 'BEFORE') {
                return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] }), (0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState }, "child")] }));
            }
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState }, "child"), (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] })] }));
        };
        let childState = 'UNINITIALIZED';
        const ChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childState = childComponentState;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(ParentComponent, {}));
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
        outerSetParentState('AFTER');
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
        outerSetParentState('BEFORE');
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
    });
    test('Should preserve child state if position and type within parent are the same with deep nesting', function () {
        let outerSetParentState;
        const ParentComponent = (props, context) => {
            const [parentState, setParentState] = context.useState('BEFORE');
            outerSetParentState = setParentState;
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] }), (0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState })] }));
        };
        let childState = 'UNINITIALIZED';
        const ChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childState = childComponentState;
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] }), (0, jsx_runtime_1.jsx)(ChildChildComponent, { parentState: childComponentState })] }));
        };
        let childChildState = 'UNINITIALIZED';
        const ChildChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childChildState = childComponentState;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(ParentComponent, {}));
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
        assert.strictEqual(childChildState, 'BEFORE');
        outerSetParentState('AFTER');
        reconciler.reconcile();
        assert.strictEqual(childState, 'BEFORE');
        assert.strictEqual(childChildState, 'BEFORE');
    });
    test('Should preserve child state if position and type within parent are the same with multiple children of same type', function () {
        let outerSetParentState;
        const ParentComponent = (props, context) => {
            const [parentState, setParentState] = context.useState('BEFORE');
            outerSetParentState = setParentState;
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] }), (0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState + '_A' }), (0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState + '_B' })] }));
        };
        let childState = [];
        const ChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childState.push(childComponentState);
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(ParentComponent, {}));
        reconciler.reconcile();
        assert.deepStrictEqual(childState, ['BEFORE_A', 'BEFORE_B']);
        childState = [];
        outerSetParentState('AFTER');
        reconciler.reconcile();
        assert.deepStrictEqual(childState, ['BEFORE_A', 'BEFORE_B']);
    });
    test('Should initialize child state if position changes on reconciliation', function () {
        let outerSetParentCount;
        let outerSetParentState;
        const ParentComponent = (props, context) => {
            const [parentState, setParentState] = context.useState('FIRST');
            const [count, setCount] = context.useState(0);
            outerSetParentCount = setCount;
            outerSetParentState = setParentState;
            const renderChildren = () => {
                const children = [];
                for (let i = 0; i < count; i++) {
                    children.push((0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the parent count: ", parentState] }));
                }
                children.push((0, jsx_runtime_1.jsx)(ChildComponent, { parentState: parentState }));
                return children;
            };
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderChildren() });
        };
        let childState = 'UNINITIALIZED';
        const ChildComponent = (props, context) => {
            const [childComponentState, _] = context.useState(props.parentState);
            childState = childComponentState;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is the child state ", childComponentState] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(ParentComponent, {}));
        reconciler.reconcile();
        assert.strictEqual(childState, 'FIRST');
        outerSetParentCount(1);
        outerSetParentState('SECOND');
        reconciler.reconcile();
        assert.strictEqual(childState, 'SECOND');
    });
    test('Should support cancellation', function () {
        const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
        let outerSetCount = () => 0;
        const MyTestComponent = (props, context) => {
            const [count, setCount] = context.useState(0);
            outerSetCount = setCount;
            return (0, jsx_runtime_1.jsxs)(components_1.Text, { children: ["This is my component ", count] });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(MyTestComponent, {}));
        const result = reconciler.reconcile(cts.token);
        outerSetCount(1);
        cts.cancel();
        const resultAfterCancellation = reconciler.reconcile(cts.token);
        assert.deepStrictEqual(result, resultAfterCancellation);
    });
    test('Creates a pipe to route data to a component', async function () {
        let componentData = '';
        const DataComponent = (props, context) => {
            context.useData(testHelpers_1.isString, (data) => {
                componentData = data;
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(DataComponent, {}));
        const pipe = reconciler.createPipe();
        await pipe.pump('test');
        assert.deepStrictEqual(componentData, 'test');
    });
    test('Fails to pump data before initialization', async function () {
        const reconciler = new reconciler_1.VirtualPromptReconciler(undefined);
        const pipe = reconciler.createPipe();
        try {
            await pipe.pump('test');
            assert.fail('Should have thrown an error');
        }
        catch (e) {
            assert.equal(e.message, 'No tree to pump data into. Pumping data before initializing?');
        }
    });
    test('Creates a pipe to route data to a component after previous reconciliation has been cancelled', async function () {
        const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
        let componentData = '';
        const DataComponent = (props, context) => {
            context.useData(testHelpers_1.isString, (data) => {
                componentData = data;
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(DataComponent, {}));
        const pipe = reconciler.createPipe();
        cts.cancel();
        reconciler.reconcile(cts.token);
        await pipe.pump('test');
        assert.deepStrictEqual(componentData, 'test');
    });
    test('Computes node statistics on reconcile', async function () {
        const DataComponent = (props, context) => {
            const [state, setState] = context.useState('');
            context.useData(testHelpers_1.isString, (data) => {
                setState(data);
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: state });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(DataComponent, {}));
        const pipe = reconciler.createPipe();
        await pipe.pump('test');
        const tree = reconciler.reconcile();
        const updateTime = tree?.lifecycle?.lifecycleData.getUpdateTimeMsAndReset();
        assert.ok(updateTime);
        assert.ok(updateTime > 0);
    });
    test('Computes node statistics on reconcile with measurements from data pumping', async function () {
        const DataComponent = (props, context) => {
            const [state, setState] = context.useState('');
            context.useData(testHelpers_1.isString, (data) => {
                setState(data);
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: state });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(DataComponent, {}));
        const pipe = reconciler.createPipe();
        await pipe.pump('test');
        let tree = reconciler.reconcile();
        let updateTime = tree?.lifecycle?.lifecycleData.getUpdateTimeMsAndReset();
        assert.ok(updateTime);
        assert.ok(updateTime > 0);
        tree = reconciler.reconcile();
        updateTime = tree?.lifecycle?.lifecycleData.getUpdateTimeMsAndReset();
        assert.ok(updateTime === 0);
    });
    test('Updates data time is updated on every data update', async function () {
        const DataComponent = (props, context) => {
            const [count, setCount] = context.useState(0);
            context.useData(testHelpers_1.isNumber, async (newCount) => {
                await new Promise(resolve => setTimeout(resolve, count));
                setCount(newCount);
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: count });
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler((0, jsx_runtime_1.jsx)(DataComponent, {}));
        const pipe = reconciler.createPipe();
        await pipe.pump(1);
        const tree = reconciler.reconcile();
        const lifeCycleData = tree?.lifecycle?.lifecycleData;
        assert.ok(lifeCycleData);
        const timeFirstPump = lifeCycleData?.getUpdateTimeMsAndReset();
        assert.ok(timeFirstPump > 0);
        await pipe.pump(2);
        const timeSecondPump = lifeCycleData?.getUpdateTimeMsAndReset();
        assert.ok(timeSecondPump > 0);
        assert.notDeepStrictEqual(timeFirstPump, timeSecondPump);
    });
    test('Creates a pipe to route data to many components', async function () {
        let componentDataA = '';
        const DataComponentA = (props, context) => {
            context.useData(testHelpers_1.isString, (data) => {
                componentDataA = data;
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        let componentDataB = '';
        const DataComponentB = (props, context) => {
            context.useData(testHelpers_1.isString, (data) => {
                componentDataB = data;
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(DataComponentA, {}), (0, jsx_runtime_1.jsx)(DataComponentB, {})] })));
        const pipe = reconciler.createPipe();
        await pipe.pump('test');
        assert.deepStrictEqual(componentDataA, 'test');
        assert.deepStrictEqual(componentDataB, 'test');
    });
    test('Creates a pipe to route data async to many components', async function () {
        let componentDataA = '';
        const DataComponentA = (props, context) => {
            context.useData(testHelpers_1.isString, async (data) => {
                await Promise.resolve();
                componentDataA = data;
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        let componentDataB = '';
        const DataComponentB = (props, context) => {
            context.useData(testHelpers_1.isString, async (data) => {
                await Promise.resolve();
                componentDataB = data;
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(DataComponentA, {}), (0, jsx_runtime_1.jsx)(DataComponentB, {})] })));
        const pipe = reconciler.createPipe();
        await pipe.pump('test');
        assert.deepStrictEqual(componentDataA, 'test');
        assert.deepStrictEqual(componentDataB, 'test');
    });
    test('Pumps data to components with any pipe independently', async function () {
        const componentDataA = [];
        const DataComponentA = (props, context) => {
            context.useData(testHelpers_1.isString, (data) => {
                componentDataA.push(data);
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const componentDataB = [];
        const DataComponentB = (props, context) => {
            context.useData(testHelpers_1.isString, (data) => {
                componentDataB.push(data);
            });
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const reconciler = new reconciler_1.VirtualPromptReconciler(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(DataComponentA, {}), (0, jsx_runtime_1.jsx)(DataComponentB, {})] })));
        const pipe1 = reconciler.createPipe();
        await pipe1.pump('test');
        const pipe2 = reconciler.createPipe();
        await pipe2.pump('test2');
        assert.deepStrictEqual(componentDataA, ['test', 'test2']);
        assert.deepStrictEqual(componentDataB, ['test', 'test2']);
    });
});
//# sourceMappingURL=reconciler.test.js.map