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
var ModelNameColumnRenderer_1, TokenLimitsColumnRenderer_1, ActionsColumnRenderer_1, ChatModelsWidget_1;
import './media/chatModelsWidget.css';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageModelsService } from '../../../chat/common/languageModels.js';
import { localize } from '../../../../../nls.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../../platform/list/browser/listService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { toAction, Action, Separator } from '../../../../../base/common/actions.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatModelsViewModel, SEARCH_SUGGESTIONS, isVendorEntry } from './chatModelsViewModel.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { SuggestEnabledInput } from '../../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { Delayer } from '../../../../../base/common/async.js';
import { settingsTextInputBorder } from '../../../preferences/common/settingsEditorColorRegistry.js';
import { IChatEntitlementService, ChatEntitlement } from '../../../../services/chat/common/chatEntitlementService.js';
import { DropdownMenuActionViewItem } from '../../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { ToolBar } from '../../../../../base/browser/ui/toolbar/toolbar.js';
import { preferencesClearInputIcon } from '../../../preferences/browser/preferencesIcons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { CONTEXT_MODELS_SEARCH_FOCUS } from '../../common/constants.js';
const $ = DOM.$;
const HEADER_HEIGHT = 30;
const VENDOR_ROW_HEIGHT = 30;
const MODEL_ROW_HEIGHT = 26;
export function getModelHoverContent(model) {
    const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    markdown.appendMarkdown(`**${model.metadata.name}**`);
    if (model.metadata.id !== model.metadata.version) {
        markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${model.metadata.id}@${model.metadata.version}_&nbsp;</span>`);
    }
    else {
        markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${model.metadata.id}_&nbsp;</span>`);
    }
    markdown.appendText(`\n`);
    if (model.metadata.statusIcon && model.metadata.tooltip) {
        if (model.metadata.statusIcon) {
            markdown.appendMarkdown(`$(${model.metadata.statusIcon.id})&nbsp;`);
        }
        markdown.appendMarkdown(`${model.metadata.tooltip}`);
        markdown.appendText(`\n`);
    }
    if (model.metadata.detail) {
        markdown.appendMarkdown(`${localize(5850, null)}: `);
        markdown.appendMarkdown(model.metadata.detail);
        markdown.appendText(`\n`);
    }
    if (model.metadata.maxInputTokens || model.metadata.maxOutputTokens) {
        markdown.appendMarkdown(`${localize(5851, null)}: `);
        let addSeparator = false;
        if (model.metadata.maxInputTokens) {
            markdown.appendMarkdown(`$(arrow-down) ${formatTokenCount(model.metadata.maxInputTokens)} (${localize(5852, null)})`);
            addSeparator = true;
        }
        if (model.metadata.maxOutputTokens) {
            if (addSeparator) {
                markdown.appendText(`  |  `);
            }
            markdown.appendMarkdown(`$(arrow-up) ${formatTokenCount(model.metadata.maxOutputTokens)} (${localize(5853, null)})`);
        }
        markdown.appendText(`\n`);
    }
    if (model.metadata.capabilities) {
        markdown.appendMarkdown(`${localize(5854, null)}: `);
        if (model.metadata.capabilities?.toolCalling) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize(5855, null)}_&nbsp;</span>`);
        }
        if (model.metadata.capabilities?.vision) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize(5856, null)}_&nbsp;</span>`);
        }
        if (model.metadata.capabilities?.agentMode) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize(5857, null)}_&nbsp;</span>`);
        }
        for (const editTool of model.metadata.capabilities.editTools ?? []) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${editTool}_&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
    }
    return markdown;
}
class ModelsFilterAction extends Action {
    constructor() {
        super('workbench.models.filter', localize(5858, null), ThemeIcon.asClassName(Codicon.filter));
    }
    async run() {
    }
}
function toggleFilter(currentQuery, query, alternativeQueries = []) {
    const allQueries = [query, ...alternativeQueries];
    const isChecked = allQueries.some(q => currentQuery.includes(q));
    if (!isChecked) {
        const trimmedQuery = currentQuery.trim();
        return trimmedQuery ? `${trimmedQuery} ${query}` : query;
    }
    else {
        let queryWithRemovedFilter = currentQuery;
        for (const q of allQueries) {
            queryWithRemovedFilter = queryWithRemovedFilter.replace(q, '');
        }
        return queryWithRemovedFilter.replace(/\s+/g, ' ').trim();
    }
}
let ModelsSearchFilterDropdownMenuActionViewItem = class ModelsSearchFilterDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, searchWidget, viewModel, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.searchWidget = searchWidget;
        this.viewModel = viewModel;
    }
    createProviderAction(vendor, displayName) {
        const query = `@provider:"${displayName}"`;
        const currentQuery = this.searchWidget.getValue();
        const isChecked = currentQuery.includes(query) || currentQuery.includes(`@provider:${vendor}`);
        return {
            id: `provider-${vendor}`,
            label: displayName,
            tooltip: localize(5859, null, displayName),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch(query, [`@provider:${vendor}`])
        };
    }
    createCapabilityAction(capability, label) {
        const query = `@capability:${capability}`;
        const currentQuery = this.searchWidget.getValue();
        const isChecked = currentQuery.includes(query);
        return {
            id: `capability-${capability}`,
            label,
            tooltip: localize(5860, null, label),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch(query)
        };
    }
    createVisibleAction(visible, label) {
        const query = `@visible:${visible}`;
        const oppositeQuery = `@visible:${!visible}`;
        const currentQuery = this.searchWidget.getValue();
        const isChecked = currentQuery.includes(query);
        return {
            id: `visible-${visible}`,
            label,
            tooltip: localize(5861, null, label),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch(query, [oppositeQuery])
        };
    }
    toggleFilterAndSearch(query, alternativeQueries = []) {
        const currentQuery = this.searchWidget.getValue();
        const newQuery = toggleFilter(currentQuery, query, alternativeQueries);
        this.searchWidget.setValue(newQuery);
        this.searchWidget.focus();
    }
    getActions() {
        const actions = [];
        // Visibility filters
        actions.push(this.createVisibleAction(true, localize(5862, null)));
        actions.push(this.createVisibleAction(false, localize(5863, null)));
        // Capability filters
        actions.push(new Separator());
        actions.push(this.createCapabilityAction('tools', localize(5864, null)), this.createCapabilityAction('vision', localize(5865, null)), this.createCapabilityAction('agent', localize(5866, null)));
        // Provider filters - only show providers with configured models
        const configuredVendors = this.viewModel.getConfiguredVendors();
        if (configuredVendors.length > 1) {
            actions.push(new Separator());
            actions.push(...configuredVendors.map(vendor => this.createProviderAction(vendor.vendor, vendor.vendorDisplayName)));
        }
        return actions;
    }
};
ModelsSearchFilterDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService)
], ModelsSearchFilterDropdownMenuActionViewItem);
class Delegate {
    constructor() {
        this.headerRowHeight = HEADER_HEIGHT;
    }
    getHeight(element) {
        return isVendorEntry(element) ? VENDOR_ROW_HEIGHT : MODEL_ROW_HEIGHT;
    }
}
class ModelsTableColumnRenderer {
    renderElement(element, index, templateData) {
        templateData.elementDisposables.clear();
        const isVendor = isVendorEntry(element);
        templateData.container.classList.add('models-table-column');
        templateData.container.parentElement.classList.toggle('models-vendor-row', isVendor);
        templateData.container.parentElement.classList.toggle('models-model-row', !isVendor);
        templateData.container.parentElement.classList.toggle('model-hidden', !isVendor && !element.modelEntry.metadata.isUserSelectable);
        if (isVendor) {
            this.renderVendorElement(element, index, templateData);
        }
        else {
            this.renderModelElement(element, index, templateData);
        }
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.disposables.dispose();
    }
}
class GutterColumnRenderer extends ModelsTableColumnRenderer {
    static { this.TEMPLATE_ID = 'gutter'; }
    constructor(viewModel) {
        super();
        this.viewModel = viewModel;
        this.templateId = GutterColumnRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('models-gutter-column');
        const actionBar = disposables.add(new ActionBar(container));
        return {
            rowContainer: container.parentElement,
            container,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        templateData.actionBar.push(this.createToggleCollapseAction(entry), { icon: true, label: false });
    }
    createToggleCollapseAction(entry) {
        const label = entry.collapsed ? localize(5867, null) : localize(5868, null);
        return {
            id: 'toggleCollapse',
            label,
            tooltip: label,
            enabled: true,
            class: ThemeIcon.asClassName(entry.collapsed ? Codicon.chevronRight : Codicon.chevronDown),
            run: () => {
                this.viewModel.toggleVendorCollapsed(entry);
            }
        };
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry } = entry;
        const isVisible = modelEntry.metadata.isUserSelectable ?? false;
        const toggleVisibilityAction = toAction({
            id: 'toggleVisibility',
            label: isVisible ? localize(5869, null) : localize(5870, null),
            class: `model-visibility-toggle ${isVisible ? `${ThemeIcon.asClassName(Codicon.eye)} model-visible` : `${ThemeIcon.asClassName(Codicon.eyeClosed)} model-hidden`}`,
            tooltip: isVisible ? localize(5871, null) : localize(5872, null),
            checked: !isVisible,
            run: async () => this.viewModel.toggleVisibility(entry)
        });
        templateData.actionBar.push(toggleVisibilityAction, { icon: true, label: false });
    }
}
let ModelNameColumnRenderer = class ModelNameColumnRenderer extends ModelsTableColumnRenderer {
    static { ModelNameColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'modelName'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = ModelNameColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const nameContainer = DOM.append(container, $('.model-name-container'));
        const nameLabel = disposables.add(new HighlightedLabel(DOM.append(nameContainer, $('.model-name'))));
        const statusIcon = DOM.append(nameContainer, $('.model-status-icon'));
        const actionBar = disposables.add(new ActionBar(DOM.append(nameContainer, $('.model-name-actions'))));
        return {
            container,
            statusIcon,
            nameLabel,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.statusIcon);
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        templateData.nameLabel.set(entry.vendorEntry.vendorDisplayName, undefined);
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry, modelNameMatches } = entry;
        templateData.statusIcon.className = 'model-status-icon';
        if (modelEntry.metadata.statusIcon) {
            templateData.statusIcon.classList.add(...ThemeIcon.asClassNameArray(modelEntry.metadata.statusIcon));
            templateData.statusIcon.style.display = '';
        }
        else {
            templateData.statusIcon.style.display = 'none';
        }
        templateData.nameLabel.set(modelEntry.metadata.name, modelNameMatches);
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        markdown.appendMarkdown(`**${entry.modelEntry.metadata.name}**`);
        if (entry.modelEntry.metadata.id !== entry.modelEntry.metadata.version) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${entry.modelEntry.metadata.id}@${entry.modelEntry.metadata.version}_&nbsp;</span>`);
        }
        else {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${entry.modelEntry.metadata.id}_&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
        if (entry.modelEntry.metadata.statusIcon && entry.modelEntry.metadata.tooltip) {
            if (entry.modelEntry.metadata.statusIcon) {
                markdown.appendMarkdown(`$(${entry.modelEntry.metadata.statusIcon.id})&nbsp;`);
            }
            markdown.appendMarkdown(`${entry.modelEntry.metadata.tooltip}`);
            markdown.appendText(`\n`);
        }
        if (!entry.modelEntry.metadata.isUserSelectable) {
            markdown.appendMarkdown(`\n\n${localize(5873, null)}`);
        }
        templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
            content: markdown,
            appearance: {
                compact: true,
                skipFadeInAnimation: true,
            }
        })));
    }
};
ModelNameColumnRenderer = ModelNameColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], ModelNameColumnRenderer);
class MultiplierColumnRenderer extends ModelsTableColumnRenderer {
    constructor() {
        super(...arguments);
        this.templateId = MultiplierColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'multiplier'; }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const multiplierElement = DOM.append(container, $('.model-multiplier'));
        return {
            container,
            multiplierElement,
            disposables,
            elementDisposables
        };
    }
    renderVendorElement(entry, index, templateData) {
        templateData.multiplierElement.textContent = '';
    }
    renderModelElement(entry, index, templateData) {
        templateData.multiplierElement.textContent = (entry.modelEntry.metadata.detail && entry.modelEntry.metadata.detail.trim().toLowerCase() !== entry.modelEntry.vendor.trim().toLowerCase()) ? entry.modelEntry.metadata.detail : '-';
    }
}
let TokenLimitsColumnRenderer = class TokenLimitsColumnRenderer extends ModelsTableColumnRenderer {
    static { TokenLimitsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'tokenLimits'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = TokenLimitsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const tokenLimitsElement = DOM.append(container, $('.model-token-limits'));
        return {
            container,
            tokenLimitsElement,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.tokenLimitsElement);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry } = entry;
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        if (modelEntry.metadata.maxInputTokens || modelEntry.metadata.maxOutputTokens) {
            let addSeparator = false;
            markdown.appendMarkdown(`${localize(5874, null)}: `);
            if (modelEntry.metadata.maxInputTokens) {
                const inputDiv = DOM.append(templateData.tokenLimitsElement, $('.token-limit-item'));
                DOM.append(inputDiv, $('span.codicon.codicon-arrow-down'));
                const inputText = DOM.append(inputDiv, $('span'));
                inputText.textContent = formatTokenCount(modelEntry.metadata.maxInputTokens);
                markdown.appendMarkdown(`$(arrow-down) ${modelEntry.metadata.maxInputTokens} (${localize(5875, null)})`);
                addSeparator = true;
            }
            if (modelEntry.metadata.maxOutputTokens) {
                const outputDiv = DOM.append(templateData.tokenLimitsElement, $('.token-limit-item'));
                DOM.append(outputDiv, $('span.codicon.codicon-arrow-up'));
                const outputText = DOM.append(outputDiv, $('span'));
                outputText.textContent = formatTokenCount(modelEntry.metadata.maxOutputTokens);
                if (addSeparator) {
                    markdown.appendText(`  |  `);
                }
                markdown.appendMarkdown(`$(arrow-up) ${modelEntry.metadata.maxOutputTokens} (${localize(5876, null)})`);
            }
        }
        templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
            content: markdown,
            appearance: {
                compact: true,
                skipFadeInAnimation: true,
            }
        })));
    }
};
TokenLimitsColumnRenderer = TokenLimitsColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], TokenLimitsColumnRenderer);
class CapabilitiesColumnRenderer extends ModelsTableColumnRenderer {
    constructor() {
        super(...arguments);
        this.templateId = CapabilitiesColumnRenderer.TEMPLATE_ID;
        this._onDidClickCapability = new Emitter();
        this.onDidClickCapability = this._onDidClickCapability.event;
    }
    static { this.TEMPLATE_ID = 'capabilities'; }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('model-capability-column');
        const metadataRow = DOM.append(container, $('.model-capabilities'));
        return {
            container,
            metadataRow,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.metadataRow);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry, capabilityMatches } = entry;
        if (modelEntry.metadata.capabilities?.toolCalling) {
            templateData.elementDisposables.add(this.createCapabilityButton(templateData.metadataRow, capabilityMatches?.includes('toolCalling') || false, localize(5877, null), 'tools'));
        }
        if (modelEntry.metadata.capabilities?.vision) {
            templateData.elementDisposables.add(this.createCapabilityButton(templateData.metadataRow, capabilityMatches?.includes('vision') || false, localize(5878, null), 'vision'));
        }
    }
    createCapabilityButton(container, isActive, label, capability) {
        const disposables = new DisposableStore();
        const buttonContainer = DOM.append(container, $('.model-badge-container'));
        const button = disposables.add(new Button(buttonContainer, { secondary: true }));
        button.element.classList.add('model-capability');
        button.element.classList.toggle('active', isActive);
        button.label = label;
        disposables.add(button.onDidClick(() => this._onDidClickCapability.fire(capability)));
        return disposables;
    }
}
let ActionsColumnRenderer = class ActionsColumnRenderer extends ModelsTableColumnRenderer {
    static { ActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(viewModel, commandService) {
        super();
        this.viewModel = viewModel;
        this.commandService = commandService;
        this.templateId = ActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const parent = DOM.append(container, $('.actions-column'));
        const actionBar = disposables.add(new ActionBar(parent));
        return {
            container,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        if (entry.vendorEntry.managementCommand) {
            const { vendorEntry } = entry;
            const action = toAction({
                id: 'manageVendor',
                label: localize(5879, null, entry.vendorEntry.vendorDisplayName),
                class: ThemeIcon.asClassName(Codicon.gear),
                run: async () => {
                    await this.commandService.executeCommand(vendorEntry.managementCommand, vendorEntry.vendor);
                    this.viewModel.refresh();
                }
            });
            templateData.actionBar.push(action, { icon: true, label: false });
        }
    }
    renderModelElement(entry, index, templateData) {
        // Visibility action moved to name column
    }
};
ActionsColumnRenderer = ActionsColumnRenderer_1 = __decorate([
    __param(1, ICommandService)
], ActionsColumnRenderer);
function formatTokenCount(count) {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    else if (count >= 1000) {
        return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
}
let ChatModelsWidget = class ChatModelsWidget extends Disposable {
    static { ChatModelsWidget_1 = this; }
    static { this.NUM_INSTANCES = 0; }
    constructor(languageModelsService, instantiationService, extensionService, contextMenuService, chatEntitlementService, editorProgressService, commandService, contextKeyService) {
        super();
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        this.extensionService = extensionService;
        this.contextMenuService = contextMenuService;
        this.chatEntitlementService = chatEntitlementService;
        this.editorProgressService = editorProgressService;
        this.commandService = commandService;
        this.dropdownActions = [];
        this.searchFocusContextKey = CONTEXT_MODELS_SEARCH_FOCUS.bindTo(contextKeyService);
        this.delayedFiltering = new Delayer(200);
        this.viewModel = this._register(this.instantiationService.createInstance(ChatModelsViewModel));
        this.element = DOM.$('.models-widget');
        this.create(this.element);
        const loadingPromise = this.extensionService.whenInstalledExtensionsRegistered().then(() => this.viewModel.resolve());
        this.editorProgressService.showWhile(loadingPromise, 300);
    }
    create(container) {
        const searchAndButtonContainer = DOM.append(container, $('.models-search-and-button-container'));
        const placeholder = localize(5880, null);
        const searchContainer = DOM.append(searchAndButtonContainer, $('.models-search-container'));
        this.searchWidget = this._register(this.instantiationService.createInstance(SuggestEnabledInput, 'chatModelsWidget.searchbox', searchContainer, {
            triggerCharacters: ['@', ':'],
            provideResults: (query) => {
                const providerSuggestions = this.viewModel.getVendors().map(v => `@provider:"${v.displayName}"`);
                const allSuggestions = [
                    ...providerSuggestions,
                    ...SEARCH_SUGGESTIONS.CAPABILITIES,
                    ...SEARCH_SUGGESTIONS.VISIBILITY,
                ];
                if (!query.trim()) {
                    return allSuggestions;
                }
                const queryParts = query.split(/\s/g);
                const lastPart = queryParts[queryParts.length - 1];
                if (lastPart.startsWith('@provider:')) {
                    return providerSuggestions;
                }
                else if (lastPart.startsWith('@capability:')) {
                    return SEARCH_SUGGESTIONS.CAPABILITIES;
                }
                else if (lastPart.startsWith('@visible:')) {
                    return SEARCH_SUGGESTIONS.VISIBILITY;
                }
                else if (lastPart.startsWith('@')) {
                    return allSuggestions;
                }
                return [];
            }
        }, placeholder, `chatModelsWidget:searchinput:${ChatModelsWidget_1.NUM_INSTANCES++}`, {
            placeholderText: placeholder,
            styleOverrides: {
                inputBorder: settingsTextInputBorder
            },
            focusContextKey: this.searchFocusContextKey,
        }));
        const filterAction = this._register(new ModelsFilterAction());
        const clearSearchAction = this._register(new Action('workbench.models.clearSearch', localize(5881, null), ThemeIcon.asClassName(preferencesClearInputIcon), false, () => {
            this.searchWidget.setValue('');
            this.searchWidget.focus();
        }));
        this._register(this.searchWidget.onInputDidChange(() => {
            clearSearchAction.enabled = !!this.searchWidget.getValue();
            this.filterModels();
        }));
        this.searchActionsContainer = DOM.append(searchContainer, $('.models-search-actions'));
        const actions = [clearSearchAction, filterAction];
        const toolBar = this._register(new ToolBar(this.searchActionsContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === filterAction.id) {
                    return this.instantiationService.createInstance(ModelsSearchFilterDropdownMenuActionViewItem, action, options, this.searchWidget, this.viewModel);
                }
                return undefined;
            },
            getKeyBinding: () => undefined
        }));
        toolBar.setActions(actions);
        // Add padding to input box for toolbar
        this.searchWidget.inputWidget.getContainerDomNode().style.paddingRight = `${DOM.getTotalWidth(this.searchActionsContainer) + 12}px`;
        this.addButtonContainer = DOM.append(searchAndButtonContainer, $('.section-title-actions'));
        const buttonOptions = {
            ...defaultButtonStyles,
            supportIcons: true,
        };
        this.addButton = this._register(new Button(this.addButtonContainer, buttonOptions));
        this.addButton.label = `$(${Codicon.add.id}) ${localize(5882, null)}`;
        this.addButton.element.classList.add('models-add-model-button');
        this.addButton.enabled = false;
        this._register(this.addButton.onDidClick((e) => {
            if (this.dropdownActions.length > 0) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => this.addButton.element,
                    getActions: () => this.dropdownActions,
                });
            }
        }));
        // Table container
        this.tableContainer = DOM.append(container, $('.models-table-container'));
        // Create table
        const gutterColumnRenderer = this.instantiationService.createInstance(GutterColumnRenderer, this.viewModel);
        const modelNameColumnRenderer = this.instantiationService.createInstance(ModelNameColumnRenderer);
        const costColumnRenderer = this.instantiationService.createInstance(MultiplierColumnRenderer);
        const tokenLimitsColumnRenderer = this.instantiationService.createInstance(TokenLimitsColumnRenderer);
        const capabilitiesColumnRenderer = this.instantiationService.createInstance(CapabilitiesColumnRenderer);
        const actionsColumnRenderer = this.instantiationService.createInstance(ActionsColumnRenderer, this.viewModel);
        this._register(capabilitiesColumnRenderer.onDidClickCapability(capability => {
            const currentQuery = this.searchWidget.getValue();
            const query = `@capability:${capability}`;
            const newQuery = toggleFilter(currentQuery, query);
            this.searchWidget.setValue(newQuery);
            this.searchWidget.focus();
        }));
        this.table = this._register(this.instantiationService.createInstance(WorkbenchTable, 'ModelsWidget', this.tableContainer, new Delegate(), [
            {
                label: '',
                tooltip: '',
                weight: 0.05,
                minimumWidth: 40,
                maximumWidth: 40,
                templateId: GutterColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize(5883, null),
                tooltip: '',
                weight: 0.40,
                minimumWidth: 200,
                templateId: ModelNameColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize(5884, null),
                tooltip: '',
                weight: 0.30,
                minimumWidth: 180,
                templateId: CapabilitiesColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize(5885, null),
                tooltip: '',
                weight: 0.1,
                minimumWidth: 140,
                templateId: TokenLimitsColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize(5886, null),
                tooltip: '',
                weight: 0.1,
                minimumWidth: 60,
                templateId: MultiplierColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: '',
                tooltip: '',
                weight: 0.05,
                minimumWidth: 64,
                maximumWidth: 64,
                templateId: ActionsColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
        ], [
            gutterColumnRenderer,
            modelNameColumnRenderer,
            costColumnRenderer,
            tokenLimitsColumnRenderer,
            capabilitiesColumnRenderer,
            actionsColumnRenderer,
        ], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel: (e) => {
                    if (isVendorEntry(e)) {
                        return localize(5887, null, e.vendorEntry.vendorDisplayName);
                    }
                    return localize(5888, null, e.modelEntry.metadata.name, e.modelEntry.vendorDisplayName);
                },
                getWidgetAriaLabel: () => localize(5889, null)
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: true,
            alwaysConsumeMouseWheel: false,
        }));
        this._register(this.table.onContextMenu(e => {
            if (!e.element) {
                return;
            }
            const entry = e.element;
            if (isVendorEntry(entry) && entry.vendorEntry.managementCommand) {
                const actions = [
                    toAction({
                        id: 'manageVendor',
                        label: localize(5890, null, entry.vendorEntry.vendorDisplayName),
                        run: async () => {
                            await this.commandService.executeCommand(entry.vendorEntry.managementCommand, entry.vendorEntry.vendor);
                            await this.viewModel.resolve();
                        }
                    })
                ];
                this.contextMenuService.showContextMenu({
                    getAnchor: () => e.anchor,
                    getActions: () => actions
                });
            }
        }));
        this.table.splice(0, this.table.length, this.viewModel.viewModelEntries);
        this._register(this.viewModel.onDidChange(({ at, removed, added }) => {
            this.table.splice(at, removed, added);
            if (this.viewModel.selectedEntry) {
                const selectedEntryIndex = this.viewModel.viewModelEntries.indexOf(this.viewModel.selectedEntry);
                this.table.setFocus([selectedEntryIndex]);
                this.table.setSelection([selectedEntryIndex]);
            }
            const vendors = this.viewModel.getVendors();
            const configuredVendors = new Set(this.viewModel.getConfiguredVendors().map(cv => cv.vendor));
            const vendorsWithoutModels = vendors.filter(v => !configuredVendors.has(v.vendor));
            const hasPlan = this.chatEntitlementService.entitlement !== ChatEntitlement.Unknown && this.chatEntitlementService.entitlement !== ChatEntitlement.Available;
            this.addButton.enabled = hasPlan && vendorsWithoutModels.length > 0;
            this.dropdownActions = vendorsWithoutModels.map(vendor => toAction({
                id: `enable-${vendor.vendor}`,
                label: vendor.displayName,
                run: async () => {
                    await this.enableProvider(vendor.vendor);
                }
            }));
        }));
        this._register(this.table.onDidOpen(async ({ element, browserEvent }) => {
            if (!element) {
                return;
            }
            if (isVendorEntry(element)) {
                this.viewModel.toggleVendorCollapsed(element);
            }
            else if (!DOM.isMouseEvent(browserEvent) || browserEvent.detail === 2) {
                this.viewModel.toggleVisibility(element);
            }
        }));
        this._register(this.table.onDidChangeSelection(e => this.viewModel.selectedEntry = e.elements[0]));
    }
    filterModels() {
        this.delayedFiltering.trigger(() => {
            this.viewModel.filter(this.searchWidget.getValue());
        });
    }
    async enableProvider(vendorId) {
        await this.languageModelsService.selectLanguageModels({ vendor: vendorId }, true);
        await this.viewModel.resolve();
    }
    layout(height, width) {
        width = width - 24;
        this.searchWidget.layout(new DOM.Dimension(width - this.searchActionsContainer.clientWidth - this.addButtonContainer.clientWidth - 8, 22));
        const tableHeight = height - 40;
        this.tableContainer.style.height = `${tableHeight}px`;
        this.table.layout(tableHeight, width);
    }
    focusSearch() {
        this.searchWidget.focus();
    }
    search(filter) {
        this.focusSearch();
        this.searchWidget.setValue(filter);
    }
    clearSearch() {
        this.searchWidget.setValue('');
    }
};
ChatModelsWidget = ChatModelsWidget_1 = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, IInstantiationService),
    __param(2, IExtensionService),
    __param(3, IContextMenuService),
    __param(4, IChatEntitlementService),
    __param(5, IEditorProgressService),
    __param(6, ICommandService),
    __param(7, IContextKeyService)
], ChatModelsWidget);
export { ChatModelsWidget };
//# sourceMappingURL=chatModelsWidget.js.map