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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { resolve } from '../../../../base/common/path.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-browser/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ACTION_ID_NEW_CHAT, CHAT_OPEN_ACTION_ID } from '../browser/actions/chatActions.js';
import { IChatWidgetService } from '../browser/chat.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatService } from '../common/chatService.js';
import { ChatUrlFetchingConfirmationContribution } from '../common/chatUrlFetchingConfirmation.js';
import { ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsConfirmationService } from '../common/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { InternalFetchWebPageToolId } from '../common/tools/tools.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { HoldToVoiceChatInChatViewAction, InlineVoiceChatAction, KeywordActivationContribution, QuickVoiceChatAction, ReadChatResponseAloud, StartVoiceChatAction, StopListeningAction, StopListeningAndSubmitAction, StopReadAloud, StopReadChatItemAloud, VoiceChatInChatViewAction } from './actions/voiceChatActions.js';
import { FetchWebPageTool, FetchWebPageToolData } from './tools/fetchPageTool.js';
let NativeBuiltinToolsContribution = class NativeBuiltinToolsContribution extends Disposable {
    static { this.ID = 'chat.nativeBuiltinTools'; }
    constructor(toolsService, instantiationService, confirmationService) {
        super();
        const editTool = instantiationService.createInstance(FetchWebPageTool);
        this._register(toolsService.registerTool(FetchWebPageToolData, editTool));
        this._register(confirmationService.registerConfirmationContribution(InternalFetchWebPageToolId, instantiationService.createInstance(ChatUrlFetchingConfirmationContribution, params => params.urls)));
    }
};
NativeBuiltinToolsContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, ILanguageModelToolsConfirmationService)
], NativeBuiltinToolsContribution);
let ChatCommandLineHandler = class ChatCommandLineHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatCommandLineHandler'; }
    constructor(environmentService, commandService, workspaceTrustRequestService, logService, layoutService, contextKeyService) {
        super();
        this.environmentService = environmentService;
        this.commandService = commandService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.contextKeyService = contextKeyService;
        this.registerListeners();
    }
    registerListeners() {
        ipcRenderer.on('vscode:handleChatRequest', (_, ...args) => {
            const chatArgs = args[0];
            this.logService.trace('vscode:handleChatRequest', chatArgs);
            this.prompt(chatArgs);
        });
    }
    async prompt(args) {
        if (!Array.isArray(args?._)) {
            return;
        }
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('copilotWorkspaceTrust', "AI features are currently only supported in trusted workspaces.")
        });
        if (!trusted) {
            return;
        }
        const opts = {
            query: args._.length > 0 ? args._.join(' ') : '',
            mode: args.mode ?? ChatModeKind.Agent,
            attachFiles: args['add-file']?.map(file => URI.file(resolve(file))), // use `resolve` to deal with relative paths properly
        };
        if (args.maximize) {
            const location = this.contextKeyService.getContextKeyValue(ChatContextKeys.panelLocation.key);
            if (location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                this.layoutService.setAuxiliaryBarMaximized(true);
            }
            else if (location === 1 /* ViewContainerLocation.Panel */ && !this.layoutService.isPanelMaximized()) {
                this.layoutService.toggleMaximizedPanel();
            }
        }
        await this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
        await this.commandService.executeCommand(CHAT_OPEN_ACTION_ID, opts);
    }
};
ChatCommandLineHandler = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, ICommandService),
    __param(2, IWorkspaceTrustRequestService),
    __param(3, ILogService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextKeyService)
], ChatCommandLineHandler);
let ChatSuspendThrottlingHandler = class ChatSuspendThrottlingHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatSuspendThrottlingHandler'; }
    constructor(nativeHostService, chatService) {
        super();
        this._register(autorun(reader => {
            const running = chatService.requestInProgressObs.read(reader);
            // When a chat request is in progress, we must ensure that background
            // throttling is not applied so that the chat session can continue
            // even when the window is not in focus.
            nativeHostService.setBackgroundThrottling(!running);
        }));
    }
};
ChatSuspendThrottlingHandler = __decorate([
    __param(0, INativeHostService),
    __param(1, IChatService)
], ChatSuspendThrottlingHandler);
let ChatLifecycleHandler = class ChatLifecycleHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatLifecycleHandler'; }
    constructor(lifecycleService, chatService, dialogService, widgetService, contextKeyService, extensionService) {
        super();
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.widgetService = widgetService;
        this.contextKeyService = contextKeyService;
        this._register(lifecycleService.onBeforeShutdown(e => {
            e.veto(this.shouldVetoShutdown(e.reason), 'veto.chat');
        }));
        this._register(extensionService.onWillStop(e => {
            e.veto(this.chatService.requestInProgressObs.get(), localize('chatRequestInProgress', "A chat request is in progress."));
        }));
    }
    shouldVetoShutdown(reason) {
        const running = this.chatService.requestInProgressObs.read(undefined);
        if (!running) {
            return false;
        }
        if (ChatContextKeys.skipChatRequestInProgressMessage.getValue(this.contextKeyService) === true) {
            return false;
        }
        return this.doShouldVetoShutdown(reason);
    }
    async doShouldVetoShutdown(reason) {
        this.widgetService.revealWidget();
        let message;
        let detail;
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                message = localize('closeTheWindow.message', "A chat request is in progress. Are you sure you want to close the window?");
                detail = localize('closeTheWindow.detail', "The chat request will stop if you close the window.");
                break;
            case 4 /* ShutdownReason.LOAD */:
                message = localize('changeWorkspace.message', "A chat request is in progress. Are you sure you want to change the workspace?");
                detail = localize('changeWorkspace.detail', "The chat request will stop if you change the workspace.");
                break;
            case 3 /* ShutdownReason.RELOAD */:
                message = localize('reloadTheWindow.message', "A chat request is in progress. Are you sure you want to reload the window?");
                detail = localize('reloadTheWindow.detail', "The chat request will stop if you reload the window.");
                break;
            default:
                message = isMacintosh ? localize('quit.message', "A chat request is in progress. Are you sure you want to quit?") : localize('exit.message', "A chat request is in progress. Are you sure you want to exit?");
                detail = isMacintosh ? localize('quit.detail', "The chat request will stop if you quit.") : localize('exit.detail', "The chat request will stop if you exit.");
                break;
        }
        const result = await this.dialogService.confirm({ message, detail });
        return !result.confirmed;
    }
};
ChatLifecycleHandler = __decorate([
    __param(0, ILifecycleService),
    __param(1, IChatService),
    __param(2, IDialogService),
    __param(3, IChatWidgetService),
    __param(4, IContextKeyService),
    __param(5, IExtensionService)
], ChatLifecycleHandler);
registerAction2(StartVoiceChatAction);
registerAction2(VoiceChatInChatViewAction);
registerAction2(HoldToVoiceChatInChatViewAction);
registerAction2(QuickVoiceChatAction);
registerAction2(InlineVoiceChatAction);
registerAction2(StopListeningAction);
registerAction2(StopListeningAndSubmitAction);
registerAction2(ReadChatResponseAloud);
registerAction2(StopReadChatItemAloud);
registerAction2(StopReadAloud);
registerChatDeveloperActions();
registerWorkbenchContribution2(KeywordActivationContribution.ID, KeywordActivationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(NativeBuiltinToolsContribution.ID, NativeBuiltinToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatCommandLineHandler.ID, ChatCommandLineHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatSuspendThrottlingHandler.ID, ChatSuspendThrottlingHandler, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatLifecycleHandler.ID, ChatLifecycleHandler, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2VsZWN0cm9uLWJyb3dzZXIvY2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFB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