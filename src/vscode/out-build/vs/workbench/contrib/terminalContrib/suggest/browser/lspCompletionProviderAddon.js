/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { mapLspKindToTerminalKind, TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { Position } from '../../../../../editor/common/core/position.js';
export class LspCompletionProviderAddon extends Disposable {
    constructor(provider, textVirtualModel, lspTerminalModelContentProvider) {
        super();
        this.id = 'lsp';
        this.isBuiltin = true;
        this._provider = provider;
        this._textVirtualModel = textVirtualModel;
        this._lspTerminalModelContentProvider = lspTerminalModelContentProvider;
        this.triggerCharacters = provider.triggerCharacters ? [...provider.triggerCharacters, ' ', '('] : [' ', '('];
    }
    activate(terminal) {
        // console.log('activate');
    }
    async provideCompletions(value, cursorPosition, token) {
        // Apply edit for non-executed current commandline --> Pretend we are typing in the real-document.
        this._lspTerminalModelContentProvider.trackPromptInputToVirtualFile(value);
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lines = textBeforeCursor.split('\n');
        const column = lines[lines.length - 1].length + 1;
        // Get line from virtualDocument, not from terminal
        const lineNum = this._textVirtualModel.object.textEditorModel.getLineCount();
        const positionVirtualDocument = new Position(lineNum, column);
        const completions = [];
        if (this._provider && this._provider._debugDisplayName !== 'wordbasedCompletions') {
            const result = await this._provider.provideCompletionItems(this._textVirtualModel.object.textEditorModel, positionVirtualDocument, { triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */ }, token);
            for (const item of (result?.suggestions || [])) {
                // TODO: Support more terminalCompletionItemKind for [different LSP providers](https://github.com/microsoft/vscode/issues/249479)
                const convertedKind = item.kind ? mapLspKindToTerminalKind(item.kind) : TerminalCompletionItemKind.Method;
                const completionItemTemp = createCompletionItemPython(cursorPosition, textBeforeCursor, convertedKind, 'lspCompletionItem', undefined);
                const terminalCompletion = {
                    label: item.label,
                    provider: `lsp:${item.extensionId?.value}`,
                    detail: item.detail,
                    documentation: item.documentation,
                    kind: convertedKind,
                    replacementRange: completionItemTemp.replacementRange,
                };
                // Store unresolved item and provider for lazy resolution if needed
                if (this._provider.resolveCompletionItem && (!item.detail || !item.documentation)) {
                    terminalCompletion._unresolvedItem = item;
                    terminalCompletion._resolveProvider = this._provider;
                }
                completions.push(terminalCompletion);
            }
        }
        return completions;
    }
}
export function createCompletionItemPython(cursorPosition, prefix, kind, label, detail) {
    const lastWord = getLastWord(prefix);
    return {
        label,
        detail: detail ?? '',
        replacementRange: [cursorPosition - lastWord.length, cursorPosition],
        kind: kind ?? TerminalCompletionItemKind.Method
    };
}
function getLastWord(prefix) {
    if (prefix.endsWith(' ')) {
        return '';
    }
    if (prefix.endsWith('.')) {
        return '';
    }
    const lastSpaceIndex = prefix.lastIndexOf(' ');
    const lastDotIndex = prefix.lastIndexOf('.');
    const lastParenIndex = prefix.lastIndexOf('(');
    // Get the maximum index (most recent delimiter)
    const lastDelimiterIndex = Math.max(lastSpaceIndex, lastDotIndex, lastParenIndex);
    // If no delimiter found, return the entire prefix
    if (lastDelimiterIndex === -1) {
        return prefix;
    }
    // Return the substring after the last delimiter
    return prefix.substring(lastDelimiterIndex + 1);
}
//# sourceMappingURL=lspCompletionProviderAddon.js.map