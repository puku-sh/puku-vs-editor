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
exports.ApplyPatchTool = exports.applyPatch5Description = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const abstractText_1 = require("../../../platform/editing/common/abstractText");
const notebookDocumentSnapshot_1 = require("../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const editSurvivalTrackerService_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const markdown_1 = require("../../../util/common/markdown");
const notebooks_1 = require("../../../util/common/notebooks");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const map_1 = require("../../../util/vs/base/common/map");
const types_1 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const defaultAgentInstructions_1 = require("../../prompts/node/agent/defaultAgentInstructions");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const codeMapper_1 = require("../../prompts/node/codeMapper/codeMapper");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const editToolLearningService_1 = require("../common/editToolLearningService");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolsService_1 = require("../common/toolsService");
const parseApplyPatch_1 = require("./applyPatch/parseApplyPatch");
const parser_1 = require("./applyPatch/parser");
const editFileToolResult_1 = require("./editFileToolResult");
const editFileToolUtils_1 = require("./editFileToolUtils");
const editNotebookTool_1 = require("./editNotebookTool");
const toolUtils_1 = require("./toolUtils");
exports.applyPatch5Description = "Use the `apply_patch` tool to edit files.\nYour patch language is a stripped-down, file-oriented diff format designed to be easy to parse and safe to apply. You can think of it as a high-level envelope:\n\n*** Begin Patch\n[ one or more file sections ]\n*** End Patch\n\nWithin that envelope, you get a sequence of file operations.\nYou MUST include a header to specify the action you are taking.\nEach operation starts with one of three headers:\n\n*** Add File: <path> - create a new file. Every following line is a + line (the initial contents).\n*** Delete File: <path> - remove an existing file. Nothing follows.\n*** Update File: <path> - patch an existing file in place (optionally with a rename).\n\nMay be immediately followed by *** Move to: <new path> if you want to rename the file.\nThen one or more “hunks”, each introduced by @@ (optionally followed by a hunk header).\nWithin a hunk each line starts with:\n\nFor instructions on [context_before] and [context_after]:\n- By default, show 3 lines of code immediately above and 3 lines immediately below each change. If a change is within 3 lines of a previous change, do NOT duplicate the first change's [context_after] lines in the second change's [context_before] lines.\n- If 3 lines of context is insufficient to uniquely identify the snippet of code within the file, use the @@ operator to indicate the class or function to which the snippet belongs. For instance, we might have:\n@@ class BaseClass\n[3 lines of pre-context]\n- [old_code]\n+ [new_code]\n[3 lines of post-context]\n\n- If a code block is repeated so many times in a class or function such that even a single `@@` statement and 3 lines of context cannot uniquely identify the snippet of code, you can use multiple `@@` statements to jump to the right context. For instance:\n\n@@ class BaseClass\n@@ \t def method():\n[3 lines of pre-context]\n- [old_code]\n+ [new_code]\n[3 lines of post-context]\n\nThe full grammar definition is below:\nPatch := Begin { FileOp } End\nBegin := \"*** Begin Patch\" NEWLINE\nEnd := \"*** End Patch\" NEWLINE\nFileOp := AddFile | DeleteFile | UpdateFile\nAddFile := \"*** Add File: \" path NEWLINE { \"+\" line NEWLINE }\nDeleteFile := \"*** Delete File: \" path NEWLINE\nUpdateFile := \"*** Update File: \" path NEWLINE [ MoveTo ] { Hunk }\nMoveTo := \"*** Move to: \" newPath NEWLINE\nHunk := \"@@\" [ header ] NEWLINE { HunkLine } [ \"*** End of File\" NEWLINE ]\nHunkLine := (\" \" | \"-\" | \"+\") text NEWLINE\n\nA full patch can combine several operations:\n\n*** Begin Patch\n*** Add File: hello.txt\n+Hello world\n*** Update File: src/app.py\n*** Move to: src/main.py\n@@ def greet():\n-print(\"Hi\")\n+print(\"Hello, world!\")\n*** Delete File: obsolete.txt\n*** End Patch\n\nIt is important to remember:\n\n- You must include a header with your intended action (Add/Delete/Update)\n- You must prefix new lines with `+` even when creating a new file\n- File references must be ABSOLUTE, NEVER RELATIVE.";
let ApplyPatchTool = class ApplyPatchTool {
    static { this.toolName = toolNames_1.ToolName.ApplyPatch; }
    constructor(promptPathRepresentationService, instantiationService, workspaceService, toolsService, notebookService, fileSystemService, languageDiagnosticsService, _editSurvivalTrackerService, alternativeNotebookContent, alternativeNotebookEditGenerator, telemetryService, endpointProvider, editToolLearningService, logService) {
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.toolsService = toolsService;
        this.notebookService = notebookService;
        this.fileSystemService = fileSystemService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this._editSurvivalTrackerService = _editSurvivalTrackerService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.alternativeNotebookEditGenerator = alternativeNotebookEditGenerator;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.editToolLearningService = editToolLearningService;
        this.logService = logService;
    }
    getTrailingDocumentEmptyLineCount(document) {
        let trailingEmptyLines = 0;
        for (let i = document.lineCount - 1; i >= 0; i--) {
            const line = document.lineAt(i);
            if (line.text.trim() === '') {
                trailingEmptyLines++;
            }
            else {
                break;
            }
        }
        return trailingEmptyLines;
    }
    getTrailingArrayEmptyLineCount(lines) {
        let trailingEmptyLines = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === '') {
                trailingEmptyLines++;
            }
            else {
                break;
            }
        }
        return trailingEmptyLines;
    }
    async generateUpdateTextDocumentEdit(textDocument, file, change, workspaceEdit) {
        const uri = (0, toolUtils_1.resolveToolInputPath)(file, this.promptPathRepresentationService);
        const newContent = (0, markdown_1.removeLeadingFilepathComment)(change.newContent ?? '', textDocument.languageId, file);
        const lines = newContent?.split('\n') ?? [];
        let path = uri;
        if (change.movePath) {
            const newPath = (0, toolUtils_1.resolveToolInputPath)(change.movePath, this.promptPathRepresentationService);
            workspaceEdit.renameFile(path, newPath, { overwrite: true });
            path = newPath;
        }
        workspaceEdit.replace(path, new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), new vscodeTypes_1.Position(lines.length, 0)), newContent);
        // Handle trailing newlines to match the original document
        const originalTrailing = this.getTrailingDocumentEmptyLineCount(textDocument);
        const newTrailing = this.getTrailingArrayEmptyLineCount(lines);
        for (let i = newTrailing; i < originalTrailing; i++) {
            workspaceEdit.insert(path, new vscodeTypes_1.Position(lines.length + i, 0), '\n');
        }
        // If new content is shorter than original, delete extra lines
        if (lines.length < textDocument.lineCount) {
            const newLineCount = lines.length + Math.max(originalTrailing - newTrailing, 0);
            const from = lines.length === 0 ? new vscodeTypes_1.Position(0, 0) : new vscodeTypes_1.Position(newLineCount, 0);
            workspaceEdit.delete(path, new vscodeTypes_1.Range(from, new vscodeTypes_1.Position(textDocument.lineCount, 0)));
        }
        return path;
    }
    async generateUpdateNotebookDocumentEdit(altDoc, uri, file, change) {
        // Notebooks can have various formats, it could be JSON, XML, Jupytext (which is a format that depends on the code cell language).
        // Lets generate new content based on multiple formats.
        const cellLanguage = (0, helpers_1.getDefaultLanguage)(altDoc.document) || 'python';
        // The content thats smallest is size is the one we're after, as thats the one that would have the leading file path removed.
        const newContent = [
            (0, markdown_1.removeLeadingFilepathComment)(change.newContent ?? '', cellLanguage, file),
            (0, markdown_1.removeLeadingFilepathComment)(change.newContent ?? '', 'python', file),
            (0, markdown_1.removeLeadingFilepathComment)(change.newContent ?? '', 'xml', file),
            (0, markdown_1.removeLeadingFilepathComment)(change.newContent ?? '', 'json', file),
            (0, markdown_1.removeLeadingFilepathComment)(change.newContent ?? '', 'text', file),
        ].reduce((a, b) => a.length < b.length ? a : b);
        const edits = [];
        if (change.movePath) {
            const newPath = (0, toolUtils_1.resolveToolInputPath)(change.movePath, this.promptPathRepresentationService);
            // workspaceEdit.renameFile(path, newPath, { overwrite: true });
            // TODO@joyceerhl: this is a hack, it doesnt't work for regular text files either.
            uri = newPath;
        }
        const telemetryOptions = {
            source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.applyPatch,
            requestId: this._promptContext?.requestId,
            model: this._promptContext?.request?.model ? this.endpointProvider.getChatEndpoint(this._promptContext?.request?.model).then(m => m.model) : undefined
        };
        await (0, codeMapper_1.processFullRewriteNotebook)(altDoc.document, newContent, {
            notebookEdit(_, notebookEdits) {
                edits.push(...(Array.isArray(notebookEdits) ? notebookEdits : [notebookEdits]));
            },
            textEdit(target, textEdits) {
                textEdits = Array.isArray(textEdits) ? textEdits : [textEdits];
                edits.push([target, textEdits]);
            },
        }, this.alternativeNotebookEditGenerator, telemetryOptions, cancellation_1.CancellationToken.None);
        return { path: uri, edits };
    }
    async invoke(options, token) {
        if (!options.input.input || !this._promptContext?.stream) {
            this.sendApplyPatchTelemetry('invalidInput', options, undefined, false, undefined);
            throw new Error('Missing patch text or stream');
        }
        let commit;
        let healed;
        const docText = {};
        try {
            if (this.lastProcessed?.input === options.input.input) {
                const cached = await this.lastProcessed.output;
                commit = cached.commit;
                healed = cached.healed;
                Object.assign(docText, cached.docTexts);
                (0, editFileToolUtils_1.logEditToolResult)(this.logService, options.chatRequestId, { input: options.input.input, success: true, healed });
                this.lastProcessed = undefined;
            }
            // If not cached or cache failed, build with healing
            if (!commit) {
                ({ commit, healed } = await this.buildCommitWithHealing(options.model, options.input.input, docText, options.input.explanation, token));
                (0, editFileToolUtils_1.logEditToolResult)(this.logService, options.chatRequestId, { input: options.input.input, success: true, healed });
            }
        }
        catch (error) {
            if (error instanceof HealedError) {
                healed = error.healedPatch;
                error = error.originalError;
            }
            const notebookUri = (0, arraysFind_1.mapFindFirst)(Object.values(docText), v => v.notebookUri);
            if (error instanceof parser_1.InvalidContextError) {
                this.sendApplyPatchTelemetry(error.kindForTelemetry, options, error.file, !!healed, !!notebookUri);
            }
            else if (error instanceof parser_1.InvalidPatchFormatError) {
                this.sendApplyPatchTelemetry(error.kindForTelemetry, options, '', !!healed, !!notebookUri);
            }
            else {
                this.sendApplyPatchTelemetry('processPatchFailed', options, error.file, !!healed, !!notebookUri, error);
            }
            (0, editFileToolUtils_1.logEditToolResult)(this.logService, options.chatRequestId, { input: options.input.input, success: false, healed });
            if (notebookUri) {
                // We have found issues with the patches generated by Model for XML, Jupytext
                // Possible there are other issues with other formats as well.
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart('Applying patch failed with error: ' + error.message),
                    new vscodeTypes_1.LanguageModelTextPart(`Use the ${toolNames_1.ToolName.EditNotebook} tool to edit notebook files such as ${notebookUri}.`),
                ]);
            }
            else {
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart('Applying patch failed with error: ' + error.message),
                ]);
            }
        }
        try {
            // Map to track edit survival sessions by document URI
            const editSurvivalTrackers = new map_1.ResourceMap();
            // Set up a response stream that will collect AI edits for telemetry
            let responseStream = this._promptContext.stream;
            if (this._promptContext.stream) {
                responseStream = chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(this._promptContext.stream, (part) => {
                    if (part instanceof vscodeTypes_1.ChatResponseTextEditPart && !this.notebookService.hasSupportedNotebooks(part.uri)) {
                        const tracker = editSurvivalTrackers.get(part.uri);
                        if (tracker) {
                            tracker.collectAIEdits(part.edits);
                        }
                    }
                });
            }
            const resourceToOperation = new map_1.ResourceMap();
            const workspaceEdit = new vscodeTypes_1.WorkspaceEdit();
            const notebookEdits = new map_1.ResourceMap();
            for (const [file, changes] of Object.entries(commit.changes)) {
                let path = (0, toolUtils_1.resolveToolInputPath)(file, this.promptPathRepresentationService);
                await this.instantiationService.invokeFunction(accessor => (0, toolUtils_1.assertFileNotContentExcluded)(accessor, path));
                switch (changes.type) {
                    case parser_1.ActionType.ADD: {
                        if (changes.newContent) {
                            workspaceEdit.insert(path, new vscodeTypes_1.Position(0, 0), changes.newContent);
                            resourceToOperation.set(path, { action: parser_1.ActionType.ADD });
                        }
                        break;
                    }
                    case parser_1.ActionType.DELETE: {
                        workspaceEdit.deleteFile(path);
                        resourceToOperation.set(path, { action: parser_1.ActionType.DELETE });
                        break;
                    }
                    case parser_1.ActionType.UPDATE: {
                        const document = await this.instantiationService.invokeFunction(editFileToolUtils_1.openDocumentAndSnapshot, this._promptContext, path);
                        let updated;
                        if (document instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot) {
                            // We have found issues with the patches generated by Model for XML, Jupytext
                            // Possible there are other issues with other formats as well.
                            try {
                                const result = await this.generateUpdateNotebookDocumentEdit(document, path, file, changes);
                                notebookEdits.set(result.path, result.edits);
                                path = result.path;
                                if (changes.newContent) {
                                    updated = notebookDocumentSnapshot_1.NotebookDocumentSnapshot.fromNewText(changes.newContent, document);
                                }
                            }
                            catch (error) {
                                this.sendApplyPatchTelemetry('invalidNotebookEdit', options, document.getText(), !!healed, true, error);
                                return new vscodeTypes_1.LanguageModelToolResult([
                                    new vscodeTypes_1.LanguageModelTextPart('Applying patch failed with error: ' + error.message),
                                    new vscodeTypes_1.LanguageModelTextPart(`Use the ${toolNames_1.ToolName.EditNotebook} tool to edit notebook files such as ${file}.`),
                                ]);
                            }
                        }
                        else {
                            path = await this.generateUpdateTextDocumentEdit(document, file, changes, workspaceEdit);
                            if (changes.newContent) {
                                updated = textDocumentSnapshot_1.TextDocumentSnapshot.fromNewText(changes.newContent, document);
                            }
                        }
                        resourceToOperation.set(path, { action: parser_1.ActionType.UPDATE, updated });
                        break;
                    }
                }
            }
            const files = [];
            const handledNotebookUris = new map_1.ResourceSet();
            const editEntires = workspaceEdit.entries();
            if (notebookEdits.size > 0) {
                for (const uri of notebookEdits.keys()) {
                    editEntires.push([uri, []]);
                }
            }
            for (let [uri, textEdit] of editEntires) {
                // Get the notebook URI if the document is a notebook or a notebook cell.
                const notebookUri = (0, notebooks_1.findNotebook)(uri, this.workspaceService.notebookDocuments)?.uri ?? (this.notebookService.hasSupportedNotebooks(uri) ? uri : undefined);
                if (notebookUri) {
                    if (handledNotebookUris.has(notebookUri)) {
                        continue;
                    }
                    handledNotebookUris.add(notebookUri);
                }
                uri = notebookUri || uri;
                const existingDiagnostics = this.languageDiagnosticsService.getDiagnostics(uri);
                // Initialize edit survival tracking for text documents
                const existsOnDisk = await this.instantiationService.invokeFunction(editFileToolUtils_1.canExistingFileBeEdited, uri);
                if (existsOnDisk) {
                    const document = notebookUri ?
                        await this.workspaceService.openNotebookDocumentAndSnapshot(notebookUri, this.alternativeNotebookContent.getFormat(this._promptContext?.request?.model)) :
                        await this.workspaceService.openTextDocumentAndSnapshot(uri);
                    if (document instanceof textDocumentSnapshot_1.TextDocumentSnapshot) {
                        const tracker = this._editSurvivalTrackerService.initialize(document.document);
                        editSurvivalTrackers.set(uri, tracker);
                    }
                }
                if (notebookUri) {
                    responseStream.notebookEdit(notebookUri, []);
                    const edits = notebookEdits.get(notebookUri) || [];
                    for (const edit of edits) {
                        if (Array.isArray(edit)) {
                            responseStream.textEdit(edit[0], edit[1]);
                        }
                        else {
                            responseStream.notebookEdit(notebookUri, edit);
                        }
                    }
                    responseStream.notebookEdit(notebookUri, true);
                    (0, editNotebookTool_1.sendEditNotebookTelemetry)(this.telemetryService, this.endpointProvider, 'applyPatch', notebookUri, this._promptContext.requestId, options.model ?? this._promptContext.request?.model);
                }
                else {
                    this._promptContext.stream.markdown('\n```\n');
                    this._promptContext.stream.codeblockUri(notebookUri || uri, true);
                    responseStream.textEdit(uri, textEdit);
                    responseStream.textEdit(uri, true);
                    this._promptContext.stream.markdown('\n' + '```\n');
                }
                const opResult = resourceToOperation.get(uri);
                if (opResult?.action === parser_1.ActionType.UPDATE && opResult.updated) {
                    this._promptContext.turnEditedDocuments ??= new map_1.ResourceMap();
                    this._promptContext.turnEditedDocuments.set(uri, opResult.updated);
                }
                files.push({ uri, isNotebook: !!notebookUri, existingDiagnostics, operation: opResult?.action ?? parser_1.ActionType.UPDATE });
            }
            if (healed && files.length) {
                files[0].healed = healed;
            }
            (0, async_1.timeout)(2000).then(() => {
                // The tool can't wait for edits to be applied, so just wait before starting the survival tracker.
                // TODO@roblourens see if this improves the survival metric, find a better fix.
                for (const tracker of editSurvivalTrackers.values()) {
                    tracker.startReporter(res => {
                        /* __GDPR__
                            "applyPatch.trackEditSurvival" : {
                                "owner": "joyceerhl",
                                "comment": "Tracks how much percent of the AI edits survived after 5 minutes of accepting",
                                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                                "requestSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source from where the request was made" },
                                "mapper": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The code mapper used strategy" },
                                "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the AI edit is still present in the document." },
                                "survivalRateNoRevert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the ranges the AI touched ended up being reverted." },
                                "didBranchChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the branch changed in the meantime. If the branch changed (value is 1), this event should probably be ignored." },
                                "timeDelayMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time delay between the user accepting the edit and measuring the survival rate." }
                            }
                        */
                        res.telemetryService.sendMSFTTelemetryEvent('applyPatch.trackEditSurvival', { requestId: this._promptContext?.requestId, requestSource: 'agent', mapper: 'applyPatchTool' }, {
                            survivalRateFourGram: res.fourGram,
                            survivalRateNoRevert: res.noRevert,
                            timeDelayMs: res.timeDelayMs,
                            didBranchChange: res.didBranchChange ? 1 : 0,
                        });
                        res.telemetryService.sendGHTelemetryEvent('applyPatch/trackEditSurvival', {
                            headerRequestId: this._promptContext?.requestId,
                            requestSource: 'agent',
                            mapper: 'applyPatchTool'
                        }, {
                            survivalRateFourGram: res.fourGram,
                            survivalRateNoRevert: res.noRevert,
                            timeDelayMs: res.timeDelayMs,
                            didBranchChange: res.didBranchChange ? 1 : 0,
                        });
                    });
                }
            });
            // Return the result
            const isInlineChat = this._promptContext.request?.location2 instanceof vscodeTypes_1.ChatRequestEditorData;
            const isNotebook = editEntires.length === 1 ? handledNotebookUris.size === 1 : undefined;
            this.sendApplyPatchTelemetry('success', options, undefined, !!healed, isNotebook);
            const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
                new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, editFileToolResult_1.EditFileResult, { files, diagnosticsTimeout: isInlineChat ? -1 : 2000, toolName: toolNames_1.ToolName.ApplyPatch, requestId: options.chatRequestId, model: options.model }, options.tokenizationOptions ?? {
                    tokenBudget: 1000,
                    countTokens: (t) => Promise.resolve(t.length * 3 / 4)
                }, token))
            ]);
            result.hasError = files.some(f => f.error);
            return result;
        }
        catch (error) {
            const isNotebook = Object.values(docText).length === 1 ? (!!(0, arraysFind_1.mapFindFirst)(Object.values(docText), v => v.notebookUri)) : undefined;
            // TODO parser.ts could annotate DiffError with a telemetry detail if we want
            this.sendApplyPatchTelemetry('error', options, undefined, false, isNotebook, error);
            const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
                new vscodeTypes_1.LanguageModelTextPart('Applying patch failed with error: ' + error.message),
            ]);
            result.hasError = true;
            return result;
        }
    }
    /**
     * Attempts to 'heal' a patch which we failed to apply by sending it a small
     * cheap model (4o mini) to revise it. This is generally going to be cheaper
     * than going to whatever big model the user has selected for it to try
     * and do another turn.
     */
    async healCommit(patch, docs, explanation, token) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const prompt = await promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, HealPatchPrompt, {
            patch,
            explanation,
            docs
        }).render(undefined, token);
        const fetchResult = await endpoint.makeChatRequest2({
            debugName: 'healApplyPatch',
            messages: prompt.messages,
            finishedCb: undefined,
            location: commonTypes_1.ChatLocation.Other,
            enableRetryOnFilter: true
        }, token);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return undefined;
        }
        const patchStart = fetchResult.value.lastIndexOf(parseApplyPatch_1.PATCH_PREFIX);
        if (patchStart === -1) {
            return undefined;
        }
        const patchEnd = fetchResult.value.indexOf(parseApplyPatch_1.PATCH_SUFFIX, patchStart);
        return patchEnd === -1 ? fetchResult.value.slice(patchStart) : fetchResult.value.slice(patchStart, patchEnd + parseApplyPatch_1.PATCH_SUFFIX.length);
    }
    async buildCommitWithHealing(model, patch, docText, explanation, token) {
        try {
            const result = await this.buildCommit(patch, docText);
            if (model) {
                this.editToolLearningService.didMakeEdit(model, toolNames_1.ToolName.ApplyPatch, true);
            }
            return result;
        }
        catch (error) {
            if (!(error instanceof parser_1.DiffError)) {
                throw error;
            }
            if (model) {
                this.editToolLearningService.didMakeEdit(model, toolNames_1.ToolName.ApplyPatch, false);
            }
            let success = true;
            let healed;
            try {
                healed = await this.healCommit(patch, docText, explanation, token);
                if (!healed) {
                    throw error;
                }
                const { commit } = await this.buildCommit(healed, docText);
                return { commit, healed };
            }
            catch (healedError) {
                success = false;
                if (healed) {
                    throw new HealedError(error, healedError, healed);
                }
                else {
                    throw error;
                }
            }
            finally {
                /* __GDPR__
                    "applyPatchHealRate" : {
                        "owner": "connor4312",
                        "comment": "Records how correct the healing of a patch was",
                        "success": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the input was healed" }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('applyPatchHealRate', {}, {
                    success: success ? 1 : 0,
                });
            }
        }
    }
    async buildCommit(patch, docText) {
        const commit = await (0, parser_1.processPatch)(patch, async (uri) => {
            const vscodeUri = (0, toolUtils_1.resolveToolInputPath)(uri, this.promptPathRepresentationService);
            if (this.notebookService.hasSupportedNotebooks(vscodeUri)) {
                const notebookUri = (0, notebooks_1.findNotebook)(vscodeUri, this.workspaceService.notebookDocuments)?.uri || vscodeUri;
                const altDoc = await this.workspaceService.openNotebookDocumentAndSnapshot(notebookUri, this.alternativeNotebookContent.getFormat(this._promptContext?.request?.model));
                docText[vscodeUri.toString()] = { text: altDoc.getText(), notebookUri };
                return new abstractText_1.StringTextDocumentWithLanguageId(altDoc.getText(), altDoc.languageId);
            }
            else {
                const textDocument = await this.workspaceService.openTextDocument(vscodeUri);
                docText[vscodeUri.toString()] = { text: textDocument.getText() };
                return textDocument;
            }
        });
        return { commit, docTexts: docText };
    }
    async sendApplyPatchTelemetry(outcome, options, file, healed, isNotebook, unexpectedError) {
        const model = options.model && (await this.endpointProvider.getChatEndpoint(options.model)).model;
        /* __GDPR__
            "applyPatchToolInvoked" : {
                "owner": "roblourens",
                "comment": "The apply_patch tool was invoked",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "interactionId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current interaction." },
                "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the invocation was successful, or a failure reason" },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                "healed": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the input was healed" },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the input was a notebook, 1 = yes, 0 = no, other = Unknown" },
                "error": { "classification": "CallstackOrException", "purpose": "FeatureInsight", "comment": "Unexpected error that occurrs during application" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('applyPatchToolInvoked', {
            requestId: options.chatRequestId,
            interactionId: options.chatRequestId,
            outcome,
            model,
            error: unexpectedError?.stack || unexpectedError?.message,
        }, {
            healed: healed ? 1 : 0,
            isNotebook: isNotebook ? 1 : (isNotebook === false ? 0 : -1), // -1 means unknown
        });
        this.telemetryService.sendEnhancedGHTelemetryEvent('applyPatchTool', (0, telemetry_1.multiplexProperties)({
            headerRequestId: options.chatRequestId,
            baseModel: model,
            messageText: file,
            completionTextJson: options.input.input,
            postProcessingOutcome: outcome,
            healed: String(healed),
        }));
    }
    async resolveInput(input, promptContext) {
        this._promptContext = promptContext;
        return input;
    }
    async prepareInvocation(options, token) {
        const uris = [...(0, parser_1.identify_files_needed)(options.input.input), ...(0, parser_1.identify_files_added)(options.input.input)].map(f => uri_1.URI.file(f));
        return this.instantiationService.invokeFunction(editFileToolUtils_1.createEditConfirmation, uris, (urisNeedingConfirmation) => this.generatePatchConfirmationDetails(options, urisNeedingConfirmation, token));
    }
    async generatePatchConfirmationDetails(options, urisNeedingConfirmation, token) {
        const instantiationService = this.instantiationService;
        const promptPathRepresentationService = this.promptPathRepresentationService;
        // Process the patch and cache it for later use in invoke()
        const docTexts = {};
        const processPromise = (async () => {
            const { commit, healed } = await this.buildCommitWithHealing(this._promptContext?.request?.model, options.input.input, docTexts, options.input.explanation, token);
            return { commit, docTexts, healed };
        })();
        // Cache using stringified params
        this.lastProcessed = { input: options.input.input, output: processPromise };
        const { commit } = await processPromise;
        // Create a set of URIs needing confirmation for quick lookup
        const urisNeedingConfirmationSet = new map_1.ResourceSet(urisNeedingConfirmation);
        // Generate diffs for all file changes in parallel
        const diffResults = await Promise.all(Object.entries(commit.changes).map(async ([file, changes]) => {
            const uri = (0, toolUtils_1.resolveToolInputPath)(file, promptPathRepresentationService);
            if (!urisNeedingConfirmationSet.has(uri)) {
                return;
            }
            return await instantiationService.invokeFunction(editFileToolUtils_1.formatDiffAsUnified, uri, changes.oldContent || '', changes.newContent || '');
        }));
        const diffParts = diffResults.filter(types_1.isDefined);
        return diffParts.length > 0 ? diffParts.join('\n\n') : 'No changes detected.';
    }
};
exports.ApplyPatchTool = ApplyPatchTool;
exports.ApplyPatchTool = ApplyPatchTool = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, toolsService_1.IToolsService),
    __param(4, notebookService_1.INotebookService),
    __param(5, fileSystemService_1.IFileSystemService),
    __param(6, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(7, editSurvivalTrackerService_1.IEditSurvivalTrackerService),
    __param(8, alternativeContent_1.IAlternativeNotebookContentService),
    __param(9, alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator),
    __param(10, telemetry_1.ITelemetryService),
    __param(11, endpointProvider_1.IEndpointProvider),
    __param(12, editToolLearningService_1.IEditToolLearningService),
    __param(13, logService_1.ILogService)
], ApplyPatchTool);
class HealedError extends Error {
    constructor(originalError, errorWithHealing, healedPatch) {
        super(`Healed error: ${errorWithHealing}, original error: ${originalError}`);
        this.originalError = originalError;
        this.errorWithHealing = errorWithHealing;
        this.healedPatch = healedPatch;
    }
}
toolsRegistry_1.ToolRegistry.registerTool(ApplyPatchTool);
const applyPatchExample = `*** Begin Patch
*** Update File: /Users/someone/pygorithm/searching/binary_search.py
@@ class BaseClass
@@     def search():
         results = get_results()
-        results
+        return results
@@ class Subclass
@@     def search():
-        pass
+        raise NotImplementedError()
*** End Patch`;
class HealPatchPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "You are an expert in file editing. The user has provided a patch that failed to apply because it references context that was not found precisely in the file. Your task is to fix the patch so it can be applied successfully.",
                vscpp(tag_1.Tag, { name: 'patchFormat' },
                    "The expected format for the patch is a diff format that modifications and include contextual lines around the changes. The patch should be formatted as follows:",
                    vscpp("br", null),
                    vscpp(defaultAgentInstructions_1.ApplyPatchFormatInstructions, null),
                    "The output MUST NOT actually include the string \"[3 lines of pre-context]\" or \"[3 lines of post-context]\" -- include the actual lines of context from the file. An example of a patch you might generate is shown below.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "```",
                    vscpp("br", null),
                    applyPatchExample,
                    vscpp("br", null),
                    "```",
                    vscpp("br", null)),
                vscpp(tag_1.Tag, { name: 'instructions' },
                    "1. Think carefully. Examine the provided patch, the included intent, the contents of the files it references.",
                    vscpp("br", null),
                    "2. Determine the locations in the files where the user intended the patch to be applied. Lines that don't begin with a plus \"+\" or \"-\" sign must be found verbatim in the original file, and ONLY lines to be added or removed should begin with a plus or minus sign respectively. It is very likely this rule is being broken by the invalid patch.",
                    vscpp("br", null),
                    "3. Generate the ENTIRE corrected patch. Do not omit anything.",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 1 },
                "The goal of the patch is: ",
                this.props.explanation,
                vscpp("br", null),
                vscpp("br", null),
                "The patch I want to apply is:",
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'invalidPatch' },
                    vscpp("br", null),
                    this.props.patch,
                    vscpp("br", null)),
                vscpp("br", null),
                vscpp("br", null),
                "The referenced files are:",
                vscpp("br", null),
                Object.entries(this.props.docs).map(([file, { text }]) => vscpp(safeElements_1.CodeBlock, { code: text, uri: uri_1.URI.parse(file), priority: 1, lineBasedPriority: true }))));
    }
}
//# sourceMappingURL=applyPatchTool.js.map