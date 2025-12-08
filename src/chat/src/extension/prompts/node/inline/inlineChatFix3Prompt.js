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
exports.PatchEditFixReplyInterpreter = exports.InlineFix3Prompt = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const languageContextService_1 = require("../../../../platform/languageServer/common/languageContextService");
const logService_1 = require("../../../../platform/log/common/logService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const resources_1 = require("../../../../util/vs/base/common/resources");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const codeBlockProcessor_1 = require("../../../codeBlocks/node/codeBlockProcessor");
const fixSelection_1 = require("../../../context/node/resolvers/fixSelection");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const promptCraftingTypes_1 = require("../../../inlineChat/node/promptCraftingTypes");
const intents_1 = require("../../../prompt/node/intents");
const common_1 = require("../base/common");
const instructionMessage_1 = require("../base/instructionMessage");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const codeMapperService_1 = require("../codeMapper/codeMapperService");
const patchEditGeneration_1 = require("../codeMapper/patchEditGeneration");
const chatVariables_1 = require("../panel/chatVariables");
const codeBlockFormattingRules_1 = require("../panel/codeBlockFormattingRules");
const conversationHistory_1 = require("../panel/conversationHistory");
const customInstructions_1 = require("../panel/customInstructions");
const safeElements_1 = require("../panel/safeElements");
const diagnosticsContext_1 = require("./diagnosticsContext");
const inlineChatWorkspaceSearch_1 = require("./inlineChatWorkspaceSearch");
const languageServerContextPrompt_1 = require("./languageServerContextPrompt");
const summarizeDocument_1 = require("./summarizedDocument/summarizeDocument");
const summarizeDocumentHelpers_1 = require("./summarizedDocument/summarizeDocumentHelpers");
let InlineFix3Prompt = class InlineFix3Prompt extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, fileSystemService, parserService, languageDiagnosticsService, configurationService, instantiationService) {
        super(props);
        this.ignoreService = ignoreService;
        this.fileSystemService = fileSystemService;
        this.parserService = parserService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
    }
    async render(state, sizing) {
        const { document, wholeRange, fileIndentInfo, selection, language } = this.props.documentContext;
        const isIgnored = await this.ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        if ((0, notebooks_1.isNotebookCellOrNotebookChatInput)(document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineFix3PlusPrompt should not be used with a notebook!');
        }
        const inputDocCharLimit = (sizing.endpoint.modelMaxPromptTokens / 3) * 4; // consume one 3rd of the model window, estimating roughly 4 chars per token;
        let projectedDocument;
        let isSummarized = false;
        if (document.getText().length > inputDocCharLimit) {
            // only compute the summarized document if needed
            const structure = await (0, selectionContextHelpers_1.getStructure)(this.parserService, document, fileIndentInfo);
            projectedDocument = (0, summarizeDocumentHelpers_1.summarizeDocumentSync)(inputDocCharLimit, document, wholeRange, structure, { tryPreserveTypeChecking: true });
            isSummarized = true;
        }
        else {
            projectedDocument = new summarizeDocument_1.ProjectedDocument(document.getText(), stringEdit_1.StringEdit.empty, document.languageId);
        }
        const { query, history, chatVariables, } = this.props.promptContext;
        const { useWorkspaceChunksFromDiagnostics, useWorkspaceChunksFromSelection } = this.props.features;
        const adjustedSelection = projectedDocument.projectRange(selection);
        const selectedLinesContent = document.getText(new vscodeTypes_1.Range(selection.start.line, 0, selection.end.line + 1, 0)).trimEnd();
        const diagnostics = (0, fixSelection_1.findDiagnosticForSelectionAndPrompt)(this.languageDiagnosticsService, document.uri, selection, query);
        const enableCodeMapper = this.configurationService.getConfig(configurationService_1.ConfigKey.Internal.InlineChatUseCodeMapper);
        const replyInterpreter = enableCodeMapper ?
            this.instantiationService.createInstance(CodeMapperFixReplyInterpreter, document.uri) :
            this.instantiationService.createInstance(PatchEditFixReplyInterpreter, projectedDocument, document.uri, adjustedSelection);
        const GenerationRulesAndExample = enableCodeMapper ? CodeMapperRulesAndExample : PatchEditFixRulesAndExample;
        const InputCodeBlock = enableCodeMapper ? CodeMapperInputCodeBlock : patchEditGeneration_1.PatchEditInputCodeBlock;
        const renderedChatVariables = await (0, chatVariables_1.renderChatVariables)(chatVariables, this.fileSystemService);
        return (vscpp(vscppf, null,
            vscpp("references", { value: [new prompt_tsx_1.PromptReference(document.uri)] }),
            vscpp("meta", { value: new intents_1.ReplyInterpreterMetaData(replyInterpreter) }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "The user has a ",
                language.languageId,
                " file opened in a code editor.",
                vscpp("br", null),
                "The user expects you to propose a fix for one or more problems in that file.",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, historyPriority: 700, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "For the response always follow these instructions:",
                    vscpp("br", null),
                    "Describe in a single sentence how you would solve the problem. After that sentence, add an empty line. Then provide code changes or a terminal command to run.",
                    vscpp("br", null),
                    vscpp(GenerationRulesAndExample, null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 },
                vscpp(customInstructions_1.CustomInstructions /*priority={700}*/, { languageId: language.languageId, chatVariables: chatVariables }),
                vscpp(languageServerContextPrompt_1.LanguageServerContextPrompt, { priority: 700, document: document, position: selection.start, requestId: this.props.promptContext.requestId, source: languageContextService_1.KnownSources.fix }),
                vscpp(common_1.CompositeElement, { priority: 750 }, ...renderedChatVariables),
                vscpp(common_1.CompositeElement, { priority: 600 },
                    projectedDocument.text.length > 0 ?
                        vscpp(vscppf, null,
                            "I have the following code open in the editor, starting from line 1 to line ",
                            projectedDocument.lineCount,
                            ".",
                            vscpp("br", null)) :
                        vscpp(vscppf, null,
                            "I am in an empty file:",
                            vscpp("br", null)),
                    vscpp(InputCodeBlock, { uri: document.uri, languageId: language.languageId, code: projectedDocument.text, shouldTrim: false, isSummarized: isSummarized }),
                    vscpp("br", null)),
                vscpp(common_1.CompositeElement /*priority={500}*/, null, selection.isEmpty ?
                    vscpp(vscppf, null,
                        "I have the selection at line ",
                        adjustedSelection.start.line + 1,
                        ", column ",
                        adjustedSelection.start.character + 1,
                        vscpp("br", null)) :
                    vscpp(vscppf, null,
                        "I have currently selected from line ",
                        adjustedSelection.start.line + 1,
                        ", column ",
                        adjustedSelection.start.character + 1,
                        " to line ",
                        adjustedSelection.end.line + 1,
                        " column ",
                        adjustedSelection.end.character + 1,
                        ".",
                        vscpp("br", null))),
                vscpp(common_1.CompositeElement /*priority={500}*/, null, selectedLinesContent.length && !diagnostics.some(d => d.range.contains(selection)) &&
                    vscpp(vscppf, null,
                        "The content of the lines at the selection is",
                        vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: language.languageId, code: selectedLinesContent, shouldTrim: false }),
                        vscpp("br", null))),
                vscpp(diagnosticsContext_1.Diagnostics /*priority={500}*/, { documentContext: this.props.documentContext, diagnostics: diagnostics }),
                vscpp(inlineChatWorkspaceSearch_1.InlineChatWorkspaceSearch /*priority={200}*/, { diagnostics: diagnostics, documentContext: this.props.documentContext, useWorkspaceChunksFromDiagnostics: useWorkspaceChunksFromDiagnostics, useWorkspaceChunksFromSelection: useWorkspaceChunksFromSelection }),
                vscpp(chatVariables_1.ChatToolReferences, { promptContext: this.props.promptContext }),
                vscpp(tag_1.Tag, { name: 'userPrompt' },
                    vscpp(prompt_tsx_1.TextChunk /*priority={700}*/, null, "Please find a fix for my code so that the result is without any errors."),
                    vscpp(chatVariables_1.UserQuery, { chatVariables: chatVariables, query: query }),
                    vscpp("br", null)))));
    }
};
exports.InlineFix3Prompt = InlineFix3Prompt;
exports.InlineFix3Prompt = InlineFix3Prompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, fileSystemService_1.IFileSystemService),
    __param(3, parserService_1.IParserService),
    __param(4, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, instantiation_1.IInstantiationService)
], InlineFix3Prompt);
const exampleUri = vscodeTypes_1.Uri.file('/someFolder/myFile.cs');
class PatchEditFixRulesAndExample extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "When proposing to fix the problem by running a terminal command, write `",
            (0, patchEditGeneration_1.getCustomMarker)('TERMINAL'),
            "` and provide a code block that starts with ```bash and contains the terminal script inside.",
            vscpp("br", null),
            vscpp(patchEditGeneration_1.PatchEditRules, null),
            vscpp(tag_1.Tag, { name: 'example', priority: 100 },
                vscpp(tag_1.Tag, { name: 'user' },
                    "I have the following code open in the editor.",
                    vscpp("br", null),
                    vscpp(patchEditGeneration_1.PatchEditInputCodeBlock, { uri: exampleUri, languageId: 'csharp', code: ["// This is my class", "class C { }", "", "new C().Field = 9;"] })),
                vscpp(tag_1.Tag, { name: 'assistant' },
                    "The problem is that the class 'C' does not have a field or property named 'Field'. To fix this, you need to add a 'Field' property to the 'C' class.",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp(patchEditGeneration_1.PatchEditExamplePatch, { changes: [
                            {
                                uri: exampleUri,
                                find: ["// This is my class", "class C { }"],
                                replace: ["// This is my class", "class C {", "public int Field { get; set; }", "}"]
                            },
                            {
                                uri: exampleUri,
                                find: ["new C().Field = 9;"],
                                replace: ["// set the field to 9", "new C().Field = 9;"]
                            }
                        ] })))));
    }
}
let PatchEditFixReplyInterpreter = class PatchEditFixReplyInterpreter {
    constructor(projectedDocument, documentUri, adjustedSelection, logService, promptPathRepresentationService) {
        this.projectedDocument = projectedDocument;
        this.documentUri = documentUri;
        this.adjustedSelection = adjustedSelection;
        this.logService = logService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this._lastText = '';
        this._replyProcessor = (0, patchEditGeneration_1.getPatchEditReplyProcessor)(promptPathRepresentationService);
    }
    async processResponse(context, inputStream, outputStream, token) {
        let inFirstParagraph = true; // print only the frist paragraph
        let charactersSent = 0;
        let newText = '';
        for await (const part of inputStream) {
            if (token.isCancellationRequested) {
                return;
            }
            newText += part.delta.text;
            if (newText.length > this._lastText.length) {
                this._lastText = newText; // the new complete text
                if (inFirstParagraph) {
                    // test if the new text added made the first paragraph complete
                    const paragraph = this._replyProcessor.getFirstParagraph(newText);
                    if (paragraph.length > charactersSent) {
                        // still in the first paragraph
                        outputStream.markdown(paragraph.substring(charactersSent));
                        charactersSent = paragraph.length;
                    }
                    else {
                        // the first paragraph is complete
                        inFirstParagraph = false;
                        outputStream.markdown('\n\n');
                        outputStream.progress(l10n.t('Generating edits...'));
                    }
                }
            }
        }
        if (this._lastText.length === 0) {
            outputStream.warning(l10n.t('Copilot did not provide a response. Please try again.'));
            return;
        }
        const res = this._replyProcessor.process(this._lastText, this.projectedDocument.text, this.documentUri, this.adjustedSelection.start.line);
        if (res.otherSections.length) {
            for (const section of res.otherSections) {
                outputStream.markdown(section.content.join('\n\n'));
            }
        }
        if (res.otherPatches.length) {
            for (const patch of res.otherPatches) {
                if (patch.replace.length) {
                    const uri = this.promptPathRepresentationService.resolveFilePath(patch.filePath, this.documentUri.scheme);
                    if (uri) {
                        outputStream.markdown(patch.replace[0]);
                        outputStream.codeblockUri(uri);
                        outputStream.markdown(patch.replace.slice(1).join('\n'));
                    }
                    else {
                        outputStream.markdown(patch.replace.join('\n'));
                    }
                }
            }
        }
        let edits = res.edits;
        if (edits.length) {
            edits = this.projectedDocument.projectBackTextEdit(edits);
            if (res.edits.length !== edits.length) {
                res.annotations.push({ message: 'Some edits were not applied because they were out of bounds.', label: promptCraftingTypes_1.OutcomeAnnotationLabel.SUMMARIZE_CONFLICT, severity: 'error' });
            }
            else {
                const annot = this._validateTextEditProject(res.edits, edits, this.projectedDocument);
                if (annot) {
                    res.annotations.push(annot);
                }
            }
        }
        context.addAnnotations(res.annotations);
        if (edits.length) {
            outputStream.textEdit(this.documentUri, edits);
        }
        else if (!res.otherPatches.length && !res.otherSections.length) {
            outputStream.warning(l10n.t('The edit generation was not successful. Please try again.'));
        }
        if (res.annotations.length) {
            this.logService.info(`[inline fix] Problems generating edits: ${res.annotations.map(a => `${a.message} [${a.label}]`).join(', ')}, invalid patches: ${res.invalidPatches.length}`);
        }
    }
    _validateTextEditProject(edits, projectedBackEdits, projectedDocument) {
        for (let i = 0; i < edits.length; i++) {
            const projEditString = projectedDocument.positionOffsetTransformer.toOffsetRange(edits[i].range).substring(projectedDocument.text);
            const origEditString = projectedDocument.originalPositionOffsetTransformer.toOffsetRange(projectedBackEdits[i].range).substring(projectedDocument.originalText);
            if (projEditString !== origEditString) {
                return { message: `Problem projecting edits: '${projEditString}' does not match '${origEditString}' (projectecBack)`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PROJECTION, severity: 'error' };
            }
        }
        return undefined;
    }
};
exports.PatchEditFixReplyInterpreter = PatchEditFixReplyInterpreter;
exports.PatchEditFixReplyInterpreter = PatchEditFixReplyInterpreter = __decorate([
    __param(3, logService_1.ILogService),
    __param(4, promptPathRepresentationService_1.IPromptPathRepresentationService)
], PatchEditFixReplyInterpreter);
class CodeMapperInputCodeBlock extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(safeElements_1.CodeBlock, { uri: this.props.uri, languageId: this.props.languageId, code: Array.isArray(this.props.code) ? this.props.code.join('\n') : this.props.code, shouldTrim: this.props.shouldTrim, includeFilepath: true }));
    }
}
class CodeMapperRulesAndExample extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "When proposing to fix the problem by running a terminal command, provide a code block that starts with ```bash and contains the terminal script inside.",
            vscpp("br", null),
            vscpp(codeBlockFormattingRules_1.CodeBlockFormattingRules, null),
            vscpp(tag_1.Tag, { name: 'example', priority: 100 },
                vscpp(tag_1.Tag, { name: 'user' },
                    "I have the following code open in the editor.",
                    vscpp("br", null),
                    vscpp(CodeMapperInputCodeBlock, { uri: exampleUri, languageId: 'csharp', code: ["// This is my class", "class C { }", "", "new C().Field = 9;"].join('\n'), shouldTrim: false })),
                vscpp(tag_1.Tag, { name: 'assistant' },
                    "The problem is that the class 'C' does not have a field or property named 'Field'. To fix this, you need to add a 'Field' property to the 'C' class.",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp(CodeMapperInputCodeBlock, { uri: exampleUri, languageId: 'csharp', code: ["// This is my class", "class C {", "  public int Field { get; set; }", "}", ""].join('\n'), shouldTrim: false })))));
    }
}
let CodeMapperFixReplyInterpreter = class CodeMapperFixReplyInterpreter {
    constructor(documentUri, promptPathRepresentationService, codeMapperService) {
        this.documentUri = documentUri;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.codeMapperService = codeMapperService;
    }
    async processResponse(context, inputStream, outputStream, token) {
        let currentCodeBlock = undefined;
        let applyCodeBlock = false;
        let inFirstSentence = true;
        const codeMapperWork = [];
        const codeblockProcessor = new codeBlockProcessor_1.CodeBlockProcessor(path => {
            return this.promptPathRepresentationService.resolveFilePath(path);
        }, (markdown, codeBlockInfo, vulnerabilities) => {
            if (codeBlockInfo) {
                inFirstSentence = false;
                if (codeBlockInfo !== currentCodeBlock) {
                    // first time we see this code block
                    currentCodeBlock = codeBlockInfo;
                    applyCodeBlock = (0, resources_1.isEqual)(codeBlockInfo.resource, this.documentUri);
                    if (!applyCodeBlock && codeBlockInfo.resource) {
                        outputStream.codeblockUri(codeBlockInfo.resource);
                    }
                }
                if (applyCodeBlock) {
                    return;
                }
            }
            else {
                if (!inFirstSentence) {
                    return;
                }
            }
            if (vulnerabilities) {
                outputStream.markdownWithVulnerabilities(markdown, vulnerabilities);
            }
            else {
                outputStream.markdown(markdown);
            }
        }, codeBlock => {
            if ((0, codeBlockProcessor_1.isCodeBlockWithResource)(codeBlock) && (0, resources_1.isEqual)(codeBlock.resource, this.documentUri)) {
                const request = { codeBlock };
                outputStream.markdown('\n\n');
                outputStream.progress(l10n.t('Generating edits...'));
                const task = this.codeMapperService.mapCode(request, outputStream, { chatRequestId: context.turn.id, chatRequestSource: 'inline1Fix3', isAgent: false }, token).finally(() => {
                    if (!token.isCancellationRequested) {
                        // signal being done with this uri
                        outputStream.textEdit(codeBlock.resource, true);
                    }
                });
                codeMapperWork.push(task);
            }
        });
        for await (const { delta } of inputStream) {
            if (token.isCancellationRequested) {
                return;
            }
            codeblockProcessor.processMarkdown(delta.text, delta.codeVulnAnnotations?.map(a => ({ title: a.details.type, description: a.details.description })));
        }
        codeblockProcessor.flush();
        const results = await Promise.all(codeMapperWork);
        for (const result of results) {
            if (!result) {
                context.addAnnotations([{ severity: 'error', label: 'cancelled', message: 'CodeMapper cancelled' }]);
            }
            else if (result.annotations) {
                context.addAnnotations(result.annotations);
            }
        }
        for (const result of results) {
            if (result && result.errorDetails) {
                outputStream.warning(`CodeMapper error: ${result.errorDetails}`);
            }
        }
    }
};
CodeMapperFixReplyInterpreter = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(2, codeMapperService_1.ICodeMapperService)
], CodeMapperFixReplyInterpreter);
//# sourceMappingURL=inlineChatFix3Prompt.js.map