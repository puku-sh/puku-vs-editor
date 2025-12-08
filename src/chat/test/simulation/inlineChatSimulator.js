"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSimulationWorkspace = setupSimulationWorkspace;
exports.teardownSimulationWorkspace = teardownSimulationWorkspace;
exports.simulateInlineChatWithStrategy = simulateInlineChatWithStrategy;
exports.simulateInlineChat = simulateInlineChat;
exports.simulateInlineChatIntent = simulateInlineChatIntent;
exports.simulateEditingScenario = simulateEditingScenario;
exports.toIRange = toIRange;
exports.toSelection = toSelection;
exports.toRange = toRange;
exports.forInlineAndInlineChatIntent = forInlineAndInlineChatIntent;
exports.forInline = forInline;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const path = __importStar(require("path"));
const promptCraftingTypes_1 = require("../../src/extension/inlineChat/node/promptCraftingTypes");
const chatParticipantRequestHandler_1 = require("../../src/extension/prompt/node/chatParticipantRequestHandler");
const indentationGuesser_1 = require("../../src/extension/prompt/node/indentationGuesser");
const intentDetector_1 = require("../../src/extension/prompt/node/intentDetector");
const workingCopies_1 = require("../../src/extension/prompts/node/inline/workingCopies");
const toolsService_1 = require("../../src/extension/tools/common/toolsService");
const testTools_1 = require("../../src/extension/tools/node/test/testTools");
const chatAgents_1 = require("../../src/platform/chat/common/chatAgents");
const chatMLFetcher_1 = require("../../src/platform/chat/common/chatMLFetcher");
const languageDiagnosticsService_1 = require("../../src/platform/languages/common/languageDiagnosticsService");
const languageFeaturesService_1 = require("../../src/platform/languages/common/languageFeaturesService");
const tabsAndEditorsService_1 = require("../../src/platform/tabs/common/tabsAndEditorsService");
const isInExtensionHost_1 = require("../../src/platform/test/node/isInExtensionHost");
const simulationWorkspace_1 = require("../../src/platform/test/node/simulationWorkspace");
const chatResponseStreamImpl_1 = require("../../src/util/common/chatResponseStreamImpl");
const languages_1 = require("../../src/util/common/languages");
const chatTypes_1 = require("../../src/util/common/test/shims/chatTypes");
const notebookDocument_1 = require("../../src/util/common/test/shims/notebookDocument");
const textDocument_1 = require("../../src/util/common/test/shims/textDocument");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const event_1 = require("../../src/util/vs/base/common/event");
const map_1 = require("../../src/util/vs/base/common/map");
const resources_1 = require("../../src/util/vs/base/common/resources");
const strings_1 = require("../../src/util/vs/base/common/strings");
const uri_1 = require("../../src/util/vs/base/common/uri");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const simulationWorkspaceExtHost_1 = require("../base/extHostContext/simulationWorkspaceExtHost");
const spyingChatMLFetcher_1 = require("../base/spyingChatMLFetcher");
const stest_1 = require("../base/stest");
const testHelper_1 = require("../e2e/testHelper");
const intentTest_1 = require("../intent/intentTest");
const diagnosticProviders_1 = require("./diagnosticProviders");
const utils_1 = require("./diagnosticProviders/utils");
const simulationLanguageFeatureService_1 = require("./language/simulationLanguageFeatureService");
const sharedTypes_1 = require("./shared/sharedTypes");
function setupSimulationWorkspace(testingServiceCollection, input) {
    const workspace = isInExtensionHost_1.isInExtensionHost ? new simulationWorkspaceExtHost_1.SimulationWorkspaceExtHost() : new simulationWorkspace_1.SimulationWorkspace();
    if ('workspaceState' in input) {
        workspace.resetFromDeserializedWorkspaceState(input.workspaceState);
    }
    else {
        workspace.resetFromFiles(input.files, input.workspaceFolders);
    }
    workspace.setupServices(testingServiceCollection);
    testingServiceCollection.define(languageFeaturesService_1.ILanguageFeaturesService, new descriptors_1.SyncDescriptor(simulationLanguageFeatureService_1.SimulationLanguageFeaturesService, [workspace]));
    return workspace;
}
async function teardownSimulationWorkspace(accessor, workbench) {
    const ls = accessor.get(languageFeaturesService_1.ILanguageFeaturesService);
    if (ls instanceof simulationLanguageFeatureService_1.SimulationLanguageFeaturesService) {
        await ls.teardown();
    }
    workbench.dispose();
}
function isDeserializedWorkspaceStateBasedScenario(scenario) {
    return 'workspaceState' in scenario;
}
function simulateInlineChatWithStrategy(strategy, testingServiceCollection, scenario) {
    if (strategy === 3 /* EditTestStrategy.InlineChatIntent */) {
        return simulateInlineChatIntent(testingServiceCollection, scenario);
    }
    else {
        return simulateInlineChat(testingServiceCollection, scenario);
    }
}
async function simulateInlineChat(testingServiceCollection, scenario) {
    const host = {
        prepareChatRequestLocation: (accessor, wholeRange) => {
            const editor = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService).activeTextEditor;
            if (!editor) {
                throw new Error(`No active editor`);
            }
            return {
                location: vscodeTypes_1.ChatLocation.Editor,
                location2: new vscodeTypes_1.ChatRequestEditorData(editor.document, editor.selection, wholeRange ?? editor.selection),
            };
        }
    };
    return simulateEditingScenario(testingServiceCollection, scenario, host);
}
class ChatReferenceDiagnostic2 extends vscodeTypes_1.ChatReferenceDiagnostic {
    constructor(uri, d) {
        super([[uri, [d]]]);
    }
}
async function simulateInlineChatIntent(testingServiceCollection, scenario) {
    const overrideCommand = `/${"inlineChat" /* Intent.InlineChat */}`;
    const ensureSlashEdit = (query) => {
        return query.startsWith(overrideCommand) ? query : `${overrideCommand} ${query}`;
    };
    const prependEditToUserQueries = (queries) => {
        return queries.map(scenarioQuery => {
            return {
                ...scenarioQuery,
                query: ensureSlashEdit(scenarioQuery.query),
            };
        });
    };
    const massagedScenario = { ...scenario, queries: prependEditToUserQueries(scenario.queries) };
    const host = {
        prepareChatRequestLocation: (accessor, wholeRange) => {
            const editor = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService).activeTextEditor;
            if (!editor) {
                throw new Error(`No active editor`);
            }
            return {
                location: vscodeTypes_1.ChatLocation.Editor,
                location2: new vscodeTypes_1.ChatRequestEditorData(editor.document, editor.selection, wholeRange ?? editor.selection),
            };
        },
        contributeAdditionalReferences(accessor, existingReferences) {
            const diagnosticService = accessor.get(languageDiagnosticsService_1.ILanguageDiagnosticsService);
            const editor = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService).activeTextEditor;
            if (!editor) {
                return existingReferences.slice();
            }
            const result = existingReferences.slice();
            const diagnostics = diagnosticService.getDiagnostics(editor.document.uri);
            for (const d of diagnostics) {
                if (d.range.intersection(editor.selection)) {
                    result.push({
                        id: `diagnostic/${editor.document.uri}/${JSON.stringify(d)}`,
                        name: d.message,
                        value: new ChatReferenceDiagnostic2(editor.document.uri, d)
                    });
                }
            }
            return result;
        },
    };
    return simulateEditingScenario(testingServiceCollection, massagedScenario, host);
}
async function simulateEditingScenario(testingServiceCollection, scenario, host) {
    (0, assert_1.default)(scenario.queries.length > 0, `Cannot simulate scenario with no queries`);
    (0, assert_1.default)(isDeserializedWorkspaceStateBasedScenario(scenario) || scenario.files.length > 0, `Cannot simulate scenario with no files`);
    const workspace = setupSimulationWorkspace(testingServiceCollection, scenario);
    await scenario.extraWorkspaceSetup?.(workspace);
    const accessor = testingServiceCollection.createTestingAccessor();
    await scenario.onBeforeStart?.(accessor);
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const testRuntime = accessor.get(stest_1.ISimulationTestRuntime);
    const states = [];
    let range;
    let isFirst = true;
    const history = [];
    /**
     * A map from doc to relative path with initial contents which is populated right before modifying a document.
     */
    const changedDocsInitialStates = new Map();
    // run each query for the scenario
    try {
        const seenFiles = [];
        for (const query of scenario.queries) {
            if (query.file) {
                if ((0, simulationWorkspace_1.isNotebook)(query.file)) {
                    const notebook = workspace.getNotebook(query.file);
                    if (!notebook) {
                        throw new Error(`Missing notebook file ${query.file}`);
                    }
                    const cell = notebook.cellAt(query.activeCell ?? 0);
                    if (!cell) {
                        throw new Error(`Missing cell ${query.activeCell} in notebook file ${query.file}`);
                    }
                    workspace.addNotebookDocument(notebook);
                    workspace.setCurrentNotebookDocument(notebook);
                    workspace.setCurrentDocument(cell.document.uri);
                }
                else if (typeof query.file !== 'string') {
                    workspace.setCurrentDocument(query.file);
                }
                else {
                    workspace.setCurrentDocument(workspace.getDocument(query.file).document.uri);
                }
            }
            if (query.selection) {
                const selection = toSelection(query.selection);
                workspace.setCurrentSelection(selection);
            }
            if (query.visibleRanges) {
                workspace.setCurrentVisibleRanges(query.visibleRanges.map((range) => toRange(range)));
            }
            if (query.activeCell) {
                const cellSelection = new vscodeTypes_1.NotebookRange(query.activeCell, query.activeCell + 1);
                workspace.setCurrentNotebookSelection([cellSelection]);
            }
            const queryWholeRange = query.wholeRange ? toSelection(query.wholeRange) : undefined;
            const activeEditor = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService).activeTextEditor;
            if (query.file && !activeEditor) {
                throw new Error(`query.file is defined but no editor is active`);
            }
            let initialDiagnostics;
            if (typeof query.diagnostics === 'string') {
                // diagnostics are computed
                try {
                    initialDiagnostics = await fetchDiagnostics(accessor, workspace, query.diagnostics);
                    workspace.setDiagnostics(initialDiagnostics);
                }
                catch (error) {
                    throw new Error(`Error obtained while fetching the diagnostics: ${error}`);
                }
            }
            else if (Array.isArray(query.diagnostics)) {
                if (!activeEditor) {
                    throw new Error(`diagnostics can only be an array if there's an active editor (is 'file' specified?)`);
                }
                // diagnostics are set explicitly
                const diagnostics = new map_1.ResourceMap();
                diagnostics.set(activeEditor.document.uri, convertToDiagnostics(workspace, query.diagnostics));
                workspace.setDiagnostics(diagnostics);
            }
            if (query.fileIndentInfo) {
                workspace.setCurrentDocumentIndentInfo(query.fileIndentInfo);
            }
            else if (activeEditor) {
                workspace.setCurrentDocumentIndentInfo((0, indentationGuesser_1.guessFileIndentInfo)(activeEditor.document));
            }
            if (isFirst && activeEditor) {
                isFirst = false;
                range = activeEditor.selection;
                const documentUri = activeEditor.document.uri;
                const workspacePath = workspace.getFilePath(documentUri);
                let relativeDiskPath;
                if ((0, simulationWorkspace_1.isNotebook)(documentUri)) {
                    const notebookDocument = workspace.getNotebook(documentUri);
                    if (!notebookDocument) {
                        throw new Error(`Missing notebook document ${documentUri}`);
                    }
                    relativeDiskPath = await testRuntime.writeFile(workspacePath + '.txt', notebookDocument.getText(), sharedTypes_1.INLINE_INITIAL_DOC_TAG); // using .txt instead of real file extension to avoid breaking automation scripts
                }
                else {
                    relativeDiskPath = await testRuntime.writeFile(workspacePath + '.txt', activeEditor.document.getText(), sharedTypes_1.INLINE_INITIAL_DOC_TAG); // using .txt instead of real file extension to avoid breaking automation scripts
                }
                changedDocsInitialStates.set(activeEditor.document, null); // just mark that it doesn't get written twice
                if (!relativeDiskPath) {
                    throw new Error(`Failed to write initial document to disk`);
                }
                states.push({
                    kind: 'initial',
                    file: {
                        workspacePath,
                        relativeDiskPath,
                        languageId: activeEditor.document.languageId
                    },
                    additionalFiles: [],
                    languageId: (0, languages_1.getLanguage)(activeEditor.document).languageId,
                    selection: toIRange(activeEditor.selection),
                    range: toIRange(range),
                    diagnostics: workspace.activeFileDiagnostics.map(toIDiagnostic),
                });
            }
            else {
                range = queryWholeRange ?? range;
                states.push({
                    kind: 'initial',
                    additionalFiles: [],
                    diagnostics: workspace.activeFileDiagnostics.map(toIDiagnostic),
                });
            }
            let command;
            let prompt = query.query;
            if (prompt.startsWith('/')) {
                const groups = /\/(?<intentId>\w+)(?<restOfQuery>\s.*)?/s.exec(query.query)?.groups;
                command = groups?.intentId ?? undefined;
                prompt = groups?.restOfQuery?.trim() ?? '';
            }
            const changedDocs = [];
            const references = [...seenFiles];
            const toolReferences = [];
            try {
                const parsedQuery = (0, testHelper_1.parseQueryForTest)(accessor, prompt, workspace);
                for (const variable of parsedQuery.variables) {
                    if (!uri_1.URI.isUri(variable.value)) {
                        references.push(variable);
                        continue;
                    }
                    const uri = variable.value;
                    if (!seenFiles.find(ref => uri_1.URI.isUri(ref.value) && (0, resources_1.isEqual)(ref.value, uri))) {
                        seenFiles.push(variable);
                        references.push(variable);
                    }
                }
                toolReferences.push(...parsedQuery.toolReferences);
            }
            catch (error) {
                // No problem!
            }
            references.push(...(host.contributeAdditionalReferences?.(accessor, references) ?? []));
            const { location, location2 } = host.prepareChatRequestLocation(accessor, range);
            let request = {
                location,
                location2,
                command,
                prompt,
                references,
                attempt: 0,
                isParticipantDetected: false,
                enableCommandDetection: true, // TODO@ulugbekna: add support for disabling intent detection?
                toolReferences,
                toolInvocationToken: (isInExtensionHost_1.isInExtensionHost ? undefined : {}),
                model: null, // https://github.com/microsoft/vscode-copilot/issues/9475
                tools: new Map(),
                id: '1',
                sessionId: '1'
            };
            // Run intent detection
            if (!request.command) {
                const intentDetector = instaService.createInstance(intentDetector_1.IntentDetector);
                const participants = (0, intentTest_1.readBuiltinIntents)(location);
                const detectedParticipant = await intentDetector.provideParticipantDetection(request, { history }, { participants, location: vscodeTypes_1.ChatLocation.Editor }, cancellation_1.CancellationToken.None);
                if (detectedParticipant?.command) {
                    request = { ...request, command: detectedParticipant.command };
                }
            }
            const markdownChunks = [];
            const changedDocuments = new map_1.ResourceMap();
            let hasActualEdits = false;
            let stream = new chatResponseStreamImpl_1.ChatResponseStreamImpl((value) => {
                if (value instanceof vscodeTypes_1.ChatResponseTextEditPart && value.edits.length > 0) {
                    const { uri, edits } = value;
                    let doc;
                    if (!workspace.hasDocument(uri)) {
                        // this is a new file
                        const language = (0, languages_1.getLanguageForResource)(uri);
                        doc = (0, textDocument_1.createTextDocumentData)(uri, '', language.languageId);
                        workspace.addDocument(doc);
                    }
                    else {
                        doc = workspace.getDocument(uri);
                        if (!changedDocsInitialStates.has(doc.document)) {
                            const workspacePath = workspace.getFilePath(doc.document.uri);
                            const workspaceStateFilePromise = testRuntime.writeFile(workspacePath, doc.document.getText(), sharedTypes_1.INLINE_CHANGED_DOC_TAG).then((relativeDiskPath) => {
                                return {
                                    workspacePath,
                                    relativeDiskPath,
                                    languageId: doc.document.languageId
                                };
                            });
                            changedDocsInitialStates.set(doc.document, workspaceStateFilePromise);
                        }
                    }
                    let workingCopyDocument = changedDocuments.get(uri);
                    if (!workingCopyDocument) {
                        workingCopyDocument = new workingCopies_1.WorkingCopyOriginalDocument(doc.document.getText());
                        changedDocuments.set(uri, workingCopyDocument);
                    }
                    const offsetEdits = workingCopyDocument.transformer.toOffsetEdit(edits);
                    if (!workingCopyDocument.isNoop(offsetEdits)) {
                        hasActualEdits = true;
                        workingCopyDocument.applyOffsetEdits(offsetEdits);
                        changedDocs.push(doc.document);
                        if (activeEditor && (0, resources_1.isEqual)(doc.document.uri, activeEditor.document.uri)) {
                            // edit in the same document, adjust the range
                            range = applyEditsAndExpandRange(workspace, activeEditor.document, edits, range);
                        }
                        else {
                            workspace.applyEdits(doc.document.uri, edits);
                        }
                    }
                }
                else if (value instanceof vscodeTypes_1.ChatResponseNotebookEditPart) {
                    const { uri, edits } = value;
                    const validEdits = edits.filter(edit => typeof edit !== 'boolean');
                    let notebookDoc;
                    if (!workspace.hasNotebookDocument(uri)) {
                        notebookDoc = notebookDocument_1.ExtHostNotebookDocumentData.createJupyterNotebook(uri, `{ "cells": [] }`);
                        workspace.addNotebookDocument(notebookDoc);
                    }
                    else {
                        notebookDoc = workspace.getNotebook(uri);
                    }
                    let workingCopyDocument = changedDocuments.get(uri);
                    if (!workingCopyDocument) {
                        workingCopyDocument = new workingCopies_1.WorkingCopyOriginalDocument(notebookDoc.getText());
                        changedDocuments.set(uri, workingCopyDocument);
                    }
                    if (validEdits.length > 0) {
                        hasActualEdits = true;
                        workspace.applyNotebookEdits(notebookDoc.uri, validEdits);
                        workingCopyDocument = new workingCopies_1.WorkingCopyOriginalDocument(notebookDoc.getText());
                        changedDocuments.set(uri, workingCopyDocument);
                    }
                }
                else if (value instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
                    markdownChunks.push(value.value.value);
                }
            }, () => { });
            const interactionOutcomeComputer = new promptCraftingTypes_1.InteractionOutcomeComputer(activeEditor?.document.uri);
            stream = interactionOutcomeComputer.spyOnStream(stream);
            const responseProcessor = host.provideResponseProcessor?.(query);
            if (responseProcessor) {
                stream = responseProcessor.spyOnStream(stream);
            }
            const documentStateBeforeInvocation = activeEditor?.document.getText();
            setupTools(stream, request, accessor);
            const agentArgs = host.agentArgs ?? {
                agentId: (0, chatAgents_1.getChatParticipantIdFromName)(chatAgents_1.editorAgentName),
                agentName: chatAgents_1.editorAgentName,
                intentId: request.command
            };
            const requestHandler = instaService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, history, request, stream, cancellation_1.CancellationToken.None, agentArgs, event_1.Event.None);
            const result = await requestHandler.getResult();
            history.push(new chatTypes_1.ChatRequestTurn(request.prompt, request.command, [...request.references], '', []));
            history.push(new chatTypes_1.ChatResponseTurn([new vscodeTypes_1.ChatResponseMarkdownPart(markdownChunks.join(''))], result, ''));
            let annotations = await responseProcessor?.postProcess(accessor, workspace, stream, result) ?? [];
            let interactionOutcomeKind = interactionOutcomeComputer.interactionOutcome.kind;
            if (interactionOutcomeKind === 'inlineEdit' || interactionOutcomeKind === 'workspaceEdit') {
                // sometimes we push noop edits which can trick the outcome computer
                if (!hasActualEdits) {
                    interactionOutcomeKind = 'noopEdit';
                }
            }
            let intent;
            {
                // TODO@Alex: extract to host object
                const response = requestHandler.conversation.getLatestTurn()?.getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse);
                intent = (response && response.kind === 'ok' ? response.promptQuery.intent : undefined);
            }
            annotations = annotations.concat(requestHandler.conversation.getLatestTurn()?.getMetadata(promptCraftingTypes_1.InteractionOutcome)?.annotations ?? []);
            let outcome;
            if (interactionOutcomeKind === 'none') {
                outcome = { type: 'none', annotations, chatResponseMarkdown: markdownChunks.join('') };
            }
            else if (result.errorDetails) {
                outcome = { type: 'error', errorDetails: result.errorDetails, annotations };
            }
            else if (interactionOutcomeKind === 'noopEdit') {
                outcome = { type: 'none', annotations, chatResponseMarkdown: markdownChunks.join('') };
            }
            else if (interactionOutcomeKind === 'inlineEdit' || interactionOutcomeKind === 'workspaceEdit') {
                const outcomeFiles = [];
                const workspaceEdit = new vscodeTypes_1.WorkspaceEdit();
                const outcomeEdits = [];
                for (const [uri, workingCopyDoc] of changedDocuments.entries()) {
                    if (uri.scheme === 'file') {
                        outcomeFiles.push({
                            kind: 'relativeFile',
                            fileName: path.basename(uri.fsPath),
                            fileContents: workspace.tryGetNotebook(uri)?.getText() ?? workspace.getDocument(uri).getText()
                        });
                    }
                    else {
                        outcomeFiles.push({
                            kind: 'qualifiedFile',
                            uri: uri,
                            fileContents: workspace.tryGetNotebook(uri)?.getText() ?? workspace.getDocument(uri).getText()
                        });
                    }
                    const offsetEdits = workingCopyDoc.appliedEdits;
                    const textEdits = workingCopyDoc.transformer.toTextEdits(offsetEdits);
                    if (activeEditor && (0, resources_1.isEqual)(uri, activeEditor.document.uri)) {
                        // edit in the same document
                        for (let i = 0; i < offsetEdits.replacements.length; i++) {
                            const offsetEdit = offsetEdits.replacements[i];
                            const textEdit = textEdits[i];
                            outcomeEdits.push({
                                offset: offsetEdit.replaceRange.start,
                                length: offsetEdit.replaceRange.length,
                                range: textEdit.range,
                                newText: textEdit.newText,
                            });
                        }
                    }
                    workspaceEdit.set(uri, textEdits);
                }
                if (interactionOutcomeKind === 'inlineEdit') {
                    if (!activeEditor) {
                        throw new Error(`inlineEdit should always have an open editor`);
                    }
                    outcome = {
                        type: 'inlineEdit',
                        initialDiagnostics,
                        appliedEdits: outcomeEdits,
                        originalFileContents: documentStateBeforeInvocation ?? '',
                        fileContents: activeEditor.document.getText(),
                        chatResponseMarkdown: markdownChunks.join(''),
                        annotations
                    };
                }
                else {
                    outcome = {
                        type: 'workspaceEdit',
                        files: outcomeFiles,
                        annotations,
                        edits: workspaceEdit,
                        chatResponseMarkdown: markdownChunks.join('')
                    };
                }
            }
            else {
                outcome = {
                    type: 'conversational',
                    chatResponseMarkdown: markdownChunks.join(''),
                    annotations
                };
            }
            const changedFilePaths = [];
            if (changedDocs.length > 0) {
                const seenDoc = new Set();
                for (const changedDoc of changedDocs) {
                    const workspacePath = workspace.getFilePath(changedDoc.uri);
                    if (seenDoc.has(workspacePath)) {
                        continue;
                    }
                    seenDoc.add(workspacePath);
                    if (location !== vscodeTypes_1.ChatLocation.Editor && !seenFiles.find((v) => uri_1.URI.isUri(v.value) && (0, resources_1.isEqual)(v.value, changedDoc.uri))) {
                        seenFiles.push((0, testHelper_1.createWorkingSetFileVariable)(changedDoc.uri));
                    }
                    if ((0, simulationWorkspace_1.isNotebook)(changedDoc.uri)) {
                        const notebook = workspace.getNotebook(changedDoc.uri);
                        changedFilePaths.push({
                            workspacePath,
                            relativeDiskPath: await testRuntime.writeFile(workspacePath, notebook.getText(), sharedTypes_1.INLINE_CHANGED_DOC_TAG),
                            languageId: changedDoc.languageId
                        });
                    }
                    else {
                        changedFilePaths.push({
                            workspacePath,
                            relativeDiskPath: await testRuntime.writeFile(workspacePath, changedDoc.getText(), sharedTypes_1.INLINE_CHANGED_DOC_TAG),
                            languageId: changedDoc.languageId
                        });
                    }
                }
                // We managed to edit some files!
                testRuntime.setOutcome({
                    kind: 'edit',
                    files: changedFilePaths.map(f => ({ srcUri: f.workspacePath, post: f.relativeDiskPath })),
                    annotations: outcome.annotations
                });
            }
            else {
                if (activeEditor) {
                    const workspacePath = workspace.getFilePath(activeEditor.document.uri);
                    changedFilePaths.push({
                        workspacePath,
                        relativeDiskPath: await testRuntime.writeFile(workspacePath, activeEditor.document.getText(), sharedTypes_1.INLINE_CHANGED_DOC_TAG),
                        languageId: activeEditor.document.languageId
                    });
                }
                if (markdownChunks.length > 0) {
                    testRuntime.setOutcome({
                        kind: 'answer',
                        content: markdownChunks.join(''),
                        annotations: outcome.annotations
                    });
                }
                else {
                    const chatMLFetcher = accessor.get(chatMLFetcher_1.IChatMLFetcher);
                    let contentFilterCount = 0;
                    if (chatMLFetcher instanceof spyingChatMLFetcher_1.SpyingChatMLFetcher) {
                        contentFilterCount = chatMLFetcher.contentFilterCount;
                    }
                    testRuntime.setOutcome({
                        kind: 'failed',
                        hitContentFilter: contentFilterCount > 0,
                        error: 'No contents.',
                        annotations: outcome.annotations,
                        critical: false,
                    });
                }
            }
            let requestCount = 0;
            const fetcher = accessor.get(chatMLFetcher_1.IChatMLFetcher);
            if (fetcher instanceof spyingChatMLFetcher_1.SpyingChatMLFetcher) {
                requestCount = fetcher.interceptedRequests.length;
            }
            let diagnostics = undefined;
            if (typeof query.diagnostics === 'string') {
                const diagnosticsAfter = await fetchDiagnostics(accessor, workspace, query.diagnostics);
                diagnostics = {};
                for (const changedFilePath of changedFilePaths) {
                    const uri = workspace.getUriFromFilePath(changedFilePath.workspacePath);
                    const before = (initialDiagnostics?.get(uri) ?? []).map(toIDiagnostic);
                    const after = (diagnosticsAfter.get(uri) ?? []).map(toIDiagnostic);
                    diagnostics[changedFilePath.workspacePath] = { before, after };
                }
            }
            states.push({
                kind: 'interaction',
                changedFiles: changedFilePaths,
                annotations: outcome.annotations,
                fileName: activeEditor ? workspace.getFilePath(activeEditor.document.uri) : undefined,
                languageId: activeEditor?.document.languageId,
                diagnostics,
                selection: activeEditor ? toIRange(activeEditor.selection) : undefined,
                range: activeEditor ? toIRange(range ?? activeEditor.selection) : undefined,
                interaction: {
                    query: query.query,
                    actualIntent: query.expectedIntent,
                    detectedIntent: intent?.id,
                },
                requestCount,
            });
            await Promise.resolve(query.validate(outcome, workspace, accessor));
        }
        for (const [_, workspaceStateFilePromise] of changedDocsInitialStates) {
            if (workspaceStateFilePromise === null) {
                continue;
            }
            const workspaceStateFile = await workspaceStateFilePromise;
            if (states.length > 0 && states[0].kind === 'initial') {
                states[0].additionalFiles?.push(workspaceStateFile);
            }
        }
    }
    finally {
        await teardownSimulationWorkspace(accessor, workspace);
        await testRuntime.writeFile('inline-simulator.txt', JSON.stringify(states, undefined, 2), sharedTypes_1.INLINE_STATE_TAG); // TODO@test: using .txt instead of .json to avoid breaking test scripts
    }
}
function setupTools(stream, request, accessor) {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const editTool = instaService.createInstance(testTools_1.TestEditFileTool, stream);
    toolsService.addTestToolOverride(editTool.info, editTool);
    toolsService.addTestToolOverride({
        name: 'inline_chat_exit',
        description: 'Moves the inline chat session to the richer panel chat which supports edits across files, creating new files, and multi-turn conversations between the user and the assistant.',
        inputSchema: {},
        source: undefined,
        tags: [],
    }, {
        invoke() {
            return new vscodeTypes_1.LanguageModelToolResult([]);
        }
    });
}
function computeMoreMinimalEdit(document, edit) {
    edit = reduceCommonPrefix(document, edit);
    edit = reduceCommonSuffix(document, edit);
    return edit;
    function reduceCommonPrefix(document, edit) {
        const start = document.offsetAt(edit.range.start);
        const end = document.offsetAt(edit.range.end);
        const oldText = document.getText().substring(start, end);
        const newText = edit.newText;
        const commonPrefixLen = (0, strings_1.commonPrefixLength)(oldText, newText);
        return new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(document.positionAt(start + commonPrefixLen), edit.range.end), edit.newText.substring(commonPrefixLen));
    }
    function reduceCommonSuffix(document, edit) {
        const start = document.offsetAt(edit.range.start);
        const end = document.offsetAt(edit.range.end);
        const oldText = document.getText().substring(start, end);
        const newText = edit.newText;
        const commonSuffixLen = (0, strings_1.commonSuffixLength)(oldText, newText);
        return new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(edit.range.start, document.positionAt(end - commonSuffixLen)), edit.newText.substring(0, newText.length - commonSuffixLen));
    }
}
function applyEditsAndExpandRange(workspace, document, edits, range) {
    if (typeof range === 'undefined') {
        workspace.applyEdits(document.uri, edits, range);
        return undefined;
    }
    edits = edits.map(edit => computeMoreMinimalEdit(document, edit));
    const touchedRanges = new Set();
    let deltaOffset = 0;
    for (const edit of edits) {
        const startOffset = deltaOffset + document.offsetAt(edit.range.start);
        const endOffset = deltaOffset + document.offsetAt(edit.range.end);
        const textLen = edit.newText.length;
        deltaOffset += textLen - (endOffset - startOffset);
        touchedRanges.add([startOffset, textLen]);
    }
    range = workspace.applyEdits(document.uri, edits, range);
    for (const touchedRange of touchedRanges) {
        const [startOffset, textLen] = touchedRange;
        const start = document.positionAt(startOffset);
        const end = document.positionAt(startOffset + textLen);
        range = range?.union(new vscodeTypes_1.Range(start, end));
    }
    return range;
}
function convertToDiagnostics(workspace, diagnostics) {
    return (diagnostics ?? []).map((d) => {
        const diagnostic = new vscodeTypes_1.Diagnostic(new vscodeTypes_1.Range(d.startLine, d.startCharacter, d.endLine, d.endCharacter), d.message);
        diagnostic.relatedInformation = d.relatedInformation?.map(r => {
            const range = new vscodeTypes_1.Range(r.location.startLine, r.location.startCharacter, r.location.endLine, r.location.endCharacter);
            const relatedDocument = workspace.getDocument(r.location.path);
            const relatedLocation = new vscodeTypes_1.Location(relatedDocument.document.uri, range);
            return new vscodeTypes_1.DiagnosticRelatedInformation(relatedLocation, r.message);
        });
        return diagnostic;
    });
}
async function fetchDiagnostics(accessor, workspace, providerId) {
    const files = workspace.documents.map(doc => ({ fileName: workspace.getFilePath(doc.document.uri), fileContents: doc.document.getText() }));
    const diagnostics = await (0, diagnosticProviders_1.getDiagnostics)(accessor, files, providerId);
    return (0, utils_1.convertTestToVSCodeDiagnostics)(diagnostics, path => workspace.getUriFromFilePath(path));
}
function toIDiagnostic(diagnostic) {
    return { range: toIRange(diagnostic.range), message: diagnostic.message };
}
function toIRange(range) {
    return {
        start: { line: range.start.line, character: range.start.character },
        end: { line: range.end.line, character: range.end.character },
    };
}
function toSelection(selection) {
    if (selection.length === 2) {
        return new vscodeTypes_1.Selection(selection[0], selection[1], selection[0], selection[1]);
    }
    else {
        return new vscodeTypes_1.Selection(selection[0], selection[1], selection[2], selection[3]);
    }
}
function toRange(range) {
    if (range.length === 2) {
        return new vscodeTypes_1.Range(range[0], 0, range[1], 0);
    }
    else {
        return new vscodeTypes_1.Range(range[0], range[1], range[2], range[3]);
    }
}
function forInlineAndInlineChatIntent(callback) {
    callback(2 /* EditTestStrategy.Inline */, undefined, '');
    callback(3 /* EditTestStrategy.InlineChatIntent */, [['inlineChat.enableV2', true], ['chat.agent.autoFix', false]], '-InlineChatIntent');
}
function forInline(callback) {
    callback(2 /* EditTestStrategy.Inline */, undefined, '');
}
//# sourceMappingURL=inlineChatSimulator.js.map