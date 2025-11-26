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
var ReplGroupRenderer_1, ReplOutputElementRenderer_1, ReplVariablesRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { CachedListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import severity from '../../../../base/common/severity.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { RawObjectReplElement, ReplEvaluationInput, ReplEvaluationResult, ReplGroup, ReplOutputElement, ReplVariableElement } from '../common/replModel.js';
import { AbstractExpressionsRenderer } from './baseDebugView.js';
import { debugConsoleEvaluationInput } from './debugIcons.js';
const $ = dom.$;
export class ReplEvaluationInputsRenderer {
    static { this.ID = 'replEvaluationInput'; }
    get templateId() {
        return ReplEvaluationInputsRenderer.ID;
    }
    renderTemplate(container) {
        dom.append(container, $('span.arrow' + ThemeIcon.asCSSSelector(debugConsoleEvaluationInput)));
        const input = dom.append(container, $('.expression'));
        const label = new HighlightedLabel(input);
        return { label };
    }
    renderElement(element, index, templateData) {
        const evaluation = element.element;
        templateData.label.set(evaluation.value, createMatches(element.filterData));
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
let ReplGroupRenderer = class ReplGroupRenderer {
    static { ReplGroupRenderer_1 = this; }
    static { this.ID = 'replGroup'; }
    constructor(expressionRenderer, instaService) {
        this.expressionRenderer = expressionRenderer;
        this.instaService = instaService;
    }
    get templateId() {
        return ReplGroupRenderer_1.ID;
    }
    renderTemplate(container) {
        container.classList.add('group');
        const expression = dom.append(container, $('.output.expression.value-and-source'));
        const label = dom.append(expression, $('span.label'));
        const source = this.instaService.createInstance(SourceWidget, expression);
        return { label, source };
    }
    renderElement(element, _index, templateData) {
        templateData.elementDisposable?.dispose();
        const replGroup = element.element;
        dom.clearNode(templateData.label);
        templateData.elementDisposable = this.expressionRenderer.renderValue(templateData.label, replGroup.name, { wasANSI: true, session: element.element.session });
        templateData.source.setSource(replGroup.sourceData);
    }
    disposeTemplate(templateData) {
        templateData.elementDisposable?.dispose();
        templateData.source.dispose();
    }
};
ReplGroupRenderer = ReplGroupRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], ReplGroupRenderer);
export { ReplGroupRenderer };
export class ReplEvaluationResultsRenderer {
    static { this.ID = 'replEvaluationResult'; }
    get templateId() {
        return ReplEvaluationResultsRenderer.ID;
    }
    constructor(expressionRenderer) {
        this.expressionRenderer = expressionRenderer;
    }
    renderTemplate(container) {
        const output = dom.append(container, $('.evaluation-result.expression'));
        const value = dom.append(output, $('span.value'));
        return { value, elementStore: new DisposableStore() };
    }
    renderElement(element, index, templateData) {
        templateData.elementStore.clear();
        const expression = element.element;
        templateData.elementStore.add(this.expressionRenderer.renderValue(templateData.value, expression, {
            colorize: true,
            hover: false,
            session: element.element.getSession(),
        }));
    }
    disposeTemplate(templateData) {
        templateData.elementStore.dispose();
    }
}
let ReplOutputElementRenderer = class ReplOutputElementRenderer {
    static { ReplOutputElementRenderer_1 = this; }
    static { this.ID = 'outputReplElement'; }
    constructor(expressionRenderer, instaService) {
        this.expressionRenderer = expressionRenderer;
        this.instaService = instaService;
    }
    get templateId() {
        return ReplOutputElementRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        container.classList.add('output');
        const expression = dom.append(container, $('.output.expression.value-and-source'));
        data.container = container;
        data.countContainer = dom.append(expression, $('.count-badge-wrapper'));
        data.count = new CountBadge(data.countContainer, {}, defaultCountBadgeStyles);
        data.value = dom.append(expression, $('span.value.label'));
        data.source = this.instaService.createInstance(SourceWidget, expression);
        data.elementDisposable = new DisposableStore();
        return data;
    }
    renderElement({ element }, index, templateData) {
        templateData.elementDisposable.clear();
        this.setElementCount(element, templateData);
        templateData.elementDisposable.add(element.onDidChangeCount(() => this.setElementCount(element, templateData)));
        // value
        dom.clearNode(templateData.value);
        // Reset classes to clear ansi decorations since templates are reused
        templateData.value.className = 'value';
        const locationReference = element.expression?.valueLocationReference;
        templateData.elementDisposable.add(this.expressionRenderer.renderValue(templateData.value, element.value, {
            wasANSI: true,
            session: element.session,
            locationReference,
            hover: false,
        }));
        templateData.value.classList.add((element.severity === severity.Warning) ? 'warn' : (element.severity === severity.Error) ? 'error' : (element.severity === severity.Ignore) ? 'ignore' : 'info');
        templateData.source.setSource(element.sourceData);
        templateData.getReplElementSource = () => element.sourceData;
    }
    setElementCount(element, templateData) {
        if (element.count >= 2) {
            templateData.count.setCount(element.count);
            templateData.countContainer.hidden = false;
        }
        else {
            templateData.countContainer.hidden = true;
        }
    }
    disposeTemplate(templateData) {
        templateData.source.dispose();
        templateData.elementDisposable.dispose();
        templateData.count.dispose();
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposable.clear();
    }
};
ReplOutputElementRenderer = ReplOutputElementRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], ReplOutputElementRenderer);
export { ReplOutputElementRenderer };
let ReplVariablesRenderer = class ReplVariablesRenderer extends AbstractExpressionsRenderer {
    static { ReplVariablesRenderer_1 = this; }
    static { this.ID = 'replVariable'; }
    get templateId() {
        return ReplVariablesRenderer_1.ID;
    }
    constructor(expressionRenderer, debugService, contextViewService, hoverService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
    }
    renderElement(node, _index, data) {
        const element = node.element;
        data.elementDisposable.clear();
        super.renderExpressionElement(element instanceof ReplVariableElement ? element.expression : element, node, data);
    }
    renderExpression(expression, data, highlights) {
        const isReplVariable = expression instanceof ReplVariableElement;
        if (isReplVariable || !expression.name) {
            data.label.set('');
            const value = isReplVariable ? expression.expression : expression;
            data.elementDisposable.add(this.expressionRenderer.renderValue(data.value, value, { colorize: true, hover: false, session: expression.getSession() }));
            data.expression.classList.remove('nested-variable');
        }
        else {
            data.elementDisposable.add(this.expressionRenderer.renderVariable(data, expression, { showChanged: true, highlights }));
            data.expression.classList.toggle('nested-variable', isNestedVariable(expression));
        }
    }
    getInputBoxOptions(expression) {
        return undefined;
    }
};
ReplVariablesRenderer = ReplVariablesRenderer_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ReplVariablesRenderer);
export { ReplVariablesRenderer };
export class ReplRawObjectsRenderer {
    static { this.ID = 'rawObject'; }
    constructor(expressionRenderer) {
        this.expressionRenderer = expressionRenderer;
    }
    get templateId() {
        return ReplRawObjectsRenderer.ID;
    }
    renderTemplate(container) {
        container.classList.add('output');
        const expression = dom.append(container, $('.output.expression'));
        const name = dom.append(expression, $('span.name'));
        const label = new HighlightedLabel(name);
        const value = dom.append(expression, $('span.value'));
        return { container, expression, name, label, value, elementStore: new DisposableStore() };
    }
    renderElement(node, index, templateData) {
        templateData.elementStore.clear();
        // key
        const element = node.element;
        templateData.label.set(element.name ? `${element.name}:` : '', createMatches(node.filterData));
        if (element.name) {
            templateData.name.textContent = `${element.name}:`;
        }
        else {
            templateData.name.textContent = '';
        }
        // value
        templateData.elementStore.add(this.expressionRenderer.renderValue(templateData.value, element.value, {
            hover: false,
            session: node.element.getSession(),
        }));
    }
    disposeTemplate(templateData) {
        templateData.elementStore.dispose();
        templateData.label.dispose();
    }
}
function isNestedVariable(element) {
    return element instanceof Variable && (element.parent instanceof ReplEvaluationResult || element.parent instanceof Variable);
}
export class ReplDelegate extends CachedListVirtualDelegate {
    constructor(configurationService, replOptions) {
        super();
        this.configurationService = configurationService;
        this.replOptions = replOptions;
    }
    getHeight(element) {
        const config = this.configurationService.getValue('debug');
        if (!config.console.wordWrap) {
            return this.estimateHeight(element, true);
        }
        return super.getHeight(element);
    }
    /**
     * With wordWrap enabled, this is an estimate. With wordWrap disabled, this is the real height that the list will use.
     */
    estimateHeight(element, ignoreValueLength = false) {
        const lineHeight = this.replOptions.replConfiguration.lineHeight;
        const countNumberOfLines = (str) => str.match(/\n/g)?.length ?? 0;
        const hasValue = (e) => typeof e.value === 'string';
        if (hasValue(element) && !isNestedVariable(element)) {
            const value = element.value;
            const valueRows = countNumberOfLines(value)
                + (ignoreValueLength ? 0 : Math.floor(value.length / 70)) // Make an estimate for wrapping
                + (element instanceof ReplOutputElement ? 0 : 1); // A SimpleReplElement ends in \n if it's a complete line
            return Math.max(valueRows, 1) * lineHeight;
        }
        return lineHeight;
    }
    getTemplateId(element) {
        if (element instanceof Variable || element instanceof ReplVariableElement) {
            return ReplVariablesRenderer.ID;
        }
        if (element instanceof ReplEvaluationResult) {
            return ReplEvaluationResultsRenderer.ID;
        }
        if (element instanceof ReplEvaluationInput) {
            return ReplEvaluationInputsRenderer.ID;
        }
        if (element instanceof ReplOutputElement) {
            return ReplOutputElementRenderer.ID;
        }
        if (element instanceof ReplGroup) {
            return ReplGroupRenderer.ID;
        }
        return ReplRawObjectsRenderer.ID;
    }
    hasDynamicHeight(element) {
        if (isNestedVariable(element)) {
            // Nested variables should always be in one line #111843
            return false;
        }
        // Empty elements should not have dynamic height since they will be invisible
        return element.toString().length > 0;
    }
}
function isDebugSession(obj) {
    return typeof obj.getReplElements === 'function';
}
export class ReplDataSource {
    hasChildren(element) {
        if (isDebugSession(element)) {
            return true;
        }
        return !!element.hasChildren;
    }
    getChildren(element) {
        if (isDebugSession(element)) {
            return Promise.resolve(element.getReplElements());
        }
        return Promise.resolve(element.getChildren());
    }
}
export class ReplAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize(7585, null);
    }
    getAriaLabel(element) {
        if (element instanceof Variable) {
            return localize(7586, null, element.name, element.value);
        }
        if (element instanceof ReplOutputElement || element instanceof ReplEvaluationInput || element instanceof ReplEvaluationResult) {
            return element.value + (element instanceof ReplOutputElement && element.count > 1 ? localize(7587, null, element.count) : '');
        }
        if (element instanceof RawObjectReplElement) {
            return localize(7588, null, element.name, element.value);
        }
        if (element instanceof ReplGroup) {
            return localize(7589, null, element.name);
        }
        return '';
    }
}
let SourceWidget = class SourceWidget extends Disposable {
    constructor(container, editorService, hoverService, labelService) {
        super();
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.el = dom.append(container, $('.source'));
        this._register(dom.addDisposableListener(this.el, 'click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (this.source) {
                this.source.source.openInEditor(editorService, {
                    startLineNumber: this.source.lineNumber,
                    startColumn: this.source.column,
                    endLineNumber: this.source.lineNumber,
                    endColumn: this.source.column
                });
            }
        }));
    }
    setSource(source) {
        this.source = source;
        this.el.textContent = source ? `${basename(source.source.name)}:${source.lineNumber}` : '';
        this.hover ??= this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.el, ''));
        this.hover.update(source ? `${this.labelService.getUriLabel(source.source.uri)}:${source.lineNumber}` : '');
    }
};
SourceWidget = __decorate([
    __param(1, IEditorService),
    __param(2, IHoverService),
    __param(3, ILabelService)
], SourceWidget);
//# sourceMappingURL=replViewer.js.map