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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { isChatSession } from './common.js';
let ChatSessionTracker = class ChatSessionTracker extends Disposable {
    constructor(editorGroupsService, chatService, chatSessionsService) {
        super();
        this.editorGroupsService = editorGroupsService;
        this.chatService = chatService;
        this.chatSessionsService = chatSessionsService;
        this._onDidChangeEditors = this._register(new Emitter());
        this.groupDisposables = this._register(new DisposableMap());
        this.onDidChangeEditors = this._onDidChangeEditors.event;
        this.setupEditorTracking();
    }
    setupEditorTracking() {
        // Listen to all editor groups
        this.editorGroupsService.groups.forEach(group => {
            this.registerGroupListeners(group);
        });
        // Listen for new groups
        this._register(this.editorGroupsService.onDidAddGroup(group => {
            this.registerGroupListeners(group);
        }));
        // Listen for deleted groups
        this._register(this.editorGroupsService.onDidRemoveGroup(group => {
            this.groupDisposables.deleteAndDispose(group.id);
        }));
    }
    registerGroupListeners(group) {
        this.groupDisposables.set(group.id, group.onDidModelChange(e => {
            if (!isChatSession(this.chatSessionsService.getContentProviderSchemes(), e.editor)) {
                return;
            }
            const editor = e.editor;
            const sessionType = editor.getSessionType();
            this.chatSessionsService.notifySessionItemsChanged(sessionType);
            // Emit targeted event for this session type
            this._onDidChangeEditors.fire({ sessionType, kind: e.kind });
        }));
    }
    getLocalEditorsForSessionType(sessionType) {
        const localEditors = [];
        this.editorGroupsService.groups.forEach(group => {
            group.editors.forEach(editor => {
                if (editor instanceof ChatEditorInput && editor.getSessionType() === sessionType) {
                    localEditors.push(editor);
                }
            });
        });
        return localEditors;
    }
    async getHybridSessionsForProvider(provider) {
        if (provider.chatSessionType === localChatSessionType) {
            return []; // Local provider doesn't need hybrid sessions
        }
        const localEditors = this.getLocalEditorsForSessionType(provider.chatSessionType);
        const hybridSessions = [];
        localEditors.forEach((editor, index) => {
            const group = this.findGroupForEditor(editor);
            if (!group) {
                return;
            }
            if (editor.options.ignoreInView) {
                return;
            }
            let status = 1 /* ChatSessionStatus.Completed */;
            let timestamp;
            if (editor.sessionResource) {
                const model = this.chatService.getSession(editor.sessionResource);
                const modelStatus = model ? this.modelToStatus(model) : undefined;
                if (model && modelStatus) {
                    status = modelStatus;
                    const requests = model.getRequests();
                    if (requests.length > 0) {
                        timestamp = requests[requests.length - 1].timestamp;
                    }
                }
            }
            const hybridSession = {
                resource: editor.resource,
                label: editor.getName(),
                status: status,
                provider,
                timing: {
                    startTime: timestamp ?? Date.now()
                }
            };
            hybridSessions.push(hybridSession);
        });
        return hybridSessions;
    }
    findGroupForEditor(editor) {
        for (const group of this.editorGroupsService.groups) {
            if (group.editors.includes(editor)) {
                return group;
            }
        }
        return undefined;
    }
    modelToStatus(model) {
        if (model.requestInProgress.get()) {
            return 2 /* ChatSessionStatus.InProgress */;
        }
        const requests = model.getRequests();
        if (requests.length > 0) {
            const lastRequest = requests[requests.length - 1];
            if (lastRequest?.response) {
                if (lastRequest.response.isCanceled || lastRequest.response.result?.errorDetails) {
                    return 0 /* ChatSessionStatus.Failed */;
                }
                else if (lastRequest.response.isComplete) {
                    return 1 /* ChatSessionStatus.Completed */;
                }
                else {
                    return 2 /* ChatSessionStatus.InProgress */;
                }
            }
        }
        return undefined;
    }
};
ChatSessionTracker = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IChatService),
    __param(2, IChatSessionsService)
], ChatSessionTracker);
export { ChatSessionTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25UcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXNzaW9ucy9jaGF0U2Vzc2lvblRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHcEYsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQWlFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEssT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBK0IsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWxFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUtqRCxZQUN1QixtQkFBMEQsRUFDbEUsV0FBMEMsRUFDbEMsbUJBQTBEO1FBRWhGLEtBQUssRUFBRSxDQUFDO1FBSitCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDakQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDakIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQVBoRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF1RCxDQUFDLENBQUM7UUFDekcscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFB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