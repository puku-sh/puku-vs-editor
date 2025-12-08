"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationTestProvider = void 0;
const event_1 = require("../../src/util/vs/base/common/event");
class SimulationTestProvider {
    constructor(failures = []) {
        this.failures = failures;
        this.onDidChangeResults = event_1.Event.None;
    }
    getFailureAtPosition() {
        return undefined;
    }
    hasTestsInUri() {
        return Promise.resolve(false);
    }
    getLastFailureFor() {
        return undefined;
    }
    getAllFailures() {
        return this.failures.map((f) => ({
            snapshot: {
                children: [],
                id: '',
                label: f.label ?? 'my test',
                taskStates: [],
                uri: f.uri,
                range: f.testRange,
            },
            task: {
                state: 4,
                messages: [
                    {
                        message: f.message,
                        location: {
                            uri: f.uri,
                            range: f.failureRange || f.testRange,
                        },
                    }
                ]
            }
        }));
    }
    hasAnyTests() {
        return Promise.resolve(true);
    }
}
exports.SimulationTestProvider = SimulationTestProvider;
//# sourceMappingURL=simulationTestProvider.js.map