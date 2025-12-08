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
exports.CodeMapperFullRewritePrompt = exports.CodeMapperPatchRewritePrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const notebookDocumentSnapshot_1 = require("../../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const languages_1 = require("../../../../util/common/languages");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const common_1 = require("../base/common");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const summarizeDocument_1 = require("../inline/summarizedDocument/summarizeDocument");
const summarizeDocumentHelpers_1 = require("../inline/summarizedDocument/summarizeDocumentHelpers");
const codeBlockFormattingRules_1 = require("../panel/codeBlockFormattingRules");
const fileVariable_1 = require("../panel/fileVariable");
const safeElements_1 = require("../panel/safeElements");
const unsafeElements_1 = require("../panel/unsafeElements");
const codeMapper_1 = require("./codeMapper");
const patchEditGeneration_1 = require("./patchEditGeneration");
let CodeMapperPatchRewritePrompt = class CodeMapperPatchRewritePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, parserService) {
        super(props);
        this.ignoreService = ignoreService;
        this.parserService = parserService;
    }
    async render(state, sizing) {
        if ((0, codeMapper_1.isNewDocument)(this.props.request)) {
            // TODO@joyceerhl @aeschli remove the find/replace variant
            return;
        }
        const document = this.props.request.existingDocument;
        const isIgnored = await this.ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        const inputDocCharLimit = (sizing.endpoint.modelMaxPromptTokens / 3) * 4; // consume one 3rd of the model window, estimating roughly 4 chars per token;
        let projectedDocument;
        if (document.getText().length > inputDocCharLimit && document instanceof textDocumentSnapshot_1.TextDocumentSnapshot) { // TODO@rebornix @DonJayamanne handle large notebook document
            // only compute the summarized document if needed
            const structure = await (0, selectionContextHelpers_1.getStructure)(this.parserService, document, undefined);
            projectedDocument = (0, summarizeDocumentHelpers_1.summarizeDocumentSync)(inputDocCharLimit, document, undefined, structure, { tryPreserveTypeChecking: false });
        }
        else {
            projectedDocument = new summarizeDocument_1.ProjectedDocument(document.getText(), stringEdit_1.StringEdit.empty, document.languageId);
        }
        const exampleUri = vscodeTypes_1.Uri.file('/someFolder/myFile.ts');
        return (vscpp(vscppf, null,
            vscpp("references", { value: [new prompt_tsx_1.PromptReference(document.uri)] }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant that is specialized in applying code changes to an existing document.",
                vscpp("br", null),
                "I have a code block that represents a suggestion for a code change and I have a ",
                document.languageId,
                " file opened in a code editor.",
                vscpp("br", null),
                "I expect you to come up with code changes that apply the code block to the editor.",
                vscpp("br", null),
                "I want the changes to be applied in a way that is safe and does not break the existing code, is correctly indented and matching the code style.",
                vscpp("br", null),
                "For the response, always follow these instructions:",
                vscpp("br", null),
                "1. Analyse the code block, the content of the editor and the current selection to decide if the code block should replace existing code or is to be inserted.",
                vscpp("br", null),
                "2. A line comment with `",
                codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
                "` indicates a section of code that has not changed",
                vscpp("br", null),
                "3. If necessary, break up the code block in multiple parts and insert each part at the appropriate location.",
                vscpp("br", null),
                "4. If necessary, make changes to other parts in the editor so that the final result is valid, properly formatted and indented.",
                vscpp("br", null),
                "5. Finally, provide the code modifications",
                vscpp("br", null),
                vscpp(patchEditGeneration_1.PatchEditRules, null),
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                vscpp(tag_1.Tag, { name: 'example', priority: 100 },
                    vscpp(tag_1.Tag, { name: 'user' },
                        "I have the following code open in the editor.",
                        vscpp("br", null),
                        vscpp(patchEditGeneration_1.PatchEditInputCodeBlock, { uri: exampleUri, languageId: 'typescript', code: ["import { readFileSync } from 'fs';", "", "class C { }"] }),
                        vscpp("br", null),
                        "This is the code block that represents a suggestion for a code change:",
                        vscpp("br", null),
                        vscpp(unsafeElements_1.UnsafeCodeBlock, { code: "private _stream: Stream;", languageId: 'typescript', includeFilepath: false }),
                        vscpp("br", null),
                        "Please find out how the code block can be applied to the editor."),
                    vscpp(tag_1.Tag, { name: 'assistant' },
                        vscpp(patchEditGeneration_1.PatchEditExamplePatch, { changes: [
                                {
                                    uri: exampleUri,
                                    find: ["import { readFileSync } from 'fs';",],
                                    replace: ["import { readFileSync } from 'fs';", "import { Stream } from 'stream';"]
                                },
                                {
                                    uri: exampleUri,
                                    find: ["class C { }"],
                                    replace: ["class C {", "\tprivate _stream: Stream;", "}"]
                                },
                            ] })))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 },
                vscpp(common_1.CompositeElement /*priority={600} TODO@aeschli commented out for fixed prompt-tsx issue */, null,
                    projectedDocument.text.length > 0 ?
                        vscpp(vscppf, null,
                            "I have the following code open in the editor, starting from line 1 to line ",
                            projectedDocument.lineCount,
                            ".",
                            vscpp("br", null)) :
                        vscpp(vscppf, null,
                            "I am in an empty file:",
                            vscpp("br", null)),
                    vscpp(patchEditGeneration_1.PatchEditInputCodeBlock, { uri: document.uri, languageId: document.languageId, code: projectedDocument.text, shouldTrim: false }),
                    vscpp("br", null)),
                vscpp(CodeBlockChangeDescription, { markdownBeforeBlock: getLastSentence(this.props.request.markdownBeforeBlock) }),
                "This is the code block that represents a suggestion for a code change:",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: document.languageId, code: this.props.request.codeBlock, shouldTrim: false, includeFilepath: false }),
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'userPrompt' },
                    "Please find out how the code block can be applied to the editor. Provide the code changes in the format as described above.",
                    vscpp("br", null)))));
    }
};
exports.CodeMapperPatchRewritePrompt = CodeMapperPatchRewritePrompt;
exports.CodeMapperPatchRewritePrompt = CodeMapperPatchRewritePrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, parserService_1.IParserService)
], CodeMapperPatchRewritePrompt);
class CodeBlockChangeDescription extends prompt_tsx_1.PromptElement {
    render() {
        if (this.props.markdownBeforeBlock) {
            return (vscpp(vscppf, null,
                "This is the description of what the code block changes:",
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'changeDescription' }, this.props.markdownBeforeBlock),
                vscpp("br", null)));
        }
        return undefined;
    }
}
let CodeMapperFullRewritePrompt = class CodeMapperFullRewritePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, instantiationService) {
        super(props);
        this.ignoreService = ignoreService;
        this.instantiationService = instantiationService;
    }
    async render(state, sizing) {
        const shouldTrimCodeBlocks = this.props.shouldTrimCodeBlocks ?? false;
        if ((0, codeMapper_1.isNewDocument)(this.props.request)) {
            const validDocumentContext = [];
            for (const context of this.props.request.workingSet) {
                const isIgnored = await this.ignoreService.isCopilotIgnored(context.uri);
                if (!isIgnored) {
                    validDocumentContext.push(context);
                }
            }
            return (vscpp(vscppf, null,
                vscpp("references", { value: validDocumentContext.map(document => new prompt_tsx_1.PromptReference(document.uri)) }),
                vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                    "You are an AI programming assistant that is specialized in generating code for a new document.",
                    vscpp("br", null),
                    vscpp(safetyRules_1.LegacySafetyRules, null),
                    "The user has a code block that represents a suggestion for the contents of a single new file, and several other files opened in a code editor.",
                    vscpp("br", null),
                    "The provided files may contain code relevant to the new file. Consider them when generating the new file.",
                    vscpp("br", null),
                    "For the response, always follow these instructions:",
                    vscpp("br", null),
                    "1. Analyse the code block and the existing documents to decide which parts of the existing document should be incorporated in the generated code.",
                    vscpp("br", null),
                    "2. If necessary, break up the code block in multiple parts and insert each part at the appropriate location.",
                    vscpp("br", null),
                    "3. Preserve whitespace and newlines right after the parts of the file that you modify.",
                    vscpp("br", null),
                    "4. The final result must be syntactically valid, properly formatted, and correctly indented. It should not contain any ",
                    codeBlockFormattingRules_1.EXISTING_CODE_MARKER,
                    " comments.",
                    vscpp("br", null),
                    "5. Finally, provide the full contents of the new file.",
                    vscpp("br", null)),
                vscpp(prompt_tsx_1.UserMessage, { priority: 700 },
                    vscpp(prompt_tsx_1.PrioritizedList, { priority: 690, descending: true }, validDocumentContext.map(document => (document.lineCount === 0 ? undefined : vscpp(prompt_tsx_1.Chunk, null,
                        vscpp(vscppf, null,
                            "I have the following code from the file ",
                            document.uri.toString(),
                            " open in the editor, starting from line 1 to line ",
                            document.lineCount,
                            ".",
                            vscpp("br", null),
                            vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: document.languageId, code: document.getText(), shouldTrim: shouldTrimCodeBlocks }),
                            vscpp("br", null)))))),
                    vscpp(prompt_tsx_1.Chunk, { priority: 695 },
                        vscpp(CodeBlockChangeDescription, { markdownBeforeBlock: this.props.request.markdownBeforeBlock }),
                        "This is the code block that represents the suggested code change:",
                        vscpp("br", null),
                        vscpp(safeElements_1.CodeBlock, { uri: this.props.request.uri, languageId: (0, languages_1.getLanguageForResource)(this.props.request.uri).languageId, code: this.props.request.codeBlock, shouldTrim: shouldTrimCodeBlocks }),
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'userPrompt' }, "Provide the contents of the new file."))),
                this.props.inProgressRewriteContent && vscpp(vscppf, null,
                    vscpp(prompt_tsx_1.AssistantMessage, { priority: 800 }, this.props.inProgressRewriteContent),
                    vscpp(prompt_tsx_1.UserMessage, { priority: 900 }, "Please continue providing the next part of the response."))));
        }
        const document = this.props.request.existingDocument;
        const isIgnored = await this.ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        const summarized = document instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot ?
            await this.instantiationService.createInstance(summarizeDocumentHelpers_1.NotebookDocumentSummarizer).summarizeDocument(document, undefined, undefined, sizing.tokenBudget, {
                costFnOverride: fileVariable_1.fileVariableCostFn,
            }) :
            await this.instantiationService.createInstance(summarizeDocumentHelpers_1.DocumentSummarizer).summarizeDocument(document, undefined, undefined, sizing.tokenBudget, {
                costFnOverride: fileVariable_1.fileVariableCostFn,
            });
        const code = summarized.text;
        return (vscpp(vscppf, null,
            vscpp("references", { value: [new prompt_tsx_1.PromptReference(document.uri)] }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant that is specialized in applying code changes to an existing document.",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null),
                "The user has a code block that represents a suggestion for a code change and a ",
                document.languageId,
                " file opened in a code editor.",
                vscpp("br", null),
                "Rewrite the existing document to fully incorporate the code changes in the provided code block.",
                vscpp("br", null),
                "For the response, always follow these instructions:",
                vscpp("br", null),
                "1. Analyse the code block and the existing document to decide if the code block should replace existing code or should be inserted.",
                vscpp("br", null),
                "2. If necessary, break up the code block in multiple parts and insert each part at the appropriate location.",
                vscpp("br", null),
                "3. Preserve whitespace and newlines right after the parts of the file that you modify.",
                vscpp("br", null),
                "4. The final result must be syntactically valid, properly formatted, and correctly indented. It should not contain any ...existing code... comments.",
                vscpp("br", null),
                "5. Finally, provide the fully rewritten file. You must output the complete file.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 },
                document.lineCount > 0 ?
                    vscpp(vscppf, null,
                        "I have the following code open in the editor, starting from line 1 to line ",
                        document.lineCount,
                        ".",
                        vscpp("br", null),
                        vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: document.languageId, code: code, shouldTrim: shouldTrimCodeBlocks }),
                        vscpp("br", null)) :
                    vscpp(vscppf, null, "I am in an empty editor."),
                vscpp(CodeBlockChangeDescription, { markdownBeforeBlock: this.props.request.markdownBeforeBlock }),
                "This is the code block that represents the suggested code change:",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: document.languageId, code: this.props.request.codeBlock, shouldTrim: shouldTrimCodeBlocks }),
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'userPrompt' }, "Provide the fully rewritten file, incorporating the suggested code change. You must produce the complete file.")),
            this.props.inProgressRewriteContent && vscpp(vscppf, null,
                vscpp(prompt_tsx_1.AssistantMessage, { priority: 800 }, this.props.inProgressRewriteContent),
                vscpp(prompt_tsx_1.UserMessage, { priority: 900 }, "Please continue providing the next part of the response."))));
    }
};
exports.CodeMapperFullRewritePrompt = CodeMapperFullRewritePrompt;
exports.CodeMapperFullRewritePrompt = CodeMapperFullRewritePrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService)
], CodeMapperFullRewritePrompt);
function getLastSentence(markdownBeforeBlock) {
    if (markdownBeforeBlock) {
        const whitespaces = [32 /* CharCode.Space */, 9 /* CharCode.Tab */, 10 /* CharCode.LineFeed */, 13 /* CharCode.CarriageReturn */];
        const newlines = [10 /* CharCode.LineFeed */, 13 /* CharCode.CarriageReturn */];
        let end = markdownBeforeBlock.length;
        while (end > 0 && whitespaces.includes(markdownBeforeBlock.charCodeAt(end - 1))) {
            end--;
        }
        let start = end;
        while (start > 0 && !newlines.includes(markdownBeforeBlock.charCodeAt(start - 1))) {
            start--;
        }
        if (start < end) {
            return markdownBeforeBlock.substring(start, end);
        }
    }
    return undefined;
}
//# sourceMappingURL=codeMapperPrompt.js.map