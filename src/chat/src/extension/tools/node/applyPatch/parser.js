"use strict";
// Copyright 2025 OpenAI
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.InvalidPatchFormatError = exports.InvalidContextError = exports.DiffError = exports.ActionType = void 0;
exports.assemble_changes = assemble_changes;
exports.replace_explicit_tabs = replace_explicit_tabs;
exports.replace_explicit_nl = replace_explicit_nl;
exports.text_to_patch = text_to_patch;
exports.identify_files_needed = identify_files_needed;
exports.identify_files_added = identify_files_added;
exports.patch_to_commit = patch_to_commit;
exports.load_files = load_files;
exports.apply_commit = apply_commit;
exports.processPatch = processPatch;
const markdown_1 = require("../../../../util/common/markdown");
const diff_1 = require("../../../../util/vs/base/common/diff/diff");
const strings_1 = require("../../../../util/vs/base/common/strings");
const editGeneration_1 = require("../../../prompt/node/editGeneration");
const indentationGuesser_1 = require("../../../prompt/node/indentationGuesser");
const parseApplyPatch_1 = require("./parseApplyPatch");
const CHUNK_DELIMITER = '@@';
// Max edit distance allowed per line to allow for fuzzy matching context. 4.1
// occasionally 'forgets' a character in a diff, and this allows those to still
// match in conservative cases.
const EDIT_DISTANCE_ALLOWANCE_PER_LINE = 0.34;
// -----------------------------------------------------------------------------
// Types & Models
// -----------------------------------------------------------------------------
var ActionType;
(function (ActionType) {
    ActionType["ADD"] = "add";
    ActionType["DELETE"] = "delete";
    ActionType["UPDATE"] = "update";
})(ActionType || (exports.ActionType = ActionType = {}));
function assemble_changes(orig, updatedFiles) {
    const commit = { changes: {} };
    for (const [p, newContent] of Object.entries(updatedFiles)) {
        const oldContent = orig[p];
        if (oldContent === newContent) {
            continue;
        }
        if (oldContent !== undefined && newContent !== undefined) {
            commit.changes[p] = {
                type: ActionType.UPDATE,
                oldContent,
                newContent,
            };
        }
        else if (newContent !== undefined) {
            commit.changes[p] = {
                type: ActionType.ADD,
                newContent,
            };
        }
        else if (oldContent !== undefined) {
            commit.changes[p] = {
                type: ActionType.DELETE,
                oldContent,
            };
        }
        else {
            throw new Error("Unexpected state in assemble_changes");
        }
    }
    return commit;
}
class DiffError extends Error {
}
exports.DiffError = DiffError;
class InvalidContextError extends DiffError {
    constructor(message, file, kindForTelemetry) {
        super(message);
        this.file = file;
        this.kindForTelemetry = kindForTelemetry;
    }
}
exports.InvalidContextError = InvalidContextError;
class InvalidPatchFormatError extends DiffError {
    constructor(message, kindForTelemetry) {
        super(message);
        this.kindForTelemetry = kindForTelemetry;
    }
}
exports.InvalidPatchFormatError = InvalidPatchFormatError;
// -----------------------------------------------------------------------------
// Parser (patch text -> Patch)
// -----------------------------------------------------------------------------
class Parser {
    constructor(currentFiles, lines) {
        this.indent_styles = {};
        this.index = 0;
        this.patch = { actions: {} };
        this.fuzz = 0;
        this.current_files = currentFiles;
        this.lines = lines;
        for (const [path, doc] of Object.entries(currentFiles)) {
            this.indent_styles[path] = (0, indentationGuesser_1.guessIndentation)(editGeneration_1.Lines.fromString(doc.getText()), 4, false);
        }
    }
    is_done(prefixes) {
        if (this.index >= this.lines.length) {
            return true;
        }
        if (prefixes &&
            prefixes.some((p) => this.lines[this.index].startsWith(p.trim()))) {
            return true;
        }
        return false;
    }
    startswith(prefix) {
        const prefixes = Array.isArray(prefix) ? prefix : [prefix];
        return prefixes.some((p) => this.lines[this.index].startsWith(p));
    }
    read_str(prefix = "", returnEverything = false) {
        if (this.index >= this.lines.length) {
            throw new DiffError(`Index: ${this.index} >= ${this.lines.length}`);
        }
        if (this.lines[this.index].startsWith(prefix)) {
            const text = returnEverything
                ? this.lines[this.index]
                : this.lines[this.index].slice(prefix.length);
            this.index += 1;
            return text ?? "";
        }
        return "";
    }
    parse() {
        while (!this.is_done([parseApplyPatch_1.PATCH_SUFFIX])) {
            let path = this.read_str(parseApplyPatch_1.UPDATE_FILE_PREFIX);
            if (path) {
                if (this.patch.actions[path]) {
                    throw new DiffError(`Update File Error: Duplicate Path: ${path}`);
                }
                const moveTo = this.read_str(parseApplyPatch_1.MOVE_FILE_TO_PREFIX);
                if (!(path in this.current_files)) {
                    throw new DiffError(`Update File Error: Missing File: ${path}`);
                }
                const textDocument = this.current_files[path];
                const indentStyle = this.indent_styles[path];
                const text = textDocument.getText();
                const action = this.parse_update_file((0, markdown_1.getFilepathComment)(textDocument.languageId, path), text ?? "", indentStyle);
                action.movePath = moveTo || undefined;
                this.patch.actions[path] = action;
                continue;
            }
            path = this.read_str(parseApplyPatch_1.DELETE_FILE_PREFIX);
            if (path) {
                if (this.patch.actions[path]) {
                    throw new DiffError(`Delete File Error: Duplicate Path: ${path}`);
                }
                if (!(path in this.current_files)) {
                    throw new DiffError(`Delete File Error: Missing File: ${path}`);
                }
                this.patch.actions[path] = { type: ActionType.DELETE, chunks: [] };
                continue;
            }
            path = this.read_str(parseApplyPatch_1.ADD_FILE_PREFIX);
            if (path) {
                if (this.patch.actions[path]) {
                    throw new DiffError(`Add File Error: Duplicate Path: ${path}`);
                }
                if (path in this.current_files) {
                    throw new DiffError(`Add File Error: File already exists: ${path}`);
                }
                this.patch.actions[path] = this.parse_add_file();
                continue;
            }
            throw new DiffError(`Unknown Line: ${this.lines[this.index]}`);
        }
        if (!this.startswith(parseApplyPatch_1.PATCH_SUFFIX.trim())) {
            throw new InvalidPatchFormatError("Missing End Patch", 'missingEndPatch');
        }
        this.index += 1;
    }
    parse_update_file(path, text, targetIndentStyle) {
        const action = { type: ActionType.UPDATE, chunks: [] };
        const fileLines = text.split("\n");
        let index = 0;
        while (!this.is_done([
            parseApplyPatch_1.PATCH_SUFFIX,
            parseApplyPatch_1.UPDATE_FILE_PREFIX,
            parseApplyPatch_1.DELETE_FILE_PREFIX,
            parseApplyPatch_1.ADD_FILE_PREFIX,
            parseApplyPatch_1.END_OF_FILE_PREFIX,
        ])) {
            const sectionStr = this.read_str(CHUNK_DELIMITER, true);
            const defStr = sectionStr.slice(CHUNK_DELIMITER.length).trim();
            if (!(sectionStr || index === 0)) {
                throw new DiffError(`Invalid line. Consider splitting each change into individual apply_patch tool calls:\n${this.lines[this.index]}`);
            }
            if (defStr) {
                let found = false;
                // ------------------------------------------------------------------
                // Equality helpers using the canonicalisation from find_context_core.
                // (We duplicate a minimal version here because the scope is local.)
                // ------------------------------------------------------------------
                const canonLocal = (s) => s.normalize("NFC").replace(/./gu, (c) => ({
                    "-": "-",
                    "\u2010": "-",
                    "\u2011": "-",
                    "\u2012": "-",
                    "\u2013": "-",
                    "\u2014": "-",
                    "\u2212": "-",
                    "\u0022": '"',
                    "\u201C": '"',
                    "\u201D": '"',
                    "\u201E": '"',
                    "\u00AB": '"',
                    "\u00BB": '"',
                    "\u0027": "'",
                    "\u2018": "'",
                    "\u2019": "'",
                    "\u201B": "'",
                    "\u00A0": " ",
                    "\u202F": " ",
                })[c] ?? c);
                if (!fileLines
                    .slice(0, index)
                    .some((s) => canonLocal(s) === canonLocal(defStr))) {
                    for (let i = index; i < fileLines.length; i++) {
                        if (canonLocal(fileLines[i]) === canonLocal(defStr)) {
                            index = i + 1;
                            found = true;
                            break;
                        }
                    }
                }
                if (!found &&
                    !fileLines
                        .slice(0, index)
                        .some((s) => canonLocal(s.trim()) === canonLocal(defStr))) {
                    for (let i = index; i < fileLines.length; i++) {
                        if (canonLocal(fileLines[i].trim()) === canonLocal(defStr)) {
                            index = i + 1;
                            this.fuzz += 1;
                            found = true;
                            break;
                        }
                    }
                }
            }
            let nextSection = peek_next_section(this.lines, this.index);
            let match;
            for (let i = 0; i <= nextSection.fuzzMerges && !match; i++) {
                if (i > 0) {
                    nextSection = peek_next_section(this.lines, this.index, i);
                }
                match = find_context(path, fileLines, nextSection.nextChunkContext, index, nextSection.eof);
                if (!match) {
                    // The model sometimes returns patches out of order,
                    // so start searching from the beginning of the file.
                    match = find_context(path, fileLines, nextSection.nextChunkContext, 0, nextSection.eof);
                }
                if (i > 0 && match) {
                    match.fuzz |= 64 /* Fuzz.MergedOperatorSection */;
                }
            }
            if (!match) {
                const ctxText = nextSection.nextChunkContext.join("\n");
                if (nextSection.eof) {
                    throw new InvalidContextError(`Invalid EOF context at character ${index}:\n${ctxText}`, text, 'invalidContext-eof');
                }
                else {
                    const kindForTelemetry = ctxText.match(/^\\t/) ?
                        'invalidContext-maybeInvalidTab' :
                        ctxText.match(/^\\\t/) ?
                            'invalidContext-maybeEscapedTab' :
                            'invalidContext';
                    throw new InvalidContextError(`Invalid context at character ${index}:\n${ctxText}`, text, kindForTelemetry);
                }
            }
            this.fuzz += match.fuzz;
            const srcIndentStyle = (0, indentationGuesser_1.guessIndentation)(nextSection.chunks.flatMap(c => c.insLines).concat(nextSection.nextChunkContext), targetIndentStyle.tabSize, targetIndentStyle.insertSpaces);
            const matchedLineIndent = (0, indentationGuesser_1.computeIndentLevel2)(fileLines[match.line], targetIndentStyle.tabSize);
            const srcLineIndent = nextSection.nextChunkContext && nextSection.nextChunkContext.length > 0 ?
                (0, indentationGuesser_1.computeIndentLevel2)(replace_explicit_tabs(replace_explicit_nl(nextSection.nextChunkContext[0])), srcIndentStyle.tabSize) : 0;
            const additionalIndentation = (0, indentationGuesser_1.getIndentationChar)(targetIndentStyle).repeat(Math.max(0, matchedLineIndent - srcLineIndent));
            for (const ch of nextSection.chunks) {
                ch.origIndex += match.line;
                if (match.fuzz & 128 /* Fuzz.NormalizedExplicitNL */) {
                    ch.insLines = ch.insLines.map(replace_explicit_nl);
                    ch.delLines = ch.delLines.map(replace_explicit_nl);
                }
                ch.insLines = ch.insLines.map(replace_explicit_tabs);
                ch.insLines = ch.insLines.map(ins => (0, strings_1.isFalsyOrWhitespace)(ins) ? ins : additionalIndentation + (0, indentationGuesser_1.transformIndentation)(ins, srcIndentStyle, targetIndentStyle));
                if (match.fuzz & 4 /* Fuzz.NormalizedExplicitTab */) {
                    ch.delLines = ch.delLines.map(replace_explicit_tabs);
                }
                action.chunks.push(ch);
            }
            index = match.line + nextSection.nextChunkContext.length;
            this.index = nextSection.endPatchIndex;
        }
        return action;
    }
    parse_add_file() {
        const lines = [];
        while (!this.is_done([
            parseApplyPatch_1.PATCH_SUFFIX,
            parseApplyPatch_1.UPDATE_FILE_PREFIX,
            parseApplyPatch_1.DELETE_FILE_PREFIX,
            parseApplyPatch_1.ADD_FILE_PREFIX,
        ])) {
            const s = this.read_str();
            if (!s.startsWith(parseApplyPatch_1.HUNK_ADD_LINE_PREFIX)) {
                throw new InvalidPatchFormatError(`Invalid Add File Line: ${s}`, 'invalidAddFileLine');
            }
            lines.push(s.slice(1));
        }
        return {
            type: ActionType.ADD,
            newFile: lines.join("\n"),
            chunks: [],
        };
    }
}
exports.Parser = Parser;
function replace_explicit_tabs(s) {
    return s.replace(/^(?:\s|\\t|\/|#)*/gm, r => r.replaceAll('\\t', '\t'));
}
function replace_explicit_nl(s) {
    return replace_explicit_tabs(s.replaceAll('\\n', '\n'));
}
function find_context_core(lines, context, start) {
    // ---------------------------------------------------------------------------
    // Helpers – Unicode punctuation normalisation
    // ---------------------------------------------------------------------------
    /*
     * The patch-matching algorithm originally required **exact** string equality
     * for non-whitespace characters.  That breaks when the file on disk contains
     * visually identical but different Unicode code-points (e.g. “EN DASH” vs
     * ASCII "-"), because models almost always emit the ASCII variant.  To make
     * apply_patch resilient we canonicalise a handful of common punctuation
     * look-alikes before doing comparisons.
     *
     * We purposefully keep the mapping *small* – only characters that routinely
     * appear in source files and are highly unlikely to introduce ambiguity are
     * included.  Each entry is written using the corresponding Unicode escape so
     * that the file remains ASCII-only even after transpilation.
     */
    const PUNCT_EQUIV = {
        // Hyphen / dash variants --------------------------------------------------
        /* U+002D HYPHEN-MINUS */ "-": "-",
        /* U+2010 HYPHEN */ "\u2010": "-",
        /* U+2011 NO-BREAK HYPHEN */ "\u2011": "-",
        /* U+2012 FIGURE DASH */ "\u2012": "-",
        /* U+2013 EN DASH */ "\u2013": "-",
        /* U+2014 EM DASH */ "\u2014": "-",
        /* U+2212 MINUS SIGN */ "\u2212": "-",
        // Double quotes -----------------------------------------------------------
        /* U+0022 QUOTATION MARK */ "\u0022": '"',
        /* U+201C LEFT DOUBLE QUOTATION MARK */ "\u201C": '"',
        /* U+201D RIGHT DOUBLE QUOTATION MARK */ "\u201D": '"',
        /* U+201E DOUBLE LOW-9 QUOTATION MARK */ "\u201E": '"',
        /* U+00AB LEFT-POINTING DOUBLE ANGLE QUOTATION MARK */ "\u00AB": '"',
        /* U+00BB RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK */ "\u00BB": '"',
        // Single quotes -----------------------------------------------------------
        /* U+0027 APOSTROPHE */ "\u0027": "'",
        /* U+2018 LEFT SINGLE QUOTATION MARK */ "\u2018": "'",
        /* U+2019 RIGHT SINGLE QUOTATION MARK */ "\u2019": "'",
        /* U+201B SINGLE HIGH-REVERSED-9 QUOTATION MARK */ "\u201B": "'",
        // Spaces ------------------------------------------------------------------
        /* U+00A0 NO-BREAK SPACE */ "\u00A0": " ",
        /* U+202F NARROW NO-BREAK SPACE */ "\u202F": " ",
    };
    const canon = (s) => s
        // Canonical Unicode composition first
        .normalize("NFC")
        // Replace punctuation look-alikes
        .replace(/./gu, (c) => PUNCT_EQUIV[c] ?? c);
    if (context.length === 0) {
        return { line: start, fuzz: 0 /* Fuzz.None */ };
    }
    // Pass 1 – exact equality after canonicalisation ---------------------------
    const ctxPass1 = canon(context.join("\n"));
    const workingLines = lines.map(canon);
    for (let i = start; i < workingLines.length; i++) {
        const segment = workingLines.slice(i, i + context.length).join("\n");
        if (segment === ctxPass1) {
            return { line: i, fuzz: 0 /* Fuzz.None */ };
        }
    }
    // Pass 2 – ignore trailing whitespace -------------------------------------
    const ctxPass2 = ctxPass1.split('\n').map(l => l.trimEnd()).join('\n');
    let fuzz = 2 /* Fuzz.IgnoredTrailingWhitespace */;
    for (let i = start; i < workingLines.length; i++) {
        workingLines[i] = workingLines[i].trimEnd();
    }
    for (let i = start; i < lines.length; i++) {
        if (workingLines.slice(i, i + context.length).join('\n') === ctxPass2) {
            return { line: i, fuzz };
        }
    }
    // Pass 3 – normalize explicit \\t tab chars --------------------------------
    const ctxPass3 = replace_explicit_tabs(ctxPass2);
    if (ctxPass3 !== ctxPass2) {
        fuzz |= 4 /* Fuzz.NormalizedExplicitTab */;
        for (let i = start; i < lines.length; i++) {
            if (workingLines.slice(i, i + context.length).join('\n') === ctxPass3) {
                return { line: i, fuzz };
            }
        }
    }
    // Pass 4 normalize explicit \\t and \\n tab chars -------------------------
    if (context.length === 1) { // https://github.com/microsoft/vscode/issues/253960
        const ctxPass4 = replace_explicit_nl(ctxPass3);
        if (ctxPass4 !== ctxPass3) {
            const newContextLines = (0, strings_1.count)(ctxPass4, '\n') + 1;
            for (let i = start; i < lines.length; i++) {
                if (workingLines.slice(i, i + newContextLines).join('\n') === ctxPass4) {
                    return { line: i, fuzz: fuzz | 128 /* Fuzz.NormalizedExplicitNL */ | 4 /* Fuzz.NormalizedExplicitTab */ };
                }
            }
        }
    }
    // Pass 5 – ignore all surrounding whitespace ------------------------------
    const ctxPass5 = ctxPass3.split('\n').map(l => l.trim()).join('\n');
    fuzz |= 8 /* Fuzz.IgnoredWhitespace */;
    for (let i = start; i < workingLines.length; i++) {
        workingLines[i] = workingLines[i].trimStart();
    }
    for (let i = start; i < lines.length; i++) {
        if (workingLines.slice(i, i + context.length).join('\n') === ctxPass5) {
            return { line: i, fuzz, indent: workingLines[i] };
        }
    }
    // Pass 5 - within edit distance while ignoring surrounding whitespace -----
    const maxDistance = Math.floor(context.length * EDIT_DISTANCE_ALLOWANCE_PER_LINE);
    fuzz |= 16 /* Fuzz.EditDistanceMatch */;
    if (maxDistance > 0) {
        const ctxPass6 = ctxPass5.split('\n');
        for (let i = start; i < lines.length; i++) {
            let totalDistance = 0;
            for (let j = 0; j < ctxPass6.length && totalDistance < maxDistance; j++) {
                totalDistance += (0, diff_1.computeLevenshteinDistance)(workingLines[i + j], ctxPass6[j]);
            }
            if (totalDistance <= maxDistance) {
                return { line: i, fuzz };
            }
        }
    }
}
function find_context(path, lines, context, start, eof) {
    // Skip filepath comments in provided context
    path = path.trim();
    if (lines[0]?.includes(path)) {
        lines = lines.slice(1);
    }
    if (context[0]?.includes(path)) {
        context = context.slice(1);
    }
    if (eof) {
        const match1 = find_context_core(lines, context, lines.length - context.length);
        if (match1) {
            return match1;
        }
        const match2 = find_context_core(lines, context, start);
        if (match2) {
            match2.fuzz |= 32 /* Fuzz.IgnoredEofSignal */;
            return match2;
        }
    }
    return find_context_core(lines, context, start);
}
/**
 * @param lines Lines of the patch text
 * @param initialIndex Index in the patch lines from which to parse the next patch
 * @param fuzzMerge Numeral of the fuzz merge to apply. We observe that sometimes
 * 4.1 omits the operation for outdented lines, and can attempt to fix this
 * automatically. We only 'fuzz merge' on candidate section at a time, which is
 * generally fine.
 * @returns
 */
function peek_next_section(lines, initialIndex, fuzzMerge = 0) {
    let index = initialIndex;
    const old = [];
    let delLines = [];
    let insLines = [];
    const chunks = [];
    let mode = 2 /* Mode.Keep */;
    let fuzzMergeNo = 0;
    while (index < lines.length) {
        const s = lines[index];
        if ([
            CHUNK_DELIMITER,
            parseApplyPatch_1.PATCH_SUFFIX,
            parseApplyPatch_1.UPDATE_FILE_PREFIX,
            parseApplyPatch_1.DELETE_FILE_PREFIX,
            parseApplyPatch_1.ADD_FILE_PREFIX,
            parseApplyPatch_1.END_OF_FILE_PREFIX,
        ].some((p) => s.startsWith(p.trim()))) {
            if (mode === 2 /* Mode.Keep */ && old.length && !/\S/.test(old[old.length - 1])) {
                // @connor4312: If the last line is context and empty, remove it. Example
                // input adds an extra newline between `@@`-delimited sections which
                // cause matching to fail if preserved.
                old.pop();
            }
            break;
        }
        if (s === "***") {
            break;
        }
        if (s.startsWith("***")) {
            throw new InvalidPatchFormatError(`Invalid Line: ${s}`, 'invalidLine');
        }
        index += 1;
        const lastMode = mode;
        let line = s;
        if (line[0] === parseApplyPatch_1.HUNK_ADD_LINE_PREFIX) {
            mode = 0 /* Mode.Add */;
        }
        else if (line[0] === parseApplyPatch_1.HUNK_DELETE_LINE_PREFIX) {
            mode = 1 /* Mode.Delete */;
        }
        else if (line[0] === " ") {
            mode = 2 /* Mode.Keep */;
        }
        else {
            // Tolerate invalid lines where the leading whitespace is missing. This is necessary as
            // the model sometimes doesn't fully adhere to the spec and returns lines without leading
            // whitespace for context lines.
            const nextLine = lines[index];
            const nextOp = nextLine?.[0] === parseApplyPatch_1.HUNK_ADD_LINE_PREFIX ? 0 /* Mode.Add */ : nextLine?.[0] === parseApplyPatch_1.HUNK_DELETE_LINE_PREFIX ? 1 /* Mode.Delete */ : 2 /* Mode.Keep */;
            const canFuzz = mode !== 2 /* Mode.Keep */ && nextOp === mode;
            mode = 2 /* Mode.Keep */;
            line = " " + line;
            if (canFuzz) {
                fuzzMergeNo++;
                if (fuzzMerge === fuzzMergeNo) {
                    mode = nextOp;
                }
            }
            // TODO: Re-enable strict mode.
            // throw new DiffError(`Invalid Line: ${line}`)
        }
        line = line.slice(1);
        if (mode === 2 /* Mode.Keep */ && lastMode !== mode) {
            if (insLines.length || delLines.length) {
                chunks.push({
                    origIndex: old.length - delLines.length,
                    delLines: delLines,
                    insLines: insLines,
                });
            }
            delLines = [];
            insLines = [];
        }
        if (mode === 1 /* Mode.Delete */) {
            delLines.push(line);
            old.push(line);
        }
        else if (mode === 0 /* Mode.Add */) {
            insLines.push(line);
        }
        else {
            old.push(line);
        }
    }
    if (insLines.length || delLines.length) {
        chunks.push({
            origIndex: old.length - delLines.length,
            delLines,
            insLines,
        });
    }
    if (index < lines.length && lines[index] === parseApplyPatch_1.END_OF_FILE_PREFIX) {
        index += 1;
        return { nextChunkContext: old, chunks, endPatchIndex: index, eof: true, fuzzMerges: fuzzMergeNo };
    }
    return { nextChunkContext: old, chunks, endPatchIndex: index, eof: false, fuzzMerges: fuzzMergeNo };
}
// -----------------------------------------------------------------------------
// High‑level helpers
// -----------------------------------------------------------------------------
function text_to_patch(text, orig) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
        throw new InvalidPatchFormatError("Invalid patch text", 'invalidPatchText');
    }
    const patchPrefix = parseApplyPatch_1.PATCH_PREFIX.trim();
    if (!(lines[0] ?? "").startsWith(patchPrefix)) {
        throw new InvalidPatchFormatError(`Invalid patch text. Patch must start with ${patchPrefix}.`, 'invalidPatchTextPrefix');
    }
    const patchSuffix = parseApplyPatch_1.PATCH_SUFFIX.trim();
    if (lines[lines.length - 1] !== patchSuffix) {
        lines.push(patchSuffix);
    }
    const parser = new Parser(orig, lines);
    parser.index = 1;
    parser.parse();
    return [parser.patch, parser.fuzz];
}
function identify_files_needed(text) {
    const lines = text.trim().split("\n");
    const result = new Set();
    for (const line of lines) {
        if (line.startsWith(parseApplyPatch_1.UPDATE_FILE_PREFIX)) {
            result.add(line.slice(parseApplyPatch_1.UPDATE_FILE_PREFIX.length));
        }
        if (line.startsWith(parseApplyPatch_1.DELETE_FILE_PREFIX)) {
            result.add(line.slice(parseApplyPatch_1.DELETE_FILE_PREFIX.length));
        }
    }
    return [...result];
}
function identify_files_added(text) {
    const lines = text.trim().split("\n");
    const result = new Set();
    for (const line of lines) {
        if (line.startsWith(parseApplyPatch_1.ADD_FILE_PREFIX)) {
            result.add(line.slice(parseApplyPatch_1.ADD_FILE_PREFIX.length));
        }
    }
    return [...result];
}
function _get_updated_file(text, action, path) {
    if (action.type !== ActionType.UPDATE) {
        throw new Error("Expected UPDATE action");
    }
    const origLines = text.split("\n");
    const destLines = [];
    let origIndex = 0;
    for (const chunk of action.chunks) {
        if (chunk.origIndex > origLines.length) {
            throw new DiffError(`${path}: chunk.origIndex ${chunk.origIndex} > len(lines) ${origLines.length}`);
        }
        if (origIndex > chunk.origIndex) {
            throw new DiffError(`${path}: origIndex ${origIndex} > chunk.origIndex ${chunk.origIndex}`);
        }
        destLines.push(...origLines.slice(origIndex, chunk.origIndex));
        const delta = chunk.origIndex - origIndex;
        origIndex += delta;
        // inserted lines
        if (chunk.insLines.length) {
            for (const l of chunk.insLines) {
                destLines.push(l);
            }
        }
        origIndex += chunk.delLines.length;
    }
    destLines.push(...origLines.slice(origIndex));
    return destLines.join("\n");
}
function patch_to_commit(patch, orig) {
    const commit = { changes: {} };
    for (const [pathKey, action] of Object.entries(patch.actions)) {
        if (action.type === ActionType.DELETE) {
            commit.changes[pathKey] = {
                type: ActionType.DELETE,
                oldContent: orig[pathKey].getText(),
            };
        }
        else if (action.type === ActionType.ADD) {
            commit.changes[pathKey] = {
                type: ActionType.ADD,
                newContent: action.newFile ?? "",
            };
        }
        else if (action.type === ActionType.UPDATE) {
            const text = orig[pathKey]?.getText();
            const newContent = _get_updated_file(text, action, pathKey);
            commit.changes[pathKey] = {
                type: ActionType.UPDATE,
                oldContent: text,
                newContent: newContent,
                movePath: action.movePath ?? undefined,
            };
        }
    }
    return commit;
}
// -----------------------------------------------------------------------------
// Filesystem helpers for Node environment
// -----------------------------------------------------------------------------
async function load_files(paths, openFn) {
    const orig = {};
    for (const p of paths) {
        try {
            orig[p] = await openFn(p);
        }
        catch {
            // Convert any file read error into a DiffError so that callers
            // consistently receive DiffError for patch-related failures.
            throw new DiffError(`File not found: ${p}`);
        }
    }
    return orig;
}
function apply_commit(commit, writeFn, removeFn) {
    for (const [p, change] of Object.entries(commit.changes)) {
        if (change.type === ActionType.DELETE) {
            removeFn(p);
        }
        else if (change.type === ActionType.ADD) {
            writeFn(p, change.newContent ?? "");
        }
        else if (change.type === ActionType.UPDATE) {
            if (change.movePath) {
                writeFn(change.movePath, change.newContent ?? "");
                removeFn(p);
            }
            else {
                writeFn(p, change.newContent ?? "");
            }
        }
    }
}
async function processPatch(text, openFn) {
    if (!text.startsWith(parseApplyPatch_1.PATCH_PREFIX)) {
        throw new InvalidPatchFormatError("Patch must start with *** Begin Patch\\n", 'patchMustStartWithBeginPatch');
    }
    const paths = identify_files_needed(text);
    const orig = await load_files(paths, openFn);
    const [patch, _fuzz] = text_to_patch(text, orig);
    return patch_to_commit(patch, orig);
}
//# sourceMappingURL=parser.js.map