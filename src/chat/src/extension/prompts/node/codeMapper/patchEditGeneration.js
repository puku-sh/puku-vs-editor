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
exports.PatchEditExamplePatch = exports.PatchEditInputCodeBlock = exports.PatchEditRules = exports.Marker = void 0;
exports.getFileMarker = getFileMarker;
exports.getCustomMarker = getCustomMarker;
exports.findEdit = findEdit;
exports.getReferencedFiles = getReferencedFiles;
exports.getPatchEditReplyProcessor = getPatchEditReplyProcessor;
exports.getCodeBlock = getCodeBlock;
exports.iterateSectionsForResponse = iterateSectionsForResponse;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const async_1 = require("../../../../util/vs/base/common/async");
const promptCraftingTypes_1 = require("../../../inlineChat/node/promptCraftingTypes");
const editGeneration_1 = require("../../../prompt/node/editGeneration");
const indentationGuesser_1 = require("../../../prompt/node/indentationGuesser");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const safeElements_1 = require("../panel/safeElements");
const MARKER_PREFIX = '---';
var Marker;
(function (Marker) {
    Marker.FILEPATH = MARKER_PREFIX + 'FILEPATH';
    Marker.FIND = MARKER_PREFIX + 'FIND';
    Marker.REPLACE = MARKER_PREFIX + 'REPLACE';
    Marker.COMPLETE = MARKER_PREFIX + 'COMPLETE';
})(Marker || (exports.Marker = Marker = {}));
class PatchEditRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "When proposing a code change, provide one or more modifications in the following format:",
            vscpp("br", null),
            "Each modification consist of three sections headed by `",
            Marker.FILEPATH,
            "`, `",
            Marker.FIND,
            "` and `",
            Marker.REPLACE,
            "`.",
            vscpp("br", null),
            "After ",
            Marker.FILEPATH,
            " add the path to the file that needs to be changed.",
            vscpp("br", null),
            "After ",
            Marker.FIND,
            " add a code block containing a section of the program that will be replaced.",
            vscpp("br", null),
            "Add multiple lines so that a find tool can find and identify a section of the programm. Start and end with a line that will not be modified. ",
            vscpp("br", null),
            "Include all comments and empty lines exactly as they appear in the original source code. Do not abreviate any line or summarize the code with `...`. ",
            vscpp("br", null),
            "After ",
            Marker.REPLACE,
            " add a code block with the updated version of the original code in the find section. Maintain the same indentation and code style as in the original code.",
            vscpp("br", null),
            "After all modifications, add ",
            Marker.COMPLETE,
            ".",
            vscpp("br", null)));
    }
}
exports.PatchEditRules = PatchEditRules;
let PatchEditInputCodeBlock = class PatchEditInputCodeBlock extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        const code = typeof this.props.code === 'string' ? this.props.code : this.props.code.join('\n');
        return vscpp(vscppf, null,
            getFileMarker(this.promptPathRepresentationService.getFilePath(this.props.uri)),
            vscpp("br", null),
            vscpp(safeElements_1.CodeBlock, { code: code, uri: this.props.uri, languageId: this.props.languageId, includeFilepath: false, shouldTrim: this.props.shouldTrim }));
    }
};
exports.PatchEditInputCodeBlock = PatchEditInputCodeBlock;
exports.PatchEditInputCodeBlock = PatchEditInputCodeBlock = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], PatchEditInputCodeBlock);
let PatchEditExamplePatch = class PatchEditExamplePatch extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        return vscpp(vscppf, null,
            this.props.changes.map(patch => (vscpp(vscppf, null,
                getFileMarker(this.promptPathRepresentationService.getFilePath(patch.uri)),
                vscpp("br", null),
                Marker.FIND,
                vscpp("br", null),
                "```",
                vscpp("br", null),
                patch.find.join('\n'),
                vscpp("br", null),
                "```",
                vscpp("br", null),
                Marker.REPLACE,
                vscpp("br", null),
                "```",
                vscpp("br", null),
                patch.replace.join('\n'),
                vscpp("br", null),
                "```",
                vscpp("br", null)))),
            Marker.COMPLETE);
    }
};
exports.PatchEditExamplePatch = PatchEditExamplePatch;
exports.PatchEditExamplePatch = PatchEditExamplePatch = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], PatchEditExamplePatch);
function getFileMarker(filePath) {
    return `${Marker.FILEPATH} ${filePath}`;
}
function getCustomMarker(markerName) {
    return `${MARKER_PREFIX}${markerName}`;
}
function isWhitespaceOrEmpty(line) {
    return !line.match(/\S/);
}
function findEdit(code, findLines, replaceLines, fallbackInsertLine) {
    let firstFindLineIndex = 0;
    // find first non empty line
    while (firstFindLineIndex < findLines.length && isWhitespaceOrEmpty(findLines[firstFindLineIndex])) {
        firstFindLineIndex++;
    }
    if (firstFindLineIndex === findLines.length) {
        const codeIndentInfo = (0, indentationGuesser_1.guessIndentation)(code, 4, false);
        const codeIndentLevel = code.length > 0 ? getMinimalIndentLevel(code, 0, code.length - 1, codeIndentInfo.tabSize) : 0;
        const replaceString = getReplaceString(replaceLines, codeIndentLevel, codeIndentInfo);
        return editGeneration_1.LinesEdit.insert(fallbackInsertLine, replaceString);
    }
    const firstFindLine = findLines[firstFindLineIndex];
    const firstFindIndentLength = getIndentLength(firstFindLine);
    let lastError;
    let i = 0, k = firstFindLineIndex;
    outer: while (i < code.length) {
        // find the first find line in the code
        while (i < code.length && !endsWith(code[i], firstFindLine, firstFindIndentLength)) {
            i++;
        }
        if (i === code.length) {
            return lastError ?? { message: `First find line not found`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH, severity: 'error' };
        }
        const firstLineIndex = i;
        let endLineIndex = -1;
        while (i < code.length && k < findLines.length) {
            const codeLine = code[i];
            const codeIndentLength = getIndentLength(codeLine);
            if (codeIndentLength === codeLine.length) { // all whitespace
                i++;
                continue;
            }
            const findLine = findLines[k];
            const findLineIndentLength = getIndentLength(findLine);
            if (findLineIndentLength === findLine.length) { // all whitespace
                k++;
                continue;
            }
            if (endsWith(codeLine, findLine, findLineIndentLength)) {
                endLineIndex = i;
                i++;
                k++;
            }
            else {
                // a line in the find lines does not match the line in the code
                i = firstLineIndex + 1; // try to find the find line again starting on the next line
                k = firstFindLineIndex;
                if (findLine.indexOf('...') !== -1) {
                    lastError = { message: `Find contains ellipses`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH_LAZY, severity: 'error' };
                }
                else if (isComment(codeLine)) {
                    lastError = { message: `Find not matching a comment`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH_COMMENT, severity: 'error' };
                }
                else {
                    lastError = { message: `Find line ${k} does not match line ${i}`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH, severity: 'error' };
                }
                continue outer; // continue with the outer loop
            }
        }
        while (k < findLines.length && isWhitespaceOrEmpty(findLines[k])) {
            k++;
        }
        if (k === findLines.length && firstLineIndex !== -1 && endLineIndex !== -1) {
            const codeIndentInfo = (0, indentationGuesser_1.guessIndentation)(code, 4, false);
            const codeIndentLevel = getMinimalIndentLevel(code, firstLineIndex, endLineIndex, codeIndentInfo.tabSize);
            const replaceString = getReplaceString(replaceLines, codeIndentLevel, codeIndentInfo);
            return editGeneration_1.LinesEdit.replace(firstLineIndex, endLineIndex + 1, replaceString, endLineIndex === code.length - 1);
        }
    }
    return lastError ?? { message: `Not all lines of find found`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH, severity: 'error' };
}
function isWhiteSpace(charCode) {
    return charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */;
}
function isComment(line) {
    return line.match(/^\s*(\/\/|\/\*|#)/) !== null;
}
function getReplaceString(lines, newIndentLevel, indentInfo) {
    let start, end = 0;
    for (start = 0; start < lines.length && isWhitespaceOrEmpty(lines[start]); start++) { }
    if (start === lines.length) {
        return [];
    }
    for (end = lines.length; end > start && isWhitespaceOrEmpty(lines[end - 1]); end--) { }
    if (start === end) {
        // all replace lines are empty or whitespace only
        return [];
    }
    // find the line with the smallest indentation and remember the computed indentation level for each line
    let minIndentLevel = Number.MAX_SAFE_INTEGER;
    const indentations = [];
    for (let i = start; i < end; i++) {
        const line = lines[i];
        const indentation = computeIndentation(line, indentInfo.tabSize);
        if (indentation.length !== line.length /* more than whitespace */ && indentation.level < minIndentLevel) {
            minIndentLevel = indentation.level;
        }
        indentations.push(indentation);
    }
    // there is at least one line with non-whitespace characters, so minIndentLevel is less than Number.MAX_SAFE_INTEGER
    // now adjust each line to the requested codeIndentLevel
    const adjustedLines = [];
    for (let i = start; i < end; i++) {
        const line = lines[i];
        const { level, length } = indentations[i - start];
        const newLevel = Math.max(0, newIndentLevel + level - minIndentLevel);
        const newIndentation = indentInfo.insertSpaces ? ' '.repeat(indentInfo.tabSize * newLevel) : '\t'.repeat(newLevel);
        adjustedLines.push(newIndentation + line.substring(length));
    }
    return adjustedLines;
}
function getIndentLength(line) {
    let i = 0;
    while (i < line.length && isWhiteSpace(line.charCodeAt(i))) {
        i++;
    }
    return i;
}
function getMinimalIndentLevel(lines, startLineIndex, endLineIndex, tabSize) {
    let minIndentLevel = Number.MAX_SAFE_INTEGER;
    for (let i = startLineIndex; i <= endLineIndex; i++) {
        const line = lines[i];
        const indentation = computeIndentation(line, tabSize);
        if (indentation.length !== line.length /* more than whitespace */ && indentation.level < minIndentLevel) {
            minIndentLevel = indentation.level;
        }
    }
    return minIndentLevel !== Number.MAX_SAFE_INTEGER ? minIndentLevel : 0;
}
function computeIndentation(line, tabSize) {
    let nSpaces = 0;
    let level = 0;
    let i = 0;
    let length = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            nSpaces++;
            if (nSpaces === tabSize) {
                level++;
                nSpaces = 0;
                length = i + 1;
            }
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            level++;
            nSpaces = 0;
            length = i + 1;
        }
        else {
            break;
        }
        i++;
    }
    return { level, length };
}
function endsWith(line, suffix, suffixIndentLength) {
    let i = line.length - 1, k = suffix.length - 1;
    while (i >= 0 && k >= suffixIndentLength && line.charCodeAt(i) === suffix.charCodeAt(k)) {
        i--;
        k--;
    }
    if (k >= suffixIndentLength) {
        // not the full suffix matched
        return false;
    }
    // make sure all is whitespace before the suffix
    while (i >= 0 && isWhiteSpace(line.charCodeAt(i))) {
        i--;
    }
    return i < 0;
}
function getReferencedFiles(replyText) {
    const result = new Set();
    for (const section of iterateSections(iterateLines(replyText))) {
        if (section.marker === Marker.FILEPATH) {
            result.add(section.content.join('\n').trim());
        }
    }
    return [...result];
}
function getPatchEditReplyProcessor(promptPathRepresentationService) {
    return {
        getFirstParagraph(text) {
            const result = [];
            for (const line of iterateLines(text)) {
                if (line.length === 0 || line.startsWith(MARKER_PREFIX)) {
                    break;
                }
                result.push(line);
            }
            return result.join('\n');
        },
        process(replyText, documentText, documentUri, defaultInsertionLine = 0) {
            let original, filePath;
            const annotations = [];
            const otherSections = [];
            let patches = [];
            const edits = [];
            const invalidPatches = [];
            const otherPatches = [];
            const filePaths = new Set();
            let contentBefore = [];
            let contentAfter = [];
            loop: for (const section of iterateSections(iterateLines(replyText))) {
                switch (section.marker) {
                    case undefined:
                        contentBefore = section.content;
                        break;
                    case Marker.FILEPATH:
                        filePath = section.content.join('\n').trim();
                        break;
                    case Marker.FIND:
                        original = section.content;
                        break;
                    case Marker.REPLACE: {
                        if (section.content && original && filePath) {
                            patches.push({ filePath, find: original, replace: section.content });
                            filePaths.add(filePath);
                        }
                        break;
                    }
                    case Marker.COMPLETE:
                        contentAfter = section.content;
                        break loop;
                    default:
                        otherSections.push(section);
                        break;
                }
            }
            if (patches.length === 0) {
                annotations.push({ message: 'No patch sections found', label: promptCraftingTypes_1.OutcomeAnnotationLabel.NO_PATCH, severity: 'error' });
                return { edits, contentAfter, contentBefore, appliedPatches: [], otherSections, invalidPatches, otherPatches, annotations };
            }
            if (documentUri) {
                const documentFilePath = promptPathRepresentationService.getFilePath(documentUri);
                if (!filePaths.has(documentFilePath)) {
                    annotations.push({ message: `No patch for input document: ${documentFilePath}, patches for ${[...filePaths.keys()].join(', ')}`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.OTHER_FILE, severity: 'warning' });
                }
                if (filePaths.size > 1) {
                    annotations.push({ message: `Multiple files modified: ${[...filePaths.keys()].join(', ')}`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.MULTI_FILE, severity: 'warning' });
                }
                const patchesForDocument = [];
                for (const patch of patches) {
                    if (patch.filePath !== documentFilePath) {
                        otherPatches.push(patch);
                    }
                    else {
                        patchesForDocument.push(patch);
                    }
                }
                patches = patchesForDocument;
            }
            if (patches.length !== 0) {
                const documentLines = editGeneration_1.Lines.fromString(documentText);
                for (const patch of patches) {
                    if ((0, arrays_1.equals)(patch.find, patch.replace)) {
                        annotations.push({ message: `Patch is a no-op`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH_NOOP, severity: 'error' });
                        invalidPatches.push(patch);
                        continue;
                    }
                    if (patch.find.length <= 1) {
                        annotations.push({ message: `Small patch: ${Math.min(patch.find.length)}`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_PATCH_SMALL, severity: 'warning' });
                    }
                    const res = findEdit(documentLines, getCodeBlock(patch.find), getCodeBlock(patch.replace), defaultInsertionLine);
                    if (res instanceof editGeneration_1.LinesEdit) {
                        const success = addEditIfDisjoint(edits, res.toTextEdit());
                        if (!success) {
                            annotations.push({ message: `Overlapping edits`, label: promptCraftingTypes_1.OutcomeAnnotationLabel.INVALID_EDIT_OVERLAP, severity: 'error' });
                            invalidPatches.push(patch);
                        }
                    }
                    else {
                        annotations.push(res);
                        invalidPatches.push(patch);
                    }
                }
            }
            return { edits, appliedPatches: patches, otherSections, invalidPatches, otherPatches, annotations, contentBefore, contentAfter };
        }
    };
}
function addEditIfDisjoint(edits, edit) {
    for (let i = 0; i < edits.length; i++) {
        const existingEdit = edits[i];
        if (edit.range.end.isBeforeOrEqual(existingEdit.range.start)) {
            edits.splice(i, 0, edit);
            return true;
        }
        if (edit.range.start.isBefore(existingEdit.range.end)) {
            // intersecting
            return false;
        }
    }
    edits.push(edit);
    return true;
}
function getCodeBlock(content) {
    const result = [];
    let inCodeBlock;
    const codeBlockRegex = /^`{3,}/; // Regex to match 3 or more backticks at the beginning of the line
    for (const line of content) {
        const match = line.match(codeBlockRegex);
        if (match) {
            if (inCodeBlock) {
                if (match[0] === inCodeBlock) {
                    return result;
                }
                else {
                    result.push(line);
                }
            }
            else {
                inCodeBlock = match[0];
            }
        }
        else if (inCodeBlock) {
            result.push(line);
        }
    }
    return content;
}
async function* iterateSectionsForResponse(lines) {
    let currentMarker = undefined;
    let currentContent = [];
    const textStream = async_1.AsyncIterableObject.map(lines, part => part.delta.text);
    const reader = new streamingEdits_1.PartialAsyncTextReader(textStream[Symbol.asyncIterator]());
    while (!reader.endOfStream) {
        const line = await reader.readLineIncludingLF();
        let marker;
        if (line.startsWith(MARKER_PREFIX)) {
            if (line.startsWith(Marker.FILEPATH)) {
                marker = Marker.FILEPATH;
            }
            else if (line.startsWith(Marker.FIND)) {
                marker = Marker.FIND;
            }
            else if (line.startsWith(Marker.REPLACE)) {
                marker = Marker.REPLACE;
            }
            else if (line.startsWith(Marker.COMPLETE)) {
                marker = Marker.COMPLETE;
            }
            else {
                marker = removeTrailingLF(line);
            }
            yield { marker: currentMarker, content: currentContent };
            currentContent = [removeTrailingLF(line.substring(marker.length))];
            currentMarker = marker;
            continue;
        }
        currentContent.push(removeTrailingLF(line));
    }
    yield { marker: currentMarker, content: currentContent };
    function removeTrailingLF(str) {
        if (str.endsWith('\n')) {
            return str.slice(0, -1);
        }
        return str;
    }
}
function* iterateSections(lines) {
    let currentMarker = undefined;
    let currentContent = [];
    for (const line of lines) {
        let marker;
        if (line.startsWith(MARKER_PREFIX)) {
            if (line.startsWith(Marker.FILEPATH)) {
                marker = Marker.FILEPATH;
            }
            else if (line.startsWith(Marker.FIND)) {
                marker = Marker.FIND;
            }
            else if (line.startsWith(Marker.REPLACE)) {
                marker = Marker.REPLACE;
            }
            else if (line.startsWith(Marker.COMPLETE)) {
                marker = Marker.COMPLETE;
            }
            else {
                marker = line;
            }
            yield { marker: currentMarker, content: currentContent };
            currentContent = [line.substring(marker.length)];
            currentMarker = marker;
            continue;
        }
        currentContent.push(line);
    }
    yield { marker: currentMarker, content: currentContent };
}
function* iterateLines(input) {
    let start = 0, end = 0;
    while (end < input.length) {
        const ch = input.charCodeAt(end);
        if (ch === 13 /* CharCode.CarriageReturn */ || ch === 10 /* CharCode.LineFeed */) {
            yield input.substring(start, end);
            end++;
            if (ch === 13 /* CharCode.CarriageReturn */ && input.charCodeAt(end) === 10 /* CharCode.LineFeed */) {
                end++;
            }
            start = end;
        }
        else {
            end++;
        }
    }
    if (start < input.length) {
        yield input.substring(start);
    }
}
//# sourceMappingURL=patchEditGeneration.js.map