/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground } from '../../../../platform/theme/common/colors/inputColors.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { getCodeEditor } from '../../../browser/editorBrowser.js';
import { AbstractEditorNavigationQuickAccessProvider } from './editorNavigationQuickAccess.js';
export class AbstractGotoLineQuickAccessProvider extends AbstractEditorNavigationQuickAccessProvider {
    static { this.GO_TO_LINE_PREFIX = ':'; }
    static { this.GO_TO_OFFSET_PREFIX = '::'; }
    static { this.ZERO_BASED_OFFSET_STORAGE_KEY = 'gotoLine.useZeroBasedOffset'; }
    constructor() {
        super({ canAcceptInBackground: true });
    }
    get useZeroBasedOffset() {
        return this.storageService.getBoolean(AbstractGotoLineQuickAccessProvider.ZERO_BASED_OFFSET_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
    }
    set useZeroBasedOffset(value) {
        this.storageService.store(AbstractGotoLineQuickAccessProvider.ZERO_BASED_OFFSET_STORAGE_KEY, value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    provideWithoutTextEditor(picker) {
        const label = localize('gotoLine.noEditor', "Open a text editor first to go to a line or an offset.");
        picker.items = [{ label }];
        picker.ariaLabel = label;
        return Disposable.None;
    }
    provideWithTextEditor(context, picker, token) {
        const editor = context.editor;
        const disposables = new DisposableStore();
        // Goto line once picked
        disposables.add(picker.onDidAccept(event => {
            const [item] = picker.selectedItems;
            if (item) {
                if (!item.lineNumber) {
                    return;
                }
                this.gotoLocation(context, { range: this.toRange(item.lineNumber, item.column), keyMods: picker.keyMods, preserveFocus: event.inBackground });
                if (!event.inBackground) {
                    picker.hide();
                }
            }
        }));
        // React to picker changes
        const updatePickerAndEditor = () => {
            const inputText = picker.value.trim().substring(AbstractGotoLineQuickAccessProvider.GO_TO_LINE_PREFIX.length);
            const { inOffsetMode, lineNumber, column, label } = this.parsePosition(editor, inputText);
            // Show toggle only when input text starts with '::'.
            toggle.visible = !!inOffsetMode;
            // Picker
            picker.items = [{
                    lineNumber,
                    column,
                    label,
                }];
            // ARIA Label
            const cursor = editor.getPosition() ?? { lineNumber: 1, column: 1 };
            picker.ariaLabel = localize({
                key: 'gotoLine.ariaLabel',
                comment: ['{0} is the line number, {1} is the column number, {2} is instructions for typing in the Go To Line picker']
            }, "Current position: line {0}, column {1}. {2}", cursor.lineNumber, cursor.column, label);
            // Clear decorations for invalid range
            if (!lineNumber) {
                this.clearDecorations(editor);
                return;
            }
            // Reveal
            const range = this.toRange(lineNumber, column);
            editor.revealRangeInCenter(range, 0 /* ScrollType.Smooth */);
            // Decorate
            this.addDecorations(editor, range);
        };
        // Add a toggle to switch between 1- and 0-based offsets.
        const toggle = new Toggle({
            title: localize('gotoLineToggle', "Use Zero-Based Offset"),
            icon: Codicon.indexZero,
            isChecked: this.useZeroBasedOffset,
            inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
            inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
            inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground)
        });
        disposables.add(toggle.onChange(() => {
            this.useZeroBasedOffset = !this.useZeroBasedOffset;
            updatePickerAndEditor();
        }));
        picker.toggles = [toggle];
        updatePickerAndEditor();
        disposables.add(picker.onDidChangeValue(() => updatePickerAndEditor()));
        // Adjust line number visibility as needed
        const codeEditor = getCodeEditor(editor);
        if (codeEditor) {
            const options = codeEditor.getOptions();
            const lineNumbers = options.get(76 /* EditorOption.lineNumbers */);
            if (lineNumbers.renderType === 2 /* RenderLineNumbersType.Relative */) {
                codeEditor.updateOptions({ lineNumbers: 'on' });
                disposables.add(toDisposable(() => codeEditor.updateOptions({ lineNumbers: 'relative' })));
            }
        }
        return disposables;
    }
    toRange(lineNumber = 1, column = 1) {
        return {
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column
        };
    }
    parsePosition(editor, value) {
        const model = this.getModel(editor);
        if (!model) {
            return {
                label: localize('gotoLine.noEditor', "Open a text editor first to go to a line or an offset.")
            };
        }
        // Support ::<offset> notation to navigate to a specific offset in the model.
        if (value.startsWith(':')) {
            let offset = parseInt(value.substring(1), 10);
            const maxOffset = model.getValueLength();
            if (isNaN(offset)) {
                // No valid offset specified.
                return {
                    inOffsetMode: true,
                    label: this.useZeroBasedOffset ?
                        localize('gotoLine.offsetPromptZero', "Type a character position to go to (from 0 to {0}).", maxOffset - 1) :
                        localize('gotoLine.offsetPrompt', "Type a character position to go to (from 1 to {0}).", maxOffset)
                };
            }
            else {
                const reverse = offset < 0;
                if (!this.useZeroBasedOffset) {
                    // Convert 1-based offset to model's 0-based.
                    offset -= Math.sign(offset);
                }
                if (reverse) {
                    // Offset from the end of the buffer
                    offset += maxOffset;
                }
                const pos = model.getPositionAt(offset);
                return {
                    ...pos,
                    inOffsetMode: true,
                    label: localize('gotoLine.goToPosition', "Press 'Enter' to go to line {0} at column {1}.", pos.lineNumber, pos.column)
                };
            }
        }
        else {
            // Support line-col formats of `line,col`, `line:col`, `line#col`
            const parts = value.split(/,|:|#/);
            const maxLine = model.getLineCount();
            let lineNumber = parseInt(parts[0]?.trim(), 10);
            if (parts.length < 1 || isNaN(lineNumber)) {
                return {
                    label: localize('gotoLine.linePrompt', "Type a line number to go to (from 1 to {0}).", maxLine)
                };
            }
            // Handle negative line numbers and clip to valid range.
            lineNumber = lineNumber >= 0 ? lineNumber : (maxLine + 1) + lineNumber;
            lineNumber = Math.min(Math.max(1, lineNumber), maxLine);
            const maxColumn = model.getLineMaxColumn(lineNumber);
            let column = parseInt(parts[1]?.trim(), 10);
            if (parts.length < 2 || isNaN(column)) {
                return {
                    lineNumber,
                    column: 1,
                    label: parts.length < 2 ?
                        localize('gotoLine.lineColumnPrompt', "Press 'Enter' to go to line {0} or enter colon : to add a column number.", lineNumber) :
                        localize('gotoLine.columnPrompt', "Press 'Enter' to go to line {0} or enter a column number (from 1 to {1}).", lineNumber, maxColumn)
                };
            }
            // Handle negative column numbers and clip to valid range.
            column = column >= 0 ? column : maxColumn + column;
            column = Math.min(Math.max(1, column), maxColumn);
            return {
                lineNumber,
                column,
                label: localize('gotoLine.goToPosition', "Press 'Enter' to go to line {0} at column {1}.", lineNumber, column)
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0xpbmVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3F1aWNrQWNjZXNzL2Jyb3dzZXIvZ290b0xpbmVRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsdUJBQXVCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM1SixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBS2xFLE9BQU8sRUFBRSwyQ0FBMkMsRUFBaUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUk5SCxNQUFNLE9BQWdCLG1DQUFvQyxTQUFRLDJDQUEyQzthQUU1RixzQkFBaUIsR0FBRyxHQUFHLENBQUM7YUFDeEIsd0JBQW1CLEdBQUcsSUFBSSxDQUFDO2FBQ25CLGtDQUE2QixHQUFHLDZCQUE2QixDQUFDO0lBRXRGO1FBQ0MsS0FBSyxDQUFDLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBSUQsSUFBWSxrQkFBa0I7UUFDN0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FDcEMsbUNBQW1DLENBQUMsNkJBQTZCLHFD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