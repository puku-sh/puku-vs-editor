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
exports.CodeBlockProcessor = exports.CodeBlockTrackingChatResponseStream = exports.CodeBlocksMetadata = void 0;
exports.isCodeBlockWithResource = isCodeBlockWithResource;
const markdown_1 = require("../../../util/common/markdown");
const strings_1 = require("../../../util/vs/base/common/strings");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const vscodeTypes_1 = require("../../../vscodeTypes");
class CodeBlocksMetadata {
    constructor(codeBlocks) {
        this.codeBlocks = codeBlocks;
    }
}
exports.CodeBlocksMetadata = CodeBlocksMetadata;
function isCodeBlockWithResource(codeBlock) {
    return codeBlock.resource !== undefined;
}
/**
 * Proxy of a {@linkcode ChatResponseStream} that processes all code blocks in the markdown.
 * Filepaths are removed from the Markdown, resolved and reported as codeblockUri
 */
let CodeBlockTrackingChatResponseStream = class CodeBlockTrackingChatResponseStream {
    constructor(_wrapped, codeblocksRepresentEdits, _promptPathRepresentationService) {
        this._wrapped = _wrapped;
        this._codeBlocks = [];
        this.button = this.forward(this._wrapped.button.bind(this._wrapped));
        this.filetree = this.forward(this._wrapped.filetree.bind(this._wrapped));
        this.progress = this._wrapped.progress.bind(this._wrapped);
        this.reference = this.forward(this._wrapped.reference.bind(this._wrapped));
        this.textEdit = this.forward(this._wrapped.textEdit.bind(this._wrapped));
        this.notebookEdit = this.forward(this._wrapped.notebookEdit.bind(this._wrapped));
        this.confirmation = this.forward(this._wrapped.confirmation.bind(this._wrapped));
        this.warning = this.forward(this._wrapped.warning.bind(this._wrapped));
        this.reference2 = this.forward(this._wrapped.reference2.bind(this._wrapped));
        this.codeCitation = this.forward(this._wrapped.codeCitation.bind(this._wrapped));
        this.anchor = this.forward(this._wrapped.anchor.bind(this._wrapped));
        this.externalEdit = this.forward(this._wrapped.externalEdit.bind(this._wrapped));
        this.prepareToolInvocation = this.forward(this._wrapped.prepareToolInvocation.bind(this._wrapped));
        let uriReportedForIndex = -1;
        this._codeBlockProcessor = new CodeBlockProcessor(path => {
            return _promptPathRepresentationService.resolveFilePath(path);
        }, (text, codeBlockInfo, vulnerabilities) => {
            if (vulnerabilities) {
                this._wrapped.markdownWithVulnerabilities(text, vulnerabilities);
            }
            else {
                this._wrapped.markdown(text);
            }
            if (codeBlockInfo && codeBlockInfo.resource && codeBlockInfo.index !== uriReportedForIndex) {
                this._wrapped.codeblockUri(codeBlockInfo.resource, codeblocksRepresentEdits);
                uriReportedForIndex = codeBlockInfo.index;
            }
        }, codeblock => {
            this._codeBlocks.push(codeblock);
        });
    }
    clearToPreviousToolInvocation(reason) {
        this._codeBlockProcessor.flush();
        this._wrapped.clearToPreviousToolInvocation(reason);
        this._codeBlocks.length = 0;
    }
    markdown(value) {
        this._codeBlockProcessor.processMarkdown(value);
    }
    markdownWithVulnerabilities(value, vulnerabilities) {
        this._codeBlockProcessor.processMarkdown(value, vulnerabilities);
    }
    thinkingProgress(thinkingDelta) {
        this._codeBlockProcessor.flush();
        this._wrapped.thinkingProgress(thinkingDelta);
    }
    codeblockUri(uri) {
        this._codeBlockProcessor.processCodeblockUri(uri);
    }
    push(part) {
        if (part instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
            this._codeBlockProcessor.processMarkdown(part.value, undefined);
        }
        else if (part instanceof vscodeTypes_1.ChatResponseMarkdownWithVulnerabilitiesPart) {
            this._codeBlockProcessor.processMarkdown(part.value, part.vulnerabilities);
        }
        else if (part instanceof vscodeTypes_1.ChatResponseCodeblockUriPart) {
            this._codeBlockProcessor.processCodeblockUri(part.value);
        }
        else {
            this._codeBlockProcessor.flush();
            this._wrapped.push(part);
        }
    }
    finish() {
        this._codeBlockProcessor.flush();
        return new CodeBlocksMetadata(this._codeBlocks);
    }
    forward(fc) {
        return (...args) => {
            this._codeBlockProcessor.flush();
            return fc(...args);
        };
    }
};
exports.CodeBlockTrackingChatResponseStream = CodeBlockTrackingChatResponseStream;
exports.CodeBlockTrackingChatResponseStream = CodeBlockTrackingChatResponseStream = __decorate([
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], CodeBlockTrackingChatResponseStream);
const fenceLanguageRegex = /^(`{3,}|~{3,})(\w*)/;
var State;
(function (State) {
    State[State["OutsideCodeBlock"] = 0] = "OutsideCodeBlock";
    State[State["LineAfterFence"] = 1] = "LineAfterFence";
    State[State["LineAfterFilePath"] = 2] = "LineAfterFilePath";
    State[State["InCodeBlock"] = 3] = "InCodeBlock";
})(State || (State = {}));
/**
 * The CodeBlockProcessor processes a sequence of markdown text parts and looks for code blocks that it contains.
 * - Code block filepaths are removed from the Markdown, and reported as codeblockUri
 * - All complete code blocks are also reported as {@linkcode CodeBlock} objects
 * - An optional line processor can be used to replace the content of a full line
 */
class CodeBlockProcessor {
    constructor(_resolveCodeblockPath, _emitMarkdown, _emitCodeblock, _lineProcessor) {
        this._resolveCodeblockPath = _resolveCodeblockPath;
        this._emitMarkdown = _emitMarkdown;
        this._emitCodeblock = _emitCodeblock;
        this._lineProcessor = _lineProcessor;
        this._canEmitIncompleteLine = false;
        this._code = [];
        this._markdownBeforeBlock = [];
        this._nestingLevel = 0;
        this._index = 0;
        this._state = State.OutsideCodeBlock;
    }
    processMarkdown(markdown, vulnerabilities) {
        const text = typeof markdown === 'string' ? markdown : markdown.value;
        if (text.length === 0) {
            return;
        }
        const lines = (0, strings_1.splitLinesIncludeSeparators)(text).map(line => toMarkdownString(line, markdown));
        if (lines.length > 0) {
            if (this._lastIncompleteLine) {
                lines[0] = appendMarkdownString(this._lastIncompleteLine, lines[0]);
            }
            this._lastIncompleteLine = !endsWithLineDelimiter(lines[lines.length - 1].value) ? lines.pop() : undefined;
            if (this._lastIncompleteLine?.value === '') {
                this._lastIncompleteLine = undefined;
            }
        }
        let i = 0;
        if (i < lines.length && this._canEmitIncompleteLine) {
            this._processLinePart(lines[0], vulnerabilities);
            i++;
        }
        for (; i < lines.length; i++) {
            this._processLine(lines[i], vulnerabilities);
        }
        if (this._lastIncompleteLine && !this._requiresFullLine(this._lastIncompleteLine)) {
            this._processLinePart(this._lastIncompleteLine, vulnerabilities);
            this._lastIncompleteLine = undefined;
            this._canEmitIncompleteLine = true;
        }
        else {
            this._canEmitIncompleteLine = false;
        }
    }
    _requiresFullLine(markdown) {
        if (this._state === State.OutsideCodeBlock || this._state === State.InCodeBlock) {
            return mightBeFence(markdown.value) || this._lineProcessor?.matchesLineStart(markdown.value, this._state === State.InCodeBlock);
        }
        return true;
    }
    _processLinePart(incompleteLine, vulnerabilities) {
        if (this._currentBlock) {
            this._code.push(incompleteLine.value);
            this._emitMarkdown(incompleteLine, this._currentBlock.info, vulnerabilities);
        }
        else {
            this._markdownBeforeBlock.push(incompleteLine.value);
            this._emitMarkdown(incompleteLine, undefined, vulnerabilities);
        }
    }
    /**
     * Called when there is already a known code block URI for the currently processed code block
     * @param uri
     */
    processCodeblockUri(uri) {
        if (this._currentBlock && !this._currentBlock.info.resource) {
            this._currentBlock.info.resource = uri;
        }
    }
    /**
     * Processes a line of markdown.
     * @param line The line to process. The line includes the line delimiters, unless it is the last line of the document.
     * @param vulnerabilities Optional set of vulnerabilities to associate with the line.
     */
    _processLine(line, vulnerabilities) {
        if (this._state === State.LineAfterFence) {
            const codeBlock = this._currentBlock; // must be set in that state
            const filePath = getFilePath(line.value, codeBlock.info.language);
            if (filePath) {
                if (!codeBlock.info.resource) {
                    codeBlock.info.resource = this._resolveCodeblockPath(filePath);
                }
                this._state = State.LineAfterFilePath;
                this._emitMarkdown(codeBlock.firstLine, codeBlock.info, codeBlock.vulnerabilities);
                return;
            }
            else {
                this._state = State.InCodeBlock;
                this._emitMarkdown(codeBlock.firstLine, codeBlock.info, codeBlock.vulnerabilities);
                // this was a normal line, not a file path. Continue handling the line
            }
        }
        else if (this._state === State.LineAfterFilePath) {
            this._state = State.InCodeBlock;
            if ((0, strings_1.isFalsyOrWhitespace)(line.value)) {
                return; // filter the empty line after the file path
            }
        }
        const fenceLanguageIdMatch = line.value.match(fenceLanguageRegex);
        if (fenceLanguageIdMatch) {
            if (!this._currentBlock) {
                // we are not in a code block. Open the block
                this._nestingLevel = 1;
                this._currentBlock = {
                    info: {
                        index: this._index++,
                        language: fenceLanguageIdMatch[2],
                        resource: undefined,
                    },
                    fence: fenceLanguageIdMatch[1],
                    firstLine: line,
                    vulnerabilities,
                };
                this._state = State.LineAfterFence;
                // wait emitting markdown before we have seen the next line
                return;
            }
            if (fenceLanguageIdMatch[1] === this._currentBlock.fence) {
                if (fenceLanguageIdMatch[2]) {
                    this._nestingLevel++;
                }
                else if (this._nestingLevel > 1) {
                    this._nestingLevel--;
                }
                else {
                    // the fence matches the opening fence. It does not have a language id, and the nesting level is 1. -> Close the code block
                    this._emitMarkdown(line, this._currentBlock.info, vulnerabilities);
                    this._emitCodeblock({ code: this._code.join(''), resource: this._currentBlock.info.resource, language: this._currentBlock.info.language, markdownBeforeBlock: this._markdownBeforeBlock.join('') });
                    this._code.length = 0;
                    this._markdownBeforeBlock.length = 0;
                    this._currentBlock = undefined;
                    this._nestingLevel = 0;
                    this._state = State.OutsideCodeBlock;
                    return;
                }
            }
        }
        if (this._lineProcessor?.matchesLineStart(line.value, this._state === State.InCodeBlock)) {
            line = this._lineProcessor.process(line, this._state === State.InCodeBlock);
        }
        // the current line is not opening or closing a code block
        if (this._currentBlock) {
            this._code.push(line.value);
            this._emitMarkdown(line, this._currentBlock.info, vulnerabilities);
        }
        else {
            this._markdownBeforeBlock.push(line.value);
            this._emitMarkdown(line, undefined, vulnerabilities);
        }
    }
    flush() {
        if (this._lastIncompleteLine) {
            this._processLine(this._lastIncompleteLine);
            this._lastIncompleteLine = undefined;
        }
        if (this._state === State.LineAfterFence && this._currentBlock) {
            this._emitMarkdown(this._currentBlock.firstLine, this._currentBlock.info, this._currentBlock.vulnerabilities);
        }
    }
}
exports.CodeBlockProcessor = CodeBlockProcessor;
function getFilePath(line, mdLanguage) {
    const languageId = mdLanguage ? (0, markdown_1.mdCodeBlockLangToLanguageId)(mdLanguage) : mdLanguage;
    return (0, markdown_1.createFilepathRegexp)(languageId).exec(line)?.[1];
}
function endsWithLineDelimiter(line) {
    return [10 /* CharCode.LineFeed */, 13 /* CharCode.CarriageReturn */].includes(line.charCodeAt(line.length - 1));
}
function toMarkdownString(text, template) {
    const markdownString = new vscodeTypes_1.MarkdownString(text);
    if (typeof template === 'object') {
        markdownString.isTrusted = template.isTrusted;
        markdownString.supportThemeIcons = template.supportThemeIcons;
        markdownString.baseUri = template.baseUri;
        markdownString.supportHtml = template.supportHtml;
    }
    return markdownString;
}
function appendMarkdownString(target, value) {
    const markdownString = new vscodeTypes_1.MarkdownString(target.value + value.value);
    markdownString.isTrusted = target.isTrusted || value.isTrusted;
    markdownString.supportThemeIcons = target.supportThemeIcons || value.supportThemeIcons;
    markdownString.supportHtml = target.supportHtml || value.supportHtml;
    markdownString.baseUri = target.baseUri || value.baseUri;
    return markdownString;
}
function mightBeFence(line) {
    const len = line.length;
    if (len > 0) {
        const ch1 = line.charCodeAt(0);
        if (ch1 !== 96 /* CharCode.BackTick */ && ch1 !== 126 /* CharCode.Tilde */) {
            return false;
        }
        if ((len > 1 && line.charCodeAt(1) !== ch1) || (len > 2 && line.charCodeAt(2) !== ch1)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=codeBlockProcessor.js.map