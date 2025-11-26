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
//# sourceMappingURL=localChatSessionsProvider.js.map