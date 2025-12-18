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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ToolDataSource } from '../languageModelToolsService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IChatTodoListService } from '../chatTodoListService.js';
import { localize } from '../../../../../nls.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { chatSessionResourceToId, LocalChatSessionUri } from '../chatUri.js';
export const TodoListToolWriteOnlySettingId = 'chat.todoListTool.writeOnly';
export const TodoListToolDescriptionFieldSettingId = 'chat.todoListTool.descriptionField';
export const ManageTodoListToolToolId = 'manage_todo_list';
export function createManageTodoListToolData(writeOnly, includeDescription = true) {
    const baseProperties = {
        todoList: {
            type: 'array',
            description: writeOnly
                ? 'Complete array of all todo items. Must include ALL items - both existing and new.'
                : 'Complete array of all todo items (required for write operation, ignored for read). Must include ALL items - both existing and new.',
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'number',
                        description: 'Unique identifier for the todo. Use sequential numbers starting from 1.'
                    },
                    title: {
                        type: 'string',
                        description: 'Concise action-oriented todo label (3-7 words). Displayed in UI.'
                    },
                    ...(includeDescription && {
                        description: {
                            type: 'string',
                            description: 'Detailed context, requirements, or implementation notes. Include file paths, specific methods, or acceptance criteria.'
                        }
                    }),
                    status: {
                        type: 'string',
                        enum: ['not-started', 'in-progress', 'completed'],
                        description: 'not-started: Not begun | in-progress: Currently working (max 1) | completed: Fully finished with no blockers'
                    },
                },
                required: includeDescription ? ['id', 'title', 'description', 'status'] : ['id', 'title', 'status']
            }
        }
    };
    // Only require the full todoList when operating in write-only mode.
    // In read/write mode, the write path validates todoList at runtime, so it's not schema-required.
    const requiredFields = writeOnly ? ['todoList'] : [];
    if (!writeOnly) {
        baseProperties.operation = {
            type: 'string',
            enum: ['write', 'read'],
            description: 'write: Replace entire todo list with new content. read: Retrieve current todo list. ALWAYS provide complete list when writing - partial updates not supported.'
        };
        requiredFields.unshift('operation');
    }
    return {
        id: ManageTodoListToolToolId,
        toolReferenceName: 'todo',
        legacyToolReferenceFullNames: ['todos'],
        canBeReferencedInPrompt: true,
        icon: ThemeIcon.fromId(Codicon.checklist.id),
        displayName: localize('tool.manageTodoList.displayName', 'Manage and track todo items for task planning'),
        userDescription: localize('tool.manageTodoList.userDescription', 'Manage and track todo items for task planning'),
        modelDescription: 'Manage a structured todo list to track progress and plan tasks throughout your coding session. Use this tool VERY frequently to ensure task visibility and proper planning.\n\nWhen to use this tool:\n- Complex multi-step work requiring planning and tracking\n- When user provides multiple tasks or requests (numbered/comma-separated)\n- After receiving new instructions that require multiple steps\n- BEFORE starting work on any todo (mark as in-progress)\n- IMMEDIATELY after completing each todo (mark completed individually)\n- When breaking down larger tasks into smaller actionable steps\n- To give users visibility into your progress and planning\n\nWhen NOT to use:\n- Single, trivial tasks that can be completed in one step\n- Purely conversational/informational requests\n- When just reading files or performing simple searches\n\nCRITICAL workflow:\n1. Plan tasks by writing todo list with specific, actionable items\n2. Mark ONE todo as in-progress before starting work\n3. Complete the work for that specific todo\n4. Mark that todo as completed IMMEDIATELY\n5. Move to next todo and repeat\n\nTodo states:\n- not-started: Todo not yet begun\n- in-progress: Currently working (limit ONE at a time)\n- completed: Finished successfully\n\nIMPORTANT: Mark todos completed as soon as they are done. Do not batch completions.',
        source: ToolDataSource.Internal,
        inputSchema: {
            type: 'object',
            properties: baseProperties,
            required: requiredFields
        }
    };
}
export const ManageTodoListToolData = createManageTodoListToolData(false);
let ManageTodoListTool = class ManageTodoListTool extends Disposable {
    constructor(writeOnly, includeDescription, chatTodoListService, logService, telemetryService) {
        super();
        this.writeOnly = writeOnly;
        this.includeDescription = includeDescription;
        this.chatTodoListService = chatTodoListService;
        this.logService = logService;
        this.telemetryService = telemetryService;
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const args = invocation.parameters;
        // For: #263001 Use default sessionId
        const DEFAULT_TODO_SESSION_ID = 'default';
        const chatSessionId = invocation.context?.sessionId ?? args.chatSessionId ?? DEFAULT_TODO_SESSION_ID;
        this.logService.debug(`ManageTodoListTool: Invoking with options ${JSON.stringify(args)}`);
        try {
            // Determine operation: in writeOnly mode, always write; otherwise use args.operation
            const operation = this.writeOnly ? 'write' : args.operation;
            if (!operation) {
                return {
                    content: [{
                            kind: 'text',
                            value: 'Error: operation parameter is required'
                        }]
                };
            }
            if (operation === 'read') {
                return this.handleReadOperation(LocalChatSessionUri.forSession(chatSessionId));
            }
            else if (operation === 'write') {
                return this.handleWriteOperation(args, LocalChatSessionUri.forSession(chatSessionId));
            }
            else {
                return {
                    content: [{
                            kind: 'text',
                            value: 'Error: Unknown operation'
                        }]
                };
            }
        }
        catch (error) {
            const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            return {
                content: [{
                        kind: 'text',
                        value: errorMessage
                    }]
            };
        }
    }
    async prepareToolInvocation(context, _token) {
        const args = context.parameters;
        // For: #263001 Use default sessionId
        const DEFAULT_TODO_SESSION_ID = 'default';
        const chatSessionId = context.chatSessionId ?? args.chatSessionId ?? DEFAULT_TODO_SESSION_ID;
        const currentTodoItems = this.chatTodoListService.getTodos(LocalChatSessionUri.forSession(chatSessionId));
        let message;
        const operation = this.writeOnly ? 'write' : args.operation;
        switch (operation) {
            case 'write': {
                if (args.todoList) {
                    message = this.generatePastTenseMessage(currentTodoItems, args.todoList);
                }
                break;
            }
            case 'read': {
                message = localize('todo.readOperation', "Read todo list");
                break;
            }
            default:
                break;
        }
        const items = args.todoList ?? currentTodoItems;
        const todoList = items.map(todo => ({
            id: todo.id.toString(),
            title: todo.title,
            description: todo.description || '',
            status: todo.status
        }));
        return {
            pastTenseMessage: new MarkdownString(message ?? localize('todo.updatedList', "Updated todo list")),
            toolSpecificData: {
                kind: 'todoList',
                sessionId: chatSessionId,
                todoList: todoList
            }
        };
    }
    generatePastTenseMessage(currentTodos, newTodos) {
        // If no current todos, this is creating new ones
        if (currentTodos.length === 0) {
            return newTodos.length === 1
                ? localize('todo.created.single', "Created 1 todo")
                : localize('todo.created.multiple', "Created {0} todos", newTodos.length);
        }
        // Create map for easier comparison
        const currentTodoMap = new Map(currentTodos.map(todo => [todo.id, todo]));
        // Check for newly started todos (marked as in-progress) - highest priority
        const startedTodos = newTodos.filter(newTodo => {
            const currentTodo = currentTodoMap.get(newTodo.id);
            return currentTodo && currentTodo.status !== 'in-progress' && newTodo.status === 'in-progress';
        });
        if (startedTodos.length > 0) {
            const startedTodo = startedTodos[0]; // Should only be one in-progress at a time
            const totalTodos = newTodos.length;
            const currentPosition = newTodos.findIndex(todo => todo.id === startedTodo.id) + 1;
            return localize('todo.starting', "Starting: *{0}* ({1}/{2})", startedTodo.title, currentPosition, totalTodos);
        }
        // Check for newly completed todos
        const completedTodos = newTodos.filter(newTodo => {
            const currentTodo = currentTodoMap.get(newTodo.id);
            return currentTodo && currentTodo.status !== 'completed' && newTodo.status === 'completed';
        });
        if (completedTodos.length > 0) {
            const completedTodo = completedTodos[0]; // Get the first completed todo for the message
            const totalTodos = newTodos.length;
            const currentPosition = newTodos.findIndex(todo => todo.id === completedTodo.id) + 1;
            return localize('todo.completed', "Completed: *{0}* ({1}/{2})", completedTodo.title, currentPosition, totalTodos);
        }
        // Check for new todos added
        const addedTodos = newTodos.filter(newTodo => !currentTodoMap.has(newTodo.id));
        if (addedTodos.length > 0) {
            return addedTodos.length === 1
                ? localize('todo.added.single', "Added 1 todo")
                : localize('todo.added.multiple', "Added {0} todos", addedTodos.length);
        }
        // Default message for other updates
        return localize('todo.updated', "Updated todo list");
    }
    handleRead(todoItems, sessionResource) {
        if (todoItems.length === 0) {
            return 'No todo list found.';
        }
        const markdownTaskList = this.formatTodoListAsMarkdownTaskList(todoItems);
        return `# Todo List\n\n${markdownTaskList}`;
    }
    handleReadOperation(chatSessionResource) {
        const todoItems = this.chatTodoListService.getTodos(chatSessionResource);
        const readResult = this.handleRead(todoItems, chatSessionResource);
        const statusCounts = this.calculateStatusCounts(todoItems);
        this.telemetryService.publicLog2('todoListToolInvoked', {
            operation: 'read',
            notStartedCount: statusCounts.notStartedCount,
            inProgressCount: statusCounts.inProgressCount,
            completedCount: statusCounts.completedCount,
            chatSessionId: chatSessionResourceToId(chatSessionResource)
        });
        return {
            content: [{
                    kind: 'text',
                    value: readResult
                }]
        };
    }
    handleWriteOperation(args, chatSessionResource) {
        if (!args.todoList) {
            return {
                content: [{
                        kind: 'text',
                        value: 'Error: todoList is required for write operation'
                    }]
            };
        }
        const todoList = args.todoList.map((parsedTodo) => ({
            id: parsedTodo.id,
            title: parsedTodo.title,
            description: parsedTodo.description || '',
            status: parsedTodo.status
        }));
        const existingTodos = this.chatTodoListService.getTodos(chatSessionResource);
        const changes = this.calculateTodoChanges(existingTodos, todoList);
        this.chatTodoListService.setTodos(chatSessionResource, todoList);
        const statusCounts = this.calculateStatusCounts(todoList);
        // Build warnings
        const warnings = [];
        if (todoList.length < 3) {
            warnings.push('Warning: Small todo list (<3 items). This task might not need a todo list.');
        }
        else if (todoList.length > 10) {
            warnings.push('Warning: Large todo list (>10 items). Consider keeping the list focused and actionable.');
        }
        if (changes > 3) {
            warnings.push('Warning: Did you mean to update so many todos at the same time? Consider working on them one by one.');
        }
        this.telemetryService.publicLog2('todoListToolInvoked', {
            operation: 'write',
            notStartedCount: statusCounts.notStartedCount,
            inProgressCount: statusCounts.inProgressCount,
            completedCount: statusCounts.completedCount,
            chatSessionId: chatSessionResourceToId(chatSessionResource)
        });
        return {
            content: [{
                    kind: 'text',
                    value: `Successfully wrote todo list${warnings.length ? '\n\n' + warnings.join('\n') : ''}`
                }],
            toolMetadata: {
                warnings: warnings
            }
        };
    }
    calculateStatusCounts(todos) {
        const notStartedCount = todos.filter(todo => todo.status === 'not-started').length;
        const inProgressCount = todos.filter(todo => todo.status === 'in-progress').length;
        const completedCount = todos.filter(todo => todo.status === 'completed').length;
        return { notStartedCount, inProgressCount, completedCount };
    }
    formatTodoListAsMarkdownTaskList(todoList) {
        if (todoList.length === 0) {
            return '';
        }
        return todoList.map(todo => {
            let checkbox;
            switch (todo.status) {
                case 'completed':
                    checkbox = '[x]';
                    break;
                case 'in-progress':
                    checkbox = '[-]';
                    break;
                case 'not-started':
                default:
                    checkbox = '[ ]';
                    break;
            }
            const lines = [`- ${checkbox} ${todo.title}`];
            if (this.includeDescription && todo.description && todo.description.trim()) {
                lines.push(`  - ${todo.description.trim()}`);
            }
            return lines.join('\n');
        }).join('\n');
    }
    calculateTodoChanges(oldList, newList) {
        // Assume arrays are equivalent in order; compare index-by-index
        let modified = 0;
        const minLen = Math.min(oldList.length, newList.length);
        for (let i = 0; i < minLen; i++) {
            const o = oldList[i];
            const n = newList[i];
            if (o.title !== n.title || (o.description ?? '') !== (n.description ?? '') || o.status !== n.status) {
                modified++;
            }
        }
        const added = Math.max(0, newList.length - oldList.length);
        const removed = Math.max(0, oldList.length - newList.length);
        const totalChanges = added + removed + modified;
        return totalChanges;
    }
};
ManageTodoListTool = __decorate([
    __param(2, IChatTodoListService),
    __param(3, ILogService),
    __param(4, ITelemetryService)
], ManageTodoListTool);
export { ManageTodoListTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVG9kb0xpc3RUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvbWFuYWdlVG9kb0xpc3RUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFLTixjQUFjLEVBR2QsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFhLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFN0UsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsNkJBQTZCLENBQUM7QUFDNUUsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsb0NBQW9DLENBQUM7QUFFMUYsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsa0JBQWtCLENBQUM7QUFFM0QsTUFBTSxVQUFVLDRCQUE0QixDQUFDLFNBQWtCLEVBQUUscUJBQThCLElBQUk7SUFDbEcsTUFBTSxjQUFjLEdBQVE7UUFD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