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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHNwQ29tcGxldGlvblByb3ZpZGVyQWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL2xzcENvbXBsZXRpb25Qcm92aWRlckFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSx5Q0FBeUMsQ0FBQztBQUdqRixPQUFPLEVBQXVCLHdCQUF3QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBS3pFLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0lBUXpELFlBQ0MsUUFBZ0MsRUFDaEMsZ0JBQXNELEVBQ3RELCtCQUFnRTtRQUVoRSxLQUFLLEVBQUUsQ0FBQztRQVpBLE9BQUUsR0FBRyxLQUFLLENBQUM7UUFDWCxjQUFTLEdBQUcsSUFBSSxDQUFDO1FBWXpCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQztRQUMxQyxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsK0JBQStCLENBQUM7UUFDeEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzlHLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsMkJBQTJCO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMs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