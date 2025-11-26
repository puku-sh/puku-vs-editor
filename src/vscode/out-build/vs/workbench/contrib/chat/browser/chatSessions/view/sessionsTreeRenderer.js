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
var SessionsRenderer_1;
import * as DOM from '../../../../../../base/browser/dom.js';
import { $, append } from '../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { IconLabel } from '../../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { InputBox } from '../../../../../../base/browser/ui/inputbox/inputBox.js';
import { timeout } from '../../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { createMatches } from '../../../../../../base/common/filters.js';
import { createSingleCallFunction } from '../../../../../../base/common/functional.js';
import { isMarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import Severity from '../../../../../../base/common/severity.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import * as nls from '../../../../../../nls.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IMarkdownRendererService } from '../../../../../../platform/markdown/browser/markdownRenderer.js';
import product from '../../../../../../platform/product/common/product.js';
import { defaultInputBoxStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { IEditorGroupsService } from '../../../../../services/editor/common/editorGroupsService.js';
import { IWorkbenchLayoutService } from '../../../../../services/layout/browser/layoutService.js';
import { getLocalHistoryDateFormatter } from '../../../../localHistory/browser/localHistory.js';
import { IChatService } from '../../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../../common/chatSessionsService.js';
import { LocalChatSessionUri } from '../../../common/chatUri.js';
import { ChatConfiguration } from '../../../common/constants.js';
import { IChatWidgetService } from '../../chat.js';
import { allowedChatMarkdownHtmlTags } from '../../chatContentMarkdownRenderer.js';
import '../../media/chatSessions.css';
import { extractTimestamp, getSessionItemContextOverlay, processSessionsWithTimeGrouping } from '../common.js';
export class ArchivedSessionItems {
    constructor(label) {
        this.label = label;
        this.items = new Map();
    }
    pushItem(item) {
        const key = item.resource.toString();
        this.items.set(key, item);
    }
    getItems() {
        return Array.from(this.items.values());
    }
    clear() {
        this.items.clear();
    }
}
export class GettingStartedDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return 'gettingStartedItem';
    }
}
export class GettingStartedRenderer {
    constructor(labels) {
        this.labels = labels;
        this.templateId = 'gettingStartedItem';
    }
    renderTemplate(container) {
        const resourceLabel = this.labels.create(container, { supportHighlights: true });
        return { resourceLabel };
    }
    renderElement(element, index, templateData) {
        templateData.resourceLabel.setResource({
            name: element.label,
            resource: undefined
        }, {
            icon: element.icon,
            hideIcon: false
        });
        templateData.resourceLabel.element.setAttribute('data-command', element.commandId);
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
    }
}
let SessionsRenderer = class SessionsRenderer extends Disposable {
    static { SessionsRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'session'; }
    constructor(viewLocation, contextViewService, configurationService, chatSessionsService, menuService, contextKeyService, hoverService, chatWidgetService, chatService, editorGroupsService, layoutService, markdownRendererService) {
        super();
        this.viewLocation = viewLocation;
        this.contextViewService = contextViewService;
        this.configurationService = configurationService;
        this.chatSessionsService = chatSessionsService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.editorGroupsService = editorGroupsService;
        this.layoutService = layoutService;
        this.markdownRendererService = markdownRendererService;
    }
    get templateId() {
        return SessionsRenderer_1.TEMPLATE_ID;
    }
    getHoverPosition() {
        const sideBarPosition = this.layoutService.getSideBarPosition();
        switch (this.viewLocation) {
            case 0 /* ViewContainerLocation.Sidebar */:
                return sideBarPosition === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
            case 2 /* ViewContainerLocation.AuxiliaryBar */:
                return sideBarPosition === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
            default:
                return 1 /* HoverPosition.RIGHT */;
        }
    }
    renderTemplate(container) {
        const element = append(container, $('.chat-session-item'));
        // Create a container that holds the label, timestamp, and actions
        const contentContainer = append(element, $('.session-content'));
        // Custom icon element rendered separately from label text
        const customIcon = append(contentContainer, $('.chat-session-custom-icon'));
        const iconLabel = new IconLabel(contentContainer, { supportHighlights: true, supportIcons: true });
        const descriptionRow = append(element, $('.description-row'));
        const descriptionLabel = append(descriptionRow, $('span.description'));
        const statisticsLabel = append(descriptionRow, $('span.statistics'));
        // Create timestamp container and element
        const timestampContainer = append(contentContainer, $('.timestamp-container'));
        const timestamp = append(timestampContainer, $('.timestamp'));
        const actionsContainer = append(contentContainer, $('.actions'));
        const actionBar = new ActionBar(actionsContainer);
        const elementDisposable = new DisposableStore();
        return {
            container: element,
            iconLabel,
            customIcon,
            actionBar,
            elementDisposable,
            timestamp,
            descriptionRow,
            descriptionLabel,
            statisticsLabel,
        };
    }
    statusToIcon(status) {
        switch (status) {
            case 2 /* ChatSessionStatus.InProgress */:
                return ThemeIcon.modify(Codicon.loading, 'spin');
            case 1 /* ChatSessionStatus.Completed */:
                return Codicon.pass;
            case 0 /* ChatSessionStatus.Failed */:
                return Codicon.error;
            default:
                return Codicon.circleOutline;
        }
    }
    renderArchivedNode(node, templateData) {
        templateData.customIcon.className = '';
        templateData.descriptionRow.style.display = 'none';
        templateData.timestamp.parentElement.style.display = 'none';
        const childCount = node.getItems().length;
        templateData.iconLabel.setLabel(node.label, undefined, {
            title: childCount === 1 ? nls.localize(5984, null) : nls.localize(5985, null, childCount)
        });
    }
    renderElement(element, index, templateData) {
        if (element.element instanceof ArchivedSessionItems) {
            this.renderArchivedNode(element.element, templateData);
            return;
        }
        const session = element.element;
        // Add CSS class for local sessions
        let editableData;
        if (LocalChatSessionUri.parseLocalSessionId(session.resource)) {
            templateData.container.classList.add('local-session');
            editableData = this.chatSessionsService.getEditableData(session.resource);
        }
        else {
            templateData.container.classList.remove('local-session');
        }
        // Check if this session is being edited using the actual session ID
        if (editableData) {
            // Render input box for editing
            templateData.actionBar.clear();
            const editDisposable = this.renderInputBox(templateData.container, session, editableData);
            templateData.elementDisposable.add(editDisposable);
            return;
        }
        // Normal rendering - clear the action bar in case it was used for editing
        templateData.actionBar.clear();
        // Handle different icon types
        let iconTheme;
        if (!session.iconPath) {
            iconTheme = this.statusToIcon(session.status);
        }
        else {
            iconTheme = session.iconPath;
        }
        const renderDescriptionOnSecondRow = this.configurationService.getValue(ChatConfiguration.ShowAgentSessionsViewDescription) && session.provider.chatSessionType !== localChatSessionType;
        if (renderDescriptionOnSecondRow && session.description) {
            templateData.container.classList.toggle('multiline', true);
            templateData.descriptionRow.style.display = 'flex';
            if (typeof session.description === 'string') {
                templateData.descriptionLabel.textContent = session.description;
            }
            else {
                templateData.elementDisposable.add(this.markdownRendererService.render(session.description, {
                    sanitizerConfig: {
                        replaceWithPlaintext: true,
                        allowedTags: {
                            override: allowedChatMarkdownHtmlTags,
                        },
                        allowedLinkSchemes: { augment: [product.urlProtocol] }
                    },
                }, templateData.descriptionLabel));
                templateData.elementDisposable.add(DOM.addDisposableListener(templateData.descriptionLabel, 'mousedown', e => e.stopPropagation()));
                templateData.elementDisposable.add(DOM.addDisposableListener(templateData.descriptionLabel, 'click', e => e.stopPropagation()));
                templateData.elementDisposable.add(DOM.addDisposableListener(templateData.descriptionLabel, 'auxclick', e => e.stopPropagation()));
            }
            DOM.clearNode(templateData.statisticsLabel);
            const insertionNode = append(templateData.statisticsLabel, $('span.insertions'));
            insertionNode.textContent = session.statistics ? `+${session.statistics.insertions}` : '';
            const deletionNode = append(templateData.statisticsLabel, $('span.deletions'));
            deletionNode.textContent = session.statistics ? `-${session.statistics.deletions}` : '';
        }
        else {
            templateData.container.classList.toggle('multiline', false);
        }
        // Prepare tooltip content
        const tooltipContent = 'tooltip' in session && session.tooltip ?
            (typeof session.tooltip === 'string' ? session.tooltip :
                isMarkdownString(session.tooltip) ? {
                    markdown: session.tooltip,
                    markdownNotSupportedFallback: session.tooltip.value
                } : undefined) :
            undefined;
        templateData.customIcon.className = iconTheme ? `chat-session-custom-icon ${ThemeIcon.asClassName(iconTheme)}` : '';
        // Set the icon label
        templateData.iconLabel.setLabel(session.label, !renderDescriptionOnSecondRow && typeof session.description === 'string' ? session.description : undefined, {
            title: !renderDescriptionOnSecondRow || !session.description ? tooltipContent : undefined,
            matches: createMatches(element.filterData)
        });
        // For two-row items, set tooltip on the container instead
        if (renderDescriptionOnSecondRow && session.description && tooltipContent) {
            if (typeof tooltipContent === 'string') {
                templateData.elementDisposable.add(this.hoverService.setupDelayedHover(templateData.container, () => ({
                    content: tooltipContent,
                    style: 1 /* HoverStyle.Pointer */,
                    position: { hoverPosition: this.getHoverPosition() }
                }), { groupId: 'chat.sessions' }));
            }
            else if (tooltipContent && typeof tooltipContent === 'object' && 'markdown' in tooltipContent) {
                templateData.elementDisposable.add(this.hoverService.setupDelayedHover(templateData.container, () => ({
                    content: tooltipContent.markdown,
                    style: 1 /* HoverStyle.Pointer */,
                    position: { hoverPosition: this.getHoverPosition() }
                }), { groupId: 'chat.sessions' }));
            }
        }
        // Handle timestamp display and grouping
        const hasTimestamp = session.timing?.startTime !== undefined;
        if (hasTimestamp) {
            templateData.timestamp.textContent = session.relativeTime ?? '';
            templateData.timestamp.ariaLabel = session.relativeTimeFullWord ?? '';
            templateData.timestamp.parentElement.classList.toggle('timestamp-duplicate', session.hideRelativeTime === true);
            templateData.timestamp.parentElement.style.display = '';
            // Add tooltip showing full date/time when hovering over the timestamp
            if (session.timing?.startTime) {
                const fullDateTime = getLocalHistoryDateFormatter().format(session.timing.startTime);
                templateData.elementDisposable.add(this.hoverService.setupDelayedHover(templateData.timestamp, () => ({
                    content: nls.localize(5986, null, fullDateTime),
                    style: 1 /* HoverStyle.Pointer */,
                    position: { hoverPosition: this.getHoverPosition() }
                }), { groupId: 'chat.sessions' }));
            }
        }
        else {
            // Hide timestamp container if no timestamp available
            templateData.timestamp.parentElement.style.display = 'none';
        }
        // Create context overlay for this specific session item
        const contextOverlay = getSessionItemContextOverlay(session, session.provider, this.chatWidgetService, this.chatService, this.editorGroupsService);
        const contextKeyService = this.contextKeyService.createOverlay(contextOverlay);
        // Create menu for this session item
        const menu = templateData.elementDisposable.add(this.menuService.createMenu(MenuId.ChatSessionsMenu, contextKeyService));
        // Setup action bar with contributed actions
        const setupActionBar = () => {
            templateData.actionBar.clear();
            // Create marshalled context for command execution
            const marshalledSession = {
                session: session,
                $mid: 25 /* MarshalledId.ChatSessionContext */
            };
            const actions = menu.getActions({ arg: marshalledSession, shouldForwardArgs: true });
            const { primary } = getActionBarActions(actions, 'inline');
            templateData.actionBar.push(primary, { icon: true, label: false });
            // Set context for the action bar
            templateData.actionBar.context = session;
        };
        // Setup initial action bar and listen for menu changes
        templateData.elementDisposable.add(menu.onDidChange(() => setupActionBar()));
        setupActionBar();
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposable.clear();
        templateData.actionBar.clear();
    }
    renderInputBox(container, session, editableData) {
        // Hide the existing resource label element and session content
        // eslint-disable-next-line no-restricted-syntax
        const existingResourceLabelElement = container.querySelector('.monaco-icon-label');
        if (existingResourceLabelElement) {
            existingResourceLabelElement.style.display = 'none';
        }
        // Hide the session content container to avoid layout conflicts
        // eslint-disable-next-line no-restricted-syntax
        const sessionContentElement = container.querySelector('.session-content');
        if (sessionContentElement) {
            sessionContentElement.style.display = 'none';
        }
        // Create a simple container that mimics the file explorer's structure
        const editContainer = DOM.append(container, DOM.$('.explorer-item.explorer-item-edited'));
        // Add the icon
        const iconElement = DOM.append(editContainer, DOM.$('.codicon'));
        if (session.iconPath && ThemeIcon.isThemeIcon(session.iconPath)) {
            iconElement.classList.add(`codicon-${session.iconPath.id}`);
        }
        else {
            iconElement.classList.add('codicon-file'); // Default file icon
        }
        // Create the input box directly
        const inputBox = new InputBox(editContainer, this.contextViewService, {
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message || message.severity !== Severity.Error) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: 3 /* MessageType.ERROR */
                    };
                }
            },
            ariaLabel: nls.localize(5987, null),
            inputBoxStyles: defaultInputBoxStyles,
        });
        inputBox.value = session.label;
        inputBox.focus();
        inputBox.select({ start: 0, end: session.label.length });
        const done = createSingleCallFunction((success, finishEditing) => {
            const value = inputBox.value;
            // Clean up the edit container
            editContainer.style.display = 'none';
            editContainer.remove();
            // Restore the original resource label
            if (existingResourceLabelElement) {
                existingResourceLabelElement.style.display = '';
            }
            // Restore the session content container
            // eslint-disable-next-line no-restricted-syntax
            const sessionContentElement = container.querySelector('.session-content');
            if (sessionContentElement) {
                sessionContentElement.style.display = '';
            }
            if (finishEditing) {
                editableData.onFinish(value, success);
            }
        });
        const showInputBoxNotification = () => {
            if (inputBox.isInputValid()) {
                const message = editableData.validationMessage(inputBox.value);
                if (message) {
                    inputBox.showMessage({
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Info ? 1 /* MessageType.INFO */ : message.severity === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */
                    });
                }
                else {
                    inputBox.hideMessage();
                }
            }
        };
        showInputBoxNotification();
        const disposables = [
            inputBox,
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
                if (e.equals(3 /* KeyCode.Enter */)) {
                    if (!inputBox.validate()) {
                        done(true, true);
                    }
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    done(false, true);
                }
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_UP, () => {
                showInputBoxNotification();
            }),
            DOM.addDisposableListener(inputBox.inputElement, DOM.EventType.BLUR, async () => {
                while (true) {
                    await timeout(0);
                    const ownerDocument = inputBox.inputElement.ownerDocument;
                    if (!ownerDocument.hasFocus()) {
                        break;
                    }
                    if (DOM.isActiveElement(inputBox.inputElement)) {
                        return;
                    }
                    else if (DOM.isHTMLElement(ownerDocument.activeElement) && DOM.hasParentWithClass(ownerDocument.activeElement, 'context-view')) {
                        // Do nothing - context menu is open
                    }
                    else {
                        break;
                    }
                }
                done(inputBox.isInputValid(), true);
            })
        ];
        const disposableStore = new DisposableStore();
        disposables.forEach(d => disposableStore.add(d));
        disposableStore.add(toDisposable(() => done(false, false)));
        return disposableStore;
    }
    disposeTemplate(templateData) {
        templateData.elementDisposable.dispose();
        templateData.iconLabel.dispose();
        templateData.actionBar.dispose();
    }
};
SessionsRenderer = SessionsRenderer_1 = __decorate([
    __param(1, IContextViewService),
    __param(2, IConfigurationService),
    __param(3, IChatSessionsService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, IHoverService),
    __param(7, IChatWidgetService),
    __param(8, IChatService),
    __param(9, IEditorGroupsService),
    __param(10, IWorkbenchLayoutService),
    __param(11, IMarkdownRendererService)
], SessionsRenderer);
export { SessionsRenderer };
// Chat sessions item data source for the tree
export class SessionsDataSource {
    constructor(provider, sessionTracker) {
        this.provider = provider;
        this.sessionTracker = sessionTracker;
        // For now call it History until we support archive on all providers
        this.archivedItems = new ArchivedSessionItems(nls.localize(5988, null));
    }
    hasChildren(element) {
        if (element === this.provider) {
            // Root provider always has children
            return true;
        }
        if (element instanceof ArchivedSessionItems) {
            return element.getItems().length > 0;
        }
        return false;
    }
    async getChildren(element) {
        if (element === this.provider) {
            try {
                const items = await this.provider.provideChatSessionItems(CancellationToken.None);
                // Clear archived items from previous calls
                this.archivedItems.clear();
                let ungroupedItems = items.map(item => {
                    const itemWithProvider = { ...item, provider: this.provider, timing: { startTime: extractTimestamp(item) ?? 0 } };
                    if (itemWithProvider.archived) {
                        this.archivedItems.pushItem(itemWithProvider);
                        return;
                    }
                    return itemWithProvider;
                }).filter(item => item !== undefined);
                // Add hybrid local editor sessions for this provider
                if (this.provider.chatSessionType !== localChatSessionType) {
                    const hybridSessions = await this.sessionTracker.getHybridSessionsForProvider(this.provider);
                    const existingSessions = new ResourceSet();
                    // Iterate only over the ungrouped items, the only group we support for now is history
                    ungroupedItems.forEach(s => existingSessions.add(s.resource));
                    hybridSessions.forEach(session => {
                        if (!existingSessions.has(session.resource)) {
                            ungroupedItems.push(session);
                            existingSessions.add(session.resource);
                        }
                    });
                    ungroupedItems = processSessionsWithTimeGrouping(ungroupedItems);
                }
                const result = [];
                result.push(...ungroupedItems);
                if (this.archivedItems.getItems().length > 0) {
                    result.push(this.archivedItems);
                }
                return result;
            }
            catch (error) {
                return [];
            }
        }
        if (element instanceof ArchivedSessionItems) {
            return processSessionsWithTimeGrouping(element.getItems());
        }
        // Individual session items don't have children
        return [];
    }
}
export class SessionsDelegate {
    static { this.ITEM_HEIGHT = 22; }
    static { this.ITEM_HEIGHT_WITH_DESCRIPTION = 44; } // Slightly smaller for cleaner look
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getHeight(element) {
        // Return consistent height for all items (single-line layout)
        if (element.description && this.configurationService.getValue(ChatConfiguration.ShowAgentSessionsViewDescription) && element.provider.chatSessionType !== localChatSessionType) {
            return SessionsDelegate.ITEM_HEIGHT_WITH_DESCRIPTION;
        }
        else {
            return SessionsDelegate.ITEM_HEIGHT;
        }
    }
    getTemplateId(element) {
        return SessionsRenderer.TEMPLATE_ID;
    }
}
//# sourceMappingURL=sessionsTreeRenderer.js.map