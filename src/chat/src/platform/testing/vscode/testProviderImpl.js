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
exports.TestProvider = void 0;
const vscode = __importStar(require("vscode"));
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
class TestProvider extends lifecycle_1.Disposable {
    constructor() {
        super();
        /** Position then status-ordered arrays of tests in the document for the last test result */
        this.resultsDocs = new map_1.ResourceMap();
        this._register(vscode.tests.onDidChangeTestResults(() => this.setHasFailureContextKey()));
        this.setHasFailureContextKey();
    }
    setHasFailureContextKey() {
        vscode.commands.executeCommand('setContext', 'puku.chat.fixTestFailures.hasFailure', !!iterator_1.Iterable.first(this.getAllFailures()));
    }
    get onDidChangeResults() {
        return vscode.tests.onDidChangeTestResults;
    }
    get lastResultsFrom() {
        return vscode.tests.testResults.find(r => r.completedAt && r.results.length)?.completedAt;
    }
    /** @inheritdoc */
    getAllFailures() {
        const r = vscode.tests.testResults.find(r => r.results.length);
        if (!r) {
            return iterator_1.Iterable.empty();
        }
        return this.dfsFailures(r.results);
    }
    /** @inheritdoc */
    getLastFailureFor(testItem) {
        const chain = [];
        for (let i = testItem; i; i = i.parent) {
            chain.push(i.id);
        }
        chain.reverse();
        for (const testRun of vscode.tests.testResults) {
            for (const _node of testRun.results) {
                let node = _node;
                for (const path of chain) {
                    node = node.children.find(c => c.id === path);
                    if (!node) {
                        break;
                    }
                }
                const failingTask = node?.taskStates.find(t => t.state === vscode.TestResultState.Failed || t.state === vscode.TestResultState.Errored);
                if (failingTask && node) {
                    return { snapshot: node, task: failingTask };
                }
            }
        }
    }
    /** @inheritdoc */
    getFailureAtPosition(uri, position) {
        const r = vscode.tests.testResults.find(r => r.results.length);
        if (this.resultsDocsAreForTestRun !== r) {
            this.makeResultsDocs(r);
        }
        if (!r) {
            return undefined;
        }
        // Some frameworks only mark the test declaration and not the entire body.
        // If a test is a failure before the cursor position, still return it
        // unless there's another passed test below it and before the cursor.
        // Only compare the line numbers for #5292
        const results = this.resultsDocs.get(uri) || [];
        const test = (0, arraysFind_1.findLast)(results, i => !!i.range && i.range.start.line <= position.line);
        if (!test) {
            return undefined;
        }
        for (const task of test.taskStates) {
            if (task.state === vscode.TestResultState.Failed || task.state === vscode.TestResultState.Errored) {
                return { snapshot: test, task };
            }
        }
        return undefined;
    }
    /** @inheritdoc */
    async hasAnyTests() {
        return !!(await vscode.commands.executeCommand('vscode.testing.getControllersWithTests')).length;
    }
    /** @inheritdoc */
    async hasTestsInUri(uri) {
        try {
            const r = await vscode.commands.executeCommand('vscode.testing.getTestsInFile', uri);
            return !!r.length;
        }
        catch {
            return false;
        }
    }
    /**
     * DFS is important because we want to get the most-granular tests possible
     * rather then e.g. suites that would be less relevant.
     */
    *dfsFailures(tests) {
        for (const test of tests) {
            yield* this.dfsFailures(test.children);
            for (const task of test.taskStates) {
                if (task.state === vscode.TestResultState.Failed || task.state === vscode.TestResultState.Errored) {
                    yield { snapshot: test, task };
                }
            }
        }
    }
    makeResultsDocs(r) {
        this.resultsDocs.clear();
        this.resultsDocsAreForTestRun = r;
        if (!r) {
            return;
        }
        const queue = [r.results];
        while (queue.length) {
            for (const result of queue.pop()) {
                queue.push(result.children);
                if (!result.uri) {
                    continue;
                }
                const arr = this.resultsDocs.get(result.uri);
                if (!arr) {
                    this.resultsDocs.set(result.uri, [result]);
                }
                else {
                    arr.push(result);
                }
            }
        }
        const zeroRange = new vscode.Range(0, 0, 0, 0);
        for (const results of this.resultsDocs.values()) {
            results.sort((a, b) => 
            // sort by location  (ascending)
            (a.range || zeroRange).start.compareTo((b.range || zeroRange).start)
                // sort by test status (passed first)
                || compareTaskStates(a.taskStates, b.taskStates));
        }
    }
}
exports.TestProvider = TestProvider;
const compareTaskStates = (a, b) => {
    let maxA = 0;
    let maxB = 0;
    for (const ta of a) {
        maxA = Math.max(maxA, ta.state);
    }
    for (const tb of b) {
        maxB = Math.max(maxB, tb.state);
    }
    return maxA - maxB;
};
//# sourceMappingURL=testProviderImpl.js.map