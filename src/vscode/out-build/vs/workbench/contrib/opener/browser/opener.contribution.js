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
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID } from '../../files/browser/fileConstants.js';
let WorkbenchOpenerContribution = class WorkbenchOpenerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.opener'; }
    constructor(openerService, commandService, fileService, workspaceContextService) {
        super();
        this.commandService = commandService;
        this.fileService = fileService;
        this.workspaceContextService = workspaceContextService;
        this._register(openerService.registerOpener(this));
    }
    async open(link, options) {
        try {
            const uri = typeof link === 'string' ? URI.parse(link) : link;
            if (this.workspaceContextService.isInsideWorkspace(uri)) {
                if ((await this.fileService.stat(uri)).isDirectory) {
                    await this.commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, uri);
                    return true;
                }
            }
        }
        catch {
            // noop
        }
        return false;
    }
};
WorkbenchOpenerContribution = __decorate([
    __param(0, IOpenerService),
    __param(1, ICommandService),
    __param(2, IFileService),
    __param(3, IWorkspaceContextService)
], WorkbenchOpenerContribution);
registerWorkbenchContribution2(WorkbenchOpenerContribution.ID, WorkbenchOpenerContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=opener.contribution.js.map