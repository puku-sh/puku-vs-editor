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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource } from '../../../../chat/common/languageModelToolsService.js';
import { ITerminalService } from '../../../../terminal/browser/terminal.js';
export const GetTerminalSelectionToolData = {
    id: 'terminal_selection',
    toolReferenceName: 'terminalSelection',
    legacyToolReferenceFullNames: ['runCommands/terminalSelection'],
    displayName: localize(13137, null),
    modelDescription: 'Get the current selection in the active terminal.',
    source: ToolDataSource.Internal,
    icon: Codicon.terminal,
};
let GetTerminalSelectionTool = class GetTerminalSelectionTool extends Disposable {
    constructor(_terminalService) {
        super();
        this._terminalService = _terminalService;
    }
    async prepareToolInvocation(context, token) {
        return {
            invocationMessage: localize(13138, null),
            pastTenseMessage: localize(13139, null),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const activeInstance = this._terminalService.activeInstance;
        if (!activeInstance) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No active terminal instance found.'
                    }]
            };
        }
        const selection = activeInstance.selection;
        if (!selection) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No text is currently selected in the active terminal.'
                    }]
            };
        }
        return {
            content: [{
                    kind: 'text',
                    value: `The active terminal's selection:\n${selection}`
                }]
        };
    }
};
GetTerminalSelectionTool = __decorate([
    __param(0, ITerminalService)
], GetTerminalSelectionTool);
export { GetTerminalSelectionTool };
//# sourceMappingURL=getTerminalSelectionTool.js.map