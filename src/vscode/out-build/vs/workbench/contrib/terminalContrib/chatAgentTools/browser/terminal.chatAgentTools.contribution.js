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
            description: localize(13113, null),
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
    title: localize(13114, null),
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
            name: localize(13115, null),
            fullName: localize(13116, null),
            value: selection,
            icon: Codicon.terminal
        });
        chatView.focusInput();
    }
});
// #endregion Actions
//# sourceMappingURL=terminal.chatAgentTools.contribution.js.map