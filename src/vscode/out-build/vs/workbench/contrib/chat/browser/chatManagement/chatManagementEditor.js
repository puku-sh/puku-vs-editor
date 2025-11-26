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
var ModelsManagementEditor_1, ChatManagementEditor_1;
import './media/chatManagementEditor.css';
import * as DOM from '../../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { CHAT_MANAGEMENT_SECTION_USAGE, CHAT_MANAGEMENT_SECTION_MODELS } from './chatManagementEditorInput.js';
import { ChatModelsWidget } from './chatModelsWidget.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { localize } from '../../../../../nls.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IChatEntitlementService, ChatEntitlement } from '../../../../services/chat/common/chatEntitlementService.js';
import { ChatUsageWidget } from './chatUsageWidget.js';
import { Sizing, SplitView } from '../../../../../base/browser/ui/splitview/splitview.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { Event } from '../../../../../base/common/event.js';
import { registerColor } from '../../../../../platform/theme/common/colorRegistry.js';
import { PANEL_BORDER } from '../../../../common/theme.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { CONTEXT_MODELS_EDITOR } from '../../common/constants.js';
const $ = DOM.$;
let ModelsManagementEditor = class ModelsManagementEditor extends EditorPane {
    static { ModelsManagementEditor_1 = this; }
    static { this.ID = 'workbench.editor.modelsManagement'; }
    constructor(group, telemetryService, themeService, storageService, instantiationService, contextKeyService) {
        super(ModelsManagementEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.editorDisposables = this._register(new DisposableStore());
        this.inModelsEditorContextKey = CONTEXT_MODELS_EDITOR.bindTo(contextKeyService);
    }
    createEditor(parent) {
        this.editorDisposables.clear();
        this.bodyContainer = DOM.append(parent, $('.ai-models-management-editor'));
        this.modelsWidget = this.editorDisposables.add(this.instantiationService.createInstance(ChatModelsWidget));
        this.bodyContainer.appendChild(this.modelsWidget.element);
    }
    async setInput(input, options, context, token) {
        this.inModelsEditorContextKey.set(true);
        await super.setInput(input, options, context, token);
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    layout(dimension) {
        this.dimension = dimension;
        if (this.bodyContainer) {
            this.modelsWidget?.layout(dimension.height - 15, this.bodyContainer.clientWidth - 24);
        }
    }
    focus() {
        super.focus();
        this.modelsWidget?.focusSearch();
    }
    clearInput() {
        this.inModelsEditorContextKey.set(false);
        super.clearInput();
    }
    clearSearch() {
        this.modelsWidget?.clearSearch();
    }
};
ModelsManagementEditor = ModelsManagementEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], ModelsManagementEditor);
export { ModelsManagementEditor };
export const chatManagementSashBorder = registerColor('chatManagement.sashBorder', PANEL_BORDER, localize(5828, null));
function isNewUser(chatEntitlementService) {
    return !chatEntitlementService.sentiment.installed ||
        chatEntitlementService.entitlement === ChatEntitlement.Available;
}
let ChatManagementEditor = class ChatManagementEditor extends EditorPane {
    static { ChatManagementEditor_1 = this; }
    static { this.ID = 'workbench.editor.chatManagement'; }
    constructor(group, telemetryService, themeService, storageService, instantiationService, commandService, chatEntitlementService) {
        super(ChatManagementEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.selectedSection = CHAT_MANAGEMENT_SECTION_USAGE;
        this.sections = [];
        this.commandService = commandService;
        this.chatEntitlementService = chatEntitlementService;
    }
    createEditor(parent) {
        this.container = DOM.append(parent, $('.ai-management-editor'));
        // Header spans across entire width
        this.renderHeader(this.container);
        // Create split view container
        const splitViewContainer = DOM.append(this.container, $('.split-view-container'));
        const sidebarView = DOM.append(splitViewContainer, $('.sidebar-view'));
        const sidebarContainer = DOM.append(sidebarView, $('.sidebar-container'));
        const contentsView = DOM.append(splitViewContainer, $('.contents-view'));
        this.contentsContainer = DOM.append(contentsView, $('.contents-container'));
        this.splitView = new SplitView(splitViewContainer, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true
        });
        this.renderSidebar(sidebarContainer);
        this.renderContents(this.contentsContainer);
        this.splitView.addView({
            onDidChange: Event.None,
            element: sidebarView,
            minimumSize: 150,
            maximumSize: 350,
            layout: (width, _, height) => {
                sidebarContainer.style.width = `${width}px`;
                if (this.sectionsList && height !== undefined) {
                    this.sectionsList.layout(height, width);
                }
            }
        }, 200, undefined, true);
        this.splitView.addView({
            onDidChange: Event.None,
            element: contentsView,
            minimumSize: 550,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                contentsView.style.width = `${width}px`;
                if (height !== undefined) {
                    this.layoutContents(width, height);
                }
            }
        }, Sizing.Distribute, undefined, true);
        this.updateStyles();
        // Update header data when quotas or entitlements change
        this.updateHeaderData();
        this._register(this.chatEntitlementService.onDidChangeQuotaRemaining(() => this.updateHeaderData()));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.updateHeaderData()));
    }
    updateStyles() {
        const borderColor = this.theme.getColor(chatManagementSashBorder);
        this.splitView?.style({ separatorBorder: borderColor });
    }
    renderSidebar(parent) {
        // Define sections
        this.sections = [
            { id: CHAT_MANAGEMENT_SECTION_USAGE, label: localize(5829, null) },
            { id: CHAT_MANAGEMENT_SECTION_MODELS, label: localize(5830, null) }
        ];
        const delegate = new SectionItemDelegate();
        const renderer = new SectionItemRenderer();
        this.sectionsList = this._register(this.instantiationService.createInstance((WorkbenchList), 'ChatManagementSections', parent, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(element) {
                    return element.label;
                },
                getWidgetAriaLabel() {
                    return localize(5831, null);
                }
            },
            openOnSingleClick: true,
            identityProvider: {
                getId(element) {
                    return element.id;
                }
            }
        }));
        this.sectionsList.splice(0, this.sectionsList.length, this.sections);
        this.sectionsList.setSelection([0]);
        this._register(this.sectionsList.onDidChangeSelection(e => {
            if (e.elements.length > 0) {
                this.selectedSection = e.elements[0].id;
                this.renderSelectedSection();
            }
        }));
    }
    renderHeader(parent) {
        this.headerContainer = DOM.append(parent, $('.ai-management-header'));
        const headerTitleContainer = DOM.append(this.headerContainer, $('.header-title-container'));
        const headerTitleWrapper = DOM.append(headerTitleContainer, $('.header-title-wrapper'));
        // Copilot label
        const tile = DOM.append(headerTitleWrapper, $('.ai-management-editor-title'));
        tile.textContent = localize(5832, null);
        // Plan badge
        this.planBadge = DOM.append(headerTitleWrapper, $('.plan-badge'));
        // Action button container in title
        const titleButtonContainer = DOM.append(headerTitleContainer, $('.header-upgrade-button-container'));
        this.actionButton = this._register(new Button(titleButtonContainer, { ...defaultButtonStyles }));
        this.actionButton.element.classList.add('header-upgrade-button');
        this.actionButton.element.style.display = 'none';
    }
    renderContents(parent) {
        // Body container for widgets
        const bodyContainer = DOM.append(parent, $('.ai-management-body'));
        // Create widgets
        this.chatUsageWidget = this._register(this.instantiationService.createInstance(ChatUsageWidget));
        this.modelsWidget = this._register(this.instantiationService.createInstance(ChatModelsWidget));
        // Append widgets to body
        bodyContainer.appendChild(this.chatUsageWidget.element);
        bodyContainer.appendChild(this.modelsWidget.element);
        // Initially show only the selected section
        this.renderSelectedSection();
    }
    renderSelectedSection() {
        // Hide all widgets
        this.chatUsageWidget.element.style.display = 'none';
        this.modelsWidget.element.style.display = 'none';
        // Show selected widget
        if (this.selectedSection === CHAT_MANAGEMENT_SECTION_USAGE) {
            this.chatUsageWidget.element.style.display = '';
        }
        else if (this.selectedSection === CHAT_MANAGEMENT_SECTION_MODELS) {
            this.modelsWidget.element.style.display = '';
        }
        // Trigger layout
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    layoutContents(width, height) {
        if (!this.contentsContainer) {
            return;
        }
        if (this.selectedSection === CHAT_MANAGEMENT_SECTION_MODELS) {
            this.modelsWidget.layout(height - 30, width - 30);
        }
    }
    selectSection(sectionId) {
        const index = this.sections.findIndex(s => s.id === sectionId);
        if (index >= 0) {
            this.sectionsList?.setFocus([index]);
            this.sectionsList?.setSelection([index]);
        }
    }
    updateHeaderData() {
        const newUser = isNewUser(this.chatEntitlementService);
        const anonymousUser = this.chatEntitlementService.anonymous;
        const disabled = this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted;
        const signedOut = this.chatEntitlementService.entitlement === ChatEntitlement.Unknown;
        const isFreePlan = this.chatEntitlementService.entitlement === ChatEntitlement.Free;
        // Set plan name and toggle visibility based on plan type
        if (anonymousUser || isFreePlan) {
            if (anonymousUser) {
                // Hide badge for anonymous users, only show "Copilot" label
                this.planBadge.style.display = 'none';
            }
            else {
                // Show "Free" badge for free plan
                this.planBadge.style.display = '';
                this.planBadge.textContent = localize(5833, null);
            }
        }
        else {
            this.planBadge.style.display = '';
            // Extract just the plan type (Pro, Pro+, Business, Enterprise)
            const planName = this.getCurrentPlanName();
            this.planBadge.textContent = planName.replace('Copilot ', '');
        }
        const shouldUpgrade = this.shouldShowUpgradeButton();
        // Configure action button
        if (newUser || signedOut || disabled || shouldUpgrade) {
            this.actionButton.element.style.display = '';
            let buttonLabel;
            let commandId;
            if (shouldUpgrade && !isFreePlan && !anonymousUser) {
                // Upgrade for paid plans
                if (this.chatEntitlementService.entitlement === ChatEntitlement.Pro) {
                    buttonLabel = localize(5834, null);
                }
                else {
                    buttonLabel = localize(5835, null);
                }
                commandId = 'workbench.action.chat.upgradePlan';
            }
            else if (shouldUpgrade && (isFreePlan || anonymousUser)) {
                // Upgrade case for free plan
                buttonLabel = localize(5836, null);
                commandId = 'workbench.action.chat.upgradePlan';
            }
            else if (newUser) {
                buttonLabel = localize(5837, null);
                commandId = newUser && anonymousUser ? 'workbench.action.chat.triggerSetupAnonymousWithoutDialog' : 'workbench.action.chat.triggerSetup';
            }
            else if (anonymousUser) {
                buttonLabel = localize(5838, null);
                commandId = 'workbench.action.chat.triggerSetup';
            }
            else if (disabled) {
                buttonLabel = localize(5839, null);
                commandId = 'workbench.action.chat.triggerSetup';
            }
            else {
                buttonLabel = localize(5840, null);
                commandId = 'workbench.action.chat.triggerSetup';
            }
            this.actionButton.label = buttonLabel;
            this.actionButton.onDidClick(() => {
                this.commandService.executeCommand(commandId);
            });
        }
        else {
            this.actionButton.element.style.display = 'none';
        }
    }
    getCurrentPlanName() {
        const entitlement = this.chatEntitlementService.entitlement;
        switch (entitlement) {
            case ChatEntitlement.Pro:
                return localize(5841, null);
            case ChatEntitlement.ProPlus:
                return localize(5842, null);
            case ChatEntitlement.Business:
                return localize(5843, null);
            case ChatEntitlement.Enterprise:
                return localize(5844, null);
            default:
                return localize(5845, null);
        }
    }
    shouldShowUpgradeButton() {
        const entitlement = this.chatEntitlementService.entitlement;
        return entitlement === ChatEntitlement.Available ||
            entitlement === ChatEntitlement.Free ||
            entitlement === ChatEntitlement.Pro;
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    layout(dimension) {
        this.dimension = dimension;
        if (this.container && this.splitView) {
            const headerHeight = this.headerContainer?.offsetHeight || 0;
            const splitViewHeight = dimension.height - headerHeight;
            this.splitView.layout(this.container.clientWidth, splitViewHeight);
            this.splitView.el.style.height = `${splitViewHeight}px`;
        }
    }
    focus() {
        super.focus();
        this.sectionsList?.domFocus();
    }
};
ChatManagementEditor = ChatManagementEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, ICommandService),
    __param(6, IChatEntitlementService)
], ChatManagementEditor);
export { ChatManagementEditor };
class SectionItemDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId() { return 'sectionItem'; }
}
class SectionItemRenderer {
    constructor() {
        this.templateId = 'sectionItem';
    }
    renderTemplate(container) {
        container.classList.add('section-list-item');
        const label = DOM.append(container, $('.section-list-item-label'));
        return { label };
    }
    renderElement(element, index, templateData) {
        templateData.label.textContent = element.label;
    }
    disposeTemplate(templateData) {
    }
}
//# sourceMappingURL=chatManagementEditor.js.map