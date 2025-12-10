/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { n, trackFocus } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { BugIndicatingError } from '../../../../../../../base/common/errors.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, debouncedObservable, derived, observableFromEvent, observableValue, runOnChange } from '../../../../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { Point } from '../../../../../../common/core/2d/point.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { OffsetRange } from '../../../../../../common/core/ranges/offsetRange.js';
import { StickyScrollController } from '../../../../../stickyScroll/browser/stickyScrollController.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { getEditorBlendedColor, inlineEditIndicatorBackground, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorPrimaryBorder, inlineEditIndicatorPrimaryForeground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorSecondaryBorder, inlineEditIndicatorSecondaryForeground, inlineEditIndicatorsuccessfulBackground, inlineEditIndicatorsuccessfulBorder, inlineEditIndicatorsuccessfulForeground } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
import { GutterIndicatorMenuContent } from './gutterIndicatorMenu.js';
import { assertNever } from '../../../../../../../base/common/assert.js';
import { localize } from '../../../../../../../nls.js';
export class InlineEditsGutterIndicatorData {
    constructor(gutterMenuData, originalRange, model) {
        this.gutterMenuData = gutterMenuData;
        this.originalRange = originalRange;
        this.model = model;
    }
}
export class InlineSuggestionGutterMenuData {
    static fromInlineSuggestion(suggestion) {
        return new InlineSuggestionGutterMenuData(suggestion.action, suggestion.source.provider.displayName ?? localize('inlineSuggestion', "Inline Suggestion"), suggestion.source.inlineSuggestions.commands ?? []);
    }
    constructor(action, displayName, extensionCommands) {
        this.action = action;
        this.displayName = displayName;
        this.extensionCommands = extensionCommands;
    }
}
// TODO this class does not make that much sense yet.
export class SimpleInlineSuggestModel {
    static fromInlineCompletionModel(model) {
        return new SimpleInlineSuggestModel(() => model.accept(), () => model.jump());
    }
    constructor(accept, jump) {
        this.accept = accept;
        this.jump = jump;
    }
}
let InlineEditsGutterIndicator = class InlineEditsGutterIndicator extends Disposable {
    constructor(_editorObs, _data, _tabAction, _verticalOffset, _isHoveringOverInlineEdit, _focusIsInMenu, _hoverService, _instantiationService, _accessibilityService, _themeService) {
        super();
        this._editorObs = _editorObs;
        this._data = _data;
        this._tabAction = _tabAction;
        this._verticalOffset = _verticalOffset;
        this._isHoveringOverInlineEdit = _isHoveringOverInlineEdit;
        this._focusIsInMenu = _focusIsInMenu;
        this._hoverService = _hoverService;
        this._instantiationService = _instantiationService;
        this._accessibilityService = _accessibilityService;
        this._themeService = _themeService;
        this._gutterIndicatorStyles = derived(this, reader => {
            const v = this._tabAction.read(reader);
            switch (v) {
                case InlineEditTabAction.Inactive: return {
                    background: getEditorBlendedColor(inlineEditIndicatorSecondaryBackground, this._themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorSecondaryForeground, this._themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorSecondaryBorder, this._themeService).read(reader).toString(),
                };
                case InlineEditTabAction.Jump: return {
                    background: getEditorBlendedColor(inlineEditIndicatorPrimaryBackground, this._themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorPrimaryForeground, this._themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorPrimaryBorder, this._themeService).read(reader).toString()
                };
                case InlineEditTabAction.Accept: return {
                    background: getEditorBlendedColor(inlineEditIndicatorsuccessfulBackground, this._themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorsuccessfulForeground, this._themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorsuccessfulBorder, this._themeService).read(reader).toString()
                };
                default:
                    assertNever(v);
            }
        });
        this._state = derived(this, reader => {
            const range = this._originalRangeObs.read(reader);
            if (!range) {
                return undefined;
            }
            return {
                range,
                lineOffsetRange: this._editorObs.observeLineOffsetRange(range, reader.store),
            };
        });
        this._lineNumberToRender = derived(this, reader => {
            if (this._verticalOffset.read(reader) !== 0) {
                return '';
            }
            const lineNumber = this._data.read(reader)?.originalRange.startLineNumber;
            const lineNumberOptions = this._editorObs.getOption(76 /* EditorOption.lineNumbers */).read(reader);
            if (lineNumber === undefined || lineNumberOptions.renderType === 0 /* RenderLineNumbersType.Off */) {
                return '';
            }
            if (lineNumberOptions.renderType === 3 /* RenderLineNumbersType.Interval */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (lineNumber % 10 === 0 || cursorPosition && cursorPosition.lineNumber === lineNumber) {
                    return lineNumber.toString();
                }
                return '';
            }
            if (lineNumberOptions.renderType === 2 /* RenderLineNumbersType.Relative */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (!cursorPosition) {
                    return '';
                }
                const relativeLineNumber = Math.abs(lineNumber - cursorPosition.lineNumber);
                if (relativeLineNumber === 0) {
                    return lineNumber.toString();
                }
                return relativeLineNumber.toString();
            }
            if (lineNumberOptions.renderType === 4 /* RenderLineNumbersType.Custom */) {
                if (lineNumberOptions.renderFn) {
                    return lineNumberOptions.renderFn(lineNumber);
                }
                return '';
            }
            return lineNumber.toString();
        });
        this._availableWidthForIcon = derived(this, reader => {
            const textModel = this._editorObs.editor.getModel();
            const editor = this._editorObs.editor;
            const layout = this._editorObs.layoutInfo.read(reader);
            const gutterWidth = layout.decorationsLeft + layout.decorationsWidth - layout.glyphMarginLeft;
            if (!textModel || gutterWidth <= 0) {
                return () => 0;
            }
            // no glyph margin => the entire gutter width is available as there is no optimal place to put the icon
            if (layout.lineNumbersLeft === 0) {
                return () => gutterWidth;
            }
            const lineNumberOptions = this._editorObs.getOption(76 /* EditorOption.lineNumbers */).read(reader);
            if (lineNumberOptions.renderType === 2 /* RenderLineNumbersType.Relative */ || /* likely to flicker */
                lineNumberOptions.renderType === 0 /* RenderLineNumbersType.Off */) {
                return () => gutterWidth;
            }
            const w = editor.getOption(59 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
            const rightOfLineNumber = layout.lineNumbersLeft + layout.lineNumbersWidth;
            const totalLines = textModel.getLineCount();
            const totalLinesDigits = (totalLines + 1 /* 0 based to 1 based*/).toString().length;
            const offsetDigits = [];
            // We only need to pre compute the usable width left of the line number for the first line number with a given digit count
            for (let digits = 1; digits <= totalLinesDigits; digits++) {
                const firstLineNumberWithDigitCount = 10 ** (digits - 1);
                const topOfLineNumber = editor.getTopForLineNumber(firstLineNumberWithDigitCount);
                const digitsWidth = digits * w;
                const usableWidthLeftOfLineNumber = Math.min(gutterWidth, Math.max(0, rightOfLineNumber - digitsWidth - layout.glyphMarginLeft));
                offsetDigits.push({ firstLineNumberWithDigitCount, topOfLineNumber, usableWidthLeftOfLineNumber });
            }
            return (topOffset) => {
                for (let i = offsetDigits.length - 1; i >= 0; i--) {
                    if (topOffset >= offsetDigits[i].topOfLineNumber) {
                        return offsetDigits[i].usableWidthLeftOfLineNumber;
                    }
                }
                throw new BugIndicatingError('Could not find avilable width for icon');
            };
        });
        this._layout = derived(this, reader => {
            const s = this._state.read(reader);
            if (!s) {
                return undefined;
            }
            const layout = this._editorObs.layoutInfo.read(reader);
            const lineHeight = this._editorObs.observeLineHeightForLine(s.range.map(r => r.startLineNumber)).read(reader);
            const gutterViewPortPadding = 2;
            // Entire gutter view from top left to bottom right
            const gutterWidthWithoutPadding = layout.decorationsLeft + layout.decorationsWidth - layout.glyphMarginLeft - 2 * gutterViewPortPadding;
            const gutterHeightWithoutPadding = layout.height - 2 * gutterViewPortPadding;
            const gutterViewPortWithStickyScroll = Rect.fromLeftTopWidthHeight(gutterViewPortPadding, gutterViewPortPadding, gutterWidthWithoutPadding, gutterHeightWithoutPadding);
            const gutterViewPortWithoutStickyScrollWithoutPaddingTop = gutterViewPortWithStickyScroll.withTop(this._stickyScrollHeight.read(reader));
            const gutterViewPortWithoutStickyScroll = gutterViewPortWithStickyScroll.withTop(gutterViewPortWithoutStickyScrollWithoutPaddingTop.top + gutterViewPortPadding);
            // The glyph margin area across all relevant lines
            const verticalEditRange = s.lineOffsetRange.read(reader);
            // Guard against invalid ranges where start > end
            const safeVerticalRange = verticalEditRange.start <= verticalEditRange.endExclusive
                ? verticalEditRange
                : OffsetRange.fromTo(verticalEditRange.endExclusive, verticalEditRange.start);
            const gutterEditArea = Rect.fromRanges(OffsetRange.fromTo(gutterViewPortWithoutStickyScroll.left, gutterViewPortWithoutStickyScroll.right), safeVerticalRange);
            // The gutter view container (pill)
            const pillHeight = lineHeight;
            const pillOffset = this._verticalOffset.read(reader);
            const pillFullyDockedRect = gutterEditArea.withHeight(pillHeight).translateY(pillOffset);
            const pillIsFullyDocked = gutterViewPortWithoutStickyScrollWithoutPaddingTop.containsRect(pillFullyDockedRect);
            // The icon which will be rendered in the pill
            const iconNoneDocked = this._tabAction.map(action => action === InlineEditTabAction.Accept ? Codicon.keyboardTab : Codicon.arrowRight);
            const iconDocked = derived(this, reader => {
                if (this._isHoveredOverIconDebounced.read(reader) || this._isHoveredOverInlineEditDebounced.read(reader)) {
                    return Codicon.check;
                }
                if (this._tabAction.read(reader) === InlineEditTabAction.Accept) {
                    return Codicon.keyboardTab;
                }
                const cursorLineNumber = this._editorObs.cursorLineNumber.read(reader) ?? 0;
                const editStartLineNumber = s.range.read(reader).startLineNumber;
                return cursorLineNumber <= editStartLineNumber ? Codicon.keyboardTabAbove : Codicon.keyboardTabBelow;
            });
            const idealIconWidth = 22;
            const minimalIconWidth = 16; // codicon size
            const iconWidth = (pillRect) => {
                const availableWidth = this._availableWidthForIcon.read(undefined)(pillRect.bottom + this._editorObs.editor.getScrollTop()) - gutterViewPortPadding;
                return Math.max(Math.min(availableWidth, idealIconWidth), minimalIconWidth);
            };
            if (pillIsFullyDocked) {
                const pillRect = pillFullyDockedRect;
                let lineNumberWidth;
                if (layout.lineNumbersWidth === 0) {
                    lineNumberWidth = Math.min(Math.max(layout.lineNumbersLeft - gutterViewPortWithStickyScroll.left, 0), pillRect.width - idealIconWidth);
                }
                else {
                    lineNumberWidth = Math.max(layout.lineNumbersLeft + layout.lineNumbersWidth - gutterViewPortWithStickyScroll.left, 0);
                }
                const lineNumberRect = pillRect.withWidth(lineNumberWidth);
                const iconWidth = Math.max(Math.min(layout.decorationsWidth, idealIconWidth), minimalIconWidth);
                const iconRect = pillRect.withWidth(iconWidth).translateX(lineNumberWidth);
                return {
                    gutterEditArea,
                    icon: iconDocked,
                    iconDirection: 'right',
                    iconRect,
                    pillRect,
                    lineNumberRect,
                };
            }
            const pillPartiallyDockedPossibleArea = gutterViewPortWithStickyScroll.intersect(gutterEditArea); // The area in which the pill could be partially docked
            const pillIsPartiallyDocked = pillPartiallyDockedPossibleArea && pillPartiallyDockedPossibleArea.height >= pillHeight;
            if (pillIsPartiallyDocked) {
                // pillFullyDockedRect is outside viewport, move it into the viewport under sticky scroll as we prefer the pill to not be on top of the sticky scroll
                // then move it into the possible area which will only cause it to move if it has to be rendered on top of the sticky scroll
                const pillRectMoved = pillFullyDockedRect.moveToBeContainedIn(gutterViewPortWithoutStickyScroll).moveToBeContainedIn(pillPartiallyDockedPossibleArea);
                const pillRect = pillRectMoved.withWidth(iconWidth(pillRectMoved));
                const iconRect = pillRect;
                return {
                    gutterEditArea,
                    icon: iconDocked,
                    iconDirection: 'right',
                    iconRect,
                    pillRect,
                };
            }
            // pillFullyDockedRect is outside viewport, so move it into viewport
            const pillRectMoved = pillFullyDockedRect.moveToBeContainedIn(gutterViewPortWithStickyScroll);
            const pillRect = pillRectMoved.withWidth(iconWidth(pillRectMoved));
            const iconRect = pillRect;
            // docked = pill was already in the viewport
            const iconDirection = pillRect.top < pillFullyDockedRect.top ?
                'top' :
                'bottom';
            return {
                gutterEditArea,
                icon: iconNoneDocked,
                iconDirection,
                iconRect,
                pillRect,
            };
        });
        this._iconRef = n.ref();
        this.isVisible = this._layout.map(l => !!l);
        this._hoverVisible = observableValue(this, false);
        this.isHoverVisible = this._hoverVisible;
        this._isHoveredOverIcon = observableValue(this, false);
        this._isHoveredOverIconDebounced = debouncedObservable(this._isHoveredOverIcon, 100);
        this.isHoveredOverIcon = this._isHoveredOverIconDebounced;
        this._indicator = n.div({
            class: 'inline-edits-view-gutter-indicator',
            onclick: () => {
                const layout = this._layout.get();
                const acceptOnClick = layout?.icon.get() === Codicon.check;
                const data = this._data.get();
                if (!data) {
                    throw new BugIndicatingError('Gutter indicator data not available');
                }
                this._editorObs.editor.focus();
                if (acceptOnClick) {
                    data.model.accept();
                }
                else {
                    data.model.jump();
                }
            },
            tabIndex: 0,
            style: {
                position: 'absolute',
                overflow: 'visible',
            },
        }, mapOutFalsy(this._layout).map(layout => !layout ? [] : [
            n.div({
                style: {
                    position: 'absolute',
                    background: asCssVariable(inlineEditIndicatorBackground),
                    borderRadius: '4px',
                    ...rectToProps(reader => layout.read(reader).gutterEditArea),
                }
            }),
            n.div({
                class: 'icon',
                ref: this._iconRef,
                onmouseenter: () => {
                    // TODO show hover when hovering ghost text etc.
                    this._showHover();
                },
                style: {
                    cursor: 'pointer',
                    zIndex: '20',
                    position: 'absolute',
                    backgroundColor: this._gutterIndicatorStyles.map(v => v.background),
                    // eslint-disable-next-line local/code-no-any-casts
                    ['--vscodeIconForeground']: this._gutterIndicatorStyles.map(v => v.foreground),
                    border: this._gutterIndicatorStyles.map(v => `1px solid ${v.border}`),
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    transition: 'background-color 0.2s ease-in-out, width 0.2s ease-in-out',
                    ...rectToProps(reader => layout.read(reader).pillRect),
                }
            }, [
                n.div({
                    className: 'line-number',
                    style: {
                        lineHeight: layout.map(l => l.lineNumberRect ? l.lineNumberRect.height : 0),
                        display: layout.map(l => l.lineNumberRect ? 'flex' : 'none'),
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        width: layout.map(l => l.lineNumberRect ? l.lineNumberRect.width : 0),
                        height: '100%',
                        color: this._gutterIndicatorStyles.map(v => v.foreground),
                    }
                }, this._lineNumberToRender),
                n.div({
                    style: {
                        rotate: layout.map(l => `${getRotationFromDirection(l.iconDirection)}deg`),
                        transition: 'rotate 0.2s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        marginRight: layout.map(l => l.pillRect.width - l.iconRect.width - (l.lineNumberRect?.width ?? 0)),
                        width: layout.map(l => l.iconRect.width),
                    }
                }, [
                    layout.map((l, reader) => renderIcon(l.icon.read(reader))),
                ])
            ]),
        ]));
        this._originalRangeObs = mapOutFalsy(this._data.map(d => d?.originalRange));
        this._stickyScrollController = StickyScrollController.get(this._editorObs.editor);
        this._stickyScrollHeight = this._stickyScrollController
            ? observableFromEvent(this._stickyScrollController.onDidChangeStickyScrollHeight, () => this._stickyScrollController.stickyScrollWidgetHeight)
            : constObservable(0);
        const indicator = this._indicator.keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: indicator.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(this._editorObs.editor.onMouseMove((e) => {
            const state = this._state.get();
            if (state === undefined) {
                return;
            }
            const el = this._iconRef.element;
            const rect = el.getBoundingClientRect();
            const rectangularArea = Rect.fromLeftTopWidthHeight(rect.left, rect.top, rect.width, rect.height);
            const point = new Point(e.event.posx, e.event.posy);
            this._isHoveredOverIcon.set(rectangularArea.containsPoint(point), undefined);
        }));
        this._register(this._editorObs.editor.onDidScrollChange(() => {
            this._isHoveredOverIcon.set(false, undefined);
        }));
        this._isHoveredOverInlineEditDebounced = debouncedObservable(this._isHoveringOverInlineEdit, 100);
        // pulse animation when hovering inline edit
        this._register(runOnChange(this._isHoveredOverInlineEditDebounced, (isHovering) => {
            if (isHovering) {
                this.triggerAnimation();
            }
        }));
        this._register(autorun(reader => {
            indicator.readEffect(reader);
            if (indicator.element) {
                // For the line number
                this._editorObs.editor.applyFontInfo(indicator.element);
            }
        }));
    }
    triggerAnimation() {
        if (this._accessibilityService.isMotionReduced()) {
            return new Animation(null, null).finished;
        }
        // Check if ref is set before animating (prevents initialization order errors)
        const iconElement = this._iconRef.value;
        if (!iconElement) {
            return new Animation(null, null).finished;
        }
        // PULSE ANIMATION:
        const animation = iconElement.animate([
            {
                outline: `2px solid ${this._gutterIndicatorStyles.map(v => v.border).get()}`,
                outlineOffset: '-1px',
                offset: 0
            },
            {
                outline: `2px solid transparent`,
                outlineOffset: '10px',
                offset: 1
            },
        ], { duration: 500 });
        return animation.finished;
    }
    _showHover() {
        if (this._hoverVisible.get()) {
            return;
        }
        const data = this._data.get();
        if (!data) {
            throw new BugIndicatingError('Gutter indicator data not available');
        }
        const disposableStore = new DisposableStore();
        const content = disposableStore.add(this._instantiationService.createInstance(GutterIndicatorMenuContent, this._editorObs, data.gutterMenuData, (focusEditor) => {
            if (focusEditor) {
                this._editorObs.editor.focus();
            }
            h?.dispose();
        }).toDisposableLiveElement());
        const focusTracker = disposableStore.add(trackFocus(content.element));
        disposableStore.add(focusTracker.onDidBlur(() => this._focusIsInMenu.set(false, undefined)));
        disposableStore.add(focusTracker.onDidFocus(() => this._focusIsInMenu.set(true, undefined)));
        disposableStore.add(toDisposable(() => this._focusIsInMenu.set(false, undefined)));
        const h = this._hoverService.showInstantHover({
            target: this._iconRef.element,
            content: content.element,
        });
        if (h) {
            this._hoverVisible.set(true, undefined);
            disposableStore.add(this._editorObs.editor.onDidScrollChange(() => h.dispose()));
            disposableStore.add(h.onDispose(() => {
                this._hoverVisible.set(false, undefined);
                disposableStore.dispose();
            }));
        }
        else {
            disposableStore.dispose();
        }
    }
};
InlineEditsGutterIndicator = __decorate([
    __param(6, IHoverService),
    __param(7, IInstantiationService),
    __param(8, IAccessibilityService),
    __param(9, IThemeService)
], InlineEditsGutterIndicator);
export { InlineEditsGutterIndicator };
function getRotationFromDirection(direction) {
    switch (direction) {
        case 'top': return 90;
        case 'bottom': return -90;
        case 'right': return 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2d1dHRlckluZGljYXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFHLE9BQU8sRUFBb0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdNLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQ0FBMkMs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