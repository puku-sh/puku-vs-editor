"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineEditDebugComponent = exports.reportFeedbackCommandId = void 0;
exports.filterLogForSensitiveFiles = filterLogForSensitiveFiles;
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const tsExpr_1 = require("../../../../platform/inlineEdits/common/utils/tsExpr");
const assert_1 = require("../../../../util/vs/base/common/assert");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const path_1 = require("../../../../util/vs/base/common/path");
const feedbackReporter_1 = require("../../../conversation/vscode-node/feedbackReporter");
const xtabProvider_1 = require("../../../xtab/node/xtabProvider");
const createNextEditProvider_1 = require("../../node/createNextEditProvider");
exports.reportFeedbackCommandId = 'puku.debug.inlineEdit.reportFeedback';
const pickProviderId = 'puku.debug.inlineEdit.pickProvider';
class InlineEditDebugComponent extends lifecycle_1.Disposable {
    constructor(_internalActionsEnabled, _inlineEditsEnabled, _debugRecorder, _inlineEditsProviderId) {
        super();
        this._internalActionsEnabled = _internalActionsEnabled;
        this._inlineEditsEnabled = _inlineEditsEnabled;
        this._debugRecorder = _debugRecorder;
        this._inlineEditsProviderId = _inlineEditsProviderId;
        this._register(vscode_1.commands.registerCommand(exports.reportFeedbackCommandId, async (args) => {
            if (!this._inlineEditsEnabled.get()) {
                return;
            }
            const isInternalUser = this._internalActionsEnabled.get();
            const data = new SimpleMarkdownBuilder();
            data.appendLine(`# Inline Edits Debug Info`);
            if (!isInternalUser) {
                // Public users
                data.appendLine(args.logContext.toMinimalLog());
            }
            else {
                // Internal users
                data.appendLine(args.logContext.toLogDocument());
                let logFilteredForSensitiveFiles;
                {
                    const bookmark = args.logContext.recordingBookmark;
                    const log = this._debugRecorder.getRecentLog(bookmark);
                    let hasRemovedSensitiveFilesFromHistory = false;
                    let sectionContent;
                    if (log === undefined) {
                        sectionContent = ['Could not get recording to generate stest (likely because there was no corresponding workspaceRoot for this file)'];
                    }
                    else {
                        logFilteredForSensitiveFiles = filterLogForSensitiveFiles(log);
                        hasRemovedSensitiveFilesFromHistory = log.length !== logFilteredForSensitiveFiles.length;
                        const stest = generateSTest(logFilteredForSensitiveFiles);
                        sectionContent = [
                            '```typescript',
                            stest,
                            '```'
                        ];
                    }
                    const header = hasRemovedSensitiveFilesFromHistory ? 'STest (sensitive files removed)' : 'STest';
                    data.appendSection(header, sectionContent);
                    data.appendLine('');
                }
                {
                    if (logFilteredForSensitiveFiles !== undefined) {
                        data.appendSection('Recording', ['```json', JSON.stringify(logFilteredForSensitiveFiles, undefined, 2), '```']);
                    }
                }
                {
                    const uiRepro = await extractInlineEditRepro();
                    if (uiRepro) {
                        data.appendSection('UI Repro', ['```', uiRepro, '```']);
                    }
                }
            }
            await (0, feedbackReporter_1.openIssueReporter)({
                title: '',
                data: data.toString(),
                issueBody: '# Description\nPlease describe the expected outcome and attach a screenshot!',
                public: !isInternalUser
            });
        }));
        this._register(vscode_1.commands.registerCommand(pickProviderId, async (args) => {
            if (!this._inlineEditsEnabled.get()) {
                return;
            }
            if (!this._internalActionsEnabled.get()) {
                return;
            }
            const selectedProvider = await vscode_1.window.showQuickPick(this._getAvailableProviderIds(), { placeHolder: 'Select inline edits provider' });
            if (!selectedProvider || selectedProvider === this._inlineEditsProviderId.get()) {
                return;
            }
            this._inlineEditsProviderId.set(selectedProvider, undefined);
            const pick = await vscode_1.window.showWarningMessage(`Inline edits provider set to ${selectedProvider}. Reloading will undo this change. Set "puku.${configurationService_1.ConfigKey.Internal.InlineEditsProviderId.id}": "${selectedProvider}" in your settings file to make the change persistent.`, 'Open settings (JSON)');
            if (!pick) {
                return;
            }
            await vscode_1.commands.executeCommand('workbench.action.openSettingsJson', { revealSetting: { key: `puku.${configurationService_1.ConfigKey.Internal.InlineEditsProviderId.id}`, edit: true } });
        }));
    }
    getCommands(logContext) {
        const menuCommands = [];
        menuCommands.push({
            command: {
                command: exports.reportFeedbackCommandId,
                title: 'Feedback',
                arguments: [{ logContext }],
            },
            icon: new vscode_1.ThemeIcon('feedback')
        });
        if (this._internalActionsEnabled.get()) {
            if (this._getAvailableProviderIds().length > 1) {
                menuCommands.push({
                    command: {
                        command: pickProviderId,
                        title: `Model: ${this._inlineEditsProviderId.get() ?? createNextEditProvider_1.defaultNextEditProviderId}`,
                    },
                    icon: new vscode_1.ThemeIcon('wand'),
                });
            }
        }
        return menuCommands;
    }
    _getAvailableProviderIds() {
        const providers = [xtabProvider_1.XtabProvider.ID];
        const providerId = this._inlineEditsProviderId.get();
        if (providerId && !providers.includes(providerId)) {
            providers.push(providerId);
        }
        return providers;
    }
}
exports.InlineEditDebugComponent = InlineEditDebugComponent;
function generateSTest(log) {
    return tsExpr_1.TsExpr.str `
stest({ description: 'MyTest', language: 'typescript' }, collection => tester.runAndScoreTestFromRecording(collection,
	loadFile({
		fileName: "MyTest/recording.w.json",
		fileContents: ${JSON.stringify({ log })},
	})
));
`.toString();
}
function filterLogForSensitiveFiles(log) {
    const sensitiveFileIds = new Set();
    const safeEntries = [];
    for (const entry of log) {
        switch (entry.kind) {
            // safe entry
            case 'meta':
            case 'header':
            case 'applicationStart':
            case 'event':
            case 'bookmark':
                safeEntries.push(entry);
                break;
            // check if newly encountered document is sensitive
            // if so, add it to the sensitive file ids
            // otherwise, add it to the safe entries
            case 'documentEncountered': {
                const documentBasename = (0, path_1.basename)(entry.relativePath);
                const isSensitiveFile = ['settings.json'].includes(documentBasename) || documentBasename.endsWith(`.env`);
                if (isSensitiveFile) {
                    sensitiveFileIds.add(entry.id);
                }
                else {
                    safeEntries.push(entry);
                }
                break;
            }
            // ensure the entry doesn't belong to a sensitive file
            case 'setContent':
            case 'storeContent':
            case 'restoreContent':
            case 'opened':
            case 'closed':
            case 'changed':
            case 'focused':
            case 'selectionChanged':
            case 'documentEvent': {
                if (!sensitiveFileIds.has(entry.id)) {
                    safeEntries.push(entry);
                }
                break;
            }
            default: {
                (0, assert_1.assertNever)(entry);
            }
        }
    }
    return safeEntries;
}
async function extractInlineEditRepro() {
    const commandId = 'editor.action.inlineSuggest.dev.extractRepro';
    const result = await vscode_1.commands.executeCommand(commandId);
    return result?.reproCase;
}
class SimpleMarkdownBuilder {
    constructor() {
        this._lines = [];
    }
    appendLine(line) {
        this._lines.push(line);
    }
    toString() {
        return this._lines.join('\n');
    }
    appendSection(header, lines) {
        this._lines.push(`<details><summary>${header}</summary>`, '', // we need separation between the summary and the content
        ...lines, `</details>`);
    }
}
//# sourceMappingURL=inlineEditDebugComponent.js.map