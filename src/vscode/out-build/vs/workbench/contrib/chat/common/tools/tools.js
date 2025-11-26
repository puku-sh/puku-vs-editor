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
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILanguageModelToolsService, ToolDataSource, VSCodeToolReference } from '../../common/languageModelToolsService.js';
import { ConfirmationTool, ConfirmationToolData } from './confirmationTool.js';
import { EditTool, EditToolData } from './editFileTool.js';
import { createManageTodoListToolData, ManageTodoListTool, TodoListToolDescriptionFieldSettingId, TodoListToolWriteOnlySettingId } from './manageTodoListTool.js';
import { RunSubagentTool } from './runSubagentTool.js';
let BuiltinToolsContribution = class BuiltinToolsContribution extends Disposable {
    static { this.ID = 'chat.builtinTools'; }
    constructor(toolsService, instantiationService, configurationService) {
        super();
        this.configurationService = configurationService;
        const editTool = instantiationService.createInstance(EditTool);
        this._register(toolsService.registerTool(EditToolData, editTool));
        // Check if write-only mode is enabled for the todo tool
        const writeOnlyMode = this.configurationService.getValue(TodoListToolWriteOnlySettingId) === true;
        const includeDescription = this.configurationService.getValue(TodoListToolDescriptionFieldSettingId) !== false;
        const todoToolData = createManageTodoListToolData(writeOnlyMode, includeDescription);
        const manageTodoListTool = this._register(instantiationService.createInstance(ManageTodoListTool, writeOnlyMode, includeDescription));
        this._register(toolsService.registerTool(todoToolData, manageTodoListTool));
        // Register the confirmation tool
        const confirmationTool = instantiationService.createInstance(ConfirmationTool);
        this._register(toolsService.registerTool(ConfirmationToolData, confirmationTool));
        const runSubagentTool = this._register(instantiationService.createInstance(RunSubagentTool));
        const runSubagentToolData = runSubagentTool.getToolData();
        this._register(toolsService.registerTool(runSubagentToolData, runSubagentTool));
        const customAgentToolSet = this._register(toolsService.createToolSet(ToolDataSource.Internal, 'custom-agent', VSCodeToolReference.customAgent, {
            icon: ThemeIcon.fromId(Codicon.agent.id),
            description: localize(6604, null),
        }));
        this._register(customAgentToolSet.addTool(runSubagentToolData));
    }
};
BuiltinToolsContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], BuiltinToolsContribution);
export { BuiltinToolsContribution };
export const InternalFetchWebPageToolId = 'vscode_fetchWebPage_internal';
//# sourceMappingURL=tools.js.map