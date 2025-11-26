var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LocalChatSessionsProvider_1;
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatWidgetService, isIChatViewViewContext } from '../chat.js';
let LocalChatSessionsProvider = class LocalChatSessionsProvider extends Disposable {
    static { LocalChatSessionsProvider_1 = this; }
    static { this.ID = 'workbench.contrib.localChatSessionsProvider'; }
    static { this.CHAT_WIDGET_VIEW_ID = 'workbench.panel.chat.view.copilot'; }
    get onDidChangeChatSessionItems() { return this._onDidChangeChatSessionItems.event; }
    constructor(chatWidgetService, chatService, chatSessionsService) {
        super();
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.chatSessionsService = chatSessionsService;
        this.chatSessionType = localChatSessionType;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeChatSessionItems = this._register(new Emitter());
        this._register(this.chatSessionsService.registerChatSessionItemProvider(this));
        this.registerWidgetListeners();
        this._register(this.chatService.onDidDisposeSession(() => {
            this._onDidChange.fire();
        }));
        // Listen for global session items changes for our session type
        this._register(this.chatSessionsService.onDidChangeSessionItems((sessionType) => {
            if (sessionType === this.chatSessionType) {
                this._onDidChange.fire();
            }
        }));
    }
    registerWidgetListeners() {
        // Listen for new chat widgets being added/removed
        this._register(this.chatWidgetService.onDidAddWidget(widget => {
            // Only fire for chat view instance
            if (widget.location === ChatAgentLocation.Chat &&
                isIChatViewViewContext(widget.viewContext) &&
                widget.viewContext.viewId === LocalChatSessionsProvider_1.CHAT_WIDGET_VIEW_ID) {
                this._onDidChange.fire();
                this._registerWidgetModelListeners(widget);
            }
        }));
        // Check for existing chat widgets and register listeners
        const existingWidgets = this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Chat)
            .filter(widget => isIChatViewViewContext(widget.viewContext) && widget.viewContext.viewId === LocalChatSessionsProvider_1.CHAT_WIDGET_VIEW_ID);
        existingWidgets.forEach(widget => {
            this._registerWidgetModelListeners(widget);
        });
    }
    _registerWidgetModelListeners(widget) {
        const register = () => {
            this.registerModelTitleListener(widget);
            if (widget.viewModel) {
                this.registerProgressListener(widget.viewModel.model.requestInProgress);
            }
        };
        // Listen for view model changes on this widget
        this._register(widget.onDidChangeViewModel(() => {
            register();
            this._onDidChangeChatSessionItems.fire();
        }));
        register();
    }
    registerProgressListener(observable) {
        const progressEvent = Event.fromObservableLight(observable);
        this._register(progressEvent(() => {
            this._onDidChangeChatSessionItems.fire();
        }));
    }
    registerModelTitleListener(widget) {
        const model = widget.viewModel?.model;
        if (model) {
            // Listen for model changes, specifically for title changes via setCustomTitle
            this._register(model.onDidChange((e) => {
                // Fire change events for all title-related changes to refresh the tree
                if (!e || e.kind === 'setCustomTitle') {
                    this._onDidChange.fire();
                }
            }));
        }
    }
    modelToStatus(model) {
        if (model.requestInProgress.get()) {
            return 2 /* ChatSessionStatus.InProgress */;
        }
        else {
            const requests = model.getRequests();
            if (requests.length > 0) {
                // Check if the last request was completed successfully or failed
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
        }
        return;
    }
    async provideChatSessionItems(token) {
        const sessions = [];
        const sessionsByResource = new ResourceSet();
        this.chatService.getLiveSessionItems().forEach(sessionDetail => {
            let status;
            let startTime;
            let endTime;
            const model = this.chatService.getSession(sessionDetail.sessionResource);
            if (model) {
                status = this.modelToStatus(model);
                startTime = model.timestamp;
                const lastResponse = model.getRequests().at(-1)?.response;
                if (lastResponse) {
                    endTime = lastResponse.completedAt ?? lastResponse.timestamp;
                }
            }
            const statistics = model ? this.getSessionStatistics(model) : undefined;
            const editorSession = {
                resource: sessionDetail.sessionResource,
                label: sessionDetail.title,
                iconPath: Codicon.chatSparkle,
                status,
                provider: this,
                timing: {
                    startTime: startTime ?? Date.now(), // TODO@osortega this is not so good
                    endTime
                },
                statistics
            };
            sessionsByResource.add(sessionDetail.sessionResource);
            sessions.push(editorSession);
        });
        const history = await this.getHistoryItems();
        sessions.push(...history.filter(h => !sessionsByResource.has(h.resource)));
        return sessions;
    }
    async getHistoryItems() {
        try {
            const allHistory = await this.chatService.getHistorySessionItems();
            const historyItems = allHistory.map((historyDetail) => {
                const model = this.chatService.getSession(historyDetail.sessionResource);
                const statistics = model ? this.getSessionStatistics(model) : undefined;
                return {
                    resource: historyDetail.sessionResource,
                    label: historyDetail.title,
                    iconPath: Codicon.chatSparkle,
                    provider: this,
                    timing: {
                        startTime: historyDetail.lastMessageDate ?? Date.now()
                    },
                    archived: true,
                    statistics
                };
            });
            return historyItems;
        }
        catch (error) {
            return [];
        }
    }
    getSessionStatistics(chatModel) {
        let linesAdded = 0;
        let linesRemoved = 0;
        const modifiedFiles = new ResourceSet();
        const currentEdits = chatModel.editingSession?.entries.get();
        if (currentEdits) {
            const uncommittedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
            uncommittedEdits.forEach(edit => {
                linesAdded += edit.linesAdded?.get() ?? 0;
                linesRemoved += edit.linesRemoved?.get() ?? 0;
                modifiedFiles.add(edit.modifiedURI);
            });
        }
        return {
            files: modifiedFiles.size,
            insertions: linesAdded,
            deletions: linesRemoved,
        };
    }
};
LocalChatSessionsProvider = LocalChatSessionsProvider_1 = __decorate([
    __param(0, IChatWidgetService),
    __param(1, IChatService),
    __param(2, IChatSessionsService)
], LocalChatSessionsProvider);
export { LocalChatSessionsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxDaGF0U2Vzc2lvbnNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2Vzc2lvbnMvbG9jYWxDaGF0U2Vzc2lvbnNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUtoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFpRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hLLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUc5RSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7O2FBQ3hDLE9BQUUsR0FBRyw2Q0FBNkMsQUFBaEQsQ0FBaUQ7YUFDbkQsd0JBQW1CLEdBQUcsbUNBQW1DLEFBQXRDLENBQXVDO0lBTzFFLElBQVcsMkJBQTJCLEtBQUssT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUU1RixZQUNxQixpQkFBc0QsRUFDNUQsV0FBMEMsRUFDbEMsbUJBQTBEO1FBRWhGLEtBQUssRUFBRSxDQUFDO1FB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