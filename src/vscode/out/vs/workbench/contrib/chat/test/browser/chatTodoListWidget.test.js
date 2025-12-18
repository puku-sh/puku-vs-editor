/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-syntax */
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatTodoListWidget } from '../../browser/chatContentParts/chatTodoListWidget.js';
import { IChatTodoListService } from '../../common/chatTodoListService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { URI } from '../../../../../base/common/uri.js';
const testSessionUri = URI.parse('chat-session://test/session1');
suite('ChatTodoListWidget Accessibility', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let widget;
    const sampleTodos = [
        { id: 1, title: 'First task', status: 'not-started' },
        { id: 2, title: 'Second task', status: 'in-progress', description: 'This is a task description' },
        { id: 3, title: 'Third task', status: 'completed' }
    ];
    setup(() => {
        // Mock the todo list service
        const mockTodoListService = {
            _serviceBrand: undefined,
            onDidUpdateTodos: Event.None,
            getTodos: (sessionResource) => sampleTodos,
            setTodos: (sessionResource, todos) => { }
        };
        // Mock the configuration service
        const mockConfigurationService = new TestConfigurationService({ 'chat.todoListTool.descriptionField': true });
        const instantiationService = workbenchInstantiationService(undefined, store);
        instantiationService.stub(IChatTodoListService, mockTodoListService);
        instantiationService.stub(IConfigurationService, mockConfigurationService);
        widget = store.add(instantiationService.createInstance(ChatTodoListWidget));
        mainWindow.document.body.appendChild(widget.domNode);
    });
    teardown(() => {
        if (widget.domNode.parentNode) {
            widget.domNode.parentNode.removeChild(widget.domNode);
        }
    });
    test('creates proper semantic list structure', () => {
        widget.render(testSessionUri);
        const todoListContainer = widget.domNode.querySelector('.todo-list-container');
        assert.ok(todoListContainer, 'Should have todo list container');
        assert.strictEqual(todoListContainer?.getAttribute('aria-labelledby'), 'todo-list-title');
        assert.strictEqual(todoListContainer?.getAttribute('role'), 'list');
        const titleElement = widget.domNode.querySelector('#todo-list-title');
        assert.ok(titleElement, 'Should have title element with ID todo-list-title');
        // When collapsed, title shows progress and current task without "Todos" prefix
        assert.ok(titleElement?.textContent, 'Title should have content');
        // The todo list container itself acts as the list (no nested ul element)
        const todoItems = todoListContainer?.querySelectorAll('li.todo-item');
        assert.ok(todoItems && todoItems.length > 0, 'Should have todo items in the list container');
    });
    test('todo items have proper accessibility attributes', () => {
        widget.render(testSessionUri);
        const todoItems = widget.domNode.querySelectorAll('.todo-item');
        assert.strictEqual(todoItems.length, 3, 'Should have 3 todo items');
        // Check first item (not-started)
        const firstItem = todoItems[0];
        assert.strictEqual(firstItem.getAttribute('role'), 'listitem');
        assert.ok(firstItem.getAttribute('aria-label')?.includes('First task'));
        assert.ok(firstItem.getAttribute('aria-label')?.includes('not started'));
        // Check second item (in-progress with description)
        const secondItem = todoItems[1];
        assert.ok(secondItem.getAttribute('aria-label')?.includes('Second task'));
        assert.ok(secondItem.getAttribute('aria-label')?.includes('in progress'));
        assert.ok(secondItem.getAttribute('aria-label')?.includes('This is a task description'));
        // Check third item (completed)
        const thirdItem = todoItems[2];
        assert.ok(thirdItem.getAttribute('aria-label')?.includes('Third task'));
        assert.ok(thirdItem.getAttribute('aria-label')?.includes('completed'));
    });
    test('status icons are hidden from screen readers', () => {
        widget.render(testSessionUri);
        const statusIcons = widget.domNode.querySelectorAll('.todo-status-icon');
        statusIcons.forEach(icon => {
            assert.strictEqual(icon.getAttribute('aria-hidden'), 'true', 'Status icons should be hidden from screen readers');
        });
    });
    test('expand button has proper accessibility attributes', () => {
        widget.render(testSessionUri);
        // The expandoButton is now a Monaco Button, so we need to check its element
        const expandoContainer = widget.domNode.querySelector('.todo-list-expand');
        assert.ok(expandoContainer, 'Should have expando container');
        const expandoButton = expandoContainer?.querySelector('.monaco-button');
        assert.ok(expandoButton, 'Should have Monaco button');
        assert.strictEqual(expandoButton?.getAttribute('aria-expanded'), 'false'); // Should be collapsed due to in-progress task
        assert.strictEqual(expandoButton?.getAttribute('aria-controls'), 'todo-list-container');
        // The title element should have progress information
        const titleElement = expandoButton?.querySelector('.todo-list-title');
        assert.ok(titleElement, 'Should have title element');
        const titleText = titleElement?.textContent;
        // When collapsed, title shows progress and current task: " (2/3) - Second task"
        // Progress is 2/3 because: 1 completed + 1 in-progress (current) = task 2 of 3
        assert.ok(titleText?.includes('(2/3)'), `Title should show progress format, but got: "${titleText}"`);
        assert.ok(titleText?.includes('Second task'), `Title should show current task when collapsed, but got: "${titleText}"`);
    });
    test('todo items have complete aria-label with status information', () => {
        widget.render(testSessionUri);
        const todoItems = widget.domNode.querySelectorAll('.todo-item');
        assert.strictEqual(todoItems.length, 3, 'Should have 3 todo items');
        // Check first item (not-started) - aria-label should include title and status
        const firstItem = todoItems[0];
        const firstAriaLabel = firstItem.getAttribute('aria-label');
        assert.ok(firstAriaLabel?.includes('First task'), 'First item aria-label should include title');
        assert.ok(firstAriaLabel?.includes('not started'), 'First item aria-label should include status');
        // Check second item (in-progress with description) - aria-label should include title, status, and description
        const secondItem = todoItems[1];
        const secondAriaLabel = secondItem.getAttribute('aria-label');
        assert.ok(secondAriaLabel?.includes('Second task'), 'Second item aria-label should include title');
        assert.ok(secondAriaLabel?.includes('in progress'), 'Second item aria-label should include status');
        assert.ok(secondAriaLabel?.includes('This is a task description'), 'Second item aria-label should include description');
        // Check third item (completed) - aria-label should include title and status
        const thirdItem = todoItems[2];
        const thirdAriaLabel = thirdItem.getAttribute('aria-label');
        assert.ok(thirdAriaLabel?.includes('Third task'), 'Third item aria-label should include title');
        assert.ok(thirdAriaLabel?.includes('completed'), 'Third item aria-label should include status');
    });
    test('widget displays properly when no todos exist', () => {
        // Create a new mock service with empty todos
        const emptyTodoListService = {
            _serviceBrand: undefined,
            onDidUpdateTodos: Event.None,
            getTodos: (sessionResource) => [],
            setTodos: (sessionResource, todos) => { }
        };
        const emptyConfigurationService = new TestConfigurationService({ 'chat.todoListTool.descriptionField': true });
        const instantiationService = workbenchInstantiationService(undefined, store);
        instantiationService.stub(IChatTodoListService, emptyTodoListService);
        instantiationService.stub(IConfigurationService, emptyConfigurationService);
        const emptyWidget = store.add(instantiationService.createInstance(ChatTodoListWidget));
        mainWindow.document.body.appendChild(emptyWidget.domNode);
        emptyWidget.render(testSessionUri);
        // Widget should be hidden when no todos
        assert.strictEqual(emptyWidget.domNode.style.display, 'none', 'Widget should be hidden when no todos');
    });
    test('clear button has proper accessibility', () => {
        widget.render(testSessionUri);
        const clearButton = widget.domNode.querySelector('.todo-clear-button-container .monaco-button');
        assert.ok(clearButton, 'Should have clear button');
        assert.strictEqual(clearButton?.getAttribute('tabindex'), '0', 'Clear button should be focusable');
    });
    test('title element displays progress correctly and is accessible', () => {
        widget.render(testSessionUri);
        const titleElement = widget.domNode.querySelector('#todo-list-title');
        assert.ok(titleElement, 'Should have title element with ID');
        // Title should show progress format: " (2/3)" since one todo is completed and one is in-progress
        // When collapsed, it also shows the current task: " (2/3) - Second task"
        // Progress is 2/3 because: 1 completed + 1 in-progress (current) = task 2 of 3
        const titleText = titleElement?.textContent;
        assert.ok(titleText?.includes('(2/3)'), `Title should show progress format, but got: "${titleText}"`);
        assert.ok(titleText?.includes('Second task'), `Title should show current task when collapsed, but got: "${titleText}"`);
        // Verify aria-labelledby connection works
        const todoListContainer = widget.domNode.querySelector('.todo-list-container');
        assert.strictEqual(todoListContainer?.getAttribute('aria-labelledby'), 'todo-list-title');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvZG9MaXN0V2lkZ2V0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9jaGF0VG9kb0xpc3RXaWRnZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyx5Q0FBeUM7QUFFekMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQWEsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUVqRSxLQUFLLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO0lBQzlDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxNQUEwQixDQUFDO0lBRS9CLE1BQU0sV0FBVyxHQUFnQjtRQUNoQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FB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