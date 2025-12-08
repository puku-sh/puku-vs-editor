"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubTelemetrySender = void 0;
const vscode_1 = require("vscode");
const ghTelemetrySender_1 = require("../common/ghTelemetrySender");
const azureInsightsReporter_1 = require("../node/azureInsightsReporter");
class GitHubTelemetrySender extends ghTelemetrySender_1.BaseGHTelemetrySender {
    constructor(configService, envService, telemetryConfig, domainService, capiClientService, extensionName, standardTelemetryAIKey, enhancedTelemetryAIKey, tokenStore) {
        const telemeryLoggerFactory = (enhanced) => {
            if (enhanced) {
                return vscode_1.env.createTelemetryLogger(new azureInsightsReporter_1.AzureInsightReporter(capiClientService, envService, tokenStore, extensionName, enhancedTelemetryAIKey), { ignoreBuiltInCommonProperties: true, ignoreUnhandledErrors: true });
            }
            else {
                return vscode_1.env.createTelemetryLogger(new azureInsightsReporter_1.AzureInsightReporter(capiClientService, envService, tokenStore, extensionName, standardTelemetryAIKey), { ignoreBuiltInCommonProperties: true, ignoreUnhandledErrors: true });
            }
        };
        super(tokenStore, telemeryLoggerFactory, configService, telemetryConfig, envService, domainService);
    }
}
exports.GitHubTelemetrySender = GitHubTelemetrySender;
//# sourceMappingURL=githubTelemetrySender.js.map