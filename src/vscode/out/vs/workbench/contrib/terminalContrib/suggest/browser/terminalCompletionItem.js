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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uSXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRW5FLE9BQU8sRUFBcUIsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV2SCxNQUFNLENBQU4sSUFBWSwwQkF1Qlg7QUF2QkQsV0FBWSwwQkFBMEI7SUFDckMsdUJBQXVCO0lBQ3ZCLDJFQUFRLENBQUE7SUFDUiwrRUFBVSxDQUFBO0lBQ1YsK0VBQVUsQ0FBQTtJQUNWLDZFQUFTLENBQUE7SUFDVCxtRkFBWSxDQUFBO0lBQ1osK0VBQVUsQ0FBQTtJQUNWLHlGQUFlLENBQUE7SUFDZiwyRUFBUSxDQUFBO0lBQ1IsbUdBQW9CLENBQUE7SUFDcEIsdUdBQXNCLENBQUE7SUFDdEIsZ0ZBQVcsQ0FBQTtJQUNYLGdGQUFXLENBQUE7SUFDWCwwRUFBUSxDQUFBO0lBQ1IsOEVBQVUsQ0FBQTtJQUNWLGdGQUFXLENBQUE7SUFDWCwwRkFBZ0IsQ0FBQTtJQUNoQixrR0FBb0IsQ0FBQTtJQUVwQixrQkFBa0I7SUFDbEIscUdBQXNCLENBQUE7SUFDdEIsMkhBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQXZCVywwQkFBMEIsS0FBMUIsMEJBQTBCLFFBdUJyQztBQUVELDhGQUE4RjtBQUM5RixNQUFNLFVBQVUsd0JBQXdCLENBQUMsT0FBMkI7SUFDbkUsd0dBQXdHO0lBRXhHLFFBQVEs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