"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_INSIGHTS_KEY_ENHANCED = exports.APP_INSIGHTS_KEY_STANDARD = void 0;
exports.setupGHTelemetry = setupGHTelemetry;
const azureInsightsReporter_1 = require("./azureInsightsReporter");
// the application insights key (also known as instrumentation key)
exports.APP_INSIGHTS_KEY_STANDARD = '7d7048df-6dd0-4048-bb23-b716c1461f8f';
exports.APP_INSIGHTS_KEY_ENHANCED = '3fdd7f28-937a-48c8-9a21-ba337db23bd1';
async function setupGHTelemetry(telemetryService, capiClientService, envService, tokenStore, telemetryNamespace, telemetryEnabled) {
    const container = telemetryService;
    await container.deactivate();
    if (!telemetryEnabled) {
        return;
    }
    const reporter = new azureInsightsReporter_1.AzureInsightReporter(capiClientService, envService, tokenStore, telemetryNamespace, exports.APP_INSIGHTS_KEY_STANDARD);
    const reporterSecure = new azureInsightsReporter_1.AzureInsightReporter(capiClientService, envService, tokenStore, telemetryNamespace, exports.APP_INSIGHTS_KEY_ENHANCED);
    container.setReporter(reporter);
    container.setSecureReporter(reporterSecure);
    return {
        dispose() {
            container.setReporter(undefined);
            container.setSecureReporter(undefined);
            reporter.flush();
            reporterSecure.flush();
        }
    };
}
//# sourceMappingURL=azureInsights.js.map