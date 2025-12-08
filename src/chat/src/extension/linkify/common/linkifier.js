"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Linkifier = void 0;
const errors_1 = require("../../../util/vs/base/common/errors");
const strings_1 = require("../../../util/vs/base/common/strings");
const linkifiedText_1 = require("./linkifiedText");
var LinkifierState;
(function (LinkifierState) {
    let Type;
    (function (Type) {
        Type[Type["Default"] = 0] = "Default";
        Type[Type["CodeOrMathBlock"] = 1] = "CodeOrMathBlock";
        Type[Type["Accumulating"] = 2] = "Accumulating";
    })(Type = LinkifierState.Type || (LinkifierState.Type = {}));
    let AccumulationType;
    (function (AccumulationType) {
        AccumulationType[AccumulationType["Word"] = 0] = "Word";
        AccumulationType[AccumulationType["InlineCodeOrMath"] = 1] = "InlineCodeOrMath";
        AccumulationType[AccumulationType["PotentialLink"] = 2] = "PotentialLink";
    })(AccumulationType = LinkifierState.AccumulationType || (LinkifierState.AccumulationType = {}));
    LinkifierState.Default = { type: Type.Default };
    class CodeOrMathBlock {
        constructor(fence, indent, contents = '') {
            this.fence = fence;
            this.indent = indent;
            this.contents = contents;
            this.type = Type.CodeOrMathBlock;
        }
        appendContents(text) {
            return new CodeOrMathBlock(this.fence, this.indent, this.contents + text);
        }
    }
    LinkifierState.CodeOrMathBlock = CodeOrMathBlock;
    class Accumulating {
        constructor(pendingText, accumulationType = LinkifierState.AccumulationType.Word, terminator) {
            this.pendingText = pendingText;
            this.accumulationType = accumulationType;
            this.terminator = terminator;
            this.type = LinkifierState.Type.Accumulating;
        }
        append(text) {
            return new Accumulating(this.pendingText + text, this.accumulationType, this.terminator);
        }
    }
    LinkifierState.Accumulating = Accumulating;
})(LinkifierState || (LinkifierState = {}));
/**
 * Stateful linkifier that incrementally linkifies appended text.
 *
 * Make sure to create a new linkifier for each response.
 */
class Linkifier {
    constructor(context, productUriScheme, linkifiers = []) {
        this.context = context;
        this.productUriScheme = productUriScheme;
        this.linkifiers = linkifiers;
        this._state = LinkifierState.Default;
        this._appliedText = '';
        this._totalAddedLinkCount = 0;
    }
    get totalAddedLinkCount() {
        return this._totalAddedLinkCount;
    }
    async append(newText, token) {
        // Linkification needs to run on whole sequences of characters. However the incoming stream may be broken up.
        // To handle this, accumulate text until we have whole tokens.
        const out = [];
        for (const part of newText.split(/(\s+)/)) {
            if (!part.length) {
                continue;
            }
            switch (this._state.type) {
                case LinkifierState.Type.Default: {
                    if (/^\s+$/.test(part)) {
                        out.push(this.doAppend(part));
                    }
                    else {
                        // Start accumulating
                        // `text...
                        if (/^[^\[`]*`[^`]*$/.test(part)) {
                            this._state = new LinkifierState.Accumulating(part, LinkifierState.AccumulationType.InlineCodeOrMath, '`');
                        }
                        // `text`
                        else if (/^`[^`]+`$/.test(part)) {
                            // No linkifying inside inline code
                            out.push(...(await this.doLinkifyAndAppend(part, { skipUnlikify: true }, token)).parts);
                        }
                        // $text...
                        else if (/^[^\[`]*\$[^\$]*$/.test(part)) {
                            this._state = new LinkifierState.Accumulating(part, LinkifierState.AccumulationType.InlineCodeOrMath, '$');
                        }
                        // $text$
                        else if (/^[^\[`]*\$[^\$]*\$$/.test(part)) {
                            // No linkifying inside math code
                            out.push(this.doAppend(part));
                        }
                        // [text...
                        else if (/^\s*\[[^\]]*$/.test(part)) {
                            this._state = new LinkifierState.Accumulating(part, LinkifierState.AccumulationType.PotentialLink);
                        }
                        // Plain old word
                        else {
                            this._state = new LinkifierState.Accumulating(part);
                        }
                    }
                    break;
                }
                case LinkifierState.Type.CodeOrMathBlock: {
                    if (new RegExp('(^|\\n)' + (0, strings_1.escapeRegExpCharacters)(this._state.fence) + '($|\\n)').test(part)
                        || (this._state.contents.length > 2 && new RegExp('(^|\\n)\\s*' + (0, strings_1.escapeRegExpCharacters)(this._state.fence) + '($|\\n\\s*$)').test(this._appliedText + part))) {
                        // To end the code block, the previous text needs to be empty up the start of the last line and
                        // at lower indentation than the opening code block.
                        const indent = this._appliedText.match(/(\n|^)([ \t]*)[`~]*$/);
                        if (indent && indent[2].length <= this._state.indent.length) {
                            this._state = LinkifierState.Default;
                            out.push(this.doAppend(part));
                            break;
                        }
                    }
                    this._state = this._state.appendContents(part);
                    // No linkifying inside code blocks
                    out.push(this.doAppend(part));
                    break;
                }
                case LinkifierState.Type.Accumulating: {
                    const completeWord = async (state, inPart, skipUnlikify) => {
                        const toAppend = state.pendingText + inPart;
                        this._state = LinkifierState.Default;
                        const r = await this.doLinkifyAndAppend(toAppend, { skipUnlikify }, token);
                        out.push(...r.parts);
                    };
                    if (this._state.accumulationType === LinkifierState.AccumulationType.PotentialLink) {
                        if (/]/.test(part)) {
                            this._state = this._state.append(part);
                            break;
                        }
                        else if (/\n/.test(part)) {
                            await completeWord(this._state, part, false);
                            break;
                        }
                    }
                    else if (this._state.accumulationType === LinkifierState.AccumulationType.InlineCodeOrMath && new RegExp((0, strings_1.escapeRegExpCharacters)(this._state.terminator ?? '`')).test(part)) {
                        const terminator = this._state.terminator ?? '`';
                        const terminalIndex = part.indexOf(terminator);
                        if (terminalIndex === -1) {
                            await completeWord(this._state, part, true);
                        }
                        else {
                            if (terminator === '`') {
                                await completeWord(this._state, part, true);
                            }
                            else {
                                // Math shouldn't run linkifies
                                const pre = part.slice(0, terminalIndex + terminator.length);
                                // No linkifying inside inline math
                                out.push(this.doAppend(this._state.pendingText + pre));
                                // But we can linkify after
                                const rest = part.slice(terminalIndex + terminator.length);
                                this._state = LinkifierState.Default;
                                if (rest.length) {
                                    out.push(...(await this.doLinkifyAndAppend(rest, { skipUnlikify: true }, token)).parts);
                                }
                            }
                        }
                        break;
                    }
                    else if (this._state.accumulationType === LinkifierState.AccumulationType.Word && /\s/.test(part)) {
                        const toAppend = this._state.pendingText + part;
                        this._state = LinkifierState.Default;
                        // Check if we've found special tokens
                        const fence = toAppend.match(/(^|\n)\s*(`{3,}|~{3,}|\$\$)/);
                        if (fence) {
                            const indent = this._appliedText.match(/(\n|^)([ \t]*)$/);
                            this._state = new LinkifierState.CodeOrMathBlock(fence[2], indent?.[2] ?? '');
                            out.push(this.doAppend(toAppend));
                        }
                        else {
                            const r = await this.doLinkifyAndAppend(toAppend, {}, token);
                            out.push(...r.parts);
                        }
                        break;
                    }
                    // Keep accumulating
                    this._state = this._state.append(part);
                    break;
                }
            }
        }
        return { parts: (0, linkifiedText_1.coalesceParts)(out) };
    }
    async flush(token) {
        let out;
        switch (this._state.type) {
            case LinkifierState.Type.CodeOrMathBlock: {
                out = { parts: [this.doAppend(this._state.contents)] };
                break;
            }
            case LinkifierState.Type.Accumulating: {
                const toAppend = this._state.pendingText;
                out = await this.doLinkifyAndAppend(toAppend, {}, token);
                break;
            }
        }
        this._state = LinkifierState.Default;
        return out;
    }
    doAppend(newText) {
        this._appliedText = this._appliedText + newText;
        return newText;
    }
    async doLinkifyAndAppend(newText, options, token) {
        if (newText.length === 0) {
            return { parts: [] };
        }
        this.doAppend(newText);
        // Run contributed linkifiers
        let parts = [newText];
        for (const linkifier of this.linkifiers) {
            parts = (0, linkifiedText_1.coalesceParts)(await this.runLinkifier(parts, linkifier, token));
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
        }
        // Do a final pass that un-linkifies any file links that don't have a scheme.
        // This prevents links like: [some text](index.html) from sneaking through as these can never be opened properly.
        if (!options.skipUnlikify) {
            parts = parts.map(part => {
                if (typeof part === 'string') {
                    return part.replaceAll(/\[([^\[\]]+)\]\(([^\s\)]+)\)/g, (matched, text, path) => {
                        // Always preserve product URI scheme links
                        if (path.startsWith(this.productUriScheme + ':')) {
                            return matched;
                        }
                        return /^\w+:/.test(path) ? matched : text;
                    });
                }
                return part;
            });
        }
        this._totalAddedLinkCount += parts.filter(part => typeof part !== 'string').length;
        return { parts };
    }
    async runLinkifier(parts, linkifier, token) {
        const out = [];
        for (const part of parts) {
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
            if (typeof part === 'string') {
                let linkified;
                try {
                    linkified = await linkifier.linkify(part, this.context, token);
                }
                catch (e) {
                    if (!(0, errors_1.isCancellationError)(e)) {
                        console.error(e);
                    }
                    out.push(part);
                    continue;
                }
                if (linkified) {
                    out.push(...linkified.parts);
                }
                else {
                    out.push(part);
                }
            }
            else {
                out.push(part);
            }
        }
        return out;
    }
}
exports.Linkifier = Linkifier;
//# sourceMappingURL=linkifier.js.map