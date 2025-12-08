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
exports.EditFileResult = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../platform/endpoint/common/chatModelCapabilities");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const simulationTestContext_1 = require("../../../platform/simulationTestContext/common/simulationTestContext");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../util/common/languages");
const async_1 = require("../../../util/vs/base/common/async");
const vscodeTypes_1 = require("../../../vscodeTypes");
const tag_1 = require("../../prompts/node/base/tag");
const toolNames_1 = require("../common/toolNames");
const getErrorsTool_1 = require("./getErrorsTool");
let EditFileResult = class EditFileResult extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, languageDiagnosticsService, testContext, promptPathRepresentationService, workspaceService, telemetryService, endpointProvider, experimentationService) {
        super(props);
        this.configurationService = configurationService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.testContext = testContext;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.workspaceService = workspaceService;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.experimentationService = experimentationService;
    }
    async render(state, sizing) {
        const successfullyEditedFiles = [];
        const editingErrors = [];
        const editsWithDiagnostics = [];
        const healedEdits = [];
        let totalNewDiagnostics = 0;
        let filesWithNewDiagnostics = 0;
        let notebookEditFailures = 0;
        for (const file of this.props.files) {
            if (file.error) {
                editingErrors.push(file.error);
                if (file.isNotebook) {
                    notebookEditFailures++;
                }
                continue;
            }
            const filePath = this.promptPathRepresentationService.getFilePath(file.uri);
            if (file.healed) {
                healedEdits.push({ file: filePath, healing: file.healed });
            }
            const diagnostics = (this.props.diagnosticsTimeout === undefined || this.props.diagnosticsTimeout >= 0)
                && !this.testContext.isInSimulationTests
                && this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AutoFixDiagnostics, this.experimentationService)
                && !file.isNotebook
                ? await this.getNewDiagnostics(file)
                : [];
            if (diagnostics.length && !file.isNotebook) {
                totalNewDiagnostics += diagnostics.length;
                filesWithNewDiagnostics++;
                const newSnapshot = await this.workspaceService.openTextDocumentAndSnapshot(file.uri);
                editsWithDiagnostics.push({
                    file: filePath,
                    diagnostics: vscpp(getErrorsTool_1.DiagnosticToolOutput, { diagnosticsGroups: [{
                                context: { document: newSnapshot, language: (0, languages_1.getLanguage)(newSnapshot) },
                                diagnostics,
                                uri: file.uri,
                            }], maxDiagnostics: 20 })
                });
                continue;
            }
            successfullyEditedFiles.push(filePath);
        }
        if (this.props.toolName && this.props.requestId) {
            await this.sendEditFileResultTelemetry(totalNewDiagnostics, filesWithNewDiagnostics);
        }
        let retryMessage = vscpp(vscppf, null,
            "You may use the ",
            toolNames_1.ToolName.EditFile,
            " tool to retry these edits.");
        if (!notebookEditFailures) {
            // No notebook files failed to edit
        }
        else if (notebookEditFailures === editingErrors.length) {
            // All notebook files failed to edit
            retryMessage = vscpp(vscppf, null,
                "You may use the ",
                toolNames_1.ToolName.EditNotebook,
                " tool to retry editing the Notebook files.");
        }
        else if (notebookEditFailures && notebookEditFailures !== editingErrors.length) {
            retryMessage = vscpp(vscppf, null,
                "You may use the ",
                toolNames_1.ToolName.EditFile,
                " tool to retry these edits except for Notebooks.",
                vscpp("br", null),
                "You may use the ",
                toolNames_1.ToolName.EditNotebook,
                " tool to retry editing the Notebook files.");
        }
        return (vscpp(vscppf, null,
            !!healedEdits.length && vscpp(vscppf, null,
                "There was an error applying your original patch, and it was corrected:",
                vscpp("br", null),
                healedEdits.map(h => vscpp(tag_1.Tag, { name: 'correctedEdit', attrs: { file: h.file } }, h.healing)),
                vscpp("br", null)),
            successfullyEditedFiles.length > 0 &&
                vscpp(vscppf, null,
                    "The following files were successfully edited:",
                    vscpp("br", null),
                    successfullyEditedFiles.join('\n'),
                    vscpp("br", null)),
            editingErrors.length > 0 && vscpp(vscppf, null,
                editingErrors.join('\n'),
                this.props.model && (0, chatModelCapabilities_1.modelNeedsStrongReplaceStringHint)(this.props.model) && vscpp(vscppf, null,
                    vscpp("br", null),
                    vscpp("br", null),
                    retryMessage)),
            editsWithDiagnostics.length > 0 &&
                editsWithDiagnostics.map(edit => {
                    return vscpp(vscppf, null,
                        "The edit to ",
                        edit.file,
                        " was applied successfully.",
                        vscpp("br", null),
                        "The edit resulted in the following lint errors:",
                        vscpp("br", null),
                        edit.diagnostics);
                })));
    }
    async getNewDiagnostics(editedFile) {
        await (0, async_1.timeout)(this.props.diagnosticsTimeout ?? 1000);
        const existingDiagnostics = editedFile.existingDiagnostics || [];
        const newDiagnostics = [];
        for (const diagnostic of this.languageDiagnosticsService.getDiagnostics(editedFile.uri)) {
            if (diagnostic.severity !== vscodeTypes_1.DiagnosticSeverity.Error && diagnostic.severity !== vscodeTypes_1.DiagnosticSeverity.Warning) {
                continue;
            }
            // Won't help if edit caused lines to move around, but better than nothing
            const isDuplicate = existingDiagnostics.some(existing => existing.message === diagnostic.message &&
                existing.range.start.line === diagnostic.range.start.line &&
                existing.range.start.character === diagnostic.range.start.character &&
                existing.range.end.line === diagnostic.range.end.line &&
                existing.range.end.character === diagnostic.range.end.character);
            if (!isDuplicate) {
                newDiagnostics.push(diagnostic);
            }
        }
        return newDiagnostics;
    }
    async sendEditFileResultTelemetry(totalNewDiagnostics, filesWithNewDiagnostics) {
        const model = this.props.model && (await this.endpointProvider.getChatEndpoint(this.props.model)).model;
        /* __GDPR__
            "editFileResult.diagnostics" : {
                "owner": "roblourens",
                "comment": "Tracks whether new diagnostics were found after editing files",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "toolName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The name of the tool that performed the edit" },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                "totalNewDiagnostics": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of new diagnostics found across all files" },
                "filesWithNewDiagnostics": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of files that had new diagnostics" },
                "totalFilesEdited": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files that were edited" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('editFileResult.diagnostics', {
            requestId: this.props.requestId,
            toolName: this.props.toolName,
            model,
        }, {
            totalNewDiagnostics,
            filesWithNewDiagnostics,
            totalFilesEdited: this.props.files.length
        });
    }
};
exports.EditFileResult = EditFileResult;
exports.EditFileResult = EditFileResult = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(3, simulationTestContext_1.ISimulationTestContext),
    __param(4, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(5, workspaceService_1.IWorkspaceService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, endpointProvider_1.IEndpointProvider),
    __param(8, nullExperimentationService_1.IExperimentationService)
], EditFileResult);
//# sourceMappingURL=editFileToolResult.js.map