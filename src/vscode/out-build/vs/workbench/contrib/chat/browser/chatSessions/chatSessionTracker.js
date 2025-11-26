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
//# sourceMappingURL=chatSessionTracker.js.map