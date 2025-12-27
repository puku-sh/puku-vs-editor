var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, observableValue } from '../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { Position } from '../../../../../../common/core/position.js';
import { Range } from '../../../../../../common/core/range.js';
import { LineRange } from '../../../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../../../common/core/ranges/offsetRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens, TokenArray } from '../../../../../../common/tokens/lineTokens.js';
import { InlineDecoration } from '../../../../../../common/viewModel/inlineDecorations.js';
import { GhostText, GhostTextPart } from '../../../model/ghostText.js';
import { GhostTextView } from '../../ghostText/ghostTextView.js';
import { getModifiedBorderColor, modifiedBackgroundColor } from '../theme.js';
import { getPrefixTrim, mapOutFalsy } from '../utils/utils.js';
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const WIDGET_SEPARATOR_DIFF_EDITOR_WIDTH = 3;
const BORDER_RADIUS = 4;
let InlineEditsInsertionView = class InlineEditsInsertionView extends Disposable {
    constructor(_editor, _input, _tabAction, instantiationService, _languageService) {
        super();
        this._editor = _editor;
        this._input = _input;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._state = derived(this, reader => {
            const state = this._input.read(reader);
            if (!state) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            if (state.startColumn === 1 && state.lineNumber > 1 && textModel.getLineLength(state.lineNumber) !== 0 && state.text.endsWith(eol) && !state.text.startsWith(eol)) {
                const endOfLineColumn = textModel.getLineLength(state.lineNumber - 1) + 1;
                return { lineNumber: state.lineNumber - 1, column: endOfLineColumn, text: eol + state.text.slice(0, -eol.length) };
            }
            return { lineNumber: state.lineNumber, column: state.startColumn, text: state.text };
        });
        this._trimVertically = derived(this, reader => {
            const state = this._state.read(reader);
            const text = state?.text;
            if (!text || text.trim() === '') {
                return { topOffset: 0, bottomOffset: 0, linesTop: 0, linesBottom: 0 };
            }
            // Adjust for leading/trailing newlines
            const lineHeight = this._editor.getLineHeightForPosition(new Position(state.lineNumber, 1));
            const eol = this._editor.getModel().getEOL();
            let linesTop = 0;
            let linesBottom = 0;
            let i = 0;
            for (; i < text.length && text.startsWith(eol, i); i += eol.length) {
                linesTop += 1;
            }
            for (let j = text.length; j > i && text.endsWith(eol, j); j -= eol.length) {
                linesBottom += 1;
            }
            return { topOffset: linesTop * lineHeight, bottomOffset: linesBottom * lineHeight, linesTop, linesBottom };
        });
        this._maxPrefixTrim = derived(this, reader => {
            const state = this._state.read(reader);
            if (!state) {
                return { prefixLeftOffset: 0, prefixTrim: 0 };
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const trimVertically = this._trimVertically.read(reader);
            const lines = state.text.split(eol);
            const modifiedLines = lines.slice(trimVertically.linesTop, lines.length - trimVertically.linesBottom);
            if (trimVertically.linesTop === 0) {
                modifiedLines[0] = textModel.getLineContent(state.lineNumber) + modifiedLines[0];
            }
            const originalRange = new LineRange(state.lineNumber, state.lineNumber + (trimVertically.linesTop > 0 ? 0 : 1));
            return getPrefixTrim([], originalRange, modifiedLines, this._editor);
        });
        this._ghostText = derived(reader => {
            const state = this._state.read(reader);
            const prefixTrim = this._maxPrefixTrim.read(reader);
            if (!state) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const modifiedLines = state.text.split(eol);
            const inlineDecorations = modifiedLines.map((line, i) => new InlineDecoration(new Range(i + 1, i === 0 ? 1 : prefixTrim.prefixTrim + 1, i + 1, line.length + 1), 'modified-background', 0 /* InlineDecorationType.Regular */));
            return new GhostText(state.lineNumber, [new GhostTextPart(state.column, state.text, false, inlineDecorations)]);
        });
        this._display = derived(this, reader => !!this._state.read(reader) ? 'block' : 'none');
        this._editorMaxContentWidthInRange = derived(this, reader => {
            const state = this._state.read(reader);
            if (!state) {
                return 0;
            }
            this._editorObs.versionId.read(reader);
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const textBeforeInsertion = state.text.startsWith(eol) ? '' : textModel.getValueInRange(new Range(state.lineNumber, 1, state.lineNumber, state.column));
            const textAfterInsertion = textModel.getValueInRange(new Range(state.lineNumber, state.column, state.lineNumber, textModel.getLineLength(state.lineNumber) + 1));
            const text = textBeforeInsertion + state.text + textAfterInsertion;
            const lines = text.split(eol);
            const renderOptions = RenderOptions.fromEditor(this._editor).withSetWidth(false).withScrollBeyondLastColumn(0);
            const lineWidths = lines.map(line => {
                const t = textModel.tokenization.tokenizeLinesAt(state.lineNumber, [line])?.[0];
                let tokens;
                if (t) {
                    tokens = TokenArray.fromLineTokens(t).toLineTokens(line, this._languageService.languageIdCodec);
                }
                else {
                    tokens = LineTokens.createEmpty(line, this._languageService.languageIdCodec);
                }
                return renderLines(new LineSource([tokens]), renderOptions, [], $('div'), true).minWidthInPx;
            });
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return Math.max(...lineWidths);
        });
        this.startLineOffset = this._trimVertically.map(v => v.topOffset);
        this.originalLines = this._state.map(s => s ?
            new LineRange(s.lineNumber, Math.min(s.lineNumber + 2, this._editor.getModel().getLineCount() + 1)) : undefined);
        this._overlayLayout = derived(this, (reader) => {
            this._ghostText.read(reader);
            const state = this._state.read(reader);
            if (!state) {
                return null;
            }
            // Update the overlay when the position changes
            this._editorObs.observePosition(observableValue(this, new Position(state.lineNumber, state.column)), reader.store).read(reader);
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const verticalScrollbarWidth = this._editorObs.layoutInfoVerticalScrollbarWidth.read(reader);
            const right = editorLayout.contentLeft + this._editorMaxContentWidthInRange.read(reader) - horizontalScrollOffset;
            const prefixLeftOffset = this._maxPrefixTrim.read(reader).prefixLeftOffset ?? 0 /* fix due to observable bug? */;
            const left = editorLayout.contentLeft + prefixLeftOffset - horizontalScrollOffset;
            if (right <= left) {
                return null;
            }
            const { topOffset: topTrim, bottomOffset: bottomTrim } = this._trimVertically.read(reader);
            const scrollTop = this._editorObs.scrollTop.read(reader);
            const height = this._ghostTextView.height.read(reader) - topTrim - bottomTrim;
            const top = this._editor.getTopForLineNumber(state.lineNumber) - scrollTop + topTrim;
            const bottom = top + height;
            const overlay = new Rect(left, top, right, bottom);
            return {
                overlay,
                startsAtContentLeft: prefixLeftOffset === 0,
                contentLeft: editorLayout.contentLeft,
                minContentWidthRequired: prefixLeftOffset + overlay.width + verticalScrollbarWidth,
            };
        }).recomputeInitiallyAndOnChange(this._store);
        this._modifiedOverlay = n.div({
            style: { pointerEvents: 'none', }
        }, derived(this, reader => {
            const overlayLayoutObs = mapOutFalsy(this._overlayLayout).read(reader);
            if (!overlayLayoutObs) {
                return undefined;
            }
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayHider = overlayLayoutObs.map(layoutInfo => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.overlay.top, layoutInfo.contentLeft, layoutInfo.overlay.bottom)).read(reader);
            const separatorWidth = this._input.map(i => i?.inDiffEditor ? WIDGET_SEPARATOR_DIFF_EDITOR_WIDTH : WIDGET_SEPARATOR_WIDTH).read(reader);
            const overlayRect = overlayLayoutObs.map(l => l.overlay.withMargin(0, BORDER_WIDTH, 0, l.startsAtContentLeft ? 0 : BORDER_WIDTH).intersectHorizontal(new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER)));
            const underlayRect = overlayRect.map(rect => rect.withMargin(separatorWidth, separatorWidth));
            return [
                n.div({
                    class: 'originalUnderlayInsertion',
                    style: {
                        ...underlayRect.read(reader).toStyles(),
                        borderRadius: BORDER_RADIUS,
                        border: `${BORDER_WIDTH + separatorWidth}px solid ${asCssVariable(editorBackground)}`,
                        boxSizing: 'border-box',
                    }
                }),
                n.div({
                    class: 'originalOverlayInsertion',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius: BORDER_RADIUS,
                        border: getModifiedBorderColor(this._tabAction).map(bc => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`),
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(modifiedBackgroundColor),
                    }
                }),
                n.div({
                    class: 'originalOverlayHiderInsertion',
                    style: {
                        ...overlayHider.toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    }
                })
            ];
        })).keepUpdated(this._store);
        this._view = n.div({
            class: 'inline-edits-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                display: this._display,
            },
        }, [
            [this._modifiedOverlay],
        ]).keepUpdated(this._store);
        this._editorObs = observableCodeEditor(this._editor);
        this._ghostTextView = this._register(instantiationService.createInstance(GhostTextView, this._editor, derived(reader => {
            const ghostText = this._ghostText.read(reader);
            if (!ghostText) {
                return undefined;
            }
            return {
                ghostText: ghostText,
                handleInlineCompletionShown: (data) => {
                    // This is a no-op for the insertion view, as it is handled by the InlineEditsView.
                },
                warning: undefined,
            };
        }), {
            extraClasses: ['inline-edit'],
            isClickable: true,
            shouldKeepCursorStable: true,
        }));
        this.isHovered = this._ghostTextView.isHovered;
        this._register(this._ghostTextView.onDidClick((e) => {
            this._onDidClick.fire(e);
        }));
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._view.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived(this, reader => {
                const info = this._overlayLayout.read(reader);
                if (info === null) {
                    return 0;
                }
                return info.minContentWidthRequired;
            }),
        }));
    }
};
InlineEditsInsertionView = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILanguageService)
], InlineEditsInsertionView);
export { InlineEditsInsertionView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNJbnNlcnRpb25WaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNJbnNlcnRpb25WaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekYsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJGQUEyRixDQUFDO0FBQ25KLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0seURBQXlELENBQUM7QUFDakgsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLGtDQUFrQyxDQUFDO0FBRXZGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRS9ELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQztBQUNqQyxNQUFNLGtDQUFrQyxHQUFHLENBQUMsQ0FBQztBQUM3QyxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUM7QUFFakIsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBeUZ2RCxZQUNrQixPQUFvQixFQUNwQixNQUtILEVBQ0csVUFBNEMsRUFDdEMsb0JBQTJDLEVBQ2hELGdCQUFtRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQVhTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsV0FBTSxHQUFOLE1BQU0sQ0FLVDtRQUNHLGVBQVUsR0FBVixVQUFVLENBQWtDO1FBRTFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFoR3JELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUM7UUFDakUsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBRTVCLFdBQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ2hELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFFakMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUMzQyxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFL0IsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuSyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwSCxDQUFDO1lBRUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEYsQ0FBQyxDQUFDLENBQUM7UUFFYyxvQkFBZSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDekQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQztZQUN6QixJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDakMsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxDQUFDO1lBRUQsdUNBQXVDO1lBQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztZQUVwQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BFLFFBQVEsSUFBSSxDQUFDLENBQUM7WUFDZixDQUFDO1lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDM0UsV0FBVyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEdBQUcsVUFBVSxFQUFFLFlBQVksRUFBRSxXQUFXLEdBQUcsVUFBVSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUM1RyxDQUFDLENBQUMsQ0FBQztRQUVjLG1CQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUN4RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDL0MsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDM0MsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBRS9CLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXpELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RyxJQUFJLGNBQWMsQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEYsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFaEgsT0FBTyxhQUFhLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBRWMsZUFBVSxHQUFHLE9BQU8sQ0FBd0IsTUFBTSxDQUFDLEVBQUU7WUFDckUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLE9BQU8sU0FBUyxDQUFDO1lBQUMsQ0FBQztZQUVqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBQzNDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUU1QyxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUM1RSxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUNqRixxQkFBcUIsdUNBRXJCLENBQUMsQ0FBQztZQUVILE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakgsQ0FBQyxDQUFDLENBQUM7UUE4RGMsYUFBUSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbEYsa0NBQTZCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUN2RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDM0MsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBRS9CLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3hKLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pLLE1BQU0sSUFBSSxHQUFHLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsa0JBQWtCLENBQUM7WUFDbkUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUU5QixNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0csTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEYsSUFBSSxNQUFrQixDQUFDO2dCQUN2QixJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNQLE1BQU0sR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNqRyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDOUUsQ0FBQztnQkFFRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDO1lBQzlGLENBQUMsQ0FBQyxDQUFDO1lBRUgsdUNBQXVDO1lBQ3ZDLGlFQUFpRTtZQUNqRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztRQUVhLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0Qsa0JBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELElBQUksU0FBUyxDQUNaLENBQUMsQ0FBQyxVQUFVLEVBQ1osSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUN2RSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQ2IsQ0FBQztRQUVlLG1CQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzFELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCwrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFaEksTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0YsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLHNCQUFzQixDQUFDO1lBQ2xILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLGdDQUFnQyxDQUFDO1lBQ2pILE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUM7WUFDbEYsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUzRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sR0FBRyxVQUFVLENBQUM7WUFDOUUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsU0FBUyxHQUFHLE9BQU8sQ0FBQztZQUNyRixNQUFNLE1BQU0sR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDO1lBRTVCLE1BQU0sT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRW5ELE9BQU87Z0JBQ04sT0FBTztnQkFDUCxtQkFBbUIsRUFBRSxnQkFBZ0IsS0FBSyxDQUFDO2dCQUMzQyxXQUFXLEVBQUUsWUFBWSxDQUFDLFdBQVc7Z0JBQ3JDLHVCQUF1QixFQUFFLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsc0JBQXNCO2FBQ2xGLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0IscUJBQWdCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUN6QyxLQUFLLEVBQUUsRUFBRSxhQUFhLEVBQUUsTUFBTSxHQUFHO1NBQ2pDLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUN6QixNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUFDLE9BQU8sU0FBUyxDQUFDO1lBQUMsQ0FBQztZQUU1Qyx5R0FBeUc7WUFDekcscUVBQXFFO1lBQ3JFLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FDbEYsVUFBVSxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsWUFBWSxFQUNyRCxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFDdEIsVUFBVSxDQUFDLFdBQVcsRUFDdEIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFaEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEksTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLG1CQUFtQixDQUFDLElBQUksV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25OLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBRTlGLE9BQU87Z0JBQ04sQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDTCxLQUFLLEVBQUUsMkJBQTJCO29CQUNsQyxLQUFLLEVBQUU7d0JBQ04sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTt3QkFDdkMsWUFBWSxFQUFFLGFBQWE7d0JBQzNCLE1BQU0sRUFBRSxHQUFHLFlBQVksR0FBRyxjQUFjLFlBQVksYUFBYSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7d0JBQ3JGLFNBQVMsRUFBRSxZQUFZO3FCQUN2QjtpQkFDRCxDQUFDO2dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFLDBCQUEwQjtvQkFDakMsS0FBSyxFQUFFO3dCQUNOLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7d0JBQ3RDLFlBQVksRUFBRSxhQUFhO3dCQUMzQixNQUFNLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxZQUFZLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO3dCQUN6RyxTQUFTLEVBQUUsWUFBWTt3QkFDdkIsZUFBZSxFQUFFLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztxQkFDdkQ7aUJBQ0QsQ0FBQztnQkFDRixDQUFDLENBQUMsR0FBRyxDQUFDO29CQUNMLEtBQUssRUFBRSwrQkFBK0I7b0JBQ3RDLEtBQUssRUFBRTt3QkFDTixHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUU7d0JBQzFCLGVBQWUsRUFBRSxhQUFhLENBQUMsZ0JBQWdCLENBQUM7cUJBQ2hEO2lCQUNELENBQUM7YUFDRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRVosVUFBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDOUIsS0FBSyxFQUFFLG1CQUFtQjtZQUMxQixLQUFLLEVBQUU7Z0JBQ04sUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixHQUFHLEVBQUUsS0FBSztnQkFDVixJQUFJLEVBQUUsS0FBSztnQkFDWCxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDdEI7U0FDRCxFQUFFO1lBQ0YsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7U0FDdkIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUF2TDNCLElBQUksQ0FBQyxVQUFVLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXJELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZFLGFBQWEsRUFDYixJQUFJLENBQUMsT0FBTyxFQUNaLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNoQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxPQUFPO2dCQUNOLFNBQVMsRUFBRSxTQUFTO2dCQUNwQiwyQkFBMkIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNyQyxtRkFBbUY7Z0JBQ3BGLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLFNBQVM7YUFDYSxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxFQUNGO1lBQ0MsWUFBWSxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQzdCLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLHNCQUFzQixFQUFFLElBQUk7U0FDNUIsQ0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBRS9DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ2xELE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU87WUFDM0IsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDL0IsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixtQkFBbUIsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUMzQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQUMsQ0FBQztnQkFDaEMsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDckMsQ0FBQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBK0lELENBQUE7QUEvUlksd0JBQXdCO0lBa0dsQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7R0FuR04sd0JBQXdCLENBK1JwQyJ9