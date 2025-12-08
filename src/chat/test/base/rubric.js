"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rubric = rubric;
const stest_1 = require("./stest");
function rubric(accessor, ...assertions) {
    const runtime = accessor.get(stest_1.ISimulationTestRuntime);
    let passed = 0;
    for (const a of assertions) {
        try {
            a();
            passed++;
        }
        catch (e) {
            runtime.log(String(e));
            // ignored
        }
    }
    if (passed === 0) {
        runtime.setOutcome({ kind: 'failed', hitContentFilter: false, error: 'no passed assertions', critical: false });
    }
    else {
        runtime.setExplicitScore(passed / assertions.length);
    }
}
//# sourceMappingURL=rubric.js.map