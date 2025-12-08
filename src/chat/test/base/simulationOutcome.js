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
exports.SimulationOutcomeImpl = exports.outcomePath = exports.ProxiedSimulationOutcome = exports.ISimulationOutcome = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const services_1 = require("../../src/util/common/services");
const stest_1 = require("./stest");
exports.ISimulationOutcome = (0, services_1.createServiceIdentifier)('ISimulationOutcome');
class ProxiedSimulationOutcome {
    static registerTo(instance, rpc) {
        rpc.registerMethod('ProxiedSimulationOutcome.get', (test) => instance.get(test));
        rpc.registerMethod('ProxiedSimulationOutcome.set', ({ test, results }) => instance.set(test, results));
        return instance;
    }
    constructor(rpc) {
        this.rpc = rpc;
    }
    get(test) {
        return this.rpc.callMethod('ProxiedSimulationOutcome.get', { fullName: test.fullName, outcomeCategory: test.outcomeCategory });
    }
    set(test, results) {
        return this.rpc.callMethod('ProxiedSimulationOutcome.set', { test: { fullName: test.fullName, outcomeCategory: test.outcomeCategory }, results });
    }
}
exports.ProxiedSimulationOutcome = ProxiedSimulationOutcome;
exports.outcomePath = path.join(__dirname, '../test/outcome');
class SimulationOutcomeImpl {
    constructor(_runningAllTests) {
        this._runningAllTests = _runningAllTests;
        this.outcome = new Map();
    }
    async get(test) {
        const filePath = path.join(exports.outcomePath, this._getCategoryFilename(test.outcomeCategory));
        const entriesBuffer = await fs.promises.readFile(filePath, 'utf8');
        const entries = JSON.parse(entriesBuffer);
        return entries.find(entry => entry.name === test.fullName);
    }
    set(test, results) {
        const requestsSet = new Set();
        for (const testRun of results) {
            for (const cacheInfo of testRun.cacheInfo) {
                if (cacheInfo.type === 'request') {
                    requestsSet.add(cacheInfo.key);
                }
            }
        }
        const requests = Array.from(requestsSet).sort();
        let entries;
        if (!this.outcome.has(test.outcomeCategory)) {
            entries = [];
            this.outcome.set(test.outcomeCategory, entries);
        }
        else {
            entries = this.outcome.get(test.outcomeCategory);
        }
        entries.push({
            name: test.fullName,
            requests
        });
        return Promise.resolve();
    }
    async write() {
        for (const [category, entries] of this.outcome) {
            // When running a subset of tests, we will copy over the old existing test results for tests that were not executed
            const filePath = path.join(exports.outcomePath, this._getCategoryFilename(category));
            if (!this._runningAllTests) {
                let prevEntriesBuffer;
                try {
                    prevEntriesBuffer = await fs.promises.readFile(filePath, 'utf8');
                }
                catch (err) {
                }
                if (prevEntriesBuffer) {
                    try {
                        const prevEntries = JSON.parse(prevEntriesBuffer);
                        const currentEntries = new Set(entries.map(el => el.name));
                        for (const prevEntry of prevEntries) {
                            if (!currentEntries.has(prevEntry.name)) {
                                entries.push(prevEntry);
                            }
                        }
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
            }
            entries.sort((a, b) => a.name.localeCompare(b.name));
            await fs.promises.writeFile(filePath, JSON.stringify(entries, undefined, '\t'));
        }
        // console.log(this.outcome);
    }
    _getCategoryFilename(category) {
        return `${(0, stest_1.toDirname)(category.toLowerCase())}.json`;
    }
    async cleanFolder() {
        // Clean the outcome folder
        const names = await fs.promises.readdir(exports.outcomePath);
        const entries = new Set(names.filter(name => name.endsWith('.json')));
        for (const [category, _] of this.outcome) {
            entries.delete(this._getCategoryFilename(category));
        }
        if (entries.size > 0) {
            await Promise.all(Array.from(entries.values()).map(entry => fs.promises.unlink(path.join(exports.outcomePath, entry))));
        }
    }
}
exports.SimulationOutcomeImpl = SimulationOutcomeImpl;
//# sourceMappingURL=simulationOutcome.js.map