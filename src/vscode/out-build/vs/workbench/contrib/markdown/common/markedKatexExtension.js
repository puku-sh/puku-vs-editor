import { htmlAttributeEncodeValue } from '../../../../base/common/strings.js';
export const mathInlineRegExp = /(?<![a-zA-Z0-9])(?<dollars>\${1,2})(?!\.)(?!\()(?!["'#])((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\k<dollars>(?![a-zA-Z0-9])/; // Non-standard, but ensure opening $ is not preceded and closing $ is not followed by word/number characters, opening $ not followed by ., (, ", ', or #
export const katexContainerClassName = 'vscode-katex-container';
export const katexContainerLatexAttributeName = 'data-latex';
const inlineRule = new RegExp('^' + mathInlineRegExp.source);
export var MarkedKatexExtension;
(function (MarkedKatexExtension) {
    const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;
    function extension(katex, options = {}) {
        return {
            extensions: [
                inlineKatex(options, createRenderer(katex, options, false)),
                blockKatex(options, createRenderer(katex, options, true)),
            ],
        };
    }
    MarkedKatexExtension.extension = extension;
    function createRenderer(katex, options, isBlock) {
        return (token) => {
            let out;
            try {
                const html = katex.renderToString(token.text, {
                    ...options,
                    throwOnError: true,
                    displayMode: token.displayMode,
                });
                // Wrap in a container with attribute as a fallback for extracting the original LaTeX source
                // This ensures we can always retrieve the source even if the annotation element is not present
                out = `<span class="${katexContainerClassName}" ${katexContainerLatexAttributeName}="${htmlAttributeEncodeValue(token.text)}">${html}</span>`;
            }
            catch {
                // On failure, just use the original text including the wrapping $ or $$
                out = token.raw;
            }
            return out + (isBlock ? '\n' : '');
        };
    }
    function inlineKatex(options, renderer) {
        const ruleReg = inlineRule;
        return {
            name: 'inlineKatex',
            level: 'inline',
            start(src) {
                let index;
                let indexSrc = src;
                while (indexSrc) {
                    index = indexSrc.indexOf('$');
                    if (index === -1) {
                        return;
                    }
                    const possibleKatex = indexSrc.substring(index);
                    if (possibleKatex.match(ruleReg)) {
                        return index;
                    }
                    indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
                }
                return;
            },
            tokenizer(src, tokens) {
                const match = src.match(ruleReg);
                if (match) {
                    return {
                        type: 'inlineKatex',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
                return;
            },
            renderer,
        };
    }
    function blockKatex(options, renderer) {
        return {
            name: 'blockKatex',
            level: 'block',
            start(src) {
                return src.match(new RegExp(blockRule.source, 'm'))?.index;
            },
            tokenizer(src, tokens) {
                const match = src.match(blockRule);
                if (match) {
                    return {
                        type: 'blockKatex',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
                return;
            },
            renderer,
        };
    }
})(MarkedKatexExtension || (MarkedKatexExtension = {}));
//# sourceMappingURL=markedKatexExtension.js.map