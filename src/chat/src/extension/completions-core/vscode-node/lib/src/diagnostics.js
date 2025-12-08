"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectCompletionDiagnostics = collectCompletionDiagnostics;
exports.formatDiagnosticsAsMarkdown = formatDiagnosticsAsMarkdown;
const config_1 = require("./config");
const os = {
    EOL: '\n',
};
function collectCompletionDiagnostics(accessor, telemetry) {
    const telemetryItems = {};
    if (telemetry !== undefined) {
        if (telemetry.properties.headerRequestId) {
            telemetryItems['Header Request ID'] = telemetry.properties.headerRequestId;
        }
        if (telemetry.properties.choiceIndex) {
            telemetryItems['Choice Index'] = telemetry.properties.choiceIndex;
        }
        if (telemetry.properties.opportunityId) {
            telemetryItems['Opportunity ID'] = telemetry.properties.opportunityId;
        }
        if (telemetry.properties.clientCompletionId) {
            telemetryItems['Client Completion ID'] = telemetry.properties.clientCompletionId;
        }
        if (telemetry.properties.engineName) {
            telemetryItems['Model ID'] = telemetry.properties.engineName;
        }
    }
    return {
        sections: [
            {
                name: 'Copilot Extension',
                items: {
                    Version: config_1.BuildInfo.getVersion(),
                    Editor: getEditorDisplayVersion(accessor),
                    ...telemetryItems,
                },
            },
        ],
    };
}
function formatDiagnosticsAsMarkdown(data) {
    const s = data.sections.map(formatSectionAsMarkdown);
    return s.join(os.EOL + os.EOL) + os.EOL;
}
function formatSectionAsMarkdown(s) {
    return (`## ${s.name}` +
        os.EOL +
        os.EOL +
        Object.keys(s.items)
            .filter(k => k !== 'name')
            .map(k => `- ${k}: ${s.items[k] ?? 'N/A'}`)
            .join(os.EOL));
}
function getEditorDisplayVersion(accessor) {
    const info = accessor.get(config_1.ICompletionsEditorAndPluginInfo).getEditorInfo();
    return `${info.name} ${info.version}`;
}
//# sourceMappingURL=diagnostics.js.map