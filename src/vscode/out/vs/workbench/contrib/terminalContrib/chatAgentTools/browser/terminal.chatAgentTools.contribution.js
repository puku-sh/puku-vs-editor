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
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isNumber } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatContextKeys } from '../../../chat/common/chatContextKeys.js';
import { ILanguageModelToolsService, ToolDataSource, VSCodeToolReference } from '../../../chat/common/languageModelToolsService.js';
import { registerActiveInstanceAction, sharedWhenClause } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { GetTerminalLastCommandTool, GetTerminalLastCommandToolData } from './tools/getTerminalLastCommandTool.js';
import { GetTerminalOutputTool, GetTerminalOutputToolData } from './tools/getTerminalOutputTool.js';
import { GetTerminalSelectionTool, GetTerminalSelectionToolData } from './tools/getTerminalSelectionTool.js';
import { ConfirmTerminalCommandTool, ConfirmTerminalCommandToolData } from './tools/runInTerminalConfirmationTool.js';
import { RunInTerminalTool, createRunInTerminalToolData } from './tools/runInTerminalTool.js';
import { CreateAndRunTaskTool, CreateAndRunTaskToolData } from './tools/task/createAndRunTaskTool.js';
import { GetTaskOutputTool, GetTaskOutputToolData } from './tools/task/getTaskOutputTool.js';
import { RunTaskTool, RunTaskToolData } from './tools/task/runTaskTool.js';
let ShellIntegrationTimeoutMigrationContribution = class ShellIntegrationTimeoutMigrationContribution extends Disposable {
    static { this.ID = 'terminal.shellIntegrationTimeoutMigration'; }
    constructor(configurationService) {
        super();
        const deprecatedSettingValue = configurationService.getValue("chat.tools.terminal.shellIntegrationTimeout" /* TerminalChatAgentToolsSettingId.ShellIntegrationTimeout */);
        if (!isNumber(deprecatedSettingValue)) {
            return;
        }
        const newSettingValue = configurationService.getValue("terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */);
        if (!isNumber(newSettingValue)) {
            configurationService.updateValue("terminal.integrated.shellIntegration.timeout" /* TerminalSettingId.ShellIntegrationTimeout */, deprecatedSettingValue);
        }
    }
};
ShellIntegrationTimeoutMigrationContribution = __decorate([
    __param(0, IConfigurationService)
], ShellIntegrationTimeoutMigrationContribution);
registerWorkbenchContribution2(ShellIntegrationTimeoutMigrationContribution.ID, ShellIntegrationTimeoutMigrationContribution, 4 /* WorkbenchPhase.Eventually */);
let ChatAgentToolsContribution = class ChatAgentToolsContribution extends Disposable {
    static { this.ID = 'terminal.chatAgentTools'; }
    constructor(instantiationService, toolsService) {
        super();
        // #region Terminal
        const confirmTerminalCommandTool = instantiationService.createInstance(ConfirmTerminalCommandTool);
        this._register(toolsService.registerTool(ConfirmTerminalCommandToolData, confirmTerminalCommandTool));
        const getTerminalOutputTool = instantiationService.createInstance(GetTerminalOutputTool);
        this._register(toolsService.registerTool(GetTerminalOutputToolData, getTerminalOutputTool));
        const shellToolSet = this._register(toolsService.createToolSet(ToolDataSource.Internal, 'shell', VSCodeToolReference.shell, {
            icon: ThemeIcon.fromId(Codicon.terminal.id),
            description: localize('toolset.shell', 'Run commands in the terminal'),
            legacyFullNames: ['runCommands']
        }));
        this._register(shellToolSet.addTool(GetTerminalOutputToolData));
        instantiationService.invokeFunction(createRunInTerminalToolData).then(runInTerminalToolData => {
            const runInTerminalTool = instantiationService.createInstance(RunInTerminalTool);
            this._register(toolsService.registerTool(runInTerminalToolData, runInTerminalTool));
            this._register(shellToolSet.addTool(runInTerminalToolData));
        });
        const getTerminalSelectionTool = instantiationService.createInstance(GetTerminalSelectionTool);
        this._register(toolsService.registerTool(GetTerminalSelectionToolData, getTerminalSelectionTool));
        const getTerminalLastCommandTool = instantiationService.createInstance(GetTerminalLastCommandTool);
        this._register(toolsService.registerTool(GetTerminalLastCommandToolData, getTerminalLastCommandTool));
        this._register(shellToolSet.addTool(GetTerminalSelectionToolData));
        this._register(shellToolSet.addTool(GetTerminalLastCommandToolData));
        // #endregion
        // #region Tasks
        const runTaskTool = instantiationService.createInstance(RunTaskTool);
        this._register(toolsService.registerTool(RunTaskToolData, runTaskTool));
        const getTaskOutputTool = instantiationService.createInstance(GetTaskOutputTool);
        this._register(toolsService.registerTool(GetTaskOutputToolData, getTaskOutputTool));
        const createAndRunTaskTool = instantiationService.createInstance(CreateAndRunTaskTool);
        this._register(toolsService.registerTool(CreateAndRunTaskToolData, createAndRunTaskTool));
        this._register(toolsService.launchToolSet.addTool(RunTaskToolData));
        this._register(toolsService.launchToolSet.addTool(GetTaskOutputToolData));
        this._register(toolsService.launchToolSet.addTool(CreateAndRunTaskToolData));
        // #endregion
    }
};
ChatAgentToolsContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageModelToolsService)
], ChatAgentToolsContribution);
registerWorkbenchContribution2(ChatAgentToolsContribution.ID, ChatAgentToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion Contributions
// #region Actions
registerActiveInstanceAction({
    id: "workbench.action.terminal.chat.addTerminalSelection" /* TerminalChatAgentToolsCommandId.ChatAddTerminalSelection */,
    title: localize('addTerminalSelection', 'Add Terminal Selection to Chat'),
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, sharedWhenClause.terminalAvailable),
    menu: [
        {
            id: MenuId.TerminalInstanceContext,
            group: "0_chat" /* TerminalContextMenuGroup.Chat */,
            order: 1,
            when: ContextKeyExpr.and(ChatContextKeys.enabled, TerminalContextKeys.textSelected)
        },
    ],
    run: async (activeInstance, _c, accessor) => {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const selection = activeInstance.selection;
        if (!selection) {
            return;
        }
        const chatView = chatWidgetService.lastFocusedWidget ?? await chatWidgetService.revealWidget();
        if (!chatView) {
            return;
        }
        chatView.attachmentModel.addContext({
            id: `terminal-selection-${Date.now()}`,
            kind: 'generic',
            name: localize('terminalSelection', 'Terminal Selection'),
            fullName: localize('terminalSelection', 'Terminal Selection'),
            value: selection,
            icon: Codicon.terminal
        });
        chatView.focusInput();
    }
});
// #endregion Actions
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2hhdEFnZW50VG9vbHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdGVybWluYWwuY2hhdEFnZW50VG9vbHMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsOEJBQThCLEVBQStDLE1BQU0scUNBQXFDLENBQUM7QUFDbEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FB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