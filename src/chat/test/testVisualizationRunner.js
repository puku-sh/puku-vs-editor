"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const node_reload_1 = require("@hediet/node-reload");
const module_1 = require("module");
/** See {@link file://./../.vscode/extensions/visualization-runner/README.md} */
(0, node_reload_1.enableHotReload)({ loggingEnabled: false });
const r = module_1.Module.prototype.require;
module_1.Module.prototype.require = function (path) {
    if (path === 'vitest') {
        return createVitestModule(this.filename);
    }
    return r.call(this, path);
};
function run(args) {
    console.log('> Running test: ' + args.path.join(' > '));
    setTestFile(args.fileName);
    setTest(args.path);
    runCurrentTest();
}
const g = globalThis;
g.$$playgroundRunner_data = { currentPath: [] };
// The timeout seems to fix a deadlock-issue of tsx, when the run function is called from the debugger.
g.$$debugValueEditor_run = args => (setTimeout(() => { run(args); }, 0));
(g.$$debugValueEditor_debugChannels ?? (g.$$debugValueEditor_debugChannels = {}))['run'] = host => ({
    handleRequest: (args) => { setTimeout(() => run(args), 0); }
});
let hotRequireDisposable;
let currentFileName = undefined;
function setTestFile(fileName) {
    if (currentFileName === fileName) {
        return;
    }
    currentFileName = fileName;
    if (hotRequireDisposable) {
        hotRequireDisposable.dispose();
    }
    let isFirst = true;
    hotRequireDisposable = (0, node_reload_1.hotRequire)(module, fileName, cur => {
        if (isFirst) {
            console.log('> Loading tests');
            isFirst = false;
        }
        else {
            console.log('> Running test: ' + currentPath.join(' > '));
            runCurrentTest();
        }
        return {
            dispose: () => {
                testsPerFileName.get(fileName)?.clearCache();
            }
        };
    });
}
let currentPath = [];
function setTest(path) {
    currentPath = path;
    g.$$playgroundRunner_data.currentPath = path;
}
setTest([]);
async function runCurrentTest() {
    const t = testsPerFileName.get(currentFileName)?.findTest(currentPath);
    if (!t) {
        console.error('Test not found', currentPath);
        return;
    }
    try {
        const startTime = Date.now();
        g.$$debugValueEditor_properties = [];
        await t?.runner();
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log('> Test finished (' + duration + 'ms).');
    }
    catch (e) {
        console.error('Test failed:', e);
    }
}
const testsPerFileName = new Map();
function createVitestModule(filename) {
    let items = [];
    function getDiscoverFn(fn) {
        return () => {
            items = [];
            const i = items;
            fn();
            items = [];
            return i;
        };
    }
    let currentTestContainer;
    const vitest = {};
    vitest.describe = function (name, fn) {
        currentTestContainer = new TestContainer(name, getDiscoverFn(fn));
        items.push(currentTestContainer);
    };
    vitest.test = function (name, fn) {
        items.push(new Test(name, fn));
    };
    vitest.expect = function () {
        return {
            toBe: function () { },
            toMatchInlineSnapshot: function () { },
            toMatchFileSnapshot: function () { },
        };
    };
    testsPerFileName.set(filename, new TestContainer(filename, () => {
        const i = items;
        items = [];
        return i;
    }));
    return vitest;
}
class TestContainer {
    constructor(name, _discoverFn) {
        this.name = name;
        this._discoverFn = _discoverFn;
        this._tests = new Map();
        this._containers = new Map();
        this._discovered = false;
    }
    _discover() {
        if (this._discovered) {
            return;
        }
        this._discovered = true;
        for (const t of this._discoverFn()) {
            if (t instanceof Test) {
                this._tests.set(t.name, t);
            }
            else {
                this._containers.set(t.name, t);
            }
        }
    }
    getTest(name) {
        this._discover();
        return this._tests.get(name);
    }
    getContainer(name) {
        this._discover();
        return this._containers.get(name);
    }
    findTest(path) {
        if (path.length === 0) {
            throw new Error("Invalid path");
        }
        let cur = this;
        for (let i = 0; i < path.length - 1; i++) {
            const c = cur.getContainer(path[i]);
            if (!c) {
                return undefined;
            }
            cur = c;
        }
        return cur.getTest(path[path.length - 1]);
    }
    clearCache() {
        this._discovered = false;
        this._tests.clear();
        this._containers.clear();
    }
}
class Test {
    constructor(name, runner) {
        this.name = name;
        this.runner = runner;
    }
}
console.log('> Playground runner ready.');
setTimeout(() => {
    if (currentPath.length === 0) {
        console.error('Did not run a test after 5 seconds. Probably a bug in the extension?');
    }
}, 5000);
//# sourceMappingURL=testVisualizationRunner.js.map