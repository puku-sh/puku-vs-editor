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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { chatSessionResourceToId } from './chatUri.js';
export const IChatTodoListService = createDecorator('chatTodoListService');
let ChatTodoListStorage = class ChatTodoListStorage {
    constructor(storageService) {
        this.memento = new Memento('chat-todo-list', storageService);
    }
    getSessionData(sessionResource) {
        const storage = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        return storage[this.toKey(sessionResource)] || [];
    }
    setSessionData(sessionResource, todoList) {
        const storage = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storage[this.toKey(sessionResource)] = todoList;
        this.memento.saveMemento();
    }
    getTodoList(sessionResource) {
        return this.getSessionData(sessionResource);
    }
    setTodoList(sessionResource, todoList) {
        this.setSessionData(sessionResource, todoList);
    }
    toKey(sessionResource) {
        return chatSessionResourceToId(sessionResource);
    }
};
ChatTodoListStorage = __decorate([
    __param(0, IStorageService)
], ChatTodoListStorage);
export { ChatTodoListStorage };
let ChatTodoListService = class ChatTodoListService extends Disposable {
    constructor(storageService) {
        super();
        this._onDidUpdateTodos = this._register(new Emitter());
        this.onDidUpdateTodos = this._onDidUpdateTodos.event;
        this.todoListStorage = new ChatTodoListStorage(storageService);
    }
    getTodos(sessionResource) {
        return this.todoListStorage.getTodoList(sessionResource);
    }
    setTodos(sessionResource, todos) {
        this.todoListStorage.setTodoList(sessionResource, todos);
        this._onDidUpdateTodos.fire(sessionResource);
    }
};
ChatTodoListService = __decorate([
    __param(0, IStorageService)
], ChatTodoListService);
export { ChatTodoListService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvZG9MaXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRUb2RvTGlzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDckQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBY3ZELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQVMxRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUcvQixZQUE2QixjQUErQjtRQUMzRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFTyxjQUFjLENBQUMsZUFBb0I7UUFDMUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLCtEQUErQyxDQUFDO1FBQ3ZGLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkQsQ0FBQztJQUVPLGNBQWMsQ0FBQyxlQUFvQixFQUFFLFFBQXFCO1FBQ2pFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSwrREFBK0MsQ0FBQztRQUN2RixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQztRQUNoRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxXQUFXLENBQUMsZUFBb0I7UUFDL0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxXQUFXLENBQUMsZUFBb0IsRUFBRSxRQUFxQjtRQUN0RCxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQW9CO1FBQ2pDLE9BQU8sdUJBQXVCLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNELENBQUE7QUE3QlksbUJBQW1CO0lBR2xCLFdBQUEsZUFBZSxDQUFBO0dBSGhCLG1CQUFtQixDQTZCL0I7O0FBRU0sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBUWxELFlBQTZCLGNBQStCO1FBQzNELEtBQUssRUFBRSxDQUFDO1FBTlEsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBTyxDQUFDLENBQUM7UUFDL0QscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztRQU14RCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksbUJBQW1CLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELFFBQVEsQ0FBQyxlQUFvQjtRQUM1QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxRQUFRLENBQUMsZUFBb0IsRUFBRSxLQUFrQjtRQUNoRCxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxtQkFBbUI7SUFRbEIsV0FBQSxlQUFlLENBQUE7R0FSaEIsbUJBQW1CLENBcUIvQiJ9