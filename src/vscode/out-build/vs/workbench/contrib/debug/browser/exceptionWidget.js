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
import './media/exceptionWidget.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { EDITOR_CONTRIBUTION_ID } from '../common/debug.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { LinkDetector } from './linkDetector.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
const $ = dom.$;
// theming
const debugExceptionWidgetBorder = registerColor('debugExceptionWidget.border', '#a31515', nls.localize(7536, null));
const debugExceptionWidgetBackground = registerColor('debugExceptionWidget.background', { dark: '#420b0d', light: '#f1dfde', hcDark: '#420b0d', hcLight: '#f1dfde' }, nls.localize(7537, null));
let ExceptionWidget = class ExceptionWidget extends ZoneWidget {
    constructor(editor, exceptionInfo, debugSession, shouldScroll, themeService, instantiationService) {
        super(editor, { showFrame: true, showArrow: true, isAccessible: true, frameWidth: 1, className: 'exception-widget-container' });
        this.exceptionInfo = exceptionInfo;
        this.debugSession = debugSession;
        this.shouldScroll = shouldScroll;
        this.instantiationService = instantiationService;
        this.applyTheme(themeService.getColorTheme());
        this._disposables.add(themeService.onDidColorThemeChange(this.applyTheme.bind(this)));
        this.create();
        const onDidLayoutChangeScheduler = new RunOnceScheduler(() => this._doLayout(undefined, undefined), 50);
        this._disposables.add(this.editor.onDidLayoutChange(() => onDidLayoutChangeScheduler.schedule()));
        this._disposables.add(onDidLayoutChangeScheduler);
    }
    applyTheme(theme) {
        this.backgroundColor = theme.getColor(debugExceptionWidgetBackground);
        const frameColor = theme.getColor(debugExceptionWidgetBorder);
        this.style({
            arrowColor: frameColor,
            frameColor: frameColor
        }); // style() will trigger _applyStyles
    }
    _applyStyles() {
        if (this.container) {
            this.container.style.backgroundColor = this.backgroundColor ? this.backgroundColor.toString() : '';
        }
        super._applyStyles();
    }
    _fillContainer(container) {
        this.setCssClass('exception-widget');
        // Set the font size and line height to the one from the editor configuration.
        const fontInfo = this.editor.getOption(59 /* EditorOption.fontInfo */);
        container.style.fontSize = `${fontInfo.fontSize}px`;
        container.style.lineHeight = `${fontInfo.lineHeight}px`;
        container.tabIndex = 0;
        const title = $('.title');
        const label = $('.label');
        dom.append(title, label);
        const actions = $('.actions');
        dom.append(title, actions);
        label.textContent = this.exceptionInfo.id ? nls.localize(7538, null, this.exceptionInfo.id) : nls.localize(7539, null);
        let ariaLabel = label.textContent;
        const actionBar = new ActionBar(actions);
        actionBar.push(new Action('editor.closeExceptionWidget', nls.localize(7540, null), ThemeIcon.asClassName(widgetClose), true, async () => {
            const contribution = this.editor.getContribution(EDITOR_CONTRIBUTION_ID);
            contribution?.closeExceptionWidget();
        }), { label: false, icon: true });
        dom.append(container, title);
        if (this.exceptionInfo.description) {
            const description = $('.description');
            description.textContent = this.exceptionInfo.description;
            ariaLabel += ', ' + this.exceptionInfo.description;
            dom.append(container, description);
        }
        if (this.exceptionInfo.details && this.exceptionInfo.details.stackTrace) {
            const stackTrace = $('.stack-trace');
            const linkDetector = this.instantiationService.createInstance(LinkDetector);
            const linkedStackTrace = linkDetector.linkify(this.exceptionInfo.details.stackTrace, true, this.debugSession ? this.debugSession.root : undefined, undefined, { type: 0 /* DebugLinkHoverBehavior.Rich */, store: this._disposables });
            stackTrace.appendChild(linkedStackTrace);
            dom.append(container, stackTrace);
            ariaLabel += ', ' + this.exceptionInfo.details.stackTrace;
        }
        container.setAttribute('aria-label', ariaLabel);
    }
    _doLayout(_heightInPixel, _widthInPixel) {
        // Reload the height with respect to the exception text content and relayout it to match the line count.
        this.container.style.height = 'initial';
        const lineHeight = this.editor.getOption(75 /* EditorOption.lineHeight */);
        const arrowHeight = Math.round(lineHeight / 3);
        const computedLinesNumber = Math.ceil((this.container.offsetHeight + arrowHeight) / lineHeight);
        this._relayout(computedLinesNumber);
    }
    revealRange(range, isLastLine) {
        // Only reveal/scroll if this widget should scroll
        // For inactive editors, skip the reveal to prevent scrolling
        if (this.shouldScroll()) {
            super.revealRange(range, isLastLine);
        }
    }
    focus() {
        // Focus into the container for accessibility purposes so the exception and stack trace gets read
        this.container?.focus();
    }
    hasFocus() {
        if (!this.container) {
            return false;
        }
        return dom.isAncestorOfActiveElement(this.container);
    }
    getWhitespaceHeight() {
        // Returns the height of the whitespace zone from the editor's whitespaces
        // This is more accurate than the container height as it includes the actual zone dimensions
        if (!this._viewZone || !this._viewZone.id) {
            return 0;
        }
        const whitespaces = this.editor.getWhitespaces();
        const whitespace = whitespaces.find(ws => ws.id === this._viewZone.id);
        return whitespace ? whitespace.height : 0;
    }
};
ExceptionWidget = __decorate([
    __param(4, IThemeService),
    __param(5, IInstantiationService)
], ExceptionWidget);
export { ExceptionWidget };
//# sourceMappingURL=exceptionWidget.js.map