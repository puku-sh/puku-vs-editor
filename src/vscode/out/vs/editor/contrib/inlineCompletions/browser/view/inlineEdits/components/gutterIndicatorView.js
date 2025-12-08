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
            const gutterEditArea = Rect.fromRanges(OffsetRange.fromTo(gutterViewPortWithoutStickyScroll.left, gutterViewPortWithoutStickyScroll.right), verticalEditRange);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2d1dHRlckluZGljYXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFHLE9BQU8sRUFBb0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdNLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFLaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxvQ0FBb0MsRUFBRSxnQ0FBZ0MsRUFBRSxvQ0FBb0MsRUFBRSxzQ0FBc0MsRUFBRSxrQ0FBa0MsRUFBRSxzQ0FBc0MsRUFBRSx1Q0FBdUMsRUFBRSxtQ0FBbUMsRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM1YSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUd6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHdkQsTUFBTSxPQUFPLDhCQUE4QjtJQUMxQyxZQUNVLGNBQThDLEVBQzlDLGFBQXdCLEVBQ3hCLEtBQStCO1FBRi9CLG1CQUFjLEdBQWQsY0FBYyxDQUFnQztRQUM5QyxrQkFBYSxHQUFiLGFBQWEsQ0FBVztRQUN4QixVQUFLLEdBQUwsS0FBSyxDQUEwQjtJQUNyQyxDQUFDO0NBQ0w7QUFFRCxNQUFNLE9BQU8sOEJBQThCO0lBQ25DLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxVQUFnQztRQUNsRSxPQUFPLElBQUksOEJBQThCLENBQ3hDLFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsRUFDM0YsVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUNsRCxDQUFDO0lBQ0gsQ0FBQztJQUVELFlBQ1UsTUFBMkIsRUFDM0IsV0FBbUIsRUFDbkIsaUJBQTRDO1FBRjVDLFdBQU0sR0FBTixNQUFNLENBQXFCO1FBQzNCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkI7SUFDbEQsQ0FBQztDQUNMO0FBRUQscURBQXFEO0FBQ3JELE1BQU0sT0FBTyx3QkFBd0I7SUFDN0IsTUFBTSxDQUFDLHlCQUF5QixDQUFDLEtBQTZCO1FBQ3BFLE9BQU8sSUFBSSx3QkFBd0IsQ0FDbEMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUNwQixHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQ2xCLENBQUM7SUFDSCxDQUFDO0lBRUQsWUFDVSxNQUFrQixFQUNsQixJQUFnQjtRQURoQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBQ2xCLFNBQUksR0FBSixJQUFJLENBQVk7SUFDdEIsQ0FBQztDQUNMO0FBRU0sSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBQ3pELFlBQ2tCLFVBQWdDLEVBQ2hDLEtBQThELEVBQzlELFVBQTRDLEVBQzVDLGVBQW9DLEVBQ3BDLHlCQUErQyxFQUMvQyxjQUE0QyxFQUU5QyxhQUE0QyxFQUNwQyxxQkFBNkQsRUFDN0QscUJBQTZELEVBQ3JFLGFBQTZDO1FBRTVELEtBQUssRUFBRSxDQUFDO1FBWlMsZUFBVSxHQUFWLFVBQVUsQ0FBc0I7UUFDaEMsVUFBSyxHQUFMLEtBQUssQ0FBeUQ7UUFDOUQsZUFBVSxHQUFWLFVBQVUsQ0FBa0M7UUFDNUMsb0JBQWUsR0FBZixlQUFlLENBQXFCO1FBQ3BDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBc0I7UUFDL0MsbUJBQWMsR0FBZCxjQUFjLENBQThCO1FBRTdCLGtCQUFhLEdBQWIsYUFBYSxDQUFjO1FBQ25CLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNwRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQXVENUMsMkJBQXNCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNoRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNYLEtBQUssbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTztvQkFDekMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLHNDQUFzQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUNySCxVQUFVLEVBQUUscUJBQXFCLENBQUMsc0NBQXNDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQ3JILE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtpQkFDN0csQ0FBQztnQkFDRixLQUFLLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU87b0JBQ3JDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDbkgsVUFBVSxFQUFFLHFCQUFxQixDQUFDLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUNuSCxNQUFNLEVBQUUscUJBQXFCLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7aUJBQzNHLENBQUM7Z0JBQ0YsS0FBSyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPO29CQUN2QyxVQUFVLEVBQUUscUJBQXFCLENBQUMsdUNBQXVDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQ3RILFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyx1Q0FBdUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDdEgsTUFBTSxFQUFFLHFCQUFxQixDQUFDLG1DQUFtQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO2lCQUM5RyxDQUFDO2dCQUNGO29CQUNDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFnQ2MsV0FBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDaEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxTQUFTLENBQUM7WUFBQyxDQUFDO1lBQ2pDLE9BQU87Z0JBQ04sS0FBSztnQkFDTCxlQUFlLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM1RSxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFLYyx3QkFBbUIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzdELElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLGFBQWEsQ0FBQyxlQUFlLENBQUM7WUFDMUUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsbUNBQTBCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTNGLElBQUksVUFBVSxLQUFLLFNBQVMsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLHNDQUE4QixFQUFFLENBQUM7Z0JBQzVGLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELElBQUksaUJBQWlCLENBQUMsVUFBVSwyQ0FBbUMsRUFBRSxDQUFDO2dCQUNyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25FLElBQUksVUFBVSxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxVQUFVLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ3pGLE9BQU8sVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixDQUFDO2dCQUNELE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELElBQUksaUJBQWlCLENBQUMsVUFBVSwyQ0FBbUMsRUFBRSxDQUFDO2dCQUNyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25FLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDckIsT0FBTyxFQUFFLENBQUM7Z0JBQ1gsQ0FBQztnQkFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDNUUsSUFBSSxrQkFBa0IsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsT0FBTyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzlCLENBQUM7Z0JBQ0QsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxDQUFDO1lBRUQsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLHlDQUFpQyxFQUFFLENBQUM7Z0JBQ25FLElBQUksaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2hDLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO2dCQUNELE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELE9BQU8sVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBRWMsMkJBQXNCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNoRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUU5RixJQUFJLENBQUMsU0FBUyxJQUFJLFdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEIsQ0FBQztZQUVELHVHQUF1RztZQUN2RyxJQUFJLE1BQU0sQ0FBQyxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDO1lBQzFCLENBQUM7WUFFRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxtQ0FBMEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0YsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLDJDQUFtQyxJQUFJLHVCQUF1QjtnQkFDN0YsaUJBQWlCLENBQUMsVUFBVSxzQ0FBOEIsRUFBRSxDQUFDO2dCQUM3RCxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQztZQUMxQixDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsZ0NBQXVCLENBQUMsOEJBQThCLENBQUM7WUFDakYsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUMzRSxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFFcEYsTUFBTSxZQUFZLEdBSVosRUFBRSxDQUFDO1lBRVQsMEhBQTBIO1lBQzFILEtBQUssSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUMzRCxNQUFNLDZCQUE2QixHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDekQsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDLDZCQUE2QixDQUFDLENBQUM7Z0JBQ2xGLE1BQU0sV0FBVyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQy9CLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLEdBQUcsV0FBVyxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUNqSSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsNkJBQTZCLEVBQUUsZUFBZSxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FBQztZQUNwRyxDQUFDO1lBRUQsT0FBTyxDQUFDLFNBQWlCLEVBQUUsRUFBRTtnQkFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ25ELElBQUksU0FBUyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQzt3QkFDbEQsT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUM7b0JBQ3BELENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxNQUFNLElBQUksa0JBQWtCLENBQUMsd0NBQXdDLENBQUMsQ0FBQztZQUN4RSxDQUFDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVjLFlBQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ2pELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFFN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXZELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUcsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7WUFFaEMsbURBQW1EO1lBQ25ELE1BQU0seUJBQXlCLEdBQUcsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcscUJBQXFCLENBQUM7WUFDeEksTUFBTSwwQkFBMEIsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztZQUM3RSxNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQ3hLLE1BQU0sa0RBQWtELEdBQUcsOEJBQThCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN6SSxNQUFNLGlDQUFpQyxHQUFHLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxrREFBa0QsQ0FBQyxHQUFHLEdBQUcscUJBQXFCLENBQUMsQ0FBQztZQUVqSyxrREFBa0Q7WUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsSUFBSSxFQUFFLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFFL0osbUNBQW1DO1lBQ25DLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUM5QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRCxNQUFNLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pGLE1BQU0saUJBQWlCLEdBQUcsa0RBQWtELENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFFL0csOENBQThDO1lBQzlDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZJLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ3pDLElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsaUNBQWlDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzFHLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDdEIsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNqRSxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7Z0JBQzVCLENBQUM7Z0JBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVFLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDO2dCQUNqRSxPQUFPLGdCQUFnQixJQUFJLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztZQUN0RyxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUMxQixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxDQUFDLGVBQWU7WUFDNUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxRQUFjLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcscUJBQXFCLENBQUM7Z0JBQ3BKLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzdFLENBQUMsQ0FBQztZQUVGLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUM7Z0JBRXJDLElBQUksZUFBZSxDQUFDO2dCQUNwQixJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxHQUFHLDhCQUE4QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxDQUFDO2dCQUN4SSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsOEJBQThCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2SCxDQUFDO2dCQUVELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztnQkFDaEcsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBRTNFLE9BQU87b0JBQ04sY0FBYztvQkFDZCxJQUFJLEVBQUUsVUFBVTtvQkFDaEIsYUFBYSxFQUFFLE9BQWdCO29CQUMvQixRQUFRO29CQUNSLFFBQVE7b0JBQ1IsY0FBYztpQkFDZCxDQUFDO1lBQ0gsQ0FBQztZQUVELE1BQU0sK0JBQStCLEdBQUcsOEJBQThCLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsdURBQXVEO1lBQ3pKLE1BQU0scUJBQXFCLEdBQUcsK0JBQStCLElBQUksK0JBQStCLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQztZQUV0SCxJQUFJLHFCQUFxQixFQUFFLENBQUM7Z0JBQzNCLHFKQUFxSjtnQkFDckosNEhBQTRIO2dCQUM1SCxNQUFNLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQ3RKLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQztnQkFFMUIsT0FBTztvQkFDTixjQUFjO29CQUNkLElBQUksRUFBRSxVQUFVO29CQUNoQixhQUFhLEVBQUUsT0FBZ0I7b0JBQy9CLFFBQVE7b0JBQ1IsUUFBUTtpQkFDUixDQUFDO1lBQ0gsQ0FBQztZQUVELG9FQUFvRTtZQUNwRSxNQUFNLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQzlGLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDbkUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBRTFCLDRDQUE0QztZQUM1QyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3RCxLQUFjLENBQUMsQ0FBQztnQkFDaEIsUUFBaUIsQ0FBQztZQUVuQixPQUFPO2dCQUNOLGNBQWM7Z0JBQ2QsSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLGFBQWE7Z0JBQ2IsUUFBUTtnQkFDUixRQUFRO2FBQ1IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBR2MsYUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQWtCLENBQUM7UUFFcEMsY0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRDLGtCQUFhLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxtQkFBYyxHQUF5QixJQUFJLENBQUMsYUFBYSxDQUFDO1FBRXpELHVCQUFrQixHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsZ0NBQTJCLEdBQXlCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2RyxzQkFBaUIsR0FBeUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDO1FBNkMxRSxlQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUNuQyxLQUFLLEVBQUUsb0NBQW9DO1lBQzNDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUUzRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQUMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLHFDQUFxQyxDQUFDLENBQUM7Z0JBQUMsQ0FBQztnQkFFbkYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQy9CLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFDO1lBQ1gsS0FBSyxFQUFFO2dCQUNOLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixRQUFRLEVBQUUsU0FBUzthQUNuQjtTQUNELEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUNMLEtBQUssRUFBRTtvQkFDTixRQUFRLEVBQUUsVUFBVTtvQkFDcEIsVUFBVSxFQUFFLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQztvQkFDeEQsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUM7aUJBQzVEO2FBQ0QsQ0FBQztZQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ0wsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUNsQixZQUFZLEVBQUUsR0FBRyxFQUFFO29CQUNsQixnREFBZ0Q7b0JBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQztnQkFDRCxLQUFLLEVBQUU7b0JBQ04sTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLE1BQU0sRUFBRSxJQUFJO29CQUNaLFFBQVEsRUFBRSxVQUFVO29CQUNwQixlQUFlLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7b0JBQ25FLG1EQUFtRDtvQkFDbkQsQ0FBQyx3QkFBK0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO29CQUNyRixNQUFNLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNyRSxTQUFTLEVBQUUsWUFBWTtvQkFDdkIsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLE9BQU8sRUFBRSxNQUFNO29CQUNmLGNBQWMsRUFBRSxVQUFVO29CQUMxQixVQUFVLEVBQUUsMkRBQTJEO29CQUN2RSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDO2lCQUN0RDthQUNELEVBQUU7Z0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDTCxTQUFTLEVBQUUsYUFBYTtvQkFDeEIsS0FBSyxFQUFFO3dCQUNOLFVBQVUsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0UsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzt3QkFDNUQsVUFBVSxFQUFFLFFBQVE7d0JBQ3BCLGNBQWMsRUFBRSxVQUFVO3dCQUMxQixLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JFLE1BQU0sRUFBRSxNQUFNO3dCQUNkLEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztxQkFDekQ7aUJBQ0QsRUFDQSxJQUFJLENBQUMsbUJBQW1CLENBQ3hCO2dCQUNELENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFO3dCQUNOLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQzt3QkFDMUUsVUFBVSxFQUFFLHlCQUF5Qjt3QkFDckMsT0FBTyxFQUFFLE1BQU07d0JBQ2YsVUFBVSxFQUFFLFFBQVE7d0JBQ3BCLGNBQWMsRUFBRSxRQUFRO3dCQUN4QixNQUFNLEVBQUUsTUFBTTt3QkFDZCxXQUFXLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2xHLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7cUJBQ3hDO2lCQUNELEVBQUU7b0JBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2lCQUMxRCxDQUFDO2FBQ0YsQ0FBQztTQUNGLENBQUMsQ0FBQyxDQUFDO1FBdmNILElBQUksQ0FBQyxpQkFBaUIsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUU1RSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyx1QkFBdUI7WUFDdEQsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXdCLENBQUMsd0JBQXdCLENBQUM7WUFDL0ksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ2xELE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztZQUMxQixRQUFRLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQztZQUMvQixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7U0FDdkMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQW9CLEVBQUUsRUFBRTtZQUMxRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2hDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLE9BQU87WUFBQyxDQUFDO1lBRXBDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO1lBQzVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsaUNBQWlDLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRWxHLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNqRixJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0IsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3ZCLHNCQUFzQjtnQkFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUEyQk0sZ0JBQWdCO1FBQ3RCLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7WUFDbEQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzNDLENBQUM7UUFFRCw4RUFBOEU7UUFDOUUsTUFBTSxXQUFXLEdBQUksSUFBSSxDQUFDLFFBQWdCLENBQUMsS0FBSyxDQUFDO1FBQ2pELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDM0MsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1lBQ3JDO2dCQUNDLE9BQU8sRUFBRSxhQUFhLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzVFLGFBQWEsRUFBRSxNQUFNO2dCQUNyQixNQUFNLEVBQUUsQ0FBQzthQUNUO1lBQ0Q7Z0JBQ0MsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsYUFBYSxFQUFFLE1BQU07Z0JBQ3JCLE1BQU0sRUFBRSxDQUFDO2FBQ1Q7U0FDRCxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFdEIsT0FBTyxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUFzT08sVUFBVTtRQUNqQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLGtCQUFrQixDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDOUMsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUM1RSwwQkFBMEIsRUFDMUIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsY0FBYyxFQUNuQixDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ2YsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEMsQ0FBQztZQUNELENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNkLENBQUMsQ0FDRCxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUU3QixNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0RSxlQUFlLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixlQUFlLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixlQUFlLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5GLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7WUFDN0MsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTztZQUM3QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87U0FDeEIsQ0FBNEIsQ0FBQztRQUM5QixJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqRixlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO2dCQUNwQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3pDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDUCxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7Q0FxRkQsQ0FBQTtBQXhkWSwwQkFBMEI7SUFTcEMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7R0FaSCwwQkFBMEIsQ0F3ZHRDOztBQUVELFNBQVMsd0JBQXdCLENBQUMsU0FBcUM7SUFDdEUsUUFBUSxTQUFTLEVBQUUsQ0FBQztRQUNuQixLQUFLLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUMxQixLQUFLLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hCLENBQUM7QUFDRixDQUFDIn0=