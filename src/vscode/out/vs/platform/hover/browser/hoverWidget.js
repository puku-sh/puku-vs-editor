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
import './hover.css';
import { DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import * as dom from '../../../base/browser/dom.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { HoverAction, HoverWidget as BaseHoverWidget, getHoverAccessibleViewHint } from '../../../base/browser/ui/hover/hoverWidget.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { IMarkdownRendererService } from '../../markdown/browser/markdownRenderer.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
import { localize } from '../../../nls.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { status } from '../../../base/browser/ui/aria/aria.js';
import { TimeoutTimer } from '../../../base/common/async.js';
import { isNumber } from '../../../base/common/types.js';
const $ = dom.$;
var Constants;
(function (Constants) {
    Constants[Constants["PointerSize"] = 3] = "PointerSize";
    Constants[Constants["HoverBorderWidth"] = 2] = "HoverBorderWidth";
    Constants[Constants["HoverWindowEdgeMargin"] = 2] = "HoverWindowEdgeMargin";
})(Constants || (Constants = {}));
let HoverWidget = class HoverWidget extends Widget {
    get _targetWindow() {
        return dom.getWindow(this._target.targetElements[0]);
    }
    get _targetDocumentElement() {
        return dom.getWindow(this._target.targetElements[0]).document.documentElement;
    }
    get isDisposed() { return this._isDisposed; }
    get isMouseIn() { return this._lockMouseTracker.isMouseIn; }
    get domNode() { return this._hover.containerDomNode; }
    get onDispose() { return this._onDispose.event; }
    get onRequestLayout() { return this._onRequestLayout.event; }
    get anchor() { return this._hoverPosition === 2 /* HoverPosition.BELOW */ ? 0 /* AnchorPosition.BELOW */ : 1 /* AnchorPosition.ABOVE */; }
    get x() { return this._x; }
    get y() { return this._y; }
    /**
     * Whether the hover is "locked" by holding the alt/option key. When locked, the hover will not
     * hide and can be hovered regardless of whether the `hideOnHover` hover option is set.
     */
    get isLocked() { return this._isLocked; }
    set isLocked(value) {
        if (this._isLocked === value) {
            return;
        }
        this._isLocked = value;
        this._hoverContainer.classList.toggle('locked', this._isLocked);
    }
    constructor(options, _keybindingService, _configurationService, _markdownRenderer, _accessibilityService) {
        super();
        this._keybindingService = _keybindingService;
        this._configurationService = _configurationService;
        this._markdownRenderer = _markdownRenderer;
        this._accessibilityService = _accessibilityService;
        this._messageListeners = new DisposableStore();
        this._isDisposed = false;
        this._forcePosition = false;
        this._x = 0;
        this._y = 0;
        this._isLocked = false;
        this._enableFocusTraps = false;
        this._addedFocusTrap = false;
        this._maxHeightRatioRelativeToWindow = 0.5;
        this._onDispose = this._register(new Emitter());
        this._onRequestLayout = this._register(new Emitter());
        this._linkHandler = options.linkHandler;
        this._target = 'targetElements' in options.target ? options.target : new ElementHoverTarget(options.target);
        if (options.style) {
            switch (options.style) {
                case 1 /* HoverStyle.Pointer */: {
                    options.appearance ??= {};
                    options.appearance.compact ??= true;
                    options.appearance.showPointer ??= true;
                    break;
                }
                case 2 /* HoverStyle.Mouse */: {
                    options.appearance ??= {};
                    options.appearance.compact ??= true;
                    break;
                }
            }
        }
        this._hoverPointer = options.appearance?.showPointer ? $('div.workbench-hover-pointer') : undefined;
        this._hover = this._register(new BaseHoverWidget(!options.appearance?.skipFadeInAnimation));
        this._hover.containerDomNode.classList.add('workbench-hover');
        if (options.appearance?.compact) {
            this._hover.containerDomNode.classList.add('workbench-hover', 'compact');
        }
        if (options.additionalClasses) {
            this._hover.containerDomNode.classList.add(...options.additionalClasses);
        }
        if (options.position?.forcePosition) {
            this._forcePosition = true;
        }
        if (options.trapFocus) {
            this._enableFocusTraps = true;
        }
        const maxHeightRatio = options.appearance?.maxHeightRatio;
        if (maxHeightRatio !== undefined && maxHeightRatio > 0 && maxHeightRatio <= 1) {
            this._maxHeightRatioRelativeToWindow = maxHeightRatio;
        }
        // Default to position above when the position is unspecified or a mouse event
        this._hoverPosition = options.position?.hoverPosition === undefined
            ? 3 /* HoverPosition.ABOVE */
            : isNumber(options.position.hoverPosition)
                ? options.position.hoverPosition
                : 2 /* HoverPosition.BELOW */;
        // Don't allow mousedown out of the widget, otherwise preventDefault will call and text will
        // not be selected.
        this.onmousedown(this._hover.containerDomNode, e => e.stopPropagation());
        // Hide hover on escape
        this.onkeydown(this._hover.containerDomNode, e => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.dispose();
            }
        });
        // Hide when the window loses focus
        this._register(dom.addDisposableListener(this._targetWindow, 'blur', () => this.dispose()));
        const rowElement = $('div.hover-row.markdown-hover');
        const contentsElement = $('div.hover-contents');
        if (typeof options.content === 'string') {
            contentsElement.textContent = options.content;
            contentsElement.style.whiteSpace = 'pre-wrap';
        }
        else if (dom.isHTMLElement(options.content)) {
            contentsElement.appendChild(options.content);
            contentsElement.classList.add('html-hover-contents');
        }
        else {
            const markdown = options.content;
            const { element } = this._register(this._markdownRenderer.render(markdown, {
                actionHandler: this._linkHandler,
                asyncRenderCallback: () => {
                    contentsElement.classList.add('code-hover-contents');
                    this.layout();
                    // This changes the dimensions of the hover so trigger a layout
                    this._onRequestLayout.fire();
                }
            }));
            contentsElement.appendChild(element);
        }
        rowElement.appendChild(contentsElement);
        this._hover.contentsDomNode.appendChild(rowElement);
        if (options.actions && options.actions.length > 0) {
            const statusBarElement = $('div.hover-row.status-bar');
            const actionsElement = $('div.actions');
            options.actions.forEach(action => {
                const keybinding = this._keybindingService.lookupKeybinding(action.commandId);
                const keybindingLabel = keybinding ? keybinding.getLabel() : null;
                this._register(HoverAction.render(actionsElement, {
                    label: action.label,
                    commandId: action.commandId,
                    run: e => {
                        action.run(e);
                        this.dispose();
                    },
                    iconClass: action.iconClass
                }, keybindingLabel));
            });
            statusBarElement.appendChild(actionsElement);
            this._hover.containerDomNode.appendChild(statusBarElement);
        }
        this._hoverContainer = $('div.workbench-hover-container');
        if (this._hoverPointer) {
            this._hoverContainer.appendChild(this._hoverPointer);
        }
        this._hoverContainer.appendChild(this._hover.containerDomNode);
        // Determine whether to hide on hover
        let hideOnHover;
        if (options.actions && options.actions.length > 0) {
            // If there are actions, require hover so they can be accessed
            hideOnHover = false;
        }
        else {
            if (options.persistence?.hideOnHover === undefined) {
                // When unset, will default to true when it's a string or when it's markdown that
                // appears to have a link using a naive check for '](' and '</a>'
                hideOnHover = typeof options.content === 'string' ||
                    isMarkdownString(options.content) && !options.content.value.includes('](') && !options.content.value.includes('</a>');
            }
            else {
                // It's set explicitly
                hideOnHover = options.persistence.hideOnHover;
            }
        }
        // Show the hover hint if needed
        if (options.appearance?.showHoverHint) {
            const statusBarElement = $('div.hover-row.status-bar');
            const infoElement = $('div.info');
            infoElement.textContent = localize('hoverhint', 'Hold {0} key to mouse over', isMacintosh ? 'Option' : 'Alt');
            statusBarElement.appendChild(infoElement);
            this._hover.containerDomNode.appendChild(statusBarElement);
        }
        const mouseTrackerTargets = [...this._target.targetElements];
        if (!hideOnHover) {
            mouseTrackerTargets.push(this._hoverContainer);
        }
        const mouseTracker = this._register(new CompositeMouseTracker(mouseTrackerTargets));
        this._register(mouseTracker.onMouseOut(() => {
            if (!this._isLocked) {
                this.dispose();
            }
        }));
        // Setup another mouse tracker when hideOnHover is set in order to track the hover as well
        // when it is locked. This ensures the hover will hide on mouseout after alt has been
        // released to unlock the element.
        if (hideOnHover) {
            const mouseTracker2Targets = [...this._target.targetElements, this._hoverContainer];
            this._lockMouseTracker = this._register(new CompositeMouseTracker(mouseTracker2Targets));
            this._register(this._lockMouseTracker.onMouseOut(() => {
                if (!this._isLocked) {
                    this.dispose();
                }
            }));
        }
        else {
            this._lockMouseTracker = mouseTracker;
        }
    }
    addFocusTrap() {
        if (!this._enableFocusTraps || this._addedFocusTrap) {
            return;
        }
        this._addedFocusTrap = true;
        // Add a hover tab loop if the hover has at least one element with a valid tabIndex
        const firstContainerFocusElement = this._hover.containerDomNode;
        const lastContainerFocusElement = this.findLastFocusableChild(this._hover.containerDomNode);
        if (lastContainerFocusElement) {
            const beforeContainerFocusElement = dom.prepend(this._hoverContainer, $('div'));
            const afterContainerFocusElement = dom.append(this._hoverContainer, $('div'));
            beforeContainerFocusElement.tabIndex = 0;
            afterContainerFocusElement.tabIndex = 0;
            this._register(dom.addDisposableListener(afterContainerFocusElement, 'focus', (e) => {
                firstContainerFocusElement.focus();
                e.preventDefault();
            }));
            this._register(dom.addDisposableListener(beforeContainerFocusElement, 'focus', (e) => {
                lastContainerFocusElement.focus();
                e.preventDefault();
            }));
        }
    }
    findLastFocusableChild(root) {
        if (root.hasChildNodes()) {
            for (let i = 0; i < root.childNodes.length; i++) {
                const node = root.childNodes.item(root.childNodes.length - i - 1);
                if (node.nodeType === node.ELEMENT_NODE) {
                    const parsedNode = node;
                    if (typeof parsedNode.tabIndex === 'number' && parsedNode.tabIndex >= 0) {
                        return parsedNode;
                    }
                }
                const recursivelyFoundElement = this.findLastFocusableChild(node);
                if (recursivelyFoundElement) {
                    return recursivelyFoundElement;
                }
            }
        }
        return undefined;
    }
    render(container) {
        container.appendChild(this._hoverContainer);
        const hoverFocused = this._hoverContainer.contains(this._hoverContainer.ownerDocument.activeElement);
        const accessibleViewHint = hoverFocused && getHoverAccessibleViewHint(this._configurationService.getValue('accessibility.verbosity.hover') === true && this._accessibilityService.isScreenReaderOptimized(), this._keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel());
        if (accessibleViewHint) {
            status(accessibleViewHint);
        }
        this.layout();
        this.addFocusTrap();
    }
    layout() {
        this._hover.containerDomNode.classList.remove('right-aligned');
        this._hover.contentsDomNode.style.maxHeight = '';
        const getZoomAccountedBoundingClientRect = (e) => {
            const zoom = dom.getDomNodeZoomLevel(e);
            const boundingRect = e.getBoundingClientRect();
            return {
                top: boundingRect.top * zoom,
                bottom: boundingRect.bottom * zoom,
                right: boundingRect.right * zoom,
                left: boundingRect.left * zoom,
            };
        };
        const targetBounds = this._target.targetElements.map(e => getZoomAccountedBoundingClientRect(e));
        const { top, right, bottom, left } = targetBounds[0];
        const width = right - left;
        const height = bottom - top;
        const targetRect = {
            top, right, bottom, left, width, height,
            center: {
                x: left + (width / 2),
                y: top + (height / 2)
            }
        };
        // These calls adjust the position depending on spacing.
        this.adjustHorizontalHoverPosition(targetRect);
        this.adjustVerticalHoverPosition(targetRect);
        // This call limits the maximum height of the hover.
        this.adjustHoverMaxHeight(targetRect);
        // Offset the hover position if there is a pointer so it aligns with the target element
        this._hoverContainer.style.padding = '';
        this._hoverContainer.style.margin = '';
        if (this._hoverPointer) {
            switch (this._hoverPosition) {
                case 1 /* HoverPosition.RIGHT */:
                    targetRect.left += 3 /* Constants.PointerSize */;
                    targetRect.right += 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingLeft = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginLeft = `${-3 /* Constants.PointerSize */}px`;
                    break;
                case 0 /* HoverPosition.LEFT */:
                    targetRect.left -= 3 /* Constants.PointerSize */;
                    targetRect.right -= 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingRight = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginRight = `${-3 /* Constants.PointerSize */}px`;
                    break;
                case 2 /* HoverPosition.BELOW */:
                    targetRect.top += 3 /* Constants.PointerSize */;
                    targetRect.bottom += 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingTop = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginTop = `${-3 /* Constants.PointerSize */}px`;
                    break;
                case 3 /* HoverPosition.ABOVE */:
                    targetRect.top -= 3 /* Constants.PointerSize */;
                    targetRect.bottom -= 3 /* Constants.PointerSize */;
                    this._hoverContainer.style.paddingBottom = `${3 /* Constants.PointerSize */}px`;
                    this._hoverContainer.style.marginBottom = `${-3 /* Constants.PointerSize */}px`;
                    break;
            }
            targetRect.center.x = targetRect.left + (width / 2);
            targetRect.center.y = targetRect.top + (height / 2);
        }
        this.computeXCordinate(targetRect);
        this.computeYCordinate(targetRect);
        if (this._hoverPointer) {
            // reset
            this._hoverPointer.classList.remove('top');
            this._hoverPointer.classList.remove('left');
            this._hoverPointer.classList.remove('right');
            this._hoverPointer.classList.remove('bottom');
            this.setHoverPointerPosition(targetRect);
        }
        this._hover.onContentsChanged();
    }
    computeXCordinate(target) {
        const hoverWidth = this._hover.containerDomNode.clientWidth + 2 /* Constants.HoverBorderWidth */;
        if (this._target.x !== undefined) {
            this._x = this._target.x;
        }
        else if (this._hoverPosition === 1 /* HoverPosition.RIGHT */) {
            this._x = target.right;
        }
        else if (this._hoverPosition === 0 /* HoverPosition.LEFT */) {
            this._x = target.left - hoverWidth;
        }
        else {
            if (this._hoverPointer) {
                this._x = target.center.x - (this._hover.containerDomNode.clientWidth / 2);
            }
            else {
                this._x = target.left;
            }
            // Hover is going beyond window towards right end
            if (this._x + hoverWidth >= this._targetDocumentElement.clientWidth) {
                this._hover.containerDomNode.classList.add('right-aligned');
                this._x = Math.max(this._targetDocumentElement.clientWidth - hoverWidth - 2 /* Constants.HoverWindowEdgeMargin */, this._targetDocumentElement.clientLeft);
            }
        }
        // Hover is going beyond window towards left end
        if (this._x < this._targetDocumentElement.clientLeft) {
            this._x = target.left + 2 /* Constants.HoverWindowEdgeMargin */;
        }
    }
    computeYCordinate(target) {
        if (this._target.y !== undefined) {
            this._y = this._target.y;
        }
        else if (this._hoverPosition === 3 /* HoverPosition.ABOVE */) {
            this._y = target.top;
        }
        else if (this._hoverPosition === 2 /* HoverPosition.BELOW */) {
            this._y = target.bottom - 2;
        }
        else {
            if (this._hoverPointer) {
                this._y = target.center.y + (this._hover.containerDomNode.clientHeight / 2);
            }
            else {
                this._y = target.bottom;
            }
        }
        // Hover on bottom is going beyond window
        if (this._y > this._targetWindow.innerHeight) {
            this._y = target.bottom;
        }
    }
    adjustHorizontalHoverPosition(target) {
        // Do not adjust horizontal hover position if x cordiante is provided
        if (this._target.x !== undefined) {
            return;
        }
        const hoverPointerOffset = (this._hoverPointer ? 3 /* Constants.PointerSize */ : 0);
        // When force position is enabled, restrict max width
        if (this._forcePosition) {
            const padding = hoverPointerOffset + 2 /* Constants.HoverBorderWidth */;
            if (this._hoverPosition === 1 /* HoverPosition.RIGHT */) {
                this._hover.containerDomNode.style.maxWidth = `${this._targetDocumentElement.clientWidth - target.right - padding}px`;
            }
            else if (this._hoverPosition === 0 /* HoverPosition.LEFT */) {
                this._hover.containerDomNode.style.maxWidth = `${target.left - padding}px`;
            }
            return;
        }
        // Position hover on right to target
        if (this._hoverPosition === 1 /* HoverPosition.RIGHT */) {
            const roomOnRight = this._targetDocumentElement.clientWidth - target.right;
            // Hover on the right is going beyond window.
            if (roomOnRight < this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                const roomOnLeft = target.left;
                // There's enough room on the left, flip the hover position
                if (roomOnLeft >= this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                    this._hoverPosition = 0 /* HoverPosition.LEFT */;
                }
                // Hover on the left would go beyond window too
                else {
                    this._hoverPosition = 2 /* HoverPosition.BELOW */;
                }
            }
        }
        // Position hover on left to target
        else if (this._hoverPosition === 0 /* HoverPosition.LEFT */) {
            const roomOnLeft = target.left;
            // Hover on the left is going beyond window.
            if (roomOnLeft < this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                const roomOnRight = this._targetDocumentElement.clientWidth - target.right;
                // There's enough room on the right, flip the hover position
                if (roomOnRight >= this._hover.containerDomNode.clientWidth + hoverPointerOffset) {
                    this._hoverPosition = 1 /* HoverPosition.RIGHT */;
                }
                // Hover on the right would go beyond window too
                else {
                    this._hoverPosition = 2 /* HoverPosition.BELOW */;
                }
            }
            // Hover on the left is going beyond window.
            if (target.left - this._hover.containerDomNode.clientWidth - hoverPointerOffset <= this._targetDocumentElement.clientLeft) {
                this._hoverPosition = 1 /* HoverPosition.RIGHT */;
            }
        }
    }
    adjustVerticalHoverPosition(target) {
        // Do not adjust vertical hover position if the y coordinate is provided
        // or the position is forced
        if (this._target.y !== undefined || this._forcePosition) {
            return;
        }
        const hoverPointerOffset = (this._hoverPointer ? 3 /* Constants.PointerSize */ : 0);
        // Position hover on top of the target
        if (this._hoverPosition === 3 /* HoverPosition.ABOVE */) {
            // Hover on top is going beyond window
            if (target.top - this._hover.containerDomNode.clientHeight - hoverPointerOffset < 0) {
                this._hoverPosition = 2 /* HoverPosition.BELOW */;
            }
        }
        // Position hover below the target
        else if (this._hoverPosition === 2 /* HoverPosition.BELOW */) {
            // Hover on bottom is going beyond window
            if (target.bottom + this._hover.containerDomNode.offsetHeight + hoverPointerOffset > this._targetWindow.innerHeight) {
                this._hoverPosition = 3 /* HoverPosition.ABOVE */;
            }
        }
    }
    adjustHoverMaxHeight(target) {
        let maxHeight = this._targetWindow.innerHeight * this._maxHeightRatioRelativeToWindow;
        // When force position is enabled, restrict max height
        if (this._forcePosition) {
            const padding = (this._hoverPointer ? 3 /* Constants.PointerSize */ : 0) + 2 /* Constants.HoverBorderWidth */;
            if (this._hoverPosition === 3 /* HoverPosition.ABOVE */) {
                maxHeight = Math.min(maxHeight, target.top - padding);
            }
            else if (this._hoverPosition === 2 /* HoverPosition.BELOW */) {
                maxHeight = Math.min(maxHeight, this._targetWindow.innerHeight - target.bottom - padding);
            }
        }
        this._hover.containerDomNode.style.maxHeight = `${maxHeight}px`;
        if (this._hover.contentsDomNode.clientHeight < this._hover.contentsDomNode.scrollHeight) {
            // Add padding for a vertical scrollbar
            const extraRightPadding = `${this._hover.scrollbar.options.verticalScrollbarSize}px`;
            if (this._hover.contentsDomNode.style.paddingRight !== extraRightPadding) {
                this._hover.contentsDomNode.style.paddingRight = extraRightPadding;
            }
        }
    }
    setHoverPointerPosition(target) {
        if (!this._hoverPointer) {
            return;
        }
        switch (this._hoverPosition) {
            case 0 /* HoverPosition.LEFT */:
            case 1 /* HoverPosition.RIGHT */: {
                this._hoverPointer.classList.add(this._hoverPosition === 0 /* HoverPosition.LEFT */ ? 'right' : 'left');
                const hoverHeight = this._hover.containerDomNode.clientHeight;
                // If hover is taller than target, then show the pointer at the center of target
                if (hoverHeight > target.height) {
                    this._hoverPointer.style.top = `${target.center.y - (this._y - hoverHeight) - 3 /* Constants.PointerSize */}px`;
                }
                // Otherwise show the pointer at the center of hover
                else {
                    this._hoverPointer.style.top = `${Math.round((hoverHeight / 2)) - 3 /* Constants.PointerSize */}px`;
                }
                break;
            }
            case 3 /* HoverPosition.ABOVE */:
            case 2 /* HoverPosition.BELOW */: {
                this._hoverPointer.classList.add(this._hoverPosition === 3 /* HoverPosition.ABOVE */ ? 'bottom' : 'top');
                const hoverWidth = this._hover.containerDomNode.clientWidth;
                // Position pointer at the center of the hover
                let pointerLeftPosition = Math.round((hoverWidth / 2)) - 3 /* Constants.PointerSize */;
                // If pointer goes beyond target then position it at the center of the target
                const pointerX = this._x + pointerLeftPosition;
                if (pointerX < target.left || pointerX > target.right) {
                    pointerLeftPosition = target.center.x - this._x - 3 /* Constants.PointerSize */;
                }
                this._hoverPointer.style.left = `${pointerLeftPosition}px`;
                break;
            }
        }
    }
    focus() {
        this._hover.containerDomNode.focus();
    }
    hide() {
        this.dispose();
    }
    dispose() {
        if (!this._isDisposed) {
            this._onDispose.fire();
            this._target.dispose?.();
            this._hoverContainer.remove();
            this._messageListeners.dispose();
            super.dispose();
        }
        this._isDisposed = true;
    }
};
HoverWidget = __decorate([
    __param(1, IKeybindingService),
    __param(2, IConfigurationService),
    __param(3, IMarkdownRendererService),
    __param(4, IAccessibilityService)
], HoverWidget);
export { HoverWidget };
class CompositeMouseTracker extends Widget {
    get onMouseOut() { return this._onMouseOut.event; }
    get isMouseIn() { return this._isMouseIn; }
    /**
     * @param _elements The target elements to track mouse in/out events on.
     * @param _eventDebounceDelay The delay in ms to debounce the event firing. This is used to
     * allow a short period for the mouse to move into the hover or a nearby target element. For
     * example hovering a scroll bar will not hide the hover immediately.
     */
    constructor(_elements, _eventDebounceDelay = 200) {
        super();
        this._elements = _elements;
        this._eventDebounceDelay = _eventDebounceDelay;
        this._isMouseIn = true;
        this._mouseTimer = this._register(new MutableDisposable());
        this._onMouseOut = this._register(new Emitter());
        for (const element of this._elements) {
            this.onmouseover(element, () => this._onTargetMouseOver());
            this.onmouseleave(element, () => this._onTargetMouseLeave());
        }
    }
    _onTargetMouseOver() {
        this._isMouseIn = true;
        this._mouseTimer.clear();
    }
    _onTargetMouseLeave() {
        this._isMouseIn = false;
        // Evaluate whether the mouse is still outside asynchronously such that other mouse targets
        // have the opportunity to first their mouse in event.
        this._mouseTimer.value = new TimeoutTimer(() => this._fireIfMouseOutside(), this._eventDebounceDelay);
    }
    _fireIfMouseOutside() {
        if (!this._isMouseIn) {
            this._onMouseOut.fire();
        }
    }
}
class ElementHoverTarget {
    constructor(_element) {
        this._element = _element;
        this.targetElements = [this._element];
    }
    dispose() {
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ob3Zlci9icm93c2VyL2hvdmVyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sYUFBYSxDQUFDO0FBQ3JCLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUUzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFpQixXQUFXLElBQUksZUFBZSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdkosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQVdoQixJQUFXLFNBSVY7QUFKRCxXQUFXLFNBQVM7SUFDbkIsdURBQWUsQ0FBQTtJQUNmLGlFQUFvQixDQUFBO0lBQ3BCLDJFQUF5QixDQUFBO0FBQzFCLENBQUMsRUFKVSxTQUFTLEtBQVQsU0FBUyxRQUluQjtBQUVNLElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVksU0FBUSxNQUFNO0lBb0J0QyxJQUFZLGFBQWE7UUFDeEIsT0FBTyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNELElBQVksc0JBQXNCO1FBQ2pDLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7SUFDL0UsQ0FBQztJQUVELElBQUksVUFBVSxLQUFjLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDdEQsSUFBSSxTQUFTLEtBQWMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNyRSxJQUFJLE9BQU8sS0FBa0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUduRSxJQUFJLFNBQVMsS0FBa0IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFOUQsSUFBSSxlQUFlLEtBQWtCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFMUUsSUFBSSxNQUFNLEtBQXFCLE9BQU8sSUFBSSxDQUFDLGNBQWMsZ0NBQXdCLENBQUMsQ0FBQyw4QkFBc0IsQ0FBQyw2QkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDbEksSUFBSSxDQUFDLEtBQWEsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuQyxJQUFJLENBQUMsS0FBYSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRW5DOzs7T0FHRztJQUNILElBQUksUUFBUSxLQUFjLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDbEQsSUFBSSxRQUFRLENBQUMsS0FBYztRQUMxQixJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsWUFDQyxPQUFzQixFQUNGLGtCQUF1RCxFQUNwRCxxQkFBNkQsRUFDMUQsaUJBQTRELEVBQy9ELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUw2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ25DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDekMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEwQjtRQUM5QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBekRwRSxzQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBU25ELGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBRTdCLG1CQUFjLEdBQVksS0FBSyxDQUFDO1FBQ2hDLE9BQUUsR0FBVyxDQUFDLENBQUM7UUFDZixPQUFFLEdBQVcsQ0FBQyxDQUFDO1FBQ2YsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUMzQixzQkFBaUIsR0FBWSxLQUFLLENBQUM7UUFDbkMsb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDakMsb0NBQStCLEdBQVcsR0FBRyxDQUFDO1FBYXJDLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUVqRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQTZCdkUsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBRXhDLElBQUksQ0FBQyxPQUFPLEdBQUcsZ0JBQWdCLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFNUcsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkIsUUFBUSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZCLCtCQUF1QixDQUFDLENBQUMsQ0FBQztvQkFDekIsT0FBTyxDQUFDLFVBQVUsS0FBSyxFQUFFLENBQUM7b0JBQzFCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQztvQkFDcEMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEtBQUssSUFBSSxDQUFDO29CQUN4QyxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsNkJBQXFCLENBQUMsQ0FBQyxDQUFDO29CQUN2QixPQUFPLENBQUMsVUFBVSxLQUFLLEVBQUUsQ0FBQztvQkFDMUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDO29CQUNwQyxNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDcEcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDOUQsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzVCLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQy9CLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQztRQUMxRCxJQUFJLGNBQWMsS0FBSyxTQUFTLElBQUksY0FBYyxHQUFHLENBQUMsSUFBSSxjQUFjLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0UsSUFBSSxDQUFDLCtCQUErQixHQUFHLGNBQWMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsOEVBQThFO1FBQzlFLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxhQUFhLEtBQUssU0FBUztZQUNsRSxDQUFDO1lBQ0QsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztnQkFDekMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYTtnQkFDaEMsQ0FBQyw0QkFBb0IsQ0FBQztRQUV4Qiw0RkFBNEY7UUFDNUYsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBRXpFLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDaEQsSUFBSSxDQUFDLENBQUMsTUFBTSx3QkFBZ0IsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUYsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDckQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDaEQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsZUFBZSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQzlDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUUvQyxDQUFDO2FBQU0sSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQy9DLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFdEQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBRWpDLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO2dCQUMxRSxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVk7Z0JBQ2hDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtvQkFDekIsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDckQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNkLCtEQUErRDtvQkFDL0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM5QixDQUFDO2FBQ0QsQ0FBQyxDQUFDLENBQUM7WUFDSixlQUFlLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxVQUFVLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVwRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUN2RCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDeEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzlFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7b0JBQ2pELEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztvQkFDbkIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUMzQixHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUU7d0JBQ1IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDZCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hCLENBQUM7b0JBQ0QsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO2lCQUMzQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDdEIsQ0FBQyxDQUFDLENBQUM7WUFDSCxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUMxRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUUvRCxxQ0FBcUM7UUFDckMsSUFBSSxXQUFvQixDQUFDO1FBQ3pCLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuRCw4REFBOEQ7WUFDOUQsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUNyQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3BELGlGQUFpRjtnQkFDakYsaUVBQWlFO2dCQUNqRSxXQUFXLEdBQUcsT0FBTyxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVE7b0JBQ2hELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4SCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asc0JBQXNCO2dCQUN0QixXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7WUFDL0MsQ0FBQztRQUNGLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDdkQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSw0QkFBNEIsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUcsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSiwwRkFBMEY7UUFDMUYscUZBQXFGO1FBQ3JGLGtDQUFrQztRQUNsQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNwRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUN6RixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNyQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsWUFBWSxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNyRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBRTVCLG1GQUFtRjtRQUNuRixNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDaEUsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVGLElBQUkseUJBQXlCLEVBQUUsQ0FBQztZQUMvQixNQUFNLDJCQUEyQixHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoRixNQUFNLDBCQUEwQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM5RSwyQkFBMkIsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLDBCQUEwQixDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25GLDBCQUEwQixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwRix5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQztJQUVPLHNCQUFzQixDQUFDLElBQVU7UUFDeEMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztZQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUN6QyxNQUFNLFVBQVUsR0FBRyxJQUFtQixDQUFDO29CQUN2QyxJQUFJLE9BQU8sVUFBVSxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksVUFBVSxDQUFDLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDekUsT0FBTyxVQUFVLENBQUM7b0JBQ25CLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO29CQUM3QixPQUFPLHVCQUF1QixDQUFDO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQXNCO1FBQ25DLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3JHLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxJQUFJLDBCQUEwQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsK0JBQStCLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLDhCQUE4QixDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUN2UyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFFeEIsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU0sTUFBTTtRQUNaLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVqRCxNQUFNLGtDQUFrQyxHQUFHLENBQUMsQ0FBYyxFQUFFLEVBQUU7WUFDN0QsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXhDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQy9DLE9BQU87Z0JBQ04sR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHLEdBQUcsSUFBSTtnQkFDNUIsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSTtnQkFDbEMsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLLEdBQUcsSUFBSTtnQkFDaEMsSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJLEdBQUcsSUFBSTthQUM5QixDQUFDO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDM0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUU1QixNQUFNLFVBQVUsR0FBZTtZQUM5QixHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU07WUFDdkMsTUFBTSxFQUFFO2dCQUNQLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQixDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzthQUNyQjtTQUNELENBQUM7UUFFRix3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3QyxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXRDLHVGQUF1RjtRQUN2RixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsUUFBUSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzdCO29CQUNDLFVBQVUsQ0FBQyxJQUFJLGlDQUF5QixDQUFDO29CQUN6QyxVQUFVLENBQUMsS0FBSyxpQ0FBeUIsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEdBQUcsNkJBQXFCLElBQUksQ0FBQztvQkFDdEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsOEJBQXNCLElBQUksQ0FBQztvQkFDdEUsTUFBTTtnQkFDUDtvQkFDQyxVQUFVLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQztvQkFDekMsVUFBVSxDQUFDLEtBQUssaUNBQXlCLENBQUM7b0JBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxHQUFHLDZCQUFxQixJQUFJLENBQUM7b0JBQ3ZFLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxHQUFHLDhCQUFzQixJQUFJLENBQUM7b0JBQ3ZFLE1BQU07Z0JBQ1A7b0JBQ0MsVUFBVSxDQUFDLEdBQUcsaUNBQXlCLENBQUM7b0JBQ3hDLFVBQVUsQ0FBQyxNQUFNLGlDQUF5QixDQUFDO29CQUMzQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyw2QkFBcUIsSUFBSSxDQUFDO29CQUNyRSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsR0FBRyw4QkFBc0IsSUFBSSxDQUFDO29CQUNyRSxNQUFNO2dCQUNQO29CQUNDLFVBQVUsQ0FBQyxHQUFHLGlDQUF5QixDQUFDO29CQUN4QyxVQUFVLENBQUMsTUFBTSxpQ0FBeUIsQ0FBQztvQkFDM0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEdBQUcsNkJBQXFCLElBQUksQ0FBQztvQkFDeEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLEdBQUcsOEJBQXNCLElBQUksQ0FBQztvQkFDeEUsTUFBTTtZQUNSLENBQUM7WUFFRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3BELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbkMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsUUFBUTtZQUNSLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUU5QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRU8saUJBQWlCLENBQUMsTUFBa0I7UUFDM0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLHFDQUE2QixDQUFDO1FBRXpGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDO2FBRUksSUFBSSxJQUFJLENBQUMsY0FBYyxnQ0FBd0IsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUN4QixDQUFDO2FBRUksSUFBSSxJQUFJLENBQUMsY0FBYywrQkFBdUIsRUFBRSxDQUFDO1lBQ3JELElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7UUFDcEMsQ0FBQzthQUVJLENBQUM7WUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDdkIsQ0FBQztZQUVELGlEQUFpRDtZQUNqRCxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsVUFBVSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsR0FBRyxVQUFVLDBDQUFrQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwSixDQUFDO1FBQ0YsQ0FBQztRQUVELGdEQUFnRDtRQUNoRCxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksMENBQWtDLENBQUM7UUFDekQsQ0FBQztJQUVGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxNQUFrQjtRQUMzQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQzthQUVJLElBQUksSUFBSSxDQUFDLGNBQWMsZ0NBQXdCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDdEIsQ0FBQzthQUVJLElBQUksSUFBSSxDQUFDLGNBQWMsZ0NBQXdCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLENBQUM7YUFFSSxDQUFDO1lBQ0wsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLDZCQUE2QixDQUFDLE1BQWtCO1FBQ3ZELHFFQUFxRTtRQUNyRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQywrQkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVFLHFEQUFxRDtRQUNyRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixNQUFNLE9BQU8sR0FBRyxrQkFBa0IscUNBQTZCLENBQUM7WUFDaEUsSUFBSSxJQUFJLENBQUMsY0FBYyxnQ0FBd0IsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxJQUFJLENBQUM7WUFDdkgsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLCtCQUF1QixFQUFFLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxJQUFJLENBQUM7WUFDNUUsQ0FBQztZQUNELE9BQU87UUFDUixDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLElBQUksSUFBSSxDQUFDLGNBQWMsZ0NBQXdCLEVBQUUsQ0FBQztZQUNqRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDM0UsNkNBQTZDO1lBQzdDLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxHQUFHLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2pGLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQy9CLDJEQUEyRDtnQkFDM0QsSUFBSSxVQUFVLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztvQkFDakYsSUFBSSxDQUFDLGNBQWMsNkJBQXFCLENBQUM7Z0JBQzFDLENBQUM7Z0JBQ0QsK0NBQStDO3FCQUMxQyxDQUFDO29CQUNMLElBQUksQ0FBQyxjQUFjLDhCQUFzQixDQUFDO2dCQUMzQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxtQ0FBbUM7YUFDOUIsSUFBSSxJQUFJLENBQUMsY0FBYywrQkFBdUIsRUFBRSxDQUFDO1lBRXJELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDL0IsNENBQTRDO1lBQzVDLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxHQUFHLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2hGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDM0UsNERBQTREO2dCQUM1RCxJQUFJLFdBQVcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO29CQUNsRixJQUFJLENBQUMsY0FBYyw4QkFBc0IsQ0FBQztnQkFDM0MsQ0FBQztnQkFDRCxnREFBZ0Q7cUJBQzNDLENBQUM7b0JBQ0wsSUFBSSxDQUFDLGNBQWMsOEJBQXNCLENBQUM7Z0JBQzNDLENBQUM7WUFDRixDQUFDO1lBQ0QsNENBQTRDO1lBQzVDLElBQUksTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsR0FBRyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzNILElBQUksQ0FBQyxjQUFjLDhCQUFzQixDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQixDQUFDLE1BQWtCO1FBQ3JELHdFQUF3RTtRQUN4RSw0QkFBNEI7UUFDNUIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQywrQkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVFLHNDQUFzQztRQUN0QyxJQUFJLElBQUksQ0FBQyxjQUFjLGdDQUF3QixFQUFFLENBQUM7WUFDakQsc0NBQXNDO1lBQ3RDLElBQUksTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFlBQVksR0FBRyxrQkFBa0IsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckYsSUFBSSxDQUFDLGNBQWMsOEJBQXNCLENBQUM7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFFRCxrQ0FBa0M7YUFDN0IsSUFBSSxJQUFJLENBQUMsY0FBYyxnQ0FBd0IsRUFBRSxDQUFDO1lBQ3RELHlDQUF5QztZQUN6QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEdBQUcsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDckgsSUFBSSxDQUFDLGNBQWMsOEJBQXNCLENBQUM7WUFDM0MsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsTUFBa0I7UUFDOUMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDO1FBRXRGLHNEQUFzRDtRQUN0RCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQywrQkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBNkIsQ0FBQztZQUM5RixJQUFJLElBQUksQ0FBQyxjQUFjLGdDQUF3QixFQUFFLENBQUM7Z0JBQ2pELFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZELENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxnQ0FBd0IsRUFBRSxDQUFDO2dCQUN4RCxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQztZQUMzRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLFNBQVMsSUFBSSxDQUFDO1FBQ2hFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3pGLHVDQUF1QztZQUN2QyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLHFCQUFxQixJQUFJLENBQUM7WUFDckYsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxLQUFLLGlCQUFpQixFQUFFLENBQUM7Z0JBQzFFLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsaUJBQWlCLENBQUM7WUFDcEUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsTUFBa0I7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixPQUFPO1FBQ1IsQ0FBQztRQUVELFFBQVEsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzdCLGdDQUF3QjtZQUN4QixnQ0FBd0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYywrQkFBdUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDaEcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7Z0JBRTlELGdGQUFnRjtnQkFDaEYsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNqQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsV0FBVyxDQUFDLGdDQUF3QixJQUFJLENBQUM7Z0JBQ3pHLENBQUM7Z0JBRUQsb0RBQW9EO3FCQUMvQyxDQUFDO29CQUNMLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0NBQXdCLElBQUksQ0FBQztnQkFDN0YsQ0FBQztnQkFFRCxNQUFNO1lBQ1AsQ0FBQztZQUNELGlDQUF5QjtZQUN6QixnQ0FBd0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxnQ0FBd0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakcsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUM7Z0JBRTVELDhDQUE4QztnQkFDOUMsSUFBSSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdDQUF3QixDQUFDO2dCQUUvRSw2RUFBNkU7Z0JBQzdFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsbUJBQW1CLENBQUM7Z0JBQy9DLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDdkQsbUJBQW1CLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsZ0NBQXdCLENBQUM7Z0JBQ3pFLENBQUM7Z0JBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUcsbUJBQW1CLElBQUksQ0FBQztnQkFDM0QsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFFTSxJQUFJO1FBQ1YsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pCLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUN6QixDQUFDO0NBQ0QsQ0FBQTtBQTFsQlksV0FBVztJQXVEckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxxQkFBcUIsQ0FBQTtHQTFEWCxXQUFXLENBMGxCdkI7O0FBRUQsTUFBTSxxQkFBc0IsU0FBUSxNQUFNO0lBS3pDLElBQUksVUFBVSxLQUFrQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVoRSxJQUFJLFNBQVMsS0FBYyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBRXBEOzs7OztPQUtHO0lBQ0gsWUFDUyxTQUF3QixFQUN4QixzQkFBOEIsR0FBRztRQUV6QyxLQUFLLEVBQUUsQ0FBQztRQUhBLGNBQVMsR0FBVCxTQUFTLENBQWU7UUFDeEIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFjO1FBaEJsQyxlQUFVLEdBQVksSUFBSSxDQUFDO1FBQ2xCLGdCQUFXLEdBQW9DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFFdkYsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQWlCbEUsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN4QiwyRkFBMkY7UUFDM0Ysc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGtCQUFrQjtJQUd2QixZQUNTLFFBQXFCO1FBQXJCLGFBQVEsR0FBUixRQUFRLENBQWE7UUFFN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsT0FBTztJQUNQLENBQUM7Q0FDRCJ9