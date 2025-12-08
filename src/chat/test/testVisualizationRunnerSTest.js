"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const node_reload_1 = require("@hediet/node-reload");
const path_1 = __importDefault(require("path"));
(0, node_reload_1.enableHotReload)({ loggingEnabled: true });
/** See {@link file://./../.vscode/extensions/visualization-runner/README.md}, this is for stests and jsx tree visualization */
function run(args) {
    console.log('> Running test: ' + args.path);
    setTestFile(args.fileName);
    setTest(args.path);
    runCurrentTest();
}
const g = globalThis;
g.$$playgroundRunner_data = { currentPath: [] };
g.$$debugValueEditor_run = (...args) => { setTimeout(() => run(...args), 0); };
(g.$$debugValueEditor_debugChannels ?? (g.$$debugValueEditor_debugChannels = {}))['run'] = host => ({
    handleRequest: (args) => { setTimeout(() => run(args), 0); }
});
let runnerFn = undefined;
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
    hotRequireDisposable = (0, node_reload_1.hotRequire)(module, './testVisualizationRunnerSTestRunner.ts', (cur) => {
        runnerFn = cur.run;
        if (isFirst) {
            console.log('> Loading tests');
            isFirst = false;
        }
        else {
            console.log('> Running test: ' + currentFullName);
            runCurrentTest();
        }
    });
}
let currentFullName = '';
function setTest(path) {
    currentFullName = path;
    g.$$playgroundRunner_data.currentPath = [path];
}
setTest('');
async function runCurrentTest() {
    const normalizedFileName = path_1.default.join(__dirname, path_1.default.relative(__dirname, currentFileName));
    if (!runnerFn) {
        console.error('Runner not loaded yet');
    }
    else {
        runnerFn(normalizedFileName, currentFullName);
    }
}
console.log('> Playground runner ready.');
//# sourceMappingURL=testVisualizationRunnerSTest.js.map