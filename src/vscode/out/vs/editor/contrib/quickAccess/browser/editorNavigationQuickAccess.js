/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { getCodeEditor, isDiffEditor } from '../../../browser/editorBrowser.js';
import { OverviewRulerLane } from '../../../common/model.js';
import { overviewRulerRangeHighlight } from '../../../common/core/editorColorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
/**
 * A reusable quick access provider for the editor with support
 * for adding decorations for navigating in the currently active file
 * (for example "Go to line", "Go to symbol").
 */
export class AbstractEditorNavigationQuickAccessProvider {
    constructor(options) {
        this.options = options;
        //#endregion
        //#region Decorations Utils
        this.rangeHighlightDecorationId = undefined;
    }
    //#region Provider methods
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Apply options if any
        picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;
        // Disable filtering & sorting, we control the results
        picker.matchOnLabel = picker.matchOnDescription = picker.matchOnDetail = picker.sortByLabel = false;
        // Provide based on current active editor
        const pickerDisposable = disposables.add(new MutableDisposable());
        pickerDisposable.value = this.doProvide(picker, token, runOptions);
        // Re-create whenever the active editor changes
        disposables.add(this.onDidActiveTextEditorControlChange(() => {
            // Clear old
            pickerDisposable.value = undefined;
            // Add new
            pickerDisposable.value = this.doProvide(picker, token);
        }));
        return disposables;
    }
    doProvide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // With text control
        const editor = this.activeTextEditorControl;
        if (editor && this.canProvideWithTextEditor(editor)) {
            const context = { editor };
            // Restore any view state if this picker was closed
            // without actually going to a line
            const codeEditor = getCodeEditor(editor);
            if (codeEditor) {
                // Remember view state and update it when the cursor position
                // changes even later because it could be that the user has
                // configured quick access to remain open when focus is lost and
                // we always want to restore the current location.
                let lastKnownEditorViewState = editor.saveViewState() ?? undefined;
                disposables.add(codeEditor.onDidChangeCursorPosition(() => {
                    lastKnownEditorViewState = editor.saveViewState() ?? undefined;
                }));
                context.restoreViewState = () => {
                    if (lastKnownEditorViewState && editor === this.activeTextEditorControl) {
                        editor.restoreViewState(lastKnownEditorViewState);
                    }
                };
                disposables.add(createSingleCallFunction(token.onCancellationRequested)(() => context.restoreViewState?.()));
            }
            // Clean up decorations on dispose
            disposables.add(toDisposable(() => this.clearDecorations(editor)));
            // Ask subclass for entries
            disposables.add(this.provideWithTextEditor(context, picker, token, runOptions));
        }
        // Without text control
        else {
            disposables.add(this.provideWithoutTextEditor(picker, token));
        }
        return disposables;
    }
    /**
     * Subclasses to implement if they can operate on the text editor.
     */
    canProvideWithTextEditor(editor) {
        return true;
    }
    gotoLocation({ editor }, options) {
        editor.setSelection(options.range, "code.jump" /* TextEditorSelectionSource.JUMP */);
        editor.revealRangeInCenter(options.range, 0 /* ScrollType.Smooth */);
        if (!options.preserveFocus) {
            editor.focus();
        }
        const model = this.getModel(editor);
        if (model) {
            status(`${model.getLineContent(options.range.startLineNumber)}`);
        }
    }
    getModel(editor) {
        return isDiffEditor(editor) ?
            editor.getModel()?.modified :
            editor.getModel();
    }
    addDecorations(editor, range) {
        editor.changeDecorations(changeAccessor => {
            // Reset old decorations if any
            const deleteDecorations = [];
            if (this.rangeHighlightDecorationId) {
                deleteDecorations.push(this.rangeHighlightDecorationId.overviewRulerDecorationId);
                deleteDecorations.push(this.rangeHighlightDecorationId.rangeHighlightId);
                this.rangeHighlightDecorationId = undefined;
            }
            // Add new decorations for the range
            const newDecorations = [
                // highlight the entire line on the range
                {
                    range,
                    options: {
                        description: 'quick-access-range-highlight',
                        className: 'rangeHighlight',
                        isWholeLine: true
                    }
                },
                // also add overview ruler highlight
                {
                    range,
                    options: {
                        description: 'quick-access-range-highlight-overview',
                        overviewRuler: {
                            color: themeColorFromId(overviewRulerRangeHighlight),
                            position: OverviewRulerLane.Full
                        }
                    }
                }
            ];
            const [rangeHighlightId, overviewRulerDecorationId] = changeAccessor.deltaDecorations(deleteDecorations, newDecorations);
            this.rangeHighlightDecorationId = { rangeHighlightId, overviewRulerDecorationId };
        });
    }
    clearDecorations(editor) {
        const rangeHighlightDecorationId = this.rangeHighlightDecorationId;
        if (rangeHighlightDecorationId) {
            editor.changeDecorations(changeAccessor => {
                changeAccessor.deltaDecorations([
                    rangeHighlightDecorationId.overviewRulerDecorationId,
                    rangeHighlightDecorationId.rangeHighlightId
                ], []);
            });
            this.rangeHighlightDecorationId = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTmF2aWdhdGlvblF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci9lZGl0b3JOYXZpZ2F0aW9uUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNySCxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR2hGLE9BQU8sRUFBcUMsaUJBQWlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUcxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUEwQmxFOzs7O0dBSUc7QUFDSCxNQUFNLE9BQWdCLDJDQUEyQztJQUVoRSxZQUFzQixPQUE2QztRQUE3QyxZQUFPLEdBQVAsT0FBTyxDQUFzQztRQStIbkUsWUFBWTtRQUdaLDJCQUEyQjtRQUVuQiwrQkFBMEIsR0FBc0MsU0FBUyxDQUFDO0lBcElYLENBQUM7SUFFeEUsMEJBQTBCO0lBRTFCLE9BQU8sQ0FBQyxNQUEyRCxFQUFFLEtBQXdCLEVBQUUsVUFBMkM7UUFDekksTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUUxQyx1QkFBdUI7UUFDdkIsTUFBTSxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxJ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