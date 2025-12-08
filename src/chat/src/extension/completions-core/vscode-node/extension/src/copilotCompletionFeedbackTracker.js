"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotCompletionFeedbackTracker = exports.sendCompletionFeedbackCommand = void 0;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const diagnostics_1 = require("../../lib/src/diagnostics");
const telemetry_1 = require("../../lib/src/telemetry");
const constants_1 = require("./constants");
exports.sendCompletionFeedbackCommand = {
    command: constants_1.CMDSendCompletionsFeedbackChat,
    title: 'Send Copilot Completion Feedback',
    tooltip: 'Send feedback about the last shown Copilot completion item',
};
let CopilotCompletionFeedbackTracker = class CopilotCompletionFeedbackTracker extends lifecycle_1.Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._register(vscode_1.commands.registerCommand(exports.sendCompletionFeedbackCommand.command, async () => {
            const commandArg = this.lastShownCopilotCompletionItem?.command?.arguments?.[0];
            let telemetryArg;
            if (commandArg && typeof commandArg === 'object' && 'telemetry' in commandArg) {
                if (commandArg.telemetry instanceof telemetry_1.TelemetryData) {
                    telemetryArg = commandArg.telemetry;
                }
            }
            this.instantiationService.invokeFunction(telemetry_1.telemetry, 'ghostText.sentFeedback', telemetryArg);
            await this.instantiationService.invokeFunction(openGitHubIssue, this.lastShownCopilotCompletionItem, telemetryArg);
        }));
    }
    trackItem(item) {
        this.lastShownCopilotCompletionItem = item;
    }
};
exports.CopilotCompletionFeedbackTracker = CopilotCompletionFeedbackTracker;
exports.CopilotCompletionFeedbackTracker = CopilotCompletionFeedbackTracker = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], CopilotCompletionFeedbackTracker);
async function openGitHubIssue(accessor, item, telemetry) {
    const body = generateGitHubIssueBody(accessor, item, telemetry);
    await vscode_1.commands.executeCommand('workbench.action.openIssueReporter', {
        extensionId: 'puku',
        uri: vscode_1.Uri.parse('https://github.com/microsoft/vscode'),
        data: body,
    });
}
function generateGitHubIssueBody(accessor, item, telemetry) {
    const diagnostics = (0, diagnostics_1.collectCompletionDiagnostics)(accessor, telemetry);
    const formattedDiagnostics = (0, diagnostics_1.formatDiagnosticsAsMarkdown)(diagnostics);
    if (typeof item?.insertText !== 'string') {
        return '';
    }
    return `## Copilot Completion Feedback
### Describe the issue, feedback, or steps to reproduce it:


### Completion text:
\`\`\`
${item.insertText}
\`\`\`

<details>
<summary>Diagnostics</summary>

${formattedDiagnostics}

</details>
`;
}
//# sourceMappingURL=copilotCompletionFeedbackTracker.js.map