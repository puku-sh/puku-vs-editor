"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPromiseQueue = void 0;
exports.isEvent = isEvent;
exports.isException = isException;
exports.allEvents = allEvents;
exports.withInMemoryTelemetry = withInMemoryTelemetry;
const completionsTelemetryServiceBridge_1 = require("../../../bridge/src/completionsTelemetryServiceBridge");
const telemetry_1 = require("../telemetry");
const promiseQueue_1 = require("../util/promiseQueue");
const telemetrySpy_1 = require("./telemetrySpy");
class TestPromiseQueue extends promiseQueue_1.PromiseQueue {
    async awaitPromises() {
        // Distinct from flush() in that errors are thrown
        await Promise.all(this.promises);
    }
}
exports.TestPromiseQueue = TestPromiseQueue;
// export function isStandardTelemetryMessage(message: CapturedTelemetry<unknown>): boolean {
//     return message.iKey === APP_INSIGHTS_KEY;
// }
// export function isEnhancedTelemetryMessage(message: CapturedTelemetry<unknown>): boolean {
//     return message.iKey === APP_INSIGHTS_KEY_SECURE;
// }
function isEvent(message) {
    return message.data.baseType === 'EventData';
}
function isException(message) {
    return message.data.baseType === 'ExceptionData';
}
function allEvents(messages) {
    for (const message of messages) {
        if (!isEvent(message)) {
            return false;
        }
    }
    return true;
}
async function withInMemoryTelemetry(accessor, work) {
    const reporter = new telemetrySpy_1.TelemetrySpy();
    const enhancedReporter = new telemetrySpy_1.TelemetrySpy();
    const telemetryService = accessor.get(completionsTelemetryServiceBridge_1.ICompletionsTelemetryService);
    const reporters = accessor.get(telemetry_1.ICompletionsTelemetryReporters);
    try {
        telemetryService.setSpyReporters(reporter, enhancedReporter);
        reporters.setReporter(reporter);
        reporters.setEnhancedReporter(enhancedReporter);
        const result = await work(accessor);
        const queue = accessor.get(promiseQueue_1.ICompletionsPromiseQueueService);
        await queue.awaitPromises();
        return { reporter, enhancedReporter: enhancedReporter, result };
    }
    finally {
        telemetryService.clearSpyReporters();
    }
}
//# sourceMappingURL=telemetry.js.map