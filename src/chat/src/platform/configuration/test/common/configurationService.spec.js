"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const alternativeContentFormat_1 = require("../../../notebook/common/alternativeContentFormat");
const configurationService_1 = require("../../common/configurationService");
(0, vitest_1.suite)('AbstractConfigurationService', () => {
    (0, vitest_1.suite)('_extractHashValue', () => {
        (0, vitest_1.test)('should return a value between 0 and 1', () => {
            const value = configurationService_1.AbstractConfigurationService._extractHashValue('test');
            vitest_1.assert.strictEqual(typeof value, 'number');
            vitest_1.assert.ok(value >= 0 && value <= 1, `Value ${value} should be between 0 and 1`);
        });
        (0, vitest_1.test)('should return the same value for the same input', () => {
            const input = 'puku.advanced.testSetting;user1';
            const value1 = configurationService_1.AbstractConfigurationService._extractHashValue(input);
            const value2 = configurationService_1.AbstractConfigurationService._extractHashValue(input);
            vitest_1.assert.strictEqual(value1, value2);
        });
        (0, vitest_1.test)('should return different values for different inputs', () => {
            const value1 = configurationService_1.AbstractConfigurationService._extractHashValue('setting1;user1');
            const value2 = configurationService_1.AbstractConfigurationService._extractHashValue('setting2;user1');
            vitest_1.assert.notStrictEqual(value1, value2);
        });
        (0, vitest_1.test)('should handle empty string', () => {
            const value = configurationService_1.AbstractConfigurationService._extractHashValue('');
            vitest_1.assert.strictEqual(typeof value, 'number');
            vitest_1.assert.ok(value >= 0 && value <= 1);
        });
        (0, vitest_1.test)('should produce different values when username changes', () => {
            const setting = 'puku.advanced.testSetting';
            const value1 = configurationService_1.AbstractConfigurationService._extractHashValue(`${setting};user1`);
            const value2 = configurationService_1.AbstractConfigurationService._extractHashValue(`${setting};user2`);
            vitest_1.assert.notStrictEqual(value1, value2);
        });
        (0, vitest_1.test)('should be deterministic for complex strings', () => {
            const input = 'puku.advanced.someComplexSetting;username123!@#$%^&*()';
            const expected = configurationService_1.AbstractConfigurationService._extractHashValue(input);
            // Call multiple times to ensure determinism
            for (let i = 0; i < 5; i++) {
                const actual = configurationService_1.AbstractConfigurationService._extractHashValue(input);
                vitest_1.assert.strictEqual(actual, expected);
            }
        });
    });
    (0, vitest_1.suite)('Internal Settings - Validation', () => {
        (0, vitest_1.test)('ProjectLabelsChat is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsChat;
            vitest_1.assert.strictEqual(setting.id, 'chat.projectLabels.chat');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('ProjectLabelsInline is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsInline;
            vitest_1.assert.strictEqual(setting.id, 'chat.projectLabels.inline');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('ProjectLabelsExpanded is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsExpanded;
            vitest_1.assert.strictEqual(setting.id, 'chat.projectLabels.expanded');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('WorkspaceMaxLocalIndexSize is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceMaxLocalIndexSize;
            vitest_1.assert.strictEqual(setting.id, 'chat.workspace.maxLocalIndexSize');
            vitest_1.assert.strictEqual(setting.defaultValue, 100_000);
        });
        (0, vitest_1.test)('WorkspaceEnableFullWorkspace is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceEnableFullWorkspace;
            vitest_1.assert.strictEqual(setting.id, 'chat.workspace.enableFullWorkspace');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('WorkspaceEnableCodeSearch is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceEnableCodeSearch;
            vitest_1.assert.strictEqual(setting.id, 'chat.workspace.enableCodeSearch');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('WorkspaceEnableEmbeddingsSearch is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceEnableEmbeddingsSearch;
            vitest_1.assert.strictEqual(setting.id, 'chat.workspace.enableEmbeddingsSearch');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('WorkspacePreferredEmbeddingsModel is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspacePreferredEmbeddingsModel;
            vitest_1.assert.strictEqual(setting.id, 'chat.workspace.preferredEmbeddingsModel');
            vitest_1.assert.strictEqual(setting.defaultValue, '');
        });
        (0, vitest_1.test)('WorkspacePrototypeAdoCodeSearchEndpointOverride is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.WorkspacePrototypeAdoCodeSearchEndpointOverride;
            vitest_1.assert.strictEqual(setting.id, 'chat.workspace.prototypeAdoCodeSearchEndpointOverride');
            vitest_1.assert.strictEqual(setting.defaultValue, '');
        });
        (0, vitest_1.test)('FeedbackOnChange is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.FeedbackOnChange;
            vitest_1.assert.strictEqual(setting.id, 'chat.feedback.onChange');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('ReviewIntent is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent;
            vitest_1.assert.strictEqual(setting.id, 'chat.review.intent');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('NotebookSummaryExperimentEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.NotebookSummaryExperimentEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.notebook.summaryExperimentEnabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('NotebookVariableFilteringEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.NotebookVariableFilteringEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.notebook.variableFilteringEnabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('NotebookAlternativeDocumentFormat is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.NotebookAlternativeDocumentFormat;
            vitest_1.assert.strictEqual(setting.id, 'chat.notebook.alternativeFormat');
            vitest_1.assert.strictEqual(setting.defaultValue, alternativeContentFormat_1.AlternativeNotebookFormat.xml);
        });
        (0, vitest_1.test)('UseAlternativeNESNotebookFormat is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.UseAlternativeNESNotebookFormat;
            vitest_1.assert.strictEqual(setting.id, 'chat.notebook.alternativeNESFormat.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('TerminalToDebuggerPatterns is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.TerminalToDebuggerPatterns;
            vitest_1.assert.strictEqual(setting.id, 'chat.debugTerminalCommandPatterns');
            vitest_1.assert.deepStrictEqual(setting.defaultValue, []);
        });
        (0, vitest_1.test)('EditSourceTrackingShowDecorations is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.EditSourceTrackingShowDecorations;
            vitest_1.assert.strictEqual(setting.id, 'chat.editSourceTracking.showDecorations');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('EditSourceTrackingShowStatusBar is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.EditSourceTrackingShowStatusBar;
            vitest_1.assert.strictEqual(setting.id, 'chat.editSourceTracking.showStatusBar');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('WorkspaceRecordingEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.WorkspaceRecordingEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.localWorkspaceRecording.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('EditRecordingEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.EditRecordingEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.editRecording.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('TemporalContextMaxAge is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.TemporalContextMaxAge;
            vitest_1.assert.strictEqual(setting.id, 'chat.temporalContext.maxAge');
            vitest_1.assert.strictEqual(setting.defaultValue, 100);
        });
        (0, vitest_1.test)('TemporalContextPreferSameLang is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.TemporalContextPreferSameLang;
            vitest_1.assert.strictEqual(setting.id, 'chat.temporalContext.preferSameLang');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('CodeSearchAgentEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.CodeSearchAgentEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.codesearch.agent.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('AgentTemperature is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.AgentTemperature;
            vitest_1.assert.strictEqual(setting.id, 'chat.agent.temperature');
            vitest_1.assert.strictEqual(setting.defaultValue, undefined);
        });
        (0, vitest_1.test)('InstantApplyShortModelName is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InstantApplyShortModelName;
            vitest_1.assert.strictEqual(setting.id, 'chat.instantApply.shortContextModelName');
            vitest_1.assert.strictEqual(setting.defaultValue, 'gpt-4o-instant-apply-full-ft-v66-short');
        });
        (0, vitest_1.test)('InstantApplyShortContextLimit is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InstantApplyShortContextLimit;
            vitest_1.assert.strictEqual(setting.id, 'chat.instantApply.shortContextLimit');
            vitest_1.assert.strictEqual(setting.defaultValue, 8000);
        });
        (0, vitest_1.test)('EnableUserPreferences is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.EnableUserPreferences;
            vitest_1.assert.strictEqual(setting.id, 'chat.enableUserPreferences');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('SummarizeAgentConversationHistoryThreshold is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.SummarizeAgentConversationHistoryThreshold;
            vitest_1.assert.strictEqual(setting.id, 'chat.summarizeAgentConversationHistoryThreshold');
            vitest_1.assert.strictEqual(setting.defaultValue, undefined);
        });
        (0, vitest_1.test)('AgentHistorySummarizationMode is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.AgentHistorySummarizationMode;
            vitest_1.assert.strictEqual(setting.id, 'chat.agentHistorySummarizationMode');
            vitest_1.assert.strictEqual(setting.defaultValue, undefined);
        });
        (0, vitest_1.test)('AgentHistorySummarizationWithPromptCache is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.AgentHistorySummarizationWithPromptCache;
            vitest_1.assert.strictEqual(setting.id, 'chat.agentHistorySummarizationWithPromptCache');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('AgentHistorySummarizationForceGpt41 is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.AgentHistorySummarizationForceGpt41;
            vitest_1.assert.strictEqual(setting.id, 'chat.agentHistorySummarizationForceGpt41');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('UseResponsesApiTruncation is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.UseResponsesApiTruncation;
            vitest_1.assert.strictEqual(setting.id, 'chat.useResponsesApiTruncation');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('OmitBaseAgentInstructions is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.OmitBaseAgentInstructions;
            vitest_1.assert.strictEqual(setting.id, 'chat.omitBaseAgentInstructions');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('PromptFileContext is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.PromptFileContext;
            vitest_1.assert.strictEqual(setting.id, 'chat.promptFileContextProvider.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('DefaultToolsGrouped is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.DefaultToolsGrouped;
            vitest_1.assert.strictEqual(setting.id, 'chat.tools.defaultToolsGrouped');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('VirtualToolEmbeddingRanking is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.VirtualToolEmbeddingRanking;
            vitest_1.assert.strictEqual(setting.id, 'chat.virtualTools.embeddingRanking');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('MultiReplaceStringGrok is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.MultiReplaceStringGrok;
            vitest_1.assert.strictEqual(setting.id, 'chat.multiReplaceStringGrok.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('EnableClaudeCodeAgent is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.EnableClaudeCodeAgent;
            vitest_1.assert.strictEqual(setting.id, 'chat.claudeCode.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('ClaudeCodeDebugEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.ClaudeCodeDebugEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.claudeCode.debug');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('CopilotCLIEnabled is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimental.CopilotCLIEnabled;
            vitest_1.assert.strictEqual(setting.id, 'chat.copilotCLI.enabled');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('Gpt5AlternativePatch is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.Gpt5AlternativePatch;
            vitest_1.assert.strictEqual(setting.id, 'chat.gpt5AlternativePatch');
            vitest_1.assert.strictEqual(setting.defaultValue, false);
        });
        (0, vitest_1.test)('InlineEditsTriggerOnEditorChangeAfterSeconds is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InlineEditsTriggerOnEditorChangeAfterSeconds;
            vitest_1.assert.strictEqual(setting.id, 'chat.inlineEdits.triggerOnEditorChangeAfterSeconds');
            const defaultValue = setting.defaultValue;
            vitest_1.assert.strictEqual(defaultValue.defaultValue, undefined);
            vitest_1.assert.strictEqual(defaultValue.teamDefaultValue, 10);
        });
        (0, vitest_1.test)('InlineEditsNextCursorPredictionDisplayLine is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InlineEditsNextCursorPredictionDisplayLine;
            vitest_1.assert.strictEqual(setting.id, 'chat.inlineEdits.nextCursorPrediction.displayLine');
            vitest_1.assert.strictEqual(setting.defaultValue, true);
        });
        (0, vitest_1.test)('InlineEditsNextCursorPredictionCurrentFileMaxTokens is correctly configured', () => {
            const setting = configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InlineEditsNextCursorPredictionCurrentFileMaxTokens;
            vitest_1.assert.strictEqual(setting.id, 'chat.inlineEdits.nextCursorPrediction.currentFileMaxTokens');
            vitest_1.assert.strictEqual(setting.defaultValue, 2000);
        });
    });
});
//# sourceMappingURL=configurationService.spec.js.map