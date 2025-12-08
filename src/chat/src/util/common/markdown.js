"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filepathCodeBlockMarker = void 0;
exports.getFenceForCodeBlock = getFenceForCodeBlock;
exports.createFilepathRegexp = createFilepathRegexp;
exports.createFencedCodeBlock = createFencedCodeBlock;
exports.getFilepathComment = getFilepathComment;
exports.removeLeadingFilepathComment = removeLeadingFilepathComment;
exports.languageIdToMDCodeBlockLang = languageIdToMDCodeBlockLang;
exports.mdCodeBlockLangToLanguageId = mdCodeBlockLangToLanguageId;
exports.getLanguageId = getLanguageId;
exports.getMdCodeBlockLanguage = getMdCodeBlockLanguage;
exports.extractCodeBlocks = extractCodeBlocks;
exports.extractInlineCode = extractInlineCode;
const markdown_it_1 = __importDefault(require("markdown-it"));
const lazy_1 = require("../vs/base/common/lazy");
const resources_1 = require("../vs/base/common/resources");
const strings_1 = require("../vs/base/common/strings");
const languages_1 = require("./languages");
/**
 *
 * @param code A block of source code that might contain markdown code block fences
 * @returns A fence with the required number of backticks to avoid prematurely terminating the code block
 */
function getFenceForCodeBlock(code, minNumberOfBackticks = 3) {
    const backticks = code.matchAll(/^\s*(```+)/gm);
    const backticksNeeded = Math.max(minNumberOfBackticks, ...Array.from(backticks, d => d[1].length + 1));
    return '`'.repeat(backticksNeeded);
}
exports.filepathCodeBlockMarker = 'filepath:';
function createFilepathRegexp(languageId) {
    const language = (0, languages_1.getLanguage)(languageId);
    const prefixes = ['#', '\\/\\/']; // always allow # and // as comment start
    const suffixes = [];
    function add(lineComment) {
        prefixes.push((0, strings_1.escapeRegExpCharacters)(lineComment.start));
        if (lineComment.end) {
            suffixes.push((0, strings_1.escapeRegExpCharacters)(lineComment.end));
        }
    }
    add(language.lineComment);
    language.alternativeLineComments?.forEach(add);
    const startMatch = `(?:${prefixes.join('|')})`;
    const optionalEndMatch = suffixes.length ? `(?:\\s*${suffixes.join('|')})?` : '';
    return new RegExp(`^\\s*${startMatch}\\s*${exports.filepathCodeBlockMarker}\\s*(.*?)${optionalEndMatch}\\s*$`);
}
/**
 * Create a markdown code block with an optional language id and an optional file path.
 * @param filePath The file path to include in the code block. To create the file path use the {@link IPromptPathRepresentationService}
 */
function createFencedCodeBlock(languageId, code, shouldTrim = true, filePath, minNumberOfBackticksOrStyle = 3) {
    const fence = typeof minNumberOfBackticksOrStyle === 'number'
        ? getFenceForCodeBlock(code, minNumberOfBackticksOrStyle)
        : minNumberOfBackticksOrStyle;
    let filepathComment = '';
    if (filePath) {
        filepathComment = getFilepathComment(languageId, filePath);
    }
    return `${fence}${fence && (languageIdToMDCodeBlockLang(languageId) + '\n')}${filepathComment}${shouldTrim ? code.trim() : code}${fence && ('\n' + fence)}`;
}
function getFilepathComment(languageId, filePath) {
    const language = (0, languages_1.getLanguage)(languageId);
    const { start, end } = language.lineComment;
    return end ? `${start} ${exports.filepathCodeBlockMarker} ${filePath} ${end}\n` : `${start} ${exports.filepathCodeBlockMarker} ${filePath}\n`;
}
function removeLeadingFilepathComment(codeblock, languageId, filepath) {
    const filepathComment = getFilepathComment(languageId, filepath);
    if (codeblock.startsWith(filepathComment)) {
        return codeblock.substring(filepathComment.length);
    }
    return codeblock;
}
function languageIdToMDCodeBlockLang(languageId) {
    const language = (0, languages_1.getLanguage)(languageId);
    return language?.markdownLanguageIds?.[0] ?? languageId;
}
const mdLanguageIdToLanguageId = new lazy_1.Lazy(() => {
    const result = new Map();
    languages_1.wellKnownLanguages.forEach((language, languageId) => {
        if (language.markdownLanguageIds) {
            language.markdownLanguageIds.forEach(mdLanguageId => {
                result.set(mdLanguageId, languageId);
            });
        }
        else {
            result.set(languageId, languageId);
        }
    });
    return result;
});
function mdCodeBlockLangToLanguageId(mdLanguageId) {
    return mdLanguageIdToLanguageId.value.get(mdLanguageId);
}
function getLanguageId(uri) {
    const ext = (0, resources_1.extname)(uri).toLowerCase();
    return Object.keys(languages_1.wellKnownLanguages).find(id => {
        return languages_1.wellKnownLanguages.get(id)?.extensions?.includes(ext);
    }) || ext.replace(/^\./, '');
}
function getMdCodeBlockLanguage(uri) {
    const languageId = getLanguageId(uri);
    return languageIdToMDCodeBlockLang(languageId);
}
function extractCodeBlocks(text) {
    const out = [];
    const md = new markdown_it_1.default();
    const tokens = md.parse(text, {});
    for (const token of flattenTokensLists(tokens)) {
        if (token.map && token.type === 'fence') {
            out.push({
                startMarkup: token.markup,
                // Trim trailing newline since this is always included
                code: token.content.replace(/\n$/, ''),
                language: token.info.trim(),
                startLine: token.map[0],
                endLine: token.map[1],
            });
        }
    }
    return out;
}
function extractInlineCode(text) {
    const out = [];
    const md = new markdown_it_1.default();
    const tokens = md.parse(text, {});
    for (const token of flattenTokensLists(tokens)) {
        if (token.type === 'code_inline') {
            out.push(token.content.replace(/\n$/, ''));
        }
    }
    return out;
}
function* flattenTokensLists(tokensList) {
    for (const entry of tokensList) {
        if (entry.children) {
            yield* flattenTokensLists(entry.children);
        }
        yield entry;
    }
}
//# sourceMappingURL=markdown.js.map