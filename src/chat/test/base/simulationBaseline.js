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
exports.ExistingBaselineComparison = exports.SimulationBaseline = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SimulationBaseline {
    get current() {
        return this.currBaseline.values();
    }
    get currentScore() {
        return this._computeScore(Array.from(this.currBaseline.values()));
    }
    get overallScore() {
        return this._computeScore(this.testSummaries);
    }
    _computeScore(summaries) {
        const totalScore = summaries.reduce((acc, curr) => acc + curr.score, 0);
        return (totalScore / summaries.length) * 100;
    }
    static { this.DEFAULT_BASELINE_PATH = path.join(__dirname, '../test/simulation', 'baseline.json'); }
    static async readFromDisk(baselinePath, runningAllTests) {
        let baselineFileContents = '[]';
        try {
            baselineFileContents = (await fs.promises.readFile(baselinePath)).toString();
        }
        catch {
            // No baseline file exists yet, create one
            await fs.promises.writeFile(baselinePath, '[]');
        }
        const parsedBaseline = JSON.parse(baselineFileContents);
        return new SimulationBaseline(baselinePath, parsedBaseline, runningAllTests);
    }
    constructor(baselinePath, parsedBaseline, _runningAllTests) {
        this.baselinePath = baselinePath;
        this._runningAllTests = _runningAllTests;
        this.prevBaseline = new Map();
        this.currBaseline = new Map();
        this.currSkipped = new Set();
        this.prevBaseline = new Map();
        parsedBaseline.forEach(el => this.prevBaseline.set(el.name, el));
    }
    setCurrentResult(testSummary) {
        this.currBaseline.set(testSummary.name, testSummary);
        const prevBaseline = this.prevBaseline.get(testSummary.name);
        return (prevBaseline
            ? new ExistingBaselineComparison(prevBaseline, testSummary)
            : { isNew: true });
    }
    setSkippedTest(name) {
        this.currSkipped.add(name);
    }
    async writeToDisk(pathToWriteTo) {
        const path = pathToWriteTo ?? this.baselinePath;
        await fs.promises.writeFile(path, JSON.stringify(this.testSummaries, undefined, 2));
    }
    /**
     * Returns a sorted array of test summaries.
     * This also includes skipped tests as this is meant to represent the baseline.json which would be written to disk.
     */
    get testSummaries() {
        const testSummaries = Array.from(this.currBaseline.values());
        // Skipped tests remain in the baseline
        for (const name of this.currSkipped) {
            const prevBaseline = this.prevBaseline.get(name);
            if (prevBaseline) {
                testSummaries.push(prevBaseline);
            }
        }
        if (!this._runningAllTests) {
            // When running a subset of tests, we will copy over the old existing test results for tests that were not executed
            const executedTests = new Set(testSummaries.map(el => el.name));
            for (const testSummary of this.prevBaseline.values()) {
                if (!executedTests.has(testSummary.name)) {
                    testSummaries.push(testSummary);
                }
            }
        }
        testSummaries.sort((a, b) => a.name.localeCompare(b.name));
        return testSummaries;
    }
    compare() {
        const prevMandatory = new Map();
        const currMandatory = new Map();
        const prevOptional = new Map();
        const currOptional = new Map();
        for (const [_, value] of this.prevBaseline) {
            if (value.optional) {
                prevOptional.set(value.name, value);
            }
            else {
                prevMandatory.set(value.name, value);
            }
        }
        for (const [_, value] of this.currBaseline) {
            if (value.optional) {
                currOptional.set(value.name, value);
            }
            else {
                currMandatory.set(value.name, value);
            }
        }
        const mandatory = SimulationBaseline.compare(prevMandatory, currMandatory, this.currSkipped);
        const optional = SimulationBaseline.compare(prevOptional, currOptional, this.currSkipped);
        return {
            mandatory,
            optional,
            nUnchanged: mandatory.nUnchanged + optional.nUnchanged,
            nImproved: mandatory.nImproved + optional.nImproved,
            nWorsened: mandatory.nWorsened + optional.nWorsened,
            addedScenarios: mandatory.addedScenarios + optional.addedScenarios,
            removedScenarios: mandatory.removedScenarios + optional.removedScenarios,
            skippedScenarios: mandatory.skippedScenarios + optional.skippedScenarios,
            improvedScenarios: mandatory.improvedScenarios.concat(optional.improvedScenarios),
            worsenedScenarios: mandatory.worsenedScenarios.concat(optional.worsenedScenarios)
        };
    }
    static compare(prevMap, currMap, currSkipped) {
        let nUnchanged = 0;
        let nImproved = 0;
        let nWorsened = 0;
        let addedScenarios = 0;
        let removedScenarios = 0;
        let skippedScenarios = 0;
        const improvedScenarios = [];
        const worsenedScenarios = [];
        for (const [_, curr] of currMap) {
            const prev = prevMap.get(curr.name);
            if (prev) {
                const comparison = new ExistingBaselineComparison(prev, curr);
                if (comparison.isImproved) {
                    nImproved++;
                    improvedScenarios.push({ prevScore: prev.score, currScore: curr.score, name: curr.name });
                }
                else if (comparison.isWorsened) {
                    nWorsened++;
                    worsenedScenarios.push({ prevScore: prev.score, currScore: curr.score, name: curr.name });
                }
                else {
                    nUnchanged++;
                }
            }
            else {
                addedScenarios++;
            }
        }
        for (const [_, prev] of prevMap) {
            if (!currMap.has(prev.name)) {
                if (currSkipped.has(prev.name)) {
                    // this test is missing but it was skipped intentionally
                    skippedScenarios++;
                }
                else {
                    removedScenarios++;
                }
            }
        }
        return { nUnchanged, nImproved, nWorsened, addedScenarios, removedScenarios, skippedScenarios, improvedScenarios, worsenedScenarios };
    }
    clear() {
        this.currBaseline.clear();
        this.currSkipped.clear();
    }
}
exports.SimulationBaseline = SimulationBaseline;
class ExistingBaselineComparison {
    constructor(prev, curr) {
        this.isNew = false;
        this.prevScore = prev.score;
        const prevN = prev.passCount + prev.failCount;
        this.currScore = curr.score;
        const currN = curr.passCount + curr.failCount;
        const prevPassCount = Math.round(this.prevScore * prevN);
        const currPassCount = Math.round(this.currScore * currN);
        // Here we want to mark a change only if this is clearly a change also when the `prevN` would equal `currN`
        let prevMinScore = this.prevScore;
        let prevMaxScore = this.prevScore;
        let currMinScore = this.currScore;
        let currMaxScore = this.currScore;
        if (prevN > currN) {
            // We are now running less iterations than before
            currMinScore = currPassCount / prevN;
            currMaxScore = (currPassCount + (prevN - currN)) / prevN;
        }
        else if (prevN < currN) {
            // We are now running more iterations than before
            prevMinScore = prevPassCount / currN;
            prevMaxScore = (prevPassCount + (currN - prevN)) / currN;
        }
        if (currMinScore > prevMaxScore) {
            this.isImproved = true;
            this.isWorsened = false;
            this.isUnchanged = false;
        }
        else if (currMaxScore < prevMinScore) {
            this.isImproved = false;
            this.isWorsened = true;
            this.isUnchanged = false;
        }
        else {
            this.isImproved = false;
            this.isWorsened = false;
            this.isUnchanged = true;
        }
    }
}
exports.ExistingBaselineComparison = ExistingBaselineComparison;
//# sourceMappingURL=simulationBaseline.js.map