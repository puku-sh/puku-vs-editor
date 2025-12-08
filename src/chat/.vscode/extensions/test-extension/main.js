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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
require("./bootstrap");
const fs = __importStar(require("fs"));
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const async_1 = require("../../../src/util/vs/base/common/async");
const cancellation_1 = require("../../../src/util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../src/util/vs/base/common/lifecycle");
const uri_1 = require("../../../src/util/vs/base/common/uri");
const uuid_1 = require("../../../src/util/vs/base/common/uuid");
const sharedTypes_1 = require("../../../test/simulation/shared/sharedTypes");
const simulationExec_1 = require("../../../test/simulation/workbench/utils/simulationExec");
const utils_1 = require("../../../test/simulation/workbench/utils/utils");
async function activate(context) {
    // probe for project root
    let isCorrectRepo = false;
    try {
        const pkg = JSON.parse(String(await fs.promises.readFile((0, path_1.join)(utils_1.REPO_ROOT, 'package.json'))));
        isCorrectRepo = pkg.name === 'copilot-chat';
    }
    catch (err) {
        console.error('[STEST] error reading ' + (0, path_1.join)(utils_1.REPO_ROOT, 'package.json'));
        console.error(err);
        isCorrectRepo = false;
    }
    if (!isCorrectRepo) {
        console.log('[STEST] NO activation because in wrong REPO/WORKSPACE', utils_1.REPO_ROOT);
        return;
    }
    const ctrl = vscode.tests.createTestController('simulation', 'STest');
    ctrl.refreshHandler = async (token) => {
        const stream = (0, simulationExec_1.spawnSimulation)({ ignoreNonJSONLines: true, args: ['--list-tests', '--list-suites', '--json'] }, token);
        const suites = new Map();
        for await (const item of stream) {
            const testItem = ctrl.createTestItem(item.name, item.name, item.location && uri_1.URI.file(item.location.path));
            testItem.range = item.location && new vscode.Range(item.location.position.line, item.location.position.character, item.location.position.line, item.location.position.character);
            if (item.type === sharedTypes_1.OutputType.detectedSuite) {
                suites.set(item.name, testItem);
                ctrl.items.add(testItem);
            }
            else if (item.type === sharedTypes_1.OutputType.detectedTest) {
                const suiteItem = suites.get(item.suiteName);
                (suiteItem?.children ?? ctrl.items).add(testItem);
            }
        }
    };
    ctrl.refreshHandler(cancellation_1.CancellationToken.None);
    const simulationAsTestRun = async (request, options, token) => {
        const run = ctrl.createTestRun(request, undefined, false);
        const args = ['--json'];
        if (options.extraArgs.length) {
            args.push(...options.extraArgs);
        }
        const items = new Map();
        const stack = [];
        if (request.include && request.include.length) {
            const grep = [];
            for (const item of request.include) {
                grep.push(item.label);
                items.set(item.label, item);
                stack.push(item.children);
            }
            args.push('--grep', grep.join('|'));
        }
        else {
            stack.push(ctrl.items);
        }
        while (stack.length > 0) {
            const coll = stack.pop();
            for (const [, item] of coll) {
                if (item.children.size > 0) {
                    stack.push(item.children);
                }
                else {
                    items.set(item.label, item);
                }
            }
        }
        if (request.exclude && request.exclude.length) {
            const omitGrep = [];
            for (const item of request.exclude) {
                omitGrep.push(item.label);
                items.delete(item.label);
            }
            args.push('--omit-grep', omitGrep.join('|'));
        }
        run.appendOutput('[STEST] will SPAWN simulation with: ' + args.join(' ') + '\r\n');
        try {
            const stream = !options.debug
                ? (0, simulationExec_1.spawnSimulation)({ ignoreNonJSONLines: true, args }, token)
                : debugSimulation({ ignoreNonJSONLines: true, args }, token);
            class Runs {
                constructor(n) {
                    this.n = n;
                    this._starts = 0;
                    this._passes = 0;
                    this._fails = 0;
                }
                get passes() {
                    return this._passes;
                }
                get fails() {
                    return this._fails;
                }
                start() {
                    this._starts++;
                    return this._starts === 1;
                }
                done(pass) {
                    if (pass) {
                        this._passes++;
                    }
                    else {
                        this._fails++;
                    }
                    if (this._passes + this._fails === this.n) {
                        return true;
                    }
                }
            }
            const nRuns = new Map();
            for await (const output of stream) {
                run.appendOutput('[STEST] received output:\r\n' + JSON.stringify(output, undefined, 2).replaceAll('\n', '\r\n') + '\r\n');
                if (output.type === sharedTypes_1.OutputType.initialTestSummary) {
                    // mark tests as enqueued
                    for (const item of output.testsToRun) {
                        const test = items.get(item);
                        if (test) {
                            run.enqueued(test);
                            nRuns.set(test, new Runs(output.nRuns));
                        }
                    }
                }
                else if (output.type === sharedTypes_1.OutputType.skippedTest) {
                    // mark tests as skipped
                    const test = items.get(output.name);
                    if (test) {
                        run.skipped(test);
                        nRuns.delete(test);
                    }
                }
                else if (output.type === sharedTypes_1.OutputType.testRunStart) {
                    // mark tests as running
                    const test = items.get(output.name);
                    const runs = test && nRuns.get(test);
                    if (test && runs?.start()) {
                        run.started(test);
                    }
                }
                else if (output.type === sharedTypes_1.OutputType.testRunEnd) {
                    // mark tests as done, process output
                    const test = items.get(output.name);
                    if (!test) {
                        continue;
                    }
                    const runs = nRuns.get(test);
                    if (runs.done(output.pass)) {
                        run.passed(test);
                        run.appendOutput(`[STEST] DONE with ${output.name}, ${runs.passes} passes and ${runs.fails} fails`, undefined, test);
                    }
                }
                else if (output.type === sharedTypes_1.OutputType.deviceCodeCallback) {
                    vscode.env.openExternal(vscode.Uri.parse(output.url));
                }
            }
        }
        catch (err) {
            if (err instanceof Error && err.name !== 'Cancelled') {
                run.appendOutput('[STEST] FAILED to run\r\n');
                run.appendOutput(String(err) + '\r\n');
            }
        }
        finally {
            run.end();
        }
    };
    const defaultRunProfile = ctrl.createRunProfile('STest', vscode.TestRunProfileKind.Run, (request, token) => simulationAsTestRun(request, { extraArgs: ['-p', '20'], }, token));
    context.subscriptions.push(defaultRunProfile);
    defaultRunProfile.isDefault = true;
    const defaultDebugProfile = ctrl.createRunProfile('STest: debug', vscode.TestRunProfileKind.Debug, (request, token) => simulationAsTestRun(request, { extraArgs: ['--n', '1', '-p', '1'], debug: true }, token));
    context.subscriptions.push(defaultDebugProfile);
    const visualizeDebugProfile = ctrl.createRunProfile('STest: inspect and visualize', vscode.TestRunProfileKind.Debug, (request, token) => {
        const args = {
            fileName: request.include[0].uri.fsPath,
            path: request.include[0].label,
        };
        vscode.commands.executeCommand('debug-value-editor.debug-and-send-request', {
            launchConfigName: "Test Visualization Runner STests",
            args: args,
            revealAvailablePropertiesView: true,
        });
    });
    context.subscriptions.push(visualizeDebugProfile);
    const updateBaselineProfile = ctrl.createRunProfile('STest: update-baseline', vscode.TestRunProfileKind.Run, (request, token) => simulationAsTestRun(request, { extraArgs: ['--update-baseline', '-p', '20'] }, token));
    context.subscriptions.push(updateBaselineProfile);
    context.subscriptions.push(ctrl);
}
function debugSimulation(options, token) {
    const source = new async_1.AsyncIterableSource();
    const key = (0, uuid_1.generateUuid)();
    const store = new lifecycle_1.DisposableStore();
    const sessions = new Set();
    // (1) launch
    Promise.resolve(vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], {
        type: 'node-terminal',
        request: 'launch',
        name: 'Debug Simulation Tests',
        command: `node ${simulationExec_1.SIMULATION_MAIN_PATH} ${options.args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`,
        __key: key,
    })).catch(err => source.reject(err));
    token.onCancellationRequested(() => {
        sessions.forEach(s => !s.parentSession && vscode.debug.stopDebugging(s));
        source.resolve();
    });
    //(2) spy
    store.add(vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker: (session) => {
            if (sessions.has(session)) {
                return;
            }
            const __key = session.configuration.__key ?? session.parentSession?.configuration.__key;
            if (__key !== key) {
                return;
            }
            sessions.add(session);
            return {
                onDidSendMessage({ type, event, body }) {
                    if (type === 'event' && event === 'output' && body.category === 'stdout') {
                        source.emitOne(body.output);
                    }
                }
            };
        }
    }));
    store.add(vscode.debug.onDidTerminateDebugSession(session => {
        if (sessions.delete(session)) {
            source.resolve();
        }
    }));
    source.asyncIterable.toPromise().finally(() => store.dispose());
    return (0, simulationExec_1.extractJSONL)(source.asyncIterable, options);
}
//# sourceMappingURL=main.js.map