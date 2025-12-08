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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewNotebookResponseProcessor = void 0;
exports.newNotebookCodeCell = newNotebookCodeCell;
exports.improveNotebookCodeCell = improveNotebookCodeCell;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const logService_1 = require("../../../platform/log/common/logService");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../util/common/markdown");
const notebooks_1 = require("../../../util/common/notebooks");
const async_1 = require("../../../util/vs/base/common/async");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const streamingEdits_1 = require("../../prompt/node/streamingEdits");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const newNotebook_1 = require("../../prompts/node/panel/newNotebook");
const editNotebookTool_1 = require("../../tools/node/editNotebookTool");
const newNotebookTool_1 = require("../../tools/node/newNotebookTool");
let NewNotebookResponseProcessor = class NewNotebookResponseProcessor {
    constructor(endpoint, context, instantiationService, workspaceService, noteBookEditGenerator, logService, telemetryService) {
        this.endpoint = endpoint;
        this.context = context;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.noteBookEditGenerator = noteBookEditGenerator;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.messageText = '';
        this.stagedTextToApply = '';
        this.reporting = true;
        this._resolvedContentDeferredPromise = new async_1.DeferredPromise();
        this._incodeblock = false;
        this._presentCodeblockProgress = false;
    }
    async processResponse(context, inputStream, outputStream, token) {
        const { turn, messages } = context;
        for await (const { delta } of inputStream) {
            if (token.isCancellationRequested) {
                return;
            }
            this.applyDelta(delta.text, turn, outputStream);
        }
        await this.pushCommands(messages, outputStream, token);
    }
    applyDeltaToTurn(textDelta, turn) {
        this.messageText += textDelta;
    }
    applyDeltaToProgress(textDelta, progress) {
        progress.markdown(textDelta);
    }
    applyDelta(textDelta, turn, progress) {
        if (!this.reporting) {
            this.applyDeltaToTurn(textDelta, turn);
            return;
        }
        textDelta = this.stagedTextToApply + textDelta;
        if (this._incodeblock) {
            const codeblockEnd = textDelta.indexOf('```');
            if (codeblockEnd === -1) {
                // didn't find closing yet
                this.stagedTextToApply = textDelta;
                this.applyDeltaToTurn('', turn);
                if (!this._presentCodeblockProgress) {
                    this._presentCodeblockProgress = true;
                    progress.progress(l10n.t('Thinking ...'));
                }
                return;
            }
            else {
                // found closing
                this._incodeblock = false;
                textDelta = textDelta.substring(0, codeblockEnd) + '```';
                try {
                    this.applyDeltaToTurn(textDelta, turn);
                }
                catch (_e) {
                    // const errorMessage = (e as Error)?.message ?? 'Unknown error';
                }
                finally {
                    this.reporting = false;
                    this.stagedTextToApply = '';
                    this._resolvedContentDeferredPromise.complete(new vscodeTypes_1.ChatResponseMarkdownPart(''));
                }
                return;
            }
        }
        const codeblockStart = textDelta.indexOf('```');
        if (codeblockStart !== -1) {
            this._incodeblock = true;
            const codeblockEnd = textDelta.indexOf('```', codeblockStart + 3);
            if (codeblockEnd !== -1) {
                this._incodeblock = false;
                this.applyDeltaToProgress(textDelta.substring(0, codeblockStart), progress);
                this.applyDeltaToProgress(textDelta.substring(codeblockEnd + 3), progress);
                this.applyDeltaToTurn(textDelta, turn);
                this.reporting = false;
                this.stagedTextToApply = '';
                return;
            }
            else {
                const textToReport = textDelta.substring(0, codeblockStart);
                this.applyDeltaToProgress(textToReport, progress);
                this.applyDeltaToTurn(textDelta, turn);
                this.stagedTextToApply = '';
                if (!this._presentCodeblockProgress) {
                    this._presentCodeblockProgress = true;
                    progress.progress(l10n.t('Thinking ...'));
                }
                this._resolvedContentDeferredPromise.p.then((p) => progress.push(p));
                return;
            }
        }
        // We have no stop word or partial, so apply the text to the progress and turn
        this.applyDeltaToProgress(textDelta, progress);
        this.applyDeltaToTurn(textDelta, turn);
        this.stagedTextToApply = '';
    }
    async pushCommands(history, outputStream, token) {
        try {
            const outline = (0, notebooks_1.extractNotebookOutline)(this.messageText);
            if (outline) {
                const mockContext = this.context ?? {
                    query: '',
                    history: [],
                    chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                };
                const { messages: generateMessages } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, this.endpoint, newNotebookTool_1.NewNotebookToolPrompt, {
                    outline: outline,
                    promptContext: mockContext,
                    originalCreateNotebookQuery: mockContext.query,
                    availableTools: this.context?.tools?.availableTools
                });
                const sourceStream = new async_1.AsyncIterableSource();
                const newNotebook = new lazy_1.Lazy(async () => {
                    const notebook = await this.workspaceService.openNotebookDocument('jupyter-notebook');
                    const updateMetadata = vscodeTypes_1.NotebookEdit.updateNotebookMetadata(Object.assign({ new_copilot_notebook: true }, notebook.metadata));
                    const workspaceEdit = new vscodeTypes_1.WorkspaceEdit();
                    workspaceEdit.set(notebook.uri, [updateMetadata]);
                    await this.workspaceService.applyEdit(workspaceEdit);
                    return notebook;
                });
                const sourceLines = filterFilePathFromCodeBlock2((0, streamingEdits_1.streamLines)(sourceStream.asyncIterable)
                    .filter(streamingEdits_1.LineFilters.createCodeBlockFilter())
                    .map(line => {
                    newNotebook.value; // force the notebook to be created
                    return line;
                }));
                const created = this.createNewNotebook2(sourceLines, newNotebook.value, token);
                async function finishedCb(text, index, delta) {
                    sourceStream.emitOne(delta.text);
                    return undefined;
                }
                const generateResponse = await this.endpoint.makeChatRequest('newNotebookCodeCell', generateMessages, finishedCb, token, commonTypes_1.ChatLocation.Panel);
                sourceStream.resolve();
                if (generateResponse.type !== commonTypes_1.ChatFetchResponseType.Success) {
                    return [];
                }
                await created;
            }
            else {
                this.logService.error('No Notebook outline found: ', this.messageText);
            }
        }
        catch (ex) {
            this.logService.error('Error creating new notebook: ', ex);
        }
        return [];
    }
    // different than the one in the tool, this one can't rely on the output stream workaround
    async createNewNotebook2(lines, newNotebook, token) {
        const promises = [];
        const telemetryOptions = {
            source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.newNotebookIntent,
            requestId: this.context?.requestId,
            model: this.endpoint.model
        };
        for await (const edit of this.noteBookEditGenerator.generateNotebookEdits(vscodeTypes_1.Uri.file('empty.ipynb'), lines, telemetryOptions, token)) {
            if (!Array.isArray(edit)) {
                const notebook = await newNotebook;
                const workspaceEdit = new vscodeTypes_1.WorkspaceEdit();
                workspaceEdit.set(notebook.uri, [edit]);
                promises.push(Promise.resolve(this.workspaceService.applyEdit(workspaceEdit)));
            }
        }
        await Promise.all(promises);
        (0, editNotebookTool_1.sendEditNotebookTelemetry)(this.telemetryService, undefined, 'newNotebookIntent', (await newNotebook).uri, this.context?.requestId, undefined, this.endpoint);
        return newNotebook;
    }
};
exports.NewNotebookResponseProcessor = NewNotebookResponseProcessor;
exports.NewNotebookResponseProcessor = NewNotebookResponseProcessor = __decorate([
    __param(2, instantiation_1.IInstantiationService),
    __param(3, workspaceService_1.IWorkspaceService),
    __param(4, alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator),
    __param(5, logService_1.ILogService),
    __param(6, telemetry_1.ITelemetryService)
], NewNotebookResponseProcessor);
// different than the one in the tool, this one can't rely on the output stream workaround
function filterFilePathFromCodeBlock2(source) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        let index = -1;
        for await (const line of source) {
            index += 1;
            if (index === 0 && line.value.includes(markdown_1.filepathCodeBlockMarker)) {
                continue;
            }
            emitter.emitOne(line);
        }
    });
}
// @Yoyokrazy -- look at removing the following fn's as debt. newNb is likely not needed at minimum
async function newNotebookCodeCell(instantiationService, chatMLFetcher, endpoint, options, history, description, section, existingCode, languageId, uri, token) {
    const { messages } = await (0, promptRenderer_1.renderPromptElement)(instantiationService, endpoint, newNotebook_1.NewNotebookCodeGenerationPrompt, {
        history,
        description,
        section,
        existingCode,
        languageId,
        uri
    });
    const modelResponse = await endpoint.makeChatRequest('newNotebookCodeCell', messages, undefined, token, commonTypes_1.ChatLocation.Panel);
    if (modelResponse.type !== commonTypes_1.ChatFetchResponseType.Success) {
        return;
    }
    const codeBlocks = (0, markdown_1.extractCodeBlocks)(modelResponse.value);
    if (codeBlocks.length > 0) {
        return codeBlocks[0].code;
    }
    return modelResponse.value;
}
async function improveNotebookCodeCell(instantiationService, chatMLFetcher, endpoint, options, description, section, existingCode, code, languageId, uri, token) {
    const { messages } = await (0, promptRenderer_1.renderPromptElement)(instantiationService, endpoint, newNotebook_1.NewNotebookCodeImprovementPrompt, {
        description,
        section,
        existingCode,
        code,
        languageId,
        uri
    });
    const modelResponse = await endpoint.makeChatRequest('improveNotebookCodeCell', messages, undefined, token, commonTypes_1.ChatLocation.Panel);
    if (modelResponse.type !== commonTypes_1.ChatFetchResponseType.Success) {
        return;
    }
    return modelResponse.value;
}
//# sourceMappingURL=newNotebookIntent.js.map