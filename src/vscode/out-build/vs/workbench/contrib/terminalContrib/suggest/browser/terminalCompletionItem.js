/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { SimpleCompletionItem } from '../../../../services/suggest/browser/simpleCompletionItem.js';
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    // Extension host kinds
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
    TerminalCompletionItemKind[TerminalCompletionItemKind["SymbolicLinkFile"] = 8] = "SymbolicLinkFile";
    TerminalCompletionItemKind[TerminalCompletionItemKind["SymbolicLinkFolder"] = 9] = "SymbolicLinkFolder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Commit"] = 10] = "Commit";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Branch"] = 11] = "Branch";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Tag"] = 12] = "Tag";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Stash"] = 13] = "Stash";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Remote"] = 14] = "Remote";
    TerminalCompletionItemKind[TerminalCompletionItemKind["PullRequest"] = 15] = "PullRequest";
    TerminalCompletionItemKind[TerminalCompletionItemKind["PullRequestDone"] = 16] = "PullRequestDone";
    // Core-only kinds
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestion"] = 100] = "InlineSuggestion";
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestionAlwaysOnTop"] = 101] = "InlineSuggestionAlwaysOnTop";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
// Maps CompletionItemKind from language server based completion to TerminalCompletionItemKind
export function mapLspKindToTerminalKind(lspKind) {
    // TODO: Add more types for different [LSP providers](https://github.com/microsoft/vscode/issues/249480)
    switch (lspKind) {
        case 20 /* CompletionItemKind.File */:
            return TerminalCompletionItemKind.File;
        case 23 /* CompletionItemKind.Folder */:
            return TerminalCompletionItemKind.Folder;
        case 0 /* CompletionItemKind.Method */:
            return TerminalCompletionItemKind.Method;
        case 18 /* CompletionItemKind.Text */:
            return TerminalCompletionItemKind.Argument; // consider adding new type?
        case 4 /* CompletionItemKind.Variable */:
            return TerminalCompletionItemKind.Argument; // ""
        case 16 /* CompletionItemKind.EnumMember */:
            return TerminalCompletionItemKind.OptionValue; // ""
        case 17 /* CompletionItemKind.Keyword */:
            return TerminalCompletionItemKind.Alias;
        default:
            return TerminalCompletionItemKind.Method;
    }
}
export class TerminalCompletionItem extends SimpleCompletionItem {
    constructor(completion) {
        super(completion);
        this.completion = completion;
        /**
         * The file extension part from {@link labelLow}.
         */
        this.fileExtLow = '';
        /**
         * A penalty that applies to completions that are comprised of only punctuation characters or
         * that applies to files or folders starting with the underscore character.
         */
        this.punctuationPenalty = 0;
        // ensure lower-variants (perf)
        this.labelLowExcludeFileExt = this.labelLow;
        this.labelLowNormalizedPath = this.labelLow;
        // HACK: Treat branch as a path separator, otherwise they get filtered out. Hard code the
        // documentation for now, but this would be better to come in through a `kind`
        // See https://github.com/microsoft/vscode/issues/255864
        if (isFile(completion) || completion.kind === TerminalCompletionItemKind.Branch) {
            if (isWindows) {
                this.labelLow = this.labelLow.replaceAll('/', '\\');
            }
        }
        if (isFile(completion)) {
            // Don't include dotfiles as extensions when sorting
            const extIndex = this.labelLow.lastIndexOf('.');
            if (extIndex > 0) {
                this.labelLowExcludeFileExt = this.labelLow.substring(0, extIndex);
                this.fileExtLow = this.labelLow.substring(extIndex + 1);
            }
        }
        if (isFile(completion) || completion.kind === TerminalCompletionItemKind.Folder) {
            if (isWindows) {
                this.labelLowNormalizedPath = this.labelLow.replaceAll('\\', '/');
            }
            if (completion.kind === TerminalCompletionItemKind.Folder) {
                this.labelLowNormalizedPath = this.labelLowNormalizedPath.replace(/\/$/, '');
            }
        }
        this.punctuationPenalty = shouldPenalizeForPunctuation(this.labelLowExcludeFileExt) ? 1 : 0;
    }
    /**
     * Resolves the completion item's details lazily when needed.
     */
    async resolve(token) {
        if (this.resolveCache) {
            return this.resolveCache;
        }
        const unresolvedItem = this.completion._unresolvedItem;
        const provider = this.completion._resolveProvider;
        if (!unresolvedItem || !provider || !provider.resolveCompletionItem) {
            return;
        }
        this.resolveCache = (async () => {
            try {
                const resolved = await provider.resolveCompletionItem(unresolvedItem, token);
                if (resolved) {
                    // Update the completion with resolved details
                    if (resolved.detail) {
                        this.completion.detail = resolved.detail;
                    }
                    if (resolved.documentation) {
                        this.completion.documentation = resolved.documentation;
                    }
                }
            }
            catch (error) {
                return;
            }
        })();
        return this.resolveCache;
    }
}
function isFile(completion) {
    return !!(completion.kind === TerminalCompletionItemKind.File || completion.isFileOverride);
}
function shouldPenalizeForPunctuation(label) {
    return basename(label).startsWith('_') || /^[\[\]\{\}\(\)\.,;:!?\/\\\-_@#~*%^=$]+$/.test(label);
}
//# sourceMappingURL=terminalCompletionItem.js.map