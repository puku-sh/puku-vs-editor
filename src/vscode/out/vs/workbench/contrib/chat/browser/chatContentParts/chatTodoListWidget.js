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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IChatTodoListService } from '../../common/chatTodoListService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { TodoListToolDescriptionFieldSettingId } from '../../common/tools/manageTodoListTool.js';
import { isEqual } from '../../../../../base/common/resources.js';
class TodoListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return TodoListRenderer.TEMPLATE_ID;
    }
}
class TodoListRenderer {
    static { this.TEMPLATE_ID = 'todoListRenderer'; }
    constructor(configurationService) {
        this.configurationService = configurationService;
        this.templateId = TodoListRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const todoElement = dom.append(container, dom.$('li.todo-item'));
        todoElement.setAttribute('role', 'listitem');
        const statusIcon = dom.append(todoElement, dom.$('.todo-status-icon.codicon'));
        statusIcon.setAttribute('aria-hidden', 'true');
        const todoContent = dom.append(todoElement, dom.$('.todo-content'));
        const iconLabel = templateDisposables.add(new IconLabel(todoContent, { supportIcons: false }));
        return { templateDisposables, todoElement, statusIcon, iconLabel };
    }
    renderElement(todo, index, templateData) {
        const { todoElement, statusIcon, iconLabel } = templateData;
        // Update status icon
        statusIcon.className = `todo-status-icon codicon ${this.getStatusIconClass(todo.status)}`;
        statusIcon.style.color = this.getStatusIconColor(todo.status);
        // Update title with tooltip if description exists and description field is enabled
        const includeDescription = this.configurationService.getValue(TodoListToolDescriptionFieldSettingId) !== false;
        const title = includeDescription && todo.description && todo.description.trim() ? todo.description : undefined;
        iconLabel.setLabel(todo.title, undefined, { title });
        // Update aria-label
        const statusText = this.getStatusText(todo.status);
        const ariaLabel = includeDescription && todo.description && todo.description.trim()
            ? localize('chat.todoList.itemWithDescription', '{0}, {1}, {2}', todo.title, statusText, todo.description)
            : localize('chat.todoList.item', '{0}, {1}', todo.title, statusText);
        todoElement.setAttribute('aria-label', ariaLabel);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    getStatusText(status) {
        switch (status) {
            case 'completed':
                return localize('chat.todoList.status.completed', 'completed');
            case 'in-progress':
                return localize('chat.todoList.status.inProgress', 'in progress');
            case 'not-started':
            default:
                return localize('chat.todoList.status.notStarted', 'not started');
        }
    }
    getStatusIconClass(status) {
        switch (status) {
            case 'completed':
                return 'codicon-pass';
            case 'in-progress':
                return 'codicon-record';
            case 'not-started':
            default:
                return 'codicon-circle-outline';
        }
    }
    getStatusIconColor(status) {
        switch (status) {
            case 'completed':
                return 'var(--vscode-charts-green)';
            case 'in-progress':
                return 'var(--vscode-charts-blue)';
            case 'not-started':
            default:
                return 'var(--vscode-foreground)';
        }
    }
}
let ChatTodoListWidget = class ChatTodoListWidget extends Disposable {
    constructor(chatTodoListService, configurationService, instantiationService, contextKeyService) {
        super();
        this.chatTodoListService = chatTodoListService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._isExpanded = false;
        this._userManuallyExpanded = false;
        this.domNode = this.createChatTodoWidget();
        // Listen to context key changes to update clear button state when request state changes
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(new Set([ChatContextKeys.requestInProgress.key]))) {
                this.updateClearButtonState();
            }
        }));
    }
    get height() {
        return this.domNode.style.display === 'none' ? 0 : this.domNode.offsetHeight;
    }
    hideWidget() {
        this.domNode.style.display = 'none';
        this._onDidChangeHeight.fire();
    }
    createChatTodoWidget() {
        const container = dom.$('.chat-todo-list-widget');
        container.style.display = 'none';
        const expandoContainer = dom.$('.todo-list-expand');
        this.expandoButton = this._register(new Button(expandoContainer, {
            supportIcons: true
        }));
        this.expandoButton.element.setAttribute('aria-expanded', String(this._isExpanded));
        this.expandoButton.element.setAttribute('aria-controls', 'todo-list-container');
        // Create title section to group icon and title
        const titleSection = dom.$('.todo-list-title-section');
        this.expandIcon = dom.$('.expand-icon.codicon');
        this.expandIcon.classList.add(this._isExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right');
        this.expandIcon.setAttribute('aria-hidden', 'true');
        this.titleElement = dom.$('.todo-list-title');
        this.titleElement.id = 'todo-list-title';
        this.titleElement.textContent = localize('chat.todoList.title', 'Todos');
        // Add clear button container to the expand element
        this.clearButtonContainer = dom.$('.todo-clear-button-container');
        this.createClearButton();
        titleSection.appendChild(this.expandIcon);
        titleSection.appendChild(this.titleElement);
        this.expandoButton.element.appendChild(titleSection);
        this.expandoButton.element.appendChild(this.clearButtonContainer);
        this.todoListContainer = dom.$('.todo-list-container');
        this.todoListContainer.style.display = this._isExpanded ? 'block' : 'none';
        this.todoListContainer.id = 'todo-list-container';
        this.todoListContainer.setAttribute('role', 'list');
        this.todoListContainer.setAttribute('aria-labelledby', 'todo-list-title');
        container.appendChild(expandoContainer);
        container.appendChild(this.todoListContainer);
        this._register(this.expandoButton.onDidClick(() => {
            this.toggleExpanded();
        }));
        return container;
    }
    createClearButton() {
        this.clearButton = new Button(this.clearButtonContainer, {
            supportIcons: true,
        });
        this.clearButton.element.tabIndex = 0;
        this.clearButton.icon = Codicon.clearAll;
        this._register(this.clearButton);
        this._register(this.clearButton.onDidClick(() => {
            this.clearAllTodos();
        }));
    }
    render(sessionResource) {
        if (!sessionResource) {
            this.hideWidget();
            return;
        }
        if (!isEqual(this._currentSessionResource, sessionResource)) {
            this._userManuallyExpanded = false;
            this._currentSessionResource = sessionResource;
            this.hideWidget();
        }
        this.updateTodoDisplay();
    }
    clear(sessionResource, force = false) {
        if (!sessionResource || this.domNode.style.display === 'none') {
            return;
        }
        const currentTodos = this.chatTodoListService.getTodos(sessionResource);
        const shouldClear = force || (currentTodos.length > 0 && !currentTodos.some(todo => todo.status !== 'completed'));
        if (shouldClear) {
            this.clearAllTodos();
        }
    }
    updateTodoDisplay() {
        if (!this._currentSessionResource) {
            return;
        }
        const todoList = this.chatTodoListService.getTodos(this._currentSessionResource);
        const shouldShow = todoList.length > 2;
        if (!shouldShow) {
            this.domNode.classList.remove('has-todos');
            return;
        }
        this.domNode.classList.add('has-todos');
        this.renderTodoList(todoList);
        this.domNode.style.display = 'block';
        this._onDidChangeHeight.fire();
    }
    renderTodoList(todoList) {
        this.updateTitleElement(this.titleElement, todoList);
        const allIncomplete = todoList.every(todo => todo.status === 'not-started');
        if (allIncomplete) {
            this._userManuallyExpanded = false;
        }
        // Create or update the WorkbenchList
        if (!this._todoList) {
            this._todoList = this._register(this.instantiationService.createInstance((WorkbenchList), 'ChatTodoListRenderer', this.todoListContainer, new TodoListDelegate(), [new TodoListRenderer(this.configurationService)], {
                alwaysConsumeMouseWheel: false,
                accessibilityProvider: {
                    getAriaLabel: (todo) => {
                        const statusText = this.getStatusText(todo.status);
                        const includeDescription = this.configurationService.getValue(TodoListToolDescriptionFieldSettingId) !== false;
                        return includeDescription && todo.description && todo.description.trim()
                            ? localize('chat.todoList.itemWithDescription', '{0}, {1}, {2}', todo.title, statusText, todo.description)
                            : localize('chat.todoList.item', '{0}, {1}', todo.title, statusText);
                    },
                    getWidgetAriaLabel: () => localize('chatTodoList', 'Chat Todo List')
                }
            }));
        }
        // Update list contents
        const maxItemsShown = 6;
        const itemsShown = Math.min(todoList.length, maxItemsShown);
        const height = itemsShown * 22;
        this._todoList.layout(height);
        this._todoList.getHTMLElement().style.height = `${height}px`;
        this._todoList.splice(0, this._todoList.length, todoList);
        const hasInProgressTask = todoList.some(todo => todo.status === 'in-progress');
        const hasCompletedTask = todoList.some(todo => todo.status === 'completed');
        // Update clear button state based on request progress
        this.updateClearButtonState();
        // Only auto-collapse if there are in-progress or completed tasks AND user hasn't manually expanded
        if ((hasInProgressTask || hasCompletedTask) && this._isExpanded && !this._userManuallyExpanded) {
            this._isExpanded = false;
            this.expandoButton.element.setAttribute('aria-expanded', 'false');
            this.todoListContainer.style.display = 'none';
            this.expandIcon.classList.remove('codicon-chevron-down');
            this.expandIcon.classList.add('codicon-chevron-right');
            this.updateTitleElement(this.titleElement, todoList);
            this._onDidChangeHeight.fire();
        }
    }
    toggleExpanded() {
        this._isExpanded = !this._isExpanded;
        this._userManuallyExpanded = true;
        this.expandIcon.classList.toggle('codicon-chevron-down', this._isExpanded);
        this.expandIcon.classList.toggle('codicon-chevron-right', !this._isExpanded);
        this.todoListContainer.style.display = this._isExpanded ? 'block' : 'none';
        if (this._currentSessionResource) {
            const todoList = this.chatTodoListService.getTodos(this._currentSessionResource);
            this.updateTitleElement(this.titleElement, todoList);
        }
        this._onDidChangeHeight.fire();
    }
    clearAllTodos() {
        if (!this._currentSessionResource) {
            return;
        }
        this.chatTodoListService.setTodos(this._currentSessionResource, []);
        this.hideWidget();
    }
    updateClearButtonState() {
        if (!this._currentSessionResource) {
            return;
        }
        const todoList = this.chatTodoListService.getTodos(this._currentSessionResource);
        const hasInProgressTask = todoList.some(todo => todo.status === 'in-progress');
        const isRequestInProgress = ChatContextKeys.requestInProgress.getValue(this.contextKeyService) ?? false;
        const shouldDisable = isRequestInProgress && hasInProgressTask;
        this.clearButton.enabled = !shouldDisable;
        // Update tooltip based on state
        if (shouldDisable) {
            this.clearButton.setTitle(localize('chat.todoList.clearButton.disabled', 'Cannot clear todos while a task is in progress'));
        }
        else {
            this.clearButton.setTitle(localize('chat.todoList.clearButton', 'Clear all todos'));
        }
    }
    updateTitleElement(titleElement, todoList) {
        titleElement.textContent = '';
        const completedCount = todoList.filter(todo => todo.status === 'completed').length;
        const totalCount = todoList.length;
        const inProgressTodos = todoList.filter(todo => todo.status === 'in-progress');
        const firstInProgressTodo = inProgressTodos.length > 0 ? inProgressTodos[0] : undefined;
        const notStartedTodos = todoList.filter(todo => todo.status === 'not-started');
        const firstNotStartedTodo = notStartedTodos.length > 0 ? notStartedTodos[0] : undefined;
        const currentTaskNumber = inProgressTodos.length > 0 ? completedCount + 1 : Math.max(1, completedCount);
        const expandButtonLabel = this._isExpanded
            ? localize('chat.todoList.collapseButton', 'Collapse Todos')
            : localize('chat.todoList.expandButton', 'Expand Todos');
        this.expandoButton.element.setAttribute('aria-label', expandButtonLabel);
        this.expandoButton.element.setAttribute('aria-expanded', this._isExpanded ? 'true' : 'false');
        if (this._isExpanded) {
            const titleText = dom.$('span');
            titleText.textContent = totalCount > 0 ?
                localize('chat.todoList.titleWithCount', 'Todos ({0}/{1})', currentTaskNumber, totalCount) :
                localize('chat.todoList.title', 'Todos');
            titleElement.appendChild(titleText);
        }
        else {
            // Show first in-progress todo, or if none, the first not-started todo
            const todoToShow = firstInProgressTodo || firstNotStartedTodo;
            if (todoToShow) {
                const icon = dom.$('.codicon');
                if (todoToShow === firstInProgressTodo) {
                    icon.classList.add('codicon-record');
                    icon.style.color = 'var(--vscode-charts-blue)';
                }
                else {
                    icon.classList.add('codicon-circle-outline');
                    icon.style.color = 'var(--vscode-foreground)';
                }
                icon.style.marginRight = '4px';
                icon.style.verticalAlign = 'middle';
                titleElement.appendChild(icon);
                const todoText = dom.$('span');
                todoText.textContent = localize('chat.todoList.currentTask', '{0} ({1}/{2})', todoToShow.title, currentTaskNumber, totalCount);
                todoText.style.verticalAlign = 'middle';
                todoText.style.overflow = 'hidden';
                todoText.style.textOverflow = 'ellipsis';
                todoText.style.whiteSpace = 'nowrap';
                todoText.style.minWidth = '0';
                titleElement.appendChild(todoText);
            }
            // Show "Done" when all tasks are completed
            else if (completedCount > 0 && completedCount === totalCount) {
                const doneText = dom.$('span');
                doneText.textContent = localize('chat.todoList.titleWithCount', 'Todos ({0}/{1})', totalCount, totalCount);
                doneText.style.verticalAlign = 'middle';
                titleElement.appendChild(doneText);
            }
        }
    }
    getStatusText(status) {
        switch (status) {
            case 'completed':
                return localize('chat.todoList.status.completed', 'completed');
            case 'in-progress':
                return localize('chat.todoList.status.inProgress', 'in progress');
            case 'not-started':
            default:
                return localize('chat.todoList.status.notStarted', 'not started');
        }
    }
};
ChatTodoListWidget = __decorate([
    __param(0, IChatTodoListService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], ChatTodoListWidget);
export { ChatTodoListWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvZG9MaXN0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFRvZG9MaXN0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQWEsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxN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