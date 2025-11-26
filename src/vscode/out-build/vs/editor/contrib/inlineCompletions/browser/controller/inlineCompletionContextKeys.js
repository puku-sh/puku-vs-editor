/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../../nls.js';
import * as nls from '../../../../../nls.js';
export class InlineCompletionContextKeys {
    static { this.inlineSuggestionVisible = new RawContextKey('inlineSuggestionVisible', false, localize(1354, null)); }
    static { this.inlineSuggestionHasIndentation = new RawContextKey('inlineSuggestionHasIndentation', false, localize(1355, null)); }
    static { this.inlineSuggestionHasIndentationLessThanTabSize = new RawContextKey('inlineSuggestionHasIndentationLessThanTabSize', true, localize(1356, null)); }
    static { this.suppressSuggestions = new RawContextKey('inlineSuggestionSuppressSuggestions', undefined, localize(1357, null)); }
    static { this.cursorBeforeGhostText = new RawContextKey('cursorBeforeGhostText', false, localize(1358, null)); }
    static { this.cursorInIndentation = new RawContextKey('cursorInIndentation', false, localize(1359, null)); }
    static { this.hasSelection = new RawContextKey('editor.hasSelection', false, localize(1360, null)); }
    static { this.cursorAtInlineEdit = new RawContextKey('cursorAtInlineEdit', false, localize(1361, null)); }
    static { this.inlineEditVisible = new RawContextKey('inlineEditIsVisible', false, localize(1362, null)); }
    static { this.tabShouldJumpToInlineEdit = new RawContextKey('tabShouldJumpToInlineEdit', false, localize(1363, null)); }
    static { this.tabShouldAcceptInlineEdit = new RawContextKey('tabShouldAcceptInlineEdit', false, localize(1364, null)); }
    static { this.inInlineEditsPreviewEditor = new RawContextKey('inInlineEditsPreviewEditor', true, nls.localize(1365, null)); }
}
//# sourceMappingURL=inlineCompletionContextKeys.js.map